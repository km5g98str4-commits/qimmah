import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'

const suggestions = [
  'الوصول إلى 78 كجم وزيادة الكتلة العضلية خلال 12 أسبوعًا',
  'إنقاص نسبة الدهون والثبات على روتين تمرين 4 أيام بالأسبوع',
  'بناء قوة في تمارين الضغط والسحب مع أكل صحي منتظم',
]

/** خطوة الهدف الحالي — هدف واحد واضح. */
export function StepGoal({ ctx }: { ctx: WizardCtx }) {
  const { data, updateIdentity } = ctx
  return (
    <div>
      <StepHeader
        icon="Target"
        title="هدفي الحالي"
        description="اكتب هدف واحد واضح تشتغل عليه. هذا اللي بيظهر كبير في صفحتك ويذكّرك كل يوم."
      />

      <Field label="هدفك" hint="جملة بسيطة بلغتك أنت">
        <textarea
          className={`${inputClass} min-h-[110px] resize-y text-base`}
          value={data.identity.mainGoal}
          placeholder="مثال: أوصل وزن 78 كجم وأبني عضلاتي خلال 3 أشهر"
          onChange={(e) => updateIdentity({ mainGoal: e.target.value })}
        />
      </Field>

      <p className="mt-5 text-xs font-bold text-ink-500">أفكار تساعدك (اضغط لتختار):</p>
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

      <p className="mt-6 text-xs text-ink-400">تقدر تعدل كل شيء لاحقًا.</p>
    </div>
  )
}
