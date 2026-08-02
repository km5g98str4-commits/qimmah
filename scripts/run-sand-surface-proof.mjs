// Sand surface conformance (v3.0 §F1): the light surface must be exactly
// Sand #EFEAE2, inherited from ONE token, with dark Graphite + accents untouched
// and text contrast still AA on the slightly darker surface.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/design-system/tokens.css'), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

const srgb = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

// ── The standard's Sand, exactly ──
const SAND = [239, 234, 226] // #EFEAE2
check('--v2-cream is Sand #efeae2', /--v2-cream:\s*#efeae2/i.test(css))
const lightBlock = css.split(":root body,")[1].split('}')[0]
const page = lightBlock.match(/--c-page:\s*(\d+) (\d+) (\d+)/).slice(1).map(Number)
check(`light --c-page is Sand ${SAND.join(' ')} (is ${page.join(' ')})`, page.join(' ') === SAND.join(' '))

// ── Dark Graphite untouched ──
const darkBlock = css.split(":root[data-theme='dark'] body")[1].split('}')[0]
const darkPage = darkBlock.match(/--c-page:\s*(\d+) (\d+) (\d+)/).slice(1).map(Number)
check(`dark --c-page still Graphite 22 20 15 (is ${darkPage.join(' ')})`, darkPage.join(' ') === '22 20 15')
check('--v2-dark-canvas still #16140f', /--v2-dark-canvas:\s*#16140f/i.test(css))
check('dark ink #f1eee8 untouched (not mistaken for a surface)', /--v2-dark-ink-strong:\s*#f1eee8/i.test(css))

// ── Accents untouched (F1) ──
for (const [name, hex] of [['ember', '#f0512a'], ['blue', '#2a6ce0'], ['green', '#1f9d57'], ['teal', '#159aa0'], ['error', '#d23b2e'], ['amber', '#d99400']]) {
  check(`accent --v2-${name} unchanged ${hex}`, new RegExp(`--v2-${name}:\\s*${hex}`, 'i').test(css))
}

// ── Text still AA on the (slightly darker) Sand surface ──
const ink = (n) => lightBlock.match(new RegExp(`--c-ink-${n}:\\s*(\\d+) (\\d+) (\\d+)`)).slice(1).map(Number)
for (const tier of [900, 700, 500]) {
  const r = contrast(ink(tier), SAND)
  check(`ink-${tier} on Sand = ${r.toFixed(2)}:1 ≥ 4.5 (AA small text)`, r >= 4.5)
}
const faint = contrast(ink(400), SAND)
check(`ink-400 (faint tier) on Sand = ${faint.toFixed(2)}:1 ≥ 3.0`, faint >= 3.0)

// ── Cards stay distinguishable from the page ──
const surface = lightBlock.match(/--c-surface:\s*(\d+) (\d+) (\d+)/).slice(1).map(Number)
check(`white card vs Sand page separation = ${contrast(surface, SAND).toFixed(2)}:1 (visible)`, contrast(surface, SAND) > 1.02)

console.log(`\n✅ sand surface proof: light surface = Sand #EFEAE2 from one token, Graphite + accents untouched, text AA holds — ${pass} checks`)
