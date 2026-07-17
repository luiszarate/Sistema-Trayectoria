from app.models.academico import (
    Alumno,
    Carrera,
    CicloEscolar,
    Materia,
    PlanEstudios,
    PlanMateria,
    RegistroKardex,
    Titulacion,
    Trayectoria,
)
from app.models.catalogos import (
    CodigoCalificacion,
    ModalidadTitulacion,
    SituacionAcademica,
    TipoExamen,
)
from app.models.operacion import ImportLog

__all__ = [
    "Alumno",
    "Carrera",
    "CicloEscolar",
    "Materia",
    "PlanEstudios",
    "PlanMateria",
    "RegistroKardex",
    "Titulacion",
    "Trayectoria",
    "CodigoCalificacion",
    "ModalidadTitulacion",
    "SituacionAcademica",
    "TipoExamen",
    "ImportLog",
]
