---
name: jiu-lab
description: Lab of juice-it-up (E4, E5). Turns selected proposals into isolated demonstrations, compares them with the original at real scale (desktop and mobile, speed, pause, reduced motion), and collects comments and preferences linked to item/variant/revision. Never integrates into the real target. Called by the controller or directly with `/juice-it-up lab R-001 [O-01/V2/r1 …]`.
---

# Lab

The lab answers design questions with demonstrations, not with production code. Adapted from `prototype` (Emil Kowalski, MIT: divergence, picker, verification), from `prototype-picker` (AgentsORG/design-engineering, MIT), and from `design-lab` (0xdesign: baseline, structured feedback), with these deliberate differences:

- **Choosing does not promote.** Preferring a variant integrates nothing; integration is E7, authorized in the controller.
- **Nothing is deleted.** Mocks, decisions, and assets stay archived in the state; only servers and temporary contexts are shut down.
- **Any stack, including URL only.** Mocks are always standalone HTML inside the run directory, served by `jiu serve`. No temporary routes in the project, no git worktrees, no copies of the project.

## Direct entry (`/juice-it-up lab R-001 [refs]`)

1. `jiu show R`, `validate R`, `events-ingest R`. No existing run: say that the lab works on a run and offer to start the controller.
2. Refs cited without a `preview` decision: the user's request to create/view the mock **is** the preview authorization for those exact revisions — record `decide … preview --quote "<request>"`. Ambiguous refs (no revision, "the second one") → resolve to the revision presented, or ask.
3. No refs: open the lab with what already has a preview, and list what is selected without a mock.
4. Follow the "Controller procedure" below for whatever is missing.
5. When finished, return to the user what they need: URL, what to compare, and that implementing requires going back to the controller with the exact revision.

## Controller procedure (E4)

1. **Preconditions.** Each revision has `preview` recorded. Respect `limits.maxConcurrentPreviews`; the excess goes into a queue and is told to the user.
2. **V0 baseline** for each opportunity involved, if not already there (`previews/<O>/V0/r1/`), in order of preference:
   - code that runs: original route on the local dev server (`preview-set … --path http://localhost:…/route`) **and** static captures archived in the V0 folder;
   - URL only: page with desktop/mobile captures of the surface and a link to the published site (sites often block `iframe`); fidelity "static";
   - record with `preview-set R O-xx/V0/r1 --path … --fidelity …`.
3. **Construction.** Dispatch one builder per revision (section below), in parallel up to the limit, each with its path `previews/<O>/<V>/r<n>/`. Motion mocks receive the motion specialist's recipes.
4. **Check.** Open each mock (automated browser when available): it renders, interactions respond, console is clean, desktop and mobile, reduced motion works, mutation guard present, honest fidelity. A dead button presented as functional is a defect: send it back to the builder.
5. **Record.** `preview-set R ref --path previews/<O>/<V>/r<n> --fidelity "<functional: …; simulated: …; differences: …; media: …>"`.
6. **Independent critique** (E5): dispatch `subskills/critic` for each ready mock; record with `reviewed`.
7. **Composition** when two or more choices share a surface: a builder assembles `previews/_composition/C-xx/` with the revisions together, and you record `composition-set R C-xx --refs … --conflicts "<what competes or is incompatible>"`.
8. **Serve.** Run in the background `node <skill-dir>/scripts/jiu.mjs serve R --port 4977 --state <dir>` and deliver `http://127.0.0.1:4977/`. Keys: 1–N and ←/→ switch variant, R replays, space pauses. Controls: viewport, real scale, speed (1×–0.1×), pause, reduced motion. Comments and preferences go to `events/inbox/`.
9. **Feedback.** When the user returns (or says so in the chat), `events-ingest R`. For each:
   - `prefer`: recorded as a preference; does not change authorization.
   - `adjust`: the builder writes the next revision's draft (adjusted proposal + mock) → `variant-revise` → `decide <new ref> preview --quote "<adjustment text>"` (the adjustment request is the authorization to see the new revision) → build → `preview-set`. The previous revision stays in the lab for comparison.
   - `reject`/`defer`: already applied by the ingest; confirm to the user.
   - `comment`: consider in the next adjustment or in the critique.
   Respect `limits.reviewRounds`; on reaching it, say what is missing and the cost of continuing.
10. **Close.** Stop the server and dev servers when the user finishes or the session ends. Do not delete `previews/`.

## Mock builder (worker brief)

You build **one** revision. Read the recorded proposal (`proposals/<O>/<V>/r<n>.md`), the brief, the recon, and the V0 baseline.

**Hard rules**
1. **Never touch production code.** Write only to `previews/<O>/<V>/r<n>/`. Never create a git worktree, a branch, or a copy of the project.
2. **Real materials, worst-case content.** Fonts, tokens, icons, and copy from the real product (with code: the real files; URL only: declared approximation). Fill in with the content that breaks things: the longest name, the two-line title, the full list, the empty state — the same content used in V0, so the comparison is fair.
3. **Same task, representative context.** The mock shows the intervention within the page's surroundings (what comes before and after), not an isolated component on a white background.
4. **Works for real, or declares it is simulated.** Interactions, states, and motion are real. What cannot be real gets `data-jiu-simulated` and goes into the fidelity declaration. No "imagine this part".
5. **No real mutations.** Use `<skill-dir>/assets/mock-template.html` as the base and keep the `jiu:reduced-motion`, `jiu:guard`, and `jiu:fidelity` blocks. No payments, message sending, login, API writes, or production data.
6. **Open numbers become controls.** Duration, curve, distance, blur, delay that the proposal marked "to calibrate" live in CSS variables on `:root` with the proposed value, commented with the reasonable range.
7. **Reduced motion** under `@media (prefers-reduced-motion: reduce)` **and** `html[data-jiu-reduced-motion]`. Animations not visible via `document.getAnimations()` (canvas, video, Three.js, Rive) implement `window.__jiuPlayback({ speed, paused })`.
8. **Draft media** (existing, declared placeholder, or generated only with an authorized `jiu media claim` reservation).
9. **Same craft across all variants.** A sloppy variant does not widen the exploration; the user rejects a good direction because the finish was poor.
10. **Do not reproduce the picker or comparison controls** inside the mock: the lab already has them.

**Formats**
- Self-contained `index.html` (CSS/JS inline or in sibling files), served at `/run/previews/…`. CDN libraries only if the project already uses them; record the exact version.
- With code, real materials are read from the project and **copied into the revision folder**: token CSS, fonts, icons, images, the markup of the surrounding sections. You read the project; you never write to it, never run its build to produce the mock, and never add a route to it. When the real component cannot be faithfully reproduced as static HTML, rebuild it and declare the difference in the fidelity.

**Self-inspection before returning:** opens without console errors, each interaction responds, desktop 1440 and mobile 390 checked, reduced motion checked, guard present, fidelity written.

**Return:** status, path, fidelity declaration (functional / simulated / differences from the original / media), open values exposed, and concerns. Do not record anything in the state.

## Prohibited

Integrating into the target, deleting mocks or decisions, presenting a mock as the original application, treating a preference as authorization, starting other subagents (the builder), generating paid media without a claim.
