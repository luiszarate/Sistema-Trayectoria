import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { ResumenCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";

export default function ResumenCohortePage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<ResumenCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<ResumenCohorte[]>(`/indicadores/resumen-cohortes?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Resumen por cohorte</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cohorte</th>
              <th>Alumnos</th>
              <th>Abandono</th>
              <th>Retención</th>
              <th>Titulados</th>
              <th>Tit. % cohorte</th>
              <th>Tit. % retenidos</th>
              <th>Pasantes</th>
              <th>Egresados</th>
              <th>Egr. % cohorte</th>
              <th>Egr. % retenidos</th>
              <th>Reprob. 0</th>
              <th>Reprob. 1-3</th>
              <th>Reprob. 4+</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.cohorte}>
                <td>{f.cohorte}</td>
                <td>{f.alumnos_cohorte}</td>
                <td>{f.abandono}</td>
                <td>{pct(f.retencion)}</td>
                <td>{f.titulados}</td>
                <td>{pct(f.titulados_pct_cohorte)}</td>
                <td>{pct(f.titulados_pct_retenidos)}</td>
                <td>{f.pasantes}</td>
                <td>{f.egresados}</td>
                <td>{pct(f.egresados_pct_cohorte)}</td>
                <td>{pct(f.egresados_pct_retenidos)}</td>
                <td>{f.reprobadas_0} ({pct(f.reprobadas_0_pct)})</td>
                <td>{f.reprobadas_1a3} ({pct(f.reprobadas_1a3_pct)})</td>
                <td>{f.reprobadas_4mas} ({pct(f.reprobadas_4mas_pct)})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
