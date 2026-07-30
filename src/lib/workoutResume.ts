// ح-١ · استعادة الجلسة بعد قتل التطبيق — الطبقة الخالصة.
//
// الجذع يحفظ الجلسة النشطة ويستعيدها فعلًا (WorkoutV2 + activeSession.ts)، لكن
// الاستعادة **صامتة**: التطبيق يقفز إلى الشاشة النشطة بلا استئذان. وهذا يخالف
// بند P0: العودة يجب أن تسأل «عندك تمرين مفتوح — نكمّل؟» وتعرض ما سيُستأنف.
//
// وحدة خالصة (بلا React وبلا تخزين) ⇒ قابلة للإثبات بلا متصفح. تعطي ثلاثة أشياء:
//   ١. ملخّصًا صادقًا للقطة (كم جولة مسجّلة · أين توقّف · كم بقي من الراحة).
//   ٢. حكم الطزاجة (لقطة أقدم من الحدّ لا تُعرض).
//   ٣. كتابة صادقة تُرجع نتيجة صريحة بدل ابتلاع الفشل.
//
// **لا تمسّ سلسلة صدق الإنهاء** (snapshot → persistFinishedSession → تراجع)
// الموجودة في WorkoutV2؛ هذه الوحدة تخصّ الجلسة الجارية قبل الإنهاء فقط.

import { ACTIVE_SESSION_MAX_AGE_MS } from '@/lib/activeSession'

/** صف جولة كما يخزّنه WorkoutV2 (weight/reps/done). */
export interface ResumeSetRow {
  weight: number
  reps: number
  done: boolean
}

/** الحد الأدنى من شكل الجلسة النشطة الذي يحتاجه الملخّص (بنيويًا = ActiveState). */
export interface ResumableSession {
  startedAt: number
  exIndex: number
  setIndex: number
  rows: Record<string, ResumeSetRow[]>
  rest?: { endsAt: number; durationSec: number } | null
  /** لحظة آخر حفظ — تُكتب عند كل حفظ ليصير فحص الطزاجة ممكنًا. */
  savedAt?: number
}

/** ملخّص يُعرض في سؤال الاستئناف — كله محسوب من اللقطة، لا تقدير. */
export interface ResumeSummary {
  /** عدد الجولات **المسجّلة فعلًا** (done=true) عبر التمارين كلها. */
  loggedSets: number
  /** عدد التمارين التي فيها جولة مسجّلة واحدة على الأقل. */
  touchedExercises: number
  /** فهرس التمرين الذي توقّف عنده (0-based). */
  exIndex: number
  /** رقم الجولة التالية داخل ذلك التمرين (1-based، للعرض). */
  nextSetNumber: number
  /** ثواني الراحة المتبقية وقت العودة (0 إذا انتهت أو لا راحة). */
  restLeftSec: number
  /** عمر اللقطة بالدقائق وقت العودة — لغة العرض تتحفّظ كلما طال. */
  ageMinutes: number
}

/** الحدّ الأقصى لعمر لقطة تُعرض للاستئناف — نفس حدّ الجذع (١٢ ساعة). */
export const RESUME_MAX_AGE_MS = ACTIVE_SESSION_MAX_AGE_MS

/**
 * هل اللقطة طازجة بما يكفي لتُعرض؟
 * غياب `savedAt` (لقطة من إصدار أقدم) **لا يُسقطها** — نرجع إلى `startedAt`،
 * فبيانات المستخدم أثمن من صرامة حقل اختياري.
 */
export function isFreshEnough(
  session: Pick<ResumableSession, 'savedAt' | 'startedAt'>,
  now: number,
  maxAgeMs: number = RESUME_MAX_AGE_MS,
): boolean {
  const stamp = typeof session.savedAt === 'number' && Number.isFinite(session.savedAt)
    ? session.savedAt
    : session.startedAt
  if (typeof stamp !== 'number' || !Number.isFinite(stamp)) return false
  // ساعة تحرّكت للخلف ⇒ العمر سالب ⇒ تبقى طازجة (لا نعاقب المستخدم على ساعته).
  return now - stamp <= maxAgeMs
}

/** يُلخّص اللقطة بلغة الأرقام المقاسة — لا تقدير ولا تقريب. */
export function summarizeSession(
  session: ResumableSession,
  exerciseIds: readonly string[],
  now: number,
): ResumeSummary {
  let loggedSets = 0
  let touchedExercises = 0
  for (const id of exerciseIds) {
    const rows = session.rows[id]
    if (!Array.isArray(rows)) continue
    const done = rows.filter((r) => r && r.done === true).length
    loggedSets += done
    if (done > 0) touchedExercises++
  }
  const stamp = typeof session.savedAt === 'number' ? session.savedAt : session.startedAt
  return {
    loggedSets,
    touchedExercises,
    exIndex: session.exIndex,
    nextSetNumber: session.setIndex + 1,
    restLeftSec: session.rest ? Math.max(0, Math.ceil((session.rest.endsAt - now) / 1000)) : 0,
    ageMinutes: Math.max(0, Math.floor((now - stamp) / 60000)),
  }
}

// ————————————————————— الكتابة الصادقة —————————————————————

/** نتيجة كتابة صريحة — الفشل يُرجَع، لا يُبتلع. */
export type ResumeWriteResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'quota' | 'unknown' }

/** واجهة التخزين المطلوبة (تسمح بحقن shim في الإثبات بلا متصفح). */
export interface MinimalStorage {
  setItem(key: string, value: string): void
  getItem(key: string): string | null
  removeItem(key: string): void
}

/** يصنّف خطأ الكتابة: امتلاء الحصة يُميَّز لأن رسالته للمستخدم مختلفة. */
function classify(err: unknown): 'quota' | 'unknown' {
  const name = (err as { name?: string } | null)?.name
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota'
  return 'unknown'
}

/**
 * يكتب لقطة الجلسة ويُرجع نتيجة صريحة. يضيف `savedAt` بنفسه فيكون فحص الطزاجة
 * ممكنًا لاحقًا. **لا يرمي أبدًا** — الاستدعاء من داخل effect.
 */
export function writeActiveSession(
  storage: MinimalStorage | null | undefined,
  key: string,
  session: ResumableSession,
  now: number,
): ResumeWriteResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.setItem(key, JSON.stringify({ ...session, savedAt: now }))
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: classify(err) }
  }
}
