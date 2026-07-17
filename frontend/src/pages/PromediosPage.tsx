import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { PromedioMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { num, pct } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";

const columnas: Column<PromedioMateria>[] = [
  { key: "ciclo", header: "Ciclo", value: (f) => f.ciclo, filter: "select" },
  { key: "clave", header: "Clave", value: (f) => f.materia_cve, filter: "text" },
  { key: "materia", header: "Materia", value: (f) => f.materia_nombre, filter: "select" },
  {
    key: "promedio",
    header: "Promedio",
    value: (f) => f.promedio,
    render: (f) => num(f.promedio),
    align: "right",
  },
  {
    key: "reprobacion",
    header: "% Reprobación",
    value: (f) => f.pct_reprobacion,
    render: (f) => pct(f.pct_reprobacion),
    align: "right",
  },
];

export default function PromediosPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<PromedioMateria[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<PromedioMateria[]>(`/indicadores/promedios-materia?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Calificación promedio y reprobación por materia</h2>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName="Calificación Promedio Materia"
        exportFileName="promedios"
        initialSort={{ key: "clave", dir: "asc" }}
      />
    </div>
  );
}
