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
  /** Tipo de filtro por columna. "select" = desplegable con los valores existentes. */
  filter?: "select" | "text";
  align?: "left" | "right";
  /** Ordenable al hacer clic en el encabezado (por defecto true). */
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Si se indica, muestra el botón "Exportar a Excel" (nombre de la hoja). */
  exportSheetName?: string;
  exportFileName?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function celdaTexto(valor: CeldaExport): string {
  return valor === null || valor === undefined ? "" : String(valor);
}

function comparar(a: CeldaExport, b: CeldaExport): number {
  const aVacio = a === null || a === undefined;
  const bVacio = b === null || b === undefined;
  if (aVacio && bVacio) return 0;
  if (aVacio) return 1; // los vacíos al final
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
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(initialSort ?? null);

  const columnasFiltrables = columns.filter((c) => c.filter);

  // Valores distintos para cada columna con filtro "select".
  const opcionesPorColumna = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.filter !== "select") continue;
      const set = new Set<string>();
      for (const row of rows) {
        const texto = celdaTexto(col.value(row));
        if (texto) set.add(texto);
      }
      mapa[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    }
    return mapa;
  }, [columns, rows]);

  const filtradas = useMemo(() => {
    return rows.filter((row) =>
      columns.every((col) => {
        const activo = filtros[col.key];
        if (!activo) return true;
        const texto = celdaTexto(col.value(row));
        if (col.filter === "select") return texto === activo;
        return texto.toLowerCase().includes(activo.toLowerCase());
      })
    );
  }, [rows, columns, filtros]);

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
      return null; // tercer clic: sin orden
    });
  }

  function indicador(col: Column<T>): string {
    if (!sort || sort.key !== col.key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  async function exportar() {
    if (!exportSheetName) return;
    await exportTablaExcel({
      nombre_hoja: exportSheetName,
      nombre_archivo: exportFileName ?? exportSheetName,
      columnas: columns.map((c) => c.header),
      filas: ordenadas.map((row) => columns.map((c) => c.value(row))),
    });
  }

  return (
    <div>
      {(columnasFiltrables.length > 0 || exportSheetName) && (
        <div className="filtros">
          {columnasFiltrables.map((col) => (
            <label key={col.key}>
              {col.header}
              {col.filter === "select" ? (
                <select
                  value={filtros[col.key] ?? ""}
                  onChange={(e) => setFiltros((f) => ({ ...f, [col.key]: e.target.value }))}
                >
                  <option value="">(todas)</option>
                  {(opcionesPorColumna[col.key] ?? []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={filtros[col.key] ?? ""}
                  onChange={(e) => setFiltros((f) => ({ ...f, [col.key]: e.target.value }))}
                  placeholder="filtrar…"
                />
              )}
            </label>
          ))}
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
    </div>
  );
}
