// إثبات وحدة لمنطق حفظ/استئناف الجلسة النشطة وحساب مؤقّت الراحة (بلا متصفح).
// يعمل فوق localStorage مُحاكى (banner في المُشغّل) ويتحكّم بالوقت عبر تمرير `now`.

import {
  activeSessionKey,
  clearActiveSession,
  isRestorableSnapshot,
  loadActiveSession,
  restIsFinished,
  restRemainingSec,
  saveActiveSession,
  ACTIVE_SESSION_MAX_AGE_MS,
  type ActiveSessionSnapshot,
} from '@/lib/activeSession'
import type { PlanDay } from '@/types/workout'

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

const NOW = 1_800_000_000_000 // طابع زمني ثابت (لا Date.now الحقيقي) — إثبات حتمي.

function day(): PlanDay {
  return {
    id: 'day-1',
    nameAr: 'دفع',
    nameEn: 'Push',
    exercises: [
      { id: 'pe-1', exerciseId: 'bench-press', sets: 3, reps: '8-12', restSec: 90, order: 0 },
      { id: 'pe-2', exerciseId: 'shoulder-press', sets: 3, reps: '10', restSec: 60, order: 1 },
    ],
  }
}

function validSnapshot(over: Partial<ActiveSessionSnapshot> = {}): ActiveSessionSnapshot {
  const d = day()
  const mkSets = (n: number, w: string, r: string) =>
    Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, targetReps: '8-12', actualReps: r, weightKg: w, completed: i === 0 }))
  return {
    version: 1,
    savedAt: NOW,
    startedAt: '2026-07-12T10:00:00.000Z',
    day: d,
    current: 1,
    state: {
      'pe-1': { sets: mkSets(3, '60', '10'), painNote: '', notes: '' },
      'pe-2': { sets: mkSets(3, '30', '10'), painNote: '', notes: '' },
    },
    swap: {},
    altSlots: {},
    rest: { endsAt: NOW + 90_000, durationSec: 90 },
    ...over,
  }
}

console.log('\n① جولة كاملة: حفظ → تحميل (مربوط بالحساب)')
{
  const snap = validSnapshot()
  saveActiveSession('userA', snap)
  const loaded = loadActiveSession('userA', NOW)
  check('التحميل يُعيد لقطة غير فارغة', loaded !== null)
  check('البيانات متطابقة تمامًا (round-trip)', JSON.stringify(loaded) === JSON.stringify(snap))
  check('current محفوظ (=1)', loaded?.current === 1)
  check('الوزن المُدخل محفوظ (pe-1 = 60)', loaded?.state['pe-1'].sets[0].weightKg === '60')
  check('حالة الراحة محفوظة كطابع زمني', loaded?.rest?.endsAt === NOW + 90_000)
}

console.log('\n② العزل بين الحسابات (لا اختلاط)')
{
  clearActiveSession('userA'); clearActiveSession('userB')
  saveActiveSession('userA', validSnapshot({ startedAt: 'A-session' }))
  check('مفتاح A ≠ مفتاح B', activeSessionKey('userA') !== activeSessionKey('userB'))
  check('B لا يرى جلسة A', loadActiveSession('userB', NOW) === null)
  check('A يرى جلسته', loadActiveSession('userA', NOW)?.startedAt === 'A-session')
}

console.log('\n③ الطزاجة (حدّ ١٢ ساعة)')
{
  clearActiveSession('u')
  saveActiveSession('u', validSnapshot({ savedAt: NOW - (ACTIVE_SESSION_MAX_AGE_MS - 1000) }))
  check('لقطة عمرها < ١٢س → تُستأنَف', loadActiveSession('u', NOW) !== null)
  saveActiveSession('u', validSnapshot({ savedAt: NOW - (ACTIVE_SESSION_MAX_AGE_MS + 1000) }))
  check('لقطة عمرها > ١٢س → تُرفض وتُمسح', loadActiveSession('u', NOW) === null)
  check('اللقطة القديمة مُسحت فعليًا من التخزين', loadActiveSession('u', NOW) === null)
}

console.log('\n④ الحارس يرفض المدخلات المعطوبة')
{
  check('null', !isRestorableSnapshot(null, NOW))
  check('إصدار مختلف', !isRestorableSnapshot(validSnapshot({ version: 2 as unknown as 1 }), NOW))
  check('يوم بلا تمارين', !isRestorableSnapshot(validSnapshot({ day: { ...day(), exercises: [] } }), NOW))
  check('current خارج النطاق', !isRestorableSnapshot(validSnapshot({ current: 5 }), NOW))
  check('current سالب', !isRestorableSnapshot(validSnapshot({ current: -1 }), NOW))
  const missing = validSnapshot()
  delete (missing.state as Record<string, unknown>)['pe-2']
  check('حالة ناقصة لتمرين في اليوم (لقطة خطة قديمة)', !isRestorableSnapshot(missing, NOW))
  const emptySets = validSnapshot()
  emptySets.state['pe-1'].sets = []
  check('مجموعات فارغة', !isRestorableSnapshot(emptySets, NOW))
  const badSet = validSnapshot()
  ;(badSet.state['pe-1'].sets[0] as unknown as Record<string, unknown>).weightKg = 60 // رقم بدل نص
  check('مجموعة مشوّهة (نوع خاطئ)', !isRestorableSnapshot(badSet, NOW))
  check('startedAt فارغ', !isRestorableSnapshot(validSnapshot({ startedAt: '' }), NOW))
  check('لقطة صحيحة تمرّ', isRestorableSnapshot(validSnapshot(), NOW))
}

console.log('\n⑤ حساب مؤقّت الراحة من الطابع الزمني')
{
  const start = NOW
  const rest = { endsAt: start + 90_000, durationSec: 90 }
  check('عند البدء: ٩٠ ثانية متبقية', restRemainingSec(rest.endsAt, start) === 90)
  check('بعد ٣٠ث: ٦٠ متبقية', restRemainingSec(rest.endsAt, start + 30_000) === 60)
  check('بعد ٨٩.٥ث: ١ متبقية (ceil)', restRemainingSec(rest.endsAt, start + 89_500) === 1)
  check('عند الانتهاء بالضبط: ٠', restRemainingSec(rest.endsAt, start + 90_000) === 0)
  check('غير منتهٍ أثناء العدّ', restIsFinished(rest, start + 30_000) === false)
  check('منتهٍ عند/بعد endsAt', restIsFinished(rest, start + 90_000) === true)
}

console.log('\n⑥ سيناريو الخلفية دقيقتين (جوهر الإصلاح B)')
{
  // بدأ راحة ٩٠ث، ثم غاب التطبيق دقيقتين (١٢٠ث) في الخلفية.
  const start = NOW
  const rest = { endsAt: start + 90_000, durationSec: 90 }
  const afterBackground = start + 120_000
  check('الراحة (٩٠ث) بعد خلفية دقيقتين → ٠ متبقية (لا قيمة خاطئة)', restRemainingSec(rest.endsAt, afterBackground) === 0)
  check('الراحة تُعتبر «منتهية» بعد الرجوع', restIsFinished(rest, afterBackground) === true)
  // راحة أطول (٣ دقائق) — بعد دقيقتين خلفية يجب أن يبقى ٦٠ث (لا صفر خاطئ ولا قيمة متجمّدة).
  const long = { endsAt: start + 180_000, durationSec: 180 }
  check('راحة ٣د بعد خلفية دقيقتين → ٦٠ث بالضبط', restRemainingSec(long.endsAt, afterBackground) === 60)
  check('راحة ٣د ليست منتهية بعد دقيقتين', restIsFinished(long, afterBackground) === false)
}

console.log(`\n${'─'.repeat(44)}`)
if (fail === 0) {
  console.log(`✅ كل الفحوص نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
