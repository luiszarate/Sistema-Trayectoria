from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import Alumno, PlanMateria, RegistroKardex, Trayectoria
from app.services.indicadores import resultado_kardex


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
    if trayectoria.plan_id:
        plan_materias = (
            db.query(PlanMateria)
            .options(joinedload(PlanMateria.materia))
            .filter(PlanMateria.plan_id == trayectoria.plan_id)
            .order_by(PlanMateria.nivel, PlanMateria.materia_id)
            .all()
        )
        for pm in plan_materias:
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

    return {
        "cve_uaslp": trayectoria.alumno.cve_uaslp,
        "nombre": trayectoria.alumno.nombre,
        "carrera": trayectoria.carrera.nombre,
        "plan": trayectoria.plan.nombre if trayectoria.plan else None,
        "cohorte": trayectoria.cohorte,
        "situacion": trayectoria.situacion.clave if trayectoria.situacion else None,
        "tutor": trayectoria.tutor,
        "creditos_plan": creditos_plan,
        "creditos_acreditados": creditos_acreditados,
        "porcentaje_avance": (creditos_acreditados / creditos_plan) if creditos_plan else 0.0,
        "semestres_cursados": len(ordenes),
        "kardex": kardex_items,
        "avance_por_materia": avance_por_materia,
    }
