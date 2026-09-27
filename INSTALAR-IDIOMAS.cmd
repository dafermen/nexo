@echo off
REM NEXO - GUIA DEL MODULO: INSTALAR-IDIOMAS.cmd
REM Instala voces inglesa/francesa verificadas.
REM Entrada: Accion del operador en Windows y herramientas instaladas.
REM Salida: Ejecucion del script indicado o apertura del navegador.
REM Estado: %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
REM Efectos: No es codigo que deba importarse desde el navegador. Revisar el script delegado para sus efectos.
REM Manual: docs/23-manual-desarrollador-junior.md
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-multilingual-voices.ps1"
pause
