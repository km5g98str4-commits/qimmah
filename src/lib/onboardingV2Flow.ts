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
import type { ExperienceLevel } from '@/types/onboarding'
import type { LastTrainedBucket, TotalMonthsBucket, TrainedBefore, TrainingConsistency } from '@/types/profile'
import type { V2Place, V2Pref } from '@/lib/onboardingV2Adapter'

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

/**
 * ═══ تاريخ التدريب — أربعة أسئلة، بمفردات المحرّك نفسها ═══ [CTO-QAE-022] M1a
 *
 * القيم **هي حرفيًا** قيم بنك الأسئلة (`personalization/bank/core.ts`) التي
 * يستهلكها `classifyExperience`. لا ترجمة بينهما، فلا خسارة في الترجمة ولا
 * جدول مقابلة يشيخ: ما يُكتب هنا هو ما يقرؤه المحرّك.
 *
 * **و«ما تمرّنت» حالة صريحة لا فراغ.** `'never'` قيمة أولى في القائمة، ويترتّب
 * عليها أن الثلاثة الباقية **لا تُسأل أصلًا** — لا تُملأ بصفر ولا بافتراضي.
 */
/* المصدر الوحيد للمفردات هو `types/profile` — هذه أسماء محلّية له لا نسخة ثانية. */
export type V2TrainedBefore = TrainedBefore
export type V2TotalMonths = TotalMonthsBucket
export type V2LastTrained = LastTrainedBucket
export type V2TrainingConsistency = TrainingConsistency

export const TRAINED_BEFORE_VALUES = ['never', 'tried', 'months', 'years'] as const
export const TOTAL_MONTHS_VALUES = ['lt3', 'm3_6', 'm6_12', 'y1_3', 'y3_plus'] as const
export const LAST_TRAINED_VALUES = ['now', 'w2', 'm1_3', 'm3_12', 'y1_plus'] as const
export const CONSISTENCY_VALUES = ['rare', 'on_off', 'mostly', 'steady'] as const

/**
 * هل تُسأل أسئلة التاريخ الثلاثة (المدّة · آخر تمرين · الانتظام)؟
 *
 * **القاعدة، ولماذا هي قاعدة لا اختيار واجهة:** الثلاثة `eligible: ne(trainedBefore,'never')`
 * في البنك نفسه (`bank/core.ts:165,176,188`)، و`classifyExperience` يتجاوز أي
 * جواب لها عند `trainedBefore === 'never'` بأذرع صريحة:
 * `exposureBand='none'` (سطر ١١٢) · `consistencyBand='none'` (سطر ١١٥) ·
 * `tenureMonths=0` (لأن `totalMonths` غائب). فسؤالٌ **جوابه مُهمَل بالبرهان**
 * احتكاكٌ بلا مكسب معلوماتي — ولذلك لا يُسأل «الانتظام» لمن لم يتمرّن قط.
 */
export function historyFollowUpsApply(trainedBefore: V2TrainedBefore | null): boolean {
  return trainedBefore !== null && trainedBefore !== 'never'
}

/** سنوات التدريب — اختيارية، وتُسأل لغير المبتدئ فقط. */
export const TRAINING_YEARS_RANGE = { min: 0, max: 60 } as const

/**
 * حدود بيانات الجسم — **مصدرها الوحيد `config/profileDomain`** منذ [CTO-65]
 * البند ٢. كانت مُعلنة هنا وبأرقام أخرى في `lib/validation.ts`، فيُقبل المستخدم
 * في مسار ويُرفض في الآخر. تُصدَّر من هنا كما كانت حفاظًا على كل مستهلك قائم
 * (`OnboardingV2` · `body-fields-proof` · عقد e2e) — لكنها **لا تُعلَن هنا**.
 */
export { AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from '@/config/profileDomain'

/** الجنس — يقود معادلة BMR (Mifflin-St Jeor) ولا يُستخدم لغير ذلك. */
export type V2Gender = 'male' | 'female'

/**
 * Version stamp for the persisted v2 draft.
 *
 * ⚠️ **v5 لا تُهمَل — تُقرأ وتُرقَّى.** كان التعليق السابق يقول «old drafts are
 * ignored»، وهو سلوك مقبول حين تتغيّر البنية جذريًا. لكن [CTO-QAE-022] يضيف
 * حقولًا **إضافية** فقط: مسودّة v5 صالحة بالكامل، ينقصها أربعة أجوبة لم تكن
 * تُسأل. إهمالها يعني إعادة إعداد قسرية على مستخدم لم يخطئ — انظر
 * `READABLE_DRAFT_VERSIONS` و`migrateDraft` أدناه.
 */
export const DRAFT_VERSION = 6

/** النسخ التي يقبلها المُحمِّل. v5 تُرقَّى بحقول تاريخ **فارغة** لا مُخترَعة. */
const READABLE_DRAFT_VERSIONS: readonly number[] = [5, DRAFT_VERSION]

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
  /** سنوات التدريب — اختيارية (null = لم تُذكر)؛ تُصفَّر عند اختيار «مبتدئ». */
  trainingYears: number | null
  /**
   * تاريخ التدريب — `null` تعني **لم يُجَب**، لا «صفر» ولا «لا شيء».
   * والثلاثة الأخيرة تبقى `null` أبدًا لمن اختار `'never'` (انظر `historyFollowUpsApply`).
   */
  trainedBefore: V2TrainedBefore | null
  totalMonths: V2TotalMonths | null
  lastTrained: V2LastTrained | null
  consistency: V2TrainingConsistency | null
  goal: V2GoalValue | null
  days: number
  duration: number
  place: V2Place | null
  pref: V2Pref | null
  hasInjury: boolean
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
    trainingYears: null,
    trainedBefore: null,
    totalMonths: null,
    lastTrained: null,
    consistency: null,
    goal: null,
    days: 4,
    duration: 45,
    place: null,
    pref: null,
    hasInjury: false,
    injuries: [],
    healthDataConsent: false,
  }
}

/**
 * Persisted envelope (version + fields) — the shape actually written to storage.
 *
 * حقول التاريخ **اختيارية في النوع المقروء** لأن مسودّة v5 لا تحملها. تُطبَّع إلى
 * `null` عند التحميل (`migrateDraft`) — و`null` هنا تعني «لم يُسأل» بصدق، وهي
 * بالضبط ما يجعل ملف QAE ناقصًا بدل أن يبدو مكتملًا بقيمة مصنوعة.
 */
interface PersistedDraft extends Omit<OnboardingV2Draft, 'trainedBefore' | 'totalMonths' | 'lastTrained' | 'consistency'> {
  v: number
  trainedBefore?: V2TrainedBefore | null
  totalMonths?: V2TotalMonths | null
  lastTrained?: V2LastTrained | null
  consistency?: V2TrainingConsistency | null
}

/** عضوية في مجموعة قيم معلومة، أو `null`/غياب. أي قيمة أخرى تُسقط المسودّة كلها. */
function optMember<T extends string>(value: unknown, allowed: readonly T[]): boolean {
  return value === null || value === undefined || (typeof value === 'string' && (allowed as readonly string[]).includes(value))
}

/** Which step-specific validation message to surface, or null when the step is complete. */
export type StepValidation = 'body' | 'ageBelowMin' | 'intentLevel' | 'trainingHistory' | 'goal' | 'healthConsent' | 'training' | 'equipment' | null

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
  | 'trainingYears'
  | 'trainedBefore'
  | 'totalMonths'
  | 'lastTrained'
  | 'consistency'
  | 'goal'
  | 'days'
  | 'duration'
  | 'place'
  | 'pref'
  | 'healthDataConsent'
>

/** موضع خطوة تاريخ التدريب في التدفّق — مصدر واحد يقرأه المُهاجِر والواجهة. */
export const HISTORY_STEP = 2

/** آخر خطوة قبل شاشة «خطتك جاهزة». */
export const LAST_INPUT_STEP = 5

/**
 * Validate one step. Returns the step's message key when incomplete, else null.
 *
 * ═══ ترتيب الخطوات — قرار واعٍ لا وراثة بالسكوت ═══
 * 0 الأساسيات (موافقة + جسد) · 1 النية والمستوى · **2 تاريخ التدريب** ·
 * 3 الهدف · 4 التدريب · 5 المعدّات · 6 جاهز.
 *
 * ═══ لماذا التاريخ في الموضع ٢ تحديدًا — [CTO-QAE-022] M1a ═══
 * لأنه **النصف الموضوعي من السؤال الذي سُئل للتوّ**. الخطوة ١ تسأل المستخدم أن
 * يصنّف نفسه («مبتدئ/متوسط/متقدّم») — وهو تقدير ذاتي. والخطوة ٢ تسأل الوقائع
 * التي تُصحّحه: هل تمرّنت؟ كم؟ متى آخر مرّة؟ وكم انتظمت؟ فصلُهما بشاشات الهدف
 * والتدريب والمعدّات يجعل المستخدم يعلن مستواه ثم يُسأل بعد ثلاث شاشات «هل
 * تمرّنت من قبل؟» — تسلسل مفكّك.
 *
 * ولم يُدمَج التاريخ **داخل** الخطوة ١: الخطوة ١ تحمل النية (٣ خيارات) والمستوى
 * (٣) والسنوات، وإضافة أربعة أسئلة أخرى إليها تحوّلها إلى استبيان — وهو ما يمنعه
 * الأمر صراحةً. شاشة مستقلّة قصيرة (**سؤال واحد لمن لم يتمرّن قط**) أرخص.
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
    // السنوات اختيارية: null تمرّ، وقيمة مكتوبة خارج النطاق (أو نص غير رقمي)
    // تُحجب بدل أن تُبتلع بصمت.
    if (d.trainingYears !== null && !inRange(d.trainingYears, TRAINING_YEARS_RANGE)) return 'intentLevel'
    return d.intent && d.level ? null : 'intentLevel'
  }
  if (step === HISTORY_STEP) {
    // «ما تمرّنت من قبل» جوابٌ **كامل** بذاته: يمرّ وحده، ولا يُطلب معه شيء.
    if (d.trainedBefore === null) return 'trainingHistory'
    if (!historyFollowUpsApply(d.trainedBefore)) return null
    return d.totalMonths && d.lastTrained && d.consistency ? null : 'trainingHistory'
  }
  if (step === 3) return d.goal ? null : 'goal'
  if (step === 4) return DAYS.includes(d.days as (typeof DAYS)[number]) && DURATIONS.includes(d.duration as (typeof DURATIONS)[number]) ? null : 'training'
  if (step === 5) return d.place && d.pref ? null : 'equipment'
  return null
}

/**
 * المستوى المُعلن + سنوات التدريب ⇒ مستوى الخبرة الذي يفهمه المولّد.
 *
 * ليست تسمية شكلية: `ExperienceLevel` يمرّ إلى `experienceToBand` ثم إلى محرّك
 * التقسيمة، فيتغيّر **عدد التمارين في الجلسة**، وتُثبَّت التقسيمة على «تلقائي»
 * للمبتدئ. والسنوات تُصحّح تقدير المستخدم لنفسه: من يقول «متوسط» وعنده أقل من
 * سنة أقرب إلى «مستجد» — فالسؤال له أثر حقيقي لا تجميلي.
 */
export function resolveExperienceLevel(level: V2Level | null, years: number | null): ExperienceLevel | undefined {
  if (level === 'beginner') return 'beginner'
  if (level === 'advanced') return 'advanced'
  if (level === 'intermediate') return years !== null && years < 1 ? 'novice' : 'intermediate'
  return undefined
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

/** Strict guard: is this an untrusted value a usable v2 draft of the CURRENT version? */
function isPersistedDraft(value: unknown): value is PersistedDraft {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<PersistedDraft>
  if (typeof d.v !== 'number' || !READABLE_DRAFT_VERSIONS.includes(d.v)) return false
  if (!Number.isInteger(d.step) || (d.step as number) < 0 || (d.step as number) > LAST_INPUT_STEP) return false
  if (!optMember(d.trainedBefore, TRAINED_BEFORE_VALUES)) return false
  if (!optMember(d.totalMonths, TOTAL_MONTHS_VALUES)) return false
  if (!optMember(d.lastTrained, LAST_TRAINED_VALUES)) return false
  if (!optMember(d.consistency, CONSISTENCY_VALUES)) return false
  if (d.goal !== null && d.goal !== 'cut' && d.goal !== 'maintain' && d.goal !== 'bulk') return false
  if (d.intent !== null && d.intent !== 'plan' && d.intent !== 'meals' && d.intent !== 'numbers') return false
  if (d.level !== null && d.level !== 'beginner' && d.level !== 'intermediate' && d.level !== 'advanced') return false
  if (d.trainingYears !== null && typeof d.trainingYears !== 'number') return false
  if (typeof d.days !== 'number' || typeof d.duration !== 'number') return false
  if (d.place !== null && typeof d.place !== 'string') return false
  if (d.pref !== null && typeof d.pref !== 'string') return false
  if (typeof d.hasInjury !== 'boolean') return false
  if (typeof d.healthDataConsent !== 'boolean') return false
  if (!Array.isArray(d.injuries) || !d.injuries.every((x) => typeof x === 'string')) return false
  return true
}

/** Persist the current draft for the current owner (account id, or null/undefined guest). */
export function saveDraftV2(draft: OnboardingV2Draft, userId?: string | null): void {
  const payload: PersistedDraft = { v: DRAFT_VERSION, ...draft }
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

/**
 * ترقية مسودّة مقروءة إلى شكل النسخة الحالية.
 *
 * **v5 → v6 — قرار المؤشّر، وهو الجزء غير البديهي:** أُدرجت خطوة في الموضع ٢،
 * فمؤشّرات v5 من ٢ فما فوق تشير الآن إلى شاشة أخرى (٢ كان «الهدف» وصار
 * «التاريخ»). الخيارات ثلاثة، وواحد فقط أمين:
 *   • إبقاء المؤشّر كما هو ⇒ المستخدم يعود إلى **شاشة غير التي غادرها**.
 *   • إزاحته للأمام (٢→٣ · ٣→٤ · ٤→٥) ⇒ يعود لشاشته الصحيحة، لكنه **يتخطّى
 *     خطوة التاريخ إلى الأبد** فينهي الإعداد بملف QAE ناقص بلا أن يُسأل.
 *   • **المُختار:** تثبيته عند `HISTORY_STEP` لمن كان عندها أو بعدها.
 *
 * الثالث ليس إعادة إعداد قسرية: **ولا جواب واحد يُفقَد** (الهدف والأيام والمكان
 * كلها محفوظة وتُعرض مملوءة)، والمستخدم يجيب سؤالًا واحدًا جديدًا ثم يمرّ على
 * شاشاته الجاهزة بضغطات «التالي». من كان في الخطوة ٠ أو ١ لا يتأثّر أصلًا.
 */
function migrateDraft(raw: PersistedDraft): OnboardingV2Draft {
  // `v` وحدها تُنزع؛ الباقي يُنشر أولًا **عمدًا**. إعادة إسناد مفتاح موجود بعد
  // النشر تُبقيه في موضعه الأصلي، فمسودّة بالنسخة الحالية تعود **مطابقة بايتًا
  // ببايت** لا مجرّد مكافئة بالقيم. لو نُزعت الحقول الأربعة في التفكيك لأُعيدت
  // في الذيل، فيتغيّر ترتيب المفاتيح بلا تغيّر قيمة — وهو فرقٌ يُسقط مقارنات
  // الجولة في الإثباتات القائمة بلا عيب حقيقي.
  const { v, ...rest } = raw
  const legacy = v === 5
  return {
    ...rest,
    step: legacy ? Math.min(rest.step, HISTORY_STEP) : rest.step,
    // لا اختراع: الغياب يصير `null` = «لم يُجَب»، لا قيمة افتراضية.
    trainedBefore: rest.trainedBefore ?? null,
    totalMonths: rest.totalMonths ?? null,
    lastTrained: rest.lastTrained ?? null,
    consistency: rest.consistency ?? null,
  }
}

/** Drop the draft (on successful finish) — resume must not reopen a completed setup. */
export function clearDraftV2(userId?: string | null): void {
  saveDraft(undefined, userId)
}
