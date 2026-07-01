import { SectionHeading } from '@/components/SectionHeading'
import { ProgressBar } from '@/components/ProgressBar'
import { Icon } from '@/components/Icon'
import { sectionCopy, labels } from '@/config/content'
import { goalInfo } from '@/data/goal'
import { useCustomization } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'
import { dashboardStrings } from '@/i18n/dict/dashboard'

/** قسم الهدف الحالي — يعرض هدف الشخص (حيّ من مركز التخصيص) مع تقدّمه. */
export function CurrentGoal({ lang = 'ar' }: { lang?: Lang }) {
  const { customization } = useCustomization()
  const { mainGoal, userName } = customization.identity
  const d = dashboardStrings[lang]

  return (
    <section id="goal" className="section">
      <div className="container-page">
        <SectionHeading {...sectionCopy.goal} />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* بطاقة الهدف الرئيسية */}
          <div className="card relative overflow-hidden p-7 lg:col-span-2">
            <div className="pointer-events-none absolute -top-10 h-40 w-40 rounded-full bg-primary-soft blur-2xl [inset-inline-start:-2.5rem]" />
            <div className="relative">
              <span className="chip inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-c">
                <Icon name="Target" className="h-3.5 w-3.5" />
                {userName?.trim() ? `${d.goalNamedPrefix}${userName}${d.goalNamedSuffix}` : d.goalMine}
              </span>
              <p className="mt-5 text-2xl font-black leading-snug text-ink-900 sm:text-3xl">
                {mainGoal?.trim() ? mainGoal : d.goalUnset}
              </p>

              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-ink-700">{labels.goal.progress}</span>
                  <span className="font-bold text-primary-c">{goalInfo.progress}%</span>
                </div>
                <ProgressBar current={goalInfo.progress} target={100} />
              </div>
            </div>
          </div>

          {/* أرقام الهدف */}
          <div className="grid gap-4">
            <GoalStat icon="Scale" label={goalInfo.currentLabel} value={goalInfo.currentValue} />
            <GoalStat icon="Target" label={goalInfo.targetLabel} value={goalInfo.targetValue} accent />
            <GoalStat icon="CalendarDays" label={labels.goal.deadline} value={goalInfo.deadline} />
          </div>
        </div>
      </div>
    </section>
  )
}

function GoalStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
          accent ? 'bg-primary-soft text-primary-c' : 'bg-beige text-ink-700'
        }`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-lg font-black text-ink-900">{value}</p>
      </div>
    </div>
  )
}
