# Tech Stack

## Overview

TypeScript end to end, organized as a monorepo so the API and UI can share types, enums, and validation schemas. PostgreSQL is the single source of storage (data, sessions, and background jobs).

| Layer                      | Choice                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Monorepo                   | pnpm workspaces + Turborepo                                                          |
| Frontend                   | React + Vite, Tailwind CSS, shadcn/ui                                                |
| Data fetching / tables     | TanStack Query, TanStack Table                                                       |
| Forms                      | React Hook Form + Zod                                                                |
| Backend                    | NestJS                                                                               |
| Database / ORM             | PostgreSQL + Prisma                                                                  |
| Validation                 | Zod (shared schemas, used in NestJS via the built-in `StandardSchemaValidationPipe`) |
| Authentication             | better-auth (email/password, database sessions; see below)                           |
| Background jobs            | pg-boss (Postgres-backed queue)                                                      |
| Email (inbound + outbound) | Postmark (or SendGrid / Mailgun)                                                     |
| AI                         | Claude API via `@anthropic-ai/sdk`, model `claude-opus-5-5`                          |
| Testing                    | Vitest (unit / API), Playwright (end-to-end)                                         |
| Linting / formatting       | oxlint, Prettier                                                                     |
| Language                   | TypeScript 6.0.x (pinned until NestJS tooling supports TypeScript 7)                 |
| Deployment                 | Docker, on Railway / Render / Fly.io with managed Postgres                           |

## Monorepo Structure

```
helpdesk/
├── apps/
│   ├── api/          # NestJS backend (REST API, webhooks, background workers)
│   └── web/          # React + Vite frontend
├── packages/
│   └── shared/       # Shared Zod schemas, enums, and TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

- **`packages/shared`** holds anything both sides need: ticket status and category enums, request/response schemas, and DTO types. The API validates requests with these schemas and the UI uses the same schemas for forms.
- **Prisma lives in `apps/api`.** The generated Prisma client stays on the backend; the UI only sees the shared types.
- **Turborepo** handles running `dev`, `build`, `lint`, and `test` across packages with caching.

## Backend (NestJS)

Organized into feature modules:

| Module                | Responsibility                                          |
| --------------------- | ------------------------------------------------------- |
| `AuthModule`          | better-auth routes and global guard (library module)    |
| `UsersModule`         | Agent management (admin only)                           |
| `TicketsModule`       | Ticket CRUD, filtering, sorting, status changes         |
| `EmailModule`         | Inbound email webhook, outbound replies, threading      |
| `AiModule`            | Classification, summaries, suggested replies via Claude |
| `KnowledgeBaseModule` | Knowledge base content used by the AI                   |
| `JobsModule`          | pg-boss setup and background workers                    |

NestJS integrates with Prisma through a `PrismaService` provided via a global `PrismaModule`.

## Authentication: better-auth

- **[better-auth](https://better-auth.com)** handles sign-up, sign-in, sign-out and sessions with email/password. The instance is built in `apps/api/src/auth/auth.ts`.
- **Database sessions:** better-auth stores sessions in the Postgres `session` table through its Prisma adapter, and uses the `user`, `account` and `verification` tables alongside it. There is no secondary storage and no cookie cache, so each request checks the session against the database. Sign-out deletes the session row.
- **Cookie:** a signed session token cookie, `httpOnly` and `SameSite=Lax`, and `Secure` when `BETTER_AUTH_URL` is https. Requests that change state are checked against `trustedOrigins` (`WEB_ORIGIN`) to prevent CSRF.
- **Passwords** are hashed with scrypt, better-auth's default.
- **Routes:** better-auth serves its own endpoints under `/api/auth/*`, for example `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email`, `POST /api/auth/sign-out` and `GET /api/auth/get-session`.
- **NestJS integration:** [`@thallesp/nestjs-better-auth`](https://github.com/ThallesP/nestjs-better-auth). Its `AuthModule` (wired in `app.module.ts`) mounts the handler and registers a global `AuthGuard`, so every route needs a session unless it is marked `@AllowAnonymous()` or `@OptionalAuth()`. Read the session with `@Session()`. Nest's body parser is disabled in `main.ts`, and the module re-adds it for non-auth routes.

### Roles (not implemented yet)

Planned with better-auth's admin plugin, or a `role` additional field, plus `@Roles(['admin'])` from the Nest integration.

- **Admin**: seeded at deploy time from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) by a Prisma seed script. Can create and manage agents.
- **Agent**: created by the admin. Works on tickets.

## Email

- **Inbound:** the email provider receives mail at the support address and POSTs it to a webhook on the API. The webhook stores the ticket and enqueues an AI job, then returns immediately.
- **Outbound:** replies are sent through the same provider's API.
- **Threading:** student replies are matched to existing tickets using the `Message-ID` / `In-Reply-To` / `References` headers.

## AI (Claude API)

```
Email → webhook → create ticket (status: open) → enqueue job
                                                   ↓
                  Worker: one Claude call → { category, summary, draft_reply }
                                                   ↓
                       Save to ticket → agent reviews / sends
```

- **Model:** `claude-opus-5-5`.
- **One call per ticket** returns category, summary, and draft reply together. This uses structured outputs (`output_config.format`) with a JSON schema; `category` is an enum of `general_question | technical_question | refund_request`.
- **Knowledge base:** to start, the whole knowledge base goes in the system prompt with **prompt caching**, so no vector database is needed. If it grows too large for that, move to retrieval with pgvector.
- **No Batch API:** it adds latency, and fast responses are the point of the system.
- **Async processing:** AI calls run in pg-boss workers with retries, never inside the webhook request.

## Ticket Model (summary)

- **Status:** `open` | `resolved` | `closed`
- **Category:** `general_question` | `technical_question` | `refund_request`

Both are Postgres enums in Prisma and are mirrored in `packages/shared`.
