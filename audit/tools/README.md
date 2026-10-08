# Audit tools

Scripts used to produce the evidence in `audit/`. They are not part of the app and are not bundled.
All need Python Playwright (`pip install playwright==1.56.0`, matching the preinstalled Chromium) and a build of
the site served under `/regex2dfa/`, e.g.:

```bash
npm run build
mkdir -p /tmp/site && cp -r dist /tmp/site/regex2dfa
(cd /tmp/site && python3 -m http.server 4802) &
```

| Script | What it does |
|---|---|
| `capture.py <base-url> <out.json>` | Drives the UI and records semantic outputs: step totals, graph node/edge labels with start/accepting marks, every table, string-test verdicts, error alerts, stepper positions, bottom-up tables and banners |
| `diff.py <a.json> <b.json>` | Lists every difference between two captures |
| `screens.py <base-url> <shots-dir> <out.json>` | Screenshots 9 states at 390/768/1440, measures page overflow at 7 widths, and runs `audit.js` from imYChaudhary22/ui-ux-audit inside each state. Expects that repo cloned at `ext/ui-ux-audit` next to the script (it was reviewed first: it only reads the DOM and returns JSON) |
| `e2e.py <base-url> <shots-dir>` | Navigation, deep links, refresh, back/forward, keyboard, graph tools, mobile menu, touch target sizes, focus visibility, console errors |

`uicheck.py` from EnchStyle/ui-ux-audit-skill was run directly from its clone
(`python3 -I uicheck.py <url> --json out.json --quiet`); its outputs are `audit/evidence/uicheck-*.txt`.
