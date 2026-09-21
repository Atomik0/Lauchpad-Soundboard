#!/usr/bin/env bash
set -e

# ==============================================================================
# SCRIPT DE SINCRONIZACION DUAL Y PUBLICACION SEGURA
# Repo Privado: git@github.com:Atomik0/SoundBoard-Bot-App-Firmware.git
# Repo Publico: git@github.com:Atomik0/Lauchpad-Soundboard.git
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PRIVATE_REPO="git@github.com:Atomik0/SoundBoard-Bot-App-Firmware.git"
PUBLIC_REPO="git@github.com:Atomik0/Lauchpad-Soundboard.git"

APP_DIR="$SCRIPT_DIR/app"
PKG_FILE="$APP_DIR/package.json"
VERSION_FILE="$APP_DIR/public/version.json"

echo "=================================================================="
echo "    PUBLICADOR Y SINCRONIZADOR DUAL (PRIVADO / PUBLICO)"
echo "=================================================================="
echo "  Repo Privado: $PRIVATE_REPO"
echo "  Repo Publico: $PUBLIC_REPO"
echo "=================================================================="
echo ""

CURRENT_VERSION=$(node -e "try { console.log(require('$PKG_FILE').version || '1.0.8'); } catch(e) { console.log('1.0.8'); }")
echo "Version actual del proyecto: v$CURRENT_VERSION"
echo ""

# ------------------------------------------------------------------------------
# FUNCION DE AUDITORIA DE SEGURIDAD (ANTI-FUGAS DE SECRETOS)
# ------------------------------------------------------------------------------
audit_for_secrets() {
  local TARGET_DIR="$1"
  echo "--> Ejecutando auditoria de seguridad anti-fugas en $TARGET_DIR..."

  local LEAK_FOUND=0

  local FORBIDDEN_FILES=(
    ".env"
    "bot_discord/.env"
    "vps_credentials.json"
    "app/public/vps_default.json"
  )

  for f in "${FORBIDDEN_FILES[@]}"; do
    if [ -f "$TARGET_DIR/$f" ]; then
      echo "  [ERROR CRITICO] Archivo sensible detectado: $f"
      LEAK_FOUND=1
    fi
  done

  if grep -r -E "185\.150\.189\.159|u6U7U08w2GYd" "$TARGET_DIR" \
    --exclude-dir=".git" --exclude="*.sh" --exclude="*.md" 2>/dev/null; then
    echo "  [ERROR CRITICO] Se detectaron credenciales de VPS en los archivos exportados."
    LEAK_FOUND=1
  fi

  if grep -r -E "OT[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]{6,}\.[0-9A-Za-z_-]{20,}|MT[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]{6,}\.[0-9A-Za-z_-]{20,}" "$TARGET_DIR" \
    --exclude-dir=".git" --exclude-dir="node_modules" 2>/dev/null; then
    echo "  [ERROR CRITICO] Se detecto un token de Discord en el codigo."
    LEAK_FOUND=1
  fi

  if [ "$LEAK_FOUND" -eq 1 ]; then
    echo ""
    echo "=================================================================="
    echo "  SUBIDA ABORTADA POR SEGURIDAD."
    echo "  Se detectaron secretos privados. Eliminalos antes de continuar."
    echo "=================================================================="
    return 1
  fi

  echo "  [OK] Auditoria superada: 0 secretos privados detectados."
  return 0
}

# ------------------------------------------------------------------------------
# FUNCION DE PREPARACION DE STAGING LIMPIO PARA EL REPO PUBLICO
# ------------------------------------------------------------------------------
prepare_clean_public_staging() {
  STAGING_DIR=$(mktemp -d -t launchpad_public_staging_XXXXXX)
  echo "--> Creando area de preparacion limpia en: $STAGING_DIR"

  rsync -av --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.env' \
            --exclude='bot_discord/.env' \
            --exclude='vps_credentials.json' \
            --exclude='app/public/vps_default.json' \
            --exclude='app/dist_exe' \
            --exclude='app/dist_linux' \
            --exclude='_backup_personal' \
            --exclude='app/_backup_personal' \
            --exclude='*.user_backup' \
            --exclude='app/public/sounds/custom/*' \
            --exclude='firmware/**/build' \
            --exclude='bot_discord/dist' \
            --exclude='.gemini' \
            --exclude='.agents' \
            "$SCRIPT_DIR/" "$STAGING_DIR/" >/dev/null

  mkdir -p "$STAGING_DIR/app/public/sounds/custom"
  touch "$STAGING_DIR/app/public/sounds/custom/.gitkeep"

  if [ -f "$STAGING_DIR/app/public/soundboard_clean_template.json" ]; then
    cp -f "$STAGING_DIR/app/public/soundboard_clean_template.json" "$STAGING_DIR/app/public/soundboard_config.json"
  fi

  if [ ! -f "$STAGING_DIR/.env.example" ]; then
    cat << 'EOF' > "$STAGING_DIR/.env.example"
VPS_HOST=tu-ip-o-dominio.com
VPS_USER=root
VPS_PASS=tu-contraseña-segura
VPS_PORT=22
EOF
  fi

  if ! audit_for_secrets "$STAGING_DIR"; then
    rm -rf "$STAGING_DIR"
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# DETERMINACION AUTOMATICA DE VERSION Y TITULO
# ------------------------------------------------------------------------------
LAST_COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo '')
if [[ "$LAST_COMMIT_MSG" == *"release: v$CURRENT_VERSION"* ]]; then
  NEW_VERSION="$CURRENT_VERSION"
  echo "--> Detectado commit de release v$CURRENT_VERSION previo. Se completara la publicacion de esta version."
else
  NEW_VERSION=$(node -e "
    const p = '$CURRENT_VERSION'.split('.').map(Number);
    if (p.length < 3 || p.some(isNaN)) {
      console.log('1.0.1');
    } else {
      p[2] = (p[2] || 0) + 1;
      console.log(p.join('.'));
    }
  ")
fi

export BUILD_VERSION="$NEW_VERSION"

RELEASE_TITLE="Launchpad Studio Pro v$NEW_VERSION"
RELEASE_NOTES="Actualizacion v$NEW_VERSION con mejoras de rendimiento, estabilidad y nuevas funciones."

echo "--> Version a publicar: v$NEW_VERSION"
echo "--> Titulo del Release: $RELEASE_TITLE"

# 1. Actualizar version localmente
echo ""
echo "[1/6] Actualizando version en package.json y version.json..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$PKG_FILE', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$PKG_FILE', JSON.stringify(pkg, null, 2), 'utf8');

  const verData = { version: '$NEW_VERSION', buildDate: new Date().toISOString() };
  fs.writeFileSync('$VERSION_FILE', JSON.stringify(verData, null, 2), 'utf8');
"

# 2. Compilar binarios y paquete de actualizacion in-app
echo ""
echo "[2/6] Compilando paquetes y generando actualizador in-app..."

if [ -d "$APP_DIR/dist_exe/Launchpad Studio Pro-v$NEW_VERSION-win32-x64" ] && \
   [ -f "$APP_DIR/dist_exe/app-update-v$NEW_VERSION.zip" ]; then
  echo "  [INFO] Paquete Windows y actualizador v$NEW_VERSION ya compilados. Reutilizando..."
else
  if [ -f "$SCRIPT_DIR/compilar_win.sh" ]; then
    bash "$SCRIPT_DIR/compilar_win.sh"
  fi
fi

if [ -d "$APP_DIR/dist_linux/Launchpad Studio Pro-v$NEW_VERSION-linux-x64" ]; then
  echo "  [INFO] Paquete Linux v$NEW_VERSION ya compilado. Reutilizando..."
else
  if [ -f "$SCRIPT_DIR/compilar_linux.sh" ]; then
    bash "$SCRIPT_DIR/compilar_linux.sh"
  fi
fi

UPDATE_ZIP="$APP_DIR/dist_exe/app-update-v$NEW_VERSION.zip"
if [ ! -f "$UPDATE_ZIP" ]; then
  UPDATE_ZIP="$APP_DIR/dist_linux/app-update-v$NEW_VERSION.zip"
fi

WIN_ZIP="$APP_DIR/dist_exe/Launchpad-Studio-Pro-v$NEW_VERSION-win32-x64.zip"
LINUX_TAR="$APP_DIR/dist_linux/Launchpad-Studio-Pro-v$NEW_VERSION-linux-x64.tar.gz"

if [ -d "$APP_DIR/dist_exe/Launchpad Studio Pro-v$NEW_VERSION-win32-x64" ] && [ ! -f "$WIN_ZIP" ]; then
  echo "--> Comprimiendo paquete Windows completo en $WIN_ZIP..."
  (cd "$APP_DIR/dist_exe" && zip -rq "$WIN_ZIP" "Launchpad Studio Pro-v$NEW_VERSION-win32-x64")
fi

if [ -d "$APP_DIR/dist_linux/Launchpad Studio Pro-v$NEW_VERSION-linux-x64" ] && [ ! -f "$LINUX_TAR" ]; then
  echo "--> Comprimiendo paquete Linux completo en $LINUX_TAR..."
  tar -czf "$LINUX_TAR" -C "$APP_DIR/dist_linux" "Launchpad Studio Pro-v$NEW_VERSION-linux-x64"
fi

# 3. Subir al Repo Privado
echo ""
echo "[3/6] Sincronizando repositorio privado (SoundBoard-Bot-App-Firmware)..."
git add -A
git commit -m "release: v$NEW_VERSION - $RELEASE_TITLE" || echo "Sin cambios para commit privado."
git push origin main
git tag -f "v$NEW_VERSION" || true
git push --force origin "v$NEW_VERSION" || true

# 4. Preparar y subir al Repo Publico
echo ""
echo "[4/6] Preparando y sanitizando codigo para el repositorio publico..."
prepare_clean_public_staging

cd "$STAGING_DIR"
git init -b main >/dev/null
git config user.name "$(git -C "$SCRIPT_DIR" config user.name || echo 'Atomik0')"
git config user.email "$(git -C "$SCRIPT_DIR" config user.email || echo 'developer@soundboard.local')"
git remote add public-origin "$PUBLIC_REPO"

git add -A
git commit -m "release: v$NEW_VERSION - $RELEASE_TITLE"
git tag -a "v$NEW_VERSION" -m "$RELEASE_TITLE"

echo ""
echo "[5/6] Enviando arbol limpio al repositorio publico..."
git push --force public-origin main
git push --force public-origin "v$NEW_VERSION"

cd "$SCRIPT_DIR"
rm -rf "$STAGING_DIR"

# 5. Publicar Release en GitHub
echo ""
echo "[6/6] Publicando GitHub Release en Atomik0/Lauchpad-Soundboard..."

RELEASE_ASSETS=()
if [ -f "$UPDATE_ZIP" ]; then
  RELEASE_ASSETS+=("$UPDATE_ZIP")
fi
if [ -f "$WIN_ZIP" ]; then
  RELEASE_ASSETS+=("$WIN_ZIP")
fi
if [ -f "$LINUX_TAR" ]; then
  RELEASE_ASSETS+=("$LINUX_TAR")
fi

if command -v gh >/dev/null 2>&1; then
  echo "--> Creando release con GitHub CLI (gh)..."
  gh release create "v$NEW_VERSION" "${RELEASE_ASSETS[@]}" \
    --repo "Atomik0/Lauchpad-Soundboard" \
    --title "Launchpad Studio Pro v$NEW_VERSION - $RELEASE_TITLE" \
    --notes "$RELEASE_NOTES" || {
      echo "  [AVISO] No se pudo crear con gh automaticamente. Procediendo con modo manual..."
    }
else
  echo ""
  echo "GitHub CLI (gh) no detectado. Paquetes listos para subir manualmente:"
fi

mkdir -p "$SCRIPT_DIR/releases_para_subir"
for asset in "${RELEASE_ASSETS[@]}"; do
  cp -f "$asset" "$SCRIPT_DIR/releases_para_subir/" 2>/dev/null || true
  echo "  - $(basename "$asset") ($(du -h "$asset" | cut -f1))"
done

echo ""
echo "=================================================================="
echo "  VERSION v$NEW_VERSION PUBLICADA CON EXITO"
echo "=================================================================="
echo "  1. Repositorio Privado actualizado con todos tus cambios."
echo "  2. Repositorio Publico actualizado con codigo 100% LIMPIO."
echo "  3. Los archivos descargables para el Release estan en:"
echo "     $SCRIPT_DIR/releases_para_subir/"
echo ""
echo "  Si el release no se publico automaticamente via gh, cargalos en:"
echo "  https://github.com/Atomik0/Lauchpad-Soundboard/releases/new?tag=v$NEW_VERSION"
echo ""
echo "  Tus usuarios veran la notificacion in-app automaticamente en su"
echo "  Launchpad Studio Pro y se actualizaran con 1 clic."
echo "=================================================================="
