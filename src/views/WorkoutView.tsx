import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { SuccessToast } from '@/components/SuccessToast'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WeeklyRoutine } from '@/sections/WeeklyRoutine'
import { WorkoutPlanSection } from '@/sections/WorkoutPlanSection'
import { RecentWorkout } from '@/sections/RecentWorkout'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay } from '@/lib/workoutPlan'
import { addSession, type WorkoutSession } from '@/lib/workoutSessions'
import { loadHistory, recordExercise, saveHistory } from '@/lib/exerciseHistory'
import { saveExerciseHistory, saveWorkoutSession } from '@/lib/historyStore'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

/** تبويب التمرين — بدء جلسة وتسجيلها + الجدول والخطة وآخر تمرين. */
export function WorkoutView({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const tw = getStrings(lang).workout
  const planDay = todayPlanDay(customization.workoutPlan)
  const dayName = planDay ? (lang === 'en' ? planDay.nameEn : planDay.nameAr) : ''

  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [savedWorkout, setSavedWorkout] = useState(false)

  const finishWorkout = (session: WorkoutSession) => {
    // حفظ الجلسة + تحديث سجل الأداء (آخر/أفضل وزن وتكرارات + 1RM)
    addSession(session)
    let history = loadHistory()
    const when = session.finishedAt ?? session.startedAt
    session.exercises.forEach((e) => {
      history = recordExercise(history, e, when)
    })
    saveHistory(history)
    // عكس في المتجر التاريخي الدائم (المصدر الذي يُزامَن سحابيًا)
    saveWorkoutSession(session)
    saveExerciseHistory(history)
    setWorkoutOpen(false)
    setSavedWorkout(true)
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {/* بدء تمرين اليوم */}
      <div className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
        <div className="relative">
          <span className="eyebrow">
            <Icon name="Dumbbell" className="h-3.5 w-3.5" />
            {planDay ? dayName : tw.emptyPlan}
          </span>
          {planDay ? (
            <>
              <p className="mt-2 text-xs text-ink-500">
                {planDay.exercises.length} {tw.workoutsTitle} · {tw.start}
              </p>
              <button
                type="button"
                onClick={() => setWorkoutOpen(true)}
                className="btn-primary mt-4 w-full py-3.5 text-base"
              >
                <Icon name="Flame" className="h-5 w-5" />
                {tw.start}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-500">{tw.emptyPlan}</p>
          )}
        </div>
      </div>

      <WeeklyRoutine />
      <WorkoutPlanSection lang={lang} />
      <RecentWorkout lang={lang} />

      {/* وضع التمرين — فوق الشريط السفلي */}
      {workoutOpen && planDay && (
        <div className="fixed inset-0 z-[60]">
          <WorkoutMode lang={lang} day={planDay} onClose={() => setWorkoutOpen(false)} onFinish={finishWorkout} />
        </div>
      )}

      {savedWorkout && (
        <SuccessToast
          onClose={() => setSavedWorkout(false)}
          title={tw.savedTitle}
          body={tw.savedBody}
          actionLabel={tw.recentTitle}
          scrollTo="recent-workout"
        />
      )}
    </div>
  )
}
