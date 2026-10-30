---
name: jiu-seasonal
description: Opt-in sub-skill of juice-it-up. Seasonal and holiday details (a hat on the logo, a few snowflakes, a small web in a menu corner, confetti on the site's anniversary) that add personality with minimal effort and maintenance, fit the existing UI, and switch themselves on and off by date. Loaded only when the user asks for seasonal/holiday/festive details or accepts the controller's one-line offer; never used proactively.
---

# Seasonal details

Small, time-boxed touches that show personality without costing clarity, usability or identity. The best recommendation for a page can be to add nothing. Adapted from `impeccable` (`delight`, `animate`: fit to product, frequency, proportional cost; Apache-2.0, concepts only) and from the conversation brief that motivated this sub-skill.

Terms: **seasonal theming / holiday theming** (visible decoration for an occasion), **seasonal branding** (adapting the identity, like a hat on the logo), **festive effects** (snow, confetti). A hidden surprise on interaction is an **easter egg**: allowed only as an extra on top of a visible decoration, never hiding required functions.

## When this runs

Only when one of these is true:
- the user asked for it (seasonal, holiday, festive, Christmas, Halloween, Carnival, the site's anniversary, a date…);
- the user accepted the controller's one-line offer (`seasonal.requested true`).

It does not run by inference ("the site sells toys, so Christmas") and it does not add itself to other opportunities. When it runs, it uses the normal workflow: same run, same state, same lab, same authorizations.

## Inputs

`brief.md`, `evidence/recon.md` (language, country, audience, surfaces, existing assets and motion library), `evidence/a11y-perf.md` if it exists, and the occasions the user named. If the user named none, ask which ones — offer the occasions that fit the audience's locale and calendar, at most a handful, and let them pick. Record them: `jiu set R seasonal.occasions '["christmas","halloween"]'`.

Do not run the full E2 diagnostics just for seasonal work: if recon already exists, reuse it; if not, run a reduced recon (identity, logo, header/menu, hero, motion library, audience locale).

## The gate (every candidate passes all of it)

1. **Occasion fits the audience and the brand.** Dates and meaning depend on culture and region; religious and politically charged occasions need care; don't decorate every possible date. A serious or sensitive product (health, finance, legal, grief) usually gets nothing or only the lightest touch. No stereotypes, no loaded symbols as ornament.
2. **Fits the surface mode.** Persuade/Experience pages can carry visible decoration. Operate/Read pages: only margins of the identity (logo, an empty state, a footer), never over data, forms, or reading text.
3. **Never in the way.** Does not cover text, controls, focus rings or the fold's main action; does not catch clicks (`pointer-events: none` on decoration); does not shift layout; works on mobile one-handed use.
4. **Survives repetition.** A returning visitor sees it on every visit during the window: it must not tire on the tenth view. Animated effects run briefly or occasionally, not as a permanent loop competing with content.
5. **Cheap now and every year.** Count first build, yearly re-activation, and removal. Reuse colors, assets, components and the motion library already in the project.

Expect to reject most candidates. Few well-chosen interventions beat many.

## Proposals

Each candidate becomes an opportunity with `jiu opp-add R --kind seasonal --occasion <occasion> --title … --surface … --paths …` (seasonal opportunities have their own limit, `limits.maxSeasonalOpportunities`, default 3, and do not use the regular opportunities budget). Each has V0 (no decoration) and, when motion is considered, **a static variant and an animated variant** to compare: motion is never assumed.

Write each alternative in the normal proposal contract (`<skill-dir>/references/proposal.md`) plus this section:

```markdown
## Seasonal specifics
- Occasion and audience fit: <why this occasion, for whom, cultural notes>
- Activation window: <start and end, timezone, how movable dates are computed (e.g. Carnival from Easter), or a manual switch>
- Off-date preview: <how to see it outside the window, e.g. ?seasonal=halloween or an env flag>
- Kill switch: <one place to turn it off immediately>
- Footprint outside the window: <must be zero DOM and zero bytes loaded; how>
- Removal: <one folder/module + one config entry; what deleting it takes>
- Recurrence cost: <what has to be done next year, ideally nothing>
- Static vs animated: <which this variant is, and the counterpart>
```

## Building blocks, simplest first

| Need | First choice | Only if justified |
|---|---|---|
| Hat on the logo, web in a corner, bunting, small ornaments | SVG + CSS overlay positioned to the brand mark; `aria-hidden="true"`, `pointer-events: none` | — |
| Simple movement (a bat crossing, a swaying ornament) | CSS/WAAPI, or the motion library the project already uses | Motion (motion.dev) for sequences that need control |
| Falling snow in a limited area | a few CSS/SVG flakes | `magic-snowflakes` (count, size, speed, area, lifetime) or `tsParticles` (presets, image particles; import only the needed bundle) |
| Brief confetti on a moment (anniversary, a completion) | — | `canvas-confetti` in a bounded canvas, with `disableForReducedMotion: true` |

Rules for any effect: one engine per component; exact pinned version; loaded lazily **only inside the window**; stops when the tab is hidden; under `prefers-reduced-motion`, static decoration only (no falling, flying or bursting); cap particle counts for low-end phones; no sound. Generated imagery only through `jiu media claim` with media authorization; hand-made SVG in the brand's colors is usually better and cheaper.

## Lab

Mocks follow the lab rules (`<skill-dir>/subskills/lab/SUBSKILL.md`): the real page context with the decoration on, compared with V0, static vs animated side by side in the picker, desktop and mobile, reduced motion. The mock shows the decoration regardless of today's date; its fidelity declares that the activation logic is not part of the mock.

## Implementation (E7, only for revisions chosen with `implement`)

- One self-contained module per occasion (e.g. `seasonal/halloween/`) plus one config entry (window, enabled flag). Do not scatter edits across components; the only touch points are a mount point and the config.
- The date check runs before anything loads; outside the window nothing is imported or rendered.
- Off-date preview and kill switch as specified in the proposal.
- If the project has tests, cover the window logic (before, inside, after, timezone edge, movable dates).

## Verification (E8)

In addition to the normal integration checks: outside the window, zero DOM and zero network for the decoration; inside the window (via the off-date preview), decoration present, not covering controls or text, no layout shift, works on mobile, reduced motion leaves only static decoration, effect stops when the tab is hidden, kill switch works.

## Prohibited

Running without the user's request or acceptance, proposing seasonal ideas inside other opportunities, assuming occasions, decorating sensitive surfaces (checkout, forms, error states) unless the user asks, adding permanent loops, loading anything outside the window, installing `impeccable` or any library without the user's approval.
