from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.operacion import ImportLog
from app.schemas.importacion import ImportLogOut
from app.services import csv_import

router = APIRouter()


@router.post("/importaciones/plan-estudios", response_model=ImportLogOut)
def importar_plan_estudios(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = file.file.read()
    log = csv_import.import_plan_estudios(db, contents, file.filename or "plan_estudios.csv")
    return log


@router.post("/importaciones/alumnos", response_model=ImportLogOut)
def importar_alumnos(
    carrera_clave: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = file.file.read()
    log = csv_import.import_alumnos(db, contents, file.filename or "alumnos.csv", carrera_clave)
    return log


@router.post("/importaciones/kardex", response_model=ImportLogOut)
def importar_kardex(
    carrera_clave: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = file.file.read()
    log = csv_import.import_kardex(db, contents, file.filename or "kardex.csv", carrera_clave)
    return log


@router.get("/importaciones", response_model=list[ImportLogOut])
def listar_importaciones(db: Session = Depends(get_db)):
    return db.query(ImportLog).order_by(ImportLog.fecha.desc()).limit(100).all()


@router.get("/importaciones/{import_id}", response_model=ImportLogOut)
def obtener_importacion(import_id: int, db: Session = Depends(get_db)):
    log = db.get(ImportLog, import_id)
    if log is None:
        raise HTTPException(status_code=404, detail="importación no encontrada")
    return log
