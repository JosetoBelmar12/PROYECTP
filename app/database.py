from sqlmodel import SQLModel, create_engine
import os

# Leer DATABASE_URL desde variables de entorno, con fallback a SQLite local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data.db")

# Si es SQLite, dejar como está; si es PostgreSQL, asegurarse del formato correcto
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Crear engine con configuraciones apropiadas
if "postgresql" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
else:
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def create_db_and_tables():
    from app.models import User, Plant, Machinery, Truck, Operator, SparePart, Report, Maintenance, Material
    SQLModel.metadata.create_all(engine)