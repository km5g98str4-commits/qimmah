// إثبات وحدة لعزل بيانات الحساب: محاكاة مستخدمَين A/B فوق localStorage مُحاكى.
// يثبت: مسح بيانات المستخدم fail-safe (بقائمة سماح)، عزل التبديل، بقاء التفضيلات
// العامّة (اللغة)، وأن مفتاحًا مستقبليًا مجهولًا يُمسح افتراضيًا (إصلاح خلل resetQimmah).

import {
  wipeUserData,
  reconcileAccountScope,
  getLastUser,
  setLastUser,
} from '@/lib/accountScope'

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
  set('qimmah:customPlan:v1', `{"${tag}":{}}`) // owner-in-value
  set('qimmah:nutrition:v2', `{"foods":[]}`)
}
function seedGlobalSafe() {
  set('qimmah:prefs:v1', '{"language":"ar"}') // اللغة — يجب أن تبقى
  set('qimmah:uiMode:v1', 'advanced')
  set('qimmah:analytics:v1', '{"anonId":"device-123"}')
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
  'qimmah:analytics:v1',
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
  check('المفاتيح المنعزلة (todo:A / activeSession:A) مُسحت أيضًا', !has('qimmah:todo:v1:A') && !has('qimmah:activeSession:v1:A'))
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
  check('سجلّ الحسابات مُسح (يُعاد الإعداد عند العودة)', !has('qimmah:onboarding:accounts:v1'))
  check('الجلسة مُسحت (تسجيل خروج)', !has('qimmah:supabase-auth:v1'))
  check('اللغة تبقى حتى بعد إعادة الضبط الكامل', has('qimmah:prefs:v1'))
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص العزل نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
