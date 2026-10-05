# Flow Studio

Flow Studio is a visual workflow builder for creating, connecting, executing, and monitoring AI-powered workflows.

> The project is currently under active development.

## Current Features

- Workflow management page
- Create workflow dialog
- Persistent workflows stored in PostgreSQL
- Next.js frontend
- Express API
- Shared type-safe contracts between frontend and backend
- Shared runtime validation with Zod
- React Hook Form for frontend forms
- shadcn/ui component foundation
- Light and dark theme support
- Strict TypeScript configuration
- ESLint quality checks
- Prisma schema and migrations
- Backend integration testing

Current flow API capabilities:

- Create flow
- List flows
- Get flow by ID
- Update flow
- Delete flow

## Architecture

Flow Studio is organized as a pnpm monorepo:

```text
flow-studio/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express API
├── packages/
│   └── shared/       # Shared contracts, schemas and types
├── CLAUDE.md
└── pnpm-workspace.yaml
```

Development follows a vertical-slice approach.

Features should be implemented end-to-end rather than completing an entire application layer in isolation.

For example:

```text
Frontend
   ↓
Express API
   ↓
Shared contract
   ↓
Prisma
   ↓
PostgreSQL
```

Execution features will additionally include the execution engine and SSE communication.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- next-themes

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod

### Shared

- TypeScript contracts
- Shared Zod schemas
- Shared types between frontend and backend

The `@flow-studio/shared` workspace package is consumed directly from TypeScript source during development.

Shared schemas define runtime validation and derive TypeScript types so frontend and backend can use the same contract without duplicating definitions.

### Tooling

- pnpm Workspaces
- ESLint
- Claude Code
- Docker Compose
- Vitest
- Supertest

## Frontend Structure

Frontend code is organized by responsibility:

```text
apps/web/src/
├── app/
├── components/
│   ├── layout/
│   └── ui/
├── features/
│   └── workflows/
│       ├── actions/
│       └── components/
├── lib/
└── providers/
```

Reusable UI primitives belong in `components/ui`.

Application-wide layout components belong in `components/layout`.

Feature-specific code belongs under `features/<feature>`.

## Theme

Flow Studio supports both light and dark themes.

Theme-aware components should use semantic theme tokens and CSS variables instead of hardcoded light- or dark-theme colors.

Both themes are treated as first-class product functionality.

## Forms and Validation

Frontend forms use React Hook Form.

Zod schemas from `@flow-studio/shared` are used as the validation contract where frontend and API share the same data shape.

The current create-workflow flow uses the same shared schema for:

- frontend form validation;
- TypeScript input/output types;
- API request validation.

## Development

### Install dependencies

```bash
pnpm install
```

### Database

Start PostgreSQL:

```bash
docker compose up -d
```

Apply database migrations:

```bash
pnpm --filter @flow-studio/api exec prisma migrate dev
```

Generate Prisma Client:

```bash
pnpm --filter @flow-studio/api exec prisma generate
```

### Start the frontend

```bash
pnpm dev:web
```

The frontend runs at:

```text
http://localhost:3000
```

### Start the API

```bash
pnpm dev:api
```

The API runs at:

```text
http://localhost:3001
```

Both applications should normally be running during feature development because features are implemented as vertical slices.

## Quality Checks

Run linting:

```bash
pnpm lint
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Run API integration tests:

```bash
pnpm --filter @flow-studio/api test
```

Build the frontend:

```bash
pnpm build:web
```

Build the API:

```bash
pnpm build:api
```

Before considering a feature slice complete, run the relevant tests and the repository quality checks.

## Current Workflow Slice

The current workflow management slice supports:

```text
Workflows page
      ↓
Create Workflow dialog
      ↓
React Hook Form + shared Zod schema
      ↓
Server action / API client
      ↓
Express /flows API
      ↓
Prisma
      ↓
PostgreSQL
```

Created workflows are persisted and displayed on the workflows page.

API integration tests currently cover:

- successful flow creation;
- invalid empty flow names;
- normalization of a missing description to `null`;
- retrieval of created flows.

## Project Status

Flow Studio is being developed incrementally using vertical slices.

The workflow management foundation is operational: the frontend can retrieve persisted workflows and create new workflows through the Express API.

The application also has shared contracts, PostgreSQL persistence, Prisma migrations, runtime validation, frontend form handling, light/dark theme support, and backend integration testing.

The visual Flow Editor, workflow nodes, workflow execution engine, SSE execution updates, authentication, CI/CD, and deployment will be documented as they are implemented.