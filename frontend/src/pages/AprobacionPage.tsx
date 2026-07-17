import { useEffect, useMemo, useState } from "react";
import { get, materiaQuery } from "../api/client";
import type { Agrupacion } from "../api/client";
import type { AprobacionMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import Segmented from "../components/Segmented";
import CicloSelector from "../components/CicloSelector";

const columnasBase: Column<AprobacionMateria>[] = [
  { key: "clave", header: "Clave", value: (f) => f.materia_cve, filter: "text" },
  { key: "materia", header: "Materia", value: (f) => f.materia_nombre, filter: "multiselect" },
  { key: "inscritos", header: "Inscritos", value: (f) => f.inscritos, align: "right", filter: "number" },
  {
    key: "pct_ord",
    header: "% Aprobados ordinario",
    value: (f) => f.pct_aprobados_ordinario,
    render: (f) => pct(f.pct_aprobados_ordinario),
    align: "right",
    filter: "number",
    filterFactor: 100,
    filterSuffix: "%",
  },
  {
    key: "pct_aprob",
    header: "% Aprobados",
    value: (f) => f.pct_aprobados,
    render: (f) => pct(f.pct_aprobados),
    align: "right",
    filter: "number",
    filterFactor: 100,
    filterSuffix: "%",
  },
];

export default function AprobacionPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<AprobacionMateria[]>([]);
  const [ciclosDisponibles, setCiclosDisponibles] = useState<string[]>([]);
  const [agrupar, setAgrupar] = useState<Agrupacion>("ciclo");
  const [ciclosSel, setCiclosSel] = useState<string[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<string[]>(`/indicadores/ciclos?carrera=${carreraActual}`).then(setCiclosDisponibles);
    setCiclosSel([]);
  }, [carreraActual]);

  useEffect(() => {
    if (!carreraActual) return;
    get<AprobacionMateria[]>(
      `/indicadores/aprobacion?${materiaQuery(carreraActual, agrupar, ciclosSel)}`
    ).then(setFilas);
  }, [carreraActual, agrupar, ciclosSel]);

  const columnas = useMemo<Column<AprobacionMateria>[]>(() => {
    if (agrupar === "materia") return columnasBase;
    const periodo: Column<AprobacionMateria> = {
      key: "ciclo",
      header: agrupar === "anio" ? "Año" : "Ciclo",
      value: (f) => f.ciclo,
    };
    return [periodo, ...columnasBase];
  }, [agrupar]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Aprobación por materia</h2>
      <div className="toolbar-vistas">
        <Segmented<Agrupacion>
          label="Agrupar:"
          value={agrupar}
          onChange={setAgrupar}
          opciones={[
            { valor: "ciclo", etiqueta: "Por ciclo" },
            { valor: "anio", etiqueta: "Por año" },
            { valor: "materia", etiqueta: "Por materia" },
          ]}
        />
        <CicloSelector ciclos={ciclosDisponibles} seleccionados={ciclosSel} onChange={setCiclosSel} />
      </div>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName={agrupar === "ciclo" ? "Aprobación" : `Aprobación (${agrupar})`}
        exportFileName={`aprobacion-${agrupar}`}
        initialSort={{ key: "clave", dir: "asc" }}
      />
    </div>
  );
}
