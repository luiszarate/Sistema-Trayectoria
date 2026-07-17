from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.base import get_db
from app.models import Trayectoria
from app.schemas.alumno import AlumnoListItem, TrayectoriaOut
from app.services.trayectoria import construir_avance, obtener_trayectoria

router = APIRouter()


@router.get("/alumnos", response_model=list[AlumnoListItem])
def listar_alumnos(
    carrera: str | None = Query(default=None),
    cohorte: int | None = Query(default=None),
    situacion: str | None = Query(default=None),
    buscar: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Trayectoria).options(
        joinedload(Trayectoria.alumno), joinedload(Trayectoria.carrera), joinedload(Trayectoria.situacion)
    )
    if carrera:
        q = q.join(Trayectoria.carrera).filter_by(clave=carrera.upper())
    if cohorte is not None:
        q = q.filter(Trayectoria.cohorte == cohorte)
    if situacion:
        q = q.join(Trayectoria.situacion).filter_by(clave=situacion.upper())
    trayectorias = q.all()

    if buscar:
        like = buscar.upper()
        trayectorias = [
            t for t in trayectorias if like in t.alumno.nombre.upper() or like in t.alumno.cve_uaslp
        ]

    return [
        AlumnoListItem(
            cve_uaslp=t.alumno.cve_uaslp,
            nombre=t.alumno.nombre,
            sexo=t.alumno.sexo,
            carrera=t.carrera.nombre,
            cohorte=t.cohorte,
            situacion=t.situacion.clave if t.situacion else None,
        )
        for t in trayectorias
    ]


@router.get("/alumnos/{cve_uaslp}/trayectoria", response_model=TrayectoriaOut)
def trayectoria_alumno(cve_uaslp: str, db: Session = Depends(get_db)):
    trayectoria = obtener_trayectoria(db, cve_uaslp)
    if trayectoria is None:
        raise HTTPException(status_code=404, detail="alumno no encontrado")
    return construir_avance(db, trayectoria)
