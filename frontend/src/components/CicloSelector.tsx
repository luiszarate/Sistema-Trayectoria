import { useState } from "react";
import OpcionesBuscables from "./OpcionesBuscables";

interface CicloSelectorProps {
  /** Ciclos disponibles, en orden cronológico (más antiguo primero). */
  ciclos: string[];
  /** Ciclos seleccionados; vacío = todos. */
  seleccionados: string[];
  onChange: (ciclos: string[]) => void;
}

/** Selector de ciclos escolares: "Todos", "Últimos N" o selección manual.
 * El recorte se aplica en el backend, así que también afecta a las vistas
 * agregadas por año o por materia. */
export default function CicloSelector({ ciclos, seleccionados, onChange }: CicloSelectorProps) {
  const [n, setN] = useState(5);
  const seleccion = new Set(seleccionados);

  // Se muestran del más reciente al más antiguo.
  const enOrden = [...ciclos].reverse();

  function toggle(ciclo: string) {
    const nueva = new Set(seleccion);
    if (nueva.has(ciclo)) nueva.delete(ciclo);
    else nueva.add(ciclo);
    onChange(ciclos.filter((c) => nueva.has(c)));
  }

  function ultimosN() {
    onChange(ciclos.slice(-Math.max(1, n)));
  }

  const resumen =
    seleccionados.length === 0 ? "Todos los ciclos" : `${seleccionados.length} ciclo(s)`;

  return (
    <div className="filtro">
      <span className="filtro-cap">Ciclos</span>
      <details className="multi">
        <summary>{resumen}</summary>
        <div className="multi-panel">
          <div className="ciclo-acciones">
            <button type="button" className="secundario" onClick={() => onChange([])}>
              Todos
            </button>
            <span className="ciclo-ultimos">
              Últimos
              <input
                type="number"
                min={1}
                max={ciclos.length || 1}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              />
              <button type="button" className="secundario" onClick={ultimosN}>
                Aplicar
              </button>
            </span>
          </div>
          <OpcionesBuscables
            opciones={enOrden}
            seleccion={seleccion}
            onToggle={toggle}
            placeholder="Buscar ciclo…"
          />
        </div>
      </details>
    </div>
  );
}
