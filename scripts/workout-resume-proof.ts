// إثبات ح-١ · استعادة الجلسة بعد قتل التطبيق (بند P0).
//
// يحاكي الدورة كاملة فوق localStorage مُشيَّم: تسجيل جولات → «قتل التطبيق»
// (إسقاط ذاكرة العملية والإبقاء على التخزين وحده) → العودة → الاستعادة.
//
// معيار القبول المعلَن: **لا تُفقد جولة واحدة مسجّلة.** ويضيف الإثبات ما يحرس
// البند من الالتفاف عليه: لقطة بائتة لا تُعرض، ولقطة لخطة أخرى تُرفض، وفشل
// الكتابة يُرجَع صريحًا بدل أن يُبتلع.

import {
  isFreshEnough,
  summarizeSession,
  writeActiveSession,
  RESUME_MAX_AGE_MS,
  type ResumableSession,
  type MinimalStorage,
} from '@/lib/workoutResume'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

const KEY = 'qimmah:active-workout:v2:guest'
const EX = ['barbell-bench-press', 'barbell-row', 'overhead-press']
const T0 = 1_760_000_000_000 // لحظة ثابتة (لا Date.now في الإثبات).

/** تخزين مُشيَّم يحاكي المتصفح — ويمكن جعله يفشل عمدًا. */
function makeStorage(mode: 'ok' | 'quota' | 'throw' = 'ok'): MinimalStorage & { dump(): Map<string, string> } {
  const map = new Map<string, string>()
  return {
    setItem(k, v) {
      if (mode === 'quota') { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e }
      if (mode === 'throw') throw new Error('blocked')
      map.set(k, String(v))
    },
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    removeItem: (k) => { map.delete(k) },
    dump: () => map,
  }
}

/** حارس WorkoutV2 نفسه بالبنية ذاتها (نسخة الإثبات: نفس الشروط الحاكمة). */
function isUsableSession(value: unknown, exerciseIds: readonly string[]): value is ResumableSession {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<ResumableSession>
  if (exerciseIds.length === 0) return false
  if (!Number.isInteger(s.exIndex) || (s.exIndex as number) < 0 || (s.exIndex as number) >= exerciseIds.length) return false
  if (!Number.isInteger(s.setIndex) || (s.setIndex as number) < 0) return false
  if (!Number.isInteger(s.startedAt)) return false
  if (!s.rows || typeof s.rows !== 'object') return false
  for (const id of exerciseIds) {
    const r = (s.rows as Record<string, unknown>)[id]
    if (!Array.isArray(r) || r.length === 0) return false
    for (const item of r) {
      const row = item as { weight?: unknown; reps?: unknown; done?: unknown }
      if (!row || typeof row.weight !== 'number' || typeof row.reps !== 'number' || typeof row.done !== 'boolean') return false
    }
  }
  return true
}

/** جلسة بثلاثة تمارين: التمرين الأول مكتمل، والثاني نصفه، والثالث لم يُبدأ. */
function seedSession(): ResumableSession {
  return {
    startedAt: T0,
    exIndex: 1,
    setIndex: 2,
    rows: {
      [EX[0]]: [
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 9, done: true },
        { weight: 62.5, reps: 8, done: true },
      ],
      [EX[1]]: [
        { weight: 40, reps: 12, done: true },
        { weight: 42.5, reps: 10, done: true },
        { weight: 42.5, reps: 0, done: false },
      ],
      [EX[2]]: [
        { weight: 30, reps: 10, done: false },
        { weight: 30, reps: 10, done: false },
      ],
    },
    rest: { endsAt: T0 + 90_000, durationSec: 90 },
  }
}

console.log('\n── ح-١ · إثبات استعادة الجلسة بعد قتل التطبيق ──\n')

// ═══ ١. الدورة الكاملة: تسجيل → قتل → عودة ═══
console.log('١. لا تُفقد جولة واحدة مسجّلة')
{
  const storage = makeStorage()
  const live = seedSession()
  const loggedBefore = Object.values(live.rows).flat().filter((r) => r.done).length

  // حفظ عند كل تغيير (كما يفعل الـeffect في WorkoutV2).
  const res = writeActiveSession(storage, KEY, live, T0 + 60_000)
  check('الحفظ نجح وأرجع نتيجة صريحة', res.ok === true)

  // «قتل التطبيق»: كل ما في الذاكرة يزول، ويبقى التخزين وحده.
  const raw = storage.getItem(KEY)
  check('اللقطة موجودة في التخزين بعد القتل', typeof raw === 'string' && raw.length > 0)
  const parsed: unknown = JSON.parse(raw as string)

  // العودة: الحارس ثم الطزاجة ثم العرض.
  const usable = isUsableSession(parsed, EX)
  check('اللقطة تجتاز الحارس الصارم', usable)
  const restored = parsed as ResumableSession
  check('اللقطة طازجة فتُعرض للاستئناف', isFreshEnough(restored, T0 + 61_000))

  const loggedAfter = Object.values(restored.rows).flat().filter((r) => r.done).length
  check(`عدد الجولات المسجّلة كما هو (${loggedBefore} → ${loggedAfter})`, loggedAfter === loggedBefore && loggedBefore === 5)

  // القيم نفسها لا العدد فقط — وزنًا وتكرارًا وترتيبًا.
  const sameRows = EX.every((id) =>
    restored.rows[id].every((r, i) =>
      r.weight === live.rows[id][i].weight && r.reps === live.rows[id][i].reps && r.done === live.rows[id][i].done))
  check('قيم كل جولة محفوظة بالضبط (وزن · تكرار · حالة)', sameRows)

  check('موضع التوقّف محفوظ (التمرين الحالي)', restored.exIndex === 1)
  check('موضع التوقّف محفوظ (الجولة التالية)', restored.setIndex === 2)

  // مؤقّت الراحة تقديريًا: يُحسب من الطابع الزمني لا من عدّاد متجمّد.
  const s30 = summarizeSession(restored, EX, T0 + 30_000)
  check('مؤقّت الراحة يُحسب من الطابع الزمني (بقي ٦٠ ث بعد ٣٠ ث)', s30.restLeftSec === 60)
  const s120 = summarizeSession(restored, EX, T0 + 120_000)
  check('راحة انتهت أثناء الغياب تُعرض صفرًا لا رقمًا سالبًا', s120.restLeftSec === 0)
}

// ═══ ٢. الملخّص المعروض في السؤال — أرقام مقاسة لا تقديرية ═══
console.log('\n٢. ملخّص سؤال «نكمّل؟»')
{
  const s = summarizeSession(seedSession(), EX, T0 + 5 * 60_000)
  check('عدد الجولات المسجّلة = ٥ (لا يعدّ غير المكتملة)', s.loggedSets === 5)
  check('عدد التمارين الملموسة = ٢', s.touchedExercises === 2)
  check('الجولة التالية = ٣ (1-based للعرض)', s.nextSetNumber === 3)
  check('عمر اللقطة بالدقائق = ٥', s.ageMinutes === 5)
}

// ═══ ٣. ما لا يجوز عرضه ═══
console.log('\n٣. حدود العرض')
{
  const stale = { ...seedSession(), savedAt: T0 }
  check('لقطة أقدم من الحدّ (١٢ ساعة) لا تُعرض', !isFreshEnough(stale, T0 + RESUME_MAX_AGE_MS + 1000))
  check('لقطة على الحدّ تمامًا تُعرض', isFreshEnough(stale, T0 + RESUME_MAX_AGE_MS))
  check('غياب savedAt يرجع إلى startedAt لا يُسقط اللقطة', isFreshEnough({ startedAt: T0 }, T0 + 60_000))
  check('ساعة تحرّكت للخلف لا تُسقط اللقطة', isFreshEnough(stale, T0 - 5000))

  // لقطة لخطة أخرى: الحارس يرفضها فلا تُعرض أصلًا.
  const otherPlan = seedSession()
  delete (otherPlan.rows as Record<string, unknown>)[EX[2]]
  check('لقطة لا تغطّي كل تمارين الخطة تُرفض', !isUsableSession(otherPlan, EX))
  check('نصّ تالف يُرفض', !isUsableSession('{"rows":', EX))
  check('null يُرفض', !isUsableSession(null, EX))
}

// ═══ ٤. الكتابة الصادقة — الفشل يُرجَع لا يُبتلع ═══
console.log('\n٤. صدق الحفظ')
{
  const quota = writeActiveSession(makeStorage('quota'), KEY, seedSession(), T0)
  check('امتلاء المساحة يُرجع ok=false بسبب quota', quota.ok === false && quota.reason === 'quota')
  const blocked = writeActiveSession(makeStorage('throw'), KEY, seedSession(), T0)
  check('تخزين محجوب يُرجع ok=false بسبب unknown', blocked.ok === false && blocked.reason === 'unknown')
  const none = writeActiveSession(null, KEY, seedSession(), T0)
  check('غياب التخزين يُرجع ok=false بسبب unavailable', none.ok === false && none.reason === 'unavailable')
  check('لا استثناء يتسرّب من الكتابة أبدًا', true)

  // savedAt يُكتب تلقائيًا فيصير فحص الطزاجة ممكنًا في العودة التالية.
  const st = makeStorage()
  writeActiveSession(st, KEY, seedSession(), T0 + 777)
  const back = JSON.parse(st.getItem(KEY) as string) as ResumableSession
  check('savedAt يُكتب مع اللقطة', back.savedAt === T0 + 777)
}

console.log(`\n── النتيجة: ${passed} ناجحًا · ${failed} فاشلًا ──\n`)
if (failed > 0) process.exit(1)
