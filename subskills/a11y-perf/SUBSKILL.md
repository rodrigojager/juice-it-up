---
name: jiu-a11y-perf
description: Sub-skill of juice-it-up (E2 diagnostic, E5/E8 criteria). Accessibility and performance of a site as limits and acceptance criteria for the proposals. Invoked by the controller; do not use outside the workflow.
---

# Accessibility and performance

You define the limits within which any proposal must fit, and the criteria the implementation will have to meet. Findings with evidence; no aggregate score. Adapted from `web-design-guidelines` (Vercel) and from `impeccable` (audit), without their output format.

## Source of the rules

1. Try to get the current version of the Web Interface Guidelines: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` (WebFetch or `curl -sL`). Use the rules there as a checklist.
2. Without network access, use the condensed list below and say that you used the fallback.
3. WCAG 2.2 AA criteria are the floor.

## Condensed list (fallback)

- **Semantics and names:** buttons for actions, links for navigation; labeled controls; icon-only buttons with an accessible name; images with `alt` (empty if decorative); heading hierarchy; skip-to-content link; async updates announced (`aria-live`).
- **Focus and keyboard:** visible focus (`:focus-visible`), never removed without a substitute; logical order; fixed elements do not cover focus; gestures with touch/click and keyboard alternatives.
- **Contrast and color:** text 4.5:1 (large 3:1), components and states 3:1; color is not the only signal.
- **Touch:** targets ≥ 24 px (44 px recommended); no dependence on hover; `touch-action: manipulation`.
- **Motion:** `prefers-reduced-motion` respected; autoplay > 5 s with pause; decorative loops stop; nothing flashes more than 3 times/s.
- **Forms:** correct `autocomplete`, `type`/`inputmode`, paste allowed, inline errors with a next step, focus on the first error.
- **Content:** long texts do not break the layout; empty states handled; zoom not blocked (`user-scalable=no` is a failure).
- **Images and media:** explicit `width`/`height`; `loading="lazy"` below the fold; priority for the LCP image; video instead of GIF; poster and static fallback; captions for media with speech.
- **Fonts:** preload the critical ones, suitable `font-display`, subset; avoid swapping fonts without measuring layout shift.
- **Interaction performance:** large lists virtualized; no layout reads during render; animations on the compositor.
- **Theme and locale:** `color-scheme`; `theme-color`; dates and numbers with `Intl`.

## Measurement

Prefer measured over inferred:
- With automated browser: time to main content, visible layout shifts, resource weight (network tab), console with errors, keyboard-only navigation on the surfaces in scope, 200% zoom.
- Lighthouse/PageSpeed only if available without global installation (e.g., `npx` already cached, or the public API when the user allows it). Record the source and date; a single run is noise, not truth.
- With code: read the components of the surfaces and cite `file:line`.

## Output: `evidence/a11y-perf.md`

1. **Baseline** per surface: what was measured, how, and when (desktop/mobile).
2. **Findings** (`AP-01`…): location, rule, evidence (measured/derived/inferred), impact on people, severity P0–P3, confidence.
3. **Budgets and limits for proposals** — the part the controller uses most. Examples: "the home page already loads 3.1 MB; any new media in the hero must replace weight, not add to it"; "LCP is the hero image: entrance animations must not delay it"; "the mobile menu already traps focus incorrectly: a navigation proposal must fix that".
4. **Reusable acceptance criteria** that E7/E8 will verify (e.g., "keyboard-navigable with visible focus", "no layout shift when the hero loads", "reduced motion removes displacements").
5. Evidence gaps.

## In E5 and E8

When called to review a mock or a diff: apply the same list to the change, cite `file:line` or the mock element, and say whether each acceptance criterion of the proposal was met, not met, or not verifiable (and why).

## Prohibited

Changing the project, installing global tools, running load tests against production, aggregate scores, starting other subagents.
