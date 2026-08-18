// إثبات تماسك الخطة — [SOVEREIGN-003] الحارة ٢.
//
// يغطّي أربعة عيوب مؤكَّدة، كلٌّ عند سلطته لا عند شاشته:
//   D5  أوّل جلسة لمستخدم جديد = «اليوم ١»، مؤكَّدًا على أيام الأسبوع السبعة كلها.
//   D6  لا حركة دفعٍ في يوم سحب ولا العكس، على مصفوفة شخصيات.
//   D2  إجابة مدّة الجلسة تغيّر المخرَج فعلًا (فارقًا واتجاهًا)، ونموذج المدّة **واحد**.
//   D7  تحويلٌ لم يغيّر شيئًا لا يُعلَن نجاحًا — يُقال صريحًا ومعه سببه.
//
// كل ضمانٍ يقابله **تأكيد مضادّ**: محاكاة التفافٍ تسقط **بفحص مسمّى** لا باستثناء
// تقني (§4.2). المحاكيات مجمّعة في القسم ⑤ ومسمّاة واحدةً واحدة.

import { build } from 'esbuild'
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

let pass = 0
let fail = 0
const failures = []
const check = (label, cond) => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    failures.push(label)
    console.log(`  ✗ FAIL: ${label}`)
  }
}

// ── تحميل المحرّك (نفس نمط run-plan-golden-proof.mjs: TS يُحزَم ويُشغَّل) ──────
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }) };
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const entry = `
import { generatePlan, movementPolarity, polarityAllowsDay, POSTERIOR_DELT_IDS, ANTERIOR_LATERAL_DELT_IDS } from '@/lib/planGenerator'
import { estimateDurationMin, estimateDurationSec, WORK_SECONDS_PER_SET } from '@/lib/workoutStats'
import {
  WORKOUT_CALENDAR_KEY, ensureCalendarMigrated, resetCalendarMigrationAttemptForTests,
  scheduledDayFor, suggestedSchedule, suggestedTrainingWeekdays, loadWeeklySchedule,
  firstTrainingWeekdayOnOrAfter, validateSchedule,
} from '@/lib/workoutCalendar'
import { machineConversionOutcome, regenerateOutcome, saveFailedOutcome, diffWorkoutPlans, planIsAllMachines } from '@/lib/planChanges'
import { withMachinePreference, declaredMachinePreference, resolveMachinesOnly } from '@/lib/equipmentAccess'
import { planCoherenceStrings } from '@/i18n/dict/planCoherence'
import { buildWorkoutV2Model } from '@/lib/workoutV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import { exercises, getExercise } from '@/data/exercises'
globalThis.__engine = {
  generatePlan, movementPolarity, polarityAllowsDay, POSTERIOR_DELT_IDS, ANTERIOR_LATERAL_DELT_IDS,
  estimateDurationMin, estimateDurationSec, WORK_SECONDS_PER_SET,
  WORKOUT_CALENDAR_KEY, ensureCalendarMigrated, resetCalendarMigrationAttemptForTests,
  scheduledDayFor, suggestedSchedule, suggestedTrainingWeekdays, loadWeeklySchedule,
  firstTrainingWeekdayOnOrAfter, validateSchedule,
  machineConversionOutcome, regenerateOutcome, saveFailedOutcome, diffWorkoutPlans, planIsAllMachines,
  withMachinePreference, declaredMachinePreference, resolveMachinesOnly,
  planCoherenceStrings, buildWorkoutV2Model, getDefaultCustomization, exercises, getExercise,
}
`

const bundle = await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: 'plan-coherence-entry.ts', loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const tmp = mkdtempSync(join(tmpdir(), 'plan-coherence-'))
const file = join(tmp, 'engine.mjs')
writeFileSync(file, bundle.outputFiles[0].text)
await import(pathToFileURL(file).href)
rmSync(tmp, { recursive: true, force: true })
const E = globalThis.__engine
if (!E) throw new Error('engine bundle did not expose __engine')
const ls = globalThis.localStorage

// ── ملفّات شخصية ──────────────────────────────────────────────────────────────
const BASE_PROFILE = {
  name: 'coherence', gender: 'male', age: 30, heightCm: 178, weightKg: 82, targetWeightKg: 76,
  activityLevel: 'moderate', trainingLevel: 'intermediate', goal: 'cut', goalType: 'cutting',
  trainingDays: 6, workoutDuration: 60, workoutEnvironment: 'gym', injuries: '', healthNotes: '',
  trackNutrition: true, mealsPerDay: 4, nutritionStyle: 'high_protein',
  nutritionDisplayStyle: 'meal_suggestions', mealDistribution: 'balanced', appetiteTiming: 'balanced',
  dietPattern: 'none', dislikedFoods: '', muscleFocus: 'balanced', consistency: 'regular',
  splitMode: 'auto', splitChoice: 'full_body', experienceBand: '1to2y', experienceLevel: 'intermediate',
  gymAccess: 'full', gymType: 'commercial',
  equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bands'],
  schedulingStyle: 'flexible', preferredDays: [0, 1, 2, 3, 4, 5], remindersOptIn: false,
}
const profile = (over = {}) => ({ ...BASE_PROFILE, ...over })

/** نوع اليوم من معرّفه المولَّد `gen-<n>-<type>` — المولّد نفسه يكتبه. */
const dayTypeOf = (day) => {
  const m = /^gen-\d+-(\w+)$/.exec(day.id)
  return m ? m[1] : null
}

/** تجميد `new Date()` على لحظة محدّدة — لمسار ميلاد الجدول. */
function freezeNow(at, fn) {
  const Real = globalThis.Date
  const ms = at.getTime()
  class Frozen extends Real {
    constructor(...args) { super(...(args.length ? args : [ms])) }
    static now() { return ms }
  }
  globalThis.Date = Frozen
  try { return fn() } finally { globalThis.Date = Real }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n① D5 — أوّل جلسة لمستخدم جديد هي «اليوم ١» (أيام الأسبوع السبعة)')
// ═══════════════════════════════════════════════════════════════════════════
//
// مسار الميلاد الحقيقي: تخصيص محفوظ ⇒ `ensureCalendarMigrated` (عبر مشغّل
// الهجرات في `dataOwnership`) يكتب الجدول ⇒ `scheduledDayFor` يحلّه.

/** أوّل يوم تدريب في اليوم المعطى أو بعده (٧ أيام) — من الجدول المكتوب فعلًا. */
function firstSessionOnOrAfter(plan, from) {
  for (let ahead = 0; ahead <= 7; ahead++) {
    const d = new Date(from.getTime())
    d.setDate(d.getDate() + ahead)
    const r = E.scheduledDayFor(plan, d)
    if (r && r.type === 'training') return { aheadDays: ahead, ...r }
  }
  return null
}

const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
// ٢٠٢٦-٠٧-١٩ أحد ⇒ +i يغطّي أيام الأسبوع السبعة بالترتيب.
const WEEK_ANCHORS = Array.from({ length: 7 }, (_, i) => new Date(2026, 6, 19 + i, 12))

{
  let allDayOne = true
  const offenders = []
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    const plan = E.generatePlan(profile({ trainingDays: daysPerWeek })).workoutPlan
    for (const today of WEEK_ANCHORS) {
      ls.clear()
      E.resetCalendarMigrationAttemptForTests()
      ls.setItem('qimmah:customization:v1', JSON.stringify({ profile: { trainingDays: daysPerWeek }, workoutPlan: plan }))
      const migrated = freezeNow(today, () => {
        E.ensureCalendarMigrated()
        return E.loadWeeklySchedule()
      })
      if (!migrated) { allDayOne = false; offenders.push(`${daysPerWeek}d/${WEEKDAY_AR[today.getDay()]}: لا جدول`); continue }
      const first = firstSessionOnOrAfter(plan, today)
      if (!first || first.planDayIndex !== 0) {
        allDayOne = false
        offenders.push(`${daysPerWeek}d/${WEEKDAY_AR[today.getDay()]}: ${first ? `اليوم ${first.planDayIndex + 1}` : 'لا جلسة'}`)
      }
    }
  }
  if (offenders.length) console.log(`    مخالفات: ${offenders.slice(0, 8).join(' · ')}`)
  check('أوّل جلسة بعد ميلاد الجدول = يوم الخطة ٠، على ٧ أيام أسبوع × ٥ أعداد أيام (٣٥ حالة)', allDayOne)

  // كل جدول مولود يمرّ الحارس — المرساة تزيح الفهارس لا أيام الأسبوع.
  let guarded = true
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    const plan = E.generatePlan(profile({ trainingDays: daysPerWeek })).workoutPlan
    for (const today of WEEK_ANCHORS) {
      const s = E.suggestedSchedule(plan, daysPerWeek, 6, { startDate: today })
      if (E.validateSchedule(s).length !== 0) guarded = false
      if (s.weekdays.filter((a) => a !== 'rest').length !== daysPerWeek) guarded = false
    }
  }
  check('المرساة لا تكسر الحارس: عدد أيام التدريب وقواعد الاستشفاء كما هي', guarded)

  // التوافق الخلفي: بلا مرساة يبقى السلوك القديم حرفيًا (بداية الأسبوع = اليوم ٠).
  const legacySat = E.suggestedSchedule(E.generatePlan(profile({ trainingDays: 3 })).workoutPlan, 3, 6)
  check('بلا مرساة: السبت يبقى يوم الخطة ٠ (جداول المستخدمين القائمة لا تُزاح)', legacySat.weekdays[6] === 0)

  check('`firstTrainingWeekdayOnOrAfter` دائري: بلا يوم تدريب ⇒ null', E.firstTrainingWeekdayOnOrAfter([], 3) === null)
  check('`firstTrainingWeekdayOnOrAfter([6,0,2,3], 4=الخميس) = 6 (السبت)', E.firstTrainingWeekdayOnOrAfter([6, 0, 2, 3], 4) === 6)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n② D6 — لا دفعَ في يوم سحب ولا سحبَ في يوم دفع')
// ═══════════════════════════════════════════════════════════════════════════

/**
 * الضمان المُختبَر (صيغته الدقيقة): **يوم مستقطب لا يحمل قطبية معاكسة إلا وهو
 * خالٍ تمامًا من قطبيته** — أي أن المعاكس ملاذٌ أخير عند نفاد الحوض، لا خيارًا
 * موازيًا. هذه الصيغة تُسقط بالضبط العيبَ المرصود (رفرفة أمامية بين تمارين
 * سحبٍ حقيقية) وتترك الحالة المنحطّة الوحيدة (إصابات تُخرج الدفع كلّه).
 */
function polarityViolations(plan) {
  const out = []
  for (const day of plan.days) {
    const type = dayTypeOf(day)
    if (type !== 'push' && type !== 'pull') continue
    const opposite = type === 'push' ? 'pull' : 'push'
    const pols = day.exercises.map((pe) => {
      const ex = E.getExercise(pe.exerciseId)
      return { id: pe.exerciseId, pol: ex ? E.movementPolarity(ex) : 'neutral' }
    })
    const own = pols.filter((x) => x.pol === type).length
    const crossed = pols.filter((x) => x.pol === opposite)
    if (crossed.length && own > 0) {
      out.push(`${day.id}: ${crossed.map((c) => c.id).join(',')} (قطبية ${opposite}) بجانب ${own} من قطبيته`)
    }
  }
  return out
}

{
  const PLACES = [
    { key: 'نادٍ كامل', over: { gymAccess: 'full', gymType: 'commercial', equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bands'] } },
    { key: 'أجهزة فقط', over: { gymAccess: 'small', gymType: 'small', equipment: ['machine'] } },
    { key: 'منزل', over: { gymAccess: 'home', gymType: 'home', workoutEnvironment: 'home', equipment: ['dumbbell', 'bench', 'bands'] } },
    { key: 'وزن الجسم', over: { gymAccess: 'bodyweight', gymType: 'bodyweight', equipment: [] } },
  ]
  const SPLITS = [
    { key: 'تلقائي ٦', over: { splitMode: 'auto', trainingDays: 6 } },
    { key: 'تلقائي ٧', over: { splitMode: 'auto', trainingDays: 7, preferredDays: [0, 1, 2, 3, 4, 5, 6] } },
    { key: 'PPL ٣', over: { splitMode: 'advanced', splitChoice: 'push_pull_legs', trainingDays: 3 } },
    { key: 'PPL ٥', over: { splitMode: 'advanced', splitChoice: 'push_pull_legs', trainingDays: 5 } },
    { key: 'PPL ٦', over: { splitMode: 'advanced', splitChoice: 'push_pull_legs', trainingDays: 6 } },
    { key: 'برو ٤', over: { splitMode: 'advanced', splitChoice: 'bro_split', trainingDays: 4 } },
    { key: 'برو ٦', over: { splitMode: 'advanced', splitChoice: 'bro_split', trainingDays: 6 } },
  ]
  const LEVELS = [
    { key: 'مبتدئ', over: { trainingLevel: 'beginner', experienceBand: 'lt1m', experienceLevel: 'beginner' } },
    { key: 'متوسط', over: { trainingLevel: 'intermediate', experienceBand: '1to2y', experienceLevel: 'intermediate' } },
    { key: 'متقدّم', over: { trainingLevel: 'advanced', experienceBand: 'gt2y', experienceLevel: 'advanced' } },
  ]
  const INJURIES = [
    { key: 'بلا إصابة', over: { injuries: '' } },
    { key: 'كتف', over: { injuries: 'كتف' } },
    { key: 'الستّة', over: { injuries: 'ركبة، كتف، أسفل الظهر، رسغ، مرفق، كاحل' } },
  ]
  const GOALS = ['cutting', 'bulking', 'maintenance']
  const DURATIONS = [30, 60, 90]

  let plans = 0
  let anterior = 0
  let violating = []
  let lastResortDays = 0
  for (const place of PLACES)
    for (const split of SPLITS)
      for (const level of LEVELS)
        for (const injury of INJURIES)
          for (const goalType of GOALS)
            for (const workoutDuration of DURATIONS) {
              const p = profile({ ...place.over, ...split.over, ...level.over, ...injury.over, goalType, workoutDuration })
              const plan = E.generatePlan(p).workoutPlan
              plans++
              const v = polarityViolations(plan)
              if (v.length) violating.push(`${place.key}|${split.key}|${level.key}|${injury.key}|${goalType}|${workoutDuration} → ${v[0]}`)
              for (const day of plan.days) {
                const type = dayTypeOf(day)
                if (type !== 'pull') continue
                for (const pe of day.exercises) {
                  if (E.ANTERIOR_LATERAL_DELT_IDS.has(pe.exerciseId)) anterior++
                }
                const opp = day.exercises.filter((pe) => {
                  const ex = E.getExercise(pe.exerciseId)
                  return ex && E.movementPolarity(ex) === 'push'
                })
                if (opp.length) lastResortDays++
              }
            }
  console.log(`    خطط في المصفوفة: ${plans}`)
  console.log(`    أيام سحبٍ بقطبية معاكسة (ملاذ أخير موثّق): ${lastResortDays}`)
  if (violating.length) console.log(`    مخالفات: ${violating.slice(0, 5).join(' · ')}`)
  check(`الضمان: يومٌ مستقطب لا يخلط قطبيتين — ٠ مخالفة على ${plans} خطة`, violating.length === 0)
  check('العيب المرصود بعينه: صفر «رفرفة أمامي/جانبي» على أي يوم سحب في المصفوفة كلّها', anterior === 0)

  // التصنيف صريح لا افتراضي: كل عزل كتف في الكتالوج مذكور بالاسم في مجموعة واحدة.
  const delts = E.exercises.filter((ex) => ex.primaryMuscle === 'shoulders' && ex.movementPattern === 'isolation')
  const unclassified = delts.filter((ex) => !E.POSTERIOR_DELT_IDS.has(ex.id) && !E.ANTERIOR_LATERAL_DELT_IDS.has(ex.id))
  const doubleClassified = delts.filter((ex) => E.POSTERIOR_DELT_IDS.has(ex.id) && E.ANTERIOR_LATERAL_DELT_IDS.has(ex.id))
  if (unclassified.length) console.log(`    غير مصنَّف: ${unclassified.map((e) => e.id).join(', ')}`)
  check(`استنفاد التصنيف: ${delts.length}/${delts.length} عزل كتف مصنَّف بالاسم (لا واحد يعتمد على الافتراض)`, unclassified.length === 0)
  check('ولا واحد في المجموعتين معًا (تصنيف قاطع)', doubleClassified.length === 0)

  check('`front-raise` قطبيته دفع، و`polarityAllowsDay(pull, …)` ترفضه',
    E.movementPolarity(E.getExercise('front-raise')) === 'push' && E.polarityAllowsDay('pull', E.getExercise('front-raise')) === false)
  check('`rear-delt-fly` قطبيته سحب، ويوم الدفع يرفضه',
    E.movementPolarity(E.getExercise('rear-delt-fly')) === 'pull' && E.polarityAllowsDay('push', E.getExercise('rear-delt-fly')) === false)
  check('الكور محايد: يُقبل في يومَي الدفع والسحب معًا',
    E.polarityAllowsDay('push', E.getExercise('plank')) === true && E.polarityAllowsDay('pull', E.getExercise('plank')) === true)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n③ D2 — إجابة المدّة تحكم المخرَج فعلًا، ونموذج المدّة واحد')
// ═══════════════════════════════════════════════════════════════════════════

const LADDER = [30, 45, 60, 75, 90]
const avgDuration = (plan) =>
  plan.days.reduce((s, d) => s + E.estimateDurationMin(d), 0) / Math.max(1, plan.days.length)

{
  const CASES = [
    { key: 'مبتدئ ٣ أيام جسم كامل', over: { trainingDays: 3, trainingLevel: 'beginner', experienceBand: 'lt1m', experienceLevel: 'beginner', preferredDays: [0, 2, 4] } },
    { key: 'متوسط ٤ أيام علوي/سفلي', over: { trainingDays: 4, preferredDays: [0, 1, 3, 4] } },
    { key: 'متقدّم ٦ أيام PPL', over: { trainingDays: 6, trainingLevel: 'advanced', experienceBand: 'gt2y', experienceLevel: 'advanced' } },
    { key: 'أجهزة فقط ٥ أيام', over: { trainingDays: 5, gymAccess: 'small', gymType: 'small', equipment: ['machine'], preferredDays: [0, 1, 2, 3, 4] } },
  ]
  //
  // ═══ العقد المُعلَن للمدّة ═══
  // إجابة المدّة **سقفٌ لا هدف**. أربعة بنود، كلٌّ مؤكَّد أدناه بمفرده:
  //   C1 السقف حقيقي: تقدير كل يوم ≤ الإجابة، دائمًا.
  //   C2 لا انعكاس: إجابة أطول لا تُنتج جلسة أقصر أبدًا.
  //   C3 القصير يقصُر فعلًا: أدنى درجة أقصر **قطعًا** من كل ما فوقها (العيب المرصود).
  //   C4 المدى مادّي: من ٣٠ إلى ٩٠ فارقٌ حقيقي لا رمزي.
  //   C5 ولا نضخّم حجم العمل لملء وقتٍ فاضٍ — فقد تتساوى درجتان متجاورتان.
  //      وهذا **مسموح بشرطٍ واحد يُفحَص**: أن يكون التساوي تحت السقفين معًا
  //      بفسحة، أي أنه من **عدم التضخيم** لا من فشل السقف. تساوٍ عند السقف
  //      نفسه ⇒ مخالفة تُسمّى، لأنه حينها أثرُ اقتطاعٍ لا أثرُ اختيار.
  let noReversal = true
  let ceilingOk = true
  let shortEndStrict = true
  let minSpan = Infinity
  const unexplainedTies = []
  const rows = []
  for (const c of CASES) {
    const plans = LADDER.map((m) => E.generatePlan(profile({ ...c.over, workoutDuration: m })).workoutPlan)
    const series = plans.map(avgDuration)
    rows.push(`${c.key}: ${series.map((x) => x.toFixed(1)).join(' → ')}`)
    plans.forEach((plan, i) => {
      if (!plan.days.every((d) => E.estimateDurationMin(d) <= LADDER[i])) ceilingOk = false
    })
    for (let i = 1; i < series.length; i++) {
      if (series[i] < series[i - 1]) noReversal = false
      if (series[i] === series[i - 1]) {
        // تساوٍ مسموح فقط حين يكون تحت السقف الأقصر بفسحةٍ حقيقية (≥ دقيقتين).
        if (series[i] > LADDER[i - 1] - 2) unexplainedTies.push(`${c.key}: ${LADDER[i - 1]}↔${LADDER[i]} عند ${series[i].toFixed(1)}`)
      }
    }
    if (!(series[0] < Math.min(...series.slice(1)) - 2)) shortEndStrict = false
    const span = series[series.length - 1] - series[0]
    if (span < minSpan) minSpan = span
  }
  rows.forEach((r) => console.log(`    ${r}`))
  check('C1 السقف حقيقي: تقدير كل يوم مولَّد ≤ إجابة المستخدم، في كل الحالات والدرجات', ceilingOk)
  check('C2 لا انعكاس: إجابة أطول لم تُنتج جلسة أقصر في أي درجة', noReversal)
  check('C3 القصير يقصُر فعلًا: درجة ٣٠ أقصر قطعًا (بفارق > دقيقتين) من كل ما فوقها', shortEndStrict)
  check(`C4 المدى مادّي: من ٣٠ إلى ٩٠ فارقٌ ≥ ٨ دقائق في كل حالة (أصغر مدى ${minSpan.toFixed(1)})`, minSpan >= 8)
  if (unexplainedTies.length) console.log(`    تساوٍ غير مُفسَّر: ${unexplainedTies.join(' · ')}`)
  check('C5 كل تساوٍ بين درجتين متجاورتين تحت السقفين بفسحة — من عدم التضخيم لا من فشل السقف', unexplainedTies.length === 0)

  // العيب بعينه: ٣٠ و٤٥ دقيقة لمبتدئ جسمٍ كامل كانتا تُنتجان الخطة نفسها بايتًا.
  const short = E.generatePlan(profile({ trainingDays: 3, trainingLevel: 'beginner', experienceBand: 'lt1m', experienceLevel: 'beginner', workoutDuration: 30 })).workoutPlan
  const mid = E.generatePlan(profile({ trainingDays: 3, trainingLevel: 'beginner', experienceBand: 'lt1m', experienceLevel: 'beginner', workoutDuration: 45 })).workoutPlan
  check('العيب المرصود: خطة «٣٠ دقيقة» لم تعد مطابقة لخطة «٤٥ دقيقة»',
    JSON.stringify(short) !== JSON.stringify(mid) && avgDuration(short) < avgDuration(mid))
  check('السقف محترَم: تقدير جلسة «٣٠ دقيقة» ≤ ٣٠', short.days.every((d) => E.estimateDurationMin(d) <= 30))

  // الأرضية التشريحية لم تُخترَق لبلوغ الرقم.
  check('أرضية الجسم الكامل صامدة: ٥ تمارين أساسية على الأقل حتى في أقصر جلسة',
    short.days.every((d) => d.exercises.filter((pe) => !pe.optional).length >= 5))
  check('أرضية المجموعات صامدة: لا تمرين بمجموعة واحدة', short.days.every((d) => d.exercises.every((pe) => pe.sets >= 2)))
}

// ── نموذج واحد لا نموذجان: فحص بنيوي على المصدر + فحص وقتيّ على المستهلك ──────
const SRC_FILES = []
;(function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(name.name)) SRC_FILES.push(full)
  }
})(resolve(root, 'src'))

const DURATION_AUTHORITY = 'src/lib/workoutStats.ts'
/** أنماط «حساب مدّة جلسة» — كلٌّ مسمّى كي تُقال المخالفة باسم نمطها. */
const DURATION_PATTERNS = [
  { name: 'مجموعات × (عمل + راحة)', re: /restSec[^\n]*\*|\*[^\n]*restSec/ },
  { name: 'دقائق لكل تمرين مقرَّبة (الشكل المتقاعد)', re: /\*\s*9\s*\)\s*\/\s*5|Math\.max\(\s*20\s*,\s*Math\.round\(/ },
]

function scanDurationFormulas(sources) {
  const hits = []
  for (const { rel, text } of sources) {
    if (rel === DURATION_AUTHORITY) continue
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return // تعليق يشرح النموذج ليس نموذجًا
      for (const pat of DURATION_PATTERNS) {
        if (pat.re.test(line)) hits.push(`${rel}:${i + 1} نمط «${pat.name}»`)
      }
    })
  }
  return hits
}

{
  const sources = SRC_FILES.map((f) => ({ rel: relative(root, f), text: readFileSync(f, 'utf8') }))
  const stray = scanDurationFormulas(sources)
  if (stray.length) console.log(`    نماذج شاردة: ${stray.join(' · ')}`)
  // ═══ الاستثناء سقط لأنه أُصلح — لا لأنه وُسِّع ═══
  // كُتب هذا الفحص باستثناء واحد معلَن (`src/features/customPlan/builder.ts`)
  // لأن الملف خارج ملكية حارة المحرّك، ومعه حارسٌ يسقط **لحظة إصلاحه** كي لا
  // يُخلَّد. وقد أُصلح في نفس الموجة (`estimateSessionMinutes` صار غلافًا على
  // `estimateDurationMin`)، فسقط الحارس بالضبط كما صُمّم — فحُذف الاستثناء.
  // والصيغة الآن مطلقة: **صفر** نموذج مدّة خارج السلطة.
  check(`نموذج المدّة واحد بلا استثناء: لا حساب مدّة خارج ${DURATION_AUTHORITY} (${sources.length} ملف مفحوص)`, stray.length === 0)

  const consumers = sources.filter((s) => /\bestimateDurationMin\s*\(/.test(s.text) && s.rel !== DURATION_AUTHORITY)
  const importsAuthority = consumers.every((s) => /from '@\/lib\/workoutStats'/.test(s.text))
  console.log(`    مستهلكو المصدر الواحد: ${consumers.map((c) => c.rel).join(', ')}`)
  check(`كل مستهلك للمدّة يستوردها من السلطة (${consumers.length} ملف)`, consumers.length >= 3 && importsAuthority)

  // فحص وقتيّ: نموذج شاشة التمرين يعطي **نفس الرقم** لا رقمًا قريبًا.
  ls.clear()
  const c = E.getDefaultCustomization()
  const plan = E.generatePlan(profile({ trainingDays: 6 })).workoutPlan
  const model = E.buildWorkoutV2Model({ ...c, profile: profile({ trainingDays: 6 }), workoutPlan: plan }, 'ar')
  const resolved = E.scheduledDayFor(plan)
  const expected = resolved && resolved.type === 'training' ? E.estimateDurationMin(resolved.day) : 0
  check('شاشة التمرين تعرض رقم السلطة بعينه لا تقريبًا منافسًا', model.session.durationMin === expected)
  check('وبرنامج الشاشة ومدّة الجلسة رقم واحد', model.program.estimatedDurationMin === model.session.durationMin)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n④ D7 — تحويلٌ لم يغيّر شيئًا لا يُعلَن نجاحًا')
// ═══════════════════════════════════════════════════════════════════════════

/** كلمات «تمّ» في السجلّين — رسالة «ما تغيّر شي» يجب ألّا تحملها. */
const SUCCESS_MARKERS = [/^تم\s*—/, /^Done\s*—/]

{
  const freeGym = profile({ equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bands'] })
  const beforePlan = E.generatePlan(freeGym).workoutPlan

  // (أ) التحويل الحقيقي: النيّة تُكتب ⇒ المخرَج يتغيّر ⇒ نجاح مستحقّ.
  const converted = E.withMachinePreference(freeGym, true)
  const afterPlan = E.generatePlan(converted).workoutPlan
  const realOutcome = E.machineConversionOutcome(converted, beforePlan, afterPlan)
  check('النيّة تُكتب فعلًا: `withMachinePreference` ⇒ `resolveMachinesOnly` صار true',
    E.declaredMachinePreference(freeGym) === undefined && E.declaredMachinePreference(converted) === true && E.resolveMachinesOnly(converted) === true)
  check(`تحويلٌ غيّر المخرَج فعلًا ⇒ machines_converted (${realOutcome.changedDays} يوم · ${realOutcome.changedExercises} خانة)`,
    realOutcome.code === 'machines_converted' && realOutcome.changed === true && realOutcome.changedExercises > 0)
  check('والخطة الناتجة أجهزةٌ بالكتالوج لا بالادّعاء', E.planIsAllMachines(afterPlan))

  // (ب) العيب المرصود بعينه: إعادة توليد من **نفس الملف** ⇒ مخرَج مطابق بايتًا.
  const noopOutcome = E.machineConversionOutcome(converted, afterPlan, afterPlan)
  check('تحويلٌ لم يغيّر شيئًا ⇒ ليس machines_converted، و`changed=false`',
    noopOutcome.code !== 'machines_converted' && noopOutcome.changed === false && noopOutcome.changedExercises === 0)
  check('وسببه يُقال بالاسم: الخطة أجهزةٌ أصلًا (machines_already)', noopOutcome.code === 'machines_already')

  // (ج) بيئة بلا أجهزة: لا ندّعي «أجهزة» ولا نلوم المستخدم.
  const homeProfile = profile({ gymAccess: 'home', gymType: 'home', workoutEnvironment: 'home', equipment: ['dumbbell', 'bench', 'bands'] })
  const homePlan = E.generatePlan(homeProfile).workoutPlan
  const homeOutcome = E.machineConversionOutcome(homeProfile, homePlan, homePlan)
  check('أدوات بلا أجهزة ⇒ machines_unavailable لا machines_already',
    homeOutcome.code === 'machines_unavailable' && homeOutcome.changed === false)

  // (د) الفرع المغلق لا يُصاب في مسار سليم.
  check('`machines_no_effect` لم يُصَب في أي مسار سليم (فرع مغلق لا حالة اعتيادية)',
    ![realOutcome, noopOutcome, homeOutcome].some((o) => o.code === 'machines_no_effect'))

  // (هـ) إعادة التوليد: المولّد حتميّ ⇒ التطابق نتيجة تُشرح لا «خطة جديدة».
  const again = E.generatePlan(freeGym).workoutPlan
  const regen = E.regenerateOutcome(beforePlan, again)
  check('إعادة توليد بلا تغيّر بيانات ⇒ regenerated_identical لا «سوّينا لك خطة جديدة»',
    regen.code === 'regenerated_identical' && regen.changed === false)
  const changedProfile = profile({ trainingDays: 4, preferredDays: [0, 1, 3, 4] })
  const regen2 = E.regenerateOutcome(beforePlan, E.generatePlan(changedProfile).workoutPlan)
  check('وتغيُّر بيانات فعليّ ⇒ regenerated بعدد أيامٍ وخانات', regen2.code === 'regenerated' && regen2.changedExercises > 0)

  // (و) النصّ نفسه: لا رسالة «لم يتغيّر» تحمل علامة نجاح — في السجلّين.
  const silentCodes = ['machines_already', 'machines_unavailable', 'machines_no_effect', 'regenerated_identical', 'save_failed']
  const lying = []
  for (const lang of ['ar', 'en']) {
    for (const code of silentCodes) {
      const text = E.planCoherenceStrings[lang].outcome[code]
      if (!text || SUCCESS_MARKERS.some((re) => re.test(text.trim()))) lying.push(`${lang}.${code}`)
    }
  }
  if (lying.length) console.log(`    نصوص تدّعي: ${lying.join(', ')}`)
  check('نصّ كل نتيجة «لم يتغيّر» خالٍ من علامة النجاح — بالعربية والإنجليزية معًا', lying.length === 0)
  check('وكل رمز نتيجة له نصّ في السجلّين', ['ar', 'en'].every((l) =>
    ['machines_converted', 'machines_already', 'machines_unavailable', 'machines_no_effect', 'regenerated', 'regenerated_identical', 'save_failed']
      .every((code) => typeof E.planCoherenceStrings[l].outcome[code] === 'string' && E.planCoherenceStrings[l].outcome[code].length > 0)))

  // (ز) الشاشة الوحيدة التي تُعلن: لا تنادي النصّ الثابت القديم.
  const settings = readFileSync(resolve(root, 'src/views/SettingsView.tsx'), 'utf8')
  check('`SettingsView` لم يعد ينادي `switchMachinesSuccess`/`regenerateSuccess` الثابتين',
    !/t\.settings\.switchMachinesSuccess/.test(settings) && !/t\.settings\.regenerateSuccess/.test(settings))
  check('وصار يشتقّ الرسالة من `machineConversionOutcome`/`regenerateOutcome`',
    /machineConversionOutcome\(/.test(settings) && /regenerateOutcome\(/.test(settings) && /planCoherenceStrings/.test(settings))

  // (ح) §5 — لا شاشة نجاح قبل تأكيد الكتابة: `WriteResult` كان يُهمَل تمامًا.
  check('نتيجة كتابة فاشلة رمزها save_failed و`changed=false` (لا نجاح فوق قرص لم يُكتب)',
    E.saveFailedOutcome().code === 'save_failed' && E.saveFailedOutcome().changed === false)
  check('و`SettingsView` يفحص `WriteResult` قبل أي إعلان، في المسارين معًا',
    /const written = applyCustomization\(/.test(settings) &&
    (settings.match(/written !== 'ok'/g) || []).length === 2 &&
    !/(^|\n)\s*applyCustomization\(\{/.test(settings))
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ التأكيدات المضادّة — محاكاة الالتفاف تسقط بفحص مسمّى')
// ═══════════════════════════════════════════════════════════════════════════

{
  // (١) D5: لو أُلغيت المرساة (سلوك ما قبل الإصلاح) لعادت «اليوم ٤».
  const plan4 = E.generatePlan(profile({ trainingDays: 4, preferredDays: [0, 1, 3, 4] })).workoutPlan
  const unanchored = E.suggestedSchedule(plan4, 4, 6) // بلا startDate — الشكل القديم
  const wednesday = 3
  const anchored = E.suggestedSchedule(plan4, 4, 6, { startDate: new Date(2026, 6, 22, 12) }) // أربعاء
  check('محاكاة إلغاء المرساة: الجدول غير المرسى يعطي الأربعاء فهرسًا ≠ ٠ (العيب يُعاد إنتاجه)',
    unanchored.weekdays[wednesday] !== 'rest' && unanchored.weekdays[wednesday] !== 0)
  check('والمرسى على الأربعاء يعطيه ٠ — فالفارق من المرساة لا من الصدفة', anchored.weekdays[wednesday] === 0)

  // (٢) D6: كاشف الخلط نفسه يجب أن يستطيع الفشل.
  const fakePushDay = {
    id: 'gen-1-push', nameAr: 'مزيّف', nameEn: 'fake',
    exercises: [
      { id: 'a', exerciseId: 'barbell-bench-press', sets: 3, reps: '8', restSec: 90, startingWeight: '', notes: '', order: 0 },
      { id: 'b', exerciseId: 'barbell-row', sets: 3, reps: '8', restSec: 90, startingWeight: '', notes: '', order: 1 },
    ],
  }
  const detected = polarityViolations({ templateId: 'x', days: [fakePushDay] })
  check('محاكاة تسريب قطبية: يوم دفعٍ فيه تجديف يُكشف بفحص مسمّى لا باستثناء',
    detected.length === 1 && detected[0].includes('barbell-row') && detected[0].includes('gen-1-push'))
  const fakePullDay = { ...fakePushDay, id: 'gen-2-pull', exercises: [
    { ...fakePushDay.exercises[1], exerciseId: 'barbell-row' },
    { ...fakePushDay.exercises[0], exerciseId: 'front-raise' },
  ] }
  const detected2 = polarityViolations({ templateId: 'x', days: [fakePullDay] })
  check('ومحاكاة العيب الأصلي حرفيًا: «رفرفة أمامي» في يوم سحبٍ حقيقي تُكشف باسمها',
    detected2.length === 1 && detected2[0].includes('front-raise'))
  check('ولا يُكشف يومٌ نظيف (الكاشف لا يصرخ بلا سبب)',
    polarityViolations({ templateId: 'x', days: [{ ...fakePushDay, exercises: [fakePushDay.exercises[0]] }] }).length === 0)

  // (٣) D6: حارس الاستنفاد يجب أن يسمّي عزل كتفٍ جديدًا غير مصنَّف.
  const smuggled = { id: 'smuggled-delt-raise', primaryMuscle: 'shoulders', movementPattern: 'isolation' }
  const smuggledUnclassified = [...E.exercises, smuggled]
    .filter((ex) => ex.primaryMuscle === 'shoulders' && ex.movementPattern === 'isolation')
    .filter((ex) => !E.POSTERIOR_DELT_IDS.has(ex.id) && !E.ANTERIOR_LATERAL_DELT_IDS.has(ex.id))
  check('محاكاة تهريب عزل كتف جديد: حارس الاستنفاد يسمّيه بمعرّفه',
    smuggledUnclassified.length === 1 && smuggledUnclassified[0].id === 'smuggled-delt-raise')

  // (٤) D2: ماسح النماذج الشاردة يجب أن يمسك نموذجًا ثانيًا مزروعًا.
  const plantedA = [{ rel: 'src/views/FakeView.tsx', text: 'const durationMin = Math.max(20, Math.round((total * 9) / 5) * 5)\n' }]
  const plantedB = [{ rel: 'src/lib/fakeStats.ts', text: 'const sec = day.exercises.reduce((s, pe) => s + pe.sets * (40 + pe.restSec), 0)\n' }]
  const caughtA = scanDurationFormulas(plantedA)
  const caughtB = scanDurationFormulas(plantedB)
  check('محاكاة نموذج مدّة ثانٍ (الشكل المتقاعد): يُمسك باسم نمطه',
    caughtA.length === 1 && caughtA[0].includes('الشكل المتقاعد'))
  check('محاكاة نموذج مدّة ثانٍ (مجموعات × عمل+راحة): يُمسك باسم نمطه',
    caughtB.length === 1 && caughtB[0].includes('مجموعات × (عمل + راحة)'))
  check('والماسح لا يمسك السلطة نفسها ولا التعليقات التي تشرح النموذج',
    scanDurationFormulas([{ rel: DURATION_AUTHORITY, text: plantedB[0].text }]).length === 0 &&
    scanDurationFormulas([{ rel: 'src/lib/x.ts', text: '// كان: Math.max(20, Math.round((total * 9) / 5) * 5)\n' }]).length === 0)

  // (٥) D7: كاشف الادّعاء يجب أن يمسك نصًّا يقول «تم» في حالة «لم يتغيّر».
  const lyingText = 'تم — خطتك التلقائية صارت بنسخة الأجهزة.'
  const honestText = E.planCoherenceStrings.ar.outcome.machines_already
  check('محاكاة رسالة كاذبة: نصّ «تم —» في حالة «لم يتغيّر» يُكشف بفحص العلامة',
    SUCCESS_MARKERS.some((re) => re.test(lyingText.trim())) && !SUCCESS_MARKERS.some((re) => re.test(honestText.trim())))

  // (٦) D7: مُصنِّف النتيجة لا يستطيع قول «تحوّلت» على خطتين متطابقتين.
  const p = profile()
  const base = E.generatePlan(p).workoutPlan
  const mutated = { ...base, days: base.days.map((d, i) => (i === 0 ? { ...d, exercises: d.exercises.slice(1) } : d)) }
  check('محاكاة نقض المصنِّف: خطتان متطابقتان ⇒ لا machines_converted أبدًا',
    E.machineConversionOutcome(p, base, base).code !== 'machines_converted' &&
    E.machineConversionOutcome(p, base, mutated).changed === true)
  check('و`diffWorkoutPlans` يعدّ الفرق لا يكتفي بوجوده', E.diffWorkoutPlans(base, mutated).changedExercises > 0 && E.diffWorkoutPlans(base, base).changedExercises === 0)
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────')
if (fail === 0) {
  console.log(`✅ تماسك الخطة: ${pass} فحصًا، 0 فشل.`)
} else {
  console.log(`❌ تماسك الخطة: ${pass} نجحت · ${fail} فشلت`)
  failures.forEach((f) => console.log(`   - ${f}`))
  process.exitCode = 1
}
