# Proposal contract

Each alternative for an opportunity is a Markdown file with the fields below. The controller refuses (returns to the worker) drafts with missing fields or vague descriptions.

## Template

```markdown
---
opportunity: O-01            # filled in by the controller
variant: V2                  # filled in by the controller at registration
revision: r1
name: Editorial headline     # describes the direction; never "Option A"
axis: narrative              # axis in which it differs from its siblings: narrative, composition, interaction, material, relationship with the content, density…
---

## Surface and location
Page, route, component, viewport in which it appears. With code: files and lines.

## User goal and observed problem
What the person is trying to do here and what gets in the way today.

## Evidence and confidence
Sources (recon §, diagnostic #, capture, file:line) and confidence (high/medium/low) with the reason. Mark inferences as inferences.

## Settled decisions touched
From `evidence/design-history.md`: which recorded decisions this alternative keeps, and which it would change (cite each). Changing an **owner's explicit request** or reopening a **rejected option** needs new evidence that the earlier reason no longer holds, stated here; otherwise drop the alternative. "None touched" is a valid answer.

## What the person sees and does
Concrete description, frame by frame when there is motion. Real copy when the proposal changes text.

## Trigger
Click, scroll, state change, first visit, explicit action, loading.

## Sequence
- Before:
- During:
- Completion:
- Interruption (the person acts midway):
- Exit:
- Repetition (second visit, hundredth time):

## Expected benefit and why it belongs to this product

## What stays unchanged

## Candidate techniques and libraries
Main engine and why; respect the stack. **Simpler alternative** that delivers most of the benefit.

## Assets and production route
Existing, to create, to generate (with route: compressed video, frames on canvas, sprite, CSS/SVG, Rive, Three.js). Draft for the mock vs. final.

## Desktop, touch, and reduced motion
Behavior in each. Reduced motion is gentler, not absent: keep opacity/color, remove displacement.

## Estimated cost
Implementation (S/M/L and why), network (KB/MB), memory (decoded, for large video/image), maintenance.

## Dependencies and incompatibilities
With other opportunities (O-xx), tokens, assets, libraries.

## Acceptance criteria and removal test
Verifiable. **Removal test:** what is lost if the intervention is removed; if nothing relevant, the proposal does not hold up.

## Limitations, assumptions, and simulations
What we do not know; what the mock will simulate.

## Decision state and reason
Filled in by the controller from the state (do not edit by hand in a recorded revision).
```

## Precision

Avoid: "add a premium animation", "make it more modern", "more impactful hero".

Prefer: "When the action is confirmed, the label stays readable; an icon briefly responds to the real result; on failure, the state returns with a clear recovery path. There is no celebration on repeated operations."

Every number you would write into code (duration, curve, distance, blur, size) appears in the proposal or is marked "to calibrate in the mock".

## Alternatives

- They differ along a named axis; if two only change the accent color or copy, they are one.
- They do not follow a fixed discrete scale (subtle/medium/exaggerated).
- All are choices you would defend publishing. A sloppy variant does not widen the exploration.
- Impact is not a synonym for animation: illustration, composition, typography, copy, optional audio, narrative, and interaction are valid paths.
- `V0 — keep original` always exists and is a legitimate answer.
