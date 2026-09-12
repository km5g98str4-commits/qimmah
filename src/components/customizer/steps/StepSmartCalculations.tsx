import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { NumericInput } from '@/components/NumericInput'
import type { WizardCtx } from '../stepProps'
import type { Targets } from '@/types/profile'
import { computeTargets, hasNumericNutritionPrescription, profileHash } from '@/lib/calculators'
import { NUM_LIMITS } from '@/lib/validation'
import type { Lang } from '@/lib/appPreferences'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

/** خطوة الحسابات الذكية — أرقام مقدّرة قابلة للتعديل اليدوي. */
export function StepSmartCalculations({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const t = ctx.data.targets
  const manual = ctx.data.targetsMeta.manuallyEdited
  const policy = profileChoiceStrings[ctx.lang]
  // أي تعديل يدوي على رقم → يضع علامة «معدّل يدويًا»
  const setT = (partial: Partial<Targets>) =>
    ctx.update({ targets: { ...t, ...partial }, targetsMeta: { ...ctx.data.targetsMeta, manuallyEdited: true } })
  // إعادة الحساب من الملف → يلغي التعديل اليدوي
  const recalc = () =>
    ctx.update({
      targets: computeTargets(ctx.data.profile),
      targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: profileHash(ctx.data.profile) },
    })

  if (!hasNumericNutritionPrescription(t)) {
    return (
      <div>
        <StepHeader icon="BarChart3" title={d.smartTitle} description={d.smartDescription} />
        <div className="rounded-2xl border border-line bg-beige p-5" data-testid="smart-calculations-under18-policy">
          <h3 className="text-base font-black text-ink-900">{policy.minorNutritionGuidanceTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{policy.minorNutritionGuidanceBody}</p>
        </div>
        <div className="mt-5">
          <Card icon="Dumbbell" title={d.smartTrainingCard} full>
            <TextField label={d.smartSuggestedSplit} value={t.suggestedTrainingSplit} onChange={(v) => setT({ suggestedTrainingSplit: v })} />
            <TextField label={d.smartNotes} value={t.notes} onChange={(v) => setT({ notes: v })} />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <StepHeader
        icon="BarChart3"
        title={d.smartTitle}
        description={d.smartDescription}
      />

      {/* تنويه */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
        <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
        <p className="text-sm leading-relaxed text-ink-700">
          {d.smartDisclaimer}
        </p>
      </div>

      {/* إشعار التعديل اليدوي */}
      {manual ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-primary-soft bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-ink-900">
            {d.smartManualNotice}
          </p>
          <button type="button" onClick={recalc} className="btn-primary px-4 py-2 text-sm">
            <Icon name="RotateCcw" className="h-4 w-4" />
            {d.smartRecalcNow}
          </button>
        </div>
      ) : (
        <button type="button" onClick={recalc} className="btn-ghost mb-6 w-full py-3 sm:w-auto">
          <Icon name="RotateCcw" className="h-4 w-4" />
          {d.smartRecalcFromData}
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* السعرات */}
        <Card icon="Flame" title={d.smartCaloriesCard}>
          <NumField lang={ctx.lang} label={d.smartBmr} value={t.bmr} unit={d.unitCalories} onChange={(v) => setT({ bmr: v })} />
          <NumField lang={ctx.lang} label={d.smartTdee} value={t.tdee} unit={d.unitCalories} max={NUM_LIMITS.dailyCalories.max} onChange={(v) => setT({ tdee: v })} />
          <NumField lang={ctx.lang} label={d.smartMaintenance} value={t.maintenanceCalories} unit={d.unitCalories} max={NUM_LIMITS.dailyCalories.max} onChange={(v) => setT({ maintenanceCalories: v })} />
          <NumField lang={ctx.lang} label={d.smartCutting} value={t.cuttingCalories} unit={d.unitCalories} max={NUM_LIMITS.dailyCalories.max} onChange={(v) => setT({ cuttingCalories: v })} />
          <NumField lang={ctx.lang} label={d.smartBulking} value={t.bulkingCalories} unit={d.unitCalories} max={NUM_LIMITS.dailyCalories.max} onChange={(v) => setT({ bulkingCalories: v })} />
        </Card>

        {/* الماكروز */}
        <Card icon="Salad" title={d.smartMacros}>
          <NumField lang={ctx.lang} label={d.smartProtein} value={t.proteinGrams} unit={d.unitG} onChange={(v) => setT({ proteinGrams: v })} />
          <NumField lang={ctx.lang} label={d.smartFat} value={t.fatGrams} unit={d.unitG} onChange={(v) => setT({ fatGrams: v })} />
          <NumField lang={ctx.lang} label={d.smartCarbs} value={t.carbsGrams} unit={d.unitG} onChange={(v) => setT({ carbsGrams: v })} />
        </Card>

        {/* الماء */}
        <Card icon="Droplets" title={d.smartWaterCard}>
          <NumField lang={ctx.lang} label={d.smartDailyWater} value={t.waterLiters} unit={d.unitLiter} step="0.1" onChange={(v) => setT({ waterLiters: v })} />
        </Card>

        {/* الوزن والهدف */}
        <Card icon="Scale" title={d.smartWeightGoalCard}>
          <NumField lang={ctx.lang} label={d.smartBmi} value={t.bmi} step="0.1" onChange={(v) => setT({ bmi: v })} />
          <TextField label={d.smartBmiLabel} value={t.bmiLabel} onChange={(v) => setT({ bmiLabel: v })} />
          <NumField lang={ctx.lang} label={d.smartWeeklyChange} value={t.weeklyWeightChangeKg} unit={d.unitKg} step="0.05" onChange={(v) => setT({ weeklyWeightChangeKg: v })} />
          <NumField lang={ctx.lang} label={d.smartWeeksToGoal} value={t.estimatedWeeksToGoal} unit={d.unitWeeks} onChange={(v) => setT({ estimatedWeeksToGoal: v })} />
        </Card>

        {/* اقتراح التمرين */}
        <Card icon="Dumbbell" title={d.smartTrainingCard} full>
          <TextField label={d.smartSuggestedSplit} value={t.suggestedTrainingSplit} onChange={(v) => setT({ suggestedTrainingSplit: v })} />
          <TextField label={d.smartNotes} value={t.notes} onChange={(v) => setT({ notes: v })} />
        </Card>
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  children,
  full,
}: {
  icon: string
  title: string
  children: ReactNode
  full?: boolean
}) {
  return (
    <div className={`card p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

// text-base (16px) لا text-sm: يمنع تكبير iOS التلقائي عند التركيز على الحقول الرقمية.
const fieldInput =
  'w-28 rounded-lg border border-line bg-beige px-3 py-2 text-base font-bold text-ink-900 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

function NumField({
  label,
  value,
  unit,
  step,
  max,
  lang,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  step?: string
  max?: number
  lang: Lang
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col">
          <NumericInput
            lang={lang}
            decimal
            min={0}
            max={max}
            step={step ?? '1'}
            value={value}
            onChange={onChange}
            className={fieldInput}
          />
        </div>
        {unit && <span className="w-10 text-xs text-ink-400">{unit}</span>}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-ink-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-beige px-3 py-2 text-base text-ink-900 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  )
}
