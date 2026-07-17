from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.excel_export import generar_libro

router = APIRouter()


@router.get("/exportaciones/excel")
def exportar_excel(carrera: str = Query(...), db: Session = Depends(get_db)):
    try:
        buffer = generar_libro(db, carrera)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    nombre_archivo = f"trayectoria-{carrera.lower()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )
