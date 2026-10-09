-- Esquema inicial: nichos, canales de YouTube, videos, historial de métricas y tableros.
-- Ejecutar una sola vez en Supabase (SQL Editor) o con `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- nichos
create table public.nichos (
  id smallint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  orden smallint not null default 0
);

insert into public.nichos (slug, nombre, orden) values
  ('desarrollo-personal', 'Desarrollo personal', 1),
  ('salud-mental', 'Salud mental', 2),
  ('negocios', 'Negocios', 3),
  ('finanzas-personales', 'Finanzas personales', 4);

-- ---------------------------------------------------------------- canales
create table public.canales (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique,            -- UC...
  handle text,                                -- @usuario
  titulo text not null,
  miniatura_url text,
  suscriptores bigint,
  playlist_subidas text not null,             -- UU...
  nicho_id smallint not null references public.nichos (id),
  activo boolean not null default true,
  ultima_ingesta timestamptz,
  creado_en timestamptz not null default now()
);

create index canales_nicho_idx on public.canales (nicho_id) where activo;

-- ---------------------------------------------------------------- videos
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canales (id) on delete cascade,
  youtube_id text not null unique,
  titulo text not null,
  descripcion text,
  publicado_en timestamptz not null,
  duracion_seg integer not null,
  formato text not null check (formato in ('video', 'short')),
  miniatura_url text,
  vistas bigint not null default 0,
  likes bigint,
  comentarios bigint,
  -- Multiplicador de outlier: vistas / mediana del canal (ver src/lib/outlier.ts)
  mediana_base numeric,
  muestra_base smallint,
  multiplicador numeric,
  provisional boolean not null default false,
  actualizado_en timestamptz not null default now()
);

create index videos_canal_fecha_idx on public.videos (canal_id, publicado_en desc);
create index videos_multiplicador_idx on public.videos (multiplicador desc nulls last);
create index videos_fecha_idx on public.videos (publicado_en desc);

-- Una fila por video y día. Sirve para estimar más adelante la curva de
-- acumulación de vistas y proyectar los videos recién publicados.
create table public.videos_historial (
  video_id uuid not null references public.videos (id) on delete cascade,
  fecha date not null,
  vistas bigint not null,
  likes bigint,
  comentarios bigint,
  primary key (video_id, fecha)
);

-- ---------------------------------------------------------------- tableros
create table public.tableros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table public.tableros_videos (
  tablero_id uuid not null references public.tableros (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  nota text,
  guardado_en timestamptz not null default now(),
  primary key (tablero_id, video_id)
);

-- ---------------------------------------------------------------- seguridad
-- Lectura: solo usuarios con sesión. Escritura del índice: solo la clave
-- secreta del servidor (la ingesta), que no pasa por estas políticas.
alter table public.nichos enable row level security;
alter table public.canales enable row level security;
alter table public.videos enable row level security;
alter table public.videos_historial enable row level security;
alter table public.tableros enable row level security;
alter table public.tableros_videos enable row level security;

create policy "lectura con sesion" on public.nichos for select to authenticated using (true);
create policy "lectura con sesion" on public.canales for select to authenticated using (true);
create policy "lectura con sesion" on public.videos for select to authenticated using (true);
create policy "lectura con sesion" on public.videos_historial for select to authenticated using (true);

create policy "tableros propios" on public.tableros for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "videos de tableros propios" on public.tableros_videos for all to authenticated
  using (exists (select 1 from public.tableros t
                 where t.id = tablero_id and t.usuario_id = (select auth.uid())))
  with check (exists (select 1 from public.tableros t
                      where t.id = tablero_id and t.usuario_id = (select auth.uid())));
