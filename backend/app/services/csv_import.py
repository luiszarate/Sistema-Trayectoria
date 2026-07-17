"""Importación de CSV (kardex, alumnos, plan de estudios) con validación y upsert idempotente.

Los tres importadores comparten el mismo patrón: leer el CSV como texto puro
(sin inferencia de tipos, para no perder ceros a la izquierda en claves),
validar fila por fila, y hacer upsert por clave natural. Las filas inválidas
se registran en la bitácora (ImportLog.errores) y no interrumpen el resto.
"""

from __future__ import annotations

import io
from datetime import date, datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.models import (
    Alumno,
    Carrera,
    CicloEscolar,
    CodigoCalificacion,
    Materia,
    ModalidadTitulacion,
    PlanEstudios,
    PlanMateria,
    RegistroKardex,
    SituacionAcademica,
    TipoExamen,
    Titulacion,
    Trayectoria,
)
from app.models.operacion import ImportLog


def _read_csv(contents: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(contents), dtype=str, keep_default_na=False)


def _parse_date(value: str) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_int(value: str) -> int | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def get_or_create_carrera(db: Session, clave: str, nombre: str | None = None) -> Carrera:
    clave = clave.strip().upper()
    carrera = db.query(Carrera).filter(Carrera.clave == clave).one_or_none()
    if carrera is None:
        carrera = Carrera(clave=clave, nombre=(nombre or clave).strip())
        db.add(carrera)
        db.flush()
    return carrera


def _get_or_create_materia(db: Session, cve_materia: str, nombre: str = "") -> Materia:
    materia = db.query(Materia).filter(Materia.cve_materia == cve_materia).one_or_none()
    if materia is None:
        materia = Materia(cve_materia=cve_materia, nombre=nombre)
        db.add(materia)
        db.flush()
    elif nombre and not materia.nombre:
        materia.nombre = nombre
    return materia


def _get_or_create_ciclo(db: Session, nombre: str) -> CicloEscolar | None:
    nombre = nombre.strip()
    if "/" not in nombre:
        return None
    rango, periodo = nombre.rsplit("/", 1)
    periodo = periodo.strip().upper()
    if periodo not in ("I", "II"):
        return None
    try:
        anio_inicio = int(rango.split("-")[0])
    except (ValueError, IndexError):
        return None
    ciclo = db.query(CicloEscolar).filter(CicloEscolar.nombre == nombre).one_or_none()
    if ciclo is None:
        orden = anio_inicio * 2 + (0 if periodo == "I" else 1)
        ciclo = CicloEscolar(nombre=nombre, anio_inicio=anio_inicio, periodo=periodo, orden=orden)
        db.add(ciclo)
        db.flush()
    return ciclo


def import_plan_estudios(db: Session, contents: bytes, filename: str) -> ImportLog:
    df = _read_csv(contents)
    log = ImportLog(tipo="plan", nombre_archivo=filename, filas_totales=len(df))
    errores: list[dict] = []
    insertadas = actualizadas = 0

    for idx, row in df.iterrows():
        try:
            carrera_clave = (row.get("carrera") or "").strip()
            plan_nombre = (row.get("plan") or "").strip()
            cve_materia = (row.get("cve_materia") or "").strip()
            if not carrera_clave or not plan_nombre or not cve_materia:
                raise ValueError("carrera, plan y cve_materia son obligatorios")

            carrera = get_or_create_carrera(db, carrera_clave)
            vigente_raw = (row.get("vigente") or "true").strip().lower()
            vigente = vigente_raw not in ("false", "0", "no")
            plan = (
                db.query(PlanEstudios)
                .filter(PlanEstudios.carrera_id == carrera.id, PlanEstudios.nombre == plan_nombre)
                .one_or_none()
            )
            if plan is None:
                plan = PlanEstudios(carrera_id=carrera.id, nombre=plan_nombre, vigente=vigente)
                db.add(plan)
                db.flush()
            else:
                plan.vigente = vigente

            materia = _get_or_create_materia(db, cve_materia, (row.get("nombre_materia") or "").strip())

            nivel = _parse_int(row.get("nivel", ""))
            creditos = _parse_int(row.get("creditos", ""))
            caracter = (row.get("caracter") or "obligatoria").strip() or "obligatoria"

            plan_materia = (
                db.query(PlanMateria)
                .filter(PlanMateria.plan_id == plan.id, PlanMateria.materia_id == materia.id)
                .one_or_none()
            )
            if plan_materia is None:
                db.add(
                    PlanMateria(
                        plan_id=plan.id,
                        materia_id=materia.id,
                        nivel=nivel,
                        creditos=creditos,
                        caracter=caracter,
                    )
                )
                insertadas += 1
            else:
                plan_materia.nivel = nivel
                plan_materia.creditos = creditos
                plan_materia.caracter = caracter
                actualizadas += 1
        except Exception as exc:  # noqa: BLE001 - se registra y se continúa
            errores.append({"fila": int(idx) + 2, "error": str(exc)})

    log.filas_insertadas = insertadas
    log.filas_actualizadas = actualizadas
    log.filas_rechazadas = len(errores)
    log.errores = errores
    db.add(log)
    db.commit()
    return log


def import_alumnos(db: Session, contents: bytes, filename: str, carrera_clave: str) -> ImportLog:
    df = _read_csv(contents)
    log = ImportLog(tipo="alumnos", nombre_archivo=filename, filas_totales=len(df))
    errores: list[dict] = []
    insertadas = actualizadas = 0

    carrera = get_or_create_carrera(db, carrera_clave)
    plan_por_defecto = (
        db.query(PlanEstudios)
        .filter(PlanEstudios.carrera_id == carrera.id, PlanEstudios.vigente.is_(True))
        .order_by(PlanEstudios.id)
        .first()
    )

    for idx, row in df.iterrows():
        try:
            cve_uaslp = (row.get("cve_uaslp") or "").strip()
            if not cve_uaslp:
                raise ValueError("cve_uaslp es obligatorio")
            generacion = _parse_int(row.get("generacion", ""))
            if generacion is None:
                raise ValueError("generacion inválida")

            # La situación se valida ANTES de tocar la base: como determina
            # retención, deserción, egreso y titulación, una situación mal escrita
            # o ausente del catálogo debe rechazar la fila, no aceptarla con la
            # situación en blanco.
            situacion_clave = (row.get("situacion") or "").strip().upper()
            situacion = None
            if situacion_clave:
                situacion = (
                    db.query(SituacionAcademica)
                    .filter(SituacionAcademica.clave == situacion_clave)
                    .one_or_none()
                )
                if situacion is None:
                    raise ValueError(f"situación desconocida: '{situacion_clave}'")

            opcion_clave = (row.get("opcion_titulacion") or "").strip().upper()
            modalidad = (
                db.query(ModalidadTitulacion).filter(ModalidadTitulacion.clave == opcion_clave).one_or_none()
                if opcion_clave
                else None
            )

            alumno = db.query(Alumno).filter(Alumno.cve_uaslp == cve_uaslp).one_or_none()
            es_nuevo_alumno = alumno is None
            if alumno is None:
                alumno = Alumno(cve_uaslp=cve_uaslp)
                db.add(alumno)
            alumno.cve_larga = (row.get("cve_larga") or "").strip()
            alumno.nombre = (row.get("nombre") or "").strip()
            alumno.sexo = (row.get("sexo") or "").strip()
            db.flush()

            trayectoria = (
                db.query(Trayectoria)
                .filter(Trayectoria.alumno_id == alumno.id, Trayectoria.carrera_id == carrera.id)
                .one_or_none()
            )
            es_nueva_trayectoria = trayectoria is None
            if trayectoria is None:
                trayectoria = Trayectoria(
                    alumno_id=alumno.id, carrera_id=carrera.id, plan_id=plan_por_defecto.id if plan_por_defecto else None
                )
                db.add(trayectoria)

            trayectoria.cohorte = generacion
            trayectoria.situacion_id = situacion.id if situacion else None
            trayectoria.tutor = (row.get("tutor") or "").strip()
            trayectoria.fecha_egreso = _parse_date(row.get("fecha_egreso", ""))
            trayectoria.fecha_pasante = _parse_date(row.get("fecha_pasante", ""))
            trayectoria.fecha_titulacion = _parse_date(row.get("fecha_titulacion", ""))
            trayectoria.opcion_titulacion_id = modalidad.id if modalidad else None
            db.flush()

            titulacion = (
                db.query(Titulacion).filter(Titulacion.trayectoria_id == trayectoria.id).one_or_none()
            )
            if situacion_clave == "TITULADO":
                if titulacion is None:
                    titulacion = Titulacion(trayectoria_id=trayectoria.id)
                    db.add(titulacion)
                titulacion.modalidad_id = modalidad.id if modalidad else None
                titulacion.fecha = trayectoria.fecha_titulacion
            elif titulacion is not None:
                # El alumno dejó de estar titulado (corrección en una carga
                # posterior): se elimina el registro para que no se siga contando
                # como titulado en los indicadores y el Excel.
                db.delete(titulacion)

            if es_nuevo_alumno or es_nueva_trayectoria:
                insertadas += 1
            else:
                actualizadas += 1
        except Exception as exc:  # noqa: BLE001
            errores.append({"fila": int(idx) + 2, "error": str(exc)})

    log.filas_insertadas = insertadas
    log.filas_actualizadas = actualizadas
    log.filas_rechazadas = len(errores)
    log.errores = errores
    db.add(log)
    db.commit()
    return log


def import_kardex(db: Session, contents: bytes, filename: str, carrera_clave: str) -> ImportLog:
    df = _read_csv(contents)
    log = ImportLog(tipo="kardex", nombre_archivo=filename, filas_totales=len(df))
    errores: list[dict] = []
    insertadas = actualizadas = 0

    carrera = get_or_create_carrera(db, carrera_clave)

    for idx, row in df.iterrows():
        try:
            cve_uaslp = (row.get("cve_uaslp") or "").strip()
            cve_materia = (row.get("cve_materia") or "").strip()
            if not cve_uaslp or not cve_materia:
                raise ValueError("cve_uaslp y cve_materia son obligatorios")

            alumno = db.query(Alumno).filter(Alumno.cve_uaslp == cve_uaslp).one_or_none()
            if alumno is None:
                raise ValueError(f"alumno {cve_uaslp} no existe; importe alumnos.csv primero")

            trayectoria = (
                db.query(Trayectoria)
                .filter(Trayectoria.alumno_id == alumno.id, Trayectoria.carrera_id == carrera.id)
                .one_or_none()
            )
            if trayectoria is None:
                raise ValueError(f"el alumno {cve_uaslp} no tiene trayectoria en la carrera {carrera.clave}")

            materia = _get_or_create_materia(db, cve_materia, (row.get("materia") or "").strip())

            semestre = (row.get("semestre") or "").strip()
            ciclo = _get_or_create_ciclo(db, semestre)
            if ciclo is None:
                raise ValueError(f"semestre inválido: '{semestre}'")

            tipo_clave = (row.get("tipo_examen") or "").strip().upper()
            tipo_examen = (
                db.query(TipoExamen).filter(TipoExamen.clave == tipo_clave).one_or_none()
                if tipo_clave
                else None
            )
            if tipo_clave and tipo_examen is None:
                raise ValueError(f"tipo_examen desconocido: '{tipo_clave}'")

            calif_raw = (row.get("calificacion") or "").strip()
            calif_numerica: int | None = None
            codigo_calif: CodigoCalificacion | None = None
            if calif_raw:
                try:
                    calif_numerica = int(float(calif_raw))
                except ValueError:
                    codigo_calif = (
                        db.query(CodigoCalificacion)
                        .filter(CodigoCalificacion.clave == calif_raw.upper())
                        .one_or_none()
                    )
                    if codigo_calif is None:
                        raise ValueError(f"calificación no reconocida: '{calif_raw}'")

            creditos = _parse_int(row.get("creditos", ""))
            fecha_cal = _parse_date(row.get("fecha_cal", ""))

            existente = (
                db.query(RegistroKardex)
                .filter(
                    RegistroKardex.trayectoria_id == trayectoria.id,
                    RegistroKardex.materia_id == materia.id,
                    RegistroKardex.ciclo_id == ciclo.id,
                    RegistroKardex.tipo_examen_id == (tipo_examen.id if tipo_examen else None),
                    RegistroKardex.fecha_cal == fecha_cal,
                )
                .one_or_none()
            )
            if existente is None:
                db.add(
                    RegistroKardex(
                        trayectoria_id=trayectoria.id,
                        materia_id=materia.id,
                        ciclo_id=ciclo.id,
                        tipo_examen_id=tipo_examen.id if tipo_examen else None,
                        calificacion_numerica=calif_numerica,
                        codigo_calificacion_id=codigo_calif.id if codigo_calif else None,
                        creditos=creditos,
                        fecha_cal=fecha_cal,
                    )
                )
                insertadas += 1
            else:
                existente.calificacion_numerica = calif_numerica
                existente.codigo_calificacion_id = codigo_calif.id if codigo_calif else None
                existente.creditos = creditos
                actualizadas += 1
        except Exception as exc:  # noqa: BLE001
            errores.append({"fila": int(idx) + 2, "error": str(exc)})

    log.filas_insertadas = insertadas
    log.filas_actualizadas = actualizadas
    log.filas_rechazadas = len(errores)
    log.errores = errores
    db.add(log)
    db.commit()
    return log
