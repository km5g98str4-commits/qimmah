// محرّك التخصيص التكيّفي — الأنواع والعقود.
//
// ═══ لماذا طبقة جديدة بدل توسيع `onboardingV2Flow` ═══
// التدفّق الحالي (`onboardingV2Flow.ts`) آلة حالة **ثابتة الخطوات**: خمس خطوات
// مرقّمة، وكل مستخدم يمرّ بها كلّها. هذه الطبقة تجيب سؤالًا مختلفًا: **أيّ سؤال
// يستحق أن يُطرح على هذا المستخدم الآن؟** — بنك كبير، ومسار قصير يُختار منه.
// دمج المنطقين في ملف واحد كان سيحوّل `validateStep` إلى سلسلة `if` عملاقة،
// وهو بعينه ما يمنعه §20 من مواصفة التخصيص («Avoid a giant unmaintainable
// chain of if-statements»).
//
// ═══ الفصل الثلاثي الملزم ═══
//   1. **تعريف السؤال** (هنا + `bank/*`) — بيانات صرفة، بلا منطق ولا نص.
//   2. **منطق التفرّع** (`rules.ts` · `engine.ts`) — يقرأ التعريفات ولا يعرف نصًّا.
//   3. **النص** (`src/i18n/dict/personalization.ts`) — عربي وإنجليزي معًا (الميثاق §6).
// فلا نصّ صلب في التعريف، ولا شرط مكتوب داخل مكوّن واجهة.
//
// ═══ ما لا يفعله هذا المحرّك ═══
// لا يشخّص، ولا يقرّر سلامة بنموذج لغوي. كل قرار سلامة/أهلية/تصنيف **قاعدة
// مكتوبة قابلة للاختبار** تعطي نفس المخرج لنفس المدخل (§9 من المواصفة).

import type { Lang } from '@/lib/appPreferences'
import type { Muscle, MovementPattern } from '@/types/workout'

// ————————————————————————— الإصدارات —————————————————————————
//
// ثلاثة إصدارات مستقلّة عمدًا: تغيير نصّ سؤال ليس تغيير خوارزمية، وتغيير
// الخوارزمية ليس تغيير شكل التخزين. خلطها في رقم واحد يجبر هجرة لا داعي لها.

/** شكل الحالة المخزَّنة. رفعه ⇒ الحالات الأقدم تمرّ على `migrateState`. */
export const STATE_VERSION = 1
/** إصدار بنك الأسئلة. رفعه ⇒ إجابات الأسئلة المحذوفة تُهمَل بلا كسر. */
export const BANK_VERSION = 1
/** إصدار خوارزمية الاشتقاق. رفعه ⇒ يُعاد اشتقاق الملف من الإجابات الخام. */
export const ALGO_VERSION = 1

// ————————————————————————— لغة الشروط —————————————————————————
//
// شرط = بيانات لا كود. هذا ما يجعل مصفوفة التفرّع **قابلة للفحص والطباعة
// والاختبار** بدل أن تكون مبعثرة في `if`ات. المقيّم في `rules.ts`.

/** عوامل المقارنة المدعومة. `answered`/`unanswered` لا تأخذ قيمة. */
export type ConditionOp =
  | 'eq'
  | 'ne'
  | 'in'
  | 'nin'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  /** الإجابة مصفوفة وتحوي هذه القيمة. */
  | 'has'
  /** الإجابة مصفوفة وتحوي أيًّا من هذه القيم. */
  | 'hasAny'
  /** الإجابة مصفوفة ولا تحوي أيًّا من هذه القيم. */
  | 'hasNone'
  | 'answered'
  | 'unanswered'

/**
 * الحقل المقروء: إمّا مفتاح إجابة خام (`answers.<key>`) أو إشارة مشتقّة
 * (`derived.<key>`). البادئة إلزامية حتى لا يلتبس المصدران — التباسهما هو
 * كيف تتسرّب قرارات من إجابة واحدة إلى تصنيف كامل (§3 من المواصفة).
 */
export type ConditionField = `answers.${string}` | `derived.${string}`

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { field: ConditionField; op: ConditionOp; value?: unknown }
  | { const: boolean }

// ————————————————————————— السؤال —————————————————————————

export type QuestionId = string

/** فئات البنك — تطابق §7 من المواصفة، مع `clarify` للتوضيح عند التناقض. */
export type QuestionCategory =
  | 'basics'
  | 'experience'
  | 'goals'
  | 'availability'
  | 'equipment'
  | 'preferences'
  | 'limitations'
  | 'recovery'
  | 'advanced'
  | 'safety'
  | 'clarify'

/** أنواع الإجابة. النص الحرّ آخر ملاذ — يصعب التحقّق منه واستعماله. */
export type AnswerType =
  | 'single'
  | 'multi'
  | 'number'
  | 'slider'
  | 'boolean'
  | 'rank'
  | 'time'
  | 'weekdays'
  | 'bodyAreas'
  | 'equipment'
  | 'exercises'
  | 'text'

export type AnswerValue = string | number | boolean | string[] | number[] | null

/**
 * أثر السؤال على السلامة:
 *  • `none`    — لا أثر.
 *  • `screen`  — سؤال فرز؛ جوابه قد يفتح أسئلة سلامة أخرى.
 *  • `restrict`— جوابه قد يقيّد تمارين أو أنماط حركة.
 *  • `clear`   — جوابه قد يستوجب **إحالة لمختصّ** قبل أي توصية حِمل.
 */
export type SafetyImpact = 'none' | 'screen' | 'restrict' | 'clear'

export interface QuestionOption {
  value: string
  /** لا يُعرض هذا الخيار إلا إذا تحقّق الشرط (مثال: أهداف تُقيَّد بالعمر). */
  when?: Condition
  /**
   * ما يكتبه اختيار هذا الخيار في الإشارات المشتقّة مباشرةً. خريطة مسطّحة
   * `<اسم الإشارة> → قيمة` — تُطبَّق في `applyAnswer` قبل أي اشتقاق.
   */
  sets?: Record<string, string | number | boolean>
}

export interface QuestionDef {
  id: QuestionId
  /** مفتاح الإجابة في `state.answers` — ثابت عبر الإصدارات (§20: stable IDs). */
  key: string
  category: QuestionCategory
  answer: AnswerType
  options?: QuestionOption[]
  range?: { min: number; max: number; step?: number; unit?: string }
  /** حدّ أدنى/أقصى لعدد الاختيارات في `multi`. */
  select?: { min?: number; max?: number }

  /** يُعرض فقط إذا تحقّق. غيابه = مؤهَّل دائمًا. */
  eligible?: Condition
  /** يُستبعَد إذا تحقّق — يُقيَّم بعد `eligible` ويغلبه. */
  skipIf?: Condition
  /** أسئلة تُرفَع للطابور فور تحقّق الشرط على إجابة هذا السؤال. */
  followUps?: { when: Condition; ask: QuestionId[] }[]

  /**
   * الحقول المشتقّة التي يغيّرها هذا السؤال فعلًا.
   * **لا يجوز أن تكون فارغة** — «كل سؤال يغيّر شيئًا في المخرجات؛ ما لا يغيّر
   * يُحذف» (`PERSONALIZATION-SPEC.md` §3.1). ويحرسه الإثبات لا التعليق.
   */
  affects: readonly ProfileField[]
  safety: SafetyImpact
  /** 0..100 — الأعلى يُسأل أولًا عند تساوي الإلزام. */
  priority: number
  required: boolean
  skippable: boolean
  /** التصنيفات المسموح عرض السؤال لها. غيابه = كلّها. */
  levels?: readonly ExperienceClass[]
  /**
   * مكسب المعلومة 0..10 — كم يضيّق هذا السؤال فضاء المخرجات. فاصل الترجيح حين
   * تتساوى الأولوية، وهو ما يمنع «حشو للوصول إلى رقم» (§8 من المواصفة).
   */
  infoGain: number
  analyticsKey: string
  /** إصدار البنك الذي أُدخل فيه السؤال. */
  since: number
}

// ————————————————————————— التصنيف —————————————————————————

/** ستّة تصنيفات (§11 من المواصفة) — `returning` ليس درجة بل حالة. */
export type ExperienceClass =
  | 'complete_beginner'
  | 'beginner'
  | 'early_intermediate'
  | 'intermediate'
  | 'advanced'
  | 'returning'

export interface ExperienceVerdict {
  klass: ExperienceClass
  /** 0..1 — ثقة التصنيف، لا درجة الخبرة. */
  confidence: number
  /** النقاط الخام لكل إشارة — للعرض والتشخيص والاختبار. */
  signals: Record<string, number>
  score: number
}

// ————————————————————————— الملف المشتقّ —————————————————————————

export type GoalKey = 'cut' | 'maintain' | 'bulk'
export type TrainingPlace = 'gym' | 'home' | 'outdoor' | 'mixed'
export type SplitKey = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split' | 'auto'
export type ProgressionStyle = 'double_progression' | 'linear_load' | 'rep_first' | 'rpe_based' | 'auto'
export type ControlLevel = 'guided' | 'balanced' | 'full_control'
export type CardioPreference = 'none' | 'light' | 'moderate' | 'high' | 'sport_only'
export type RecoveryClass = 'poor' | 'fair' | 'good'

/** الأسماء المسموح ذكرها في `affects` — مقيّدة نوعيًا فلا يُخترع حقل. */
export type ProfileField =
  | 'age'
  | 'sex'
  | 'heightCm'
  | 'weightKg'
  | 'lang'
  | 'units'
  | 'experience'
  | 'experienceConfidence'
  | 'primaryGoal'
  | 'secondaryGoal'
  | 'trainingStatus'
  | 'daysPerWeek'
  | 'availableDays'
  | 'sessionMinutes'
  | 'place'
  | 'equipment'
  | 'preferredExercises'
  | 'excludedExercises'
  | 'limitations'
  | 'safetyFlags'
  | 'trainingStyle'
  | 'split'
  | 'progression'
  | 'recovery'
  | 'intensity'
  | 'volume'
  | 'cardio'
  | 'controlLevel'
  | 'musclePriorities'
  | 'planConstraints'

export interface SafetyFlags {
  /** يوصى بمراجعة مختصّ قبل التحميل — لا تشخيص، ولا منع من التطبيق. */
  needsClearance: boolean
  /** أسباب مسمّاة (مفاتيح لا نصوص) — النص في القاموس. */
  reasons: string[]
  /** أنماط حركة تُستبعَد كليًّا. */
  excludedPatterns: MovementPattern[]
  /** عضلات تُستبعَد كليًّا. */
  excludedMuscles: Muscle[]
  /** سقف صعوبة التمرين المسموح. */
  maxExerciseLevel: 'beginner' | 'intermediate' | 'advanced'
  /** يُمنع الحمل فوق الرأس / القفز / الانفجاري. */
  noOverhead: boolean
  noImpact: boolean
  noValsalva: boolean
}

export interface Limitation {
  /** منطقة الجسم — من `BODY_AREAS`. */
  area: string
  kind: 'injury_current' | 'injury_past' | 'pain' | 'restricted_rom' | 'surgery' | 'medical' | 'balance'
  /** هل يقيّد الحِمل اليوم؟ */
  active: boolean
}

/** قيود توليد الخطة — المخرَج الذي يستهلكه مولّد الخطة (§14). */
export interface PlanConstraints {
  sessionsPerWeek: number
  split: SplitKey
  sessionMinutes: number
  musclePriorities: Muscle[]
  requiredPatterns: MovementPattern[]
  /** مجموعات أسبوعية لكل عضلة أساسية — نقطة البداية لا سقفًا. */
  weeklySetsStart: number
  repRange: { min: number; max: number }
  restSecRange: { min: number; max: number }
  progression: ProgressionStyle
  maxExerciseLevel: 'beginner' | 'intermediate' | 'advanced'
  cardio: CardioPreference
  /** أقصى عدد تمارين في الجلسة — مشتقّ من المدّة والمستوى. */
  maxExercisesPerSession: number
  /** يسمح بالاستبدال داخل الجلسة؟ */
  allowSubstitution: boolean
  /**
   * **السياق الخليجي مفترَض لا مسؤول عنه** — [CTO-76] القرار ٢.
   * ثابت `true`: مراعاة رمضان وحرّ الصيف تبنيها طبقة الخطة **تلقائيًا وموسميًا**
   * بدل أن تُستهلك سؤالًا من ميزانية العشرين. الحقل مخرَج صريح لا افتراض ضمني —
   * المستهلك يقرأه ويعرف أنه مفترَض، فلا يظنّه إجابة مستخدم.
   */
  assumesGulfContext: boolean
}

/** المخرَج المهيكل بعد اكتمال الإعداد (§10 من المواصفة). */
export interface PersonalizationProfile {
  userId: string | null
  algoVersion: number
  bankVersion: number
  completedAt: number

  age: number | null
  sex: 'male' | 'female' | null
  heightCm: number | null
  weightKg: number | null
  lang: Lang
  units: 'metric' | 'imperial'

  experience: ExperienceClass
  experienceConfidence: number
  trainingStatus: 'never' | 'detrained' | 'inconsistent' | 'consistent'

  primaryGoal: GoalKey
  secondaryGoal: GoalKey | null
  /** الهدف كما صيغ للمستخدم (مفتاح صياغة، لا نص). */
  goalWordingKey: string

  daysPerWeek: number
  availableDays: number[]
  sessionMinutes: number

  place: TrainingPlace
  equipment: string[]
  preferredExercises: string[]
  excludedExercises: string[]

  limitations: Limitation[]
  safety: SafetyFlags

  trainingStyle: 'machines' | 'free_weights' | 'mixed' | 'bodyweight'
  split: SplitKey
  progression: ProgressionStyle
  recovery: RecoveryClass
  intensity: { rirMin: number; rirMax: number }
  volume: { weeklySetsPerMuscle: number }
  cardio: CardioPreference
  controlLevel: ControlLevel
  musclePriorities: Muscle[]

  planConstraints: PlanConstraints

  /** 0..1 — كم من المعلومة اللازمة جُمعت فعلًا. لا يُعرض كنسبة دقّة. */
  confidence: number
}

// ————————————————————————— الحالة —————————————————————————

export interface ClarificationRecord {
  /** معرّف التناقض المكتشَف. */
  conflictId: string
  /** سؤال التوضيح الذي طُرح. */
  questionId: QuestionId
  resolvedAt: number | null
}

export interface AskRecord {
  id: QuestionId
  askedAt: number
  answeredAt: number | null
  skipped: boolean
  /** كم مرّة رجع المستخدم وغيّر هذه الإجابة. */
  revisions: number
}

export interface PersonalizationState {
  stateVersion: number
  bankVersion: number
  algoVersion: number
  userId: string | null
  lang: Lang
  /** الإجابات الخام — مفتاح السؤال ← قيمته. تُحفَظ دائمًا (§10). */
  answers: Record<string, AnswerValue>
  /** الإشارات المشتقّة أثناء التدفّق (تُعاد بناؤها من `answers` عند الهجرة). */
  derived: Record<string, string | number | boolean>
  /** سجلّ الطرح بالترتيب — مصدر «رجع/غيّر» في التحليلات. */
  history: AskRecord[]
  /** طابور المتابعات المرفوعة. */
  queue: QuestionId[]
  clarifications: ClarificationRecord[]
  startedAt: number
  updatedAt: number
  completedAt: number | null
}

// ————————————————————————— ميزانية التدفّق —————————————————————————

export interface FlowBudget {
  min: number
  max: number
  /** السقف المطلق مهما كان التصنيف — لا يُخترق. */
  hardCap: number
}

/**
 * ميزانية الأسئلة لكل تصنيف.
 *
 * ⚠️ **نقطة تعارض مُعلَنة، محسومة تهيئةً لا اجتهادًا.**
 * مواصفة التخصيص الجديدة تطلب حدًّا أدنى ≈15 للمبتدئ، بينما
 * `docs/product/ONBOARDING-QUESTION-TREE.md` §2 — **معتمدة بـ[CTO-15]** — تثبّت
 * «المسار النموذجي للمبتدئ: 12 سؤالًا» و«أقصر مسار: 11». الرقمان لا يجتمعان.
 * فالحلّ: **الميزانية تهيئة مسمّاة**، والافتراضي يتبع المواصفة الجديدة، وتهيئة
 * `CHARTER_TREE_BUDGET` تعيد أرقام [CTO-15] بتبديل ثابت واحد. القرار بينهما
 * يُرفع للمؤسس (§7 من دستور الجودة) ولا يُحسم هنا.
 *
 * **ما لا يتغيّر بأي تهيئة: `hardCap = 20`** — وهو الرقم الوحيد المشترك بين
 * الوثيقتين، وشرط سلامة العدّاد في §2 من الشجرة المعتمدة.
 */
export const DEFAULT_BUDGET: Record<ExperienceClass, FlowBudget> = {
  complete_beginner: { min: 15, max: 17, hardCap: 20 },
  beginner: { min: 15, max: 17, hardCap: 20 },
  early_intermediate: { min: 16, max: 18, hardCap: 20 },
  intermediate: { min: 16, max: 18, hardCap: 20 },
  advanced: { min: 18, max: 20, hardCap: 20 },
  returning: { min: 16, max: 18, hardCap: 20 },
}

/** ميزانية [CTO-15] كما اعتُمدت — بديل جاهز، لا يُفعَّل بلا قرار مؤسس. */
export const CHARTER_TREE_BUDGET: Record<ExperienceClass, FlowBudget> = {
  complete_beginner: { min: 11, max: 13, hardCap: 20 },
  beginner: { min: 12, max: 14, hardCap: 20 },
  early_intermediate: { min: 13, max: 16, hardCap: 20 },
  intermediate: { min: 14, max: 17, hardCap: 20 },
  advanced: { min: 15, max: 19, hardCap: 20 },
  returning: { min: 13, max: 16, hardCap: 20 },
}

/** السقف المطلق — مشترك بين الوثيقتين، ولا تهيئة تتجاوزه. */
export const ABSOLUTE_QUESTION_CAP = 20

// ————————————————————————— مناطق الجسم والمعدّات —————————————————————————

/**
 * مناطق الجسم لأسئلة القيود. **قائمة مغلقة** — نص حرّ هنا يعني قيدًا لا يستطيع
 * المحرّك ترجمته إلى استبعاد، أي وعد بأمان لا يُنفَّذ.
 */
export const BODY_AREAS = [
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'upper_back',
  'lower_back',
  'hip',
  'knee',
  'ankle',
  'core',
] as const
export type BodyArea = (typeof BODY_AREAS)[number]

/**
 * مفردات المعدّات — **مشتقّة من مكتبة التمارين القائمة حرفيًا** لا مخترَعة.
 * أي قيمة هنا يجب أن تظهر في `equipment[]` لتمرين واحد على الأقل في
 * `src/data/exercises.ts`، ويحرسه الإثبات. مفردة لا تطابق المكتبة = فلتر
 * يستبعد ولا يُبقي شيئًا.
 */
export const EQUIPMENT_VOCAB = [
  'machine',
  'bodyweight',
  'dumbbell',
  'cable',
  'barbell',
  'bench',
  'ez-bar',
  'band',
  'smith',
  'rope',
  'plate',
  'kettlebell',
] as const
export type EquipmentKey = (typeof EQUIPMENT_VOCAB)[number]
