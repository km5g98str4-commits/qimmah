// إثبات محرّك حالة الجلسة (P5) — يشغَّل على shim للتخزين عبر
// run-session-engine-proof.mjs. يغطي: تصنيف كامل/جزئي/مهجور، «اليوم المكتمل»
// الصادق (ended_early لا يُكمل)، ختم الحالة عند الحفظ، احتساب مجموعات/أرقام
// الجلسات الجزئية، حارس الحفظ المزدوج بالمعرّف، التراجع snapshot/restore،
// إشعار نهاية الراحة (منفذ وهمي)، والجلسات القديمة بلا status = completed.

import {
  ABANDONED_AFTER_MS,
  REST_END_NOTIFICATION_ID,
  abandonedSessionFrom,
  buildFinishCelebration,
  buildSessionStats,
  cancelRestEndNotification,
  classifyFinishedSession,
  classifyRestoredSession,
  dayCompletion,
  nextExerciseAfter,
  scheduleRestEndNotification,
  sessionStatus,
  todaysCompletion,
  withSessionStatus,
} from '@/lib/workoutSessionEngine'
import { setRestEndPortForTests, type RestEndPort } from '@/lib/notifications/restEnd'
import { persistFinishedSession } from '@/lib/finishWorkout'
import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
import { addSession, todaysFinishedSession, type WorkoutSession } from '@/lib/workoutSessions'
import { getWorkoutSessions, setWorkoutSessions } from '@/lib/historyStore'
import { loadHistory } from '@/lib/exerciseHistory'
import { snapshotWorkoutStorage, restoreWorkoutStorage } from '@/lib/workoutFinishUndo'
import { getDayStamp } from '@/lib/today'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'

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
const stamp = getDayStamp()

// نموذج مصغّر بنمط إثبات finish-confirm نفسه (الحقول التي يقرؤها البناء فقط).
const model = {
  available: true,
  session: { title: 'دفع' },
  exercises: [
    { id: 'row-0', exerciseId: 'bench-press', nameAr: 'بنش برس', nameEn: 'Bench press', sets: 2, reps: '5', restSec: 90 },
    { id: 'row-1', exerciseId: 'overhead-press', nameAr: 'ضغط علوي', nameEn: 'Overhead press', sets: 2, reps: '5', restSec: 90 },
  ],
} as unknown as WorkoutV2Model

/** لقطة نشطة: التمرين الأول منجز كاملًا بوزن w؛ الثاني منجز جزئيًا أو صفرًا. */
const activeWith = (w: number, secondDone: number, startedAt = 1_000) => ({
  startedAt,
  rows: {
    'row-0': [{ weight: w, reps: 5, done: true }, { weight: w, reps: 5, done: true }],
    'row-1': [{ weight: 30, reps: 5, done: secondDone >= 1 }, { weight: 30, reps: 5, done: secondDone >= 2 }],
  },
})

const T0 = Date.parse('2026-07-18T10:00:00.000Z')
const fullSession = () => buildV2WorkoutSession(activeWith(80, 2, T0), model, { date: '2026-07-18', finishedAtMs: T0 + 30 * 60_000 })
const partialSession = () => buildV2WorkoutSession(activeWith(80, 0, T0 + 1), model, { date: '2026-07-18', finishedAtMs: T0 + 20 * 60_000 })

console.log('\n① تصنيف الجلسة: كامل / جزئي / قديم بلا status')
{
  check('كل التمارين مكتملة → completed', classifyFinishedSession(fullSession()) === 'completed')
  check('تمرين غير مكتمل → ended_early (الإنهاء المبكر يبقى مسموحًا، يُسمّى بصدق)', classifyFinishedSession(partialSession()) === 'ended_early')
  check('جلسة بلا تمارين → ended_early (لا اكتمال بصفر عمل)', classifyFinishedSession({ ...fullSession(), exercises: [] }) === 'ended_early')
  const legacy = { ...fullSession(), status: undefined }
  check('قديمة بلا status + finishedAt → completed (توافق خلفي)', sessionStatus(legacy) === 'completed')
  check('بلا finishedAt وبلا status → in_progress', sessionStatus({ ...legacy, finishedAt: undefined }) === 'in_progress')
  check('status صريح يفوز على الاستنتاج', sessionStatus({ ...legacy, status: 'abandoned' }) === 'abandoned')
  check('withSessionStatus يختم دون تعديل غيره', withSessionStatus(partialSession()).status === 'ended_early' && withSessionStatus(partialSession()).exercises.length === 2)
}

console.log('\n② اكتمال اليوم: completed فقط يُكمل — ended_early جزئي صادق')
{
  const full = withSessionStatus(fullSession())
  const partial = withSessionStatus(partialSession())
  check('يوم بجلسة completed → complete', dayCompletion('2026-07-18', [full]).state === 'complete')
  const p = dayCompletion('2026-07-18', [partial])
  check('يوم بجلسة ended_early → partial (ليس complete)', p.state === 'partial')
  check('معلومات جزئية صادقة: تمرين ١/٢ ومجموعتان/٤ = ٥٠٪', p.state === 'partial' && p.partial.completedExercises === 1 && p.partial.totalExercises === 2 && p.partial.completedSets === 2 && p.partial.totalSets === 4 && p.partial.percent === 50)
  check('completed + ended_early بنفس اليوم → complete يفوز', dayCompletion('2026-07-18', [partial, full]).state === 'complete')
  check('لا جلسات في التاريخ → none', dayCompletion('2026-07-19', [full]).state === 'none')
  const legacyNoStatus: WorkoutSession = { ...fullSession(), status: undefined }
  check('قديمة بلا status → اليوم complete (لا كسر للتاريخ)', dayCompletion('2026-07-18', [legacyNoStatus]).state === 'complete')
  const abandoned: WorkoutSession = { ...partialSession(), finishedAt: undefined, status: 'abandoned' }
  check('جلسة مهجورة لا تُكمل اليوم ولا تُحسب جزئية منتهية', dayCompletion('2026-07-18', [abandoned]).state === 'none')
}

console.log('\n③ الحفظ يختم الحالة + الجلسة الجزئية تُحسب مجموعاتها وأرقامها')
{
  ls.clear()
  const partial = partialSession()
  const prs = persistFinishedSession(partial) // بلا status — يُختم تلقائيًا
  const saved = getWorkoutSessions().find((s) => s.id === partial.id)
  check('persist خَتَم ended_early تلقائيًا وحُفظ عبر جولة القراءة', saved?.status === 'ended_early')
  check('رقم قياسي من جلسة جزئية يُحسب (بنش ٨٠ أول مرة)', prs.some((pr) => pr.exerciseId === 'bench-press' && pr.weight === 80))
  const record = loadHistory()['bench-press']
  check('سجل الأداء تحدّث من المجموعات المنجزة للجلسة الجزئية', record != null && Number(record.bestWeight) === 80)
  check('التمرين المتخطّى كليًا لم يلوّث السجل', loadHistory()['overhead-press'] == null)
  ls.clear()
  const full = fullSession()
  persistFinishedSession(full)
  check('جلسة كاملة تُختم completed', getWorkoutSessions().find((s) => s.id === full.id)?.status === 'completed')
  ls.clear()
  const preStamped: WorkoutSession = { ...partialSession(), status: 'completed' }
  persistFinishedSession(preStamped)
  check('status ممرَّر صراحةً لا يُداس عند الحفظ', getWorkoutSessions()[0]?.status === 'completed')
}

console.log('\n④ حارس الحفظ المزدوج: نفس المعرّف مرتين = جلسة واحدة')
{
  ls.clear()
  const s = withSessionStatus(fullSession())
  addSession(s)
  addSession(s)
  check('addSession ×٢ بنفس المعرّف → جلسة واحدة', getWorkoutSessions().length === 1)
  persistFinishedSession(fullSession())
  persistFinishedSession(fullSession())
  check('persistFinishedSession ×٢ بنفس المعرّف → لا تكرار', getWorkoutSessions().length === 1)
  const edited: WorkoutSession = { ...s, workoutDayName: 'اسم معدَّل' }
  addSession(edited)
  check('إعادة الحفظ بنفس المعرّف تستبدل (لا تضيف)', getWorkoutSessions().length === 1 && getWorkoutSessions()[0].workoutDayName === 'اسم معدَّل')
}

console.log('\n⑤ التراجع snapshot/restore سليم مع ختم الحالة')
{
  ls.clear()
  setWorkoutSessions([withSessionStatus(fullSession())])
  const baseline = getWorkoutSessions().length
  const snapshot = snapshotWorkoutStorage()
  const another = buildV2WorkoutSession(activeWith(90, 2, T0 + 99), model, { date: '2026-07-19', finishedAtMs: T0 + 99 + 30 * 60_000 })
  persistFinishedSession(another)
  check('الحفظ المؤكَّد أضاف الجلسة', getWorkoutSessions().length === baseline + 1)
  restoreWorkoutStorage(snapshot)
  check('التراجع أعاد المتجر كما كان بالضبط', getWorkoutSessions().length === baseline && !getWorkoutSessions().some((s) => s.id === another.id))
  check('سجل الأداء عاد أيضًا (٩٠ اختفت)', Number(loadHistory()['bench-press']?.bestWeight) !== 90)
}

console.log('\n⑥ الجلسة المهجورة: تصنيف فقط — المجموعات المنفَّذة لا تُحذف أبدًا')
{
  const now = Date.parse('2026-07-18T20:00:00.000Z')
  check('أقدم من العتبة (٨ ساعات) → abandoned', classifyRestoredSession({ startedAt: now - ABANDONED_AFTER_MS - 1 }, now) === 'abandoned')
  check('أحدث من العتبة → in_progress (لا هجر متسرّع)', classifyRestoredSession({ startedAt: now - 60 * 60_000 }, now) === 'in_progress')
  check('عتبة مخصّصة تُحترم', classifyRestoredSession({ startedAt: now - 2 * 60_000 }, now, 60_000) === 'abandoned')
  ls.clear()
  const active = activeWith(70, 1, now - ABANDONED_AFTER_MS - 5_000)
  const abandoned = abandonedSessionFrom(active, model, { date: '2026-07-18', nowMs: now })
  check('الجلسة المهجورة: status=abandoned وبلا finishedAt', abandoned.status === 'abandoned' && abandoned.finishedAt === undefined)
  const totalSets = abandoned.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0)
  const doneSets = abandoned.exercises.reduce((n, e) => n + (e.sets?.filter((s) => s.completed).length ?? 0), 0)
  check('كل المجموعات محفوظة (٤) والمنجز منها (٣) كما هو — لا حذف', totalSets === 4 && doneSets === 3)
  addSession(abandoned)
  check('تُحفظ بالمعرّف نفسه (idempotent) وتبقى المجموعات بعد القراءة', getWorkoutSessions()[0].exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0) === 4)
  check('المهجورة لا تُكمل اليوم', dayCompletion('2026-07-18').state === 'none')
}

console.log('\n⑦ إشعار نهاية الراحة: جدولة/إلغاء عبر منفذ وهمي — ولا-شيء على الويب')
{
  const now = Date.parse('2026-07-18T10:00:00.000Z')
  const endsAt = now + 90_000
  // الافتراضي في بيئة node = ويب (Capacitor ليس iOS) → لا-شيء صامت.
  // (يُختبر قبل حقن المنفذ الوهمي.)
  let webResult: string | null = null
  const calls = { scheduled: [] as { id: number; title: string; body: string; at: Date }[], cancelled: [] as number[] }
  const mockPort = (permission: 'granted' | 'denied'): RestEndPort => ({
    supported: () => true,
    permission: async () => permission,
    scheduleAt: async (item) => {
      calls.scheduled.push(item)
    },
    cancel: async (id) => {
      calls.cancelled.push(id)
    },
  })

  const run = async () => {
    webResult = await scheduleRestEndNotification(endsAt, 'ar', now)

    setRestEndPortForTests(mockPort('granted'))
    const r1 = await scheduleRestEndNotification(endsAt, 'ar', now)
    check('بإذن ممنوح: تُجدول أحادية عند endsAt بالمعرّف 3600', r1 === 'scheduled' && calls.scheduled.length === 1 && calls.scheduled[0].id === REST_END_NOTIFICATION_ID && calls.scheduled[0].at.getTime() === endsAt)
    check('نسخة عربية صادقة', calls.scheduled[0].title === 'انتهت الراحة' && calls.scheduled[0].body.length > 0)
    check('الاستبدال مدمج: أُلغي القديم قبل الجدولة', calls.cancelled.length === 1 && calls.cancelled[0] === REST_END_NOTIFICATION_ID)

    // «+وقت»: إعادة جدولة عند endsAt الجديد تستبدل ولا تراكم.
    const r2 = await scheduleRestEndNotification(endsAt + 15_000, 'en', now)
    check('+وقت: إلغاء ثم جدولة جديدة عند الوقت الممدَّد', r2 === 'scheduled' && calls.cancelled.length === 2 && calls.scheduled.length === 2 && calls.scheduled[1].at.getTime() === endsAt + 15_000)
    check('نسخة إنجليزية ثنائية اللغة', calls.scheduled[1].title === 'Rest is over')

    // تخطّي الراحة/اكتمالها في المقدّمة → إلغاء.
    await cancelRestEndNotification()
    check('الإلغاء الصريح يمرّ للمنفذ', calls.cancelled.length === 3)

    // بلا إذن: لا جدولة إطلاقًا.
    const before = calls.scheduled.length
    setRestEndPortForTests(mockPort('denied'))
    const r3 = await scheduleRestEndNotification(endsAt, 'ar', now)
    check('إذن مرفوض → denied ولا جدولة', r3 === 'denied' && calls.scheduled.length === before)

    // وقت مضى: لا إشعار لماضٍ.
    setRestEndPortForTests(mockPort('granted'))
    const r4 = await scheduleRestEndNotification(now - 1, 'ar', now)
    check('endsAt في الماضي → skipped', r4 === 'skipped' && calls.scheduled.length === before)

    setRestEndPortForTests(null)
    check('على الويب (المنفذ الافتراضي في node) → unsupported لا-شيء صامت', webResult === 'unsupported')
  }
  await run()
}

console.log('\n⑧ عقد الاحتفال/الانتقال (لـCodex): nextExerciseId + sessionStats + prs')
{
  check('التالي بعد الأول = الثاني', nextExerciseAfter(model, 'row-0') === 'row-1')
  check('بعد الأخير = null (شاشة الإنهاء)', nextExerciseAfter(model, 'row-1') === null)
  check('فتحة مجهولة = null (لا تخمين)', nextExerciseAfter(model, 'row-x') === null)
  const stats = buildSessionStats(withSessionStatus(fullSession()))
  check('إحصاءات من المنجز فعلًا: ٤ مجموعات · حجم 1100 · ٣٠ دقيقة', stats.sets === 4 && stats.volume === 80 * 5 * 2 + 30 * 5 * 2 && stats.minutes === 30 && stats.exercises === 2)
  const celebration = buildFinishCelebration({ session: withSessionStatus(fullSession()), prs: [{ exerciseId: 'bench-press', weight: 80 }], model, currentSlotId: 'row-0' })
  check('حمولة الاحتفال كاملة الشكل', celebration.nextExerciseId === 'row-1' && celebration.sessionStats.volume > 0 && celebration.prs.length === 1)
}

console.log('\n⑨ التوافق الخلفي: المهجورة القديمة todaysFinishedSession تعمل بسلوكها القديم')
{
  ls.clear()
  const todayEarly: WorkoutSession = { ...withSessionStatus(partialSession()), id: 'sToday', date: stamp }
  addSession(todayEarly)
  // القديمة: أي finishedAt اليوم — تُرجِع الجزئية أيضًا (سلوكها القديم حرفيًا).
  check('القديمة تُرجِع الجلسة المنتهية مبكرًا (سلوك قديم مقصود)', todaysFinishedSession()?.id === 'sToday')
  // الجديدة الصادقة: اليوم partial لا complete.
  const t = todaysCompletion()
  check('الجديدة الصادقة: اليوم partial لا complete', t.state === 'partial')
  ls.clear()
  const legacyRaw = { id: 'sLegacy', date: stamp, startedAt: '2026-07-18T10:00:00.000Z', finishedAt: '2026-07-18T10:40:00.000Z', workoutDayId: 'd', workoutDayName: 'قديم', exercises: [{ exerciseId: 'x', targetSets: 3, targetReps: '8', targetRestSec: 90, completed: true }] }
  ls.setItem('qimmah:history:workoutSessions:v1', JSON.stringify([legacyRaw]))
  ls.setItem('qimmah:history:migrated:v1', 'done')
  check('جلسة قديمة خام (بلا status) تُقرأ completed واليوم complete', todaysCompletion().state === 'complete')
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص محرّك الجلسة نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
