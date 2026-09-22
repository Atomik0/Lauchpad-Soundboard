@echo off
chcp 65001 >nul
title Launchpad 8x8 Studio Launcher

echo ========================================================
echo   LAUNCHPAD 8x8 STUDIO PRO
echo ========================================================
echo.
echo   [1] Iniciar Soundboard Studio (Conectado a VPS 24/7) [DEFAULT]
echo   [2] Iniciar Soundboard Studio + Bot Local (Desarrollo)
echo.
echo   Iniciando automaticamente con VPS en 4 segundos...
echo   (Presiona 2 para iniciar bot local)
echo.

choice /C 12 /N /T 4 /D 1 /M "Selecciona opcion [1 o 2]: "

if errorlevel 2 goto MODO_LOCAL
goto MODO_VPS

:MODO_LOCAL
echo.
echo [1/2] Levantando DJM BOT en local (ws://127.0.0.1:3002)...
start "DJM BOT - Local" /D "%~dp0bot_discord" cmd /k npm start
timeout /t 3 >nul
echo [2/2] Abriendo Launchpad Soundboard Studio...
start "Launchpad 8x8 Studio" /D "%~dp0app" cmd /c npm start
goto FIN

:MODO_VPS
echo.
echo [1/1] Abriendo Launchpad Soundboard Studio (Modo Servidor Remoto)...
start "Launchpad 8x8 Studio" /D "%~dp0app" cmd /c npm start
goto FIN

:FIN
echo.
echo ========================================================
echo   Launchpad Soundboard Studio iniciado con exito!
echo ========================================================
timeout /t 3 >nul
exit
