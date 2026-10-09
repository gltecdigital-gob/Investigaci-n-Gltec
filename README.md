# Investigación Gltec

Herramienta interna para encontrar videos de YouTube en español que superaron el rendimiento
habitual de su canal.

Cada video recibe un **multiplicador**: sus vistas divididas entre la mediana de vistas de los
últimos 30 videos del mismo canal y formato. Un video con 10× tuvo diez veces más vistas de lo
normal para ese canal, sea grande o pequeño.

Estado y próximos pasos: [`docs/PLAN.md`](docs/PLAN.md).

## Cómo funciona

1. `semillas/canales.csv` lista los canales a seguir, por nicho.
2. `npm run canales` los da de alta en la base de datos.
3. `npm run ingesta` trae sus últimos videos, guarda las métricas del día y recalcula los
   multiplicadores. GitHub Actions lo ejecuta todos los días a las 06:00 (Ciudad de México).
4. La app web muestra el feed ordenado por multiplicador, con filtros.

Tecnología: Next.js, Supabase (base de datos y acceso) y la YouTube Data API oficial.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta `supabase/migrations/0001_inicial.sql`.
3. En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up*.
4. En **Authentication → Users**, añade con *Add user* el correo de cada persona que usará la
   herramienta. Solo esos correos podrán entrar.
5. En **Authentication → URL Configuration**, pon la dirección de la app en *Site URL* y añade
   `http://localhost:3000/auth/callback` y `https://TU-DOMINIO/auth/callback` en *Redirect URLs*.
6. Copia de **Project Settings → API** la URL, la clave *publishable* y la clave *secret*.

### 2. Clave de YouTube

1. En [Google Cloud Console](https://console.cloud.google.com), crea un proyecto.
2. Habilita **YouTube Data API v3**.
3. En **Credenciales**, crea una **clave de API** y restríngela a esa API.

### 3. En tu computadora

```bash
npm install
cp .env.example .env.local   # y rellena los cuatro valores
npm run canales              # da de alta los canales de semillas/canales.csv
npm run ingesta -- 3         # primera carga: hasta 150 videos por canal
npm run dev                  # http://localhost:3000
```

### 4. Ingesta automática

En GitHub, **Settings → Secrets and variables → Actions**, crea tres secretos:
`SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `YOUTUBE_API_KEY`. La ingesta diaria queda activa; también
se puede lanzar a mano desde la pestaña **Actions**.

GitHub pausa las tareas programadas de un repositorio tras 60 días sin actividad; se reactivan
desde la misma pestaña.

### 5. Publicar la app

Importa el repositorio en [Vercel](https://vercel.com) y define `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La clave secreta no hace falta en Vercel.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en local |
| `npm run canales` | Alta de canales desde `semillas/canales.csv` |
| `npm run ingesta` | Actualiza videos y multiplicadores |
| `npm test` | Pruebas |
| `npm run lint` · `npm run typecheck` · `npm run build` | Verificaciones |

## Cuota de YouTube

La API da 10 000 unidades al día. La ingesta gasta unas 2 por canal, así que hay margen para varios
miles de canales. No se usa la búsqueda de la API, limitada a 100 llamadas diarias.
