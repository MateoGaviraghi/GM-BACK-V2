# WORKLOG — GM-BACK-V2

## ESTADO
> Se sobrescribe completa en cada `/cerrar`.

| Campo | Valor |
|---|---|
| Tarea actual | Migración del back de Fly.io a Render (plan gratis). **Terminada.** |
| Status real | En producción en Render: `https://gm-back-v2.onrender.com/api`, deploy `dep-dbl3bv3bc2fs738kiq5g` (commit `1b138ee`, PR #7) en estado `live`. El front `www.guzmanmotors.com.ar` ya consume esta API. Login del panel de admin probado por Mateo: anda. |
| Último chat | 2026-11-03 |
| Espera de Mateo | (1) Decidir si se actualiza `GM-FRONT-V2/PLAN-MAESTRO.md`, que todavía describe el back en Fly (ver OQ-001 en `MEMORY.md`). (2) Opcional: cargar `Health Check Path` = `/api/health` en Render → `gm-back-v2` → Settings (TD-001). (3) Confirmar que el workspace de Render de la cuenta `nodotech.dev@gmail.com` es el correcto (OQ-002). |
| Espera de terceros | Nada. |
| Próxima acción | Ninguna pendiente en este repo. Si Mateo dice que sí a OQ-001, el trabajo es en el repo del front, no acá. |
| Qué no se toca | No crear `.env.example`. Las claves viven solo en el dashboard de Render (Environment) y en el `.env` local; nunca en el repo. No reponer `fly.toml` ni un workflow de deploy: Render despliega solo desde `main`. |

## REGISTRO
> Append. Nunca se borra nada.

### 2026-11-03 — Memorizar proyecto + migración Fly.io → Render

**Pedido** (literal, en orden):
1. `/memorizar-proyecto`
2. "elimine la cuenta de flyio debemos migrar el back a un lugar gratutito a mi cuenta de cloudflare"
3. "Cloudflare Containers" (eligió esa opción) → GO-AHEAD: "Ok, arrancá"
4. "Ok, deployá"
5. "no quiier pagar nada quiero que sea gratuito"
6. "Ok, Render"
7. "si borralos y te conecte el conceetor de  mcp y ademas te agregue el plugin de /render"
8. "vamos paso a paso no todo junto estoy aca que hago" (guía pantalla por pantalla en Render)
9. "Sí, paso 2" (apuntar el front al back nuevo)
10. "Sí, paso 3" (limpiar restos de Cloudflare/Fly y commitear)
11. "Sí, subí y mergeá"
12. "Sí, borralo" (borrar el Worker de Cloudflare)
13. "el llgoin anda"
14. `/cerrar`

**Hecho:**
- **Brain del proyecto:** se escribió `PROJECT-BRAIN.md` (router de contexto, sellado en `6ef6fd9`) y `CLAUDE.md` con el ancla que obliga a leerlo. Pointer en la auto-memoria de Claude.
- **Intento Cloudflare Containers (abandonado):** se armó una capa `cloudflare/` (Worker + `wrangler.jsonc` + clase `GmBack` que reenviaba todo a un contenedor del `Dockerfile` raíz). `wrangler deploy --dry-run` pasó y la imagen compiló. El deploy real subió el Worker pero falló al subir la imagen: la cuenta no tiene Workers Paid (ver G-002). Se cargaron 3 secrets (`MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_URL`) en ese Worker. Mateo no quiso pagar → todo se borró (archivos del repo y el Worker remoto con `wrangler delete`, que se lleva sus secrets).
- **Render:** servicio web `gm-back-v2` creado con el MCP de Render: workspace `tea-dbl2o7ff3r2c73897r90` ("Mateo's workspace", cuenta `nodotech.dev@gmail.com`), service id `srv-dbl2qepsrm7s73bhbleg`, runtime Docker, plan `free`, región `virginia`, repo `MateoGaviraghi/GM-BACK-V2`, rama `main`, auto-deploy en cada commit. Variables cargadas: `NODE_ENV`, `PORT` (por MCP) y `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `CLOUDINARY_URL` (las cargó Mateo desde el dashboard con "Add from .env"; Claude no vio los valores).
- **Front (Vercel, proyecto `guzman-motors`, repo local `C:\Users\mateo\Desktop\GM-FRONT-V2`):** `NEXT_PUBLIC_API_URL` cambiado a `https://gm-back-v2.onrender.com/api` con `vercel env update`. La variable estaba en Production, Preview y Development, y quedó cambiada en los tres. Se redeployó el último deploy de producción (`guzman-motors-nmrpqkvrc…`) con `vercel redeploy --target production` → nuevo deploy `guzman-motors-8ahy4dijw…`, alias `www.guzmanmotors.com.ar`. Sin cambios de código en el front.
- **Limpieza y merge:** commit `3d570bc` en `dev` ("chore: migrar el deploy de Fly.io a Render (plan gratis)"), PR #7 dev → main mergeado (merge `1b138ee`). Render redeployó solo y quedó `live`.

**Archivos:**
- `C:\Users\mateo\Desktop\GM-BACK-V2\PROJECT-BRAIN.md` — nuevo. Después se actualizó: §1 hosting en Render, §2 fila Deploy → dashboard de Render (ids del servicio y workspace), §5 README vs código, §6 comandos de deploy, §7 landmines de Render y de Cloudflare descartado.
- `C:\Users\mateo\Desktop\GM-BACK-V2\CLAUDE.md` — nuevo, solo el bloque `memorizar-proyecto:brain`.
- `C:\Users\mateo\Desktop\GM-BACK-V2\fly.toml` — borrado.
- `C:\Users\mateo\Desktop\GM-BACK-V2\.github\workflows\deploy.yml` — borrado (antes desplegaba a Fly con `flyctl`; en el medio se reescribió para `wrangler` y después se borró).
- `C:\Users\mateo\Desktop\GM-BACK-V2\cloudflare\` — creada y borrada en la misma sesión. No quedó nada.
- `C:\Users\mateo\Desktop\GM-BACK-V2\render.yaml` — creado y borrado (no se usó: el servicio se creó por MCP).
- `C:\Users\mateo\Desktop\GM-BACK-V2\.dockerignore` y `tsconfig.build.json` — modificados para excluir `cloudflare/` y restaurados al original con `git checkout`. Sin cambios netos.
- `C:\Users\mateo\Desktop\GM-BACK-V2\WORKLOG.md` y `MEMORY.md` — nuevos (este cierre).
- Fuera del repo: `C:\Users\mateo\.claude\projects\C--Users-mateo-Desktop-GM-BACK-V2\memory\project-brain-pointer.md` y `MEMORY.md` (índice) — nuevos.

**Verificado:**
- Imagen Docker en local con el `.env`: `/api/health` → `{"status":"ok","db":"up"}`, lista pública de usados 200, memoria en reposo ~57 MiB.
- Render: `/api/health` → `{"status":"ok","db":"up"}`; `/api/remolques/public` 200 (1 remolque); `/api/usados/public` 200 (vacío, no hay usados disponibles); `/api/clientes` sin token → 401.
- CORS: `Access-Control-Allow-Origin` devuelto para `https://www.guzmanmotors.com.ar` y `https://guzmanmotors.com.ar`.
- Front en producción (navegador): `/usados` llama a `https://gm-back-v2.onrender.com/api/usados/public?page=1&limit=100`; `/remolques` llama a `.../remolques/public/search?page=1&limit=100` → 200.
- PDF ficha técnica de remolque desde Render: 200, `application/pdf`, 360 KB; abierto y mirado: foto, logos GM y título correctos.
- Login del panel de admin: probado por Mateo, anda.
- **Sin verificar:** PDF de ficha técnica de usados (no hay usados disponibles); subida de imágenes/videos a Cloudinary desde Render; el resto de las pantallas de admin más allá del login.

**Resuelto en el camino:**
- `nest build` dentro de Docker falló al existir `cloudflare/src/index.ts`: `tsconfig.json` no tiene `include`, así que Nest compilaba también el Worker y no encontraba los tipos de Cloudflare. Se excluyó la carpeta (y luego se borró todo).
- Tipo de `DurableObjectState` incompatible en el constructor de la clase Container → se pasó `envVars` a campo de clase leyendo `this.env`.
- `wrangler deploy` → 401 en `/containers/me`: causa real, la cuenta no tiene Workers Paid (mensaje literal de `wrangler containers list`: "Deploying containers requires the Workers Paid plan").
- Primer deploy en Render falló: `Config validation error` de Joi por faltar `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `CLOUDINARY_URL`. Se resolvió cuando Mateo cargó las variables.

**Gates:**
- `npm run build` (Nest) → OK, después de la limpieza.
- `npx tsc --noEmit` del Worker → OK (código ya borrado).
- `npx wrangler deploy --dry-run` → OK (código ya borrado).
- Lint y tests: **no se corrieron**.

**Sigue:** Nada obligatorio. Ver ESTADO → "Espera de Mateo".
