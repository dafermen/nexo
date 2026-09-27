@echo off
REM NEXO - GUIA DEL MODULO: INICIAR.cmd
REM Arranca el servidor con el entorno local; mantener la consola abierta.
REM Entrada: Accion del operador en Windows y herramientas instaladas.
REM Salida: Ejecucion del script indicado o apertura del navegador.
REM Estado: %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
REM Efectos: No es codigo que deba importarse desde el navegador. Revisar el script delegado para sus efectos.
REM Manual: docs/23-manual-desarrollador-junior.md
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 o superior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
echo NEXO - Abre http://localhost:3000 en Chrome o Edge.
echo Conserva esta ventana abierta. Ctrl+C para detener.
node --env-file-if-exists=.env server/index.js
pause
