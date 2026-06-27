import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { WizardCtx } from '../stepProps'
import type { Profile } from '@/types/profile'
import {
  activityOptions,
  calorieGoalFromGoalType,
  computeTargets,
  environmentOptions,
  genderOptions,
  goalTypeOptions,
  profileHash,
  trainingLevelOptions,
} from '@/lib/calculators'
import { LIMITS, validateProfile } from '@/lib/validation'

/** خطوة بياناتك — جسم + هدف + تمرين، مع تحقّق من القيم. */
export function StepBody({ ctx }: { ctx: WizardCtx }) {
  const p = ctx.data.profile
  const manual = ctx.data.targetsMeta.manuallyEdited
  const errors = validateProfile(p)
  const errFor = (f: string) => errors.find((e) => e.field === (f as (typeof errors)[number]['field']))?.message

  // عند تغيّر الملف: إن لم تُعدَّل الحسابات يدويًا، أعد حسابها تلقائيًا
  const set = (partial: Partial<Profile>) => {
    const next: Profile = { ...p, ...partial }
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
  const setGoal = (goalType: Profile['goalType']) => set({ goalType, goal: calorieGoalFromGoalType(goalType) })
  const num = (v: string) => Number(v) || 0

  return (
    <div>
      <StepHeader
        icon="Ruler"
        title="بياناتك"
        description="جاوب على بياناتك وهدفك، وقِمّة بتجهّز خطتك تلقائيًا. تقدر تعدّل أي شي لاحقًا."
      />

      {/* الهدف — اختيارات */}
      <p className="mb-2 text-sm font-bold text-ink-900">هدفك</p>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {goalTypeOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setGoal(o.value)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors',
              p.goalType === o.value ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700 hover:bg-beige',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="الجنس">
          <select className={inputClass} value={p.gender} onChange={(e) => set({ gender: e.target.value as Profile['gender'] })}>
            {genderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="العمر" hint={errFor('age') ?? 'سنة (12–90)'}>
          <input type="number" min={LIMITS.age.min} max={LIMITS.age.max} className={cn(inputClass, errFor('age') && 'border-danger')} value={p.age} onChange={(e) => set({ age: num(e.target.value) })} />
        </Field>
        <Field label="الطول" hint={errFor('heightCm') ?? 'سم (100–230)'}>
          <input type="number" min={LIMITS.heightCm.min} max={LIMITS.heightCm.max} className={cn(inputClass, errFor('heightCm') && 'border-danger')} value={p.heightCm} onChange={(e) => set({ heightCm: num(e.target.value) })} />
        </Field>
        <Field label="الوزن الحالي" hint={errFor('weightKg') ?? 'كجم (15–250)'}>
          <input type="number" min={LIMITS.weightKg.min} max={LIMITS.weightKg.max} className={cn(inputClass, errFor('weightKg') && 'border-danger')} value={p.weightKg} onChange={(e) => set({ weightKg: num(e.target.value) })} />
        </Field>
        <Field label="الوزن الهدف" hint={errFor('targetWeightKg') ?? 'كجم (15–250)'}>
          <input type="number" min={LIMITS.targetWeightKg.min} max={LIMITS.targetWeightKg.max} className={cn(inputClass, errFor('targetWeightKg') && 'border-danger')} value={p.targetWeightKg} onChange={(e) => set({ targetWeightKg: num(e.target.value) })} />
        </Field>
        <Field label="مستوى النشاط">
          <select className={inputClass} value={p.activityLevel} onChange={(e) => set({ activityLevel: e.target.value as Profile['activityLevel'] })}>
            {activityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="مستوى التمرين">
          <select className={inputClass} value={p.trainingLevel} onChange={(e) => set({ trainingLevel: e.target.value as Profile['trainingLevel'] })}>
            {trainingLevelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="أيام التمرين بالأسبوع" hint={errFor('trainingDays') ?? '1–7'}>
          <input type="number" min={LIMITS.trainingDays.min} max={LIMITS.trainingDays.max} className={cn(inputClass, errFor('trainingDays') && 'border-danger')} value={p.trainingDays} onChange={(e) => set({ trainingDays: num(e.target.value) })} />
        </Field>
        <Field label="مدة التمرين" hint={errFor('workoutDuration') ?? 'دقيقة (20–150)'}>
          <input type="number" min={LIMITS.workoutDuration.min} max={LIMITS.workoutDuration.max} className={cn(inputClass, errFor('workoutDuration') && 'border-danger')} value={p.workoutDuration} onChange={(e) => set({ workoutDuration: num(e.target.value) })} />
        </Field>
        <Field label="مكان التمرين">
          <select className={inputClass} value={p.workoutEnvironment} onChange={(e) => set({ workoutEnvironment: e.target.value as Profile['workoutEnvironment'] })}>
            {environmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="إصابات (اختياري)" hint="أي إصابة تحب تنتبه لها">
            <input className={inputClass} value={p.injuries} placeholder="مثال: ألم أسفل الظهر" onChange={(e) => set({ injuries: e.target.value })} />
          </Field>
        </div>
      </div>

      {errors.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs font-bold text-danger">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0" />
          صحّح القيم المظلّلة بالأحمر للمتابعة.
        </p>
      )}

      {/* معاينة حيّة */}
      <div className="mt-6 rounded-2xl border border-primary-soft bg-primary-soft p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon name="BarChart3" className="h-4 w-4 text-primary-c" />
          قِمّة بتحسب أهدافك من هذه البيانات:
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
