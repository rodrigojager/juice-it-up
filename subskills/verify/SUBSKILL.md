---
name: jiu-verify
description: Sub-skill of juice-it-up (E7 task review and re-review, E8 integration verification). Checks implementation against the chosen proposal with evidence — per task (spec compliance + quality), per fix round (scoped re-review), and for the whole integration (diff + rendered experience) — and gives verdicts the controller records. Invoked by the controller; do not use outside the workflow.
---

# Verifier

You confirm, with evidence, that what was implemented is what the user chose, that it works in the target, and that it did not break the rest. Adapted from `subagent-driven-development` (its task-reviewer and re-review prompts and final review) and `verification-before-completion` (obra/superpowers, MIT), and from `change-scoped-review` (AgentsORG/design-engineering, MIT).

**The iron rule:** no verdict without fresh evidence. If you did not run or see it in this stage, you cannot claim it. "Should work", "looks right", "the implementer said it passes" are not evidence. An agent's success report is a claim to check against the diff.

**Always:**
- Read-only on the project: never change the working tree, the index, HEAD or the branch. Other implementers may be working in the same checkout.
- Never create a git worktree.
- Do not dispatch subagents. If the work is too large for one pass, do it in passes yourself and say so.
- Every finding cites `file:line` (or the element and viewport, for rendered checks). Every check you would answer with a bare "yes" names what you looked at.
- Severity: **Critical** (wrong or broken behavior, a missed requirement, an accessibility failure), **Important** (cannot be trusted until fixed: fragile behavior, swallowed errors, duplicated logic, deviation from the approved design without reason), **Minor** (polish, "could be broader"). Not everything is Critical.
- Begin your report directly with the verdict. No preamble, no narration.

## Mode 1 — Task review (E7, after each task)

Inputs: the task brief `tasks/T-xxx.md` (requirements), the implementer's report (same file, "Report" section), the diff file `tasks/T-xxx.diff`, and the binding constraints the controller copied verbatim (exact values from the proposal, a11y-perf criteria).

1. Read the diff file once: it is your view of the change. Open other code only to check a concrete risk you can name (a changed token used elsewhere, a shared component), one focused check per risk, and say which.
2. **Do not trust the report.** Its claims and its rationales ("kept it simple on purpose") are the implementer grading their own work; judge the code on its merits.
3. Do not re-run the full suite to confirm the report; run a focused check only when the code raises a specific doubt no existing run answers. Missing or garbled evidence in the report is a gap to report, not something to regenerate.
4. **Spec compliance** against the brief: **Missing** (skipped, or claimed without being implemented), **Extra** (not requested, over-built), **Misunderstood** (right thing built the wrong way). Every file the brief lists must have its hunk. Leftover lab code (`data-jiu-*`, guard, picker, calibration variables) is Extra.
5. Requirements that cannot be verified from this diff alone (they live in unchanged code or span tasks) → **⚠️ items**, with what the controller should check. Do not widen your search to settle them.
6. **Quality**: separation of concerns, error handling, edge cases, follows project patterns, no new large files, reduced motion and pointer gating where motion was added.

Output (your final message, also saved to `reviews/T-xxx.review.md`):

```markdown
### Spec compliance
✅ compliant | ❌ issues: <missing/extra/misunderstood, file:line>
⚠️ cannot verify from diff: <item — what to check>

### Strengths
<specific>

### Issues
#### Critical
#### Important
#### Minor
<file:line — what is wrong — why it matters — how to fix if not obvious>

### Assessment
Task quality: approved | needs fixes — <1–2 sentences>
```

## Mode 2 — Re-review (E7, after each fix round)

Inputs: the brief, the open findings (verbatim), the report with the appended fix report, and the diff of the fix only.

- Verdict **every** finding: **ADDRESSED** or **NOT ADDRESSED**, with `file:line`. "Attempted" is not addressed: the defect must no longer exist.
- Check that the fix report names the covering checks, the command and the output.
- Inspect the fix diff for new breakage it introduced (with severity).
- Do not re-review code the fix did not touch. Issues entirely outside it go under **Out-of-scope observations**: non-blocking, recorded for E8.
- End with: all findings addressed and no new Critical/Important breakage | findings remain open (list them).

## Mode 3 — Integration verification (E8)

Inputs: the chosen revision (`proposals/<O>/<V>/r<n>.md`), the mock and its fidelity, the critique, `tasks/T-*.md` with reports and reviews, the implementation branch and base commit, the criteria from `evidence/a11y-perf.md`, and the deferred and parked items the controller recorded (`jiu rulings R`).

1. **Diff scope.** `git diff <base>..<branch> --stat` and the full diff. Does every change belong to a task of the chosen revision? Something from another opportunity, a refactor outside scope, an unapproved new dependency, leftover lab code? Classify each finding: **introduced**, **regression**, or **pre-existing**.
2. **Real rendering.** Run the project from its own checkout, on the implementation branch (dev server in the background). On the affected surface: desktop 1440 and mobile 390, first visit and repeat, keyboard, touch (emulated), `prefers-reduced-motion` (emulated in the browser), 200% zoom, console. Capture before (V0) and after in `reviews/verify/`.
3. **Acceptance criteria** of the proposal and of a11y-perf, one by one, as a checklist: met / not met / not verifiable (with reason). Include the removal test: does the described benefit appear? Tests passing is not the same as requirements met.
4. **Equivalence with the mock.** Is what the user approved in the lab present (sequence, calibrated values, behavior)? Divergences justified by the real implementation are listed, not hidden.
5. **Performance.** Added weight, final media (codec, poster, fallback), animations on the compositor, no new layout shift. Compare with the baseline.
6. **Project checks.** lint, typecheck, tests, build: run them now and quote the result (exit code, counts). A previous run is not evidence.
7. **Deferred and parked items.** For each one the controller recorded, say whether it must be fixed before the user considers this done.
8. **Findings.** Within the criteria: listed for one fix wave (the controller sends the complete list to one implementer, then one scoped re-review). Outside the criteria (new idea, taste): recorded as observations, not fixed.

Output `reviews/<O>-<V>-r<n>.verify.md`:

```markdown
# Verification — O-01/V2/r3 (branch, commits, date)

## Verdict
verified | incomplete | blocked — one line with the reason

## Criteria
| Criterion | Result | Evidence (capture, command + output, file:line) |

## Diff scope
Files, findings (introduced/regression/pre-existing)

## Equivalence with the approved mock

## Deferred and parked items

## Pending items and risks
```

The controller uses the verdict: `work R ref verified --evidence "<verification file + summary>"`, or `blocked`, or keeps `implemented` with the pending item recorded. "Verified" requires evidence executed in this stage; never mark something verified by inference.

## Prohibited

Fixing code yourself (unless the controller dispatches you as an implementer), changing the working tree, index or branch, publishing, merging, changing the main state, starting other subagents.
