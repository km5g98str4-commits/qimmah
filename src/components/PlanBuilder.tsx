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
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { useAuth } from '@/lib/authContext'
import type { Answers } from '@/lib/planBuilderAnswers'
import {
  buildOnboardingProfile,
  defaultAnswers,
  isBeginnerLevel,
  showsTargetWeight,
} from '@/lib/planBuilderAnswers'
import {
  advancedSplitChoices,
  allergyChoices,
  appetiteTimingChoices,
  consistencyChoicesV2,
  dietPatternChoices,
  environmentChoices,
  experienceChoices,
  goalChoices,
  injuryChoices,
  mealDistributionChoices,
  neatChoices,
  nutritionStyleChoices,
  recommendedDaysFor,
  sessionDurationChoices,
  sexChoices,
  splitModeChoices,
  wellnessModeChoices,
} from '@/data/planBuilder'
import { useLang } from '@/i18n'
import { onboardingStrings, type OnboardingStrings } from '@/i18n/dict/onboarding'
import { PlanChoiceScreen, CustomPlanBuilder, customPlanStrings, saveCustomPlan } from '@/features/customPlan'
import type { PlanSource } from '@/features/customPlan'
import { track } from '@/lib/analytics'

interface PlanBuilderProps {
  /** يُستدعى بعد حفظ مصدر الحقيقة والخطة وتعليم الإكمال (دخول اللوحة). */
  onComplete: () => void
  /** يُستدعى عند الخروج من أول خطوة (رجوع للبداية). */
  onExit: () => void
  /** مخرج طوارئ: يُعلّم الإعداد مكتملًا ويدخل اللوحة فورًا مهما كانت حالة الخطوات (لا حبس أبدًا). */
  onForceComplete?: () => void
}

// حدود الإعداد (إدخال مرئي بمنزلقات/عدّادات — لا نص حر).
const BOUNDS = {
  age: { min: 14, max: 80 },
  height: { min: 120, max: 220 },
  weight: { min: 30, max: 250 },
  days: { min: 3, max: 6 },
  meals: { min: 2, max: 6 },
  steps: { min: 2000, max: 20000 },
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** تحويل رقم لاتيني إلى أرقام هندية (للنص العربي فقط). */
const toArDigits = (n: number) => String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)])

/** BMI رقمي فقط — بلا أي حكم قيمي أو تشخيص طبي. */
function bmiOf(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}

/** خطأ وزن الهدف: تنشيف أقل من الحالي / تضخيم أعلى منه. */
function targetWeightError(a: Answers, d: OnboardingStrings): string | undefined {
  if (a.goalValue === 'cut' && !(a.targetWeightKg < a.weightKg))
    return d.targetWeightErrorCut
  if (a.goalValue === 'bulk' && !(a.targetWeightKg > a.weightKg))
    return d.targetWeightErrorBulk
  return undefined
}

/** الإعداد الذكي (Phase 1) — مصدر الحقيقة: شاشة واحدة لكل خطوة (جوال داكن، RTL). */
export function PlanBuilder({ onComplete, onExit, onForceComplete }: PlanBuilderProps) {
  const lang = useLang()
  const d = onboardingStrings[lang]
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  // المالك الحالي — المسودة والإكمال يُنسبان له (حساب جديد لا يرث مسودة حساب آخر).
  const userId = auth.user?.id ?? null
  const [a, setA] = useState<Answers>(() => {
    const d = loadDraft<Partial<Answers>>(userId)
    return { ...defaultAnswers, ...(d ?? {}) }
  })
  const set = (partial: Partial<Answers>) => setA((prev) => ({ ...prev, ...partial }))
  // اختيار طريقة الجدول (تلقائي مقابل مخصّص) + عرض الباني المخصّص بعد التوليد.
  const [planMode, setPlanMode] = useState<PlanSource | undefined>(undefined)
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)
  const toggleIn = (key: 'allergies' | 'injuries', value: string) =>
    setA((prev) => {
      const list = prev[key]
      return { ...prev, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] }
    })

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

  // P10.1: حلّ تسمية/وصف بطاقات الخيارات حسب اللغة الحالية مع رجوع للعربية (المصدر الأساسي).
  const cLabel = (c: { label: string; labelEn?: string }) => (lang === 'en' ? c.labelEn ?? c.label : c.label)
  const cDesc = (c: { desc?: string; descEn?: string }) => (lang === 'en' ? c.descEn ?? c.desc : c.desc)
  // تلميح الأيام الموصى بها — من قاموس i18n (أرقام هندية للعربية، لاتينية للإنجليزية).
  const dayRecNote = dayRec
    ? d.recommendedForLevel.replace('{n}', lang === 'en' ? String(dayRec.days) : toArDigits(dayRec.days))
    : undefined

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

  // 0) الاسم — اختياري تمامًا وقابل للتخطّي (نرحّب فيك باسمك في الرئيسية).
  steps.push({
    key: 'name',
    label: d.labelName,
    optional: true,
    valid: true,
    content: (
      <Question title={d.nameTitle} hint={d.nameHint}>
        <TextField
          value={a.name}
          placeholder={d.namePlaceholder}
          maxLength={24}
          onChange={(v) => set({ name: v })}
          ariaLabel={d.nameAria}
        />
      </Question>
    ),
  })

  // 1) الهدف
  steps.push({
    key: 'goal',
    label: d.labelGoal,
    valid: !!a.goalValue,
    content: (
      <Question title={d.goalTitle} hint={d.goalHint}>
        <List>
          {goalChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.goalValue === c.value} onClick={() => set({ goalValue: c.value, targetTouched: false })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 2) الجنس
  steps.push({
    key: 'sex',
    label: d.labelSex,
    valid: !!a.sex,
    content: (
      <Question title={d.sexTitle} hint={d.sexHint}>
        <div className="grid grid-cols-2 gap-3">
          {sexChoices.map((c) => (
            <OptionCard key={c.value} icon={c.icon} label={cLabel(c)} selected={a.sex === c.value} onClick={() => set({ sex: c.value })} />
          ))}
        </div>
      </Question>
    ),
  })

  // 3) العمر
  steps.push({
    key: 'age',
    label: d.labelAge,
    valid: true,
    content: (
      <Question title={d.ageTitle}>
        <Slider value={a.age} min={BOUNDS.age.min} max={BOUNDS.age.max} unit={d.ageUnit} onChange={(v) => set({ age: v })} ariaLabel={d.ageAria} />
      </Question>
    ),
  })

  // 4) الطول
  steps.push({
    key: 'height',
    label: d.labelHeight,
    valid: true,
    content: (
      <Question title={d.heightTitle}>
        <Slider value={a.heightCm} min={BOUNDS.height.min} max={BOUNDS.height.max} unit={d.heightUnit} onChange={(v) => set({ heightCm: v })} ariaLabel={d.heightAria} />
      </Question>
    ),
  })

  // 5) الوزن الحالي (+ BMI رقمي)
  steps.push({
    key: 'weight',
    label: d.labelWeight,
    valid: true,
    content: (
      <Question title={d.weightTitle}>
        <Slider value={a.weightKg} min={BOUNDS.weight.min} max={BOUNDS.weight.max} unit={d.weightUnit} onChange={(v) => set({ weightKg: v })} ariaLabel={d.weightAria} />
        {bmi !== null && (
          <p className="mt-4 rounded-xl border border-night-700 bg-night-900 px-4 py-3 text-center text-sm font-bold text-night-100">BMI: {bmi}</p>
        )}
      </Question>
    ),
  })

  // 5ب) طريقة الجدول — بعد الأساسيات مباشرةً: جدول تلقائي أو تصميم يدوي.
  steps.push({
    key: 'planMode',
    label: customPlanStrings[lang].choiceEyebrow,
    valid: !!planMode,
    content: <PlanChoiceScreen lang={lang} value={planMode} onChange={setPlanMode} />,
  })

  // 6) وزن الهدف — فقط لـ bulk/cut
  if (showsTargetWeight(a.goalValue)) {
    steps.push({
      key: 'targetWeight',
      label: d.labelTargetWeight,
      valid: !targetWeightError(a, d),
      error: targetWeightError(a, d),
      content: (
        <Question title={d.targetWeightTitle} hint={a.goalValue === 'cut' ? d.targetWeightHintCut : d.targetWeightHintBulk}>
          <Slider value={a.targetWeightKg} min={BOUNDS.weight.min} max={BOUNDS.weight.max} unit={d.weightUnit} onChange={(v) => set({ targetWeightKg: v, targetTouched: true })} ariaLabel={d.targetWeightAria} />
        </Question>
      ),
    })
  }

  // 7) الخبرة
  steps.push({
    key: 'experience',
    label: d.labelExperience,
    valid: !!a.experienceLevel,
    content: (
      <Question title={d.experienceTitle} hint={d.experienceHint}>
        <List>
          {experienceChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.experienceLevel === c.value} onClick={() => set({ experienceLevel: c.value, consistency: c.value === 'beginner' ? undefined : a.consistency, splitMode: c.value === 'beginner' ? 'auto' : a.splitMode, advancedSplit: c.value === 'beginner' ? undefined : a.advancedSplit, daysTouched: false })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 8) الانتظام — فقط لغير المبتدئ
  if (a.experienceLevel && !isBeginner) {
    steps.push({
      key: 'consistency',
      label: d.labelConsistency,
      valid: !!a.consistency,
      content: (
        <Question title={d.consistencyTitle} hint={d.consistencyHint}>
          <List>
            {consistencyChoicesV2.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.consistency === c.value} onClick={() => set({ consistency: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 9) بيئة التمرين
  steps.push({
    key: 'environment',
    label: d.labelEnvironment,
    valid: !!a.environment,
    content: (
      <Question title={d.environmentTitle} hint={d.environmentHint}>
        <List>
          {environmentChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.environment === c.value} onClick={() => set({ environment: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 10) أيام التمرين بالأسبوع
  steps.push({
    key: 'days',
    label: d.labelDays,
    valid: a.trainingDays >= BOUNDS.days.min && a.trainingDays <= BOUNDS.days.max,
    content: (
      <Question title={d.daysTitle} hint={dayRecNote}>
        <Stepper value={a.trainingDays} min={BOUNDS.days.min} max={BOUNDS.days.max} onChange={(v) => set({ trainingDays: v, daysTouched: true })} unit={d.daysUnit} d={d} />
        {dayRec && (
          <button type="button" onClick={() => set({ trainingDays: dayRec.days, daysTouched: true })} className="mt-4 w-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">
            <Icon name="Sparkles" className="me-1 inline h-4 w-4" />
            {d.recommended} {dayRec.days} {d.daysUnit}
          </button>
        )}
      </Question>
    ),
  })

  // 11) مدّة الجلسة
  steps.push({
    key: 'duration',
    label: d.labelDuration,
    valid: !!a.sessionDurationMin,
    content: (
      <Question title={d.durationTitle} hint={d.durationHint}>
        <List>
          {sessionDurationChoices.map((c) => (
            <OptionRow key={c.value} icon="Clock" label={cLabel(c)} desc={cDesc(c)} selected={a.sessionDurationMin === c.value} onClick={() => set({ sessionDurationMin: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 12) نمط التقسيمة (تلقائي/متقدّم) — يظهر لغير المبتدئ فقط؛ المبتدئ تقسيمته «تلقائي» دائمًا.
  if (a.experienceLevel && !isBeginner) {
    steps.push({
      key: 'splitMode',
      label: d.labelSplitMode,
      valid: !!a.splitMode,
      content: (
        <Question title={d.splitModeTitle} hint={d.splitModeHint}>
          <List>
            {splitModeChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.splitMode === c.value} onClick={() => set({ splitMode: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 13) اختيار التقسيمة المتقدّمة — فقط لغير المبتدئ وعند advanced
  if (!isBeginner && a.splitMode === 'advanced') {
    steps.push({
      key: 'advancedSplit',
      label: d.labelAdvancedSplit,
      valid: !!a.advancedSplit,
      content: (
        <Question title={d.advancedSplitTitle} hint={d.advancedSplitHint}>
          <List>
            {advancedSplitChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.advancedSplit === c.value} onClick={() => set({ advancedSplit: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 14) النشاط اليومي (NEAT) + تقدير خطوات اختياري
  steps.push({
    key: 'activity',
    label: d.labelActivity,
    valid: !!a.neat,
    content: (
      <Question title={d.activityTitle} hint={d.activityHint}>
        <List>
          {neatChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.neat === c.value} onClick={() => set({ neat: c.value })} />
          ))}
        </List>
        <div className="mt-6 border-t border-night-800 pt-5">
          <Toggle
            checked={a.includeSteps}
            onChange={(v) => set({ includeSteps: v })}
            title={d.activityStepsToggleTitle}
            subtitle={d.activityStepsToggleSubtitle}
          />
          {a.includeSteps && (
            <div className="mt-4">
              <Slider value={a.stepEstimate} min={BOUNDS.steps.min} max={BOUNDS.steps.max} step={500} unit={d.stepsUnit} onChange={(v) => set({ stepEstimate: v })} ariaLabel={d.stepsAria} />
            </div>
          )}
        </div>
      </Question>
    ),
  })

  // 15) أسلوب التغذية
  steps.push({
    key: 'nutritionStyle',
    label: d.labelNutritionStyle,
    valid: !!a.nutritionStyle,
    content: (
      <Question title={d.nutritionStyleTitle} hint={d.nutritionStyleHint}>
        <List>
          {nutritionStyleChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.nutritionStyle === c.value} onClick={() => set({ nutritionStyle: c.value })} />
          ))}
        </List>
      </Question>
    ),
  })

  // 16) عدد الوجبات — فقط عند meal_suggestions
  if (a.nutritionStyle === 'meal_suggestions') {
    steps.push({
      key: 'meals',
      label: d.labelMeals,
      valid: a.mealsPerDay >= BOUNDS.meals.min && a.mealsPerDay <= BOUNDS.meals.max,
      content: (
        <Question title={d.mealsTitle} hint={d.mealsHint}>
          <Stepper value={a.mealsPerDay} min={BOUNDS.meals.min} max={BOUNDS.meals.max} onChange={(v) => set({ mealsPerDay: v })} unit={d.mealsUnit} d={d} />
        </Question>
      ),
    })

    // 16ب) توزيع حجم الوجبات (P2.5) — يغيّر تركيز السعرات بين الوجبات.
    steps.push({
      key: 'mealDistribution',
      label: d.labelMealDistribution,
      valid: !!a.mealDistribution,
      content: (
        <Question title={d.mealDistributionTitle} hint={d.mealDistributionHint}>
          <List>
            {mealDistributionChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.mealDistribution === c.value} onClick={() => set({ mealDistribution: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })

    // 16ج) وقت الجوع الأكثر (P2.5) — يميل توزيع السعرات للصباح أو المساء.
    steps.push({
      key: 'appetiteTiming',
      label: d.labelAppetiteTiming,
      valid: !!a.appetiteTiming,
      content: (
        <Question title={d.appetiteTimingTitle} hint={d.appetiteTimingHint}>
          <List>
            {appetiteTimingChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.appetiteTiming === c.value} onClick={() => set({ appetiteTiming: c.value })} />
            ))}
          </List>
        </Question>
      ),
    })
  }

  // 17) تفضيلات الأكل — اختياري (لا يحجب توليد الخطة)
  steps.push({
    key: 'food',
    label: d.labelFood,
    optional: true,
    valid: true,
    content: (
      <Question title={d.foodTitle} hint={d.foodHint}>
        <p className="mb-3 text-sm font-bold text-night-300">{d.foodPatternLabel}</p>
        <List>
          {dietPatternChoices.map((c) => (
            <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} selected={a.dietPattern === c.value} onClick={() => set({ dietPattern: c.value })} />
          ))}
        </List>
        <div className="mt-6 border-t border-night-800 pt-5">
          <p className="mb-3 text-sm font-bold text-night-300">{d.foodAllergiesLabel}</p>
          <div className="grid grid-cols-2 gap-3">
            {allergyChoices.map((c) => (
              <OptionCard key={c.value} icon={c.icon} label={cLabel(c)} selected={a.allergies.includes(c.value)} onClick={() => toggleIn('allergies', c.value)} />
            ))}
          </div>
        </div>
      </Question>
    ),
  })

  // 18) القيود + المكملات/الأدوية — اختياري (شاشة واحدة، مفصولة داخليًا)
  steps.push({
    key: 'limitations',
    label: d.labelLimitations,
    optional: true,
    valid: true,
    content: (
      <Question title={d.limitationsTitle} hint={d.limitationsHint}>
        <p className="mb-3 text-sm font-bold text-night-300">{d.limitationsInjuriesLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          {injuryChoices.map((c) => (
            <OptionCard key={c.value} icon={c.icon} label={cLabel(c)} selected={a.injuries.includes(c.value)} onClick={() => toggleIn('injuries', c.value)} />
          ))}
        </div>
        <div className="mt-6 border-t border-night-800 pt-5">
          <p className="mb-3 text-sm font-bold text-night-300">{d.limitationsWellnessLabel}</p>
          <List>
            {wellnessModeChoices.map((c) => (
              <OptionRow key={c.value} icon={c.icon} label={cLabel(c)} desc={cDesc(c)} selected={a.wellnessMode === c.value} onClick={() => set({ wellnessMode: c.value })} />
            ))}
          </List>
        </div>
      </Question>
    ),
  })

  // شاشة البناء (لا تُحتسب خطوة نموذج)
  steps.push({ key: 'building', label: d.labelBuilding, content: <span /> })

  // — حالة الخطوة والتنقّل —
  const [stepIndex, setStepIndex] = useState(0)
  const idx = Math.min(stepIndex, steps.length - 1)
  const step = steps[idx]
  const total = steps.length
  // شاشة البناء ليست خطوة نموذج — نستبعدها من العدّاد وشريط التقدّم ليكونا دقيقين.
  const formTotal = total - 1
  const isFirst = idx === 0
  const isBuilding = step.key === 'building'
  const isLastForm = idx === total - 2

  // حفظ المسودة وآخر خطوة بعد كل تغيير (qimmah:onboarding:v1) منسوبةً للمالك الحالي.
  useEffect(() => {
    saveDraft(a, userId)
    setLastStep(idx)
  }, [a, idx, userId])

  // عرض خطوة الأسئلة — إشارة قمع (رقم الخطوة + مفتاحها الثابت فقط، بلا أي إجابة).
  const stepKey = step.key
  const lastStepKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (stepKey === 'building') return
    if (lastStepKeyRef.current === stepKey) return
    lastStepKeyRef.current = stepKey
    track('onboarding_step_viewed', { step: idx, key: stepKey })
  }, [stepKey, idx])

  // الإنهاء: يبني مصدر الحقيقة ويحفظه، ثم يولّد التخصيص للوحة.
  // async (P11.5): مولّد الخطط يُحمَّل كسولًا — شاشة «البناء» (~2.5ث) تغطي التحميل بمرّات.
  const finishRef = useRef<() => void>(() => {})
  finishRef.current = () => {
    void (async () => {
      const op = buildOnboardingProfile(a)
      saveOnboardingProfile(op)
      const built = await buildCustomizationFromOnboarding(op, customization)
      applyCustomization(built)
      // توليد الخطة التلقائية من الأسئلة — إشارة صحّة ميزة.
      track('plan_generated', { source: 'onboarding' })
      // إكمال لكل حساب + حفظ إشارة الإعداد في الملف السحابي (best-effort، لا يعطّل الدخول).
      markCompleted(userId)
      track('onboarding_completed', { planMode: planMode === 'custom' ? 'custom' : 'auto' })
      if (userId) void persistOnboardingToProfile(userId, op)
      // مسار «أصمّم جدولي بنفسي»: نفتح الباني المخصّص بعد التوليد بدل الدخول مباشرةً للوحة.
      // الجدول التلقائي محفوظ أصلًا كأساس/بديل، فيبقى الدخول سليمًا حتى لو ألغى المستخدم.
      if (planMode === 'custom') {
        setShowCustomBuilder(true)
        return
      }
      onComplete()
    })()
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
    if (isFirst) {
      // خروج من أول خطوة دون إكمال — إشارة قمع «مغادرة الإعداد».
      track('onboarding_abandoned', { step: idx })
      return onExit()
    }
    setStepIndex((s) => Math.max(0, s - 1))
  }
  // مخرج الطوارئ الدائم: يضمن ألّا يُحبَس المستخدم أبدًا في المعالج مهما تعطّلت خطوة.
  // يُعلّم الإعداد مكتملًا (الجدول الافتراضي محفوظ أصلًا كأساس) ويدخل اللوحة فورًا.
  const skipToDashboard = () => {
    try {
      markCompleted(userId)
    } catch {
      /* لا شيء يمنع الدخول */
    }
    if (onForceComplete) onForceComplete()
    else onComplete()
  }

  const progress = Math.round(((idx + 1) / formTotal) * 100)

  // مسار الجدول المخصّص: بعد التوليد، نفتح الباني ليصمّم المستخدم جدوله من الصفر.
  // الحفظ يعتمد الجدول المخصّص لهذا الحساب؛ الإلغاء يُبقي الجدول التلقائي المُولّد.
  if (showCustomBuilder) {
    return (
      <CustomPlanBuilder
        lang={lang}
        onSave={(plan) => {
          saveCustomPlan(userId, plan)
          // حفظ جدول مصمَّم يدويًا أثناء الإعداد — إشارة صحّة ميزة.
          track('plan_generated', { source: 'custom' })
          onComplete()
        }}
        onCancel={onComplete}
      />
    )
  }

  if (isBuilding) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night-950 px-8 text-center text-night-100">
        <span className="relative grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <span className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-white">
            <Icon name="Dumbbell" className="h-11 w-11" />
          </span>
        </span>
        <h1 className="mt-8 text-2xl font-black text-night-100">{d.buildingTitle}</h1>
        <p className="mt-2 text-sm text-night-300">{d.buildingSubtitle}</p>
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
          <button type="button" onClick={goBack} aria-label={d.back} className="grid h-10 w-10 place-items-center rounded-xl border border-night-700 bg-night-900 text-night-100">
            <Icon name="ChevronRight" className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-night-100">{step.label}</span>
            <span className="font-bold text-night-300">{idx + 1}/{formTotal}</span>
          </div>
          {/* مخرج طوارئ دائم — «تخطّي الإعداد» يدخل اللوحة فورًا (ضمانة ضد أي حبس في المعالج). */}
          <button
            type="button"
            onClick={skipToDashboard}
            aria-label={lang === 'en' ? 'Skip setup and go to dashboard' : 'تخطّي الإعداد والدخول للوحة'}
            className="whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold text-night-300 hover:text-night-100"
          >
            {lang === 'en' ? 'Skip' : 'تخطّي'}
          </button>
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
                {d.skip}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={step.valid === false}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastForm ? d.buildMyPlan : d.next}
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

/** حقل نصّي بسيط — للاسم الاختياري فقط (إدخال قصير، بلا نص حرّ طويل). */
function TextField({ value, placeholder, maxLength, onChange, ariaLabel }: { value: string; placeholder?: string; maxLength?: number; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      autoComplete="off"
      className="w-full rounded-2xl border border-night-700 bg-night-900 px-5 py-4 text-lg font-bold text-night-100 placeholder:font-normal placeholder:text-night-400 focus:border-primary focus:outline-none"
    />
  )
}

function Stepper({ value, min, max, unit, onChange, d }: { value: number; min: number; max: number; unit: string; onChange: (v: number) => void; d: OnboardingStrings }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-night-700 bg-night-900 p-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={d.decrease} className="grid h-14 w-14 place-items-center rounded-xl bg-night-800 text-night-100 disabled:opacity-30">
        <Icon name="Minus" className="h-6 w-6" />
      </button>
      <div className="text-center">
        <p className="text-4xl font-black text-night-100">{value}</p>
        <p className="text-xs text-night-300">{unit}</p>
      </div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={d.increase} className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-white disabled:opacity-30">
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
