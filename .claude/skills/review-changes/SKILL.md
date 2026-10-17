---
name: review-changes
description: Review Flow Studio working-tree or staged changes before commit; trace frontend/backend/shared contracts, architecture, security, React/SSE correctness, and tests. Invoke with /review-changes.
argument-hint: "[optional scope or base branch]"
---

# Review changes

Perform an evidence-based, read-only review. Do not fix code or commit automatically.

## Scope

1. Read `CLAUDE.md` and inspect repository status.
2. Include staged, unstaged, and relevant untracked files. If `$ARGUMENTS` specifies a base branch or scope, honor it; otherwise review current uncommitted changes. If clean, ask whether to compare against a branch/commit or conduct a baseline audit.
3. Identify affected subsystems and follow dependencies beyond the diff as needed.
4. Before reviewing, explicitly state the selected scope (files/commit range) and confirm it corresponds to the current task; do not silently resume a previous review. If the diff contains unrelated changes, identify them separately.

## Delegate

Use the `architecture-reviewer` subagent through Claude Code's agent delegation when available. Give it the scope, the project rules, and the instruction to produce evidence-backed P0–P3 findings. If delegation is unavailable, perform the same review directly; do not claim a subagent ran.

## Required checks

- Behavior and edge cases; type safety and runtime validation.
- End-to-end shared contracts: Zod schemas, HTTP payloads, SSE events, frontend state.
- Clean boundaries: presentation vs feature logic vs backend service vs database; no duplicate cross-platform business validation.
- Code quality: naming, readability, focused responsibilities, predictable control flow, duplication, hidden side effects, and consistency with existing conventions.
- Decision quality: is the solution proportionate to the problem, is a simpler approach safer, are abstractions and dependencies justified? Give concrete evidence, not stylistic preferences.
- File cohesion, duplicated logic, unnecessary dependencies and abstraction.
- React Flow state separation: persisted graph vs ephemeral execution output/status.
- React effects, subscriptions, abort/cancel, stale results, rerenders and memoization only when justified.
- API security, secret handling, DB migrations, error paths, LLM limits where relevant.
- Meaningful unit/integration tests and regression risks.

## Report

List only actionable findings, ordered by P0/P1/P2/P3, each with exact file:line, evidence, impact, minimal fix, and confidence. Report which checks actually ran, tests missing, and any uncertainty. Separate functional defects from maintainability concerns; do not turn formatting preferences into P2/P3 findings. Explicitly state when no actionable findings are found.
