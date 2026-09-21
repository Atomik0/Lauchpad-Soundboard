#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
BOT_DIR="$SCRIPT_DIR/bot_discord"

export ELECTRON_DISABLE_SANDBOX=1

echo "========================================================"
echo "  LAUNCHPAD 8x8 STUDIO PRO"
echo "========================================================"
echo ""
echo "  [1] Iniciar Soundboard Studio (Conectado a VPS 24/7) [DEFAULT]"
echo "  [2] Iniciar Soundboard Studio + Bot Local (Desarrollo)"
echo ""
echo "  Iniciando automaticamente con VPS en 4 segundos..."
echo "  (Presiona 2 para iniciar bot local)"
echo ""

read -t 4 -n 1 -r OPTION || OPTION="1"
echo ""

if [ "$OPTION" != "2" ]; then
  OPTION="1"
fi

check_dependencies() {
  local target_dir="$1"
  local label="$2"
  if [ ! -d "$target_dir/node_modules" ]; then
    echo "[INFO] No se detectaron dependencias instaladas en $label."
    echo "[INFO] Ejecutando npm install en $target_dir..."
    (cd "$target_dir" && ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}" npm install)
  fi
}

start_terminal_or_bg() {
  local title="$1"
  local work_dir="$2"
  local run_cmd="$3"

  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --title="$title" --working-directory="$work_dir" -- bash -c "$run_cmd; exec bash"
  elif command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -T "$title" -e bash -c "cd '$work_dir' && $run_cmd; exec bash" &
  elif command -v xterm >/dev/null 2>&1; then
    xterm -T "$title" -e "cd '$work_dir' && $run_cmd; bash" &
  else
    echo "[INFO] No se encontro emulador de terminal grafico. Ejecutando en segundo plano..."
    (cd "$work_dir" && eval "$run_cmd") &
    LOCAL_BOT_PID=$!
    trap 'kill $LOCAL_BOT_PID 2>/dev/null || true' EXIT INT TERM
  fi
}

if [ "$OPTION" = "2" ]; then
  echo ""
  echo "[1/2] Levantando DJM BOT en local (ws://127.0.0.1:3002)..."
  check_dependencies "$BOT_DIR" "bot_discord"
  start_terminal_or_bg "DJM BOT - Local" "$BOT_DIR" "npm start"
  sleep 3

  echo "[2/2] Abriendo Launchpad Soundboard Studio..."
  check_dependencies "$APP_DIR" "app"
  (cd "$APP_DIR" && npm start)
else
  echo ""
  echo "[1/1] Abriendo Launchpad Soundboard Studio (VPS)..."
  check_dependencies "$APP_DIR" "app"
  (cd "$APP_DIR" && npm start)
fi

echo ""
echo "========================================================"
echo "  Launchpad Soundboard Studio cerrado."
echo "========================================================"
