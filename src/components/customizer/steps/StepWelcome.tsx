import { Icon } from '@/components/Icon'
import { StepHeader } from '../StepHeader'
import { Field, inputClass } from '../Field'
import type { WizardCtx } from '../stepProps'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة الترحيب — تمهيد ودّي + إدخال الاسم (مطلوب للبدء). */
export function StepWelcome({ ctx }: { ctx: WizardCtx }) {
  const { data, updateIdentity } = ctx
  const d = onboardingStrings[ctx.lang]
  const points = [
    { icon: 'Sparkles', text: d.welcomePoint1 },
    { icon: 'CheckCircle2', text: d.welcomePoint2 },
    { icon: 'ShieldCheck', text: d.welcomePoint3 },
  ]
  const name = data.identity.userName.trim()
  return (
    <div>
      <StepHeader
        icon="Sparkles"
        title={name ? `${d.welcomeHelloNamed} ${name} 👋` : d.welcomeHelloGuest}
        description={d.welcomeDescription}
      />

      <div className="mb-5">
        <Field label={d.welcomeNameLabel} hint={d.welcomeNameHint}>
          <input
            className={inputClass}
            value={data.identity.userName}
            placeholder={d.welcomeNamePlaceholder}
            autoFocus
            onChange={(e) => updateIdentity({ userName: e.target.value })}
          />
        </Field>
        {!name && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger">
            <Icon name="AlertTriangle" className="h-3.5 w-3.5" />
            {d.welcomeNameRequired}
          </p>
        )}
      </div>

      <p className="mb-5 rounded-xl border border-primary-soft bg-primary-soft p-4 text-sm font-bold text-ink-900">
        {d.welcomeFirstTime}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.text} className="card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-c">
              <Icon name={p.icon} className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-ink-900">{p.text}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-line bg-page p-4 text-sm leading-relaxed text-ink-500">
        {d.welcomeLivePreviewNote}
      </p>
    </div>
  )
}
