import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة الهدف الحالي — هدف واحد واضح. */
export function StepGoal({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const suggestions = [d.goalSuggestion1, d.goalSuggestion2, d.goalSuggestion3]
  const { data, updateIdentity } = ctx
  return (
    <div>
      <StepHeader
        icon="Target"
        title={d.goalStepTitle}
        description={d.goalStepDescription}
      />

      <Field label={d.goalStepLabel} hint={d.goalStepHint}>
        <textarea
          className={`${inputClass} min-h-[110px] resize-y text-base`}
          value={data.identity.mainGoal}
          placeholder={d.goalStepPlaceholder}
          onChange={(e) => updateIdentity({ mainGoal: e.target.value })}
        />
      </Field>

      <p className="mt-5 text-xs font-bold text-ink-500">{d.goalStepSuggestionsIntro}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateIdentity({ mainGoal: s })}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-700 transition-colors hover:border-primary-soft hover:text-primary-c"
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs text-ink-400">{d.goalStepEditLater}</p>
    </div>
  )
}
