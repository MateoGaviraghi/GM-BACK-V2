# MEMORY — GM-BACK-V2
> Append. Las entradas no se editan; si una decisión cambia, se agrega una nueva que dice "reemplaza D-0NN".
> Antes de esta fecha no había registro: el porqué de lo anterior a 2026-11-03 está solo en `git log`.

## Decisiones

### D-001 — Hosting del back: Render, plan gratis (2026-11-03)
- **Qué:** el back corre en Render como web service Docker `gm-back-v2` (plan `free`, región `virginia`), construido desde el `Dockerfile` de la raíz, rama `main`.
- **Por qué:** la cuenta de Fly.io fue eliminada por Mateo y la condición es costo cero. Render gratis corre la imagen tal como está, sin tocar código.
- **Descartado:**
  - Cloudflare Workers gratis: 10 ms de CPU por pedido; el login (`bcryptjs`) y los PDF (`pdfkit`) lo superan, y Mongoose en Workers exige rehacer la conexión. Sería una reescritura con resultado frágil (G-001).
  - Cloudflare Containers: corre el Docker sin cambios, pero exige Workers Paid (USD 5/mes). Mateo: "no quiier pagar nada quiero que sea gratuito".
  - Koyeb y Northflank: las fuentes de 2026 dicen que piden tarjeta. No se probaron.
- **Costo asumido:** el servicio se duerme tras 15 min sin tráfico y tarda ~50 s en despertar (G-004).
- **Se reabre si:** el arranque lento molesta a los clientes, se agotan las 750 h/mes o los minutos de build gratis, o Mateo acepta pagar.

### D-002 — La config de deploy vive en el dashboard de Render, no en el repo (2026-11-03)
- **Qué:** no hay `render.yaml`, `fly.toml` ni workflow de GitHub Actions. Render despliega solo en cada commit a `main`. Las variables se editan en Render → `gm-back-v2` → Environment.
- **Por qué:** el servicio se creó con el MCP de Render; un `render.yaml` sin Blueprint asociado no se sincroniza y sería una segunda fuente de verdad que miente.
- **Descartado:** Blueprint con `render.yaml` (se escribió y se borró).
- **Se reabre si:** se quiere versionar la infraestructura; entonces hay que recrear el servicio como Blueprint.

## Gotchas

### G-001 — Cloudflare Workers gratis no puede correr este back
Límite de 10 ms de CPU por pedido en el plan Free. `bcryptjs` (salt 10) en el login y el armado de PDF con `pdfkit` superan ese tiempo por mucho. No es un problema de configuración, es del plan.

### G-002 — `wrangler deploy` con contenedores en una cuenta sin Workers Paid deja el Worker a medias
Sube el Worker y crea el Durable Object, y recién después falla con 401 en `/accounts/<id>/containers/me`. El log de deploy no dice el motivo; `npx wrangler containers list` sí ("requires the Workers Paid plan"). Queda un Worker publicado sin contenedor, que hay que borrar a mano (`wrangler delete --name <worker>`).

### G-003 — `NEXT_PUBLIC_API_URL` del front se hornea en el build
Cambiar la variable en Vercel no alcanza: hay que redeployar (`vercel redeploy <url-del-deploy-de-prod> --target production`). Además, en el proyecto `guzman-motors` esa variable está cargada a la vez en Production, Preview y Development, así que `vercel env update` cambia las tres.

### G-004 — Render gratis se duerme
Se apaga tras 15 min sin tráfico entrante y la primera respuesta después tarda ~50 s. No es un error. Render también puede suspender un servicio gratis con tráfico saliente inusualmente alto (DB, APIs externas), y sin medio de pago los builds se cortan por el resto del mes si se agotan los minutos gratis (el servicio que ya corre sigue).

### G-005 — Variables obligatorias para que arranque
Joi (`src/config/env.validation.ts`) aborta el arranque si faltan `MONGODB_URI`, `JWT_SECRET` (mín. 32), `FRONTEND_URL` y `CLOUDINARY_URL` (o el trío `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET`). En el `.env` local `FRONTEND_URL` es `http://localhost:3001`; en Render tiene que ser el dominio real del front, o el navegador bloquea todo por CORS.

## Deuda técnica

### TD-001 — Health check de Render sin configurar
El MCP de Render no permite setear `healthCheckPath` al crear el servicio. Quedó vacío. Se paga en Render → `gm-back-v2` → Settings → Health Check Path = `/api/health`. Cinco segundos de Mateo.

## Preguntas abiertas

### OQ-001 — Docs del front todavía hablan de Fly
`C:\Users\mateo\Desktop\GM-FRONT-V2\PLAN-MAESTRO.md` (líneas ~209, ~212, ~282) dice que el back es `https://gm-back-v2.fly.dev/api` y explica deploys con `fly deploy`. No se tocó. Decide Mateo si se actualiza (es trabajo en el repo del front). El `PROJECT-BRAIN.md` del front no se revisó.

### OQ-002 — ¿Workspace de Render correcto?
El servicio quedó en el workspace de la cuenta `nodotech.dev@gmail.com` (el que tenía conectado el MCP), no en la de `mateogaviraghi24@gmail.com` que se usa en Cloudflare y Vercel. Mateo no lo objetó, pero no lo confirmó explícitamente.

## Notas
- Intento Cloudflare Containers documentado en `WORKLOG.md` (2026-11-03). Si algún día se paga Workers Paid, la capa era chica: un Worker con `@cloudflare/containers` (clase con `defaultPort = 3000`, `sleepAfter`, `envVars` desde `this.env`), `wrangler.jsonc` con `containers[].image = "../Dockerfile"`, y excluir esa carpeta de `tsconfig.build.json` y `.dockerignore`.
