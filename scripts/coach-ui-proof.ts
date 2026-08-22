// ═══════════════════════════════════════════════════════════════════════════
//  إثبات شاشة المرشد — [SOVEREIGN-COACH-002].
//
//  ═══ ما يقيسه ═══
//  ① **الإسناد على المخرَج النهائي**: كل سؤال × كل شخصية يمرّ من
//     `renderCoachAnswer` — أي من حارس الإسناد نفسه الذي تمرّ منه الشاشة. ولا
//     يُقاس المحرّك وحده: المقياس هو ما يصل العين.
//  ② **الجهل يُقال ولا يُملأ**: شخصية بلا خطة ولا هدف ولا قياس ⇒ لا رقم واحد
//     في السطور، وكل حقيقة مجهولة قيمتها `null`.
//  ③ **مصاب الركبة لا يُعرَض عليه سكوات ثانٍ**: المسار كاملًا من السياق إلى
//     `findSubstitutes` الحقيقي — ومعه **ضابط** يثبت أن المرشّح يعمل لا أن
//     القائمة فارغة أصلًا (§4.2).
//  ④ **لا مفردة طبية** في القاموس كلّه، **ولا رقم في قالب نصّ** (فكل رقم على
//     الشاشة وسيطٌ مُسنَد بالضرورة).
//  ⑤ **مزوّد غائب ⇒ إفصاح محلّي**: لا نصّ مكتوب بيد، بل المزوّد المحسوم.
//  ⑥ **الواجهة نفسها**: لا نصّ صلب فيها · لا تُستورد ساكنًا فتثقل حزمة الإقلاع ·
//     أهداف لمس ٤٤ · تسمية للحقل · Escape · منطقة حيّة لقارئ الشاشة.
//
//  ═══ التأكيدات المضادّة (§4.2 — لا إحكام لم يُهاجَم) ═══
//  حقنُ رقم مختلَق · حقنُ حقيقة يتيمة · حقنُ وسيط بلا حقيقة · حقنُ مفردة طبية ·
//  حقنُ رقم في قالب · حقنُ استيراد ساكن للشاشة · حقنُ نصّ عربي صلب · حقنُ هدف
//  لمس صغير. **كلٌّ يسقط بفحصٍ مسمّى** — لا بـ`TypeError` عابر.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { coachStrings } from '@/i18n/dict/coach'
import {
  COACH_LINE_KEYS,
  COACH_LINE_KIND,
  COACH_QUESTIONS,
  CoachProvenanceError,
  CoachProviderUnavailableError,
  EXTERNAL_PROVIDER_WIRED,
  GROUNDING_SOURCES,
  buildCoachAnswer,
  buildCoachContext,
  externalModelProvider,
  findMedicalClaims,
  findPlanChangeClaims,
  matchCoachQuestion,
  readCoachEnvironment,
  renderCoachAnswer,
  resolveCoachProvider,
  scanCoachCopy,
  verifyAnswerProvenance,
  type CoachAnswer,
  type CoachAnswerSubject,
  type CoachEnvironment,
  type CoachLineKey,
  type RenderedAnswer,
} from '@/lib/coach'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'
import { makeProfileInjuryFilter } from '@/lib/injurySafety'
import { findSubstitutes } from '@/lib/workoutSubstitution'
import { suggestedSchedule } from '@/lib/workoutCalendar'
import { RULES_VERSION, evaluateRecovery } from '@/lib/recoveryEngine'
import type { PlanDay } from '@/types/workout'
import type { MeasurementLog } from '@/types/progress'
import type { WorkoutSession } from '@/lib/workoutSessions'

let pass = 0
let fail = 0
const failures: string[] = []
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
  } else {
    fail++
    failures.push(label)
    console.log(`✗ ${label}`)
  }
}

const ROOT = process.cwd()
const NOW = new Date('2026-08-18T09:00:00.000Z')
const LANGS: readonly Lang[] = ['ar', 'en']
/** كل ما يجيبه المرشد: الأسئلة الستة + المدخل غير المعروف. */
const SUBJECTS: readonly CoachAnswerSubject[] = [...COACH_QUESTIONS, 'unrecognised']
/** مُنسّق هويّة — الأرقام تبقى لاتينية داخل الإثبات كي تُقارَن بقيم الحقائق حرفيًا. */
const RAW_FMT = (value: number): string => String(value)

// ════════════════════════════════════════════════════════════════════════════
//  الشخصيات — بيئة حقيقية من المخازن، ثم تعديل مسمّى فوقها
// ════════════════════════════════════════════════════════════════════════════

const freshEnv = (lang: Lang = 'ar'): CoachEnvironment => readCoachEnvironment(null, lang, NOW)

const SQUAT_ID = 'barbell-back-squat'

function squatDay(): PlanDay {
  return {
    id: 'proof-legs',
    nameAr: 'أرجل',
    nameEn: 'Legs',
    exercises: [
      { id: 'pe-1', exerciseId: SQUAT_ID, sets: 3, reps: '8-10', restSec: 120, order: 0 },
    ],
  }
}

/** ① الافتراضي: ما يراه ضيف أكمل الإعداد على جهاز نظيف. */
function personaDefault(lang: Lang): CoachEnvironment {
  return freshEnv(lang)
}

/** ② الفارغ: لا خطة، لا هدف سعرات، لا جدول، لا قياس، لا جلسة، لا تعافٍ. */
function personaEmpty(lang: Lang): CoachEnvironment {
  const env = freshEnv(lang)
  env.plan = { templateId: 'none', days: [] }
  env.today = undefined
  env.next = undefined
  env.schedule = null
  env.sessions = []
  env.measurements = []
  env.recoveryToday = null
  env.rationale = null
  env.customization.nutritionPlan = { ...env.customization.nutritionPlan, enabled: false, targetCalories: 0 }
  return env
}

/** ③ مصاب الركبة، وأمامه سكوات بالضبط. */
function personaKnee(lang: Lang): CoachEnvironment {
  const env = freshEnv(lang)
  env.customization.profile = { ...env.customization.profile, injuryAreas: ['knee'] }
  env.today = { type: 'training', source: 'schedule', planDayIndex: 0, day: squatDay() }
  return env
}

/** ④ الضابط: نفس الشخصية بلا إصابة — يثبت أن المرشّح يعمل لا أن القائمة فارغة. */
function personaKneeControl(lang: Lang): CoachEnvironment {
  const env = freshEnv(lang)
  env.customization.profile = { ...env.customization.profile, injuryAreas: [] }
  env.today = { type: 'training', source: 'schedule', planDayIndex: 0, day: squatDay() }
  return env
}

/** ⑤ الغنيّ: قياسات وجلسات وجدول وتعافٍ مسجّل — كل المسارات المقيسة تعمل. */
function personaRich(lang: Lang): CoachEnvironment {
  const env = freshEnv(lang)
  const measurements: MeasurementLog[] = [
    { id: 'm1', date: '2026-06-20', values: { weightKg: '88.4' } },
    { id: 'm2', date: '2026-07-20', values: { weightKg: '86.9' } },
    { id: 'm3', date: '2026-08-16', values: { weightKg: '85.2' } },
  ]
  const session = (id: string, date: string): WorkoutSession => ({
    id,
    date,
    startedAt: `${date}T17:00:00.000Z`,
    finishedAt: `${date}T18:00:00.000Z`,
    workoutDayId: 'proof-legs',
    workoutDayName: 'legs',
    status: 'completed',
    exercises: [
      {
        exerciseId: SQUAT_ID,
        targetSets: 2,
        targetReps: '8-10',
        targetRestSec: 120,
        completed: true,
        sets: [
          { setNumber: 1, targetReps: '8-10', actualReps: '8', weightKg: '80', completed: true },
          { setNumber: 2, targetReps: '8-10', actualReps: '8', weightKg: '80', completed: true },
        ],
      },
    ],
  })
  env.measurements = measurements
  env.sessions = [
    session('s1', '2026-08-17'),
    session('s2', '2026-08-15'),
    session('s3', '2026-08-13'),
    session('s4', '2026-08-09'),
    session('s5', '2026-08-07'),
  ]
  env.schedule = suggestedSchedule(env.plan, env.customization.profile.trainingDays)
  // **لا كتابة هنا.** `saveRecoveryEngineEntry` فعل مدفوع محروس (`recovery.log`)
  // ويرمي `PaidActionDenied` بحقّ — والإثبات لا يُضعِف حارسًا ليمرّ. فالمُدخَل
  // يُقيَّم بالمحرّك النقيّ نفسه، ويُركَّب السجلّ فوق تقييمه الحقيقي.
  const input = { sleepQuality: 'poor' as const, energy: 'low' as const, soreness: { general: 'severe' as const } }
  const evaluation = evaluateRecovery(input)
  env.recoveryToday = {
    date: '2026-08-18',
    rulesVersion: RULES_VERSION,
    input,
    suggestion: evaluation.suggestion,
    confidence: evaluation.confidence,
    score: evaluation.score,
    reasons: evaluation.reasons,
    flags: evaluation.flags,
  }
  return env
}

const PERSONAS: ReadonlyArray<{ name: string; make: (lang: Lang) => CoachEnvironment }> = [
  { name: 'افتراضي', make: personaDefault },
  { name: 'فارغ', make: personaEmpty },
  { name: 'مصاب ركبة', make: personaKnee },
  { name: 'ضابط بلا إصابة', make: personaKneeControl },
  { name: 'غنيّ بالبيانات', make: personaRich },
]

const answerFor = (subject: CoachAnswerSubject, env: CoachEnvironment): CoachAnswer =>
  buildCoachAnswer(subject, buildCoachContext(env, NOW))

const renderFor = (subject: CoachAnswerSubject, env: CoachEnvironment, lang: Lang): RenderedAnswer =>
  renderCoachAnswer(answerFor(subject, env), coachStrings[lang], lang, RAW_FMT)

const hasLine = (answer: CoachAnswer, key: CoachLineKey): boolean => answer.lines.some((l) => l.key === key)

console.log('═══ إثبات شاشة المرشد [SOVEREIGN-COACH-002] ═══\n')

// ════════════════════════════════════════════════════════════════════════════
//  ① كل ادّعاء يصل الشاشة مُسنَد — على المخرَج المرسوم لا على الدالة
// ════════════════════════════════════════════════════════════════════════════

let renderedLineCount = 0
for (const persona of PERSONAS) {
  for (const lang of LANGS) {
    for (const subject of SUBJECTS) {
      const env = persona.make(lang)
      const answer = answerFor(subject, env)
      const violations = verifyAnswerProvenance(answer)
      check(
        `[${persona.name}/${lang}/${subject}] الإسناد سليم (${violations.map((v) => v.code).join(',') || 'صفر مخالفة'})`,
        violations.length === 0,
      )
      // مصدر كل حقيقة مسجَّل بالاسم في `GROUNDING_SOURCES` — لا مصدر مخترَع.
      check(
        `[${persona.name}/${lang}/${subject}] كل حقيقة لها مصدر مسمّى`,
        answer.facts.every((f) => Object.prototype.hasOwnProperty.call(GROUNDING_SOURCES, f.source)),
      )
      let rendered: RenderedAnswer | null = null
      try {
        rendered = renderCoachAnswer(answer, coachStrings[lang], lang, RAW_FMT)
      } catch (err) {
        check(`[${persona.name}/${lang}/${subject}] الرسم لا يرمي: ${String(err)}`, false)
      }
      if (!rendered) continue
      renderedLineCount += rendered.lines.length
      check(`[${persona.name}/${lang}/${subject}] الجواب ليس فارغًا`, rendered.lines.length > 0)
      // لا سطر بنصّ فارغ ولا مفتاح خام تسرّب مكان نصّه.
      check(
        `[${persona.name}/${lang}/${subject}] لا سطر بلا نصّ`,
        rendered.lines.every((l) => l.text.trim().length > 0 && !l.text.includes('{')),
      )
      // كل سطر يعرض رقمًا **يحمل مصدرًا** — الرقم بلا مصدر تحته ادّعاء بلا سند.
      for (const line of rendered.lines) {
        if (!/\d/.test(line.text)) continue
        check(
          `[${persona.name}/${lang}/${subject}] السطر الرقمي ${line.key} يحمل مصدرًا`,
          line.sources.length > 0,
        )
      }
      // نوع كل سطر مطابق للجدول البنيوي — الفصل الذي ترسمه الواجهة.
      check(
        `[${persona.name}/${lang}/${subject}] نوع كل سطر مطابق للجدول`,
        rendered.lines.every((l) => l.kind === COACH_LINE_KIND[l.key]),
      )
    }
  }
}
check(`سطور مرسومة عبر كل الشخصيات (${renderedLineCount} سطرًا)`, renderedLineCount > 200)

// كل قيمة معروضة تطابق حقيقتها حرفيًا — على شخصية غنيّة يظهر فيها أكثر رقم.
{
  const env = personaRich('ar')
  let paramCount = 0
  for (const subject of SUBJECTS) {
    const answer = answerFor(subject, env)
    const byId = new Map(answer.facts.map((f) => [f.id, f]))
    for (const line of answer.lines) {
      for (const param of Object.values(line.params ?? {})) {
        paramCount++
        const fact = byId.get(param.factId)
        check(
          `وسيط ${line.key} يطابق حقيقته`,
          fact !== undefined && fact.value !== null && String(param.value) === String(fact.value),
        )
      }
    }
  }
  check(`عدد الوسائط المفحوصة (${paramCount})`, paramCount >= 20)
}

// ════════════════════════════════════════════════════════════════════════════
//  ② الجهل يُقال — ولا يُملأ برقم
// ════════════════════════════════════════════════════════════════════════════

for (const lang of LANGS) {
  const env = personaEmpty(lang)
  const today = answerFor('todayPlan', env)
  check(`[فارغ/${lang}] «ما عندك خطة» تُقال صراحة`, hasLine(today, 'today.noPlan'))
  check(`[فارغ/${lang}] «ما فيه هدف سعرات» تُقال صراحة`, hasLine(today, 'today.caloriesUnknown'))

  const progress = answerFor('progressTrend', env)
  check(`[فارغ/${lang}] «ما فيه شي أقيس عليه» تُقال صراحة`, hasLine(progress, 'progress.noData'))

  const missed = answerFor('missedYesterday', env)
  check(`[فارغ/${lang}] «ما فيه جدول» تُقال صراحة`, hasLine(missed, 'missed.noSchedule'))

  const calories = answerFor('whyCaloriesChanged', env)
  check(`[فارغ/${lang}] «ما فيه هدف محفوظ» تُقال صراحة`, hasLine(calories, 'cal.noTarget'))

  for (const subject of SUBJECTS) {
    const answer = answerFor(subject, env)
    check(
      `[فارغ/${lang}/${subject}] كل حقيقة مجهولة قيمتها null`,
      answer.facts.filter((f) => f.certainty === 'unknown').every((f) => f.value === null),
    )
    const rendered = renderCoachAnswer(answer, coachStrings[lang], lang, RAW_FMT)
    // الشخصية الفارغة لا تملك رقمًا واحدًا صادقًا ⇒ **لا رقم على الشاشة**.
    const numeric = rendered.lines.filter((l) => /\d/.test(l.text)).map((l) => l.key)
    check(`[فارغ/${lang}/${subject}] لا رقم مختلَق على الشاشة (${numeric.join(',') || 'صفر'})`, numeric.length === 0)
  }
  // والمجهول يُعرض مع مصدره كي يعرف المستخدم أين يسدّه.
  const unknownSources = renderCoachAnswer(answerFor('progressTrend', env), coachStrings[lang], lang, RAW_FMT)
    .lines.flatMap((l) => l.unknownSources)
  check(`[فارغ/${lang}] المجهول يُعرض بمصدره (${unknownSources.length})`, unknownSources.length >= 2)
}

// ════════════════════════════════════════════════════════════════════════════
//  ③ مصاب الركبة: لا سكوات بديل — من طرف إلى طرف
// ════════════════════════════════════════════════════════════════════════════

{
  const env = personaKnee('ar')
  const ctx = buildCoachContext(env, NOW)
  check('[ركبة] موضوع السؤال هو السكوات نفسه', ctx.subjectExercise?.id === SQUAT_ID)
  check('[ركبة] الإصابة مُعلَنة في السياق', ctx.injury.declared && ctx.injury.areas.includes('knee'))

  const answer = buildCoachAnswer('canSubstitute', ctx)
  const optionIds = answer.lines.filter((l) => l.key === 'sub.option').map((l) => l.ref?.id ?? '')
  const injuryOk = makeProfileInjuryFilter(ctx.profile)

  // (أ) لا بديل يحمّل الركبة — الفحص على التمرين الحقيقي من الكتالوج.
  for (const id of optionIds) {
    const ex = getExercise(id)
    check(`[ركبة] البديل «${id}» موجود في الكتالوج`, ex !== undefined)
    if (ex) check(`[ركبة] البديل «${id}» آمن على الركبة`, injuryOk(ex))
  }
  const kneeLoads = new Set(['deep_knee_flexion', 'knee_shear'])
  check(
    '[ركبة] ولا بديل واحد يحمل حِملًا ممنوعًا على الركبة',
    optionIds.every((id) => (getExercise(id)?.jointLoads ?? []).every((load) => !kneeLoads.has(load))),
  )
  check('[ركبة] ولا بديل هو سكوات آخر', optionIds.every((id) => !/squat/i.test(id)))

  // (ب) **المحرّك الحقيقي هو من أجاب** — لا ترشيح ثانٍ مكتوب في طبقة المرشد.
  const engineIds = findSubstitutes(SQUAT_ID, ctx.profile, 'busy', 4).map((o) => o.exerciseId)
  check(
    `[ركبة] قائمة المرشد = قائمة findSubstitutes حرفيًا (${engineIds.length})`,
    optionIds.length === engineIds.length && optionIds.every((id, i) => id === engineIds[i]),
  )

  // (ج) حين لا بديل آمن: يُقال «ما فيه» صراحة، ويُعلَن أن المرشّح طُبِّق.
  if (optionIds.length === 0) {
    check('[ركبة] «ما فيه بديل آمن» تُقال صراحة', hasLine(answer, 'sub.injuryWithheld'))
  }
  check('[ركبة] تطبيق مرشّح الإصابات مُعلَن', hasLine(answer, 'why.injuryFilterApplied'))
  check('[ركبة] التنفيذ يبقى في ورقة التمرين لا في المرشد', hasLine(answer, 'sub.useWorkoutSheet'))

  // (د) الضابط — ليس فراغًا: بلا إصابة تُعرض بدائل، وفيها ما يُمنع على الركبة.
  const controlCtx = buildCoachContext(personaKneeControl('ar'), NOW)
  const controlIds = buildCoachAnswer('canSubstitute', controlCtx)
    .lines.filter((l) => l.key === 'sub.option')
    .map((l) => l.ref?.id ?? '')
  check(`[ضابط] بلا إصابة تُعرض بدائل فعلًا (${controlIds.length})`, controlIds.length > 0)
  check(
    '[ضابط] وفيها بديل يحمّل الركبة — فالمرشّح يعمل، والقائمة ليست فارغة أصلًا',
    controlIds.some((id) => (getExercise(id)?.jointLoads ?? []).some((load) => kneeLoads.has(load))),
  )
  check('[ضابط] وغياب الإصابة يُعلَن كذلك', hasLine(buildCoachAnswer('canSubstitute', controlCtx), 'why.injuryFilterNone'))

  console.log(
    `    ↳ سكوات + ركبة مصابة ⇒ ${optionIds.length} بديلًا [${optionIds.join(' ') || '—'}] · ` +
      `بلا إصابة ⇒ ${controlIds.length} بديلًا [${controlIds.join(' ')}]`,
  )
  console.log(`    ↳ سطور جواب المصاب: ${answer.lines.map((l) => l.key).join(' · ')}`)
}

// ════════════════════════════════════════════════════════════════════════════
//  ④ المدخل غير المعروف ⇒ قائمة قدرات، لا تخمين
// ════════════════════════════════════════════════════════════════════════════

{
  const outOfScope = [
    'كم سعر الاشتراك؟',
    'هل عندي نقص فيتامين؟',
    'what should I eat at my cousins wedding',
    'اكتب لي قصيدة',
    '',
    '؟؟؟',
  ]
  for (const raw of outOfScope) {
    check(`«${raw || '(فارغ)'}» لا يطابق أي سؤال`, matchCoachQuestion(raw) === null)
  }
  // والمعروف يُطابَق — وإلا لكان «لا يطابق» صحيحًا لأن المطابِق ميّت (§4.2).
  const known: Array<[string, string]> = [
    ['وش أسوي اليوم؟', 'todayPlan'],
    ['ليش سعراتي هذا الرقم', 'whyCaloriesChanged'],
    ['أقدر أبدل هذا التمرين؟', 'canSubstitute'],
    ['فاتني أمس وش أسوي', 'missedYesterday'],
    ['كيف تقدمي؟', 'progressTrend'],
    ['why did you pick this exercise', 'whyThisExercise'],
  ]
  for (const [raw, expected] of known) {
    const got = matchCoachQuestion(raw)
    check(`«${raw}» ⇒ ${expected} (جاء: ${got ?? 'null'})`, got === expected)
  }

  for (const lang of LANGS) {
    const rendered = renderFor('unrecognised', personaDefault(lang), lang)
    const keys = rendered.lines.map((l) => l.key)
    check(`[${lang}] المدخل غير المعروف يبدأ بإقرار عدم الفهم`, keys[0] === 'capability.intro')
    check(
      `[${lang}] ويعدّد الأسئلة الستة كلها`,
      keys.filter((k) => k === 'capability.item').length === COACH_QUESTIONS.length,
    )
    check(`[${lang}] وينتهي بـ«ما راح أخترع لك جواب»`, keys[keys.length - 1] === 'capability.noGuessing')
    check(
      `[${lang}] وكل سؤال معروض بنصّه من القاموس`,
      COACH_QUESTIONS.every((q) => rendered.lines.some((l) => l.text === coachStrings[lang].questions[q])),
    )
    check(`[${lang}] قائمة القدرات بلا حقائق أصلًا`, answerFor('unrecognised', personaDefault(lang)).facts.length === 0)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  ⑤ لا مزوّد خارجي ⇒ الإفصاح محلّي، معلَنًا لا مفترَضًا
// ════════════════════════════════════════════════════════════════════════════

{
  check('المزوّد الخارجي غير موصول (ثابت بناء)', EXTERNAL_PROVIDER_WIRED === false)
  check('وغير مُعَدّ', externalModelProvider.isConfigured() === false)
  let named = false
  try {
    externalModelProvider.answer('todayPlan', buildCoachContext(personaDefault('ar'), NOW))
  } catch (err) {
    named = err instanceof CoachProviderUnavailableError && err.code === 'not-configured'
  }
  check('ونداؤه يرمي CoachProviderUnavailableError[not-configured] باسمه', named)

  const resolved = resolveCoachProvider()
  check('المزوّد المحسوم هو المحلّي الحتمي', resolved.id === 'local-deterministic')
  check('وإفصاحه «من بيانات المستخدم»', resolved.disclosure === 'localData')

  for (const lang of LANGS) {
    const rendered = renderFor('todayPlan', personaDefault(lang), lang)
    check(`[${lang}] الجواب يعلن أنه محلّي`, rendered.disclosure === coachStrings[lang].disclosureLocal)
    check(`[${lang}] ومزوّده المحلّي`, rendered.providerId === 'local-deterministic')
    const text = coachStrings[lang].disclosureLocal.toLowerCase()
    check(
      `[${lang}] ونصّ الإفصاح ينفي النموذج اللغوي صراحة`,
      lang === 'ar' ? text.includes('ما فيه نموذج لغوي') : text.includes('no language model'),
    )
    const memory = coachStrings[lang].noMemoryNote.toLowerCase()
    check(
      `[${lang}] ونصّ «لا ذاكرة ولا تعلّم» موجود`,
      lang === 'ar' ? memory.includes('ما أحفظ') && memory.includes('ولا أتعلّم') : memory.includes("don't keep") && memory.includes("don't learn"),
    )
  }

  // المسار الافتراضي للأرقام (`formatNumber` بسياسة الأرقام الموحّدة) يعمل في
  // اللغتين. الإثبات يقيس بمنسّق هويّة كي يقارن حرفيًا؛ وهذا يقيس ما يراه المستخدم.
  for (const lang of LANGS) {
    let ok = true
    let sample = ''
    try {
      const live = renderCoachAnswer(answerFor('todayPlan', personaDefault(lang)), coachStrings[lang], lang)
      sample = live.lines.map((l) => l.text).join(' | ')
      ok = live.lines.every((l) => l.text.trim().length > 0)
    } catch {
      ok = false
    }
    check(`[${lang}] المنسّق الافتراضي يرسم بلا انهيار`, ok)
    console.log(`    ↳ [${lang}] ${sample.slice(0, 150)}`)
  }

  // الحتميّة: نفس السياق ⇒ نفس الجواب حرفيًا. لا عشوائية ولا حالة مخبوءة.
  const env = personaRich('ar')
  const a = JSON.stringify(answerFor('todayPlan', env))
  const b = JSON.stringify(answerFor('todayPlan', env))
  check('المحرّك حتميّ: نفس السياق ⇒ نفس الجواب حرفيًا', a === b)

  // ولا نداء شبكة في طبقة المرشد كلّها — الإفصاح ليس ادّعاءً.
  const coachFiles = walk(resolve(ROOT, 'src/lib/coach')).concat(walk(resolve(ROOT, 'src/features/coach')))
  const netCalls = coachFiles.filter(([, body]) => /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(strip(body)))
  check(`لا نداء شبكة في طبقة المرشد (${netCalls.map(([p]) => p).join(',') || 'صفر'})`, netCalls.length === 0)
}

// ════════════════════════════════════════════════════════════════════════════
//  ⑥ القاموس: لا مفردة طبية · لا ادّعاء تغيير · لا رقم في قالب
// ════════════════════════════════════════════════════════════════════════════

{
  const violations = scanCoachCopy(coachStrings)
  check(`لا مخالفة مفردات في القاموس كلّه (${violations.map((v) => `${v.code}@${v.key}`).join(',') || 'صفر'})`, violations.length === 0)

  // كل مفتاح سطر له نصّ في اللغتين — والعقد يفرضه `typecheck`، وهذا يقيسه حيًّا.
  for (const lang of LANGS) {
    check(
      `[${lang}] كل مفاتيح السطور مترجمة (${COACH_LINE_KEYS.length})`,
      COACH_LINE_KEYS.every((k) => coachStrings[lang].lines[k].trim().length > 0),
    )
  }

  // **لا رقم في قالب نصّ.** ولذلك كل رقم على الشاشة وسيطٌ مُسنَد بالضرورة.
  const templateDigits = digitBearingTemplates(coachStrings)
  check(`لا محرف رقمي في أي قالب (${templateDigits.join(',') || 'صفر'})`, templateDigits.length === 0)

  // كل سطر يعرض `{param}` **مذكور فعلًا** في قالب اللغتين — وإلا اختفى رقم صادق.
  for (const lang of LANGS) {
    const env = personaRich(lang)
    for (const subject of SUBJECTS) {
      for (const line of answerFor(subject, env).lines) {
        for (const name of Object.keys(line.params ?? {})) {
          check(
            `[${lang}] قالب ${line.key} يستهلك الوسيط {${name}}`,
            coachStrings[lang].lines[line.key].includes(`{${name}}`),
          )
        }
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  ⑦ الواجهة: لا نصّ صلب · لا استيراد ساكن · أهداف لمس · تركيز · Escape
// ════════════════════════════════════════════════════════════════════════════

const VIEW = read('src/features/coach/CoachView.tsx')
const PANEL = read('src/features/coach/CoachAnswerPanel.tsx')
const ENTRY = read('src/features/coach/CoachTodayEntry.tsx')
const ROUTES = read('src/lib/appRoutes.ts')

{
  check("المسار 'coach' معلَن في نوع AppRoute", /\|\s*'coach'/.test(ROUTES))
  check("والمسار مسجَّل في جدول ROUTES", /^\s*'coach',$/m.test(ROUTES))

  // الرسم يمرّ من `renderCoachAnswer` وحده — أي من حارس الإسناد.
  check('الشاشة ترسم عبر renderCoachAnswer', VIEW.includes('renderCoachAnswer('))
  check('ولا تبني نصًّا بنفسها من مفاتيح السطور', !strip(VIEW).includes('COACH_LINE_KEYS'))
  check('واللوحة تفصل الأنواع من الجدول البنيوي', PANEL.includes('COACH_LINE_KIND') || PANEL.includes("'fact'"))
  check('واللوحة تعرض وسم كل نوع من القاموس', PANEL.includes('strings.kinds[kind]'))
  check('واللوحة تعرض مصدر كل سطر', PANEL.includes('strings.sourceLabel') && PANEL.includes('strings.sources[id]'))
  check('واللوحة تعرض ما لا نعرفه', PANEL.includes('strings.unknownLabel'))

  // لا نصّ عربي صلب في أي ملفّ واجهة (بعد نزع التعليقات).
  for (const [name, body] of [['CoachView', VIEW], ['CoachAnswerPanel', PANEL], ['CoachTodayEntry', ENTRY]] as const) {
    check(`[${name}] لا نصّ عربي صلب خارج القاموس`, hardcodedArabic(body).length === 0)
    check(`[${name}] لا مساعد t(ar, en) محلّي`, localTernaryCopy(body).length === 0)
  }

  // أهداف لمس ٤٤ بكسل لكل زرّ.
  for (const [name, body] of [['CoachView', VIEW], ['CoachAnswerPanel', PANEL], ['CoachTodayEntry', ENTRY]] as const) {
    const small = smallTouchTargets(body)
    check(`[${name}] كل زرّ ≥ ٤٤ بكسل (${small.join(',') || 'صفر مخالف'})`, small.length === 0)
  }

  // كل أيقونة مستعملة موجودة في الخريطة — الاسم المفقود يسقط وقت التشغيل
  // على شاشة المستخدم لا في البناء، فيُفحَص هنا.
  const iconsFile = read('src/lib/icons.ts')
  const usedIcons = [...(VIEW + PANEL + ENTRY).matchAll(/<Icon\s+name="([A-Za-z0-9]+)"/g)].map((m) => m[1])
  check(`أيقونات مستعملة (${[...new Set(usedIcons)].join(',')})`, usedIcons.length >= 6)
  for (const name of new Set(usedIcons)) {
    check(`الأيقونة «${name}» مسجَّلة في خريطة الأيقونات`, new RegExp(`^\\s*${name},$`, 'm').test(iconsFile))
  }

  // وصولية الشاشة.
  check('حقل السؤال مربوط بتسميته', VIEW.includes('htmlFor="coach-ask"') && VIEW.includes('id="coach-ask"'))
  check('منطقة الجواب حيّة لقارئ الشاشة', VIEW.includes('aria-live="polite"'))
  check('وعنوان الجواب قابل للتركيز', VIEW.includes('tabIndex={-1}') && VIEW.includes('headingRef'))
  check('والتركيز يُنقل إلى الجواب عند وصوله', /headingRef\.current\?\.focus\(\)/.test(VIEW))
  check('وEscape يغلق الشاشة', VIEW.includes("event.key === 'Escape'"))
  check('ومستمع Escape يُفكَّك', VIEW.includes("removeEventListener('keydown'"))
  check('وزرّ الرجوع مسمّى لقارئ الشاشة', VIEW.includes('aria-label={s.back}'))
  check('والاتجاه يتبع اللغة', VIEW.includes("dir={ar ? 'rtl' : 'ltr'}"))
  // RTL: لا خصائص اتجاهية صلبة في أي ملفّ واجهة.
  for (const [name, body] of [['CoachView', VIEW], ['CoachAnswerPanel', PANEL], ['CoachTodayEntry', ENTRY]] as const) {
    const dir = directionalClasses(body)
    check(`[${name}] لا صنف اتجاهي صلب (${dir.join(',') || 'صفر'})`, dir.length === 0)
  }

  // الفشل لا يُبتلع: سقوط الإسناد يُعرَض نصًّا صادقًا لا نصف جواب.
  check('سقوط الإسناد يُعرض نصًّا صادقًا', VIEW.includes('s.answerBlocked'))
  check('ولا يُرسَم جواب مع الفشل', /answer: null; failure: string/.test(VIEW))
}

// الكسل: لا استيراد ساكن للشاشة من خارج حزمتها.
{
  const srcFiles = walk(resolve(ROOT, 'src'))
  const eager = eagerImporters(srcFiles)
  check(`لا استيراد ساكن لشاشة المرشد (${eager.join(',') || 'صفر'})`, eager.length === 0)
  // وبطاقة «اليوم» لا تجرّ المحرّك: بلا هذا تدخل طبقة المرشد حزمة اللوحة.
  check('بطاقة اليوم لا تستورد @/lib/coach', !ENTRY.includes("@/lib/coach"))
  // ولا تستورد القاموس الكامل: `coachStrings` هو المفتاح الثقيل، و`coachEntryStrings`
  // هو الأربعة التي تحتاجها. الفارق المقيس ٧٫٤ ك.ب مضغوطة (`coach-chunk-measure`).
  check('وبطاقة اليوم تستورد نصوص المدخل لا القاموس الكامل', ENTRY.includes('coachEntryStrings') && !/\bcoachStrings\b/.test(ENTRY))
  check('وبطاقة اليوم لا تستورد الشاشة', !/from\s+['"]\.\/CoachView['"]/.test(ENTRY))
}

// ════════════════════════════════════════════════════════════════════════════
//  ⑧ التأكيدات المضادّة — كل حارس يُهاجَم، وكل سقوط باسمه
// ════════════════════════════════════════════════════════════════════════════

console.log('\n─── التأكيدات المضادّة ───')

/** يحقن تحويرًا في جواب حقيقي ويعيد رمز أول مخالفة (أو `null` إن مرّ). */
function tamper(mutate: (answer: CoachAnswer) => CoachAnswer): string | null {
  const original = answerFor('todayPlan', personaDefault('ar'))
  const clone = JSON.parse(JSON.stringify(original)) as CoachAnswer
  const violations = verifyAnswerProvenance(mutate(clone))
  return violations.length ? violations[0].code : null
}

{
  // (أ) رقم مختلَق: قيمة الوسيط تخالف حقيقتها.
  const fabricated = tamper((answer) => {
    const lines = answer.lines.map((line) =>
      line.params
        ? {
            ...line,
            params: Object.fromEntries(
              Object.entries(line.params).map(([k, p]) => [k, { ...p, value: 9999 }]),
            ),
          }
        : line,
    )
    return { ...answer, lines }
  })
  check(`رقم مختلَق يسقط بـparam-value-mismatch (جاء: ${fabricated})`, fabricated === 'param-value-mismatch')

  // (ب) حقيقة مدسوسة بلا سطر يستعملها.
  const orphan = tamper((answer) => ({
    ...answer,
    facts: [...answer.facts, { id: 'ghost', source: 'workout.history', certainty: 'measured', value: 42 }],
  }))
  check(`حقيقة يتيمة تسقط بـorphan-fact (جاء: ${orphan})`, orphan === 'orphan-fact')

  // (ج) وسيط يشير إلى حقيقة غير موجودة أصلًا.
  const missing = tamper((answer) => ({
    ...answer,
    lines: answer.lines.map((line, i) =>
      i === 0 ? { ...line, params: { ...(line.params ?? {}), ghost: { value: 7, factId: 'nope' } } } : line,
    ),
  }))
  check(`وسيط بلا حقيقة يسقط بـparam-missing-fact (جاء: ${missing})`, missing === 'param-missing-fact')

  // (د) مصدر غير مسجَّل — «من بياناتك» بلا وحدة تقابله.
  const badSource = tamper((answer) => ({
    ...answer,
    facts: answer.facts.map((f, i) => (i === 0 ? { ...f, source: 'crystal.ball' as never } : f)),
  }))
  check(`مصدر غير مسجَّل يسقط بـunregistered-source (جاء: ${badSource})`, badSource === 'unregistered-source')

  // (هـ) رقم في موضع «لا نعرف».
  const emptyClone = JSON.parse(JSON.stringify(answerFor('progressTrend', personaEmpty('ar')))) as CoachAnswer
  const filledUnknown = verifyAnswerProvenance({
    ...emptyClone,
    facts: emptyClone.facts.map((f) => (f.certainty === 'unknown' ? { ...f, value: 0 } : f)),
  })
  check(
    `صفر في موضع مجهول يسقط بـunknown-fact-has-value (جاء: ${filledUnknown.map((v) => v.code).join(',')})`,
    filledUnknown.some((v) => v.code === 'unknown-fact-has-value'),
  )

  // (و) **والرسم نفسه يرمي باسمه** — لا يعرض نصف جواب، ولا يسقط بـTypeError.
  const original = answerFor('todayPlan', personaDefault('ar'))
  const clone = JSON.parse(JSON.stringify(original)) as CoachAnswer
  clone.facts = [...clone.facts, { id: 'ghost', source: 'workout.history', certainty: 'measured', value: 42 }]
  let thrown: unknown = null
  try {
    renderCoachAnswer(clone, coachStrings.ar, 'ar', RAW_FMT)
  } catch (err) {
    thrown = err
  }
  check(
    `الرسم يرمي CoachProvenanceError[orphan-fact] لا TypeError (جاء: ${thrown instanceof Error ? thrown.name : String(thrown)})`,
    thrown instanceof CoachProvenanceError && thrown.code === 'orphan-fact',
  )
}

{
  // (ز) مفردة طبية مدسوسة تسقط باسمها — والمفردة نفسها تُطبع.
  const medical = findMedicalClaims([
    ['ar.lines.injected', 'هذا التمرين يعالج آلام الركبة ويسرّع الشفاء'],
    ['en.lines.injected', 'This movement will treat your knee pain'],
  ])
  check(
    `مفردة طبية مدسوسة تسقط بـmedical-claim (${medical.map((v) => v.term).join(',')})`,
    medical.length >= 2 && medical.every((v) => v.code === 'medical-claim') && medical.some((v) => v.term === 'treat'),
  )
  // وجارتها المشروعة **لا تسقط** — القائمة لم تصر قاعدة تبتلع كل شيء (§4.2).
  const innocent = findMedicalClaims([
    ['ar.lines.ok', 'حركة طبيعية على مفصلك، وصحّتك أهم من الرقم'],
    ['en.lines.ok', 'A healthy, natural pattern — health first'],
  ])
  check(`و«طبيعي/healthy» لا تسقط (${innocent.map((v) => v.term).join(',') || 'صفر'})`, innocent.length === 0)

  // (ح) ادّعاء تغيير الخطة يسقط بالاقتران، والفعل وحده يمرّ بحقّ.
  const claim = findPlanChangeClaims([['ar.lines.injected', 'عدلنا خطتك وخفّضنا سعراتك تلقائيًا']])
  check(`ادّعاء تغيير يسقط بـplan-change-claim (${claim.map((v) => v.term).join(',')})`, claim.length === 1 && claim[0].code === 'plan-change-claim')
  const okClaim = findPlanChangeClaims([['ar.lines.ok', 'تقدر تبدّله بنفسك من ورقة التمرين']])
  check('و«تقدر تبدّله بنفسك» تمرّ بحقّ', okClaim.length === 0)
}

{
  // (ط) رقم في قالب نصّ يسقط باسمه.
  const injected = digitBearingTemplates({ ar: { lines: { 'today.rest': 'اليوم راحة — 3 أيام باقية' } } })
  check(`رقم في قالب يسقط بـtemplate-digit (${injected.join(',')})`, injected.length === 1)

  // (ي) استيراد ساكن للشاشة يسقط باسمه.
  const eagerHit = eagerImporters([['src/App.tsx', "import { CoachView } from '@/features/coach/CoachView'"]])
  check(`استيراد ساكن للشاشة يسقط بـeager-static-import (${eagerHit.join(',')})`, eagerHit.length === 1)
  // والاستيراد الكسول **لا** يسقط — وإلا لكان الحارس يمنع الصواب.
  const lazyOk = eagerImporters([
    ['src/App.tsx', "const V = lazy(() => import('@/features/coach/CoachView').then((m) => ({ default: m.CoachView })))"],
  ])
  check('والاستيراد الكسول يمرّ بحقّ', lazyOk.length === 0)

  // (ك) نصّ عربي صلب في واجهة يسقط باسمه.
  const hardcoded = hardcodedArabic("export const X = () => <p>وش أسوي اليوم؟</p>")
  check(
    `نصّ عربي صلب يسقط بـhardcoded-copy (${hardcoded.join(',')})`,
    hardcoded.length > 0 && hardcoded.every((h) => h.startsWith('hardcoded-copy:')),
  )
  // وتعليق عربي **لا** يسقط — الحارس يفحص النصّ لا الشرح.
  check('وتعليق عربي يمرّ بحقّ', hardcodedArabic('// شرح بالعربية\nexport const X = 1').length === 0)

  // (ل) هدف لمس صغير يسقط باسمه.
  const tiny = smallTouchTargets('<button type="button" className="h-6 w-6">x</button>')
  check(`هدف لمس صغير يسقط بـsmall-touch-target (${tiny.length})`, tiny.length === 1)
  check('وزرّ ٤٤ بكسل يمرّ بحقّ', smallTouchTargets('<button className="min-h-[44px]">x</button>').length === 0)

  // (م) صنف اتجاهي صلب يسقط باسمه.
  check('صنف اتجاهي صلب يسقط بـdirectional-class', directionalClasses('<div className="ml-2 text-left">').length === 2)
  check('والخصائص المنطقية تمرّ بحقّ', directionalClasses('<div className="ms-2 text-start">').length === 0)
}

// ════════════════════════════════════════════════════════════════════════════
//  أدوات الفحص — معرَّفة هنا كي تُهاجَم بمدخل مصنوع كما تُشغَّل على الحقيقي
// ════════════════════════════════════════════════════════════════════════════

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8')
}

/** ينزع التعليقات فلا يُحاكَم ملفّ على شرحه. */
function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

function walk(dir: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.tsx?$/.test(name)) {
      out.push([full.slice(ROOT.length + 1), readFileSync(full, 'utf8')])
    }
  }
  return out
}

/** `eager-static-import` — استيراد ساكن لشاشة المرشد من أي ملفّ. */
function eagerImporters(files: ReadonlyArray<readonly [string, string]>): string[] {
  const out: string[] = []
  for (const [path, body] of files) {
    if (path.startsWith('src/features/coach')) continue
    if (/^\s*import\s[^\n]*from\s+['"][^'"]*(?:features\/coach\/CoachView|features\/coach\/CoachAnswerPanel)['"]/m.test(body)) {
      out.push(`eager-static-import@${path}`)
    }
  }
  return out
}

/** `hardcoded-copy` — محرف عربي في شيفرة واجهة بعد نزع التعليقات. */
function hardcodedArabic(source: string): string[] {
  const body = strip(source)
  // نطاق العربية **بهروب صريح** لا بمحارف حرفية: المحرف المخفي في المدى الحرفي
  // كان يُسقط فحصًا سليمًا في موجة سابقة.
  const hits = body.match(/[\u0600-\u06FF\u0750-\u077F]+/g)
  return hits ? hits.map((h) => `hardcoded-copy:${h}`) : []
}

/** `local-t-helper` — ثنائية `ar ? '…' : '…'` تصنع قاموسًا موازيًا في مكوّن. */
function localTernaryCopy(source: string): string[] {
  const body = strip(source)
  const hits = body.match(/\bar\s*\?\s*(['"])[^'"]*\1\s*:\s*(['"])[^'"]*\2/g)
  // `dir={ar ? 'rtl' : 'ltr'}` قيمة سمة لا نصّ مستخدم — تُستثنى صراحةً.
  return (hits ?? []).filter((h) => !/['"](rtl|ltr)['"]/.test(h)).map((h) => `local-t-helper:${h}`)
}

/** `small-touch-target` — زرّ بلا ارتفاع ≥ ٤٤ بكسل (`min-h-[44px]` أو `h-11`). */
function smallTouchTargets(source: string): string[] {
  const out: string[] = []
  // الحدّ هو `>` **غير المسبوق بـ`=`**: بدونه ينتهي الوسم عند سهم `onClick={() =>`
  // فيُقاس نصف وسم — وقد سقط الفحص هكذا أولًا على أزرار سليمة تمامًا.
  for (const tag of source.match(/<button\b[\s\S]*?(?<!=)>/g) ?? []) {
    if (!/min-h-\[44px\]|\bh-11\b/.test(tag)) out.push(`small-touch-target:${tag.slice(0, 60)}`)
  }
  return out
}

/** `directional-class` — صنف اتجاهي صلب يكسر العربية. */
function directionalClasses(source: string): string[] {
  const out: string[] = []
  for (const m of source.match(/\b(?:ml|mr|pl|pr)-\d|\btext-(?:left|right)\b|\b(?:left|right)-\d/g) ?? []) {
    out.push(`directional-class:${m}`)
  }
  return out
}

/** `template-digit` — محرف رقمي داخل قالب نصّ (فيصير رقمًا بلا حقيقة). */
function digitBearingTemplates(root: unknown): string[] {
  const out: string[] = []
  const walkNode = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      if (/[0-9٠-٩]/.test(node)) out.push(`template-digit@${path}`)
      return
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) walkNode(v, path ? `${path}.${k}` : k)
    }
  }
  for (const lang of Object.keys(root as Record<string, unknown>)) {
    const strings = (root as Record<string, { lines?: unknown }>)[lang]
    walkNode(strings?.lines, `${lang}.lines`)
  }
  return out
}

// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`)
console.log(`✓ ${pass} فحصًا ناجحًا · ✗ ${fail} فاشلًا`)
if (fail) {
  console.log('\nالفشل:')
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
console.log('إثبات شاشة المرشد: أخضر.')
