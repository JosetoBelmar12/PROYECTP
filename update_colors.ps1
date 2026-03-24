$file = "static\style.css"
$content = Get-Content $file -Raw

# Reemplazar todos los colores oscuros a claros
$content = $content -replace '\b#fff\b', '#f5f6fb'
$content = $content -replace '#23272f', '#f5f6fb'
$content = $content -replace '#2c3e50', '#3f4658'
$content = $content -replace '#e6e6e6', '#3f4658'
$content = $content -replace '#a6b8ff', '#667eea'
$content = $content -replace '#888888', '#7a8393'
$content = $content -replace '#222', '#3f4658'
$content = $content -replace '#333333', '#3f4658'
$content = $content -replace '#e0e0e0', '#dfe4ee'

# Guardar
Set-Content -Path $file -Value $content

Write-Host "[ACTUALIZADO] Paleta de colores completamente reemplazada!"
