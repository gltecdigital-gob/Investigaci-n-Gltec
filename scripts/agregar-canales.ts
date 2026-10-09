// Da de alta en la base de datos los canales listados en semillas/canales.csv.
// Uso:  npm run canales
//
// Formato del CSV (una fila por canal, la primera línea es la cabecera):
//   nicho,canal
//   desarrollo-personal,@usuario
//   negocios,https://www.youtube.com/@otro
//   salud-mental,UCxxxxxxxxxxxxxxxxxxxxxx
//
// Cuota: 1 unidad por canal nuevo. Los canales ya registrados se omiten.

import { readFileSync } from "node:fs";
import { canalesPorId, canalPorHandle, interpretarCanal, type CanalYT } from "../src/lib/youtube";
import { clienteAdmin, requerir } from "./entorno";

const clave = requerir("YOUTUBE_API_KEY");
const db = clienteAdmin();
const archivo = process.argv[2] ?? "semillas/canales.csv";

async function main() {
  const lineas = readFileSync(archivo, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .slice(1);

  const { data: nichos, error } = await db
    .from("nichos")
    .select("id, slug")
    .returns<{ id: number; slug: string }[]>();
  if (error) throw error;
  const nichoId = new Map((nichos ?? []).map((n) => [n.slug, n.id]));

  const { data: existentes } = await db
    .from("canales")
    .select("youtube_id, handle")
    .returns<{ youtube_id: string; handle: string | null }[]>();
  const yaIds = new Set((existentes ?? []).map((c) => c.youtube_id));
  const yaHandles = new Set((existentes ?? []).map((c) => c.handle?.toLowerCase()));

  let altas = 0;
  for (const linea of lineas) {
    const [slug, ...resto] = linea.split(",");
    const entrada = resto.join(",").trim();
    const nicho = nichoId.get(slug.trim());
    const ref = interpretarCanal(entrada);
    if (!nicho) {
      console.error(`✗ Nicho desconocido "${slug}" en: ${linea}`);
      continue;
    }
    if (!ref) {
      console.error(`✗ No reconozco el canal "${entrada}". Usa @usuario, la URL o el id UC…`);
      continue;
    }
    if (
      (ref.tipo === "id" && yaIds.has(ref.valor)) ||
      (ref.tipo === "handle" && yaHandles.has(ref.valor.toLowerCase()))
    ) {
      console.log(`· ${entrada}: ya estaba registrado`);
      continue;
    }

    let canal: CanalYT | null;
    try {
      canal =
        ref.tipo === "handle"
          ? await canalPorHandle(ref.valor, clave)
          : ((await canalesPorId([ref.valor], clave))[0] ?? null);
    } catch (e) {
      console.error(`✗ ${entrada}: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
      break;
    }
    if (!canal) {
      console.error(`✗ ${entrada}: YouTube no devuelve ningún canal con ese identificador`);
      continue;
    }
    if (yaIds.has(canal.youtubeId)) {
      console.log(`· ${entrada}: ya estaba registrado como ${canal.titulo}`);
      continue;
    }

    const { error: e } = await db.from("canales").insert({
      youtube_id: canal.youtubeId,
      handle: canal.handle,
      titulo: canal.titulo,
      miniatura_url: canal.miniaturaUrl,
      suscriptores: canal.suscriptores,
      playlist_subidas: canal.playlistSubidas,
      nicho_id: nicho,
    });
    if (e) {
      console.error(`✗ ${entrada}: ${e.message}`);
      continue;
    }
    yaIds.add(canal.youtubeId);
    altas++;
    console.log(`✓ ${canal.titulo} (${canal.suscriptores ?? "?"} suscriptores) → ${slug}`);
  }

  console.log(`\nCanales nuevos: ${altas}. Ejecuta \`npm run ingesta -- 3\` para traer sus videos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
