# Plan

Objetivo: una herramienta interna de investigación de contenido en español. Primero YouTube;
la programación de publicaciones llega después.

Nichos, en orden de prioridad: desarrollo personal, salud mental, negocios, finanzas personales.

## Fase 1: investigación en YouTube

| # | Entrega | Estado |
|---|---|---|
| 1 | Esquema de base de datos, alta de canales, ingesta diaria | Hecho, sin probar contra servicios reales |
| 2 | Multiplicador de outlier con pruebas | Hecho |
| 3 | Feed con filtros (nicho, formato, mínimo, periodo, tamaño de canal) y acceso por correo | Hecho, probado solo contra un servidor simulado |
| 4 | Lista inicial de canales de desarrollo personal | Pendiente |
| 5 | Guardar videos en tableros | Tablas creadas; falta la interfaz |
| 6 | Búsqueda por significado (embeddings) | Pendiente |
| 7 | Análisis con IA por video: por qué funcionó y cómo adaptar la estructura | Pendiente |
| 8 | Transcripciones | Pendiente |

Criterio de salida: abrir el feed cada mañana y encontrar, en menos de cinco minutos, al menos una
idea aprovechable del nicho.

## Fase 2: uso diario y programación

- Borradores a partir de un video guardado.
- Programación de publicaciones. Pendiente de decidir el servicio: el plan actual de Metricool
  (Starter) no incluye API; las opciones son subir a Advanced o usar otro proveedor.

## Fase 3: más redes

- TikTok e Instagram. Requiere decidir la fuente de datos y revisar sus condiciones de uso.

## Decisiones tomadas

- **Línea base por formato.** Shorts y videos largos se puntúan por separado.
- **Short = 180 segundos o menos.** La API no los distingue; es una aproximación.
- **Sin proyección de videos nuevos.** Los de menos de 3 días se marcan como provisionales. La tabla
  `videos_historial` acumula los datos necesarios para proyectarlos más adelante.
- **Canales por lista curada**, no por búsqueda: la API limita las búsquedas a 100 al día.
