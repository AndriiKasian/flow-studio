# Flow Studio

Flow Studio is a visual workflow builder for creating and executing AI-powered workflows.

## Project Structure

- `apps/web` — Next.js frontend
- `apps/api` — Express backend
- `packages/shared` — shared contracts, schemas, and types used by web and API

The project is a pnpm monorepo.

## Engineering Principles

- Prefer simple solutions and introduce complexity only when it solves a real problem.
- Do not introduce new libraries or infrastructure without a clear use case.
- Keep frontend, backend, and shared contracts clearly separated.
- Shared API contracts belong in `packages/shared`.
- TypeScript must remain strict. Do not use `any` to bypass typing problems.
- Fix root causes rather than masking symptoms.
- Do not modify unrelated code.
- Do not expose or commit secrets or credentials.
- Organize backend code by feature rather than by technical layer.
- Keep HTTP concerns in controllers and database access/business logic in services.
- Do not add architectural layers unless they solve a concrete problem.
- Database schema changes must be tracked through Prisma migrations.
- Prefer existing project conventions over introducing alternative patterns for the same problem.
- Do not replace working architecture merely because another approach is also valid.

## Development Strategy

Develop Flow Studio using vertical slices.

Do not build the entire backend first and then rebuild or retrofit the frontend later.

A feature should normally be implemented through the layers it actually needs:

```text
Frontend
   ↓
Express API
   ↓
Shared contracts
   ↓
Service
   ↓
Prisma
   ↓
PostgreSQL
```

Execution-related features will additionally involve:

```text
Frontend
   ↓
Execution API
   ↓
Execution engine
   ↓
SSE
   ↓
Frontend execution state
```

Complete and verify one useful product slice before expanding into unrelated infrastructure.

## Existing Frontend Reference

The old AI-Prompt-Chain frontend is a functional reference, not code that must automatically be copied.

Before implementing a major Flow Studio frontend block:

1. inspect the corresponding implementation in the old project;
2. understand its behavior and responsibilities;
3. explicitly decide what should be:
   - reused;
   - adapted/refactored;
   - rewritten;
   - deleted.

Do not blindly port legacy implementation details.

Preserve useful behavior while allowing the new application to have a cleaner architecture.

## AI-Assisted Development

Claude is an engineering assistant and reviewer, not the owner of architectural decisions.

When reviewing code:

- identify concrete problems and explain why they matter;
- distinguish correctness issues from optional improvements;
- avoid speculative optimization;
- do not automatically rewrite working code unless explicitly asked.

Prefer deterministic tooling for checks that do not require reasoning:

- TypeScript for type safety;
- ESLint for static rules;
- tests for behavior;
- build tools for build correctness.

Before proposing structural changes, inspect the relevant existing implementation and configuration.

Do not guess about code that can be inspected.

Avoid chains of speculative configuration changes. Determine the root cause first and make the smallest coherent change.

## Current Architecture

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- next-themes
- React Flow (`@xyflow/react`)

Frontend code is organized primarily around application features.

Current structure includes:

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

Use `components/ui` for reusable UI primitives.

Use `components/layout` for application-wide layout components.

Keep feature-specific UI and behavior inside `features/<feature>`.

Do not move feature-specific logic into global component directories without a concrete reuse case.

Keep Server Components as the default.

Move client boundaries down to the interactive parts of a feature rather than making an entire page or card a Client Component unnecessarily.

Interactive controls such as workflow action menus and React Hook Form dialogs may be Client Components while their surrounding workflow cards remain Server Components.

The Flow Editor page and its non-interactive shell should remain Server Components.

The React Flow canvas is a focused Client Component boundary because canvas interaction requires client-side state and browser interaction.

### Forms

Use React Hook Form for non-trivial application forms.

Do not implement field state manually with multiple `useState` calls when React Hook Form already solves the problem.

Use shared Zod schemas where frontend and API validate the same contract.

Prefer deriving TypeScript types from Zod schemas rather than manually duplicating matching interfaces.

When a Zod schema transforms its input, distinguish between:

```text
z.input<typeof schema>
```

and:

```text
z.output<typeof schema>
```

when required by form/resolver typing.

### Theme

Light and dark theme support is a required product feature.

Do not remove or design away dark-mode capability.

Use theme tokens and CSS variables rather than hardcoded one-theme colors.

New components must work coherently in both light and dark themes.

The approved visual references guide styling, but theme support remains first-class.

React Flow must follow the application's resolved `next-themes` theme rather than independently following the operating-system theme.

The application may initially follow the system theme, while manual light/dark selection remains supported.

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod runtime validation
- Feature-based modules
- Route → Controller → Service → Prisma separation

Backend features should remain grouped by domain.

For example:

```text
flows/
├── flow.routes.ts
├── flow.controller.ts
├── flow.service.ts
└── flow.integration.test.ts
```

Routes define HTTP routing.

Controllers handle HTTP concerns such as request parsing, validation, status codes, and responses.

Services contain application/database operations.

Do not introduce repository, use-case, manager, or similar layers unless the application develops a concrete need for them.

### Shared

`packages/shared` contains contracts shared between frontend and backend.

The package currently exposes TypeScript source directly to workspace consumers.

Do not require a separate shared-package build during normal development unless the architecture is intentionally changed.

Shared contracts should use Zod when runtime validation is required.

Derive TypeScript types from those schemas.

The goal is:

```text
one contract
   ↓
runtime validation
   +
TypeScript types
   ↓
web + API
```

Do not create separate frontend and backend versions of the same API schema without a concrete reason.

### Flow Domain

The current shared Flow contract includes:

- flow response schema;
- create-flow schema;
- update-flow schema;
- derived TypeScript types.

The current API supports:

- create flow;
- list flows;
- get flow by ID;
- update flow;
- delete flow.

The current frontend supports:

- displaying persisted workflows;
- creating workflows through a dialog;
- editing workflow name and description;
- deleting workflows through a confirmation dialog;
- client-side form validation using shared Zod contracts;
- refreshing the workflow list after mutations;
- ordering workflows by `updatedAt` descending;
- opening persisted workflows in the Flow Editor.

The current Flow Editor foundation supports:

- dynamic `/workflows/[id]` routing;
- loading workflow metadata through `GET /flows/:id`;
- not-found handling for missing workflows;
- a full-screen editor shell;
- a node-library sidebar foundation;
- an interactive React Flow canvas;
- pan and zoom;
- canvas background and controls;
- synchronized light/dark theme behavior.

The workflows dashboard and editor route are dynamically rendered on demand because workflow data is runtime API data and must not be fetched during the Next.js production build.

## Testing

Use tests for behavior that provides meaningful regression protection.

Do not add tests merely to increase test count.

Backend API behavior is tested with Vitest and Supertest.

Integration tests belong next to the corresponding backend feature.

Test source files may be part of the TypeScript project for type checking and linting, but API test execution must be scoped to source test files so compiled test artifacts are not executed a second time.

Current Flow integration coverage includes:

- successful flow creation;
- rejection of an empty flow name;
- normalization of a missing description to `null`;
- retrieval of a created flow through the flow list endpoint;
- flow updates;
- flow deletion;
- ordering flows by most recently updated.

Add frontend testing infrastructure when frontend behavior becomes complex enough to justify it; do not introduce a test stack solely for ceremonial coverage.

## Quality Gate

Before considering a feature slice complete, run the relevant tests and repository checks.

Current commands from repository root:

```bash
pnpm --filter @flow-studio/api test
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build:api
```

Do not claim a slice is complete before relevant tests and checks pass.

If a check fails, fix the underlying issue rather than suppressing the rule unless the rule itself is demonstrably inappropriate.

## Current Product Direction

Flow Studio is being built incrementally.

Current implemented foundation:

- pnpm monorepo;
- Next.js frontend;
- Express API;
- PostgreSQL;
- Prisma;
- shared Zod/TypeScript contracts;
- workflow CRUD API;
- workflow management dashboard;
- create, edit, and delete workflow flows;
- workflow ordering by most recently updated;
- dynamic workflow editor route;
- workflow loading by ID;
- full-screen Flow Editor shell;
- React Flow canvas;
- canvas pan, zoom, background, and controls;
- React Flow light/dark theme integration;
- React Hook Form integration;
- shadcn/ui foundation;
- light/dark theme support;
- backend integration tests.

Planned functionality includes:

- workflow nodes;
- Input / AI / Transform / Output node types for V1;
- node handles and connections;
- drag-and-drop node creation;
- node and edge persistence;
- workflow execution engine;
- SSE execution updates;
- live Execution Monitor;
- execution-aware node and edge visualization;
- authentication with email and Google;
- CI/CD;
- deployment.

Planned technologies or features must not be treated as already implemented.

## Flow Editor Direction

The old AI-Prompt-Chain Flow Editor has been inspected as a functional reference.

Useful concepts from the old implementation may be adapted, including:

- React Flow canvas behavior;
- node-library sidebar;
- drag-and-drop node creation;
- `screenToFlowPosition()`-style coordinate conversion;
- node and edge state;
- connection through handles;
- persisting node position after drag completion rather than on every movement;
- declarative node definitions;
- a shared visual node wrapper;
- field renderers;
- typed handles;
- canvas background and controls.

Do not blindly port the old architecture.

In particular, do not recreate legacy indirection such as a large global props provider or redundant wrapper layers unless the new application develops a concrete need for them.

The V1 node set is intentionally limited to:

- Input;
- AI;
- Transform;
- Output.

Avoid expanding the node model prematurely.

### Execution Visualization Direction

Workflow execution should be represented directly on the canvas using real execution state rather than decorative mock animation.

Planned execution states:

- `idle` — normal node and edge appearance;
- `running` — active node uses a brand-colored glow/pulse;
- `completed` — completed node uses a success accent/check;
- `failed` — failed node uses a destructive/error accent;
- `skipped` — skipped node is visually muted.

The edge currently carrying execution should be visually distinguishable and animated so execution can be followed through the graph.

Execution visualization should be driven by real backend SSE events such as:

```text
node:start
node:delta
node:stop
```

Those events should feed shared frontend execution state that drives:

```text
SSE
 ↓
Frontend execution state
 ├── canvas node state
 ├── active edge state
 └── Execution Monitor live logs
```

Execution effects should be polished in both themes, with particular attention to glow, motion, and contrast in dark mode.

Keep execution visualization functional and state-driven. Do not add fake execution animation that is disconnected from backend execution state.

## Commands

From repository root:

- `pnpm dev:web` — start Next.js
- `pnpm dev:api` — start Express API
- `pnpm lint` — run current lint checks
- `pnpm typecheck` — run current TypeScript checks
- `pnpm --filter @flow-studio/api test` — run API tests
- `pnpm build:web` — build the web application
- `pnpm build:api` — build the API