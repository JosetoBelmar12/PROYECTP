"""
Módulo de administración de base de datos.
Proporciona funciones para consultar y inspeccionar la BD.
"""

from sqlmodel import Session, text, inspect
from typing import List, Dict, Any
from .database import engine
import json
from datetime import datetime

def get_all_tables() -> List[str]:
    """Obtiene lista de todas las tablas en la BD"""
    inspector = inspect(engine)
    return inspector.get_table_names()


def get_table_schema(table_name: str) -> Dict[str, Any]:
    """Obtiene el esquema (columnas y tipos) de una tabla"""
    inspector = inspect(engine)
    
    try:
        columns = inspector.get_columns(table_name)
        schema = {
            "table": table_name,
            "columns": [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True)
                }
                for col in columns
            ]
        }
        return schema
    except Exception as e:
        return {"error": str(e)}


def get_table_data(table_name: str, limit: int = 100) -> Dict[str, Any]:
    """Obtiene datos de una tabla con límite configurable"""
    try:
        with Session(engine) as session:
            query = text(f"SELECT * FROM {table_name} LIMIT :limit")
            result = session.exec(query, {"limit": limit})
            
            # Obtener nombres de columnas
            columns = [desc[0] for desc in result.keys()]
            
            # Convertir filas a diccionarios
            rows = []
            for row in result:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Convertir datetime a string para JSON
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[col] = value
                rows.append(row_dict)
            
            return {
                "table": table_name,
                "columns": columns,
                "row_count": len(rows),
                "data": rows
            }
    except Exception as e:
        return {"error": str(e), "table": table_name}


def get_table_count(table_name: str) -> int:
    """Obtiene el número total de registros en una tabla"""
    try:
        with Session(engine) as session:
            query = text(f"SELECT COUNT(*) as count FROM {table_name}")
            result = session.exec(query).first()
            return result[0] if result else 0
    except Exception as e:
        return 0


def execute_query(sql: str) -> Dict[str, Any]:
    """
    Ejecuta una consulta SQL personalizada (SOLO SELECT).
    Importante: Solo permite queries SELECT por seguridad.
    """
    # Validación de seguridad: Solo permitir SELECT
    sql_upper = sql.strip().upper()
    if not sql_upper.startswith("SELECT"):
        return {"error": "Solo se permiten consultas SELECT"}
    
    try:
        with Session(engine) as session:
            result = session.exec(text(sql))
            
            # Obtener columnas
            columns = [desc[0] for desc in result.keys()]
            
            # Obtener filas
            rows = []
            for row in result:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[col] = value
                rows.append(row_dict)
            
            return {
                "columns": columns,
                "rows": rows,
                "row_count": len(rows)
            }
    except Exception as e:
        return {"error": str(e)}


def get_database_summary() -> Dict[str, Any]:
    """
    Obtiene resumen completo de la BD:
    - Tablas disponibles
    - Cantidad de registros por tabla
    - Tamaño total (si es posible)
    """
    summary = {
        "tables": []
    }
    
    tables = get_all_tables()
    total_records = 0
    
    for table in tables:
        count = get_table_count(table)
        total_records += count
        summary["tables"].append({
            "name": table,
            "record_count": count
        })
    
    summary["total_records"] = total_records
    summary["total_tables"] = len(tables)
    
    return summary


def export_table_to_json(table_name: str) -> str:
    """Exporta una tabla completa a JSON"""
    data = get_table_data(table_name, limit=10000)
    return json.dumps(data, ensure_ascii=False, indent=2)


def get_table_statistics(table_name: str) -> Dict[str, Any]:
    """Obtiene estadísticas de una tabla (columnas numéricas)"""
    try:
        with Session(engine) as session:
            schema = get_table_schema(table_name)
            
            stats = {
                "table": table_name,
                "total_records": get_table_count(table_name),
                "columns": schema.get("columns", [])
            }
            
            return stats
    except Exception as e:
        return {"error": str(e)}
