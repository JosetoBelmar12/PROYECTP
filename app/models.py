from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date

class Material(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, nullable=False)
    hashed_password: str
    role: str = Field(default="registrador", description="Rol del usuario: admin o registrador")


class Plant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    description: Optional[str] = None
    tipo: Optional[str] = Field(default=None, description="Tipo de planta: primaria, gravillera, móvil, etc.")
    es_resta: bool = Field(default=False, description="Si la producción de esta planta debe restarse del total")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Machinery(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Truck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    plate: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Operator(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SparePart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    code: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    plant_id: Optional[int] = Field(foreign_key="plant.id")
    machinery_ids: Optional[str] = None  # JSON array of IDs
    truck_ids: Optional[str] = None  # JSON array of IDs
    materials: Optional[str] = None  # JSON array de objetos {material_id, m3}
    total_m3: Optional[float] = None
    downtime_min: Optional[int] = None
    operator_id: Optional[int] = Field(foreign_key="operator.id")
    horometer_start: Optional[float] = None
    horometer_end: Optional[float] = None
    spare_part_ids: Optional[str] = None  # JSON array of IDs
    maintenances: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Maintenance(SQLModel, table=True):
    """Registro de mantenciones para cualquier elemento maestro.
    item_type: 'plant'|'machinery'|'truck'|'operator'|'spare_part'
    item_id: id en la tabla correspondiente
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    item_type: str = Field(index=True, nullable=False)
    item_id: int = Field(index=True, nullable=False)
    service_date: datetime = Field(default_factory=datetime.utcnow)
    hours_at_service: Optional[float] = None
    interval_hours: Optional[float] = None  # recomendado para próxima mantención
    quantity_changed: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    spare_part_ids: Optional[str] = None  # JSON array of {id, qty}
    details: Optional[str] = None  # Detalles adicionales
    created_by: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BonoProduccion(SQLModel, table=True):
    """Registro de bonos de producción por mes y planta"""
    id: Optional[int] = Field(default=None, primary_key=True)
    mes: str = Field(index=True, nullable=False)  # Formato: YYYY-MM
    plant_id: Optional[int] = Field(foreign_key="plant.id", index=True)
    produccion_total_m3: float = Field(default=0.0)
    horas_extra_m3: float = Field(default=0.0)
    produccion_final_m3: float = Field(default=0.0)
    trabajadores: Optional[str] = None  # JSON array: [{nombre, cargo, precio_unitario, total_bono}, ...]
    total_bono_general: float = Field(default=0.0)
    created_by: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)