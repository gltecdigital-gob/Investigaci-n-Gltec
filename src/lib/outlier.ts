// Multiplicador de outlier: cuánto superó un video el rendimiento habitual de su canal.
//
//   multiplicador = vistas del video / mediana de vistas de los últimos videos del canal
//
// Decisiones:
// - Mediana y no media, para que un éxito aislado no infle la línea base.
// - La línea base se calcula por formato: los Shorts y los videos largos tienen
//   escalas de vistas distintas y mezclarlos distorsiona el resultado.
// - Solo entran en la línea base videos "maduros" (ya acumularon la mayor parte de
//   sus vistas) y nunca el propio video que se está puntuando.
// - Sin muestra suficiente no hay multiplicador: es preferible no mostrar nada.

export type Formato = "video" | "short";

export interface VideoParaPuntuar {
  id: string;
  publicadoEn: Date;
  vistas: number;
  formato: Formato;
}

export interface Puntuacion {
  medianaBase: number | null;
  muestraBase: number;
  multiplicador: number | null;
  /** El video es muy reciente y sus vistas siguen creciendo: el valor subirá. */
  provisional: boolean;
}

export const CONFIG_OUTLIER = {
  /** Máximo de videos recientes que forman la línea base. */
  tamanoVentana: 30,
  /** Mínimo de videos para considerar fiable la mediana. */
  muestraMinima: 8,
  /** Días desde la publicación para que un video cuente en la línea base. */
  diasMadurez: 7,
  /** Días durante los que el multiplicador de un video nuevo es provisional. */
  diasProvisional: 3,
  /** Duración máxima de un Short. La API de YouTube no los marca; es una heurística. */
  segundosShort: 180,
} as const;

const MS_DIA = 86_400_000;

export function clasificarFormato(duracionSeg: number): Formato {
  return duracionSeg > 0 && duracionSeg <= CONFIG_OUTLIER.segundosShort ? "short" : "video";
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
}

/**
 * Puntúa todos los videos de un mismo canal.
 * Devuelve un mapa id → puntuación.
 */
export function puntuarCanal(
  videos: VideoParaPuntuar[],
  ahora: Date = new Date(),
): Map<string, Puntuacion> {
  const resultado = new Map<string, Puntuacion>();
  const limiteMadurez = ahora.getTime() - CONFIG_OUTLIER.diasMadurez * MS_DIA;
  const limiteProvisional = ahora.getTime() - CONFIG_OUTLIER.diasProvisional * MS_DIA;

  for (const formato of ["video", "short"] as const) {
    const delFormato = videos.filter((v) => v.formato === formato);
    const maduros = delFormato
      .filter((v) => v.publicadoEn.getTime() <= limiteMadurez)
      .sort((a, b) => b.publicadoEn.getTime() - a.publicadoEn.getTime());

    for (const video of delFormato) {
      const base = maduros
        .filter((m) => m.id !== video.id)
        .slice(0, CONFIG_OUTLIER.tamanoVentana)
        .map((m) => m.vistas);

      const provisional = video.publicadoEn.getTime() > limiteProvisional;
      const med = base.length >= CONFIG_OUTLIER.muestraMinima ? mediana(base) : null;

      resultado.set(video.id, {
        medianaBase: med,
        muestraBase: base.length,
        multiplicador: med && med > 0 ? redondear(video.vistas / med) : null,
        provisional,
      });
    }
  }
  return resultado;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
