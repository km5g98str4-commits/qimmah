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
const ERROR_CODES = ['MISSING_STR', 'MISSING_NUM', 'NEGATIVE', 'BAD_FIBER', 'RANGE_MACRO', 'RANGE_SUM', 'RANGE_KCAL', 'DUP_ID', 'TRADEMARK']

const checks = [
  ['لا أخطاء (ERROR)', r.errors === 0, `errors=${r.errors}`],
  ...ERROR_CODES.map((code) => [`لا ${code}`, c(code) === 0, `${c(code)}`]),
  ['إجمالي الأصناف ≥ 581', r.total >= 581, `total=${r.total}`],
  ['الأطباق السعودية = 130', r.saudi === 130, `saudi=${r.saudi}`],
  ['أصناف خليجية مضافة = 40 (Cycle 4)', r.gcc === 40, `gcc=${r.gcc}`],
  ['وحدات الحصص مطبّعة — لا UNIT_SPELL (Cycle 3)', c('UNIT_SPELL') === 0, `${c('UNIT_SPELL')}`],
  ['وحدات الحصص — لا UNIT_MSA (فصحى)', c('UNIT_MSA') === 0, `${c('UNIT_MSA')}`],
  ['وحدات الحصص — لا UNIT_BARE (مجرّدة)', c('UNIT_BARE') === 0, `${c('UNIT_BARE')}`],
  ['تناسق التسمية — لا NAME_SPELL «برغر» (Cycle 5)', c('NAME_SPELL') === 0, `${c('NAME_SPELL')}`],
  ['لا أسماء عربية مكرّرة (Cycle 5)', c('DUP_NAME_AR') === 0, `${c('DUP_NAME_AR')}`],
  ['لا أسماء إنجليزية مكرّرة (Cycle 5)', c('DUP_NAME_EN') === 0, `${c('DUP_NAME_EN')}`],
  ['لا تباعد سعرات جديد — DIVERGE_KCAL ≤ 4 (المقبولة موثّقة)', c('DIVERGE_KCAL') <= 4, `${c('DIVERGE_KCAL')}`],
  // ————— Round 2: أكل خارجي خليجي/سعودي (60 صنفًا) —————
  ['إجمالي الأصناف ≥ 641 (581 + 60 Round 2)', r.total >= 641, `total=${r.total}`],
  ['أصناف أكل خارجي مضافة = 60 (Round 2)', r.r2 === 60, `r2=${r.r2}`],
  ['لا علامات تجارية في تسمية Round 2 (TRADEMARK)', c('TRADEMARK') === 0, `${c('TRADEMARK')}`],
  ['منطقية السعرات لكل فئة فرعية Round 2 (CATEGORY_KCAL_R2)', c('CATEGORY_KCAL_R2') === 0, `${c('CATEGORY_KCAL_R2')}`],
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
