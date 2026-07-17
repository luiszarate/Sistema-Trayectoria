from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import Alumno, PlanEstudios, PlanMateria, RegistroKardex, Trayectoria
from app.services.indicadores import resultado_kardex

# Créditos requeridos para alcanzar la pasantía. El avance del alumno se mide
# contra este umbral, no contra la suma total de créditos del plan (que incluye
# optativas que el alumno no necesita cursar para egresar). Pendiente de
# parametrizar por carrera/plan con Secretaría Académica si difiere.
CREDITOS_REQUERIDOS_PASANTE = 450


def obtener_trayectoria(db: Session, cve_uaslp: str) -> Trayectoria | None:
    alumno = db.query(Alumno).filter(Alumno.cve_uaslp == cve_uaslp).one_or_none()
    if alumno is None:
        return None
    return (
        db.query(Trayectoria)
        .options(
            joinedload(Trayectoria.carrera),
            joinedload(Trayectoria.plan),
            joinedload(Trayectoria.situacion),
            joinedload(Trayectoria.kardex).joinedload(RegistroKardex.materia),
            joinedload(Trayectoria.kardex).joinedload(RegistroKardex.ciclo),
            joinedload(Trayectoria.kardex).joinedload(RegistroKardex.tipo_examen),
            joinedload(Trayectoria.kardex).joinedload(RegistroKardex.codigo_calificacion),
        )
        .filter(Trayectoria.alumno_id == alumno.id)
        .first()
    )


def construir_avance(db: Session, trayectoria: Trayectoria) -> dict:
    """Kardex ordenado, avance de créditos contra el plan y semáforo de rezago."""
    kardex_items = []
    materias_acreditadas: dict[int, bool] = {}
    ordenes = set()
    for k in sorted(trayectoria.kardex, key=lambda r: (r.ciclo.orden, r.materia.cve_materia)):
        resultado = resultado_kardex(k)
        kardex_items.append(
            {
                "materia_cve": k.materia.cve_materia,
                "materia_nombre": k.materia.nombre,
                "ciclo": k.ciclo.nombre,
                "tipo_examen": k.tipo_examen.clave if k.tipo_examen else None,
                "calificacion_numerica": k.calificacion_numerica,
                "codigo_calificacion": k.codigo_calificacion.clave if k.codigo_calificacion else None,
                "creditos": k.creditos,
                "fecha_cal": k.fecha_cal,
                "resultado": resultado,
            }
        )
        ordenes.add(k.ciclo.orden)
        if resultado == "aprobado":
            materias_acreditadas[k.materia_id] = True

    avance_por_materia = []
    creditos_plan = 0
    creditos_acreditados = 0

    # El avance se calcula contra TODAS las materias de los planes de la carrera,
    # no solo contra el plan vigente asignado. Las cohortes en estudio cursan
    # materias del plan vigente y también materias "no vigentes cursadas por las
    # cohortes en estudio" (ver docs/diseno-conceptual.md, riesgo #5), que viven
    # en un PlanEstudios aparte. Si sólo miráramos trayectoria.plan_id, esas
    # materias aprobadas no aparecerían como acreditadas.
    plan_materias = (
        db.query(PlanMateria)
        .join(PlanEstudios, PlanMateria.plan_id == PlanEstudios.id)
        .options(joinedload(PlanMateria.materia))
        .filter(PlanEstudios.carrera_id == trayectoria.carrera_id)
        .order_by(PlanEstudios.vigente.desc())  # el plan vigente gana en el dedup
        .all()
    )
    # Una misma materia puede figurar en varios planes de la carrera; se conserva
    # una sola posición (la del plan vigente por el orden anterior).
    por_materia: dict[int, PlanMateria] = {}
    for pm in plan_materias:
        por_materia.setdefault(pm.materia_id, pm)

    ordenadas = sorted(
        por_materia.values(),
        key=lambda pm: (pm.nivel if pm.nivel is not None else 999, pm.materia.cve_materia),
    )
    for pm in ordenadas:
        acreditada = materias_acreditadas.get(pm.materia_id, False)
        creditos = pm.creditos or 0
        creditos_plan += creditos
        if acreditada:
            creditos_acreditados += creditos
        avance_por_materia.append(
            {
                "materia_cve": pm.materia.cve_materia,
                "materia_nombre": pm.materia.nombre,
                "nivel": pm.nivel,
                "creditos": pm.creditos,
                "caracter": pm.caracter,
                "acreditada": acreditada,
            }
        )

    # El avance se mide contra los créditos requeridos para pasantía y se topa
    # en 100% (un alumno puede acreditar más créditos que el mínimo por cursar
    # optativas de más).
    porcentaje_avance = (
        min(creditos_acreditados / CREDITOS_REQUERIDOS_PASANTE, 1.0)
        if CREDITOS_REQUERIDOS_PASANTE
        else 0.0
    )

    return {
        "cve_uaslp": trayectoria.alumno.cve_uaslp,
        "nombre": trayectoria.alumno.nombre,
        "carrera": trayectoria.carrera.nombre,
        "plan": trayectoria.plan.nombre if trayectoria.plan else None,
        "cohorte": trayectoria.cohorte,
        "situacion": trayectoria.situacion.clave if trayectoria.situacion else None,
        "tutor": trayectoria.tutor,
        "creditos_plan": creditos_plan,
        "creditos_requeridos": CREDITOS_REQUERIDOS_PASANTE,
        "creditos_acreditados": creditos_acreditados,
        "porcentaje_avance": porcentaje_avance,
        "semestres_cursados": len(ordenes),
        "kardex": kardex_items,
        "avance_por_materia": avance_por_materia,
    }
