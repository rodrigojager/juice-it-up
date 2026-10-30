# Motion standards

Reference values adapted from Emil Kowalski, `review-animations/STANDARDS.md` (MIT). The product's tokens (`.design`, DESIGN.md, existing variables) take precedence over this table; it fills in where the product is silent.

## Should it animate? (frequency)

| Frequency | Decision |
|---|---|
| 100+ times/day (shortcuts, opening the command palette) | Never |
| Dozens/day (hover, list navigation) | Remove or drastically reduce |
| Occasional (modal, drawer, toast) | Standard animation |
| Rare / first time (onboarding, celebration, first-visit hero) | May have delight |

## Curves

- Entering or exiting → strong `ease-out`. Moving/transforming on screen → strong `ease-in-out`. Hover/color → `ease`. Constant movement (marquee, progress) → `linear`.
- Never `ease-in` in UI: it delays the moment the person is looking at.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## Durations

| Element | Duration |
|---|---|
| Press feedback | 100–160 ms |
| Tooltip, small popover | 125–200 ms |
| Dropdown, select | 150–250 ms |
| Modal, drawer | 200–500 ms |
| Marketing / explanatory | can be longer, with a reason |

UI under 300 ms. Faster spinners make the wait feel shorter. Tooltips after the first one appear without delay.

## Physicality

- Never `scale(0)`: `scale(0.9–0.97)` + `opacity: 0`.
- Popover/dropdown/tooltip grow from the trigger (`transform-origin`); modals stay centered.
- Pressing: `transform: scale(0.97)` on `:active`, `transition: transform 160ms ease-out` (0.95–0.98).

## Springs

For dragging with momentum, "living" elements, interruptible gestures, decorative mouse tracking.

```js
{ type: "spring", duration: 0.5, bounce: 0.2 }   // bounce 0.1–0.3; no bounce in most of the UI
```

## Interruption and entrance

- CSS transitions resume from the current state; keyframes restart from zero. Things triggered rapidly use transitions.
- Entrance without JS: `@starting-style { opacity: 0; transform: translateY(8px); }`.
- Percentage `translate` is relative to the element itself (`translateY(100%)` = its own height).

## Asymmetry

Slow where the person decides, fast where the system responds (e.g., hold to delete: 2 s linear on press, 200 ms ease-out on release).

## Groups

Stagger of 30–80 ms in lists/grids on an occasional page; decorative, never blocks interaction.

## Performance

- Only `transform` and `opacity` (compositor). `width/height/margin/padding/top/left` trigger layout.
- Do not drive children's transforms via a CSS variable on the parent (recalculates the styles of all of them).
- Motion/Framer: `x`/`y`/`scale` run on the main thread; prefer `transform: "translateX(…)"` under load.
- CSS beats JS under load; WAAPI gives JS control with CSS performance.
- `clip-path: inset()` suits reveals, press-and-hold overlays, comparators.

## Accessibility

- `prefers-reduced-motion`: keep opacity/color, remove displacement and large scale.
- Hover in `@media (hover: hover) and (pointer: fine)`.
- Autoplay > 5 s next to other content needs pause/hide; decorative loops stop under reduced motion.

## Immediate alarm triggers

`transition: all` · `scale(0)` · `ease-in` in UI · animation on a keyboard action or a high-frequency one · UI > 300 ms without reason · `center` origin on an anchored popover · keyframes on a toast/toggle · animated layout properties · no reduced motion · hover without a gate · symmetric timings on press/hold · everything entering at once where a stagger fits.

## Correction preference

1. Delete the animation. 2. Reduce it. 3. Fix the curve. 4. Fix origin/physicality. 5. Make it interruptible. 6. Move it to the GPU. 7. Asymmetric timings. 8. Polish (blur in crossfade, stagger, `@starting-style`). 9. Accessibility and cohesion.
