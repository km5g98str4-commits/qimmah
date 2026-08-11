// إثبات موجة «النية والمستوى»: الكتلة تُسأل فعلًا، وصياغة الأهداف تتبع المستوى،
// وكل إجابة تغيّر شيئًا في المخرجات، وحاجز القاصرين لم يُمسّ.
//
// الادعاءات المُبطَلة:
//   ١) التدفّق كان لا يسأل النية ولا المستوى ⇒ `experienceLevel` غير معرّف دائمًا
//      ⇒ **نفس كثافة الجلسة لكل المستخدمين**، وأسلوب التغذية ثابت للجميع.
//   ٢) صياغة الأهداف كانت واحدة للجميع ⇒ المبتدئ يُواجَه بمصطلحات صالة.

import {
  LAST_INPUT_STEP,
  TRAINING_YEARS_RANGE,
  canAdvance,
  initialDraftV2,
  resolveExperienceLevel,
  validateStep,
  type V2Intent,
  type V2Level,
} from '@/lib/onboardingV2Flow'
import { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import { generatePlan } from '@/lib/planGenerator'
import { isMinorAge } from '@/lib/calculators'
import { goalWordingFor, onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
import { V2_GOAL_MODEL, type V2GoalValue } from '@/design-system/v2/labels'

let pass = 0
const fails: string[] = []
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log('  ✓ ' + name) }
  else { fails.push(name); console.log('  ✗ ' + name) }
}

const GOALS: readonly V2GoalValue[] = ['cut', 'maintain', 'bulk']
const LEVELS: readonly V2Level[] = ['beginner', 'intermediate', 'advanced']
const INTENTS: readonly V2Intent[] = ['plan', 'meals', 'numbers']

const body = { age: 30, gender: 'male' as const, heightCm: 180, weightKg: 90 }
const base = {
  ...body,
  intent: 'meals' as V2Intent | null, level: 'intermediate' as V2Level | null, trainingYears: null as number | null,
  goal: 'cut' as const, days: 4, duration: 45,
  place: 'gym' as const, pref: 'mixed' as const,
  injuries: [] as string[], healthDataConsent: true,
}

// ————————————————————————————————————————————————————————————————
console.log('\n═══ 1) الكتلة خطوة حقيقية لا تُتجاوز فارغة ═══')
check('خطوة النية هي 1 (بعد الأساسيات وقبل الهدف)', validateStep(1, { ...base, intent: null }) === 'intentLevel')
check('بلا مستوى تُحجب الخطوة', validateStep(1, { ...base, level: null }) === 'intentLevel')
check('بلا الاثنين تُحجب', validateStep(1, { ...base, intent: null, level: null }) === 'intentLevel')
check('بالاثنين تمرّ', validateStep(1, base) === null)
check('canAdvance(1) يتبع الكتلة', !canAdvance(1, { ...base, intent: null }) && canAdvance(1, base))
check('المسودّة الجديدة تبدأ بلا نية ولا مستوى (لا افتراضي صامت)', initialDraftV2(null).intent === null && initialDraftV2(null).level === null)
check('السنوات تبدأ null', initialDraftV2(null).trainingYears === null)
check('عدد خطوات الإدخال صار ستًّا (0..5) بعد إدراج تاريخ التدريب', LAST_INPUT_STEP === 5)
check('الهدف انتقل إلى 3 والتدريب 4 والمعدّات 5', validateStep(3, { ...base, goal: null }) === 'goal' && validateStep(4, { ...base, days: 7 }) === 'training' && validateStep(5, { ...base, place: null }) === 'equipment')

console.log('\n═══ 2) السنوات اختيارية لكن لا تُبتلع بصمت ═══')
check('السنوات فارغة (null) تمرّ', validateStep(1, { ...base, trainingYears: null }) === null)
check('سنوات صالحة تمرّ', validateStep(1, { ...base, trainingYears: 3 }) === null)
check('سنوات سالبة تُحجب', validateStep(1, { ...base, trainingYears: -1 }) === 'intentLevel')
check('سنوات خارج الحدّ الأعلى تُحجب', validateStep(1, { ...base, trainingYears: TRAINING_YEARS_RANGE.max + 1 }) === 'intentLevel')
check('نصّ غير رقمي (NaN) يُحجب', validateStep(1, { ...base, trainingYears: Number('س') }) === 'intentLevel')

// ————————————————————————————————————————————————————————————————
console.log('\n═══ 3) المستوى يغيّر المخرجات فعلًا (لا سؤال بلا أثر) ═══')
const profFor = (over: Partial<typeof base>) => toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, ...over })))
const pBeg = profFor({ level: 'beginner' })
const pInt = profFor({ level: 'intermediate' })
const pAdv = profFor({ level: 'advanced' })
console.log(`     مبتدئ: band=${pBeg.experienceBand} level=${pBeg.trainingLevel} | متوسط: band=${pInt.experienceBand} | متقدّم: band=${pAdv.experienceBand}`)
check('كل مستوى يُنتج نطاق خبرة مختلفًا', new Set([pBeg.experienceBand, pInt.experienceBand, pAdv.experienceBand]).size === 3)
check('المبتدئ يُخزَّن انتظامه «new» تلقائيًا', buildOnboardingProfile(toAnswersFromV2({ ...base, level: 'beginner' })).trainingPreferences.consistency === 'new')
check('المبتدئ تقسيمته مثبَّتة على «تلقائي»', buildOnboardingProfile(toAnswersFromV2({ ...base, level: 'beginner' })).trainingPreferences.splitMode === 'auto')
check('المستوى يصل إلى مصدر الحقيقة', buildOnboardingProfile(toAnswersFromV2({ ...base, level: 'advanced' })).trainingPreferences.experience === 'advanced')

// الحسم: خطة مولّدة فعلًا تختلف كثافتها بالمستوى (نفس الجسد ونفس الأيام والمدة).
const exCount = (p: typeof pBeg) =>
  generatePlan(p).workoutPlan.days.reduce((n, d) => n + d.exercises.length, 0)
const [nBeg, nInt, nAdv] = [exCount(pBeg), exCount(pInt), exCount(pAdv)]
console.log(`     تمارين الأسبوع — مبتدئ: ${nBeg} | متوسط: ${nInt} | متقدّم: ${nAdv}`)
check('الخطة المولّدة تختلف كثافتها بين المبتدئ والمتقدّم', nBeg !== nAdv)
check('كل الخطط غير فارغة', nBeg > 0 && nInt > 0 && nAdv > 0)

console.log('\n═══ 4) السنوات تصحّح تقدير المستخدم لنفسه ═══')
check('«متوسط» + أقل من سنة ⇒ مستجد', resolveExperienceLevel('intermediate', 0) === 'novice')
check('«متوسط» + سنة أو أكثر ⇒ متوسط', resolveExperienceLevel('intermediate', 2) === 'intermediate')
check('«متوسط» بلا سنوات ⇒ متوسط', resolveExperienceLevel('intermediate', null) === 'intermediate')
check('«مبتدئ» لا تُغيّره السنوات', resolveExperienceLevel('beginner', 9) === 'beginner')
check('«متقدّم» لا تُغيّره السنوات', resolveExperienceLevel('advanced', 0) === 'advanced')
check('بلا مستوى ⇒ undefined (توافق رجعي مع مسودّة قديمة)', resolveExperienceLevel(null, null) === undefined)
check('السنوات تغيّر النطاق فعلًا', profFor({ level: 'intermediate', trainingYears: 0 }).experienceBand !== profFor({ level: 'intermediate', trainingYears: 5 }).experienceBand)

console.log('\n═══ 5) النية تغيّر المخرجات فعلًا ═══')
const styles = INTENTS.map((i) => buildOnboardingProfile(toAnswersFromV2({ ...base, intent: i })).nutritionPreferences.style)
console.log(`     أساليب التغذية الثلاثة: ${styles.join(' · ')}`)
check('كل نية تُنتج أسلوب تغذية مختلفًا', new Set(styles).size === 3)
check('«خطة تمرين» ⇒ إرشاد مبسّط', buildOnboardingProfile(toAnswersFromV2({ ...base, intent: 'plan' })).nutritionPreferences.style === 'simple_guidance')
check('«اقتراحات أكل» ⇒ اقتراح وجبات', buildOnboardingProfile(toAnswersFromV2({ ...base, intent: 'meals' })).nutritionPreferences.style === 'meal_suggestions')
check('«أرقامي فقط» ⇒ ماكروز فقط', buildOnboardingProfile(toAnswersFromV2({ ...base, intent: 'numbers' })).nutritionPreferences.style === 'macros_only')
check('غير «اقتراح الوجبات» لا يحفظ عدد الوجبات', buildOnboardingProfile(toAnswersFromV2({ ...base, intent: 'numbers' })).nutritionPreferences.mealsPerDay === undefined)
check('النية تصل إلى واجهة التغذية في الملف', profFor({ intent: 'numbers' }).nutritionDisplayStyle !== profFor({ intent: 'plan' }).nutritionDisplayStyle)

// ————————————————————————————————————————————————————————————————
console.log('\n═══ 6) الصياغة الواعية بالمستوى — المطلب الجوهري ═══')
/** مصطلحات قياسية متقدّمة: يراها المتقدّم ولا يراها المبتدئ. */
const ADVANCED_TERMS = ['Cut', 'Lean Bulk', 'Recomposition', 'إعادة تركيب', 'تنشيف', 'تضخيم'] as const
/** مصطلحات حمل متقدّمة: ممنوعة على المبتدئ في **كل** مساره. */
const FORBIDDEN_FOR_BEGINNER = ['RIR', 'RPE', 'Deload', 'ديلود', '1RM', 'AMRAP', 'تفريغ الحمل'] as const

// المسافة غير الفاصلة (U+00A0) داخل «Lean Bulk» تفصيل تنضيد لا معنى — تُطبَّع
// قبل أي مطابقة نصّية كي لا يمرّ مصطلح على المبتدئ بحيلة محرف.
const flat = (s: string) => s.replace(/\u00A0/g, ' ')

for (const lang of ['ar', 'en'] as const) {
  const begWords = goalWordingFor(lang, 'beginner')
  const advWords = goalWordingFor(lang, 'advanced')
  const midWords = goalWordingFor(lang, 'intermediate')

  const begText = flat(GOALS.map((g) => `${begWords[g].label} ${begWords[g].desc}`).join(' '))
  const advText = flat(GOALS.map((g) => `${advWords[g].label} ${advWords[g].desc}`).join(' '))

  check(`${lang}: المبتدئ لا يرى أي مصطلح متقدّم في الأهداف`, ADVANCED_TERMS.every((term) => !begText.includes(term)))
  check(`${lang}: المتقدّم يرى Cut · Lean Bulk · Recomposition`, ['Cut', 'Lean Bulk', 'Recomposition'].every((term) => advText.includes(term)))
  check(`${lang}: الصياغات الثلاث متمايزة لكل هدف`, GOALS.every((g) => new Set([begWords[g].label, midWords[g].label, advWords[g].label]).size >= 2))
  check(`${lang}: لا صياغة فارغة`, LEVELS.every((l) => GOALS.every((g) => goalWordingFor(lang, l)[g].label.length > 0 && goalWordingFor(lang, l)[g].desc.length > 0)))

  // مسار المبتدئ كاملًا: نصوص الكتلة + صياغة أهدافه + رسالة التحقق.
  const s = onboardingIntentStrings[lang]
  const beginnerPath = flat([
    s.title, s.subtitle, s.intentQ, s.levelQ, s.validation, s.yearsLabel, s.yearsNote,
    ...s.intents.map((o) => `${o.label} ${o.desc}`),
    ...s.levels.map((o) => `${o.label} ${o.desc}`),
    begText,
  ].join(' '))
  check(`${lang}: مسار المبتدئ خالٍ من مصطلحات الحمل المتقدّمة`, FORBIDDEN_FOR_BEGINNER.every((term) => !beginnerPath.includes(term)))
  check(`${lang}: نصوص الكتلة نفسها خالية من مصطلحات الأهداف المتقدّمة`, !s.intentQ.includes('Cut') && !s.levelQ.includes('Cut'))
}

console.log('\n═══ 7) الصياغة غلاف لا تغيير للقيم المخزّنة ═══')
check('قيم الأهداف الثلاثة كما هي', V2_GOAL_MODEL.map((g) => g.value).join(',') === 'cut,maintain,bulk')
for (const l of LEVELS) {
  check(`المستوى «${l}» يغطّي الأهداف الثلاثة كلها`, GOALS.every((g) => !!goalWordingFor('ar', l)[g]))
}
check('مستوى غير معروف يسقط على صياغة المتوسط (لا انهيار)', goalWordingFor('ar', null).cut.label === goalWordingFor('ar', 'intermediate').cut.label)
check('الهدف المخزّن لا يتأثر بالمستوى', toAnswersFromV2({ ...base, level: 'beginner' }).goalValue === toAnswersFromV2({ ...base, level: 'advanced' }).goalValue)

// ————————————————————————————————————————————————————————————————
console.log('\n═══ 8) حاجز القاصرين لم يُمسّ ═══')
check('الأساسيات (بما فيها العمر) ما زالت الخطوة 0', validateStep(0, { ...base, age: null, gender: null, heightCm: null, weightKg: null }) === 'body')
check('الموافقة الصحية ما زالت تسبق كل جمع', validateStep(0, { ...base, age: null, gender: null, heightCm: null, weightKg: null, healthDataConsent: false }) === 'healthConsent')
// الحاجز يعمل لأن العمر **لا يمكن تخطّيه**: لا تقدّم من 0 ولا من 1 بلا جسد
// مكتمل، فخطوة الهدف (2) لا تُعرض أبدًا وعمر المستخدم مجهول.
check('لا تقدّم من الأساسيات بلا عمر', !canAdvance(0, { ...base, age: null, gender: null, heightCm: null, weightKg: null }))
check('كتلة النية لم تفتح طريقًا يتجاوز الأساسيات', !canAdvance(0, { ...base, age: null, gender: null, heightCm: null, weightKg: null, intent: 'plan', level: 'advanced' }))
check('عمر 15 = قاصر · 18 = بالغ', isMinorAge(15) && !isMinorAge(18))
// المحافظة فقط للقاصر — تثبيت الهدف عند بناء الملف، مستقلّ عن المستوى.
for (const l of LEVELS) {
  const minorProf = toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, age: 15, goal: 'cut', level: l })))
  check(`القاصر بمستوى «${l}»: التنشيف يُثبَّت على «صيانة»`, minorProf.goalType === 'maintenance')
}
check('البالغ التنشيف يمرّ عاديًا', toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, age: 30, goal: 'cut' }))).goalType === 'cutting')
check('القاصر بمستوى متقدّم لا يفتح التضخيم', toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, age: 15, goal: 'bulk', level: 'advanced' }))).goalType === 'maintenance')

console.log('\n═══ 9) النصوص بالعربية والإنجليزية (§6) ═══')
for (const lang of ['ar', 'en'] as const) {
  const s = onboardingIntentStrings[lang]
  check(`${lang}: عنوان الكتلة وشرحها موجودان`, s.title.length > 0 && s.subtitle.length > 0)
  check(`${lang}: ثلاث نوايا وثلاثة مستويات`, s.intents.length === 3 && s.levels.length === 3)
  check(`${lang}: كل خيار يشرح أثره`, [...s.intents, ...s.levels].every((o) => o.desc.length > 0))
  check(`${lang}: تسميات المجموعات (a11y) موجودة`, s.legends.intent.length > 0 && s.legends.level.length > 0)
  check(`${lang}: رسالة تحقّق واضحة`, s.validation.length > 0)
  check(`${lang}: عدّاد الخطوات يعرض الرقمين`, s.stepOf('2', '5').includes('2') && s.stepOf('2', '5').includes('5'))
}
check('العربية ليست نسخة من الإنجليزية', onboardingIntentStrings.ar.title !== onboardingIntentStrings.en.title)
const arAll = [
  onboardingIntentStrings.ar.title, onboardingIntentStrings.ar.subtitle, onboardingIntentStrings.ar.validation,
  onboardingIntentStrings.ar.yearsNote,
  ...onboardingIntentStrings.ar.intents.map((o) => `${o.label} ${o.desc}`),
  ...onboardingIntentStrings.ar.levels.map((o) => `${o.label} ${o.desc}`),
  ...LEVELS.flatMap((l) => GOALS.map((g) => `${goalWordingFor('ar', l)[g].label} ${goalWordingFor('ar', l)[g].desc}`)),
].join(' ')
check('لا علامات تعجّب في النبرة العربية (§6)', !arAll.includes('!') && !arAll.includes('!'))
check('لا لوم ولا تهويل («لازم» / «يجب عليك» / «فشل»)', !/لازم|يجب عليك|فشلت/.test(arAll))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات النية والمستوى: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) {
  for (const f of fails) console.log('   ✗ ' + f)
  process.exit(1)
}
