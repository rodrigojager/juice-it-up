# Media, libraries, and cost

Impact can come from illustration, composition, typography, copy, optional audio, narrative, and interaction. Animation is not a requirement of every proposal, and generated media is not either.

## By phase

| Phase | What to do with media |
|---|---|
| Concept (E3) | Describe the asset, framing, function, and production route. Nothing is generated. |
| Preview (E4) | Draft or existing asset when that is enough to answer the design question. Declare "draft media" in the fidelity. |
| Chosen version (E7) | Produce and validate the final media within budget and authorization. |

Do not automatically generate a video for every suggestion.

## Routes and engines

| Route | When |
|---|---|
| Compressed video (`<video autoplay muted loop playsinline>`, H.264/HEVC/AV1/WebM, poster) | continuous or looping playback, without fine time control |
| Frames on canvas (image sequence) | reversible control, scroll-scrub, exact frame |
| Sprites | small, short cycles |
| CSS/SVG layers | simple movements, icons, reveals, light parallax |
| Rive | authored, interactive states (state machine) |
| Three.js / WebGL | geometry and camera that are truly interactive |

- One main engine per component; respect the stack already adopted (if the project uses Motion, do not bring GSAP into the same component without the user's decision).
- CSS/WAAPI, GSAP, Motion, and Anime.js are tools, not aesthetic directions.
- Do not confuse video with a manipulable 3D scene: if the person does not control the camera or geometry, it is probably video.
- Check: the provider's model catalog, codecs and alpha support, loop continuity, decoded memory (width × height × 4 bytes × frames in memory), network weight, static fallback, and behavior under reduced motion (decorative loops stop).

## Higgsfield (optional)

A capability triggered by need, not by default. Adapted from `higgsfield-ai/skills` (`higgsfield-generate`), with these differences for this workflow:

1. **Availability:** check `higgsfield --version` and `higgsfield account status`. Do not install the CLI or log in unless the user asks: installing runs a remote script, and authenticating is interactive. Absent → record `capabilities.higgsfield false` and propose routes without generation.
2. **Authorization and budget:** generation is paid. It requires `authorizations.media.authorized` with a quote from the user, and a `limit`. Unlike the original skill, **estimate the cost** when the provider allows it, and report it before generating.
3. **Idempotency:** before each generation, `jiu media R claim --spec "higgsfield|<model>|<prompt>|<parameters>" --estimate N --ref O-xx/Vy/rn`.
   - `CLAIMED <key>` → generate (use `--wait`), download the result to `assets/<O-xx>/…`, and `media done --key <key> --path assets/… --cost N --provenance "<model, job id, date>"`.
   - `EXISTS` → reuse the asset; do not generate again.
   - `IN_PROGRESS` → a previous attempt did not complete: check the provider's history before any new generation.
   - Failed → `media fail --key … --reason …`.
4. **Model choice:** use the defaults of the original skill (high-fidelity image, video, illustration) unless the user asks otherwise; the chosen model goes into the `--spec`.
5. **Validation:** check continuity, artifacts, illegible text, coherence with the identity, weight after compression. A rejected asset is not deleted: it stays in `assets/` with the reason in `media.jsonl` (via `fail` on a new adjustment claim, or a note in the report).
6. **Out of scope:** the `higgsfield-websites` skill (creating and publishing sites on Higgsfield) is not part of this workflow; here the target is the user's site.

## Provenance

Every asset in `assets/` has its origin recorded: existing (path in the project), created by hand (by whom), or generated (provider, model, job, date, cost). The license of third-party fonts, images, and sounds is verified before E7.
