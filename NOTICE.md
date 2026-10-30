# Origin and licenses

`juice-it-up` is a coordination and state layer that reuses ideas and, in a few passages, code from public skills. The content was rewritten and adapted to this workflow's contract (per-item selection, two authorizations, persistent mocks, resume); the deliberate differences are described in each sub-skill.

| Source | License | Use here |
|---|---|---|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) — `prototype` (+ `PICKER.md`), `find-animation-opportunities`, `review-animations` (+ `STANDARDS.md`) | MIT, © 2026 Emil Kowalski | picker CSS and behavior copied into `assets/lab-harness.html`; values and motion rules summarized in `subskills/motion-media/motion-standards.md`; opportunity gate and review stance adapted in `subskills/motion-media` and `subskills/critic` |
| [AgentsORG/design-engineering](https://github.com/AgentsORG/design-engineering) — `skill-router`, `prototype-picker`, `ai-default-tells`, `review-format`, `change-scoped-review`, `reading-others-interfaces` | MIT, © 2026 HKTITAN | routing concepts, divergence by axis, generic-pattern signals, diff-scoped review, measured/derived/inferred scale |
| [obra/superpowers](https://github.com/obra/superpowers) — `subagent-driven-development` (SKILL.md, `implementer-prompt.md`, `task-reviewer-prompt.md`, `re-review-prompt.md`, references `fix-loop`, `final-review`, `handling-reports`, `preflight`, `batching`, `cannot-verify`, `resuming`), `verification-before-completion` | MIT, © 2025 Jesse Vincent | rewritten, not copied: per-task implementer and its escalation and self-review rules, task review with spec compliance (missing/extra/misunderstood) plus quality and "cannot verify from diff" items, scoped re-review (addressed / not addressed), bounded fix loop with adjudication at the cap, rulings listed to the user at the end, pre-flight conflict scan, batching of same-shape edits, report handling by status, file-based ledger, no subagents from workers, model choice per role, and the "no completion claim without fresh evidence" rule in `subskills/verify` and the controller |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) — `SKILL.md`, `critique`, `audit`, `delight` | Apache-2.0 | concepts (surface modes, "the brief wins", refinement × redesign, cognitive load, personas, delight proportional to frequency and consequence in `subskills/seasonal`); no text copied |
| Seasonal effect libraries cited in `subskills/seasonal`: [magic-snowflakes](https://github.com/hcodes/snowflakes), [canvas-confetti](https://github.com/catdad/canvas-confetti), [tsParticles](https://particles.js.org/), [Motion](https://motion.dev/) | see each project | referenced as options only; nothing bundled or installed |
| [0xdesign/design-plugin](https://github.com/0xdesign/design-plugin) — `design-lab` | no license file in the repository consulted | concepts only (environment detection, before/after baseline, structured feedback); no text or code copied |
| [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) via `web-design-guidelines` | see repository | rules fetched at runtime; the fallback list in `subskills/a11y-perf` was written in different words |
| [higgsfield-ai/skills](https://github.com/higgsfield-ai/skills) — `higgsfield-generate` | MIT, © 2026 Higgsfield AI | routes and model choices cited in `references/media.md`, with its own rules for authorization, budget, and idempotency |

Versions consulted on 2026-10-30 (shallow clone of each repository's main branch).

## MIT License (excerpts copied from emilkowalski/skills)

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
