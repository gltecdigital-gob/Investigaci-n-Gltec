<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Investigación Gltec: guía para agentes (Claude, Codex)

Herramienta interna para encontrar videos de YouTube en español que superaron el rendimiento
habitual de su canal ("outliers"). Lee `README.md` para el contexto y `docs/PLAN.md` para saber
qué está hecho y qué sigue.

## Reglas del proyecto

- **Idioma:** código, comentarios, nombres de tablas y columnas, commits e interfaz en español.
- **Antes de dar algo por terminado:** `npm run lint && npm run typecheck && npm test && npm run build`.
- **Lógica pura con pruebas:** todo cálculo (multiplicador, filtros, interpretación de datos) vive
  en `src/lib/` sin dependencias de red ni de base de datos, y lleva su archivo `.test.ts`.
- **Base de datos:** los cambios de esquema son archivos nuevos y numerados en
  `supabase/migrations/`. No se edita una migración ya aplicada.
- **Seguridad:** toda tabla nueva lleva RLS activado. La clave secreta de Supabase solo se usa en
  `scripts/`; nunca en `src/`. Ningún secreto entra al repositorio, que es público.
- **YouTube:** solo la API oficial con clave. No usar `search.list` (100 llamadas al día) ni
  recolectar datos por otras vías. Anota el coste de cuota de cada llamada nueva.
- **Alcance:** no añadir módulos fuera de `docs/PLAN.md` sin que lo pida el responsable del proyecto.

## Mapa

| Ruta | Contenido |
|---|---|
| `src/lib/outlier.ts` | Cálculo del multiplicador y sus parámetros |
| `src/lib/youtube.ts` | Cliente de la YouTube Data API |
| `src/lib/filtros.ts` | Filtros del feed leídos de la URL |
| `src/app/page.tsx` | Feed |
| `src/proxy.ts` | Sesión y redirección a `/login` |
| `scripts/` | Alta de canales e ingesta diaria |
| `supabase/migrations/` | Esquema de la base de datos |
