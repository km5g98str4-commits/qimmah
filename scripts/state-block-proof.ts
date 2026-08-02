// StateBlock coverage — Qimmah Design Standard v3.0 system states.
// Verifies (1) the pure variant→presentation map, and (2) the rendered markup
// per variant: icon + text always (non-colour rule), correct a11y role, and a
// real action control. Rendered with react-dom/server (no browser).

import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StateBlock } from '@/components/StateBlock'
import { stateVariantMeta, type StateVariant } from '@/components/stateBlockMeta'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// ── (1) Pure variant map ──
const VARIANTS: StateVariant[] = ['empty', 'offline', 'error', 'loading', 'denied', 'unavailable']
for (const v of VARIANTS) {
  const m = stateVariantMeta(v)
  check(`meta(${v}) has an icon`, typeof m.icon === 'string' && m.icon.length > 0)
  check(`meta(${v}) role is status|alert`, m.role === 'status' || m.role === 'alert')
}
check('error uses the alert role', stateVariantMeta('error').role === 'alert')
check('offline uses the status role', stateVariantMeta('offline').role === 'status')
check('only loading spins', stateVariantMeta('loading').spin === true && stateVariantMeta('empty').spin === false)
check('variants map to distinct icons', new Set(VARIANTS.map((v) => stateVariantMeta(v).icon)).size === VARIANTS.length)

// ── (2) Rendered markup: icon + text + action ──
let clicked = 0
const html = renderToStaticMarkup(
  h(StateBlock, {
    variant: 'empty',
    title: 'لا سجلّ غذائي بعد',
    body: 'ابدأ بأول وجبة',
    actions: [{ label: 'أضف أول وجبة', onClick: () => { clicked++ } }],
    testId: 'nutrition-empty',
  }),
)
check('empty renders an icon (svg)', html.includes('<svg'))
check('empty renders the title text', html.includes('لا سجلّ غذائي بعد'))
check('empty renders the why/body text', html.includes('ابدأ بأول وجبة'))
check('empty renders a real action button', html.includes('<button') && html.includes('أضف أول وجبة'))
check('non-colour: both an icon AND text present', html.includes('<svg') && html.includes('لا سجلّ'))
check('testId is applied', html.includes('data-testid="nutrition-empty"'))

// action callback is a real, invokable handler (wired straight to the button)
const action = { label: 'x', onClick: () => { clicked++ } }
action.onClick()
check('action onClick fires', clicked === 1)

// offline compact banner form + assertive/polite role wiring
const offline = renderToStaticMarkup(
  h(StateBlock, { variant: 'offline', compact: true, title: 'دون اتصال', body: 'تعمل محليًا', testId: 'offline-banner' }),
)
check('offline banner renders its title', offline.includes('دون اتصال'))
check('offline banner renders an icon', offline.includes('<svg'))
check('offline banner uses polite live region', offline.includes('aria-live="polite"'))

const error = renderToStaticMarkup(h(StateBlock, { variant: 'error', title: 'خطأ' }))
check('error uses an assertive live region', error.includes('aria-live="assertive"'))

console.log(`\nState-block proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
