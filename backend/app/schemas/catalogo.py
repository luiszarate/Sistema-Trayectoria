from pydantic import BaseModel, ConfigDict


class CarreraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    nombre: str


class PlanEstudiosOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    vigente: bool


class PlanMateriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    materia_cve: str
    materia_nombre: str
    nivel: int | None
    creditos: int | None
    caracter: str


class PlanMateriaUpdate(BaseModel):
    nivel: int | None = None
    creditos: int | None = None
    caracter: str


class CicloOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    anio_inicio: int
    periodo: str
    orden: int


class TipoExamenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    nombre: str
    es_ordinario: bool


class TipoExamenUpdate(BaseModel):
    nombre: str
    es_ordinario: bool


class SituacionAcademicaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    nombre: str
    es_activo: bool
    es_desercion: bool
    es_egreso: bool


class SituacionAcademicaUpdate(BaseModel):
    nombre: str
    es_activo: bool
    es_desercion: bool
    es_egreso: bool


class CodigoCalificacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    nombre: str
    resultado: str


class CodigoCalificacionUpdate(BaseModel):
    nombre: str
    resultado: str


class ModalidadTitulacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    nombre: str
