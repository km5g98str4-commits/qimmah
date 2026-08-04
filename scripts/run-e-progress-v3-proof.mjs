import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const progress = readFileSync(new URL('../src/views/ProgressV2.tsx', import.meta.url), 'utf8')
const harness = readFileSync(new URL('./e-progress-v3-shot/harness.tsx', import.meta.url), 'utf8')

let pass = 0
const check = (label, condition) => {
  assert.equal(condition, true, label)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① دلالة ألوان v3.0')
check('Ember هو لون قصة البيانات الرئيسية', progress.includes("const EMBER = 'var(--v2-ember)'"))
check('Amber يوسم التقديرات', progress.includes("const AMBER = 'var(--v2-amber)'"))
check('مخططا الزخم والوزن يرسمان بـ Ember', (progress.match(/stroke=\{EMBER\}/g) ?? []).length >= 2)
check('مخطط e1RM التقديري يرسم بـ Amber', progress.includes('stroke={AMBER}'))
check('الأزرق غير مستخدم كلون رسم بياني', !progress.includes('stroke={BLUE}') && !progress.includes('fill={BLUE}'))

console.log('\n② الخط والمس والمسارات المنطقية')
check('أرقام القياسات تستخدم خط البيانات', (progress.match(/font-mono/g) ?? []).length >= 6)
check('أزرار الرجوع الثلاثة تحقق 44 نقطة', (progress.match(/grid h-11 w-11 place-items-center/g) ?? []).length === 3)
const classNames = [...progress.matchAll(/className="([^"]+)"/g)].map((match) => match[1]).join(' ')
check('لا خصائص اتجاه فيزيائية جديدة', !/\b(?:ml|mr|pl|pr|left|right)-/.test(classNames))

console.log('\n③ تأكيد مضاد: الموجة بصرية فقط')
check('مسار نموذج التقدّم القانوني باقٍ', progress.includes('buildProgressV2Model(customization, lang)'))
check('مسار حفظ القياس القانوني باقٍ', progress.includes('addLog({ id, date: getDayStamp(), values })'))
check('حاضنة الإثبات تعرض العربية والإنجليزية', harness.includes("params.get('lang') === 'en' ? 'en' : 'ar'"))

console.log(`\n✅ إثبات حارة E لتوافق Progress مع v3.0 نجح — ${pass} فحصًا.`)
