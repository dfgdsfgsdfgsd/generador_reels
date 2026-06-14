@echo off
title Generador Reels - Puerto 3002
echo ===================================================
echo   Iniciando Generador Reels (FastAPI/Uvicorn)
echo   Puerto: 3002
echo ===================================================
echo.

:: Intentar obtener la dirección IP local
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP (
        set "LOCAL_IP=%%A"
    )
)

:: Limpiar espacios en blanco de la IP
if defined LOCAL_IP (
    set "LOCAL_IP=%LOCAL_IP: =%"
)

echo Servidor corriendo en: http://localhost:3002
if defined LOCAL_IP (
    echo En tu red local/Wi-Fi: http://%LOCAL_IP%:3002
)
echo ===================================================
echo.

python server.py
if errorlevel 1 (
    echo.
    echo Ocurrio un error al intentar iniciar el servidor Python.
    echo Asegurate de tener Python instalado y las dependencias (fastapi, uvicorn, pillow, etc.).
)
pause
