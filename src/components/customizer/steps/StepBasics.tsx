import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { userTypeOptions, type Customization } from '@/lib/customization'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

/** خطوة البيانات الأساسية — الاسم، اسم الخطة، الوصف، والنوع. */
export function StepBasics({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const choices = profileChoiceStrings[ctx.lang]
  const { data, updateIdentity } = ctx
  return (
    <div>
      <StepHeader
        icon="Users"
        title={d.basicsTitle}
        description={d.basicsDescription}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={d.basicsNameLabel} hint={d.basicsNameHint}>
          <input
            className={inputClass}
            value={data.identity.userName}
            placeholder={d.basicsNamePlaceholder}
            onChange={(e) => updateIdentity({ userName: e.target.value })}
          />
        </Field>
        <Field label={d.basicsBrandLabel} hint={d.basicsBrandHint}>
          <input
            className={inputClass}
            value={data.identity.brandName}
            placeholder={d.basicsBrandPlaceholder}
            onChange={(e) => updateIdentity({ brandName: e.target.value })}
          />
        </Field>
        <Field label={d.basicsTaglineLabel} hint={d.basicsTaglineHint}>
          <input
            className={inputClass}
            value={data.identity.tagline}
            placeholder={d.basicsTaglinePlaceholder}
            onChange={(e) => updateIdentity({ tagline: e.target.value })}
          />
        </Field>
        <Field label={d.basicsUserType}>
          <select
            className={inputClass}
            value={data.identity.userType}
            onChange={(e) =>
              updateIdentity({ userType: e.target.value as Customization['identity']['userType'] })
            }
          >
            {userTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {choices.userType[o.value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}
