// إثبات وحدة لمحرّك الإشعارات المحلية — يغطّي الطبقة الخالصة فقط (schedule.ts + prefs.ts +
// copy.ts؛ لا Capacitor هنا، فلا حاجة لمحاكاته). يعمل فوق localStorage مُحاكى (banner في
// المُشغّل) ويتحكّم بالوقت عبر تمرير `now` صراحةً — بلا Date.now() حقيقي، حتمي بالكامل.

import {
  isWithinQuietHours,
  waterSlots,
  planNotifications,
  nextOccurrence,
  allKinds,
} from '@/lib/notifications/schedule'
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  clearNotificationPrefs,
  notificationPrefsKey,
} from '@/lib/notifications/prefs'
import type { NotificationPrefs, PlanWeek } from '@/lib/notifications/types'

let pass = 0
let fail = 0
function check(label: string, cond: boolean): void {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

function fullPrefs(over: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    masterEnabled: true,
    workoutDay: { enabled: true, time: '18:00' },
    restDay: { enabled: true, time: '10:00' },
    water: { enabled: true, cadenceHours: 2 },
    weeklyBrief: { enabled: true, weekday: 0, time: '19:00' },
    supplements: { enabled: true, time: '09:00' },
    ...over,
  }
}

// أسبوع تجريبي: تمرين كل يوم عدا الخميس/الجمعة (راحة) — واقعي لا وهمي.
const SAMPLE_PLAN_WEEK: PlanWeek = [
  { weekday: 0, isRestDay: false, title: 'دفع' },
  { weekday: 1, isRestDay: false, title: 'سحب' },
  { weekday: 2, isRestDay: false, title: 'أرجل' },
  { weekday: 3, isRestDay: false, title: 'علوي' },
  { weekday: 4, isRestDay: true, title: 'راحة نشِطة' },
  { weekday: 5, isRestDay: true, title: 'راحة' },
  { weekday: 6, isRestDay: false, title: 'كارديو' },
]

console.log('① نافذة الهدوء — عادية وملتفّة عبر منتصف الليل')
{
  const normal = { start: '08:00', end: '21:00' }
  check('داخل النافذة العادية', isWithinQuietHours(12, 0, normal) === true)
  check('قبل بداية النافذة', isWithinQuietHours(6, 0, normal) === false)
  check('عند نهاية النافذة بالضبط (حصري)', isWithinQuietHours(21, 0, normal) === false)
  check('عند بداية النافذة بالضبط (شامل)', isWithinQuietHours(8, 0, normal) === true)

  const wrapped = { start: '22:00', end: '06:00' } // ملتفّة عبر منتصف الليل
  check('ملتفّة: منتصف الليل داخلها', isWithinQuietHours(23, 30, wrapped) === true)
  check('ملتفّة: الفجر المبكر داخلها', isWithinQuietHours(3, 0, wrapped) === true)
  check('ملتفّة: الظهيرة خارجها', isWithinQuietHours(12, 0, wrapped) === false)
}

console.log('② فتحات تذكير الماء — معدّل × نافذة، بحدّ أقصى')
{
  const slots2h = waterSlots(2, { start: '08:00', end: '20:00' }) // 12 ساعة / 2 = 6 فتحات
  check('عدد الفتحات كل ساعتين ضمن 12 ساعة = 6', slots2h.length === 6)
  check('أول فتحة = بداية النافذة', slots2h[0].hour === 8 && slots2h[0].minute === 0)
  check('كل الفتحات داخل النافذة', slots2h.every((s) => isWithinQuietHours(s.hour, s.minute, { start: '08:00', end: '20:00' })))

  const slots1hLong = waterSlots(1, { start: '00:00', end: '00:00' }) // نافذة تغطي اليوم كله
  check('حدّ أقصى معقول للفتحات (لا يتجاوز 12)', slots1hLong.length <= 12)
}

console.log('③ خطة كاملة — تمرين/راحة من الأسبوع الحقيقي، لا أيام وهمية')
{
  const items = planNotifications(fullPrefs(), SAMPLE_PLAN_WEEK, ['واي بروتين'])
  const workoutItems = items.filter((i) => i.kind === 'workoutDay')
  const restItems = items.filter((i) => i.kind === 'restDay')
  check('4 أيام تمرين (weekday 0-3, 6) → 5 عناصر workoutDay', workoutItems.length === 5)
  check('يومان راحة (4, 5) → 2 عنصر restDay', restItems.length === 2)
  check('كل تمرين مقترن بعنوان اليوم الحقيقي', workoutItems.every((i) => i.body.includes('·')))
  check('لا تصادم بين أي معرّفين', new Set(items.map((i) => i.id)).size === items.length)

  console.log('  — المفتاح الرئيسي مطفأ → لا شيء يُجدوَل (حتى لو كل الأنواع مفعّلة) —')
  const masterOff = planNotifications(fullPrefs({ masterEnabled: false }), SAMPLE_PLAN_WEEK)
  check('masterEnabled=false → قائمة فارغة', masterOff.length === 0)

  console.log('  — لا خطة محفوظة بعد (planWeek=null) → لا workoutDay/restDay، الباقي يعمل —')
  const noPlan = planNotifications(fullPrefs(), null)
  check('بلا خطة: لا عناصر تمرين/راحة', noPlan.filter((i) => i.kind === 'workoutDay' || i.kind === 'restDay').length === 0)
  check('بلا خطة: الماء/الأسبوعي/المكمّلات ما زالوا يُجدوَلون', noPlan.some((i) => i.kind === 'water') && noPlan.some((i) => i.kind === 'weeklyBrief') && noPlan.some((i) => i.kind === 'supplements'))
}

console.log('④ إعادة الجدولة الحتمية (idempotent) — نفس التفضيلات ⇒ نفس المعرّفات بالضبط')
{
  const a = planNotifications(fullPrefs(), SAMPLE_PLAN_WEEK)
  const b = planNotifications(fullPrefs(), SAMPLE_PLAN_WEEK)
  const idsA = a.map((i) => i.id).sort((x, y) => x - y)
  const idsB = b.map((i) => i.id).sort((x, y) => x - y)
  check('معرّفات متطابقة تمامًا عبر استدعاءين', JSON.stringify(idsA) === JSON.stringify(idsB))

  // تعطيل نوع واحد لا يغيّر معرّفات الأنواع الأخرى (لا تراكم، لا إزاحة).
  const c = planNotifications(fullPrefs({ water: { enabled: false, cadenceHours: 2 } }), SAMPLE_PLAN_WEEK)
  const workoutIdsA = a.filter((i) => i.kind === 'workoutDay').map((i) => i.id).sort()
  const workoutIdsC = c.filter((i) => i.kind === 'workoutDay').map((i) => i.id).sort()
  check('تعطيل الماء لا يمسّ معرّفات workoutDay', JSON.stringify(workoutIdsA) === JSON.stringify(workoutIdsC))
  check('تعطيل الماء ⇒ لا عناصر ماء', c.filter((i) => i.kind === 'water').length === 0)
}

console.log('⑤ الحدوث القادم (nextOccurrence) — التفاف أسبوعي/يومي')
{
  // الآن: الأربعاء (weekday=3) الساعة 10:00. عنصر أسبوعي هدفه الأحد (0) الساعة 19:00.
  const now = new Date(2026, 6, 15, 10, 0, 0) // 2026-07-15 هو أربعاء فعليًا (يُتحقّق أدناه)
  check('صحّة بيانات الاختبار: 2026-07-15 أربعاء', now.getDay() === 3)

  const weeklyTarget = { id: 1, kind: 'weeklyBrief' as const, title: '', body: '', weekday: 0, hour: 19, minute: 0 }
  const next1 = nextOccurrence(weeklyTarget, now)
  check('الأحد بعد الأربعاء = +4 أيام', next1.getDate() === now.getDate() + 4)
  check('اليوم المستهدف صحيح (الأحد)', next1.getDay() === 0)

  // هدف اليوم نفسه لكن الوقت فات (8ص وقد صار الساعة 10) → يلتفّ لأسبوع كامل، لا اليوم.
  const todayPassed = { id: 2, kind: 'workoutDay' as const, title: '', body: '', weekday: 3, hour: 8, minute: 0 }
  const next2 = nextOccurrence(todayPassed, now)
  check('اليوم نفسه لكن الوقت فات ⇒ +7 أيام (الأسبوع القادم لا اليوم)', next2.getDate() === now.getDate() + 7)

  // هدف اليوم نفسه والوقت لم يأتِ بعد (14:00 والساعة الآن 10:00) → اليوم نفسه.
  const todayLater = { id: 3, kind: 'workoutDay' as const, title: '', body: '', weekday: 3, hour: 14, minute: 0 }
  const next3 = nextOccurrence(todayLater, now)
  check('اليوم نفسه والوقت لم يأتِ ⇒ نفس اليوم', next3.getDate() === now.getDate())

  // يومي (weekday=-1): الوقت فات اليوم ⇒ غدًا؛ الوقت لم يأتِ ⇒ اليوم.
  const dailyPassed = { id: 4, kind: 'water' as const, title: '', body: '', weekday: -1, hour: 8, minute: 0 }
  check('يومي والوقت فات ⇒ غدًا', nextOccurrence(dailyPassed, now).getDate() === now.getDate() + 1)
  const dailyLater = { id: 5, kind: 'water' as const, title: '', body: '', weekday: -1, hour: 18, minute: 0 }
  check('يومي والوقت لم يأتِ ⇒ اليوم', nextOccurrence(dailyLater, now).getDate() === now.getDate())
}

console.log('⑥ عزل الملاك (owner isolation) — حسابان مختلفان لا يتداخلان')
{
  const userA = 'user-aaaa'
  const userB = 'user-bbbb'
  check('مفتاحا التخزين مختلفان', notificationPrefsKey(userA) !== notificationPrefsKey(userB))

  saveNotificationPrefs(userA, fullPrefs({ workoutDay: { enabled: true, time: '06:00' } }))
  saveNotificationPrefs(userB, fullPrefs({ workoutDay: { enabled: false, time: '23:00' } }))

  const loadedA = loadNotificationPrefs(userA)
  const loadedB = loadNotificationPrefs(userB)
  check('تفضيلات A لم تتأثّر بـ B', loadedA.workoutDay.time === '06:00' && loadedA.workoutDay.enabled === true)
  check('تفضيلات B لم تتأثّر بـ A', loadedB.workoutDay.time === '23:00' && loadedB.workoutDay.enabled === false)

  // مسح حساب A فقط (يحاكي wipeUserData لحساب واحد) لا يمسّ B.
  clearNotificationPrefs(userA)
  check('مسح A يعيده للافتراضي', loadNotificationPrefs(userA).masterEnabled === DEFAULT_NOTIFICATION_PREFS.masterEnabled)
  check('مسح A لا يمسّ B', loadNotificationPrefs(userB).workoutDay.time === '23:00')
}

console.log('⑦ المسح يُلغي كل شيء (wipe-cancels-all) — الافتراضي بعد المسح لا يُجدوِل شيئًا')
{
  const uid = 'user-wipe-test'
  saveNotificationPrefs(uid, fullPrefs())
  check('قبل المسح: تُجدوَل عناصر', planNotifications(loadNotificationPrefs(uid), SAMPLE_PLAN_WEEK).length > 0)
  clearNotificationPrefs(uid)
  const afterWipe = loadNotificationPrefs(uid)
  check('بعد المسح: masterEnabled=false', afterWipe.masterEnabled === false)
  check('بعد المسح: لا شيء يُجدوَل', planNotifications(afterWipe, SAMPLE_PLAN_WEEK).length === 0)
}

console.log('⑧ رفض الإذن = عدم تفعيل حقيقي (denied-permission no-op)')
{
  // يحاكي سلوك NotificationsSettingsV2: عند رفض الإذن يبقى masterEnabled=false مهما كانت
  // حالة مفاتيح الأنواع الفرعية — القرار الحقيقي الوحيد الذي يهمّ هو المفتاح الرئيسي.
  const deniedState = fullPrefs({ masterEnabled: false }) // كل الأنواع enabled:true لكن الرئيسي مطفأ
  check('كل الأنواع الفرعية مفعّلة في هذا السيناريو', deniedState.workoutDay.enabled && deniedState.water.enabled && deniedState.supplements.enabled)
  check('لكن masterEnabled=false ⇒ لا جدولة فعلية إطلاقًا', planNotifications(deniedState, SAMPLE_PLAN_WEEK, ['أ']).length === 0)
}

console.log('⑨ تطهير التفضيلات المحفوظة (sanitize) — بيانات تالفة/ناقصة لا تُسقط النظام')
{
  const uid = 'user-corrupt-test'
  // نكتب JSON ناقصًا/فاسدًا مباشرة (يحاكي نسخة قديمة/تلفًا) عبر واجهة LocalStorage نفسها.
  ;(globalThis as unknown as { localStorage: Storage }).localStorage.setItem(
    notificationPrefsKey(uid),
    JSON.stringify({ masterEnabled: 'yes', water: { cadenceHours: 99 }, weeklyBrief: { weekday: 9, time: 'bad' } }),
  )
  const loaded = loadNotificationPrefs(uid)
  check('masterEnabled غير المنطقي يُحوَّل إلى boolean آمن', loaded.masterEnabled === true)
  check('cadenceHours خارج المدى يعود للافتراضي', loaded.water.cadenceHours === DEFAULT_NOTIFICATION_PREFS.water.cadenceHours)
  check('weekday خارج المدى يعود للافتراضي', loaded.weeklyBrief.weekday === DEFAULT_NOTIFICATION_PREFS.weeklyBrief.weekday)
  check('وقت غير صالح يعود للافتراضي', loaded.weeklyBrief.time === DEFAULT_NOTIFICATION_PREFS.weeklyBrief.time)
  check('لا رمي استثناء — القراءة اكتملت', true)
}

console.log('⑩ كل الأنواع موثّقة (allKinds) — لا نوع منسي في الاختبار')
{
  const kinds = allKinds()
  check('5 أنواع بالضبط', kinds.length === 5)
  check('يشمل كل الأنواع المطلوبة', ['workoutDay', 'restDay', 'water', 'weeklyBrief', 'supplements'].every((k) => kinds.includes(k as never)))
}

console.log('\n────────────────────────────────────────────')
if (fail === 0) {
  console.log(`✅ كل الفحوص نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail} فحصًا.`)
  const proc = (globalThis as { process?: { exitCode?: number } }).process
  if (proc) proc.exitCode = 1
}
