import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted, saveDraft, loadDraft, setLastStep } from '@/lib/onboarding'
import {
  buildCustomizationFromOnboarding,
  saveOnboardingProfile,
} from '@/lib/onboardingProfile'
import type {
  AdvancedSplit,
  DietPattern,
  Environment,
  ExperienceLevel,
  NeatLevel,
  NutritionStyle as OnbNutritionStyle,
  OnbConsistency,
  OnboardingProfile,
  Sex,
  SplitMode,
  WellnessTrackingMode,
} from '@/types/onboarding'
import { ONBOARDING_SCHEMA_VERSION } from '@/types/onboarding'
import {
  advancedSplitChoices,
  allergyChoices,
  consistencyChoicesV2,
  dietPatternChoices,
  environmentChoices,
  experienceChoices,
  goalChoices,
  injuryChoices,
  neatChoices,
  nutritionStyleChoices,
  recommendedDaysFor,
  sessionDurationChoices,
  sexChoices,
  splitModeChoices,
  wellnessModeChoices,
} from '@/data/planBuilder'
import type { GoalValue } from '@/data/planBuilder'

interface PlanBuilderProps {
  /** يُستدعى بعد حفظ مصدر الحقيقة والخطة وتعليم الإكمال (دخول اللوحة). */
  onComplete: () => void
  /** يُستدعى عند الخروج من أول خطوة (رجوع للبداية). */
  onExit: () => void
}

// حدود الإعداد (إدخال مرئي بمنزلقات/عدّادات — لا نص حر).
const BOUNDS = {
  age: { min: 14, max: 80 },
  height: { min: 120, max: 220 },
  weight: { min: 30, max: 250 },
  /** وزن الهدف يتجاوز حدود الوزن الحالي بهامش كي يبقى «أقل/أعلى منه» ممكنًا دائمًا. */
  targetWeight: { min: 25, max: 260 },
  days: { min: 3, max: 6 },
  meals: { min: 2, max: 6 },
  steps: { min: 2000, max: 20000 },
}

interface Answers {
  // profile + bodyMetrics
  goalValue?: GoalValue
  sex?: Sex
  age: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  targetTouched: boolean
  // trainingPreferences
  experienceLevel?: ExperienceLevel
  consistency?: OnbConsistency
  environment?: Environment
  trainingDays: number
  daysTouched: boolean
  sessionDurationMin: number
  splitMode: SplitMode
  advancedSplit?: AdvancedSplit
  // activityProfile
  neat: NeatLevel
  includeSteps: boolean
  stepEstimate: number
  // nutritionPreferences
  nutritionStyle: OnbNutritionStyle
  mealsPerDay: number
  // foodPreferences (optional)
  dietPattern: DietPattern
  allergies: string[]
  // limitations + wellness (optional)
  injuries: string[]
  wellnessMode: WellnessTrackingMode
}

const defaultAnswers: Answers = {
  age: 25,
  heightCm: 170,
  weightKg: 75,
  targetWeightKg: 70,
  targetTouched: false,
  trainingDays: 3,
  daysTouched: false,
  sessionDurationMin: 60,
  splitMode: 'auto',
  neat: 'moderate',
  includeSteps: false,
  stepEstimate: 8000,
  nutritionStyle: 'meal_suggestions',
  mealsPerDay: 4,
  dietPattern: 'none',
  allergies: [],
  injuries: [],
  wellnessMode: 'none',
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** BMI رقمي فقط — بلا أي حكم قيمي أو تشخيص طبي. */
function bmiOf(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}

const isBeginnerLevel = (l?: ExperienceLevel) => l === 'beginner'
const showsTargetWeight = (g?: GoalValue) => g === 'cut' || g === 'bulk'

/** خطأ وزن الهدف: تنشيف أقل من الحالي / تضخيم أعلى منه. */
function targetWeightError(a: Answers): string | undefined {
  if (a.goalValue === 'cut' && !(a.targetWeightKg < a.weightKg))
    return 'وزن الهدف للتنشيف لازم يكون أقل من وزنك الحالي.'
  if (a.goalValue === 'bulk' && !(a.targetWeightKg > a.weightKg))
    return 'وزن الهدف للتضخيم لازم يكون أعلى من وزنك الحالي.'
  return undefined
}

/** يبني كائن مصدر الحقيقة من الإجابات — لا اسم وهمي، قوائم تتبّع فارغة. */
function buildOnboardingProfile(a: Answers): OnboardingProfile {
  const beginner = isBeginnerLevel(a.experienceLevel)
  return {
    profile: { sex: a.sex, age: a.age }, // لا اسم — اختياري ولا قيمة وهمية
    bodyMetrics: {
      heightCm: a.heightCm,
      currentWeightKg: a.weightKg,
      targetWeightKg: showsTargetWeight(a.goalValue) ? a.targetWeightKg : undefined,
    },
    goal: { type: a.goalValue },
    trainingPreferences: {
      experience: a.experienceLevel,
      consistency: beginner ? 'new' : a.consistency,
      environment: a.environment,
      daysPerWeek: a.trainingDays,
      sessionDurationMin: a.sessionDurationMin,
      splitMode: a.splitMode,
      advancedSplit: a.splitMode === 'advanced' ? a.advancedSplit : undefined,
    },
    activityProfile: {
      neat: a.neat,
      stepEstimate: a.includeSteps ? a.stepEstimate : undefined,
    },
    nutritionPreferences: {
      style: a.nutritionStyle,
      mealsPerDay: a.nutritionStyle === 'meal_suggestions' ? a.mealsPerDay : undefined,
    },
    foodPreferences: { dietPattern: a.dietPattern, dislikedFoods: [], allergies: a.allergies },
    limitations: { injuries: a.injuries },
    wellnessTracking: { mode: a.wellnessMode, supplements: [], medications: [] },
    appPreferences: { language: 'ar', reminders: false },
    _meta: {
      schemaVersion: ONBOARDING_SCHEMA_VERSION,
      completed: true,
      completedAt: new Date().toISOString(),
      source: 'onboarding',
    },
  }
}

/** الإعداد الذكي (Phase 1) — مصدر الحقيقة: شاشة واحدة لكل خطوة (جوال داكن، RTL). */
export function PlanBuilder({ onComplete, onExit }: PlanBuilderProps) {
  const { customization, applyCustomization } = useCustomization()
  const [a, setA] = useState<Answers>(() => {
    const d = loadDraft<Partial<Answers>>()
    return { ...defaultAnswers, ...(d ?? {}) }
  })
  const set = (partial: Partial<Answers>) => setA((prev) => ({ ...prev, ...partial }))
  const toggleIn = (key: 'allergies' | 'injuries', value: string) =>
    setA((prev) => {
      const list = prev[key]
      return { ...prev, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] }
    })

  // تهيئة وزن الهدف افتراضيًا حسب الهدف (ما لم يلمسه المستخدم).
  useEffect(() => {
    if (!showsTargetWeight(a.goalValue) || a.targetTouched) return
    const factor = a.goalValue === 'cut' ? 0.9 : 1.1
    const next = clampN(Math.round(a.weightKg * factor), BOUNDS.targetWeight.min, BOUNDS.targetWeight.max)
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

  // — تعريف الخطوات (شرطية بالكامل) —
  interface Step {
    key: string
    label: string
    valid?: boolean
    optional?: boolean
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
        <List>
          {goalChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.goalValue === c.value} onClick={() => set({ goalValue: c.value, targetTouched: false })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 2) الجنس
  steps.push({
    key: 'sex',
    label: 'الجنس',
    valid: !!a.sex,
    content: (
      <Question title="جنسك؟" hint="نستخدمه لحساب السعرات بدقة.">
        <div className="grid grid-cols-2 gap-3">
          {sexChoices.map((c) => (
            <OptionCard key={c.value} icon={c.icon} label={c.label} selected={a.sex === c.value} onClick={() => set({ sex: c.value })} />
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

  // 5) الوزن الحالي (+ BMI رقمي)
  steps.push({
    key: 'weight',
    label: 'الوزن',
    valid: true,
    content: (
      <Question title="كم وزنك الحالي؟">
        <Slider value={a.weightKg} min={BOUNDS.weight.min} max={BOUNDS.weight.max} unit="كجم" onChange={(v) => set({ weightKg: v })} ariaLabel="الوزن الحالي بالكيلوجرام" />
        {bmi !== null && (
          <p className="mt-4 rounded-xl border border-night-700 bg-night-900 px-4 py-3 text-center text-sm font-bold text-night-100">BMI: {bmi}</p>
        )}
      </Question>
    ),
  })

  // 6) وزن الهدف — فقط لـ bulk/cut
  if (showsTargetWeight(a.goalValue)) {
    steps.push({
      key: 'targetWeight',
      label: 'وزن الهدف',
      valid: !targetWeightError(a),
      error: targetWeightError(a),
      content: (
        <Question title="وش وزنك الهدف؟" hint={a.goalValue === 'cut' ? 'أقل من وزنك الحالي.' : 'أعلى من وزنك الحالي.'}>
          {/* حدود وزن الهدف موسّعة عن حدود الوزن الحالي: بلا ذلك يعلق من وزنه
              عند حدّ النطاق (٣٠ كجم مع «تنشيف» أو ٢٥٠ مع «تضخيم») في خطوة لا مخرج منها. */}
          <Slider value={a.targetWeightKg} min={BOUNDS.targetWeight.min} max={BOUNDS.targetWeight.max} unit="كجم" onChange={(v) => set({ targetWeightKg: v, targetTouched: true })} ariaLabel="الوزن الهدف بالكيلوجرام" />
        </Question>
      ),
    })
  }

  // 7) الخبرة
  steps.push({
    key: 'experience',
    label: 'خبرتك',
    valid: !!a.experienceLevel,
    content: (
      <Question title="من متى وأنت تتمرن حديد؟" hint="نضبط صعوبة الخطة على مستواك.">
        <List>
          {experienceChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.experienceLevel === c.value} onClick={() => set({ experienceLevel: c.value, consistency: c.value === 'beginner' ? undefined : a.consistency, daysTouched: false })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 8) الانتظام — فقط لغير المبتدئ
  if (a.experienceLevel && !isBeginner) {
    steps.push({
      key: 'consistency',
      label: 'انتظامك',
      valid: !!a.consistency,
      content: (
        <Question title="كيف انتظامك حاليًا؟" hint="نبدأ من نقطة تناسب وضعك.">
          <List>
            {consistencyChoicesV2.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.consistency === c.value} onClick={() => set({ consistency: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 9) بيئة التمرين
  steps.push({
    key: 'environment',
    label: 'مكان التمرين',
    valid: !!a.environment,
    content: (
      <Question title="وين بتتمرن؟" hint="نختار تمارين مناسبة لمكانك.">
        <List>
          {environmentChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.environment === c.value} onClick={() => set({ environment: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 10) أيام التمرين بالأسبوع
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

  // 11) مدّة الجلسة
  steps.push({
    key: 'duration',
    label: 'مدّة الجلسة',
    valid: !!a.sessionDurationMin,
    content: (
      <Question title="كم تحب تطول الجلسة؟" hint="نضبط عدد التمارين على وقتك.">
        <List>
          {sessionDurationChoices.map((c) => (
            <OptionRow key={c.value} icon="Clock" label={c.label} desc={c.desc} selected={a.sessionDurationMin === c.value} onClick={() => set({ sessionDurationMin: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 12) نمط التقسيمة (تلقائي/متقدّم)
  steps.push({
    key: 'splitMode',
    label: 'التقسيمة',
    valid: !!a.splitMode,
    content: (
      <Question title="كيف تبي نحدد التقسيمة؟" hint="التلقائي يكفي معظم الناس.">
        <List>
          {splitModeChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.splitMode === c.value} onClick={() => set({ splitMode: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 13) اختيار التقسيمة المتقدّمة — فقط عند advanced
  if (a.splitMode === 'advanced') {
    steps.push({
      key: 'advancedSplit',
      label: 'نوع التقسيمة',
      valid: !!a.advancedSplit,
      content: (
        <Question title="أي تقسيمة تفضّل؟" hint="اختر الأنسب لأسلوبك.">
          <List>
            {advancedSplitChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.advancedSplit === c.value} onClick={() => set({ advancedSplit: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 14) النشاط اليومي (NEAT) + تقدير خطوات اختياري
  steps.push({
    key: 'activity',
    label: 'نشاطك اليومي',
    valid: !!a.neat,
    content: (
      <Question title="كيف حركتك اليومية خارج التمرين؟" hint="تساعدنا نضبط سعراتك بدقة.">
        <List>
          {neatChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.neat === c.value} onClick={() => set({ neat: c.value })} />
          ))}
        </List>
        <div className="mt-6 border-t border-night-800 pt-5">
          <Toggle
            checked={a.includeSteps}
            onChange={(v) => set({ includeSteps: v })}
            title="أعرف عدد خطواتي اليومية"
            subtitle="اختياري — يحسّن دقّة التقدير"
          />
          {a.includeSteps && (
            <div className="mt-4">
              <Slider value={a.stepEstimate} min={BOUNDS.steps.min} max={BOUNDS.steps.max} step={500} unit="خطوة" onChange={(v) => set({ stepEstimate: v })} ariaLabel="تقدير الخطوات اليومية" />
            </div>
          )}
        </div>
      </Question>
    ),
  })

  // 15) أسلوب التغذية
  steps.push({
    key: 'nutritionStyle',
    label: 'التغذية',
    valid: !!a.nutritionStyle,
    content: (
      <Question title="كيف تبي تتعامل مع التغذية؟" hint="نقدر نعدّلها لاحقًا.">
        <List>
          {nutritionStyleChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.nutritionStyle === c.value} onClick={() => set({ nutritionStyle: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 16) عدد الوجبات — فقط عند meal_suggestions
  if (a.nutritionStyle === 'meal_suggestions') {
    steps.push({
      key: 'meals',
      label: 'الوجبات',
      valid: a.mealsPerDay >= BOUNDS.meals.min && a.mealsPerDay <= BOUNDS.meals.max,
      content: (
        <Question title="كم وجبة باليوم تناسبك؟" hint="نوزّع سعراتك عليها.">
          <Stepper value={a.mealsPerDay} min={BOUNDS.meals.min} max={BOUNDS.meals.max} onChange={(v) => set({ mealsPerDay: v })} unit="وجبات" />
        </Question>
      ),
    })
  }

  // 17) تفضيلات الأكل — اختياري (لا يحجب توليد الخطة)
  steps.push({
    key: 'food',
    label: 'تفضيلات الأكل',
    optional: true,
    valid: true,
    content: (
      <Question title="تفضيلات أكلك" hint="اختياري — تقدر تتخطّاها.">
        <p className="mb-3 text-sm font-bold text-night-300">نمط الأكل</p>
        <List>
          {dietPatternChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} selected={a.dietPattern === c.value} onClick={() => set({ dietPattern: c.value })} />
          ))}
        </List>
        <div className="mt-6 border-t border-night-800 pt-5">
          <p className="mb-3 text-sm font-bold text-night-300">حساسيات غذائية (اختر ما ينطبق)</p>
          <div className="grid grid-cols-2 gap-3">
            {allergyChoices.map((c) => (
              <OptionCard key={c.value} icon={c.icon} label={c.label} selected={a.allergies.includes(c.value)} onClick={() => toggleIn('allergies', c.value)} />
            ))}
          </div>
        </div>
      </Question>
    ),
  })

  // 18) القيود + المكملات/الأدوية — اختياري (شاشة واحدة، مفصولة داخليًا)
  steps.push({
    key: 'limitations',
    label: 'قيود ومتابعة',
    optional: true,
    valid: true,
    content: (
      <Question title="قيود ومتابعة" hint="اختياري — تقدر تتخطّاها.">
        <p className="mb-3 text-sm font-bold text-night-300">إصابات أو مناطق حساسة؟</p>
        <div className="grid grid-cols-2 gap-3">
          {injuryChoices.map((c) => (
            <OptionCard key={c.value} icon={c.icon} label={c.label} selected={a.injuries.includes(c.value)} onClick={() => toggleIn('injuries', c.value)} />
          ))}
        </div>
        <div className="mt-6 border-t border-night-800 pt-5">
          <p className="mb-3 text-sm font-bold text-night-300">تتبّع المكملات والأدوية؟</p>
          <List>
            {wellnessModeChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.wellnessMode === c.value} onClick={() => set({ wellnessMode: c.value })} />
            ))}
          </List>
        </div>
      </Question>
    ),
  })

  // شاشة البناء (لا تُحتسب خطوة نموذج)
  steps.push({ key: 'building', label: 'نبني خطتك', content: <span /> })

  // — حالة الخطوة والتنقّل —
  const [stepIndex, setStepIndex] = useState(0)
  const idx = Math.min(stepIndex, steps.length - 1)
  const step = steps[idx]
  const total = steps.length
  const isFirst = idx === 0
  const isBuilding = step.key === 'building'
  const isLastForm = idx === total - 2

  // حفظ المسودة وآخر خطوة بعد كل تغيير (qimmah:onboarding:v1).
  useEffect(() => {
    saveDraft(a)
    setLastStep(idx)
  }, [a, idx])

  // الإنهاء: يبني مصدر الحقيقة ويحفظه، ثم يولّد التخصيص للوحة.
  const finishRef = useRef<() => void>(() => {})
  finishRef.current = () => {
    const op = buildOnboardingProfile(a)
    saveOnboardingProfile(op)
    const built = buildCustomizationFromOnboarding(op, customization)
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
          <div className="flex items-center gap-3">
            {step.optional && (
              <button type="button" onClick={goNext} className="rounded-2xl border border-night-700 bg-night-900 px-5 py-4 text-base font-bold text-night-300">
                تخطّي
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={step.valid === false}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastForm ? 'ابنِ خطتي' : 'التالي'}
              <Icon name="ChevronLeft" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// — مكوّنات العرض —

function List({ children }: { children: ReactNode }) {
  return <div className="space-y-2.5">{children}</div>
}

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
      <span className="text-sm font-bold">{label}</span>
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

function Toggle({ checked, onChange, title, subtitle }: { checked: boolean; onChange: (v: boolean) => void; title: string; subtitle?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-4', checked ? 'border-primary bg-primary/10' : 'border-night-700 bg-night-900')}
    >
      <span className="text-start">
        <span className="block text-base font-bold text-night-100">{title}</span>
        {subtitle && <span className="block text-xs text-night-300">{subtitle}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-night-700')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', checked ? 'start-1' : 'end-1')} />
      </span>
    </button>
  )
}

/** منزلق رقمي بمسطرة — إدخال مرئي للجوال (لا نص حر)، ومتاح بلوحة المفاتيح. */
function Slider({ value, min, max, unit, onChange, ariaLabel, step = 1 }: { value: number; min: number; max: number; unit: string; onChange: (v: number) => void; ariaLabel: string; step?: number }) {
  const clamp = (n: number) => clampN(Math.round(n / step) * step, min, max)
  return (
    <div className="rounded-2xl border border-night-700 bg-night-900 p-5">
      <div className="flex items-end justify-center gap-2">
        <span className="text-6xl font-black leading-none text-night-100">{value.toLocaleString('en-US')}</span>
        <span className="pb-1.5 text-lg font-bold text-night-300">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label={ariaLabel}
        aria-valuetext={`${value} ${unit}`}
        dir="ltr"
        className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-night-700 accent-primary"
      />
      <div dir="ltr" className="mt-2 flex justify-between text-xs font-bold text-night-400">
        <span>{min.toLocaleString('en-US')}</span>
        <span>{max.toLocaleString('en-US')}</span>
      </div>
    </div>
  )
}
