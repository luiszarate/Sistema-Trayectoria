import { useEffect, useMemo, useState } from "react";
import { get } from "../api/client";
import type { TitulacionCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";

export default function TitulacionPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<TitulacionCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<TitulacionCohorte[]>(`/indicadores/titulacion?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  const columnas = useMemo<Column<TitulacionCohorte>[]>(() => {
    const modalidades = Array.from(new Set(filas.flatMap((f) => Object.keys(f.modalidades)))).sort();
    return [
      { key: "cohorte", header: "Cohorte", value: (f) => f.cohorte, filter: "select" },
      ...modalidades.map<Column<TitulacionCohorte>>((m) => ({
        key: `mod:${m}`,
        header: m,
        value: (f) => f.modalidades[m] ?? 0,
        align: "right",
      })),
      {
        key: "total",
        header: "Total",
        value: (f) => f.total,
        render: (f) => <strong>{f.total}</strong>,
        align: "right",
      },
    ];
  }, [filas]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Titulación por cohorte y modalidad</h2>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName="Titulación"
        exportFileName="titulacion"
        initialSort={{ key: "cohorte", dir: "asc" }}
      />
    </div>
  );
}
