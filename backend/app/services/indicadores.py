"""Motor de indicadores: todas las definiciones viven aquí para que la web,
la API y el exportador a Excel produzcan siempre la misma cifra.

Las fórmulas de "retención" y "titulados/egresados con respecto a cohorte y
a retenidos" fueron verificadas cifra por cifra contra la hoja `Resumen` del
archivo `UASLP-TrayectoriaEscolar2026.xlsx` (cohorte 2015: cohorte=56,
retenidos=34, abandono=22, titulado=26, pasante=7 → coinciden exactamente
tras importar el CSV real). El hallazgo clave de esa verificación: "retenido"
en el Excel no equivale a "no dado de baja" — equivale a "situación actual
INSCRITO, PASANTE o TITULADO" (es_activo OR es_egreso). Situaciones como
NO INSCRITO o BAJA TEMPORAL, que no están marcadas como baja definitiva,
igual cuentan como "abandono" en este indicador. El resto de las métricas
(rezago por semestre, distribución de reprobadas) son aproximaciones
razonables pendientes de validar con Secretaría Académica (ver
docs/diseno-conceptual.md, sección 14).
"""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session, joinedload

from app.models import (
    Carrera,
    CicloEscolar,
    PlanMateria,
    RegistroKardex,
    Titulacion,
    Trayectoria,
)


def resultado_kardex(registro: RegistroKardex) -> str:
    """aprobado | reprobado | neutro, para una fila de kardex."""
    if registro.calificacion_numerica is not None:
        return "aprobado" if registro.calificacion_numerica >= 60 else "reprobado"
    if registro.codigo_calificacion is not None:
        return registro.codigo_calificacion.resultado
    return "neutro"


def _carrera_o_404(db: Session, carrera_clave: str) -> Carrera:
    carrera = db.query(Carrera).filter(Carrera.clave == carrera_clave.upper()).one_or_none()
    if carrera is None:
        raise ValueError(f"carrera '{carrera_clave}' no encontrada")
    return carrera


def _trayectorias_carrera(db: Session, carrera: Carrera) -> list[Trayectoria]:
    return (
        db.query(Trayectoria)
        .options(joinedload(Trayectoria.situacion), joinedload(Trayectoria.kardex))
        .filter(Trayectoria.carrera_id == carrera.id)
        .all()
    )


def resumen_cohortes(db: Session, carrera_clave: str) -> list[dict]:
    carrera = _carrera_o_404(db, carrera_clave)
    trayectorias = _trayectorias_carrera(db, carrera)

    por_cohorte: dict[int, list[Trayectoria]] = defaultdict(list)
    for t in trayectorias:
        por_cohorte[t.cohorte].append(t)

    resultado = []
    for cohorte in sorted(por_cohorte):
        grupo = por_cohorte[cohorte]
        n = len(grupo)
        titulados = sum(1 for t in grupo if t.situacion and t.situacion.clave == "TITULADO")
        pasantes = sum(1 for t in grupo if t.situacion and t.situacion.clave == "PASANTE")
        retenidos = sum(
            1 for t in grupo if t.situacion and (t.situacion.es_activo or t.situacion.es_egreso)
        )
        abandono = n - retenidos
        egresados = titulados + pasantes

        # Materias distintas con al menos una calificación reprobatoria (aproximación).
        reprobadas_0 = reprobadas_1a3 = reprobadas_4mas = 0
        for t in grupo:
            materias_reprobadas: set[int] = set()
            for k in t.kardex:
                if resultado_kardex(k) == "reprobado":
                    materias_reprobadas.add(k.materia_id)
            c = len(materias_reprobadas)
            if c == 0:
                reprobadas_0 += 1
            elif c <= 3:
                reprobadas_1a3 += 1
            else:
                reprobadas_4mas += 1

        resultado.append(
            {
                "cohorte": cohorte,
                "alumnos_cohorte": n,
                "abandono": abandono,
                "retencion": (retenidos / n) if n else None,
                "titulados": titulados,
                "pasantes": pasantes,
                "titulados_pct_cohorte": (titulados / n) if n else None,
                "titulados_pct_retenidos": (titulados / retenidos) if retenidos else None,
                "egresados": egresados,
                "egresados_pct_cohorte": (egresados / n) if n else None,
                "egresados_pct_retenidos": (egresados / retenidos) if retenidos else None,
                "reprobadas_0": reprobadas_0,
                "reprobadas_1a3": reprobadas_1a3,
                "reprobadas_4mas": reprobadas_4mas,
                "reprobadas_0_pct": (reprobadas_0 / n) if n else None,
                "reprobadas_1a3_pct": (reprobadas_1a3 / n) if n else None,
                "reprobadas_4mas_pct": (reprobadas_4mas / n) if n else None,
            }
        )
    return resultado


def retencion_matriz(db: Session, carrera_clave: str) -> dict:
    carrera = _carrera_o_404(db, carrera_clave)
    trayectorias = _trayectorias_carrera(db, carrera)
    ciclos = db.query(CicloEscolar).order_by(CicloEscolar.orden).all()
    ciclo_por_orden = {c.orden: c.nombre for c in ciclos}

    filas = []
    inscritos_por_ciclo: dict[str, int] = defaultdict(int)
    for t in trayectorias:
        ordenes_con_actividad = sorted({k.ciclo.orden for k in t.kardex})
        semestres_cursados = len(ordenes_con_actividad)
        nivel_max_acreditado = 0
        for k in t.kardex:
            if resultado_kardex(k) != "aprobado":
                continue
            pm = (
                db.query(PlanMateria)
                .filter(PlanMateria.plan_id == t.plan_id, PlanMateria.materia_id == k.materia_id)
                .one_or_none()
                if t.plan_id
                else None
            )
            if pm and pm.nivel:
                nivel_max_acreditado = max(nivel_max_acreditado, pm.nivel)
        rezago_aprox = semestres_cursados - nivel_max_acreditado if nivel_max_acreditado else None

        ciclo_flags = {}
        for orden in ordenes_con_actividad:
            nombre = ciclo_por_orden.get(orden)
            if nombre:
                ciclo_flags[nombre] = 1
                inscritos_por_ciclo[nombre] += 1

        filas.append(
            {
                "cve_uaslp": t.alumno.cve_uaslp,
                "cohorte": t.cohorte,
                "situacion": t.situacion.clave if t.situacion else None,
                "semestres_cursados": semestres_cursados,
                "rezago_aproximado": rezago_aprox,
                "ciclos": ciclo_flags,
            }
        )

    return {
        "ciclos": [c.nombre for c in ciclos],
        "inscritos_por_ciclo": dict(inscritos_por_ciclo),
        "alumnos": filas,
    }


def aprobacion_por_materia(db: Session, carrera_clave: str) -> list[dict]:
    carrera = _carrera_o_404(db, carrera_clave)
    registros = (
        db.query(RegistroKardex)
        .join(Trayectoria)
        .options(
            joinedload(RegistroKardex.materia),
            joinedload(RegistroKardex.ciclo),
            joinedload(RegistroKardex.tipo_examen),
            joinedload(RegistroKardex.codigo_calificacion),
        )
        .filter(Trayectoria.carrera_id == carrera.id)
        .all()
    )

    grupos: dict[tuple[str, str], list[RegistroKardex]] = defaultdict(list)
    for r in registros:
        grupos[(r.ciclo.nombre, r.materia.cve_materia)].append(r)

    salida = []
    for (ciclo, materia), regs in grupos.items():
        inscritos = len({r.trayectoria_id for r in regs})
        por_tipo: dict[str, int] = defaultdict(int)
        aprobados = 0
        ordinarios = [r for r in regs if r.tipo_examen and r.tipo_examen.es_ordinario]
        aprobados_ordinario = sum(1 for r in ordinarios if resultado_kardex(r) == "aprobado")
        for r in regs:
            if r.tipo_examen:
                por_tipo[r.tipo_examen.clave] += 1
            if resultado_kardex(r) == "aprobado":
                aprobados += 1

        salida.append(
            {
                "ciclo": ciclo,
                "materia_cve": materia,
                "materia_nombre": regs[0].materia.nombre,
                "inscritos": inscritos,
                "por_tipo_examen": dict(por_tipo),
                "pct_aprobados_ordinario": (aprobados_ordinario / len(ordinarios)) if ordinarios else None,
                "pct_aprobados": (aprobados / inscritos) if inscritos else None,
            }
        )
    salida.sort(key=lambda d: (d["materia_cve"], d["ciclo"]))
    return salida


def promedios_por_materia(db: Session, carrera_clave: str) -> list[dict]:
    carrera = _carrera_o_404(db, carrera_clave)
    registros = (
        db.query(RegistroKardex)
        .join(Trayectoria)
        .options(joinedload(RegistroKardex.materia), joinedload(RegistroKardex.ciclo))
        .filter(Trayectoria.carrera_id == carrera.id)
        .all()
    )

    grupos: dict[tuple[str, str], list[RegistroKardex]] = defaultdict(list)
    for r in registros:
        grupos[(r.ciclo.nombre, r.materia.cve_materia)].append(r)

    salida = []
    for (ciclo, materia), regs in grupos.items():
        numericas = [r.calificacion_numerica for r in regs if r.calificacion_numerica is not None]
        inscritos = len({r.trayectoria_id for r in regs})
        reprobados = sum(1 for r in regs if resultado_kardex(r) == "reprobado")
        salida.append(
            {
                "ciclo": ciclo,
                "materia_cve": materia,
                "materia_nombre": regs[0].materia.nombre,
                "promedio": (sum(numericas) / len(numericas)) if numericas else None,
                "pct_alumnos_con_calificacion_numerica": (len(numericas) / inscritos) if inscritos else None,
                "pct_reprobacion": (reprobados / inscritos) if inscritos else None,
            }
        )
    salida.sort(key=lambda d: (d["materia_cve"], d["ciclo"]))
    return salida


def titulacion_por_cohorte(db: Session, carrera_clave: str) -> list[dict]:
    carrera = _carrera_o_404(db, carrera_clave)
    titulaciones = (
        db.query(Titulacion)
        .join(Trayectoria)
        .options(joinedload(Titulacion.modalidad), joinedload(Titulacion.trayectoria))
        .filter(Trayectoria.carrera_id == carrera.id)
        .all()
    )

    por_cohorte: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for tit in titulaciones:
        cohorte = tit.trayectoria.cohorte
        modalidad = tit.modalidad.clave if tit.modalidad else "SIN ESPECIFICAR"
        por_cohorte[cohorte][modalidad] += 1

    salida = []
    for cohorte in sorted(por_cohorte):
        modalidades = por_cohorte[cohorte]
        salida.append({"cohorte": cohorte, "modalidades": dict(modalidades), "total": sum(modalidades.values())})
    return salida


def egreso_por_cohorte(db: Session, carrera_clave: str) -> list[dict]:
    carrera = _carrera_o_404(db, carrera_clave)
    trayectorias = (
        db.query(Trayectoria)
        .options(joinedload(Trayectoria.kardex).joinedload(RegistroKardex.ciclo))
        .filter(Trayectoria.carrera_id == carrera.id, Trayectoria.fecha_egreso.isnot(None))
        .all()
    )

    por_cohorte: dict[int, list[int]] = defaultdict(list)
    for t in trayectorias:
        semestres = len({k.ciclo.orden for k in t.kardex})
        if semestres:
            por_cohorte[t.cohorte].append(semestres)

    salida = []
    for cohorte in sorted(por_cohorte):
        valores = por_cohorte[cohorte]
        distribucion: dict[int, int] = defaultdict(int)
        for v in valores:
            distribucion[v] += 1
        salida.append(
            {
                "cohorte": cohorte,
                "promedio_semestres": sum(valores) / len(valores) if valores else None,
                "distribucion": dict(sorted(distribucion.items())),
            }
        )
    return salida
