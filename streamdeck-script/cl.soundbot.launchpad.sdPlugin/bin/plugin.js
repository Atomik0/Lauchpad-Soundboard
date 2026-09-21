#!/usr/bin/env node
'use strict';

/**
 * Plugin de Stream Deck: Soundbot Discord
 *
 * Se conecta con Elgato Stream Deck a través de su protocolo WebSocket local
 * y retransmite comandos de audio al servidor WebSocket del Bot de Discord (VPS o local).
 *
 * Compatible con:
 * - Elgato Stream Deck (todas las versiones)
 * - Bot Discord DJM (protocolo play_buffer y stop)
 */

const fs = require('fs');
const path = require('path');

let WebSocketClass = null;

function loadWebSocket() {
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket;
  }

  const searchPaths = [
    'ws',
    path.join(__dirname, 'node_modules', 'ws'),
    path.join(__dirname, '..', 'app', 'node_modules', 'ws'),
    path.join(__dirname, '..', 'bot_discord', 'node_modules', 'ws'),
    path.join(process.cwd(), 'app', 'node_modules', 'ws')
  ];

  for (const p of searchPaths) {
    try {
      return require(p);
    }
    catch {
      // continuar buscando
    }
  }

  throw new Error(
    'No se encontró el módulo "ws". Ejecuta "npm install ws" o instala las dependencias de "app".'
  );
}

try {
  WebSocketClass = loadWebSocket();
}
catch (err) {
  console.error('[FATAL]', err.message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];

    if (raw.startsWith('-')) {
      const key = raw.replace(/^-+/, '');
      const val = argv[i + 1];

      if (val !== undefined && !val.startsWith('-')) {
        args[key] = val;
        i++;
      }
      else {
        args[key] = true;
      }
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const port = args.port || process.env.SD_PORT;
const pluginUUID = args.pluginUUID || process.env.SD_PLUGIN_UUID;
const registerEvent = args.registerEvent || process.env.SD_REGISTER_EVENT || 'registerPlugin';

const ACTION_PLAY = 'cl.soundbot.launchpad.play';
const ACTION_STOP = 'cl.soundbot.launchpad.stop';

const DEFAULT_BOT_URL = process.env.BOT_WS_URL || null;
const DEFAULT_AUTH_TOKEN = process.env.BOT_SECRET_KEY || process.env.BOT_AUTH_TOKEN || null;

let sdSocket = null;
let botSocket = null;
let botWsUrl = DEFAULT_BOT_URL;
let botAuthToken = DEFAULT_AUTH_TOKEN;
let botAuthenticated = false;

let reconnectTimer = null;
let heartbeatTimer = null;

const uploadedSounds = new Set();
const contextSettings = new Map();
const lastContextBySound = new Map();

console.log('====================================================');
console.log(' Soundbot Discord - Elgato Stream Deck Plugin');
console.log('====================================================');

function connectStreamDeck() {
  if (!port || !pluginUUID) {
    console.warn('[STREAMDECK] Plugin ejecutado fuera del software Stream Deck o sin argumentos requeridos.');
    console.warn(`[STREAMDECK] Parámetros recibidos: port=${port}, pluginUUID=${pluginUUID}`);
    console.log('[BOT] Iniciando conexión directa al Bot de Discord en modo de espera...');

    connectBot();

    return;
  }

  try {
    sdSocket = new WebSocketClass(`ws://127.0.0.1:${port}`);
  } catch (err) {
    console.error('[STREAMDECK] Error al instanciar socket local:', err.message);
    setTimeout(connectStreamDeck, 3000);
    return;
  }

  sdSocket.on('open', () => {
    console.log(`[STREAMDECK] Conectado al software Elgato en puerto ${port}`);

    sdSocket.send(JSON.stringify({ event: registerEvent, uuid: pluginUUID }));
    sdSocket.send(JSON.stringify({ event: 'getGlobalSettings', context: pluginUUID }));
  });

  sdSocket.on('message', (data) => {
    let msg;

    try {
      msg = JSON.parse(data.toString());
    }
    catch {
      return;
    }

    handleStreamDeckEvent(msg);
  });

  sdSocket.on('close', () => {
    console.warn('[STREAMDECK] Conexión con Stream Deck cerrada. Reintentando en 3s...');
    sdSocket = null;
    setTimeout(connectStreamDeck, 3000);
  });

  sdSocket.on('error', (err) => {
    console.warn('[STREAMDECK] Error de socket:', err.message);
  });
}

function handleStreamDeckEvent(msg) {
  const { event, action, context, payload } = msg;

  switch (event) {
    case 'didReceiveGlobalSettings': {
      const gs = (payload && payload.settings) || {};
      const newUrl = gs.wsUrl || gs.vpsUrl || gs.serverUrl || DEFAULT_BOT_URL;
      const newToken = gs.authToken || gs.secretKey || gs.token || DEFAULT_AUTH_TOKEN;

      const urlChanged = newUrl !== botWsUrl;
      const tokenChanged = newToken !== botAuthToken;

      botWsUrl = newUrl;
      botAuthToken = newToken;

      if ((urlChanged || tokenChanged) && botSocket) {
        console.log('[CONFIG] Ajustes globales actualizados. Reiniciando conexión con Bot...');
        try { botSocket.close(); } catch { }
      }

      connectBot();

      break;
    }

    case 'willAppear': {
      if (context) {
        const settings = (payload && payload.settings) || {};
        contextSettings.set(context, settings);
      }

      break;
    }

    case 'willDisappear': {
      if (context) {
        contextSettings.delete(context);
      }

      break;
    }

    case 'didReceiveSettings': {
      if (context) {
        const settings = (payload && payload.settings) || {};
        contextSettings.set(context, settings);
      }

      break;
    }

    case 'keyDown':
    case 'touchTap': {
      const currentAction = action || (payload && payload.action) || ACTION_PLAY;
      const settings = (payload && payload.settings) || contextSettings.get(context) || {};

      if (currentAction === ACTION_STOP) {
        stopAllSounds(context);
      }
      else {
        playSound(context, settings);
      }

      break;
    }

    case 'sendToPlugin': {
      handlePropertyInspectorMessage(context, action, payload);

      break;
    }

    case 'propertyInspectorDidAppear': {
      sendToPropertyInspector(context, {
        event: 'botStatus',
        connected: !!(botSocket && botSocket.readyState === WebSocketClass.OPEN),
        authenticated: botAuthenticated,
        wsUrl: botWsUrl
      });

      break;
    }
  }
}

function handlePropertyInspectorMessage(context, action, payload) {
  if (!payload) return;

  if (payload.action === 'getBotStatus') {
    sendToPropertyInspector(context, {
      event: 'botStatus',
      connected: !!(botSocket && botSocket.readyState === WebSocketClass.OPEN),
      authenticated: botAuthenticated,
      wsUrl: botWsUrl
    });
  }
  else if (payload.action === 'testSound') {
    playSound(context, payload.settings || {});
  }
  else if (payload.action === 'stopSound') {
    stopAllSounds(context);
  }
}

function sendToPropertyInspector(context, payload) {
  if (!sdSocket || sdSocket.readyState !== WebSocketClass.OPEN || !context) return;

  sdSocket.send(JSON.stringify({
    event: 'sendToPropertyInspector',
    context: context,
    payload: payload
  }));
}

function connectBot() {
  if (!botWsUrl) return;

  if (botSocket && (botSocket.readyState === WebSocketClass.OPEN || botSocket.readyState === WebSocketClass.CONNECTING)) {
    return;
  }

  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);

  try {
    console.log(`[BOT] Conectando a ${botWsUrl}...`);
    botSocket = new WebSocketClass(botWsUrl);
  }
  catch (e) {
    console.error(`[BOT] Error al iniciar socket con ${botWsUrl}:`, e.message);
    scheduleReconnect();
    return;
  }

  botSocket.on('open', () => {
    console.log('[BOT] Conexión establecida con', botWsUrl);
    botAuthenticated = false;

    uploadedSounds.clear();

    if (botAuthToken) {
      console.log('[BOT] Enviando token de autenticación...');

      botSocket.send(JSON.stringify({
        type: 'auth',
        token: botAuthToken
      }));
    }
    else {
      botAuthenticated = true;
      botSocket.send(JSON.stringify({ type: 'get_status' }));
    }

    heartbeatTimer = setInterval(() => {
      if (botSocket && botSocket.readyState === WebSocketClass.OPEN) {
        botSocket.send(JSON.stringify({ type: 'get_status' }));
      }
    }, 20000);
  });

  botSocket.on('message', (raw) => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    }
    catch {
      return;
    }

    handleBotMessage(msg);
  });

  botSocket.on('close', () => {
    console.warn('[BOT] Conexión cerrada con el bot. Reintentando en 3s...');
    botAuthenticated = false;
    clearInterval(heartbeatTimer);
    scheduleReconnect();
  });

  botSocket.on('error', (e) => {
    console.warn('[BOT] Error en socket del bot:', e.message);
  });
}

function handleBotMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'auth_ok': {
      console.log('[BOT] Autenticación exitosa con el servidor de Discord.');
      botAuthenticated = true;
      botSocket.send(JSON.stringify({ type: 'get_status' }));

      break;
    }

    case 'auth_error': {
      console.error('[BOT] Error de autenticación:', msg.message || 'Clave secreta incorrecta');
      botAuthenticated = false;

      break;
    }

    case 'auth_required': {
      console.warn('[BOT] El servidor requiere clave secreta (SECRET_KEY). Configúrala en los ajustes.');
      botAuthenticated = false;

      break;
    }

    case 'play_result': {
      if (msg.success) {
        console.log(`[BOT] Sonido reproducido correctamente: ${msg.soundId || msg.soundPath || 'OK'}`);
      }
      else {
        console.error(`[BOT] Fallo al reproducir sonido: ${msg.error || 'Error desconocido'}`);

        if (msg.soundId) {
          uploadedSounds.delete(msg.soundId);
        }

        const ctx = lastContextBySound.get(msg.soundId);

        if (ctx) {
          flash(ctx, false);
        }
      }

      break;
    }

    case 'bot_status': {
      break;
    }

    case 'warn': {
      console.warn('[BOT]', msg.message);

      break;
    }
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectBot, 3000);
}

function sanitizePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';

  return rawPath.trim().replace(/^["']|["']$/g, '');
}

function deriveSoundInfo(filePath) {
  let soundId = 'snd_sin_nombre';
  let ext = '.mp3';

  if (filePath) {
    const rawFileName = path.basename(filePath);
    const dotIdx = rawFileName.lastIndexOf('.');

    if (dotIdx !== -1) {
      soundId = rawFileName.substring(0, dotIdx).replace(/[^a-zA-Z0-9_-]/g, '_');
      const rawExt = rawFileName.substring(dotIdx).toLowerCase();
      ext = ['.mp3', '.wav', '.ogg'].includes(rawExt) ? rawExt : '.mp3';
    }
    else {
      soundId = rawFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  }

  return { soundId, ext };
}

async function playSound(context, settings) {
  if (!botSocket || botSocket.readyState !== WebSocketClass.OPEN) {
    console.warn('[BOT] WebSocket no conectado al bot de Discord');
    flash(context, false);

    return;
  }

  if (botAuthToken && !botAuthenticated) {
    console.warn('[BOT] Aún no se completó la autenticación con el bot; se omite la reproducción');
    flash(context, false);

    return;
  }

  const rawPath = sanitizePath(settings.audioPath);

  if (!rawPath) {
    console.warn('[BOT] El botón no tiene una ruta de audio configurada');
    flash(context, false);

    return;
  }

  const resolvedPath = path.resolve(rawPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[BOT] Archivo no encontrado en disco: ${resolvedPath}`);
    flash(context, false);

    return;
  }

  const { soundId, ext } = deriveSoundInfo(resolvedPath);

  const numVol = Number(settings.volume ?? 100);
  const volume = Math.min(Math.max(isNaN(numVol) ? 1.0 : numVol / 100, 0), 1.0);

  lastContextBySound.set(soundId, context);

  if (uploadedSounds.has(soundId)) {
    console.log(`[BOT] Reproduciendo desde caché del servidor: ${soundId}${ext} (Vol: ${volume})`);

    botSocket.send(JSON.stringify({
      type: 'play_buffer',
      soundId,
      ext,
      volume
    }));

    flash(context, true);

    return;
  }

  try {
    const stats = fs.statSync(resolvedPath);

    if (stats.size > 50 * 1024 * 1024) {
      console.error('[BOT] El archivo excede el tamaño máximo permitido (50MB)');
      flash(context, false);
      return;
    }

    console.log(`[BOT] Leyendo y subiendo ${path.basename(resolvedPath)} (${Math.round(stats.size / 1024)} KB)...`);
    const buf = fs.readFileSync(resolvedPath);
    const base64Data = buf.toString('base64');

    botSocket.send(JSON.stringify({
      type: 'play_buffer',
      soundId,
      ext,
      buffer: base64Data,
      volume
    }));

    uploadedSounds.add(soundId);

    flash(context, true);
  }
  catch (e) {
    console.error('[BOT] Error al leer o transmitir el archivo:', e.message);
    flash(context, false);
  }
}

function stopAllSounds(context) {
  if (!botSocket || botSocket.readyState !== WebSocketClass.OPEN) {
    console.warn('[BOT] WebSocket no conectado al bot de Discord para stop');
    flash(context, false);

    return;
  }

  if (botAuthToken && !botAuthenticated) {
    console.warn('[BOT] Aún no se completó la autenticación con el bot; se omite el stop');
    flash(context, false);

    return;
  }

  console.log('[BOT] Enviando comando de parada (stop)...');
  botSocket.send(JSON.stringify({ type: 'stop' }));

  flash(context, true);
}

function flash(context, ok) {
  if (!sdSocket || sdSocket.readyState !== WebSocketClass.OPEN || !context) return;
  sdSocket.send(JSON.stringify({
    event: ok ? 'showOk' : 'showAlert',
    context: context
  }));
}

connectStreamDeck();
