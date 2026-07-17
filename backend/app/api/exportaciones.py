import re

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.schemas.exportacion import TablaExportRequest
from app.services.excel_export import generar_libro, generar_tabla

router = APIRouter()

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _nombre_archivo_seguro(nombre: str, por_defecto: str) -> str:
    """Sanea el nombre para la cabecera Content-Disposition."""
    limpio = re.sub(r"[^A-Za-z0-9._-]+", "-", (nombre or "").strip()).strip("-")
    return (limpio or por_defecto).lower()


@router.get("/exportaciones/excel")
def exportar_excel(carrera: str = Query(...), db: Session = Depends(get_db)):
    try:
        buffer = generar_libro(db, carrera)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    nombre_archivo = f"trayectoria-{carrera.lower()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )


@router.post("/exportaciones/tabla")
def exportar_tabla(payload: TablaExportRequest):
    """Exporta a Excel la vista de tabla actual (con los filtros y el orden ya
    aplicados en el frontend). No consulta la base de datos: escribe tal cual las
    filas que envía la interfaz."""
    for i, fila in enumerate(payload.filas):
        if len(fila) != len(payload.columnas):
            raise HTTPException(
                status_code=422,
                detail=f"la fila {i} tiene {len(fila)} celdas y se esperaban {len(payload.columnas)}",
            )

    buffer = generar_tabla(payload.nombre_hoja, payload.columnas, payload.filas)
    nombre_archivo = f"{_nombre_archivo_seguro(payload.nombre_archivo, 'tabla')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )
