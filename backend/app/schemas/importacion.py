from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImportLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    nombre_archivo: str
    fecha: datetime
    filas_totales: int
    filas_insertadas: int
    filas_actualizadas: int
    filas_rechazadas: int
    errores: list[dict]
