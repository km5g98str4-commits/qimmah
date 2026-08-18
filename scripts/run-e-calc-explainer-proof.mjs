import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const view = read('src/views/CalcExplainerView.tsx')
const model = read('src/lib/eCalcExplainerModel.ts')
const copy = read('src/i18n/dict/eCalc.ts')
const app = read('src/App.tsx')
const progress = read('src/views/ProgressV2.tsx')
const harness = read('scripts/e-calc-explainer-shot/harness.tsx')

let passed = 0
const check = (label, condition) => {
  assert.equal(condition, true, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① مصدر الحقيقة والمعادلات')
for (const constant of [
  'PROTEIN_PER_KG',
  'FAT_CALORIE_RATIO',
  'CUT_DEFICIT',
  'BULK_SURPLUS',
  'KCAL_PER_KG',
  'WATER_ML_PER_KG',
  'WATER_MIN_LITERS',
  'WATER_MAX_LITERS',
]) {
  check(`${constant} مشتق من calculators`, copy.includes(`${constant},`) || copy.includes(`${constant}\n`))
}
check('الهدف الفعّال للقاصر canonical', model.includes('effectiveGoalTypeForAge(profile.goalType, profile.age)'))
check('لا منطق على نصوص العرض', !model.includes('includes(') && !model.includes('startsWith('))
check('التعديل اليدوي منفصل عن خط الأساس', view.includes('data.saved.targetCalories') && view.includes('data.calculated'))

console.log('\n② الحالات والمحتوى')
for (const state of ['loading', 'empty', 'error', 'filled']) {
  check(`حالة ${state} قابلة للاختبار`, view.includes(`e-calc-${state}`))
}
check('سبعة أقسام حسابية قابلة للطي', (view.match(/<ExplainerSection/g) ?? []).length === 7)
check('الماء ومعدل التغيّر موجودان', view.includes('d.waterTitle') && view.includes('d.rateTitle'))
check('المعدل الفعلي يأتي من سجل القياس القانوني', view.includes('loadLogs()') && model.includes('actualWeeklyWeightChange'))
// ——— [WAVE-B] إسناد اليقين: فحص **مقترن لكل مقياس** لا وجوديّ للمفاتيح ———
//
// كان السطر السابق: `copy.includes("'published_equation'") && copy.includes("'qimmah_practical_estimate'")`.
// وهو يُرضى من **أي** موضعين في الملف، فلا يرى إسنادًا خاطئًا إطلاقًا: مرّت أربعة
// صفوف موسومة «تقدير عملي من قِمّة» وهي ليست تقديرًا — قراران سياسةُ منتج
// وقاعدتان لهما مرجع منشور — والبوابة خضراء طوال الوقت. §4.2: مرورٌ غير مستحقّ
// ليس نجاحًا.
//
// البديل يستخرج كتلة كل صفّ **بحدودها** ويقرأ درجته، ويقارنها بالجدول المرجعي
// أدناه، **في اللغتين معًا**. أي إسناد خاطئ يسقط باسم مقياسه.
const CERTAINTY_BY_METRIC = {
  bmi: 'published_equation',
  bmr: 'published_equation',
  macro_energy_factors: 'published_equation',
  protein_target: 'established_range_choice',
  fat_ratio: 'established_range_choice',
  water_floor: 'established_range_choice',
  activity_factor: 'qimmah_practical_estimate',
  calorie_adjustment: 'product_policy',
  water_weight_rule: 'published_rule',
  weight_change_rate: 'published_rule',
  water_ceiling: 'product_policy',
}

/** كل درجات صفٍّ بمعرّفه — واحدة لكل لغة. */
function certaintiesOf(id) {
  const out = []
  let i = 0
  while (true) {
    const at = copy.indexOf(`id: '${id}',`, i)
    if (at === -1) return out
    const block = copy.slice(at, at + 320)
    const m = block.match(/certainty: '([a-z_]+)'/)
    if (m) out.push(m[1])
    i = at + 1
  }
}

for (const [metric, expected] of Object.entries(CERTAINTY_BY_METRIC)) {
  const found = certaintiesOf(metric)
  check(`إسناد «${metric}» = ${expected} في اللغتين`, found.length === 2 && found.every((c) => c === expected))
}

// لا مظلّة: «تقدير من قِمّة» لصفٍّ واحد فقط — الوحيد الذي لا مرجع له.
check(
  'التقدير ليس مظلّة تبتلع غيره',
  (copy.match(/certainty: 'qimmah_practical_estimate'/g) ?? []).length === 2,
)

// كل درجة معلَنة لها اسم وشرح في اللغتين — لا درجة صامتة.
for (const key of ['published_equation', 'published_rule', 'established_range_choice', 'qimmah_practical_estimate', 'product_policy']) {
  check(`الدرجة «${key}» معلَنة`, copy.includes(`'${key}',`))
  check(`الدرجة «${key}» لها اسم وشرح في اللغتين`, (copy.match(new RegExp(`\\n\\s+${key}: `, 'g')) ?? []).length === 4)
}

// لا بتر: القيد لا يُقصّ عند الشرطة ولا يُخبّأ في `title` وحده.
// الغياب يُقاس على **الكود** لا على الشرح: تعليق يوثّق العطل المُصلَح يذكره
// بالضرورة، فخلطه بالكود يُسقط الإثبات بأصدق سطر في الملف.
const viewCode = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check('الشارة لا تبتر نصّها', !viewCode.includes("split('—')"))
check('القيد لا يعيش في title وحده', !viewCode.includes('<span title={label}'))
check('شرح الدرجة معروض لا مخفيّ', view.includes('d.certaintyNotes[row.certainty]'))

// لا تناقض: ما يسمّيه الكود مرجعًا لا تنفيه الشاشة.
// `calculators.ts` يستشهد بـWishnofsky (1958) للثابت 7700، فالشاشة تسمّيه أيضًا
// ولا تصنّفه «بلا مرجع منشور».
const calculators = read('src/lib/calculators.ts')
check('ثابت 7700 يُنسب لمرجعه في الكود', calculators.includes('Wishnofsky'))
check('الشاشة تسمّي مرجع 7700 لا تنفيه', copy.includes('Wishnofsky (1958)'))

// ——— [WAVE-B] ادعاءات التخصيص: ما نَعِد به يطابق ما نحسبه ———
//
// جزء من أرقام الخطة **ليس مخصَّصًا**: الوزن المستهدف للتنشيف = `weightKg × 0.92`
// نسبةٌ ثابتة (`planDerive.ts:27`)، والماء `clamp(w × 0.035, 2.5, 4.0)`
// (`calculators.ts:346`) فكل من وزنه ≤٧١كجم يرى **٢٫٥ لتر** — رقمًا واحدًا لكل
// هؤلاء. فوعدُ «ما فيه شي عام» فوق هذه الشبكة يُكذّبه الحساب تحته.
const revealCopy = read('src/i18n/dict/reveal.ts')
const onboardingCopy = read('src/i18n/dict/onboarding.ts')
const planDerive = read('src/lib/planDerive.ts')
check('الحساب فعلًا يحمل نسبة ثابتة (سبب القيد)', planDerive.includes('weightKg * 0.92'))
check('الماء محصور بحدّين (سبب القيد)', calculators.includes('WATER_MIN_LITERS, WATER_MAX_LITERS'))
check('الكشف لا يَعِد بأن لا شيء عامّ', !revealCopy.includes('ما فيه شي عام') && !revealCopy.includes('nothing generic'))
check('الكشف يعترف بالقواعد العامة', revealCopy.includes('قواعد عامة') && revealCopy.includes('general rules'))
check('الإعداد يقول «قدّر» لا «حسب»', onboardingCopy.includes('قِمّة قدّرت هذي الأهداف') && !onboardingCopy.includes('قِمّة حسبت هذي الأهداف'))
check('الإنجليزية تقول estimated لا calculated', onboardingCopy.includes('Qimmah estimated these targets') && !onboardingCopy.includes('Qimmah calculated these targets'))
check('التنويه الطبي موجود', view.includes('d.disclaimerBody') && view.includes('d.disclaimerWhen'))

console.log('\n③ الدخول والرجوع والإثبات البصري')
check('رابط التقدّم الرئيسي موجود', progress.includes('data-testid="progress-calc-link"'))
check('رابط تفصيل الوزن موجود', progress.includes('data-testid="weight-detail-calc-link"'))
check('الرجوع يحفظ مصدر الدخول', app.includes('beforeCalcRef') && app.includes('navigate(beforeCalcRef.current)'))
check('الحاضنة تغطي العربية والإنجليزية', harness.includes("params.get('lang') === 'en' ? 'en' : 'ar'"))
check('الحاضنة تغطي الحالات الفارغة والخطأ والممتلئة', harness.includes("state === 'error'") && harness.includes("state === 'empty'"))
check('الحاضنة تغطي التعديل اليدوي', harness.includes("params.get('manual') === '1'"))

console.log(`\n✅ إثبات حارة E لشرح الحساب نجح — ${passed} فحصًا.`)
