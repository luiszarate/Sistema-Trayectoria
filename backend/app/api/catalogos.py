from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.base import get_db
from app.models import (
    Carrera,
    CicloEscolar,
    CodigoCalificacion,
    ModalidadTitulacion,
    PlanEstudios,
    PlanMateria,
    SituacionAcademica,
    TipoExamen,
)
from app.schemas.catalogo import (
    CarreraOut,
    CicloOut,
    CodigoCalificacionOut,
    CodigoCalificacionUpdate,
    ModalidadTitulacionOut,
    PlanEstudiosOut,
    PlanMateriaOut,
    PlanMateriaUpdate,
    SituacionAcademicaOut,
    SituacionAcademicaUpdate,
    TipoExamenOut,
    TipoExamenUpdate,
)

router = APIRouter()


@router.get("/carreras", response_model=list[CarreraOut])
def listar_carreras(db: Session = Depends(get_db)):
    return db.query(Carrera).order_by(Carrera.nombre).all()


@router.get("/carreras/{clave}/planes", response_model=list[PlanEstudiosOut])
def listar_planes(clave: str, db: Session = Depends(get_db)):
    carrera = db.query(Carrera).filter(Carrera.clave == clave.upper()).one_or_none()
    if carrera is None:
        raise HTTPException(status_code=404, detail="carrera no encontrada")
    return db.query(PlanEstudios).filter(PlanEstudios.carrera_id == carrera.id).all()


@router.get("/planes/{plan_id}/materias", response_model=list[PlanMateriaOut])
def listar_materias_plan(plan_id: int, db: Session = Depends(get_db)):
    filas = (
        db.query(PlanMateria)
        .options(joinedload(PlanMateria.materia))
        .filter(PlanMateria.plan_id == plan_id)
        .order_by(PlanMateria.nivel, PlanMateria.materia_id)
        .all()
    )
    return [
        PlanMateriaOut(
            id=pm.id,
            materia_cve=pm.materia.cve_materia,
            materia_nombre=pm.materia.nombre,
            nivel=pm.nivel,
            creditos=pm.creditos,
            caracter=pm.caracter,
        )
        for pm in filas
    ]


@router.put("/planes/materias/{plan_materia_id}", response_model=PlanMateriaOut)
def actualizar_materia_plan(plan_materia_id: int, body: PlanMateriaUpdate, db: Session = Depends(get_db)):
    pm = db.get(PlanMateria, plan_materia_id)
    if pm is None:
        raise HTTPException(status_code=404, detail="registro no encontrado")
    pm.nivel = body.nivel
    pm.creditos = body.creditos
    pm.caracter = body.caracter
    db.commit()
    db.refresh(pm)
    return PlanMateriaOut(
        id=pm.id,
        materia_cve=pm.materia.cve_materia,
        materia_nombre=pm.materia.nombre,
        nivel=pm.nivel,
        creditos=pm.creditos,
        caracter=pm.caracter,
    )


@router.get("/ciclos", response_model=list[CicloOut])
def listar_ciclos(db: Session = Depends(get_db)):
    return db.query(CicloEscolar).order_by(CicloEscolar.orden).all()


@router.get("/catalogos/tipos-examen", response_model=list[TipoExamenOut])
def listar_tipos_examen(db: Session = Depends(get_db)):
    return db.query(TipoExamen).order_by(TipoExamen.clave).all()


@router.put("/catalogos/tipos-examen/{item_id}", response_model=TipoExamenOut)
def actualizar_tipo_examen(item_id: int, body: TipoExamenUpdate, db: Session = Depends(get_db)):
    item = db.get(TipoExamen, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="no encontrado")
    item.nombre = body.nombre
    item.es_ordinario = body.es_ordinario
    db.commit()
    db.refresh(item)
    return item


@router.get("/catalogos/situaciones", response_model=list[SituacionAcademicaOut])
def listar_situaciones(db: Session = Depends(get_db)):
    return db.query(SituacionAcademica).order_by(SituacionAcademica.clave).all()


@router.put("/catalogos/situaciones/{item_id}", response_model=SituacionAcademicaOut)
def actualizar_situacion(item_id: int, body: SituacionAcademicaUpdate, db: Session = Depends(get_db)):
    item = db.get(SituacionAcademica, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="no encontrado")
    item.nombre = body.nombre
    item.es_activo = body.es_activo
    item.es_desercion = body.es_desercion
    item.es_egreso = body.es_egreso
    db.commit()
    db.refresh(item)
    return item


@router.get("/catalogos/codigos-calificacion", response_model=list[CodigoCalificacionOut])
def listar_codigos_calificacion(db: Session = Depends(get_db)):
    return db.query(CodigoCalificacion).order_by(CodigoCalificacion.clave).all()


@router.put("/catalogos/codigos-calificacion/{item_id}", response_model=CodigoCalificacionOut)
def actualizar_codigo_calificacion(item_id: int, body: CodigoCalificacionUpdate, db: Session = Depends(get_db)):
    item = db.get(CodigoCalificacion, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="no encontrado")
    item.nombre = body.nombre
    item.resultado = body.resultado
    db.commit()
    db.refresh(item)
    return item


@router.get("/catalogos/modalidades-titulacion", response_model=list[ModalidadTitulacionOut])
def listar_modalidades_titulacion(db: Session = Depends(get_db)):
    return db.query(ModalidadTitulacion).order_by(ModalidadTitulacion.clave).all()
