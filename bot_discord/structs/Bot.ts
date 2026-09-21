import {
  ApplicationCommandDataResolvable,
  ChatInputCommandInteraction,
  Client,
  Collection,
  Events,
  Interaction,
  REST,
  Routes,
  Snowflake,
  PresenceData,
  VoiceBasedChannel,
  GuildMember,
  ChannelType
} from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus
} from "@discordjs/voice";
import { WebSocketServer, WebSocket } from "ws";
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, createReadStream } from "fs";
import { join, resolve, isAbsolute } from "path";
import { Readable } from "stream";
import { Command } from "../interfaces/Command";
import { checkPermissions, PermissionResult } from "../utils/checkPermissions";
import { config } from "../utils/config";
import { i18n } from "../utils/i18n";
import { MissingPermissionsException } from "../utils/MissingPermissionsException";

export class Bot {
  public readonly prefix = config.PREFIX;
  public slashCommands = new Array<ApplicationCommandDataResolvable>();
  public slashCommandsMap = new Collection<string, Command>();
  public cooldowns = new Collection<string, Collection<Snowflake, number>>();

  public audioPlayer: AudioPlayer;
  public currentConnection: VoiceConnection | null = null;
  public currentChannel: VoiceBasedChannel | null = null;

  public wss: WebSocketServer | null = null;
  public wsClients = new Set<WebSocket>();
  private authenticatedClients = new WeakSet<WebSocket>();
  public storageDir: string;
  private soundQueue: Array<{ targetPath: string; volume: number }> = [];

  private targetVoiceChannelId: string | null = null;
  private targetGuildId: string | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private natKeepAliveTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect: boolean = false;
  private isReconnecting: boolean = false;
  private readonly stateFilePath: string;
  private readonly silentWavBuffer: Buffer;

  public constructor(public readonly client: Client) {
    this.storageDir = process.env.STORAGE_DIR || resolve(process.cwd(), "storage", "sounds");

    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }

    this.stateFilePath = join(this.storageDir, "last_voice_channel.json");
    this.silentWavBuffer = this.buildSilentWavBuffer();

    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: 250
      }
    });

    this.audioPlayer.on("error", (error) => {
      console.error("[AUDIO] Error en AudioPlayer de Discord:", error.message, error);
      this.broadcast({ type: "player_error", message: error.message });
    });

    this.audioPlayer.on("stateChange", (oldState: any, newState: any) => {
      console.log(`[AUDIO] AudioPlayer: ${oldState.status} -> ${newState.status}`);
      if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Buffering) {
        console.warn("[AUDIO] AudioPlayer paso de Buffering a Idle sin reproducir");
      }
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      const connState = (this.currentConnection?.state as any);
      const net = connState?.networking?.state;
      console.log(`[AUDIO] Playback terminado. Paquetes enviados: ${net?.connectionData?.packetsPlayed || 0}`);
      this.broadcast({ type: "player_idle" });
      this.processNextInQueue();
    });

    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log("[AUDIO] AudioPlayer: Reproduciendo audio en Discord");
      const connState = (this.currentConnection?.state as any);
      const net = connState?.networking?.state;
      console.log(`[AUDIO] Networking Code: ${net?.code}, Modo: ${net?.connectionData?.encryptionMode}, SSRC: ${net?.connectionData?.ssrc}`);
      this.broadcast({ type: "player_playing" });
    });

    this.audioPlayer.on(AudioPlayerStatus.Buffering as any, () => {
      console.log("[AUDIO] AudioPlayer: Buffering...");
      this.broadcast({ type: "player_buffering" });
    });

    this.initWebSocketBridge(config.PORT || 3002);

    this.client.login(config.TOKEN);

    const presenceOptions: PresenceData = {
      activities: [{ name: config.NAME, type: config.TYPE }],
      status: "online"
    };

    this.client.on("ready", () => {
      console.log("\n=======================================================");
      console.log(`[BOT] Conectado: ${this.client.user!.tag}`);
      console.log(`[BOT] Servidores activos: ${this.client.guilds.cache.size}`);
      console.log("=======================================================\n");

      this.client.user!.setPresence(presenceOptions);
      this.registerSlashCommands();
      this.broadcastStatus();

      this.restoreSavedVoiceConnection();
      this.startWatchdog();
      this.startNatKeepAlive();
    });

    this.client.on("voiceStateUpdate", (oldState, newState) => {
      if (newState.id === this.client.user?.id) {
        if (newState.channelId && newState.channel) {
          console.log(`[VOICE] Bot reubicado a canal: [${newState.channel.name}]`);
          this.targetGuildId = newState.guild.id;
          this.targetVoiceChannelId = newState.channelId;
          this.currentChannel = newState.channel as VoiceBasedChannel;
          this.saveVoiceState(newState.guild.id, newState.channelId);
          this.broadcastStatus();
        } else if (!newState.channelId && !this.isExplicitDisconnect) {
          console.warn("[VOICE] Desconexion externa detectada en Discord. Watchdog reingresara al canal.");
          this.currentConnection = null;
          this.currentChannel = null;
          this.broadcastStatus();
        }
      }
    });

    this.client.on("warn", (info) => console.log("Bot warning:", info));
    this.client.on("error", console.error);

    this.onInteractionCreate();
  }

  public isInVoice(): boolean {
    return (
      !!this.currentConnection &&
      this.currentConnection.state.status !== VoiceConnectionStatus.Destroyed
    );
  }

  public joinVoice(channel: VoiceBasedChannel): VoiceConnection {
    if (this.currentConnection && this.currentChannel?.id === channel.id) {
      if (this.currentConnection.state.status === VoiceConnectionStatus.Ready) {
        return this.currentConnection;
      }
    }

    this.saveVoiceState(channel.guild.id, channel.id);

    if (this.currentConnection) {
      try {
        this.currentConnection.destroy();
      }
      catch (e) { }

      this.currentConnection = null;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      selfDeaf: false,
      selfMute: false
    });

    this.currentConnection = connection;
    this.currentChannel = channel;

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[VOICE] Conexion de voz activa en: [${channel.name}]`);
      connection.subscribe(this.audioPlayer);
      this.audioPlayer.unpause();
      this.broadcastStatus();
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.isExplicitDisconnect) return;

      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 10_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 10_000)
        ]);
        console.log("[VOICE] Conexion de voz recuperada tras migracion o micro-corte");
      }
      catch (error) {
        console.warn("[VOICE] Perdida temporal de conexion. Watchdog 24/7 reingresara al canal.");
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          try {
            connection.destroy();
          } catch (e) { }
        }
        this.currentConnection = null;
        this.currentChannel = null;
        this.broadcastStatus();
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.currentConnection = null;
      this.currentChannel = null;
      this.broadcastStatus();
    });

    console.log(`[VOICE] Bot iniciando union al canal: [${channel.name}] en [${channel.guild.name}]`);
    this.broadcastStatus();
    return connection;
  }

  public leaveVoice(explicit: boolean = true) {
    if (explicit) {
      this.isExplicitDisconnect = true;
      this.clearSavedVoiceState();
    }

    if (this.currentConnection) {
      try {
        this.currentConnection.destroy();
      } catch (e) { }
      this.currentConnection = null;
      this.currentChannel = null;
    }
    this.broadcastStatus();
    console.log(`[VOICE] Bot desconectado de voz. (Explicito: ${explicit})`);
  }

  private saveVoiceState(guildId: string, channelId: string) {
    this.targetGuildId = guildId;
    this.targetVoiceChannelId = channelId;
    this.isExplicitDisconnect = false;
    try {
      writeFileSync(
        this.stateFilePath,
        JSON.stringify({
          guildId,
          channelId,
          updatedAt: new Date().toISOString()
        }, null, 2),
        "utf-8"
      );
    } catch (err: any) {
      console.warn("[VOICE] Error guardando estado de canal:", err.message);
    }
  }

  private clearSavedVoiceState() {
    this.targetGuildId = null;
    this.targetVoiceChannelId = null;
    try {
      if (existsSync(this.stateFilePath)) {
        unlinkSync(this.stateFilePath);
      }
    } catch (e) { }
  }

  private restoreSavedVoiceConnection() {
    try {
      if (!existsSync(this.stateFilePath)) return;
      const raw = readFileSync(this.stateFilePath, "utf-8");
      const data = JSON.parse(raw);
      if (data.guildId && data.channelId) {
        this.targetGuildId = data.guildId;
        this.targetVoiceChannelId = data.channelId;
        this.isExplicitDisconnect = false;
        console.log(`[VOICE 24/7] Restaurando conexion previa en canal ID: ${data.channelId}`);
        setTimeout(() => {
          this.reconnectToTargetChannel();
        }, 2500);
      }
    } catch (err: any) {
      console.warn("[VOICE] Error restaurando canal guardado:", err.message);
    }
  }

  private startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.isExplicitDisconnect || !this.targetVoiceChannelId || !this.targetGuildId) {
        return;
      }

      const isReady =
        this.currentConnection &&
        this.currentConnection.state.status === VoiceConnectionStatus.Ready;

      if (!isReady && !this.isReconnecting) {
        console.log("[WATCHDOG 24/7] Canal caido detectado. Reingresando automaticamente...");
        this.reconnectToTargetChannel();
      }
    }, 15_000);
  }

  private reconnectToTargetChannel() {
    if (this.isReconnecting || !this.targetGuildId || !this.targetVoiceChannelId) return;

    this.isReconnecting = true;
    try {
      const guild = this.client.guilds.cache.get(this.targetGuildId);
      if (!guild) {
        console.warn(`[WATCHDOG] Servidor ${this.targetGuildId} aun no disponible.`);
        this.isReconnecting = false;
        return;
      }

      const channel = guild.channels.cache.get(this.targetVoiceChannelId) as VoiceBasedChannel;
      if (!channel || !channel.isVoiceBased()) {
        console.warn(`[WATCHDOG] Canal ${this.targetVoiceChannelId} no encontrado o no es de voz.`);
        this.isReconnecting = false;
        return;
      }

      console.log(`[WATCHDOG] Reconectando a [${channel.name}]...`);
      this.joinVoice(channel);
    } catch (err: any) {
      console.error("[WATCHDOG] Error reingresando:", err.message);
    } finally {
      setTimeout(() => {
        this.isReconnecting = false;
      }, 5000);
    }
  }

  private buildSilentWavBuffer(): Buffer {
    const sampleRate = 48000;
    const numChannels = 2;
    const bytesPerSample = 2;
    const durationMs = 50;
    const totalSamples = Math.floor((sampleRate * durationMs) / 1000);
    const dataSize = totalSamples * numChannels * bytesPerSample;
    const buf = Buffer.alloc(44 + dataSize);

    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(numChannels, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    buf.writeUInt16LE(numChannels * bytesPerSample, 32);
    buf.writeUInt16LE(bytesPerSample * 8, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(dataSize, 40);

    return buf;
  }

  private startNatKeepAlive() {
    if (this.natKeepAliveTimer) clearInterval(this.natKeepAliveTimer);
    this.natKeepAliveTimer = setInterval(() => {
      if (!this.isInVoice()) return;
      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;
      if (this.soundQueue.length > 0) return;

      try {
        const resource = createAudioResource(Readable.from(this.silentWavBuffer), {
          inputType: StreamType.Arbitrary
        });
        this.audioPlayer.play(resource);
      } catch (e) { }
    }, 40_000);
  }

  public playSound(soundPath: string, volume: number = 1.0): { success: boolean; queued?: boolean; queuePosition?: number; error?: string } {
    if (!soundPath) {
      console.warn("[WARN] playSound: Ruta de sonido vacia.");
      return { success: false, error: "Ruta de sonido vacia" };
    }

    if (!this.isInVoice()) {
      console.warn("[WARN] playSound: El bot no esta en ningun canal de voz.");
      this.broadcast({
        type: "warn",
        message: "DJM BOT no esta en un canal de voz. Entra a un canal en Discord y presiona 'UNIRSE A MI CANAL'."
      });
      return { success: false, error: "Bot no esta en un canal de voz" };
    }

    let targetPath = soundPath;
    if (!existsSync(targetPath)) {
      const cleanPath = soundPath.replace(/^[/\\]+/, "");
      const candidates = [
        resolve(this.storageDir, soundPath),
        resolve(this.storageDir, cleanPath),
        resolve(this.storageDir, `${cleanPath}.mp3`),
        resolve(this.storageDir, `${cleanPath}.ogg`),
        resolve(this.storageDir, `${cleanPath}.wav`),
        resolve(process.cwd(), cleanPath),
        resolve(__dirname, "../../app/public", cleanPath),
        resolve(process.cwd(), "../app/public", cleanPath)
      ];

      for (const cand of candidates) {
        if (existsSync(cand)) {
          targetPath = cand;
          break;
        }
      }
    }

    const resolvedPath = resolve(targetPath);
    const allowedRoots = [
      resolve(this.storageDir),
      resolve(process.cwd()),
      resolve(__dirname, "../../app/public")
    ];
    const isAllowed = allowedRoots.some(root => resolvedPath.startsWith(root));
    if (!isAllowed) {
      console.warn(`[SECURITY] Acceso bloqueado a ruta no autorizada: ${soundPath}`);
      return { success: false, error: "Ruta de archivo no autorizada" };
    }

    if (!existsSync(targetPath)) {
      console.warn(`[WARN] Archivo de audio no encontrado: ${soundPath}`);
      return { success: false, error: "Archivo no encontrado en el servidor" };
    }

    const isBusy = this.audioPlayer.state.status === AudioPlayerStatus.Playing ||
      this.audioPlayer.state.status === AudioPlayerStatus.Buffering;

    if (isBusy) {
      this.soundQueue.push({ targetPath, volume });
      console.log(`[QUEUE] Sonido encolado en posicion #${this.soundQueue.length}: ${targetPath}`);
      this.broadcast({
        type: "queue_update",
        queueLength: this.soundQueue.length
      });
      return { success: true, queued: true, queuePosition: this.soundQueue.length };
    }

    const played = this.executePlayResource(targetPath, volume);
    return { success: played, queued: false, error: played ? undefined : "Error al iniciar reproduccion" };
  }

  private executePlayResource(targetPath: string, volume: number = 1.0): boolean {
    try {
      if (this.currentConnection && this.currentConnection.state.status === VoiceConnectionStatus.Ready) {
        const sub = this.currentConnection.subscribe(this.audioPlayer);
        console.log(`[AUDIO] Suscripcion en playSound: ${!!sub}`);
      }

      console.log(`[AUDIO] Creando recurso de audio desde: ${targetPath}`);

      const fileStream = createReadStream(targetPath);

      const resource: AudioResource = createAudioResource(fileStream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      const safeVol = Math.max(0, Math.min(volume, 2.0));

      if (resource.volume) {
        resource.volume.setVolume(safeVol);
      }

      if (resource.playStream) {
        resource.playStream.on("error", (err: any) => {
          console.error("[AUDIO] Error en playStream del recurso:", err.message);
        });
      }

      this.audioPlayer.play(resource);
      console.log(`[AUDIO] Transmitiendo audio en Discord: ${targetPath} (Volumen: ${Math.round(safeVol * 100)}%)`);
      return true;
    }
    catch (err: any) {
      console.error("[AUDIO] Error reproduciendo recurso de audio en Discord:", err);
      return false;
    }
  }

  private processNextInQueue() {
    if (this.soundQueue.length === 0) return;

    const nextItem = this.soundQueue.shift();
    if (!nextItem) return;

    if (!this.isInVoice() || !existsSync(nextItem.targetPath)) {
      console.warn(`[WARN] Saltando elemento de cola invalido: ${nextItem.targetPath}`);
      this.processNextInQueue();
      return;
    }

    console.log(`[QUEUE] Reproduciendo siguiente sonido (${this.soundQueue.length} restantes)...`);
    this.broadcast({
      type: "queue_update",
      queueLength: this.soundQueue.length
    });
    this.executePlayResource(nextItem.targetPath, nextItem.volume);
  }

  public stopSound() {
    this.soundQueue = [];
    this.audioPlayer.stop(true);
    console.log("[AUDIO] Sonido detenido y cola vaciada en Discord.");
    this.broadcast({ type: "queue_update", queueLength: 0 });
  }

  public findAndJoinUserVoice(preferredUsername?: string): boolean {
    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isVoiceBased() && channel.type === ChannelType.GuildVoice) {
          const members = (channel as VoiceBasedChannel).members;
          if (preferredUsername) {
            const found = members.find(
              (m) =>
                m.user.username.toLowerCase() === preferredUsername.toLowerCase() ||
                m.displayName.toLowerCase() === preferredUsername.toLowerCase()
            );
            if (found) {
              this.joinVoice(channel as VoiceBasedChannel);
              return true;
            }
          }
          else if (members.size > 0) {
            this.joinVoice(channel as VoiceBasedChannel);
            return true;
          }
        }
      }
    }

    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isVoiceBased() && channel.type === ChannelType.GuildVoice) {
          this.joinVoice(channel as VoiceBasedChannel);
          return true;
        }
      }
    }

    return false;
  }

  private initWebSocketBridge(port: number) {
    try {
      this.wss = new WebSocketServer({ port, host: "0.0.0.0" });
      console.log(`[WS] Servidor Puente WebSocket activo en ws://0.0.0.0:${port}`);

      this.wss.on("connection", (ws: WebSocket) => {
        this.wsClients.add(ws);
        console.log("[WS] Cliente conectado al WebSocket del Bot");

        if (!config.SECRET_KEY) {
          this.authenticatedClients.add(ws);
        }

        ws.send(JSON.stringify(this.getStatusPayload()));
        this.sendVoiceChannels(ws);

        ws.on("message", (raw: Buffer | string) => {
          try {
            const msg = JSON.parse(raw.toString());
            this.handleWsMessage(msg, ws);
          } catch (err: any) {
            console.error("[WS] Error parseando mensaje WebSocket del Soundboard:", err.message);
          }
        });

        ws.on("close", () => {
          this.wsClients.delete(ws);
        });

        ws.on("error", () => {
          this.wsClients.delete(ws);
        });
      });

      this.wss.on("error", (err: any) => {
        console.error("[WS] Error en WebSocket Server del Bot:", err.message);
      });
    } catch (err: any) {
      console.error("[WS] Error iniciando WebSocket Bridge:", err);
    }
  }

  public getStatusPayload() {
    return {
      type: "status",
      online: !!this.client.user,
      botUser: this.client.user ? this.client.user.tag : null,
      botId: this.client.user?.id || null,
      inVoice: this.isInVoice(),
      channelId: this.currentChannel?.id || null,
      channelName: this.currentChannel?.name || null,
      guildId: this.currentChannel?.guild.id || null,
      guildName: this.currentChannel?.guild.name || null,
      serversCount: this.client.guilds.cache.size
    };
  }

  public sendVoiceChannels(ws?: WebSocket) {
    try {
      const guildsList = Array.from(this.client.guilds.cache.values()).map(g => ({
        id: g.id,
        name: g.name,
        channels: Array.from(g.channels.cache.values())
          .filter(c => c.isVoiceBased() && c.type === ChannelType.GuildVoice)
          .map(c => ({
            id: c.id,
            name: c.name,
            membersCount: (c as VoiceBasedChannel).members?.size || 0
          }))
      }));
      const payload = JSON.stringify({ type: "voice_channels", guilds: guildsList });
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        this.broadcast({ type: "voice_channels", guilds: guildsList });
      }
    } catch (e: any) {
      console.warn("Error enviando canales de voz:", e.message);
    }
  }

  public broadcast(data: any) {
    const payload = JSON.stringify(data);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public broadcastStatus() {
    this.broadcast(this.getStatusPayload());
    this.sendVoiceChannels();
  }

  private handleWsMessage(msg: any, ws: WebSocket) {
    if (!msg || !msg.type) return;

    if (msg.type === "auth") {
      if (!config.SECRET_KEY || msg.token === config.SECRET_KEY) {
        this.authenticatedClients.add(ws);
        console.log("[WS] Cliente autenticado con exito");
        ws.send(JSON.stringify({ type: "auth_ok" }));
        ws.send(JSON.stringify(this.getStatusPayload()));
        this.sendVoiceChannels(ws);
      } else {
        console.warn("[WS] Intento de conexion con token invalido");
        ws.send(JSON.stringify({ type: "auth_error", message: "Clave secreta incorrecta" }));
        setTimeout(() => { try { ws.close(); } catch (e) { } }, 1000);
      }
      return;
    }

    if (config.SECRET_KEY && !this.authenticatedClients.has(ws)) {
      ws.send(JSON.stringify({ type: "auth_required", message: "Se requiere autenticacion" }));
      return;
    }

    switch (msg.type) {
      case "get_status":
        ws.send(JSON.stringify(this.getStatusPayload()));
        break;

      case "get_voice_channels":
        this.sendVoiceChannels(ws);
        break;

      case "play": {
        console.log(`[WS] Comando PLAY recibido: ${msg.soundPath} (Vol: ${msg.volume})`);
        const result = this.playSound(msg.soundPath, msg.volume ?? 1.0);
        ws.send(JSON.stringify({
          type: "play_result",
          success: result.success,
          soundPath: msg.soundPath,
          queued: result.queued,
          queuePosition: result.queuePosition,
          error: result.error
        }));
        break;
      }

      case "play_buffer": {
        try {
          const soundId = (msg.soundId || `snd_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_");
          const rawExt = (msg.ext || ".mp3").toLowerCase().replace(/[^a-z0-9.]/g, "");
          const ext = [".mp3", ".wav", ".ogg"].includes(rawExt) ? rawExt : ".mp3";
          const targetFile = resolve(this.storageDir, `${soundId}${ext}`);

          if (!targetFile.startsWith(resolve(this.storageDir))) {
            throw new Error("Ruta de almacenamiento invalida");
          }

          if (msg.buffer) {
            if (typeof msg.buffer !== "string" || msg.buffer.length > 50 * 1024 * 1024) {
              throw new Error("El tamano del audio excede el limite maximo permitido (50MB)");
            }
            writeFileSync(targetFile, Buffer.from(msg.buffer, "base64"));
            console.log(`[STORAGE] Audio recibido y almacenado: ${soundId}${ext}`);
          }
          const result = this.playSound(targetFile, msg.volume ?? 1.0);
          ws.send(JSON.stringify({
            type: "play_result",
            success: result.success,
            soundId: soundId,
            queued: result.queued,
            queuePosition: result.queuePosition,
            error: result.error
          }));
        } catch (err: any) {
          console.error("[STORAGE] Error en play_buffer:", err.message);
          ws.send(JSON.stringify({ type: "play_result", success: false, error: err.message }));
        }
        break;
      }

      case "stop":
        this.stopSound();
        break;

      case "join_user_channel": {
        const success = this.findAndJoinUserVoice(msg.username);
        if (!success) {
          ws.send(
            JSON.stringify({
              type: "warn",
              message: "No se encontró ningún usuario en canal de voz en los servidores del Bot."
            })
          );
        }
        break;
      }

      case "join_channel": {
        const guild = this.client.guilds.cache.get(msg.guildId);
        const channel = guild?.channels.cache.get(msg.channelId) as VoiceBasedChannel;
        if (channel && channel.isVoiceBased()) {
          this.joinVoice(channel);
        }
        break;
      }

      case "leave":
        this.leaveVoice();
        break;

      default:
        console.log("Mensaje WebSocket no reconocido:", msg.type);
    }
  }

  private async registerSlashCommands() {
    try {
      const rest = new REST({ version: "10" }).setToken(config.TOKEN);
      const commandFiles = readdirSync(join(__dirname, "..", "commands")).filter(
        (file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".map")
      );

      this.slashCommands = [];
      this.slashCommandsMap.clear();

      for (const file of commandFiles) {
        try {
          const command = await import(join(__dirname, "..", "commands", file));
          if (command.default && command.default.data) {
            this.slashCommands.push(command.default.data);
            this.slashCommandsMap.set(command.default.data.name, command.default);
          }
        } catch (cmdErr) {
          console.warn(`Error cargando comando ${file}:`, cmdErr);
        }
      }

      console.log(`[SLASH] Registrando ${this.slashCommands.length} comandos slash en Discord...`);
      await rest.put(Routes.applicationCommands(this.client.user!.id), {
        body: this.slashCommands
      });
      console.log("[SLASH] Comandos slash registrados con exito.");
    } catch (err: any) {
      console.error("[SLASH] Error al registrar comandos slash:", err.message);
    }
  }

  private async onInteractionCreate() {
    this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<any> => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.slashCommandsMap.get(interaction.commandName);
      if (!command) return;

      if (!this.cooldowns.has(interaction.commandName)) {
        this.cooldowns.set(interaction.commandName, new Collection());
      }

      const now = Date.now();
      const timestamps: any = this.cooldowns.get(interaction.commandName);
      const cooldownAmount = (command.cooldown || 1) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: i18n.__mf("common.cooldownMessage", {
              time: timeLeft.toFixed(1),
              name: interaction.commandName
            }),
            ephemeral: true
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        const permissionsCheck: PermissionResult = await checkPermissions(command, interaction);

        if (permissionsCheck.result) {
          command.execute(interaction as ChatInputCommandInteraction);
        } else {
          throw new MissingPermissionsException(permissionsCheck.missing);
        }
      } catch (error: any) {
        console.error("Error ejecutando comando:", error);
        if (error.message && error.message.includes("permissions")) {
          interaction.reply({ content: error.toString(), ephemeral: true }).catch(console.error);
        } else {
          interaction.reply({ content: i18n.__("common.errorCommand"), ephemeral: true }).catch(console.error);
        }
      }
    });
  }
}