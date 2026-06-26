import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import type { Profile } from '@/types/profile'
import {
  activityOptions,
  environmentOptions,
  genderOptions,
  goalOptions,
  trainingLevelOptions,
} from '@/lib/calculators'

/** خطوة بيانات الجسم — أساس الحسابات الذكية. */
export function StepBody({ ctx }: { ctx: WizardCtx }) {
  const p = ctx.data.profile
  const set = (partial: Partial<Profile>) => ctx.update({ profile: { ...p, ...partial } })
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
        <Field label="العمر" hint="بالسنوات">
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
    </div>
  )
}
