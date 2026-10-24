# AI Flow Studio

## Overview

AI Flow Studio is a visual builder for AI-powered workflows, built as a TypeScript monorepo with Next.js, React Flow and an Express API. Workflows are designed on a canvas, persisted in PostgreSQL, and executed by a graph engine that streams per-node progress to the browser over Server-Sent Events (SSE).

**Live Demo:** https://flow-studio-lilac.vercel.app

## Demo & Screenshots

![AI Research Demo execution](docs/screenshots/ai-demo.gif)

*AI Research Demo: Web Search and LLM nodes executing with live status.*

| Workflow dashboard | Workflow editor |
| --- | --- |
| ![Workflow dashboard](docs/screenshots/dashboard.png) | ![Workflow editor](docs/screenshots/workflow-editor.png) |

| Text Transform error | Prompt Template error |
| --- | --- |
| ![Text Transform execution error](docs/screenshots/error-transform.png) | ![Prompt Template execution error](docs/screenshots/error-template.png) |

## Key Features

- **Visual workflow editor** — drag-and-drop node library, configurable nodes, typed connections, pan/zoom, light/dark themes.
- **Persistence and portability** — save/load workflows in PostgreSQL; schema-validated JSON import and export.
- **Graph execution engine** — runs the current canvas (including unsaved edits) in topological order and streams per-node statuses over SSE.
- **Error handling** — fail-fast execution with failed and skipped nodes highlighted on the canvas and actionable error messages.
- **Protected AI Demo** — a read-only, server-defined workflow using OpenAI (LLM) and Serper (Web Search), with rate limiting and a daily quota.
- **Public workflows** — user-created workflows are shared without accounts and limited to free, deterministic nodes.
- **Nodes** — Text Input, Prompt Template, Text Transform, Text Output and JSON Output; LLM and Web Search are available in the AI Demo.
- **Shared contracts** — one set of Zod schemas and types in `packages/shared`, used by both web and API.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, React Flow (`@xyflow/react`), Tailwind CSS, shadcn/ui, React Hook Form, Zod, next-themes |
| Backend | Node.js 22, Express 5, TypeScript, Zod, SSE, express-rate-limit |
| Database | PostgreSQL, Prisma 7 |
| AI integrations | OpenAI SDK, Serper |
| Testing & tooling | Vitest, Supertest, ESLint, pnpm workspaces, esbuild, Docker Compose, GitHub Actions |
| Deployment | Vercel (web), Render (API), Neon (PostgreSQL) |

## Getting Started

**Requirements:** Node.js 22 (`.node-version`), pnpm 12.8.1 (`corepack enable`), Docker with Compose (or a local PostgreSQL).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The `.env.example` files document every variable. Never commit `.env` files or secrets. OpenAI and Serper API keys are optional for local development and required only for AI-powered execution.

Start PostgreSQL and apply migrations:

```bash
docker compose up -d
pnpm --filter @flow-studio/api generate
pnpm --filter @flow-studio/api exec prisma migrate dev
```

Start the API and web app in separate terminals:

```bash
pnpm dev:api   # http://localhost:3001
pnpm dev:web   # http://localhost:3000
```

API integration tests need a separate `flow_studio_test` database. Create it once:

```bash
docker compose exec postgres createdb -U flow_studio flow_studio_test
DATABASE_URL="postgresql://flow_studio:flow_studio@localhost:5432/flow_studio_test" \
  pnpm --filter @flow-studio/api exec prisma migrate deploy
```

Run checks from the repository root:

```bash
pnpm -r --if-present test
pnpm lint
pnpm typecheck
pnpm build:web
pnpm build:api
```

## AI-Assisted Development

This project was built with Claude Code as an engineering assistant. I guided the product scope and architectural decisions, while Claude Code assisted with implementation, refactoring, testing and code reviews.

The workflow was iterative:

1. **Requirements** — define a small vertical slice (UI → API → shared contract → database or execution engine).
2. **Small changes** — implement it incrementally, guided by project conventions in [`CLAUDE.md`](CLAUDE.md).
3. **Code review** — review changes with a read-only reviewer agent and project skills in [`.claude/`](.claude/), checking shared contracts, React/SSE correctness, security and test coverage.
4. **Automated checks** — run tests, lint, typecheck and builds locally and in GitHub Actions.
5. **Manual validation** — verify behavior in the running app before committing.

AI suggestions were reviewed, adjusted or rejected like any other code contribution.
