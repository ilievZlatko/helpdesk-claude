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
| Authentication             | Database-backed sessions (see below)                                                 |
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
| `AuthModule`          | Login, logout, session management, guards               |
| `UsersModule`         | Agent management (admin only)                           |
| `TicketsModule`       | Ticket CRUD, filtering, sorting, status changes         |
| `EmailModule`         | Inbound email webhook, outbound replies, threading      |
| `AiModule`            | Classification, summaries, suggested replies via Claude |
| `KnowledgeBaseModule` | Knowledge base content used by the AI                   |
| `JobsModule`          | pg-boss setup and background workers                    |

NestJS integrates with Prisma through a `PrismaService` provided via a global `PrismaModule`.

## Authentication: Database Sessions

- On login, the API creates a row in a `Session` table (Postgres, via Prisma) and sets the session ID in a cookie.
- Cookie flags: `httpOnly`, `Secure`, `SameSite=Lax`. The session ID is a cryptographically random, opaque token; only its hash is stored in the database.
- Each request looks up the session by the cookie. The lookup rejects expired sessions and loads the user and their role.
- Logout deletes the session row. An admin can revoke all sessions for an agent, for example when the agent is deactivated.
- Passwords are hashed with **argon2**.
- Authorization uses NestJS guards: an `AuthGuard` for logged-in users and a `RolesGuard` with a `@Roles('admin')` decorator for admin-only routes.

### Roles

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
