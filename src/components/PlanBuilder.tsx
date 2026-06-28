import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { type Customization } from '@/lib/customization'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted, saveDraft, loadDraft, setLastStep } from '@/lib/onboarding'
import { calorieGoalFromGoalType, profileHash } from '@/lib/calculators'
import {
  deriveActivityLevel,
  deriveTargetWeight,
  generatePlan,
  levelFromExperience,
} from '@/lib/planGenerator'
import type {
  Consistency,
  ExperienceLevel,
  Gender,
  GymType,
  Profile,
} from '@/types/profile'
import {
  consistencyChoices,
  experienceChoices,
  experienceToBand,
  genderChoices,
  gymTypeChoices,
  gymTypeToAccess,
  goalChoices,
  recommendedDaysFor,
} from '@/data/planBuilder'
import type { GoalValue } from '@/data/planBuilder'

interface PlanBuilderProps {
  /** يُستدعى بعد حفظ الخطة وتعليم الإكمال (دخول اللوحة). */
  onComplete: () => void
  /** يُستدعى عند الخروج من أول خطوة (رجوع للبداية). */
  onExit: () => void
}

// حدود الإعداد (إدخال مرئي بمنزلقات — لا نص حر).
const BOUNDS = {
  age: { min: 14, max: 80 },
  height: { min: 120, max: 220 },
  weight: { min: 30, max: 250 },
  days: { min: 3, max: 6 },
}

interface Answers {
  goalValue?: GoalValue
  gender?: Gender
  age: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  /** هل لمس المستخدم منزلق وزن الهدف (لمنع إعادة التهيئة فوق اختياره). */
  targetTouched: boolean
  experienceLevel?: ExperienceLevel
  consistency?: Consistency
  gymType?: GymType
  trainingDays: number
  /** هل لمس المستخدم عدّاد الأيام (لمنع إعادة التهيئة فوق اختياره). */
  daysTouched: boolean
}

const defaultAnswers: Answers = {
  age: 25,
  heightCm: 170,
  weightKg: 75,
  targetWeightKg: 70,
  targetTouched: false,
  trainingDays: 3,
  daysTouched: false,
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** BMI رقمي فقط — بلا أي حكم قيمي أو تشخيص طبي. */
function bmiOf(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}

const isBeginnerLevel = (l?: ExperienceLevel) => l === 'beginner'

/** خطأ خطوة الوزن: الهدف يتبع منطق الهدف (تنشيف أقل / تضخيم أعلى). */
function weightStepError(a: Answers): string | undefined {
  if (a.goalValue === 'cut' && !(a.targetWeightKg < a.weightKg))
    return 'وزن الهدف للتنشيف لازم يكون أقل من وزنك الحالي.'
  if (a.goalValue === 'bulk' && !(a.targetWeightKg > a.weightKg))
    return 'وزن الهدف للتضخيم لازم يكون أعلى من وزنك الحالي.'
  return undefined
}

const showsTargetWeight = (g?: GoalValue) => g === 'cut' || g === 'bulk'

/** يبني ملفًا شخصيًا من إجابات الإعداد (مصدر الحقيقة الوحيد). */
function buildProfile(a: Answers, base: Profile): Profile {
  const goal = goalChoices.find((g) => g.value === a.goalValue)
  const goalType = goal?.goalType ?? 'recomposition'
  const band = a.experienceLevel ? experienceToBand(a.experienceLevel) : undefined
  const trainingLevel = levelFromExperience(band)
  const weightKg = a.weightKg || base.weightKg
  const gymType = a.gymType ?? 'commercial'
  const gymAccess = gymTypeToAccess(gymType)
  // المبتدئ: انتظامه يُخزَّن «new» (never) تلقائيًا ولا يُسأل عنه.
  const consistency: Consistency = isBeginnerLevel(a.experienceLevel)
    ? 'never'
    : a.consistency ?? 'regular'
  const targetWeightKg = showsTargetWeight(a.goalValue)
    ? a.targetWeightKg
    : deriveTargetWeight(weightKg, goalType)
  return {
    ...base,
    name: '', // لا اسم في الإعداد — لا أسماء وهمية، واللوحة تعمل بدونه.
    gender: a.gender ?? 'unspecified',
    age: a.age || base.age,
    heightCm: a.heightCm || base.heightCm,
    weightKg,
    targetWeightKg,
    activityLevel: deriveActivityLevel(a.trainingDays),
    trainingLevel,
    goalType,
    goal: 'maintain', // يُضبط حسب goalType عند الحفظ/التوليد
    trainingDays: a.trainingDays,
    workoutDuration: 60,
    workoutEnvironment: gymAccess === 'home' || gymAccess === 'bodyweight' ? 'home' : 'gym',
    muscleFocus: 'balanced',
    consistency,
    experienceBand: band,
    experienceLevel: a.experienceLevel,
    gymAccess,
    gymType,
    equipment: [],
    schedulingStyle: 'flexible',
    preferredDays: [],
    remindersOptIn: false,
  }
}

// goal المتوافق مع الحاسبة.
function calorieGoalForStore(p: Profile) {
  return calorieGoalFromGoalType(p.goalType)
}

/** يبني نسخة التخصيص الكاملة الجاهزة للحفظ — بلا بيانات وهمية مزروعة. */
function buildCustomization(a: Answers, current: Customization): Customization {
  const profile = buildProfile(a, current.profile)
  const g = generatePlan(profile)
  const goal = goalChoices.find((x) => x.value === a.goalValue)
  return {
    ...current,
    identity: {
      ...current.identity,
      userName: profile.name, // '' — لا اسم وهمي
      mainGoal: goal?.label ?? current.identity.mainGoal,
    },
    profile: { ...profile, goal: calorieGoalForStore(profile) },
    targets: g.targets,
    targetsMeta: {
      manuallyEdited: false,
      lastCalculatedFromProfileHash: profileHash(profile),
      updatedAt: new Date().toISOString(),
    },
    workoutPlan: g.workoutPlan,
    nutritionPlan: g.nutritionPlan,
    commitmentPlan: g.commitmentPlan,
    measurementPlan: g.measurementPlan,
    routine: g.weeklySchedule,
    // مصدر الحقيقة = إجابات الإعداد فقط — صفّر أي بيانات مزروعة (مكملات/أدوية/وجبات/تمارين).
    wellnessPlan: { enabled: true, supplements: [], medications: [] },
    workouts: [],
    supplements: [],
    meals: [],
    metrics: [],
  }
}

/** الإعداد الذكي — تسع خطوات، شاشة واحدة لكل خطوة (جوال داكن، RTL). */
export function PlanBuilder({ onComplete, onExit }: PlanBuilderProps) {
  const { customization, applyCustomization } = useCustomization()
  const [a, setA] = useState<Answers>(() => {
    const d = loadDraft<Partial<Answers>>()
    return { ...defaultAnswers, ...(d ?? {}) }
  })
  const set = (partial: Partial<Answers>) => setA((prev) => ({ ...prev, ...partial }))

  const built = useMemo(() => buildCustomization(a, customization), [a, customization])

  // تهيئة وزن الهدف افتراضيًا حسب الهدف (ما لم يلمسه المستخدم).
  useEffect(() => {
    if (!showsTargetWeight(a.goalValue) || a.targetTouched) return
    const factor = a.goalValue === 'cut' ? 0.9 : 1.1
    const next = clampN(Math.round(a.weightKg * factor), BOUNDS.weight.min, BOUNDS.weight.max)
    if (next !== a.targetWeightKg) setA((p) => ({ ...p, targetWeightKg: next }))
  }, [a.goalValue, a.weightKg, a.targetTouched, a.targetWeightKg])

  // تهيئة الأيام الموصى بها حسب الخبرة (ما لم يلمسها المستخدم).
  useEffect(() => {
    if (!a.experienceLevel || a.daysTouched) return
    const rec = recommendedDaysFor(a.experienceLevel).days
    if (rec !== a.trainingDays) setA((p) => ({ ...p, trainingDays: rec }))
  }, [a.experienceLevel, a.daysTouched, a.trainingDays])

  const dayRec = a.experienceLevel ? recommendedDaysFor(a.experienceLevel) : null
  const bmi = bmiOf(a.weightKg, a.heightCm)
  const isBeginner = isBeginnerLevel(a.experienceLevel)

  // — تعريف الخطوات التسع (شرطية المحتوى داخل الخطوة لا كخطوة منفصلة) —
  interface Step {
    key: string
    label: string
    valid?: boolean
    error?: string
    content: ReactNode
  }

  const steps: Step[] = []

  // 1) الهدف
  steps.push({
    key: 'goal',
    label: 'الهدف',
    valid: !!a.goalValue,
    content: (
      <Question title="وش هدفك؟" hint="نبني الخطة كلها حوله.">
        <div className="space-y-2.5">
          {goalChoices.map((c) => (
            <OptionRow
              key={c.value}
              icon={c.icon}
              label={c.label}
              desc={c.desc}
              selected={a.goalValue === c.value}
              onClick={() => set({ goalValue: c.value, targetTouched: false })}
            />
          ))}
        </div>
      </Question>
    ),
  })

  // 2) الجنس
  steps.push({
    key: 'sex',
    label: 'الجنس',
    valid: !!a.gender,
    content: (
      <Question title="جنسك؟" hint="نستخدمه لحساب السعرات بدقة.">
        <div className="grid grid-cols-2 gap-3">
          {genderChoices.map((c) => (
            <OptionCard key={c.value} icon={c.icon} label={c.label} selected={a.gender === c.value} onClick={() => set({ gender: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  // 3) العمر
  steps.push({
    key: 'age',
    label: 'العمر',
    valid: true,
    content: (
      <Question title="كم عمرك؟">
        <Slider value={a.age} min={BOUNDS.age.min} max={BOUNDS.age.max} unit="سنة" onChange={(v) => set({ age: v })} ariaLabel="العمر بالسنوات" />
      </Question>
    ),
  })

  // 4) الطول
  steps.push({
    key: 'height',
    label: 'الطول',
    valid: true,
    content: (
      <Question title="كم طولك؟">
        <Slider value={a.heightCm} min={BOUNDS.height.min} max={BOUNDS.height.max} unit="سم" onChange={(v) => set({ heightCm: v })} ariaLabel="الطول بالسنتيمتر" />
      </Question>
    ),
  })

  // 5) الوزن الحالي + وزن الهدف الشرطي
  steps.push({
    key: 'weight',
    label: 'الوزن',
    valid: !weightStepError(a),
    error: weightStepError(a),
    content: (
      <Question title="كم وزنك الحالي؟">
        <Slider value={a.weightKg} min={BOUNDS.weight.min} max={BOUNDS.weight.max} unit="كجم" onChange={(v) => set({ weightKg: v })} ariaLabel="الوزن الحالي بالكيلوجرام" />
        {bmi !== null && (
          <p className="mt-4 rounded-xl border border-night-700 bg-night-900 px-4 py-3 text-center text-sm font-bold text-night-100">
            BMI: {bmi}
          </p>
        )}
        {showsTargetWeight(a.goalValue) && (
          <div className="mt-6 border-t border-night-800 pt-6">
            <p className="mb-1 text-base font-bold text-night-100">وش وزنك الهدف؟</p>
            <p className="mb-4 text-sm text-night-300">{a.goalValue === 'cut' ? 'أقل من وزنك الحالي.' : 'أعلى من وزنك الحالي.'}</p>
            <Slider
              value={a.targetWeightKg}
              min={BOUNDS.weight.min}
              max={BOUNDS.weight.max}
              unit="كجم"
              onChange={(v) => set({ targetWeightKg: v, targetTouched: true })}
              ariaLabel="الوزن الهدف بالكيلوجرام"
            />
          </div>
        )}
      </Question>
    ),
  })

  // 6) الخبرة + الانتظام الشرطي (يظهر لغير المبتدئ)
  steps.push({
    key: 'experience',
    label: 'خبرتك',
    valid: !!a.experienceLevel && (isBeginner || !!a.consistency),
    content: (
      <Question title="من متى وأنت تتمرن حديد؟" hint="نضبط صعوبة الخطة على مستواك.">
        <div className="space-y-2.5">
          {experienceChoices.map((c) => (
            <OptionRow
              key={c.value}
              icon={c.icon}
              label={c.label}
              desc={c.desc}
              selected={a.experienceLevel === c.value}
              onClick={() => set({ experienceLevel: c.value, consistency: c.value === 'beginner' ? undefined : a.consistency, daysTouched: false })}
            />
          ))}
        </div>
        {a.experienceLevel && !isBeginner && (
          <div className="mt-6 border-t border-night-800 pt-6">
            <p className="mb-4 text-base font-bold text-night-100">كيف انتظامك حاليًا؟</p>
            <div className="space-y-2.5">
              {consistencyChoices.map((c) => (
                <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.consistency === c.value} onClick={() => set({ consistency: c.value })} />
              ))}
            </div>
          </div>
        )}
      </Question>
    ),
  })

  // 7) نوع مكان التمرين
  steps.push({
    key: 'gym',
    label: 'مكان التمرين',
    valid: !!a.gymType,
    content: (
      <Question title="وين بتتمرن؟" hint="نختار تمارين مناسبة لمكانك.">
        <div className="space-y-2.5">
          {gymTypeChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.gymType === c.value} onClick={() => set({ gymType: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  // 8) أيام التمرين بالأسبوع
  steps.push({
    key: 'days',
    label: 'الأيام',
    valid: a.trainingDays >= BOUNDS.days.min && a.trainingDays <= BOUNDS.days.max,
    content: (
      <Question title="كم يوم تقدر تتمرن بالأسبوع؟" hint={dayRec?.note}>
        <Stepper value={a.trainingDays} min={BOUNDS.days.min} max={BOUNDS.days.max} onChange={(v) => set({ trainingDays: v, daysTouched: true })} unit="أيام" />
        {dayRec && (
          <button type="button" onClick={() => set({ trainingDays: dayRec.days, daysTouched: true })} className="mt-4 w-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">
            <Icon name="Sparkles" className="me-1 inline h-4 w-4" />
            الموصى به: {dayRec.days} أيام
          </button>
        )}
      </Question>
    ),
  })

  // 9) شاشة بناء الخطة
  steps.push({ key: 'building', label: 'نبني خطتك', content: <span /> })

  // — حالة الخطوة والتنقّل —
  const [stepIndex, setStepIndex] = useState(0)
  const idx = Math.min(stepIndex, steps.length - 1)
  const step = steps[idx]
  const total = steps.length
  const isFirst = idx === 0
  const isBuilding = step.key === 'building'

  // حفظ المسودة وآخر خطوة بعد كل تغيير (qimmah:onboarding:v1).
  useEffect(() => {
    saveDraft(a)
    setLastStep(idx)
  }, [a, idx])

  // الإنهاء عبر ref حتى لا تتطلب useEffect الإدراج في deps.
  const finishRef = useRef<() => void>(() => {})
  finishRef.current = () => {
    applyCustomization(built)
    markCompleted()
    onComplete()
  }

  // شاشة البناء: تقدّم 0→100% خلال ~2.5ث ثم حفظ والانتقال للوحة.
  const [buildPct, setBuildPct] = useState(0)
  useEffect(() => {
    if (!isBuilding) return
    setBuildPct(0)
    const DURATION = 2500
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / DURATION) * 100))
      setBuildPct(pct)
      if (pct < 100) raf = requestAnimationFrame(tick)
      else finishRef.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isBuilding])

  const goNext = () => {
    if (step.valid === false) return
    setStepIndex((s) => Math.min(steps.length - 1, s + 1))
  }
  const goBack = () => {
    if (isFirst) return onExit()
    setStepIndex((s) => Math.max(0, s - 1))
  }

  const progress = Math.round(((idx + 1) / total) * 100)

  if (isBuilding) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night-950 px-8 text-center text-night-100">
        <span className="relative grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <span className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-white">
            <Icon name="Dumbbell" className="h-11 w-11" />
          </span>
        </span>
        <h1 className="mt-8 text-2xl font-black text-night-100">نبني خطتك المثالية…</h1>
        <p className="mt-2 text-sm text-night-300">نختار التقسيمة، نوزّع الأيام، ونحسب أهدافك.</p>
        <div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full bg-night-800">
          <div className="h-full rounded-full bg-primary transition-all duration-150" style={{ width: `${buildPct}%` }} />
        </div>
        <p className="mt-3 text-sm font-black text-primary">{buildPct}%</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex flex-col bg-night-950 text-night-100">
      {/* رأس: رجوع + المسمّى + العدّاد + شريط التقدّم */}
      <header className="shrink-0 px-5 pt-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button type="button" onClick={goBack} aria-label="رجوع" className="grid h-10 w-10 place-items-center rounded-xl border border-night-700 bg-night-900 text-night-100">
            <Icon name="ChevronRight" className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-night-100">{step.label}</span>
            <span className="font-bold text-night-300">{idx + 1}/{total}</span>
          </div>
          <div className="h-10 w-10" />
        </div>
        <div className="mx-auto mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-night-800">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* المحتوى */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">{step.content}</div>
      </main>

      {/* شريط الإجراء السفلي */}
      <footer className="shrink-0 border-t border-night-800 bg-night-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          {step.error && (
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-danger">
              <Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />{step.error}
            </p>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={step.valid === false}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {idx === total - 2 ? 'ابنِ خطتي' : 'التالي'}
            <Icon name="ChevronLeft" className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  )
}

// — مكوّنات العرض —

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-black leading-tight text-night-100">{title}</h2>
      {hint && <p className="mt-2 text-sm text-night-300">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function OptionCard({ icon, label, selected, onClick }: { icon?: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center transition-colors active:scale-[0.98]',
        selected ? 'border-primary bg-primary/15 text-night-100' : 'border-night-700 bg-night-900 text-night-100 hover:border-night-600',
      )}
    >
      {icon && <Icon name={icon} className={cn('h-6 w-6', selected ? 'text-primary' : 'text-night-300')} />}
      <span className="text-base font-bold">{label}</span>
    </button>
  )
}

function OptionRow({ icon, label, desc, selected, onClick }: { icon?: string; label: string; desc?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-start transition-colors active:scale-[0.99]',
        selected ? 'border-primary bg-primary/15' : 'border-night-700 bg-night-900 hover:border-night-600',
      )}
    >
      {icon && (
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', selected ? 'bg-primary text-white' : 'bg-night-800 text-night-300')}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-night-100">{label}</span>
        {desc && <span className="block text-xs text-night-300">{desc}</span>}
      </span>
      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary bg-primary text-white' : 'border-night-700 text-transparent')}>
        <Icon name="Check" className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  )
}

function Stepper({ value, min, max, unit, onChange }: { value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-night-700 bg-night-900 p-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="ناقص" className="grid h-14 w-14 place-items-center rounded-xl bg-night-800 text-night-100 disabled:opacity-30">
        <Icon name="Minus" className="h-6 w-6" />
      </button>
      <div className="text-center">
        <p className="text-4xl font-black text-night-100">{value}</p>
        <p className="text-xs text-night-300">{unit}</p>
      </div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="زائد" className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-white disabled:opacity-30">
        <Icon name="Plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

/** منزلق رقمي بمسطرة — إدخال مرئي للجوال (لا نص حر)، ومتاح بلوحة المفاتيح. */
function Slider({ value, min, max, unit, onChange, ariaLabel }: { value: number; min: number; max: number; unit: string; onChange: (v: number) => void; ariaLabel: string }) {
  const clamp = (n: number) => clampN(Math.round(n), min, max)
  return (
    <div className="rounded-2xl border border-night-700 bg-night-900 p-5">
      <div className="flex items-end justify-center gap-2">
        <span className="text-6xl font-black leading-none text-night-100">{value}</span>
        <span className="pb-1.5 text-lg font-bold text-night-300">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label={ariaLabel}
        aria-valuetext={`${value} ${unit}`}
        dir="ltr"
        className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-night-700 accent-primary"
      />
      <div dir="ltr" className="mt-2 flex justify-between text-xs font-bold text-night-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
