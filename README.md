# Flow Studio

Flow Studio is a visual workflow builder for creating, connecting, executing, and monitoring AI-powered workflows.

> The project is currently under active development.

## Current Features

- Visual workflow application foundation
- Next.js frontend
- Express API
- Shared type-safe contracts between frontend and backend
- API health endpoint
- Strict TypeScript configuration
- ESLint quality checks

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

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript

### Shared

- TypeScript contracts
- Shared types between frontend and backend

### Tooling

- pnpm Workspaces
- ESLint
- Claude Code

## Development

### Install dependencies

```bash
pnpm install
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

### API health check

```text
GET /health
```

Example response:

```json
{
  "status": "ok"
}
```

## Quality Checks

Run frontend linting:

```bash
pnpm lint
```

Run API type checking:

```bash
pnpm typecheck
```

Build the frontend:

```bash
pnpm build:web
```

Build the API:

```bash
pnpm build:api
```

## Project Status

Flow Studio is being developed incrementally.

The current foundation includes the frontend application, backend API, shared type-safe contracts, development tooling, and initial code-quality rules.

Architecture, persistence, authentication, workflow execution, real-time monitoring, testing, security, CI/CD, and deployment will be documented as they are implemented.