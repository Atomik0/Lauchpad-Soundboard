#!/usr/bin/env python3
import os
import sys
import tarfile
import paramiko

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(LOCAL_DIR, ".env")

def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k and k not in os.environ:
                os.environ[k] = v

load_env(ENV_PATH)

HOST = os.environ.get("VPS_HOST", sys.argv[1] if len(sys.argv) > 1 else "")
USER = os.environ.get("VPS_USER", sys.argv[2] if len(sys.argv) > 2 else "")
PASSWORD = os.environ.get("VPS_PASS", sys.argv[3] if len(sys.argv) > 3 else "")
PORT = int(os.environ.get("VPS_PORT", "22"))

if not HOST or not USER or not PASSWORD:
    print("Error: Credenciales de VPS no configuradas.")
    print("Por favor define VPS_HOST, VPS_USER y VPS_PASS en el archivo .env o pasalas por parametro:")
    print("  python3 deploy.py <HOST> <USER> <PASSWORD>")
    sys.exit(1)

BOT_DIR = os.path.join(LOCAL_DIR, "bot_discord")
LOCAL_TAR = "/tmp/bot_discord_update.tar.gz"
REMOTE_TAR = "/tmp/bot_discord_update.tar.gz"

if not os.path.exists(BOT_DIR):
    print(f"Error: No se encontro el directorio del bot en: {BOT_DIR}")
    sys.exit(1)

print("=== DESPLIEGUE AUTOMATIZADO DE DJM SOUNDBOARD BOT ===")
print(f"Destino: {USER}@{HOST}:{PORT}")

print("\n[1/5] Empaquetando codigo de bot_discord...")

def tar_filter(tarinfo):
    ignored = ["node_modules", "dist", ".env", "storage/sounds"]
    for item in ignored:
        if item in tarinfo.name:
            return None
    return tarinfo

with tarfile.open(LOCAL_TAR, "w:gz") as tar:
    tar.add(BOT_DIR, arcname=".", filter=tar_filter)

print(f"Paquete temporal creado en {LOCAL_TAR} ({os.path.getsize(LOCAL_TAR)} bytes)")

print(f"\n[2/5] Conectando via SSH a {HOST}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
print("Conexion SSH establecida correctamente.")

print("\n[3/5] Subiendo paquete actualizado por SFTP...")
sftp = client.open_sftp()
sftp.put(LOCAL_TAR, REMOTE_TAR)
sftp.close()
print("Transferencia completada.")

if os.path.exists(LOCAL_TAR):
    os.remove(LOCAL_TAR)

commands = [
    ("Crear respaldo de seguridad previo", "cp -r /opt/discord-soundboard-bot /opt/discord-soundboard-bot-backup-$(date +%Y%m%d%H%M%S)"),
    ("Descomprimir actualizacion en /opt/discord-soundboard-bot", f"tar -xzf {REMOTE_TAR} -C /opt/discord-soundboard-bot && rm -f {REMOTE_TAR}"),
    ("Reconstruir imagen Docker", "cd /opt/discord-soundboard-bot && docker compose build"),
    ("Reiniciar contenedor Docker", "cd /opt/discord-soundboard-bot && docker compose up -d"),
    ("Verificar estado del contenedor", "docker ps --filter name=djm-soundboard-bot"),
    ("Comprobar registros de arranque", "sleep 3 && docker logs --tail 25 djm-soundboard-bot")
]

print("\n[4/5] Ejecutando actualizacion y reconstruccion remota...")

for label, cmd in commands:
    print(f"\n---> {label}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print(out.strip())
    if err and "Building" not in err and "Recreated" not in err and "Started" not in err:
        print(f"[LOG] {err.strip()}")

client.close()

print("\n[5/5] Despliegue completado con exito.")
