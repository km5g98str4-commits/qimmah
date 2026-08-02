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

// الأدوار الدلالية هي الثابت؛ القيم تتبع هوية الشاشة. بعد عودة شاشة التقدّم
// للتصميم الكلاسيكي صار لون الهوية (--c-primary) هو حامل قصّة البيانات بدل Ember،
// والكهرماني بقي وسم التقديرات. الفحوص تحرس الدور لا الاسم القديم.
console.log('\n① دلالة الألوان — الأدوار محفوظة')
check('لون الهوية هو حامل قصة البيانات الرئيسية', progress.includes("const DATA = 'var(--c-primary)'"))
check('الكهرماني يوسم التقديرات', progress.includes("const ESTIMATE = '#e0941f'"))
check('مخططا الزخم والوزن يرسمان بلون البيانات', (progress.match(/stroke=\{DATA\}/g) ?? []).length >= 2)
check('مخطط e1RM التقديري يرسم بلون التقدير', progress.includes('stroke={ESTIMATE}'))
check('الأزرق غير مستخدم كلون رسم بياني', !progress.includes('stroke={BLUE}') && !progress.includes('fill={BLUE}'))
check('لم يبقَ أثر لوحة v2 في الشاشة', !progress.includes('var(--v2-'))

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
