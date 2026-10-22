# Flow Studio

Flow Studio is a visual AI workflow builder built as a TypeScript monorepo. It provides a React Flow editor, PostgreSQL persistence, a graph execution engine, and live execution feedback through Server-Sent Events (SSE).

> **Status (October 2026):** Under active development and not yet publicly deployed. The deployment target is Vercel (web), Render (API) and Neon (PostgreSQL); see [Deployment](#deployment).

## Product Overview

- **Public workflow editor.** Workflows are shared and have no owner or login. At most **10 workflows** can exist at a time; creating another returns `409`.
- **Protected read-only Demo** at `/workflows/demo`. A fixed, server-defined workflow that visitors can run, with live SSE execution, but not edit: Text Input feeds Web Search and Prompt Template, the Prompt Template feeds the LLM, and the LLM result is shown in Text Output and JSON Output nodes.
- **Paid nodes are restricted in production.** LLM and Web Search are hidden from the production node library, and outside local development the API executes user workflows only when they contain free, deterministic nodes (Text Input, Prompt Template, Text Transform, Text Output, JSON Output) within bounded size (30 nodes, 60 edges, 12,000 JSON characters). The Demo is the only place paid nodes run in production.

## Implemented Features

- Workflow dashboard: create, list, rename/update, delete, and open persisted workflows (ordered by most recently updated).
- Visual editor: drag-and-drop nodes, configure fields, connect typed handles, move/delete nodes and edges, pan/zoom, light/dark themes.
- Save/load workflow graphs in PostgreSQL through the Express API and Prisma.
- JSON export and Zod-validated import. Import replaces an empty canvas immediately, or asks for confirmation when the canvas contains nodes/edges. Import is **not** automatically saved.
- **Run** executes the current canvas graph, including unsaved changes, through an SSE endpoint.
- Graph validation, topological execution ordering, exclusion of isolated nodes, fail-fast errors, and skipped remaining nodes.
- Live node and edge statuses (`idle`, `running`, `completed`, `failed`, `skipped`), animated transitions, and runtime results in Text Output nodes.
- **Reset Execution** removes runtime highlights/results without changing node configuration.
- **Clear Canvas** removes nodes and edges after confirmation. This is local until **Save**; reloading without saving restores the persisted graph.
- Shared Zod schemas and TypeScript contracts between frontend and backend.
- Automated tests and GitHub Actions CI (lint, typecheck, tests, web/API builds).

### V1 Node Types

| Node | Library category | Runtime execution | Production user workflows |
| --- | --- | --- | --- |
| User Input | Input | **Pending** (hidden from the node library) | — |
| Text Input | Input | Implemented | Allowed |
| Web Search (Serper) | Input | Implemented | Demo only |
| Prompt Template | AI | Implemented, dynamic input ports | Allowed |
| LLM (OpenAI) | AI | Implemented | Demo only |
| Text Transform | Transform | Implemented (trim, uppercase, lowercase) | Allowed |
| Text Output | Output | Implemented, shows runtime result | Allowed |
| JSON Output | Output | Implemented | Allowed |

Runtime execution results and status are **never saved** with the workflow graph.

### Abuse protections

Outside local development (`NODE_ENV` other than `development`/`test`):

- Workflow writes and executions: 30 requests per 15 minutes per visitor; reads are unrestricted.
- Demo runs: accepted only from the Next.js server (shared `TRUSTED_PROXY_SECRET`), 3 runs per 15 minutes per visitor, at most 2 concurrent runs, and a PostgreSQL-backed quota of 30 runs per day.
- Demo failures are shown with generic messages; unexpected errors are masked.

Rate limits and the demo concurrency cap are kept in memory and assume a **single API instance**.

## Architecture

```text
flow-studio/
├── apps/
│   ├── web/                 # Next.js editor and server-side API proxy routes
│   └── api/                 # Express API, execution engine, Prisma
├── packages/
│   └── shared/              # Shared Zod schemas, contracts, types (TypeScript source)
├── .github/workflows/ci.yml
├── compose.yml              # Local PostgreSQL
├── .node-version            # Node.js version for deployment platforms
├── CLAUDE.md                # Engineering and review guidelines
├── package.json
└── pnpm-workspace.yaml
```

Development follows **vertical slices**: implement and verify a feature across the layers it actually needs. Domain contracts shared by frontend and API live in `packages/shared`, rather than being duplicated.

### Stack

- **Web:** Next.js 16 (App Router), React 19, TypeScript, React Flow (`@xyflow/react`), Tailwind CSS, shadcn/ui, React Hook Form, Zod, next-themes.
- **API:** Node.js 22, Express 5, TypeScript, PostgreSQL, Prisma 7 (`prisma-client` generator with the `@prisma/adapter-pg` driver adapter), Zod, express-rate-limit, OpenAI SDK, Serper.
- **Execution:** graph validation, topological sorting, executor registry, SSE, frontend runtime state/animation.
- **Tooling:** pnpm workspaces, esbuild (API production bundle), Docker Compose, Vitest, Supertest, ESLint, GitHub Actions.

### Request flow

The browser never calls the API directly. All API traffic goes through the Next.js server, which holds `API_URL` and `TRUSTED_PROXY_SECRET`:

```text
Browser
    ↓
Next.js (Vercel): server components, server actions, /api/* proxy routes
    ↓  API_URL + trusted proxy headers (secret, visitor IP)
Express API (Render)
    ↓
Prisma + PrismaPg
    ↓
PostgreSQL (Neon)
```

### Workflow execution

```text
Current React Flow canvas (including unsaved edits)
    ↓
Next.js route POST /api/flows/:id/execute/stream   (demo: POST /api/demo/run)
    ↓
Express POST /flows/:id/execute/stream             (demo: POST /api/demo/run)
    ↓
Shared graph validation → execution graph → topological ordering
    ↓
Registered node executors
    ↓
SSE events: flow:start, node:start, node:stop, flow:stop
    ↓
Frontend node/edge statuses + Text Output runtime results
```

## Local Development

### Requirements

- Node.js 22 (see `.node-version`) and pnpm `12.8.1` (declared in `package.json`; `corepack enable` provides it).
- Docker with Compose for PostgreSQL, or a compatible local PostgreSQL instance.

### Install and configure

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The example files document every variable and contain only placeholders and local Compose credentials. **Do not commit `.env` files or secrets.**

### Database

```bash
docker compose up -d
pnpm --filter @flow-studio/api generate
pnpm --filter @flow-studio/api exec prisma migrate dev
```

The Compose credentials are for **local development only**.

### Start the applications

In separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

`pnpm dev:api` sets `NODE_ENV=development`, which relaxes production protections locally. To run LLM and Web Search nodes in your own local workflows, set `ALLOW_PAID_FLOW_NODES=true` and the provider keys in `apps/api/.env`. The Demo needs the provider keys but not `ALLOW_PAID_FLOW_NODES`.

## Checks and Tests

API integration tests require a separate `flow_studio_test` database, configured by `TEST_DATABASE_URL`. Create and migrate it once:

```bash
docker compose exec postgres createdb -U flow_studio flow_studio_test
DATABASE_URL="postgresql://flow_studio:flow_studio@localhost:5432/flow_studio_test" \
  pnpm --filter @flow-studio/api exec prisma migrate deploy
```

From the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm -r --if-present test
pnpm build:web
pnpm build:api
```

Tests cover shared schemas and graph rules, frontend workflow utilities, API execution units, and API integration behavior. GitHub Actions runs the same checks against a PostgreSQL service.

## Deployment

| Component | Platform | Source |
| --- | --- | --- |
| Web | Vercel | `apps/web` |
| API | Render (Web Service, Node) | `apps/api`, bundled to `apps/api/dist/index.js` |
| Database | Neon (PostgreSQL) | Prisma migrations in `apps/api/prisma/migrations` |

The API's rate limits and demo concurrency cap are in memory: run **one** Render instance.

### API on Render

| Setting | Value |
| --- | --- |
| Root Directory | *(repository root)* |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build:api` |
| Pre-Deploy Command | `DATABASE_URL="$DIRECT_DATABASE_URL" pnpm --filter @flow-studio/api migrate:deploy` |
| Start Command | `pnpm --filter @flow-studio/api start` |
| Health Check Path | `/api/demo/workflow` (static response, no database access) |
| Node.js version | From `.node-version` (`22.15.0`) |

`pnpm build:api` runs `prisma generate`, `tsc --noEmit`, and an esbuild bundle. `@flow-studio/shared` and the generated Prisma Client are bundled; npm packages load from `node_modules` at runtime. `prisma generate` does not need a database connection. `--prod=false` keeps build tools installed even if `NODE_ENV=production` is set.

Environment variables (see `apps/api/.env.example`):

| Variable | Production | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Required | Neon **pooled** connection string, used at runtime. |
| `DIRECT_DATABASE_URL` | Required for migrations | Neon **direct** connection string. Read only by the pre-deploy command above, not by the application. |
| `FRONTEND_URL` | Required | Vercel production origin (CORS). The API refuses to start without it. |
| `TRUSTED_PROXY_SECRET` | Required | Long random value, identical on Vercel. Without it the Demo returns `503`. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Required for the Demo | LLM node. |
| `SERPER_API_KEY` | Required for the Demo | Web Search node. |
| `PORT` | Provided by Render | Defaults to `3001` locally. |
| `NODE_ENV` | Leave unset | Production protections are on unless it is `development` or `test`. |
| `ALLOW_PAID_FLOW_NODES` | **Never set** | Local development only. |

### Database migrations on Neon

Neon provides two connection strings per branch:

- **Pooled** (host contains `-pooler`): goes through PgBouncer in transaction mode. Use it for the running API (`DATABASE_URL`).
- **Direct** (no `-pooler`): a dedicated PostgreSQL session. Use it for `prisma migrate deploy`, which relies on session-level features such as advisory locks that transaction pooling does not support.

The Prisma CLI reads `DATABASE_URL` through `apps/api/prisma7.config.ts`, so the pre-deploy command points it at the direct connection for that one command:

```bash
DATABASE_URL="$DIRECT_DATABASE_URL" pnpm --filter @flow-studio/api migrate:deploy
```

`migrate deploy` applies only committed migrations; it never creates migrations or resets data. Never run `prisma migrate dev` or `prisma migrate reset` against Neon. Render pre-deploy commands require a paid instance type; on the free tier, run the same command manually, from a trusted machine with the direct connection string, before deploying a release that contains new migrations.

### Web on Vercel

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/web`, with "Include files outside the root directory" enabled (for `packages/shared`) |
| Install / Build Command | Defaults (pnpm is detected from `pnpm-lock.yaml`; build runs `next build`) |
| Node.js version | 22.x (Project Settings → General) |

Environment variables (see `apps/web/.env.example`), all server-side only:

| Variable | Production | Notes |
| --- | --- | --- |
| `API_URL` | Required | Render service URL, e.g. `https://your-api.onrender.com`, without a trailing slash. |
| `TRUSTED_PROXY_SECRET` | Required | Same value as on the API. |

Vercel sets `NODE_ENV=production` during builds, which hides LLM and Web Search from the node library.

### Deployment order

1. Create the Neon project and note the pooled and direct connection strings.
2. Create the Render service with the settings above and a provisional `FRONTEND_URL`; the first deploy applies migrations.
3. Create the Vercel project with `API_URL` pointing at Render and the shared `TRUSTED_PROXY_SECRET`.
4. Update `FRONTEND_URL` on Render to the final Vercel origin and redeploy.

## Roadmap

The agreed V1 roadmap order is:

1. Node Configuration.
2. Workflow Execution Engine with branching.
3. SSE & canvas execution visualization.
4. LLM integration.
5. Authentication (email/password and Google OAuth).
6. Deployment and CI (Vercel web, Render API, Neon PostgreSQL; GitHub Actions CI already exists).
7. Tests, UX, README, and public demo.

Earlier stages may be refined as work progresses. Not yet implemented: User Input runtime execution, authentication, and public deployment.
