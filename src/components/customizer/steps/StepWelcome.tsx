import { Icon } from '@/components/Icon'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'

const points = [
  { icon: 'Sparkles', text: 'تقدر تعدل كل شيء لاحقًا' },
  { icon: 'CheckCircle2', text: 'لا تحتاج معرفة تقنية' },
  { icon: 'ShieldCheck', text: 'كل شيء محفوظ على جهازك' },
]

/** خطوة الترحيب — تمهيد ودّي قبل البدء. */
export function StepWelcome({ ctx }: { ctx: WizardCtx }) {
  return (
    <div>
      <StepHeader
        icon="Sparkles"
        title={`أهلاً ${ctx.data.identity.userName} 👋`}
        description="بنجهّز صفحتك الشخصية خطوة بخطوة. بس جاوب على أسئلة بسيطة، وتقدر ترجع تعدّل أي شي وقت ما تبي."
      />

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
