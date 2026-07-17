from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Carrera(Base):
    __tablename__ = "carrera"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(160))

    planes: Mapped[list["PlanEstudios"]] = relationship(back_populates="carrera")


class PlanEstudios(Base):
    __tablename__ = "plan_estudios"
    __table_args__ = (UniqueConstraint("carrera_id", "nombre", name="uq_plan_carrera_nombre"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"))
    nombre: Mapped[str] = mapped_column(String(200))
    vigente: Mapped[bool] = mapped_column(default=True)

    carrera: Mapped["Carrera"] = relationship(back_populates="planes")
    materias: Mapped[list["PlanMateria"]] = relationship(back_populates="plan")


class Materia(Base):
    __tablename__ = "materia"

    id: Mapped[int] = mapped_column(primary_key=True)
    cve_materia: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), default="")


class PlanMateria(Base):
    """Posición de una materia dentro de un plan de estudios."""

    __tablename__ = "plan_materia"
    __table_args__ = (UniqueConstraint("plan_id", "materia_id", name="uq_plan_materia"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plan_estudios.id"))
    materia_id: Mapped[int] = mapped_column(ForeignKey("materia.id"))
    nivel: Mapped[int | None] = mapped_column(Integer, nullable=True)
    creditos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # caracter: obligatoria | optativa-extractiva | optativa-transformacion | optativa-otros
    caracter: Mapped[str] = mapped_column(String(32), default="obligatoria")

    plan: Mapped["PlanEstudios"] = relationship(back_populates="materias")
    materia: Mapped["Materia"] = relationship()


class Alumno(Base):
    __tablename__ = "alumno"

    id: Mapped[int] = mapped_column(primary_key=True)
    cve_uaslp: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    cve_larga: Mapped[str] = mapped_column(String(20), default="")
    nombre: Mapped[str] = mapped_column(String(200))
    sexo: Mapped[str] = mapped_column(String(20), default="")

    trayectorias: Mapped[list["Trayectoria"]] = relationship(back_populates="alumno")


class CicloEscolar(Base):
    __tablename__ = "ciclo_escolar"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # p.ej. "2010-2011/I"
    anio_inicio: Mapped[int] = mapped_column(Integer)
    periodo: Mapped[str] = mapped_column(String(4))  # "I" | "II"
    orden: Mapped[int] = mapped_column(Integer, index=True)  # para ordenar cronológicamente


class Trayectoria(Base):
    """Inscripción de un alumno a una carrera; eje del sistema."""

    __tablename__ = "trayectoria"
    __table_args__ = (UniqueConstraint("alumno_id", "carrera_id", name="uq_trayectoria_alumno_carrera"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumno.id"))
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"))
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plan_estudios.id"), nullable=True)
    cohorte: Mapped[int] = mapped_column(Integer, index=True)  # generación, p.ej. 2015
    situacion_id: Mapped[int | None] = mapped_column(ForeignKey("situacion_academica.id"), nullable=True)
    tutor: Mapped[str] = mapped_column(String(200), default="")
    fecha_egreso: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_pasante: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_titulacion: Mapped[date | None] = mapped_column(Date, nullable=True)
    opcion_titulacion_id: Mapped[int | None] = mapped_column(
        ForeignKey("modalidad_titulacion.id"), nullable=True
    )

    alumno: Mapped["Alumno"] = relationship(back_populates="trayectorias")
    carrera: Mapped["Carrera"] = relationship()
    plan: Mapped["PlanEstudios | None"] = relationship()
    situacion: Mapped["SituacionAcademica | None"] = relationship()
    kardex: Mapped[list["RegistroKardex"]] = relationship(back_populates="trayectoria")


class RegistroKardex(Base):
    """Una oportunidad de evaluación (fila del kardex)."""

    __tablename__ = "registro_kardex"

    id: Mapped[int] = mapped_column(primary_key=True)
    trayectoria_id: Mapped[int] = mapped_column(ForeignKey("trayectoria.id"), index=True)
    materia_id: Mapped[int] = mapped_column(ForeignKey("materia.id"), index=True)
    ciclo_id: Mapped[int] = mapped_column(ForeignKey("ciclo_escolar.id"), index=True)
    tipo_examen_id: Mapped[int | None] = mapped_column(ForeignKey("tipo_examen.id"), nullable=True)
    calificacion_numerica: Mapped[int | None] = mapped_column(Integer, nullable=True)
    codigo_calificacion_id: Mapped[int | None] = mapped_column(
        ForeignKey("codigo_calificacion.id"), nullable=True
    )
    creditos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fecha_cal: Mapped[date | None] = mapped_column(Date, nullable=True)

    trayectoria: Mapped["Trayectoria"] = relationship(back_populates="kardex")
    materia: Mapped["Materia"] = relationship()
    ciclo: Mapped["CicloEscolar"] = relationship()
    tipo_examen: Mapped["TipoExamen | None"] = relationship()
    codigo_calificacion: Mapped["CodigoCalificacion | None"] = relationship()


class Titulacion(Base):
    __tablename__ = "titulacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    trayectoria_id: Mapped[int] = mapped_column(ForeignKey("trayectoria.id"), unique=True)
    modalidad_id: Mapped[int | None] = mapped_column(ForeignKey("modalidad_titulacion.id"), nullable=True)
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)

    trayectoria: Mapped["Trayectoria"] = relationship()
    modalidad: Mapped["ModalidadTitulacion | None"] = relationship()
