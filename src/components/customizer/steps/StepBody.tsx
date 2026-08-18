import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { NumericInput } from '@/components/NumericInput'
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
  isMinorAge,
  profileHash,
  trainingLevelOptions,
} from '@/lib/calculators'
import { LIMITS, validateProfile } from '@/lib/validation'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

/** خطوة بياناتك — جسم + هدف + تمرين، مع تحقّق من القيم. */
export function StepBody({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const choices = profileChoiceStrings[ctx.lang]
  const p = ctx.data.profile
  const manual = ctx.data.targetsMeta.manuallyEdited
  // رسالة الحدّ بلغة الشاشة: كانت عربية دائمًا فتظهر عربية داخل واجهة إنجليزية.
  const errors = validateProfile(p, ctx.lang)
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
  // القاصرون (دون 18): «المحافظة» فقط — تنشيف/تضخيم معطّلان (قرار المالك، Option B).
  const minor = isMinorAge(p.age)
  const isWeightGoal = (g: Profile['goalType']) => g === 'cutting' || g === 'bulking'
  const setGoal = (goalType: Profile['goalType']) => {
    if (minor && isWeightGoal(goalType)) return // حارس دفاعي: الأزرار معطّلة أصلًا
    set({ goalType, goal: calorieGoalFromGoalType(goalType) })
  }
  // عند إدخال عمر قاصر بينما الهدف تنشيف/تضخيم: نُثبّت الهدف على المحافظة فورًا (تماسك الاختيار).
  const setAge = (age: number) =>
    isMinorAge(age) && isWeightGoal(p.goalType)
      ? set({ age, goalType: 'maintenance', goal: 'maintain' })
      : set({ age })

  return (
    <div>
      <StepHeader
        icon="Ruler"
        title={d.bodyTitle}
        description={d.bodyDescription}
      />

      {/* الهدف — اختيارات (القاصرون: المحافظة فقط، تنشيف/تضخيم معطّلان) */}
      <p className="mb-2 text-sm font-bold text-ink-900">{d.bodyGoalLabel}</p>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {goalTypeOptions.map((o) => {
          const selected = p.goalType === o.value
          const disabled = minor && isWeightGoal(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setGoal(o.value)}
              disabled={disabled}
              aria-disabled={disabled}
              aria-describedby={disabled ? 'goal-minor-note' : undefined}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors',
                disabled
                  // حالة معطّلة بتباين AA فعلي (نصّ ink-500 على بيج ≈ 5.06:1). لا opacity
                  // حتى لا ينهار التباين عند المزج مع الخلفية.
                  ? 'cursor-not-allowed border-line bg-beige text-ink-500'
                  : selected
                    ? 'border-primary-soft bg-primary text-white'
                    : 'border-line bg-surface text-ink-700 hover:bg-beige',
              )}
            >
              {choices.goal[o.value]}
            </button>
          )
        })}
      </div>
      {minor && (
        <p id="goal-minor-note" className="mb-6 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs font-bold text-ink-700">
          <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {choices.minorGoalNote}
        </p>
      )}
      {!minor && <div className="mb-6" />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={d.bodyGender}>
          <select className={inputClass} value={p.gender} onChange={(e) => set({ gender: e.target.value as Profile['gender'] })}>
            {genderOptions.map((o) => <option key={o.value} value={o.value}>{choices.gender[o.value]}</option>)}
          </select>
        </Field>
        <Field label={d.bodyAge} hint={errFor('age') ?? d.bodyAgeHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.age}
            onChange={(v) => setAge(v)}
            min={LIMITS.age.min}
            max={LIMITS.age.max}
            className={cn(inputClass, errFor('age') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyHeight} hint={errFor('heightCm') ?? d.bodyHeightHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.heightCm}
            onChange={(v) => set({ heightCm: v })}
            min={LIMITS.heightCm.min}
            max={LIMITS.heightCm.max}
            decimal
            className={cn(inputClass, errFor('heightCm') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyWeight} hint={errFor('weightKg') ?? d.bodyWeightHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.weightKg}
            onChange={(v) => set({ weightKg: v })}
            min={LIMITS.weightKg.min}
            max={LIMITS.weightKg.max}
            decimal
            className={cn(inputClass, errFor('weightKg') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyTargetWeight} hint={errFor('targetWeightKg') ?? d.bodyTargetWeightHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.targetWeightKg}
            onChange={(v) => set({ targetWeightKg: v })}
            min={LIMITS.targetWeightKg.min}
            max={LIMITS.targetWeightKg.max}
            decimal
            className={cn(inputClass, errFor('targetWeightKg') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyActivityLevel}>
          <select className={inputClass} value={p.activityLevel} onChange={(e) => set({ activityLevel: e.target.value as Profile['activityLevel'] })}>
            {activityOptions.map((o) => <option key={o.value} value={o.value}>{choices.activity[o.value]}</option>)}
          </select>
        </Field>
        <Field label={d.bodyTrainingLevel}>
          <select className={inputClass} value={p.trainingLevel} onChange={(e) => set({ trainingLevel: e.target.value as Profile['trainingLevel'] })}>
            {trainingLevelOptions.map((o) => <option key={o.value} value={o.value}>{choices.trainingLevel[o.value]}</option>)}
          </select>
        </Field>
        <Field label={d.bodyTrainingDays} hint={errFor('trainingDays') ?? d.bodyTrainingDaysHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.trainingDays}
            onChange={(v) => set({ trainingDays: v })}
            min={LIMITS.trainingDays.min}
            max={LIMITS.trainingDays.max}
            className={cn(inputClass, errFor('trainingDays') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyWorkoutDuration} hint={errFor('workoutDuration') ?? d.bodyWorkoutDurationHint}>
          <NumericInput
            lang={ctx.lang}
            value={p.workoutDuration}
            onChange={(v) => set({ workoutDuration: v })}
            min={LIMITS.workoutDuration.min}
            max={LIMITS.workoutDuration.max}
            className={cn(inputClass, errFor('workoutDuration') && 'border-danger')}
          />
        </Field>
        <Field label={d.bodyWorkoutEnvironment}>
          <select className={inputClass} value={p.workoutEnvironment} onChange={(e) => set({ workoutEnvironment: e.target.value as Profile['workoutEnvironment'] })}>
            {environmentOptions.map((o) => <option key={o.value} value={o.value}>{choices.environment[o.value]}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={d.bodyInjuries} hint={d.bodyInjuriesHint}>
            <input className={inputClass} value={p.injuries} placeholder={d.bodyInjuriesPlaceholder} onChange={(e) => set({ injuries: e.target.value })} />
          </Field>
        </div>
      </div>

      {errors.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs font-bold text-danger">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0" />
          {d.bodyErrorHint}
        </p>
      )}

      {/* معاينة حيّة */}
      <div className="mt-6 rounded-2xl border border-primary-soft bg-primary-soft p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon name="BarChart3" className="h-4 w-4 text-primary-c" />
          {d.bodyCalcIntro}
        </div>
        {/*
          [CTO-65] البند ٣ — كان هذا الحقل يحمل تسمية «سعرات الهدف» ويعرض
          `maintenanceCalories` (سعرات الصيانة/TDEE). فالمستخدم المُنشِّف يرى على
          اللوحة ٢٬٢٤٥ ثم يفتح «تعديل خطتي» فيرى ٢٬٦٤٥ — والفارق **بالضبط**
          `CUT_DEFICIT` (٤٠٠). قِيس قبل الإصلاح: لا شيء يُعاد حسابه ولا يُكتب —
          الخلل تسمية على قيمة، لا تعديل صامت. البروتين والماء بجانبه كانا
          يعرضان قيم الهدف أصلًا، فكانت السعرات وحدها خارج السرب.
        */}
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <LivePreview label={d.bodyTargetCalories} value={`${ctx.data.targets.targetCalories}`} unit={d.unitCalories} />
          <LivePreview label={d.bodyProtein} value={`${ctx.data.targets.proteinGrams}`} unit={d.unitG} />
          <LivePreview label={d.bodyWater} value={`${ctx.data.targets.waterLiters}`} unit={d.unitLiter} />
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
