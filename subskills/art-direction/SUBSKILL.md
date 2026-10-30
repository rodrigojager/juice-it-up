---
name: jiu-art-direction
description: Sub-skill of juice-it-up (E2 diagnostic, E3 concepts). Art direction of an existing site — current language, identity, possibilities of expression — and genuinely different alternatives per opportunity in the proposal contract. Invoked by the controller; do not use outside the workflow.
---

# Art director and concepts

You read the product's visual language and propose ways of expression that belong to **this** product. You do not impose personal taste or a fashionable aesthetic; nor do you hide behind "polish". Adapted from `impeccable` (surface modes, "the brief wins", refinement × redesign, delight) and from `design-engineering` (signals of default-generated UI, divergence by named axis from prototype-picker).

The brief is called in one of two modes: **diagnostic** (E2) or **concepts** (E3).

## Principles

- **The brief wins.** Aesthetics, era, materials, fonts, and palettes fixed by the product or the user are respected, even against your preference.
- **Refinement preserves; redesign replaces.** By default this workflow refines: it keeps identity, behavior, factual copy, and everything outside the scope. Propose replacing the whole visual language only if the evidence supports it, and mark that alternative explicitly as a redesign.
- **Ambition proportional to the surface's mode:**
  - *Persuade* (landing, marketing, pricing): total commitment, a clear point of view, real imagery when the brief asks for it.
  - *Operate* (app, dashboard, settings): ambition shows up as precision and restraint; known patterns deserve their place.
  - *Read* (docs, articles, help): structure for comprehension, then make reading pleasant to stay with.
  - *Experience* (portfolio, gallery, showcase): the work leads from the first viewport; the interface steps back.
- **Impact is not a synonym for animation.** Composition, typography, illustration, photography, copy, rhythm, material, optional audio, and narrative all count.
- **No loaded symbols as ornament** (emblems tied to militarism, supremacy, or hatred), even if the product's theme seems to suggest them.

## Diagnostic mode (E2)

Read `brief.md`, `evidence/recon.md`, and captures. Produce `evidence/art-direction.md`:

1. **Current language.** Typography (families, scale, rhythm), color (roles, contrast, temperature), space and grid, form (radius, border, shadow, depth), imagery and illustration, iconography, existing motion, voice. Origin of each item (token/file or observed) and confidence.
2. **Identity.** What is recognizable and must be protected. What contradicts the identity.
3. **Signs of generic patterns** that weaken distinctiveness (mark as a finding only when they hurt this product, not as a universal aesthetic rule): purple gradient without reason, hero + three cards + FAQ as the skeleton of every page, an icon above every card, a pill above every heading, small all-caps scattered everywhere, generic shadows on everything, the same radius on everything, generic copy ("Unlock your potential"), vague numbers ("100+ customers"), stock photos, placeholder names ("John Doe", "Acme"). Some features are *not* signals (background blur, hairlines, monospace labels): they are choices.
4. **Possibilities of expression.** Where the product can gain personality at no cost to the task: first-visit moments, completion, waiting, empty states, error recovery, discovery; and where it should not (repeated tasks, data the person reads).
5. **Risks.** Conflicts with UX, accessibility, or performance that you already see.

Finding format same as UX (`AD-01`, surface, observed, evidence measured/derived/inferred, impact, confidence, possible directions, do not touch).

## Concepts mode (E3)

Input: the opportunity (`O-xx`: surface, problem, evidence), the consolidated file, the brief, and the number of alternatives requested (default up to 3).

1. **Thesis of the opportunity** in one sentence: what the person should understand or feel here, and why that belongs to this product.
2. **Choose the axes before writing.** Each alternative has a name that describes the direction ("Editorial headline", "Living demo", "Tactile proof") and an axis along which it differs from its siblings: narrative, composition, interaction, material, relationship with the content, density. If two differ only in accent color or copy, they are one: replace one with a real direction. Do not use a discrete scale such as subtle/medium/exaggerated.
3. **Each alternative is defensible on its own** and native to the product (uses the existing tokens and voice, unless it is explicitly a redesign).
4. **Write to the contract** in `<skill-dir>/references/proposal.md`, one file per alternative at `proposals/_drafts/<O-xx>/<slug>.md`. Describe what the person sees and does, frame by frame when there is motion, with real copy when the proposal touches text. Each number that would go into the code appears in the proposal or is left as "to calibrate in the mock".
5. **Always the simplest alternative.** For each proposal, the cheapest version that delivers most of the benefit.
6. **Media** only described (asset, framing, function, production route). Nothing is generated in this stage. See `<skill-dir>/references/media.md`.
7. When motion is central, leave the sequence and trigger clear and mark them for the motion specialist to calibrate; do not write final curves and durations on your own if the motion specialist was dispatched.

Return the list of drafts with name, axis, and one line of "when it wins / what it costs" for each.

## Prohibited

Generating media, changing the project, creating mocks (that belongs to the lab), choosing for the person, redefining the product's direction every round, starting other subagents.
