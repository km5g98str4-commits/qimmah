// إثبات منظومة التتبّع المحلية — النصف التنفيذي ([CTO-68] البند ٦).
// يُشغَّل عبر scripts/run-analytics-proof.mjs فوق localStorage مُحاكى + مصائد شبكة.

import {
  trackLocal,
  readEvents,
  clearEvents,
  appendEvent,
  makeEvent,
  sanitizeProps,
  trackingEventsKey,
  currentTrackingOwner,
  TRACKED_EVENTS,
  AWAITING_SURFACE,
  MAX_EVENTS,
  MAX_PROP_STRING,
  MAX_SERIALIZED_BYTES,
  TRACKING_EVENTS_KEY_BASE,
  type TrackedEventName,
} from '@/lib/tracking'
import { trackingDayStamp, dayGap, recordDayOpen, hasEventToday } from '@/lib/tracking/signals'
import { wipeUserData, setLastUser } from '@/lib/accountScope'
import { setSyncRuntime } from '@/lib/syncQueue'
import { buildExportBundle } from '@/lib/portability/exporter'
import { STORE_BY_ID } from '@/lib/portability/registry'
import { getDayStamp } from '@/lib/today'

let pass = 0
const check = (label: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const netCalls = () => (globalThis as unknown as { __netCalls: string[] }).__netCalls
const resetStore = () => {
  const ls = globalThis.localStorage
  for (const k of Object.keys({ ...(ls as unknown as Record<string, string>) })) ls.removeItem(k)
  ls.clear()
}

// خصائص صالحة لكل حدث — تغطّي العقد المطبوع كاملًا.
const SAMPLE_PROPS: Record<TrackedEventName, Record<string, string | number | boolean>> = {
  setup_started: { resumed: false },
  setup_step_reached: { step: 'body' },
  setup_completed: {},
  entry_choice_made: { choice: 'guest' },
  first_win_completed: { kind: 'warmup', partOfDay: 'day' },
  notification_permission_decided: { decision: 'granted' },
  next_day_opened: { gapDays: 1 },
  food_search_no_result: { query: 'مندي لحم' },
  meal_entry_logged: { slot: 'lunch' },
  workout_session_started: { exercises: 6 },
  workout_session_completed: { exercises: 6, sets: 18 },
  workout_session_abandoned: { at: 'session', completedSets: 3 },
  return_after_missed_day: { daysAway: 4 },
  day7_summary_reached: { dayIndex: 7 },
  reminders_screen_opened: {},
}

console.log('\n① نموذج الحدث والسجلّ الموحّد')
resetStore()
setLastUser(null)
check('السجلّ يحمل خمسة عشر حدثًا بالضبط', TRACKED_EVENTS.length === 15)
check('كل الأسماء snake_case إنجليزية خالصة', TRACKED_EVENTS.every((n) => /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(n)))
check('لا تكرار في السجلّ', new Set(TRACKED_EVENTS).size === TRACKED_EVENTS.length)
// [CTO-71] البند ١: الطبقة القديمة القادرة على الإرسال حُذفت، فحارس التقاطع
// لم يعد له طرف ثانٍ. بديله أقوى — غياب الطبقة نفسه (يُفحص مصدريًا في المُشغّل).

for (const name of TRACKED_EVENTS) {
  trackLocal(name as never, SAMPLE_PROPS[name] as never)
}
const stored = readEvents()
check('كل حدث من الخمسة عشر يُكتب ويُقرأ من المخزن', stored.length === 15 && TRACKED_EVENTS.every((n) => stored.some((e) => e.name === n)))
check('نموذج الحدث موحّد: معرّف + طابع زمني + اسم + خصائص', stored.every((e) => typeof e.id === 'string' && e.id.length === 8 && typeof e.ts === 'number' && e.ts > 0 && typeof e.name === 'string' && !!e.props))
check('المعرّفات غير متطابقة (تمييز الأحداث داخل نفس الميلي ثانية)', new Set(stored.map((e) => e.id)).size > 1)
check('لا معرّف مالك ولا معرّف جهاز داخل أي حدث', stored.every((e) => !('anonId' in e) && !('uid' in e) && !('deviceId' in e)))

console.log('\n② المخزن الدوّار والسقف الصريح')
resetStore()
for (let i = 0; i < MAX_EVENTS + 200; i += 1) {
  appendEvent(makeEvent('meal_entry_logged', { slot: `s${i}` }, 1_700_000_000_000 + i))
}
const rotated = readEvents()
check(`الطول يقف عند السقف (${MAX_EVENTS})`, rotated.length === MAX_EVENTS)
check('الأقدم يسقط أولًا (FIFO لا LIFO)', rotated[0].props.slot === 's200' && rotated[rotated.length - 1].props.slot === `s${MAX_EVENTS + 199}`)
// قياس فعلي لأثقل حالة ممكنة — لا اكتفاء بتقدير في تعليق.
resetStore()
const heavyQuery = 'ط'.repeat(MAX_PROP_STRING * 2)
for (let i = 0; i < MAX_EVENTS; i += 1) appendEvent(makeEvent('food_search_no_result', { query: heavyQuery }, 1_700_000_000_000 + i))
const serialized = globalThis.localStorage.getItem(trackingEventsKey(null)) ?? ''
const bytes = Buffer.byteLength(serialized, 'utf8')
check(`مخزن ممتلئ بأثقل حدث ≤ السقف المعلَن (${Math.round(bytes / 1024)}KB ≤ ${MAX_SERIALIZED_BYTES / 1024}KB)`, bytes <= MAX_SERIALIZED_BYTES)
check('النص الحرّ مقصوص عند الحدّ (لا نصّ بلا سقف في المخزن)', readEvents().every((e) => String(e.props.query).length === MAX_PROP_STRING))
check('القصّ يعمل على مستوى الخصائص نفسها', sanitizeProps({ q: 'x'.repeat(500) }).q === 'x'.repeat(MAX_PROP_STRING))
check('القيم المركّبة تُسقَط ولا تتسرّب للمخزن', (() => { const p = sanitizeProps({ a: { deep: 1 }, b: [1, 2], c: 'ok', d: 3, e: true }); return !('a' in p) && !('b' in p) && p.c === 'ok' && p.d === 3 && p.e === true })())

console.log('\n③ عزل المالك (ضيف/حساب) بنمط accountScope')
resetStore()
setLastUser(null) // ضيف
check('مالك الضيف يُشتقّ من مؤشّر accountScope', currentTrackingOwner() === 'guest')
trackLocal('meal_entry_logged', { slot: 'guest-meal' })
setLastUser('user-A')
check('مفتاح الحساب غير مفتاح الضيف', trackingEventsKey('user-A') !== trackingEventsKey(null))
check('حساب جديد لا يرى أحداث الضيف', readEvents().length === 0)
trackLocal('meal_entry_logged', { slot: 'A-meal' })
setLastUser('user-B')
trackLocal('meal_entry_logged', { slot: 'B-meal' })
check('حساب ب لا يرى أحداث حساب أ', readEvents().every((e) => e.props.slot === 'B-meal'))
setLastUser('user-A')
check('حساب أ ما زال يرى أحداثه وحدها', readEvents().length === 1 && readEvents()[0].props.slot === 'A-meal')
check('أحداث الضيف بقيت في دلوها', (JSON.parse(globalThis.localStorage.getItem(trackingEventsKey(null)) ?? '[]') as unknown[]).length === 1)

console.log('\n④ المسح عند تسجيل الخروج / حذف الحساب')
// wipeUserData هو ما يستدعيه signOut (تبديل/خروج) وresetQimmah (حذف الحساب).
check('المفاتيح موجودة قبل المسح', !!globalThis.localStorage.getItem(trackingEventsKey('user-A')) && !!globalThis.localStorage.getItem(trackingEventsKey(null)))
wipeUserData()
check('أحداث الحساب مُسحت', globalThis.localStorage.getItem(trackingEventsKey('user-A')) === null)
check('أحداث الضيف مُسحت', globalThis.localStorage.getItem(trackingEventsKey(null)) === null)
check('لا مفتاح تتبّع ناجٍ من المسح إطلاقًا', Object.keys({ ...(globalThis.localStorage as unknown as Record<string, string>) }).filter((k) => k.startsWith(TRACKING_EVENTS_KEY_BASE)).length === 0)
// تأكيد مضادّ (§4.2): المسح ليس مسحًا عشوائيًا — مفتاح جهاز مسموح يبقى.
globalThis.localStorage.setItem('qimmah:prefs:v1', '{"lang":"ar"}')
globalThis.localStorage.setItem(trackingEventsKey(null), '[]')
wipeUserData()
check('المسح انتقائي: تفضيل الجهاز المسموح يبقى بينما التتبّع يُمسح', globalThis.localStorage.getItem('qimmah:prefs:v1') !== null && globalThis.localStorage.getItem(trackingEventsKey(null)) === null)
// clearEvents المباشر (مسار الوحدة نفسها)
resetStore()
setLastUser(null)
trackLocal('setup_completed', {})
check('clearEvents يمسح دلو المالك الحالي', readEvents().length === 1 && (clearEvents(), readEvents().length === 0))

console.log('\n⑤ الدخول في التصدير بنفس التصليب')
resetStore()
setLastUser('user-X')
setSyncRuntime('user-X', false) // التصدير فعل مربوط بالحساب — حارسه يقرأ زمن المزامنة
trackLocal('food_search_no_result', { query: 'كبسة' })
trackLocal('workout_session_started', { exercises: 5 })
const bundle = buildExportBundle('user-X')
check('قسم الأحداث داخل حزمة التصدير', Array.isArray(bundle.stores.trackingEvents) && (bundle.stores.trackingEvents as unknown[]).length === 2)
check('العدّاد يظهر في ملخّص الحزمة', bundle.counts.trackingEvents === 2)
const def = STORE_BY_ID.trackingEvents
check('المتجر مسجّل في allowlist النقل بلاحقة مالك', !!def && def.kind === 'ownerSuffix' && def.keyFor('user-X') === trackingEventsKey('user-X'))
// أقوى ممّا افترضتُ أولًا: الحارس يمنع تصدير مالك آخر **قبل** أي قراءة، فيرمي
// ACCOUNT_CHANGED بدل أن يعيد حزمة فارغة. الفحص يوثّق السلوك الحقيقي لا المتوقَّع.
check('تصدير مالك آخر يفشل مغلقًا عند الحارس (لا تسرّب أحداث بين الحسابات)', (() => {
  try { buildExportBundle('user-Y'); return false } catch (e) { return (e as { code?: string }).code === 'ACCOUNT_CHANGED' }
})())
// التصليب: التحقّق البنيوي يرفض المدخل غير الموثوق (§٥ — الاستيراد مدخل معادٍ).
check('التحقّق يقبل الشكل الصحيح', def.validate([{ id: 'aabbccdd', ts: 1, name: 'setup_completed', props: {} }]) === true)
check('التحقّق يرفض عنصرًا مشوّهًا', def.validate([{ nope: true }]) !== true)
check('التحقّق يرفض تجاوز سقف العناصر', def.validate(new Array(MAX_EVENTS + 1).fill({ id: 'a', ts: 1, name: 'x', props: {} })) !== true)
check('التحقّق يرفض قيمة ليست مصفوفة', def.validate({ not: 'an array' }) !== true)

console.log('\n⑥ الإشارات المشتقّة (فتح اليوم التالي · العودة بعد انقطاع)')
resetStore()
setLastUser(null)
check('ختم اليوم مطابق لـtoday.ts (لا انحراف بين نسختي التاريخ)', [new Date(2026, 0, 1), new Date(2026, 7, 3), new Date(2026, 11, 31)].every((d) => trackingDayStamp(d) === getDayStamp(d)))
check('فرق الأيام يُحسب تقويميًا', dayGap('2026-08-01', '2026-08-04') === 3 && dayGap('2026-12-31', '2027-01-01') === 1)
recordDayOpen()
check('لا حدث «يوم تالٍ» على مخزن فارغ (تشغيل أول ليس عودة)', readEvents().length === 0)
const now = new Date(2026, 7, 3, 9, 0, 0)
appendEvent(makeEvent('setup_completed', {}, new Date(2026, 7, 1, 20, 0, 0).getTime()))
recordDayOpen(now)
const dayEvents = readEvents().filter((e) => e.name === 'next_day_opened')
check('العودة في يوم لاحق تُسجَّل مع الفجوة', dayEvents.length === 1 && dayEvents[0].props.gapDays === 2)
recordDayOpen(now)
check('فتح ثانٍ في نفس اليوم لا يُكرّر الحدث', readEvents().filter((e) => e.name === 'next_day_opened').length === 1)
recordDayOpen(new Date(2026, 6, 1))
check('ساعة رجعت للخلف لا تخترع إشارة', readEvents().filter((e) => e.name === 'next_day_opened').length === 1)
check('hasEventToday يميّز اليوم من الأمس', hasEventToday('next_day_opened', now) && !hasEventToday('next_day_opened', new Date(2026, 7, 9)))

console.log('\n⑦ صفر نداء شبكي — المصائد التنفيذية')
resetStore()
setLastUser(null)
netCalls().length = 0
for (const name of TRACKED_EVENTS) trackLocal(name as never, SAMPLE_PROPS[name] as never)
recordDayOpen(new Date(2027, 0, 1))
buildExportBundle(null)
readEvents()
clearEvents()
check('صفر نداء شبكي عبر المسار كاملًا (إطلاق ١٥ حدثًا + إشارة + تصدير)', netCalls().length === 0)
// تأكيد مضادّ (§4.2): المصائد ليست ميتة — نداء متعمّد يُلتقط ويُسمّى.
try { void (globalThis as unknown as { fetch: (u: string) => unknown }).fetch('https://example.invalid/ingest') } catch { /* مقصود */ }
check('المصيدة حيّة: نداء متعمّد يُسجَّل باسمه', netCalls().length === 1 && netCalls()[0] === 'fetch')
try { void (globalThis as unknown as { navigator: { sendBeacon: (u: string) => unknown } }).navigator.sendBeacon('https://example.invalid/ingest') } catch { /* مقصود */ }
check('مصيدة sendBeacon حيّة كذلك', netCalls().length === 2 && netCalls()[1] === 'sendBeacon')

console.log('\n⑧ الأحداث المنتظِرة لسطحها')
check('كل منتظِر مُعرَّف في السجلّ الموحّد', AWAITING_SURFACE.every((n) => (TRACKED_EVENTS as readonly string[]).includes(n)))
// [CTO-70] وصل «أول انتصار» بسطحه، فخرج من الانتظار ولم يعد اسمًا معلَّقًا.
check('«first_win_completed» لم يعد ينتظر سطحه', !AWAITING_SURFACE.includes('first_win_completed'))
// مُعرَّفة فعلًا لا أسماء فارغة: تقبل الكتابة فور بناء سطحها.
resetStore()
setLastUser(null)
trackLocal('first_win_completed', { kind: 'meal', partOfDay: 'day' })
trackLocal('day7_summary_reached', { dayIndex: 7 })
check('الأسماء المعرَّفة قابلة للكتابة فور وجود السطح (لا اسم ميت)', readEvents().length === 2)

console.log(`\n✅ نجحت ${pass} فحوص تتبّع محلي (تنفيذية).`)
