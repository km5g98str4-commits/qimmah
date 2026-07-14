// إثبات محرّك الرؤى — نواة نقيّة + مُهايئ (عزل مستخدمين/غياب متاجر).
// يُشغَّل عبر run-insights-proof.mjs (esbuild + localStorage مُحاكى).

import { buildInsightsFromInput, computeAllMetrics, THRESHOLDS } from '@/lib/insights'
import { linregSlopePerDay } from '@/lib/insights/metrics'
import type { InsightInput } from '@/lib/insights'
import { buildWeeklyInsights } from '@/lib/insights'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean) => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name}`) } }
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps

const DAY = 86400000
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime() // الاثنين 15 يونيو 2026

function baseInput(over: Partial<InsightInput> = {}): InsightInput {
  return { nowMs: NOW, lang: 'ar', sessions: [], plan: { daysPerWeek: 4, targetProtein: 160 }, weights: [], proteinByDate: {}, prBests: {}, ...over }
}
const weightSeries = (start: number, perDayDelta: number, n: number, endMs = NOW) =>
  Array.from({ length: n }, (_, i) => { const t = endMs - (n - 1 - i) * 3 * DAY; return { date: stamp(t), kg: Math.round((start + perDayDelta * (i * 3)) * 100) / 100 } })

console.log('════════ إثبات محرّك الرؤى ════════')

// ——— 1) الميل مقابل حساب يدوي ———
console.log('— حساب الميل —')
ok('انحدار y=2x ⇒ ميل 2', near(linregSlopePerDay([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }])!, 2))
ok('نقطة واحدة ⇒ null', linregSlopePerDay([{ x: 0, y: 1 }]) === null)
// وزن خطّي -0.1كجم/يوم على 8 نقاط (21 يومًا) ⇒ ~-0.7كجم/أسبوع
const linW = Array.from({ length: 8 }, (_, i) => ({ date: stamp(NOW - (7 - i) * 3 * DAY), kg: 82 - 0.1 * (i * 3) }))
const wmLin = computeAllMetrics(baseInput({ weights: linW })).weight
ok('اتجاه وزن خطّي ⇒ ~-0.7كجم/أسبوع', wmLin.status === 'ok' && near(wmLin.slopeKgPerWeek!, -0.7, 0.06))

// ——— 2) تنشيف (وزن نازل) ———
console.log('— تنشيف —')
const cut = buildInsightsFromInput(baseInput({
  weights: weightSeries(82, -0.15, 8),
  sessions: [{ date: stamp(NOW - DAY), volume: 5200, muscleGroups: ['الصدر'], topSets: [] }],
}))
const cutCard = cut.cards.find((c) => c.key === 'weight')
ok('تنشيف: بطاقة وزن باتجاه نزول', !!cutCard && cutCard.text.includes('ينزل'))
ok('تنشيف: تقدير مُعلَّم (~/تقديري)', !!cutCard && cutCard.estimate && cutCard.text.includes('~') && cutCard.text.includes('تقديري'))
ok('تنشيف: لم تمتنع', cut.abstained === false)

// ——— 3) تضخيم (وزن صاعد) ———
console.log('— تضخيم —')
const bulk = computeAllMetrics(baseInput({ weights: weightSeries(78, 0.12, 8) })).weight
ok('تضخيم: اتجاه صعود', bulk.status === 'ok' && bulk.direction === 'up' && bulk.slopeKgPerWeek! > 0)

// ——— 4) ثبات (plateau) ———
console.log('— ثبات —')
const flat = [80.0, 80.1, 79.9, 80.05, 80.0, 79.95, 80.1].map((kg, i) => ({ date: stamp(NOW - (24 - i * 4) * DAY), kg }))
const plateau = computeAllMetrics(baseInput({ weights: flat })).weight
ok('ثبات: plateau=true', plateau.status === 'ok' && plateau.plateau === true)
const plCard = buildInsightsFromInput(baseInput({ weights: flat })).cards.find((c) => c.key === 'weight')
ok('ثبات: جملة «ثابت»', !!plCard && plCard.text.includes('ثابت'))

// ——— 5) بيانات غير كافية ⇒ امتناع ———
console.log('— بيانات غير كافية —')
const few = computeAllMetrics(baseInput({ weights: [{ date: stamp(NOW - 3 * DAY), kg: 80 }, { date: stamp(NOW), kg: 79.9 }] }))
ok('وزن بنقطتين ⇒ امتناع', few.weight.status === 'abstain' && few.weight.reason === 'insufficient')
const protFew = computeAllMetrics(baseInput({ proteinByDate: { [stamp(NOW)]: 150, [stamp(NOW - DAY)]: 140 } })).protein
ok(`بروتين بيومين (<${THRESHOLDS.proteinMinLoggedDays}) ⇒ امتناع`, protFew.status === 'abstain')
const noTarget = computeAllMetrics(baseInput({ plan: { daysPerWeek: 0, targetProtein: null } }))
ok('لا هدف بروتين ⇒ امتناع بسبب noTarget', noTarget.protein.status === 'abstain' && noTarget.protein.reason === 'noTarget')
ok('لا خطة أيام ⇒ التزام يمتنع', noTarget.adherence.status === 'abstain')

// ——— 6) غياب المتاجر (مدخل فارغ) ⇒ امتناع كامل ———
console.log('— غياب المتاجر —')
const empty = buildInsightsFromInput(baseInput({ plan: { daysPerWeek: 0, targetProtein: null } }))
ok('مدخل فارغ ⇒ abstained=true', empty.abstained === true)
ok('مدخل فارغ ⇒ بطاقة needsData واحدة', empty.cards.length === 1 && empty.cards[0].key === 'needsData')
ok('needsData: فيها فعل ووجهة (لا إحصاءة ميّتة)', empty.cards[0].actionLabel.length > 0 && !!empty.cards[0].dest)

// ——— 7) قِس/سجّل للمدخل القديم ———
console.log('— مدخل قديم —')
const staleW = computeAllMetrics(baseInput({ weights: [
  { date: stamp(NOW - 40 * DAY), kg: 82 }, { date: stamp(NOW - 30 * DAY), kg: 81.5 }, { date: stamp(NOW - 25 * DAY), kg: 81 }, { date: stamp(NOW - 20 * DAY), kg: 80.6 },
] })).weight
ok('آخر قياس قبل 20 يومًا ⇒ stale=true', staleW.stale === true)

// ——— 8) قِمّة القرب من رقم قياسي ———
console.log('— القرب من رقم قياسي —')
const prIn = buildInsightsFromInput(baseInput({
  sessions: [{ date: stamp(NOW - DAY), volume: 4000, muscleGroups: ['الصدر'], topSets: [{ exerciseId: 'bench', nameAr: 'بنش', weightKg: 96 }] }],
  prBests: { bench: { nameAr: 'بنش', best: 100 } },
}))
const prCard = prIn.cards.find((c) => c.key === 'pr')
ok('قريب 4% من الأفضل ⇒ بطاقة PR في «بنش»', !!prCard && prCard.text.includes('بنش') && prCard.text.includes('قريب'))
const prFar = computeAllMetrics(baseInput({
  sessions: [{ date: stamp(NOW - DAY), volume: 4000, muscleGroups: ['الصدر'], topSets: [{ exerciseId: 'bench', nameAr: 'بنش', weightKg: 70 }] }],
  prBests: { bench: { nameAr: 'بنش', best: 100 } },
})).pr
ok('بعيد 30% ⇒ لا رؤية PR (امتناع)', prFar.status === 'abstain')

// ——— 9) الترتيب: ≤3 وحتمي ———
console.log('— الترتيب والحتمية —')
const rich = baseInput({
  weights: weightSeries(82, -0.15, 8),
  sessions: [
    { date: stamp(NOW - DAY), volume: 6000, muscleGroups: ['الصدر', 'الظهر'], topSets: [{ exerciseId: 'bench', nameAr: 'بنش', weightKg: 96 }] },
    { date: stamp(NOW - 2 * DAY), volume: 5000, muscleGroups: ['الأرجل'], topSets: [] },
    { date: stamp(NOW - 8 * DAY), volume: 3000, muscleGroups: ['الصدر'], topSets: [] },
  ],
  prBests: { bench: { nameAr: 'بنش', best: 100 } },
  proteinByDate: { [stamp(NOW)]: 170, [stamp(NOW - DAY)]: 120, [stamp(NOW - 2 * DAY)]: 165, [stamp(NOW - 3 * DAY)]: 100 },
})
const r1 = buildInsightsFromInput(rich), r2 = buildInsightsFromInput(rich)
ok('أقصى 3 بطاقات', r1.cards.length <= 3)
ok('ترتيب حتمي (نفس المدخل ⇒ نفس الترتيب)', JSON.stringify(r1.cards.map((c) => c.key)) === JSON.stringify(r2.cards.map((c) => c.key)))
ok('مرتّب تنازليًا بالأولوية', r1.cards.every((c, i) => i === 0 || r1.cards[i - 1].priority >= c.priority))
ok('كل بطاقة لها فعل ووجهة', r1.cards.every((c) => c.actionLabel.length > 0 && !!c.dest))

// ——— 10) المُهايئ: غياب المتاجر + عزل مستخدمين (localStorage مُحاكى) ———
console.log('— المُهايئ: عزل مستخدمين —')
const LS = globalThis.localStorage
LS.setItem('qimmah:history:migrated:v1', 'done')
// (أ) متاجر فارغة ⇒ امتناع بلا انهيار
const emptyLive = buildWeeklyInsights('ar', NOW)
ok('متاجر فارغة ⇒ امتناع حيّ (لا انهيار)', emptyLive.abstained === true)
// (ب) المستخدم A: قياسات وزن نازلة
const seedWeights = (arr: { date: string; kg: number }[]) => LS.setItem('qimmah:measurementLogs:v1', JSON.stringify(arr.map((w, i) => ({ id: 'm' + i, date: w.date, values: { weightKg: w.kg } }))))
seedWeights(weightSeries(82, -0.15, 8))
const userA = buildWeeklyInsights('ar', NOW)
ok('A: يقرأ الوزن ⇒ بطاقة وزن', userA.cards.some((c) => c.key === 'weight'))
// (ج) مسح + المستخدم B: لا قياسات
LS.clear(); LS.setItem('qimmah:history:migrated:v1', 'done')
const userB = buildWeeklyInsights('ar', NOW)
ok('B بعد المسح: لا بطاقة وزن (عزل — لا تسرّب من A)', !userB.cards.some((c) => c.key === 'weight'))
ok('B بعد المسح: امتنع', userB.abstained === true)

console.log('')
console.log(fail === 0 ? `✅ نجحت كل فحوص محرّك الرؤى — ${pass} فحصًا.` : `❌ فشل ${fail} من ${pass + fail}.`)
if (fail > 0) process.exit(1)
