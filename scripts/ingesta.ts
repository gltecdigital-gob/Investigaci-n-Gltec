// Ingesta diaria: actualiza los canales activos, trae sus últimos videos,
// guarda una instantánea de métricas y recalcula el multiplicador de outlier.
//
// Uso:  npm run ingesta            (todos los canales activos)
//       npm run ingesta -- 3       (trae 3 páginas = hasta 150 videos por canal; útil la primera vez)
//
// Cuota aproximada: 2 unidades por canal y día, más 1 por cada 50 canales.

import { clasificarFormato, puntuarCanal, type VideoParaPuntuar } from "../src/lib/outlier";
import { canalesPorId, ErrorYouTube, ultimosVideosIds, videosPorId } from "../src/lib/youtube";
import { clienteAdmin, requerir } from "./entorno";

const clave = requerir("YOUTUBE_API_KEY");
const db = clienteAdmin();
const paginas = Math.max(1, Math.min(10, Number(process.argv[2] ?? 1) || 1));
const hoy = new Date().toISOString().slice(0, 10);

interface FilaCanal {
  id: string;
  youtube_id: string;
  titulo: string;
  playlist_subidas: string;
}

async function main() {
  const { data: canales, error } = await db
    .from("canales")
    .select("id, youtube_id, titulo, playlist_subidas")
    .eq("activo", true)
    .returns<FilaCanal[]>();
  if (error) throw error;
  if (!canales?.length) {
    console.log("No hay canales activos. Añade canales con `npm run canales`.");
    return;
  }

  // 1) Datos de canal (suscriptores, título), 50 por llamada.
  const frescos = await canalesPorId(
    canales.map((c) => c.youtube_id),
    clave,
  );
  const porId = new Map(frescos.map((c) => [c.youtubeId, c]));

  let ok = 0;
  let videosTotales = 0;
  const fallos: string[] = [];

  for (const canal of canales) {
    try {
      const yt = porId.get(canal.youtube_id);
      const playlist = yt?.playlistSubidas ?? canal.playlist_subidas;
      const n = await ingerirCanal(canal, playlist);
      const { error: e } = await db
        .from("canales")
        .update({
          ...(yt && {
            titulo: yt.titulo,
            handle: yt.handle,
            miniatura_url: yt.miniaturaUrl,
            suscriptores: yt.suscriptores,
            playlist_subidas: yt.playlistSubidas,
          }),
          ultima_ingesta: new Date().toISOString(),
        })
        .eq("id", canal.id);
      if (e) throw e;
      ok++;
      videosTotales += n;
      console.log(`✓ ${canal.titulo}: ${n} videos`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      fallos.push(`${canal.titulo}: ${msg}`);
      console.error(`✗ ${canal.titulo}: ${msg}`);
      // Cuota agotada o clave inválida: no tiene sentido seguir.
      if (e instanceof ErrorYouTube && (e.estado === 403 || e.estado === 400)) break;
    }
  }

  console.log(`\nCanales: ${ok}/${canales.length} · videos actualizados: ${videosTotales}`);
  if (fallos.length) {
    console.error(`Fallos (${fallos.length}):\n- ${fallos.join("\n- ")}`);
    process.exitCode = 1;
  }
}

async function ingerirCanal(canal: FilaCanal, playlist: string): Promise<number> {
  const ids = await ultimosVideosIds(playlist, clave, paginas);
  if (!ids.length) return 0;
  const frescos = await videosPorId(ids, clave);
  if (!frescos.length) return 0;

  // Historial del canal ya guardado: necesario para la línea base.
  const { data: previos, error } = await db
    .from("videos")
    .select("youtube_id, publicado_en, vistas, formato")
    .eq("canal_id", canal.id)
    .order("publicado_en", { ascending: false })
    .limit(300)
    .returns<{ youtube_id: string; publicado_en: string; vistas: number; formato: "video" | "short" }[]>();
  if (error) throw error;

  const combinados = new Map<string, VideoParaPuntuar>();
  for (const p of previos ?? []) {
    combinados.set(p.youtube_id, {
      id: p.youtube_id,
      publicadoEn: new Date(p.publicado_en),
      vistas: Number(p.vistas),
      formato: p.formato,
    });
  }
  for (const v of frescos) {
    combinados.set(v.youtubeId, {
      id: v.youtubeId,
      publicadoEn: new Date(v.publicadoEn),
      vistas: v.vistas,
      formato: clasificarFormato(v.duracionSeg),
    });
  }
  const puntos = puntuarCanal([...combinados.values()]);

  const filas = frescos.map((v) => {
    const p = puntos.get(v.youtubeId)!;
    return {
      canal_id: canal.id,
      youtube_id: v.youtubeId,
      titulo: v.titulo,
      descripcion: v.descripcion.slice(0, 5000),
      publicado_en: v.publicadoEn,
      duracion_seg: v.duracionSeg,
      formato: clasificarFormato(v.duracionSeg),
      miniatura_url: v.miniaturaUrl,
      vistas: v.vistas,
      likes: v.likes,
      comentarios: v.comentarios,
      mediana_base: p.medianaBase,
      muestra_base: p.muestraBase,
      multiplicador: p.multiplicador,
      provisional: p.provisional,
      actualizado_en: new Date().toISOString(),
    };
  });

  const { data: guardados, error: e1 } = await db
    .from("videos")
    .upsert(filas, { onConflict: "youtube_id" })
    .select("id, youtube_id")
    .returns<{ id: string; youtube_id: string }[]>();
  if (e1) throw e1;

  const idInterno = new Map((guardados ?? []).map((g) => [g.youtube_id, g.id]));
  const historial = frescos
    .filter((v) => idInterno.has(v.youtubeId))
    .map((v) => ({
      video_id: idInterno.get(v.youtubeId)!,
      fecha: hoy,
      vistas: v.vistas,
      likes: v.likes,
      comentarios: v.comentarios,
    }));
  const { error: e2 } = await db
    .from("videos_historial")
    .upsert(historial, { onConflict: "video_id,fecha" });
  if (e2) throw e2;

  return filas.length;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
