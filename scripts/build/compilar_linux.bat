@echo off
chcp 65001 >nul
title Compilador de Launchpad Studio Pro (Version Linux Limpia para Amigos)

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "ROOT_DIR=%%~fI\"
set "APP_DIR=%ROOT_DIR%app"
set "BACKUP_DIR=%APP_DIR%\_backup_personal"
set "CUSTOM_DIR=%APP_DIR%\public\sounds\custom"
set "CONFIG_FILE=%APP_DIR%\public\soundboard_config.json"
set "CLEAN_TEMPLATE=%APP_DIR%\public\soundboard_clean_template.json"
set "VPS_CREDS=%ROOT_DIR%vps_credentials.json"
set "VPS_DEFAULT=%APP_DIR%\public\vps_default.json"

echo ========================================================
echo   GENERADOR DE PAQUETE LINUX LIMPIO PARA AMIGOS
echo ========================================================
echo.

if exist "%VPS_CREDS%" (
  copy /y "%VPS_CREDS%" "%VPS_DEFAULT%" >nul
  echo [INFO] Configuracion de VPS vinculada para tus amigos.
)

echo.
echo [1/4] Resguardando tus audios personales y configuracion actual...

if exist "%BACKUP_DIR%" rd /s /q "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%\custom_sounds" 2>nul

if exist "%CONFIG_FILE%" copy /y "%CONFIG_FILE%" "%BACKUP_DIR%\soundboard_config.json" >nul
if exist "%CUSTOM_DIR%" xcopy /y /e /i /q "%CUSTOM_DIR%\*" "%BACKUP_DIR%\custom_sounds\" >nul

echo [2/4] Limpiando carpeta de audios y preparando plantilla virgen...

if exist "%CLEAN_TEMPLATE%" (
  copy /y "%CLEAN_TEMPLATE%" "%CONFIG_FILE%" >nul
) else (
  echo {"version":2,"gridType":"8x8","currentBankId":"capa_1","bankOrder":["capa_1"],"bankNames":{"capa_1":"Capa 1"},"masterVolume":0.8,"botDiscordVolume":0.8,"pressEffect":1,"idleEffect":11,"blendMode":0,"selectedHeadphonesId":"default","selectedDiscordId":"default","muteLocalOnDiscord":true,"banks":{"capa_1":[]}} > "%CONFIG_FILE%"
)

if exist "%CUSTOM_DIR%" (
  del /f /q "%CUSTOM_DIR%\*.*" 2>nul
)

echo [3/4] Instalando dependencias y compilando paquete para Linux x64...
echo (Esto puede tardar unos 30-60 segundos la primera vez...)
echo.

cd /d "%APP_DIR%"
call npm install
if errorlevel 1 (
  echo [ERROR] Fallo al instalar dependencias. Verifica tu conexion a internet y Node.js.
  goto :restore
)
call npm run build:linux

echo.
:restore
echo [4/4] Restaurando tus audios personales y configuracion original...

if exist "%BACKUP_DIR%\soundboard_config.json" (
  copy /y "%BACKUP_DIR%\soundboard_config.json" "%CONFIG_FILE%" >nul
)
if exist "%BACKUP_DIR%\custom_sounds" (
  xcopy /y /e /i /q "%BACKUP_DIR%\custom_sounds\*" "%CUSTOM_DIR%\" >nul
)
if exist "%BACKUP_DIR%" rd /s /q "%BACKUP_DIR%"
if exist "%VPS_DEFAULT%" del /f /q "%VPS_DEFAULT%" >nul

echo.
echo ========================================================
echo   PAQUETE LINUX LIMPIO GENERADO CON EXITO
echo ========================================================
echo.
echo   La carpeta limpia lista para tus amigos de Linux esta en:
echo   app\dist_linux\
echo.
echo   - La version compilada va 100%% limpia (SIN TUS AUDIOS).
echo   - Se conecta automaticamente al Bot del VPS (sin pedir IP ni clave).
echo   - Tus audios personales en tu maquina siguen intactos.
echo.
echo   Solo comprime la carpeta generada en formato .tar.gz o .zip
echo   y compartela con tus amigos en Linux.
echo ========================================================
pause
