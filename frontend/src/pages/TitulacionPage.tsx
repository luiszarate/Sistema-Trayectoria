import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { TitulacionCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";

export default function TitulacionPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<TitulacionCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<TitulacionCohorte[]>(`/indicadores/titulacion?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  const modalidades = Array.from(new Set(filas.flatMap((f) => Object.keys(f.modalidades)))).sort();

  return (
    <div>
      <h2>Titulación por cohorte y modalidad</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cohorte</th>
              {modalidades.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.cohorte}>
                <td>{f.cohorte}</td>
                {modalidades.map((m) => (
                  <td key={m}>{f.modalidades[m] ?? 0}</td>
                ))}
                <td>
                  <strong>{f.total}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
