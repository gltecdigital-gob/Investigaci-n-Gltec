import Link from "next/link";
import {
  fechaDesde,
  FORMATOS,
  leerFiltros,
  PISOS,
  TAMANOS,
  urlCon,
  VENTANAS,
  type Filtros,
  type Tamano,
} from "@/lib/filtros";
import { duracionTexto, haceCuanto, multiplicadorTexto, numeroCorto } from "@/lib/formato";
import { clienteServidor } from "@/lib/supabase/servidor";

interface Nicho {
  id: number;
  slug: string;
  nombre: string;
}

interface FilaVideo {
  id: string;
  youtube_id: string;
  titulo: string;
  publicado_en: string;
  duracion_seg: number;
  formato: "video" | "short";
  miniatura_url: string | null;
  vistas: number;
  mediana_base: number | null;
  muestra_base: number | null;
  multiplicador: number;
  provisional: boolean;
  canales: { titulo: string; handle: string | null; suscriptores: number | null; nicho_id: number };
}

const LIMITE = 60;

const ETIQUETA_VENTANA: Record<number, string> = {
  7: "7 días",
  30: "30 días",
  90: "3 meses",
  365: "1 año",
  0: "Siempre",
};
const ETIQUETA_FORMATO = { todos: "Todos", video: "Videos", short: "Shorts" } as const;

export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await clienteServidor();
  const [{ data: nichos }, { data: sesion }] = await Promise.all([
    supabase.from("nichos").select("id, slug, nombre").order("orden").returns<Nicho[]>(),
    supabase.auth.getUser(),
  ]);
  const listaNichos = nichos ?? [];
  const filtros = leerFiltros(
    await searchParams,
    listaNichos.map((n) => n.slug),
  );

  let consulta = supabase
    .from("videos")
    .select(
      "id, youtube_id, titulo, publicado_en, duracion_seg, formato, miniatura_url, vistas, mediana_base, muestra_base, multiplicador, provisional, canales!inner(titulo, handle, suscriptores, nicho_id)",
    )
    .not("multiplicador", "is", null)
    .gte("multiplicador", filtros.piso)
    .order("multiplicador", { ascending: false })
    .limit(LIMITE);

  if (filtros.formato !== "todos") consulta = consulta.eq("formato", filtros.formato);
  const desde = fechaDesde(filtros.dias);
  if (desde) consulta = consulta.gte("publicado_en", desde);
  const nicho = listaNichos.find((n) => n.slug === filtros.nicho);
  if (nicho) consulta = consulta.eq("canales.nicho_id", nicho.id);
  const rango = TAMANOS[filtros.tamano];
  if (rango.min !== null) consulta = consulta.gte("canales.suscriptores", rango.min);
  if (rango.max !== null) consulta = consulta.lt("canales.suscriptores", rango.max);

  const { data: videos, error } = await consulta.returns<FilaVideo[]>();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 py-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Investigación Gltec</h1>
          <p className="text-sm text-muted">
            Videos de YouTube que superaron lo habitual de su canal
          </p>
        </div>
        <form action="/auth/salir" method="post" className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{sesion.user?.email}</span>
          <button className="rounded-md border border-line px-3 py-1.5 hover:bg-surface">Salir</button>
        </form>
      </header>

      <nav aria-label="Filtros" className="space-y-2 border-y border-line py-3">
        <Grupo titulo="Nicho">
          <Chip activo={filtros.nicho === "todos"} href={urlCon(filtros, { nicho: "todos" })}>
            Todos
          </Chip>
          {listaNichos.map((n) => (
            <Chip key={n.slug} activo={filtros.nicho === n.slug} href={urlCon(filtros, { nicho: n.slug })}>
              {n.nombre}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Formato">
          {FORMATOS.map((f) => (
            <Chip key={f} activo={filtros.formato === f} href={urlCon(filtros, { formato: f })}>
              {ETIQUETA_FORMATO[f]}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Mínimo">
          {PISOS.map((p) => (
            <Chip key={p} activo={filtros.piso === p} href={urlCon(filtros, { piso: p })}>
              {p === 0 ? "Cualquiera" : `${p}×`}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Publicado">
          {VENTANAS.map((d) => (
            <Chip key={d} activo={filtros.dias === d} href={urlCon(filtros, { dias: d })}>
              {ETIQUETA_VENTANA[d]}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Canal">
          {(Object.keys(TAMANOS) as Tamano[]).map((t) => (
            <Chip key={t} activo={filtros.tamano === t} href={urlCon(filtros, { tamano: t })}>
              {TAMANOS[t].etiqueta}
            </Chip>
          ))}
        </Grupo>
      </nav>

      {error ? (
        <Aviso titulo="No se pudo cargar el feed">
          {error.message}. Comprueba que la migración de <code>supabase/migrations</code> esté aplicada.
        </Aviso>
      ) : !videos?.length ? (
        <Vacio filtros={filtros} />
      ) : (
        <>
          <p className="py-3 text-sm text-muted">
            {videos.length === LIMITE ? `Los ${LIMITE} mayores` : videos.length} resultados, del mayor
            multiplicador al menor.
          </p>
          <ul className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <Tarjeta key={v.id} v={v} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Tarjeta({ v }: { v: FilaVideo }) {
  return (
    <li>
      <a
        href={`https://www.youtube.com/watch?v=${v.youtube_id}`}
        target="_blank"
        rel="noreferrer"
        className="group block"
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-line">
          {v.miniatura_url && (
            // eslint-disable-next-line @next/next/no-img-element -- miniaturas servidas por YouTube
            <img
              src={v.miniatura_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          )}
          <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-white">
            {multiplicadorTexto(v.multiplicador)}
          </span>
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
            {v.formato === "short" ? "Short" : duracionTexto(v.duracion_seg)}
          </span>
        </div>
        <h2 className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:underline">
          {v.titulo}
        </h2>
      </a>
      <p className="mt-1 text-xs text-muted">
        {v.canales.titulo} · {numeroCorto(v.canales.suscriptores)} suscriptores
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {numeroCorto(v.vistas)} vistas · lo habitual {numeroCorto(v.mediana_base)} ·{" "}
        {haceCuanto(v.publicado_en)}
      </p>
      {v.provisional && (
        <p className="mt-1 inline-block rounded bg-accent-soft px-1.5 py-0.5 text-xs">
          Reciente: el multiplicador seguirá subiendo
        </p>
      )}
    </li>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
        {titulo}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ activo, href, children }: { activo: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={
        activo
          ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
          : "rounded-full border border-line bg-surface px-3 py-1 text-xs hover:border-muted"
      }
    >
      {children}
    </Link>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-lg border border-line bg-surface p-6">
      <h2 className="font-medium">{titulo}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

function Vacio({ filtros }: { filtros: Filtros }) {
  const porDefecto = urlCon(filtros, {}) === "/";
  return (
    <Aviso titulo="Sin resultados">
      {porDefecto ? (
        <>
          Todavía no hay videos puntuados. Añade canales en <code>semillas/canales.csv</code>, ejecuta{" "}
          <code>npm run canales</code> y después <code>npm run ingesta -- 3</code>.
        </>
      ) : (
        <>
          Ningún video cumple estos filtros. Prueba a bajar el mínimo o ampliar el periodo, o{" "}
          <Link href="/" className="underline">
            vuelve a los filtros por defecto
          </Link>
          .
        </>
      )}
    </Aviso>
  );
}
