import { useState } from "react";
import { uploadFile } from "../api/client";
import type { ImportLog } from "../api/types";
import { useCarrera } from "../context/CarreraContext";

function ResultadoImportacion({ log }: { log: ImportLog }) {
  return (
    <div>
      <p>
        Total: {log.filas_totales} · Insertadas: {log.filas_insertadas} · Actualizadas: {log.filas_actualizadas} ·{" "}
        Rechazadas: {log.filas_rechazadas}
      </p>
      {log.errores.length > 0 && (
        <ul className="error-list">
          {log.errores.slice(0, 30).map((e, i) => (
            <li key={i}>
              Fila {e.fila}: {e.error}
            </li>
          ))}
          {log.errores.length > 30 && <li>… y {log.errores.length - 30} más (ver Bitácora)</li>}
        </ul>
      )}
    </div>
  );
}

export default function ImportarPage() {
  const { recargarCarreras } = useCarrera();
  const [carreraClave, setCarreraClave] = useState("");
  const [resultadoPlan, setResultadoPlan] = useState<ImportLog | null>(null);
  const [resultadoAlumnos, setResultadoAlumnos] = useState<ImportLog | null>(null);
  const [resultadoKardex, setResultadoKardex] = useState<ImportLog | null>(null);
  const [cargando, setCargando] = useState("");

  async function subirPlan(file: File) {
    setCargando("plan");
    try {
      const log = await uploadFile<ImportLog>("/importaciones/plan-estudios", file);
      setResultadoPlan(log);
      recargarCarreras();
    } finally {
      setCargando("");
    }
  }

  async function subirAlumnos(file: File) {
    if (!carreraClave) {
      alert("Indica la clave de la carrera primero");
      return;
    }
    setCargando("alumnos");
    try {
      const log = await uploadFile<ImportLog>("/importaciones/alumnos", file, { carrera_clave: carreraClave });
      setResultadoAlumnos(log);
      recargarCarreras();
    } finally {
      setCargando("");
    }
  }

  async function subirKardex(file: File) {
    if (!carreraClave) {
      alert("Indica la clave de la carrera primero");
      return;
    }
    setCargando("kardex");
    try {
      const log = await uploadFile<ImportLog>("/importaciones/kardex", file, { carrera_clave: carreraClave });
      setResultadoKardex(log);
    } finally {
      setCargando("");
    }
  }

  return (
    <div>
      <h2>Importar CSV</h2>
      <p>
        Orden recomendado: 1) plan de estudios, 2) alumnos, 3) kardex. El kardex requiere que el alumno ya
        tenga una trayectoria creada en la carrera (paso 2).
      </p>

      <div className="import-box">
        <h3>1. Plan de estudios</h3>
        <label>
          Columnas: carrera, plan, cve_materia, nombre_materia, nivel, creditos, caracter
          <input type="file" accept=".csv" onChange={(e) => e.target.files && subirPlan(e.target.files[0])} />
        </label>
        {cargando === "plan" && <p>Subiendo…</p>}
        {resultadoPlan && <ResultadoImportacion log={resultadoPlan} />}
      </div>

      <div className="import-box">
        <h3>Clave de carrera para alumnos y kardex</h3>
        <label>
          Clave (p. ej. INGENIERIA)
          <input value={carreraClave} onChange={(e) => setCarreraClave(e.target.value)} />
        </label>
      </div>

      <div className="import-box">
        <h3>2. Alumnos</h3>
        <label>
          Columnas: cve_uaslp, cve_larga, nombre, sexo, generacion, tutor, fecha_egreso, fecha_pasante,
          situacion, fecha_titulacion, opcion_titulacion
          <input type="file" accept=".csv" onChange={(e) => e.target.files && subirAlumnos(e.target.files[0])} />
        </label>
        {cargando === "alumnos" && <p>Subiendo…</p>}
        {resultadoAlumnos && <ResultadoImportacion log={resultadoAlumnos} />}
      </div>

      <div className="import-box">
        <h3>3. Kardex</h3>
        <label>
          Columnas: cve_uaslp, creditos, cve_materia, materia, calificacion, fecha_cal, tipo_examen, semestre
          <input type="file" accept=".csv" onChange={(e) => e.target.files && subirKardex(e.target.files[0])} />
        </label>
        {cargando === "kardex" && <p>Subiendo… (puede tardar con archivos grandes)</p>}
        {resultadoKardex && <ResultadoImportacion log={resultadoKardex} />}
      </div>
    </div>
  );
}
