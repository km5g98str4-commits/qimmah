// قِمّة — إثبات قاعدة الأطعمة (Cycle 6): يقفل جودة القاعدة دائمًا.
// يشغّل المُدقِّق (food-db-validate --json) ويؤكّد ثوابت كل الجولات. أي انحدار ⇒ خروج 1.
//   node scripts/run-food-db-proof.mjs
// يُستدعى مباشرة عبر node (بلا اعتماد على سكربت npm)، ويصلح للبوّابة الآلية (CI).

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const res = spawnSync(process.execPath, [resolve(here, 'food-db-validate.mjs'), '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (res.status !== 0 && !res.stdout) {
  console.error('تعذّر تشغيل المُدقِّق:\n', res.stderr || res.error)
  process.exit(1)
}
const r = JSON.parse(res.stdout)
const c = (code) => r.byCode[code] || 0

// ERROR-level codes — يجب أن تكون صفرًا.
const ERROR_CODES = ['MISSING_STR', 'MISSING_NUM', 'NEGATIVE', 'BAD_FIBER', 'RANGE_MACRO', 'RANGE_SUM', 'RANGE_KCAL', 'DUP_ID']

const checks = [
  ['لا أخطاء (ERROR)', r.errors === 0, `errors=${r.errors}`],
  ...ERROR_CODES.map((code) => [`لا ${code}`, c(code) === 0, `${c(code)}`]),
  ['إجمالي الأصناف ≥ 581', r.total >= 581, `total=${r.total}`],
  ['الأطباق السعودية = 130', r.saudi === 130, `saudi=${r.saudi}`],
  // ٤٠ (Cycle 4) + ٦ أصناف **عامّة** أضافتها حارة الطعام لسدّ فجوات بحث مقيسة
  // (عسل · خس · جرانولا · شوكولاتة · كيك · بسكويت) — `src/data/gccStaples.ts`.
  // العدد ثابتٌ عمدًا: إضافةٌ صامتة إلى القاعدة يجب أن تُسقط هذا الفحص وتُعلن نفسها.
  ['أصناف خليجية مضافة = 46 (Cycle 4 + فجوات ٢٠٢٦-٠٨)', r.gcc === 46, `gcc=${r.gcc}`],
  // [مهمة الصقل §5] عدّ دقيق لأصناف السلاسل المنسَّقة (فئة «مطاعم» خارج r2):
  // total>=581 أرضية تبتلع الإضافة والحذف الصامتَين، وهذا يعلنهما — كل موجة
  // استيراد معتمدة تحدّث الرقم بندًا مسمًّى في تقريرها (نمط gcc==46 نفسه).
  // [RESTAURANT-MENUS-001] ١٠٠ يدوية تقديرية (٥ حلّ محلّها سجلّ USDA) + 151 من مصادر رسمية (دومينوز ٥٩ · شاورمر ٤٠ [FOOD-UX-001: الراهية] · سجلّات USDA للسلاسل 52) = 251.
  ['أصناف سلاسل «مطاعم» يدوية = 100 ومن مصادر رسمية = 151', r.restaurantsHand === 100 && r.restaurants === 251, `hand=${r.restaurantsHand} total=${r.restaurants}`],
  // نظير «كل Food R2 معلّم تقديري»: قيم السلاسل كلها تقديرية (رأس كتلتها يعلنها)،
  // والوسم صار على الصنف المعروض نفسه — فلا يهبط صنف سلسلة جديد بلا وسمه.
  ['كل أصناف السلاسل اليدوية معلّمة «تقديري» وكل rst-* مصنَّف provenance رسمي/USDA', r.restaurantsEstimated === 100 && r.restaurantsSourced === 151, `estimated=${r.restaurantsEstimated} sourced=${r.restaurantsSourced}`],
  ['Food R2 = 60 صنف مطاعم', r.r2 === 60, `r2=${r.r2}`],
  ['كل Food R2 معلّم «تقديري»', r.r2Estimated === 60, `estimated=${r.r2Estimated}`],
  ['Food R2 يغطي مطاعم/أطباق/مشروبات/فطور/حلويات', Array.isArray(r.r2Categories) && r.r2Categories.length >= 5, `categories=${r.r2Categories?.length ?? 0}`],
  ['Food R2 ضمن نطاق السعرات لكل مجموعة', Array.isArray(r.r2RangeViolations) && r.r2RangeViolations.length === 0, `violations=${r.r2RangeViolations?.length ?? 'missing'}`],
  ['وحدات الحصص مطبّعة — لا UNIT_SPELL (Cycle 3)', c('UNIT_SPELL') === 0, `${c('UNIT_SPELL')}`],
  ['وحدات الحصص — لا UNIT_MSA (فصحى)', c('UNIT_MSA') === 0, `${c('UNIT_MSA')}`],
  ['وحدات الحصص — لا UNIT_BARE (مجرّدة)', c('UNIT_BARE') === 0, `${c('UNIT_BARE')}`],
  ['تناسق التسمية — لا NAME_SPELL «برغر» (Cycle 5)', c('NAME_SPELL') === 0, `${c('NAME_SPELL')}`],
  ['لا أسماء عربية مكرّرة (Cycle 5)', c('DUP_NAME_AR') === 0, `${c('DUP_NAME_AR')}`],
  ['لا أسماء إنجليزية مكرّرة (Cycle 5)', c('DUP_NAME_EN') === 0, `${c('DUP_NAME_EN')}`],
  ['لا تباعد سعرات جديد — DIVERGE_KCAL ≤ 4 (المقبولة موثّقة)', c('DIVERGE_KCAL') <= 4, `${c('DIVERGE_KCAL')}`],
  ['لا أسماء سلاسل تجارية في Food R2 — TRADEMARK', c('TRADEMARK') === 0, `${c('TRADEMARK')}`],
  // كثافة السعرات لكل فئة (CATEGORY_KCAL_R2): سقف انحدار لا هدف. القيمة الحالية 5 صفوف
  // بروست معلّقة على قرار المالك (انظر docs/release/RC-v1.2.0.md) — العتبة تمنع أي زيادة
  // جديدة، وتُشدَّد إلى 0 فور اعتماد الأرقام المصحّحة.
  ['كثافة سعرات Food R2 لا تتراجع — CATEGORY_KCAL_R2 ≤ 5', c('CATEGORY_KCAL_R2') <= 5, `${c('CATEGORY_KCAL_R2')}`],
]

console.log('════════ إثبات قاعدة الأطعمة — قِمّة ════════')
let failed = 0
for (const [label, ok, detail] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label} — ${detail}`)
  if (!ok) failed++
}
console.log('')
if (failed === 0) {
  console.log(`✅ نجحت كل الفحوص — ${checks.length} فحصًا (تحذيرات مقبولة: DIVERGE_KCAL=${c('DIVERGE_KCAL')}).`)
  process.exit(0)
} else {
  console.log(`❌ فشل الإثبات: ${failed} من ${checks.length} فحصًا.`)
  process.exit(1)
}
