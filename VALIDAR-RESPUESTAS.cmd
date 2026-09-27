@echo off
REM NEXO - GUIA DEL MODULO: VALIDAR-RESPUESTAS.cmd
REM Comprueba el formato del archivo semilla FAQ.
REM Entrada: Accion del operador en Windows y herramientas instaladas.
REM Salida: Ejecucion del script indicado o apertura del navegador.
REM Estado: %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
REM Efectos: No es codigo que deba importarse desde el navegador. Revisar el script delegado para sus efectos.
REM Manual: docs/23-manual-desarrollador-junior.md
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Se requiere Node.js 24 o superior.
  pause
  exit /b 1
)
node scripts\validate-faq.js
pause
