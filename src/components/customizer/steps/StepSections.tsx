import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { SectionVisibility } from '@/lib/customization'
import { onboardingStrings, type OnboardingStrings } from '@/i18n/dict/onboarding'

const items: { key: keyof SectionVisibility; labelKey: keyof OnboardingStrings; hintKey: keyof OnboardingStrings; icon: string }[] = [
  { key: 'today', labelKey: 'secToday', hintKey: 'secTodayHint', icon: 'Flame' },
  { key: 'workouts', labelKey: 'secWorkouts', hintKey: 'secWorkoutsHint', icon: 'Dumbbell' },
  { key: 'meals', labelKey: 'secMeals', hintKey: 'secMealsHint', icon: 'Salad' },
  { key: 'supplements', labelKey: 'secSupplements', hintKey: 'secSupplementsHint', icon: 'Pill' },
  { key: 'medications', labelKey: 'secMedications', hintKey: 'secMedicationsHint', icon: 'Pill' },
  { key: 'measurements', labelKey: 'secMeasurements', hintKey: 'secMeasurementsHint', icon: 'Ruler' },
  { key: 'commitments', labelKey: 'secCommitments', hintKey: 'secCommitmentsHint', icon: 'CheckCircle2' },
  { key: 'notes', labelKey: 'secNotes', hintKey: 'secNotesHint', icon: 'ShieldCheck' },
]

/** خطوة اختيار الأقسام التي تظهر في الصفحة. */
export function StepSections({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const { data, update } = ctx
  const sections = data.sections

  const toggle = (key: keyof SectionVisibility) =>
    update({ sections: { ...sections, [key]: !sections[key] } })

  return (
    <div>
      <StepHeader
        icon="Layers"
        title={d.secTitle}
        description={d.secDescription}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const on = sections[it.key]
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => toggle(it.key)}
              aria-pressed={on}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-start transition-all ${
                on ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige'
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  on ? 'bg-primary text-white' : 'bg-beige text-ink-400'
                }`}
              >
                <Icon name={it.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{d[it.labelKey]}</span>
                <span className="block truncate text-xs text-ink-500">{d[it.hintKey]}</span>
              </span>
              {/* مفتاح تشغيل/إيقاف */}
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  on ? 'bg-primary' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${
                    on ? 'start-0.5' : 'end-0.5'
                  }`}
                />
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-xs text-ink-400">{d.secAlwaysVisible}</p>
    </div>
  )
}
