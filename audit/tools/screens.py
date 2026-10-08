"""Screenshot app states at several widths, measure overflow, and run the reviewed audit.js
(imYChaudhary22/ui-ux-audit) inside each state.

Usage: python3 -I screens.py <base-url> <shots-dir> <out.json> [states...]
"""
import json, sys, os
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
SHOTS = sys.argv[2]
OUT = sys.argv[3]
ONLY = sys.argv[4:]
AUDIT_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ext/ui-ux-audit/skills/ui-ux-audit/audit.js')).read()
WIDTHS = [360, 390, 768, 1024, 1280, 1440, 1920]
SHOT_WIDTHS = {390, 768, 1440}
AUDIT_WIDTHS = {390, 1440}


def stage(pg, name):
    pg.locator(f'button:has-text("{name}"), [role=tab]:has-text("{name}")').first.click()
    pg.wait_for_timeout(200)


def click_all(pg, name):
    btns = pg.get_by_role('button', name=name)
    for i in range(btns.count()):
        if btns.nth(i).is_visible() and btns.nth(i).is_enabled():
            btns.nth(i).click()
    pg.wait_for_timeout(200)


def nexts(pg, n):
    for _ in range(n):
        pg.get_by_role('button', name='Next').first.click()
    pg.wait_for_timeout(250)


STATES = {
    'home': lambda pg: None,
    'regex-tree': lambda pg: stage(pg, 'Syntax tree'),
    'regex-nfa': lambda pg: (stage(pg, 'Thompson NFA'), nexts(pg, 6)),
    'regex-dfa': lambda pg: (stage(pg, 'Subset construction'), nexts(pg, 4)),
    'regex-min': lambda pg: (stage(pg, 'Minimize'), click_all(pg, 'Show all')),
    'regex-test': lambda pg: (stage(pg, 'Test strings'), click_all(pg, 'Show all')),
    'regex-error': lambda pg: (pg.get_by_label('Regular expression', exact=True).fill('(a|b'), pg.wait_for_timeout(250)),
    'bottom-up': lambda pg: click_all(pg, 'Show all'),
    'coming-soon': lambda pg: None,
}
ROUTE = {'home': 'home', 'bottom-up': 'bottom-up', 'coming-soon': 'first-follow'}


def main():
    os.makedirs(SHOTS, exist_ok=True)
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, setup in STATES.items():
            if ONLY and name not in ONLY:
                continue
            res[name] = {}
            for w in WIDTHS:
                ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce')
                pg = ctx.new_page()
                errors = []
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                pg.goto(f"{BASE}/#/{ROUTE.get(name, 'regex-dfa')}")
                pg.wait_for_timeout(400)
                setup(pg)
                pg.wait_for_timeout(300)
                entry = {'scrollWidth': pg.evaluate('document.documentElement.scrollWidth'), 'errors': errors}
                if w in SHOT_WIDTHS:
                    pg.screenshot(path=f'{SHOTS}/{name}-{w}.jpg', full_page=True, type='jpeg', quality=72)
                if w in AUDIT_WIDTHS:
                    entry['audit'] = json.loads(pg.evaluate(AUDIT_JS))
                res[name][w] = entry
                ctx.close()
        b.close()
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)
    for name, by in res.items():
        over = {w: e['scrollWidth'] - w for w, e in by.items() if e['scrollWidth'] > w}
        s = {w: e['audit']['summary'] for w, e in by.items() if 'audit' in e}
        print(name, 'overflow', over, 'errors', sum(len(e['errors']) for e in by.values()))
        for w, x in s.items():
            print('   ', w, x)


main()
