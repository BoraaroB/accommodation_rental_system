---
name: verify-docs
description: Verify a library API, CLI flag, config option or version against the official documentation for the version pinned in this repo. Use before writing code that relies on a third-party API that has not been verified in this session.
argument-hint: '[library] [api, option or question]'
context: fork
agent: docs-researcher
---

Verify in the official documentation: $ARGUMENTS

1. Find the pinned version: the `package.json` of the relevant workspace, otherwise "Pinned versions" in `CLAUDE.md`.
2. Use the official sources listed in `${CLAUDE_SKILL_DIR}/reference.md`. Prefer versioned documentation pages. For versions, peer dependencies and engines use the npm registry manifest `https://registry.npmjs.org/<package>/<version>`.
3. Report briefly:
   - ✓ Verified — the fact, an exact quote, the URL.
   - ✗ Contradicts the plan or the code — what and where.
   - ? Not confirmed — what could not be found.

Never fill a gap from memory. "Not confirmed" is a valid answer.
