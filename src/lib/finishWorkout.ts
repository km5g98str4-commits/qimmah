// حفظ جلسة تمرين منتهية في مكان واحد — تستخدمه الرئيسية وتبويب التمرين.
// يحفظ الجلسة ثم يحدّث سجل الأداء (آخر/أفضل وزن + 1RM + سلسلة التقدّم)،
// ويُرجع التمارين التي حقّقت رقمًا قياسيًا (PR) لعرضها في ملخّص النهاية.

import { addSession, type WorkoutSession } from './workoutSessions'
import { classifyFinishedSession } from './workoutSessionEngine'
import { detectSessionPRs, loadHistory, recordExercise, saveHistory, topCompletedWeight } from './exerciseHistory'
import { track, firstOnce } from './analytics'

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
