from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ImportLog(Base):
    """Bitácora de cada corrida de importación de CSV."""

    __tablename__ = "import_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20))  # kardex | alumnos | plan
    nombre_archivo: Mapped[str] = mapped_column(String(255), default="")
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    filas_totales: Mapped[int] = mapped_column(Integer, default=0)
    filas_insertadas: Mapped[int] = mapped_column(Integer, default=0)
    filas_actualizadas: Mapped[int] = mapped_column(Integer, default=0)
    filas_rechazadas: Mapped[int] = mapped_column(Integer, default=0)
    errores: Mapped[list] = mapped_column(JSON, default=list)
