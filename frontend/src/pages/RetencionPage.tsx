import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { RetencionMatriz } from "../api/types";
import { useCarrera } from "../context/CarreraContext";

export default function RetencionPage() {
  const { carreraActual } = useCarrera();
  const [data, setData] = useState<RetencionMatriz | null>(null);

  useEffect(() => {
    if (!carreraActual) return;
    get<RetencionMatriz>(`/indicadores/retencion?carrera=${carreraActual}`).then(setData);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;
  if (!data) return <p>Cargando…</p>;

  return (
    <div>
      <h2>Retención y rezago</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Cohorte</th>
              <th>Situación</th>
              <th>Semestres cursados</th>
              <th>Rezago aprox.</th>
              {data.ciclos.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
            <tr>
              <th colSpan={5}>Inscritos por ciclo</th>
              {data.ciclos.map((c) => (
                <th key={c}>{data.inscritos_por_ciclo[c] ?? 0}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.alumnos.map((a) => (
              <tr key={a.cve_uaslp}>
                <td>{a.cve_uaslp}</td>
                <td>{a.cohorte}</td>
                <td>{a.situacion ?? "—"}</td>
                <td>{a.semestres_cursados}</td>
                <td>{a.rezago_aproximado ?? "—"}</td>
                {data.ciclos.map((c) => (
                  <td key={c}>{a.ciclos[c] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
