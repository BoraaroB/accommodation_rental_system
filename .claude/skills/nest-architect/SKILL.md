---
name: nest-architect
description: Design or review the NestJS structure of apps/api — modules, dependency injection, interfaces at boundaries, extensibility, readability. Use before implementing an API feature (design) and after implementing it (review).
argument-hint: '[design|review] [feature, endpoints or files]'
context: fork
agent: nestjs-architect
---

Task: $ARGUMENTS

- `design <feature>`: propose the module map, file tree, DI graph, request flow and tests for the feature, within the scope in `docs/implementation-plan.md` and following the "Structure" section of `.claude/rules/api.md`.
- `review [files]`: review the code under `apps/api/src` and `apps/api/test` (or the files named) against the "Structure" section of `.claude/rules/api.md`, including missing contracts at boundaries and over-abstraction.

Answer in the format your agent instructions define for that mode.
