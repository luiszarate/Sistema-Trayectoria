import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../api/client";
import type { AlumnoListItem } from "../api/types";
import { useCarrera } from "../context/CarreraContext";

export default function AlumnosPage() {
  const { carreraActual } = useCarrera();
  const [alumnos, setAlumnos] = useState<AlumnoListItem[]>([]);
  const [cohorte, setCohorte] = useState("");
  const [situacion, setSituacion] = useState("");
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!carreraActual) return;
    setCargando(true);
    const params = new URLSearchParams({ carrera: carreraActual });
    if (cohorte) params.set("cohorte", cohorte);
    if (situacion) params.set("situacion", situacion);
    if (buscar) params.set("buscar", buscar);
    get<AlumnoListItem[]>(`/alumnos?${params.toString()}`)
      .then(setAlumnos)
      .finally(() => setCargando(false));
  }, [carreraActual, cohorte, situacion, buscar]);

  if (!carreraActual) return <p>Selecciona o importa una carrera.</p>;

  return (
    <div>
      <h2>Alumnos</h2>
      <div className="filtros">
        <label>
          Cohorte
          <input value={cohorte} onChange={(e) => setCohorte(e.target.value)} placeholder="p. ej. 2019" />
        </label>
        <label>
          Situación
          <select value={situacion} onChange={(e) => setSituacion(e.target.value)}>
            <option value="">Todas</option>
            <option value="INSCRITO">Inscrito</option>
            <option value="NO INSCRITO">No inscrito</option>
            <option value="PASANTE">Pasante</option>
            <option value="TITULADO">Titulado</option>
            <option value="BAJA TEMPORAL">Baja temporal</option>
            <option value="BAJA DEFINITIVA">Baja definitiva</option>
            <option value="BAJA ACADÉMICA">Baja académica</option>
          </select>
        </label>
        <label>
          Buscar
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="nombre o clave" />
        </label>
      </div>

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Nombre</th>
                <th>Sexo</th>
                <th>Cohorte</th>
                <th>Situación</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.cve_uaslp}>
                  <td>
                    <Link to={`/alumnos/${a.cve_uaslp}`}>{a.cve_uaslp}</Link>
                  </td>
                  <td>{a.nombre}</td>
                  <td>{a.sexo}</td>
                  <td>{a.cohorte}</td>
                  <td>{a.situacion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
