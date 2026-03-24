# Reportes de Producción - Áridos

Breve guía para levantar el proyecto localmente, ejecutar migraciones y tests.

Requisitos
- Python 3.10+ (recomendado usar el venv que ya existe en `.venv`)

Entorno virtual (Windows PowerShell)

1. Crear/activar entorno virtual (si no existe):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Instalar dependencias:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Base de datos y migraciones (Alembic)

- El proyecto ya tiene una migración inicial marcada como baseline (no destruye la DB existente).
- `alembic` está configurado para leer la URL desde `app.database.DATABASE_URL` (por defecto `sqlite:///./data.db`).

Generar una nueva migración (después de cambiar modelos):

```powershell
.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe changes"
.venv\Scripts\python.exe -m alembic upgrade head
```

Nota: Revisa el archivo generado en `alembic/versions/` antes de aplicar `upgrade` en producción.

Levantar servidor (desarrollo)

```powershell
.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend
- Abrir en el navegador: http://127.0.0.1:8000/ (SPA contenida en `static/index.html`).

Tests

- Tests unitarios / integración básicos (requieren servidor corriendo en 127.0.0.1:8000):

```powershell
.venv\Scripts\python.exe -m pytest -q
```

Comandos útiles
- Crear usuario (API): POST `/users/` con JSON {"username":"u","password":"p"}
- Obtener token: POST `/auth/token` (form-data `username`/`password`)
- Endpoints de mantenciones:
  - POST `/maintenances/` (crear)
  - GET `/maintenances/?item_type=...&item_id=...` (listar)
  - GET `/maintenances/last?item_type=...&item_id=...` (última mantención)

Decisiones y notas
- La migración inicial fue registrada como baseline para evitar sobrescribir `data.db` existente. Si quieres recrear la DB desde cero, elimina `data.db` y genera una migración que cree tablas.
- Recomendaciones: configurar roles (admin/operador), limitar CORS en producción y añadir CI (pytest + lint).

Soporte
- Si quieres, puedo:
  - Generar la migración que crea las tablas desde cero (para proyecto nuevo), o
  - Añadir un script de despliegue/Makefile, o
  - Crear un `docker-compose` simple con la DB y la app.
# Aplicación de Reports de Producción - Áridos

Minimal backend con FastAPI para registrar reports de producción y exportar PDF.

Requisitos
- Python 3.10+
- PostgreSQL (opcional) — por defecto usa SQLite local

Instalación

```bash
python -m venv .venv
source .venv/bin/activate   # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
```

Variables de entorno recomendadas
- `DATABASE_URL` (por ejemplo: `postgresql+psycopg2://user:pass@localhost/dbname`)
- `SECRET_KEY` (clave para JWT)

Ejecutar

```bash
uvicorn main:app --reload
```

Endpoints básicos
- `POST /users/` crear usuario (body: `username`, `password`)
- `POST /auth/token` obtener token (form-urlencoded username/password)
- `POST /reports/` crear report (Bearer token)
- `GET /reports/` listar reports
- `GET /reports/{id}/pdf` descargar PDF del report
