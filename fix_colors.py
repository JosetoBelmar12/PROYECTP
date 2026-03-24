import re

# Leer archivo
with open('static/style.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazos de colores oscuros a claros
replacements = {
    '#23272f': '#f5f6fb',  # Fondo oscuro → claro
    '#2c3e50': '#3f4658',  # Gris oscuro → gris suave
    '#e6e6e6': '#3f4658',  # Texto claro en oscuro → texto en claro
    '#a6b8ff': '#667eea',  # Azul claro en oscuro → azul en claro
    '#888888': '#7a8393',  # Gris → gris
    '#fff\b': '#f5f6fb',   # Blanco puro → gris claro
}

# Reemplazos especiales 
content = re.sub(r'\b#fff\b', '#f5f6fb', content)
content = content.replace('#23272f', '#f5f6fb')
content = content.replace('#2c3e50', '#3f4658')
content = content.replace('#e6e6e6', '#3f4658')
content = content.replace('#a6b8ff', '#667eea')
content = content.replace('#888888', '#7a8393')
content = content.replace('#222', '#3f4658')

# Guardar
with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Colores actualizados correctamente!")
