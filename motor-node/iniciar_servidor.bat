@echo off
title Servidor Motor-Node (Reels Rapidos)
cd /d "%~dp0"

echo =========================================================
echo   Iniciando Motor-Node: Exportador Rapido (Puerto 3001)
echo   Sharp (libvips C++) + FFmpeg
echo =========================================================

:: Abrir navegador tras 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3001"

:: Iniciar servidor
node server.js

pause
