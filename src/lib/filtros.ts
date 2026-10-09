// Filtros del feed, leídos de la URL. Todo valor no reconocido cae al valor por defecto.

export const PISOS = [0, 3, 5, 10, 20] as const;
export const VENTANAS = [7, 30, 90, 365, 0] as const; // 0 = sin límite
export const FORMATOS = ["todos", "video", "short"] as const;
export const TAMANOS = {
  todos: { etiqueta: "Cualquier tamaño", min: null, max: null },
  "1k-20k": { etiqueta: "1K a 20K", min: 1_000, max: 20_000 },
  "20k-100k": { etiqueta: "20K a 100K", min: 20_000, max: 100_000 },
  "100k-1m": { etiqueta: "100K a 1M", min: 100_000, max: 1_000_000 },
  "1m+": { etiqueta: "Más de 1M", min: 1_000_000, max: null },
} as const;

export type Tamano = keyof typeof TAMANOS;

export interface Filtros {
  nicho: string; // slug o "todos"
  formato: (typeof FORMATOS)[number];
  piso: (typeof PISOS)[number];
  dias: (typeof VENTANAS)[number];
  tamano: Tamano;
}

export const POR_DEFECTO: Filtros = {
  nicho: "todos",
  formato: "video",
  piso: 3,
  dias: 90,
  tamano: "todos",
};

type Entrada = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function numero<T extends number>(v: string | undefined, validos: readonly T[], defecto: T): T {
  if (v === undefined || v.trim() === "") return defecto;
  const n = Number(v);
  return validos.includes(n as T) ? (n as T) : defecto;
}

export function leerFiltros(params: Entrada, nichosValidos: string[]): Filtros {
  const nicho = uno(params.nicho);
  const formato = uno(params.formato) as Filtros["formato"] | undefined;
  const tamano = uno(params.tamano);
  return {
    nicho: nicho && nichosValidos.includes(nicho) ? nicho : POR_DEFECTO.nicho,
    formato: formato && FORMATOS.includes(formato) ? formato : POR_DEFECTO.formato,
    piso: numero(uno(params.piso), PISOS, POR_DEFECTO.piso),
    dias: numero(uno(params.dias), VENTANAS, POR_DEFECTO.dias),
    tamano: tamano && tamano in TAMANOS ? (tamano as Tamano) : POR_DEFECTO.tamano,
  };
}

/** URL del feed con un filtro cambiado; omite los valores por defecto. */
export function urlCon(actual: Filtros, cambio: Partial<Filtros>): string {
  const siguiente = { ...actual, ...cambio };
  const qs = new URLSearchParams();
  for (const clave of Object.keys(POR_DEFECTO) as (keyof Filtros)[]) {
    if (siguiente[clave] !== POR_DEFECTO[clave]) qs.set(clave, String(siguiente[clave]));
  }
  const texto = qs.toString();
  return texto ? `/?${texto}` : "/";
}

/** Fecha ISO a partir de la cual se muestran videos; null si no hay límite. */
export function fechaDesde(dias: number, ahora: Date = new Date()): string | null {
  return dias > 0 ? new Date(ahora.getTime() - dias * 86_400_000).toISOString() : null;
}
