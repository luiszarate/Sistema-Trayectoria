import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { EgresoCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { num } from "../format";

export default function EgresoPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<EgresoCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<EgresoCohorte[]>(`/indicadores/egreso?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  const semestres = Array.from(
    new Set(filas.flatMap((f) => Object.keys(f.distribucion)))
  ).sort((a, b) => Number(a) - Number(b));

  return (
    <div>
      <h2>Egreso — semestres para egresar</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cohorte</th>
              <th>Promedio de semestres</th>
              {semestres.map((s) => (
                <th key={s}>{s} sem.</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.cohorte}>
                <td>{f.cohorte}</td>
                <td>{num(f.promedio_semestres, 2)}</td>
                {semestres.map((s) => (
                  <td key={s}>{f.distribucion[s] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
