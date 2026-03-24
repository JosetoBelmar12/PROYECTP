# Ejecutar la Aplicación - Reportes de Producción

## Opción 1: Script de Batch (Más Fácil para Windows)

**Hacer doble click en:** `ejecutar.bat`

Esto abrirá una ventana de terminal y iniciará el servidor automáticamente.

---

## Opción 2: Script de PowerShell

**Ejecutar en terminal PowerShell:**

```powershell
.\ejecutar.ps1
```

Si tienes restricción de ejecución de scripts, ejecuta primero:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Opción 3: Manual (Terminal Abierta)

**En PowerShell:**

```powershell
# Activar entorno virtual
& .\.venv\Scripts\Activate.ps1

# Ejecutar el servidor
python main.py
```

---

## Acceso a la Aplicación

Una vez que el servidor esté activo, abre tu navegador en:

### **http://localhost:8000**

---

## Detener el Servidor

- Presiona **Ctrl + C** en la ventana del terminal
- Confirma con **S** (en batch) o **Y** (en PowerShell) si te lo solicita

---

## Usuario de Prueba

Si necesitas crear un usuario nuevo:
1. En la pantalla de login, haz click en "Crear usuario"
2. Completa usuario y contraseña
3. Ingresa con las credenciales que creaste

---

## Problemas Comunes

### "python no es reconocido"
- Asegúrate de que el entorno virtual se activó (debes ver `(.venv)` en la línea del prompt)

### "El módulo uvicorn no existe"
- Ejecuta: `pip install -r requirements.txt` (si existe)
- O: `pip install fastapi uvicorn sqlmodel python-multipart`

### Puerto 8000 en uso
- Verifica si otro programa está usando ese puerto
- O cambia el puerto en `main.py` línea donde inicializa uvicorn

---

## Más Información

- **Backend API:** http://localhost:8000/docs (documentación interactiva)
- **Base de datos:** Se crea automáticamente en `database.db`
- **Static files:** Están en la carpeta `static/`
