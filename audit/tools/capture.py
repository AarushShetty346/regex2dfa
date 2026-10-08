"""Capture semantic outputs of the app (baseline or redesign) through the real UI.

Usage: python3 -I capture.py <base-url> <out.json>
Relies only on accessible names and a few data attributes that every version shares
(accepting rings are `.node-ring` before the Ark UI rebuild and `[data-accepting]` after it).
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
OUT = sys.argv[2]

REGEXES = ['a', 'ab', 'a|b', 'a*', '(a|b)*', 'a(b|c)*', '(a|b)*abb', 'a(b|c)*d+', '(0|1(01*0)*1)*', '(ab|ba)?c*', '(a|ε)b+a?', 'a\\*b']
INVALID = ['', '(a', 'a|', '*a', ')', 'a\\', '(a|b', 'a||b']
STRINGS = ['', 'a', 'aaa', 'b', 'ab', 'abb', 'babb', 'abc', 'ba', 'bd', 'acd', 'c', '0110', 'x']
STAGES = ['Syntax tree', 'followpos', 'DFA', 'Test strings']

GRAPH_JS = r"""() => [...document.querySelectorAll('main svg[role=img]')].filter(s => !s.closest('.hero-demo, [data-demo]')).map(svg => ({
  nodes: [...svg.querySelectorAll('[data-node]')].map(g => {
    const t = g.querySelector('text');
    return (t ? t.textContent : '?') + (g.querySelector('.node-ring, [data-accepting]') ? '(acc)' : '') + (g.querySelector('[data-start], path') ? '(start)' : '');
  }).sort(),
  edges: [...svg.querySelectorAll('[data-edge-label]')].map(t => t.textContent).filter(Boolean).sort(),
}))"""

TABLES_JS = r"""() => [...document.querySelectorAll('main table')].map(t => [...t.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' | ')))"""


def stage_button(pg, name):
    return pg.locator(f'button:has-text("{name}"), [role=tab]:has-text("{name}")').first


def show_all(pg):
    btns = pg.get_by_role('button', name='Show all')
    for i in range(btns.count()):
        b = btns.nth(i)
        if b.is_visible() and b.is_enabled():
            b.click()
    pg.wait_for_timeout(120)


def scrub_values(pg):
    return [s.get_attribute('max') for s in pg.locator('input[type=range][aria-label="Jump to step"]').all()]


def set_regex(pg, value):
    inp = pg.get_by_label('Regular expression', exact=True)
    inp.fill(value)
    pg.wait_for_timeout(200)


def main():
    res = {'regex': {}, 'invalid': {}, 'strings': {}, 'stepper': [], 'bottom_up': {}, 'console': [], 'routes': {}}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        pg = ctx.new_page()
        pg.on('console', lambda m: res['console'].append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: res['console'].append(f'pageerror: {e}'))

        for route in ['home', 'regex-dfa', 'bottom-up', 'first-follow', 'top-down', 'nonexistent']:
            pg.goto(f'{BASE}/#/{route}')
            pg.wait_for_timeout(300)
            res['routes'][route] = {'h1': pg.locator('main h1').first.text_content() if pg.locator('main h1').count() else None,
                                    'h2': [h.text_content() for h in pg.locator('main h2').all()][:6]}

        pg.goto(f'{BASE}/#/regex-dfa')
        pg.wait_for_timeout(300)
        for rx in REGEXES:
            set_regex(pg, rx)
            entry = {}
            for st in STAGES[:4]:
                stage_button(pg, st).click()
                pg.wait_for_timeout(120)
                entry[st] = {'steps': scrub_values(pg)}
                show_all(pg)
                entry[st]['graphs'] = pg.evaluate(GRAPH_JS)
                entry[st]['tables'] = pg.evaluate(TABLES_JS)
                entry[st]['step_items'] = pg.locator('main ol li').count()
            res['regex'][rx] = entry
            stage_button(pg, 'Test strings').click()
            pg.wait_for_timeout(120)
            verdicts = {}
            for s in STRINGS:
                pg.get_by_label('Test string', exact=True).fill(s)
                pg.wait_for_timeout(80)
                show_all(pg)
                st = pg.locator('main [role=status]')
                verdicts[s] = st.first.text_content().strip() if st.count() else None
            res['strings'][rx] = verdicts

        stage_button(pg, 'Syntax tree').click()
        for rx in INVALID:
            set_regex(pg, rx)
            inp = pg.get_by_label('Regular expression', exact=True)
            alert = pg.locator('main [role=alert]')
            res['invalid'][rx] = {'aria_invalid': inp.get_attribute('aria-invalid'),
                                  'alert': alert.first.text_content() if alert.count() else None}

        # Stepper behaviour on the syntax tree stage
        set_regex(pg, '(a|b)*abb')
        stage_button(pg, 'Syntax tree').click()
        pg.wait_for_timeout(150)
        scrub = pg.locator('input[type=range][aria-label="Jump to step"]').first
        log = []
        def act(name, fn):
            fn(); pg.wait_for_timeout(80); log.append((name, scrub.input_value()))
        act('next', lambda: pg.get_by_role('button', name='Next').first.click())
        act('next', lambda: pg.get_by_role('button', name='Next').first.click())
        act('next', lambda: pg.get_by_role('button', name='Next').first.click())
        act('prev', lambda: pg.get_by_role('button', name='Previous').first.click())
        act('showall', lambda: pg.get_by_role('button', name='Show all').first.click())
        act('reset', lambda: pg.get_by_role('button', name='Reset').first.click())
        pg.locator('body').click(position={'x': 5, 'y': 5})
        act('key-right', lambda: pg.keyboard.press('ArrowRight'))
        act('key-end', lambda: pg.keyboard.press('End'))
        act('key-left', lambda: pg.keyboard.press('ArrowLeft'))
        act('key-home', lambda: pg.keyboard.press('Home'))
        res['stepper'] = log

        # Bottom-up parsing
        pg.goto(f'{BASE}/#/bottom-up')
        pg.wait_for_timeout(300)
        samples = {
            'valid-expr': 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
            'adjacent-nt': 'E -> E A E | id\nA -> + | *',
            'epsilon': 'S -> a S | ε',
            'ambiguous': 'E -> E + E | E * E | id',
            'malformed': 'E -> ',
        }
        for sid, text in samples.items():
            pg.get_by_label('Grammar', exact=True).fill(text)
            pg.wait_for_timeout(150)
            entry = {}
            inputs = pg.get_by_label('Input string')
            for s in ['id + id * id', 'id + * id', '( id + id ) * id']:
                if inputs.count():
                    inputs.first.fill(s)
                    pg.wait_for_timeout(100)
                show_all(pg)
                entry[s] = {'tables': pg.evaluate(TABLES_JS),
                            'alerts': [a.text_content() for a in pg.locator('main [role=alert], main [role=status]').all()],
                            'steps': scrub_values(pg)}
                if not inputs.count():
                    break
            res['bottom_up'][sid] = entry
        b.close()
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print('regexes', len(res['regex']), 'console', res['console'][:5], 'stepper', res['stepper'])


main()
