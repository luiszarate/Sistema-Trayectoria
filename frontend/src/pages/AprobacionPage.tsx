import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { AprobacionMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";

const columnas: Column<AprobacionMateria>[] = [
  { key: "ciclo", header: "Ciclo", value: (f) => f.ciclo, filter: "select" },
  { key: "clave", header: "Clave", value: (f) => f.materia_cve, filter: "text" },
  { key: "materia", header: "Materia", value: (f) => f.materia_nombre, filter: "select" },
  { key: "inscritos", header: "Inscritos", value: (f) => f.inscritos, align: "right" },
  {
    key: "pct_ord",
    header: "% Aprobados ordinario",
    value: (f) => f.pct_aprobados_ordinario,
    render: (f) => pct(f.pct_aprobados_ordinario),
    align: "right",
  },
  {
    key: "pct_aprob",
    header: "% Aprobados",
    value: (f) => f.pct_aprobados,
    render: (f) => pct(f.pct_aprobados),
    align: "right",
  },
];

export default function AprobacionPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<AprobacionMateria[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<AprobacionMateria[]>(`/indicadores/aprobacion?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Aprobación por materia</h2>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName="Aprobación"
        exportFileName="aprobacion"
        initialSort={{ key: "clave", dir: "asc" }}
      />
    </div>
  );
}
