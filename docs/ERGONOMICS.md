# Ergonomics and interaction design

How the site's interface follows established ergonomics and usability research, and where each principle is applied in the code.

## Principles used

| Principle | What it says | Source |
|---|---|---|
| **Target size** | Pointer targets should be at least 24 × 24 CSS px (WCAG 2.2 SC 2.5.8, AA), and 44 × 44 for important controls (SC 2.5.5, AAA). | [W3C: Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [What's new in WCAG 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/) |
| **Fitts's law** | Time to hit a target grows with distance and shrinks with size. Big, near targets are faster and cause fewer errors. | [NN/g: Fitts's law](https://www.nngroup.com/articles/fitts-law/fitts-law/), [Laws of UX: Fitts's law](https://lawsofux.com/fittss-law/) |
| **Touch accuracy** | Fingers are imprecise. Small or crowded targets lead to missed and accidental taps; physical size matters more than pixels. | [NN/g: Touch target size](https://www.nngroup.com/articles/touch-target-size/) |
| **Hick's law / progressive disclosure** | Decision time grows with the number of choices. Show the essentials first and reveal detail when it is needed. | [DfE: Laws of UX](https://accessibility.education.gov.uk/profession-guidance/interaction-design/laws-of-ux) |
| **Direct manipulation** | Act on the object itself, with continuous visible feedback and easy reversal (Shneiderman). | Standard HCI principle |
| **Recognition over recall** | Show symbols, units and current values instead of making students remember them. | Nielsen's heuristics |

## Where they are applied

### Values live on the simulation, not in a side panel (Fitts, direct manipulation)
- Every slider parameter becomes a **chip under the canvas** (`m = 2.4 kg`), right next to the thing it changes (`sim/core/ui.js`, `dockParams`). The eye and the pointer travel a few pixels instead of across the screen.
- Tapping a chip opens a **number editor** beside it: a large typed field (24 px monospace), − / + steppers that repeat when held, a slider, and quick values. Typing exact exam values needs no fine pointer control.
- On force and motion pages you can **drag the diagram itself**: arrow tips to turn forces, the launch arrow to aim a projectile, velocity arrows in collisions, string ends and slope tops. **Draw-then-type**: drag from empty space to draw a new force, then type its size (`SIM.view.interact`, `SIM.ui.askNumber`).
- Angles snap to 15° multiples when within 2°, so common exam angles are easy to hit.

### Big, forgiving targets (target size, touch accuracy)
- Primary buttons, chips, play controls and stepper buttons are **44 px** tall; secondary controls are at least **34 px**.
- Canvas handles have a **22 px grab radius** (a 44 px target), plus **8 px extra for touch**. Grab rings show what can be moved.
- Lesson answer buttons are 44 px tall.

### Fewer choices at once (Hick's law, progressive disclosure)
- The dashboard asks one question: **which course?** Two large cards.
- The course page leads with one recommended start (the guided lesson or projectiles) and a 5-step route, then the full list.
- Rarely used detail (exact values for each force) sits in a collapsed **"Exact values"** section; drawing on the diagram is the main way in.
- Exam mode reveals answers **one line at a time**.

### Thumb zone on phones
- Under 720 px wide, the number editor opens as a **bottom sheet** within thumb reach, with room for the home indicator.
- Mode tabs scroll sideways instead of wrapping into several rows.

### Feedback and recovery
- Every edit updates the diagram and the working **immediately** (continuous feedback).
- Escape or tapping outside closes the editor; a value is always one tap away from being changed back.

### Perception and comfort
- Text contrast is at least 4.5:1 in light and dark themes. Filled buttons use a deep gradient (`--grad-a`, `--grad-b`) so white text stays readable in dark mode.
- Each course has its own colour (Mechanics indigo/violet, Physics teal/blue), which tells students where they are.
- `prefers-reduced-motion` is honoured: simulations show the finished state instead of auto-playing, and the dashboard's background animation becomes a still picture.
- Focus is always visible. Chips work from the keyboard (Enter opens the editor; ↑ / ↓ nudge the value, Shift for ×10), so nothing depends on dragging.

## Still to verify
These follow published guidance but have not been measured with real students. Next step: watch a few students new to mechanics complete a task on a phone and a laptop, and note where they hesitate or mis-tap.
