import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { AprobacionMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";

export default function AprobacionPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<AprobacionMateria[]>([]);
  const [materia, setMateria] = useState("");
  const [ciclo, setCiclo] = useState("");

  useEffect(() => {
    if (!carreraActual) return;
    get<AprobacionMateria[]>(`/indicadores/aprobacion?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  const visibles = filas.filter(
    (f) =>
      (!materia || f.materia_cve.includes(materia) || f.materia_nombre.toUpperCase().includes(materia.toUpperCase())) &&
      (!ciclo || f.ciclo.includes(ciclo))
  );

  return (
    <div>
      <h2>Aprobación por materia</h2>
      <div className="filtros">
        <label>
          Materia
          <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="clave o nombre" />
        </label>
        <label>
          Ciclo
          <input value={ciclo} onChange={(e) => setCiclo(e.target.value)} placeholder="p. ej. 2020-2021" />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Clave</th>
              <th>Materia</th>
              <th>Inscritos</th>
              <th>% Aprobados ordinario</th>
              <th>% Aprobados</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={i}>
                <td>{f.ciclo}</td>
                <td>{f.materia_cve}</td>
                <td>{f.materia_nombre}</td>
                <td>{f.inscritos}</td>
                <td>{pct(f.pct_aprobados_ordinario)}</td>
                <td>{pct(f.pct_aprobados)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
