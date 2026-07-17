from __future__ import annotations

from pydantic import BaseModel, Field


class TablaExportRequest(BaseModel):
    """Vista de tabla actual del frontend, ya filtrada y ordenada, para exportar
    a un .xlsx de una sola hoja."""

    nombre_hoja: str = Field(default="Datos", max_length=120)
    nombre_archivo: str = Field(default="tabla", max_length=120)
    columnas: list[str] = Field(min_length=1)
    filas: list[list[str | int | float | None]] = Field(default_factory=list)
