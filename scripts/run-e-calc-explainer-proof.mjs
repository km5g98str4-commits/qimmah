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
check('درجات اليقين تستخدم مفاتيح canonical', copy.includes("'published_equation'") && copy.includes("'qimmah_practical_estimate'"))
check('التنويه الطبي موجود', view.includes('d.disclaimerBody') && view.includes('d.disclaimerWhen'))

console.log('\n③ الدخول والرجوع والإثبات البصري')
check('رابط التقدّم الرئيسي موجود', progress.includes('data-testid="progress-calc-link"'))
check('رابط تفصيل الوزن موجود', progress.includes('data-testid="weight-detail-calc-link"'))
check('الرجوع يحفظ مصدر الدخول', app.includes('beforeCalcRef') && app.includes('navigate(beforeCalcRef.current)'))
check('الحاضنة تغطي العربية والإنجليزية', harness.includes("params.get('lang') === 'en' ? 'en' : 'ar'"))
check('الحاضنة تغطي الحالات الفارغة والخطأ والممتلئة', harness.includes("state === 'error'") && harness.includes("state === 'empty'"))
check('الحاضنة تغطي التعديل اليدوي', harness.includes("params.get('manual') === '1'"))

console.log(`\n✅ إثبات حارة E لشرح الحساب نجح — ${passed} فحصًا.`)
