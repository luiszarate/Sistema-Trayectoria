from datetime import date

from pydantic import BaseModel, ConfigDict


class AlumnoListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cve_uaslp: str
    nombre: str
    sexo: str
    carrera: str
    cohorte: int
    situacion: str | None = None


class KardexItem(BaseModel):
    materia_cve: str
    materia_nombre: str
    ciclo: str
    tipo_examen: str | None = None
    calificacion_numerica: int | None = None
    codigo_calificacion: str | None = None
    creditos: int | None = None
    fecha_cal: date | None = None
    resultado: str  # aprobado | reprobado | neutro


class AvanceMateria(BaseModel):
    materia_cve: str
    materia_nombre: str
    nivel: int | None = None
    creditos: int | None = None
    caracter: str
    acreditada: bool


class TrayectoriaOut(BaseModel):
    cve_uaslp: str
    nombre: str
    carrera: str
    plan: str | None = None
    cohorte: int
    situacion: str | None = None
    tutor: str
    creditos_plan: int
    creditos_acreditados: int
    porcentaje_avance: float
    semestres_cursados: int
    kardex: list[KardexItem]
    avance_por_materia: list[AvanceMateria]
