@echo off
chcp 65001 >nul
title Flasheador de Firmware STM32 - Launchpad Soundboard

set "BASE_DIR=%~dp0"
set "FW_8X8_BIN=%BASE_DIR%firmware\launchpad_8x8_soundboard\build\launchpad_8x8_soundboard.ino.bin"
set "FW_5X5_BIN=%BASE_DIR%firmware\launchpad_5x5_soundboard\build\launchpad_5x5_soundboard.ino.bin"

echo ========================================================
echo  FLASHEADOR DE FIRMWARE STM32 - LAUNCHPAD SOUNDBOARD
echo  Microcontrolador: STM32F401 (Black Pill)
echo ========================================================
echo.
echo Selecciona la version de matriz a flashear:
echo   [1] Matriz 8x8 (64 pads - Launchpad 8x8 Pro)
echo   [2] Matriz 5x5 (25 pads - Launchpad 5x5 Compact)
echo   [3] Cancelar y salir
echo.
set /p "OPTION=Ingresa una opcion (1-3): "

if "%OPTION%"=="1" (
  set "TARGET_NAME=Launchpad 8x8"
  set "TARGET_BIN=%FW_8X8_BIN%"
  set "TARGET_BIN_ALT=%BASE_DIR%firmware\launchpad_8x8_soundboard\build\STMicroelectronics.stm32.GenF4\launchpad_8x8_soundboard.ino.bin"
) else if "%OPTION%"=="2" (
  set "TARGET_NAME=Launchpad 5x5"
  set "TARGET_BIN=%FW_5X5_BIN%"
  set "TARGET_BIN_ALT=%BASE_DIR%firmware\launchpad_5x5_soundboard\build\STMicroelectronics.stm32.GenF4\launchpad_5x5_soundboard.ino.bin"
) else (
  echo Operacion cancelada.
  exit /b 0
)

if not exist "%TARGET_BIN%" (
  if exist "%TARGET_BIN_ALT%" (
    set "TARGET_BIN=%TARGET_BIN_ALT%"
  )
)

echo.
echo Seleccionado: %TARGET_NAME%
echo Archivo binario: %TARGET_BIN%
echo.

if not exist "%TARGET_BIN%" (
  echo Error: No se encontro el archivo binario precompilado:
  echo "%TARGET_BIN%"
  echo.
  echo Compila primero el sketch en Arduino IDE exportando binarios compilados.
  pause
  exit /b 1
)

set "DFU_UTIL="
where dfu-util >nul 2>nul
if %errorlevel%==0 (
  set "DFU_UTIL=dfu-util"
) else (
  for /d %%D in ("%LOCALAPPDATA%\Arduino15\packages\STMicroelectronics\tools\STM32Tools\*") do (
    if exist "%%D\win\dfu-util.exe" set "DFU_UTIL=%%D\win\dfu-util.exe"
  )
)

set "STM32_PROG="
where STM32_Programmer_CLI >nul 2>nul
if %errorlevel%==0 (
  set "STM32_PROG=STM32_Programmer_CLI"
) else (
  if exist "C:\Program Files\STMicroelectronics\STM32Cube\STM32CubeProgrammer\bin\STM32_Programmer_CLI.exe" (
    set "STM32_PROG=C:\Program Files\STMicroelectronics\STM32Cube\STM32CubeProgrammer\bin\STM32_Programmer_CLI.exe"
  )
)

echo ========================================================
echo  INSTRUCCIONES PARA PONER LA BLACK PILL EN MODO DFU:
echo ========================================================
echo  1. Conecta la placa STM32 Black Pill al puerto USB.
echo  2. Manten presionado el boton BOOT0 (B0).
echo  3. Presiona y suelta el boton NRST (Reset).
echo  4. Suelta el boton BOOT0.
echo ========================================================
echo.
pause

set "FLASHED=0"

if defined DFU_UTIL (
  echo Intentando flasheo DFU con dfu-util...
  "%DFU_UTIL%" -a 0 -d 0483:df11 -s 0x08000000:leave -D "%TARGET_BIN%"
  if %errorlevel%==0 set "FLASHED=1"
)

if "%FLASHED%"=="0" if defined STM32_PROG (
  echo Intentando flasheo con STM32CubeProgrammer CLI...
  "%STM32_PROG%" -c port=usb1 -w "%TARGET_BIN%" 0x08000000 -v -s
  if %errorlevel%==0 set "FLASHED=1"
)

echo.
if "%FLASHED%"=="1" (
  echo ========================================================
  echo  FIRMWARE FLASHEADO CON EXITO
  echo  La placa reiniciara automaticamente en modo Launchpad.
  echo ========================================================
) else (
  echo ========================================================
  echo  No se pudo completar el flasheo automatico.
  echo  Posibles causas:
  echo   - La placa no esta en modo DFU (repite BOOT0 + Reset).
  echo   - Faltan controladores DFU (usa Zadig para asignar WinUSB).
  echo   - O abre el archivo .ino en Arduino IDE y presiona Subir.
  echo ========================================================
)

echo.
pause
