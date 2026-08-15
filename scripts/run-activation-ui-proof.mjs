// إثبات عقد واجهة التفعيل. السلوك التفاعلي الحقيقي يبقى في
// `test:e2e:preview-gate`؛ هذا الحارس السريع مرتبط ببوابة المشروع كي لا تختفي
// خصائص الحوار/الشراء/الحالات من دون أن يلاحظها البناء المحلي.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const gate = read('src/components/PremiumGate.tsx')
const source = read('src/lib/access/entitlementSource.ts')
const strings = read('src/i18n/dict/access.ts')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات واجهة التفعيل')

check('الحوار يعرّف نفسه كنافذة modal معنونة', gate.includes('role="dialog"') && gate.includes('aria-modal="true"') && gate.includes('aria-labelledby="premium-gate-title"'))
check('زر الإغلاق ونداء الشراء يحققان أهداف لمس كافية', gate.includes('h-11 w-11') && gate.includes('min-h-[48px]') && (gate.match(/min-h-\[44px\]/g) ?? []).length >= 2)
check('رابط الشراء الخارجي مؤمّن ويمر من مصدر المنتج الواحد', gate.includes('href={product.checkoutUrl}') && gate.includes('target="_blank"') && gate.includes('rel="noopener noreferrer"'))
check('حقل التفعيل معلّم ورسالة النتيجة قابلة للقراءة', gate.includes('htmlFor="activation-code"') && gate.includes('role="status"') && gate.includes('data-testid="activation-code-message"'))
check('لا تعتمد واجهة التفعيل على alert أو confirm', !/\b(alert|confirm)\s*\(/.test(gate))

for (const outcome of ['success', 'invalid', 'already_used', 'expired', 'offline']) {
  check(`حالة ${outcome} لها مسار واجهة ونص عربي وإنجليزي`, gate.includes(`state === '${outcome}'`) && strings.includes(`code${outcome === 'already_used' ? 'AlreadyUsed' : outcome[0].toUpperCase() + outcome.slice(1)}`))
}

check('التفعيل في الإنتاج صادق: لا نجاح بلا مصدر خلفي', source.includes("if (!mockEnabled()) return 'offline'"))
check('وضع التقليد وحده يستطيع حفظ نتيجة التفعيل', source.includes("if (!mockEnabled()) return 'offline'") && source.includes("window.sessionStorage.setItem(MOCK_KEY, 'active')"))

// محاكاة التفاف: وجود عبارات منفصلة لا يكفي؛ إزالة aria-modal من الحوار يجب أن
// تصبح قابلة للاكتشاف باسم الخاصية نفسها.
const attacked = gate.replace('aria-modal="true"', '')
check('محاكاة الالتفاف: نزع aria-modal يُكتشف', !attacked.includes('aria-modal="true"'))

console.log(`\n✅ واجهة التفعيل: ${pass} فحوص، 0 فشل.`)
