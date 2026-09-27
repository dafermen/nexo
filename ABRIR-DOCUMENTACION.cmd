@echo off
REM NEXO - GUIA DEL MODULO: ABRIR-DOCUMENTACION.cmd
REM Abre el portal local de documentacion.
REM Entrada: Accion del operador en Windows y herramientas instaladas.
REM Salida: Ejecucion del script indicado o apertura del navegador.
REM Estado: %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
REM Efectos: No es codigo que deba importarse desde el navegador. Revisar el script delegado para sus efectos.
REM Manual: docs/23-manual-desarrollador-junior.md
start "" "http://localhost:3000/docs"
