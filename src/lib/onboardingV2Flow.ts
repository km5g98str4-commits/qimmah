// Onboarding v2.1 — pure flow logic (Slice 2, async-feedback + a11y upgrades).
//
// Extracted from the OnboardingV2 view so the state machine is deterministic and
// unit-testable without a browser (see scripts/onboarding-async-proof.ts):
//   • per-step validation (which step-specific message to show on Next),
//   • the finalize status reducer (idle → building → error/done, with retry),
//   • owner-scoped draft persistence built on the existing onboarding store.
//
// Draft isolation: draft round-trips through saveDraft/loadDraft in onboarding.ts,
// which stamp an `owner` (account id, or undefined for a pre-auth guest) and
// refuse to hand a draft to a different owner. The draft lives inside
// `qimmah:onboarding:v1`, which is NOT in accountScope's GLOBAL_SAFE_KEYS, so
// wipeUserData() clears it on account switch/sign-out — no accountScope change.

import { AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from '@/config/profileDomain'
import { loadDraft, saveDraft } from '@/lib/onboarding'
import type { V2GoalValue } from '@/design-system/v2/labels'
import type {
  DietPattern,
  ExperienceLevel,
  LastTrainedBucket,
  NeatLevel,
  TotalMonthsBucket,
  TrainedBefore,
  TrainingConsistency,
} from '@/types/onboarding'
import type { V2Place } from '@/lib/onboardingV2Adapter'
import { classifyExperience, classifyTrainingStatus } from '@/lib/personalization/experience'
import {
  ALGO_VERSION,
  BANK_VERSION,
  STATE_VERSION,
  type AnswerValue,
  type PersonalizationState,
} from '@/lib/personalization/types'

/** Allowed answer sets for the training step (mirrored by the view's segmented controls). */
export const DAYS = [3, 4, 5, 6] as const
export const DURATIONS = [30, 45, 60, 75] as const

/**
 * النية — ما يبحث عنه المستخدم في التطبيق. **سؤال آمن**: لا يحمل بيانات صحية
 * ولا اتجاه وزن، فلا يحتاج معرفة العمر ولا موافقة صحية ليُسأل.
 * كل قيمة تقود أسلوب التغذية فعلًا (انظر `INTENT_TO_NUTRITION` في المُهيّئ).
 */
export type V2Intent = 'plan' | 'meals' | 'numbers'

/** المستوى المُعلن — يقود صياغة الأهداف وكثافة الجلسة. */
export type V2Level = 'beginner' | 'intermediate' | 'advanced'

/** مفردات بنك التخصيص (`personalization/bank/core.ts`) — يحرس التطابق إثبات الحزمة. */
export const TRAINED_BEFORE_VALUES = ['never', 'tried', 'months', 'years'] as const
export const TOTAL_MONTHS_VALUES = ['lt3', 'm3_6', 'm6_12', 'y1_3', 'y3_plus'] as const
export const LAST_TRAINED_VALUES = ['now', 'w2', 'm1_3', 'm3_12', 'y1_plus'] as const
export const TRAINING_CONSISTENCY_VALUES = ['rare', 'on_off', 'mostly', 'steady'] as const
export const NEAT_VALUES = ['sedentary', 'light', 'moderate', 'high'] as const
export const DIET_PATTERN_VALUES = ['none', 'vegetarian', 'vegan', 'pescatarian', 'low_carb', 'keto'] as const

export function historyFollowUpsApply(trainedBefore: TrainedBefore | null): boolean {
  return trainedBefore !== null && trainedBefore !== 'never'
}

export function injuryAreasApply(hasInjury: boolean | null): boolean {
  return hasInjury === true
}

/** يبطل هدف تعديل الوزن فور تحوّل صاحبه إلى قاصر؛ لا يترك اختيارًا محجوبًا مضغوطًا. */
export function goalAllowedForEligibility(goal: V2GoalValue | null, minor: boolean): V2GoalValue | null {
  return minor && (goal === 'cut' || goal === 'bulk') ? null : goal
}

/**
 * حدود بيانات الجسم — **مصدرها الوحيد `config/profileDomain`** منذ [CTO-65]
 * البند ٢. كانت مُعلنة هنا وبأرقام أخرى في `lib/validation.ts`، فيُقبل المستخدم
 * في مسار ويُرفض في الآخر. تُصدَّر من هنا كما كانت حفاظًا على كل مستهلك قائم
 * (`OnboardingV2` · `body-fields-proof` · عقد e2e) — لكنها **لا تُعلَن هنا**.
 */
export { AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from '@/config/profileDomain'

/** الجنس — يقود معادلة BMR (Mifflin-St Jeor) ولا يُستخدم لغير ذلك. */
export type V2Gender = 'male' | 'female'

/** Version stamp for the persisted v2 draft — supported predecessors migrate explicitly. */
export const DRAFT_VERSION = 6
const READABLE_DRAFT_VERSIONS = [5, DRAFT_VERSION] as const

/** Full resumable state of the v2 onboarding flow. */
export interface OnboardingV2Draft {
  step: number
  /** بيانات الجسم — null قبل الإجابة (لا قيمة افتراضية صامتة). */
  age: number | null
  gender: V2Gender | null
  heightCm: number | null
  weightKg: number | null
  /** النية والمستوى — null قبل الإجابة؛ لا افتراضي صامت لأنهما يغيّران المخرجات. */
  intent: V2Intent | null
  level: V2Level | null
  trainedBefore: TrainedBefore | null
  totalMonths: TotalMonthsBucket | null
  lastTrained: LastTrainedBucket | null
  consistency: TrainingConsistency | null
  goal: V2GoalValue | null
  days: number
  duration: number
  place: V2Place | null
  neat: NeatLevel | null
  dietPattern: DietPattern | null
  hasInjury: boolean | null
  injuries: string[]
  healthDataConsent: boolean
}

/** هل القيمة عدد صحيح داخل النطاق؟ */
export function inRange(v: number | null, r: { min: number; max: number }): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= r.min && v <= r.max
}

/**
 * Resolve the first render's state synchronously. This prevents the persistence
 * effect from overwriting a saved draft with defaults before React applies an
 * asynchronous mount-effect restore.
 */
export function initialDraftV2(userId?: string | null): OnboardingV2Draft {
  return loadDraftV2(userId) ?? {
    step: 0,
    age: null,
    gender: null,
    heightCm: null,
    weightKg: null,
    intent: null,
    level: null,
    trainedBefore: null,
    totalMonths: null,
    lastTrained: null,
    consistency: null,
    goal: null,
    days: 4,
    duration: 45,
    place: null,
    neat: null,
    dietPattern: null,
    hasInjury: null,
    injuries: [],
    healthDataConsent: false,
  }
}

/** Persisted envelope (version + fields) — the shape actually written to storage. */
interface PersistedDraft extends Partial<OnboardingV2Draft> {
  v: number
  /** حقلا v5 المتقاعدان؛ يُقرآن للهجرة ولا ينتقلان إلى الحالة الحالية. */
  trainingYears?: number | null
  pref?: string | null
}

/** Which step-specific validation message to surface, or null when the step is complete. */
export type StepValidation = 'body' | 'ageBelowMin' | 'intentLevel' | 'trainingHistory' | 'goal' | 'healthConsent' | 'training' | 'lifestyle' | 'limitations' | null

/** Async plan-assembly status driving the loading / error / done screens. */
export type FinalizeStatus = 'idle' | 'building' | 'error' | 'done'
export type FinalizeAction = 'start' | 'fail' | 'ok' | 'reset'

/**
 * Finalize state machine. `start` covers both the first attempt (idle → building)
 * and a retry after failure (error → building); `fail` and `ok` are terminal-ish.
 */
export function finalizeReduce(status: FinalizeStatus, action: FinalizeAction): FinalizeStatus {
  switch (action) {
    case 'start':
      return status === 'done' ? status : 'building'
    case 'fail':
      return 'error'
    case 'ok':
      return 'done'
    case 'reset':
      return 'idle'
    default:
      return status
  }
}

type Validatable = Pick<
  OnboardingV2Draft,
  | 'age'
  | 'gender'
  | 'heightCm'
  | 'weightKg'
  | 'intent'
  | 'level'
  | 'trainedBefore'
  | 'totalMonths'
  | 'lastTrained'
  | 'consistency'
  | 'goal'
  | 'days'
  | 'duration'
  | 'place'
  | 'neat'
  | 'dietPattern'
  | 'hasInjury'
  | 'injuries'
  | 'healthDataConsent'
>

export const HISTORY_STEP = 2
export const LAST_INPUT_STEP = 6

/** سجلّ الأسئلة الثابت — الموافقة الصحية بوابة، وليست ضمن أسئلة التخصيص الـ18. */
export const ONBOARDING_QUESTION_IDS = [
  'body.age', 'body.sex', 'body.height', 'body.weight',
  'intent.primary', 'experience.declared',
  'history.trained_before', 'history.total_months', 'history.last_trained', 'history.consistency',
  'goal.primary', 'training.days', 'training.duration', 'training.place',
  'activity.neat', 'nutrition.diet_pattern',
  'limitations.has_injury', 'limitations.injury_areas',
] as const
export type OnboardingQuestionId = (typeof ONBOARDING_QUESTION_IDS)[number]

/**
 * Validate one step. Returns the step's message key when incomplete, else null.
 *
 * ═══ ترتيب الخطوات — قرار واعٍ لا وراثة بالسكوت ═══
 * 0 الأساسيات · 1 النية والمستوى · 2 تاريخ التدريب · 3 الهدف · 4 الجدول ·
 * 5 المكان/النشاط/الأكل · 6 القيود · 7 جاهز.
 *
 * التوتّر الموثّق (§8): بلوبرنت البحث يريد **النية أولًا** لأسباب تفاعل، وحاجز
 * القاصرين يريد **العمر قبل الأهداف المقيَّدة** (التنشيف/التضخيم ممنوعان دون
 * 18). والحلّان جُمعا هنا فعليًا:
 *   • العمر ضمن الأساسيات ⇒ الحاجز يعمل للضيف الجديد كما هو.
 *   • النية والمستوى **قبل** خطوة الهدف ⇒ صياغة الأهداف تتبع المستوى، فالمبتدئ
 *     لا يُواجَه بمصطلحات صالة، والمتقدّم يرى المصطلحات القياسية.
 *   • النية سؤال **آمن** (لا بيانات صحية ولا اتجاه وزن) فلا يحتاج العمر.
 *
 * ولم تُوضع النية في الموضع 0 عن قصد: الموضع 0 يملكه **حاجز الموافقة الصحية**
 * (`healthConsent` أدناه، ويحرسه `test:policy` بتأكيد أن الخطوة الأولى هي التي
 * تحمل الموافقة قبل أي جمع). إزاحة الموافقة من الموضع الأول تمسّ حاجز خصوصية،
 * وهذا قرار منسّق/CTO لا قرار حارة. الفائدة التفاعلية المتبقّية من «النية في
 * الموضع 0» صغيرة أصلًا لأن شاشة البداية (StartViewV2) تسبق الإعداد كله.
 */
export function validateStep(step: number, d: Validatable): StepValidation {
  if (step === 0) {
    // الموافقة الصحية **قبل** أي حقل — الإذن يسبق الجمع لا يليه. هذا ترتيب
    // خصوصية مقصود يحرسه `test:policy`، لا مجرّد ترتيب واجهة.
    if (!d.healthDataConsent) return 'healthConsent'
    // ن٢: العمر تحت الحدّ الأدنى سببٌ مسمّى لا «حقل غير صالح». يُفصل قبل الفحص
    // العام حتى تصل الرسالة الصحيحة؛ رقم مكتمل تحت ١٣ فقط — الحقل الفارغ أو
    // النصّ غير الرقمي يبقى على رسالة الحقول العامة، فلا يُتّهم من لم يكتب بعد.
    if (d.age !== null && Number.isFinite(d.age) && d.age > 0 && d.age < AGE_RANGE.min) return 'ageBelowMin'
    const ok =
      inRange(d.age, AGE_RANGE) &&
      (d.gender === 'male' || d.gender === 'female') &&
      inRange(d.heightCm, HEIGHT_RANGE) &&
      inRange(d.weightKg, WEIGHT_RANGE)
    return ok ? null : 'body'
  }
  if (step === 1) {
    return d.intent && d.level ? null : 'intentLevel'
  }
  if (step === HISTORY_STEP) {
    if (d.trainedBefore === null) return 'trainingHistory'
    if (!historyFollowUpsApply(d.trainedBefore)) return null
    return d.totalMonths && d.lastTrained && d.consistency ? null : 'trainingHistory'
  }
  if (step === 3) return d.goal ? null : 'goal'
  if (step === 4) return DAYS.includes(d.days as (typeof DAYS)[number]) && DURATIONS.includes(d.duration as (typeof DURATIONS)[number]) ? null : 'training'
  if (step === 5) return d.place && d.neat && d.dietPattern ? null : 'lifestyle'
  if (step === 6) {
    if (d.hasInjury === null) return 'limitations'
    return injuryAreasApply(d.hasInjury) && d.injuries.length === 0 ? 'limitations' : null
  }
  return null
}

/**
 * المستوى المُعلن + الوقائع الأربع ⇒ خبرة المولّد، عبر المصنّف المعتمد نفسه.
 * لا ننسخ أوزان التصنيف هنا؛ نمرّر مفردات البنك إلى `classifyExperience`.
 */
export function resolveExperienceLevel(
  level: V2Level | null,
  trainedBefore: TrainedBefore | null,
  totalMonths: TotalMonthsBucket | null,
  lastTrained: LastTrainedBucket | null,
  consistency: TrainingConsistency | null,
): ExperienceLevel | undefined {
  if (!level || !trainedBefore) return undefined
  const verdict = classifyExperience(historyState({
    selfLevel: level,
    trainedBefore,
    ...(trainedBefore === 'never' ? {} : { totalMonths, lastTrained, consistency }),
  }))
  if (verdict.klass === 'complete_beginner') return 'beginner'
  if (verdict.klass === 'beginner' || verdict.klass === 'early_intermediate') return 'novice'
  if (verdict.klass === 'advanced') return 'advanced'
  if (verdict.klass === 'returning') return verdict.score >= 55 ? 'intermediate' : 'novice'
  return 'intermediate'
}

/** حالة البداية المشتقة التي يستهلكها المولّد: never لا يمكن أن تصبح returning. */
export function resolveTrainingConsistency(
  trainedBefore: TrainedBefore | null,
  totalMonths: TotalMonthsBucket | null,
  lastTrained: LastTrainedBucket | null,
  consistency: TrainingConsistency | null,
) {
  if (!trainedBefore) return undefined
  const status = classifyTrainingStatus(historyState({
    trainedBefore,
    ...(trainedBefore === 'never' ? {} : { totalMonths, lastTrained, consistency }),
  }))
  if (status === 'never') return 'new' as const
  if (status === 'detrained') return 'returning' as const
  if (status === 'inconsistent') return 'on_and_off' as const
  return 'consistent' as const
}

function historyState(answers: Record<string, AnswerValue>): PersonalizationState {
  return {
    stateVersion: STATE_VERSION,
    bankVersion: BANK_VERSION,
    algoVersion: ALGO_VERSION,
    userId: null,
    lang: 'ar',
    answers,
    derived: {},
    history: [],
    queue: [],
    clarifications: [],
    startedAt: 0,
    updatedAt: 0,
    completedAt: null,
  }
}

/**
 * المعكوس: الخبرة المحفوظة ⇒ المستوى المُعلن — [CTO-65] البند ٥.
 *
 * يقف بجانب `resolveExperienceLevel` عمدًا: خريطة واحدة واتّجاهاها في موضع
 * واحد، فلا يتباعدان. **و`undefined` يخرج `null` لا افتراضًا:** الملف الشخصي
 * يحتاج أن يعرف «لا مستوى محفوظ» ليقرّر بنفسه، لا أن يُسلَّم «متوسّط» مصنوعًا
 * فيعرض مصطلح صالة لمبتدئ صامتًا.
 */
export function v2LevelFromExperience(experience: ExperienceLevel | undefined): V2Level | null {
  if (experience === 'beginner') return 'beginner'
  if (experience === 'advanced') return 'advanced'
  if (experience === 'novice' || experience === 'intermediate') return 'intermediate'
  return null
}

/** Can the user advance from this step? */
export function canAdvance(step: number, d: Validatable): boolean {
  return validateStep(step, d) === null
}

// ————————————————————— Draft persistence (owner-scoped, hostile-input safe) —————————————————————

function optMember<T extends string>(value: unknown, allowed: readonly T[]): boolean {
  return value === null || (typeof value === 'string' && (allowed as readonly string[]).includes(value))
}

function nullableNumber(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

/** Strict guard for an untrusted current or additively migratable v5 draft. */
function isPersistedDraft(value: unknown): value is PersistedDraft {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<PersistedDraft>
  if (typeof d.v !== 'number' || !(READABLE_DRAFT_VERSIONS as readonly number[]).includes(d.v)) return false
  const maxStep = d.v === 5 ? 4 : LAST_INPUT_STEP
  if (!Number.isInteger(d.step) || (d.step as number) < 0 || (d.step as number) > maxStep) return false
  if (![d.age, d.heightCm, d.weightKg].every(nullableNumber)) return false
  if (d.gender !== null && d.gender !== 'male' && d.gender !== 'female') return false
  if (d.goal !== null && d.goal !== 'cut' && d.goal !== 'maintain' && d.goal !== 'bulk') return false
  if (d.intent !== null && d.intent !== 'plan' && d.intent !== 'meals' && d.intent !== 'numbers') return false
  if (d.level !== null && d.level !== 'beginner' && d.level !== 'intermediate' && d.level !== 'advanced') return false
  if (typeof d.days !== 'number' || typeof d.duration !== 'number') return false
  if (d.place !== null && d.place !== 'gym' && d.place !== 'home' && d.place !== 'machines') return false
  if (typeof d.healthDataConsent !== 'boolean') return false
  if (!Array.isArray(d.injuries) || !d.injuries.every((x) => typeof x === 'string')) return false
  if (d.v === 5) {
    if (d.trainingYears !== null && typeof d.trainingYears !== 'number') return false
    if (d.pref !== null && typeof d.pref !== 'string') return false
    return typeof d.hasInjury === 'boolean'
  }
  if (!optMember(d.trainedBefore, TRAINED_BEFORE_VALUES)) return false
  if (!optMember(d.totalMonths, TOTAL_MONTHS_VALUES)) return false
  if (!optMember(d.lastTrained, LAST_TRAINED_VALUES)) return false
  if (!optMember(d.consistency, TRAINING_CONSISTENCY_VALUES)) return false
  if (!optMember(d.neat, NEAT_VALUES)) return false
  if (!optMember(d.dietPattern, DIET_PATTERN_VALUES)) return false
  if (d.hasInjury !== null && typeof d.hasInjury !== 'boolean') return false
  return true
}

/** Persist the current draft for the current owner (account id, or null/undefined guest). */
export function saveDraftV2(draft: OnboardingV2Draft, userId?: string | null): void {
  const payload: PersistedDraft = { v: DRAFT_VERSION, ...normalizeDraft(draft) }
  saveDraft(payload, userId)
}

/**
 * Load the resumable draft for this owner, or undefined. Never trusts storage:
 * a different owner, an older version, or a malformed value all yield undefined.
 */
export function loadDraftV2(userId?: string | null): OnboardingV2Draft | undefined {
  const raw = loadDraft<unknown>(userId)
  if (!isPersistedDraft(raw)) return undefined
  return migrateDraft(raw)
}

function migrateDraft(raw: PersistedDraft): OnboardingV2Draft {
  const legacy = raw.v === 5
  return normalizeDraft({
    step: legacy ? Math.min(raw.step as number, HISTORY_STEP) : raw.step as number,
    age: raw.age ?? null,
    gender: raw.gender ?? null,
    heightCm: raw.heightCm ?? null,
    weightKg: raw.weightKg ?? null,
    intent: raw.intent ?? null,
    level: raw.level ?? null,
    trainedBefore: legacy ? null : raw.trainedBefore ?? null,
    totalMonths: legacy ? null : raw.totalMonths ?? null,
    lastTrained: legacy ? null : raw.lastTrained ?? null,
    consistency: legacy ? null : raw.consistency ?? null,
    goal: raw.goal ?? null,
    days: raw.days as number,
    duration: raw.duration as number,
    place: raw.place ?? null,
    neat: legacy ? null : raw.neat ?? null,
    dietPattern: legacy ? null : raw.dietPattern ?? null,
    // v5=false كان افتراضيًا لا جوابًا صريحًا؛ true وحدها معلومة يمكن حفظها.
    hasInjury: legacy ? (raw.hasInjury === true ? true : null) : raw.hasInjury ?? null,
    injuries: raw.injuries as string[],
    healthDataConsent: raw.healthDataConsent as boolean,
  })
}

/** يمحو الأجوبة الشرطية الخفية عند الحفظ والتحميل، لا في الواجهة وحدها. */
export function normalizeDraft(draft: OnboardingV2Draft): OnboardingV2Draft {
  const never = draft.trainedBefore === 'never'
  return {
    ...draft,
    totalMonths: never ? null : draft.totalMonths,
    lastTrained: never ? null : draft.lastTrained,
    consistency: never ? null : draft.consistency,
    injuries: injuryAreasApply(draft.hasInjury) ? [...draft.injuries] : [],
  }
}

/** Drop the draft (on successful finish) — resume must not reopen a completed setup. */
export function clearDraftV2(userId?: string | null): void {
  saveDraft(undefined, userId)
}
