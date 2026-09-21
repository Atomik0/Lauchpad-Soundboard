#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
BACKUP_DIR="$APP_DIR/_backup_personal"
CUSTOM_DIR="$APP_DIR/public/sounds/custom"
CONFIG_FILE="$APP_DIR/public/soundboard_config.json"
CLEAN_TEMPLATE="$APP_DIR/public/soundboard_clean_template.json"

RESTORED=0

restore_personal_data() {
  if [ "$RESTORED" -eq 1 ]; then
    return
  fi

  echo ""
  echo "[4/4] Restaurando audios personales y configuracion original..."

  if [ -f "$BACKUP_DIR/soundboard_config.json" ]; then
    cp -f "$BACKUP_DIR/soundboard_config.json" "$CONFIG_FILE"
  fi

  if [ -d "$BACKUP_DIR/custom_sounds" ]; then
    mkdir -p "$CUSTOM_DIR"
    cp -rf "$BACKUP_DIR/custom_sounds/"* "$CUSTOM_DIR/" 2>/dev/null || true
  fi

  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
  fi

  if [ -f "$APP_DIR/public/vps_default.json" ]; then
    rm -f "$APP_DIR/public/vps_default.json"
  fi

  RESTORED=1
}

trap restore_personal_data EXIT INT TERM

echo "========================================================"
echo "  GENERADOR DE EJECUTABLE .EXE LIMPIO PARA AMIGOS"
echo "========================================================"
echo ""

check_vps_credentials_before_build() {
  local CREDS_FILE="$SCRIPT_DIR/vps_credentials.json"
  local NEEDS_CONFIG=0

  if [ ! -f "$CREDS_FILE" ]; then
    NEEDS_CONFIG=1
  else
    local CURRENT_URL
    CURRENT_URL=$(node -e "try { const c = JSON.parse(require('fs').readFileSync('$CREDS_FILE', 'utf8')); console.log(c.vpsUrl || ''); } catch(e) { console.log(''); }")
    if [ -z "$CURRENT_URL" ] || [[ "$CURRENT_URL" == *"localhost"* ]] || [[ "$CURRENT_URL" == *"127.0.0.1"* ]] || [[ "$CURRENT_URL" == *"tu-ip"* ]]; then
      NEEDS_CONFIG=1
    fi
  fi

  if [ "$NEEDS_CONFIG" -eq 1 ]; then
    echo "========================================================"
    echo "  AVISO: CONFIGURACION DE VPS REQUERIDA"
    echo "========================================================"
    echo "Aun no has configurado la conexion con el Bot de Discord."
    echo "Si compilas el programa ahora, tus amigos NO podran escuchar"
    echo "los audios del bot en las llamadas."
    echo ""
    echo "Opciones:"
    echo "1) Abrir la aplicacion con 'npm start' en la carpeta app"
    echo "   y completar el Asistente de Instalacion en pantalla."
    echo "2) Ingresar la direccion y clave de tu VPS ahora mismo."
    echo "========================================================"
    echo ""
    read -r -p "Deseas ingresar los datos de tu VPS ahora mismo por consola? (s/n): " RESP
    if [[ "$RESP" =~ ^[sS]$ ]]; then
      read -r -p "Direccion IP o dominio de tu VPS (ej: ws://111.222.333.444:3002): " INPUT_URL
      if [[ ! "$INPUT_URL" =~ ^wss?:// ]]; then
        INPUT_URL="ws://$INPUT_URL"
      fi
      read -r -p "Clave secreta del bot [launchpad2026]: " INPUT_KEY
      INPUT_KEY="${INPUT_KEY:-launchpad2026}"

      cat << EOF > "$CREDS_FILE"
{
  "vpsUrl": "$INPUT_URL",
  "secretKey": "$INPUT_KEY",
  "setupCompleted": true
}
EOF
      echo "[OK] Archivo 'vps_credentials.json' guardado exitosamente."
      echo ""
    else
      echo ""
      echo "[CANCELADO] Compilacion abortada. Abre la aplicacion ('cd app && npm start')"
      echo "            para configurarla con el asistente antes de compilar para amigos."
      exit 1
    fi
  fi
  
  local CHECK_URL
  CHECK_URL=$(node -e "try { const c = JSON.parse(require('fs').readFileSync('$CREDS_FILE', 'utf8')); console.log(c.vpsUrl || ''); } catch(e) { console.log(''); }")

  echo "[INFO] Comprobando disponibilidad del Bot en $CHECK_URL..."
  local PING_OK=0
  if node -e "
    const WebSocket = require('$APP_DIR/node_modules/ws');
    const ws = new WebSocket('$CHECK_URL');
    const t = setTimeout(() => { try { ws.close(); } catch(e){} process.exit(1); }, 3000);
    ws.on('open', () => { clearTimeout(t); try { ws.close(); } catch(e){} process.exit(0); });
    ws.on('error', () => { clearTimeout(t); process.exit(1); });
  " 2>/dev/null; then
    PING_OK=1
    echo "[OK] Bot detectado en linea en $CHECK_URL."
    echo ""
  else
    echo ""
    echo "========================================================"
    echo "  ADVERTENCIA: EL BOT NO RESPONDE EN $CHECK_URL"
    echo "========================================================"
    echo "No se pudo establecer conexion con el WebSocket del Bot."
    echo "Si compilas ahora, tus amigos no podran escuchar audios"
    echo "hasta que el bot este encendido y accesible en esa direccion."
    echo ""
    read -r -p "Deseas continuar con la compilacion de todas formas? (s/n): " PROCEED_ANYWAY
    if [[ ! "$PROCEED_ANYWAY" =~ ^[sS]$ ]]; then
      echo ""
      echo "[CANCELADO] Compilacion detenida para evitar distribuir una version sin conexion."
      exit 1
    fi
    echo ""
  fi
}

check_vps_credentials_before_build

echo "[1/4] Resguardando tus audios personales y configuracion actual..."
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/custom_sounds"

if [ -f "$CONFIG_FILE" ]; then
  cp -f "$CONFIG_FILE" "$BACKUP_DIR/soundboard_config.json"
fi

if [ -d "$CUSTOM_DIR" ] && [ "$(ls -A "$CUSTOM_DIR" 2>/dev/null)" ]; then
  cp -rf "$CUSTOM_DIR/"* "$BACKUP_DIR/custom_sounds/"
fi

echo "[2/4] Limpiando carpeta de audios y preparando plantilla virgen..."

if [ -f "$CLEAN_TEMPLATE" ]; then
  cp -f "$CLEAN_TEMPLATE" "$CONFIG_FILE"
else
  cat << 'EOF' > "$CONFIG_FILE"
{"version":1,"currentBankId":"capa_1","bankOrder":["capa_1"],"bankNames":{"capa_1":"Capa 1"},"masterVolume":0.8,"botDiscordVolume":0.8,"pressEffect":1,"idleEffect":11,"blendMode":0,"selectedHeadphonesId":"default","selectedDiscordId":"default","muteLocalOnDiscord":true,"banks":{"capa_1":[]}}
EOF
fi

if [ -d "$CUSTOM_DIR" ]; then
  rm -f "$CUSTOM_DIR"/* 2>/dev/null || true
fi

if [ -f "$SCRIPT_DIR/vps_credentials.json" ]; then
  node -e "
    const fs = require('fs');
    const c = JSON.parse(fs.readFileSync('$SCRIPT_DIR/vps_credentials.json', 'utf8'));
    c.isPreconfigured = true;
    fs.writeFileSync('$APP_DIR/public/vps_default.json', JSON.stringify(c, null, 2), 'utf8');
  "
fi

echo "[3/4] Compilando ejecutable con conexion automatica al VPS..."
echo "(Esto puede tardar unos 30-60 segundos la primera vez...)"
echo ""

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "[INFO] No se encontraron dependencias instaladas en app."
  echo "[INFO] Ejecutando npm install en $APP_DIR..."
  (cd "$APP_DIR" && ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}" npm install)
fi

(cd "$APP_DIR" && npm run build:exe)

restore_personal_data

echo ""
echo "========================================================"
echo "  EJECUTABLE LIMPIO GENERADO CON EXITO"
echo "========================================================"
echo ""
APP_VERSION=$(node -e "try { console.log(require('$APP_DIR/package.json').version); } catch(e) { console.log('1.0.0'); }")

echo "  La carpeta limpia lista para distribuir esta en:"
echo "  app/dist_exe/Launchpad Studio Pro-v$APP_VERSION-win32-x64/"
echo ""
echo "  Version generada: v$APP_VERSION"
echo ""
echo "  - La version compilada va 100% limpia (SIN TUS AUDIOS)."
echo "  - Se conecta automaticamente al Bot del VPS."
echo "  - Tus audios personales en tu maquina siguen intactos."
echo ""
echo "  Solo comprime la carpeta 'Launchpad Studio Pro-v$APP_VERSION-win32-x64' en ZIP"
echo "  y enviasela a tus amigos."
echo "========================================================"
