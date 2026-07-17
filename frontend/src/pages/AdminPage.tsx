import { useEffect, useState } from "react";
import { get, put } from "../api/client";
import type { CodigoCalificacion, PlanEstudios, PlanMateria, SituacionAcademica, TipoExamen } from "../api/types";
import { useCarrera } from "../context/CarreraContext";

function PlanesMaterias() {
  const { carreraActual } = useCarrera();
  const [planes, setPlanes] = useState<PlanEstudios[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [materias, setMaterias] = useState<PlanMateria[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ nivel: string; creditos: string; caracter: string }>({
    nivel: "",
    creditos: "",
    caracter: "obligatoria",
  });

  useEffect(() => {
    if (!carreraActual) return;
    get<PlanEstudios[]>(`/carreras/${carreraActual}/planes`).then((data) => {
      setPlanes(data);
      setPlanId(data[0]?.id ?? null);
    });
  }, [carreraActual]);

  useEffect(() => {
    if (!planId) {
      setMaterias([]);
      return;
    }
    get<PlanMateria[]>(`/planes/${planId}/materias`).then(setMaterias);
  }, [planId]);

  function iniciarEdicion(pm: PlanMateria) {
    setEditId(pm.id);
    setEdit({ nivel: pm.nivel?.toString() ?? "", creditos: pm.creditos?.toString() ?? "", caracter: pm.caracter });
  }

  async function guardar(pm: PlanMateria) {
    const actualizado = await put<PlanMateria>(`/planes/materias/${pm.id}`, {
      nivel: edit.nivel ? Number(edit.nivel) : null,
      creditos: edit.creditos ? Number(edit.creditos) : null,
      caracter: edit.caracter,
    });
    setMaterias((prev) => prev.map((m) => (m.id === pm.id ? actualizado : m)));
    setEditId(null);
  }

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h3>Planes de estudio y materias</h3>
      <div className="filtros">
        <label>
          Plan
          <select value={planId ?? ""} onChange={(e) => setPlanId(Number(e.target.value))}>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Materia</th>
              <th>Nivel</th>
              <th>Créditos</th>
              <th>Carácter</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {materias.map((pm) => (
              <tr key={pm.id}>
                <td>{pm.materia_cve}</td>
                <td>{pm.materia_nombre}</td>
                {editId === pm.id ? (
                  <>
                    <td>
                      <input value={edit.nivel} onChange={(e) => setEdit({ ...edit, nivel: e.target.value })} style={{ width: "3rem" }} />
                    </td>
                    <td>
                      <input value={edit.creditos} onChange={(e) => setEdit({ ...edit, creditos: e.target.value })} style={{ width: "4rem" }} />
                    </td>
                    <td>
                      <select value={edit.caracter} onChange={(e) => setEdit({ ...edit, caracter: e.target.value })}>
                        <option value="obligatoria">obligatoria</option>
                        <option value="optativa-extractiva">optativa-extractiva</option>
                        <option value="optativa-transformacion">optativa-transformacion</option>
                        <option value="optativa-otros">optativa-otros</option>
                      </select>
                    </td>
                    <td>
                      <button onClick={() => guardar(pm)}>Guardar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{pm.nivel ?? "—"}</td>
                    <td>{pm.creditos ?? "—"}</td>
                    <td>{pm.caracter}</td>
                    <td>
                      <button className="secundario" onClick={() => iniciarEdicion(pm)}>
                        Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogoTiposExamen() {
  const [items, setItems] = useState<TipoExamen[]>([]);

  useEffect(() => {
    get<TipoExamen[]>("/catalogos/tipos-examen").then(setItems);
  }, []);

  async function toggleOrdinario(item: TipoExamen) {
    const actualizado = await put<TipoExamen>(`/catalogos/tipos-examen/${item.id}`, {
      nombre: item.nombre,
      es_ordinario: !item.es_ordinario,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? actualizado : i)));
  }

  return (
    <div>
      <h3>Catálogo: tipos de examen</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>¿Cuenta como ordinario?</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.clave}</td>
                <td>{i.nombre}</td>
                <td>
                  <input type="checkbox" checked={i.es_ordinario} onChange={() => toggleOrdinario(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogoSituaciones() {
  const [items, setItems] = useState<SituacionAcademica[]>([]);

  useEffect(() => {
    get<SituacionAcademica[]>("/catalogos/situaciones").then(setItems);
  }, []);

  async function toggle(item: SituacionAcademica, campo: "es_activo" | "es_desercion" | "es_egreso") {
    const actualizado = await put<SituacionAcademica>(`/catalogos/situaciones/${item.id}`, {
      nombre: item.nombre,
      es_activo: campo === "es_activo" ? !item.es_activo : item.es_activo,
      es_desercion: campo === "es_desercion" ? !item.es_desercion : item.es_desercion,
      es_egreso: campo === "es_egreso" ? !item.es_egreso : item.es_egreso,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? actualizado : i)));
  }

  return (
    <div>
      <h3>Catálogo: situaciones académicas</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Activo</th>
              <th>Deserción</th>
              <th>Egreso</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.clave}</td>
                <td>
                  <input type="checkbox" checked={i.es_activo} onChange={() => toggle(i, "es_activo")} />
                </td>
                <td>
                  <input type="checkbox" checked={i.es_desercion} onChange={() => toggle(i, "es_desercion")} />
                </td>
                <td>
                  <input type="checkbox" checked={i.es_egreso} onChange={() => toggle(i, "es_egreso")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogoCalificaciones() {
  const [items, setItems] = useState<CodigoCalificacion[]>([]);

  useEffect(() => {
    get<CodigoCalificacion[]>("/catalogos/codigos-calificacion").then(setItems);
  }, []);

  async function cambiarResultado(item: CodigoCalificacion, resultado: string) {
    const actualizado = await put<CodigoCalificacion>(`/catalogos/codigos-calificacion/${item.id}`, {
      nombre: item.nombre,
      resultado,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? actualizado : i)));
  }

  return (
    <div>
      <h3>Catálogo: códigos de calificación no numérica</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.clave}</td>
                <td>{i.nombre}</td>
                <td>
                  <select value={i.resultado} onChange={(e) => cambiarResultado(i, e.target.value)}>
                    <option value="aprobado">aprobado</option>
                    <option value="reprobado">reprobado</option>
                    <option value="neutro">neutro</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div>
      <h2>Administración</h2>
      <PlanesMaterias />
      <CatalogoTiposExamen />
      <CatalogoSituaciones />
      <CatalogoCalificaciones />
    </div>
  );
}
