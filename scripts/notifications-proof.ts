import { setLastUser, wipeUserData } from '@/lib/accountScope'
import { notificationMessage } from '@/data/notificationCopy'
import {
  DEFAULT_NOTIFICATION_PREFS,
  allNotificationIds,
  cancelAllNotifications,
  isWithinQuietHours,
  loadNotificationPrefs,
  nextOccurrence,
  notificationPrefsKey,
  planNotifications,
  reconcileNotificationSchedule,
  requestNotificationPermission,
  sanitizeNotificationPrefs,
  saveNotificationPrefs,
  waterSlots,
  type NotificationPrefs,
  type PlanWeek,
} from '@/lib/notifications'

interface DeliveredItem { id: number; title: string; body: string }

interface NativeHarness {
  permission: 'granted' | 'denied'
  cancels: number[][]
  schedules: Array<Array<{ id: number; title: string; body: string }>>
  requests: number
  /** [CTO-72] البند ٦ — ما رنّ فعلًا وجلس في مركز الإشعارات/شاشة القفل. */
  delivered: DeliveredItem[]
  removedDelivered: Array<number[] | 'ALL'>
}

const native = (globalThis as typeof globalThis & { __notificationHarness: NativeHarness }).__notificationHarness
let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ ${label}`)
  }
}

function enabledPrefs(overrides: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return sanitizeNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, masterEnabled: true, ...overrides })
}

console.log('\n① التفضيلات المملوكة والهجرة')
localStorage.clear()
const a = 'owner-a'
const b = 'owner-b'
check('المفتاح يحمل المالك', notificationPrefsKey(a).endsWith(`:${a}`))
saveNotificationPrefs(a, enabledPrefs({ water: { enabled: true, cadenceHours: 3 } }))
check('A يقرأ تفضيله', loadNotificationPrefs(a).water.enabled && loadNotificationPrefs(a).water.cadenceHours === 3)
check('B لا يرى تفضيل A', !loadNotificationPrefs(b).masterEnabled && !loadNotificationPrefs(b).water.enabled)
saveNotificationPrefs(b, enabledPrefs())
wipeUserData(a)
check('مسح بيانات المالك يزيل كل مفاتيح التذكير', localStorage.getItem(notificationPrefsKey(a)) === null && localStorage.getItem(notificationPrefsKey(b)) === null)
localStorage.setItem('qimmah:reminders:v1', JSON.stringify({ trainingEnabled: true, trainingTime: '17:30' }))
const migrated = loadNotificationPrefs('legacy-owner')
check('الهجرة تنقل تذكير التمرين للمالك مرة واحدة', migrated.masterEnabled && migrated.workoutDay.time === '17:30')
check('المفتاح العام القديم يُحذف بعد الهجرة', localStorage.getItem('qimmah:reminders:v1') === null)
const malformed = sanitizeNotificationPrefs({ masterEnabled: true, quietHours: { start: '99:99', end: 'x' }, water: { enabled: true, cadenceHours: 99 } })
check('المدخل التالف يعود لأوقات وحدود آمنة', malformed.quietHours.start === '21:00' && malformed.water.cadenceHours === 2)

console.log('\n② ساعات الهدوء والجدولة')
const quiet = { start: '21:00', end: '08:00' }
check('23:00 داخل الهدوء الملتف', isWithinQuietHours(23, 0, quiet))
check('07:59 داخل الهدوء الملتف', isWithinQuietHours(7, 59, quiet))
check('12:00 خارج الهدوء', !isWithinQuietHours(12, 0, quiet))
const slots = waterSlots(3, quiet)
check('فتحات الماء تبدأ 08:00', slots[0]?.hour === 8 && slots[0]?.minute === 0)
check('كل فتحات الماء خارج الهدوء', slots.every((slot) => !isWithinQuietHours(slot.hour, slot.minute, quiet)))
check('الهدوء طوال اليوم يمنع الماء', waterSlots(2, { start: '08:00', end: '08:00' }).length === 0)

const week: PlanWeek = [
  { weekday: 0, isRestDay: false, title: 'دفع' },
  { weekday: 1, isRestDay: true, title: 'راحة' },
]
const planned = planNotifications(enabledPrefs({
  workoutDay: { enabled: true, time: '18:00' },
  restDay: { enabled: true, time: '10:00' },
  water: { enabled: true, cadenceHours: 4 },
  weeklyBrief: { enabled: true, weekday: 0, time: '19:00' },
  supplements: { enabled: true, time: '09:00' },
}), week, 'ar')
check('يخطط الأنواع الخمسة', ['workoutDay', 'restDay', 'water', 'weeklyBrief', 'supplements'].every((kind) => planned.some((item) => item.kind === kind)))
check('كل المعرّفات فريدة', new Set(planned.map((item) => item.id)).size === planned.length)
check('لا موعد داخل الهدوء', planned.every((item) => !isWithinQuietHours(item.hour, item.minute, quiet)))
check('تعطيل المفتاح الرئيسي ينتج صفرًا', planNotifications({ ...enabledPrefs(), masterEnabled: false }, week, 'ar').length === 0)

// [CTO-70] البند ٢ · م٢ — إشعار يوم التمرين يحمل **اسم اليوم الحقيقي بلا مدة**.
// كان `planWeek` يحمل العنوان ولا يصل إلى النصّ أبدًا، فيسقط كل إشعار تمرين
// إلى النصّ العام رغم توفّر الاسم. هذه الفحوص تقفل الفجوة في الاتجاهين.
const workoutItem = planned.find((item) => item.kind === 'workoutDay')!
check('م٢: إشعار التمرين يحمل اسم يوم الخطة الحقيقي', workoutItem.body.includes('دفع'))
check('م٢: ولا يحمل أي مدة مخترعة (لا «٤٥» ولا رقم دقائق)', !/\d+\s*(دقيقة|min)/.test(workoutItem.body) && !/45|٤٥/.test(workoutItem.body))
// تأكيد مضادّ (§4.2): بلا عنوان في الخطة نعود للنصّ العام ولا نخترع اسمًا.
const untitled = planNotifications(enabledPrefs({ workoutDay: { enabled: true, time: '18:00' } }), [{ weekday: 0, isRestDay: false, title: null }], 'ar')
check('م٢: بلا عنوان يوم يعود النصّ العام ولا يُخترع اسم', untitled.find((i) => i.kind === 'workoutDay')?.body === 'خطتك جاهزة — افتحها وابدأ.')
check('م٢: الإنجليزية كذلك تحمل الاسم الحقيقي', planNotifications(enabledPrefs({ workoutDay: { enabled: true, time: '18:00' } }), week, 'en').find((i) => i.kind === 'workoutDay')?.body.includes('دفع') === true)
const skipped = planNotifications(enabledPrefs({ workoutDay: { enabled: true, time: '23:00' } }), week, 'ar')
check('وقت تمرين داخل الهدوء لا يُجدول', !skipped.some((item) => item.kind === 'workoutDay'))
const daily = planned.find((item) => item.kind === 'supplements')!
check('الموعد اليومي الفائت ينتقل للغد', nextOccurrence(daily, new Date(2026, 6, 14, 10, 0)).getDate() === 15)
const privateHealthCopy = notificationMessage('supplements', 'ar')
check('النص الصحي لا يدّعي جرعة', privateHealthCopy.body.includes('تعليمات مختصك'))
check('النص الصحي لا يكشف أسماء على شاشة القفل', !privateHealthCopy.body.includes('دواء') && privateHealthCopy.body.includes('داخل التطبيق'))

console.log('\n③ حارس المالك والاستعادة والجسر الأصلي')
localStorage.clear()
native.permission = 'granted'
native.cancels.length = 0
native.schedules.length = 0
native.requests = 0
setLastUser(a)
saveNotificationPrefs(a, enabledPrefs({ weeklyBrief: { enabled: true, weekday: 0, time: '19:00' } }))
const scheduled = await reconcileNotificationSchedule(a, false, 'ar')
check('المالك المطابق يُجدول', scheduled === 'scheduled' && native.schedules.length === 1)
check('المصالحة لا تطلب الإذن تلقائيًا', native.requests === 0)
check('الإلغاء يشمل معرّف النظام القديم 1001', native.cancels.some((ids) => ids.includes(1001)))
const beforeMismatch = native.schedules.length
const mismatch = await reconcileNotificationSchedule(b, false, 'ar')
check('مالك مختلف يُرفض بعد الإلغاء', mismatch === 'inactive' && native.schedules.length === beforeMismatch)
const recovery = await reconcileNotificationSchedule(a, true, 'ar')
check('PASSWORD_RECOVERY لا يجدول', recovery === 'inactive' && native.schedules.length === beforeMismatch)
setLastUser(a)
saveNotificationPrefs(a, enabledPrefs())
saveNotificationPrefs(b, enabledPrefs())
const beforeRace = native.schedules.length
const staleOwnerRun = reconcileNotificationSchedule(a, false, 'ar')
setLastUser(b)
const latestOwnerRun = reconcileNotificationSchedule(b, false, 'en')
await Promise.all([staleOwnerRun, latestOwnerRun])
check('سباق تبديل المالك ينتهي بجدول واحد للمالك الأحدث', native.schedules.length === beforeRace + 1)
check('الجدول النهائي يستخدم لغة المالك الأحدث', native.schedules.at(-1)?.some((item) => item.title === 'Check your weekly recap') === true)
await cancelAllNotifications()
check('الإلغاء الصريح يمسح كل نطاقات قِمّة', native.cancels.at(-1)?.length === allNotificationIds().length)
native.permission = 'denied'
check('طلب الإذن الصريح يعكس الرفض', await requestNotificationPermission() === 'denied' && native.requests === 1)

console.log('\n④ [CTO-72] البند ٦ — لا بقايا حساب مُلغى على شاشة القفل')
{
  native.cancels.length = 0
  native.removedDelivered.length = 0
  // إشعاران **رنّا فعلًا**: أحدهما يحمل عنوان يوم خطة المستخدم، والآخر يُفصح أن
  // صاحب الجهاز يتابع أدوية. وإشعار غريب من خارج مدى قِمّة لا يخصّنا.
  const OURS_WORKOUT = allNotificationIds()[0]
  const OURS_SUPPLEMENTS = 3500
  native.delivered = [
    { id: OURS_WORKOUT, title: 'وقت تمرينك', body: 'دفع · صدر وكتف' },
    { id: OURS_SUPPLEMENTS, title: 'المكمّلات والأدوية', body: 'تذكير عام — التزم بتعليمات مختصك' },
    { id: 999_001, title: 'تطبيق آخر', body: 'ليس لقِمّة' },
  ]

  await cancelAllNotifications()

  const removed = native.removedDelivered.at(-1)
  check('التنظيف يشمل المُسلَّم لا المجدول وحده', Array.isArray(removed) && removed.length === 2)
  check('بقايا قِمّة على شاشة القفل زالت', !native.delivered.some((n) => n.id === OURS_WORKOUT || n.id === OURS_SUPPLEMENTS))
  // تأكيد مضادّ (§4.2): «امسح كل شيء» ليس تنظيفًا موصوفًا.
  check('ولا يمسح ما ليس لقِمّة (لا removeAllDelivered)', native.delivered.some((n) => n.id === 999_001) && removed !== 'ALL')

  // ولا يُطلق نداء حذف بلا داعٍ حين لا شيء مُسلَّمًا.
  native.removedDelivered.length = 0
  native.delivered = []
  await cancelAllNotifications()
  check('بلا إشعار مُسلَّم لا يُطلق نداء حذف', native.removedDelivered.length === 0)
}

console.log('\n⑤ [CTO-72] البند ٦ — السلاح الموضوع: الأسماء لا تصل الجدولة')
{
  // النصّ الحيّ عامّ عمدًا. والفحص هنا **على المخرجات** لا على القصد: نُشغّل
  // المخطِّط بكل الأنواع ونؤكّد أن لا اسم مكمّل/دواء يظهر في أي متن.
  const all = planNotifications(
    sanitizeNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFS,
      masterEnabled: true,
      supplements: { enabled: true, time: '09:00' },
      water: { enabled: true, cadenceHours: 3, time: '10:00' },
      weeklyBrief: { enabled: true, weekday: 0, time: '19:00' },
      workoutDay: { enabled: true, time: '06:00' },
      restDay: { enabled: true, time: '20:00' },
    } as NotificationPrefs),
    [{ weekday: 0, isRestDay: false, title: 'دفع' }],
    'ar',
  )
  const bodies = all.map((item) => `${item.title} ${item.body}`).join(' | ')
  check('لا اسم مكمّل في أي متن مجدول', !/كرياتين|أوميغا|بروتين واي|فيتامين د/.test(bodies))
  check('ولا صيغة «موعد: …» التي تسرد الأسماء', !/موعد: /.test(bodies))
}

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص محرّك الإشعارات نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
