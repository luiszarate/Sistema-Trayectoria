import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { get } from "../api/client";
import type { TrayectoriaOut } from "../api/types";
import { pct } from "../format";

export default function TrayectoriaPage() {
  const { cve } = useParams();
  const [data, setData] = useState<TrayectoriaOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cve) return;
    setError(null);
    get<TrayectoriaOut>(`/alumnos/${cve}/trayectoria`).catch((e) => setError(String(e))).then((d) => {
      if (d) setData(d);
    });
  }, [cve]);

  if (error) return <p className="error-list">{error}</p>;
  if (!data) return <p>Cargando…</p>;

  return (
    <div>
      <h2>{data.nombre}</h2>
      <p>
        {data.cve_uaslp} · {data.carrera} · Plan: {data.plan ?? "sin asignar"} · Cohorte {data.cohorte} · Tutor:{" "}
        {data.tutor || "—"} · Situación: <strong>{data.situacion ?? "—"}</strong>
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="valor">{data.semestres_cursados}</div>
          <div className="etiqueta">Semestres con actividad</div>
        </div>
        <div className="kpi-card">
          <div className="valor">
            {data.creditos_acreditados}/{data.creditos_plan || "—"}
          </div>
          <div className="etiqueta">Créditos acreditados</div>
        </div>
        <div className="kpi-card">
          <div className="valor">{pct(data.porcentaje_avance)}</div>
          <div className="etiqueta">Avance del plan</div>
          <div className="progress-bar">
            <div style={{ width: `${Math.min(data.porcentaje_avance * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {data.avance_por_materia.length > 0 && (
        <>
          <h3>Avance por materia (plan de estudios)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nivel</th>
                  <th>Clave</th>
                  <th>Materia</th>
                  <th>Créditos</th>
                  <th>Carácter</th>
                  <th>Acreditada</th>
                </tr>
              </thead>
              <tbody>
                {data.avance_por_materia.map((m) => (
                  <tr key={m.materia_cve}>
                    <td>{m.nivel ?? "—"}</td>
                    <td>{m.materia_cve}</td>
                    <td>{m.materia_nombre}</td>
                    <td>{m.creditos ?? "—"}</td>
                    <td>{m.caracter}</td>
                    <td className={m.acreditada ? "acredita-si" : "acredita-no"}>
                      {m.acreditada ? "Sí" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>Kardex</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Clave</th>
              <th>Materia</th>
              <th>Tipo examen</th>
              <th>Calificación</th>
              <th>Resultado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.kardex.map((k, i) => (
              <tr key={i}>
                <td>{k.ciclo}</td>
                <td>{k.materia_cve}</td>
                <td>{k.materia_nombre}</td>
                <td>{k.tipo_examen ?? "—"}</td>
                <td>{k.calificacion_numerica ?? k.codigo_calificacion ?? "—"}</td>
                <td>
                  <span className={`badge ${k.resultado}`}>{k.resultado}</span>
                </td>
                <td>{k.fecha_cal ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
