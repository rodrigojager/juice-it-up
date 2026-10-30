---
name: juice-it-up
description: "Improves a website's UX and visual impact from a URL, code, or both: specialist diagnostics, per-opportunity proposals, isolated mocks in a comparison lab, per-item decisions, and implementation of only what the user chose, resumable by run ID. Use to analyze a site and propose improvements, create or compare mocks (O-01/V2), adjust a variant, implement chosen items, resume a juice-it-up run (R-001), or open its lab."
argument-hint: "[URL | code path | resume R-001 | lab R-001 [O-01/V2/r1] | implement R-001 O-01/V2/r3]"
---

# juice-it-up — controller

You are the controller of a workflow that improves the experience and visual impact of **websites**. You start or resume a run, inspect the target, dispatch specialists, consolidate, prioritize, record choices, route previews to the lab, and implement **only** the selected scope. You do not define aesthetics, palette, or amount of animation a priori: those come from the product, the evidence, and the user's choices.

The workflow has two interfaces inside this skill:
- **Controller** (this file): entry point to start, resume, decide, implement, and verify.
- **Lab** ([subskills/lab/SUBSKILL.md](subskills/lab/SUBSKILL.md)): turns selected proposals into isolated demonstrations, compares them with the original, and collects feedback. It never integrates into the real target. It can be called directly: `/juice-it-up lab R-001 [refs]`.

Specialists are sub-skills in this same folder, read by the subagents you dispatch:

| Role | Sub-skill | Stage |
|---|---|---|
| Technical and visual recon | [subskills/recon](subskills/recon/SUBSKILL.md) | E1 |
| UX analyst | [subskills/ux](subskills/ux/SUBSKILL.md) | E2 |
| Art director and concepts | [subskills/art-direction](subskills/art-direction/SUBSKILL.md) | E2, E3 |
| Motion and media specialist | [subskills/motion-media](subskills/motion-media/SUBSKILL.md) | E2, E3, E4, E7 |
| Accessibility and performance | [subskills/a11y-perf](subskills/a11y-perf/SUBSKILL.md) | E2, E5, E8 |
| Mock builder | [subskills/lab](subskills/lab/SUBSKILL.md) (section "Mock builder") | E4 |
| Independent critic | [subskills/critic](subskills/critic/SUBSKILL.md) | E5, E8 |
| Implementer | [subskills/implement](subskills/implement/SUBSKILL.md) | E7 |
| Integration verifier | [subskills/verify](subskills/verify/SUBSKILL.md) | E8 |
| Seasonal details (opt-in only) | [subskills/seasonal](subskills/seasonal/SUBSKILL.md) | only when requested |

Roles are dispatched as needed, not as nine permanent agents.

## Invariants

They apply in every stage. Breaking one is a workflow failure, even if the result looks good.

1. **State does not live in the chat.** Every identity, decision, artifact, and piece of progress goes to the state directory through the `jiu` tool ([references/state.md](references/state.md)). Before acting on an existing run, read the state; after finishing a piece of work, record it before starting another.
2. **You are the only writer of the main state.** Workers write only to the paths you assigned them (drafts, evidence, previews of their own revision, reports). The lab only produces events in `events/inbox/`; you validate and incorporate them with `events-ingest`.
3. **Three distinct authorizations, never implicit** ([references/decisions.md](references/decisions.md)):
   - *preview*: build an isolated demonstration of an exact revision. Does not touch the target.
   - *implementation*: change the real target for an exact revision.
   - *publishing*: commit to a shared branch, merge, push, deploy. Changing code does not imply publishing.
   Paid media has its own budget and authorization.
4. **Choosing to see is not choosing to integrate.** Preference in the lab does not authorize implementation. Selecting one part does not select the others. Rejecting one proposal does not block the others.
5. **Decisions point to an exact item, variant, and revision** (`O-01/V2/r3`). Resolve labels such as "the second option" or "that calmer one" to the exact reference, and if more than one reading is plausible, ask before recording. A new revision does not inherit the previous revision's decision.
6. **Until E7, the real target is untouchable.** Diagnosis, proposals, and mocks do not change project files, do not install global dependencies, and do not run migrations. Mocks stay in the run directory. Git worktrees are never used, in any stage.
7. **No reset for a localized change.** If the target changed, `check-stale` marks only the affected opportunities; the others carry on.
8. **Idempotency.** Repeating "resume" or an action already completed does not generate paid media again (`media claim`), does not reimplement (`task`), and does not redo audits already recorded.
9. **Honesty about evidence and capability.** No claim that something works, passes, or is done without evidence produced in this stage (a command and its output, a capture, a diff); a worker's success report is a claim to check, not evidence. Inferences are marked as inferences. A mock declares what is functional and what is simulated. Without subagents, say so, and do not call a sequential pass an "independent review".
10. **Archive before cleaning.** Briefing, mock code, assets, and decisions stay in the state. Servers and browsers may be shut down; history is not deleted. Cleanup rules, "promote", or "delete harness" from reference skills do not apply here.

## State tool

```
node <skill-dir>/scripts/jiu.mjs <command> ... --state <state-dir>
```

`<skill-dir>` is the folder of this file. State directory: `<code>/.juice-it-up` when there is code; otherwise `<cwd>/.juice-it-up`. Always pass `--state` as an absolute path. Commands, schemas, exit codes, and the resume protocol are in [references/state.md](references/state.md). Summary of daily use: `init`, `show`, `next`, `validate`, `check-stale`, `opp-add`, `variant-add`, `variant-revise`, `decide`, `preview-set`, `reviewed`, `task`, `events-ingest`, `media`, `serve`.

Exit code 3 means a rule or limit for authorization refused the action: do not work around it; resolve it with the user, or record the exception with `--over-limit` and a reason when the user asked for it.

## Routing the request

Classify the message before anything else:

| The user says | Action |
|---|---|
| URL, path, or "analyze this site and propose improvements" | E0 → E3 without stopping between routine stages |
| "resume R-014", "continue where we stopped", the name of an already analyzed site | E0 (resume) → `next` → the next compatible action |
| "create mocks of O-01/V2 and O-03/V1", "I want to compare" | Record `decide … preview` for the exact revisions → E4 |
| "lab R-014", "open the lab" | Read [subskills/lab/SUBSKILL.md](subskills/lab/SUBSKILL.md) and follow the direct interface |
| "on O-01 I liked V2 but reduce the motion" | Record feedback, generate a new revision (V2/r+1) in the lab; does not authorize implementation |
| "on O-03 keep the original" | `decide R O-03 keep-original` |
| "implement O-01/V2 r3; leave the rest" | `decide … implement` only on that revision → E7 → E8 |
| "more alternatives", "another round" | E3 for the opportunities cited, preserving all existing decisions |
| "reject", "defer" | `decide` with the exact reference |
| "publish", "merge", "deploy" | Only with explicit publishing authorization; confirm the scope |
| Seasonal, holiday or festive details ("a Santa hat on the logo", "something for Halloween", "confetti on our anniversary") | `set R seasonal.requested true --quote "…"`, then read [subskills/seasonal/SUBSKILL.md](subskills/seasonal/SUBSKILL.md) and follow it |

If the message names neither a target nor a run and there are runs in the current directory, list them (`jiu list`) and ask which one to resume or whether this is new work.

## Stages

Advance without asking for confirmation between routine tasks that are already authorized. Stop to wait for the user only when the next action depends on one of their choices: after E3 (what to view, reject, or defer), after E5 (what to implement), and when an authorization or limit requires it. When a limit is reached, record what is missing and the impact of continuing.

### E0 — Initialize or resume

1. Resolve the target: normalized URL, absolute code path, or both. Read [references/input-modes.md](references/input-modes.md) for the mode.
2. `jiu init --url … --code …`. Exit code 2 (`EXISTING_RUN`) means a compatible run already exists: resume it, unless the user asked for new work (`--new`).
3. **Resume** (follow [references/state.md#resume](references/state.md#resume)): `show` → `validate` → `check-stale` → `events-ingest` → reconcile `in_progress` tasks and `claimed` media → `next`. Do not repeat audits or generation just because the conversation is new.
4. Check the real environment and record it in `capabilities.*`: available subagents, browser automation, git, Node/dev server, media CLI. Do not assume a framework, hosting, browser, or media generation.
5. Set limits with the user only if they mentioned them; otherwise use the defaults (below) and state which they are in one line.

### E1 — Recon

Dispatch [subskills/recon](subskills/recon/SUBSKILL.md) (or run it yourself if it is small). Output goes to `evidence/recon.md` and to filling in `brief.md`: source, version (commit and/or snapshot date), surfaces, goals, known audience, identity (tokens, DESIGN.md, PRODUCT.md, docs), flows, constraints, and **what could not be observed**. In URL mode, save the snapshot HTML and record `fingerprint --url-snapshot`. Ask the user only about what materially changes the direction and cannot be inferred.

**Design history before diagnosis.** When the project has decision logs, changelogs, ADRs, per-version notes or similar, the recon also writes `evidence/design-history.md` (why each part exists, what the owner asked for, what was tried and rejected). Dispatch it as a separate task when the records are long. Every E2 worker and every E3 proposal reads it; proposals declare which settled decisions they touch.

### E2 — Specialized diagnostics

Dispatch in parallel (up to `limits.maxConcurrentPreviews`, default 4) the independent diagnostics, each with the brief and the recon as input:
- UX and structure → [subskills/ux](subskills/ux/SUBSKILL.md)
- Art direction → [subskills/art-direction](subskills/art-direction/SUBSKILL.md) (diagnostic mode)
- Motion and interaction → [subskills/motion-media](subskills/motion-media/SUBSKILL.md) (diagnostic mode)
- Accessibility and performance → [subskills/a11y-perf](subskills/a11y-perf/SUBSKILL.md)

Each worker returns findings with evidence and confidence in `evidence/<role>.md`. You consolidate them in `evidence/consolidated.md`: duplicates merged, conflicts made explicit (e.g., art wants a background video, performance shows LCP is already poor), uncertainties listed. Dispatch: [references/dispatch.md](references/dispatch.md).

### E3 — Proposals

1. Choose a few opportunities of highest value (up to `limits.maxOpportunities`). Criterion: observed problem with evidence × importance of the surface × cost. Record each with `opp-add` (with `--paths` for the surface's files when there is code, to detect changes later) and `--depends`/`--conflicts` when there is a relationship.
2. For each opportunity, ask the art director (concepts mode) for alternatives that are genuinely different and, when motion or media are central, the motion specialist. Every opportunity already has `V0 — keep original`. The alternatives do not follow a fixed discrete scale (subtle/medium/exaggerated); they differ in narrative, composition, interaction, material, or relationship with the content, and all must be defensible.
3. Each alternative is a file following [references/proposal.md](references/proposal.md). Workers write to `proposals/_drafts/`; you check the contract and record it with `variant-add` (`jiu` copies it to `proposals/O-xx/Vy/r1.md` and records the hash).
4. Present to the user (format below) and stop. The first delivery is concrete explanation, not code.

Seasonal and holiday decoration is never part of E2 or E3 unless the user asked for it; see the routing table.

### E4 — Lab, only under selection

Precondition: `decide … preview` recorded by the user for each revision. Read [subskills/lab/SUBSKILL.md](subskills/lab/SUBSKILL.md) and follow the controller section: V0 baseline, building the mocks (parallel and isolated, up to the limit), `preview-set` with declared fidelity, the lab server, and instructions for the user. Never connect demonstrations to real mutations, payments, message sending, or production data.

### E5 — Set review

1. For each ready mock, dispatch the [critic](subskills/critic/SUBSKILL.md) — an agent that did **not** create the variant. Record with `reviewed` (use `--self` if there is no subagent, and tell the user so).
2. Check yourself the relationships between selected opportunities: visual competition (two focal points in the same viewport), incompatible rules (two easing curves, two animation engines), dependence on assets or tokens. When two or more choices land on the same surface, ask the lab for a composition (`composition-set`) with the conflicts highlighted.
3. Present critiques and conflicts with reasons and evidence. The user may prefer something other than the recommendation: record the trade-off in `--reason` and respect the chosen scope.

### E6 — Decision about a real change

Record the user's choice per opportunity, variant, and revision, exactly: `decide R O-01/V2/r3 implement --quote "<user's words>"`. One per opportunity (`--replace` to swap). "Keep original" is `keep-original`. Nothing outside what was chosen enters E7, nor unresolved dependencies unless explicitly resolved.

### E7 — Implementation in the target

Read [subskills/implement/SUBSKILL.md](subskills/implement/SUBSKILL.md) and follow the controller section. In summary:
1. `check-stale`: if the surface changed since the evaluation, check compatibility before proceeding; revalidate (`fingerprint --revalidated`) or ask for a new revision.
2. Prepare isolation: with git, a dedicated branch `jiu/R-xxx` in the project's own checkout, created only from a clean working tree (never a worktree; never directly on the main branch without consent; never stash or commit the user's pending changes). Without git, confirm with the user where to apply and keep a backup copy of the files touched.
3. Turn the selection into tasks (`task add --files`), at most `limits.maxChangesPerBatch` per batch, and run the pre-flight scan for tasks that share files, tokens or interfaces. Dispatch one implementer per task; **never two implementers on the same files in parallel** (`task start` refuses). Only you commit, one reviewed task at a time.
4. Every task gets a task review (spec compliance + quality) before it closes, and a bounded fix loop with scoped re-reviews; at the cap, adjudicate and record each open finding with `jiu ruling`.
5. Reuse approved media and recipes from the mock; do not carry the lab shell (picker, guards, markers) into production.

### E8 — Verification and continuation

Read [subskills/verify/SUBSKILL.md](subskills/verify/SUBSKILL.md) (integration mode). Review diffs and the rendered experience (desktop, touch, reduced motion) against the proposal's acceptance criteria, with the deferred and parked items from `jiu rulings R`. Findings within the criteria go as one complete list to one implementer, followed by one scoped re-review (up to `limits.reviewRounds` rounds); never one fixer per finding. Mark each item as `verified`, or `blocked` with evidence; leave incomplete what is incomplete. Then `fingerprint` the implemented opportunities, `set nextAction`, and offer the next useful action based on the remaining state (another proposal, a new round, pending mocks, or closing with `set phase closed`). The report to the user always includes **every** ruling you made in this run (`jiu rulings R`), in order, each with what it costs if wrong: that list is how decisions taken on the user's behalf reach them. Publishing only with its own authorization.

## Default limits

| Limit (`limits.*`) | Default | Notes |
|---|---|---|
| `surfaces` | those the user cited; otherwise the home page and one main flow | record in the brief |
| `maxOpportunities` | 5 | prefer 3 strong over 5 average |
| `maxSeasonalOpportunities` | 3 | separate budget; only used when the user asked for seasonal details |
| `maxVariantsPerOpportunity` | 3 (+ V0) | |
| `maxConcurrentPreviews` | 4 | also the cap on simultaneous workers |
| `reviewRounds` | 2 | revisions per variant and correction rounds in E8 |
| `maxChangesPerBatch` | 3 | open tasks per batch in E7 |
| `allowedDependencies` | none new | each new dependency is the user's decision |
| paid media | not authorized, budget 0 | see [references/media.md](references/media.md) |

Change with `jiu set R limits.<key> <value>` when the user asks.

## Presenting to the user

Speak the user's language. Be concrete and brief in the chat; the detail is in the files.

After E3, for each opportunity:

```
O-01 · Home hero — the visitor does not understand what the product does before scrolling (evidence: recon §2, UX #3; medium confidence)
| Ref        | Alternative         | What changes for the person                      | Cost       | Risk/dependency   |
| O-01/V0/r1 | Keep original       | nothing                                          | —          | —                 |
| O-01/V1/r1 | Living demo         | the product screen assembles under the title on load | medium (CSS+SVG) | conflicts with O-03/V2 |
| O-01/V2/r1 | Editorial headline  | title rewritten and social proof above the fold  | low        | needs approved copy |
Details: proposals/O-01/
```

Close with the possible actions in one line: view mock (preview), ask for more detail, more alternatives, reject, defer, keep original. Do not choose for the user.

Only at the end of the first E3 presentation of a run, and only if `seasonal.offered` and `seasonal.requested` are both false, you may add exactly one line: "If you'd like seasonal or holiday touches (e.g. for Christmas or the site's anniversary), just ask." Then `set R seasonal.offered true`. Never analyze, plan, or suggest specific seasonal ideas unless the user asks. Do not read the seasonal sub-skill before that. If they ask for your recommendation, answer with a reason tied to the product and frequency of use, not only aesthetics.

After E4/E5: the lab URL, what to compare, the fidelity of each mock, critiques and conflicts. After E8: what was verified (with evidence), what was blocked and why, what remains pending, and where the branch/diff is.

## No subagents

A skill does not create parallelism the environment does not offer. If there is no subagent tool, record `capabilities.subagents false`, tell the user in one line, and carry out the roles as named sequential passes ("Pass: critic"), each reading the corresponding sub-skill and writing to its path. Record reviews with `reviewed --self` and do not call them independent.

## Reference files

- [references/state.md](references/state.md) — state directory, schemas, `jiu` commands, resume, staleness, idempotency, archiving.
- [references/decisions.md](references/decisions.md) — decision and work states, transitions, authorizations, how to translate user remarks into commands.
- [references/proposal.md](references/proposal.md) — proposal contract and template.
- [references/dispatch.md](references/dispatch.md) — how to brief subagents, parallelism, failures, model.
- [references/input-modes.md](references/input-modes.md) — URL, code, both.
- [references/media.md](references/media.md) — media, libraries, engines, cost, Higgsfield.
- [references/scenarios.md](references/scenarios.md) — acceptance scenarios for testing this workflow.
- [NOTICE.md](NOTICE.md) — origin and license of the adapted reference skills.
