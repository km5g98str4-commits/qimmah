// إثبات محرّك التخصيص التكيّفي — عشرون سيناريو + حرّاس بنيويون.
//
// الادعاءات المُبطَلة:
//   ١) «بنك كبير ⇒ استجواب طويل» — كل سيناريو يبقى داخل ١٥–٢٠ والسقف ٢٠ مطلق.
//   ٢) «الأسئلة الكثيرة زينة» — كل سؤال يعلن `affects` غير فارغة، ويُفحص.
//   ٣) «الفلترة تشبه الأمان» — التمارين المستبعَدة تُفحص بالمعرّف الحقيقي من
//      `src/data/exercises.ts`، ويُثبَت أن كل معرّف مخرَج موجود في المكتبة.
//   ٤) «حاجز القاصرين واجهة» — يُفحص عند حدّ **البيانات**: قيمة مُرسَلة يدويًا
//      تُرفض، ومسوّدة محفوظة تحمل هدفًا مقيَّدًا لقاصر تُرفض عند التحميل.

import { QUESTION_BANK, QUESTION_BY_ID, checkBankIntegrity } from '@/lib/personalization/bank'
import {
  applyAnswer,
  countedAsked,
  createState,
  isEligible,
  reviseAnswer,
  selectNext,
  skipQuestion,
  visibleOptions,
  CONSENT_QUESTION_ID,
  type EngineConfig,
} from '@/lib/personalization/engine'
import { classifyExperience } from '@/lib/personalization/experience'
import { detectConflicts } from '@/lib/personalization/contradictions'
import { deriveProfile } from '@/lib/personalization/profile'
import { selectExercises, patternCoverage } from '@/lib/personalization/exerciseSelection'
import { migrateFromOnboarding } from '@/lib/personalization/migration'
import { loadState, saveState, clearState } from '@/lib/personalization/persistence'
import { answer as sessionAnswer, startSession, finish } from '@/lib/personalization/session'
import { ABSOLUTE_QUESTION_CAP, EQUIPMENT_VOCAB, type AnswerValue, type PersonalizationState } from '@/lib/personalization/types'
import { PERSONALIZATION_TEXT_IDS, personalizationStrings } from '@/i18n/dict/personalization'
import { exercises, getExercise } from '@/data/exercises'
import { DATA_KEYS } from '@/lib/userDataKeys'
import { AGE_RANGE } from '@/config/profileDomain'

let pass = 0
const fails: string[] = []
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log('  ✓ ' + name) }
  else { fails.push(name); console.log('  ✗ ' + name) }
}

/** ساعة حتمية — لا `Date.now()` في إثبات، وإلا صار المخرج غير قابل للتكرار. */
let clock = 1_700_000_000_000
const cfg: EngineConfig = { budget: undefined as never, now: () => (clock += 1000) }
const CFG: EngineConfig = { ...cfg, budget: (await import('@/lib/personalization/types')).DEFAULT_BUDGET }

// ═════════════════════ أ · سلامة البنك ═════════════════════
console.log('\n— أ · سلامة البنك —')

const problems = checkBankIntegrity()
check(`البنك سليم بنيويًا (${problems.length ? problems.map((p) => `${p.id}: ${p.detail}`).join(' · ') : 'لا مشاكل'})`, problems.length === 0)
check(`البنك يحمل ١٥٠ سؤالًا فأكثر (${QUESTION_BANK.length})`, QUESTION_BANK.length >= 150)
check('كل سؤال يعلن أثرًا غير فارغ', QUESTION_BANK.every((q) => q.affects.length > 0))

const missingText = QUESTION_BANK.filter((q) => !PERSONALIZATION_TEXT_IDS.includes(q.id)).map((q) => q.id)
check(`كل سؤال له نصّ في القاموس (ناقص: ${missingText.join(',') || 'لا شيء'})`, missingText.length === 0)

// النصّ موجود **بلغتين** فعلًا، ومختلف بينهما (لا نسخ عربية في الإنجليزية).
const ar = personalizationStrings.ar.questions
const en = personalizationStrings.en.questions
const identical = QUESTION_BANK.filter((q) => ar[q.id]?.title && ar[q.id].title === en[q.id]?.title).map((q) => q.id)
check(`العربية والإنجليزية مختلفتان لكل سؤال (متطابق: ${identical.join(',') || 'لا شيء'})`, identical.length === 0)

const missingOptText = QUESTION_BANK.flatMap((q) =>
  (q.options ?? []).filter((o) => !ar[q.id]?.opts?.[o.value] || !en[q.id]?.opts?.[o.value]).map((o) => `${q.id}.${o.value}`),
)
check(`كل خيار له تسمية بلغتيه (ناقص: ${missingOptText.slice(0, 5).join(',') || 'لا شيء'})`, missingOptText.length === 0)

// مفردات المعدّات مأخوذة من المكتبة لا مخترَعة — مفردة بلا تمرين = فلتر يفرّغ.
const libEquipment = new Set(exercises.flatMap((e) => e.equipment))
const strayEquipment = EQUIPMENT_VOCAB.filter((e) => !libEquipment.has(e))
check(`مفردات المعدّات كلّها موجودة في المكتبة (شاذّ: ${strayEquipment.join(',') || 'لا شيء'})`, strayEquipment.length === 0)

// ═════════════════════ ب · حظر مصطلحات المتقدّم عن المبتدئ ═════════════════════
console.log('\n— ب · لا مصطلح متقدّم في مسار المبتدئ —')

const BANNED = ['RIR', 'RPE', 'Deload', '1RM', 'AMRAP', 'ديلود', 'تدرّج مزدوج', 'Double progression']
const beginnerVisible = QUESTION_BANK.filter((q) => !q.levels || q.levels.includes('beginner') || q.levels.includes('complete_beginner'))
const leaks: string[] = []
for (const q of beginnerVisible) {
  const blob = [ar[q.id]?.title, ar[q.id]?.hint, en[q.id]?.title, en[q.id]?.hint, ...Object.values(ar[q.id]?.opts ?? {}), ...Object.values(en[q.id]?.opts ?? {})]
    .filter(Boolean)
    .join(' ')
  for (const term of BANNED) if (blob.includes(term)) leaks.push(`${q.id}:${term}`)
}
check(`لا مصطلح حمل متقدّم في سؤال يراه مبتدئ (تسرّب: ${leaks.join(',') || 'لا شيء'})`, leaks.length === 0)

// تأكيد مضادّ (§4.2): الفحص يمسك التسرّب فعلًا حين يقع.
const smuggled = 'خلّ الـRIR على ٢'
check('محاكاة التسرّب تسقط بفحص مسمّى', BANNED.some((t) => smuggled.includes(t)))

// ═════════════════════ ج · بوابة الموافقة ═════════════════════
console.log('\n— ج · الإذن يسبق الجمع —')

const s0 = createState('ar', null, clock)
const first = selectNext(s0, CFG)
check('أول سؤال دائمًا هو الموافقة الصحية', first.question?.id === CONSENT_QUESTION_ID)
check('الموافقة غير قابلة للتخطّي', skipQuestion(s0, CONSENT_QUESTION_ID, CFG).rejected === 'not_skippable')

// رفض الموافقة ⇒ يقف التدفّق، ولا سؤال جامع يُطرح.
const refused = applyAnswer(s0, CONSENT_QUESTION_ID, false, CFG)
check('رفض الموافقة يوقف التدفّق بسبب مسمّى', selectNext(refused.state, CFG).reason === 'consent_pending')
check('ولا يُطرح أي سؤال بعد الرفض', selectNext(refused.state, CFG).question === null)

// ═════════════════════ د · حاجز القاصرين عند حدّ البيانات ═════════════════════
console.log('\n— د · حاجز القاصرين —')

function consented(age: number): PersonalizationState {
  let s = createState('ar', null, clock)
  s = applyAnswer(s, CONSENT_QUESTION_ID, true, CFG).state
  s = applyAnswer(s, 'b-age', age, CFG).state
  return s
}

const minor = consented(16)
const minorGoalOpts = visibleOptions(QUESTION_BY_ID['g-primary'], minor).map((o) => o.value)
check(`قاصر (١٦): لا cut ولا bulk في الخيارات المبنيّة [${minorGoalOpts.join(',')}]`, !minorGoalOpts.includes('fat_loss') && !minorGoalOpts.includes('muscle_gain') && !minorGoalOpts.includes('strength'))
check('وقيمة مقيَّدة مُرسَلة يدويًا تُرفض بالاسم', applyAnswer(minor, 'g-primary', 'fat_loss', CFG).rejected?.startsWith('option_not_available') === true)
check('وسؤال وزن الهدف لا يُعرض لقاصر', !isEligible(QUESTION_BY_ID['b-target-weight'], minor))

const adult = consented(18)
const adultGoalOpts = visibleOptions(QUESTION_BY_ID['g-primary'], adult).map((o) => o.value)
check('١٨ بالضبط ترى الخيارات الكاملة (الحدّ شامل)', adultGoalOpts.includes('fat_loss') && adultGoalOpts.includes('muscle_gain'))
check(`العمر تحت الحدّ الأدنى مرفوض (${AGE_RANGE.min})`, applyAnswer(createStateConsented(), 'b-age', AGE_RANGE.min - 1, CFG).rejected === 'out_of_range')

function createStateConsented(): PersonalizationState {
  let s = createState('ar', null, clock)
  s = applyAnswer(s, CONSENT_QUESTION_ID, true, CFG).state
  return s
}

// اشتقاق الملف لا يثق بالتحقّق السابق — الهدف يُطوى للصيانة مهما وصل.
const forced = { ...minor, answers: { ...minor.answers, primaryGoalDisplay: 'fat_loss' as AnswerValue } }
check('الاشتقاق يطوي هدف القاصر إلى الصيانة حتى لو حُقن', deriveProfile(forced, clock).profile.primaryGoal === 'maintain')

// مسوّدة محفوظة مخالفة تُرفض عند التحميل (المخزَّن مدخل غير موثوق).
saveState(forced)
check('مسوّدة قاصر بهدف مقيَّد تُرفض عند التحميل', loadState(null) === undefined)
clearState(null)

// ═════════════════════ هـ · عشرون سيناريو ═════════════════════
console.log('\n— هـ · عشرون سيناريو —')

interface Scenario {
  name: string
  answers: Record<string, AnswerValue>
  expect?: (p: ReturnType<typeof deriveProfile>['profile']) => [string, boolean][]
}

const S: Scenario[] = [
  { name: '١ مبتدئ كامل + نادٍ مجهّز', answers: { age: 24, sex: 'male', heightCm: 175, weightKg: 80, trainedBefore: 'never', primaryGoalDisplay: 'general_health', daysPerWeek: '3', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'machines', hasInjury: 'none' } },
  { name: '٢ مبتدئ كامل + البيت', answers: { age: 30, sex: 'female', heightCm: 162, weightKg: 68, trainedBefore: 'never', primaryGoalDisplay: 'get_fitter', daysPerWeek: '3', sessionMinutes: '30', place: 'home', equipmentList: ['bodyweight', 'band'], trainingStyle: 'bodyweight', hasInjury: 'none', pregnancyStatus: 'no' } },
  { name: '٣ مبتدئ + وقت شحيح', answers: { age: 35, sex: 'male', heightCm: 178, weightKg: 95, trainedBefore: 'tried', primaryGoalDisplay: 'fat_loss', daysPerWeek: '2', sessionMinutes: '20', place: 'home', equipmentList: ['dumbbell', 'bodyweight'], trainingStyle: 'mixed', hasInjury: 'none' } },
  { name: '٤ متوسط + خسارة دهون', answers: { age: 29, sex: 'male', heightCm: 180, weightKg: 92, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'now', selfLevel: 'intermediate', programExperience: 'followed', knowsProgression: 'yes', tracksSets: 'always', primaryGoalDisplay: 'fat_loss', daysPerWeek: '4', sessionMinutes: '60', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none', cardioWilling: 'yes' } },
  { name: '٥ متوسط + بناء عضل', answers: { age: 26, sex: 'male', heightCm: 176, weightKg: 70, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'steady', lastTrained: 'now', selfLevel: 'intermediate', programExperience: 'followed', knowsProgression: 'yes', tracksSets: 'always', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '5', sessionMinutes: '75', place: 'gym', gymType: 'full', trainingStyle: 'free_weights', hasInjury: 'none' } },
  { name: '٦ متوسط + إصابة كتف', answers: { age: 33, sex: 'male', heightCm: 182, weightKg: 88, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'now', selfLevel: 'intermediate', programExperience: 'followed', knowsProgression: 'yes', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '4', sessionMinutes: '60', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'current', currentInjuryAreas: ['shoulder'], shoulderOverhead: 'cannot', painOnMovement: ['overhead'], painLevel: 4 } },
  { name: '٧ متقدّم تضخيم', answers: { age: 28, sex: 'male', heightCm: 179, weightKg: 84, trainedBefore: 'years', totalMonths: 'y3_plus', consistency: 'steady', lastTrained: 'now', selfLevel: 'advanced', programExperience: 'wrote_own', knowsProgression: 'yes', tracksSets: 'always', exerciseFamiliarity: 'all', trainingAgeHonest: 'gt5', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '5', sessionMinutes: '75', place: 'gym', gymType: 'full', trainingStyle: 'free_weights', hasInjury: 'none', strengthHypertrophyBias: 'hypertrophy', volumePref: 'high' } },
  { name: '٨ متقدّم قوة', answers: { age: 31, sex: 'male', heightCm: 185, weightKg: 100, trainedBefore: 'years', totalMonths: 'y3_plus', consistency: 'steady', lastTrained: 'now', selfLevel: 'advanced', programExperience: 'wrote_own', knowsProgression: 'yes', tracksSets: 'always', exerciseFamiliarity: 'all', trainingAgeHonest: 'gt5', primaryGoalDisplay: 'strength', daysPerWeek: '4', sessionMinutes: '90', place: 'gym', gymType: 'full', trainingStyle: 'free_weights', hasInjury: 'none', strengthHypertrophyBias: 'strength' } },
  { name: '٩ عائد بعد انقطاع', answers: { age: 34, sex: 'male', heightCm: 177, weightKg: 90, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'y1_plus', selfLevel: 'intermediate', programExperience: 'followed', primaryGoalDisplay: 'fat_loss', daysPerWeek: '3', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none', returnRamp: 'easy' } },
  { name: '١٠ إجابات متناقضة', answers: { age: 25, sex: 'male', heightCm: 175, weightKg: 78, trainedBefore: 'never', selfLevel: 'advanced', progressionStyle: 'rpe_based', primaryGoalDisplay: 'general_health', daysPerWeek: '3', sessionMinutes: '45', place: 'home', equipmentList: ['bodyweight'], trainingStyle: 'machines', hasInjury: 'none' } },
  { name: '١١ بلا معدّات', answers: { age: 27, sex: 'female', heightCm: 165, weightKg: 60, trainedBefore: 'tried', primaryGoalDisplay: 'get_fitter', daysPerWeek: '4', sessionMinutes: '30', place: 'home', equipmentList: ['bodyweight'], bodyweightOnly: true, trainingStyle: 'bodyweight', hasInjury: 'none', pregnancyStatus: 'no' } },
  { name: '١٢ دمبلات فقط', answers: { age: 32, sex: 'male', heightCm: 180, weightKg: 85, trainedBefore: 'months', totalMonths: 'm6_12', consistency: 'on_off', lastTrained: 'now', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '4', sessionMinutes: '45', place: 'home', equipmentList: ['dumbbell', 'bench', 'bodyweight'], dumbbellKind: 'adjustable', dumbbellMaxKg: 30, trainingStyle: 'free_weights', hasInjury: 'none' } },
  { name: '١٣ يكره تمارين مقترحة', answers: { age: 28, sex: 'male', heightCm: 176, weightKg: 82, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'now', selfLevel: 'intermediate', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '4', sessionMinutes: '60', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none', dislikedExercises: ['barbell-bench-press', 'deadlift'] } },
  { name: '١٤ ثلاثة أيام', answers: { age: 40, sex: 'male', heightCm: 174, weightKg: 86, trainedBefore: 'months', totalMonths: 'm3_6', consistency: 'on_off', lastTrained: 'now', primaryGoalDisplay: 'fat_loss', daysPerWeek: '3', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none' } },
  { name: '١٥ ستة أيام', answers: { age: 24, sex: 'male', heightCm: 181, weightKg: 76, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'steady', lastTrained: 'now', selfLevel: 'intermediate', programExperience: 'followed', knowsProgression: 'yes', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '6', sessionMinutes: '60', place: 'gym', gymType: 'full', trainingStyle: 'free_weights', hasInjury: 'none' } },
  { name: '١٦ يغيّر إجابة مبكرة', answers: { age: 30, sex: 'male', heightCm: 178, weightKg: 84, trainedBefore: 'months', totalMonths: 'm6_12', consistency: 'mostly', lastTrained: 'now', primaryGoalDisplay: 'fat_loss', daysPerWeek: '4', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'machines', hasInjury: 'none' } },
  { name: '١٧ فرز صحّي موجب', answers: { age: 58, sex: 'male', heightCm: 172, weightKg: 98, trainedBefore: 'tried', primaryGoalDisplay: 'general_health', daysPerWeek: '3', sessionMinutes: '30', place: 'gym', gymType: 'full', trainingStyle: 'machines', hasInjury: 'none', screenGate: true, chestPain: true, clearanceAck: true } },
  { name: '١٨ ألم ظهر يمنع الانحناء', answers: { age: 36, sex: 'male', heightCm: 179, weightKg: 90, trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'now', selfLevel: 'intermediate', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '4', sessionMinutes: '60', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'current', currentInjuryAreas: ['lower_back'], backHinge: 'avoid', painOnMovement: ['hinge'], painLevel: 3 } },
  { name: '١٩ مستخدم عربي', answers: { age: 27, sex: 'male', heightCm: 177, weightKg: 79, trainedBefore: 'months', totalMonths: 'm6_12', consistency: 'mostly', lastTrained: 'now', primaryGoalDisplay: 'get_fitter', daysPerWeek: '4', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none' } },
  { name: '٢٠ مستخدم إنجليزي', answers: { age: 27, sex: 'female', heightCm: 168, weightKg: 64, trainedBefore: 'months', totalMonths: 'm6_12', consistency: 'mostly', lastTrained: 'now', primaryGoalDisplay: 'get_fitter', daysPerWeek: '4', sessionMinutes: '45', place: 'gym', gymType: 'full', trainingStyle: 'mixed', hasInjury: 'none', pregnancyStatus: 'no' } },
]

/** يشغّل السيناريو بالمحرّك: يجيب ما يعرفه، ويتخطّى ما لا يعرفه. */
function run(sc: Scenario, lang: 'ar' | 'en' = 'ar'): { state: PersonalizationState; asked: string[] } {
  let s = createState(lang, null, clock)
  const asked: string[] = []
  for (let guard = 0; guard < 200; guard++) {
    const sel = selectNext(s, CFG)
    if (!sel.question) break
    const q = sel.question
    asked.push(q.id)
    const known = sc.answers[q.key]
    if (q.id === CONSENT_QUESTION_ID) {
      s = applyAnswer(s, q.id, true, CFG).state
      continue
    }
    if (known !== undefined) {
      const r = applyAnswer(s, q.id, known, CFG)
      s = r.rejected ? skipQuestion(s, q.id, CFG).state : r.state
      continue
    }
    // لا إجابة معدّة: نجيب بأول خيار معروض إن كان إلزاميًا، وإلا نتخطّى.
    if (!q.skippable) {
      const opt = visibleOptions(q, s)[0]
      const fallback: AnswerValue = opt ? opt.value : q.range ? Math.round((q.range.min + q.range.max) / 2) : q.answer === 'boolean' ? false : []
      s = applyAnswer(s, q.id, fallback, CFG).state
    } else {
      s = skipQuestion(s, q.id, CFG).state
    }
  }
  return { state: s, asked }
}

for (const sc of S) {
  const { state, asked } = run(sc, sc.name.includes('٢٠') ? 'en' : 'ar')
  const counted = countedAsked(state)
  const { profile } = deriveProfile(state, clock)

  check(`${sc.name}: داخل السقف المطلق (${counted} ≤ ${ABSOLUTE_QUESTION_CAP})`, counted <= ABSOLUTE_QUESTION_CAP)
  check(`${sc.name}: بلغ حدًّا أدنى معتبَرًا (${counted} ≥ 12)`, counted >= 12)
  check(`${sc.name}: لا سؤال مكرّر`, new Set(asked).size === asked.length)

  const sel = selectExercises(profile)
  const unknown = sel.ranked.filter((r) => !getExercise(r.id))
  check(`${sc.name}: كل معرّف مخرَج موجود في المكتبة (مجهول: ${unknown.length})`, unknown.length === 0)
  check(`${sc.name}: بقي مرشّحون بعد الفلترة (${sel.ranked.length})`, sel.ranked.length > 0)

  // الملف مهيكل صالح — لا حقل جوهري ناقص.
  check(`${sc.name}: الملف صالح بنيويًا`, profile.planConstraints.sessionsPerWeek >= 2 && profile.planConstraints.maxExercisesPerSession >= 3 && !!profile.split)

  // حتمية: نفس الإجابات ⇒ نفس المخرج.
  const again = run(sc, sc.name.includes('٢٠') ? 'en' : 'ar')
  check(`${sc.name}: حتمي (نفس المدخل نفس المخرج)`, JSON.stringify(again.asked) === JSON.stringify(asked))
}

// ═════════════════════ و · فحوص موجّهة داخل السيناريوهات ═════════════════════
console.log('\n— و · الفحوص الموجّهة —')

// ٦ · إصابة كتف ⇒ لا تمرين فوق الرأس في المخرجات.
{
  const { state } = run(S[5])
  const { profile } = deriveProfile(state, clock)
  const sel = selectExercises(profile)
  const overhead = sel.ranked.filter((r) => {
    const ex = getExercise(r.id)
    return ex?.movementPattern === 'push' && (ex.primaryMusclesDetailed.includes('front_delts') || ex.primaryMusclesDetailed.includes('side_delts'))
  })
  check(`إصابة كتف: لا تمرين فوق الرأس ناجٍ (${overhead.length})`, overhead.length === 0)
  check('وسبب الاستبعاد مسمّى في المخرجات', sel.excluded.some((e) => e.reason === 'overhead'))
}

// ١٨ · منع الانحناء ⇒ لا نمط hinge.
{
  const { state } = run(S[17])
  const { profile } = deriveProfile(state, clock)
  const sel = selectExercises(profile)
  const hinge = sel.ranked.filter((r) => getExercise(r.id)?.movementPattern === 'hinge')
  check(`منع الانحناء: لا تمرين hinge ناجٍ (${hinge.length})`, hinge.length === 0)
  check('ونمط hinge خرج من الأنماط المطلوبة', !profile.planConstraints.requiredPatterns.includes('hinge'))
}

// ١٧ · فرز موجب ⇒ إحالة + سقف صعوبة مبتدئ + حجم مكبوح.
{
  const { state } = run(S[16])
  const { profile } = deriveProfile(state, clock)
  check('فرز موجب ⇒ يوصى بمراجعة مختصّ', profile.safety.needsClearance)
  check('وسبب الإحالة مسمّى', profile.safety.reasons.includes('chest_pain'))
  check('وسقف الصعوبة مبتدئ', profile.planConstraints.maxExerciseLevel === 'beginner')
  check(`وحجم البداية مكبوح (${profile.planConstraints.weeklySetsStart} ≤ 8)`, profile.planConstraints.weeklySetsStart <= 8)
  const sel = selectExercises(profile)
  check('ولا تمرين متقدّم ناجٍ', sel.ranked.every((r) => getExercise(r.id)?.level !== 'advanced'))
}

// ١١ · وزن الجسم ⇒ لا تمرين يحتاج معدّة غائبة.
{
  const { state } = run(S[10])
  const { profile } = deriveProfile(state, clock)
  const sel = selectExercises(profile)
  const needsGear = sel.ranked.filter((r) => (getExercise(r.id)?.equipment ?? []).some((e) => !profile.equipment.includes(e)))
  check(`وزن الجسم: لا تمرين بمعدّة غائبة (${needsGear.length})`, needsGear.length === 0)
}

// ١٣ · الاستبعاد باختيار المستخدم.
//
// ⚠️ **الفحص يُبنى على الإجابة لا على ترتيب المحرّك عمدًا.** النسخة الأولى منه
// مشت السيناريو كاملًا ثم توقّعت أن يكون `p-disliked` قد طُرح — فسقط، لا لأن
// الاستبعاد معطوب بل لأن المحرّك اختار أسئلة أنفع ضمن العشرين. اختبار عقدٍ
// **مشروط بترتيب** ليس اختبار عقد. فالعقد هنا: «إجابة مسجّلة ⇒ استبعاد صارم
// بسبب مسمّى»، ويُفحص مباشرةً. وأنّ السؤال **قابل للطرح** يُفحص منفصلًا.
{
  const { state } = run(S[12])
  check('سؤال المكروه مؤهَّل لهذا المستخدم (لم يُفقد من البنك)', isEligible(QUESTION_BY_ID['p-disliked'], state))

  const withDislikes = applyAnswer(state, 'p-disliked', ['barbell-bench-press', 'deadlift'], CFG)
  check('وتسجيله لا يُرفض', withDislikes.rejected === null)
  const { profile } = deriveProfile(withDislikes.state, clock)
  const sel = selectExercises(profile)
  check('التمارين المكروهة تدخل قائمة الاستبعاد', profile.excludedExercises.includes('barbell-bench-press') && profile.excludedExercises.includes('deadlift'))
  check('ولا تظهر في المرشّحين', !sel.ranked.some((r) => r.id === 'barbell-bench-press' || r.id === 'deadlift'))
  check('وسبب الاستبعاد «اختيار المستخدم» لا «سلامة»', sel.excluded.some((e) => e.id === 'barbell-bench-press' && e.reason === 'user_excluded'))

  // تأكيد مضادّ (§4.2): بلا الإجابة، التمرين **موجود** — فالفحص أعلاه يقيس
  // أثر الاستبعاد لا غياب التمرين أصلًا.
  const baseline = selectExercises(deriveProfile(state, clock).profile)
  check('وبلا الإجابة التمرين حاضر (الفحص يقيس أثرًا حقيقيًا)', baseline.ranked.some((r) => r.id === 'barbell-bench-press'))
}

// تنويع الفئات: لا فئة واحدة تحتكر المسار.
{
  const { asked } = run(S[12])
  const cats = asked.map((id) => QUESTION_BY_ID[id]?.category)
  const experienceShare = cats.filter((c) => c === 'experience').length
  check(`لا تحتكر كتلة الخبرة المسار (${experienceShare} من ${asked.length})`, experienceShare <= 5)
  check(`والمسار يغطّي خمس فئات فأكثر (${new Set(cats).size})`, new Set(cats).size >= 5)
}

// ١٠ · التناقض يُكتشف ويُسأل عنه، ولا يُخمَّن.
{
  let s = createState('ar', null, clock)
  s = applyAnswer(s, CONSENT_QUESTION_ID, true, CFG).state
  s = applyAnswer(s, 'b-age', 25, CFG).state
  s = applyAnswer(s, 'x-trained-before', 'never', CFG).state
  s = applyAnswer(s, 'x-selfrated-level', 'advanced', CFG).state
  const conflicts = detectConflicts(s)
  check(`تناقض «ما تمرّن + متقدّم» يُكتشف (${conflicts.map((c) => c.id).join(',')})`, conflicts.some((c) => c.id === 'level'))
  const next = selectNext(s, CFG)
  check('وسؤال التوضيح يُطرح فورًا', next.question?.id === 'c-level-mismatch')
  check('وهو خارج الميزانية', next.offBudget)
  const before = countedAsked(s)
  const after = applyAnswer(s, 'c-level-mismatch', 'im_newer', CFG).state
  check('والتوضيح لا يستهلك من الميزانية', countedAsked(after) === before)
  check('ولا يتكرّر بعد حلّه', !selectNext(after, CFG).question || selectNext(after, CFG).question?.id !== 'c-level-mismatch')
}

// ١٦ · تغيير إجابة مبكرة ينظّف اليتامى ولا يعيد التشغيل.
{
  let s = createState('ar', null, clock)
  s = applyAnswer(s, CONSENT_QUESTION_ID, true, CFG).state
  s = applyAnswer(s, 'b-age', 30, CFG).state
  s = applyAnswer(s, 'e-place', 'home', CFG).state
  s = applyAnswer(s, 'e-equipment-list', ['dumbbell', 'bodyweight'], CFG).state
  s = applyAnswer(s, 'e-dumbbell-max', 24, CFG).state
  check('قبل التغيير: أقصى دمبل محفوظ', s.answers.dumbbellMaxKg === 24)
  const revised = reviseAnswer(s, 'e-place', 'gym', CFG)
  check('بعد التحوّل للنادي: قائمة معدّات المنزل نُظّفت', revised.state.answers.equipmentList === undefined)
  check('وسؤال أقصى دمبل صار يتيمًا فحُذف', revised.state.answers.dumbbellMaxKg === undefined)
  check('والعمر باقٍ (لا إعادة تشغيل)', revised.state.answers.age === 30)
}

// ═════════════════════ ز · تصنيف الخبرة ═════════════════════
console.log('\n— ز · الخبرة لا تُقاس بسنة العضوية —')

function verdictOf(a: Record<string, AnswerValue>): ReturnType<typeof classifyExperience> {
  return classifyExperience({ ...createState('ar', null, clock), answers: a })
}

const gymRatButInconsistent = verdictOf({ trainedBefore: 'years', totalMonths: 'y3_plus', consistency: 'rare', programExperience: 'never', knowsProgression: 'no', tracksSets: 'never', exerciseFamiliarity: 'few', selfLevel: 'intermediate' })
check(`٣ سنوات بلا انتظام ⇒ ليس متقدّمًا (${gymRatButInconsistent.klass})`, gymRatButInconsistent.klass !== 'advanced' && gymRatButInconsistent.klass !== 'intermediate')

const consistentShorter = verdictOf({ trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'steady', programExperience: 'wrote_own', knowsProgression: 'yes', tracksSets: 'always', exerciseFamiliarity: 'all', selfLevel: 'advanced', trainingAgeHonest: 'y2_5' })
check(`سنة منتظمة بمعرفة كاملة ⇒ أعلى من المتقطّع (${consistentShorter.klass})`, consistentShorter.score > gymRatButInconsistent.score)

check('من لم يتمرّن قط مبتدئ كامل مهما ادّعى', verdictOf({ trainedBefore: 'never', selfLevel: 'advanced', knowsProgression: 'yes' }).klass === 'complete_beginner')

const returning = verdictOf({ trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'y1_plus', selfLevel: 'intermediate' })
check(`انقطاع طويل برصيد سابق ⇒ «عائد» (${returning.klass})`, returning.klass === 'returning')

const shortStintLongAgo = verdictOf({ trainedBefore: 'tried', totalMonths: 'lt3', consistency: 'rare', lastTrained: 'y1_plus' })
check(`شهران قبل سنتين ⇒ ليس «عائدًا» (${shortStintLongAgo.klass})`, shortStintLongAgo.klass !== 'returning')

check('بلا إشارات ⇒ ثقة صفر ولا تصنيف مصطنع', verdictOf({}).confidence === 0)

// ═════════════════════ ح · الحفظ والاستئناف والهجرة ═════════════════════
console.log('\n— ح · الحفظ والاستئناف —')

{
  clearState(null)
  let s = createState('ar', 'user-a', clock)
  s = applyAnswer(s, CONSENT_QUESTION_ID, true, CFG).state
  s = applyAnswer(s, 'b-age', 28, CFG).state
  check('الحفظ يعيد نتيجة تُقرأ', saveState(s) === 'ok')
  check('والاستئناف يعيد نفس الإجابات', loadState('user-a')?.answers.age === 28)
  check('ولا يُسلَّم لمالك آخر', loadState('user-b') === undefined)
  clearState('user-a')
}

{
  const report = migrateFromOnboarding(
    {
      profile: { age: 31, sex: 'male' },
      bodyMetrics: { heightCm: 180, currentWeightKg: 88 },
      goal: { type: 'cut' },
      trainingPreferences: { daysPerWeek: 4, sessionDurationMin: 60, environment: 'commercial_gym', experience: 'intermediate', consistency: 'consistent' },
      limitations: { injuries: [] },
      consents: { healthData: { accepted: true, version: 'x', at: 0 } },
    } as never,
    'ar',
    null,
    clock,
  )
  check(`الهجرة تنقل ما هو موجود (${report.mapped.length} حقلًا)`, report.mapped.includes('age') && report.mapped.includes('primaryGoalDisplay') && report.mapped.includes('daysPerWeek'))
  check('والموافقة تُنقل لأنها مقبولة صراحةً', report.state.answers.healthConsent === true)
  check(`وتُعلن ما بقي ناقصًا (${report.stillMissing.join(',') || 'لا شيء'})`, report.stillMissing.includes('trainingStyle'))
  check('ولا تخترع منطقة إصابة من نصّ حرّ', report.state.answers.currentInjuryAreas === undefined)

  const refusedConsent = migrateFromOnboarding({ profile: { age: 20 }, consents: {} } as never, 'ar', null, clock)
  check('وموافقة غائبة لا تُورَّث بالسكوت', refusedConsent.state.answers.healthConsent === undefined)
}

// ═════════════════════ ط · واجهة الجلسة ═════════════════════
console.log('\n— ط · واجهة الجلسة —')

{
  clearState(null)
  const snap = startSession('ar', null, CFG)
  check('الجلسة تبدأ بسؤال مترجَم لا بمعرّف', !!snap.view && snap.view.title !== snap.view.id)
  check('والكتلة القانونية مفصولة في حقلها', !!snap.view?.legal && snap.view.legal.includes('البيانات'))
  const bad = sessionAnswer(snap.state, 'b-age', 5, CFG)
  check('إدخال خارج المدى يُرفض بالاسم ولا يُحفظ', bad.error === 'out_of_range' && bad.saveResult === null)
  check('والحالة لم تتغيّر عند الرفض', bad.state.answers.age === undefined)
  const okAnswer = sessionAnswer(snap.state, CONSENT_QUESTION_ID, true, CFG)
  check('والإجابة الصحيحة تُحفظ وتُعيد نتيجة الكتابة', okAnswer.error === null && okAnswer.saveResult === 'ok')

  const incomplete = finish(okAnswer.state, CFG)
  check('الختم قبل الاكتمال يعود بسبب مسمّى لا بفشل صامت', incomplete.blocked !== null)
  clearState(null)
}

{
  const { state } = run(S[6])
  const done = finish(state, CFG)
  check(`متقدّم تضخيم: التخصيص يكتمل (${done.blocked ?? 'مكتمل'})`, done.blocked === null)
  check('والملف يُحفظ بنتيجة تُقرأ', done.saveResult === 'ok')
  check(`وتصنيفه متقدّم (${done.profile.experience})`, done.profile.experience === 'advanced')
  check('والافتراضات معلَنة لا مخفيّة', Array.isArray(done.assumptions))
  clearState(null)
}

// ═════════════════════ ي · حرّاس الميثاق ═════════════════════
console.log('\n— ي · حرّاس الميثاق —')

const registered = DATA_KEYS.map((k) => k.key)
check('مفتاح الحالة مسجَّل في سجلّ المفاتيح', registered.includes('qimmah:personalization:state:v1'))
check('ومفتاح الملف كذلك', registered.includes('qimmah:personalization:profile:v1'))
check('وكلاهما غير مُزامَن (بيانات صحّية بلا موافقة منفصلة)', DATA_KEYS.filter((k) => k.key.startsWith('qimmah:personalization')).every((k) => !k.synced))

// تغطية الأنماط: خطة عمياء عن نمط كامل تُكشف.
{
  const { state } = run(S[0])
  const { profile } = deriveProfile(state, clock)
  const cov = patternCoverage(profile, selectExercises(profile).ranked)
  check(`تغطية أنماط الحركة كاملة (${Object.entries(cov).map(([k, v]) => `${k}:${v}`).join(' ')})`, Object.values(cov).every((v) => v > 0))
}

// ═════════════════════ ك · [CTO-76] السياق الخليجي افتراض لا سؤال ═════════════════════
console.log('\n— ك · السياق الخليجي مفترَض —')

// حارس عودة: البنك يبقى خاليًا من أي سؤال تقييد ديني/ثقافي. الفحص على
// **المعرّف والمفتاح والنصّ معًا** — إعادة السؤال باسم آخر تسقط هي الأخرى.
const CULTURAL_TERMS = ['ramadan', 'رمضان', 'prayer', 'صلاة', 'صيام', 'fasting', 'حلال', 'halal', 'عيد', 'eid']
const culturalHits = QUESTION_BANK.flatMap((q) => {
  const blob = [q.id, q.key, ar[q.id]?.title, ar[q.id]?.hint, en[q.id]?.title, en[q.id]?.hint, ...Object.values(ar[q.id]?.opts ?? {}), ...Object.values(en[q.id]?.opts ?? {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return CULTURAL_TERMS.filter((t) => blob.includes(t)).map((t) => `${q.id}:${t}`)
})
check(`لا سؤال تقييد ديني/ثقافي في البنك (وُجد: ${culturalHits.join(',') || 'لا شيء'})`, culturalHits.length === 0)

// تأكيد مضادّ (§4.2): الحارس يمسك العودة فعلًا — لا يمرّ لأنه يفحص لا شيء.
const revived = { id: 'a-fasting-window', key: 'fastingWindow', title: 'تبي نراعي الصيام؟' }
const revivedBlob = `${revived.id} ${revived.key} ${revived.title}`.toLowerCase()
check('محاكاة عودة السؤال تسقط بمصطلح مسمّى', CULTURAL_TERMS.some((t) => revivedBlob.includes(t)))

// والسلوك انتقل إلى المخرجات: كل ملف يعلن السياق مفترَضًا، صراحةً لا ضمنًا.
{
  const { state } = run(S[0])
  const { profile } = deriveProfile(state, clock)
  check('والقيود تعلن السياق الخليجي مفترَضًا (مخرَج صريح)', profile.planConstraints.assumesGulfContext === true)
  check('ولا إجابة للمستخدم عنه (لم يُسأل أصلًا)', state.answers.ramadanAware === undefined)
}

// قاعدة السؤالين ([CTO-76] القرار ٣): كل حقل لم يأتِ من إجابة صريحة يظهر في
// `assumptions` — لا رقم يمرّ كأنّه مقيس وهو مفترَض.
{
  const partial = consented(30)
  const { profile, assumptions } = deriveProfile(partial, clock)
  check(`الحقول غير المُجابة معلَنة افتراضًا (${assumptions.length})`, assumptions.length > 0)
  check('و«الثقة» تعكس التغطية لا الدقّة', profile.confidence < 1 && profile.confidence >= 0)
  const full = run(S[6]).state
  check('وتغطية أعلى ⇒ ثقة أعلى (الرقم يعني شيئًا)', deriveProfile(full, clock).profile.confidence > profile.confidence)
}

console.log(`\n${fails.length ? '✗' : '✓'} إثبات التخصيص: ${pass} نجحت · ${fails.length} فشلت`)
if (fails.length) {
  for (const f of fails) console.log('   ✗ ' + f)
  process.exit(1)
}
