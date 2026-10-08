# Responsive verification

Chromium via Playwright, reduced motion on (so screenshots show settled layouts), served under `/regex2dfa/`.

## Page-level horizontal overflow (px), 9 states × 7 widths

| State | 360 | 390 | 768 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|---|---|
| Home | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Regex · Syntax tree | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Regex · Thompson (step 6) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Regex · Subset (step 4) | 0 (was 345) | 0 (was 315) | 0 (was 180) | 0 | 0 | 0 | 0 |
| Regex · Minimize (all) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Regex · Test strings (all) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Regex · invalid input | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bottom-up (all shown) | 0 (was 142) | 0 (was 112) | 0 | 0 | 0 | 0 | 0 |
| Planned page | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Full before/after table: `evidence/measurements.md`. No console errors at any width.

## Layout by width

| Width | Shell | Regex workspace | Home |
|---|---|---|---|
| ≥1181px | 232px sidebar | Canvas + 360px rail (sticky) | Hero two columns; pipeline 5 across |
| 961–1180 | Sidebar | Rail moves below the canvas in auto-fit columns | Pipeline 3 + 2 |
| 901–960 | Sidebar | Expression bar stacks; stage tabs wrap to a grid | Hero stacks |
| ≤900 | Top bar + "Open menu" | Same, one column | Pipeline and modules one column |

Wide drawings and tables scroll inside their own frames (Dtran, signature, sets, precedence and trace tables;
large NFAs). On touch they scroll with a finger; with a mouse the zoomed canvas can be dragged.

## Screenshots
`screenshots/before/` and `screenshots/after/`, same file names: `<state>-<width>.jpg` for 390, 768 and 1440.
Extra after-only shots: `mobile-menu-390.jpg` (menu open) and `motion-home-1440.jpg` (with animations on, after
they settle).

## Touch and zoom
- At 390px with touch emulation no visible control in `main` is smaller than 24px (e2e). Controls grow to
  36–40px on `pointer: coarse`.
- 200% browser zoom on a 1440px window gives a ~720px layout, covered by the 768 and 390 checks: top bar with menu,
  stacked workspace, no sideways scroll.

## Not verified
- Real iOS Safari / iPad (only Chromium emulation was available here).
- 1920px screenshots were not saved (overflow was measured there); the layout caps at 1440px content width and
  centres, which the 1440 shots show.
