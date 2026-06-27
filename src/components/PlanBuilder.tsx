import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { type Customization } from '@/lib/customization'
import { useCustomization } from '@/lib/customizationContext'
import { markCompleted } from '@/lib/onboarding'
import { calorieGoalFromGoalType, computeTargets, profileHash } from '@/lib/calculators'
import { planExerciseName } from '@/lib/workoutPlan'
import {
  deriveActivityLevel,
  deriveTargetWeight,
  generatePlan,
  levelFromExperience,
} from '@/lib/planGenerator'
import { LIMITS } from '@/lib/validation'
import type {
  Consistency,
  Equipment,
  ExperienceBand,
  Gender,
  GymAccess,
  MuscleFocus,
  Profile,
  SchedulingStyle,
} from '@/types/profile'
import {
  consistencyChoices,
  durationBands,
  equipmentChoices,
  experienceChoices,
  gymAccessChoices,
  goalChoices,
  genderChoices,
  motivationalInsight,
  muscleFocusChoices,
  recommendedDaysFor,
  weekdayNames,
} from '@/data/planBuilder'

interface PlanBuilderProps {
  /** يُستدعى عند «ادخل قِمّة» بعد حفظ الخطة وتعليم الإكمال. */
  onComplete: () => void
  /** يُستدعى عند الخروج من أول خطوة (رجوع للبداية). */
  onExit: () => void
}

interface Answers {
  name: string
  gender?: Gender
  goalValue?: string
  muscleFocus: MuscleFocus
  experienceBand?: ExperienceBand
  consistency?: Consistency
  gymAccess?: GymAccess
  equipment: Equipment[]
  trainingDays: number
  schedulingStyle: SchedulingStyle
  preferredDays: number[]
  workoutDuration?: number
  age: string
  heightCm: string
  weightKg: string
  remindersOptIn: boolean
}

const num = (s: string): number => {
  const m = String(s).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

const inRange = (s: string, lo: number, hi: number): boolean => {
  const n = num(s)
  return Number.isFinite(n) && n >= lo && n <= hi
}

/** وصف BMI بنبرة لطيفة (غير قاسية). */
function softBmi(weightKg: number, heightCm: number): { bmi: number; label: string } | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  const bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
  const label = bmi < 18.5 ? 'أقل من الطبيعي' : bmi < 25 ? 'في النطاق الطبيعي' : bmi < 30 ? 'أعلى قليلًا من الطبيعي' : 'مرتفع — خطتك بتساعدك'
  return { bmi, label }
}

/** يبني ملفًا شخصيًا من إجابات الباني. */
function buildProfile(a: Answers, base: Profile): Profile {
  const goal = goalChoices.find((g) => g.value === a.goalValue)
  const goalType = goal?.goalType ?? 'health'
  const trainingLevel = levelFromExperience(a.experienceBand)
  const weightKg = num(a.weightKg) || base.weightKg
  const gymAccess = a.gymAccess ?? 'full'
  return {
    ...base,
    name: a.name.trim() || base.name,
    gender: a.gender ?? 'unspecified',
    age: num(a.age) || base.age,
    heightCm: num(a.heightCm) || base.heightCm,
    weightKg,
    targetWeightKg: deriveTargetWeight(weightKg, goalType),
    activityLevel: deriveActivityLevel(a.trainingDays),
    trainingLevel,
    goalType,
    goal: 'maintain', // يُضبط داخل generatePlan حسب goalType
    trainingDays: a.trainingDays,
    workoutDuration: a.workoutDuration ?? 60,
    workoutEnvironment: gymAccess === 'home' || gymAccess === 'bodyweight' ? 'home' : 'gym',
    muscleFocus: a.muscleFocus,
    consistency: a.consistency,
    experienceBand: a.experienceBand,
    gymAccess,
    equipment: a.equipment,
    schedulingStyle: a.schedulingStyle,
    preferredDays: a.preferredDays,
    remindersOptIn: a.remindersOptIn,
  }
}

/** يبني نسخة التخصيص الكاملة الجاهزة للحفظ. */
function buildCustomization(a: Answers, current: Customization): Customization {
  const profile = buildProfile(a, current.profile)
  const g = generatePlan(profile)
  const goal = goalChoices.find((x) => x.value === a.goalValue)
  return {
    ...current,
    identity: {
      ...current.identity,
      userName: profile.name,
      mainGoal: goal?.label ?? current.identity.mainGoal,
    },
    profile: { ...profile, goal: calorieGoalForStore(profile) },
    targets: g.targets,
    targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: profileHash(profile), updatedAt: new Date().toISOString() },
    workoutPlan: g.workoutPlan,
    nutritionPlan: g.nutritionPlan,
    commitmentPlan: g.commitmentPlan,
    measurementPlan: g.measurementPlan,
    routine: g.weeklySchedule,
  }
}

// goal المتوافق مع الحاسبة (generatePlan يحسبه داخليًا، ونثبّته هنا للاتساق)
function calorieGoalForStore(p: Profile) {
  return calorieGoalFromGoalType(p.goalType)
}

/** باني الخطة — معالج جوال داكن، سؤال واحد لكل شاشة. */
export function PlanBuilder({ onComplete, onExit }: PlanBuilderProps) {
  const { customization, applyCustomization } = useCustomization()
  const [a, setA] = useState<Answers>(() => ({
    name: '',
    muscleFocus: 'balanced',
    equipment: [],
    trainingDays: 3,
    schedulingStyle: 'flexible',
    preferredDays: [],
    remindersOptIn: false,
    age: '',
    heightCm: '',
    weightKg: '',
  }))
  const set = (partial: Partial<Answers>) => setA((prev) => ({ ...prev, ...partial }))

  // الخطط المحسوبة للمعاينة (نقية)
  const previewProfile = useMemo(() => buildProfile(a, customization.profile), [a, customization.profile])
  const previewTargets = useMemo(() => computeTargets({ ...previewProfile, goal: calorieGoalForStore(previewProfile) }), [previewProfile])
  const built = useMemo(() => buildCustomization(a, customization), [a, customization])

  const toggleEquip = (e: Equipment) =>
    set({ equipment: a.equipment.includes(e) ? a.equipment.filter((x) => x !== e) : [...a.equipment, e] })
  const togglePreferred = (i: number) =>
    set({ preferredDays: a.preferredDays.includes(i) ? a.preferredDays.filter((x) => x !== i) : [...a.preferredDays, i] })

  const dayRec = a.experienceBand ? recommendedDaysFor(a.experienceBand) : null
  const bmi = softBmi(num(a.weightKg), num(a.heightCm))

  // — تعريف الخطوات (ديناميكي حسب الإجابات) —
  interface Step {
    key: string
    label: string
    optional?: boolean
    info?: boolean
    valid?: boolean
    error?: string
    content: ReactNode
  }

  const steps: Step[] = []

  steps.push({
    key: 'welcome',
    label: 'البداية',
    info: true,
    content: (
      <Hero icon="Sparkles" title="يلا نبني خطتك" subtitle="أجوبة سريعة، وقِمّة تطلّع لك خطة تمرين وتغذية تناسبك.">
        <label className="mt-6 block text-start">
          <span className="text-sm font-bold text-night-300">شو نناديك؟ (اختياري)</span>
          <input
            value={a.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="اسمك"
            className="mt-2 w-full rounded-2xl border border-night-700 bg-night-900 px-4 py-3.5 text-lg font-bold text-night-100 placeholder:text-night-600 focus:border-primary focus:outline-none"
          />
        </label>
      </Hero>
    ),
  })

  steps.push({
    key: 'gender',
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

  steps.push({
    key: 'goal',
    label: 'الهدف',
    valid: !!a.goalValue,
    content: (
      <Question title="وش هدفك الأساسي؟" hint="نبني الخطة كلها حوله.">
        <div className="space-y-2.5">
          {goalChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.goalValue === c.value} onClick={() => set({ goalValue: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  steps.push({
    key: 'motivation',
    label: 'تحفيز',
    info: true,
    content: (
      <Hero icon="Flame" title={motivationalInsight.title} subtitle={motivationalInsight.body} />
    ),
  })

  steps.push({
    key: 'focus',
    label: 'التركيز',
    valid: true,
    content: (
      <Question title="فيه عضلات تبي تركّز عليها؟" hint="نقدر نزيد حجم العمل عليها.">
        <div className="space-y-2.5">
          {muscleFocusChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.muscleFocus === c.value} onClick={() => set({ muscleFocus: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  steps.push({
    key: 'experience',
    label: 'خبرتك',
    valid: !!a.experienceBand,
    content: (
      <Question title="من متى وأنت تتمرن حديد؟" hint="نضبط صعوبة الخطة على مستواك.">
        <div className="space-y-2.5">
          {experienceChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} selected={a.experienceBand === c.value} onClick={() => set({ experienceBand: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  steps.push({
    key: 'consistency',
    label: 'انتظامك',
    valid: !!a.consistency,
    content: (
      <Question title="كيف انتظامك حاليًا؟" hint="لو راجع بعد انقطاع نخفّف البداية.">
        <div className="space-y-2.5">
          {consistencyChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.consistency === c.value} onClick={() => set({ consistency: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  steps.push({
    key: 'gym',
    label: 'مكان التمرين',
    valid: !!a.gymAccess,
    content: (
      <Question title="وين بتتمرن؟" hint="نختار تمارين مناسبة لمكانك.">
        <div className="space-y-2.5">
          {gymAccessChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={c.label} desc={c.desc} selected={a.gymAccess === c.value} onClick={() => set({ gymAccess: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  if (a.gymAccess === 'small' || a.gymAccess === 'home') {
    steps.push({
      key: 'equipment',
      label: 'أدواتك',
      optional: true,
      valid: true,
      content: (
        <Question title="وش الأدوات المتوفّرة؟" hint="اختر كل اللي عندك (اختياري).">
          <div className="grid grid-cols-2 gap-3">
            {equipmentChoices.map((c) => (
              <OptionCard key={c.value} icon={c.icon} label={c.label} selected={a.equipment.includes(c.value)} onClick={() => toggleEquip(c.value)} />
            ))}
          </div>
        </Question>
      ),
    })
  }

  steps.push({
    key: 'days',
    label: 'الأيام',
    valid: a.trainingDays >= LIMITS.trainingDays.min && a.trainingDays <= LIMITS.trainingDays.max,
    content: (
      <Question title="كم يوم تقدر تتمرن بالأسبوع؟" hint={dayRec?.note}>
        <Stepper value={a.trainingDays} min={LIMITS.trainingDays.min} max={LIMITS.trainingDays.max} onChange={(v) => set({ trainingDays: v })} unit="أيام" />
        {dayRec && (
          <button type="button" onClick={() => set({ trainingDays: dayRec.days })} className="mt-4 w-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">
            <Icon name="Sparkles" className="me-1 inline h-4 w-4" />
            الموصى به: {dayRec.days} أيام
          </button>
        )}
      </Question>
    ),
  })

  steps.push({
    key: 'scheduling',
    label: 'نمط الجدول',
    valid: true,
    content: (
      <Question title="تفضّل جدول ثابت ولا مرن؟" hint="الثابت يحدّد أيام معيّنة بالأسبوع.">
        <div className="grid grid-cols-2 gap-3">
          <OptionCard icon="CalendarDays" label="جدول ثابت" selected={a.schedulingStyle === 'fixed'} onClick={() => set({ schedulingStyle: 'fixed' })} />
          <OptionCard icon="Activity" label="مرن" selected={a.schedulingStyle === 'flexible'} onClick={() => set({ schedulingStyle: 'flexible' })} />
        </div>
      </Question>
    ),
  })

  if (a.schedulingStyle === 'fixed') {
    steps.push({
      key: 'preferredDays',
      label: 'أيامك',
      optional: true,
      valid: true,
      content: (
        <Question title="أي أيام تفضّل؟" hint={`اختر إلى ${a.trainingDays} أيام (اختياري).`}>
          <div className="grid grid-cols-2 gap-2.5">
            {weekdayNames.map((d, i) => (
              <OptionCard key={d} label={d} selected={a.preferredDays.includes(i)} onClick={() => togglePreferred(i)} />
            ))}
          </div>
        </Question>
      ),
    })
  }

  steps.push({
    key: 'duration',
    label: 'مدة التمرين',
    valid: !!a.workoutDuration,
    content: (
      <Question title="كم تبي يطول التمرين؟" hint="عشان نضبط عدد التمارين.">
        <div className="space-y-2.5">
          {durationBands.map((c) => (
            <OptionRow key={c.value} icon="Clock" label={c.label} selected={a.workoutDuration === c.value} onClick={() => set({ workoutDuration: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  steps.push({
    key: 'age',
    label: 'العمر',
    valid: inRange(a.age, LIMITS.age.min, LIMITS.age.max),
    error: a.age && !inRange(a.age, LIMITS.age.min, LIMITS.age.max) ? 'أدخل عمرًا بين 12 و90 سنة.' : undefined,
    content: (
      <Question title="كم عمرك؟">
        <NumberField value={a.age} onChange={(v) => set({ age: v })} unit="سنة" placeholder="مثال: 24" invalid={!!a.age && !inRange(a.age, LIMITS.age.min, LIMITS.age.max)} />
      </Question>
    ),
  })

  steps.push({
    key: 'height',
    label: 'الطول',
    valid: inRange(a.heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max),
    error: a.heightCm && !inRange(a.heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max) ? 'أدخل طولًا بين 100 و230 سم.' : undefined,
    content: (
      <Question title="كم طولك؟">
        <NumberField value={a.heightCm} onChange={(v) => set({ heightCm: v })} unit="سم" placeholder="مثال: 178" invalid={!!a.heightCm && !inRange(a.heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max)} />
      </Question>
    ),
  })

  steps.push({
    key: 'weight',
    label: 'الوزن',
    valid: inRange(a.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max),
    error: a.weightKg && !inRange(a.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max) ? 'أدخل وزنًا بين 15 و250 كجم.' : undefined,
    content: (
      <Question title="كم وزنك الحالي؟">
        <NumberField value={a.weightKg} onChange={(v) => set({ weightKg: v })} unit="كجم" placeholder="مثال: 80" invalid={!!a.weightKg && !inRange(a.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max)} mode="decimal" />
        {bmi && inRange(a.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max) && (
          <p className="mt-4 rounded-xl border border-night-700 bg-night-900 px-4 py-3 text-sm text-night-300">
            مؤشر كتلة الجسم تقديري: <span className="font-black text-night-100">{bmi.bmi}</span> — {bmi.label}
          </p>
        )}
      </Question>
    ),
  })

  steps.push({
    key: 'nutrition',
    label: 'تغذيتك',
    info: true,
    content: (
      <Question title="أهدافك الغذائية" hint="تقدير مبني على TDEE وهدفك — تقدر تعدّله لاحقًا.">
        <div className="grid grid-cols-2 gap-3">
          <BigStat icon="Flame" value={`${targetCaloriesPreview(previewProfile, previewTargets)}`} label="سعرة / يوم" />
          <BigStat icon="Salad" value={`${previewTargets.proteinGrams}غ`} label="بروتين / يوم" />
          <BigStat icon="Droplets" value={`${previewTargets.waterLiters} ل`} label="ماء / يوم" />
          <BigStat icon="Target" value={`${previewTargets.tdee}`} label="TDEE تقديري" />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-night-300">
          هذه تقديرات للتنظيم والمتابعة، وليست نصيحة طبية.
        </p>
      </Question>
    ),
  })

  steps.push({
    key: 'reminders',
    label: 'التذكيرات',
    info: true,
    content: (
      <Question title="تذكيرات التمرين" hint="الإشعارات الفعلية قريبًا — احفظ تفضيلك الحين.">
        <button
          type="button"
          onClick={() => set({ remindersOptIn: !a.remindersOptIn })}
          className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-4', a.remindersOptIn ? 'border-primary bg-primary/10' : 'border-night-700 bg-night-900')}
        >
          <span className="flex items-center gap-3">
            <Icon name="Bell" className={cn('h-5 w-5', a.remindersOptIn ? 'text-primary' : 'text-night-300')} />
            <span className="text-start">
              <span className="block text-base font-bold text-night-100">ذكّرني بالتمرين</span>
              <span className="block text-xs text-night-300">التذكيرات قريبًا</span>
            </span>
          </span>
          <span className={cn('relative h-7 w-12 rounded-full transition-colors', a.remindersOptIn ? 'bg-primary' : 'bg-night-700')}>
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', a.remindersOptIn ? 'start-1' : 'end-1')} />
          </span>
        </button>
      </Question>
    ),
  })

  steps.push({ key: 'building', label: 'نجهّز خطتك', info: true, content: <BuildingScreen /> })

  steps.push({
    key: 'ready',
    label: 'خطتك جاهزة',
    info: true,
    content: <ReadyScreen built={built} />,
  })

  // — حالة الخطوة والتنقّل —
  const [stepIndex, setStepIndex] = useState(0)
  const idx = Math.min(stepIndex, steps.length - 1)
  const step = steps[idx]
  const total = steps.length
  const isFirst = idx === 0
  const isReady = step.key === 'ready'
  const isBuilding = step.key === 'building'

  // شاشة التجهيز تتقدّم تلقائيًا
  const advanceRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isBuilding) return
    advanceRef.current = window.setTimeout(() => setStepIndex((s) => s + 1), 1900)
    return () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current)
    }
  }, [isBuilding])

  const goNext = () => {
    if (step.valid === false) return
    setStepIndex((s) => Math.min(steps.length - 1, s + 1))
  }
  const goBack = () => {
    if (isFirst) return onExit()
    setStepIndex((s) => Math.max(0, s - 1))
  }
  const finish = () => {
    applyCustomization(built)
    markCompleted()
    onComplete()
  }

  const progress = Math.round(((idx + 1) / total) * 100)

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex flex-col bg-night-950 text-night-100">
      {/* رأس: رجوع + المسمّى + العدّاد + شريط التقدّم */}
      {!isBuilding && (
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
      )}

      {/* المحتوى */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">{step.content}</div>
      </main>

      {/* شريط الإجراء السفلي */}
      {!isBuilding && (
        <footer className="shrink-0 border-t border-night-800 bg-night-950/90 px-5 py-4 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            {step.error && (
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-danger">
                <Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />{step.error}
              </p>
            )}
            {isReady ? (
              <button type="button" onClick={finish} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white">
                <Icon name="Dumbbell" className="h-5 w-5" />
                ادخل قِمّة
              </button>
            ) : (
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
                  التالي
                  <Icon name="ChevronLeft" className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}

function targetCaloriesPreview(p: Profile, t: ReturnType<typeof computeTargets>): number {
  const goal = calorieGoalForStore(p)
  if (goal === 'cut') return t.cuttingCalories
  if (goal === 'bulk') return t.bulkingCalories
  return t.maintenanceCalories
}

// — مكوّنات العرض —

function Hero({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-white shadow-glow">
        <Icon name={icon} className="h-10 w-10" strokeWidth={2.2} />
      </span>
      <h1 className="mt-6 text-3xl font-black leading-tight text-night-100">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-night-300">{subtitle}</p>
      {children}
    </div>
  )
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

function NumberField({ value, onChange, unit, placeholder, invalid, mode = 'numeric' }: { value: string; onChange: (v: string) => void; unit: string; placeholder?: string; invalid?: boolean; mode?: 'numeric' | 'decimal' }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border bg-night-900 px-4 py-3', invalid ? 'border-danger' : 'border-night-700')}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={mode}
        placeholder={placeholder}
        aria-invalid={invalid}
        className="w-full min-w-0 bg-transparent text-3xl font-black text-night-100 placeholder:text-night-600 focus:outline-none"
      />
      <span className="shrink-0 text-base font-bold text-night-300">{unit}</span>
    </div>
  )
}

function BigStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-night-700 bg-night-900 p-4 text-center">
      <Icon name={icon} className="mx-auto h-6 w-6 text-primary" />
      <p className="mt-2 text-2xl font-black text-night-100">{value}</p>
      <p className="text-xs text-night-300">{label}</p>
    </div>
  )
}

function BuildingScreen() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="relative grid h-24 w-24 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-white">
          <Icon name="Dumbbell" className="h-11 w-11" />
        </span>
      </span>
      <h1 className="mt-8 text-2xl font-black text-night-100">نجهّز خطتك…</h1>
      <p className="mt-2 text-sm text-night-300">نختار التقسيمة، نوزّع الأيام، ونحسب أهدافك.</p>
    </div>
  )
}

function ReadyScreen({ built }: { built: Customization }) {
  const firstDay = built.workoutPlan.days[0]
  const np = built.nutritionPlan
  const trainingDays = built.routine.filter((r) => r.type !== 'rest').length
  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-glow">
          <Icon name="CheckCircle2" className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl font-black text-night-100">خطتك جاهزة 🎉</h1>
        <p className="mt-1 text-sm text-night-300">{built.identity.mainGoal}</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <BigStat icon="Flame" value={`${np.targetCalories}`} label="سعرة" />
        <BigStat icon="Salad" value={`${np.targetProtein}غ`} label="بروتين" />
        <BigStat icon="CalendarDays" value={`${trainingDays}`} label="أيام/أسبوع" />
      </div>

      {firstDay && (
        <div className="mt-4 rounded-2xl border border-night-700 bg-night-900 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-night-100">
            <Icon name="Dumbbell" className="h-4 w-4 text-primary" />
            تمرين اليوم: {firstDay.nameAr}
          </p>
          <ul className="mt-2 space-y-1">
            {firstDay.exercises.slice(0, 5).map((pe) => (
              <li key={pe.id} className="truncate text-sm text-night-300">• {planExerciseName(pe, 'ar')} — {pe.sets}×{pe.reps}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
