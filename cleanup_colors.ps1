$file = "static\style.css"
$content = Get-Content $file -Raw

# Reemplazar colores oscuros que se quedaron
$content = $content -replace '#4450a6', '#667eea'
$content = $content -replace '#2d365c', '#dfe4ee'
$content = $content -replace '#555968', '#dfe4ee'
$content = $content -replace '#666a7a', '#e8ecf5'

Set-Content -Path $file -Value $content

Write-Host "[FINALIZADO] Todos los colores oscuros eliminados!"
