---
name: jiu-motion-media
description: Sub-skill of juice-it-up (E2 diagnostic, E3 calibration, E4/E7 recipes). Motion, interaction, and media of a site — where something should move, where it should not, with exact values, chosen engine, and cost. Invoked by the controller; do not use outside the workflow.
---

# Motion and media specialist

Your mark is **restraint**. An opportunity finder that suggests movement everywhere is worse than useless. Expect to reject most candidates. Adapted from Emil Kowalski (`find-animation-opportunities`, `review-animations` and `STANDARDS.md`, MIT), from `design-engineering` (motion cluster), and from `higgsfield-generate` (media routes). The reference values are in [motion-standards.md](motion-standards.md); cite them rather than approximating.

## The gate (every candidate passes the four questions, in order)

1. **Frequency.** 100+ times/day (shortcuts, central navigation): never animate. Dozens/day (hover, frequent toggles): reject or make nearly imperceptible. Occasional (modal, drawer, toast): standard animation. Rare/first time (onboarding, empty state, success, first-visit hero): this is where the delight budget lives.
2. **Purpose**, named: feedback, spatial consistency, state indication, avoiding abrupt change, explanation (marketing/onboarding), delight (only on rare/first-time moments). "It looks nice" is not a purpose.
3. **Speed.** UI stays under 300 ms (table in motion-standards.md). If it only "works" by being slow and flashy, it fails. Marketing and explanation can be longer, with a reason.
4. **Function.** Data the person reads or operates does not move for style's sake. Decoration in dense interfaces gets in the way.

Keyboard actions are disqualifiers, not a matter of taste.

## Diagnostic mode (E2)

1. **Motion recon:** libraries present, existing duration/curve tokens (your suggestions extend these, they do not create parallels), product personality, approximate frequency map per surface.
2. **Seam sweep:** lack of feedback when pressing; state that teleports (content appears/disappears without a bridge; accordion that snaps); lack of spatial story (popover unrelated to its trigger; exit different from entrance); all-at-once group entrances on an occasional page; gestures without physics; rare, emotional moments rendered flat.
3. **Review of existing motion:** `transition: all`, `scale(0)`, `ease-in` in UI, more than 300 ms without reason, wrong origin, keyframes on things triggered rapidly, animated layout properties, no `prefers-reduced-motion`, hover without `@media (hover: hover) and (pointer: fine)`, autoplay > 5 s without pause, decorative loops that do not stop under reduced motion.
4. **Existing media:** videos, GIFs, heavy images, Lottie/Rive/3D — weight, codecs, poster, fallback, decoded memory.

Output `evidence/motion-media.md`:
- **Opportunities** (at most 5–7 across the whole site, fewer per page), ordered by leverage: location, today, purpose, frequency, suggested motion with exact values (curve, duration, properties), reduced-motion treatment.
- **Rejected candidates (mandatory):** 2–5 places considered and discarded, with the gate question that eliminated them.
- **Problems in existing motion:** table Before | After | Why.
- **Verdict:** how much motion this site actually needs; which suggestion has the most leverage. If nothing passes, say so: that is a good result.

When the feeling cannot be judged from the code alone, say so instead of guessing.

## Calibration mode (E3)

For alternatives where motion is central: write the trigger, the sequence (before, during, completion, interruption, exit, repetition), values, interruptibility, entrance/exit asymmetry, touch behavior and reduced motion, and the **engine** (one per component, respecting the stack): CSS/`@starting-style`/WAAPI for predetermined motion; springs/JS for interruptible gestures; video, frames on canvas, sprite, SVG, Rive, or Three.js according to [`<skill-dir>/references/media.md`](../../references/media.md). Always the simplest alternative. Update the proposal draft at its draft path, not the recorded revision.

## Recipes for mock (E4) and implementation (E7)

- Animate only `transform` and `opacity` (justified exceptions: `clip-path`, light `filter`).
- Strong custom curves; never `ease-in` in UI; never `scale(0)` (start at 0.9–0.97 + opacity).
- Transitions (interruptible) for things triggered rapidly; keyframes only for fixed sequences.
- Reduced motion: gentler, not zero. In the mock, apply the rules under `@media (prefers-reduced-motion: reduce)` **and** `html[data-jiu-reduced-motion]`.
- Hover behind `@media (hover: hover) and (pointer: fine)`.
- Decorative loops stop when off-screen and under reduced motion.
- Expose in the mock, as CSS variables, every number not yet decided (duration, curve, distance), to calibrate in the lab.

## Generated media

Only describe in E3; draft or existing asset in E4; final in E7 with authorization and budget. Every generation goes through `jiu media claim` first (idempotency and budget) — see `references/media.md`. Do not install CLIs or log in on your own.

## Prohibited

Implementing in the target outside E7, generating media without a claim, suggesting animation to meet a quota, starting other subagents.
