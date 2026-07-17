import { useMemo, useState } from "react";

interface OpcionesBuscablesProps {
  opciones: string[];
  seleccion: Set<string>;
  onToggle: (opcion: string) => void;
  placeholder?: string;
}

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Caja de búsqueda + lista de checkboxes filtrada. Las opciones ya marcadas
 * conservan su selección aunque el texto de búsqueda las oculte. */
export default function OpcionesBuscables({
  opciones,
  seleccion,
  onToggle,
  placeholder = "Buscar…",
}: OpcionesBuscablesProps) {
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const criterio = normalizar(q.trim());
    if (!criterio) return opciones;
    return opciones.filter((o) => normalizar(o).includes(criterio));
  }, [opciones, q]);

  return (
    <>
      <input
        className="multi-buscar"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus
      />
      <div className="multi-lista">
        {filtradas.length === 0 ? (
          <div className="multi-vacio">Sin coincidencias</div>
        ) : (
          filtradas.map((o) => (
            <label key={o} className="multi-op">
              <input type="checkbox" checked={seleccion.has(o)} onChange={() => onToggle(o)} />
              {o}
            </label>
          ))
        )}
      </div>
    </>
  );
}
