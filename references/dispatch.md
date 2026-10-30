# Subagent dispatch

The workflow uses the harness's native subagents (in Claude Code, the Agent tool with the `general-purpose` type, or `Explore` for read-only sweeps). A skill does not create parallelism the environment does not have: without a subagent tool, see "No subagents" in SKILL.md.

## When to dispatch

- **Parallelize:** E2 diagnostics, alternatives for different opportunities in E3, mocks of different revisions in E4, critiques of different mocks in E5.
- **Sequence:** consolidation, decisions, anything that depends on another output, and every implementation that touches the same files.
- **Do it yourself** when it is smaller than writing the brief (reading one file, a one-line tweak to a proposal).
- **Batch small same-shape work:** several small edits of the same kind (one token renamed in five files, the same attribute added to every image) go to one worker as one brief and are reviewed as one unit. One dispatch per item is for work that needs its own judgment, checks, or review.
- Up to `limits.maxConcurrentPreviews` (default 4) simultaneous workers; one or two refinement rounds per item.

## Dispatch brief

Every dispatch is self-contained: the subagent does not see this conversation. Use this skeleton:

```
Run: R-001 · Task: <E2-ux | E3-O-01-concepts | E4-O-01/V2/r1-mock | E5-critique-O-01/V2/r1 | T-003>
State: <absolute path of the run directory> (read-only, except the paths below)
Source and version: <URL + snapshot date> | <absolute code path @ commit, branch>
Goal: <one sentence>
Limits: <surfaces, what not to do, media budget, no new dependencies, …>
Read first: <skill-dir>/subskills/<role>/SUBSKILL.md, then brief.md, evidence/recon.md <and whatever else is needed>
May modify only: <exact paths>
Output contract: <file(s) and format, per the sub-skill>
Expected evidence: <captures, file:line, commands run and their result>
Scope and iteration limit: <e.g.: 3 alternatives; 1 round of self-inspection>
Do not start other subagents. Do not change the main state (run.json, opportunities.json, decisions.jsonl). Do not touch the real target <except in E7, in the task's files>.
Return only: status (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED), paths written, and concerns in up to 5 lines.
```

Deliver artifacts as file paths, not pasted into the prompt. Do not paste the accumulated history of other tasks; give the worker the task, the interfaces it touches, and the global constraints.

## Paths by role

| Role | Writes to |
|---|---|
| recon | `evidence/recon.md`, `evidence/recon/` (captures, snapshot) |
| ux, art-direction, motion-media, a11y-perf (diagnostic) | `evidence/<role>.md`, `evidence/<role>/` |
| art-direction, motion-media (concepts) | `proposals/_drafts/<O-xx>/<slug>.md` |
| mock builder | `previews/<O-xx>/<Vy>/r<n>/` |
| critic | `reviews/<O-xx>-<Vy>-r<n>.critic.md` |
| implementer | the files in `task.files`, in the project's checkout on the implementation branch (no commits; the controller commits); report in `tasks/T-xxx.md` |
| verifier | `reviews/<O-xx>-<Vy>-r<n>.verify.md`, `reviews/verify/` (captures) |

## On receiving the return

1. Read the output file, not just the summary. A worker's "done" is a claim: confirm it in what it wrote (and, for code, in the diff) before recording anything.
2. Check the contract (fields, evidence, paths). Something missing: return to the same worker with what is missing, once; if it persists, do it yourself or mark `blocked`.
3. Only then record in the state (`variant-add`, `preview-set`, `reviewed`, `task done`…).
4. **Subagent failure** (error, timeout, no file): record in `decisions.jsonl` via `work … blocked --evidence` when there is a ref, and decide: re-dispatch with a corrected brief, run sequentially, or report to the user. Do not invent the output that is missing.
5. By status:
   - `DONE_WITH_CONCERNS`: read the concerns first. Correctness or scope concerns are resolved before the work moves on; observations are noted.
   - `NEEDS_CONTEXT`: provide what is missing and resume the same worker.
   - `BLOCKED`: find the cause and change something — more context (same model), more reasoning (a more capable model), a smaller task, or a correction to the brief. A design question goes to the user. Never re-dispatch unchanged.
6. **Rulings.** Every decision you take on the user's behalf (a technical conflict, a parked finding, a deferred minor, an over-limit you chose not to take) is recorded with `jiu ruling R "<decision and why>" --ref … --cost "<what it costs if wrong>"`. Decisions about what the user sees or chose are not rulings: ask.

## Separating creation from evaluation

The creator may self-inspect, but approval does not rest on that alone. The critic is another agent, which receives the proposal, the mock, and the baseline — not the creator's conversation nor the controller's opinion. Do not write "do not flag X" in the critic's brief.

## Model and effort

Choose the model per role and name it in every dispatch; an omitted model inherits the session's, usually the most expensive. Unless the user or the environment sets otherwise:
- mechanical sweeps (listing routes, extracting tokens) and a task whose brief already contains the exact change: a fast model;
- reviews and re-reviews of small diffs: a mid-tier model (the cheapest ones take more turns and end up costing more);
- art direction, critique, integration across files, and the last round of a fix loop: the most capable one available.
