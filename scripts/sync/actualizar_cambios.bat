@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0..\.."

echo ==================================================================
echo Actualizando repositorio local desde repositorios remotos
echo ==================================================================

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Remote 'origin' no configurado.
    exit /b 1
)

git remote get-url public >nul 2>&1
if errorlevel 1 (
    echo [INFO] Configurando remote 'public'...
    git remote add public git@github.com:Atomik0/Launchpad-Soundboard.git
)

echo [1/2] Descargando referencias de todos los remotos (fetch)...
git fetch --all --prune

git diff-index --quiet HEAD --
if errorlevel 1 (
    echo.
    echo [AVISO] Tienes cambios locales sin guardar en commit o stash.
    echo Para evitar conflictos, guarda tus cambios antes de actualizar:
    echo   git stash
    echo   actualizar_cambios.bat
    echo   git stash pop
    exit /b 1
)

echo [2/2] Aplicando cambios desde origin/main (Fast-Forward)...
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%B"

if "%CURRENT_BRANCH%"=="main" (
    git pull --ff-only origin main
    echo.
    echo ==================================================================
    echo Rama local 'main' actualizada correctamente al ultimo commit.
    echo ==================================================================
) else (
    echo.
    echo [INFO] Te encuentras en la rama '%CURRENT_BRANCH%'.
    echo Para actualizar 'main', ejecuta: git checkout main ^&^& git pull --ff-only origin main
)

git log -n 1 --oneline
endlocal
