# PROJECT BRAIN — GM-BACK-V2 (guzman-motors-back)
> Router for this project's context. Read it before any substantive work.
> **It copies nothing.** Every fact here either lives here because no other file holds it, or is a
> pointer to the file that owns it — open that file. Do not act on a paraphrase, and if this file
> and a source file disagree, **the source file wins** and this one is stale.
> Do NOT invent conventions, file paths, APIs, or commands — if it is not here, not in a routed
> file, and not verifiable in the code, say so instead of guessing.
> Absorbed at `6ef6fd9` on 2026-11-03. Drift check: `git log --oneline 6ef6fd9..HEAD`
> — if that prints more than a handful of commits, treat §3-§5 as suspect and re-run /memorizar-proyecto.

## 1. What this is
NestJS + MongoDB REST API for Guzman Motors (GM), a vehicle dealer: catalog of 0km vehicles,
trailers (remolques), used vehicles (usados) and news (novedades), plus an admin-only CRM of clients.
Serves a separate frontend (public catalog + admin panel). Hosted on Render's free plan (migrated from Fly.io on 2026-11-03, after the Fly account was deleted; Cloudflare was ruled out because Containers needs a paid plan and free Workers cannot run it); work happens on `dev`.

## 2. Where the truth lives

| Ask about | Open | What it holds |
|---|---|---|
| **Why anything is the way it is** | `git log` (commit messages, Spanish/English mix) | There is **no decision log, ADR, CHANGELOG or docs folder** in this repo. Commit messages are the only record of why. |
| Required env vars and their rules | `src/config/env.validation.ts` | Joi schema validated at boot: what is required, min lengths, Cloudinary URL-or-split rule. Never read `.env` values. |
| Bootstrap: prefix, CORS, pipes, helmet | `src/main.ts` | global `api` prefix, ValidationPipe options, CORS per `NODE_ENV`. |
| Modules wired, DB, rate limits | `src/app.module.ts` | imported modules, Mongo connection, Throttler tiers + global guard. |
| Auth, roles, ownership | `src/auth/` | JWT strategy, `@Roles`, `RolesGuard`, `OwnershipGuard`, `@CurrentUser`. |
| Media uploads | `src/cloudinary/` | Cloudinary service (size limits, folders) and admin `media` controller. |
| Stack versions, scripts, deps | `package.json` (+ `package-lock.json`, npm) | NestJS 11, Mongoose 8, pdfkit, exceljs, cloudinary. |
| Build + runtime image | `Dockerfile`, `.dockerignore` | two-stage node:20-alpine; what reaches the runner. |
| Deploy | Render dashboard, service `gm-back-v2` (`srv-dbl2qepsrm7s73bhbleg`, workspace `tea-dbl2o7ff3r2c73897r90`), also reachable through the Render MCP | Free Docker web service in `virginia` built from the root `Dockerfile`, branch `main`, auto-deploy on commit, env vars. There is no deploy config file in the repo. Public URL `https://gm-back-v2.onrender.com/api`. |
| Local dev server for preview | `.claude/launch.json` | `gm-back` → `npm run start:dev` on port 3000. |
| What is happening right now | `git log --oneline -15`, `git status --short` | branch, in-flight work, uncommitted tree. Always current — never mirrored here. |

## 3. Code map <!-- owned here -->
```
src/
  main.ts, app.module.ts, app.controller.ts (GET / → 'Hello World!'), app.service.ts
  auth/            JWT + guards + decorators (index.ts barrel)
  cloudinary/      global module, CloudinaryService, MediaController (/api/media, admin)
  common/          ParseJsonFieldsInterceptor, @SkipThrottle decorator
  config/          env.validation.ts
  health/          GET /api/health (public)
  images/Logos-folletos/   2 PNG logos read at runtime by the PDF code
  modules/<name>/  clientes · novedades · remolques · usados · usuarios · vehiculos0km
    <name>.controller.ts          admin controller, @Controller('<name>')
    <name>-public.controller.ts   public twin, @Controller('<name>/public') (not clientes/usuarios)
    <name>.service.ts, <name>.module.ts, entities/<singular>.entity.ts, dto/
  types/           express.d.ts, passport-jwt.d.ts
test/              app.e2e-spec.ts + jest-e2e.json
```
- Every route is under `/api`. Admin controllers carry `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` at class level; the `*-public` controllers have no guards and filter to `estado: 'Disponible'`.
- `usuarios`: `POST /usuarios` (create user) is admin-only — public registration was closed; `POST /usuarios/login` is public (5/min). `GET/PATCH :id` use `OwnershipGuard` (admin or self).
- PDF "ficha técnica": `GET /api/remolques/public/:id/ficha-tecnica` and `GET /api/usados/public/:id/ficha-tecnica`, drawn inline with pdfkit inside the two public controllers (same design and palette `const C`, duplicated in both files).
- New catalog module = copy the shape of `modules/usados` (admin + public controller, service, entity, create/update/change-status/create-with-media DTOs) and import it in `app.module.ts`.
- 13 `*.spec.ts` files next to the code; they are Nest-generated stubs (one "should be defined" each).

## 4. Conventions inferred from the code <!-- owned here -->
- Files kebab-case; entity file singular (`usado.entity.ts`), module folder plural. Domain identifiers and fields in Spanish (`titulo`, `marca`, `anio`, `estado`), method names in English (`findAll`, `findOne`, `changeStatus`).
- User-facing error messages and comments in Spanish; comments sparse, longer service methods use numbered step comments.
- Mongoose models injected with `@InjectModel(X.name)`; schemas `@Schema({ timestamps: true, collection: '<plural>' })`; media stored as embedded subdocuments (`imagenes`, `fotoSinFondo1/2`). No `populate` anywhere.
- ObjectId check is an inline regex repeated per method: `if (!id.match(/^[0-9a-fA-F]{24}$/)) throw new BadRequestException('ID de … inválido')` — no pipe, no helper.
- Service error shape: `try { … } catch (e) { if (e instanceof BadRequestException || e instanceof NotFoundException) throw e; throw new InternalServerErrorException('Error al …') }`. NotFound text: `` `<Entidad> con ID ${id} no encontrado` ``.
- Response shapes: lists `{ items, total, page, limit, pages }`; updates `{ message, <entity> }`; media endpoints `{ success, message, data }`, errors wrapped as `BadRequestException({ success, message, error })`.
- Static routes (`search`, `options`, `suggestions`, `stats`…) are declared before `:id` in each controller.
- Multipart DTOs: array fields via `@Transform` + `JSON.parse` (invalid → `[]`), booleans via `value === 'true'`, numbers via the pipe's `enableImplicitConversion`. Remolques and novedades use `ParseJsonFieldsInterceptor([...fields])` instead; usados does not.
- Formatting: Prettier single quotes + trailing commas; ESLint typescript-eslint type-checked, `no-explicit-any` off. `strictNullChecks` on, `strict` off; DTO required fields use `!`.

## 5. Where the docs and the code disagree <!-- owned here, highest value -->
- `README.md` is the untouched Nest starter (says "Nest framework TypeScript starter repository", deploy via Mau). The code wins everywhere: the project is `guzman-motors-back`, deploys to Render (configured in its dashboard), and README documents no endpoints or env vars.
- `env.validation.ts` makes `MONGODB_URI`, `JWT_SECRET` (min 32) and `FRONTEND_URL` required, yet `app.module.ts`, `main.ts:43`, `auth/auth.module.ts:12` and `auth/jwt.strategy.ts:11` keep fallbacks (`localhost`, `http://localhost:3001`, `dev_secret_change_me`). Validation wins: the app does not boot without them, so the fallbacks never apply.
- Usados `anio`: entity is `@Prop({ type: Number }) anio?: number` (`usado.entity.ts:42-43`), while `create-usado.dto.ts:56-58` and `create-usado-with-media.dto.ts:45-47` declare `@IsDateString() anio?: string`.
- `create-usado-with-media.dto.ts` lacks fields that `create-usado.dto.ts` and the entity have (`version`, `tipoVehiculo`, `cilindrada`, `color`, …). With `forbidNonWhitelisted: true` (`main.ts:35`) sending them to `POST /usados/create-with-media` returns 400.

## 6. Commands
From `package.json` / `.claude/launch.json`:
```
npm run start:dev      # watch mode, port 3000 (preview config: gm-back)
npm run build          # nest build → dist/ (deleteOutDir)
npm run start:prod     # node dist/main — needs build first
npm run lint           # eslint --fix
npm test               # jest unit (src/**/*.spec.ts)
npm run test:e2e       # jest --config ./test/jest-e2e.json
```
Deploy: Render rebuilds and deploys on every commit to `main`. No GitHub Actions workflow is involved.
Env vars and secrets: Render dashboard → `gm-back-v2` → Environment (saving triggers a redeploy). The frontend (`GM-FRONT-V2`, Vercel project `guzman-motors`) reads this API from `NEXT_PUBLIC_API_URL`.

## 7. Landmines <!-- owned here -->
- PDF logos are read with `path.join(process.cwd(), 'src', 'images', 'Logos-folletos', …)`, not from `dist/`. The Dockerfile copies `src/images` into the runner explicitly; a missing file is skipped silently, so a broken copy produces PDFs without logos, no error. Any new runtime asset under `src/` needs its own `COPY` line.
- Branches: `dev` is the working branch, `main` is production and deploys on every commit. Render's free service spins down after 15 min without inbound traffic and takes about a minute to wake, so the first request after idle is slow; 750 free instance hours per month per workspace.
- Global throttler (10/s, 100/min, 1000/15min) applies to every route unless `@SkipThrottle`.
- CORS: in production only `FRONTEND_URL` + comma-separated `CORS_ORIGINS` are allowed; outside production every origin is allowed.
- `.gitignore` ends with a corrupted line (`*.tsbuildinfo# Node\nnode_modules/…` with literal `\n`); the patterns above it are the effective ones.
- `.env` exists locally and is gitignored; there is no `.env.example` and none is to be created (Mateo's global rule).
- Render egresses from changing IPs, so MongoDB Atlas network access must allow `0.0.0.0/0`.
- Render may suspend a free service with unusually heavy outbound traffic (DB, external APIs), and free build minutes are capped per month; with no payment method, builds stop for the rest of the month while the running service stays up.
- Cloudflare was tried and abandoned (2026-11-03): free Workers allow 10 ms CPU per request, which the bcrypt login and pdfkit PDFs exceed, and Containers require the Workers Paid plan.
