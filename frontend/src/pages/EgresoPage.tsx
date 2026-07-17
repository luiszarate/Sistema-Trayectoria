import { useEffect, useMemo, useState } from "react";
import { get } from "../api/client";
import type { EgresoCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { num } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";

export default function EgresoPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<EgresoCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<EgresoCohorte[]>(`/indicadores/egreso?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  const columnas = useMemo<Column<EgresoCohorte>[]>(() => {
    const semestres = Array.from(new Set(filas.flatMap((f) => Object.keys(f.distribucion)))).sort(
      (a, b) => Number(a) - Number(b)
    );
    return [
      { key: "cohorte", header: "Cohorte", value: (f) => f.cohorte, filter: "select" },
      {
        key: "promedio",
        header: "Promedio de semestres",
        value: (f) => f.promedio_semestres,
        render: (f) => num(f.promedio_semestres, 2),
        align: "right",
      },
      ...semestres.map<Column<EgresoCohorte>>((s) => ({
        key: `sem:${s}`,
        header: `${s} sem.`,
        value: (f) => f.distribucion[s] ?? 0,
        align: "right",
      })),
    ];
  }, [filas]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Egreso — semestres para egresar</h2>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName="Egreso"
        exportFileName="egreso"
        initialSort={{ key: "cohorte", dir: "asc" }}
      />
    </div>
  );
}
