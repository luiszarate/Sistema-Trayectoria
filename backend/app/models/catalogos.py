from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TipoExamen(Base):
    """Catálogo de tipos de examen del kardex (EO, ET, EE, ER, ...)."""

    __tablename__ = "tipo_examen"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    es_ordinario: Mapped[bool] = mapped_column(Boolean, default=False)


class SituacionAcademica(Base):
    """Catálogo de situaciones de una trayectoria (INSCRITO, TITULADO, BAJA...)."""

    __tablename__ = "situacion_academica"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    es_activo: Mapped[bool] = mapped_column(Boolean, default=False)
    es_desercion: Mapped[bool] = mapped_column(Boolean, default=False)
    es_egreso: Mapped[bool] = mapped_column(Boolean, default=False)


class ModalidadTitulacion(Base):
    """Catálogo de modalidades de titulación."""

    __tablename__ = "modalidad_titulacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(160))


class CodigoCalificacion(Base):
    """Catálogo de códigos no numéricos de calificación (AC, NP, NA, SA, LR, ET, ER, EE)."""

    __tablename__ = "codigo_calificacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    # resultado: "aprobado" | "reprobado" | "neutro"
    resultado: Mapped[str] = mapped_column(String(16), default="neutro")
