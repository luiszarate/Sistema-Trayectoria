import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { PromedioMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { num, pct } from "../format";

export default function PromediosPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<PromedioMateria[]>([]);
  const [materia, setMateria] = useState("");

  useEffect(() => {
    if (!carreraActual) return;
    get<PromedioMateria[]>(`/indicadores/promedios-materia?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  const visibles = filas.filter(
    (f) => !materia || f.materia_cve.includes(materia) || f.materia_nombre.toUpperCase().includes(materia.toUpperCase())
  );

  return (
    <div>
      <h2>Calificación promedio y reprobación por materia</h2>
      <div className="filtros">
        <label>
          Materia
          <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="clave o nombre" />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Clave</th>
              <th>Materia</th>
              <th>Promedio</th>
              <th>% Reprobación</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={i}>
                <td>{f.ciclo}</td>
                <td>{f.materia_cve}</td>
                <td>{f.materia_nombre}</td>
                <td>{num(f.promedio)}</td>
                <td>{pct(f.pct_reprobacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
