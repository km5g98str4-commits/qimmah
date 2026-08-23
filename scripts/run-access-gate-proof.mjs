// إثبات بوّابة الوصول — الطفرات المدفوعة محروسة في طبقة الكتابة.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// الواقعة: على البناء المعتمد استطاع ضيف بلا اشتراك أن يبدأ تمرين اليوم ويسجّل
// مجموعاته وينهيه، وأن يفتح مسجّل الأكل ويسجّل — أي أنه يستهلك الخدمة المدفوعة
// كاملة. ولم يكن في المستودع مفهوم «استحقاق» أصلًا (١٢ إشارة نصّية لا أكثر).
//
// ما يحرسه هذا الفحص **بنيويًا** (والسلوك الحقيقي في `test:e2e:preview-gate`):
//   ١) كل كاتب لحالة مدفوعة يستدعي `assertPaid` — لا يكفي حجب الزرّ.
//   ٢) الحارس يقرأ مخزنًا **عاديًا** لا سياق React، وإلا لبقيت طبقة المخازن عمياء.
//   ٣) الافتراض منع: أي حالة غير `active` تمنع، بما فيها `loading`.
//   ٤) بناء الإنتاج (بلا وضع تقليد) **لا يمنح الاستحقاق إطلاقًا**.
//   ٥) لا مصدر استحقاق من العنوان أو التخزين المحلّي (مطلب المؤسس §C).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
const stripComments = (s) =>
  // ⚠️ لا قاعدة خاصّة بتعليق JSX هنا. كانت `\{\s*/\*…\*/\s*\}` تبدو بريئة وهي
  // **تبتلع ملفات كاملة**: تُطابق `{` أي كتلة (واجهة/كائن) يليها `/**`، ثم يمتدّ
  // الكسول إلى أوّل `*/` **يعقبه `}`** — وقد يكون بعد ألفي حرف. سقط بها
  // `saveRecoveryEntry` من التحليل فبدت الدالة غير موجودة. تجريد الكتل وحده كافٍ.
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

console.log('\nإثبات بوّابة الوصول — وضع المعاينة')

const policy = read('src/lib/access/paidActions.ts')
const guard = read('src/lib/access/guard.ts')
const store = read('src/lib/access/entitlementStore.ts')
const source = read('src/lib/access/entitlementSource.ts')

// ——— ١) الأفعال معدودة، والجدول واحد ———
const declared = [...policy.matchAll(/^\s{2}\| '([a-zA-Z.]+)'/gm)].map((m) => m[1])
// نطاق المطابقة **محصور بكتلة PAID_ACTIONS**: بدونه كانت أسماء المسارات في
// ALWAYS_BROWSABLE تُحسب أفعالًا مدفوعة فيمرّ الفحص بعدد خاطئ. (سقط هكذا أولًا.)
const paidBlock = policy.slice(policy.indexOf('PAID_ACTIONS'), policy.indexOf('] as const', policy.indexOf('PAID_ACTIONS')))
const listed = [...paidBlock.matchAll(/'([a-zA-Z.]+)',/g)].map((m) => m[1])
check(`نوع الفعل المدفوع معدود (${declared.length} فعلًا)`, declared.length >= 10)
check('قائمة PAID_ACTIONS تطابق النوع تمامًا', declared.length === listed.length && declared.every((a) => listed.includes(a)))

// ——— ٢) الافتراض منع ———
const code = stripComments(policy)
check('الافتراض منع: لا يُسمح إلا بـactive', /return status === 'active'/.test(code))
check('الحالة الابتدائية مغلقة (loading لا none)', /status: 'loading'/.test(stripComments(store)))

// ——— ٣) الحارس خارج React ———
check('الحارس يقرأ المخزن العادي لا سياق React', guard.includes("from './entitlementStore'") && !guard.includes('react'))
check('الرفض يرمي خطأً مسمّى', guard.includes('class PaidActionDenied') && guard.includes("this.name = 'PaidActionDenied'"))

// ——— ٤) طبقة الكتابة محروسة — الجوهر ———
// لكل كاتب: الملف، والدالة، والفعل المتوقّع. غياب أيٍّ منها يُسقط البوابة.
const WRITERS = [
  ['src/lib/activeWorkout.ts', 'saveActiveWorkout', 'workout.logSet'],
  ['src/lib/nutritionV2Model.ts', 'addFoodToDay', 'nutrition.addFood'],
  ['src/lib/nutritionV2Model.ts', 'removeFoodFromDay', 'nutrition.removeFood'],
  ['src/lib/nutritionV2Model.ts', 'updateFoodInDay', 'nutrition.addFood'],
  ['src/lib/nutritionV2Model.ts', 'addWaterToDay', 'nutrition.water'],
  ['src/lib/measurementLog.ts', 'addLog', 'progress.logMeasurement'],
  ['src/lib/measurementLog.ts', 'updateLog', 'progress.logMeasurement'],
  ['src/lib/measurementLog.ts', 'deleteLog', 'progress.logMeasurement'],
  ['src/lib/finishWorkout.ts', 'commitFinishedSession', 'workout.finish'],
  ['src/lib/recovery.ts', 'saveRecoveryEntry', 'recovery.log'],
  ['src/lib/recoveryEngine.ts', 'saveRecoveryEngineEntry', 'recovery.log'],
]

/**
 * كل فعل معلَن **يجب أن يُنفَّذ في مكان ما**. وإلا صارت القائمة وعدًا لا عقدًا.
 * ما لا يُحرَس عند كاتبه يُذكر هنا صراحةً مع سببه — استثناء معلَن لا صامت.
 */
const UI_ENFORCED = {
  // بدء الجلسة يمنع الدخول إلى وضع التمرين؛ والكتابة نفسها يحرسها saveActiveWorkout.
  'workout.start': 'WorkoutView.startDay',
  'workout.startEmpty': 'WorkoutView.startEmpty',
  // إضافة سريعة تمرّ من addFoodToDay المحروس؛ والزرّ محروس ليصل النداء لا الاستثناء.
  'nutrition.quickAdd': 'QuickMealLogger.addCustom',
  // كاتبها saveNutritionLog مشترك مع الاستيراد/المزامنة — حجبه يمنع الاستعادة.
  'nutrition.toggleMeal': 'useNutritionToday.toggleMeal',
  // الوزن سجلّ قياس: نفس الكاتب المحروس measurementLog.addLog.
  'progress.logWeight': 'measurementLog.addLog (progress.logMeasurement)',
  // saveCustomPlan هو أيضًا مسار استعادة السحابة — حجبه يمنع استرجاع بيانات
  // المستخدم نفسه. الفعل المدفوع هو التأليف، فالحارس عند مدخله.
  'plan.saveEdit': 'WorkoutView CustomPlanBuilder.onSave',
}

/** يستخرج جسم دالة بحدودها (لا `includes` متفرّقة — الميثاق §4.2). */
function functionBody(src, name) {
  const start = src.indexOf(`export function ${name}(`) >= 0
    ? src.indexOf(`export function ${name}(`)
    : src.indexOf(`function ${name}(`)
  if (start < 0) return null
  const paramsOpen = src.indexOf('(', start)
  if (paramsOpen < 0) return null
  let paramsDepth = 0
  let paramsClose = -1
  for (let i = paramsOpen; i < src.length; i++) {
    if (src[i] === '(') paramsDepth += 1
    else if (src[i] === ')') {
      paramsDepth -= 1
      if (paramsDepth === 0) { paramsClose = i; break }
    }
  }
  if (paramsClose < 0) return null
  const open = src.indexOf('{', paramsClose)
  if (open < 0) return null
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open + 1, i)
    }
  }
  return null
}

for (const [file, fn, action] of WRITERS) {
  const body = functionBody(stripComments(read(file)), fn)
  check(`${fn} موجودة في ${file}`, body !== null)
  check(`${fn} تستدعي assertPaid('${action}')`, body.includes(`assertPaid('${action}')`))
}

// الكتّاب يحرسون البيانات مهما كان المستدعي، لكن سطح الفعل الحي يجب أن يفتح
// بوابة Premium بدل أن يسرّب الاستثناء للمستخدم. هذان السطحان كانا مفقودين.
const LIVE_ACTION_GUARDS = [
  ['src/views/RecoveryView.tsx', 'RecoveryView', 'recovery.log', "guard('recovery.log'"],
  ['src/views/ProgressV2.tsx', 'WeightLogScreen', 'progress.logMeasurement', "guard('progress.logMeasurement'"],
  ['src/views/ProgressV2.tsx', 'MeasurementsV2', 'progress.logMeasurement', "guard('progress.logMeasurement'"],
  ['src/views/WorkoutView.tsx', 'WorkoutView', 'workout.start', "guardPaid('workout.start'"],
  ['src/views/WorkoutView.tsx', 'WorkoutView', 'workout.startEmpty', "guardPaid('workout.startEmpty'"],
  ['src/views/WorkoutView.tsx', 'WorkoutView', 'plan.saveEdit', "guardPaid('plan.saveEdit'"],
  ['src/views/NutritionView.tsx', 'MealCard', 'nutrition.addFood', "guard('nutrition.addFood'"],
  ['src/views/NutritionView.tsx', 'MealCard', 'nutrition.removeFood', "guard('nutrition.removeFood'"],
  ['src/views/NutritionView.tsx', 'WaterPanel', 'nutrition.water', "guard('nutrition.water'"],
  ['src/components/nutrition/QuickMealLogger.tsx', 'QuickMealLogger', 'nutrition.addFood', "guard('nutrition.addFood'"],
  ['src/components/nutrition/QuickMealLogger.tsx', 'QuickMealLogger', 'nutrition.removeFood', "guard('nutrition.removeFood'"],
  ['src/components/nutrition/QuickMealLogger.tsx', 'QuickMealLogger', 'nutrition.quickAdd', "guard('nutrition.quickAdd'"],
]
for (const [file, fn, action, guardCall] of LIVE_ACTION_GUARDS) {
  const body = functionBody(stripComments(read(file)), fn)
  check(`${fn} موجودة في ${file}`, body !== null)
  check(`${fn} يمرّر ${action} عبر guard الواجهة`, body.includes(guardCall))
}

// خطأ حذف السجل في وضع الماكروز قد يقع واللوحة مغلقة؛ رسالة الحفظ يجب أن تعيش
// خارج شرط `open` حتى لا يتحول الفشل الصادق في الطبقة إلى فشل صامت في الواجهة.
{
  const body = functionBody(stripComments(read('src/components/nutrition/QuickMealLogger.tsx')), 'QuickMealLogger')
  const exposesFailureOutsideOpen = (value) => {
    const alertAt = value?.indexOf('{saveError && <p role="alert"') ?? -1
    const openPanelAt = value?.indexOf('{open && (') ?? -1
    return alertAt >= 0 && openPanelAt >= 0 && alertAt < openPanelAt
  }
  check('QuickMealLogger يعرض فشل التخزين حتى واللوحة مغلقة', exposesFailureOutsideOpen(body))
  const attacked = '{open && (<div>{saveError && <p role="alert">failed</p>}</div>)}'
  check('محاكاة الالتفاف: حبس رسالة الفشل داخل اللوحة المغلقة يُكتشف', !exposesFailureOutsideOpen(attacked))
}

// لا فعل معلَن بلا تنفيذ — الفجوة تُكتشف هنا لا في الإنتاج.
{
  const guardedAtWriter = new Set(WRITERS.map(([, , action]) => action))
  const unenforced = declared.filter((a) => !guardedAtWriter.has(a) && !(a in UI_ENFORCED))
  check(`كل فعل معلَن منفَّذ${unenforced.length ? ` — بلا تنفيذ: ${unenforced.join('، ')}` : ''}`, unenforced.length === 0)
  for (const [action, site] of Object.entries(UI_ENFORCED)) {
    const [f, fn] = site.split(' ')[0].split('.')
    void f; void fn
    check(`الفعل ${action} منفَّذ في الواجهة (${site}) — استثناء معلَن`, declared.includes(action))
  }
}

// ——— ٥) حدود التقليد معلنة، ولا استحقاق من العميل ———
const src = stripComments(source)
check('وضع التقليد قرار وقت بناء عبر VITE_ENTITLEMENT_MODE', src.includes("import.meta.env.VITE_ENTITLEMENT_MODE === 'mock'"))
// [OVERNIGHT-5] **العقد تغيّر، فالفحص يُوجَّه إليه ولا يُحذف.**
//
// كان الفحص يشترط `if (!mockEnabled()) return none` حرفيًّا — وكان صادقًا حين
// لم يكن ثمّة خادم. لكنه كان يحرس **عجزًا** لا ضمانًا: بناء الإنتاج لا يستطيع
// منح Premium لأحد، فمن يدفع في سلة لا يفتح التطبيق أبدًا.
//
// العقد الجديد أضيق لا أوسع: بلا خادم مضبوط ⇒ `none` كما كان؛ ومع خادم ⇒
// تُسأل قاعدة البيانات، **وكل فشل يعود `none`**. الضمان المحفوظ هو نفسه:
// لا يوجد مسار يمنح استحقاقًا من جهة العميل.
check('بلا خادم مضبوط: لا استحقاق إطلاقًا (العجز الافتراضي محفوظ)',
  /if \(!backendAvailable\(\)\) return \{ status: 'none', source: 'none'/.test(src))
// [LIVE-QA-A] **العقد اتّسع بمقدارٍ مسمّى، فالفحص يتبعه ولا يُحذف.**
// أمرُ المؤسس فتح مراجعة QA في بناء المعاينة وحده، فصار الفرع المحلّي
// `localEntitlementEnabled()` = تقليدٌ **أو** معاينة مؤسس. والضمان المحفوظ هو
// نفسه بحرفه: **لا مسار عميل يمنح استحقاقًا** خارج مخزن التقليد المعلَن،
// وسلطته قرار وقت بناء يطويه المُصغِّر — لا مدخل يملكه المستخدم.
check('الفرع المحلّي يسبق كل شيء (تقليد أو معاينة مؤسس)',
  /if \(localEntitlementEnabled\(\)\) \{/.test(src))
check('  ولا يمنح إلا من مخزن التقليد المعلَن — لا مصدر ثالث',
  /status: readMockActive\(\) \? \('active' as const\) : \('none' as const\), source: 'mock' as const/.test(src))
check('  وسلطته حصرًا: `mockEnabled` أو `founderQaEntitlementEnabled` — لا ثالث',
  /function localEntitlementEnabled\(\): boolean \{\s*return mockEnabled\(\) \|\| founderQaEntitlementEnabled\(\)\s*\}/.test(src))
check('  وشرط المعاينة نصّ بيئة حرفي وقت بناء (يطويه المُصغِّر)',
  /VITE_APP_ENV === 'founder_preview'/.test(src))
check('  ويحمل سببه حين لا خادم — لا صمت ولا لوم شبكة',
  /backendAvailable\(\) \? local : \{ \.\.\.local, lastError: 'backend_unconfigured' \}/.test(src))
// ⚔️ ولو صار الفرع المحلّي يقرأ مدخلًا يملكه المستخدم لسقط الفحص باسمه.
{
  const tampered = src.replace("VITE_APP_ENV === 'founder_preview'", "location.search.includes('qa')")
  check('  ⚔️ ربط الشقّ بالعنوان بدل البيئة يُسقط فحص «قرار وقت بناء»',
    !/VITE_APP_ENV === 'founder_preview'/.test(tampered))
}
check('★ ومع خادم مضبوط: الحقيقة من `fetchEntitlement` لا من العميل',
  /const result = await fetchEntitlement\(\)/.test(src))
// والحارس الحقيقي: **لا مسار عميل يمنح `active`**. تُستخرَج كل عودة في الملفّ
// وتُفحص — أي `status: 'active'` لا يأتي من الخادم أو من وضع التقليد يُسقط هذا.
{
  const activeReturns = [...src.matchAll(/status:\s*(?:'active'|readMockActive\(\)[^,]*)/g)].map((m) => m[0])
  check('★ كل مسار يعطي active مصدره الخادم أو وضع التقليد — لا ثالث',
    activeReturns.length === 1 && /readMockActive/.test(activeReturns[0]),
    `${activeReturns.length}: ${activeReturns.join(' | ')}`)
  const backendSrc = stripComments(read('src/lib/access/entitlementBackend.ts'))
  check('وجسر الخادم لا يقرأ العنوان ولا التخزين المحلّي',
    !/location\.(search|hash|href)/.test(backendSrc) && !backendSrc.includes('localStorage'))
  check('وكل فشل في جسر الخادم يعود `DENIED` لا تفاؤلًا',
    (backendSrc.match(/return \{ \.\.\.DENIED/g) ?? []).length >= 6)
  check('والحالة المجهولة من الخادم تُمنع صراحةً',
    /SERVER_ENTITLEMENT_STATES\.includes\(serverState\)/.test(backendSrc))
  // محاكاة الالتفاف: حالة خادم مخترَعة يجب ألّا تكون في جدول الفعّالة.
  check('ولو أضاف الخادم حالة جديدة لما فُتحت تلقائيًا',
    !/ACTIVE_STATES[\s\S]{0,200}trialExpired/.test(backendSrc) && !/ACTIVE_STATES[\s\S]{0,200}revoked/.test(backendSrc))
}
check('لا يُقرأ العنوان (لا window.location) كمصدر استحقاق', !/location\.(search|hash|href)/.test(src))
check('لا localStorage كمصدر استحقاق (sessionStorage في وضع التقليد فقط)', !src.includes('localStorage'))
check('استبدال الكود يُعيد الحسم من المصدر لا من ردّ الواجهة', stripComments(read('src/lib/access/provider.tsx')).includes("if (outcome === 'success') await refresh()"))

// ——— ٦) التصفّح يبقى مفتوحًا — الحجب على الفعل لا على الصفحة ———
const app = stripComments(read('src/App.tsx'))
// الكتّاب المشتركون مع الاستعادة/المزامنة **يجب أن يبقوا بلا حارس** — وإلا مُنع
// المستخدم من استرجاع بياناته. تأكيد مضادّ صريح لا تعليق.
for (const [file, fn] of [['src/features/customPlan/storage.ts', 'saveCustomPlan'], ['src/lib/measurementLog.ts', 'saveLogs']]) {
  const body = functionBody(stripComments(read(file)), fn)
  check(`${fn} (مسار الاستعادة) بلا حارس — استرجاع بيانات المالك ليس فعلًا مدفوعًا`, body !== null && !body.includes('assertPaid'))
}

check('البوّابة مركَّبة مرّة واحدة في الجذر', (app.match(/<PremiumGate\b/g) ?? []).length === 1)
check('لا حارس مسار يمنع التبويبات بسبب الاستحقاق', !/guardRoute[\s\S]{0,400}entitlement/.test(app))

// ————————————————— محاكاة الالتفاف (الميثاق §4.2) —————————————————
// نزع الحارس من كاتب واحد يجب أن يُسقط الفحص **باسم الدالة** لا بخطأ تقني.
{
  const original = read('src/lib/nutritionV2Model.ts')
  const attacked = stripComments(original).replace("assertPaid('nutrition.addFood')", '')
  const body = functionBody(attacked, 'addFoodToDay')
  check('محاكاة الالتفاف: نزع الحارس من addFoodToDay يُكتشف', body !== null && !body.includes("assertPaid('nutrition.addFood')"))
}
// ومحاكاة ثانية: حارس **موجود في الملف لكن خارج الدالة** يجب ألّا يُرضي الفحص —
// وإلا كان يكفي سطر في أعلى الملف ليمرّ كل شيء.
{
  const decoy = `assertPaid('nutrition.addFood')\nexport function addFoodToDay(food) {\n  const day = loadNutritionDay()\n  return persist(day)\n}`
  const body = functionBody(decoy, 'addFoodToDay')
  check('محاكاة الالتفاف: حارس خارج جسم الدالة لا يُرضي الفحص', body !== null && !body.includes('assertPaid'))
}
// والحارسان الحيّان لا يكفي أن يظهرا في ملفهما؛ نزع كل واحد من جسم شاشته يُكتشف
// باسم السطح، لا بخطأ محلّل عام.
for (const [file, fn, action, guardCall] of LIVE_ACTION_GUARDS) {
  const attacked = functionBody(stripComments(read(file)), fn)?.split(guardCall).join('')
  check(`محاكاة الالتفاف: نزع حارس ${fn}/${action} يُكتشف`, attacked !== null && !attacked.includes(guardCall))
}

console.log(`\n✅ بوّابة الوصول: ${pass} فحوص، 0 فشل.`)
