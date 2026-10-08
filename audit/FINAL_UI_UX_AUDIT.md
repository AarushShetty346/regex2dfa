# UI audit: Compiler Visualizer (after redesign, branch `feature/ui-overhaul`)

**Score:** 100 − (0×12) − (0×8) − (0×4) − min(5, 4×1) = **96/100**. **Verdict:** Ready to ship.
**Profile:** none; judged as an app. **Checked:** the same tools, widths and states as the baseline
(`uicheck.py` at 360/768/1280 on four routes, `audit.js` in 9 states at 390/1440, overflow at 7 widths), the e2e
script (34/34), screenshots in `screenshots/after/`, and a keyboard walk. Raw numbers: `evidence/measurements.md`.
**Visual quality:** Distinctive with slips (see below).
**Baseline:** 27/100 (3 Critical, 11 Warnings, 6 Polish). See `BASELINE_UI_UX_AUDIT.md`.

## Baseline findings, re-checked

| ID | Finding | Status | Evidence |
|---|---|---|---|
| C1 | Page scrolls sideways on phones | **Fixed.** 0px overflow in all 9 states at 360, 390, 768, 1024, 1280, 1440, 1920 | `measurements.md` overflow table |
| C2 | Phone nav links unnamed | **Fixed.** Labelled "Open menu" button opens the full text nav; Escape closes; choosing a page closes | `uicheck` names 6 → 0; e2e |
| C3 | Secondary text below 4.5:1 | **Fixed.** Regex page contrast candidates 35–37 → 1, which is the disabled "Previous" button (3.57:1; disabled controls are exempt under WCAG 1.4.3). Bottom-up's 3 are the same disabled button in three controllers. `audit.js` contrast fails: 0 in every state | `uicheck`, `audit.js` |
| W1 | Graphs: no text alternative, zoom or fit | **Fixed.** Every graph has Diagram/List toggle, zoom −/+, Fit, scroll and drag-pan | e2e zoom 708→1084px, fit restores, list rows and roles; `describe.test.ts` |
| W2 | Stage selector hides stages | **Fixed.** Tabs wrap into a grid below 960px; all five visible at 390/768 | `after/regex-*-390.jpg`, `-768.jpg` |
| W3 | Not a tab pattern | **Fixed.** `tablist`/`tab`/`tabpanel`, roving tabindex, ←/→/Home/End; arrows in the tablist do not step the algorithm | e2e |
| W4 | Stale visualization unlabelled | **Fixed.** Amber note names the expression shown; the error marks the failing character | e2e; `after/regex-error-*.jpg` |
| W5 | Bottom-up looks like another product | **Fixed.** Shared tokens, panels, step controller, tables; method tabs; icon instead of emoji; amber only for handles | `after/bottom-up-*.jpg`; radii 5 → 4, font sizes 11 → 8 |
| W6 | Planned modules look clickable | **Fixed.** Module list with text status; planned rows are plain `div`s; nav groups "Available" / "Planned" | `after/home-1440.jpg` |
| W7 | Disabled primary looks primary | **Fixed.** Disabled primary drops its fill | `after/regex-test-1440.jpg` |
| W8 | Start/accepting not exposed in tables | **Fixed.** `role="img"` markers "start" / "accepting" drawn as arrow and double ring; table text unchanged | semantic diff |
| W9 | 4px scrubber | **Fixed.** 24px hit area, 4px drawn track | e2e |
| W10 | Silent page changes | **Fixed.** Per-page `document.title`; focus moves to the new `h1` | e2e |
| W11 | Endless demo animation | **Fixed.** Pause/play button; reduced motion shows the final frame | `after/home-*.jpg` |
| P1 | 17 font sizes | **Fixed.** 6–8 per page, all from the scale (12/13/14/15/17/22/32 + hero) | `uicheck` census |
| P2 | 6 radii | **Fixed.** 4–5: 6, 8, 12, 50% (nodes, dots) and 4px on tags inside 8px containers | census |
| P3 | Off-grid spacing (11–13 values) | **Fixed.** 2–3 values, all borders/1–2px nudges | `audit.js` |
| P4 | Heading skip h1→h3 | **Fixed.** `uicheck` headings 1 → 0 | `uicheck` |
| P5 | Decorative glow on every card | **Fixed.** Removed; the only texture is the canvas dot grid | screenshots |
| P6 | Forced `<br>` in hero | **Fixed.** `text-wrap: balance` | screenshots |

## Remaining findings

### Polish (4)
- **P7. Two-line stage tabs and step-list rows read as "wrapping labels"** (`uicheck` widows 15 on the regex
  page). Deliberate: each tab is a label plus a count, and each step row is number, text and rule. Counted
  anyway because the tool flags it; no change planned.
- **P8. The expression input (48px) sits beside a 40px ε button** (`control_heights`). The button is an inset tool
  inside the field, so a smaller size is intended.
- **P9. 4px near-miss left edge in the expression form at 360/768** (`near_miss_edges`). One child of the form
  starts 4px off the edge the others share. Not noticeable in the screenshots; left as is.
- **P10. Contained horizontal scrollers have no explicit cue.** The parse trace and very wide NFAs scroll inside
  their frames on phones; the cut-off column is the only cue. The scrollers are keyboard-focusable and labelled.

### Not scored, by the skill's own rules
- Disabled buttons below 4.5:1 (exempt under WCAG 1.4.3).
- One "<24px target" per page: the skip link, which is 1×1px until focused (then full size, e2e-verified).
- Targets of 24–43px on desktop: dense 30–36px controls on a pointer-first tool pass WCAG 2.5.8; on
  `pointer: coarse` they grow to 36–40px (e2e: no visible control under 24px at 390 with touch).
- `audit.js` "layout-triggering animations": the same reduced-motion false positive as in the baseline.

## Visual quality: Distinctive with slips
What makes it specific to this product: the canvas is the largest object on every stage, with its own toolbar
and the step controls docked to it; the accent appears only where the user acts or where the algorithm is right
now; teal, amber and red each mean one thing; state names, sets and transitions are always monospace; the home
page shows the real pipeline with real counts instead of feature cards.
Slips: the minimization stage's six categorical group tints are necessarily more colourful than the rest; the
Bottom-up page is long by nature (four stacked sections) and has no section jump links.

## User walk
- Keyboard: Skip link is the first stop and works; every one of 40 Tab stops shows a focus ring (e2e); stage tabs
  take arrow keys without moving the stepper; ←/→ step everywhere else.
- 200% zoom (≈720px wide): layout switches to the top bar with the menu and stacked workspace; nothing scrolls
  sideways (checked at 768 and 390).
- Edge data: invalid input shows the pointer and the stale-result note; `?re=` with an invalid expression falls
  back to the default and shows the error (e2e).

## Wiring to confirm
None. No control is decorative; every link has a real destination.
