"""Validaciones de import_alumnos: rechazo de situaciones desconocidas y
limpieza del registro de titulación cuando el alumno deja de estar titulado.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.base as base

ENCABEZADO = (
    "cve_uaslp,cve_larga,nombre,sexo,generacion,tutor,fecha_egreso,"
    "fecha_pasante,situacion,fecha_titulacion,opcion_titulacion,materias_reprobadas"
)
CARRERA = "TEST"


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    base.engine = engine
    base.SessionLocal = SessionLocal

    import app.models  # noqa: F401
    from app.db import seed as seed_mod

    base.Base.metadata.create_all(bind=engine)
    seed_mod.engine = engine
    seed_mod.SessionLocal = SessionLocal
    seed_mod.seed()

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _csv(*filas: str) -> bytes:
    return ("\n".join([ENCABEZADO, *filas]) + "\n").encode("utf-8")


def test_rechaza_situacion_desconocida(db):
    from app.models import Trayectoria
    from app.services import csv_import

    contenido = _csv(
        "A0001,,ALUMNO BUENO,M,2018,,,,INSCRITO,,,0",
        "A0002,,ALUMNO MALO,M,2018,,,,TITLUADO,,,0",  # situación mal escrita
    )
    log = csv_import.import_alumnos(db, contenido, "alumnos.csv", CARRERA)

    assert log.filas_insertadas == 1
    assert log.filas_rechazadas == 1
    assert any("situación desconocida" in e["error"] for e in log.errores)
    # La fila mala no debe haber creado trayectoria.
    assert db.query(Trayectoria).count() == 1


def test_limpia_titulacion_cuando_deja_de_estar_titulado(db):
    from app.models import Titulacion
    from app.services import csv_import
    from app.services.indicadores import titulacion_por_cohorte

    # 1ª carga: alumno titulado.
    csv_import.import_alumnos(
        db,
        _csv("A0003,,ALUMNO TIT,M,2016,,,,TITULADO,2021-01-15,TESIS,0"),
        "alumnos.csv",
        CARRERA,
    )
    assert db.query(Titulacion).count() == 1
    assert sum(f["total"] for f in titulacion_por_cohorte(db, CARRERA)) == 1

    # 2ª carga: corrección a pasante.
    csv_import.import_alumnos(
        db,
        _csv("A0003,,ALUMNO TIT,M,2016,,,,PASANTE,,,0"),
        "alumnos.csv",
        CARRERA,
    )
    assert db.query(Titulacion).count() == 0
    assert titulacion_por_cohorte(db, CARRERA) == []
