#!/usr/bin/env bash
set -e

# Cambiar al directorio raiz del repositorio
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

echo "=================================================================="
echo "Actualizando repositorio local desde repositorios remotos"
echo "=================================================================="

# Verificar que el remote 'origin' exista
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "[ERROR] Remote 'origin' no configurado."
    exit 1
fi

# Verificar si el remote 'public' existe; si no, agregarlo
if ! git remote get-url public >/dev/null 2>&1; then
    echo "[INFO] Configurando remote 'public'..."
    git remote add public git@github.com:Atomik0/Launchpad-Soundboard.git
fi

# Descargar metadatos y ramas de todos los remotos
echo "[1/2] Descargando referencias de todos los remotos (fetch)..."
git fetch --all --prune

# Verificar si hay cambios sin commitear en el arbol de trabajo
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "[AVISO] Tienes cambios locales sin guardar en commit o stash."
    echo "Para evitar conflictos, guarda tus cambios antes de actualizar:"
    echo "  git stash"
    echo "  ./actualizar_cambios.sh"
    echo "  git stash pop"
    exit 1
fi

# Actualizar la rama local main desde el repositorio privado
echo "[2/2] Aplicando cambios desde origin/main (Fast-Forward)..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ "$CURRENT_BRANCH" = "main" ]; then
    git pull --ff-only origin main
    echo ""
    echo "=================================================================="
    echo "Rama local 'main' actualizada correctamente al ultimo commit."
    echo "=================================================================="
else
    echo ""
    echo "[INFO] Te encuentras en la rama '$CURRENT_BRANCH'."
    echo "Para actualizar la rama 'main', ejecuta: git checkout main && git pull --ff-only origin main"
fi

git log -n 1 --oneline
