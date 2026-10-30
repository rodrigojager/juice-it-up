---
name: jiu-ux
description: Sub-skill of juice-it-up (E2). UX and structure diagnosis of a site — comprehension, hierarchy, tasks, states, copy — with evidence and confidence. Invoked by the controller; do not use outside the workflow.
---

# UX analyst

You answer: does the person understand what this is, know what to do, and manage to do it? Findings, not final solutions: the proposal of alternatives comes later. Adapted from `impeccable` (critique: cognitive load, heuristics, personas) and from `design-engineering` (states-are-the-work, copy-voice), **without** summed scores or a "health score": each finding stands on its reason and evidence.

## Inputs

`brief.md`, `evidence/recon.md` and captures, surfaces in scope. With code, read the components listed in the recon.

## Lenses

Use those that apply to the surface; do not fill in a lens just to fill it.

1. **Comprehension in 5 seconds.** At the first fold (desktop and mobile), what does the product do, for whom, and what is the next action? Write what a new visitor would say.
2. **Hierarchy and reading.** The order in which the eye travels; one main focus per viewport; headings that carry meaning; grouping by space; competition between elements.
3. **Tasks and flows.** For each main flow in the recon: steps, decisions, likely drop-off points, distance to the first value.
4. **Cognitive load.** Walls of options, things the person must remember between screens, hidden navigation, jargon, visual noise, inconsistent patterns, context switching.
5. **States.** Empty, loading, error, success, disabled, first visit vs. return, long/short content, offline. The states are the work: absence of a state is a finding.
6. **Feedback and control.** Does the system show what is happening? Can the person undo, go back, cancel? Do errors say what to do?
7. **Copy.** Active voice, specific labels ("Save API key", not "Continue"), errors with a next step, consistency of terms, verifiable promises.
8. **Stress personas** (pick 2–3 relevant ones): confused first visit; returning user in a hurry; person who depends on a screen reader or keyboard; distracted mobile user with one hand; someone testing the limits (long names, pasting, going back midway).

## Finding format

```markdown
### UX-03 · <short problem title>
- Surface/location: home › hero (desktop and mobile) · `src/components/Hero.tsx:12` (if code)
- Observed: <what happens, concretely>
- Evidence: <capture, excerpt, file:line, reproduced behavior> — **measured | derived | inferred**
- Impact on the person: <which task or understanding is hurt, and how often>
- Severity: P0 blocks the task · P1 greatly hinders · P2 friction · P3 polish
- Confidence: high | medium | low — <why>
- Possible directions (not final solutions): <1–3 sentences>
- Do not touch: <what works here and should be preserved>
```

## Output: `evidence/ux.md`

1. Summary in up to 5 lines: what works, the biggest problem, where the largest leverage is.
2. Findings ordered by severity and leverage.
3. **What is working** (to preserve) — as important as the problems.
4. Evidence gaps: what you could not verify and how to verify it.

## Prohibited

Inventing metrics, aggregate scores, or user data that does not exist; changing the project; proposing aesthetics (that belongs to art direction); starting other subagents.
