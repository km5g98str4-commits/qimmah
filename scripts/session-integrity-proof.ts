/**
 * سلامة الجلسة — «١ من ١» لا تعود. [FOUNDER-QA-001]
 *
 * ═══ العطل الذي أنشأ هذا الإثبات ═══
 * المؤسس فتح يوم «علوي» فيه ٧ تمارين فوجد الجلسة **«١ من ١»**، وأنهى تمرينًا
 * واحدًا فكُتب يومه كاملًا منجزًا. السبب لم يكن العدّاد ولا المولّد: كان
 * `WorkoutView.applyEasyIfActive` يطبّق **سقف الأسبوع الأول الصامت** على كل
 * مستخدم جديد (`cappedSessionMinutes(fullMin, journeyDayIndex())` و
 * `journeyDayIndex()` = `null` على أي جهاز جديد ⇒ «داخل الأسبوع الأول»)،
 * ثم يقتطع التمارين بنسبة `السقف ÷ المدّة المُعلَنة`. وكلّما طالت الجلسة التي
 * اختارها المستخدم اشتدّ الاقتطاع، حتى ينهار عند ٧٥–٩٠ دقيقة إلى **تمرين واحد**.
 *
 * ═══ الثابت المحروس ═══
 *   ① **جلسة اليوم = يوم الخطة كاملًا** لكل تركيبة (مدّة × أيام) — بالمولّد
 *      الحقيقي لا بأرقام مكتوبة هنا.
 *   ② لا يقتطعها إلا **طلب صريح** من المستخدم لهذا اليوم.
 *   ③ والمقتطَع **لا ينزل تحت الأرضية** — «أخفّ» جلسةٌ أقصر لا تمرين واحد.
 *   ④ ولا يبقى في الشاشة الحيّة أي مسار اقتطاع ثانٍ (فحص بنيوي على المصدر).
 *   ⑤ والمخفّفة **تُعلن نفسها**: `fullExerciseCount` يصل الجلسة، والنصّان
 *      موجودان بالعربية والإنجليزية.
 *   ⟲ تأكيدات مضادّة: إعادة السقف الصامت — ولو بصورة أخرى — تُسقط الإثبات
 *      **بفحص مسمّى**، لا باستثناء تقني.
 */
import { generatePlan } from '@/lib/planGenerator'
import { defaultProfile } from '@/lib/calculators'
import {
  EASY_MIN_EXERCISES,
  clearEasyToday,
  easyExerciseCount,
  enableEasyToday,
  isEasyToday,
  sessionExerciseCount,
} from '@/lib/easySession'
import { readCustomization } from '@/lib/customization'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'
import type { Profile } from '@/types/profile'

declare const __SOURCES__: Record<string, string>

let pass = 0
const fails: string[] = []
const check = (label: string, cond: boolean, detail = '') => {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    fails.push(label)
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/** المدّة ٩٠ ليست في `DURATIONS` الحيّة لكنها في باني الخطة — فتُفحص كذلك. */
const DURATIONS = [30, 45, 60, 75, 90]
const DAYS = [1, 2, 3, 4, 5, 6, 7]

console.log('\n① جلسة اليوم = يوم الخطة كاملًا — بالمولّد الحقيقي')
let combos = 0
let planDaysChecked = 0
let worstBefore = { label: '', full: 0, shown: 0 }
const collapses: string[] = []
for (const duration of DURATIONS) {
  for (const days of DAYS) {
    const profile: Profile = { ...defaultProfile, workoutDuration: duration, trainingDays: days, workoutEnvironment: 'gym' }
    const plan = generatePlan(profile).workoutPlan
    combos += 1
    for (const day of plan.days) {
      planDaysChecked += 1
      const n = day.exercises.length
      const shown = sessionExerciseCount(n, duration, false)
      if (shown !== n) collapses.push(`${duration}د×${days}أيام «${day.nameAr}»: ${n} ⇒ ${shown}`)
      // ما كان يحدث قبل الإصلاح — بنفس صيغة السقف القديمة، لتوثيق الحجم لا لتشغيله.
      const before = Math.min(n, Math.max(1, Math.round((n * 15) / duration)))
      if (worstBefore.full === 0 || before < worstBefore.shown || (before === worstBefore.shown && n > worstBefore.full)) {
        worstBefore = { label: `${duration}د «${day.nameAr}»`, full: n, shown: before }
      }
    }
  }
}
check('كل يوم خطة يفتح بكامل تمارينه', collapses.length === 0,
  collapses.length === 0 ? `${planDaysChecked} يومًا في ${combos} تركيبة · صفر اقتطاع` : collapses.slice(0, 5).join(' · '))
console.log(`     (للتوثيق: أسوأ حالة بالسقف القديم — ${worstBefore.label}: ${worstBefore.full} ⇒ ${worstBefore.shown})`)

console.log('\n② لا اقتطاع إلا بطلب صريح')
check('بلا طلب: الجلسة = اليوم مهما طالت المدّة المُعلَنة',
  [30, 45, 60, 75, 90, 120].every((m) => sessionExerciseCount(8, m, false) === 8))
check('بطلب صريح: الجلسة تقصر فعلًا (وإلا فالزرّ بلا أثر)',
  sessionExerciseCount(9, 90, true) < 9, `٩ ⇒ ${sessionExerciseCount(9, 90, true)}`)

console.log('\n③ الأرضية — «أخفّ» ليست تمرينًا واحدًا')
const floorCases: string[] = []
for (const duration of DURATIONS) {
  for (let n = 1; n <= 12; n += 1) {
    const easy = sessionExerciseCount(n, duration, true)
    if (easy < Math.min(n, EASY_MIN_EXERCISES)) floorCases.push(`${n}@${duration}د ⇒ ${easy}`)
    if (easy > n) floorCases.push(`${n}@${duration}د ⇒ ${easy} (أكبر من اليوم!)`)
  }
}
check('المخفّفة لا تنزل تحت الأرضية ولا تتجاوز اليوم',
  floorCases.length === 0, floorCases.length === 0 ? `أرضية ${EASY_MIN_EXERCISES} · ٦٠ حالة` : floorCases.slice(0, 5).join(' · '))
check('يوم أقصر من الأرضية يبقى كما هو — لا نضيف ما ليس في الخطة',
  sessionExerciseCount(2, 90, true) === 2 && sessionExerciseCount(1, 90, true) === 1)

console.log('\n④ لا مسار اقتطاع ثانٍ في الشاشة الحيّة')
const view = __SOURCES__['src/views/WorkoutView.tsx']
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
check('`WorkoutView` لا يستدعي سقف الأسبوع الأول',
  !/cappedSessionMinutes/.test(view))
check('  ولا يقرأ `journeyDayIndex` لبناء جلسة',
  !/journeyDayIndex/.test(view))
/**
 * الفحص الحقيقي ليس «كم `slice` في الملف» — في الشاشة قصّ عرضٍ مشروع
 * (`planDay.exercises.slice(0, 4)` لسطر أسماء اليوم) لا علاقة له بالجلسة.
 * الفحص مربوط بمقصده: **ما الذي يصير جلسةً**؟ فيُستخرج كل ما يُسنَد إلى
 * `setActiveDay` ويُقارَن بقائمة مسموح بها مسمّاة.
 */
const sessionAssignments = [...view.matchAll(/setActiveDay\(([^\n]*?)\)\s*$/gm)].map((m) => m[1].trim())
const ALLOWED_SESSION_SOURCES = [
  /^day$/, // من `startDay` — مرّ بـ`applySessionScope`
  // الاستئناف يعيد **يوم الخطة كما هو**: الجلسة المحفوظة لا تحمل سيرة اقتطاعها،
  // ولا يُخمَّن سبب لم يُسجَّل (§5). فالاستئناف يميل إلى العرض الكامل — وهو
  // الاتجاه الآمن بعد [FOUNDER-QA-001]، لا اقتطاعًا ثانيًا.
  /^resumeDay$/,
  /^null$/, // إغلاق الجلسة
  // «تمرين فارغ» — جلسة **بلا تمارين بالتصميم** (يسجّل المستخدم تمارينه بنفسه).
  // مسموح بها لأنها لا تقتطع يومًا: `exercises: []` صريحة لا اقتطاع خفيّ.
  /^\{ id: `empty-\$\{Date\.now\(\)\}`,[^}]*exercises: \[\] \}$/,
]
const stray = sessionAssignments.filter((a) => !ALLOWED_SESSION_SOURCES.some((r) => r.test(a)))
check('  ولا يصير جلسةً إلا ما مرّ بالسلطة الواحدة',
  stray.length === 0 && sessionAssignments.length >= 3 && /sessionExerciseCount\(/.test(view),
  stray.length === 0 ? `${sessionAssignments.length} إسنادًا مسمّى` : `دخيل: ${stray.join(' · ')}`)
/** والقصّ داخل السلطة نفسه واحد لا اثنان. */
const scopeBody = view.slice(view.indexOf('const applySessionScope'), view.indexOf('const [pendingWarmup'))
check('  والقصّ داخل السلطة واحد، مشروط بعددها',
  (scopeBody.match(/exercises\.slice\(/g) ?? []).length === 1 && /sessionExerciseCount\(/.test(scopeBody))
const modeSrc = __SOURCES__['src/components/WorkoutMode.tsx']
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
check('وضع الجلسة يعدّ من `day.exercises.length` لا من رقم آخر',
  /const total = day\.exercises\.length/.test(modeSrc))

console.log('\n⑤ المخفّفة تُعلن نفسها')
check('سيرة الاقتطاع تصل وضع الجلسة من الشاشة المالكة',
  /trimmed=\{trimmed \?\? undefined\}/.test(view) && /data-session-trimmed=\{/.test(modeSrc))
check('والسبب الوحيد الباقي هو اختيار المستخدم — لا سبب تلقائي',
  /reason: 'easy'/.test(view) && !/'firstWeek'/.test(view))
check('وزرّ البدء يَعِد بالعدد المُسلَّم لا بعدد الخطة',
  /todayDelivery\?\.trimmed/.test(view) && /startTrimmedCount\(/.test(view))
for (const lang of ['ar', 'en'] as const) {
  const s2 = workoutScreenStrings[lang]
  const body = s2.trimmedEasyBody(3, 7, lang)
  const promise = s2.startTrimmedCount(3, 7, lang)
  check(`نصّ المخفّفة (${lang}) يحمل الرقمين`,
    body.length > 0 && promise.length > 0 && s2.trimmedEasyTitle.length > 0, promise)
  if (lang === 'ar') {
    check('  والأرقام العربية-الهندية لا اللاتينية (BUG-019)',
      /[٠-٩]/.test(promise) && !/[0-9]/.test(promise), promise)
  }
}

console.log('\n⟲ التأكيدات المضادّة — الإثبات ليس فارغًا')
// ⟲-١ صيغة السقف القديمة نفسها تُسقط ①: نعيد بناءها هنا ونثبت أنها كانت تنهار.
const revived = (total: number, fullMin: number) => Math.min(total, Math.max(1, Math.round((total * 15) / fullMin)))
check('⟲ السقف القديم على يوم علوي (٧ تمارين · ٧٥ د) يعطي ١ — وهو ما كان يراه المؤسس',
  revived(7, 75) === 1 && sessionExerciseCount(7, 75, false) === 7,
  `قديم ${revived(7, 75)} · الآن ${sessionExerciseCount(7, 75, false)}`)
// ⟲-٢ إزالة الأرضية تُسقط ③ بفحص مسمّى لا باستثناء.
const noFloor = (total: number, fullMin: number, targetMin: number) =>
  Math.min(total, Math.max(1, Math.round((total * targetMin) / fullMin)))
check('⟲ إزالة الأرضية تُعيد «١ من ١» من باب «أخفّ»',
  noFloor(9, 90, 15) === 2 && noFloor(7, 90, 15) === 1 && sessionExerciseCount(7, 90, true) >= EASY_MIN_EXERCISES)
// ⟲-٣ الفحص البنيوي ④ يلتقط عودة السقف نصًّا.
check('⟲ إعادة `cappedSessionMinutes` إلى الشاشة تُلتقط بالنمط نفسه',
  /cappedSessionMinutes/.test(`${view}\nconst capMin = cappedSessionMinutes(fullMin, 1)`) && !/cappedSessionMinutes/.test(view))
// ⟲-٤ الالتفاف الأخطر: مسار جلسة يلتفّ على السلطة — يجب أن يسقط ④ **باسمه**.
//     نحاكي بالضبط ما فعله السقف القديم: يومٌ مقصوص يُسنَد مباشرةً إلى الجلسة.
const bypass = `${view}\n    setActiveDay(rawDay.exercises.slice(0, 1) as unknown as PlanDay)\n`
const bypassAssignments = [...bypass.matchAll(/setActiveDay\(([^\n]*?)\)\s*$/gm)].map((m) => m[1].trim())
const bypassStray = bypassAssignments.filter((a) => !ALLOWED_SESSION_SOURCES.some((r) => r.test(a)))
check('⟲ مسار جلسة يلتفّ على السلطة يسقط بفحص مسمّى — لا باستثناء تقني',
  bypassStray.length === 1 && stray.length === 0,
  bypassStray[0] ?? 'لم يُلتقط!')
// ⟲-٥ وقصّ العرض المشروع (سطر أسماء اليوم) **لا** يُسقط شيئًا — وإلا فالحارس يصرخ بلا سبب.
check('⟲ وقصّ العرض المشروع لا يُسقط الحارس',
  /planDay\.exercises\.slice\(0, 4\)/.test(view) && stray.length === 0)
// ⟲-٦ وعودة السبب التلقائي («أسبوعك الأول») تُلتقط — فلا يعود الاقتطاع الصامت
//     من باب النصّ بعد أن أُغلق من باب المنطق.
check('⟲ عودة سبب اقتطاع تلقائي تُلتقط باسمها',
  /'firstWeek'/.test(`${view}\n  reason: 'firstWeek',`) && !/'firstWeek'/.test(view))
// ⟲-٥ `easyExerciseCount` نفسها محروسة: النسبة تعمل فوق الأرضية.
check('⟲ الأرضية لا تبتلع النسبة — ما فوقها يتبعها',
  easyExerciseCount(12, 60, 30) === 6 && easyExerciseCount(12, 60, 5) === EASY_MIN_EXERCISES)

console.log('\n⑥ علم «الأخفّ» يُكتب بهوية قارئه — [WORKOUT-CLOSURE-001]')
/**
 * ═══ العطل المغلق ═══
 * الكاتب (`TodayV2`: زرّ «ابدأ بنسخة أخفّ») كان يستدعي `enableEasyToday()` بلا
 * هوية، فيحلّ المالك عبر `getLastUser()`؛ والقارئ (`WorkoutView`:
 * `isEasyToday(userId)`) يحلّه من سياق المصادقة الحيّ. خوارزميّتا حلّ لهوية
 * واحدة = صنف «أحيانًا» بعينه: علمٌ يُكتب تحت مفتاح ويُقرأ تحت آخر.
 */
const todaySrc = __SOURCES__['src/views/TodayV2.tsx']
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ')
check('الكاتب يمرّر هوية صريحة: `enableEasyToday(uid)`',
  /enableEasyToday\(uid\)/.test(todaySrc) && !/enableEasyToday\(\)/.test(todaySrc))
check('والقارئ يقرأ بنفس مصدر الهوية: `isEasyToday(userId)`',
  /isEasyToday\(userId\)/.test(view))
// وظيفيًا فوق كعب التخزين: الهوية تعزل، والكتابة بلا هوية لا تصل صاحب الحساب.
{
  clearEasyToday('user-a')
  clearEasyToday(null)
  enableEasyToday('user-a')
  check('الكتابة بهوية تصل قارئها ولا تتسرّب للضيف',
    isEasyToday('user-a') && !isEasyToday(null))
  clearEasyToday('user-a')
  // ⟲ صنف العطل حقيقي لا نظريًا: الكتابة بلا هوية (لا مستخدم أخير ⇒ ضيف)
  //    لا يراها قارئ الحساب — وهو بالضبط ما كان يقع في الشاشة.
  enableEasyToday(undefined)
  check('⟲ الكتابة بلا هوية تضلّ عن قارئ الحساب — فالفحص البنيوي أعلاه ليس ترفًا',
    !isEasyToday('user-a') && isEasyToday(null))
  clearEasyToday(null)
}
// ⟲ عودة الاستدعاء العاري إلى الشاشة تُلتقط بالنمط نفسه.
check('⟲ عودة `enableEasyToday()` العارية تُلتقط باسمها',
  /enableEasyToday\(\)/.test(`${todaySrc}\n onStartEasy={() => { enableEasyToday(); onNavigate('workout') }}`)
  && !/enableEasyToday\(\)/.test(todaySrc))

console.log('\n⑦ بوّابة شكل الخطة عند القراءة — اليوم المبتور لا يعبر')
/**
 * ═══ الثغرة المغلقة ═══
 * `workoutPlanShapeOk` كان يفحص أن الأيام كائنات ولا يفحص `exercises` — فيوم
 * فقدَ مصفوفته (كتابة قديمة/تلف) كان يعبر بوّابة التلف ثم **يُفجّر** الشاشة
 * (`day.exercises.length` على undefined) أو يصل بعدد كاذب. الآن: سجلّ تالف
 * يُعلن تلفه ويُستبدل بالافتراضي **الموسوم** — تدهور معلَن لا انهيار صامت.
 */
{
  const KEY = 'qimmah:customization:v1'
  const healthyDay = {
    id: 'd1', nameAr: 'اليوم 1', nameEn: 'Day 1',
    exercises: Array.from({ length: 9 }, (_, i) => ({ id: `d1-x${i}`, exerciseId: `x${i}`, order: i, sets: 3, reps: '8', restSec: 90 })),
  }
  const writeCz = (plan: unknown) => window.localStorage.setItem(KEY, JSON.stringify({ workoutPlan: plan }))

  writeCz({ templateId: 'tpl', days: [healthyDay] })
  const healthy = readCustomization()
  check('خطة سليمة (٩ تمارين) تعبر كاملةً',
    healthy.state === 'saved' && healthy.customization.workoutPlan.days[0]?.exercises.length === 9,
    `state=${healthy.state}`)

  writeCz({ templateId: 'tpl', days: [{ id: 'd1', nameAr: 'اليوم 1', nameEn: 'Day 1' }] })
  const truncated = readCustomization()
  check('يوم بلا مصفوفة تمارين ⇒ تلف معلَن وافتراضي موسوم — لا عدد كاذب',
    truncated.state !== 'saved' && truncated.reason === 'shape' && truncated.customization.isDefault === true,
    `state=${truncated.state} reason=${truncated.reason}`)

  writeCz({ templateId: 'tpl', days: [{ ...healthyDay, exercises: 'boom' }] })
  check('و`exercises` بغير مصفوفة ⇒ نفس الحكم',
    readCustomization().state !== 'saved')

  // ⟲ الحارس غير مفرط الشدّ: اليوم الفارغ **شرعي** (تمرين فارغ بالتصميم).
  writeCz({ templateId: 'tpl', days: [{ ...healthyDay, exercises: [] }] })
  check('⟲ ويوم بمصفوفة فارغة شرعيّ يعبر — الحارس لا يصرخ بلا سبب',
    readCustomization().state === 'saved')

  // ⟲ إثبات أن الثغرة كانت حقيقية: منطق البوّابة القديم (كائنٌ فكفى) يبتلع
  //    اليوم المبتور الذي يرفضه الحكم الجديد أعلاه.
  const oldGate = (days: unknown[]) => days.every((d) => !!d && typeof d === 'object' && !Array.isArray(d))
  check('⟲ البوّابة القديمة كانت تبتلع اليوم المبتور — والجديدة ترفضه باسمه',
    oldGate([{ id: 'd1' }]) && truncated.state !== 'saved')

  window.localStorage.removeItem(KEY)
}

console.log('\n⑧ الاستئناف يعيد بناء اليوم كاملًا — اللقطة تحاشي لا سلطة')
/**
 * قانون المؤسس: إعادة التحميل في منتصف جلسة من ٩ تعيد **٩** بموضعها — لا جلسةً
 * من تمرين واحد ولا جلسة جديدة. السلطة وقت الاستئناف هي **يوم الخطة الحالي**
 * (`plan.days.find(dayId)`)، واللقطة المحفوظة تحاشي حالة الجولات فقط.
 */
check('إعادة البناء تمشي على يوم الخطة كاملًا لا على مفاتيح اللقطة',
  /day\.exercises\.forEach\(\(pe\)/.test(modeSrc) && /resume\?\.exercises\[pe\.id\]/.test(modeSrc)
  && !/Object\.keys\(resume\.exercises\)/.test(modeSrc))
check('والموضع المحفوظ يُحصر داخل حدود اليوم الحالي',
  /Math\.min\(resume\.current, Math\.max\(0, day\.exercises\.length - 1\)\)/.test(modeSrc))
// ⟲ إعادة بناء تُقصر الجلسة على مفاتيح اللقطة (تمرين نشط وحيد) تُلتقط باسمها.
check('⟲ إعادة بناء على مفاتيح اللقطة وحدها تُلتقط باسمها',
  /Object\.keys\(resume\.exercises\)/.test(`${modeSrc}\n Object.keys(resume.exercises).forEach((k) => {})`)
  && !/Object\.keys\(resume\.exercises\)/.test(modeSrc))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} سلامة الجلسة: ${pass} ناجحة · ${fails.length} فاشلة`)
if (fails.length > 0) {
  for (const f of fails) console.log(`   - ${f}`)
  process.exit(1)
}
