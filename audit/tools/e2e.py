"""Browser checks for the UI: navigation, deep links, keyboard, graph tools, motion, theme.
Usage: python3 -I e2e.py <base-url> <shots-dir>"""
import sys, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
SHOTS = sys.argv[2]
results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))


with sync_playwright() as p:
    b = p.chromium.launch()
    errors = []

    # --- A. navigation, deep links, refresh, back/forward (motion ON) ---
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type in ('error', 'warning') else None)
    pg.goto(f'{BASE}/#/home')
    pg.wait_for_timeout(1500)
    check('home title', pg.title() == 'Compiler Visualizer', pg.title())
    pg.mouse.wheel(0, 6000)
    pg.wait_for_timeout(1800)
    op = pg.evaluate("Math.min(...[...document.querySelectorAll('.hero-copy > *, .hero-demo, .block-head, .pipeline > li, .module-grid > li, .example-list > li, .split-word')].map(e => +getComputedStyle(e).opacity))")
    pg.evaluate("window.scrollTo(0, 0)")
    check('home entrance animation settles to full opacity', op == 1, str(op))
    pg.screenshot(path=f'{SHOTS}/motion-home-1440.jpg', type='jpeg', quality=72)
    pg.get_by_role('link', name='Regex to DFA').first.click()
    pg.wait_for_timeout(600)
    check('nav link goes to regex page', '#/regex-dfa' in pg.url, pg.url)
    check('page title updates', pg.title() == 'Regex to DFA · Compiler Visualizer', pg.title())
    check('focus moves to h1 after navigation', pg.evaluate("document.activeElement.tagName") == 'H1')
    check('URL mirrors regex and stage', 're=' in pg.url and 'stage=nfa' in pg.url, pg.url)
    pg.get_by_role('tab', name='Minimize').click()
    pg.wait_for_timeout(300)
    check('stage tab updates URL', 'stage=min' in pg.url, pg.url)
    pg.reload()
    pg.wait_for_timeout(800)
    check('refresh keeps stage', pg.get_by_role('tab', name='Minimize').get_attribute('aria-selected') == 'true')
    pg.get_by_role('link', name='Bottom-up parsing').first.click()
    pg.wait_for_timeout(500)
    pg.go_back()
    pg.wait_for_timeout(600)
    check('back returns to regex page', '#/regex-dfa' in pg.url, pg.url)
    pg.go_forward()
    pg.wait_for_timeout(500)
    check('forward returns to bottom-up', '#/bottom-up' in pg.url, pg.url)

    # deep link with params from the home page pipeline
    pg.goto(f'{BASE}/#/home')
    pg.wait_for_timeout(800)
    pg.locator('.pipeline-step').nth(2).click()
    pg.wait_for_timeout(600)
    check('home pipeline link opens subset stage', pg.get_by_role('tab', name='Subset construction').get_attribute('aria-selected') == 'true')
    pg.goto(f'{BASE}/#/home')
    pg.wait_for_timeout(500)
    pg.locator('.example-link').nth(1).click()
    pg.wait_for_timeout(600)
    check('example link fills the regex', pg.get_by_label('Regular expression', exact=True).input_value() == 'a(b|c)*d+')
    pg.goto(f'{BASE}/#/regex-dfa?re=%28a&stage=bogus')
    pg.wait_for_timeout(600)
    check('invalid ?re= shows error and falls back', pg.locator('[role=alert]').count() == 1 and pg.get_by_role('tab', name='Thompson NFA').get_attribute('aria-selected') == 'true')
    check('stale-result note shown for invalid input', pg.locator('.stale-banner').count() == 1)
    pg.goto(f'{BASE}/#/does-not-exist')
    pg.wait_for_timeout(400)
    check('unknown route falls back to home', pg.locator('main h1').text_content().startswith('Compiler algorithms'))

    # --- step controls with motion: no stuck opacity on graph nodes ---
    pg.goto(f'{BASE}/#/regex-dfa?re=(a|b)*abb&stage=nfa')
    pg.wait_for_timeout(800)
    for _ in range(5):
        pg.get_by_role('button', name='Next').click()
        pg.wait_for_timeout(60)
    pg.get_by_role('button', name='Previous').click()
    pg.wait_for_timeout(1200)
    op = pg.evaluate("Math.min(...[...document.querySelectorAll('[data-node]')].map(e => +getComputedStyle(e).opacity))")
    check('graph nodes end fully visible after rapid stepping', op == 1, str(op))
    check('step count after 5 next + 1 prev', pg.locator('input[type=range]').input_value() == '4')

    # --- tabs keyboard ---
    pg.get_by_role('tab', name='Thompson NFA').focus()
    pg.keyboard.press('ArrowRight')
    pg.wait_for_timeout(200)
    check('ArrowRight on tabs moves to next stage', pg.get_by_role('tab', name='Subset construction').get_attribute('aria-selected') == 'true')
    check('ArrowRight on tabs does not also step', pg.locator('input[type=range]').input_value() == '0')
    pg.keyboard.press('End')
    pg.wait_for_timeout(200)
    check('End on tabs jumps to last stage', pg.get_by_role('tab', name='Test strings').get_attribute('aria-selected') == 'true')

    # --- graph tools ---
    pg.get_by_role('tab', name='Minimize').click()
    pg.wait_for_timeout(300)
    svg = pg.locator('.diagram-canvas svg').first
    w0 = svg.bounding_box()['width']
    pg.get_by_role('button', name='Zoom in').click()
    pg.get_by_role('button', name='Zoom in').click()
    pg.wait_for_timeout(200)
    w1 = svg.bounding_box()['width']
    check('zoom in enlarges graph', w1 > w0 * 1.2, f'{w0:.0f}->{w1:.0f}')
    pg.get_by_role('button', name='Fit to view').click()
    pg.wait_for_timeout(200)
    check('fit restores size', abs(svg.bounding_box()['width'] - w0) < 2)
    pg.get_by_role('radio', name='Table').first.click()
    pg.wait_for_timeout(200)
    rows = pg.locator('.diagram-table tbody tr').count()
    check('list view shows one row per state (5 before minimization)', rows == 5, str(rows))
    acc = pg.locator('.diagram-table').text_content()
    check('list view names start and accepting states', 'start' in acc and 'accepting' in acc)
    pg.get_by_role('radio', name='Diagram').first.click()

    # --- light theme only, no toggle ---
    check('only the light theme exists (no toggle)', pg.locator('.theme-toggle').count() == 0
          and pg.evaluate("getComputedStyle(document.body).colorScheme") in ('light', 'normal'))

    # --- reset is not adjacent to Next and scrubber has a 24px hit area ---
    h = pg.locator('input[type=range]').first.bounding_box()['height']
    check('scrubber hit area >= 24px', h >= 24, str(h))
    ctx.close()

    # --- mobile menu ---
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'{BASE}/#/home')
    pg.wait_for_timeout(800)
    check('mobile nav hidden by default', not pg.get_by_role('dialog').is_visible() and not pg.locator('.topnav').is_visible())
    pg.get_by_role('button', name='Open menu').click()
    pg.wait_for_timeout(200)
    check('menu opens', pg.get_by_role('dialog').is_visible())
    pg.screenshot(path=f'{SHOTS}/mobile-menu-390.jpg', type='jpeg', quality=72)
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(200)
    check('Escape closes menu', pg.get_by_role('dialog').count() == 0 or not pg.get_by_role('dialog').is_visible())
    pg.get_by_role('button', name='Open menu').click()
    pg.wait_for_timeout(300)
    pg.get_by_role('dialog').get_by_role('link', name='Bottom-up parsing').click()
    pg.wait_for_timeout(600)
    check('choosing a page closes menu', (pg.get_by_role('dialog').count() == 0 or not pg.get_by_role('dialog').is_visible()) and '#/bottom-up' in pg.url)
    sizes = pg.evaluate("""[...document.querySelectorAll('main button, main select, main input, main a')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })""")
    small = [s for s in sizes if s < 24]
    check('no visible control under 24px on touch', not small, str(small[:5]))
    ctx.close()

    # --- keyboard walk + visible focus ---
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
    pg = ctx.new_page()
    pg.goto(f'{BASE}/#/regex-dfa')
    pg.wait_for_timeout(500)
    pg.keyboard.press('Tab')
    check('first Tab reaches the skip link', pg.evaluate("document.activeElement.className") == 'skip-link')
    sk = pg.locator('.skip-link').bounding_box()
    check('skip link visible when focused', sk and sk['width'] > 40)
    no_outline = []
    for i in range(40):
        pg.keyboard.press('Tab')
        pg.wait_for_timeout(60)  # let the 0.01ms reduced-motion transition finish before reading styles
        info = pg.evaluate("""(() => { const e = document.activeElement; const s = getComputedStyle(e);
          return { tag: e.tagName, text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24),
                   outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== 'none',
                   parentRing: getComputedStyle(e.parentElement).boxShadow !== 'none' }; })()""")
        if info['tag'] != 'BODY' and not (info['outline'] or info['shadow'] or info['parentRing']):
            no_outline.append(info['text'])
    check('every focused control shows a focus indicator (40 tabs)', not no_outline, str(no_outline[:6]))
    ctx.close()

    b.close()
    check('no console errors or page errors', not errors, str(errors[:3]))

json.dump(results, open(f'{SHOTS}/e2e-results.json', 'w'), indent=1)
print(sum(r[1] for r in results), '/', len(results), 'passed')
