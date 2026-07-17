import { useEffect, useMemo, useState } from "react";
import { get, materiaQuery } from "../api/client";
import type { Agrupacion } from "../api/client";
import type { PromedioMateria } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { num, pct } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import Segmented from "../components/Segmented";
import CicloSelector from "../components/CicloSelector";

const columnasBase: Column<PromedioMateria>[] = [
  { key: "clave", header: "Clave", value: (f) => f.materia_cve, filter: "text" },
  { key: "materia", header: "Materia", value: (f) => f.materia_nombre, filter: "multiselect" },
  {
    key: "promedio",
    header: "Promedio",
    value: (f) => f.promedio,
    render: (f) => num(f.promedio),
    align: "right",
    filter: "number",
  },
  {
    key: "reprobacion",
    header: "% Reprobación",
    value: (f) => f.pct_reprobacion,
    render: (f) => pct(f.pct_reprobacion),
    align: "right",
    filter: "number",
    filterFactor: 100,
    filterSuffix: "%",
  },
];

export default function PromediosPage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<PromedioMateria[]>([]);
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
    get<PromedioMateria[]>(
      `/indicadores/promedios-materia?${materiaQuery(carreraActual, agrupar, ciclosSel)}`
    ).then(setFilas);
  }, [carreraActual, agrupar, ciclosSel]);

  const columnas = useMemo<Column<PromedioMateria>[]>(() => {
    if (agrupar === "materia") return columnasBase;
    const periodo: Column<PromedioMateria> = {
      key: "ciclo",
      header: agrupar === "anio" ? "Año" : "Ciclo",
      value: (f) => f.ciclo,
    };
    return [periodo, ...columnasBase];
  }, [agrupar]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Calificación promedio y reprobación por materia</h2>
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
        exportSheetName={agrupar === "ciclo" ? "Calificación Promedio Materia" : `Promedio Materia (${agrupar})`}
        exportFileName={`promedios-${agrupar}`}
        initialSort={{ key: "clave", dir: "asc" }}
      />
    </div>
  );
}
