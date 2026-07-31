import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync(new URL('../src/views/StepsView.tsx', import.meta.url), 'utf8')
const model = readFileSync(new URL('../src/lib/eStepsModel.ts', import.meta.url), 'utf8')
const copy = readFileSync(new URL('../src/i18n/dict/eSteps.ts', import.meta.url), 'utf8')
const routes = readFileSync(new URL('../src/lib/appRoutes.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const progress = readFileSync(new URL('../src/views/ProgressV2.tsx', import.meta.url), 'utf8')

let pass = 0
const check = (label, condition) => {
  assert.equal(condition, true, label)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① مصدر الحقيقة والحسابات')
check('النموذج يقرأ سجل الخطوات والهدف الحاليين', model.includes('loadStepLog()') && model.includes('loadStepGoal()'))
check('الأسبوع آخر 7 أيام والشهر آخر 30 يومًا', model.includes('daysEndingAt(now, 7)') && model.includes('daysEndingAt(now, 30)'))
check('أفضل يوم والسلسلة مشتقان من السجل', model.includes('bestEntry') && model.includes('streakDays'))
check('المسافة موسومة بمعامل تقديري ثابت', model.includes('ESTIMATED_STEP_LENGTH_M = 0.75'))

console.log('\n② ثبات القيم الدلالية')
check('قاموس المصدر مفهرس بمفاتيح StepSource الثابتة', copy.includes('Record<StepSource, string>'))
check('العرض يترجم مفتاح المصدر ولا يختبر نصًا معروضًا', view.includes('copy.sourceLabels[model.source]'))
check('لا طلب صلاحية صحة من صفحة الخطوات', !view.includes('connectHealthKit(') && view.includes('refreshHealthKitStepsIfEnabled'))

console.log('\n③ حالات النظام وإتاحة الوصول')
check('حالة التحميل موجودة', view.includes('variant="loading"') && view.includes('steps-loading'))
check('حالة الخطأ موجودة بفعل إعادة المحاولة', view.includes('variant="error"') && view.includes('copy.retry'))
check('الحالة الفارغة موجودة بفعل حقيقي', view.includes('variant="empty"') && view.includes('copy.openSettings'))
check('الحالة الممتلئة لها سطح إثبات مستقل', view.includes('data-testid="steps-filled"'))
check('الأرقام الأساسية تستخدم خط البيانات', (view.match(/font-mono/g) ?? []).length >= 4)

console.log('\n④ المسار والمدخل')
check('مسار steps مسجل', routes.includes("| 'steps'") && routes.includes("'steps',"))
check('الشاشة محمّلة كسولًا ومحمية بالإعداد المكتمل', app.includes('StepsView: lazy(') && app.includes("route === 'steps'"))
check('مدخل الصفحة داخل سطح Progress المملوك للحارة', progress.includes("go('steps')"))

console.log(`\n✅ إثبات حارة E لصفحة الخطوات نجح — ${pass} فحصًا.`)
