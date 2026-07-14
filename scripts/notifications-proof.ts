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

interface NativeHarness {
  permission: 'granted' | 'denied'
  cancels: number[][]
  schedules: Array<Array<{ id: number; title: string; body: string }>>
  requests: number
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
check('الجدول النهائي يستخدم لغة المالك الأحدث', native.schedules.at(-1)?.some((item) => item.title === 'Review your weekly brief') === true)
await cancelAllNotifications()
check('الإلغاء الصريح يمسح كل نطاقات قِمّة', native.cancels.at(-1)?.length === allNotificationIds().length)
native.permission = 'denied'
check('طلب الإذن الصريح يعكس الرفض', await requestNotificationPermission() === 'denied' && native.requests === 1)

console.log(`\n${'─'.repeat(48)}`)
if (fail === 0) console.log(`✅ كل فحوص محرّك الإشعارات نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
