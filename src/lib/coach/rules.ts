// ═══════════════════════════════════════════════════════════════════════════
//  محرّك القواعد — [SOVEREIGN-003].
//
//  ═══ ما هذا وما ليس هو ═══
//  دوالّ **نقيّة حتمية**: سياق يدخل (`CoachContext`)، جواب مُسنَد يخرج
//  (`CoachAnswer`). لا شبكة، لا نموذج، لا عشوائية، لا وقت — نفس السياق يعطي
//  نفس الجواب حرفًا بحرف. وهذا هو الفرق الجوهري بين ما بُني هنا وبين «المدرب
//  الذكي» الذي يخرجه `docs/product/BACKLOG.md:32` من النطاق.
//
//  ═══ قاعدة البناء الوحيدة ═══
//  **لا سطر بلا حقيقة، ولا حقيقة بلا سطر.** كل استدعاء لـ`fact()` هنا يُستهلَك
//  فورًا في السطر الذي أنشأه — وحارس `provenance.ts` يُسقط الجواب لو نجا واحد
//  منهما بلا الآخر. فالسبيل الوحيد لعرض رقم هو أن يكون مقروءًا من مخزن المستخدم.
//
//  ═══ ما لا يفعله هذا المحرّك ═══
//  • **لا يكتب شيئًا.** لا يحلّ يومًا فائتًا ولا يبدّل تمرينًا ولا يعدّل هدفًا —
//    القرار للمستخدم، والمرشد يشرح الخيار ويدلّ على الشاشة التي تنفّذه.
//  • **لا يحسب نسبة التزام.** لها سلطة قائمة (`src/lib/insights/metrics.ts`)
//    بعتباتها وامتناعها تحت العتبة، وسلطتان لرقم واحد تعنيان رقمين مختلفين.
//  • **لا يخترع بديلًا عند الجهل.** المجهول يُقال «ما نعرف» بحقيقة `unknown`
//    قيمتها `null` بنيويًا — فلا يتسرّب صفرٌ في موضع «لا نعرف».
// ═══════════════════════════════════════════════════════════════════════════

import { findSubstitutes } from '@/lib/workoutSubstitution'
import type { PlanDecisionArea, PlanDriverKey } from '@/lib/planRationale'
import { topWeeklyMuscle, type CoachContext } from './context'
import {
  type AnswerLine,
  type CoachAnswer,
  type CoachEnumTable,
  type CoachFact,
  type CoachLineKey,
  type CoachQuestionId,
  type Certainty,
  type GroundingSourceId,
  type LineParam,
} from './types'

/** سبب البحث عن بديل حين يسأل المستخدم عمومًا — «مو متاح لي اليوم». */
const SUBSTITUTE_REASON = 'unavailable' as const
const SUBSTITUTE_LIMIT = 3
/** أقلّ فرق وزن يستحقّ أن يُقال — دونه ضجيج ميزان لا تغيّر. */
const WEIGHT_DRIFT_MIN_KG = 0.5

// ── دفتر البناء ─────────────────────────────────────────────────────────────

/**
 * دفتر يجمع الحقائق والسطور معًا. سبب وجوده أن الاقتران **لا يُترك للانتباه**:
 * `fact()` تُسجّل وتعيد المعرّف، فالسطر يذكره في نفس السطر البرمجي الذي أنشأه.
 */
class Draft {
  private readonly facts: CoachFact[] = []
  private readonly lines: AnswerLine[] = []

  fact(id: string, source: GroundingSourceId, certainty: Certainty, value: string | number | null): string {
    this.facts.push({ id, source, certainty, value })
    return id
  }

  /** حقيقة مجهولة — القيمة `null` إلزامًا، وهو ما يمنع تسرّب الصفر. */
  unknownFact(id: string, source: GroundingSourceId): string {
    return this.fact(id, source, 'unknown', null)
  }

  line(
    key: CoachLineKey,
    parts: {
      params?: Record<string, LineParam>
      basis?: readonly string[]
      unknown?: readonly string[]
      ref?: AnswerLine['ref']
    } = {},
  ): void {
    this.lines.push({ key, ...parts })
  }

  build(subject: CoachAnswer['subject']): CoachAnswer {
    return {
      subject,
      // المزوّد معلَن في البنية لا في نصّ تسويقي: محلّي حتمي، ولا فرع ثانٍ.
      providerId: 'local-deterministic',
      disclosure: 'localData',
      lines: this.lines,
      facts: this.facts,
    }
  }
}

const param = (value: string | number, factId: string, table?: CoachEnumTable): LineParam =>
  table ? { value, factId, enum: table } : { value, factId }

// ── قارئ التعليل ────────────────────────────────────────────────────────────

const decisionOutcome = (ctx: CoachContext, area: PlanDecisionArea): string | number | null =>
  ctx.rationale?.decisions.find((d) => d.area === area)?.outcome.value ?? null

const decisionDriver = (
  ctx: CoachContext,
  area: PlanDecisionArea,
  key: PlanDriverKey,
): string | number | null =>
  ctx.rationale?.decisions.find((d) => d.area === area)?.drivers.find((dr) => dr.key === key)?.value ?? null

// ── ١) خطة اليوم ────────────────────────────────────────────────────────────

function answerToday(ctx: CoachContext): CoachAnswer {
  const d = new Draft()

  if (!ctx.hasPlan) {
    d.line('today.noPlan', { basis: [d.fact('plan.state', 'plan.customization', 'measured', 'none')] })
    return d.build('todayPlan')
  }

  const kind = d.fact('today.kind', 'workout.daySource', 'measured', ctx.today.kind)
  if (ctx.today.kind === 'training') {
    d.line('today.training', {
      params: {
        day: param(ctx.today.dayName, d.fact('today.dayName', 'workout.daySource', 'measured', ctx.today.dayName)),
        exercises: param(
          ctx.today.exerciseCount,
          d.fact('today.exercises', 'workout.daySource', 'measured', ctx.today.exerciseCount),
        ),
        sets: param(ctx.today.setCount, d.fact('today.sets', 'workout.daySource', 'measured', ctx.today.setCount)),
      },
      basis: [kind],
    })
  } else {
    d.line('today.rest', { basis: [kind] })
    if (ctx.next) {
      d.line('today.restNext', {
        params: {
          days: param(ctx.next.inDays, d.fact('next.inDays', 'workout.daySource', 'measured', ctx.next.inDays)),
          day: param(ctx.next.dayName, d.fact('next.dayName', 'workout.daySource', 'measured', ctx.next.dayName)),
        },
      })
    } else {
      d.line('today.restNoNext', { basis: [kind] })
    }
  }

  // التعافي — تقدير محرّك من إجابات المستخدم نفسه، فيُقال بلغة متحفّظة.
  if (ctx.recovery) {
    d.line('today.recovery', {
      params: {
        suggestion: param(
          ctx.recovery.suggestion,
          d.fact('recovery.suggestion', 'recovery.engineLog', 'inferred', ctx.recovery.suggestion),
          'recoverySuggestion',
        ),
        confidence: param(
          ctx.recovery.confidence,
          d.fact('recovery.confidence', 'recovery.engineLog', 'inferred', ctx.recovery.confidence),
        ),
      },
    })
  } else {
    d.line('today.recoveryUnknown', { unknown: [d.unknownFact('recovery.today', 'recovery.engineLog')] })
  }

  if (ctx.calories) {
    const target = d.fact('nutrition.target', 'nutrition.targets', 'measured', ctx.calories.target)
    const consumed = d.fact('nutrition.consumed', 'nutrition.day', 'measured', ctx.calories.consumed)
    if (ctx.calories.remaining >= 0) {
      d.line('today.caloriesLeft', {
        params: {
          remaining: param(
            ctx.calories.remaining,
            d.fact('nutrition.remaining', 'nutrition.day', 'measured', ctx.calories.remaining),
          ),
          target: param(ctx.calories.target, target),
        },
        basis: [consumed],
      })
    } else {
      const over = -ctx.calories.remaining
      d.line('today.caloriesOver', {
        params: {
          over: param(over, d.fact('nutrition.over', 'nutrition.day', 'measured', over)),
          target: param(ctx.calories.target, target),
        },
        basis: [consumed],
      })
    }
  } else {
    d.line('today.caloriesUnknown', { unknown: [d.unknownFact('nutrition.target', 'nutrition.targets')] })
  }

  return d.build('todayPlan')
}

// ── ٢) ليش هذا التمرين ──────────────────────────────────────────────────────

function answerWhy(ctx: CoachContext): CoachAnswer {
  const d = new Draft()

  if (!ctx.hasPlan) {
    d.line('why.noPlan', { basis: [d.fact('plan.state', 'plan.customization', 'measured', 'none')] })
    return d.build('whyThisExercise')
  }
  if (!ctx.rationale) {
    // خطة موجودة وتعليلها غير متاح — يُقال جهلًا صريحًا لا يُملأ بتخمين.
    d.line('why.noPlan', { unknown: [d.unknownFact('plan.rationale.state', 'plan.rationale')] })
    return d.build('whyThisExercise')
  }

  if (ctx.today.kind === 'training') {
    d.line('why.todayDay', {
      params: {
        day: param(ctx.today.dayName, d.fact('why.dayName', 'workout.daySource', 'measured', ctx.today.dayName)),
      },
    })
  }

  d.line('why.trainingDays', {
    params: {
      days: param(
        ctx.trainingDaysTarget,
        d.fact('why.trainingDays', 'onboarding.profile', 'measured', ctx.trainingDaysTarget),
      ),
    },
  })

  const sessionSize = decisionOutcome(ctx, 'sessionSize')
  if (typeof sessionSize === 'number') {
    d.line('why.sessionSize', {
      params: { exercises: param(sessionSize, d.fact('why.sessionSize', 'plan.rationale', 'measured', sessionSize)) },
    })
  }

  const experience = decisionDriver(ctx, 'startingLoad', 'experience')
  if (typeof experience === 'string') {
    d.line('why.experienceLoad', {
      params: {
        level: param(experience, d.fact('why.experience', 'plan.rationale', 'measured', experience), 'experienceLevel'),
      },
    })
  }

  const gymAccess = decisionDriver(ctx, 'equipmentPool', 'gymAccess')
  if (typeof gymAccess === 'string') {
    d.line('why.equipmentPool', {
      params: {
        access: param(gymAccess, d.fact('why.gymAccess', 'plan.rationale', 'measured', gymAccess), 'gymAccess'),
      },
    })
  }

  const injuryState = ctx.injury.declared ? (ctx.injury.areas.join('+') || 'declared') : 'none'
  const injuryFact = d.fact('why.injury', 'onboarding.profile', 'measured', injuryState)
  d.line(ctx.injury.declared ? 'why.injuryFilterApplied' : 'why.injuryFilterNone', { basis: [injuryFact] })

  const top = topWeeklyMuscle(ctx)
  if (top) {
    d.line('why.volumeTop', {
      params: {
        muscle: param(top.muscle, d.fact('why.topMuscle', 'plan.rationale', 'measured', top.muscle), 'muscle'),
        sets: param(top.sets, d.fact('why.topSets', 'plan.rationale', 'measured', top.sets)),
      },
    })
  }

  // محاور معلنة **غير مفعَّلة** — تُقال ولا تُدّعى (§5). سكوتها هو الادّعاء.
  for (const axis of ctx.rationale.inactiveAxes) {
    d.line('why.inactiveAxis', {
      params: {
        axis: param(axis.axis, d.fact(`why.axis.${axis.axis}`, 'plan.rationale', 'measured', axis.axis), 'planAxis'),
      },
    })
  }

  return d.build('whyThisExercise')
}

// ── ٣) فاتني أمس ────────────────────────────────────────────────────────────

function answerMissed(ctx: CoachContext): CoachAnswer {
  const d = new Draft()
  const scheduleState = d.fact('schedule.state', 'workout.calendar', 'measured', ctx.hasSchedule ? 'set' : 'none')

  if (!ctx.hasSchedule) {
    d.line('missed.noSchedule', { basis: [scheduleState] })
    return d.build('missedYesterday')
  }

  if (!ctx.missed) {
    d.line('missed.none', { basis: [scheduleState, d.fact('history.checked', 'workout.history', 'measured', 'scanned')] })
    return d.build('missedYesterday')
  }

  const dateFact = d.fact('missed.date', 'workout.calendar', 'measured', ctx.missed.date)
  const params: Record<string, LineParam> = { date: param(ctx.missed.date, dateFact) }
  if (ctx.missedDayName) {
    params.day = param(
      ctx.missedDayName,
      d.fact('missed.dayName', 'workout.calendar', 'measured', ctx.missedDayName),
    )
  }
  d.line('missed.found', { params })
  // القاعدة D: المرشد لا يحلّ اليوم الفائت بنفسه — يعرض أن القرار للمستخدم.
  d.line('missed.yoursToDecide', { basis: [dateFact] })

  if (ctx.next) {
    d.line('missed.next', {
      params: {
        days: param(ctx.next.inDays, d.fact('next.inDays', 'workout.daySource', 'measured', ctx.next.inDays)),
        day: param(ctx.next.dayName, d.fact('next.dayName', 'workout.daySource', 'measured', ctx.next.dayName)),
      },
    })
  } else {
    d.line('missed.nextNone', { basis: [scheduleState] })
  }

  return d.build('missedYesterday')
}

// ── ٤) أقدر أبدّله؟ ─────────────────────────────────────────────────────────

function answerSubstitute(ctx: CoachContext): CoachAnswer {
  const d = new Draft()
  const subject = ctx.subjectExercise

  if (!subject) {
    d.line('sub.noExercise', { unknown: [d.unknownFact('sub.subject', 'workout.daySource')] })
    return d.build('canSubstitute')
  }

  const subjectFact = d.fact('sub.subject', 'workout.daySource', 'measured', subject.name)
  const whenFact = d.fact('sub.from', 'workout.daySource', 'measured', subject.from)
  d.line('sub.intro', {
    params: { exercise: param(subject.name, subjectFact), when: param(subject.from, whenFact) },
  })

  const options = findSubstitutes(subject.id, ctx.profile, SUBSTITUTE_REASON, SUBSTITUTE_LIMIT)
  if (!options.length) {
    d.line('sub.noneFound', { basis: [subjectFact] })
  }
  options.forEach((opt, i) => {
    const name = ctx.lang === 'en' ? opt.nameEn : opt.nameAr
    d.line('sub.option', {
      params: {
        name: param(name, d.fact(`sub.opt.${i}.name`, 'substitution.engine', 'measured', name)),
      },
      ref: {
        kind: 'exercise',
        id: opt.exerciseId,
        factId: d.fact(`sub.opt.${i}.id`, 'substitution.engine', 'measured', opt.exerciseId),
      },
    })
  })

  // المرشِّح مطبَّق داخل المحرّك — نقولها لأن الغياب الصامت يبدو «ما فيه بدائل».
  if (ctx.injury.declared) {
    d.line('sub.injuryWithheld', {
      params: {
        exercise: param(subject.name, subjectFact),
      },
      basis: [d.fact('sub.injury', 'onboarding.profile', 'measured', ctx.injury.areas.join('+') || 'declared')],
    })
  }
  // المرشد يقرأ ولا يكتب: التبديل نفسه يقع في شاشة التمرين لا هنا.
  d.line('sub.useWorkoutSheet', { basis: [subjectFact] })
  d.line('sub.notMedical', { basis: [subjectFact] })

  return d.build('canSubstitute')
}

// ── ٥) ليش تغيّرت سعراتي ────────────────────────────────────────────────────

function answerCalories(ctx: CoachContext): CoachAnswer {
  const d = new Draft()
  const target = ctx.targets.targetCalories

  if (!(target > 0)) {
    d.line('cal.noTarget', { unknown: [d.unknownFact('targets.state', 'plan.customization')] })
    return d.build('whyCaloriesChanged')
  }

  const targetFact = d.fact('cal.target', 'plan.customization', 'measured', target)
  d.line('cal.current', { params: { calories: param(target, targetFact) } })

  // المعادلة تقدير لا قياس — الحقيقتان `inferred` والسطر متحفّظ إلزامًا (§6/٢).
  if (ctx.targets.bmr > 0 && ctx.targets.tdee > 0) {
    d.line('cal.arithmetic', {
      params: {
        bmr: param(ctx.targets.bmr, d.fact('cal.bmr', 'plan.customization', 'inferred', ctx.targets.bmr)),
        tdee: param(ctx.targets.tdee, d.fact('cal.tdee', 'plan.customization', 'inferred', ctx.targets.tdee)),
        calories: param(target, targetFact),
      },
    })
  }

  if (ctx.targetsMeta.manuallyEdited) {
    d.line('cal.manual', { basis: [d.fact('cal.manual', 'plan.customization', 'measured', 'true')] })
  }

  const migratedAt = ctx.targetsMeta.minorGoalMigratedAt
  if (migratedAt) {
    d.line('cal.minorMigrated', {
      params: { date: param(migratedAt, d.fact('cal.minorMigratedAt', 'plan.customization', 'measured', migratedAt)) },
    })
  }

  if (!ctx.targetsFresh) {
    d.line('cal.staleProfile', { basis: [d.fact('cal.stale', 'plan.customization', 'measured', 'stale')] })
  }

  if (ctx.latestLoggedWeightKg === null) {
    d.line('cal.noLoggedWeight', { unknown: [d.unknownFact('cal.loggedWeight', 'progress.measurements')] })
  } else {
    const drift = Math.round((ctx.latestLoggedWeightKg - ctx.profile.weightKg) * 10) / 10
    if (Math.abs(drift) >= WEIGHT_DRIFT_MIN_KG) {
      d.line('cal.weightDrift', {
        params: {
          logged: param(
            ctx.latestLoggedWeightKg,
            d.fact('cal.loggedWeight', 'progress.measurements', 'measured', ctx.latestLoggedWeightKg),
          ),
          profile: param(
            ctx.profile.weightKg,
            d.fact('cal.profileWeight', 'onboarding.profile', 'measured', ctx.profile.weightKg),
          ),
          drift: param(drift, d.fact('cal.drift', 'progress.measurements', 'inferred', drift)),
        },
      })
    }
  }

  const updatedAt = ctx.targetsMeta.updatedAt
  if (updatedAt) {
    d.line('cal.unchangedSince', {
      params: { date: param(updatedAt, d.fact('cal.updatedAt', 'plan.customization', 'measured', updatedAt)) },
    })
  } else {
    d.line('cal.updatedUnknown', { unknown: [d.unknownFact('cal.updatedAt', 'plan.customization')] })
  }

  return d.build('whyCaloriesChanged')
}

// ── قائمة القدرات ───────────────────────────────────────────────────────────

/**
 * ما يقدر عليه المرشد **صراحةً**، وحدّه صراحةً. تُعرض حالةً أولى وحين لا يُطابَق
 * سؤال معروف — بدل نثرٍ واثق من لا شيء. لا حقائق هنا عمدًا: هذه قدرات التطبيق
 * لا حالة المستخدم، وخلطهما هو أصل الادّعاء.
 */
export function capabilityAnswer(): CoachAnswer {
  const d = new Draft()
  d.line('capability.intro')
  d.line('capability.noGuessing')
  return d.build('unrecognised')
}

// ── المدخل ──────────────────────────────────────────────────────────────────

const BUILDERS: Readonly<Record<CoachQuestionId, (ctx: CoachContext) => CoachAnswer>> = {
  todayPlan: answerToday,
  whyThisExercise: answerWhy,
  missedYesterday: answerMissed,
  canSubstitute: answerSubstitute,
  whyCaloriesChanged: answerCalories,
}

/** يبني جواب سؤال واحد. حتمي: نفس السياق ⇒ نفس الجواب. */
export function buildAnswer(question: CoachQuestionId, ctx: CoachContext): CoachAnswer {
  return BUILDERS[question](ctx)
}
