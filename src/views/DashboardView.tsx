import { useState } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { SuccessToast } from '@/components/SuccessToast'
import { WorkoutMode } from '@/components/WorkoutMode'
import { DailySummary } from '@/sections/DailySummary'
import { Today } from '@/sections/Today'
import { CurrentGoal } from '@/sections/CurrentGoal'
import { ProfileData } from '@/sections/ProfileData'
import { MyTargets } from '@/sections/MyTargets'
import { WeeklyRoutine } from '@/sections/WeeklyRoutine'
import { WorkoutPlanSection } from '@/sections/WorkoutPlanSection'
import { RecentWorkout } from '@/sections/RecentWorkout'
import { NutritionPlanSection } from '@/sections/NutritionPlanSection'
import { WellnessSection } from '@/sections/WellnessSection'
import { ProgressSection } from '@/sections/ProgressSection'
import { CommitmentsSection } from '@/sections/CommitmentsSection'
import { HealthNotice } from '@/sections/HealthNotice'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { todayPlanDay } from '@/lib/workoutPlan'
import { addSession, type WorkoutSession } from '@/lib/workoutSessions'
import { loadHistory, recordExercise, saveHistory } from '@/lib/exerciseHistory'
import { saveExerciseHistory, saveWorkoutSession } from '@/lib/historyStore'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

interface DashboardViewProps {
  lang: Lang
  onNavigate: (view: AppView) => void
  showSuccess: boolean
  onDismissSuccess: () => void
}

/** عرض الصفحة الرئيسية — الخطة الشخصية + وضع التمرين. */
export function DashboardView({ lang, onNavigate, showSuccess, onDismissSuccess }: DashboardViewProps) {
  const { customization } = useCustomization()
  const auth = useAuth()
  const s = customization.sections
  const tw = getStrings(lang).workout
  const badge: 'guest' | 'account' = auth.user ? 'account' : 'guest'

  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [savedWorkout, setSavedWorkout] = useState(false)
  const planDay = todayPlanDay(customization.workoutPlan)

  const finishWorkout = (session: WorkoutSession) => {
    // حفظ الجلسة + تحديث سجل الأداء (آخر/أفضل وزن وتكرارات + 1RM + سلسلة التقدّم)
    addSession(session)
    let history = loadHistory()
    const when = session.finishedAt ?? session.startedAt
    session.exercises.forEach((e) => {
      history = recordExercise(history, e, when)
    })
    saveHistory(history)
    // عكس في المتجر التاريخي الدائم (المصدر الذي يُزامَن سحابيًا لاحقًا).
    saveWorkoutSession(session)
    saveExerciseHistory(history)
    setWorkoutOpen(false)
    setSavedWorkout(true)
  }

  return (
    <div className="min-h-screen bg-page">
      <AppNav current="dashboard" lang={lang} badge={badge} onNavigate={onNavigate} />

      <main>
        {/* 1) ملخّص يومي/ترحيب */}
        <DailySummary />
        {/* 2) اليوم */}
        {s.today && <Today lang={lang} onStartWorkout={planDay ? () => setWorkoutOpen(true) : undefined} />}
        {/* 3) الجدول الأسبوعي */}
        <WeeklyRoutine />
        {/* 4) خطة التمرين والأوزان */}
        {s.workouts && <WorkoutPlanSection lang={lang} />}
        {s.workouts && <RecentWorkout lang={lang} />}
        {/* 5) التغذية */}
        {s.meals && <NutritionPlanSection lang={lang} />}
        {/* 6) المكملات والأدوية */}
        {(s.supplements || s.medications) && <WellnessSection lang={lang} />}
        {/* 7) الالتزامات */}
        {s.commitments && <CommitmentsSection lang={lang} />}
        {/* 8) القياسات والتقدّم */}
        {s.measurements && <ProgressSection lang={lang} />}
        {/* الهدف + البيانات + الأهداف المحسوبة */}
        <CurrentGoal />
        <ProfileData />
        <MyTargets />
        {s.notes && <HealthNotice />}
      </main>

      <Footer />

      {/* وضع التمرين */}
      {workoutOpen && planDay && (
        <WorkoutMode lang={lang} day={planDay} onClose={() => setWorkoutOpen(false)} onFinish={finishWorkout} />
      )}

      {/* تأكيد إكمال الإعداد */}
      {showSuccess && <SuccessToast onClose={onDismissSuccess} />}

      {/* تأكيد حفظ التمرين */}
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
