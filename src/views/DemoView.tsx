import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { DailySummary } from '@/sections/DailySummary'
import { Today } from '@/sections/Today'
import { CurrentGoal } from '@/sections/CurrentGoal'
import { ProfileData } from '@/sections/ProfileData'
import { MyTargets } from '@/sections/MyTargets'
import { WeeklyRoutine } from '@/sections/WeeklyRoutine'
import { MuscleCoverageSection } from '@/sections/MuscleCoverageSection'
import { WorkoutPlanSection } from '@/sections/WorkoutPlanSection'
import { NutritionPlanSection } from '@/sections/NutritionPlanSection'
import { WellnessSection } from '@/sections/WellnessSection'
import { ProgressSection } from '@/sections/ProgressSection'
import { CommitmentsSection } from '@/sections/CommitmentsSection'
import { HealthNotice } from '@/sections/HealthNotice'
import { DemoCustomizationProvider } from '@/lib/customizationContext'
import { DemoModeProvider } from '@/lib/demoMode'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface DemoViewProps {
  lang: Lang
  onNavigate: (view: AppView) => void
  onBack: () => void
}

/** عرض النموذج — لوحة تجريبية ببيانات افتراضية، بلا أي كتابة في تخزين المستخدم. */
export function DemoView({ lang, onNavigate, onBack }: DemoViewProps) {
  const t = getStrings(lang)

  return (
    <DemoCustomizationProvider>
      <DemoModeProvider>
      <div className="min-h-screen bg-page">
        <AppNav current="demo" lang={lang} badge="demo" onNavigate={onNavigate} />

        {/* شريط تنويه النموذج — ثابت أعلى الصفحة طوال وضع النموذج */}
        <div className="sticky top-16 z-30 border-b border-line bg-beige">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-white">
                <Icon name="Sparkles" className="h-3 w-3" />
                {t.demo.badge}
              </span>
              <p className="text-sm text-ink-700">{t.demo.body}</p>
            </div>
            <button type="button" onClick={onBack} className="btn-ghost px-4 py-2 text-xs">
              <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
              {t.demo.back}
            </button>
          </div>
        </div>

        <main>
          <DailySummary />
          <Today lang={lang} />
          <CurrentGoal />
          <ProfileData />
          <MyTargets />
          <WeeklyRoutine />
          <MuscleCoverageSection lang={lang} />
          <WorkoutPlanSection lang={lang} />
          <NutritionPlanSection lang={lang} />
          <WellnessSection lang={lang} />
          <CommitmentsSection lang={lang} />
          <ProgressSection lang={lang} />
          <HealthNotice />
        </main>

        <Footer />
      </div>
      </DemoModeProvider>
    </DemoCustomizationProvider>
  )
}
