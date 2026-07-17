const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function uploadFile<T>(
  path: string,
  file: File,
  extraFields: Record<string, string> = {}
): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(extraFields)) {
    form.append(key, value);
  }
  form.append("file", file);
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function excelExportUrl(carrera: string): string {
  return `${BASE_URL}/exportaciones/excel?carrera=${encodeURIComponent(carrera)}`;
}

export type Agrupacion = "ciclo" | "anio" | "materia";

/** Construye la query de las vistas por materia (aprobación / promedios) con
 * el nivel de agrupación y el recorte de ciclos aplicados en el backend. */
export function materiaQuery(carrera: string, agrupar: Agrupacion, ciclos: string[]): string {
  const params = new URLSearchParams({ carrera, agrupar });
  for (const c of ciclos) params.append("ciclos", c);
  return params.toString();
}

export type CeldaExport = string | number | null;

export interface TablaExport {
  nombre_hoja: string;
  nombre_archivo: string;
  columnas: string[];
  filas: CeldaExport[][];
}

/** Envía la vista de tabla actual (ya filtrada y ordenada) al backend y dispara
 * la descarga del .xlsx resultante. */
export async function exportTablaExcel(tabla: TablaExport): Promise<void> {
  const res = await fetch(`${BASE_URL}/exportaciones/tabla`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tabla),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${tabla.nombre_archivo}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
