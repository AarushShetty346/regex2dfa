# UI audit: Compiler Visualizer (baseline, `main` @ `dbe9267`)

**Score:** 100 − (0×12) − (3×8) − (11×4) − min(5, 6×1) = **27/100**. **Verdict:** Do not ship as a premium tool
(no Blockers; the band is set by three Critical findings and eleven Warnings).
**Profile:** none matched exactly; judged as an app (clarity over marketing), with the home page also checked
against the landing-page guidance.
**Checked:** `uicheck.py` (EnchStyle/ui-ux-audit-skill) at 360/768/1280 on three routes; `audit.js`
(imYChaudhary22/ui-ux-audit) injected into 9 app states at 390 and 1440; page overflow at 7 widths;
screenshots of every state at 390/768/1440; a keyboard walk; code reading. Raw numbers: `evidence/measurements.md`
and `evidence/uicheck-before-*.txt`.
**Visual quality:** Competent but forgettable. A tidy dark UI with a real live demo, but one orange accent on
everything, card-on-card layouts, and a second page (Bottom-up) that looks like a different product.
**Top 3:** C1 page scrolls sideways on phones; C2 phone navigation has no accessible names; C3 secondary text
fails contrast in about 35 places on the regex page.

How the guidance repos were used: the scored format, severities and "what not to flag" rules are from
EnchStyle/ui-ux-audit-skill; the measured checks (contrast, targets, off-grid spacing, misalignment,
animation properties, overflow) are from imYChaudhary22/ui-ux-audit's `audit.js`; findings name the
hueyexe/frontend-agent-skills principle they break. Every finding below lists what it is, why it hurts, the
principle, the fix, and how the fix is verified.

## Critical (3)

**C1. Page-level horizontal scroll on phones** (Subset construction stage; Bottom-up page)
- **Found:** `scrollWidth − viewport` = 345px at 360, 315px at 390, 180px at 768 on the Subset stage (the NFA
  reference graph's `min-width` pushes its grid track wider than the screen). Bottom-up: 142px at 360 from the
  "Load sample" `<select>` sizing to its longest option, and the sets table.
- **Why:** the whole page wobbles sideways on an iPad/phone; the rail and controls slide out of view.
- **Principle:** responsive layout; `ui-visual-composition` (layout must hold at every width).
- **Fix:** `minmax(0, 1fr)` tracks on the stage and section grids, contain wide drawings and tables in their own
  scrollers, let the select shrink.
- **Verify:** overflow = 0 at 360, 390, 768, 1024, 1280, 1440, 1920 for all 9 states (`screens.py`).

**C2. Phone navigation links have no accessible name**
- **Found:** at ≤720px `.nav-label` is `display: none` and the Phosphor icons have no title, so the five links and
  the brand are announced as "link". `uicheck` names: 6 at 360px.
- **Why:** screen-reader users on phones cannot tell destinations apart; sighted users must guess from icons.
- **Principle:** `accessibility-inclusive-design` (name, role, value); `information-architecture-navigation`
  (labelled navigation).
- **Fix:** a labelled menu button that opens the full text navigation.
- **Verify:** `uicheck` names = 0 at 360; e2e menu open / Escape / choose-a-page checks.

**C3. Secondary text below 4.5:1**
- **Found:** `--faint #6e717a` on `#141518` = 3.74:1, used for step numbers, upcoming steps, table headers,
  "soon" badges and "Coming soon"; pipeline counts 3.45:1; step meta 3.11:1. `uicheck` contrast: 35 at 360 and 37
  at 1280 on the regex page.
- **Why:** the step list and table headers are the reading material of the tool.
- **Principle:** WCAG 1.4.3; `ui-visual-composition` (contrast as hierarchy, not as a disabled look).
- **Fix:** a three-step text ramp that stays ≥4.8:1 on every surface (`--text-3 #8190a3` is 4.82:1 on the
  lightest surface).
- **Verify:** `uicheck` / `audit.js` contrast counts; only disabled controls may remain (exempt under 1.4.3).

## Warnings (11)

**W1. Graphs have no text alternative, zoom or fit.** The SVG is `role="img"` with a one-line label; the tree, the
NFA and the minimal DFA exist only as pictures. Large NFAs shrink to fit or overflow with no way to enlarge.
*Why:* screen-reader users get no states or transitions; everyone struggles with dense automata on small screens.
*Principle:* WCAG 1.1.1; `interaction-patterns-components` (direct manipulation needs controls).
*Fix:* graph toolbar with zoom in/out, fit, and a "List" view generated from the same nodes and edges.
*Verify:* e2e zoom/fit/list checks; unit test that the list merges parallel edges exactly like the drawing.

**W2. Stage selector hides stages off-screen below 1100px.** The five stage buttons become a horizontal scroller
with the scrollbar hidden; at 390px "Minimize" and "Test strings" are cut off with no cue (screenshot
`before/regex-dfa-390.jpg`). *Why:* users do not discover two of five stages. *Principle:*
`information-architecture-navigation` (visible wayfinding). *Fix:* wrap into a grid instead of scrolling.
*Verify:* 390/768 screenshots show all five tabs.

**W3. Stage buttons are not a real tab pattern.** Five `aria-pressed` buttons switch a panel. *Why:* AT users do
not learn that they control one panel; no arrow-key movement. *Principle:* `interaction-patterns-components`
(use the platform pattern). *Fix:* `role="tablist"`/`tab`/`tabpanel` with roving tabindex; arrow keys must not
also step the algorithm. *Verify:* e2e tab keyboard checks.

**W4. A stale visualization is shown without saying so.** While the input is invalid the page keeps rendering the
previous expression's pipeline, and only the error line hints at it. *Why:* a student can read the wrong graph
as the answer for what they typed. *Principle:* `ux-usability-foundations` (visibility of system status).
*Fix:* a note naming the expression on screen, plus a pointer at the failing character. *Verify:* e2e "stale
note shown for invalid input".

**W5. Bottom-up page uses a different visual language.** Native "Method:" select, orange numbered circles,
full-grid table borders, gold `#54451a` highlights, an "ℹ️" emoji as an icon, banners with thick borders.
*Why:* reads as a different product; the gold highlight competes with the accent. *Principle:*
`design-systems-frontend-architecture` (one token set, shared components). *Fix:* same tokens, panels, step
controller and tables as the regex page; method as tabs; Phosphor icon instead of emoji; amber reserved for
"handle". *Verify:* screenshots; radius and font-size census.

**W6. Planned modules look clickable.** Home shows four cards of near-equal weight; two lead to placeholders.
*Why:* fake interactivity; equal weight hides what actually works. *Principle:* `ux-writing-content-design`
(honest status) and `ui-visual-composition` (hierarchy). *Fix:* a module list with text status (Available /
Planned); planned rows are not links. *Verify:* screenshot; DOM check that planned rows are `div`s.

**W7. Disabled primary button still looks primary.** At the last step "Next" keeps its orange fill at 40%
opacity (`before/bottom-up-1440.jpg`). *Why:* reads as the next action when there is none. *Principle:*
`interaction-patterns-components` (clear enabled/disabled states). *Fix:* disabled primary drops its fill.
*Verify:* screenshot of a finished stepper.

**W8. Start and accepting states in tables are not exposed.** Dtran marks accepting rows with a 9px CSS ring on a
`span` with `aria-label` but no role (ignored by AT); the start state is not marked at all. *Principle:* WCAG
1.3.1 / 1.4.1. *Fix:* `role="img"` markers for start and accepting, drawn as shapes. *Verify:* DOM check; the
semantic diff confirms table text is unchanged.

**W9. Scrubber target is 4px tall.** `audit.js` and `uicheck` both flag "Jump to step" at 368×4 / 693×4.
*Why:* hard to hit with a finger. *Principle:* WCAG 2.5.8. *Fix:* 24px-tall input with a 4px drawn track.
*Verify:* e2e "scrubber hit area ≥ 24px".

**W10. Page changes are silent.** `document.title` is "Compiler Visualizer" on every page and focus stays on the
clicked link after a hash change. *Principle:* WCAG 2.4.2 / `information-architecture-navigation`. *Fix:*
per-page titles; move focus to the new page's `h1`. *Verify:* e2e title and focus checks.

**W11. The live demo animates forever with no pause.** *Principle:* WCAG 2.2.2. *Fix:* a pause/play button
(reduced motion still shows the final frame). *Verify:* button present; manual check.

## Polish (6, capped at 5 points)
- P1. Type scale drift: 17 distinct font sizes on the regex page (`uicheck` census).
- P2. Radius drift: 6 radii (8, 9, 10, 14px, pills, circles) across controls and panels.
- P3. Spacing values off the 4px grid: 11–13 distinct values per state (`audit.js`).
- P4. Heading level skipped (h1 → h3 for the step card title).
- P5. Every home card carries the same radial glow and dot texture: decoration with no meaning.
- P6. Hero heading forces a line break with `<br>`, so the copy column sets the measure, not the content.

## Visual quality: Competent but forgettable
Moves for this product: make the canvas the hero of the workspace with the controls docked to it; move the
orange-on-everything accent to one restrained blue and keep teal / amber / red for meaning (accepting, handle,
error); replace cards-for-everything with an instrument-like structure (toolbars, hairlines, data tables); show
the real pipeline on the home page instead of generic topic cards.

## User walk
- Keyboard: Tab order is logical, focus rings are visible (`focus_invisible 0`), ←/→ stepping works. Landing on a
  new page leaves focus in the sidebar (W10).
- 200% zoom ≈ 720px: the sidebar collapses to unlabeled icons (C2) and the stage selector scrolls (W2).
- Edge data: typing `(a|b` keeps the old graph on screen with only a small error line (W4).

## Wiring to confirm (not scored)
None. Every control is wired to real computation. No export or download exists.

## Clean
Font families (2), focus visibility, reduced-motion handling, image alt text (no images), console errors (none).

## Not flagged, on purpose
- `audit.js` reports ~20 "layout-triggering animations" on every page. These are false positives: the
  reduced-motion rule sets a 0.01ms duration on all elements, so every element reports `transition: all`.
- Dense 30–36px controls on desktop pass WCAG 2.5.8 (≥24px); not counted against a pointer-first tool.
