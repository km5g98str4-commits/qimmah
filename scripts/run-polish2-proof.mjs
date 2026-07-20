// Polish-2 guards (P1 promises/accessibility). Static source + WCAG math — no
// browser. Behavioural return-context coverage lives in today-v2-model-proof.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

// ── D: green small-text contrast ≥ 4.5:1 (AA) on white ──
function lum(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

const tokens = read('src/design-system/tokens.css')
const greenText = tokens.match(/--v2-green-text:\s*(#[0-9a-fA-F]{6})/)[1]
const ratio = contrast(greenText, '#ffffff')
check(`--v2-green-text ${greenText} ≥ 4.5:1 on white (is ${ratio.toFixed(2)})`, ratio >= 4.5)
const today = read('src/views/TodayV2.tsx')
check('progress label uses the AA green-text token', today.includes("text-[color:var(--v2-green-text)]"))
check('nutrition pillar % uses the AA green-text token', today.includes("pillar.key === 'nutrition' ? 'var(--v2-green-text)'"))

// ── B: active workout is a real modal; shell chrome goes inert ──
const workout = read('src/views/WorkoutV2.tsx')
check('active overlay is aria-modal dialog', workout.includes('role="dialog"') && workout.includes('aria-modal="true"'))
check('workout signals immersive focus', workout.includes("'qimmah:immersive'"))
const shell = read('src/components/MobileShell.tsx')
check('shell makes header/nav inert on immersive', shell.includes('el.inert = immersive'))
check('shell listens for immersive events', shell.includes("'qimmah:immersive'"))

// ── C: touch targets ≥ 44px (min-h/-w or expanded hit-area) ──
check('header brand button ≥44 tall', shell.includes('min-h-[44px] items-center gap-2'))
check('language toggle (compact) ≥44 tall', read('src/i18n/LanguageToggle.tsx').includes('min-h-[44px]'))
check('close-workout button 44×44', workout.includes('h-11 w-11 place-items-center rounded-xl'))
check('plate + warmup buttons use expanded hit-area', (workout.match(/before:-inset/g) ?? []).length >= 2)
check('profile «learn» link ≥44 tall', read('src/views/ProfileV2.tsx').includes('inline-flex min-h-[44px] items-center'))

// ── A: return hero is an honest single path (no separate-session promise) ──
const model = read('src/lib/todayV2Model.ts')
check('return hero promises the plan itself (not a fake session)', /خطتك|of your plan/.test(model))
check('no "full plan" alternative card (would be the same path)', !model.includes("'I’d rather do today’s full plan'"))

console.log(`\n✅ polish-2 proof: green AA contrast, workout modal+inert, ≥44 touch targets, honest return promise — ${pass} checks`)
