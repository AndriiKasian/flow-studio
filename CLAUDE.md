# Flow Studio

Flow Studio is a visual workflow builder for configuring and executing AI-powered workflows. The project is under active development.

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
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── styles/
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

The current Flow Editor supports:

- dynamic `/workflows/[id]` routing and workflow loading via `GET /flows/:id`;
- not-found handling for missing workflows;
- a full-screen editor with node-library sidebar;
- six node UIs with editable configuration;
- React Flow pan, zoom, drag-and-drop, connection and deletion;
- typed connections and shared validation;
- saving/loading the graph, importing/exporting JSON;
- running the current unsaved graph with SSE execution visualization;
- Reset Execution and confirmation-based Clear Canvas;
- synchronized light/dark theme behavior.

The workflows dashboard and editor route are dynamically rendered on demand because workflow data is runtime API data and must not be fetched during the Next.js production build.

## Testing

Use tests for behavior that provides meaningful regression protection.

Do not add tests merely to increase test count.

Backend API behavior is tested with Vitest and Supertest.

Integration tests belong to the corresponding backend feature, usually in its `__tests__` directory.

Test source files may be part of the TypeScript project for type checking and linting, but API test execution must be scoped to source test files so compiled test artifacts are not executed a second time.

Current Flow integration coverage includes:

- successful flow creation;
- rejection of an empty flow name;
- normalization of a missing description to `null`;
- retrieval of a created flow through the flow list endpoint;
- flow updates;
- flow deletion;
- ordering flows by most recently updated.

Frontend Vitest tests already cover shared workflow graph behavior. Extend tests for critical runtime state, SSE handling, and regression-prone logic as needed.

## Quality Gate

Before considering a feature slice complete, run the relevant tests and repository checks.

Current commands from repository root:

```bash
pnpm -r --if-present test
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build:api
```

Do not claim a slice is complete before relevant tests and checks pass.

If a check fails, fix the underlying issue rather than suppressing the rule unless the rule itself is demonstrably inappropriate.

## Current Product State (October 2026)

Implemented: workflow CRUD and PostgreSQL persistence, React Flow editor, six configurable node UIs, node palette and typed connections, shared graph validation, JSON import/export, Text Input / Prompt Template / Text Transform / Text Output executors, Prompt Template dynamic input ports with stable IDs and inactive connection preservation, execution of the current unsaved canvas graph, disconnected-node exclusion, fail-fast execution with skipped remaining nodes, SSE streaming, canvas node/edge statuses, client-side animation, runtime Text Output results, Reset Execution, and Clear Canvas. Execution outputs and status are ephemeral and must never be persisted with graph data.

Not yet implemented: User Input runtime execution (its node UI and shared data schema exist), LLM provider execution (its node UI and shared data schema exist), authentication (email/password and Google OAuth), Redis-based LLM rate limiting, public deployment. The V1 roadmap remains: node configuration; workflow execution with branching; SSE/canvas visualization; LLM; authentication; deployment/CI; tests/UX/README/demo. Earlier stages may be refined, but do not reorder or silently remove roadmap stages.

There is no right-hand Execution Monitor / Node Details panel in V1. Show execution state on canvas, Text Output results in its node, and errors in toast. Do not reintroduce a monitor without an explicit product decision.

## Flow Editor Direction

The V1 node set is intentionally limited to six node types:

- User Input (UI/configuration exists; runtime executor pending);
- Text Input;
- Prompt Template;
- LLM (UI/configuration exists; provider executor pending);
- Text Transform;
- Text Output.

The node library groups these into Input, AI, Transform, and Output categories. Avoid expanding the node model prematurely.

### Execution Architecture and Visualization

- Run executes the current unsaved canvas graph; Save/Export persist graph configuration only.
- The API validates the graph, builds an execution subgraph excluding isolated nodes, sorts it topologically, and dispatches executors through the existing executor registry. Do not introduce a node-type switch/case dispatch or scattered manual registrations.
- Connected components can run independently, but execution is fail-fast: a failed node stops the run and marks subsequent scheduled nodes skipped. An all-isolated graph cannot run.
- `WorkflowExecutionEvent` is a shared contract in `packages/shared`. The backend emits `flow:start`, `node:start`, `node:stop` (including outputs for completed nodes), and `flow:stop`. Do not invent `node:delta` as already implemented.
- Frontend execution state and animation are ephemeral. Runtime status and outputs are applied to display-only node/edge projections, not persisted graph nodes.
- Node statuses are `idle`, `running`, `completed`, `failed`, `skipped`. The frontend owns minimum animation timing; backend must not add fake delays.
- Text Output displays runtime `outputs.result`; Reset Execution and a new Run reset runtime state without erasing node configuration.
- Clear Canvas requires confirmation and removes all nodes and edges locally. It does not persist until Save; reloading without saving restores the last persisted graph. Disable Clear Canvas when the canvas is empty, while running, or while saving.
- Import validates JSON against the shared workflow graph schema. Import into an empty canvas applies immediately; importing into a non-empty canvas requires confirmation. Import does not automatically save. Export serializes the current graph configuration, not runtime execution results.
- Prefer focused hooks and pure helpers to a monolithic workflow editor, but do not extract abstractions solely to reduce line count.

## Claude Code Review Workflow

- Before a substantial change, inspect existing code, dependency versions, schemas, and tests. Do not assume the repository matches old notes.
- Use `/review-changes` after significant changes and before committing. It delegates the actual investigation to `architecture-reviewer` when available.
- The reviewer is read-only and returns findings; it must not automatically modify files.
- Review contracts end-to-end: `packages/shared` → API validation/execution → transport/SSE → frontend state → canvas/UI → tests.
- Identical domain validations used by frontend and backend must have a single platform-independent implementation in `packages/shared`; keep HTTP and UI-specific logic local.
- Prefer clear, cohesive modules. Flag oversized files only when they have mixed responsibilities or demonstrable maintenance cost; do not impose arbitrary line limits.
- Flag stale closures, race conditions, missing effect cleanup, SSE cancellation bugs, avoidable expensive rerenders, unsafe inputs, secret leakage, and missing meaningful tests.
- Recommend memoization and design patterns only when there is a concrete benefit. Avoid premature abstractions and speculative refactors.
- Classify findings P0 (critical), P1 (high), P2 (medium), P3 (low); include file:line, evidence, impact, and the smallest coherent fix. Distinguish verified defects from risks and suggestions. If there are no findings, say so.
- Prefer deterministic checks: `pnpm typecheck`, `pnpm lint`, `pnpm -r --if-present test`, then builds when appropriate. Report checks actually run, never claim unrun checks passed.

## Development Continuity

- Work incrementally and inspect the actual files before editing. Preserve settled architectural and product decisions; distinguish an agreed decision from a new proposal.
- When supplying code changes for review, prefer the complete updated file with its repository path, one file at a time.
- Verify implementation with relevant automated checks and manual scenarios, then run read-only `/review-changes`, resolve material findings, and only then commit/push.
- Do not claim an implementation is tested or deployed without evidence.

## Commands

From repository root:

- `pnpm dev:web` — start Next.js
- `pnpm dev:api` — start Express API
- `pnpm lint` — run current lint checks
- `pnpm typecheck` — run current TypeScript checks
- `pnpm -r --if-present test` — run workspace tests
- `pnpm build:web` — build the web application
- `pnpm build:api` — build the API
