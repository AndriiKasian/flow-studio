# Flow Studio

Flow Studio is a visual AI workflow builder built as a TypeScript monorepo. It provides a React Flow editor, PostgreSQL persistence, a graph execution engine, and live execution feedback through Server-Sent Events (SSE).

> **Status (October 2026):** Under active development. Four node types execute; User Input and LLM have configurable UIs but do not yet have runtime executors. This is not a deployed public demo.

## Implemented Features

- Workflow dashboard: create, list, rename/update, delete, and open persisted workflows.
- Visual editor: drag-and-drop nodes, configure fields, connect typed handles, move/delete nodes and edges, pan/zoom, light/dark themes.
- Save/load workflow graphs in PostgreSQL through the Express API and Prisma.
- JSON export and Zod-validated import. Import replaces an empty canvas immediately, or asks for confirmation when the canvas contains nodes/edges. Import is **not** automatically saved.
- **Run** executes the current canvas graph, including unsaved changes, through an SSE endpoint.
- Graph validation, topological execution ordering, exclusion of isolated nodes, fail-fast errors, and skipped remaining nodes.
- Live node and edge statuses (`idle`, `running`, `completed`, `failed`, `skipped`), animated transitions, and runtime results in Text Output nodes.
- **Reset Execution** removes runtime highlights/results without changing node configuration.
- **Clear Canvas** removes nodes and edges after confirmation. This is local until **Save**; reloading without saving restores the persisted graph. The button is disabled on an empty canvas and during save/run.
- Shared Zod schemas and TypeScript contracts between frontend and backend.
- Automated tests and GitHub Actions CI (lint, typecheck, tests, web/API builds).

### V1 Node Types

| Node | Editor UI | Runtime execution |
| --- | --- | --- |
| User Input | Available | **Pending** |
| Text Input | Available | Implemented |
| Prompt Template | Available | Implemented |
| LLM | Available | **Pending** |
| Text Transform | Available | Implemented |
| Text Output | Available | Implemented |

Prompt Template supports dynamic named input ports. Text Transform supports trim, uppercase, and lowercase operations. LLM model options shown in the editor are configuration UI only, **not live provider integrations**.

## Architecture

```text
flow-studio/
├── apps/
│   ├── web/                 # Next.js / React editor
│   └── api/                 # Express API, execution engine, Prisma
├── packages/
│   └── shared/              # Shared Zod schemas, contracts, types
├── .github/workflows/ci.yml
├── .claude/                 # Claude Code agents and skills
├── compose.yml             # Local PostgreSQL
├── CLAUDE.md               # Engineering and review guidelines
├── package.json
└── pnpm-workspace.yaml
```

Development follows **vertical slices**: implement and verify a feature across the layers it actually needs. Domain contracts shared by frontend and API live in `packages/shared`, rather than being duplicated.

### Stack

- **Web:** Next.js (App Router), React, TypeScript, React Flow (`@xyflow/react`), Tailwind CSS, shadcn/ui, Radix UI, React Hook Form, Zod, next-themes.
- **API:** Node.js, Express 5, TypeScript, PostgreSQL, Prisma 7, Zod.
- **Execution:** graph validation, topological sorting, executor registry, SSE, frontend runtime state/animation.
- **Tooling:** pnpm workspaces, Docker Compose, Vitest, Supertest, ESLint, GitHub Actions, Claude Code.

### Workflow execution

```text
Current React Flow canvas (including unsaved edits)
    ↓
Next.js execution stream route
    ↓
Express POST /flows/:id/execute/stream
    ↓
Shared graph validation → execution graph → topological ordering
    ↓
Registered node executors
    ↓
SSE events: flow:start, node:start, node:stop, flow:stop
    ↓
Frontend node/edge statuses + Text Output runtime results
```

Runtime execution results and status are **not saved** with workflow graph configuration. The existing `POST /flows/:id/execute` endpoint executes the stored graph; the stream endpoint accepts the current graph in its request body.

## Local Development

### Requirements

- Node.js and pnpm (the repository specifies pnpm `12.8.1`; CI uses Node.js `22.15.0`).
- Docker with Compose for PostgreSQL, or a compatible local PostgreSQL instance.

### Install

```bash
pnpm install
```

### Database

```bash
docker compose up -d
pnpm --filter @flow-studio/api exec prisma generate
pnpm --filter @flow-studio/api exec prisma migrate dev
```

The API requires `DATABASE_URL` (for example in `apps/api/.env`), and the Next.js application requires server-side `API_URL` (for example in `apps/web/.env.local`). For the local Compose database and default API port, use:

```dotenv
# apps/api/.env — local development only
DATABASE_URL="postgresql://flow_studio:flow_studio@localhost:5432/flow_studio"
```

```dotenv
# apps/web/.env.local — local development only
API_URL="http://localhost:3001"
```

These credentials match the repository's **local development** Compose configuration, not a production setup. **Do not commit `.env` files or secrets.** API integration tests additionally use a `TEST_DATABASE_URL` when run against PostgreSQL.

### Start the applications

In separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Default local addresses:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

The API and database need to be available for workflow persistence and execution.

## Using the Editor

1. Create a workflow on the dashboard and open it.
2. Add nodes from the sidebar, edit their fields, and connect compatible handles.
3. Click **Save** to persist the graph; **Export** downloads the current graph as JSON.
4. Click **Import** to load a valid graph. Existing canvas content requires confirmation; imported changes remain unsaved until **Save**.
5. Click **Run** to execute the current canvas. Follow statuses on nodes/edges and view output in Text Output.
6. Use **Reset Execution** to clear runtime results, or **Clear Canvas** (with confirmation) to remove the graph locally.

Only Text Input, Prompt Template, Text Transform, and Text Output currently have executors. Runs requiring User Input or LLM execution cannot complete successfully yet.

## Checks and Tests

From the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm -r --if-present test
pnpm build:web
pnpm build:api
```

The repository includes shared schema/connection tests, frontend workflow utility tests, API execution unit tests, and API integration tests. The GitHub Actions workflow runs these checks with a PostgreSQL service and applies Prisma migrations to its test database.

## Current Status and Roadmap

The current workflow editor, persistence, execution engine, SSE visualization, and editor actions are implemented. The project remains under active development; in particular, the **User Input runtime executor** and **LLM provider execution** are not implemented.

The agreed V1 roadmap order is:

1. Node Configuration.
2. Workflow Execution Engine with branching.
3. SSE & canvas execution visualization.
4. LLM integration.
5. Authentication (email/password and Google OAuth).
6. Deployment and CI (Vercel/Railway/PostgreSQL; GitHub Actions CI already exists).
7. Tests, UX, README, and public demo.

Earlier stages may be refined as work progresses; the list describes the planned delivery order, **not** a claim that every stage is fully complete. Authentication, public deployment, and live LLM execution are not yet available.
