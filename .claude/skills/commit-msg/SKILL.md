---
name: commit-msg
description: Propose a Conventional Commit message, a branch name and a PR title and description for the current changes. Never commits. Use at the end of a feature, after /check and the review.
allowed-tools: Bash(git status) Bash(git status *) Bash(git diff) Bash(git diff *)
---

1. **Inspect** the changes with `git status` and `git diff` (`git diff --cached` if something is staged). If there is no git repository yet, use the current feature's file in `docs/features/` and the file list instead.
2. **Propose:**
   - Branch: the one listed for the current feature in `docs/progress.md`.
   - Commit message in English, Conventional Commits: subject `type(scope): summary`, imperative, at most ~72 characters; a blank line; 2–5 bullets with the essence.
   - PR title (same as the subject) and PR description: Summary, Changes, Verification (commands and results), Decisions (links to `docs/decisions.md`), Out of scope.
3. **Rules:**
   - No AI attribution anywhere: no `Co-Authored-By` trailer, no "Generated with …", no mention of AI tools.
   - Never run a git command that changes state (`add`, `commit`, `push`, `branch`, `checkout`, `switch`, `merge`, `rebase`, `reset`, `stash`). The user runs them.
