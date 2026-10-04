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

## Current Architecture

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:
- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod runtime validation
- Feature-based modules
- Route → Controller → Service → Prisma separation

Shared:
- TypeScript contracts via `@flow-studio/shared`

Planned technologies should not be treated as already implemented.

## Commands

From repository root:

- `pnpm dev:web` — start Next.js
- `pnpm dev:api` — start Express API
- `pnpm lint` — run current lint checks
- `pnpm typecheck` — run current TypeScript checks
- `pnpm build:web` — build the web application
- `pnpm build:api` — build the API