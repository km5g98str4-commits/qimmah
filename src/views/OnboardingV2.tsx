import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { PlanPreview } from '@/components/plan/PlanPreview'
import { PlanWhyPanel } from '@/components/plan/PlanWhyPanel'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { GoalType, Profile } from '@/types/profile'
import { cn } from '@/lib/cn'
import { foldDigits } from '@/lib/numberFormat'
import type { Lang } from '@/lib/appPreferences'
import { V2_GOAL_MODEL, V2_ONBOARDING, type V2GoalValue } from '@/design-system/v2/labels'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { product } from '@/config/product'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { buildPlanArtifactsFromOnboarding, hasCompletedOnboardingProfile, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { markCompleted } from '@/lib/onboarding'
import { getStorageFailure } from '@/lib/safeStorage'
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { trackLocal, SETUP_STEP_NAMES } from '@/lib/tracking'
import { POLICY_LINKS, policyCopy } from '@/data/policyCopy'
import { toAnswersFromV2, type V2Place } from '@/lib/onboardingV2Adapter'
import { isMinorAge } from '@/lib/calculators'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'
import { bodyStepStrings } from '@/i18n/dict/bodyStep'
import { goalWordingFor, onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
import { setupWhyLines } from '@/i18n/dict/setupWhy'
import { trainingHistoryStrings, type HistoryOption } from '@/i18n/dict/trainingHistory'
import { onboardingLifestyleStrings } from '@/i18n/dict/onboardingLifestyle'
import { onboardingEquipmentStrings } from '@/i18n/dict/onboardingEquipment'
import { EQUIPMENT_VALUES } from '@/lib/onboardingKeys'
import { dietPatternChoices, neatChoices } from '@/data/planBuilder'
import type { Equipment } from '@/types/profile'
import type {
  DietPattern,
  LastTrainedBucket,
  NeatLevel,
  TotalMonthsBucket,
  TrainedBefore,
  TrainingConsistency,
} from '@/types/onboarding'
import {
  AGE_RANGE,
  DAYS,
  DURATIONS,
  HISTORY_STEP,
  DEFAULT_EQUIPMENT_FOR_PLACE,
  LAST_INPUT_STEP,
  NAME_MAX_LENGTH,
  canAdvance,
  dietPatternApplies,
  plannedSplitLabelForDays,
  resolveExperienceLevel,
  v2LevelFromExperience,
  isBodyweightOnly,
  withBodyweight,
  clearDraftV2,
  finalizeReduce,
  historyFollowUpsApply,
  goalAllowedForEligibility,
  injuryAreasApply,
  initialDraftV2,
  saveDraftV2,
  validateStep,
  type FinalizeStatus,
  type OnboardingV2Draft,
  type OnboardingQuestionId,
  type StepValidation,
  type V2Gender,
  type V2Intent,
  type V2Level,
} from '@/lib/onboardingV2Flow'
import { isExistingPlanEdit } from '@/lib/customization'
import { PaidActionDenied } from '@/lib/access/guard'
import type { TrialOutcome } from '@/lib/access/entitlementBackend'
import { SynthesisScreen } from '@/views/reveal/SynthesisScreen'
import { RevealJourney } from '@/views/reveal/RevealJourney'
import { RevealValue } from '@/views/reveal/RevealValue'
import { revealStrings } from '@/i18n/dict/reveal'
import { deriveTargetWeight } from '@/lib/planDerive'
import { markPendingTrialIntent } from '@/lib/entryIntent'
import { useAccess } from '@/lib/access/useAccess'

interface OnboardingV2Props {
  lang: Lang
  /** Preview-complete: enters the app via the existing safe local completion path. */
  onComplete: () => void
  /** Exit from the first step (back to Start). */
  onExit: () => void
  /** يسلّم مخرجات التوليد المحفوظة لشاشة التسليم (حزمة ٣). */
  onPlanReady?: (artifacts: { plan: GeneratedPlan; goalType: GoalType; rationale: PlanRationale; profile: Profile }) => void
}

const GOAL_ICON: Record<V2GoalValue, string> = { cut: 'Flame', maintain: 'ShieldCheck', bulk: 'TrendingUp' }

// Stable ids linking each step's region to its heading (aria-labelledby).
// الترتيب: الأساسيات · النية · التاريخ · الهدف · الجدول · السياق · القيود.
const TITLE_ID = [
  'onb-title-body',
  'onb-title-intent',
  'onb-title-history',
  'onb-title-goal',
  'onb-title-training',
  'onb-title-lifestyle',
  'onb-title-limitations',
] as const

/**
 * نصّ حقل رقمي → رقم — **بعد الطيّ، لا قبله**.
 *
 * ═══ العطل الذي وُلد منه ═══
 * الحقول كانت تقرأ `Number(ageText)` مباشرةً. و`Number` تتبع نحو ECMAScript
 * فلا تقبل إلا `0-9`: فـ`Number('٢٤')` تعطي **NaN**. والمستخدم العربي يكتب
 * ٢٤ و١٧٧ و١٠٦ فيرى «أكمل الأربعة بقيم منطقية» — رسالةً تتّهمه بأنه لم يكمل
 * وهو أكمل. وحقلٌ عربيّ واحد يكفي لإسقاط الخطوة كلّها.
 *
 * وأخطر من رسالة الخطأ أثران صامتان: `isMinorAge(NaN)` كاذبة **فلا يُفعَّل
 * حاجز القاصرين**، و`showMinorNote` كاذبة **فلا يظهر التنويه**. أي أن الإدخال
 * العربي كان يُعطِّل ضابطًا امتثاليًا لا حقلَ إدخال فحسب.
 *
 * ولم تكن الطبقة الرقمية ناقصة: `foldDigits` تعالج ٠-٩ و۰-۹ والفاصلة العشرية
 * `٫` وفاصلة الآلاف وعلامات الاتجاه — **والشاشة وحدها لم تكن تستدعيها**.
 * ولذلك مرّت البوّابات خضراء: تفحص الطبقة، لا مستهلكها.
 *
 * ═══ ولماذا الطيّ عند القراءة لا عند الكتابة ═══
 * لو طُوي في `onChange` لانقلب ما يكتبه المستخدم إلى `24` تحت إصبعه. فتبقى
 * **المسوّدة كما كتبها**، ويبقى **المخزَّن غربيًّا قانونيًّا** — وهو نفس عقد
 * `numberFormat`: «التطبيع عند حدّ الإدخال حصرًا، والقيم المخزَّنة تبقى غربية».
 *
 * وتُرجع `null` لغير المقروء بدل `NaN`: العقد أصلًا `number | null`، و`NaN`
 * يمرّ في كل مقارنة صامتًا بينما `null` يُفحص.
 */
function readField(text: string): number | null {
  const folded = foldDigits(text).trim()
  if (folded === '') return null
  const n = Number(folded)
  return Number.isFinite(n) ? n : null
}

const toAr = (n: number, lang: Lang) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)]))

/**
 * Onboarding — a focused seven-screen flow covering body, intent, training
 * history, goal, schedule, daily context and limitations before plan reveal.
 *
 * Async + a11y hardened: plan assembly shows a full-screen loading state; a
 * failure surfaces a visible retry (never a silent drop into the app);
 * per-step Next validation is announced; answers persist as an owner-scoped
 * draft that survives reload and clears on finish; every choice group is a
 * labelled fieldset. Choices map to the existing `Answers` model
 * (onboardingV2Adapter) and run the SAME local generation pipeline v1 uses.
 */
export function OnboardingV2({ lang, onComplete, onExit, onPlanReady }: OnboardingV2Props) {
  const t = V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  const userId = auth.user?.id ?? null
  // الطبقة الثانية فوق حارس الكاتب: تفتح Premium بدل أن تُظهر استثناءً خامًا
  // (درس BUG-001 — الكاتب يرفض بحقّ، لكن المعالج يجب أن يفتح البوّابة أولًا).
  const { guard: guardPaid, can: canPaid } = useAccess()
  const [initialDraft] = useState(() => initialDraftV2(userId))
  /**
   * هل نجحت كتابة ملفّ الإعداد في هذه الجلسة؟ يفتح إعادةَ المحاولة بعد فشل
   * تخزينٍ جزئي بلا بوّابة دفع: المستخدم لا يُطالَب بالدفع ليُكمل ما بدأه حرًّا.
   */
  const completionWriteRef = useRef(false)
  // 0 الأساسيات · 1 النية · 2 التاريخ · 3 الهدف · 4 الجدول · 5 السياق · 6 القيود · 7 جاهز.
  const [step, setStep] = useState(initialDraft.step)
  const [status, setStatus] = useState<FinalizeStatus>('idle')
  // [CTO-009/WP-2] الترحيب يسبق أول سؤال — **لمن يبدأ من الصفر فقط**. من يعود
  // إلى مسودّة محفوظة يُستأنف من حيث وقف، فلا يُعاد ترحيبه كأنه زائر جديد.
  const [showWelcome, setShowWelcome] = useState(initialDraft.step === 0)

  // بيانات الجسم — تُحفظ نصًّا أثناء الكتابة (حالات وسيطة كـ«١» أو «» مسموحة)
  // وتُحوَّل إلى أرقام عند التحقق والحفظ. هكذا لا يُمحى ما يكتبه المستخدم.
  // الاسم — نصّ حرّ اختياري. لا يدخل `validateStep` إطلاقًا: حقل يستطيع
  // المستخدم تركه فارغًا لا يجوز أن يحجب زرّ «التالي» بأي حال.
  const [nameText, setNameText] = useState(initialDraft.name)
  const [ageText, setAgeText] = useState(initialDraft.age == null ? '' : String(initialDraft.age))
  const [gender, setGender] = useState<V2Gender | null>(initialDraft.gender)
  const [heightText, setHeightText] = useState(initialDraft.heightCm == null ? '' : String(initialDraft.heightCm))
  const [weightText, setWeightText] = useState(initialDraft.weightKg == null ? '' : String(initialDraft.weightKg))

  // النية والمستوى — سؤالان قبل الهدف: الأول يحدّد شكل الخطة، والثاني يحدّد
  // **لغة** الأهداف المعروضة (مبتدئ بلغة نتيجة · متقدّم بالمصطلحات القياسية).
  const [intent, setIntent] = useState<V2Intent | null>(initialDraft.intent)
  const [level, setLevel] = useState<V2Level | null>(initialDraft.level)
  const [trainedBefore, setTrainedBefore] = useState<TrainedBefore | null>(initialDraft.trainedBefore)
  const [totalMonths, setTotalMonths] = useState<TotalMonthsBucket | null>(initialDraft.totalMonths)
  const [lastTrained, setLastTrained] = useState<LastTrainedBucket | null>(initialDraft.lastTrained)
  const [trainingConsistency, setTrainingConsistency] = useState<TrainingConsistency | null>(initialDraft.consistency)

  const [goal, setGoal] = useState<V2GoalValue | null>(initialDraft.goal)
  const [days, setDays] = useState(initialDraft.days)
  const [duration, setDuration] = useState(initialDraft.duration)
  const [place, setPlace] = useState<string | null>(initialDraft.place)
  // الأدوات — تُبذَر من المكان وتبقى **قرار المستخدم** بمجرّد أن يلمسها.
  const [equipment, setEquipment] = useState<Equipment[]>(initialDraft.equipment)
  const [equipmentTouched, setEquipmentTouched] = useState(initialDraft.equipmentTouched)
  const [neat, setNeat] = useState<NeatLevel | null>(initialDraft.neat)
  const [dietPattern, setDietPattern] = useState<DietPattern | null>(initialDraft.dietPattern)
  const [hasInjury, setHasInjury] = useState(initialDraft.hasInjury)
  const [injuries, setInjuries] = useState<string[]>(initialDraft.injuries)
  const [healthDataConsent, setHealthDataConsent] = useState(initialDraft.healthDataConsent)
  const [validation, setValidation] = useState<StepValidation>(null)

  // أرقام الجسم المُحوَّلة (NaN حين يكون الحقل فارغًا أو نصًّا غير رقمي).
  const ageNum = readField(ageText)
  const heightNum = readField(heightText)
  const weightNum = readField(weightText)

  // القاصرون (دون 18) — المحافظة فقط.
  // العمر يُجمَع الآن في الخطوة الأولى، فالحاجز يعمل للضيف الجديد أيضًا. سابقًا
  // كان يُستنتج من ملف محفوظ فقط، ما يعني أن كل ضيف جديد يُعامَل كبالغ ويُعرض
  // عليه التنشيف/التضخيم مهما كان عمره — وهو بند امتثال لا خلل وظيفي فحسب.
  const minor = isMinorAge(ageNum ?? customization.profile.age)
  // اختيار بالغ سابق لا يبقى مضغوطًا بعد خفض العمر إلى قاصر. الحجب المرئي
  // وحده لا يكفي: الحالة نفسها تُبطل قبل أن تُحفظ أو تُستخدم في الملخّص.
  useEffect(() => {
    const allowed = goalAllowedForEligibility(goal, minor)
    if (allowed !== goal) {
      setGoal(allowed)
      setValidation(null)
    }
  }, [goal, minor])
  const intentT = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  // ن٢: نصوص خطوة الأساسيات تلزم الفوتر أيضًا — رسالة «تحت الحدّ» تُعرض هناك.
  const bodyT = bodyStepStrings[lang] ?? bodyStepStrings.ar
  const historyT = trainingHistoryStrings[lang] ?? trainingHistoryStrings.ar
  const lifestyleT = onboardingLifestyleStrings[lang] ?? onboardingLifestyleStrings.ar
  const equipmentT = onboardingEquipmentStrings[lang] ?? onboardingEquipmentStrings.ar
  // صياغة الأهداف تتبع المستوى المُعلن — نفس القيم المخزّنة، لغة مختلفة.
  const goalWording = useMemo(() => goalWordingFor(lang, level), [lang, level])
  // سطر «ليش نسأل» للخطوات السبع من مصدر واحد، بترتيب التدفّق.
  const whyLines = useMemo(() => setupWhyLines(lang), [lang])
  const goalLabel = goal ? goalWording[goal].label : ''
  const levelLabel = intentT.levels.find((l) => l.value === level)?.label ?? ''
  /**
   * المستوى الذي **سيُبرمَج فعلًا** — من المصنّف نفسه الذي يستهلكه المولّد،
   * لا من نسخة ثانية من قواعده. حين يختلف عن المُعلن نقولها بجملة واحدة
   * هادئة بدل أن نتركه يظنّ أن جوابه هو ما نُفِّذ.
   */
  const programmedLevel = useMemo(
    () => v2LevelFromExperience(resolveExperienceLevel(level, trainedBefore, totalMonths, lastTrained, trainingConsistency)),
    [level, trainedBefore, totalMonths, lastTrained, trainingConsistency],
  )
  const programmedLevelLabel = programmedLevel ? intentT.levels.find((l) => l.value === programmedLevel)?.label ?? '' : ''
  const levelWasAdjusted = Boolean(level && programmedLevel && programmedLevel !== level && levelLabel && programmedLevelLabel)
  const intentLabel = intentT.intents.find((i) => i.value === intent)?.label ?? ''
  const answers = {
    age: ageNum, gender, heightCm: heightNum, weightKg: weightNum,
    intent, level, trainedBefore, totalMonths, lastTrained, consistency: trainingConsistency,
    goal, days, duration, place: place as V2Place | null, equipment, neat, dietPattern, hasInjury, injuries, healthDataConsent,
  }

  /**
   * [CTO-73] التصادم ع-١ — الإعداد تدفّق يستولي على الشاشة (`fixed inset-0 z-50`)،
   * فيُعلن ذلك كما تُعلنه الجلسة النشطة. الأثر المباشر: شريط «ثبّت التطبيق»
   * (`z-[60]`) يتوقّف عن تغطية زرّ «التالي» وزرّ «الدخول للوحة».
   */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: true }))
    return () => { window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: false })) }
  }, [])

  // [CTO-68] الحدثان ١ و٢ — بدء الإعداد، والوصول إلى كل خطوة **باسمها**.
  //
  // «بدء الإعداد» مرّة واحدة لكل دخول للتدفّق، ومعه `resumed` لتمييز من استأنف
  // مسوّدة محفوظة عمّن بدأ من الصفر — وإلا اختلط المستأنِفون بالقادمين الجدد.
  useEffect(() => {
    trackLocal('setup_started', { resumed: initialDraft.step > 0 })
    // مرّة واحدة عند التركيب فقط — الاستئناف تركيب جديد بطبيعته.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // «الوصول إلى الخطوة» هو الأصل الذي يُشتقّ منه السقوط: آخر خطوة وُصلت في جلسة
  // لم يتبعها `setup_completed` هي نقطة السقوط. يشمل خطوة «جاهز» (الوصول للمراجعة
  // دون ضغط الدخول سقوطٌ في أغلى نقطة، ولا يُرى بلا هذا الحدث).
  useEffect(() => {
    const name = SETUP_STEP_NAMES[step]
    if (name) trackLocal('setup_step_reached', { step: name })
  }, [step])

  // Persist the draft on every answer/step change — a reload resumes here.
  // Never while the plan is being built or after a successful finish.
  useEffect(() => {
    if (status === 'building' || status === 'done') return
    const draft: OnboardingV2Draft = {
      step, name: nameText, age: ageNum, gender, heightCm: heightNum, weightKg: weightNum,
      intent, level, trainedBefore, totalMonths, lastTrained, consistency: trainingConsistency,
      goal, days, duration, place: place as V2Place | null, equipment, equipmentTouched, neat, dietPattern,
      hasInjury, injuries, healthDataConsent,
    }
    saveDraftV2(draft, userId)
  }, [step, nameText, ageNum, gender, heightNum, weightNum, intent, level, trainedBefore, totalMonths, lastTrained, trainingConsistency, goal, days, duration, place, equipment, equipmentTouched, neat, dietPattern, hasInjury, injuries, healthDataConsent, status, userId])

  // Auto-dismiss a shown validation message once the step becomes complete.
  useEffect(() => {
    if (validation && canAdvance(step, answers)) setValidation(null)
    // answers is derived each render; the primitive fields are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, step, intent, level, trainedBefore, totalMonths, lastTrained, trainingConsistency, goal, days, duration, place, equipment, neat, dietPattern, hasInjury, injuries, healthDataConsent])

  const next = () => {
    const v = validateStep(step, answers)
    if (v) {
      setValidation(v)
      return
    }
    setValidation(null)
    setStep((s) => Math.min(LAST_INPUT_STEP + 1, s + 1))
  }
  const back = () => {
    setValidation(null)
    if (step === 0) return onExit()
    setStep((s) => s - 1)
  }
  const toggleInjury = (v: string) =>
    setInjuries((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]))
  const onTrainedBefore = (value: TrainedBefore) => {
    setTrainedBefore(value)
    if (!historyFollowUpsApply(value)) {
      setTotalMonths(null)
      setLastTrained(null)
      setTrainingConsistency(null)
    }
    setValidation(null)
  }
  /**
   * اختيار المكان يبذر الأدوات **مرّة واحدة**: بعد أول لمسة من المستخدم صارت
   * قائمته هي الحقيقة، فلا يدهسها تبديل مكانٍ لاحق. لا أحد يواجه قائمة فارغة،
   * ولا أحد يُحبَس في افتراضنا.
   */
  const onPlace = (value: string) => {
    setPlace(value)
    if (!equipmentTouched) {
      const seeded = DEFAULT_EQUIPMENT_FOR_PLACE[value as V2Place]
      if (seeded) setEquipment(withBodyweight(seeded))
    }
    setValidation(null)
  }
  const onEquipment = (value: Equipment) => {
    setEquipmentTouched(true)
    setEquipment((list) => {
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
      // وزن الجسم لا يُنزع — نزعُه يترك المستخدم بلا حركة ممكنة واحدة.
      return withBodyweight(next)
    })
    setValidation(null)
  }
  const onHasInjury = (value: boolean) => {
    setHasInjury(value)
    if (!value) setInjuries([])
    setValidation(null)
  }

  // Real completion: map v2 choices → Answers, then run v1's local generation
  // pipeline. Visible failure: on any throw we surface the error screen with a
  // retry and DO NOT enter the app. On success we clear the draft and enter.
  const finalize = () => {
    if (status === 'building') return
    setStatus((s) => finalizeReduce(s, 'start'))
    void (async () => {
      try {
        // DEV-only preview seam to exercise the async states without a real
        // failure. `hang` holds the loading state (for observing it); `error`
        // throws so the failure/retry UI shows. Zero effect in production.
        if (import.meta.env.DEV) {
          const mode = readForceFail()
          if (mode === 'hang') await new Promise(() => {})
          if (mode === 'error') throw new Error('forced onboarding failure (dev preview)')
        }
        const built0 = toAnswersFromV2({
          name: nameText,
          age: ageNum, gender, heightCm: heightNum, weightKg: weightNum,
          intent, level, trainedBefore, totalMonths, lastTrained, consistency: trainingConsistency,
          goal, days, duration, place: place as V2Place | null, equipment, neat, dietPattern,
          hasInjury: hasInjury === true,
          injuries: hasInjury === true ? injuries : [],
          healthDataConsent,
        })
        const op = buildOnboardingProfile(built0)
        // تحوير خطة قائمة = `plan.saveEdit` مدفوع. أوّل إكمال يمرّ حرًّا.
        // يُفحص **قبل** أي كتابة: saveOnboardingProfile وapplyCustomization
        // وmarkCompleted وpersistOnboardingToProfile كلها بعد هذا السطر.
        // بوّابتان في الأسفل تحرسان `plan.saveEdit` بسؤالين مختلفين:
        // `saveCustomization` يسأل `isExistingPlanEdit()`، و`saveOnboardingProfile`
        // يسأل `hasCompletedOnboardingProfile()`. فالفحص هنا يجمعهما — أي شرط
        // يرمي في الأسفل يجب أن يُلتقط هنا أوّلًا، وإلّا صار المنعُ «عطلًا».
        if ((isExistingPlanEdit() || hasCompletedOnboardingProfile()) && !canPaid('plan.saveEdit')) {
          // [SOVEREIGN-ENTRY-001] استثناء واحد داخل البوّابة لا حولها: إعادة
          // المحاولة بعد **فشل تخزين جزئي في هذه الجلسة نفسها** ليست تحويرًا
          // لخطة قائمة، بل إتمامًا لنفس الإكمال المجاني. بلا هذا الاستثناء
          // يُطالَب المستخدم بالدفع ليتعافى من عطلٍ عندنا (تقرير R10 §A2c).
          // والشرط ضيّق: مرجع في الذاكرة لا يعيش بعد إعادة التحميل، فلا يفتح
          // بابًا لتحوير خطة في جلسة جديدة.
          if (!completionWriteRef.current) {
            guardPaid('plan.saveEdit', () => {})()
            // 'reset' → idle: البوّابة مفتوحة والشاشة تعود قابلة للتفاعل،
            // ولا تُعرَض شاشة خطأ — المنع ليس عطلًا.
            setStatus((st) => finalizeReduce(st, 'reset'))
            return
          }
        }
        // ═══ سلسلة صدق الحفظ (الميثاق §5 · النمط المرجعي: `finishWorkout.ts`) ═══
        // تأكيد ← كتابة ← **فحص** ← عند الفشل: استرجاع اللقطة + رسالة صادقة +
        // **بقاء البيانات**. كان كل ما تحت هذا السطر يعمل بلا فحص واحد: شاشة
        // النجاح و`markCompleted` و`clearDraftV2` تُطلق جميعها بلا قيد بعد
        // كتابتين غير مفحوصتين. فعلى جهاز محجوب التخزين يكمل المستخدم إعداده،
        // ويرى خطته الحقيقية **من الذاكرة**، وتُمحى مسودّته القابلة للاستئناف،
        // ثم تعرض عليه إعادةُ التحميل خطةَ شخصٍ آخر. كل إدخالاته تضيع.
        const profileWrite = saveOnboardingProfile(op)
        if (profileWrite !== 'ok') {
          // لا مسح مسودّة، ولا وسم إكمال، ولا شاشة نجاح. البيانات كلها في مكانها.
          setStatus((st) => finalizeReduce(st, 'storageFail'))
          return
        }
        // نجحت كتابة مرساة الاسترجاع ⇒ إعادة المحاولة بعدها **ليست تحويرًا
        // لخطة قائمة** بل إتمامًا لنفس الإكمال. بلا هذا العلم يصير المستخدم
        // مطالَبًا بالدفع ليتعافى من عطلٍ عندنا (تقرير R10 §A2c).
        completionWriteRef.current = true
        const artifacts = await buildPlanArtifactsFromOnboarding(op, customization)
        // اللقطة قبل التطبيق — `applyCustomization` يضع الحالة في الذاكرة أوّلًا
        // ثم يكتب، وكاتبه لا يُرجع نتيجة. فنقيس الكتابة بمؤشّر الفشل العالمي
        // (نفس ما يفعله `finishWorkout.ts:89-97` على نفس صنف الكتابة).
        const snapshot = customization
        const failureBefore = getStorageFailure()
        applyCustomization(artifacts.customization)
        if (getStorageFailure() !== failureBefore) {
          applyCustomization(snapshot) // استرجاع اللقطة: لا خطة معروضة بلا خطة محفوظة
          setStatus((st) => finalizeReduce(st, 'storageFail'))
          return
        }
        markCompleted(userId)
        if (getStorageFailure() !== failureBefore) {
          applyCustomization(snapshot)
          setStatus((st) => finalizeReduce(st, 'storageFail'))
          return
        }
        // نفس التوليد الذي حُفظ يُسلَّم للتسليم — لا توليد ثانٍ للعرض.
        onPlanReady?.({ plan: artifacts.generated, goalType: artifacts.profile.goalType, rationale: artifacts.rationale, profile: artifacts.profile })
        // [CTO-68] الحدث ٣ — إكمال الإعداد. **بعد** بناء الخطة وحفظها ووسمها مكتملة،
        // لا عند ضغط الزر: الفشل يرمي قبل هذا السطر فلا يُسجَّل إكمال لم يحدث.
        trackLocal('setup_completed', {})
        // Cloud parity — EXACTLY as v1 (PlanBuilder): best-effort, fire-and-forget,
        // only when signed in. persistOnboardingToProfile never throws.
        if (userId) void persistOnboardingToProfile(userId, op)
        clearDraftV2(userId) // discard the resumable draft — setup is complete
        setStatus((s) => finalizeReduce(s, 'ok'))
        onComplete()
      } catch (error) {
        // المنع ليس عطلًا. لو أفلت فعل مدفوع من الفحص أعلاه — لأن كاتبًا جديدًا
        // أضاف حارسًا لا تعرفه الواجهة — فالمخرج بوّابة Premium لا شاشة الخطأ:
        // «ما قدرنا نجهّز الخطة» تكذب على المستخدم، وزرّ الإعادة معها لا ينجح
        // أبدًا لأن السبب ليس عطلًا عابرًا (الميثاق §٥: الصدق قبل الطمأنينة).
        if (error instanceof PaidActionDenied) {
          guardPaid(error.action, () => {})()
          setStatus((st) => finalizeReduce(st, 'reset'))
          return
        }
        // Visible failure — surface retry, keep the user in setup (draft intact).
        setStatus((s) => finalizeReduce(s, 'fail'))
      }
    })()
  }

  // [CTO-009/WP-2] الترحيب — قبل أول سؤال، ولمن يبدأ من الصفر وحده.
  if (showWelcome) {
    return <WelcomeScreen lang={lang} t={t} onStart={() => setShowWelcome(false)} onExit={onExit} />
  }

  // Ready screen (+ async overlays). Building/error overlay ON TOP so the CTA
  // stays mounted with aria-busy during async work.
  if (step === LAST_INPUT_STEP + 1) {
    return (
      <>
        <ReadyScreen
          lang={lang}
          t={t}
          goalLabel={goalLabel}
          days={days}
          duration={duration}
          split={plannedSplitLabelForDays(days, t.training.splits)}
          placeLabel={t.places.find((p) => p.value === place)?.label ?? ''}
          levelRow={levelLabel ? (levelWasAdjusted ? intentT.summaryLevelProgrammed(programmedLevelLabel) : intentT.summaryLevel(levelLabel)) : ''}
          levelNote={levelWasAdjusted ? intentT.levelAdjustedNote(levelLabel, programmedLevelLabel) : ''}
          focusRow={intentLabel ? intentT.summaryFocus(intentLabel) : ''}
          busy={status === 'building'}
          onEnter={finalize}
        />
        {/* [OVERNIGHT-4] القصّة تتبع العمل ولا تقوده — `done` تأتي من الحالة
            الحقيقية، فلا يمشي عدّاد بلا عمل خلفه (§6.1). */}
        {status === 'building' && <SynthesisScreen lang={lang} done={false} />}
        {status === 'error' && <ErrorScreen lang={lang} t={t} onRetry={finalize} onDismiss={() => setStatus('idle')} />}
        {status === 'storage' && <StorageBlockedScreen lang={lang} t={t} onRetry={finalize} onDismiss={() => setStatus('idle')} />}
      </>
    )
  }

  const stepTitleId = TITLE_ID[step]
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-dark fixed inset-0 z-50 flex flex-col bg-page text-ink-900">
      {/* Header — back + segmented progress + step label. */}
      <header className="shrink-0 px-5" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            aria-label={t.back}
            data-testid="onboarding-back"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-700"
          >
            <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          {/* عدّاد الخطوات من قاموس هذه الموجة: العدد مشتق من آلة التدفّق، والنص
              المركزي في labels.ts مثبَّت على «من ٤» — فلا نعدّل قاموسًا مشتركًا. */}
          <span className="text-sm font-bold text-ink-500">{intentT.stepOf(toAr(step + 1, lang), toAr(LAST_INPUT_STEP + 1, lang))}</span>
          <span className="h-11 w-11" />
        </div>
        <div className="mx-auto mt-3 flex w-full max-w-md gap-1.5">
          {Array.from({ length: LAST_INPUT_STEP + 1 }, (_, i) => i).map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'v2-bg-blue' : 'bg-line')} />
          ))}
        </div>
      </header>

      {/* Content — each step is a region named by its heading. */}
      <main className="app-scroll flex-1 overflow-y-auto px-5 py-6">
        <div className="v2-screen-enter mx-auto w-full max-w-md">
          {step === 0 && (
            <BodyStep
              lang={lang}
              titleId={stepTitleId}
              why={whyLines[0]}
              name={nameText}
              onName={setNameText}
              age={ageText}
              gender={gender}
              heightCm={heightText}
              weightKg={weightText}
              healthDataConsent={healthDataConsent}
              onConsent={setHealthDataConsent}
              onAge={(v) => {
                setAgeText(v)
                // الطيّ هنا كذلك: بلا الطيّ كانت `isMinorAge(NaN)` كاذبة فلا يُفعَّل الحاجز.
                const nextAge = readField(v) ?? 0
                if (isMinorAge(nextAge)) setGoal((current) => goalAllowedForEligibility(current, true))
                setValidation(null)
              }}
              onGender={(g) => { setGender(g); setValidation(null) }}
              onHeight={(v) => { setHeightText(v); setValidation(null) }}
              onWeight={(v) => { setWeightText(v); setValidation(null) }}
            />
          )}
          {step === 1 && (
            <IntentStep
              lang={lang}
              titleId={stepTitleId}
              why={whyLines[1]}
              intent={intent}
              level={level}
              onIntent={(v) => {
                setIntent(v)
                // نية جديدة لا تحمل معها جواب نمط أكل لم يعد يُعرض.
                if (!dietPatternApplies(v)) setDietPattern(null)
                setValidation(null)
              }}
              onLevel={(v) => { setLevel(v); setValidation(null) }}
            />
          )}
          {step === HISTORY_STEP && (
            <TrainingHistoryStep
              lang={lang}
              titleId={stepTitleId}
              why={whyLines[2]}
              trainedBefore={trainedBefore}
              totalMonths={totalMonths}
              lastTrained={lastTrained}
              consistency={trainingConsistency}
              onTrainedBefore={onTrainedBefore}
              onTotalMonths={(v) => { setTotalMonths(v); setValidation(null) }}
              onLastTrained={(v) => { setLastTrained(v); setValidation(null) }}
              onConsistency={(v) => { setTrainingConsistency(v); setValidation(null) }}
            />
          )}
          {step === 3 && <GoalStep lang={lang} t={t} titleId={stepTitleId} why={whyLines[3]} goal={goal} wording={goalWording} isMinor={minor} onPick={(g) => { if (minor && (g === 'cut' || g === 'bulk')) return; setGoal(g); setValidation(null) }} />}
          {step === 4 && (
            <TrainingStep t={t} titleId={stepTitleId} why={whyLines[4]} lang={lang} days={days} duration={duration} onDays={setDays} onDuration={setDuration} goalLabel={goalLabel} split={plannedSplitLabelForDays(days, t.training.splits)} />
          )}
          {step === 5 && (
            <LifestyleStep
              lang={lang}
              t={t}
              titleId={stepTitleId}
              why={whyLines[5]}
              place={place}
              equipment={equipment}
              intent={intent}
              neat={neat}
              dietPattern={dietPattern}
              onPlace={onPlace}
              onEquipment={onEquipment}
              onNeat={(v) => { setNeat(v); setValidation(null) }}
              onDietPattern={(v) => { setDietPattern(v); setValidation(null) }}
            />
          )}
          {step === 6 && (
            <LimitationsStep
              lang={lang}
              t={t}
              titleId={stepTitleId}
              why={whyLines[6]}
              hasInjury={hasInjury}
              injuries={injuries}
              onHasInjury={onHasInjury}
              onInjury={toggleInjury}
            />
          )}
        </div>
      </main>

      {/* Footer CTA + inline validation (announced). */}
      <footer className="shrink-0 border-t border-line bg-page/90 px-5 py-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}>
        <div className="mx-auto w-full max-w-md">
          {/* High-contrast text + danger icon/border (not colour-only) so the
              message stays AA-legible on both the light and dark token themes. */}
          {validation && (
            <p role="alert" className="v2-error-panel mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold text-ink-900">
              <Icon name="AlertCircle" className="v2-error-icon h-4 w-4 shrink-0" />
              <span>
                {validation === 'healthConsent'
                  ? policyCopy[lang].healthConsentRequired
                  : validation === 'intentLevel'
                    ? intentT.validation
                    : validation === 'trainingHistory'
                      ? historyT.validation
                    : validation === 'ageBelowMin'
                      ? bodyT.ageBelowMin
                      : validation === 'equipment'
                        ? equipmentT.validation
                      : validation === 'lifestyle'
                        ? lifestyleT.contextValidation
                        : validation === 'limitations'
                          ? lifestyleT.limitationsValidation
                          : t.validation[validation]}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={next}
            aria-disabled={!canAdvance(step, answers)}
            data-testid="onboarding-next"
            className="btn-primary w-full py-4 text-[1.1875rem]"
          >
            {step === LAST_INPUT_STEP ? t.equipment.cta : t.next}
          </button>
        </div>
      </footer>
    </div>
  )
}

// DEV-only preview switch (see finalize). Guarded by import.meta.env.DEV at the
// call site. 'hang' → stay on the loading screen; 'error' → surface the failure.
function readForceFail(): 'off' | 'hang' | 'error' {
  try {
    if (typeof localStorage === 'undefined') return 'off'
    const v = localStorage.getItem('qimmah:onboarding:force-fail')
    return v === 'hang' ? 'hang' : v === '1' ? 'error' : 'off'
  } catch {
    return 'off'
  }
}

type T = (typeof V2_ONBOARDING)['ar']

/** A choice group wrapped as a labelled fieldset (legend is sr-only). */
function Group({ questionId, legend, children, className }: { questionId?: OnboardingQuestionId; legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset data-question-id={questionId} className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{legend}</legend>
      {children}
    </fieldset>
  )
}

/**
 * عنوان الخطوة + سطر «ليش نسأل». [CTO-72] البند ٢.
 *
 * `why` **إلزامي** لا اختياري عمدًا: حين كان `subtitle?` اختياريًا، شحنت خطوة
 * الهدف بلا أي سياق ولم يعترض شيء. الآن خطوة تُرسم بعنوان بلا سياق **لا
 * تُترجم**. والمصدر واحد (`setupWhyLines`) فلا يتفرّق السطر بين القواميس.
 */
function StepTitle({ id, title, why }: { id: string; title: string; why: string }) {
  return (
    <div className="animate-fade-up">
      <h1 id={id} className="text-[1.7rem] font-black leading-tight tracking-tight text-ink-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{why}</p>
    </div>
  )
}

/**
 * حقل رقمي واحد من خطوة الجسد.
 *
 * `inputMode="numeric"` لا `type="number"`: يفتح لوحة أرقام على الجوال بلا
 * أسهم زيادة/نقصان ولا تمرير عجلة يغيّر القيمة بالخطأ. والقيمة تبقى نصًّا
 * أثناء الكتابة كي لا يُمحى ما يكتبه المستخدم عند حالة وسيطة غير صالحة.
 */
function NumField({
  id, questionId, label, unit, placeholder, value, onChange,
}: { id: string; questionId: OnboardingQuestionId; label: string; unit: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} data-question-id={questionId} className="block">
      <span className="mb-1.5 block text-[0.82rem] font-bold text-ink-700">{label}</span>
      <span className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-ink-400">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // ≥16px يمنع تكبير iOS التلقائي عند التركيز.
          className="min-w-0 flex-1 bg-transparent text-[1rem] font-bold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
        />
        <span className="shrink-0 text-[0.8rem] font-bold text-ink-500">{unit}</span>
      </span>
    </label>
  )
}

/**
 * الخطوة الأولى — بيانات الجسم.
 *
 * كانت غائبة تمامًا: التدفّق لا يسأل العمر ولا الجنس ولا الطول ولا الوزن،
 * فتسقط كلها على قيم افتراضية ثابتة (٢٥ سنة · ١٧٠سم · ٧٥كجم) — أي **نفس BMR
 * لكل مستخدمي التطبيق**. وبلا عمر، حاجز القاصرين لا يُفعَّل أصلًا.
 */
function BodyStep({
  lang, titleId, why, name, age, gender, heightCm, weightKg, healthDataConsent, onName, onAge, onGender, onHeight, onWeight, onConsent,
}: {
  lang: Lang; titleId: string; why: string
  name: string; age: string; gender: V2Gender | null; heightCm: string; weightKg: string; healthDataConsent: boolean
  onName: (v: string) => void
  onAge: (v: string) => void; onGender: (g: V2Gender) => void; onHeight: (v: string) => void; onWeight: (v: string) => void
  onConsent: (checked: boolean) => void
}) {
  const s = bodyStepStrings[lang]
  const policy = policyCopy[lang]
  // بلا الطيّ كان التنويه يختفي كلّما كُتب العمر بالعربية.
  const parsedAge = readField(age) ?? Number.NaN
  const showMinorNote = Number.isFinite(parsedAge) && parsedAge >= AGE_RANGE.min && parsedAge < 18
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.title} why={why} />

      {/* الموافقة الصحية **قبل** أي حقل — الإذن يسبق الجمع لا يليه. */}
      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm leading-relaxed text-ink-500">{policy.healthExplanation}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-start text-sm font-bold leading-relaxed text-ink-900">
          <input type="checkbox" checked={healthDataConsent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span>{policy.healthConsent} · <a href={POLICY_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="text-[color:var(--v2-blue-on-dark)] underline underline-offset-2">{policy.privacy}</a></span>
        </label>
      </div>

      <Group legend={s.title} className="mt-5 block space-y-4">
        {/* الاسم أولًا: سؤال دافئ بلا رقم يفتح الشاشة، ومصرَّح باختياريّته
            في سطره لا في تلميح مخفي. */}
        <label htmlFor="v2-body-name" data-question-id="profile.display_name" className="block">
          <span className="mb-1.5 block text-[0.82rem] font-bold text-ink-700">{s.nameQ}</span>
          <span className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-ink-400">
            <input
              id="v2-body-name"
              type="text"
              autoComplete="given-name"
              maxLength={NAME_MAX_LENGTH}
              placeholder={s.namePlaceholder}
              value={name}
              onChange={(e) => onName(e.target.value)}
              aria-label={s.nameLabel}
              aria-describedby="v2-body-name-optional"
              // ≥16px يمنع تكبير iOS التلقائي عند التركيز.
              className="min-w-0 flex-1 bg-transparent text-[1rem] font-bold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
            />
          </span>
          <span id="v2-body-name-optional" className="mt-1.5 block text-[0.78rem] leading-snug text-ink-500">{s.nameOptional}</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <NumField id="v2-body-age" questionId="body.age" label={s.ageLabel} unit={s.ageUnit} placeholder={s.agePlaceholder} value={age} onChange={onAge} />
          <NumField id="v2-body-height" questionId="body.height" label={s.heightLabel} unit={s.heightUnit} placeholder={s.heightPlaceholder} value={heightCm} onChange={onHeight} />
        </div>
        <NumField id="v2-body-weight" questionId="body.weight" label={s.weightLabel} unit={s.weightUnit} placeholder={s.weightPlaceholder} value={weightKg} onChange={onWeight} />

        <Group questionId="body.sex" legend={s.genderLabel}>
          <span className="mb-1.5 block text-[0.82rem] font-bold text-ink-700">{s.genderLabel}</span>
          <div className="flex gap-3">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGender(g)}
                aria-pressed={gender === g}
                data-choice={g}
                className={cn(
                  'min-h-[44px] flex-1 rounded-2xl border px-4 py-3 text-[0.9rem] font-bold transition',
                  gender === g ? 'border-ink-900 bg-ink-900 text-page' : 'border-line bg-surface text-ink-700',
                )}
              >
                {g === 'male' ? s.genderMale : s.genderFemale}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.78rem] leading-snug text-ink-500">{s.genderNote}</p>
        </Group>
      </Group>

      {showMinorNote && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
          {s.minorNote}
        </p>
      )}

    </section>
  )
}

/**
 * صف اختيار واحد بعنوان ووصف — يُستخدم للنية والمستوى.
 * هدف لمس ≥44px، ودلالة اختيار غير لونية (شارة صح) لا لونًا فقط (WCAG 1.4.1).
 */
function ChoiceRow({ value, label, desc, icon, selected, onSelect }: { value: string; label: string; desc: string; icon: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-choice={value}
      className={cn(
        'v2-pressable relative flex min-h-[44px] w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-start',
        selected ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
      )}
    >
      <span className={cn('absolute inset-y-0 start-0 w-1 transition-colors', selected ? 'v2-choice-accent' : 'bg-transparent')} />
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors', selected ? 'v2-choice-icon-selected' : 'bg-beige text-ink-500')}>
        <Icon name={icon} className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-black text-ink-900">{label}</span>
        <span className="mt-0.5 block text-[0.78rem] leading-snug text-ink-500">{desc}</span>
      </span>
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', selected ? 'v2-choice-icon-selected border-[color:var(--v2-blue)]' : 'border-line text-transparent')}>
        <Icon name="Check" className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  )
}

/**
 * الخطوة الثانية — النية والمستوى.
 *
 * سؤالان **يغيّران المخرجات فعلًا**، لا تجميل:
 *   • النية ⇒ أسلوب التغذية (اقتراح وجبات / أرقام فقط / إرشاد مبسّط).
 *   • المستوى المعلن ⇒ صياغة الأهداف؛ تاريخ التدريب في الخطوة التالية يحسم
 *     مستوى الخبرة التشغيلي بلا سنوات رقمية مكرّرة.
 *
 * لماذا هنا لا في الموضع الأول؟ الموضع الأول يملكه حاجز الموافقة الصحية — انظر
 * التعليق المطوّل فوق `validateStep` في `onboardingV2Flow.ts`.
 */
function IntentStep({
  lang, titleId, why, intent, level, onIntent, onLevel,
}: {
  lang: Lang; titleId: string; why: string
  intent: V2Intent | null; level: V2Level | null
  onIntent: (v: V2Intent) => void; onLevel: (v: V2Level) => void
}) {
  const s = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.title} why={why} />

      <Group questionId="intent.primary" legend={s.legends.intent} className="block">
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{s.intentQ}</p>
        <div className="space-y-2.5">
          {s.intents.map((o) => (
            <ChoiceRow key={o.value} value={o.value} label={o.label} desc={o.desc} icon={o.icon} selected={intent === o.value} onSelect={() => onIntent(o.value)} />
          ))}
        </div>
      </Group>

      <Group questionId="experience.declared" legend={s.legends.level} className="block">
        <p className="mt-7 mb-3 text-sm font-bold text-ink-700">{s.levelQ}</p>
        <div className="space-y-2.5">
          {s.levels.map((o) => (
            <ChoiceRow key={o.value} value={o.value} label={o.label} desc={o.desc} icon={o.icon} selected={level === o.value} onSelect={() => onLevel(o.value)} />
          ))}
        </div>
      </Group>

    </section>
  )
}

function HistoryRow<V extends string>({ option, selected, onSelect }: { option: HistoryOption<V>; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-choice={option.value}
      className={cn(
        'v2-pressable relative flex min-h-[44px] w-full items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-start',
        selected ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
      )}
    >
      <span className={cn('absolute inset-y-0 start-0 w-1', selected ? 'v2-choice-accent' : 'bg-transparent')} />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] font-bold text-ink-900">{option.label}</span>
        {option.hint && <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-500">{option.hint}</span>}
      </span>
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', selected ? 'v2-choice-icon-selected border-[color:var(--v2-blue)]' : 'border-line text-transparent')}>
        <Icon name="Check" className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  )
}

function HistoryGroup<V extends string>({
  questionId, legend, question, options, value, onSelect,
}: {
  questionId: OnboardingQuestionId
  legend: string
  question: string
  options: readonly HistoryOption<V>[]
  value: V | null
  onSelect: (v: V) => void
}) {
  return (
    <Group questionId={questionId} legend={legend} className="block">
      <p className="mt-7 mb-3 text-sm font-bold text-ink-700">{question}</p>
      <div className="space-y-2">
        {options.map((option) => (
          <HistoryRow key={option.value} option={option} selected={value === option.value} onSelect={() => onSelect(option.value)} />
        ))}
      </div>
    </Group>
  )
}

function TrainingHistoryStep({
  lang, titleId, why, trainedBefore, totalMonths, lastTrained, consistency,
  onTrainedBefore, onTotalMonths, onLastTrained, onConsistency,
}: {
  lang: Lang; titleId: string; why: string
  trainedBefore: TrainedBefore | null
  totalMonths: TotalMonthsBucket | null
  lastTrained: LastTrainedBucket | null
  consistency: TrainingConsistency | null
  onTrainedBefore: (v: TrainedBefore) => void
  onTotalMonths: (v: TotalMonthsBucket) => void
  onLastTrained: (v: LastTrainedBucket) => void
  onConsistency: (v: TrainingConsistency) => void
}) {
  const s = trainingHistoryStrings[lang] ?? trainingHistoryStrings.ar
  const showFollowUps = historyFollowUpsApply(trainedBefore)
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.title} why={why} />
      <HistoryGroup questionId="history.trained_before" legend={s.legends.trainedBefore} question={s.trainedBeforeQ} options={s.trainedBefore} value={trainedBefore} onSelect={onTrainedBefore} />
      {showFollowUps && (
        <>
          <HistoryGroup questionId="history.total_months" legend={s.legends.totalMonths} question={s.totalMonthsQ} options={s.totalMonths} value={totalMonths} onSelect={onTotalMonths} />
          <HistoryGroup questionId="history.last_trained" legend={s.legends.lastTrained} question={s.lastTrainedQ} options={s.lastTrained} value={lastTrained} onSelect={onLastTrained} />
          <HistoryGroup questionId="history.consistency" legend={s.legends.consistency} question={s.consistencyQ} options={s.consistency} value={consistency} onSelect={onConsistency} />
        </>
      )}
      {trainedBefore === 'never' && (
        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-line bg-beige p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
          <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
          {s.neverNote}
        </p>
      )}
    </section>
  )
}

function GoalStep({ lang, t, titleId, why, goal, wording, isMinor, onPick }: { lang: Lang; t: T; titleId: string; why: string; goal: V2GoalValue | null; wording: Record<V2GoalValue, { label: string; desc: string }>; isMinor: boolean; onPick: (g: V2GoalValue) => void }) {
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.goal.title} why={why} />
      <Group questionId="goal.primary" legend={t.legends.goal} className="mt-6 block space-y-3">
        {/* القيم والأيقونات من النموذج المركزي؛ **الصياغة** من قاموس المستوى. */}
        {V2_GOAL_MODEL.map((g) => {
          const on = goal === g.value
          // القاصرون: تعديل الوزن (تنشيف/تضخيم) معطّل — المحافظة فقط.
          const disabled = isMinor && (g.value === 'cut' || g.value === 'bulk')
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onPick(g.value)}
              disabled={disabled}
              aria-pressed={on}
              data-choice={g.value}
              aria-disabled={disabled}
              aria-describedby={disabled ? 'v2-goal-minor-note' : undefined}
              className={cn(
                'v2-pressable relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-start',
                disabled ? 'cursor-not-allowed border-line bg-beige' : on ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
              )}
            >
              {/* Ember accent bar on selection. */}
              <span className={cn('absolute inset-y-0 start-0 w-1 transition-colors', on && !disabled ? 'v2-choice-accent' : 'bg-transparent')} />
              <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors', on && !disabled ? 'v2-choice-icon-selected' : 'bg-beige text-ink-500')}>
                <Icon name={GOAL_ICON[g.value]} className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black text-ink-900">{wording[g.value].label}</span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-500">{wording[g.value].desc}</span>
              </span>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors', on && !disabled ? 'v2-choice-icon-selected border-[color:var(--v2-blue)]' : 'border-line text-transparent')}>
                <Icon name="Check" className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </Group>
      {isMinor && (
        <p id="v2-goal-minor-note" className="mt-3 flex items-start gap-2 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
          <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {profileChoiceStrings[lang].minorGoalNote}
        </p>
      )}
      <p className="mt-5 text-center text-xs font-medium text-ink-500">{t.goal.note}</p>
    </section>
  )
}

function Segmented({ options, value, onChange, render }: { options: readonly number[]; value: number; onChange: (v: number) => void; render: (v: number) => ReactNode }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((o) => {
        const on = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={on}
            className={cn(
              'v2-pressable relative flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-center',
              on ? 'v2-choice-selected text-ink-900' : 'border-line bg-surface text-ink-700 hover:border-ink-400/40',
            )}
          >
            {/* دلالة اختيار غير لونية (WCAG 1.4.1): شارة صح تظهر على المحدَّد فقط. */}
            {on && (
              <span className="v2-choice-icon-selected absolute -top-1.5 -end-1.5 grid h-4 w-4 place-items-center rounded-full" aria-hidden="true">
                <Icon name="Check" className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function TrainingStep({ t, titleId, why, lang, days, duration, onDays, onDuration, goalLabel, split }: { t: T; titleId: string; why: string; lang: Lang; days: number; duration: number; onDays: (v: number) => void; onDuration: (v: number) => void; goalLabel: string; split: string }) {
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={t.training.title} why={why} />

      <Group questionId="training.days" legend={t.legends.days}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.daysQ}</p>
        <Segmented options={DAYS} value={days} onChange={onDays} render={(v) => <span className="text-xl font-black">{toAr(v, lang)}</span>} />
      </Group>

      <Group questionId="training.duration" legend={t.legends.duration}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.training.durationQ}</p>
        <Segmented options={DURATIONS} value={duration} onChange={onDuration} render={(v) => (
          <>
            <span className="text-lg font-black">{toAr(v, lang)}</span>
            <span className="text-[0.65rem] font-bold text-ink-500">{lang === 'en' ? 'min' : 'د'}</span>
          </>
        )} />
      </Group>

      {/* Live plan summary — updates as choices change. */}
      <div className="v2-info-panel mt-7 overflow-hidden rounded-2xl border p-4">
        <div className="flex items-center gap-2">
          <Icon name="Sparkles" className="h-4 w-4 text-[color:var(--v2-blue)]" />
          <span className="text-sm font-black text-ink-900">{t.training.summaryTitle}</span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <SummaryRow icon="Dumbbell" text={`${lang === 'en' ? `${days}-day split` : `تقسيمة ${toAr(days, lang)} ${t.training.daysUnit}`} · ${split}`} />
          <SummaryRow icon="Clock" text={`${toAr(duration, lang)} ${lang === 'en' ? 'min' : 'دقيقة'} ${t.training.perSession}`} />
          {goalLabel && <SummaryRow icon="Target" text={`${t.training.suitsGoal} ${goalLabel}`} />}
        </div>
      </div>
    </section>
  )
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="flex items-center gap-2 font-semibold text-ink-900">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-ink-500" />
      <span>{text}</span>
    </p>
  )
}

function TileGroup({ options, value, onChange }: { options: readonly { value: string; label: string; icon: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            data-choice={o.value}
            className={cn(
              'v2-pressable relative flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center',
              on ? 'v2-choice-selected' : 'border-line bg-surface hover:border-ink-400/40',
            )}
          >
            {/* دلالة اختيار غير لونية (WCAG 1.4.1): شارة صح تظهر على المحدَّد فقط. */}
            {on && (
              <span className="v2-choice-icon-selected absolute -top-1.5 -end-1.5 grid h-4 w-4 place-items-center rounded-full" aria-hidden="true">
                <Icon name="Check" className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            <Icon name={o.icon} className={cn('h-6 w-6', on ? 'text-[color:var(--v2-blue)]' : 'text-ink-500')} strokeWidth={2.25} />
            <span className={cn('text-xs font-bold', on ? 'text-ink-900' : 'text-ink-700')}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function LifestyleStep({
  lang, t, titleId, why, place, equipment, intent, neat, dietPattern, onPlace, onEquipment, onNeat, onDietPattern,
}: {
  lang: Lang; t: T; titleId: string; why: string
  place: string | null; equipment: Equipment[]; intent: V2Intent | null; neat: NeatLevel | null; dietPattern: DietPattern | null
  onPlace: (v: string) => void
  onEquipment: (v: Equipment) => void
  onNeat: (v: NeatLevel) => void; onDietPattern: (v: DietPattern) => void
}) {
  const s = onboardingLifestyleStrings[lang] ?? onboardingLifestyleStrings.ar
  const eq = onboardingEquipmentStrings[lang] ?? onboardingEquipmentStrings.ar
  const activityOptions: readonly HistoryOption<NeatLevel>[] = neatChoices.map((option) => ({
    value: option.value,
    label: lang === 'en' ? option.labelEn ?? option.label : option.label,
    hint: lang === 'en' ? option.descEn ?? option.desc ?? '' : option.desc ?? '',
  }))
  const dietOptions: readonly HistoryOption<DietPattern>[] = dietPatternChoices.map((option) => ({
    value: option.value,
    label: lang === 'en' ? option.labelEn ?? option.label : option.label,
    hint: '',
  }))
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.contextTitle} why={why} />

      <Group questionId="training.place" legend={t.legends.place}>
        <p className="mt-6 mb-3 text-sm font-bold text-ink-700">{t.equipment.placeQ}</p>
        <TileGroup options={t.places} value={place} onChange={onPlace} />
      </Group>

      {/* الأدوات بعد المكان مباشرةً: المكان يبذرها، والمستخدم يحسمها. */}
      <Group questionId="equipment.available" legend={eq.legend} className="mt-7 block">
        <p className="mb-1 text-sm font-bold text-ink-900">{eq.question}</p>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">{eq.note}</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_VALUES.map((key) => {
            const on = equipment.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onEquipment(key)}
                aria-pressed={on}
                className={cn(
                  'v2-pressable flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold',
                  on ? 'v2-choice-selected text-ink-900' : 'border-line bg-beige text-ink-700',
                )}
              >
                {on && <Icon name="Check" className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                {eq.labels[key]}
              </button>
            )
          })}
        </div>
        {isBodyweightOnly(equipment) && equipment.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-line bg-beige p-3 text-[0.8rem] font-bold leading-snug text-ink-700">
            <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            {eq.bodyweightOnlyNote}
          </p>
        )}
      </Group>

      <HistoryGroup questionId="activity.neat" legend={s.legends.activity} question={s.activityQ} options={activityOptions} value={neat} onSelect={onNeat} />
      {/* نمط الأكل يُعرض حين ينفع فقط: مستهلكه الوحيد مولّد الوجبات، وهو لا
          يعمل إلّا مع نية «اقتراحات أكل». عرضه لغيرهم سؤالٌ بلا أثر — §5. */}
      {dietPatternApplies(intent) && (
        <HistoryGroup questionId="nutrition.diet_pattern" legend={s.legends.diet} question={s.dietQ} options={dietOptions} value={dietPattern} onSelect={onDietPattern} />
      )}
    </section>
  )
}

function LimitationsStep({
  lang, t, titleId, why, hasInjury, injuries, onHasInjury, onInjury,
}: {
  lang: Lang; t: T; titleId: string; why: string
  hasInjury: boolean | null; injuries: string[]
  onHasInjury: (v: boolean) => void; onInjury: (v: string) => void
}) {
  const s = onboardingLifestyleStrings[lang] ?? onboardingLifestyleStrings.ar
  return (
    <section aria-labelledby={titleId}>
      <StepTitle id={titleId} title={s.limitationsTitle} why={why} />

      <Group questionId="limitations.has_injury" legend={s.legends.hasInjury} className="mt-6 block">
        <p className="mb-1 text-sm font-bold text-ink-900">{s.hasInjuryQ}</p>
        <p className="mb-3 text-xs leading-relaxed text-ink-500">{s.hasInjuryNote}</p>
        <div className="grid grid-cols-2 gap-3">
          {([true, false] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => onHasInjury(value)}
              aria-pressed={hasInjury === value}
              data-choice={String(value)}
              className={cn(
                'v2-pressable min-h-[44px] rounded-2xl border px-4 py-3 text-sm font-bold',
                hasInjury === value ? 'v2-choice-selected text-ink-900' : 'border-line bg-surface text-ink-700',
              )}
            >
              {value ? s.yes : s.no}
            </button>
          ))}
        </div>
      </Group>

      {injuryAreasApply(hasInjury) && (
          <Group questionId="limitations.injury_areas" legend={s.legends.injuryAreas} className="mt-6 flex flex-wrap gap-2">
            <p className="w-full text-sm font-bold text-ink-700">{s.injuryAreasQ}</p>
            {t.injuries.map((inj) => {
              const on = injuries.includes(inj.value)
              return (
                <button
                  key={inj.value}
                  type="button"
                  onClick={() => onInjury(inj.value)}
                  aria-pressed={on}
                  className={cn('v2-pressable min-h-[44px] rounded-full border px-3.5 py-2 text-sm font-semibold', on ? 'v2-choice-selected text-ink-900' : 'border-line bg-beige text-ink-700')}
                >
                  {inj.label}
                </button>
              )
            })}
          </Group>
      )}
    </section>
  )
}

/** Full-screen plan-assembly loading state (a bare button spinner is forbidden). */
/** Visible plan-generation failure with retry — never a silent drop into the app. */
function ErrorScreen({ lang, t, onRetry, onDismiss }: { lang: Lang; t: T; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      <div role="alert" className="flex flex-col items-center">
        <span className="v2-error-panel v2-error-icon grid h-16 w-16 place-items-center rounded-2xl border">
          <Icon name="AlertTriangle" className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight">{t.error.title}</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-500">{t.error.message}</p>
      </div>
      <div className="mt-7 w-full max-w-xs space-y-2.5">
        <button type="button" onClick={onRetry} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow">
          <Icon name="RotateCcw" className="h-5 w-5" />
          {t.error.retry}
        </button>
        <button type="button" onClick={onDismiss} className="w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700">
          {t.back}
        </button>
      </div>
    </div>
  )
}

/**
 * فشل الحفظ — **الصدق قبل الطمأنينة** (الميثاق §6-4).
 *
 * ليست نسخة ثانية من `ErrorScreen`: تلك تصف عطلًا عابرًا يُصلحه زرّ إعادة،
 * وهذه تصف حالة **قائمة في الجهاز** (تخزين ممتلئ أو محجوب) لا تزول بالضغط
 * وحده. فتسمّي السبب، وتقول للمستخدم ما يفعله، وتؤكّد له الأهمّ: **إجاباته
 * باقية** — لأن أسوأ ما يفعله فشل الحفظ هو أن يظنّ المستخدم أنه فقد كل شيء
 * فيعيد الإعداد من الصفر.
 */
function StorageBlockedScreen({ lang, t, onRetry, onDismiss }: { lang: Lang; t: T; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900" data-testid="onboarding-storage-blocked">
      <div role="alert" className="flex flex-col items-center">
        <span className="v2-error-panel v2-error-icon grid h-16 w-16 place-items-center rounded-2xl border">
          <Icon name="Database" className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight">{t.storage.title}</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{t.storage.message}</p>
        <p className="mt-3 max-w-xs text-sm font-bold leading-relaxed text-ink-700">{t.storage.kept}</p>
      </div>
      <div className="mt-7 w-full max-w-xs space-y-2.5">
        <button type="button" onClick={onRetry} className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow">
          <Icon name="RotateCcw" className="h-5 w-5" />
          {t.storage.retry}
        </button>
        <button type="button" onClick={onDismiss} className="w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700">
          {t.back}
        </button>
      </div>
    </div>
  )
}

/** [CTO-009/WP-2] الترحيب — يشرح الرحلة وكلفتها الزمنية قبل أول سؤال. */
function WelcomeScreen({ lang, t, onStart, onExit }: { lang: Lang; t: T; onStart: () => void; onExit: () => void }) {
  const w = t.welcome
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-light fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-1/2 top-[12%] h-[40%] w-[80%] -translate-x-1/2 rounded-full blur-[2px]" />
      </div>
      <div className="app-container v2-screen-enter relative z-10 flex flex-1 flex-col px-6" style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={onExit} aria-label={t.back} className="grid h-11 w-11 place-items-center rounded-full text-ink-500 hover:bg-beige">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <span className="eyebrow">{w.eyebrow}</span>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink-900">{w.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-500">{w.subtitle}</p>
          <p className="mt-5 flex items-center gap-2 text-xs font-bold text-ink-400">
            <Icon name="Clock" className="h-4 w-4" />
            {w.timeNote}
          </p>
        </div>
        <button type="button" onClick={onStart} data-testid="onboarding-welcome-start" className="btn-primary min-h-[52px] w-full text-base">
          {w.start}
        </button>
      </div>
    </div>
  )
}

/**
 * [QIM-WEB-FOUNDER-UX-004/حزمة ٣] التسليم — كشف قيمة لا إشعار حفظ.
 *
 * الشاشة السابقة قالت «جاهزة ومحفوظة» وانتهت: أعلنت **حدثًا تقنيًا** بينما
 * اللحظة هي أغلى نقطة في القمع — المستخدم أجاب للتوّ ثلاثة عشر سؤالًا ولم يرَ
 * مقابلها شيئًا. هنا يرى خطته الحقيقية قبل أن يُطلب منه قرار.
 *
 * **كل رقم هنا مقيس من مخرجات المحرّك** ويصل عبر `plan`/`rationale` من التوليد
 * **نفسه** الذي حُفظ (`buildPlanArtifactsFromOnboarding`) — لا توليد ثانٍ للعرض،
 * فلا ينحرف ما يراه عمّا يجده. وحين تغيب مخرجات التوليد (مسودّة قديمة، أو فشل
 * التقاطها) تُعرض الشاشة **بلا أرقام** بدل اختراعها: الصدق قبل الطمأنينة (§6).
 *
 * ولا تدّعي الشاشة أن الخطة محجوبة: المستخدم **يراها**، وPremium يفتح
 * **استخدامها** (تسجيل التمرين والأكل والقياسات) — نصّ المؤسس §4.
 */
export function PlanHandoffScreen({
  lang, signedIn, onEnter, onCreateAccount, plan, goalType, rationale, profile, goalLabel, displayName, currentWeightKg,
}: {
  lang: Lang
  signedIn: boolean
  onEnter: () => void
  /**
   * [WAVE-A] الطريق إلى إنشاء الحساب — يُستدعى **عند الحاجة فقط**.
   *
   * ثلاثة النداءات ليست سواءً في متطلّب الحساب: المعاينة محلية فلا تطلبه (§0.1)،
   * والتجربة وPremium يمرّان بسلطة الخادم فيلزمهما. فحين ترجع `beginTrial`
   * بـ`not_authenticated` يصير الطريق فعلًا لا خبرًا.
   */
  onCreateAccount?: () => void
  /** مخرجات التوليد المحفوظة — غيابها يعني عرضًا بلا أرقام لا أرقامًا مخترعة. */
  plan?: GeneratedPlan
  goalType?: GoalType
  rationale?: PlanRationale
  /** الملفّ المولَّد من نفس التشغيل المحفوظ — مصدر صفوف «وش راح تسوي معك قِمّة». */
  profile?: Profile
  /** اسم الهدف بصياغة مستواه المُعلن — من مصدر التسمية الموحّد. */
  goalLabel?: string | null
  /** اسم المستخدم إن عرفناه من حسابه. غيابه ⇒ تحيّة بلا اسم، لا اسم مخترع. */
  displayName?: string | null
  /** الوزن كما أدخله المستخدم — مقاس، وأساس رسم المسار. */
  currentWeightKg?: number | null
}) {
  const t = V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar
  const h = t.handoff
  const rv = revealStrings[lang] ?? revealStrings.ar
  const { beginTrial } = useAccess()
  const [trialState, setTrialState] = useState<'idle' | 'working' | TrialOutcome>('idle')
  /**
   * هل نجحت كتابة النيّة؟ يحكم **ظهور** زرّ إنشاء الحساب: بلا نيّة محفوظة
   * لن يجد المستخدم مدخل التجربة بعد التسجيل، فالزرّ يَعِد بما لا يحدث.
   * والبديل ليس صمتًا — رسالة `trialNeedsAccount` تبقى ظاهرة تشرح الحاجة.
   */
  const [trialIntentStored, setTrialIntentStored] = useState(false)

  // الوزن المستهدف **مشتقّ** من الهدف لا مُدخَل — الإعداد لا يسأل عنه.
  //
  // ═══ حارس التناقض ═══ رقمٌ يخالف الهدف المعلن أسوأ من غياب الرقم: هدف
  // تنشيف يُرسم بوزنٍ **أعلى** يقرأ عكس معناه تمامًا. فإن جاء الاشتقاق
  // مخالفًا للاتجاه المعلن — لأي سبب حاضر أو قادم — نتراجع إلى الاتجاه بلا
  // رقم بدل أن نرسم كذبة بصرية (§5 · §6-4).
  const derived = typeof currentWeightKg === 'number' && goalType
    ? deriveTargetWeight(currentWeightKg, goalType)
    : null
  const targetContradictsGoal =
    derived !== null && typeof currentWeightKg === 'number' && (
      (goalType === 'cutting' && derived > currentWeightKg) ||
      (goalType === 'bulking' && derived < currentWeightKg)
    )
  const target = targetContradictsGoal ? null : derived

  const onTrial = async () => {
    if (trialState === 'working') return
    // [WAVE-A] لا نسأل الخادم عمّا نعرفه هنا.
    //
    // التجربة تحتاج حسابًا موثَّقًا. والضيف بلا حساب — وهذه حقيقة محلّية مؤكّدة
    // (`signedIn`) لا تحتاج رحلة شبكة لتُكتشف. وكان النداء يُرسَل على أي حال،
    // فيرجع `offline` حين لا يكون هناك خادم — رسالة «تأكّد من اتصالك» لمشكلة
    // ليست اتصالًا. نُبلغه بالسبب الصادق فورًا، ونفتح له الطريق.
    // [SOVEREIGN-ENTRY-001] النيّة تُكتب على القرص **قبل** أن نعرض الطريق:
    // الطريق نفسه (إنشاء الحساب) يفكّ هذه الشاشة، فما يبقى في ذاكرتها يموت
    // معها. والكتابة مفحوصة — زرٌّ يَعِد باستئناف لن يحدث أسوأ من لا شيء.
    //
    // وهي جملة مستقلّة عن الاختصار أدناه عمدًا: شكل ذلك السطر مثبَّت في
    // `test:entry-flow` كإثبات على أن الضيف يُبلَّغ بسببه الصادق بلا رحلة شبكة.
    if (!signedIn) setTrialIntentStored(markPendingTrialIntent() === 'ok')
    if (!signedIn) { setTrialState('not_authenticated'); return }
    setTrialState('working')
    setTrialState(await beginTrial())
  }

  const trialMessage =
    trialState === 'working' ? rv.cta.trialStarting
    : trialState === 'started' ? rv.cta.trialStarted
    : trialState === 'not_authenticated' ? rv.cta.trialNeedsAccount
    : trialState === 'email_not_verified' ? rv.cta.trialNeedsVerifiedEmail
    : trialState === 'already_claimed' ? rv.cta.trialAlreadyUsed
    : trialState === 'offline' || trialState === 'revoked' ? rv.cta.trialOffline
    : null
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="v2-surface-light fixed inset-0 z-50 overflow-y-auto bg-page text-ink-900">
      <div
        className="app-container v2-screen-enter relative z-10 flex min-h-full flex-col px-5"
        style={{ paddingTop: 'max(1.5rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}
        data-testid="plan-handoff"
      >
        <header className="pt-2 text-center">
          <span className="v2-earned-moment v2-bg-green mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white">
            <Icon name="Check" className="h-7 w-7" strokeWidth={3} />
          </span>
          <p className="v2-text-green mt-4 text-xs font-black uppercase tracking-widest">{rv.hero.eyebrow}</p>
          <h1 className="mt-1.5 text-[1.9rem] font-black leading-tight tracking-tight text-ink-900" data-testid="reveal-hero-title">
            {displayName ? rv.hero.titleNamed(displayName) : rv.hero.titleAnonymous}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{rv.hero.subtitle}</p>
        </header>

        {/* معاينة الخطة و«لماذا هذه خطتك» — مكوّنان قائمان مغطّيان بإثباتيهما
            (`test:e-plan-preview` و`test:e-plan-why`)، لا نسخة ثانية منهما.
            كانا يتيمين بلا مضيف؛ وهذه الشاشة مضيفهما الطبيعي. */}
        {/* [OVERNIGHT-4] المسار — نقطتان وخطّ، كلاهما من رقم حقيقي (§6.3). */}
        {typeof currentWeightKg === 'number' && target !== null && goalType && (
          <div className="mt-6">
            <RevealJourney
              lang={lang}
              currentWeightKg={currentWeightKg}
              targetWeightKg={target}
              goalType={goalType}
              targets={plan?.targets}
            />
          </div>
        )}
        {targetContradictsGoal && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-line bg-beige p-3 text-[0.8rem] leading-relaxed text-ink-700" data-testid="reveal-direction-only">
            <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            {rv.value.directionOnly}
          </p>
        )}
        {profile && (
          <div className="mt-4">
            <RevealValue lang={lang} profile={profile} plan={plan} goalLabel={goalLabel} />
          </div>
        )}
        {plan && goalType && (
          <div className="mt-4">
            <PlanPreview lang={lang} plan={plan} goalType={goalType} />
          </div>
        )}
        {rationale && (
          <div className="mt-4">
            <PlanWhyPanel lang={lang} rationale={rationale} />
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-line bg-surface p-4" data-testid="handoff-benefits">
          <h2 className="text-sm font-black text-ink-900">{h.benefitsTitle}</h2>
          <ul className="mt-3 space-y-2.5">
            {h.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[0.83rem] leading-relaxed text-ink-700">
                <Icon name="Check" className="v2-text-green mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* الفصل الصريح: يراها الآن، ويستخدمها بـPremium. لا ادّعاء حجب. */}
        <p className="mt-4 text-center text-[0.78rem] leading-relaxed text-ink-500">{h.previewVsUse}</p>

        {/* [OVERNIGHT-4] ثلاثة نداءات بترتيب صريح (§6.6):
            Premium أساسي بارز · التجربة ثانوية أقلّ بروزًا · المعاينة ثالثة
            هادئة **ومقروءة**. لا نمط مظلم: المعاينة لا تُخفى ولا يُخفَّض
            تباينها حتى لا تُقرأ — تبقى زرًّا كامل العرض بهدف لمس ٥٢بكسل. */}
        <div className="mt-5 space-y-2.5" data-testid="reveal-cta-group">
          <a
            href={product.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="handoff-premium-cta"
            className="btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 text-base"
          >
            {rv.cta.premiumCta}
            <Icon name="ExternalLink" className="h-4 w-4" />
          </a>
          {/* الصيغة المعتمدة وحدها (§0.1) — ولا «مدى الحياة» ولا «lifetime». */}
          <p className="text-center text-[0.72rem] font-medium text-ink-500" data-testid="reveal-premium-note">
            {rv.cta.premiumNote}
          </p>

          <button
            type="button"
            onClick={() => void onTrial()}
            disabled={trialState === 'working'}
            aria-busy={trialState === 'working'}
            data-testid="handoff-trial-cta"
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-surface text-base font-bold text-primary-c transition-colors hover:bg-primary-soft disabled:opacity-60"
          >
            {rv.cta.trialCta}
          </button>
          <p className="text-center text-[0.72rem] text-ink-400">{rv.cta.trialNote}</p>
          {trialMessage && (
            <p role="status" aria-live="polite" data-testid="reveal-trial-status" className="text-center text-[0.78rem] font-bold text-ink-700">
              {trialMessage}
            </p>
          )}
          {/* [WAVE-A] اللحظة الصحيحة لطلب الحساب: بعد أن رأى خطته، وعند اختياره
              مسارًا يلزمه حساب — لا قبل أن يرى شيئًا. */}
          {trialState === 'not_authenticated' && !signedIn && trialIntentStored && onCreateAccount && (
            <button
              type="button"
              onClick={onCreateAccount}
              data-testid="reveal-create-account-cta"
              className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-primary/45 bg-surface text-base font-bold text-primary-c transition-colors hover:bg-primary-soft"
            >
              {rv.cta.createAccountCta}
            </button>
          )}

          <button type="button" onClick={onEnter} data-testid="handoff-preview-cta" className="btn-ghost min-h-[52px] w-full text-base">
            {rv.cta.previewCta}
          </button>
          <p className="text-center text-[0.72rem] text-ink-400">{rv.cta.previewNote}</p>
          {!signedIn && <p className="pt-1 text-center text-xs leading-relaxed text-ink-400">{h.accountNote}</p>}
        </div>
      </div>
    </div>
  )
}

function ReadyScreen({ lang, t, goalLabel, days, duration, split, placeLabel, levelRow, levelNote, focusRow, busy, onEnter }: { lang: Lang; t: T; goalLabel: string; days: number; duration: number; split: string; placeLabel: string; levelRow: string; levelNote: string; focusRow: string; busy: boolean; onEnter: () => void }) {
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} aria-busy={busy} className="v2-surface-light fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-1/2 top-[10%] h-[40%] w-[80%] -translate-x-1/2 rounded-full blur-[2px]" />
      </div>
      <div className="app-container v2-screen-enter relative z-10 flex flex-1 flex-col px-6" style={{ paddingTop: 'max(1rem, var(--safe-top))', paddingBottom: 'max(1.75rem, var(--safe-bottom))' }}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="v2-earned-moment v2-bg-green grid h-16 w-16 place-items-center rounded-2xl text-white">
            <Icon name="Check" className="h-8 w-8" strokeWidth={3} />
          </span>
          <p className="v2-text-green mt-5 text-xs font-black uppercase tracking-widest">{t.ready.eyebrow}</p>
          <h1 className="mt-2 text-[2rem] font-black tracking-tight text-ink-900">{t.ready.title}</h1>
          <p className="mt-2 max-w-xs text-sm text-ink-500">{t.ready.subtitle}</p>

          <div className="mt-7 w-full max-w-sm space-y-2.5 rounded-2xl border border-line bg-surface p-4 text-start">
            <SummaryRow icon="Dumbbell" text={`${lang === 'en' ? `${days}-day split` : `تقسيمة ${toAr(days, lang)} ${t.training.daysUnit}`} · ${split}`} />
            <SummaryRow icon="Clock" text={`${toAr(duration, lang)} ${lang === 'en' ? 'min' : 'دقيقة'} ${t.training.perSession}`} />
            {goalLabel && <SummaryRow icon="Target" text={`${t.training.suitsGoal} ${goalLabel}`} />}
            {placeLabel && <SummaryRow icon="Building2" text={placeLabel} />}
            {/* المستوى والنية يظهران في الملخّص — إجابة تراها في المخرجات. */}
            {levelRow && <SummaryRow icon="Trophy" text={levelRow} />}
            {focusRow && <SummaryRow icon="Compass" text={focusRow} />}
          </div>

          {/* الإفصاح — جملة واحدة هادئة، بلا لوم وبلا اعتذار (§6/الثابت ١). */}
          {levelNote && (
            <p data-testid="ready-level-adjusted" className="mt-3 flex w-full max-w-sm items-start gap-2 rounded-2xl border border-line bg-beige p-3 text-start text-[0.78rem] leading-snug text-ink-700">
              <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
              {levelNote}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-center text-[0.7rem] font-medium text-ink-400">{t.ready.previewNote}</p>
          <button type="button" onClick={onEnter} disabled={busy} aria-busy={busy} data-testid="ready-enter-cta" className="btn-primary w-full py-4 text-[1.1875rem] shadow-glow disabled:opacity-60">
            {t.ready.enter}
          </button>
        </div>
      </div>
    </div>
  )
}
