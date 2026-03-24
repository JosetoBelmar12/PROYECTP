from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select

from .database import engine
from .models import Material, Report, User, Plant, Machinery, Truck, Operator, SparePart, Maintenance


# ========== MATERIALES ========== 
def create_material(name: str) -> Material:
    with Session(engine) as session:
        material = Material(name=name)
        session.add(material)
        session.commit()
        session.refresh(material)
        mat_data = {"id": material.id, "name": material.name, "created_at": material.created_at}
    return Material(**mat_data)

def list_materials() -> List[Material]:
    with Session(engine) as session:
        materials = session.exec(select(Material)).all()
        result = []
        for mat in materials:
            result.append(Material(id=mat.id, name=mat.name, created_at=mat.created_at))
    return result

def delete_material(material_id: int) -> bool:
    with Session(engine) as session:
        mat = session.get(Material, material_id)
        if not mat:
            return False
        session.delete(mat)
        session.commit()
    return True


def create_user(username: str, hashed_password: str) -> User:
    with Session(engine) as session:
        user = User(username=username, hashed_password=hashed_password)
        session.add(user)
        session.commit()
        session.refresh(user)
        # Obtener los valores antes de cerrar la sesión
        user_dict = {"id": user.id, "username": user.username, "hashed_password": user.hashed_password}
    # Recrear el objeto fuera de la sesión
    user = User(**user_dict)
    return user


def get_user_by_username(username: str) -> Optional[User]:
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if user:
            user_dict = {"id": user.id, "username": user.username, "hashed_password": user.hashed_password}
            user = User(**user_dict)
    return user


# ========== MAESTROS / CATÁLOGOS ==========

def delete_spare_part(spare_part_id: int) -> bool:
    with Session(engine) as session:
        part = session.get(SparePart, spare_part_id)
        if not part:
            return False
        session.delete(part)
        session.commit()
    return True

def create_plant(name: str, description: Optional[str] = None, tipo: Optional[str] = None, es_resta: Optional[bool] = False) -> dict:
    with Session(engine) as session:
        plant = Plant(name=name, description=description, tipo=tipo, es_resta=es_resta)
        session.add(plant)
        session.commit()
        session.refresh(plant)
        plant_data = {"id": plant.id, "name": plant.name, "description": plant.description, "tipo": plant.tipo, "es_resta": plant.es_resta, "created_at": plant.created_at}
    return plant_data


def list_plants() -> List[dict]:
    with Session(engine) as session:
        plants = session.exec(select(Plant)).all()
        result = []
        for plant in plants:
            result.append({"id": plant.id, "name": plant.name, "description": plant.description, "tipo": plant.tipo, "es_resta": plant.es_resta, "created_at": plant.created_at})
    return result


def create_machinery(name: str, description: Optional[str] = None) -> dict:
    with Session(engine) as session:
        machinery = Machinery(name=name, description=description)
        session.add(machinery)
        session.commit()
        session.refresh(machinery)
        mach_data = {"id": machinery.id, "name": machinery.name, "description": machinery.description, "created_at": machinery.created_at}
    return mach_data


def list_machinery() -> List[dict]:
    with Session(engine) as session:
        machines = session.exec(select(Machinery)).all()
        result = []
        for machine in machines:
            result.append({"id": machine.id, "name": machine.name, "description": machine.description, "created_at": machine.created_at})
    return result


def create_truck(name: str, plate: Optional[str] = None, description: Optional[str] = None) -> dict:
    with Session(engine) as session:
        truck = Truck(name=name, plate=plate, description=description)
        session.add(truck)
        session.commit()
        session.refresh(truck)
        truck_data = {"id": truck.id, "name": truck.name, "plate": truck.plate, "description": truck.description, "created_at": truck.created_at}
    return truck_data


def list_trucks() -> List[dict]:
    with Session(engine) as session:
        trucks = session.exec(select(Truck)).all()
        result = []
        for truck in trucks:
            result.append({"id": truck.id, "name": truck.name, "plate": truck.plate, "description": truck.description, "created_at": truck.created_at})
    return result


def create_operator(name: str, description: Optional[str] = None) -> dict:
    with Session(engine) as session:
        operator = Operator(name=name, description=description)
        session.add(operator)
        session.commit()
        session.refresh(operator)
        op_data = {"id": operator.id, "name": operator.name, "description": operator.description, "created_at": operator.created_at}
    return op_data


def list_operators() -> List[dict]:
    with Session(engine) as session:
        operators = session.exec(select(Operator)).all()
        result = []
        for op in operators:
            result.append({"id": op.id, "name": op.name, "description": op.description, "created_at": op.created_at})
    return result


# Delete functions for masters
def delete_plant(plant_id: int) -> bool:
    with Session(engine) as session:
        plant = session.get(Plant, plant_id)
        if not plant:
            return False
        session.delete(plant)
        session.commit()
    return True


def delete_machinery(machinery_id: int) -> bool:
    with Session(engine) as session:
        machinery = session.get(Machinery, machinery_id)
        if not machinery:
            return False
        session.delete(machinery)
        session.commit()
    return True


def delete_truck(truck_id: int) -> bool:
    with Session(engine) as session:
        truck = session.get(Truck, truck_id)
        if not truck:
            return False
        session.delete(truck)
        session.commit()
    return True


def delete_operator(operator_id: int) -> bool:
    with Session(engine) as session:
        operator = session.get(Operator, operator_id)
        if not operator:
            return False
        session.delete(operator)
        session.commit()
    return True


def create_spare_part(name: str, code: Optional[str] = None, description: Optional[str] = None) -> dict:
    with Session(engine) as session:
        part = SparePart(name=name, code=code, description=description)
        session.add(part)
        session.commit()
        session.refresh(part)
        part_data = {"id": part.id, "name": part.name, "code": part.code, "description": part.description, "created_at": part.created_at}
    return part_data


def list_spare_parts() -> List[dict]:
    with Session(engine) as session:
        parts = session.exec(select(SparePart)).all()
        result = []
        for part in parts:
            result.append({"id": part.id, "name": part.name, "code": part.code, "description": part.description, "created_at": part.created_at})
    return result


# ========== MANTENCIONES ==========

def create_maintenance(data: dict, created_by: Optional[int] = None) -> Maintenance:
    with Session(engine) as session:
        # Convertir spare_parts a JSON si es necesario
        spare_part_ids_json = None
        if data.get('spare_parts'):
            import json
            spare_part_ids_json = json.dumps(data.get('spare_parts'))
        
        details = data.get('details')
        
        m = Maintenance(
            item_type=data.get('item_type'),
            item_id=int(data.get('item_id')),
            service_date=data.get('service_date') or datetime.utcnow(),
            hours_at_service=data.get('hours_at_service'),
            interval_hours=data.get('interval_hours'),
            quantity_changed=data.get('quantity_changed'),
            location=data.get('location'),
            notes=data.get('notes'),
            spare_part_ids=spare_part_ids_json,
            details=details,
            created_by=created_by
        )
        session.add(m)
        session.commit()
        session.refresh(m)
        m_data = {"id": m.id, "item_type": m.item_type, "item_id": m.item_id, "service_date": m.service_date,
                  "hours_at_service": m.hours_at_service, "interval_hours": m.interval_hours,
                  "quantity_changed": m.quantity_changed, "location": m.location, "notes": m.notes,
                  "spare_part_ids": m.spare_part_ids, "details": m.details,
                  "created_by": m.created_by, "created_at": m.created_at}
    return Maintenance(**m_data)


def list_maintenances(item_type: Optional[str] = None, item_id: Optional[int] = None) -> List[Maintenance]:
    with Session(engine) as session:
        statement = select(Maintenance)
        if item_type:
            statement = statement.where(Maintenance.item_type == item_type)
        if item_id:
            statement = statement.where(Maintenance.item_id == item_id)
        rows = session.exec(statement).all()
        result = []
        for r in rows:
            result.append(Maintenance(**{
                "id": r.id, "item_type": r.item_type, "item_id": r.item_id,
                "service_date": r.service_date, "hours_at_service": r.hours_at_service,
                "interval_hours": r.interval_hours, "quantity_changed": r.quantity_changed,
                "location": r.location, "notes": r.notes, "created_by": r.created_by,
                "created_at": r.created_at
            }))
    return result


def get_last_maintenance(item_type: str, item_id: int) -> Optional[Maintenance]:
    with Session(engine) as session:
        statement = select(Maintenance).where(
            (Maintenance.item_type == item_type) & (Maintenance.item_id == item_id)
        ).order_by(Maintenance.service_date.desc())
        m = session.exec(statement).first()
        if m:
            return Maintenance(**{
                "id": m.id, "item_type": m.item_type, "item_id": m.item_id,
                "service_date": m.service_date, "hours_at_service": m.hours_at_service,
                "interval_hours": m.interval_hours, "quantity_changed": m.quantity_changed,
                "location": m.location, "notes": m.notes, "created_by": m.created_by,
                "created_at": m.created_at
            })
    return None


def update_maintenance(maintenance_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[Maintenance]:
    with Session(engine) as session:
        m = session.get(Maintenance, maintenance_id)
        if not m:
            return None
        # update allowed fields
        for k in ('service_date', 'hours_at_service', 'interval_hours', 'quantity_changed', 'location', 'notes'):
            if k in data:
                setattr(m, k, data.get(k))
        if updated_by is not None:
            m.created_by = updated_by
        session.add(m)
        session.commit()
        session.refresh(m)
        return Maintenance(**{
            "id": m.id, "item_type": m.item_type, "item_id": m.item_id,
            "service_date": m.service_date, "hours_at_service": m.hours_at_service,
            "interval_hours": m.interval_hours, "quantity_changed": m.quantity_changed,
            "location": m.location, "notes": m.notes, "created_by": m.created_by,
            "created_at": m.created_at
        })


# ========== REPORTES ==========

def create_report(report: Report) -> Report:
    with Session(engine) as session:
        session.add(report)
        session.commit()
        session.refresh(report)
        # Serializar antes de cerrar la sesión
        report_data = {
            "id": report.id,
            "date": report.date,
            "plant_id": report.plant_id,
            "machinery_ids": report.machinery_ids,
            "truck_ids": report.truck_ids,
            "operator_id": report.operator_id,
            "horometer_start": report.horometer_start,
            "horometer_end": report.horometer_end,
            "spare_part_ids": report.spare_part_ids,
            "maintenances": report.maintenances,
            "materials": report.materials,
            "total_m3": report.total_m3,
            "downtime_min": report.downtime_min,
            "created_by": report.created_by,
            "created_at": report.created_at,
        }
    return Report(**report_data)

def update_report(report: Report) -> Report:
    with Session(engine) as session:
        db_report = session.get(Report, report.id)
        if not db_report:
            return None
        # Actualizar campos
        db_report.date = report.date
        db_report.plant_id = report.plant_id
        db_report.machinery_ids = report.machinery_ids
        db_report.truck_ids = report.truck_ids
        db_report.operator_id = report.operator_id
        db_report.horometer_start = report.horometer_start
        db_report.horometer_end = report.horometer_end
        db_report.spare_part_ids = report.spare_part_ids
        db_report.maintenances = report.maintenances
        db_report.materials = report.materials
        db_report.total_m3 = report.total_m3
        db_report.downtime_min = report.downtime_min
        db_report.created_by = report.created_by
        session.add(db_report)
        session.commit()
        session.refresh(db_report)
        # Serializar antes de cerrar la sesión
        report_data = {
            "id": db_report.id,
            "date": db_report.date,
            "plant_id": db_report.plant_id,
            "machinery_ids": db_report.machinery_ids,
            "truck_ids": db_report.truck_ids,
            "operator_id": db_report.operator_id,
            "horometer_start": db_report.horometer_start,
            "horometer_end": db_report.horometer_end,
            "spare_part_ids": db_report.spare_part_ids,
            "maintenances": db_report.maintenances,
            "materials": db_report.materials,
            "total_m3": db_report.total_m3,
            "downtime_min": db_report.downtime_min,
            "created_by": db_report.created_by,
            "created_at": db_report.created_at,
        }
    return Report(**report_data)

def get_report(report_id: int) -> Optional[dict]:
    """Obtener un reporte por ID"""
    with Session(engine) as session:
        report = session.get(Report, report_id)
        if not report:
            return None
        # Serializar antes de cerrar la sesión
        report_data = {
            "id": report.id,
            "date": report.date,
            "plant_id": report.plant_id,
            "machinery_ids": report.machinery_ids,
            "truck_ids": report.truck_ids,
            "operator_id": report.operator_id,
            "horometer_start": report.horometer_start,
            "horometer_end": report.horometer_end,
            "spare_part_ids": report.spare_part_ids,
            "maintenances": report.maintenances,
            "materials": report.materials,
            "total_m3": report.total_m3,
            "downtime_min": report.downtime_min,
            "created_by": report.created_by,
            "created_at": report.created_at,
        }
    return report_data

def list_reports(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    """Listar reportes con filtro opcional por fecha"""
    from datetime import datetime as dt
    
    with Session(engine) as session:
        statement = select(Report)
        
        # Filtrar por fechas si se proporcionan
        if start_date:
            try:
                start_dt = dt.fromisoformat(start_date)
                statement = statement.where(Report.date >= start_dt.date())
            except:
                pass  # Ignorar formato inválido
        
        if end_date:
            try:
                end_dt = dt.fromisoformat(end_date)
                statement = statement.where(Report.date <= end_dt.date())
            except:
                pass  # Ignorar formato inválido
        
        # Ordenar por fecha descendente
        statement = statement.order_by(Report.date.desc())
        
        reports = session.exec(statement).all()
        result = []
        for report in reports:
            report_data = {
                "id": report.id,
                "date": report.date,
                "plant_id": report.plant_id,
                "machinery_ids": report.machinery_ids,
                "truck_ids": report.truck_ids,
                "operator_id": report.operator_id,
                "horometer_start": report.horometer_start,
                "horometer_end": report.horometer_end,
                "spare_part_ids": report.spare_part_ids,
                "maintenances": report.maintenances,
                "materials": report.materials,
                "total_m3": report.total_m3,
                "downtime_min": report.downtime_min,
                "created_by": report.created_by,
                "created_at": report.created_at,
            }
            result.append(report_data)
    return result

def delete_report(report_id: int) -> bool:
    with Session(engine) as session:
        report = session.get(Report, report_id)
        if not report:
            return False
        session.delete(report)
        session.commit()
    return True


# ========== BONO PRODUCCION ==========
from .models import BonoProduccion

def create_bono_produccion(mes: str, plant_id: Optional[int], produccion_total: float, 
                          horas_extra: float, trabajadores: str, total_bono: float, 
                          created_by: Optional[int]) -> BonoProduccion:
    """Crear un nuevo registro de bono producción"""
    with Session(engine) as session:
        bono = BonoProduccion(
            mes=mes,
            plant_id=plant_id,
            produccion_total_m3=produccion_total,
            horas_extra_m3=horas_extra,
            produccion_final_m3=max(produccion_total - horas_extra, 0),
            trabajadores=trabajadores,
            total_bono_general=total_bono,
            created_by=created_by
        )
        session.add(bono)
        session.commit()
        session.refresh(bono)
        bono_dict = {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "created_by": bono.created_by,
            "created_at": bono.created_at,
            "updated_at": bono.updated_at
        }
    return BonoProduccion(**bono_dict)


def get_bono_produccion(bono_id: int) -> Optional[BonoProduccion]:
    """Obtener un bono producción por ID"""
    with Session(engine) as session:
        bono = session.get(BonoProduccion, bono_id)
        if not bono:
            return None
        bono_dict = {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "created_by": bono.created_by,
            "created_at": bono.created_at,
            "updated_at": bono.updated_at
        }
    return BonoProduccion(**bono_dict)


def list_bono_produccion(mes: Optional[str] = None, plant_id: Optional[int] = None) -> List[BonoProduccion]:
    """Listar bonos producción con filtros opcionales"""
    with Session(engine) as session:
        statement = select(BonoProduccion)
        
        if mes:
            statement = statement.where(BonoProduccion.mes == mes)
        if plant_id:
            statement = statement.where(BonoProduccion.plant_id == plant_id)
        
        bonos = session.exec(statement).all()
        result = []
        for bono in bonos:
            bono_dict = {
                "id": bono.id,
                "mes": bono.mes,
                "plant_id": bono.plant_id,
                "produccion_total_m3": bono.produccion_total_m3,
                "horas_extra_m3": bono.horas_extra_m3,
                "produccion_final_m3": bono.produccion_final_m3,
                "trabajadores": bono.trabajadores,
                "total_bono_general": bono.total_bono_general,
                "created_by": bono.created_by,
                "created_at": bono.created_at,
                "updated_at": bono.updated_at
            }
            result.append(BonoProduccion(**bono_dict))
    return result


def update_bono_produccion(bono_id: int, produccion_total: Optional[float] = None,
                          horas_extra: Optional[float] = None, trabajadores: Optional[str] = None,
                          total_bono: Optional[float] = None) -> Optional[BonoProduccion]:
    """Actualizar un bono producción existente"""
    with Session(engine) as session:
        bono = session.get(BonoProduccion, bono_id)
        if not bono:
            return None
        
        if produccion_total is not None:
            bono.produccion_total_m3 = produccion_total
        if horas_extra is not None:
            bono.horas_extra_m3 = horas_extra
        if trabajadores is not None:
            bono.trabajadores = trabajadores
        if total_bono is not None:
            bono.total_bono_general = total_bono
        
        # Recalcular producción final
        bono.produccion_final_m3 = max(bono.produccion_total_m3 - bono.horas_extra_m3, 0)
        bono.updated_at = datetime.utcnow()
        
        session.add(bono)
        session.commit()
        session.refresh(bono)
        
        bono_dict = {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "created_by": bono.created_by,
            "created_at": bono.created_at,
            "updated_at": bono.updated_at
        }
    return BonoProduccion(**bono_dict)


def delete_bono_produccion(bono_id: int) -> bool:
    """Eliminar un bono producción"""
    with Session(engine) as session:
        bono = session.get(BonoProduccion, bono_id)
        if not bono:
            return False
        session.delete(bono)
        session.commit()
    return True

