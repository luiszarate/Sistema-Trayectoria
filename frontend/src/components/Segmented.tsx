interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  opciones: Opcion<T>[];
  onChange: (valor: T) => void;
  label?: string;
}

/** Control segmentado (una sola selección) para alternar entre vistas. */
export default function Segmented<T extends string>({
  value,
  opciones,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    <div className="vista-toggle">
      {label && <span className="vista-toggle-label">{label}</span>}
      <div className="segmented" role="group">
        {opciones.map((op) => (
          <button
            key={op.valor}
            type="button"
            className={op.valor === value ? "activo" : ""}
            aria-pressed={op.valor === value}
            onClick={() => onChange(op.valor)}
          >
            {op.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
