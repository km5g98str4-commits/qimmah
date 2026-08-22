// ═══════════════════════════════════════════════════════════════════════════
//  محرّك قواعد المرشد — [SOVEREIGN-COACH-001].
//
//  ═══ ما هو ═══
//  دالة نقيّة واحدة: `(سؤال، سياق) ⇒ جواب مُسنَد`. **حتميّة تمامًا** — نفس
//  السياق يعطي نفس الجواب، بلا شبكة ولا نموذج ولا عشوائية ولا حالة مخبوءة.
//
//  ═══ لماذا كل قيمة تمرّ من `FactBag` ═══
//  الوسيط لا يُكتب بيد أبدًا: `bag.use(id)` يقرأ القيمة **من الحقيقة نفسها**،
//  فاختلاف الوسيط عن مصدره صار مستحيلًا في الإنتاج لا ممنوعًا بالعُرف. ويبقى
//  `assertAnswerProvenance` هو الحارس الذي **يهاجمه** الإثبات المضادّ بحقنة
//  يدوية، فيسقط بـ`param-value-mismatch` باسمه.
//
//  ═══ ثلاث قواعد لا تُخترق ═══
//  ① **لا اختلاق:** ما لا يُقرأ من مخزن المستخدم يُقال «لا نعرف» (`unknown`)
//     ولا يُملأ بصفر ولا بمتوسّط.
//  ② **المحرّكات تُنادى:** البدائل من `findSubstitutes` وحده — وهو المرشِّح
//     الواعي بالإصابة. لا نسخة ثانية هنا ولا التفاف حوله.
//  ③ **المرشد يقرأ ولا يكتب:** ولا يقدّم اقتراحًا في هيئة تغيير مطبَّق
//     (`COACH_LINE_KIND` + `findPlanChangeClaims`).
// ═══════════════════════════════════════════════════════════════════════════

import { findSubstitutes, type SubReason } from '@/lib/workoutSubstitution'
import { topWeeklyMuscle, type CoachContext } from './context'
import {
  COACH_QUESTIONS,
  type AnswerLine,
  type CoachAnswer,
  type CoachAnswerSubject,
  type CoachEnumTable,
  type CoachFact,
  type CoachLineKey,
  type Certainty,
  type GroundingSourceId,
  type LineParam,
} from './types'

// ── حقيبة الحقائق ───────────────────────────────────────────────────────────

/**
 * تُنشئ الحقائق وتصرف الوسائط منها. `use` هو الباب الوحيد لصناعة وسيط —
 * ولذلك لا يمكن لسطرٍ أن يعرض رقمًا لا حقيقة له، ولا قيمةً تخالف حقيقتها.
 */
class FactBag {
  private readonly facts: CoachFact[] = []
  private readonly index = new Map<string, CoachFact>()

  private add(id: string, source: GroundingSourceId, certainty: Certainty, value: string | number | null): string {
    const fact: CoachFact = { id, source, certainty, value }
    this.facts.push(fact)
    this.index.set(id, fact)
    return id
  }

  /** مقروء كما هو من مخزن المستخدم (أو حسابٌ مباشر فوق مقروءات). */
  measured(id: string, source: GroundingSourceId, value: string | number): string {
    return this.add(id, source, 'measured', value)
  }

  /** مشتقّ بقاعدة معلنة — يُلزِم سطره بلغة متحفّظة (§6/٢). */
  inferred(id: string, source: GroundingSourceId, value: string | number): string {
    return this.add(id, source, 'inferred', value)
  }

  /** لا نعرف. القيمة `null` إلزامًا — فلا يتسرّب صفر في موضع مجهول. */
  unknown(id: string, source: GroundingSourceId): string {
    return this.add(id, source, 'unknown', null)
  }

  /** وسيط قيمته **مأخوذة من الحقيقة** لا مكتوبة بيد. */
  use(factId: string, table?: CoachEnumTable): LineParam {
    const fact = this.index.get(factId)
    if (!fact || fact.value === null) {
      // لا يقع في الإنتاج (كل نداء يلي إنشاءً)؛ ولو وقع فالإسناد يُسقطه باسمه.
      return { value: '', factId, enum: table }
    }
    return { value: fact.value, factId, enum: table }
  }

  all(): CoachFact[] {
    return this.facts
  }
}

const line = (key: CoachLineKey, rest: Omit<AnswerLine, 'key'> = {}): AnswerLine => ({ key, ...rest })

// ── لبنات مشتركة ────────────────────────────────────────────────────────────

/** كتلة التعافي — اقتراح محرّك أو إقرار صريح بعدم المعرفة. */
function recoveryBlock(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  if (!ctx.recovery) {
    return [line('today.recoveryUnknown', { unknown: [bag.unknown('recoveryToday', 'recovery.engineLog')] })]
  }
  const suggestion = bag.inferred('recoverySuggestion', 'recovery.engineLog', ctx.recovery.suggestion)
  const confidence = bag.inferred('recoveryConfidence', 'recovery.engineLog', Math.round(ctx.recovery.confidence * 100))
  return [
    line('today.recovery', {
      params: { suggestion: bag.use(suggestion, 'recoverySuggestion'), confidence: bag.use(confidence) },
    }),
  ]
}

/** كتلة السعرات المتبقّية اليوم — أو إقرار بغياب هدف. */
function caloriesBlock(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  if (!ctx.calories) {
    return [line('today.caloriesUnknown', { unknown: [bag.unknown('calorieTarget', 'nutrition.targets')] })]
  }
  const target = bag.measured('calTarget', 'nutrition.targets', ctx.calories.target)
  if (ctx.calories.remaining >= 0) {
    const left = bag.measured('calRemaining', 'nutrition.day', ctx.calories.remaining)
    return [line('today.caloriesLeft', { params: { remaining: bag.use(left), target: bag.use(target) } })]
  }
  const over = bag.measured('calOver', 'nutrition.day', Math.abs(ctx.calories.remaining))
  return [line('today.caloriesOver', { params: { over: bag.use(over), target: bag.use(target) } })]
}

/** كتلة اليوم القادم — مشتركة بين «اليوم» و«فاتني أمس». */
function nextBlock(ctx: CoachContext, bag: FactBag, key: 'today.restNext' | 'missed.next', noneKey: 'today.restNoNext' | 'missed.nextNone'): AnswerLine {
  if (!ctx.next) {
    return line(noneKey, { unknown: [bag.unknown('nextWorkout', 'workout.daySource')] })
  }
  const days = bag.measured('nextInDays', 'workout.daySource', ctx.next.inDays)
  const name = bag.measured('nextDayName', 'workout.daySource', ctx.next.dayName)
  return line(key, { params: { days: bag.use(days), day: bag.use(name) } })
}

/** حقيقة الإصابة — معلنة دائمًا، بقيمة منظَّمة لا بنصّ المستخدم الحرّ. */
function injuryFact(ctx: CoachContext, bag: FactBag): string {
  const value = ctx.injury.declared ? (ctx.injury.areas.length ? ctx.injury.areas.join('+') : 'declared') : 'none'
  return bag.measured('injuryState', 'onboarding.profile', value)
}

// ── ① وش أسوّي اليوم؟ ───────────────────────────────────────────────────────

function todayPlan(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  const lines: AnswerLine[] = []
  if (!ctx.hasPlan) {
    lines.push(line('today.noPlan', { basis: [bag.measured('planDays', 'plan.customization', 0)] }))
    lines.push(...caloriesBlock(ctx, bag))
    return lines
  }
  if (ctx.today.kind === 'training') {
    const day = bag.measured('todayDayName', 'workout.daySource', ctx.today.dayName)
    const count = bag.measured('todayExercises', 'workout.daySource', ctx.today.exerciseCount)
    const sets = bag.measured('todaySets', 'workout.daySource', ctx.today.setCount)
    lines.push(line('today.training', { params: { day: bag.use(day), exercises: bag.use(count), sets: bag.use(sets) } }))
    lines.push(line('suggest.startSession', { basis: [day] }))
  } else {
    const rest = bag.measured('todayType', 'workout.daySource', 'rest')
    lines.push(line('today.rest', { basis: [rest] }))
    lines.push(nextBlock(ctx, bag, 'today.restNext', 'today.restNoNext'))
    lines.push(line('suggest.restDay', { basis: [rest] }))
  }
  lines.push(...recoveryBlock(ctx, bag))
  lines.push(...caloriesBlock(ctx, bag))
  return lines
}

// ── ② ليش اخترت لي هذا التمرين؟ ─────────────────────────────────────────────

function whyThisExercise(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  if (!ctx.hasPlan) {
    return [line('why.noPlan', { basis: [bag.measured('planDays', 'plan.customization', 0)] })]
  }
  const lines: AnswerLine[] = []

  if (ctx.today.kind === 'training') {
    const day = bag.measured('todayDayName', 'workout.daySource', ctx.today.dayName)
    lines.push(line('why.todayDay', { params: { day: bag.use(day) } }))
    const count = bag.measured('todayExercises', 'workout.daySource', ctx.today.exerciseCount)
    lines.push(line('why.sessionSize', { params: { exercises: bag.use(count) } }))
  }

  const days = bag.measured('trainingDays', 'onboarding.profile', ctx.trainingDaysTarget)
  lines.push(line('why.trainingDays', { params: { days: bag.use(days) } }))

  // مستوى الخبرة: الحقل الدلالي مقروء ⇒ حاسم؛ والاشتقاق من الحقل القديم ⇒ متحفّظ.
  if (ctx.profile.experienceLevel) {
    const level = bag.measured('experience', 'onboarding.profile', ctx.profile.experienceLevel)
    lines.push(line('why.experienceLoad', { params: { level: bag.use(level, 'experienceLevel') } }))
  } else {
    const level = bag.inferred('experience', 'onboarding.profile', ctx.profile.trainingLevel)
    lines.push(line('why.experienceLoadFallback', { params: { level: bag.use(level, 'experienceLevel') } }))
  }

  if (ctx.profile.gymAccess) {
    const access = bag.measured('access', 'onboarding.profile', ctx.profile.gymAccess)
    lines.push(line('why.equipmentPool', { params: { access: bag.use(access, 'gymAccess') } }))
  } else {
    const derived = ctx.profile.workoutEnvironment === 'home' ? 'home' : 'full'
    const access = bag.inferred('access', 'onboarding.profile', derived)
    lines.push(line('why.equipmentPoolFallback', { params: { access: bag.use(access, 'gymAccess') } }))
  }

  const injury = injuryFact(ctx, bag)
  lines.push(line(ctx.injury.declared ? 'why.injuryFilterApplied' : 'why.injuryFilterNone', { basis: [injury] }))

  const top = topWeeklyMuscle(ctx)
  if (top) {
    const muscle = bag.measured('topMuscle', 'plan.rationale', top.muscle)
    const sets = bag.measured('topMuscleSets', 'plan.rationale', top.sets)
    lines.push(line('why.volumeTop', { params: { muscle: bag.use(muscle, 'muscle'), sets: bag.use(sets) } }))
  }

  for (const axis of ctx.rationale?.inactiveAxes ?? []) {
    const id = bag.measured(`inactive.${axis.axis}`, 'plan.rationale', axis.axis)
    lines.push(line('why.inactiveAxis', { params: { axis: bag.use(id, 'planAxis') } }))
  }

  return lines
}

// ── ③ فاتني أمس — وش الحين؟ ─────────────────────────────────────────────────

function missedYesterday(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  const lines: AnswerLine[] = []
  if (!ctx.hasSchedule) {
    lines.push(line('missed.noSchedule', { unknown: [bag.unknown('weeklySchedule', 'workout.calendar')] }))
  } else if (!ctx.missed) {
    lines.push(line('missed.none', { basis: [bag.measured('missedState', 'workout.calendar', 'none')] }))
  } else {
    const day = bag.measured('missedDay', 'workout.calendar', ctx.missedDayName ?? ctx.missed.date)
    const date = bag.measured('missedDate', 'workout.calendar', ctx.missed.date)
    lines.push(line('missed.found', { params: { day: bag.use(day), date: bag.use(date) } }))
    lines.push(line('missed.yoursToDecide', { basis: [day] }))
    lines.push(line('suggest.pickMissedOption', { basis: [date] }))
  }

  if (ctx.load) {
    const sessions = bag.measured('sessions7', 'workout.history', ctx.load.sessions7)
    lines.push(line('missed.adherence', { params: { sessions: bag.use(sessions) } }))
  }

  lines.push(nextBlock(ctx, bag, 'missed.next', 'missed.nextNone'))
  return lines
}

// ── ④ أقدر أبدّل هذا التمرين؟ ───────────────────────────────────────────────

function canSubstitute(ctx: CoachContext, bag: FactBag, reason: SubReason): AnswerLine[] {
  const lines: AnswerLine[] = []
  const subject = ctx.subjectExercise
  if (!subject) {
    lines.push(line('sub.noExercise', { unknown: [bag.unknown('subjectExercise', 'workout.daySource')] }))
    lines.push(line('sub.notMedical'))
    return lines
  }

  const exId = bag.measured('subjectId', 'workout.daySource', subject.id)
  const exName = bag.measured('subjectName', 'workout.daySource', subject.name)
  lines.push(line('sub.intro', { params: { exercise: bag.use(exName) }, ref: { kind: 'exercise', id: subject.id, factId: exId } }))

  const injury = injuryFact(ctx, bag)
  // حالة الإصابة **تُعلَن في الحالتين** — كما في «ليش هذا التمرين» تمامًا.
  // [SOVEREIGN-COACH-002] كانت تُعلَن حين تُصرَّح وحدها، فتبقى حقيقة `injuryState`
  // بلا سطر يستعملها حين لا إصابة **ووُجدت بدائل** ⇒ `orphan-fact` يرميه حارس
  // الإسناد قبل الرسم ⇒ الشاشة تعرض «ما قدرت أربط سطرًا بمصدره» في أكثر حالات
  // البدائل شيوعًا. الحارس أدّى دوره؛ والعلاج أن يُقال الصدق لا أن يُخفَّف.
  lines.push(line(ctx.injury.declared ? 'why.injuryFilterApplied' : 'why.injuryFilterNone', { basis: [injury] }))

  // ② المحرّك الحقيقي — الواعي بالإصابة. لا ترتيب ولا ترشيح مكتوب هنا.
  const options = findSubstitutes(subject.id, ctx.profile, reason, 4)
  const count = bag.measured('substituteCount', 'substitution.engine', options.length)

  if (options.length === 0) {
    lines.push(line(ctx.injury.declared ? 'sub.injuryWithheld' : 'sub.noneFound', { basis: [count, injury] }))
  } else {
    options.forEach((option, i) => {
      const id = bag.measured(`optId.${i}`, 'substitution.engine', option.exerciseId)
      const name = bag.measured(`optName.${i}`, 'substitution.engine', ctx.lang === 'en' ? option.nameEn : option.nameAr)
      lines.push(line('sub.option', { params: { exercise: bag.use(name) }, basis: [count], ref: { kind: 'exercise', id: option.exerciseId, factId: id } }))
    })
  }

  lines.push(line('sub.useWorkoutSheet', { basis: [exId] }))
  lines.push(line('sub.notMedical'))
  return lines
}

// ── ⑤ ليش سعراتي هذا الرقم؟ ─────────────────────────────────────────────────

function whyCalories(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  const lines: AnswerLine[] = []
  const targetCalories = ctx.calories?.target ?? 0
  if (targetCalories <= 0) {
    lines.push(line('cal.noTarget', { unknown: [bag.unknown('calorieTarget', 'nutrition.targets')] }))
    return lines
  }

  const target = bag.measured('calTarget', 'nutrition.targets', targetCalories)
  lines.push(line('cal.current', { params: { calories: bag.use(target) } }))

  const bmr = bag.measured('bmr', 'nutrition.targets', Math.round(ctx.targets.bmr))
  const tdee = bag.measured('tdee', 'nutrition.targets', Math.round(ctx.targets.tdee))
  const goal = bag.measured('goalType', 'onboarding.profile', ctx.profile.goalType)
  lines.push(line('cal.arithmetic', { params: { bmr: bag.use(bmr), tdee: bag.use(tdee), goal: bag.use(goal, 'goalType') } }))

  if (ctx.targetsMeta.manuallyEdited) {
    lines.push(line('cal.manual', { basis: [bag.measured('manualEdit', 'plan.customization', 'manual')] }))
  }
  if (ctx.targetsMeta.minorGoalMigratedAt) {
    const at = bag.measured('minorMigrated', 'plan.customization', ctx.targetsMeta.minorGoalMigratedAt.slice(0, 10))
    lines.push(line('cal.minorMigrated', { params: { date: bag.use(at) } }))
  }
  if (!ctx.targetsFresh) {
    lines.push(line('cal.staleProfile', { basis: [bag.measured('targetsStale', 'plan.customization', 'stale')] }))
  }

  if (ctx.latestLoggedWeightKg === null) {
    lines.push(line('cal.noLoggedWeight', { unknown: [bag.unknown('loggedWeight', 'progress.measurements')] }))
  } else if (Math.abs(ctx.latestLoggedWeightKg - ctx.profile.weightKg) >= 0.5) {
    const logged = bag.measured('loggedWeight', 'progress.measurements', ctx.latestLoggedWeightKg)
    const onFile = bag.measured('profileWeight', 'onboarding.profile', ctx.profile.weightKg)
    lines.push(line('cal.weightDrift', { params: { logged: bag.use(logged), profile: bag.use(onFile) } }))
  }

  if (ctx.targetsMeta.updatedAt) {
    const at = bag.measured('targetsUpdatedAt', 'plan.customization', ctx.targetsMeta.updatedAt.slice(0, 10))
    lines.push(line('cal.unchangedSince', { params: { date: bag.use(at) } }))
  } else {
    lines.push(line('cal.updatedUnknown', { unknown: [bag.unknown('targetsUpdatedAt', 'plan.customization')] }))
  }

  return lines
}

// ── ⑥ كيف تقدّمي؟ ───────────────────────────────────────────────────────────

function progressTrend(ctx: CoachContext, bag: FactBag): AnswerLine[] {
  const lines: AnswerLine[] = []
  const log = ctx.weightLog

  if (log.count === 0 && !ctx.load) {
    lines.push(
      line('progress.noData', {
        unknown: [bag.unknown('weightSeries', 'progress.measurements'), bag.unknown('trainingLoad', 'workout.history')],
      }),
    )
    lines.push(line('suggest.logWeight'))
    return lines
  }

  if (log.count === 0) {
    lines.push(line('progress.weightUnknown', { unknown: [bag.unknown('weightSeries', 'progress.measurements')] }))
    lines.push(line('suggest.logWeight'))
  } else if (log.count === 1 || log.spanDays === null) {
    const only = bag.measured('weightOnly', 'progress.measurements', log.lastKg as number)
    lines.push(line('progress.weightSingle', { params: { weight: bag.use(only) } }))
    lines.push(line('suggest.logWeight'))
  } else {
    const delta = Math.round(((log.lastKg as number) - (log.firstKg as number)) * 10) / 10
    const deltaId = bag.measured('weightDelta', 'progress.measurements', delta)
    const daysId = bag.measured('weightSpanDays', 'progress.measurements', log.spanDays)
    const pointsId = bag.measured('weightPoints', 'progress.measurements', log.count)
    lines.push(line('progress.weightDelta', { params: { delta: bag.use(deltaId), days: bag.use(daysId), points: bag.use(pointsId) } }))

    const gap = Math.round(((ctx.profile.targetWeightKg - (log.lastKg as number)) * 10)) / 10
    const targetId = bag.measured('targetWeight', 'onboarding.profile', ctx.profile.targetWeightKg)
    const gapId = bag.measured('weightGap', 'progress.measurements', gap)
    lines.push(line('progress.weightToTarget', { params: { target: bag.use(targetId), gap: bag.use(gapId) } }))
  }

  if (ctx.load) {
    const now7 = bag.measured('sessions7', 'workout.history', ctx.load.sessions7)
    const prior7 = bag.measured('sessionsPrior7', 'workout.history', ctx.load.sessionsPrior7)
    lines.push(line('progress.sessions', { params: { sessions: bag.use(now7), prior: bag.use(prior7) } }))
    const ratio = bag.inferred('loadRatio', 'workout.history', Math.round(ctx.load.ratio * 10) / 10)
    lines.push(line('progress.loadRatio', { params: { ratio: bag.use(ratio) } }))
  } else {
    lines.push(line('progress.loadUnknown', { unknown: [bag.unknown('trainingLoad', 'workout.history')] }))
  }

  lines.push(line('progress.notScale'))
  lines.push(line('suggest.keepLogging'))
  return lines
}

// ── قائمة القدرات — جواب المدخل غير المعروف ─────────────────────────────────

function capabilityList(): AnswerLine[] {
  return [
    line('capability.intro'),
    ...COACH_QUESTIONS.map((question) => line('capability.item', { question })),
    line('capability.noGuessing'),
  ]
}

// ── المدخل الوحيد ───────────────────────────────────────────────────────────

export interface CoachAnswerOptions {
  /** سبب طلب البديل — يشكّل بوّابة الأدوات في المحرّك الحقيقي. */
  subReason?: SubReason
}

/**
 * يبني الجواب المُسنَد. **لا يرمي**: التحقّق من الإسناد مسؤولية `render.ts`
 * (نقطة الرسم الوحيدة)، فيبقى المحرّك قابلًا للفحص حتى وهو مهاجَم.
 */
export function buildCoachAnswer(
  subject: CoachAnswerSubject,
  ctx: CoachContext,
  options: CoachAnswerOptions = {},
): CoachAnswer {
  const bag = new FactBag()
  let lines: AnswerLine[]
  switch (subject) {
    case 'todayPlan':
      lines = todayPlan(ctx, bag)
      break
    case 'whyThisExercise':
      lines = whyThisExercise(ctx, bag)
      break
    case 'missedYesterday':
      lines = missedYesterday(ctx, bag)
      break
    case 'canSubstitute':
      lines = canSubstitute(ctx, bag, options.subReason ?? 'busy')
      break
    case 'whyCaloriesChanged':
      lines = whyCalories(ctx, bag)
      break
    case 'progressTrend':
      lines = progressTrend(ctx, bag)
      break
    default:
      lines = capabilityList()
      break
  }
  return {
    subject,
    providerId: 'local-deterministic',
    disclosure: 'localData',
    lines,
    facts: bag.all(),
  }
}
