# Script para ejecutar la aplicación de Reportes de Producción

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Reportes de Producción - Áridos" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Obtener la ruta del script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Activar el entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

# Verificar que se activó correctamente
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo activar el entorno virtual" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Entorno virtual activado" -ForegroundColor Green
Write-Host ""

# Iniciar el servidor
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Acceso: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

# Ejecutar uvicorn
uvicorn main:app --reload --host 127.0.0.1 --port 8000
