import { useState } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { SuccessToast } from '@/components/SuccessToast'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WorkoutSummary } from '@/components/WorkoutSummary'
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
import { StorageCard } from '@/sections/StorageCard'
import { useCustomization } from '@/lib/customizationContext'
import { exerciseDisplayName, todayPlanDay } from '@/lib/workoutPlan'
import { getExercise } from '@/data/exercises'
import { addSession, type WorkoutSession } from '@/lib/workoutSessions'
import { loadHistory, recordExercise, saveHistory } from '@/lib/exerciseHistory'
import { workoutStreak } from '@/lib/workoutStats'
import { weekdayName } from '@/lib/today'
import type { Lang } from '@/lib/appPreferences'

const parseNum = (v?: string): number => {
  const m = String(v ?? '').match(/[\d.]+/)
  return m ? Number(m[0]) : NaN
}

interface SummaryData {
  session: WorkoutSession
  prs: string[]
  nextDayLabel?: string
  streak: number
}

interface DashboardViewProps {
  lang: Lang
  onNavigate: (view: AppView) => void
  onOpenSetup: () => void
  showSuccess: boolean
  onDismissSuccess: () => void
}

/** عرض الصفحة الرئيسية — الخطة الشخصية + وضع التمرين. */
export function DashboardView({
  lang,
  onNavigate,
  onOpenSetup,
  showSuccess,
  onDismissSuccess,
}: DashboardViewProps) {
  const { customization, applyCustomization } = useCustomization()
  const s = customization.sections

  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const planDay = todayPlanDay(customization.workoutPlan)

  /** استبدال بديل في الخطة بشكل دائم (من وضع التمرين). */
  const swapPlanExercise = (dayId: string, planExerciseId: string, newExerciseId: string) => {
    const next = {
      ...customization,
      workoutPlan: {
        ...customization.workoutPlan,
        days: customization.workoutPlan.days.map((d) =>
          d.id !== dayId
            ? d
            : {
                ...d,
                exercises: d.exercises.map((pe) =>
                  pe.id !== planExerciseId ? pe : { ...pe, exerciseId: newExerciseId, customNameAr: undefined, customNameEn: undefined, videoUrl: undefined },
                ),
              },
        ),
      },
    }
    applyCustomization(next)
  }

  const finishWorkout = (session: WorkoutSession) => {
    // أرقام قياسية: قارن أثقل مجموعة منجزة بأفضل وزن سابق (قبل الحفظ)
    const before = loadHistory()
    const prs: string[] = []
    session.exercises.forEach((e) => {
      const tops = (e.sets ?? []).filter((s) => s.completed).map((s) => parseNum(s.weightKg)).filter((n) => !Number.isNaN(n))
      const top = tops.length ? Math.max(...tops) : 0
      if (top <= 0) return
      const prevBest = parseNum(before[e.exerciseId]?.bestWeight)
      if (Number.isNaN(prevBest) || top > prevBest) {
        const ex = getExercise(e.exerciseId)
        prs.push(exerciseDisplayName(e.exerciseNameAr ?? ex?.nameAr ?? '', e.exerciseNameEn ?? ex?.nameEn ?? '', lang))
      }
    })

    // حفظ الجلسة + تحديث سجل الأداء (آخر/أفضل وزن وتكرارات + 1RM + سلسلة التقدّم)
    addSession(session)
    let history = before
    const when = session.finishedAt ?? session.startedAt
    session.exercises.forEach((e) => {
      history = recordExercise(history, e, when)
    })
    saveHistory(history)

    // تمرين الغد
    const days = customization.workoutPlan.days
    let nextDayLabel: string | undefined
    if (days.length) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nd = days[tomorrow.getDay() % days.length]
      if (nd) nextDayLabel = `${weekdayName(lang === 'en' ? 'en' : 'ar', tomorrow)} — ${lang === 'en' ? nd.nameEn : nd.nameAr}`
    }

    setWorkoutOpen(false)
    setSummary({ session, prs, nextDayLabel, streak: workoutStreak() })
  }

  const scrollTo = (id: string) => {
    setSummary(null)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))
  }

  return (
    <div className="min-h-screen bg-page">
      <AppNav current="dashboard" lang={lang} onNavigate={onNavigate} />

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
        {/* التخزين/التصدير */}
        <StorageCard />
        {s.notes && <HealthNotice />}
      </main>

      <Footer />

      {/* زر عائم — تعديل خطتي */}
      <button
        type="button"
        onClick={onOpenSetup}
        className="btn-primary fixed bottom-5 start-5 z-40 shadow-glow"
        aria-label="تعديل خطتي"
      >
        <Icon name="Palette" className="h-4 w-4" />
        <span className="hidden sm:inline">تعديل خطتي</span>
      </button>

      {/* وضع التمرين */}
      {workoutOpen && planDay && (
        <WorkoutMode
          lang={lang}
          day={planDay}
          onClose={() => setWorkoutOpen(false)}
          onFinish={finishWorkout}
          onSwapExercise={swapPlanExercise}
        />
      )}

      {/* ملخّص نهاية التمرين */}
      {summary && (
        <WorkoutSummary
          lang={lang}
          session={summary.session}
          prs={summary.prs}
          nextDayLabel={summary.nextDayLabel}
          streak={summary.streak}
          onBackToToday={() => scrollTo('today')}
          onViewProgress={() => scrollTo('recent-workout')}
        />
      )}

      {/* تأكيد إكمال الإعداد */}
      {showSuccess && <SuccessToast onClose={onDismissSuccess} />}
    </div>
  )
}
