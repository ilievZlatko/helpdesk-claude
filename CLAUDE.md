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
pnpm db:seed      # ensure the admin (ADMIN_EMAIL/ADMIN_PASSWORD) + dev agents (SEED_USER_PASSWORD); idempotent
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
  - Auth is better-auth (`src/auth/auth.ts`) through `@thallesp/nestjs-better-auth`. Every route needs a session by default (global `AuthGuard`); mark public routes with `@AllowAnonymous()` and read the session with `@Session()`. The app is created with `bodyParser: false` (in `main.ts` and in e2e tests). Better-auth's own routes live under `/api/auth/*`. Sign-up is disabled (internal tool); create users through the seed (`prisma/seed-users.ts`) or the admin plugin, not the sign-up route. Roles are `admin | agent` (better-auth admin plugin). Use the `UserRole` enum from `@helpdesk/shared` (`UserRole.Admin`, `UserRole.Agent`) instead of string literals; protect admin-only routes with `@Roles([UserRole.Admin])`.
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
  - Pages (one per route) are single files, `src/pages/<name>.page.tsx` (e.g. `login.page.tsx`), imported as `@/pages/<name>.page` (no folder or `index.ts`). They stay thin and compose pieces from modules. Modules never import pages. Something only one page uses can stay in that page's file; once it grows or is reused, move it into a module.
  - Code is organized in feature modules under `src/modules/<module>/` (`auth`, `routes`, `layouts`, `theme`). A module's files sit directly in its folder (`<name>.tsx`, plain `.ts` for non-UI code), and its tests go in the module's `test/` folder (`src/modules/<module>/test/<name>.test.tsx`). There are no `index.ts` barrels: import the file itself, e.g. `@/modules/auth/login-form`, and use relative paths (`./theme`) inside the same module.
  - Components a module uses only internally go in `src/modules/<module>/components/`; don't import those from outside the module. Avoid circular dependencies between modules (today: `auth` uses `theme`; `routes` and `layouts` depend on `auth`). `src/components/ui` and `src/hooks` (shadcn) stay flat because the shadcn CLI writes there. App components that don't belong to a module (e.g. `login-background.tsx`) go directly in `src/components/<name>.tsx`.
  - In dev, the Vite server proxies `/api` to the API, so use relative `/api/...` URLs.
  - Theme: light / dark / system via `ThemeProvider` (theme module, `src/modules/theme/`; state in `theme.ts`), which toggles the `dark` class on `<html>`. Style dark mode with theme tokens (`bg-background`, `text-muted-foreground`, …) or `dark:` variants. An inline script in `index.html` applies the saved theme before first paint; keep its storage key in sync with `THEME_STORAGE_KEY`.
  - Auth (`src/modules/auth/`) uses the better-auth React client (`auth-client.ts`): `authClient.useSession()`, `signIn.email()`, `signOut()`. Routes are declared in `src/App.tsx` with React Router; pages that need a session go under `<RequireAuth />` (routes module) inside `AppLayout` (layouts module); the login page goes under `<RequireGuest />`. Role-restricted pages go under `<RequireRole roles={[UserRole.Admin]} />` inside `<RequireAuth />` (it sends other users home); hide links to them from users without the role. This is UI only: the API enforces roles itself.
- **Tests:** Vitest everywhere (`vi.fn()`, not `jest.fn()`). Unit tests sit next to the code (`*.spec.ts` in api, `*.test.ts` in shared), except in web modules, where they go in the module's `test/` folder (`*.test.ts(x)`). Cover changed behavior with focused tests.
- **Formatting:** Prettier with single quotes and trailing commas. Run `pnpm format` before finishing.

## Design language (web)

Follow this look for all new UI. The reference screens are the login page and the signed-in home page.

- **Accent:** blue-600 (`--primary`) in both themes, for buttons, focus rings and the logo. Lighter blues fail WCAG AA with white text.
- **Light theme:** shadcn's neutral tokens with white cards; signed-in pages sit on a very subtle cool gradient, `slate-100 → sky-50 → indigo-50` (between light gray and blue; the light mirror of the dark gradient). Keep it barely-there: no stronger blues behind content.
- **Dark theme is navy, never gray or black:** tokens use Tailwind's slate scale (background slate-950, cards and popovers slate-900, muted/secondary/accent slate-800, muted text slate-400, text slate-50), and signed-in pages use the login page's gradient, `slate-950 → slate-900 → indigo-950`. Don't introduce neutral grays (`oklch(x 0 0)`) or `zinc`/`neutral`/`gray` colors in dark mode.
- **Layout:** a dashboard, not a website: the header and page content span the full width with modest side padding (`px-4 sm:px-6`) and no centered `max-w-*` container. Forms and long text can keep a readable max width, left-aligned.
- **Shell:** a collapsible left sidebar (shadcn `Sidebar`, `collapsible="icon"`, in `modules/layouts/app-sidebar.tsx`) with the logo (plus name when expanded) on top, the navigation below, and Sign out pinned to the bottom; a transparent sticky header over the page gradient with the sidebar toggle (left), a centered search field (not wired up yet), and the notifications bell and avatar menu (right). Sign-out logic is shared via `useSignOut` (`modules/auth/use-sign-out.ts`). The sidebar is 14rem wide when expanded (set on `SidebarProvider` in `app-layout.tsx`), translucent and blurred: light `slate-200/55%` (a soft gray that stands apart from the page), dark `slate-950/70%` (navy glass). Navigation items live in `navItems` in `app-sidebar.tsx`; give an item `roles` to show it only to those roles.
- **Login page:** frosted-glass card (translucent white, `backdrop-blur-2xl`, light white border, soft indigo shadow) over a sky → indigo → violet gradient with large blurred blue/cyan and indigo/pink orbs (`src/components/login-background.tsx`). Inputs on glass are translucent off-white and keep their background on autofill (`autofill-keep-bg` in `index.css`).
- **Motion and contrast:** decorative motion is slow and wrapped in `motion-safe:`; text placed on gradients or glass must stay readable (darken it, e.g. `text-slate-700 dark:text-slate-300`, rather than using `text-muted-foreground`).
- Use the theme tokens (`bg-background`, `bg-card`, `text-muted-foreground`, …) instead of raw colors, so both themes stay consistent.

## Secrets

- `.env` files are gitignored. Never commit secrets or print their values.
- The root `.env` holds local tool keys (e.g. `CONTEXT7_API_KEY`). The API's settings live in `apps/api/.env`.
