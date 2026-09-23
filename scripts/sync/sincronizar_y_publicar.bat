@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ==============================================================================
:: SCRIPT DE SINCRONIZACION DUAL Y PUBLICACION SEGURA (Windows)
:: Repo Privado: git@github.com:Atomik0/SoundBoard-Bot-App-Firmware.git
:: Repo Publico: git@github.com:Atomik0/Launchpad-Soundboard.git
:: ==============================================================================

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
for %%I in ("%SCRIPT_DIR%\..\..") do set "REPO_DIR=%%~fI"

set "PRIVATE_REPO=git@github.com:Atomik0/SoundBoard-Bot-App-Firmware.git"
set "PUBLIC_REPO=git@github.com:Atomik0/Launchpad-Soundboard.git"

set "APP_DIR=%REPO_DIR%\app"
set "PKG_FILE=%APP_DIR%\package.json"
set "VERSION_FILE=%APP_DIR%\public\version.json"

echo ==================================================================
echo     PUBLICADOR Y SINCRONIZADOR DUAL (PRIVADO / PUBLICO)
echo ==================================================================
echo   Repo Privado: %PRIVATE_REPO%
echo   Repo Publico: %PUBLIC_REPO%
echo ==================================================================
echo.

:: Obtener version actual
for /f "delims=" %%V in ('node -e "try { console.log(require('%PKG_FILE:\=/%').version || '1.0.8'); } catch(e) { console.log('1.0.8'); }"') do set "CURRENT_VERSION=%%V"
echo Version actual del proyecto: v%CURRENT_VERSION%
echo.

:: Calcular siguiente version sugerida
for /f "delims=" %%N in ('node -e "const cur='%CURRENT_VERSION%'; if(cur==='1.0.15'){console.log('1.0.15');}else{const p=cur.split('.').map(Number); if(p.length<3||p.some(isNaN)){console.log('1.0.15');}else{p[2]=(p[2]||0)+1;console.log(p.join('.'));}}"') do set "DEFAULT_NEXT=%%N"

:: Aceptar version por argumento o pedirla
if not "%~1"=="" (
    set "NEW_VERSION=%~1"
) else (
    set /p "INPUT_VER=Numero de version a publicar [v%DEFAULT_NEXT%]: "
    if "!INPUT_VER!"=="" (
        set "NEW_VERSION=%DEFAULT_NEXT%"
    ) else (
        set "NEW_VERSION=!INPUT_VER!"
    )
)
:: Quitar "v" inicial si lo pusieron
if "!NEW_VERSION:~0,1!"=="v" set "NEW_VERSION=!NEW_VERSION:~1!"

:: Aceptar titulo por argumento o pedirlo
set "DEFAULT_TITLE=Launchpad Studio Pro v!NEW_VERSION!"
if not "%~2"=="" (
    set "RELEASE_TITLE=%~2"
) else (
    set /p "INPUT_TITLE=Titulo del Release [!DEFAULT_TITLE!]: "
    if "!INPUT_TITLE!"=="" (
        set "RELEASE_TITLE=!DEFAULT_TITLE!"
    ) else (
        set "RELEASE_TITLE=!INPUT_TITLE!"
    )
)

set "RELEASE_NOTES=Actualizacion v!NEW_VERSION! con mejoras de rendimiento, estabilidad y nuevas funciones."
set "BUILD_VERSION=!NEW_VERSION!"

echo.
echo [*] Version confirmada: v!NEW_VERSION!
echo [*] Titulo del Release: !RELEASE_TITLE!

:: ==============================================================================
:: [1/6] Actualizar version en package.json y version.json
:: ==============================================================================
echo.
echo [1/6] Actualizando version en package.json y version.json...

node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); pkg.version=process.argv[2]; fs.writeFileSync(process.argv[1],JSON.stringify(pkg,null,2),'utf8'); fs.writeFileSync(process.argv[3],JSON.stringify({version:process.argv[2],buildDate:new Date().toISOString()},null,2),'utf8'); console.log('  [OK] package.json y version.json actualizados.');" "%PKG_FILE%" "!NEW_VERSION!" "%VERSION_FILE%"

if errorlevel 1 (
    echo   [ERROR] Fallo al actualizar archivos de version.
    goto :error
)

:: ==============================================================================
:: [2/6] Compilar binarios
:: ==============================================================================
echo.
echo [2/6] Verificando paquetes compilados...

set "WIN_DIR=%APP_DIR%\dist_exe\Launchpad Studio Pro-v!NEW_VERSION!-win32-x64"
set "UPDATE_ZIP=%APP_DIR%\dist_exe\app-update-v!NEW_VERSION!.zip"
set "WIN_ZIP=%APP_DIR%\dist_exe\Launchpad-Studio-Pro-v!NEW_VERSION!-win32-x64.zip"
set "LINUX_TAR=%APP_DIR%\dist_linux\Launchpad-Studio-Pro-v!NEW_VERSION!-linux-x64.tar.gz"

if exist "!WIN_DIR!" if exist "!UPDATE_ZIP!" (
    echo   [INFO] Paquete Windows y actualizador v!NEW_VERSION! ya compilados. Reutilizando...
) else (
    if exist "%REPO_DIR%\scripts\build\compilar_win.bat" (
        echo   [*] Ejecutando compilar_win.bat...
        call "%REPO_DIR%\scripts\build\compilar_win.bat" "!NEW_VERSION!"
        if errorlevel 1 (
            echo   [AVISO] compilar_win.bat retorno error. Continuando de todos modos...
        )
    ) else (
        echo   [AVISO] compilar_win.bat no encontrado. Omitiendo compilacion Windows.
    )
)

:: Comprimir paquete Windows si existe la carpeta pero no el zip
if exist "!WIN_DIR!" (
    if not exist "!WIN_ZIP!" (
        echo   [*] Comprimiendo paquete Windows en !WIN_ZIP!...
        powershell -Command "Compress-Archive -Path '!WIN_DIR!' -DestinationPath '!WIN_ZIP!' -Force"
        if errorlevel 1 echo   [AVISO] No se pudo comprimir el paquete Windows.
    )
)

:: ==============================================================================
:: [3/6] Subir al Repo Privado
:: ==============================================================================
echo.
echo [3/6] Sincronizando repositorio privado (SoundBoard-Bot-App-Firmware)...
cd /d "%REPO_DIR%"

git add -A
git commit -m "release: v!NEW_VERSION! - !RELEASE_TITLE!" || echo   Sin cambios nuevos para commit privado.
git push origin main
if errorlevel 1 (
    echo   [ERROR] Fallo al hacer push al repositorio privado.
    goto :error
)

git tag -f "v!NEW_VERSION!"
git push --force origin "v!NEW_VERSION!"

:: ==============================================================================
:: [4/6] Preparar staging limpio y subir al Repo Publico
:: ==============================================================================
echo.
echo [4/6] Preparando y sanitizando codigo para el repositorio publico...

:: Crear directorio de staging temporal
set "STAGING_DIR=%TEMP%\launchpad_public_staging_!RANDOM!!RANDOM!"
mkdir "!STAGING_DIR!"
echo   [*] Area de preparacion limpia en: !STAGING_DIR!

:: Copiar proyecto excluyendo archivos sensibles y binarios
robocopy "%REPO_DIR%" "!STAGING_DIR!" /E /XD .git node_modules dist_exe dist_linux _backup_personal .gemini .agents bot_discord\dist scripts\sync scripts\deploy releases_para_subir /XF .env vps_credentials.json *.user_backup >nul 2>&1
:: Excluir archivos sensibles especificos
if exist "!STAGING_DIR!\bot_discord\.env" del /f /q "!STAGING_DIR!\bot_discord\.env"
if exist "!STAGING_DIR!\app\public\vps_default.json" del /f /q "!STAGING_DIR!\app\public\vps_default.json"
if exist "!STAGING_DIR!\vps_credentials.json" del /f /q "!STAGING_DIR!\vps_credentials.json"
:: Excluir carpetas build del firmware
for /d /r "!STAGING_DIR!\firmware" %%B in (build) do (
    if exist "%%B" rd /s /q "%%B"
)

:: Asegurar que la carpeta de sonidos custom exista pero vacia
mkdir "!STAGING_DIR!\app\public\sounds\custom" 2>nul
echo. > "!STAGING_DIR!\app\public\sounds\custom\.gitkeep"

:: Reemplazar soundboard_config con template limpio
if exist "!STAGING_DIR!\app\public\soundboard_clean_template.json" (
    copy /y "!STAGING_DIR!\app\public\soundboard_clean_template.json" "!STAGING_DIR!\app\public\soundboard_config.json" >nul
)

:: Crear .env.example si no existe
if not exist "!STAGING_DIR!\.env.example" (
    (
        echo VPS_HOST=tu-ip-o-dominio.com
        echo VPS_USER=root
        echo VPS_PASS=tu-contrasena-segura
        echo VPS_PORT=22
    ) > "!STAGING_DIR!\.env.example"
)

:: ---- AUDITORIA DE SEGURIDAD ----
echo   [*] Ejecutando auditoria de seguridad anti-fugas...
node "%SCRIPT_DIR%\audit_leaks.js" "!STAGING_DIR!"
if errorlevel 1 (
    rd /s /q "!STAGING_DIR!"
    goto :error
)

:: Obtener datos de git para el commit
for /f "delims=" %%U in ('git -C "%REPO_DIR%" config user.name 2^>nul') do set "GIT_USER=%%U"
for /f "delims=" %%E in ('git -C "%REPO_DIR%" config user.email 2^>nul') do set "GIT_EMAIL=%%E"
if "!GIT_USER!"=="" set "GIT_USER=Atomik0"
if "!GIT_EMAIL!"=="" set "GIT_EMAIL=developer@soundboard.local"

:: Inicializar repo en staging y pushear al publico
cd /d "!STAGING_DIR!"
git init -b main >nul
git config user.name "!GIT_USER!"
git config user.email "!GIT_EMAIL!"
git remote add public-origin "%PUBLIC_REPO%"

git add -A
git commit -m "release: v!NEW_VERSION! - !RELEASE_TITLE!"
git tag -a "v!NEW_VERSION!" -m "!RELEASE_TITLE!"

echo.
echo [5/6] Enviando arbol limpio al repositorio publico...
git push --force public-origin main
if errorlevel 1 (
    echo   [ERROR] Fallo el push al repositorio publico.
    cd /d "%REPO_DIR%"
    rd /s /q "!STAGING_DIR!"
    goto :error
)
git push --force public-origin "v!NEW_VERSION!"

cd /d "%REPO_DIR%"
rd /s /q "!STAGING_DIR!"

:: ==============================================================================
:: [6/6] Publicar GitHub Release
:: ==============================================================================
echo.
echo [6/6] Publicando GitHub Release en Atomik0/Launchpad-Soundboard...

:: Copiar assets a carpeta de releases local
mkdir "%REPO_DIR%\releases_para_subir" 2>nul
set "ASSETS_LIST="

if exist "!UPDATE_ZIP!" (
    copy /y "!UPDATE_ZIP!" "%REPO_DIR%\releases_para_subir\" >nul
    set "ASSETS_LIST=!ASSETS_LIST! "!UPDATE_ZIP!""
    echo   - app-update-v!NEW_VERSION!.zip
)
if exist "!WIN_ZIP!" (
    copy /y "!WIN_ZIP!" "%REPO_DIR%\releases_para_subir\" >nul
    set "ASSETS_LIST=!ASSETS_LIST! "!WIN_ZIP!""
    echo   - Launchpad-Studio-Pro-v!NEW_VERSION!-win32-x64.zip
)
if exist "!LINUX_TAR!" (
    copy /y "!LINUX_TAR!" "%REPO_DIR%\releases_para_subir\" >nul
    set "ASSETS_LIST=!ASSETS_LIST! "!LINUX_TAR!""
    echo   - Launchpad-Studio-Pro-v!NEW_VERSION!-linux-x64.tar.gz
)

where gh >nul 2>&1
if not errorlevel 1 (
    echo   [*] Creando release con GitHub CLI...
    gh release create "v!NEW_VERSION!" !ASSETS_LIST! --repo "Atomik0/Launchpad-Soundboard" --title "Launchpad Studio Pro v!NEW_VERSION! - !RELEASE_TITLE!" --notes "!RELEASE_NOTES!"
    if errorlevel 1 (
        echo   [AVISO] No se pudo crear con gh automaticamente.
        echo   Subi los archivos manualmente desde releases_para_subir\
    )
) else (
    echo.
    echo   GitHub CLI no detectado. Paquetes listos para subir manualmente:
    echo   %REPO_DIR%\releases_para_subir\
)

:: ==============================================================================
:: RESUMEN FINAL
:: ==============================================================================
echo.
echo ==================================================================
echo   VERSION v!NEW_VERSION! PUBLICADA CON EXITO
echo ==================================================================
echo   1. Repositorio Privado actualizado con todos tus cambios.
echo   2. Repositorio Publico actualizado con codigo 100%% LIMPIO.
echo   3. Los archivos descargables para el Release estan en:
echo      %REPO_DIR%\releases_para_subir\
echo.
echo   Si el release no se publico automaticamente via gh, subilo en:
echo   https://github.com/Atomik0/Launchpad-Soundboard/releases/new?tag=v!NEW_VERSION!
echo.
echo   Tus usuarios veran la notificacion in-app automaticamente en su
echo   Launchpad Studio Pro y se actualizaran con 1 clic.
echo ==================================================================
echo.
pause
goto :eof

:error
echo.
echo [ABORTADO] El proceso termino con errores.
echo.
pause
endlocal
exit /b 1
