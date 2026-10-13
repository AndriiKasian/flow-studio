---
name: baseline-audit
description: Perform a repository-wide architecture, code quality, security, and test coverage audit of AI Flow Studio.
disable-model-invocation: true
---

# Baseline Architecture Audit

Perform a comprehensive, read-only audit of the entire AI Flow Studio repository.

## Preparation

1. Read `CLAUDE.md`.
2. Inspect the repository structure and relevant configuration.
3. Delegate architecture analysis to the `architecture-reviewer` subagent when available.

## Scope

Review:

- Frontend architecture, React hooks, state management and rendering performance.
- Backend architecture, Express routes, services and execution engine.
- Shared contracts, validation and duplicated domain logic.
- SSE lifecycle, cancellation, cleanup and potential race conditions.
- Prisma, PostgreSQL and data access patterns.
- Security, authentication boundaries and input validation.
- Unit and integration tests.
- GitHub Actions CI.

## Rules

- Read-only. Do not modify files.
- Do not install dependencies.
- Do not suggest abstractions without a demonstrated benefit.
- Do not recommend `useMemo` or `useCallback` without a concrete reason.
- Do not report speculative issues as confirmed bugs.
- Inspect related files before reporting a finding.

## Report

For every finding provide:

- Severity: P0, P1, P2 or P3.
- File path and line number.
- Problem and supporting evidence.
- Impact.
- Minimal recommended fix.
- Confidence level.

Group recommendations into:

1. Fix now.
2. Next development slice.
3. Backlog.

Finish with:

- Areas inspected.
- Checks actually executed.
- Areas not inspected.
- Overall assessment.