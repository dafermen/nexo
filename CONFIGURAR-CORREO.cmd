@echo off
REM NEXO - GUIA DEL MODULO: CONFIGURAR-CORREO.cmd
REM Delega la captura oculta del secreto SMTP.
REM Entrada: Accion del operador en Windows y herramientas instaladas.
REM Salida: Ejecucion del script indicado o apertura del navegador.
REM Estado: %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
REM Efectos: No es codigo que deba importarse desde el navegador. Revisar el script delegado para sus efectos.
REM Manual: docs/23-manual-desarrollador-junior.md
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\configure-mail.ps1"
pause

