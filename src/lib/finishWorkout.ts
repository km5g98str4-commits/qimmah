// حفظ جلسة تمرين منتهية في مكان واحد — تستخدمه الرئيسية وتبويب التمرين.
// يحفظ الجلسة ثم يحدّث سجل الأداء (آخر/أفضل وزن + 1RM + سلسلة التقدّم).

import { addSession, type WorkoutSession } from './workoutSessions'
import { loadHistory, recordExercise, saveHistory } from './exerciseHistory'

/** يحفظ الجلسة ويحدّث سجل الأداء. لا يكتب شيئًا في وضع النموذج (يُستدعى من سياق التطبيق فقط). */
export function persistFinishedSession(session: WorkoutSession): void {
  addSession(session)
  let history = loadHistory()
  const when = session.finishedAt ?? session.startedAt
  session.exercises.forEach((e) => {
    history = recordExercise(history, e, when)
  })
  saveHistory(history)
}
