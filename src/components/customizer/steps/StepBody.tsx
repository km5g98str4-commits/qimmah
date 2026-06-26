import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { Profile } from '@/types/profile'
import {
  activityOptions,
  computeTargets,
  environmentOptions,
  genderOptions,
  goalOptions,
  profileHash,
  trainingLevelOptions,
} from '@/lib/calculators'

/** خطوة بيانات الجسم — أساس الحسابات الذكية. */
export function StepBody({ ctx }: { ctx: WizardCtx }) {
  const p = ctx.data.profile
  const manual = ctx.data.targetsMeta.manuallyEdited
  // عند تغيّر الملف: إن لم تُعدَّل الحسابات يدويًا، أعد حسابها تلقائيًا (تفاعلية حيّة)
  const set = (partial: Partial<Profile>) => {
    const next = { ...p, ...partial }
    if (manual) {
      ctx.update({ profile: next })
    } else {
      ctx.update({
        profile: next,
        targets: computeTargets(next),
        targetsMeta: { ...ctx.data.targetsMeta, lastCalculatedFromProfileHash: profileHash(next) },
      })
    }
  }
  const num = (v: string) => Number(v) || 0

  return (
    <div>
      <StepHeader
        icon="Ruler"
        title="بيانات الجسم"
        description="هذي البيانات يبني عليها قِمّة حساباتك. كلها تقديرية وتقدر تعدّلها وقت ما تبي."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="الجنس">
          <select className={inputClass} value={p.gender} onChange={(e) => set({ gender: e.target.value as Profile['gender'] })}>
            {genderOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="العمر" hint="سنة">
          <input type="number" className={inputClass} value={p.age} onChange={(e) => set({ age: num(e.target.value) })} />
        </Field>
        <Field label="الطول" hint="سم">
          <input type="number" className={inputClass} value={p.heightCm} onChange={(e) => set({ heightCm: num(e.target.value) })} />
        </Field>
        <Field label="الوزن الحالي" hint="كجم">
          <input type="number" className={inputClass} value={p.weightKg} onChange={(e) => set({ weightKg: num(e.target.value) })} />
        </Field>
        <Field label="الوزن الهدف" hint="كجم">
          <input type="number" className={inputClass} value={p.targetWeightKg} onChange={(e) => set({ targetWeightKg: num(e.target.value) })} />
        </Field>
        <Field label="مستوى النشاط">
          <select className={inputClass} value={p.activityLevel} onChange={(e) => set({ activityLevel: e.target.value as Profile['activityLevel'] })}>
            {activityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="مستوى التمرين">
          <select className={inputClass} value={p.trainingLevel} onChange={(e) => set({ trainingLevel: e.target.value as Profile['trainingLevel'] })}>
            {trainingLevelOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="هدفك">
          <select className={inputClass} value={p.goal} onChange={(e) => set({ goal: e.target.value as Profile['goal'] })}>
            {goalOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="أيام التمرين بالأسبوع">
          <input type="number" min={1} max={7} className={inputClass} value={p.trainingDays} onChange={(e) => set({ trainingDays: num(e.target.value) })} />
        </Field>
        <Field label="مكان التمرين">
          <select className={inputClass} value={p.workoutEnvironment} onChange={(e) => set({ workoutEnvironment: e.target.value as Profile['workoutEnvironment'] })}>
            {environmentOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="إصابات (اختياري)" hint="أي إصابة تحب تنتبه لها">
            <input className={inputClass} value={p.injuries} placeholder="مثال: ألم أسفل الظهر" onChange={(e) => set({ injuries: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="ملاحظات صحية (اختياري)">
            <textarea className={`${inputClass} min-h-[72px] resize-y`} value={p.healthNotes} onChange={(e) => set({ healthNotes: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* معاينة حيّة للحسابات — تتحدّث مع تغيير بياناتك */}
      <div className="mt-6 rounded-2xl border border-primary-soft bg-primary-soft p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon name="BarChart3" className="h-4 w-4 text-primary-c" />
          {manual ? 'حساباتك مُعدّلة يدويًا — لن تتغيّر تلقائيًا مع البيانات.' : 'الحسابات تتحدّث تلقائيًا مع تغيير بياناتك:'}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <LivePreview label="سعرات الهدف" value={`${ctx.data.targets.maintenanceCalories}`} unit="سعرة" />
          <LivePreview label="البروتين" value={`${ctx.data.targets.proteinGrams}`} unit="غ" />
          <LivePreview label="الماء" value={`${ctx.data.targets.waterLiters}`} unit="لتر" />
        </div>
      </div>
    </div>
  )
}

function LivePreview({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-lg font-black text-ink-900">{value} <span className="text-xs font-bold text-ink-400">{unit}</span></p>
      <p className="text-[10px] text-ink-500">{label}</p>
    </div>
  )
}
