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
pnpm db:up        # start Postgres in Docker
pnpm dev          # start shared (watch), api, and web
```

Open http://localhost:5173. The web dev server proxies `/api/*` to the API, so the browser sees a single origin.

## Scripts

All scripts run across the workspace through Turborepo:

| Command             | What it does               |
| ------------------- | -------------------------- |
| `pnpm dev`          | Run all apps in watch mode |
| `pnpm build`        | Build all packages         |
| `pnpm lint`         | Lint with oxlint           |
| `pnpm typecheck`    | Type-check all packages    |
| `pnpm test`         | Run unit tests (Vitest)    |
| `pnpm format`       | Format with Prettier       |
| `pnpm db:up / down` | Start / stop Postgres      |

Run a script in one package with `--filter`, e.g. `pnpm --filter @helpdesk/api test:e2e`.

## Notes

- **TypeScript is pinned to 6.0.x** (in the `catalog` in `pnpm-workspace.yaml`). TypeScript 7 has no JS API yet, which the NestJS CLI requires.
- **Shared dependency versions** live in the pnpm `catalog`. Reference them with `"catalog:"` in a `package.json`.
- **Dependency install scripts are blocked** by pnpm 11 unless listed under `allowBuilds` in `pnpm-workspace.yaml` (Prisma will need this).
- **`@helpdesk/shared` is a compiled package.** Its `dist/` is built before the apps start; `pnpm dev` keeps it rebuilding in watch mode.
- **shadcn/ui components** are added from `apps/web`: `pnpm dlx shadcn@latest add <component>`.
