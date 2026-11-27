# Implementation Plan

This plan builds on [project-scope.md](project-scope.md) and [tech-stack.md](tech-stack.md). Each phase ends with something working that can be demoed. Each task is small enough to finish and review on its own, usually as a single pull request.

## Assumptions

These are working assumptions, not final decisions. They can be revisited without restructuring the plan.

- **AI replies are suggestions first.** Agents review and send AI drafts. Automatic sending comes later (Phase 8), behind a setting and limited to specific categories.
- **Status flow:** `open → resolved → closed`. A student reply to a `resolved` ticket reopens it. `closed` is final.
- **Any agent can see and work on any ticket.** There is no assignment in the first version.
- **The knowledge base is small enough to fit in the prompt with prompt caching.** No vector search for now.

---

## Phase 0: Project Foundation

**Goal:** an empty monorepo that installs, builds, lints, and runs both apps.

- [x] 0.1 Initialize the git repo, `.gitignore`, `.editorconfig`, `.nvmrc`
- [x] 0.2 Set up pnpm workspaces and Turborepo (`dev`, `build`, `lint`, `test`, `typecheck` pipelines)
- [x] 0.3 Linting and formatting: oxlint + Prettier (each package keeps its own `tsconfig`, since the API uses `nodenext` and the web app uses `bundler` resolution)
- [x] 0.4 Scaffold `apps/api` (NestJS) with a `GET /health` endpoint
- [x] 0.5 Scaffold `apps/web` (React + Vite + Tailwind + shadcn/ui) with a placeholder page
- [x] 0.6 Create `packages/shared` and import it from both apps to prove the wiring works
- [x] 0.7 Add `docker-compose.yml` with Postgres for local development
- [x] 0.8 Set up environment variable handling (`.env.example`, config module with Zod validation in the API)
- [x] 0.9 Configure the Vite dev proxy from `web` to `api` so cookies work locally on one origin
- [x] 0.10 Set up Vitest in both apps and add a CI workflow that runs lint, typecheck, test, and build

**Done when:** `pnpm dev` starts both apps, the web page calls `/api/health` successfully, and CI is green.

---

## Phase 1: Database & Authentication

**Goal:** the seeded admin can log in and out; protected routes reject anonymous users.

- [x] 1.1 Add Prisma to `apps/api` and create `PrismaModule` / `PrismaService`
- [x] 1.2 Add better-auth (email/password) with the Prisma adapter: `src/auth/auth.ts`, plus `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `WEB_ORIGIN` env vars
- [x] 1.3 Add the better-auth models (`User`, `Session`, `Account`, `Verification`) and create the first migration
- [x] 1.4 Wire `@thallesp/nestjs-better-auth`: routes under `/api/auth/*` and a global `AuthGuard`, with `@AllowAnonymous()` for public routes such as `/api/health`
- [x] 1.4a `GET /api/users/me`: the current user (`id`, `name`, `email`, `role`, `image`; shared `currentUserSchema`)
- [x] 1.5 Add roles (`admin | agent`) via better-auth's admin plugin (`role` enum, default `agent`); admin routes use `@Roles([UserRole.Admin])`
- [x] 1.6a Disable public sign-up (`emailAndPassword.disableSignUp`); dev users come from `pnpm db:seed`
- [x] 1.6b Seed the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (created if missing, promoted to admin if it exists; password never reset)
- [ ] 1.7 Add `isActive` and block sign-in for inactive users
- [x] 1.8 Review better-auth rate limiting for sign-in (on by default in production; consider database storage): enabled explicitly outside tests, stored in Postgres (`rate_limit`), client IP from `CLIENT_IP_HEADER` / `TRUSTED_PROXIES` (required in production)
- [ ] 1.9 Clean up expired sessions (scheduled job, or confirm better-auth's own cleanup is enough)
- [x] 1.10 Login page in `web` (React Hook Form + shared Zod schema)
- [x] 1.11 Auth state in `web` (better-auth React client, `useSession`), protected routes, logout button
- [ ] 1.12 App shell layout: sidebar navigation, header with current user (header with name and sign-out: done in `AppLayout`)
- [x] 1.13 Tests: sign-up disabled, sign-in success/failure, sign-out, global guard (`test/auth.e2e-spec.ts`)
- [ ] 1.14 Tests: expired session (role guard: done in `test/auth.e2e-spec.ts`)

**Done when:** the admin logs in, sees the app shell, logs out, and API routes return 401/403 correctly.

---

## Phase 2: User Management (Admin)

**Goal:** the admin can create and manage agents.

- [ ] 2.1 Shared Zod schemas for create/update user
- [ ] 2.2 `GET /users`: list users (admin only)
- [ ] 2.3 `POST /users`: create an agent with an initial password (admin only)
- [ ] 2.4 `PATCH /users/:id`: update name/email, activate/deactivate (admin only)
- [ ] 2.5 When an agent is deactivated, revoke all their sessions and block login
- [ ] 2.6 Users page in `web`: table of users with role and status (admin-only `/users` route with a heading: done)
- [ ] 2.7 Create-agent dialog
- [ ] 2.8 Edit / deactivate actions
- [x] 2.9 Hide the admin navigation from agents (the Users item in the sidebar shows only for admins; `/users` sends agents home)
- [ ] 2.10 Tests: agents cannot reach user endpoints; a deactivated user cannot log in

**Done when:** the admin creates an agent, the agent logs in, the admin deactivates them, and the agent is logged out.

---

## Phase 3: Tickets Core

**Goal:** tickets exist and agents can browse, filter, view, and update them. Tickets are created manually or by seed data for now.

- [ ] 3.1 `Ticket` model: subject, status enum, category enum (nullable until classified), requester email and name, timestamps
- [ ] 3.2 `Message` model: ticket, direction (`inbound | outbound`), body (text + HTML), author (agent or student), email headers, timestamps
- [ ] 3.3 Mirror the status/category enums and ticket schemas in `packages/shared`
- [ ] 3.4 Seed script with sample tickets and messages for development
- [ ] 3.5 `GET /tickets`: pagination, filters (status, category, search on subject/requester), sorting (created, updated)
- [ ] 3.6 `GET /tickets/:id`: ticket with its messages
- [ ] 3.7 `PATCH /tickets/:id`: change status and category, enforcing allowed status transitions
- [ ] 3.8 Ticket list page: TanStack Table with server-side pagination, filtering, and sorting
- [ ] 3.9 Keep the list filters in the URL query string so filtered views can be shared and bookmarked
- [ ] 3.10 Ticket detail page: message thread, requester info, status and category controls
- [ ] 3.11 Status and category badges (shared component)
- [ ] 3.12 Tests: filter/sort queries, status transition rules

**Done when:** an agent can find a seeded ticket via filters, open it, read the thread, and change its status.

---

## Phase 4: Email Integration

**Goal:** real emails create tickets, and agents reply by email from the app.

- [ ] 4.1 Set up a Postmark account, a support address, and inbound forwarding to a development tunnel (e.g. ngrok)
- [ ] 4.2 Set up pg-boss in a `JobsModule`
- [ ] 4.3 `POST /webhooks/email/inbound`: verify the webhook, store the raw payload, enqueue a job, and return 200 immediately
- [ ] 4.4 Inbound job: parse the email; create a new ticket or attach to an existing one using `In-Reply-To` / `References`
- [ ] 4.5 Reopen a `resolved` ticket when the student replies
- [ ] 4.6 Ignore duplicates (same `Message-ID`) and auto-replies (`Auto-Submitted` header, out-of-office)
- [ ] 4.7 Store attachments as metadata only for now; downloading them comes later
- [ ] 4.8 `POST /tickets/:id/replies`: save an outbound message and enqueue sending
- [ ] 4.9 Outbound job: send through Postmark with correct threading headers, with retries
- [ ] 4.10 Configure SPF/DKIM for the sending domain
- [ ] 4.11 Reply composer on the ticket detail page
- [ ] 4.12 Tests: new email → ticket, reply → same ticket, duplicate ignored

**Done when:** an email to the support address shows up as a ticket, the agent replies from the app, the student receives it, and the student's reply lands in the same ticket.

---

## Phase 5: AI Classification & Summaries

**Goal:** every new ticket is classified and summarized automatically.

- [ ] 5.1 `AiModule` with an Anthropic client (`claude-opus-5-5`); API key loaded from config
- [ ] 5.2 Define the structured output schema: `category` (enum), `summary`, `draft_reply`
- [ ] 5.3 Write the system prompt for classification and summarization
- [ ] 5.4 AI job: runs after a ticket is created; saves the category and summary on the ticket
- [ ] 5.5 Handle failures: retries, refusals, timeouts; leave the ticket unclassified rather than blocking it
- [ ] 5.6 Log the model, token usage, and latency for each AI call (for cost tracking)
- [ ] 5.7 Re-run the summary when new messages arrive on a ticket
- [ ] 5.8 Show the AI summary on the ticket detail page
- [ ] 5.9 Mark categories set by the AI vs. by an agent; agent corrections are kept
- [ ] 5.10 Build a small evaluation set (around 30 sample emails with expected categories) and a script that measures classification accuracy

**Done when:** a new email becomes a ticket that is categorized and summarized within seconds, and classification accuracy is measured.

---

## Phase 6: Knowledge Base & Suggested Replies

**Goal:** the AI drafts replies grounded in the knowledge base, and agents edit and send them.

- [ ] 6.1 `KnowledgeBaseArticle` model: title, body (Markdown), `isPublished`, timestamps
- [ ] 6.2 CRUD endpoints for articles (admin only for edits; agents can read)
- [ ] 6.3 Knowledge base admin page: list, create, edit, and preview articles
- [ ] 6.4 Build the system prompt from published articles, with prompt caching on the knowledge base block
- [ ] 6.5 Extend the AI job to produce `draft_reply` using the knowledge base
- [ ] 6.6 Instruct the model to say when the knowledge base has no answer instead of guessing; flag those tickets
- [ ] 6.7 Show the draft reply in the reply composer, ready to edit
- [ ] 6.8 "Regenerate draft" button (enqueues a new AI job)
- [ ] 6.9 Track whether an agent sent the draft unchanged, edited it, or discarded it (a signal for reply quality)
- [ ] 6.10 Check prompt caching works: `cache_read_input_tokens` > 0 on repeated calls
- [ ] 6.11 Extend the evaluation set to cover reply quality on sample tickets

**Done when:** an agent opens a new ticket and finds a knowledge-base-grounded draft they can send with one click or edit first.

---

## Phase 7: Dashboard

**Goal:** an overview of ticket volume and team performance.

- [ ] 7.1 `GET /dashboard/stats`: counts by status and category, tickets created per day
- [ ] 7.2 Response-time metrics: time to first reply, time to resolve
- [ ] 7.3 AI metrics: share of drafts sent unchanged / edited / discarded; share of tickets flagged as having no knowledge base answer
- [ ] 7.4 Dashboard page: stat tiles and charts
- [ ] 7.5 Date range filter
- [ ] 7.6 Clicking a stat opens the ticket list with that filter applied

**Done when:** the dashboard shows accurate numbers that match the ticket list.

---

## Phase 8: Automatic Responses (optional, behind a setting)

**Goal:** low-risk tickets get an AI reply without waiting for an agent.

- [ ] 8.1 Settings model and admin page: enable auto-reply per category (refund requests excluded by default)
- [ ] 8.2 Add a `confidence` field and an `escalate` flag to the AI output schema
- [ ] 8.3 Auto-send only when enabled for the category, confidence is high, and the AI did not flag escalation
- [ ] 8.4 Delay before sending (e.g. 5 minutes) so an agent can step in
- [ ] 8.5 Mark auto-sent replies in the thread; include a "reply to reach a human" line in the email
- [ ] 8.6 Auto-sent tickets move to `resolved`; a student reply reopens them for an agent
- [ ] 8.7 Audit log of every automatic send

**Done when:** a simple general question gets a correct automatic reply, and a refund request never does.

---

## Phase 9: Production Readiness & Deployment

**Goal:** the system is deployed, secured, and observable.

- [ ] 9.1 Dockerfile(s) for the API (with workers) and the static web build
- [ ] 9.2 Provision managed Postgres and the hosting service; set production secrets
- [ ] 9.3 Run migrations and the admin seed in the deploy pipeline
- [ ] 9.4 Point the Postmark inbound webhook at production
- [ ] 9.5 Security pass: CSRF protection for cookie auth, security headers (helmet), CORS, input size limits
- [ ] 9.6 Structured logging and error tracking (e.g. Sentry)
- [ ] 9.7 Database backups
- [ ] 9.8 Playwright end-to-end tests for the main flows: login, manage agents, receive email, reply
- [ ] 9.9 Data retention and privacy review for student data sent to the AI provider
- [ ] 9.10 README: local setup, environment variables, deployment steps

**Done when:** production receives real support email and the team uses it day to day.

---

## Suggested Order & Milestones

| Milestone               | Phases | Result                                            |
| ----------------------- | ------ | ------------------------------------------------- |
| **M1: Skeleton**        | 0–2    | Logged-in app with user management                |
| **M2: Usable helpdesk** | 3–4    | Real email in and out; can replace a shared inbox |
| **M3: AI-assisted**     | 5–6    | Auto-classification, summaries, suggested replies |
| **M4: Insight**         | 7      | Dashboard                                         |
| **M5: Automation**      | 8–9    | Optional auto-replies; production launch          |

Phases 7 and 8 are independent of each other and can run in parallel or swap order. Phase 9 tasks such as the Dockerfile and error tracking can start earlier if you want a staging environment from M1.
