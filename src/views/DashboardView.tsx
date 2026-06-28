import { Icon } from '@/components/Icon'
import { DailySummary } from '@/sections/DailySummary'
import { Today } from '@/sections/Today'
import { RecentWorkout } from '@/sections/RecentWorkout'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay } from '@/lib/workoutPlan'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'

interface DashboardViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** الرئيسية — تبدأ بتمرين اليوم والإجراء اليومي، بلا أي هيرو تسويقي. */
export function DashboardView({ lang, onNavigate }: DashboardViewProps) {
  const { customization } = useCustomization()
  const s = customization.sections
  const tw = getStrings(lang).workout
  const planDay = todayPlanDay(customization.workoutPlan)
  const dayName = planDay ? (lang === 'en' ? planDay.nameEn : planDay.nameAr) : ''

  return (
    <div className="space-y-4 px-4 py-4">
      {/* بطاقة تمرين اليوم — تهيمن أعلى الشاشة */}
      <button
        type="button"
        onClick={() => onNavigate('workout')}
        className="card relative w-full overflow-hidden p-5 text-start active:scale-[0.99]"
      >
        <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">
              <Icon name="Dumbbell" className="h-3.5 w-3.5" />
              {tw.start}
            </span>
            <p className="mt-2 truncate text-xl font-black text-ink-900">
              {planDay ? dayName : tw.emptyPlan}
            </p>
            {planDay && (
              <p className="mt-0.5 text-xs text-ink-500">
                {planDay.exercises.length} {tw.workoutsTitle}
              </p>
            )}
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Flame" className="h-6 w-6" />
          </span>
        </div>
      </button>

      {/* ملخّص يومي حيّ (هدف/مأكول/متبقّي + ماكروز + ماء + سلسلة) */}
      <DailySummary lang={lang} />

      {/* قائمة اليوم — الإجراء اليومي */}
      {s.today && (
        <Today
          lang={lang}
          onStartWorkout={planDay ? () => onNavigate('workout') : undefined}
          onEditPlan={() => onNavigate('setup')}
        />
      )}

      {/* آخر تمرين */}
      {s.workouts && <RecentWorkout lang={lang} />}

      {/* مختصرات للتبويبات الأخرى */}
      <div className="grid grid-cols-2 gap-3 px-1">
        <TeaserCard
          icon="Salad"
          label={getStrings(lang).tabs.nutrition}
          onClick={() => onNavigate('nutrition')}
        />
        <TeaserCard
          icon="BarChart3"
          label={getStrings(lang).tabs.progress}
          onClick={() => onNavigate('progress')}
        />
      </div>
    </div>
  )
}

function TeaserCard({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card flex items-center gap-3 p-4 text-start active:scale-[0.99]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
      <Icon name="ChevronLeft" className="ms-auto h-4 w-4 text-ink-400 rtl:rotate-180" />
    </button>
  )
}
