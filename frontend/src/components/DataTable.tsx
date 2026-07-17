import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { exportTablaExcel } from "../api/client";
import type { CeldaExport } from "../api/client";

export interface Column<T> {
  key: string;
  header: string;
  /** Valor crudo de la celda: se usa para ordenar, filtrar y exportar. */
  value: (row: T) => CeldaExport;
  /** Presentación opcional. Si se omite, se muestra el valor crudo. */
  render?: (row: T) => ReactNode;
  /** Tipo de filtro por columna. */
  filter?: "select" | "multiselect" | "text" | "number";
  align?: "left" | "right";
  /** Ordenable al hacer clic en el encabezado (por defecto true). */
  sortable?: boolean;
  /** Para el filtro numérico: factor aplicado al valor crudo antes de comparar
   * (p. ej. 100 en columnas de porcentaje guardadas como fracción 0–1). */
  filterFactor?: number;
  /** Sufijo mostrado junto al filtro numérico (p. ej. "%"). */
  filterSuffix?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  exportSheetName?: string;
  exportFileName?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

type Filtro =
  | { t: "text" | "select"; v: string }
  | { t: "multiselect"; v: string[] }
  | { t: "number"; op: ">=" | "<="; v: string };

function celdaTexto(valor: CeldaExport): string {
  return valor === null || valor === undefined ? "" : String(valor);
}

function comparar(a: CeldaExport, b: CeldaExport): number {
  const aVacio = a === null || a === undefined;
  const bVacio = b === null || b === undefined;
  if (aVacio && bVacio) return 0;
  if (aVacio) return 1;
  if (bVacio) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true });
}

export default function DataTable<T>({
  columns,
  rows,
  exportSheetName,
  exportFileName,
  initialSort,
  emptyMessage = "Sin datos.",
}: DataTableProps<T>) {
  const [filtros, setFiltros] = useState<Record<string, Filtro>>({});
  const [sort, setSort] = useState<SortState>(initialSort ?? null);

  const columnasFiltrables = columns.filter((c) => c.filter);

  // Valores distintos para columnas con filtro select/multiselect.
  const opcionesPorColumna = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.filter !== "select" && col.filter !== "multiselect") continue;
      const set = new Set<string>();
      for (const row of rows) {
        const texto = celdaTexto(col.value(row));
        if (texto) set.add(texto);
      }
      mapa[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    }
    return mapa;
  }, [columns, rows]);

  function pasaFiltro(col: Column<T>, row: T): boolean {
    const f = filtros[col.key];
    if (!f) return true;
    const raw = col.value(row);
    switch (f.t) {
      case "text":
        return celdaTexto(raw).toLowerCase().includes(f.v.toLowerCase());
      case "select":
        return !f.v || celdaTexto(raw) === f.v;
      case "multiselect":
        return f.v.length === 0 || f.v.includes(celdaTexto(raw));
      case "number": {
        if (f.v.trim() === "") return true;
        const umbral = Number(f.v);
        if (Number.isNaN(umbral)) return true;
        if (typeof raw !== "number") return false;
        const magnitud = raw * (col.filterFactor ?? 1);
        return f.op === ">=" ? magnitud >= umbral : magnitud <= umbral;
      }
      default:
        return true;
    }
  }

  const filtradas = useMemo(
    () => rows.filter((row) => columns.every((col) => pasaFiltro(col, row))),
    [rows, columns, filtros]
  );

  const ordenadas = useMemo(() => {
    if (!sort) return filtradas;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtradas;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtradas].sort((a, b) => factor * comparar(col.value(a), col.value(b)));
  }, [filtradas, columns, sort]);

  function alternarOrden(col: Column<T>) {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
  }

  function indicador(col: Column<T>): string {
    if (!sort || sort.key !== col.key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  const hayFiltros = Object.keys(filtros).length > 0;

  async function exportar() {
    if (!exportSheetName) return;
    await exportTablaExcel({
      nombre_hoja: exportSheetName,
      nombre_archivo: exportFileName ?? exportSheetName,
      columnas: columns.map((c) => c.header),
      filas: ordenadas.map((row) => columns.map((c) => c.value(row))),
    });
  }

  function toggleMulti(key: string, opcion: string) {
    setFiltros((prev) => {
      const actual = prev[key];
      const seleccion = actual && actual.t === "multiselect" ? actual.v : [];
      const nueva = seleccion.includes(opcion)
        ? seleccion.filter((v) => v !== opcion)
        : [...seleccion, opcion];
      const copia = { ...prev };
      if (nueva.length === 0) delete copia[key];
      else copia[key] = { t: "multiselect", v: nueva };
      return copia;
    });
  }

  function setFiltroSimple(key: string, t: "text" | "select", v: string) {
    setFiltros((prev) => {
      const copia = { ...prev };
      if (!v) delete copia[key];
      else copia[key] = { t, v };
      return copia;
    });
  }

  function setFiltroNumero(key: string, parcial: Partial<{ op: ">=" | "<="; v: string }>) {
    setFiltros((prev) => {
      const actual = prev[key];
      const base = actual && actual.t === "number" ? actual : { t: "number" as const, op: ">=" as const, v: "" };
      const siguiente = { ...base, ...parcial };
      const copia = { ...prev };
      if (siguiente.v.trim() === "") delete copia[key];
      else copia[key] = siguiente;
      return copia;
    });
  }

  return (
    <div>
      {(columnasFiltrables.length > 0 || exportSheetName) && (
        <div className="filtros">
          {columnasFiltrables.map((col) => {
            const f = filtros[col.key];
            if (col.filter === "text") {
              return (
                <div className="filtro" key={col.key}>
                  <span className="filtro-cap">{col.header}</span>
                  <input
                    value={f && f.t === "text" ? f.v : ""}
                    onChange={(e) => setFiltroSimple(col.key, "text", e.target.value)}
                    placeholder="filtrar…"
                  />
                </div>
              );
            }
            if (col.filter === "select") {
              return (
                <div className="filtro" key={col.key}>
                  <span className="filtro-cap">{col.header}</span>
                  <select
                    value={f && f.t === "select" ? f.v : ""}
                    onChange={(e) => setFiltroSimple(col.key, "select", e.target.value)}
                  >
                    <option value="">(todas)</option>
                    {(opcionesPorColumna[col.key] ?? []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (col.filter === "multiselect") {
              const sel = f && f.t === "multiselect" ? f.v : [];
              return (
                <div className="filtro" key={col.key}>
                  <span className="filtro-cap">{col.header}</span>
                  <details className="multi">
                    <summary>{sel.length === 0 ? "(todas)" : `${sel.length} sel.`}</summary>
                    <div className="multi-panel">
                      {(opcionesPorColumna[col.key] ?? []).map((v) => (
                        <label key={v} className="multi-op">
                          <input
                            type="checkbox"
                            checked={sel.includes(v)}
                            onChange={() => toggleMulti(col.key, v)}
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              );
            }
            // número
            const num = f && f.t === "number" ? f : null;
            return (
              <div className="filtro" key={col.key}>
                <span className="filtro-cap">{col.header}</span>
                <div className="filtro-num">
                  <select
                    value={num?.op ?? ">="}
                    onChange={(e) => setFiltroNumero(col.key, { op: e.target.value as ">=" | "<=" })}
                  >
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                  </select>
                  <input
                    type="number"
                    className="num"
                    value={num?.v ?? ""}
                    onChange={(e) => setFiltroNumero(col.key, { v: e.target.value })}
                    placeholder="—"
                  />
                  {col.filterSuffix && <span className="filtro-sufijo">{col.filterSuffix}</span>}
                </div>
              </div>
            );
          })}
          {hayFiltros && (
            <button className="secundario" onClick={() => setFiltros({})}>
              Limpiar filtros
            </button>
          )}
          {exportSheetName && (
            <button className="secundario" onClick={exportar} disabled={ordenadas.length === 0}>
              Exportar a Excel
            </button>
          )}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => alternarOrden(col)}
                  style={{
                    cursor: col.sortable === false ? "default" : "pointer",
                    textAlign: col.align ?? "left",
                  }}
                  title={col.sortable === false ? undefined : "Clic para ordenar"}
                >
                  {col.header}
                  {indicador(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "#777" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              ordenadas.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                      {col.render ? col.render(row) : celdaTexto(col.value(row)) || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="tabla-resumen">{ordenadas.length} filas</p>
    </div>
  );
}
