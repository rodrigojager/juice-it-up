---
name: jiu-recon
description: Sub-skill of juice-it-up (E1). Technical and visual recognition of a site by URL, code, or both; produces evidence/recon.md and the brief draft. Invoked by the controller; do not use outside the workflow.
---

# Technical and visual recon

You map the terrain on which all the proposals will rest. You do not propose improvements: you record what exists, with what confidence, and what could not be observed. Adapted from the environment detection of `design-lab` (0xdesign) and from `reading-others-interfaces` (AgentsORG/design-engineering), without the JS framework assumptions.

## Inputs

From the dispatch brief: run directory, mode (`url`/`code`/`both`), URL, code path, surfaces in scope.

## Confidence scale

Mark every claim:
- **measured** — you observed or read it directly (file:line, capture, computed value);
- **derived** — a direct consequence of something measured;
- **inferred** — a plausible hypothesis without confirmation (e.g., a framework deduced from class names). Say what would confirm it.

## Procedure

### 1. Product and surfaces
- What the product does, for whom, and the goal of each surface in scope (persuade, operate, read, experience — see modes in `../art-direction/SUBSKILL.md`).
- Main flows and what counts as success in each.
- Sources: the page itself, README, PRODUCT.md, docs, metadata, "about" pages.

### 2. With URL
- Automated browser if available (e.g., `claude-in-chrome` tools; load them in a batch). Capture desktop (1440×900) and mobile (390×844), above and below the fold, and the states you can trigger without real effects (hover, open menu, focus, empty form with local validation error). Do not submit forms, log in, buy, or send messages.
- No browser: fetch the HTML (`curl -sL`), list titles, sections, links, scripts, and stylesheets; say that dynamic behavior was not observed.
- Save the HTML to `evidence/recon/snapshot-<YYYY-MM-DD>.html` (the controller records the fingerprint) and the captures to `evidence/recon/`.
- Record: apparent typography, apparent palette, spacing, density, existing motion (what animates, when, for how long), media (video, heavy images), visible performance signals (time to content, layout jumps), navigation and copy.
- Architecture and implementation are **inferred**. Do not deduce accessible semantics from pixels.

### 3. With code
- Stack: package manager (lockfile), framework (configs: next, vite, astro, nuxt, remix, sveltekit, eleventy, hugo, WordPress, static HTML…), styling (Tailwind, CSS Modules, CSS-in-JS, Sass, vanilla), component library, motion libraries (Motion/Framer, GSAP, Anime.js, Lottie, Rive, Three.js), fonts.
- Identity: tokens (`:root` vars, Tailwind theme, UI library theme), DESIGN.md, `.design`, PRODUCT.md, Storybook. Motion tokens (durations, curves) if they exist.
- Routes/pages of the surfaces in scope and the components that compose them, with `file:line`. These paths feed the `--paths` of the opportunities.
- How to run: `dev`/`build` scripts, required environment variables. Try to run the dev server in the background **without installing anything globally**; if dependencies are missing, ask the controller before installing. If it does not render, record the blocker and its cause.
- Git: commit, branch, dirty state.

### 4. URL and code together
- Which commit does the published version correspond to? (meta tags, headers, changelog, deploy date.)
- Relevant published × local differences: CMS content, feature flags, A/B tests, missing assets. List them before any transfer of visual decisions.

### 5. Design history (always, when any record exists)
Before anyone proposes changes, find out why the current design is the way it is. Look for decision logs, changelogs, ADRs, READMEs per version, design docs, PR descriptions, commit messages, comments in the code, and earlier versions kept side by side. Write `evidence/design-history.md`:
- a short timeline of versions and who drove each change;
- per section/element of the surface: what it is, why it exists or looks this way (with citation), and its status — **owner's explicit request**, **owner approved/kept**, **agent's choice never discussed**, or **open point**;
- options that were tried and rejected or reverted, and why;
- the owner's settled constraints and preferences (wording, terms, things to keep or remove, tone);
- open points the owner left, and areas with no recorded rationale (where there is freedom).
If the history is long, the controller may dispatch it as a separate task in parallel with the rest of the recon. No records found: say so in one line.

## Output: `evidence/recon.md`

```markdown
# Recon — R-xxx (date, mode)

## Source and version
URL (+ date/time of snapshot) · code (path @ commit, branch, dirty?) · published × code match

## Product and surfaces
| Surface | Goal | Mode | Main flow | Files (if code) |

## Existing identity
Typography, color, spacing, radius, shadow, tone of voice, motion — with origin (token/file or observed) and confidence

## Stack and execution
(code) framework, styling, components, motion, how to run, whether it ran

## Observations per surface
Desktop / mobile / states — with captures referenced

## Known constraints
Technical, brand, legal, content

## Available and unavailable evidence
What was seen, what could not be seen, and why (no browser, login, build failed…)

## Questions that would change the direction
Only those that cannot be inferred safely (at most 3)
```

Also propose, in a separate block, the filling of the `brief.md` sections (the controller decides what goes in).

## Prohibited

Changing the project, installing global dependencies, submitting forms or any mutation on the published site, starting other subagents.
