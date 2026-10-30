# Input modes

The mode is recorded in `run.json` (`url`, `code`, `both`) and changes what each stage can assert and do.

## URL only

- Inspect public behavior or an authorized environment: composition, text, navigation, visible states, desktop and mobile (automated browser when available; otherwise the HTML obtained and captures supplied by the user).
- Save the HTML to `evidence/recon/snapshot-<date>.html` and record `fingerprint R --url-snapshot <file>`.
- Architecture, framework, and internal performance are **inferences**: mark them. Do not guess accessible semantics or implementation from pixels; record what only the code would confirm.
- Mocks are independent demonstrations with enough context; state known differences in typography, content, and behavior. Never say the reproduction is the original application.
- There is no E7 on the real target: `jiu` refuses `implement`. If the user later provides the code, start a `both` run (`init --url … --code … --new`) and cite the previous run in `brief.md`, reusing proposals and mocks as drafts. If there is an authorized editing integration (CMS, site editor), `decide … implement --external` is allowed only with that integration confirmed. Offer as the deliverable an implementation package (proposal + mock code + assets + criteria).

## Code only

- Detect technologies, routes, components, tokens, dependencies, and build and dev scripts. Read DESIGN.md, PRODUCT.md, `.design`, README, Storybook.
- Run locally when the environment allows it (dependencies already installed or installable without global effects; ask before installing). Use the project's dev server in the background.
- Does it not render? Record the blocker in `evidence/recon.md`, separate code conclusions from visual ones, and do only a partial visual reconstruction, identified as an approximation.
- Mocks are standalone HTML in the run directory, built with the real tokens, fonts and assets copied from the project (read-only access to the project).

## URL and code

- Relate the published version to the code snapshot (commit, deploy date, `deployedVersion`). Compare the published page with the local rendering.
- Identify relevant divergences (content, flags, A/B tests, CMS) **before** transferring a visual decision into files; record them in the recon.
- Link every proposal to the version and surface evaluated (`jiu` records commit and fingerprint per opportunity).

## In all modes

- Discover what the product does and the goal of each surface before proposing.
- Reuse existing documentation and identity; do not redefine the art direction for every worker.
- Ask only about what materially changes the decision and cannot be inferred safely.
- Check the real environment before assuming a framework, hosting, browser, media generation, or subagents.
