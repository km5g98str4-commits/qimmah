import { Icon } from '@/components/Icon'
import { StepHeader } from '../StepHeader'
import { Field, inputClass } from '../Field'
import type { WizardCtx } from '../stepProps'

const points = [
  { icon: 'Sparkles', text: 'تقدر تعدل كل شيء لاحقًا' },
  { icon: 'CheckCircle2', text: 'لا تحتاج معرفة تقنية' },
  { icon: 'ShieldCheck', text: 'كل شيء محفوظ على جهازك' },
]

/** خطوة الترحيب — تمهيد ودّي + إدخال الاسم (مطلوب للبدء). */
export function StepWelcome({ ctx }: { ctx: WizardCtx }) {
  const { data, updateIdentity } = ctx
  const name = data.identity.userName.trim()
  return (
    <div>
      <StepHeader
        icon="Sparkles"
        title={name ? `أهلاً ${name} 👋` : 'أهلاً بك في قِمّة 👋'}
        description="بنجهّز تطبيقك الشخصي خطوة بخطوة. بس جاوب على أسئلة بسيطة، وتقدر ترجع تعدّل أي شي وقت ما تبي."
      />

      <div className="mb-5">
        <Field label="اسمك" hint="يظهر في صفحتك وفي ترحيب «اليوم» — مطلوب للبدء">
          <input
            className={inputClass}
            value={data.identity.userName}
            placeholder="مثال: زياد"
            autoFocus
            onChange={(e) => updateIdentity({ userName: e.target.value })}
          />
        </Field>
        {!name && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger">
            <Icon name="AlertTriangle" className="h-3.5 w-3.5" />
            اكتب اسمك للمتابعة.
          </p>
        )}
      </div>

      <p className="mb-5 rounded-xl border border-primary-soft bg-primary-soft p-4 text-sm font-bold text-ink-900">
        سنجهّز صفحتك لأول مرة. تقدر تعدل كل شيء لاحقًا.
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
        كل ما تكمل خطوة، تشوف معاينة صفحتك تتحدّث على طول. جاهز؟ اضغط «التالي» نبدأ.
      </p>
    </div>
  )
}
