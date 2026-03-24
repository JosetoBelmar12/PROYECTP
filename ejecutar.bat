@echo off
REM Script para ejecutar la aplicación de Reportes de Producción (Windows)
REM Hacer doble click en este archivo para iniciar el programa

title Reportes de Producción - Áridos
cls

echo ================================
echo   Reportes de Producción - Áridos
echo ================================
echo.

REM Cambiar a la carpeta del script
cd /d "%~dp0"

echo Activando entorno virtual...
call .venv\Scripts\activate.bat

if errorlevel 1 (
    echo ERROR: No se pudo activar el entorno virtual
    pause
    exit /b 1
)

echo ✓ Entorno virtual activado
echo.

echo Iniciando servidor...
echo.
echo Acceso: http://localhost:8000
echo.
echo Presiona Ctrl+C (y luego S) para detener el servidor
echo.

REM Ejecutar el programa
uvicorn main:app --reload --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo ERROR: El programa terminó con un error
    pause
)
