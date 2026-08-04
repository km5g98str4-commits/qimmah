import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { resetQimmah } from '@/lib/resetQimmah'
import { targetCaloriesFor } from '@/lib/calculators'
import { planTitle } from '@/lib/planGenerator'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

/** خطوة المراجعة والحفظ — ملخّص الخطة + منطقة متقدمة. */
export function StepReview({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const choices = profileChoiceStrings[ctx.lang]
  const { data } = ctx
  const [advanced, setAdvanced] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const summary: { label: string; value: string }[] = [
    { label: d.reviewName, value: data.identity.userName },
    { label: d.reviewGoal, value: choices.goal[data.profile.goalType] },
    { label: d.reviewWeight, value: `${data.profile.weightKg} → ${data.profile.targetWeightKg} ${d.unitKg}` },
    { label: d.reviewTargetCalories, value: `${targetCaloriesFor(data.profile.goal, data.targets)}` },
    { label: d.reviewProtein, value: `${data.targets.proteinGrams}${d.gGram}` },
    { label: d.reviewSchedule, value: planTitle(data.workoutPlan.templateId, ctx.lang) },
    { label: d.reviewMeals, value: `${data.nutritionPlan.meals.length}` },
    { label: d.reviewSuppMed, value: `${data.wellnessPlan.supplements.length + data.wellnessPlan.medications.length}` },
    { label: d.reviewMeasurements, value: `${data.measurementPlan.selectedTypeIds.length}` },
  ]

  return (
    <div>
      <StepHeader
        icon="CheckCircle2"
        title={d.reviewTitle}
        description={d.reviewDescription}
      />

      <div className="rounded-2xl border border-line bg-page p-5">
        <p className="text-sm font-bold text-ink-900">{data.identity.mainGoal}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[11px] text-ink-400">{s.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-ink-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
        <Icon name="ShieldCheck" className="h-4 w-4 text-primary-c" />
        {d.reviewEditLater}
      </p>

      {/* منطقة متقدمة */}
      <div className="mt-6 rounded-2xl border border-line">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-sm font-bold text-ink-700"
        >
          <span className="flex items-center gap-2">
            <Icon name="Layers" className="h-4 w-4 text-ink-500" />
            {d.reviewAdvancedOptions}
          </span>
          <Icon
            name="ChevronLeft"
            className={`h-4 w-4 text-ink-400 transition-transform ${advanced ? '-rotate-90' : 'rotate-0'}`}
          />
        </button>

        {advanced && (
          <div className="space-y-3 border-t border-line p-4">
            <p className="text-xs leading-relaxed text-ink-500">
              {d.reviewAdvancedIntro}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={ctx.onExport} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="TrendingDown" className="h-4 w-4" />
                {d.reviewBackup}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Icon name="TrendingUp" className="h-4 w-4" />
                {d.reviewRestore}
              </button>
              <button type="button" onClick={ctx.onReset} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="RotateCcw" className="h-4 w-4" />
                {d.reviewResetBasic}
              </button>
              <button
                type="button"
                onClick={ctx.onRestartOnboarding}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Icon name="Sparkles" className="h-4 w-4" />
                {d.reviewRestartOnboarding}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) ctx.onImportFile(f)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-[11px] text-ink-400">
              {d.reviewRestartOnboardingNote}
            </p>

            {/* إعادة ضبط كاملة (خطر) */}
            <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(d.reviewFullResetConfirm)) {
                    resetQimmah()
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-danger"
              >
                <Icon name="RotateCcw" className="h-3.5 w-3.5" />
                {d.reviewFullReset}
              </button>
              <p className="mt-1 text-[11px] text-ink-400">{d.reviewFullResetNote}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
