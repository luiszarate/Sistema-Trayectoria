import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { ResumenCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";

export default function DashboardPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<ResumenCohorte[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!carreraActual) return;
    setCargando(true);
    get<ResumenCohorte[]>(`/indicadores/resumen-cohortes?carrera=${carreraActual}`)
      .then(setFilas)
      .finally(() => setCargando(false));
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona o importa una carrera para ver el dashboard.</p>;
  if (cargando) return <p>Cargando…</p>;

  const totalAlumnos = filas.reduce((a, f) => a + f.alumnos_cohorte, 0);
  const totalTitulados = filas.reduce((a, f) => a + f.titulados, 0);
  const totalPasantes = filas.reduce((a, f) => a + f.pasantes, 0);
  const totalAbandono = filas.reduce((a, f) => a + f.abandono, 0);
  const retencionPromedio = totalAlumnos ? (totalAlumnos - totalAbandono) / totalAlumnos : null;

  return (
    <div>
      <h2>Dashboard general</h2>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="valor">{totalAlumnos}</div>
          <div className="etiqueta">Alumnos (todas las cohortes)</div>
        </div>
        <div className="kpi-card">
          <div className="valor">{totalTitulados}</div>
          <div className="etiqueta">Titulados</div>
        </div>
        <div className="kpi-card">
          <div className="valor">{totalPasantes}</div>
          <div className="etiqueta">Pasantes</div>
        </div>
        <div className="kpi-card">
          <div className="valor">{pct(retencionPromedio)}</div>
          <div className="etiqueta">Retención global</div>
        </div>
        <div className="kpi-card">
          <div className="valor">{filas.length}</div>
          <div className="etiqueta">Cohortes con datos</div>
        </div>
      </div>

      <h3>Alumnos por cohorte</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cohorte</th>
              <th>Alumnos</th>
              <th>Abandono</th>
              <th>Retención</th>
              <th>Titulados</th>
              <th>Pasantes</th>
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
                <td>{f.pasantes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
