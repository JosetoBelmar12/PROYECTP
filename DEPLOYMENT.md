# Despliegue en Render - Guía Paso a Paso

## 🎯 Objetivo
Desplegar la aplicación FastAPI en Render para que funcione 24/7 en la nube sin necesidad de dejar tu computadora encendida.

## ✅ Prerequisitos
- Cuenta en GitHub (para vincular el código)
- Cuenta gratuita en Render (render.com)
- Tu código subido a GitHub

## 📋 Paso 1: Preparar tu código en GitHub

### Opción A: Si ya tienes GitHub
1. Abre tu terminal en VS Code
2. Ejecuta:
```powershell
cd c:\Users\JMBel\OneDrive\Escritorio\PROYECTP
git add .
git commit -m "Preparar para despliegue en Render"
git push origin main
```

### Opción B: Si no tienes GitHub
1. Ve a https://github.com/new
2. Crea un repositorio llamado "aridosapp"
3. Sigue las instrucciones para subir tu código local

## 🚀 Paso 2: Configurar en Render

1. Ve a https://render.com y crea una cuenta (hay plan gratuito)

2. Haz login y haz click en "New Web Service"

3. Selecciona "Connect a repository"
   - Autoriza GitHub si es necesario
   - Selecciona tu repositorio "PROYECTP" (o como lo hayas nombrado)

4. Rellena los datos:
   - **Name**: aridosapp (o el nombre que prefieras)
   - **Environment**: Python 3
   - **Region**: Frankfurt (o la más cercana)
   - **Branch**: main
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. En **Environment**, añade la variable de base de datos:
   - Render creará una base de datos PostgreSQL automáticamente
   - O puedes crear una manualmente en "PostgreSQL Database"

6. Haz click en "Create Web Service"

## 🔧 Paso 3: Configurar la Base de Datos (IMPORTANTE)

1. En el dashboard de Render, crea una base de datos PostgreSQL nueva:
   - Ve a "PostgreSQL" en el menú
   - Click en "Create Database"
   - Nombre: "aridosdb"
   - Plan: Free

2. Copia la **Internal Database URL** (tendrá este formato):
```
postgresql://usuario:contraseña@servidor.internal:5432/aridosdb
```

3. En tu Web Service, añade la variable de entorno:
   - Nombre: `DATABASE_URL`
   - Valor: (pega la URL que copiaste)

4. Redeploy la aplicación

## 🌍 Paso 4: Acceder a tu aplicación

Después del despliegue (tarda 2-5 minutos):
1. Tu aplicación estará en: `https://aridosapp.onrender.com`
2. Comparte este URL con los demás usuarios
3. Todos pueden acceder desde cualquier computadora

## ⚠️ Notas Importantes

### Plan Gratuito de Render
- La aplicación se "duerme" después de 15 minutos sin usar
- Se reinicia automáticamente al recibir una solicitud
- PostgreSQL gratuito: 90 días de diarios gratis, después requiere tarjeta

### Si necesitas más:
- Plan Starter ($7/mes): Aplicación siempre activa
- Plan Standard ($12/mes): Más recursos

## 🔄 Despliegas futuros

Cada vez que hagas cambios locales:
```powershell
git add .
git commit -m "Describir cambios"
git push origin main
```
Render redesplegará automáticamente.

## ❓ Problemas comunes

### "Build failed"
- Verifica que `requirements.txt` esté actualizado
- Asegúrate de que todos los imports existen

### "Database connection failed"
- Verifica que `DATABASE_URL` está configurada correctamente
- Comprueba que es una URL de PostgreSQL, no SQLite

### "502 Bad Gateway"
- Espera a que la app inicie (puede tardar 1-2 minutos)
- Revisa los logs en Render dashboard

## 📚 Links útiles
- Render Docs: https://docs.render.com
- FastAPI Docs: https://fastapi.tiangolo.com
- PostgreSQL: https://www.postgresql.org
