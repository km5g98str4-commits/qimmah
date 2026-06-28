import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { useCustomization } from '@/lib/customizationContext'
import { goalTypeLabel } from '@/lib/calculators'
import { currentWeekSummary } from '@/lib/streaks'
import { useNutritionToday } from '@/lib/nutritionTracking'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

const round = (n: number) => Math.round(n)

interface DailySummaryProps {
  lang: Lang
}

/** ملخّص يومي حيّ أعلى الرئيسية — يعكس المأكول والمتبقّي فعليًا من تسجيل المستخدم. */
export function DailySummary({ lang }: DailySummaryProps) {
  const { customization } = useCustomization()
  const p = customization.profile
  const t = customization.targets
  const np = customization.nutritionPlan
  const tn = getStrings(lang).nutrition
  const name = customization.identity.userName
  const { state, totals } = useNutritionToday()

  // الأهداف: من خطة التغذية ثم الحسابات (مصدر واحد للحقيقة).
  const targetCalories = np.targetCalories || t.targetCalories || t.maintenanceCalories || 0
  const targetProtein = np.targetProtein || t.proteinGrams || 0
  const targetCarbs = np.targetCarbs || t.carbsGrams || 0
  const targetFat = np.targetFat || t.fatGrams || 0
  const targetWaterMl = round((np.targetWaterLiters || t.waterLiters || 0) * 1000)

  // المأكول الفعلي من سجل اليوم (يبدأ صفرًا ويتغيّر فقط بالتسجيل).
  const eatenCal = round(totals.calories)
  const remainingCal = targetCalories - eatenCal
  const waterMl = state.waterMl
  const remainingWaterMl = Math.max(0, targetWaterMl - waterMl)

  // عدد أيام التمرين/الأسبوع من الخطة (للالتزام الأسبوعي).
  const daysPerWeek = customization.workoutPlan.days.length || 3
  // سلسلة وملخّص الأسبوع من السجلّ الدائم (لا من حالة اليوم المؤقتة).
  const week = useMemo(() => currentWeekSummary(daysPerWeek), [daysPerWeek])

  return (
    <section id="summary">
      <div className="card overflow-hidden p-5 sm:p-6">
        <span className="eyebrow">
          <Icon name="Flame" className="h-3.5 w-3.5" />
          خطتك اليوم
        </span>
        <h1 className="mt-2 text-xl font-black text-ink-900 sm:text-2xl">
          {name?.trim() ? `أهلًا ${name} 👋` : 'هذه خطتك اليوم 👋'}
        </h1>

        {/* السعرات: الهدف / المأكول / المتبقّي — حيّ */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <CalCell label={tn.needCals} value={targetCalories} />
          <CalCell label={tn.eaten} value={eatenCal} />
          <CalCell label={tn.remaining} value={remainingCal} highlight />
        </div>
        <ProgressBar current={eatenCal} target={targetCalories || 1} color="bg-orange-500" className="mt-3 h-2" />

        {/* الماكروز: مأكول / هدف — حيّ */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <MacroMini label={tn.protein} eaten={round(totals.protein)} target={targetProtein} color="bg-brand-500" />
          <MacroMini label={tn.carbs} eaten={round(totals.carbs)} target={targetCarbs} color="bg-sky-500" />
          <MacroMini label={tn.fat} eaten={round(totals.fat)} target={targetFat} color="bg-gold-500" />
        </div>

        {/* الماء: مستهلك / هدف + المتبقّي — حيّ */}
        <div className="mt-3 rounded-xl border border-line bg-page p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-ink-700">
              <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
              {tn.water}
            </span>
            <span className="text-xs font-black text-primary-c">
              {(waterMl / 1000).toFixed(2)} / {(targetWaterMl / 1000).toFixed(1)} {lang === 'en' ? 'L' : 'لتر'}
            </span>
          </div>
          <ProgressBar current={waterMl} target={targetWaterMl || 1} color="bg-primary" className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[11px] text-ink-400">
            {tn.remainingWater}: <span className="font-bold text-ink-700">{(remainingWaterMl / 1000).toFixed(2)} {lang === 'en' ? 'L' : 'لتر'}</span>
          </p>
        </div>

        {/* سياق الهدف والوزن */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip icon="Target" text={goalTypeLabel(p.goalType)} />
          <Chip icon="Scale" text={`${p.weightKg} كجم`} />
          <Chip icon="TrendingDown" text={`${p.targetWeightKg} كجم`} />
        </div>

        {/* الالتزام الأسبوعي — X/Y تمارين هذا الأسبوع + سلسلة الأسابيع الناجحة */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip icon="CheckCircle2" text={`هذا الأسبوع: ${week.weekly.thisWeekCount}/${week.weekly.daysPerWeek} تمارين`} />
          <Chip icon="Flame" text={`سلسلة أسبوعية: ${week.weekly.streakWeeks} أسبوع`} />
          <Chip icon="Salad" text={`التزام التغذية: ${week.nutritionDays}/7`} />
        </div>
      </div>
    </section>
  )
}

function CalCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-page p-3 text-center">
      <p className={`text-lg font-black ${highlight ? 'text-primary-c' : 'text-ink-900'}`}>{value}</p>
      <p className="truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

function MacroMini({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-page p-3">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-black text-ink-900">
        {eaten}<span className="text-[10px] font-bold text-ink-400"> / {target}غ</span>
      </p>
      <ProgressBar current={eaten} target={target || 1} color={color} className="mt-1.5 h-1.5" />
    </div>
  )
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
      <Icon name={icon} className="h-3.5 w-3.5 text-primary-c" />
      {text}
    </span>
  )
}
