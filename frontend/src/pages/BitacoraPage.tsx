import { Fragment, useEffect, useState } from "react";
import { get } from "../api/client";
import type { ImportLog } from "../api/types";

export default function BitacoraPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    get<ImportLog[]>("/importaciones").then(setLogs);
  }, []);

  return (
    <div>
      <h2>Bitácora de cargas</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Archivo</th>
              <th>Total</th>
              <th>Insertadas</th>
              <th>Actualizadas</th>
              <th>Rechazadas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <Fragment key={l.id}>
                <tr>
                  <td>{new Date(l.fecha).toLocaleString()}</td>
                  <td>{l.tipo}</td>
                  <td>{l.nombre_archivo}</td>
                  <td>{l.filas_totales}</td>
                  <td>{l.filas_insertadas}</td>
                  <td>{l.filas_actualizadas}</td>
                  <td>{l.filas_rechazadas}</td>
                  <td>
                    {l.errores.length > 0 && (
                      <button className="secundario" onClick={() => setExpandido(expandido === l.id ? null : l.id)}>
                        {expandido === l.id ? "Ocultar" : "Ver errores"}
                      </button>
                    )}
                  </td>
                </tr>
                {expandido === l.id && (
                  <tr>
                    <td colSpan={8}>
                      <ul className="error-list">
                        {l.errores.map((e, i) => (
                          <li key={i}>
                            Fila {e.fila}: {e.error}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
