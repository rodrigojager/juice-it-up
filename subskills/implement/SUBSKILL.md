---
name: jiu-implement
description: Sub-skill of juice-it-up (E7). Implements in the real target only the revisions chosen for implementation, on a dedicated git branch in the project's own checkout (never a git worktree), one task per implementer, with per-task review, a bounded fix loop, report and evidence. Invoked by the controller; do not use outside the workflow.
---

# Implementation in the target

Adapted from `subagent-driven-development` (obra/superpowers, MIT): its implementer prompt, report handling, fix loop, pre-flight scan and batching rule. **Not** inherited: continuous execution that rules on the user's behalf, deleting the workspace at the end, TDD as a default, and finishing the branch (merge/push). Here design decisions go back to the user, integration ends in E8, and publishing requires its own authorization.

## Controller procedure

1. **Scope.** List the revisions with decision `implement` and unverified work (`jiu show`). Nothing beyond that enters. Dependencies between opportunities only if the user resolved them explicitly.
2. **Has the target changed?** `jiu check-stale R`. Affected item: compare the current surface with the one evaluated; compatible → `fingerprint R O-xx --revalidated --evidence "…"`; incompatible → go back to the user with the impact (new revision or an adjustment to the implementation).
3. **Isolation — a branch, never a worktree.** Do not use `git worktree` under any circumstance, and do not copy the project elsewhere to work on it.
   - Git repository: the working tree must be clean (`git status --porcelain` empty). If it is not, stop and ask the user how to proceed (commit, stash, or wait); never stash, reset, or commit their changes yourself. Then, in the project's own checkout, `git switch -c jiu/R-001` from the current branch. Never implement directly on the main branch without consent. Record `set R implementation.originalBranch <current branch>`, `implementation.branch jiu/R-001`, `implementation.base <commit>`.
   - No git: confirm with the user where to apply, and back up the files that will be touched in `tasks/backup/`.
   - All implementers share this single checkout, so parallel tasks must have disjoint files (`task start` enforces it), and **only the controller commits**: after a task passes review, commit exactly its files (`git add <task.files>`; `git commit`), one task at a time.
4. **Tasks.** For each revision, break it into small, verifiable tasks: `task R add --ref O-01/V2/r3 --files <files> --title …` (at most `limits.maxChangesPerBatch` open). Write the brief in `tasks/T-xxx.md`: what the task delivers, acceptance criteria from the proposal and a11y-perf (exact values verbatim), the mock recipe to reuse, approved assets and their paths, allowed files, how to run and test it. Several small edits of the same kind across files (one token renamed in five places) go into **one** task and one dispatch, reviewed as a unit.
5. **Pre-flight scan**, once, before the first dispatch. Write `tasks/preflight.md`: one row per pair of tasks that share a file, a token, or an interface (what one produces, what the other consumes, what you found), and one row per task checking that its own text agrees with itself (criteria vs. files vs. recipe). Technical conflicts: rule and record (`jiu ruling`). Conflicts that change what the user sees or chose: ask the user.
6. **Dispatch.** `task R start T-xxx --agent <id>` (refuses file conflicts) → implementer with the brief below and the dispatch template in `<skill-dir>/references/dispatch.md`. Name the model explicitly.
7. **Handle the report.**
   - `DONE` → task review (step 8).
   - `DONE_WITH_CONCERNS` → read the concerns first; correctness or scope concerns are resolved before review; observations are noted and the task goes to review.
   - `NEEDS_CONTEXT` → provide what is missing and resume the same implementer.
   - `BLOCKED` → find the cause: missing context (provide it, same model); needs more reasoning (re-dispatch on a more capable model); too large (split the task); the proposal or brief is wrong (rule on the correction if it is technical and record it; if it changes the approved design, ask the user). Never re-dispatch unchanged.
8. **Task review.** Write the task's diff to a file: `git diff -- <task.files> > tasks/T-xxx.diff` (plus `git diff --stat`). Dispatch a task reviewer (`subskills/verify`, "Task review" mode) with the brief, the report and the diff file. It returns spec compliance (✅/❌, plus ⚠️ items it could not verify from the diff) and quality findings by severity. Resolve every ⚠️ yourself before closing the task: a real gap is treated as a spec failure.
9. **Fix loop** (spec ❌, Critical or Important finding, or confirmed ⚠️ gap). Minor findings never enter the loop: record them with `jiu ruling R "minor (deferred): …" --ref …` for E8. Up to `limits.reviewRounds` rounds; each round is one fix dispatch plus one scoped re-review (`subskills/verify`, "Re-review" mode, over the diff of the fix only).
   - Earlier rounds: resume the **same** implementer with the open findings verbatim; it appends a fix report (what changed, covering checks run, output) to `tasks/T-xxx.md`.
   - Last round: a **fresh** implementer on a more capable model, with the brief, the report file, the open findings and "a prior implementer attempted this N times; you own it now".
   - Never fix findings yourself in the controller session.
   - **At the cap**, adjudicate each open finding and record it (`jiu ruling`): the reviewer is wrong or the point is contestable → park it with the reason; real but nothing depends on it → park it as deferred; real and load-bearing → decide the smallest change that unblocks, or go back to the user if it touches the approved design. A silent discard is forbidden.
10. **Close the task.** Commit the task's files on `jiu/R-001`, then `task R done T-xxx --evidence "<commit, checks, captures>"` (the revision moves to `implemented` when all its tasks finish). Blocked → `task R block T-xxx --evidence "…"`.
11. **Final media.** Only with `authorizations.media` and through `jiu media claim`; reuse the asset approved in the mock when it is the final one.
12. Proceed to E8. The checkout stays on `jiu/R-001` until the user says otherwise; when reporting, name both the current branch and `implementation.originalBranch`, and switch back only if the user asks.

## Implementer brief (worker)

**Before you begin.** Read `tasks/T-xxx.md`: those are your requirements, with exact values. If anything about the requirements, the approach, dependencies or assumptions is unclear, ask now (return `NEEDS_CONTEXT`) instead of guessing.

**Your job**
1. Implement exactly what the task specifies, nothing more.
2. Work only in the project's checkout, on the indicated branch, and only in the files listed. Never create a git worktree, switch branches, or copy the project. Need another file? Stop and ask (`NEEDS_CONTEXT`); do not expand the scope.
3. Follow the project's conventions (structure, names, tokens, the motion library already adopted). Use existing tokens; a new token only if the proposal defines it. Improve code you touch the way a good developer would, but do not restructure things outside your task. If a file grows beyond the task's intent, report it as a concern rather than splitting it on your own.
4. **Take the recipe, not the lab.** No picker, `jiu:guard`, `data-jiu-*`, simulation markers, or calibration variables that did not become decisions. Values calibrated in the lab enter as constants/tokens.
5. Reduced motion via `prefers-reduced-motion` (not the lab's attribute); hover behind a pointer gate; the states (empty, loading, error) the proposal specifies.
6. No new dependencies beyond `limits.allowedDependencies` or those the chosen proposal approved.
7. While iterating, run the focused check for what you change; before reporting, run what the project provides once: lint, typecheck, tests, build.
8. **Do not commit**: the controller commits each task after review, because other implementers may be working in the same checkout. Never push, merge, or deploy.
9. **Do not dispatch subagents** — not helpers and never a reviewer. The review is already scheduled by the controller; a reviewer you spawn duplicates it at full cost and its approval counts for nothing.

**When you are in over your head**, stop: bad work is worse than no work, and escalating is never penalized. Return `BLOCKED` or `NEEDS_CONTEXT` when the task needs a design or architecture decision with several valid options, when you need to understand code beyond what was provided and cannot find clarity, when you are unsure your approach is correct, or when you keep reading file after file without progress. Say what you are stuck on, what you tried, and what help you need.

**Self-review before reporting** (read your own diff; fix what you find):
- Completeness: every requirement and acceptance criterion done? edge cases?
- Discipline: only what was asked (no extras)? existing patterns followed?
- Fidelity: does the result match the approved mock (sequence, values, behavior)? Every deviation is listed with its reason.
- Checks: did they actually run, and is the output clean (no stray warnings)?

**After review findings** you may be resumed with them: fix, re-run the checks covering the amended code, and append a fix report (what changed, commands, output) to `tasks/T-xxx.md`. Reviewers do not re-run checks for you: your report is the evidence.

**Report.** Write the full report in `tasks/T-xxx.md`, section "Report": what you implemented (or attempted, if blocked), files changed, checks run with commands and output, deviations from the proposal and why, self-review findings, concerns. Then reply with only (under 15 lines): status `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`, files changed, one line of check results, concerns, and the report path. If `BLOCKED` or `NEEDS_CONTEXT`, put the specifics in the reply itself. Use `DONE_WITH_CONCERNS` when you finished but doubt correctness; never silently deliver work you are unsure about.

## Prohibited

Implementing revisions not chosen, touching files outside the task, editing the main state, committing (implementer), publishing, deleting backups or history, using `git worktree`.
