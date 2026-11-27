# Helpdesk

AI-powered ticket management system: support emails become tickets that are classified, summarized, and answered with AI help. Background and decisions are in:

- [project-scope.md](project-scope.md): problem, features, statuses, categories, roles
- [tech-stack.md](tech-stack.md): stack choices and architecture
- [implementation-plan.md](implementation-plan.md): phased task list. Check off tasks (`- [x]`) as they are completed.

## Documentation: use Context7

Most libraries in this repo are newer than your training data: NestJS 12, Vite 8, React 19, Tailwind 4, Vitest 5, Zod 4, pnpm 11, Turborepo 2, TypeScript 6. **Before writing or changing code that uses a library API, look up the current docs with the Context7 MCP tools**: resolve the library ID first, then fetch its docs for a focused topic. Don't rely on memory for configuration formats, CLI flags, or APIs.

- Use Context7 when adding a new dependency, using an API you haven't used in this repo yet, or when something behaves differently from what you expect.
- If Context7 is unavailable, fall back to the library's official docs (e.g. https://docs.nestjs.com/llms.txt) and say so.
- Check current package versions with `npm view <pkg> version` rather than assuming.

## Repository layout

pnpm workspace + Turborepo monorepo:

```
apps/api         NestJS 12 backend (ESM). Read apps/api/AGENTS.md before working here.
apps/web         React 19 + Vite 8 + Tailwind 4 + shadcn/ui + TanStack Query
packages/shared  Zod schemas, enums, and types shared by api and web (@helpdesk/shared)
```

## Commands

Run from the repo root:

```bash
pnpm dev          # shared (watch) + api (:3000) + web (:5173)
pnpm build
pnpm lint         # oxlint
pnpm typecheck
pnpm test         # Vitest, all packages
pnpm format       # Prettier
pnpm db:up        # Postgres in Docker (docker-compose.yml), host port 5433
pnpm db:migrate   # prisma migrate dev (create + apply a migration)
pnpm db:generate  # regenerate the Prisma client
pnpm db:seed      # create dev users (idempotent; password from SEED_USER_PASSWORD)
pnpm db:studio    # Prisma Studio
pnpm --filter @helpdesk/api test:e2e   # needs Postgres running
```

Before calling a task done, run `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm build` for config or dependency changes).

## Conventions

- **TypeScript is pinned to 6.0.x** via the pnpm `catalog` in `pnpm-workspace.yaml`. Do not upgrade to TypeScript 7: it has no JS API, which the NestJS CLI needs.
- **Shared versions:** dependencies used by several packages go in the `catalog` and are referenced as `"catalog:"`.
- **pnpm 11 supply-chain settings:** don't add `minimumReleaseAgeExclude` entries or loosen policies to get a just-released version. Widen the version range instead. Packages with install scripts must be approved under `allowBuilds` in `pnpm-workspace.yaml`. Read a package's install script before approving it.
- **Shared code:** schemas and types used by both apps belong in `packages/shared`, defined with Zod and exported from `src/index.ts`. It is a compiled package (`dist/`), so relative imports inside it end in `.js`.
- **API (NestJS):**
  - ESM: relative imports end in `.js`, and there is no `__dirname` (use `import.meta.dirname`).
  - Code is organized as feature modules (`src/<feature>/<feature>.module.ts`), and all routes live under the global `/api` prefix.
  - Validate requests with Zod schemas from `@helpdesk/shared` via NestJS's built-in `StandardSchemaValidationPipe`; don't use `class-validator` or `nestjs-zod`.
  - Environment variables are validated in `src/config/env.ts`. Add every new variable there and to `.env.example`.
  - Auth is better-auth (`src/auth/auth.ts`) through `@thallesp/nestjs-better-auth`. Every route needs a session by default (global `AuthGuard`); mark public routes with `@AllowAnonymous()` and read the session with `@Session()`. The app is created with `bodyParser: false` (in `main.ts` and in e2e tests). Better-auth's own routes live under `/api/auth/*`.
- **Database (Prisma 7, PostgreSQL):**
  - Use the stable Prisma 7.x line. npm's `latest` tag for the `prisma` CLI points at an 8.0 release candidate, so always install with an explicit `@^7` range.
  - Schema: `apps/api/prisma/schema.prisma`. Config, including the database URL: `apps/api/prisma7.config.ts`, which loads `.env` via `dotenv`. Prisma 7 does not load `.env` itself.
  - The client is generated into `apps/api/src/generated/prisma/` (gitignored). Import it from `../generated/prisma/client.js`, never from `@prisma/client`. Turbo runs `db:generate` before `dev`, `build`, `lint`, `typecheck`, and `test`.
  - Access the database through the global `PrismaService` (`src/prisma/`). It connects with the `@prisma/adapter-pg` driver adapter.
  - After changing the schema, run `pnpm db:migrate --name <change>`. In Prisma 7, `migrate dev` no longer runs `generate` or seed scripts, so run `pnpm db:generate` yourself if needed. Commit the generated `prisma/migrations/` folder.
  - Local Postgres listens on host port **5433**; port 5432 is used by another project on this machine.
- **Web:**
  - Import with the `@/` alias (`@/components/...`).
  - Get server state with TanStack Query and validate API responses with the shared schemas.
  - Add UI components from `apps/web` with `pnpm dlx shadcn@latest add <component>`; components in `src/components/ui` are generated and can be edited.
  - In dev, the Vite server proxies `/api` to the API, so use relative `/api/...` URLs.
- **Tests:** Vitest everywhere (`vi.fn()`, not `jest.fn()`). Unit tests sit next to the code (`*.spec.ts` in api, `*.test.ts(x)` in web/shared). Cover changed behavior with focused tests.
- **Formatting:** Prettier with single quotes and trailing commas. Run `pnpm format` before finishing.

## Secrets

- `.env` files are gitignored. Never commit secrets or print their values.
- The root `.env` holds local tool keys (e.g. `CONTEXT7_API_KEY`). The API's settings live in `apps/api/.env`.
