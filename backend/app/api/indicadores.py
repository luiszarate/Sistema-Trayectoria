from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services import indicadores as svc

router = APIRouter()


def _con_manejo_error(fn, db: Session, carrera: str):
    try:
        return fn(db, carrera)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/indicadores/resumen-cohortes")
def resumen_cohortes(carrera: str = Query(...), db: Session = Depends(get_db)):
    return _con_manejo_error(svc.resumen_cohortes, db, carrera)


@router.get("/indicadores/retencion")
def retencion(carrera: str = Query(...), db: Session = Depends(get_db)):
    return _con_manejo_error(svc.retencion_matriz, db, carrera)


@router.get("/indicadores/ciclos")
def ciclos(carrera: str = Query(...), db: Session = Depends(get_db)):
    return _con_manejo_error(svc.ciclos_de_carrera, db, carrera)


@router.get("/indicadores/aprobacion")
def aprobacion(
    carrera: str = Query(...),
    agrupar: str = Query("ciclo", description="Nivel temporal: ciclo | anio | materia"),
    ciclos: list[str] = Query(default=[], description="Restringe a estos ciclos (por nombre)"),
    db: Session = Depends(get_db),
):
    try:
        return svc.aprobacion_por_materia(db, carrera, agrupar=agrupar, ciclos=ciclos)
    except ValueError as exc:
        estado = 404 if "no encontrada" in str(exc) else 422
        raise HTTPException(status_code=estado, detail=str(exc)) from exc


@router.get("/indicadores/promedios-materia")
def promedios_materia(
    carrera: str = Query(...),
    agrupar: str = Query("ciclo", description="Nivel temporal: ciclo | anio | materia"),
    ciclos: list[str] = Query(default=[], description="Restringe a estos ciclos (por nombre)"),
    db: Session = Depends(get_db),
):
    try:
        return svc.promedios_por_materia(db, carrera, agrupar=agrupar, ciclos=ciclos)
    except ValueError as exc:
        estado = 404 if "no encontrada" in str(exc) else 422
        raise HTTPException(status_code=estado, detail=str(exc)) from exc


@router.get("/indicadores/titulacion")
def titulacion(carrera: str = Query(...), db: Session = Depends(get_db)):
    return _con_manejo_error(svc.titulacion_por_cohorte, db, carrera)


@router.get("/indicadores/egreso")
def egreso(carrera: str = Query(...), db: Session = Depends(get_db)):
    return _con_manejo_error(svc.egreso_por_cohorte, db, carrera)
