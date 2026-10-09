// Cliente mínimo de la YouTube Data API v3. Solo datos públicos, con clave de API.
// Coste de cuota: cada llamada de este archivo cuesta 1 unidad (cuota diaria: 10 000).
// No se usa search.list: está limitada a 100 llamadas al día.

const BASE = "https://www.googleapis.com/youtube/v3";

export interface CanalYT {
  youtubeId: string;
  handle: string | null;
  titulo: string;
  miniaturaUrl: string | null;
  suscriptores: number | null;
  playlistSubidas: string;
}

export interface VideoYT {
  youtubeId: string;
  titulo: string;
  descripcion: string;
  publicadoEn: string;
  duracionSeg: number;
  miniaturaUrl: string | null;
  vistas: number;
  likes: number | null;
  comentarios: number | null;
}

export class ErrorYouTube extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(`YouTube API ${estado}: ${mensaje}`);
  }
}

async function llamar<T>(ruta: string, params: Record<string, string>, clave: string): Promise<T> {
  const url = new URL(`${BASE}/${ruta}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", clave);
  const res = await fetch(url);
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ErrorYouTube(res.status, cuerpo?.error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

/** "PT1H2M3S" → 3723. Devuelve 0 si no se puede interpretar (p. ej. directos). */
export function duracionASegundos(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

/** Acepta "UC...", "@usuario" o una URL de canal y devuelve el identificador a consultar. */
export function interpretarCanal(entrada: string): { tipo: "id" | "handle"; valor: string } | null {
  const t = entrada.trim();
  if (!t) return null;
  const enUrl = /youtube\.com\/(channel\/(UC[\w-]{22})|(@[\w.-]+))/.exec(t);
  if (enUrl?.[2]) return { tipo: "id", valor: enUrl[2] };
  if (enUrl?.[3]) return { tipo: "handle", valor: enUrl[3] };
  if (/^UC[\w-]{22}$/.test(t)) return { tipo: "id", valor: t };
  if (/^@[\w.-]+$/.test(t)) return { tipo: "handle", valor: t };
  return null;
}

interface RespCanales {
  items?: {
    id: string;
    snippet: { title: string; customUrl?: string; thumbnails?: Record<string, { url: string }> };
    statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
}

function aCanal(i: NonNullable<RespCanales["items"]>[number]): CanalYT {
  const mini = i.snippet.thumbnails;
  return {
    youtubeId: i.id,
    handle: i.snippet.customUrl ?? null,
    titulo: i.snippet.title,
    miniaturaUrl: mini?.medium?.url ?? mini?.default?.url ?? null,
    suscriptores:
      i.statistics.hiddenSubscriberCount || i.statistics.subscriberCount === undefined
        ? null
        : Number(i.statistics.subscriberCount),
    playlistSubidas: i.contentDetails.relatedPlaylists.uploads,
  };
}

const PARTES_CANAL = "snippet,statistics,contentDetails";

export async function canalPorHandle(handle: string, clave: string): Promise<CanalYT | null> {
  const r = await llamar<RespCanales>("channels", { part: PARTES_CANAL, forHandle: handle }, clave);
  return r.items?.[0] ? aCanal(r.items[0]) : null;
}

/** Hasta 50 canales por llamada. */
export async function canalesPorId(ids: string[], clave: string): Promise<CanalYT[]> {
  const salida: CanalYT[] = [];
  for (const lote of enLotes(ids, 50)) {
    const r = await llamar<RespCanales>(
      "channels",
      { part: PARTES_CANAL, id: lote.join(","), maxResults: "50" },
      clave,
    );
    salida.push(...(r.items ?? []).map(aCanal));
  }
  return salida;
}

/** Ids de los videos más recientes de un canal (máximo 50 por página). */
export async function ultimosVideosIds(
  playlistSubidas: string,
  clave: string,
  paginas = 1,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let p = 0; p < paginas; p++) {
    const params: Record<string, string> = {
      part: "contentDetails",
      playlistId: playlistSubidas,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;
    const r = await llamar<{
      items?: { contentDetails: { videoId: string } }[];
      nextPageToken?: string;
    }>("playlistItems", params, clave);
    ids.push(...(r.items ?? []).map((i) => i.contentDetails.videoId));
    pageToken = r.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

interface RespVideos {
  items?: {
    id: string;
    snippet: {
      title: string;
      description?: string;
      publishedAt: string;
      liveBroadcastContent?: string;
      thumbnails?: Record<string, { url: string }>;
    };
    contentDetails: { duration?: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }[];
}

/** Detalle y métricas. Omite directos en curso o programados. */
export async function videosPorId(ids: string[], clave: string): Promise<VideoYT[]> {
  const salida: VideoYT[] = [];
  for (const lote of enLotes(ids, 50)) {
    const r = await llamar<RespVideos>(
      "videos",
      { part: "snippet,contentDetails,statistics", id: lote.join(","), maxResults: "50" },
      clave,
    );
    for (const i of r.items ?? []) {
      if (i.snippet.liveBroadcastContent && i.snippet.liveBroadcastContent !== "none") continue;
      const mini = i.snippet.thumbnails;
      salida.push({
        youtubeId: i.id,
        titulo: i.snippet.title,
        descripcion: i.snippet.description ?? "",
        publicadoEn: i.snippet.publishedAt,
        duracionSeg: duracionASegundos(i.contentDetails.duration),
        miniaturaUrl: mini?.high?.url ?? mini?.medium?.url ?? mini?.default?.url ?? null,
        vistas: Number(i.statistics.viewCount ?? 0),
        likes: i.statistics.likeCount === undefined ? null : Number(i.statistics.likeCount),
        comentarios:
          i.statistics.commentCount === undefined ? null : Number(i.statistics.commentCount),
      });
    }
  }
  return salida;
}

export function enLotes<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}
