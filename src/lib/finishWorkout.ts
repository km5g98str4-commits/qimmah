// حفظ جلسة تمرين منتهية في مكان واحد — تستخدمه الرئيسية وتبويب التمرين.
// يحفظ الجلسة ثم يحدّث سجل الأداء (آخر/أفضل وزن + 1RM + سلسلة التقدّم)،
// ويُرجع التمارين التي حقّقت رقمًا قياسيًا (PR) لعرضها في ملخّص النهاية.

import { addSession, type WorkoutSession } from './workoutSessions'
import { classifyFinishedSession } from './workoutSessionEngine'
import { detectSessionPRs, loadHistory, recordExercise, saveHistory, topCompletedWeight } from './exerciseHistory'
import { track, firstOnce } from './analytics'
import { getWorkoutSessions } from './historyStore'
import { getStorageFailure, isStorageWritable, type WriteResult } from './safeStorage'

/** رقم قياسي محقّق في الجلسة. */
export interface SessionPR {
  exerciseId: string
  nameAr?: string
  nameEn?: string
  weight: number
}

/**
 * يحفظ الجلسة ويحدّث سجل الأداء عبر المتجر الدائم (historyStore).
 * يُرجع قائمة الأرقام القياسية الجديدة (تُحسب قبل تحديث السجل).
 */
export function persistFinishedSession(session: WorkoutSession): SessionPR[] {
  // (P5) اختم الحالة الصادقة عند الحفظ ما لم يمرّرها المستدعي صراحةً:
  // اكتملت كل التمارين → completed، وإلا → ended_early. الإنهاء المبكر يبقى
  // مسموحًا (بتأكيده القائم) — فقط يُسمّى بصدق، والمجموعات المنفّذة تُحسب كلها.
  const stamped: WorkoutSession = session.status ? session : { ...session, status: classifyFinishedSession(session) }

  // 1) التقط السجل قبل التحديث لاكتشاف الأرقام القياسية.
  const before = loadHistory()
  const prs: SessionPR[] = []
  stamped.exercises.forEach((e) => {
    if (detectSessionPRs(before, e)) {
      prs.push({
        exerciseId: e.exerciseId,
        nameAr: e.exerciseNameAr,
        nameEn: e.exerciseNameEn,
        weight: topCompletedWeight(e),
      })
    }
  })

  // 2) احفظ الجلسة (يحدّث أيضًا لقطة اليوم workoutCompleted في historyStore —
  //    التي تبقى مؤشّر «تمرّن هذا اليوم»؛ الاكتمال الصادق مصدره dayCompletion).
  addSession(stamped)

  // 3) حدّث سجل الأداء لكل تمرين.
  let history = loadHistory()
  const when = session.finishedAt ?? session.startedAt
  session.exercises.forEach((e) => {
    history = recordExercise(history, e, when)
  })
  saveHistory(history)

  // إشارات التمرين — تعدادات فقط (عدد التمارين والأرقام القياسية)، بلا أي تفاصيل.
  track('workout_logged', { exercises: session.exercises.length, prs: prs.length })
  if (firstOnce('firstWorkout')) track('first_workout_logged', {})

  return prs
}

/** نتيجة محاولة تثبيت جلسة منتهية — نجاح/فشل صريح لا يُخمَّن. */
export interface FinishCommitResult {
  /** `true` فقط إذا وصلت الجلسة إلى التخزين فعلًا (تحقّق بالقراءة بعد الكتابة). */
  ok: boolean
  /** الأرقام القياسية المحقّقة (فارغة عند الفشل). */
  prs: SessionPR[]
  /** سبب الفشل عند `ok === false`، وإلا `null`. */
  failure: WriteResult | null
}

/**
 * تثبيت الجلسة المنتهية **مع فحص نتيجة الكتابة** — هذا هو الفرق عن
 * `persistFinishedSession` التي تكتب ولا تُخبر بشيء.
 *
 * لماذا؟ شاشة إنهاء التمرين كانت تلفّ الحفظ بـ`try/catch` فارغ ثم تمسح الجلسة
 * الجارية وتنتقل لشاشة «أحسنت» — حتى لو لم يُحفظ شيء (تخزين ممتلئ أو محجوب).
 * هنا نُثبت النجاح بدليلين مستقلّين:
 *   1) مؤشّر الفشل في `safeStorage` لم يتغيّر أثناء الكتابة (مقارنة مرجعية:
 *      أي فشل جديد يُنتج كائنًا جديدًا)، ولم يُرمَ استثناء غير متوقّع؛
 *   2) قراءة بعد الكتابة: الجلسة موجودة فعلًا في المتجر الدائم.
 *
 * `persistFinishedSession` تبقى كما هي (توافق رجعي كامل لمستدعيها الحاليين).
 */
export function commitFinishedSession(session: WorkoutSession): FinishCommitResult {
  const failureBefore = getStorageFailure()
  let prs: SessionPR[] = []
  let threw = false
  try {
    prs = persistFinishedSession(session)
  } catch {
    threw = true
  }
  const failureAfter = getStorageFailure()
  // مرجع جديد = فشل حدث أثناء هذه العملية تحديدًا (لا فشل قديم عالق).
  const newFailure = failureAfter && failureAfter !== failureBefore ? failureAfter : null
  const landed = (() => {
    try {
      return getWorkoutSessions().some((s) => s.id === session.id)
    } catch {
      return false
    }
  })()

  if (newFailure) return { ok: false, prs: [], failure: newFailure.result }
  if (threw || !landed) {
    // فشل بلا سبب مسجّل: ميّز «التخزين محجوب» عن خطأ غير معروف بفحص حيّ.
    return { ok: false, prs: [], failure: isStorageWritable() ? 'error' : 'unavailable' }
  }
  return { ok: true, prs, failure: null }
}
