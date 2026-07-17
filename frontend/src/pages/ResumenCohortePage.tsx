import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { ResumenCohorte } from "../api/types";
import { useCarrera } from "../context/CarreraContext";
import { pct } from "../format";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";

const columnas: Column<ResumenCohorte>[] = [
  { key: "cohorte", header: "Cohorte", value: (f) => f.cohorte, filter: "select" },
  { key: "alumnos", header: "Alumnos", value: (f) => f.alumnos_cohorte, align: "right" },
  { key: "abandono", header: "Abandono", value: (f) => f.abandono, align: "right" },
  { key: "retencion", header: "Retención", value: (f) => f.retencion, render: (f) => pct(f.retencion), align: "right" },
  { key: "titulados", header: "Titulados", value: (f) => f.titulados, align: "right" },
  {
    key: "tit_cohorte",
    header: "Tit. % cohorte",
    value: (f) => f.titulados_pct_cohorte,
    render: (f) => pct(f.titulados_pct_cohorte),
    align: "right",
  },
  {
    key: "tit_ret",
    header: "Tit. % retenidos",
    value: (f) => f.titulados_pct_retenidos,
    render: (f) => pct(f.titulados_pct_retenidos),
    align: "right",
  },
  { key: "pasantes", header: "Pasantes", value: (f) => f.pasantes, align: "right" },
  { key: "egresados", header: "Egresados", value: (f) => f.egresados, align: "right" },
  {
    key: "egr_cohorte",
    header: "Egr. % cohorte",
    value: (f) => f.egresados_pct_cohorte,
    render: (f) => pct(f.egresados_pct_cohorte),
    align: "right",
  },
  {
    key: "egr_ret",
    header: "Egr. % retenidos",
    value: (f) => f.egresados_pct_retenidos,
    render: (f) => pct(f.egresados_pct_retenidos),
    align: "right",
  },
  {
    key: "reprob_0",
    header: "Reprob. 0",
    value: (f) => f.reprobadas_0,
    render: (f) => `${f.reprobadas_0} (${pct(f.reprobadas_0_pct)})`,
    align: "right",
  },
  {
    key: "reprob_1a3",
    header: "Reprob. 1-3",
    value: (f) => f.reprobadas_1a3,
    render: (f) => `${f.reprobadas_1a3} (${pct(f.reprobadas_1a3_pct)})`,
    align: "right",
  },
  {
    key: "reprob_4mas",
    header: "Reprob. 4+",
    value: (f) => f.reprobadas_4mas,
    render: (f) => `${f.reprobadas_4mas} (${pct(f.reprobadas_4mas_pct)})`,
    align: "right",
  },
];

export default function ResumenCohortePage() {
  const { carreraActual } = useCarrera();
  const [filas, setFilas] = useState<ResumenCohorte[]>([]);

  useEffect(() => {
    if (!carreraActual) return;
    get<ResumenCohorte[]>(`/indicadores/resumen-cohortes?carrera=${carreraActual}`).then(setFilas);
  }, [carreraActual]);

  if (!carreraActual) return <p>Selecciona una carrera.</p>;

  return (
    <div>
      <h2>Resumen por cohorte</h2>
      <DataTable
        columns={columnas}
        rows={filas}
        exportSheetName="Resumen"
        exportFileName="resumen-cohorte"
        initialSort={{ key: "cohorte", dir: "asc" }}
      />
    </div>
  );
}
