
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# ========== MATERIALES ========== 

class MaterialCreate(BaseModel):
    name: str

class MaterialRead(MaterialCreate):
    id: int
    created_at: datetime


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "registrador"  # admin o registrador


class UserRead(BaseModel):
    id: int
    username: str


# ========== MAESTROS / CATÁLOGOS ==========

class PlantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tipo: Optional[str] = None  # primaria, gravillera, móvil, etc.
    es_resta: Optional[bool] = False


class PlantRead(PlantCreate):
    id: int
    created_at: datetime


class MachineryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class MachineryRead(MachineryCreate):
    id: int
    created_at: datetime


class TruckCreate(BaseModel):
    name: str
    plate: Optional[str] = None
    description: Optional[str] = None


class TruckRead(TruckCreate):
    id: int
    created_at: datetime


class OperatorCreate(BaseModel):
    name: str
    description: Optional[str] = None


class OperatorRead(OperatorCreate):
    id: int
    created_at: datetime


class SparePartCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class SparePartRead(SparePartCreate):
    id: int
    created_at: datetime


# ========== REPORTE ==========

class ReportCreate(BaseModel):
    date: date
    plant_id: Optional[int] = None
    machinery_ids: Optional[List[int]] = None
    truck_ids: Optional[List[int]] = None
    operator_id: Optional[int] = None
    horometer_start: Optional[float] = None
    horometer_end: Optional[float] = None
    spare_part_ids: Optional[List[int]] = None
    maintenances: Optional[str] = None
    materials: Optional[List[dict]] = None  # [{material_id, m3}]
    total_m3: Optional[float] = None
    downtime_min: Optional[int] = None


class ReportRead(BaseModel):
    id: int
    date: date
    plant_id: Optional[int]
    machinery_ids: Optional[str]
    truck_ids: Optional[str]
    operator_id: Optional[int]
    horometer_start: Optional[float]
    horometer_end: Optional[float]
    spare_part_ids: Optional[str]
    maintenances: Optional[str]
    materials: Optional[str]
    total_m3: Optional[float]
    downtime_min: Optional[int]
    created_by: Optional[int]
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str = ""
    role: str = "registrador"


# ========== MANTENCIONES ==========


class MaintenanceCreate(BaseModel):
    item_type: str
    item_id: int
    service_date: Optional[datetime] = None
    hours_at_service: Optional[float] = None
    interval_hours: Optional[float] = None
    quantity_changed: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    spare_parts: Optional[list] = None  # [{id, qty}]
    details: Optional[str] = None

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, values):
        allowed = {'plant', 'machinery', 'truck', 'operator', 'spare_part'}
        it = values.get('item_type')
        if it not in allowed:
            raise ValueError(f"item_type debe ser uno de: {', '.join(allowed)}")
        # numeric checks
        for k in ('hours_at_service', 'interval_hours'):
            v = values.get(k)
            if v is not None and v < 0:
                raise ValueError(f"{k} no puede ser negativo")
        return values


class MaintenanceRead(MaintenanceCreate):
    id: int
    created_by: Optional[int]
    created_at: datetime
