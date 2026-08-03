// إثبات وحدة لعزل بيانات الحساب: محاكاة مستخدمَين A/B فوق localStorage مُحاكى.
// يثبت: مسح بيانات المستخدم fail-safe (بقائمة سماح)، عزل التبديل، بقاء التفضيلات
// العامّة (اللغة)، وأن مفتاحًا مستقبليًا مجهولًا يُمسح افتراضيًا (إصلاح خلل resetQimmah).

import {
  wipeUserData,
  reconcileAccountScope,
  getLastUser,
  setLastUser,
} from '@/lib/accountScope'
import {
  summaryKey,
  saveWorkoutSummary,
  loadWorkoutSummary,
  migrateLegacySummary,
} from '@/lib/workoutSummary'
import { setSyncFeatureEnabledForTests, setSyncRuntime, syncAllowedFor } from '@/lib/syncQueue'
import { setCloudSyncConsent } from '@/lib/syncConsent'
import { adoptionPendingFor, adoptPendingData } from '@/lib/dataOwnership'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}
const ls = globalThis.localStorage
const set = (k: string, v: string) => ls.setItem(k, v)
const has = (k: string) => ls.getItem(k) !== null
const clearAll = () => ls.clear()

// عيّنة تمثيلية من كل صنف
function seedUserData(tag: string) {
  set('qimmah:customization:v1', `{"name":"${tag}"}`)
  set('qimmah:onboarding:profile:v1', `{"who":"${tag}"}`)
  set('qimmah:history:workoutSessions:v1', `[{"u":"${tag}"}]`)
  set('qimmah:history:dailyLogs:v1', `{"${tag}":1}`)
  set('qimmah:achievements:v1', `{"prCount":3}`)
  set('qimmah:steps:v1', `{"2026-07-12":8000}`)
  set('qimmah:today:v1', `{"date":"x"}`)
  set(`qimmah:todo:v1:${tag}`, '{"items":[]}') // owner-scoped
  set(`qimmah:activeSession:v1:${tag}`, '{"v":1}') // owner-scoped
  set(`qimmah:workout-summary:v2:${tag}`, `{"title":"${tag}"}`) // owner-scoped (finding #7)
  set('qimmah:customPlan:v1', `{"${tag}":{}}`) // owner-in-value
  set('qimmah:nutrition:v2', `{"foods":[]}`)
  // [CTO-72] البند ٦ — عائلة v2 كاملة **بالاسم**: المسح بالبادئة يشملها بحكم
  // بنيته، لكن «يشملها بحكم البنية» ليس إثباتًا. تُزرع صراحةً فتُفحص صراحةً،
  // فلو عاد يومًا مسحٌ بقائمة تضمين ثابتة سقط الفحص **باسم المفتاح** لا بعمومية.
  set(`qimmah:active-workout:v2:${tag}`, `{"exIndex":0}`)
  set('qimmah:activeWorkout:v1', `{"${tag}":{"dayId":"d"}}`)
  set(`qimmah:notifications:v1:${tag}`, '{"masterEnabled":true,"supplements":{"enabled":true}}')
  set(`qimmah:restEndPending:v1:${tag}`, '{"endsAt":1}')
}

/** مفاتيح عائلة v2 وما يلحق بها — تُفحص بالاسم في ① و⑥. */
const V2_FAMILY_KEYS = (tag: string) => [
  'qimmah:nutrition:v2',
  `qimmah:workout-summary:v2:${tag}`,
  `qimmah:active-workout:v2:${tag}`,
  'qimmah:activeWorkout:v1',
  `qimmah:notifications:v1:${tag}`,
  `qimmah:restEndPending:v1:${tag}`,
]
function seedGlobalSafe() {
  set('qimmah:prefs:v1', '{"language":"ar"}') // اللغة — يجب أن تبقى
  set('qimmah:uiMode:v1', 'advanced')
  set('qimmah:off:cache:v1', '{"6281":{}}')
  set('qimmah:products:v1', '{"cat":[]}')
  set('qimmah:install-banner:dismissed', '1')
  set('qimmah:supabase-auth:v1', '{"currentSession":{}}') // الجلسة الحالية
  set('qimmah:onboarding:accounts:v1', '{"A":{"completedAt":"x"}}')
}
const USER_KEYS = [
  'qimmah:customization:v1',
  'qimmah:onboarding:profile:v1',
  'qimmah:history:workoutSessions:v1',
  'qimmah:history:dailyLogs:v1',
  'qimmah:achievements:v1',
  'qimmah:steps:v1',
  'qimmah:today:v1',
  'qimmah:customPlan:v1',
  'qimmah:nutrition:v2',
]
const SAFE_KEYS = [
  'qimmah:prefs:v1',
  'qimmah:uiMode:v1',
  'qimmah:off:cache:v1',
  'qimmah:products:v1',
  'qimmah:install-banner:dismissed',
  'qimmah:supabase-auth:v1',
  'qimmah:onboarding:accounts:v1',
]

console.log('\n① wipeUserData: يمسح بيانات المستخدم، يُبقي العامّ الآمن، لا يلمس غير قِمّة')
{
  clearAll()
  seedUserData('A')
  seedGlobalSafe()
  set('other-app:token', 'keep-me') // مفتاح خارج قِمّة
  wipeUserData()
  check('كل مفاتيح بيانات المستخدم مُسحت', USER_KEYS.every((k) => !has(k)))
  check('المفاتيح المنعزلة (todo:A / activeSession:A / workout-summary:A) مُسحت أيضًا', !has('qimmah:todo:v1:A') && !has('qimmah:activeSession:v1:A') && !has('qimmah:workout-summary:v2:A'))
  // [CTO-72] البند ٦ — عائلة v2 بالاسم، لا «يشملها المسح بالبادئة».
  for (const k of V2_FAMILY_KEYS('A')) check(`مفتاح v2 مُسح بالاسم: ${k}`, !has(k))
  check('كل مفاتيح السماح العامّة باقية', SAFE_KEYS.every((k) => has(k)))
  check('اللغة (prefs) باقية', ls.getItem('qimmah:prefs:v1') === '{"language":"ar"}')
  check('رمز الجلسة الحالي باقٍ (لا يُخرج المستخدم أثناء التبديل)', has('qimmah:supabase-auth:v1'))
  check('مفتاح تطبيق آخر لم يُمَس', ls.getItem('other-app:token') === 'keep-me')
}

console.log('\n② fail-safe: مفتاح بيانات مستقبلي مجهول يُمسح افتراضيًا (إصلاح خلل resetQimmah)')
{
  clearAll()
  set('qimmah:someFutureFeature:v9', '{"secret":"leak"}') // غير موجود في أي قائمة
  set('qimmah:prefs:v1', '{"language":"en"}')
  wipeUserData()
  check('المفتاح المستقبلي المجهول مُسح (لا يتسرّب عبر مفتاح منسي)', !has('qimmah:someFutureFeature:v9'))
  check('اللغة باقية', has('qimmah:prefs:v1'))
}

console.log('\n③ محاكاة مستخدمَين A→B: B لا يقرأ أي بقايا من A، واللغة تبقى')
{
  clearAll()
  // تشغيل أول: تبنّي A بلا مسح
  const r1 = reconcileAccountScope('A')
  check('تشغيل أول (lastUser غير مضبوط) → لا مسح', r1.wiped === false)
  check('lastUser = A', getLastUser() === 'A')
  seedUserData('A')
  set('qimmah:prefs:v1', '{"language":"ar"}')
  // نفس المستخدم (إعادة تحميل) → لا مسح، بيانات A سليمة
  const r2 = reconcileAccountScope('A')
  check('نفس الحساب (إعادة تحميل) → لا مسح', r2.wiped === false)
  check('بيانات A سليمة بعد إعادة التحميل', ls.getItem('qimmah:customization:v1') === '{"name":"A"}')
  // تسجيل دخول B (حساب مختلف) → مسح بقايا A قبل عرض بيانات B
  const r3 = reconcileAccountScope('B')
  check('تبديل إلى B → wiped = true', r3.wiped === true)
  check('lastUser = B', getLastUser() === 'B')
  check('B لا يستطيع قراءة تخصيص A (مُسح)', ls.getItem('qimmah:customization:v1') === null)
  check('B لا يرى سجلّ تمارين A', !has('qimmah:history:workoutSessions:v1'))
  check('B لا يرى todo/activeSession الخاصّين بـ A', !has('qimmah:todo:v1:A') && !has('qimmah:activeSession:v1:A'))
  check('اللغة (تفضيل الجهاز) نجت من التبديل', ls.getItem('qimmah:prefs:v1') === '{"language":"ar"}')
  check('جلسة B الحالية لم تُمَس أثناء المسح', true) // supabase-auth في قائمة السماح (مُثبت في ①)
}

console.log('\n④ تسجيل الخروج (محاكاة signOut): مسح + تثبيت ضيف')
{
  clearAll()
  reconcileAccountScope('A')
  seedUserData('A')
  set('qimmah:prefs:v1', '{"language":"ar"}')
  // ما يفعله signOut:
  wipeUserData()
  setLastUser(null)
  check('بيانات المستخدم مُسحت عند الخروج', USER_KEYS.every((k) => !has(k)))
  check('اللغة باقية بعد الخروج', has('qimmah:prefs:v1'))
  check('lastUser = ضيف (null)', getLastUser() === null)
}

console.log('\n⑤ الحارس: لا مسح بلا سبب (نفس الضيف عبر إعادة التحميل)')
{
  clearAll()
  setLastUser(null) // ضيف
  set('qimmah:prefs:v1', '{"language":"en"}')
  const r = reconcileAccountScope(null) // ضيف → ضيف
  check('ضيف → ضيف: لا مسح', r.wiped === false)
  check('التفضيلات باقية', has('qimmah:prefs:v1'))
}

console.log('\n⑥ حذف/إعادة ضبط كامل يتجاوز مسح التبديل (سجلّ الحسابات + الجلسة)')
{
  clearAll()
  seedUserData('A')
  seedGlobalSafe()
  // ما يفعله resetQimmah: wipeUserData + إزالة سجلّ الحسابات + الجلسة صراحةً
  wipeUserData()
  ls.removeItem('qimmah:onboarding:accounts:v1')
  ls.removeItem('qimmah:supabase-auth:v1')
  check('بيانات المستخدم مُسحت', USER_KEYS.every((k) => !has(k)))
  // [CTO-72] البند ٦ — إعادة الضبط الكاملة تمسح عائلة v2 كاملة كذلك: لا بقايا
  // جلسة ولا تفضيلات إشعارات (وهي مصدر ما يُرسَل لشاشة القفل) لمستخدم سابق.
  for (const k of V2_FAMILY_KEYS('A')) check(`إعادة الضبط تمسح: ${k}`, !has(k))
  check('ولا يبقى أي مفتاح تفضيلات إشعارات لأي مالك', !Object.keys(globalThis.localStorage).some((k) => k.startsWith('qimmah:notifications:')))
  check('سجلّ الحسابات مُسح (يُعاد الإعداد عند العودة)', !has('qimmah:onboarding:accounts:v1'))
  check('الجلسة مُسحت (تسجيل خروج)', !has('qimmah:supabase-auth:v1'))
  check('اللغة تبقى حتى بعد إعادة الضبط الكامل', has('qimmah:prefs:v1'))
}

console.log('\n⑦ ملخّص التمرين معزول بالمالك + هجرة المفتاح المسطّح القديم (finding #7)')
{
  // عزل مستخدمَين: A وB لهما مفتاح مستقل، ولا يقرأ أحدهما ملخّص الآخر
  clearAll()
  saveWorkoutSummary('A', { date: '2026-07-16', title: 'A-workout', totalSets: 12, volume: 3000, durationMin: 40 })
  saveWorkoutSummary('B', { date: '2026-07-16', title: 'B-workout', totalSets: 8, volume: 2000, durationMin: 30 })
  check('مفتاح ملخّص A مُنعزل عن مفتاح B', summaryKey('A') !== summaryKey('B') && summaryKey('A') === 'qimmah:workout-summary:v2:A')
  check('A يقرأ ملخّصه فقط', loadWorkoutSummary('A')?.title === 'A-workout')
  check('B يرى ملخّصه هو لا ملخّص A', loadWorkoutSummary('B')?.title === 'B-workout')

  // مسح التبديل: A→B يمسح ملخّص A فلا يتسرّب إلى B
  clearAll()
  reconcileAccountScope('A')
  saveWorkoutSummary('A', { date: '2026-07-16', title: 'A-workout', totalSets: 12, volume: 3000, durationMin: 40 })
  reconcileAccountScope('B')
  check('ملخّص A مُسح عند التبديل إلى B', loadWorkoutSummary('A') === null)
  check('B يبدأ بلا ملخّص (لا تسرّب عبر الجهاز)', loadWorkoutSummary('B') === null)

  // الهجرة: المفتاح المسطّح القديم يُنقل لمالكه فقط عند تطابق آخر مالك
  clearAll()
  setLastUser('A')
  ls.setItem('qimmah:workout-summary:v2', '{"date":"2026-07-10","title":"legacy-A","totalSets":10,"volume":2500,"durationMin":35}')
  migrateLegacySummary('A')
  check('الهجرة تنسب القيمة المسطّحة لمالكها (lastUser=A)', loadWorkoutSummary('A')?.title === 'legacy-A')
  check('المفتاح المسطّح أُزيل بعد الهجرة', ls.getItem('qimmah:workout-summary:v2') === null)

  // الغموض: آخر مالك مختلف → لا تُنسب، وتُهمَل، والمفتاح المسطّح يُزال دائمًا
  clearAll()
  setLastUser('A')
  ls.setItem('qimmah:workout-summary:v2', '{"date":"2026-07-10","title":"legacy-A","totalSets":10,"volume":2500,"durationMin":35}')
  migrateLegacySummary('B') // B ≠ lastUser(A) → غامض
  check('القيمة الغامضة لا تُنسب لمالك مختلف', loadWorkoutSummary('B') === null)
  check('المفتاح المسطّح الغامض أُزيل (لا يتسرّب لاحقًا)', ls.getItem('qimmah:workout-summary:v2') === null)

  // الغموض: سياق ضيف (بلا مالك) → تُهمَل والمفتاح يُزال
  clearAll()
  setLastUser('A')
  ls.setItem('qimmah:workout-summary:v2', '{"date":"2026-07-10","title":"legacy-A","totalSets":10,"volume":2500,"durationMin":35}')
  migrateLegacySummary(null) // ضيف → غامض
  check('سياق الضيف لا يستولي على قيمة مسطّحة', loadWorkoutSummary(null) === null)
  check('المفتاح المسطّح أُزيل في سياق الضيف أيضًا', ls.getItem('qimmah:workout-summary:v2') === null)
}

// ═══════════ (ج-٢-أ) شروط قبول عزل الحسابات — ترقية سيناريوهات المِسبار ═══════════
//
// ثلاثة سيناريوهات قيست بمسبار يدوي ثم رُقّيت هنا لتصير دائمة. سيناريو ثالث
// (فقد الجلسة بلا تسجيل خروج ⇒ الضيف يقرأ بيانات الحساب) **أحمر اليوم** ولا يدخل
// بوابة خضراء — محفوظ في فرع ج-٢-ب حتى ينقلب مع علم `sessionResolved`، وموثّق
// في «اكتشاف مفتوح» أدناه.
{
  console.log('\n⑥ (ج-٢-أ) ذهاب وعودة A → B → A')
  clearAll()
  setLastUser(null)
  reconcileAccountScope('A')
  seedUserData('A')
  reconcileAccountScope('B')
  check('التبديل إلى B مسح بيانات A', !has('qimmah:history:workoutSessions:v1'))
  seedUserData('B')
  const back = reconcileAccountScope('A')
  check('العودة إلى A تمسح بقايا B (wiped)', back.wiped === true)
  check('A لا يرى سجلّ B بعد العودة', !has('qimmah:history:workoutSessions:v1'))
  check('A لا يرى تخصيص B بعد العودة', !has('qimmah:customization:v1'))
  check('lastUser عاد إلى A', getLastUser() === 'A')
  // التأكيد المضادّ (§4.2): المسح لم يبتلع تفضيل الجهاز في الذهاب ولا في العودة.
  seedGlobalSafe()
  reconcileAccountScope('B')
  check('اللغة نجت من دورة الذهاب والعودة كاملة', has('qimmah:prefs:v1'))
}

{
  console.log('\n⑦ (ج-٢-أ) بيانات الضيف غير المنسوبة لا تُرفع أبدًا')
  // الضمانة السحابية المستقلّة عن المسح: بيانات بلا مالك تحت حساب حقيقي تدخل
  // «تعليق تبنٍّ» فلا تُرفع حتى قرار صريح. هذه هي الحماية التي **تعمل اليوم**
  // حتى في السيناريو المتسرّب — فالتسرّب قراءةٌ محلية لا رفعٌ سحابي.
  clearAll()
  setSyncFeatureEnabledForTests(true)
  setCloudSyncConsent('A', true) // موافقة ج-١ ممنوحة — لنعزل بوابة الملكية وحدها
  set('qimmah:history:workoutSessions:v1', '[{"u":"ضيف"}]') // بيانات ضيف بلا ختم
  setLastUser(null)
  reconcileAccountScope('A')
  setSyncRuntime('A', false)
  check('بيانات ضيف تحت حساب حقيقي ⇒ تعليق تبنٍّ', adoptionPendingFor() === 'A')
  check('والرفع محجوب ما دام التعليق قائمًا', syncAllowedFor('A') === false)
  // التأكيد المضادّ (§4.2): التعليق ليس حجبًا دائمًا — القرار الصريح يفتحه.
  adoptPendingData('A')
  check('التبنّي الصريح وحده يفتح الرفع', syncAllowedFor('A') === true)
  setCloudSyncConsent('A', false)
  setSyncFeatureEnabledForTests(undefined)
}

{
  console.log('\n⑧ (ج-٢-أ) التأكيدات المضادّة لقائمة السماح العامّة')
  // §4.2: كل قائمة استثناء تُحرَس بتأكيد يثبت أنها لم تصر قاعدة. قائمة
  // GLOBAL_SAFE_KEYS استثناء من المسح — فيجب أن يثبت أن جارًا لها يُمسح.
  clearAll()
  set('qimmah:prefs:v1', '{"language":"ar"}') // في القائمة
  set('qimmah:prefs:v2', '{"language":"ar"}') // ليس فيها — جار بحرف واحد
  // [CTO-71] البند ١ — كان الزوج الثاني هنا `qimmah:analytics:v1` (المُعلَن) مقابل
  // `qimmah:analytics:events:v1` (غير المُعلَن). حُذفت طبقة التحليلات ومفاتيحها من
  // قائمة السماح، فلم يعد المفتاح مُعلَنًا. أُبدل بزوج حيّ يحفظ **مقصد** الفحص:
  // مفتاح جهاز مُعلَن يبقى، وجارٌ له غير مُعلَن يُمسح — القائمة لم تصر قاعدة.
  set('qimmah:uiMode:v1', 'advanced') // في القائمة
  set('qimmah:uiMode:events:v1', '[]') // ليس فيها
  wipeUserData()
  check('«qimmah:prefs:v1» المُعلَن بقي', has('qimmah:prefs:v1'))
  check('و«qimmah:prefs:v2» — جاره بحرف — مُسح (القائمة لم تصر قاعدة)', !has('qimmah:prefs:v2'))
  check('«qimmah:uiMode:v1» المُعلَن بقي', has('qimmah:uiMode:v1'))
  check('و«qimmah:uiMode:events:v1» غير المُعلَن مُسح', !has('qimmah:uiMode:events:v1'))
  // وتأكيد الحذف نفسه: مفتاح التحليلات المحذوف لم يعد ينجو من المسح.
  set('qimmah:analytics:v1', '{"id":"x"}')
  wipeUserData()
  check('«qimmah:analytics:v1» بعد حذف طبقته لم يعد مستثنى — يُمسح', !has('qimmah:analytics:v1'))
}

// ⚠️ اكتشاف مفتوح مسمّى (ج-٢-ب) — لا يدخل هذه البوابة لأنه أحمر:
//    فقدُ جلسة حساب حقيقي **بلا تسجيل خروج** (انتهاء رمز · إعادة إقلاع · مسح iOS)
//    يترك بيانات الحساب مقروءةً لسياق الضيف: reconcileAccountScope(null) لا يمسح
//    عمدًا، لأن null قد يكون وميضًا عابرًا.
//    ولا يُصلَح بـ`auth.loading === false` — فهي ترتفع أيضًا عبر failsafe بعد 8 ثوانٍ
//    (authContext.tsx:170) وعبر catch، أي أنها تعني «يئسنا» أحيانًا لا «حُسمت».
//    العلاج المعتمد: علم `sessionResolved` من حارة B، ثم **حجر لا مسح**
//    (quarantineUnscopedUserData) — فتُغلق القراءة بلا إتلاف بيانات صاحبها.

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص العزل نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
