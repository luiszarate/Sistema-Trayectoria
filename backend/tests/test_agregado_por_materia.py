"""La vista agregada por materia (por_materia=True) combina todos los ciclos
como un solo grupo: tasa ponderada por inscritos, no promedio de porcentajes.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.base as base

ENCAB_PLAN = "carrera,plan,cve_materia,nombre_materia,nivel,creditos,caracter,vigente"
ENCAB_ALU = (
    "cve_uaslp,cve_larga,nombre,sexo,generacion,tutor,fecha_egreso,"
    "fecha_pasante,situacion,fecha_titulacion,opcion_titulacion,materias_reprobadas"
)
ENCAB_KAR = "cve_uaslp,creditos,cve_materia,materia,calificacion,fecha_cal,tipo_examen,semestre"
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

    from app.services import csv_import

    session = SessionLocal()
    plan = "\n".join([ENCAB_PLAN, f"{CARRERA},PLAN,0042,ALGEBRA B,1,8,obligatoria,true"]) + "\n"
    csv_import.import_plan_estudios(session, plan.encode(), "plan.csv")

    # Ciclo A (2018-2019/I): 3 alumnos, 1 reprueba (33%).
    # Ciclo B (2019-2020/I): 1 alumno, reprueba (100%).
    # Promedio simple de %: (33% + 100%)/2 = 66.7%  -> INCORRECTO
    # Ponderado por inscritos: 2 reprobados / 4 inscritos = 50%  -> CORRECTO
    alumnos = "\n".join(
        [ENCAB_ALU]
        + [f"A{i},,ALU {i},M,2018,,,,INSCRITO,,,0" for i in range(1, 5)]
    ) + "\n"
    csv_import.import_alumnos(session, alumnos.encode(), "alu.csv", CARRERA)

    kardex = "\n".join(
        [
            ENCAB_KAR,
            "A1,8,0042,ALGEBRA B,90,2018-12-01,EO,2018-2019/I",
            "A2,8,0042,ALGEBRA B,80,2019-05-01,EO,2018-2019/II",
            "A3,8,0042,ALGEBRA B,50,2018-12-01,EO,2018-2019/I",  # reprueba
            "A4,8,0042,ALGEBRA B,40,2019-12-01,EO,2019-2020/I",  # reprueba (otro año)
        ]
    ) + "\n"
    csv_import.import_kardex(session, kardex.encode(), "kar.csv", CARRERA)

    try:
        yield session
    finally:
        session.close()


def test_reprobacion_agregada_es_ponderada_no_promedio_de_porcentajes(db):
    from app.services.indicadores import promedios_por_materia

    por_ciclo = promedios_por_materia(db, CARRERA, agrupar="ciclo")
    assert len(por_ciclo) == 3  # 2018-2019/I, 2018-2019/II, 2019-2020/I

    agregado = promedios_por_materia(db, CARRERA, agrupar="materia")
    assert len(agregado) == 1
    fila = agregado[0]
    assert fila["ciclo"] == "Todos los ciclos"
    assert fila["materia_cve"] == "0042"
    # 2 reprobados de 4 inscritos = 50%, no un promedio de porcentajes por ciclo.
    assert fila["pct_reprobacion"] == pytest.approx(0.5)
    # Promedio ponderado real: (90+80+50+40)/4 = 65.
    assert fila["promedio"] == pytest.approx(65.0)


def test_aprobacion_agregada_pondera_por_inscritos(db):
    from app.services.indicadores import aprobacion_por_materia

    agregado = aprobacion_por_materia(db, CARRERA, agrupar="materia")
    assert len(agregado) == 1
    fila = agregado[0]
    assert fila["inscritos"] == 4
    # 2 aprobados de 4 = 50%.
    assert fila["pct_aprobados"] == pytest.approx(0.5)


def test_agrupar_por_anio_combina_los_dos_periodos(db):
    from app.services.indicadores import promedios_por_materia

    filas = {f["ciclo"]: f for f in promedios_por_materia(db, CARRERA, agrupar="anio")}
    assert set(filas) == {"2018-2019", "2019-2020"}
    # 2018-2019 combina I (A1 90, A3 50) y II (A2 80): 1 reprobado de 3, prom 73.3.
    assert filas["2018-2019"]["pct_reprobacion"] == pytest.approx(1 / 3)
    assert filas["2018-2019"]["promedio"] == pytest.approx((90 + 80 + 50) / 3)


def test_filtro_de_ciclos_se_aplica_antes_de_agregar(db):
    from app.services.indicadores import promedios_por_materia

    # Sólo el año 2018-2019 (ambos periodos), agregado por materia.
    agregado = promedios_por_materia(
        db, CARRERA, agrupar="materia", ciclos=["2018-2019/I", "2018-2019/II"]
    )
    assert len(agregado) == 1
    fila = agregado[0]
    # 1 reprobado de 3 inscritos (excluye el ciclo 2019-2020/I).
    assert fila["pct_reprobacion"] == pytest.approx(1 / 3)
    assert fila["promedio"] == pytest.approx((90 + 80 + 50) / 3)


def test_agrupacion_invalida_es_error(db):
    from app.services.indicadores import aprobacion_por_materia

    with pytest.raises(ValueError):
        aprobacion_por_materia(db, CARRERA, agrupar="trimestre")
