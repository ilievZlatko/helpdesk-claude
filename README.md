# Helpdesk

AI-powered ticket management system. See [project-scope.md](project-scope.md), [tech-stack.md](tech-stack.md), and [implementation-plan.md](implementation-plan.md).

## Structure

```
apps/
  api/        NestJS 12 backend (ESM, Vitest) — http://localhost:3000/api
  web/        React 19 + Vite 8 + Tailwind 4 + shadcn/ui — http://localhost:5173
  e2e/        Playwright end-to-end tests (run against both apps)
packages/
  shared/     Zod schemas and types shared by api and web
```

## Requirements

- Node.js 24 (see `.nvmrc`; 24.15+ recommended for the NestJS CLI generators)
- pnpm 11 (`corepack enable` picks up the version from `package.json`)
- Docker (for local Postgres)

## Getting started

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # start Postgres in Docker (host port 5433)
pnpm db:migrate   # apply migrations
pnpm db:seed      # create the dev users (see below)
pnpm dev          # start shared (watch), api, and web
```

Open http://localhost:5173. The web dev server proxies `/api/*` to the API, so the browser sees a single origin.

## Dev users

`pnpm db:seed` creates these users. The API e2e tests also seed them before they run. Sign-up is disabled, so these are the only accounts.

| Name           | Email                     | Role  | Password (from `apps/api/.env`)                           |
| -------------- | ------------------------- | ----- | --------------------------------------------------------- |
| Helpdesk Admin | admin@example.com         | admin | `ADMIN_PASSWORD`, default **`password123`**               |
| Maya Thompson  | maya.thompson@example.com | agent | `SEED_USER_PASSWORD`, default **`helpdesk-dev-password`** |
| Daniel Okafor  | daniel.okafor@example.com | agent | same                                                      |
| Sofia Ramirez  | sofia.ramirez@example.com | agent | same                                                      |
| Liam Chen      | liam.chen@example.com     | agent | same                                                      |
| Priya Nair     | priya.nair@example.com    | agent | same                                                      |

- **The admin** (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) is always ensured: the seed creates it if it is missing, or gives the existing user the admin role. In production, run the seed with your own admin values.
- **The agents** are seeded only when `SEED_USER_PASSWORD` is set. Leave it unset in production.
- **Production is checked at startup** (`apps/api/src/config/env.ts`): with `NODE_ENV=production` the API and the seed refuse to run if `SEED_USER_PASSWORD` is set, if `ADMIN_EMAIL` is an `@example.com` address, if `ADMIN_PASSWORD` is a published default or shorter than 16 characters, or if neither `CLIENT_IP_HEADER` nor `TRUSTED_PROXIES` is set. An `https` `BETTER_AUTH_URL` requires `NODE_ENV=production`.
- **Existing users keep their password:** seeding never resets it. To change it, update the variable, delete the user, and seed again.

## Scripts

All scripts run across the workspace through Turborepo:

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run all apps in watch mode            |
| `pnpm build`        | Build all packages                    |
| `pnpm lint`         | Lint with oxlint                      |
| `pnpm typecheck`    | Type-check all packages               |
| `pnpm test`         | Run unit tests (Vitest)               |
| `pnpm e2e`          | Run the Playwright tests (see below)  |
| `pnpm format`       | Format with Prettier                  |
| `pnpm db:up / down` | Start / stop Postgres                 |
| `pnpm db:migrate`   | Create and apply a migration (Prisma) |
| `pnpm db:generate`  | Regenerate the Prisma client          |
| `pnpm db:seed`      | Create the dev users (idempotent)     |
| `pnpm db:studio`    | Open Prisma Studio                    |

Run a script in one package with `--filter`, e.g. `pnpm --filter @helpdesk/api test:e2e`.

## End-to-end tests (Playwright)

`apps/e2e` holds the Playwright tests (`apps/e2e/tests/*.spec.ts`). They run against production builds of the API and the web app, on their own ports and their own database, so they can run while `pnpm dev` is up and never touch your dev data.

```bash
pnpm db:up                                       # Postgres must be running
pnpm --filter @helpdesk/e2e install-browsers     # once: downloads Chromium
pnpm e2e                                         # builds both apps, then runs the tests
pnpm --filter @helpdesk/e2e e2e:ui               # Playwright UI mode (build first with pnpm build)
pnpm --filter @helpdesk/e2e e2e:report           # open the last HTML report
```

Each run:

1. Creates the `helpdesk_test` database in the docker-compose Postgres if it is missing, applies the migrations, empties every table, and seeds the admin and dev agents (`apps/e2e/scripts/prepare-db.ts`). It refuses any database whose name doesn't end in `_test`.
2. Starts the API on http://localhost:3001 (`NODE_ENV=test`, with a fresh random `BETTER_AUTH_SECRET`; sign-in rate limiting is on in production only). It does not read `apps/api/.env`.
3. Serves the built web app with `vite preview` on http://localhost:5174, proxying `/api` to that API.

Test settings and the seeded credentials are in `apps/e2e/env.ts`. Override them with `E2E_DATABASE_URL`, `E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` and `E2E_SEED_USER_PASSWORD`.

## Notes

- **TypeScript is pinned to 6.0.x** (in the `catalog` in `pnpm-workspace.yaml`). TypeScript 7 has no JS API yet, which the NestJS CLI requires.
- **Shared dependency versions** live in the pnpm `catalog`. Reference them with `"catalog:"` in a `package.json`.
- **Dependency install scripts are blocked** by pnpm 11 unless listed under `allowBuilds` in `pnpm-workspace.yaml` (currently only Prisma's).
- **Prisma 7:** the schema is in `apps/api/prisma/`, the config (database URL) in `apps/api/prisma7.config.ts`, and the client is generated into `apps/api/src/generated/prisma/` (gitignored, regenerated automatically by Turbo).
- **Postgres runs on host port 5433** to avoid clashing with other local Postgres instances on 5432.
- **`@helpdesk/shared` is a compiled package.** Its `dist/` is built before the apps start; `pnpm dev` keeps it rebuilding in watch mode.
- **shadcn/ui components** are added from `apps/web`: `pnpm dlx shadcn@latest add <component>`.
