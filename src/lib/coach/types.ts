// ═══════════════════════════════════════════════════════════════════════════
//  مرشد قِمّة — عقد الأنواع والإسناد (grounding contract).
//
//  ═══ السند ═══
//  [SOVEREIGN-COACH-001]. الجرد الشرعي `docs/execution/qimmah-sovereign-closure/
//  recon/R8-admin-aicoach.md` أثبت أن «المدرب الذكي» **لم يوجد قط** على أيٍّ من
//  ~٢٢٠ فرعًا، وأن `docs/product/BACKLOG.md:32` يدرجه في «حواجز ثابتة» خارج
//  النطاق. **هذا البند نُسِخ صراحةً بتفويض المؤسس في هذا الإغلاق** — والنسخ
//  مُعلَن هنا لا صامت: الوثيقة تبقى كما هي حتى تُحدَّث بأمر مرقّم، وهذا التعليق
//  هو أثر القرار. وما يُبنى ليس ما مُنع: لا نموذج لغوي، ولا شبكة، ولا محادثة
//  مفتوحة — محرّك قواعد حتمي يجيب من حالة المستخدم نفسها.
//
//  ═══ المبدأ الحاكم ═══
//  **لا جملة تصل المستخدم إلا ومعها مصدرها.** الجواب ليس نصًّا بل بنية:
//  حقائق (`CoachFact`) لكل واحدة **مصدر مسمّى** و**درجة يقين**، وسطور
//  (`AnswerLine`) لا تحمل نصًّا حرًّا بل **مفتاح قاموس** ووسائط كلٌّ منها
//  **يشير إلى الحقيقة التي أخرجته**. فاختلاق رقم يصير مستحيلًا بنيويًا لا
//  ممنوعًا بالعُرف: وسيط بلا حقيقة، أو وسيط قيمته تخالف حقيقته، **يسقط**
//  في `assertAnswerProvenance` قبل أن يُرسم (انظر `provenance.ts`).
//
//  ═══ لا ادّعاء طبي ═══
//  ملاءمة تمرين وإرشاد تغذية فقط. لا تشخيص ولا وصف علاج — ويحرسه
//  `findMedicalClaims` في `safety.ts` على القاموس كلّه.
// ═══════════════════════════════════════════════════════════════════════════

// ── الأسئلة: طقم ثابت مغلق، لا محادثة مفتوحة ────────────────────────────────

/**
 * الأسئلة **الستة** التي يجيبها المرشد. **الطقم مغلق عمدًا**: لا سؤال سابع
 * يُخترع وقت التشغيل، ولا مسار احتياطي ينتج نثرًا واثقًا من لا شيء (§5 من أمر
 * الموجة). المدخل غير المعروف يُقابَل بقائمة قدرات صادقة لا بتخمين.
 *
 * `progressTrend` أُضيف في هذه الموجة إلى الخمسة الأصلية — «كيف تقدّمي؟» —
 * ومصادره كلها قائمة (`progress.measurements` · `workout.history`)، فلم يحتج
 * مصدرًا جديدًا ولا كتابةً واحدة.
 */
export type CoachQuestionId =
  | 'todayPlan'
  | 'whyThisExercise'
  | 'missedYesterday'
  | 'canSubstitute'
  | 'whyCaloriesChanged'
  | 'progressTrend'

export const COACH_QUESTIONS: readonly CoachQuestionId[] = [
  'todayPlan',
  'whyThisExercise',
  'missedYesterday',
  'canSubstitute',
  'whyCaloriesChanged',
  'progressTrend',
] as const

/** مُعرِّف الجواب حين لا يطابق المدخل أي سؤال معروف — قائمة قدرات صادقة لا نثر. */
export type CoachAnswerSubject = CoachQuestionId | 'unrecognised'

// ── مصادر الإسناد: كل واحد وحدة قائمة على الجذع تُقرأ قراءةً فقط ────────────

export type GroundingSourceId =
  | 'plan.customization'
  | 'plan.rationale'
  | 'workout.daySource'
  | 'workout.calendar'
  | 'workout.history'
  | 'nutrition.day'
  | 'nutrition.targets'
  | 'progress.measurements'
  | 'recovery.engineLog'
  | 'onboarding.profile'
  | 'substitution.engine'

/** سجلّ المصادر — مفتاح ثابت ⇐ الوحدة التي يقرأ منها فعلًا. مرجع المراجعة والإثبات. */
export const GROUNDING_SOURCES: Readonly<Record<GroundingSourceId, string>> = {
  'plan.customization': 'src/lib/customization.ts',
  'plan.rationale': 'src/lib/planRationale.ts',
  'workout.daySource': 'src/lib/workoutDaySource.ts',
  'workout.calendar': 'src/lib/workoutCalendar.ts',
  'workout.history': 'src/lib/historyStore.ts',
  'nutrition.day': 'src/lib/nutritionV2Model.ts',
  'nutrition.targets': 'src/lib/customization.ts',
  'progress.measurements': 'src/lib/measurementLog.ts',
  'recovery.engineLog': 'src/lib/recoveryEngine.ts',
  'onboarding.profile': 'src/lib/onboardingProfile.ts',
  'substitution.engine': 'src/lib/workoutSubstitution.ts',
} as const

// ── درجة اليقين: ثلاث حالات لا اثنتان ───────────────────────────────────────

/**
 * `measured` مقروء كما هو من مخزن المستخدم · `inferred` مشتقّ بقاعدة معلنة
 * (يُصاغ بلغة متحفّظة — §6) · `unknown` **لا نعرف**، وقيمته `null` إلزامًا فلا
 * يتسرّب صفرٌ في موضع مجهول.
 */
export type Certainty = 'measured' | 'inferred' | 'unknown'

export interface CoachFact {
  /** معرّف داخل الجواب الواحد — فريد. */
  id: string
  source: GroundingSourceId
  certainty: Certainty
  /** `null` **حصرًا** حين `certainty === 'unknown'`. */
  value: string | number | null
}

// ── الوسائط والسطور ─────────────────────────────────────────────────────────

/** جداول القيم المنظَّمة التي يترجمها القاموس — القيمة تبقى مفتاحًا ثابتًا. */
export type CoachEnumTable =
  | 'experienceLevel'
  | 'goalType'
  | 'gymAccess'
  | 'recoverySuggestion'
  | 'muscle'
  | 'planAxis'
  | 'injuryArea'

export interface LineParam {
  /** القيمة المعروضة — **تطابق قيمة الحقيقة حرفيًا** أو يسقط الإسناد. */
  value: string | number
  /** الحقيقة التي أخرجت هذه القيمة. لا وسيط بلا حقيقة. */
  factId: string
  /** جدول ترجمة للقيم المنظَّمة (مستوى الخبرة، الهدف…) — لا يغيّر القيمة نفسها. */
  enum?: CoachEnumTable
}

export interface ExerciseRef {
  kind: 'exercise'
  id: string
  /** الحقيقة التي أخرجت هذا المعرّف (من محرّك البدائل). */
  factId: string
}

export interface AnswerLine {
  /** مفتاح في قاموس المرشد — **لا نصّ حرّ أبدًا**. */
  key: CoachLineKey
  /** وسائط النص، كلٌّ بحقيقته. */
  params?: Readonly<Record<string, LineParam>>
  /**
   * حقائق يستند إليها السطر بلا أن يعرض قيمتها (مثل «طُبِّق مرشّح الإصابات»).
   * تُحسب في الإسناد تمامًا كالوسائط، فلا تبقى حقيقة يتيمة ولا ادّعاء بلا سند.
   */
  basis?: readonly string[]
  /** حقائق **مجهولة** يقرّ بها السطر صراحةً — لا رقم يُخترع مكانها. */
  unknown?: readonly string[]
  /** إشارة لتمرين حقيقي (فتح صفحته) — معرّفها كذلك مسنَد. */
  ref?: ExerciseRef
  /** سؤال يُعرَض عنوانه من القاموس (قائمة القدرات) — ليس حالة مستخدم. */
  question?: CoachQuestionId
}

// ── المزوّد ─────────────────────────────────────────────────────────────────

export type CoachProviderId = 'local-deterministic' | 'external-model'

/**
 * إفصاح المصدر — **يُعرَض دائمًا**، ولا يُترك للمستخدم أن يخمّن من أين جاء
 * الجواب. `localData` هو الوحيد الممكن في هذا البناء.
 */
export type CoachDisclosure = 'localData' | 'externalModel'

export interface CoachAnswer {
  subject: CoachAnswerSubject
  providerId: CoachProviderId
  disclosure: CoachDisclosure
  lines: readonly AnswerLine[]
  facts: readonly CoachFact[]
}

// ── مفاتيح السطور ───────────────────────────────────────────────────────────

/**
 * كل مفتاح نصّ يقدر المحرّك على إصداره. القاموس يُطبَّق عليه
 * `Record<CoachLineKey, string>` فأي مفتاح بلا نصّ **يسقط في `typecheck`** لا في
 * الإنتاج، وأي نصّ بلا مفتاح يسقط كذلك.
 */
export const COACH_LINE_KEYS = [
  // — قائمة القدرات (مدخل غير معروف) —
  'capability.intro',
  'capability.item',
  'capability.noGuessing',
  // — اليوم —
  'today.noPlan',
  'today.rest',
  'today.restNext',
  'today.restNoNext',
  'today.training',
  'today.recovery',
  'today.recoveryUnknown',
  'today.caloriesLeft',
  'today.caloriesOver',
  'today.caloriesUnknown',
  // — ليش هذا التمرين —
  'why.noPlan',
  'why.todayDay',
  'why.trainingDays',
  'why.sessionSize',
  'why.experienceLoad',
  'why.experienceLoadFallback',
  'why.equipmentPool',
  'why.equipmentPoolFallback',
  'why.injuryFilterApplied',
  'why.injuryFilterNone',
  'why.volumeTop',
  'why.inactiveAxis',
  // — فاتني أمس —
  'missed.noSchedule',
  'missed.none',
  'missed.found',
  'missed.yoursToDecide',
  'missed.adherence',
  'missed.next',
  'missed.nextNone',
  // — البدائل —
  'sub.noExercise',
  'sub.intro',
  'sub.option',
  'sub.noneFound',
  'sub.injuryWithheld',
  'sub.useWorkoutSheet',
  'sub.notMedical',
  // — ليش تغيّرت سعراتي —
  'cal.noTarget',
  'cal.current',
  'cal.arithmetic',
  'cal.manual',
  'cal.minorMigrated',
  'cal.staleProfile',
  'cal.weightDrift',
  'cal.noLoggedWeight',
  'cal.unchangedSince',
  'cal.updatedUnknown',
  // — كيف تقدّمي —
  'progress.noData',
  'progress.weightDelta',
  'progress.weightSingle',
  'progress.weightUnknown',
  'progress.weightToTarget',
  'progress.sessions',
  'progress.loadRatio',
  'progress.loadUnknown',
  'progress.notScale',
  // — اقتراحات المرشد: **مفصولة بمفاتيحها** لا بنبرتها (انظر `COACH_LINE_KIND`) —
  'suggest.startSession',
  'suggest.restDay',
  'suggest.pickMissedOption',
  'suggest.logWeight',
  'suggest.keepLogging',
] as const

export type CoachLineKey = (typeof COACH_LINE_KEYS)[number]

/**
 * وصف كل مفتاح للحارس. `hedged` تعني أن النصّ **متحفّظ** («يبدو» · «تقريبي»)،
 * وهو **شرط إلزامي** لأي سطر يعرض حقيقة `inferred` (§6/٢ — لغة التقدّم
 * متحفّظة للمُستنتَج، حاسمة للمُقاس). يتحقّق منه `assertAnswerProvenance`.
 */
export const COACH_LINE_HEDGED: Readonly<Record<CoachLineKey, boolean>> = {
  'capability.intro': false,
  'capability.item': false,
  'capability.noGuessing': false,
  'today.noPlan': false,
  'today.rest': false,
  'today.restNext': false,
  'today.restNoNext': false,
  'today.training': false,
  'today.recovery': true,
  'today.recoveryUnknown': false,
  'today.caloriesLeft': false,
  'today.caloriesOver': false,
  'today.caloriesUnknown': false,
  'why.noPlan': false,
  'why.todayDay': false,
  'why.trainingDays': false,
  'why.sessionSize': false,
  'why.experienceLoad': false,
  // مستوى مشتقّ من حقل قديم لا مقروء من حقل الخبرة الدلالي ⇒ لغة متحفّظة (§6/٢).
  'why.experienceLoadFallback': true,
  'why.equipmentPool': false,
  'why.equipmentPoolFallback': true,
  'why.injuryFilterApplied': false,
  'why.injuryFilterNone': false,
  'why.volumeTop': false,
  'why.inactiveAxis': false,
  'missed.noSchedule': false,
  'missed.none': false,
  'missed.found': false,
  'missed.yoursToDecide': false,
  'missed.adherence': false,
  'missed.next': false,
  'missed.nextNone': false,
  'sub.noExercise': false,
  'sub.intro': false,
  'sub.option': false,
  'sub.noneFound': false,
  'sub.injuryWithheld': false,
  'sub.useWorkoutSheet': false,
  'sub.notMedical': false,
  'cal.noTarget': false,
  'cal.current': false,
  'cal.arithmetic': false,
  'cal.manual': false,
  'cal.minorMigrated': false,
  'cal.staleProfile': false,
  'cal.weightDrift': false,
  'cal.noLoggedWeight': false,
  'cal.unchangedSince': false,
  'cal.updatedUnknown': false,
  'progress.noData': false,
  'progress.weightDelta': false,
  'progress.weightSingle': false,
  'progress.weightUnknown': false,
  'progress.weightToTarget': false,
  'progress.sessions': false,
  // نسبة الحمل مشتقّة من نافذتين قصيرتين — تُقال «يبدو» لا «هذا حملك».
  'progress.loadRatio': true,
  'progress.loadUnknown': false,
  'progress.notScale': false,
  'suggest.startSession': false,
  'suggest.restDay': false,
  'suggest.pickMissedOption': false,
  'suggest.logWeight': false,
  'suggest.keepLogging': false,
} as const

// ── الفصل بين الحقيقة والاقتراح ─────────────────────────────────────────────

/**
 * **حقيقة محسوبة ≠ اقتراح مرشد ≠ ملاحظة حدود.** الفصل هنا بنيويّ لا نبريّ: كل
 * مفتاح يحمل نوعه، فالرسم يضع لكل نوع وسمًا مرئيًا ونصًّا معلنًا
 * (`CoachStrings.kinds`)، ولا يستطيع سطر اقتراح أن يتنكّر في هيئة رقم خرج من
 * المحرّك. القاعدة المحميّة: **المرشد لا يغيّر خطة** — يشرح ويقترح، والتنفيذ
 * يبقى في شاشته صاحبة السلطة (ورقة التمرين). ويحرس ذلك
 * `findPlanChangeClaims` في `safety.ts`: أي نصّ اقتراح يدّعي أن الخطة **عُدِّلت**
 * يسقط باسمه.
 */
export type CoachLineKind = 'fact' | 'suggestion' | 'note'

export const COACH_LINE_KIND: Readonly<Record<CoachLineKey, CoachLineKind>> = {
  'capability.intro': 'note',
  'capability.item': 'note',
  'capability.noGuessing': 'note',
  'today.noPlan': 'fact',
  'today.rest': 'fact',
  'today.restNext': 'fact',
  'today.restNoNext': 'fact',
  'today.training': 'fact',
  // محرّك التعافي يُنتج **اقتراحًا** لا قياسًا — فيُوسَم اقتراحًا.
  'today.recovery': 'suggestion',
  'today.recoveryUnknown': 'fact',
  'today.caloriesLeft': 'fact',
  'today.caloriesOver': 'fact',
  'today.caloriesUnknown': 'fact',
  'why.noPlan': 'fact',
  'why.todayDay': 'fact',
  'why.trainingDays': 'fact',
  'why.sessionSize': 'fact',
  'why.experienceLoad': 'fact',
  'why.experienceLoadFallback': 'fact',
  'why.equipmentPool': 'fact',
  'why.equipmentPoolFallback': 'fact',
  'why.injuryFilterApplied': 'fact',
  'why.injuryFilterNone': 'fact',
  'why.volumeTop': 'fact',
  'why.inactiveAxis': 'note',
  'missed.noSchedule': 'fact',
  'missed.none': 'fact',
  'missed.found': 'fact',
  'missed.yoursToDecide': 'note',
  'missed.adherence': 'fact',
  'missed.next': 'fact',
  'missed.nextNone': 'fact',
  'sub.noExercise': 'fact',
  'sub.intro': 'fact',
  'sub.option': 'fact',
  'sub.noneFound': 'fact',
  'sub.injuryWithheld': 'fact',
  'sub.useWorkoutSheet': 'suggestion',
  'sub.notMedical': 'note',
  'cal.noTarget': 'fact',
  'cal.current': 'fact',
  'cal.arithmetic': 'fact',
  'cal.manual': 'fact',
  'cal.minorMigrated': 'fact',
  'cal.staleProfile': 'fact',
  'cal.weightDrift': 'fact',
  'cal.noLoggedWeight': 'fact',
  'cal.unchangedSince': 'fact',
  'cal.updatedUnknown': 'fact',
  'progress.noData': 'fact',
  'progress.weightDelta': 'fact',
  'progress.weightSingle': 'fact',
  'progress.weightUnknown': 'fact',
  'progress.weightToTarget': 'fact',
  'progress.sessions': 'fact',
  'progress.loadRatio': 'fact',
  'progress.loadUnknown': 'fact',
  'progress.notScale': 'note',
  'suggest.startSession': 'suggestion',
  'suggest.restDay': 'suggestion',
  'suggest.pickMissedOption': 'suggestion',
  'suggest.logWeight': 'suggestion',
  'suggest.keepLogging': 'suggestion',
} as const

const LINE_KEY_SET: ReadonlySet<string> = new Set<string>(COACH_LINE_KEYS)

export function isCoachLineKey(value: string): value is CoachLineKey {
  return LINE_KEY_SET.has(value)
}
