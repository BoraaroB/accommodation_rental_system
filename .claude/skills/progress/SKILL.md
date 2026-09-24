---
name: progress
description: Summarize where the project stands from docs/progress.md — current feature and step, next step, what is waiting on the user, open questions and how many features are done. Read-only. Use at the start of a session or when asked about status or progress.
allowed-tools: Read Bash(git log *) Bash(git status *)
---

Read `docs/progress.md` (and the current feature's file in `docs/features/` if needed). Check the local git state with `git status -sb` and `git log --oneline --merges main`, and compare it with the tracker: is the last finished feature's branch merged into `main`? Do not modify any file and do not run any other git command.

Answer in the user's language, in at most ~10 lines:

- Current feature (number, name, branch) and its status
- Current step and next step, from the checklist
- Blocked / waiting on the user
- Open questions
- Done: features `PR merged` out of 15 (with a percentage), plus features `committed` or `done – awaiting commit`
- Whether the next feature may start: only if the previous feature's merge is visible in `git log --merges main`; if the tracker and git disagree, say so
