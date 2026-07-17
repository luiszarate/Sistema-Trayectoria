"""Siembra los catálogos con los valores observados en el Excel original.

Los nombres/semánticas marcados "(validar)" son inferencias a partir del
archivo `UASLP-TrayectoriaEscolar2026.xlsx` y deben confirmarse con
Secretaría Académica (ver docs/diseno-conceptual.md, sección 14, riesgo #2).
"""

from app.db.base import Base, SessionLocal, engine
from app.models import CodigoCalificacion, ModalidadTitulacion, SituacionAcademica, TipoExamen

TIPOS_EXAMEN = [
    ("EO", "Examen Ordinario", True),
    ("ET", "Examen a Título (validar)", False),
    ("EE", "Examen Extraordinario", False),
    ("ER", "Examen de Regularización", False),
    ("EA", "Examen Especial A (validar)", False),
    ("UO", "Unidad Ordinaria (validar)", False),
    ("UE", "Unidad Extraordinaria (validar)", False),
    ("UT", "Unidad a Título (validar)", False),
    ("IO", "Inscripción Ordinaria (validar)", False),
    ("IE", "Inscripción Extraordinaria (validar)", False),
    ("IT", "Inscripción a Título (validar)", False),
    ("AP", "Acreditación por Práctica (validar)", False),
    ("AC", "Acreditación", False),
    ("CV", "Convalidación", False),
    ("RV", "Revalidación", False),
    ("AE", "Acreditación Especial (validar)", False),
    ("EU", "Examen Único (validar)", False),
]

SITUACIONES = [
    ("INSCRITO", "Inscrito", True, False, False),
    ("NO INSCRITO", "No Inscrito", False, False, False),
    ("PASANTE", "Pasante", False, False, True),
    ("TITULADO", "Titulado", False, False, True),
    ("BAJA TEMPORAL", "Baja Temporal", False, False, False),
    ("BAJA DEFINITIVA", "Baja Definitiva", False, True, False),
    ("BAJA ACADÉMICA", "Baja Académica", False, True, False),
    ("CAMBIO DE FACULTAD", "Cambio de Facultad", False, False, False),
]

MODALIDADES_TITULACION = [
    "TRABAJO RECEPCIONAL",
    "CURSO DE OPCION A NO TRABAJO",
    "EXENCIÓN DE EXAMEN POR PROMEDIO",
    "UN SEMESTRE EN ESTUDIOS DE POSGRADO",
    "UN SEMESTRE O DOS CUATRIMESTRES EN ESTUDIOS DE POSGRADO",
    "ESTUDIOS DE POSGRADO",
    "TESIS",
    "PUBLICACIÓN DE ARTÍCULO CIENTÍFICO",
    "CENEVAL",
    "EXAMEN GENERAL DE CONOCIMIENTOS",
    "PROMEDIO",
]

CODIGOS_CALIFICACION = [
    ("AC", "Acreditada", "aprobado"),
    ("NP", "No Presentó", "reprobado"),
    ("NA", "No Acreditada", "reprobado"),
    ("ER", "Aprobada por Regularización", "aprobado"),
    ("ET", "Equivalencia por Título (validar)", "neutro"),
    ("SA", "Sin Antecedente (validar)", "neutro"),
    ("LR", "Libre de Repetición (validar)", "neutro"),
    ("EE", "Extraordinario Pendiente (validar)", "neutro"),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(TipoExamen).first():
            for clave, nombre, es_ordinario in TIPOS_EXAMEN:
                db.add(TipoExamen(clave=clave, nombre=nombre, es_ordinario=es_ordinario))

        if not db.query(SituacionAcademica).first():
            for clave, nombre, activo, desercion, egreso in SITUACIONES:
                db.add(
                    SituacionAcademica(
                        clave=clave,
                        nombre=nombre,
                        es_activo=activo,
                        es_desercion=desercion,
                        es_egreso=egreso,
                    )
                )

        if not db.query(ModalidadTitulacion).first():
            for clave in MODALIDADES_TITULACION:
                db.add(ModalidadTitulacion(clave=clave, nombre=clave.title()))

        if not db.query(CodigoCalificacion).first():
            for clave, nombre, resultado in CODIGOS_CALIFICACION:
                db.add(CodigoCalificacion(clave=clave, nombre=nombre, resultado=resultado))

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Catálogos sembrados.")
