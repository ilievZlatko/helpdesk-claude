# Helpdesk

AI-powered ticket management system. See [project-scope.md](project-scope.md), [tech-stack.md](tech-stack.md), and [implementation-plan.md](implementation-plan.md).

## Structure

```
apps/
  api/        NestJS 12 backend (ESM, Vitest) — http://localhost:3000/api
  web/        React 19 + Vite 8 + Tailwind 4 + shadcn/ui — http://localhost:5173
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

`pnpm db:seed` creates these users. The API e2e tests also seed them before they run. They all share the password from `SEED_USER_PASSWORD` in `apps/api/.env`, which defaults to **`helpdesk-dev-password`** (from `.env.example`). They are dev/test accounts only, so never seed them in production.

| Name          | Email                     |
| ------------- | ------------------------- |
| Maya Thompson | maya.thompson@example.com |
| Daniel Okafor | daniel.okafor@example.com |
| Sofia Ramirez | sofia.ramirez@example.com |
| Liam Chen     | liam.chen@example.com     |
| Priya Nair    | priya.nair@example.com    |

Seeding skips users that already exist and does not reset their password. To change the password, update `SEED_USER_PASSWORD`, delete the users, and seed again.

## Scripts

All scripts run across the workspace through Turborepo:

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run all apps in watch mode            |
| `pnpm build`        | Build all packages                    |
| `pnpm lint`         | Lint with oxlint                      |
| `pnpm typecheck`    | Type-check all packages               |
| `pnpm test`         | Run unit tests (Vitest)               |
| `pnpm format`       | Format with Prettier                  |
| `pnpm db:up / down` | Start / stop Postgres                 |
| `pnpm db:migrate`   | Create and apply a migration (Prisma) |
| `pnpm db:generate`  | Regenerate the Prisma client          |
| `pnpm db:seed`      | Create the dev users (idempotent)     |
| `pnpm db:studio`    | Open Prisma Studio                    |

Run a script in one package with `--filter`, e.g. `pnpm --filter @helpdesk/api test:e2e`.

## Notes

- **TypeScript is pinned to 6.0.x** (in the `catalog` in `pnpm-workspace.yaml`). TypeScript 7 has no JS API yet, which the NestJS CLI requires.
- **Shared dependency versions** live in the pnpm `catalog`. Reference them with `"catalog:"` in a `package.json`.
- **Dependency install scripts are blocked** by pnpm 11 unless listed under `allowBuilds` in `pnpm-workspace.yaml` (currently only Prisma's).
- **Prisma 7:** the schema is in `apps/api/prisma/`, the config (database URL) in `apps/api/prisma7.config.ts`, and the client is generated into `apps/api/src/generated/prisma/` (gitignored, regenerated automatically by Turbo).
- **Postgres runs on host port 5433** to avoid clashing with other local Postgres instances on 5432.
- **`@helpdesk/shared` is a compiled package.** Its `dist/` is built before the apps start; `pnpm dev` keeps it rebuilding in watch mode.
- **shadcn/ui components** are added from `apps/web`: `pnpm dlx shadcn@latest add <component>`.
