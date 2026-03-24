from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import json
from datetime import timedelta

from typing import List

from app.database import create_db_and_tables, engine
from app import models, crud, auth, pdf_generator
from app.schemas import (
    UserCreate, Token, ReportCreate, ReportRead,
    PlantCreate, PlantRead, MachineryCreate, MachineryRead,
    TruckCreate, TruckRead, OperatorCreate, OperatorRead,
    SparePartCreate, SparePartRead, MaterialCreate, MaterialRead,
    MaintenanceCreate, MaintenanceRead
)
app = FastAPI(title="Reportes de Producción - Áridos")

# Configurar CORS PRIMERO
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# ========== ENDPOINTS RAÍZ ==========

@app.get("/")
def root():
    index_path = Path(__file__).parent / "static" / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"mensaje": "Bienvenido a Reportes de Producción - Áridos"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "API funcionando"}


# ========== ENDPOINTS DE MATERIALES ==========
@app.post("/materials/", response_model=MaterialRead)
def create_material(payload: MaterialCreate):
    """Crear nuevo material"""
    return crud.create_material(payload.name)

@app.get("/materials/", response_model=list)
def list_materials():
    """Listar todos los materiales"""
    return crud.list_materials()

@app.delete("/materials/{material_id}", response_model=dict)
def delete_material(material_id: int):
    """Eliminar material por ID"""
    deleted = crud.delete_material(material_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    return {"ok": True, "deleted_id": material_id}

# ========== ENDPOINTS DE MAESTROS / CATÁLOGOS ==========
@app.delete("/spare-parts/{spare_part_id}", response_model=dict)
def delete_spare_part(spare_part_id: int):
    """Eliminar repuesto por ID"""
    deleted = crud.delete_spare_part(spare_part_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    return {"ok": True, "deleted_id": spare_part_id}

@app.post("/plants/", response_model=PlantRead)
def create_plant(payload: PlantCreate):
    """Crear nueva planta"""
    return crud.create_plant(
        payload.name,
        payload.description,
        payload.tipo,
        payload.es_resta
    )


@app.get("/plants/", response_model=List[PlantRead])
def list_plants():
    """Listar todas las plantas"""
    return crud.list_plants()


@app.delete("/plants/{plant_id}", response_model=dict)
def delete_plant(plant_id: int):
    """Eliminar una planta"""
    deleted = crud.delete_plant(plant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    return {"ok": True, "deleted_id": plant_id}


@app.post("/machinery/", response_model=MachineryRead)
def create_machinery(payload: MachineryCreate):
    """Crear nueva maquinaria"""
    return crud.create_machinery(payload.name, payload.description)


@app.get("/machinery/", response_model=List[MachineryRead])
def list_machinery():
    """Listar todas las maquinarias"""
    return crud.list_machinery()

@app.delete("/machinery/{machinery_id}", response_model=dict)
def delete_machinery(machinery_id: int):
    """Eliminar una máquina"""
    deleted = crud.delete_machinery(machinery_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    return {"ok": True, "deleted_id": machinery_id}

@app.post("/trucks/", response_model=TruckRead)
def create_truck(payload: TruckCreate):
    """Crear nuevo camión"""
    return crud.create_truck(payload.name, payload.plate, payload.description)


@app.get("/trucks/", response_model=List[TruckRead])
def list_trucks():
    """Listar todos los camiones"""
    return crud.list_trucks()


@app.delete("/trucks/{truck_id}", response_model=dict)
def delete_truck(truck_id: int):
    """Eliminar un camión"""
    deleted = crud.delete_truck(truck_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Camión no encontrado")
    return {"ok": True, "deleted_id": truck_id}


@app.post("/operators/", response_model=OperatorRead)
def create_operator(payload: OperatorCreate):
    """Crear nuevo operador"""
    return crud.create_operator(payload.name, payload.description)


@app.get("/operators/", response_model=List[OperatorRead])
def list_operators():
    """Listar todos los operadores"""
    return crud.list_operators()


@app.delete("/operators/{operator_id}", response_model=dict)
def delete_operator(operator_id: int):
    """Eliminar un operador"""
    deleted = crud.delete_operator(operator_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return {"ok": True, "deleted_id": operator_id}


@app.post("/spare-parts/", response_model=SparePartRead)
def create_spare_part(payload: SparePartCreate):
    """Crear nuevo repuesto"""
    return crud.create_spare_part(payload.name, payload.code, payload.description)


@app.get("/spare-parts/", response_model=List[SparePartRead])
def list_spare_parts():
    """Listar todos los repuestos"""
    return crud.list_spare_parts()


# ========== ENDPOINTS DE AUTENTICACIÓN ==========

@app.post("/users/", response_model=dict)
def create_user(payload: UserCreate):
    """Crear nuevo usuario"""
    existing = crud.get_user_by_username(payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="Este usuario ya existe")
    hashed = auth.get_password_hash(payload.password)
    user = crud.create_user(payload.username, hashed)
    return {"id": user.id, "username": user.username}


@app.post("/auth/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Obtener token JWT"""
    user = auth.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
    access_token_expires = timedelta(
        minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60*24))
    )
    access_token = auth.create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "role": getattr(user, "role", "registrador")
    }


@app.post("/auth/register")
def register_user(payload: UserCreate):
    """Registrar nuevo usuario"""
    from sqlmodel import Session, select
    
    with Session(engine) as session:
        # Verificar si el usuario ya existe
        existing_user = session.exec(select(models.User).where(models.User.username == payload.username)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="El usuario ya existe")
        
        # Crear nuevo usuario
        new_user = models.User(
            username=payload.username,
            hashed_password=auth.hash_password(payload.password),
            role=payload.role
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        return {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "message": "Usuario registrado correctamente"
        }


# ========== ENDPOINTS DE GESTIÓN DE USUARIOS ==========

@app.get("/me")
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """Obtener información del usuario actual"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": getattr(current_user, "role", "registrador")
    }


@app.get("/users/", response_model=list)
def list_users(current_user: models.User = Depends(auth.get_current_user)):
    """Listar todos los usuarios (solo admin)"""
    if getattr(current_user, "role", "registrador") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para ver usuarios")
    
    from sqlmodel import Session, select
    try:
        with Session(engine) as session:
            users = session.exec(select(models.User)).all()
            return [
                {
                    "id": u.id,
                    "username": u.username,
                    "role": getattr(u, "role", "registrador"),
                    "created_at": u.created_at.isoformat() if hasattr(u, "created_at") else None
                }
                for u in users
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Actualizar rol de un usuario (solo admin)"""
    if getattr(current_user, "role", "registrador") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar usuarios")
    
    from sqlmodel import Session, select
    new_role = payload.get("role", "registrador")
    
    if new_role not in ["admin", "registrador"]:
        raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'admin' o 'registrador'")
    
    try:
        with Session(engine) as session:
            user = session.exec(select(models.User).where(models.User.id == user_id)).first()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            user.role = new_role
            session.add(user)
            session.commit()
            session.refresh(user)
            
            return {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "message": "Rol actualizado correctamente"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: dict = None,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Resetear contraseña de un usuario a una contraseña temporal (solo admin)"""
    if getattr(current_user, "role", "registrador") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para resetear contraseñas")
    
    from sqlmodel import Session, select
    import random
    import string
    
    # Generar contraseña temporal de 8 caracteres
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    try:
        with Session(engine) as session:
            user = session.exec(select(models.User).where(models.User.id == user_id)).first()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            user.hashed_password = auth.hash_password(temp_password)
            session.add(user)
            session.commit()
            session.refresh(user)
            
            return {
                "id": user.id,
                "username": user.username,
                "temporary_password": temp_password,
                "message": "Contraseña reseteada. Comparte esta contraseña temporal con el usuario."
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.delete("/users/{user_id}", response_model=dict)
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Eliminar un usuario (solo admin)"""
    if getattr(current_user, "role", "registrador") != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")
    
    # No permitir eliminar al usuario actual
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    from sqlmodel import Session, select
    
    try:
        with Session(engine) as session:
            user = session.exec(select(models.User).where(models.User.id == user_id)).first()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            session.delete(user)
            session.commit()
            
            return {"ok": True, "deleted_id": user_id, "message": "Usuario eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ========== ENDPOINTS DE REPORTES ==========

@app.post("/reports/", response_model=ReportRead)
def create_report(
    payload: ReportCreate, 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Crear nuevo reporte"""
    print(f"\n[CREATE REPORT] Fecha recibida del cliente: {payload.date} (tipo: {type(payload.date).__name__})")
    
    # Convertir listas y objetos a JSON strings
    machinery_ids_json = json.dumps(payload.machinery_ids) if payload.machinery_ids else None
    truck_ids_json = json.dumps(payload.truck_ids) if payload.truck_ids else None
    spare_part_ids_json = json.dumps(payload.spare_part_ids) if payload.spare_part_ids else None
    materials_json = json.dumps(payload.materials) if payload.materials else None
    report = models.Report(
        date=payload.date,
        plant_id=payload.plant_id,
        machinery_ids=machinery_ids_json,
        truck_ids=truck_ids_json,
        operator_id=payload.operator_id,
        horometer_start=payload.horometer_start,
        horometer_end=payload.horometer_end,
        spare_part_ids=spare_part_ids_json,
        maintenances=payload.maintenances,
        materials=materials_json,
        total_m3=payload.total_m3,
        downtime_min=payload.downtime_min,
        created_by=current_user.id
    )
    created = crud.create_report(report)
    print(f"[CREATE REPORT] Reporte creado con fecha: {created.date}\n")
    return created

@app.put("/reports/{report_id}", response_model=ReportRead)
def update_report(report_id: int, payload: ReportCreate, current_user: models.User = Depends(auth.get_current_user)):
    """Actualizar un reporte existente"""
    print(f"\n[UPDATE REPORT] Actualizando reporte {report_id}")
    print(f"[UPDATE REPORT] Fecha recibida del cliente: {payload.date} (tipo: {type(payload.date).__name__})")
    
    # Convertir listas y objetos a JSON strings
    machinery_ids_json = json.dumps(payload.machinery_ids) if payload.machinery_ids else None
    truck_ids_json = json.dumps(payload.truck_ids) if payload.truck_ids else None
    spare_part_ids_json = json.dumps(payload.spare_part_ids) if payload.spare_part_ids else None
    materials_json = json.dumps(payload.materials) if payload.materials else None
    
    print(f"[UPDATE REPORT] Fechaantes de crear modelo: {payload.date}")
    
    report = models.Report(
        id=report_id,
        date=payload.date,
        plant_id=payload.plant_id,
        machinery_ids=machinery_ids_json,
        truck_ids=truck_ids_json,
        operator_id=payload.operator_id,
        horometer_start=payload.horometer_start,
        horometer_end=payload.horometer_end,
        spare_part_ids=spare_part_ids_json,
        maintenances=payload.maintenances,
        materials=materials_json,
        total_m3=payload.total_m3,
        downtime_min=payload.downtime_min,
        created_by=current_user.id
    )
    
    print(f"[UPDATE REPORT] Fecha en modelo Report después de crear: {report.date} (tipo: {type(report.date).__name__})")
    
    updated = crud.update_report(report)
    if not updated:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    print(f"[UPDATE REPORT] Fecha después de actualizar en BD: {updated.date} (tipo: {type(updated.date).__name__})")
    print(f"[UPDATE REPORT] Devolviendo: {updated}\n")
    return updated

@app.delete("/reports/{report_id}", response_model=dict)
def delete_report(report_id: int, current_user: models.User = Depends(auth.get_current_user)):
    """Eliminar un reporte por ID"""
    deleted = crud.delete_report(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return {"ok": True, "deleted_id": report_id}


# ========== ENDPOINTS DE MANTENCIONES ==========


@app.post("/maintenances/", response_model=MaintenanceRead)
def create_maintenance(payload: MaintenanceCreate, current_user: models.User = Depends(auth.get_current_user)):
    data = payload.dict()
    # if service_date is None, crud will set now
    created = crud.create_maintenance(data, created_by=current_user.id)
    return created


@app.get("/maintenances/")
def list_maintenances(item_type: str = None, item_id: int = None, current_user: models.User = Depends(auth.get_current_user)):
    mats = crud.list_maintenances(item_type=item_type, item_id=item_id)
    return mats


@app.get("/maintenances/last")
def last_maintenance(item_type: str, item_id: int, current_user: models.User = Depends(auth.get_current_user)):
    m = crud.get_last_maintenance(item_type, item_id)
    if not m:
        raise HTTPException(status_code=404, detail="No hay mantenciones registradas para ese elemento")
    return m



@app.put("/maintenances/{maintenance_id}", response_model=MaintenanceRead)
def update_maintenance(maintenance_id: int, payload: MaintenanceCreate, current_user: models.User = Depends(auth.get_current_user)):
    data = payload.dict()
    updated = crud.update_maintenance(maintenance_id, data, updated_by=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Mantención no encontrada")
    return updated


@app.get("/reports/")
def list_reports(
    start_date: str = None, 
    end_date: str = None, 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Listar reportes"""
    try:
        reports = crud.list_reports(start_date, end_date)
        print("[DEBUG] Reportes obtenidos:", reports)
        return reports
    except Exception as e:
        import traceback
        print("[ERROR] Al listar reportes:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@app.get("/reports/{report_id}")
def get_report(
    report_id: int, 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtener un reporte por ID"""
    r = crud.get_report(report_id)
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return r


# ========== ENDPOINTS DE BONO PRODUCCION ==========

@app.post("/bonos/")
def create_bono_produccion(
    payload: dict = Body(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Crear nuevo bono de producción"""
    try:
        mes = payload.get("mes")
        plant_id = payload.get("plant_id")
        produccion_total = float(payload.get("produccion_total", 0))
        horas_extra = float(payload.get("horas_extra", 0))
        trabajadores = payload.get("trabajadores", "[]")  # JSON string
        total_bono = float(payload.get("total_bono", 0))
        
        if not mes:
            raise HTTPException(status_code=400, detail="El mes es requerido")
        
        bono = crud.create_bono_produccion(
            mes=mes,
            plant_id=plant_id,
            produccion_total=produccion_total,
            horas_extra=horas_extra,
            trabajadores=trabajadores,
            total_bono=total_bono,
            created_by=current_user.id
        )
        
        return {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "created_at": bono.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear bono: {str(e)}")


@app.get("/bonos/")
def list_bonos_produccion(
    mes: str = None,
    plant_id: int = None,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Listar bonos de producción con filtros opcionales"""
    try:
        bonos = crud.list_bono_produccion(mes=mes, plant_id=plant_id)
        return [
            {
                "id": b.id,
                "mes": b.mes,
                "plant_id": b.plant_id,
                "produccion_total_m3": b.produccion_total_m3,
                "horas_extra_m3": b.horas_extra_m3,
                "produccion_final_m3": b.produccion_final_m3,
                "trabajadores": b.trabajadores,
                "total_bono_general": b.total_bono_general,
                "created_at": b.created_at.isoformat()
            }
            for b in bonos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar bonos: {str(e)}")


@app.get("/bonos/{bono_id}")
def get_bono_produccion(
    bono_id: int,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtener un bono de producción por ID"""
    try:
        bono = crud.get_bono_produccion(bono_id)
        if not bono:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        
        return {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "created_at": bono.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.put("/bonos/{bono_id}")
def update_bono_produccion(
    bono_id: int,
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Actualizar un bono de producción existente"""
    try:
        produccion_total = payload.get("produccion_total")
        horas_extra = payload.get("horas_extra")
        trabajadores = payload.get("trabajadores")
        total_bono = payload.get("total_bono")
        
        bono = crud.update_bono_produccion(
            bono_id=bono_id,
            produccion_total=float(produccion_total) if produccion_total else None,
            horas_extra=float(horas_extra) if horas_extra else None,
            trabajadores=trabajadores,
            total_bono=float(total_bono) if total_bono else None
        )
        
        if not bono:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        
        return {
            "id": bono.id,
            "mes": bono.mes,
            "plant_id": bono.plant_id,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores,
            "total_bono_general": bono.total_bono_general,
            "updated_at": bono.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar bono: {str(e)}")


@app.delete("/bonos/{bono_id}")
def delete_bono_produccion(
    bono_id: int,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Eliminar un bono de producción"""
    try:
        deleted = crud.delete_bono_produccion(bono_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        
        return {"ok": True, "deleted_id": bono_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar bono: {str(e)}")


@app.get("/bonos/{id}/pdf")
def download_bono_pdf(
    id: int,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Descargar PDF de un bono de producción guardado"""
    try:
        # Obtener bono
        bono = crud.get_bono_produccion(id)
        if not bono:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        
        # Obtener nombre de planta si existe
        plant_name = "Todas"
        if bono.plant_id:
            with next(crud.get_db()) as session:
                plant = session.query(models.Plant).filter(models.Plant.id == bono.plant_id).first()
                if plant:
                    plant_name = plant.name
        
        # Preparar datos para PDF
        bono_data = {
            "mes": bono.mes,
            "plant_name": plant_name,
            "produccion_total_m3": bono.produccion_total_m3,
            "horas_extra_m3": bono.horas_extra_m3,
            "produccion_final_m3": bono.produccion_final_m3,
            "trabajadores": bono.trabajadores or "[]",
            "total_bono_general": bono.total_bono_general,
            "materiales_resumen": {}
        }
        
        # Generar PDF
        pdf_buffer = pdf_generator.generate_bono_pdf(bono_data)
        
        # Retornar como descarga
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=bono_{bono.mes}.pdf"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")


@app.post("/bonos/generate-pdf/")
def generate_bono_pdf_preview(
    payload: dict = Body(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Generar PDF de bono sin guardarlo (para previsualización/descarga inmediata)"""
    try:
        # Obtener nombre de planta si existe
        plant_name = "Todas"
        plant_id = payload.get("plant_id")
        if plant_id:
            with next(crud.get_db()) as session:
                plant = session.query(models.Plant).filter(models.Plant.id == plant_id).first()
                if plant:
                    plant_name = plant.name
        
        # Preparar datos del payload
        bono_data = {
            "mes": payload.get("mes", "N/A"),
            "plant_name": plant_name,
            "produccion_total_m3": float(payload.get("produccion_total", 0)),
            "horas_extra_m3": float(payload.get("horas_extra", 0)),
            "produccion_final_m3": float(payload.get("produccion_final", 0)),
            "trabajadores": payload.get("trabajadores", "[]"),
            "total_bono_general": float(payload.get("total_bono", 0)),
            "materiales_resumen": payload.get("materiales_resumen", {})
        }
        
        # Generar PDF
        pdf_buffer = pdf_generator.generate_bono_pdf(bono_data)
        
        # Retornar como descarga
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=bono_{bono_data['mes']}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")




