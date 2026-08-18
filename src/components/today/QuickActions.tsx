import { Icon } from '@/components/Icon'
import { todayHomeStrings } from '@/i18n/dict/todayHome'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'

/**
 * فعلان سريعان لا شبكة اختصارات.
 *
 * المرجع البصري يضع بطاقتين متجاورتين، والقاعدة التي اعتُمدت خلفهما: **كل فعل
 * هنا شيء ينفع المستخدم أن يفعله اليوم تحديدًا** — تسجيل وجبة، وتسجيل وزن.
 * وما لا يُنتفع به يوميًّا لا يصير بطاقة (§3: لا توسيع نطاق، ولا شبكة عامة).
 *
 * والسطر الثانوي تحت «وزن اليوم» **مقيس لا مقدَّر**: عدد أيام حقيقي منذ آخر قياس،
 * أو إقرار صريح بعدم وجود قياس. لا «قبل فترة» ولا رقم افتراضي.
 */
export function QuickActions({
  lang,
  daysSinceWeight,
  onLogMeal,
  onLogWeight,
}: {
  lang: Lang
  /** أيام كاملة منذ آخر وزن مسجَّل · 0 = اليوم · null = لا قياس إطلاقًا. */
  daysSinceWeight: number | null
  onLogMeal: () => void
  onLogWeight: () => void
}) {
  const d = todayHomeStrings[lang]
  const weightHint =
    daysSinceWeight === null
      ? d.weightNever
      : daysSinceWeight === 0
        ? d.weightToday
        : d.weightLastDays(formatNumber(daysSinceWeight, lang))

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <QuickAction icon="Utensils" title={d.logMeal} hint={d.logMealHint} tone="var(--v2-green-text)" onClick={onLogMeal} />
      <QuickAction icon="TrendingUp" title={d.todayWeight} hint={weightHint} tone="var(--v2-pillar-recover)" onClick={onLogWeight} />
    </div>
  )
}

function QuickAction({
  icon,
  title,
  hint,
  tone,
  onClick,
}: {
  icon: string
  title: string
  hint: string
  tone: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => { void playHaptic('selection'); onClick() }}
      className="v2-pressable flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-2xl border border-line bg-surface px-3.5 py-3 text-start shadow-card"
    >
      <span className="flex items-center gap-1.5 text-base font-black text-ink-900">
        <Icon name={icon} className="h-4 w-4 shrink-0" style={{ color: tone }} />
        {title}
      </span>
      <span className="line-clamp-2 text-sm leading-snug text-ink-500">{hint}</span>
    </button>
  )
}
