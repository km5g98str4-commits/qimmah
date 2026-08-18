import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ONBOARDING_QUESTION_IDS,
  historyFollowUpsApply,
  injuryAreasApply,
  normalizeDraft,
  resolveExperienceLevel,
  resolveTrainingConsistency,
  validateStep,
  type OnboardingV2Draft,
} from '@/lib/onboardingV2Flow'
import { toAnswersFromV2, type V2OnboardingChoices } from '@/lib/onboardingV2Adapter'
import type { Equipment } from '@/types/profile'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import {
  ONBOARDING_PROFILE_KEY,
  loadOnboardingProfile,
  saveOnboardingProfile,
  toLegacyProfile,
} from '@/lib/onboardingProfile'
import { generatePlan } from '@/lib/planGenerator'
import { buildPlanRationale } from '@/lib/planRationale'
import { mealAllowedForDiet } from '@/lib/dietFilter'
import { CORE_QUESTIONS } from '@/lib/personalization/bank/core'
import { bodyStepStrings } from '@/i18n/dict/bodyStep'
import { onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
import { trainingHistoryStrings } from '@/i18n/dict/trainingHistory'
import { onboardingLifestyleStrings } from '@/i18n/dict/onboardingLifestyle'
import { onboardingEquipmentStrings } from '@/i18n/dict/onboardingEquipment'
import { dietPatternChoices, neatChoices } from '@/data/planBuilder'
import { V2_ONBOARDING } from '@/design-system/v2/labels'

let passed = 0
const failed: string[] = []
function check(name: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else { failed.push(name); console.log(`  ✗ ${name}`) }
}

const base: V2OnboardingChoices = {
  age: 30, gender: 'male', heightCm: 180, weightKg: 82,
  intent: 'meals', level: 'intermediate',
  trainedBefore: 'months', totalMonths: 'm3_6', lastTrained: 'now', consistency: 'mostly',
  goal: 'cut', days: 4, duration: 60, place: 'gym',
  equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'smith', 'pullup_bar', 'bodyweight'],
  neat: 'moderate', dietPattern: 'none',
  hasInjury: false, injuries: [], healthDataConsent: true,
}

const profileFor = (over: Partial<V2OnboardingChoices> = {}) =>
  toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, ...over })))
const planFor = (over: Partial<V2OnboardingChoices> = {}) => generatePlan(profileFor(over))
const countExercises = (over: Partial<V2OnboardingChoices> = {}) =>
  planFor(over).workoutPlan.days.reduce((sum, day) => sum + day.exercises.length, 0)
const firstWeek = (over: Partial<V2OnboardingChoices> = {}) => {
  const profile = profileFor(over)
  const plan = generatePlan(profile)
  return buildPlanRationale(profile, plan).decisions.find((decision) => decision.area === 'startingLoad')?.outcome.value
}

console.log('\n═══ 1) سجلّ ثابت: 18 بالضبط، وكل معرّف مربوط بالواجهة مرة ═══')
// ═══ العدد تغيّر بصدق، ولم يُحذف التأكيد ═══
// ١٨ ← ٢٠: أُضيف `profile.display_name` (الاسم) و`equipment.available`
// (الأدوات). التأكيد يبقى رقمًا
// صريحًا لا `> 0`: سؤال يُضاف بلا قرار يجب أن يسقط البناء.
check('السجل يحمل 20 سؤالًا بالضبط', ONBOARDING_QUESTION_IDS.length === 20)
check('كل المعرّفات فريدة', new Set(ONBOARDING_QUESTION_IDS).size === 20)
const viewSource = readFileSync(resolve(process.cwd(), 'src/views/OnboardingV2.tsx'), 'utf8')
const profileSource = readFileSync(resolve(process.cwd(), 'src/lib/onboardingProfile.ts'), 'utf8')
for (const id of ONBOARDING_QUESTION_IDS) {
  check(`${id}: مربوط بالواجهة مرة واحدة`, viewSource.split(`"${id}"`).length - 1 === 1)
}
check('سؤال سنوات التدريب المتكرر غير معروض', !viewSource.includes('v2-training-years') && !viewSource.includes('trainingYears'))
check('تفضيل المعدات المهدور غير معروض', !viewSource.includes('t.prefs') && !viewSource.includes('onPref'))

console.log('\n═══ 2) مفردات التاريخ تطابق البنك المعتمد حرفيًا ═══')
const canonical = (key: string) => CORE_QUESTIONS.find((question) => question.key === key)?.options?.map((option) => option.value) ?? []
check('trainedBefore مطابق', trainingHistoryStrings.en.trainedBefore.map((x) => x.value).join() === canonical('trainedBefore').join())
check('totalMonths مطابق', trainingHistoryStrings.en.totalMonths.map((x) => x.value).join() === canonical('totalMonths').join())
check('lastTrained مطابق', trainingHistoryStrings.en.lastTrained.map((x) => x.value).join() === canonical('lastTrained').join())
check('consistency مطابق', trainingHistoryStrings.en.consistency.map((x) => x.value).join() === canonical('consistency').join())

console.log('\n═══ 3) نسختا النص كاملتان لكل واحد من الأسئلة الـ18 ═══')
const copyById = (lang: 'ar' | 'en'): Record<(typeof ONBOARDING_QUESTION_IDS)[number], string> => {
  const body = bodyStepStrings[lang]
  const intent = onboardingIntentStrings[lang]
  const history = trainingHistoryStrings[lang]
  const lifestyle = onboardingLifestyleStrings[lang]
  const equipment = onboardingEquipmentStrings[lang]
  const v2 = V2_ONBOARDING[lang]
  return {
    'profile.display_name': body.nameQ,
    'equipment.available': equipment.question,
    'body.age': body.ageLabel,
    'body.sex': body.genderLabel,
    'body.height': body.heightLabel,
    'body.weight': body.weightLabel,
    'intent.primary': intent.intentQ,
    'experience.declared': intent.levelQ,
    'history.trained_before': history.trainedBeforeQ,
    'history.total_months': history.totalMonthsQ,
    'history.last_trained': history.lastTrainedQ,
    'history.consistency': history.consistencyQ,
    'goal.primary': v2.goal.title,
    'training.days': v2.training.daysQ,
    'training.duration': v2.training.durationQ,
    'training.place': v2.equipment.placeQ,
    'activity.neat': lifestyle.activityQ,
    'nutrition.diet_pattern': lifestyle.dietQ,
    'limitations.has_injury': lifestyle.hasInjuryQ,
    'limitations.injury_areas': lifestyle.injuryAreasQ,
  }
}
const arCopy = copyById('ar')
const enCopy = copyById('en')
for (const id of ONBOARDING_QUESTION_IDS) {
  check(`${id}: عربي وإنجليزي غير فارغين ومتمايزان`, arCopy[id].trim().length > 0 && enCopy[id].trim().length > 0 && arCopy[id] !== enCopy[id])
}
check('خيارات النشاط لها نسختان', neatChoices.every((choice) => Boolean(choice.label && choice.labelEn)))
check('خيارات نمط الأكل لها نسختان', dietPatternChoices.every((choice) => Boolean(choice.label && choice.labelEn)))

console.log('\n═══ 4) كل جواب يُتحقق منه ولا يُتجاوز فارغًا ═══')
const valid = {
  age: 30, gender: 'male' as const, heightCm: 180, weightKg: 82,
  intent: 'meals' as const, level: 'intermediate' as const,
  trainedBefore: 'months' as const, totalMonths: 'm3_6' as const,
  lastTrained: 'now' as const, consistency: 'mostly' as const,
  goal: 'cut' as const, days: 4, duration: 60,
  place: 'gym' as const, equipment: ['dumbbell', 'bodyweight'] as Equipment[],
  neat: 'moderate' as const, dietPattern: 'none' as const,
  hasInjury: false, injuries: [] as string[], healthDataConsent: true,
}
for (const field of ['age', 'gender', 'heightCm', 'weightKg'] as const) check(`${field}: غيابه يحجب الجسد`, validateStep(0, { ...valid, [field]: null }) === 'body')
for (const field of ['intent', 'level'] as const) check(`${field}: غيابه يحجب النية`, validateStep(1, { ...valid, [field]: null }) === 'intentLevel')
for (const field of ['trainedBefore', 'totalMonths', 'lastTrained', 'consistency'] as const) check(`${field}: غيابه يحجب التاريخ عند انطباقه`, validateStep(2, { ...valid, [field]: null }) === 'trainingHistory')
check('goal: غيابه يحجب الهدف', validateStep(3, { ...valid, goal: null }) === 'goal')
check('days: قيمة خارج المجال تُحجب', validateStep(4, { ...valid, days: 2 }) === 'training')
check('duration: قيمة خارج المجال تُحجب', validateStep(4, { ...valid, duration: 50 }) === 'training')
for (const field of ['place', 'neat'] as const) check(`${field}: غيابه يحجب السياق`, validateStep(5, { ...valid, [field]: null }) === 'lifestyle')
check('equipment: قائمة فارغة تُحجب برسالتها الخاصة', validateStep(5, { ...valid, equipment: [] }) === 'equipment')
check('hasInjury: غيابه يحجب القيود', validateStep(6, { ...valid, hasInjury: null }) === 'limitations')
check('injury areas: مطلوبة عند نعم', validateStep(6, { ...valid, hasInjury: true, injuries: [] }) === 'limitations')

console.log('\n═══ 5) الحقائق تُحفظ، لا الواجهة وحدها ═══')
const op = buildOnboardingProfile(toAnswersFromV2({ ...base, hasInjury: true, injuries: ['knee'] }))
check('حقائق الجسد محفوظة', op.profile.age === 30 && op.profile.sex === 'male' && op.bodyMetrics.heightCm === 180 && op.bodyMetrics.currentWeightKg === 82)
check('النية محفوظة في أسلوب التغذية', op.nutritionPreferences.style === 'meal_suggestions')
check('المستوى والتاريخ الخام محفوظان', op.trainingPreferences.history?.declaredLevel === 'intermediate' && op.trainingPreferences.history.trainedBefore === 'months' && op.trainingPreferences.history.totalMonths === 'm3_6' && op.trainingPreferences.history.lastTrained === 'now' && op.trainingPreferences.history.consistency === 'mostly')
check('الهدف والجدول والمكان محفوظة', op.goal.type === 'cut' && op.trainingPreferences.daysPerWeek === 4 && op.trainingPreferences.sessionDurationMin === 60 && op.trainingPreferences.environment === 'commercial_gym')
check('النشاط ونمط الأكل محفوظان', op.activityProfile.neat === 'moderate' && op.foodPreferences.dietPattern === 'none')
check('جواب الإصابة ومناطقها محفوظان', op.limitations.hasInjury === true && op.limitations.injuries.join() === 'knee')

console.log('\n═══ 6) مصفوفة المستهلكين: تغيير الجواب يغيّر نتيجة حقيقية ═══')
check('age → أهلية القاصر', profileFor({ age: 15, goal: 'cut' }).goalType !== profileFor({ age: 30, goal: 'cut' }).goalType)
check('sex → BMR', planFor({ gender: 'male' }).targets.bmr !== planFor({ gender: 'female' }).targets.bmr)
check('height → BMR', planFor({ heightCm: 160 }).targets.bmr !== planFor({ heightCm: 195 }).targets.bmr)
check('weight → BMR/السعرات', planFor({ weightKg: 60 }).targets.targetCalories !== planFor({ weightKg: 100 }).targets.targetCalories)
check('intent → طريقة عرض التغذية', profileFor({ intent: 'numbers' }).nutritionDisplayStyle !== profileFor({ intent: 'meals' }).nutritionDisplayStyle)
check('declared level → نطاق الخبرة', profileFor({ level: 'beginner' }).experienceBand !== profileFor({ level: 'intermediate' }).experienceBand)
check('trainedBefore → نقطة البداية', resolveExperienceLevel('advanced', 'never', null, null, null) !== resolveExperienceLevel('advanced', 'years', 'y3_plus', 'now', 'steady'))
check('totalMonths → نطاق الخبرة', profileFor({ totalMonths: 'lt3' }).experienceBand !== profileFor({ totalMonths: 'y3_plus' }).experienceBand)
check('lastTrained → بداية أسبوع مخففة', firstWeek({ totalMonths: 'm6_12', lastTrained: 'now' }) !== firstWeek({ totalMonths: 'm6_12', lastTrained: 'm3_12' }))
check('consistency → بداية أسبوع مخففة', firstWeek({ consistency: 'steady' }) !== firstWeek({ consistency: 'on_off' }))
check('goal → سعرات الهدف', planFor({ goal: 'cut' }).targets.targetCalories !== planFor({ goal: 'bulk' }).targets.targetCalories)
check('days → عدد أيام الخطة', planFor({ days: 3 }).workoutPlan.days.length !== planFor({ days: 6 }).workoutPlan.days.length)
check('duration → حجم الجلسات', countExercises({ duration: 30 }) !== countExercises({ duration: 75 }))
// [SOVEREIGN-002] المكان سياق، والأداة سلطة.
//
// كان هذا الفحص يؤكّد أن «نادي» ≠ «منزل» في اختيار التمارين — وهو صحيح في النموذج
// القديم حيث المكان **يستنتج** العدّة. وبعد أن صارت `profile.equipment` سلطة
// التوليد، صار السؤال الصحيح مختلفًا: من يملك ناديًا كاملًا في بيته يستحقّ الخطة
// نفسها في الموضعين، ولا يُحرَم من بارٍ يملكه لأنه أجاب «منزل».
//
// فيُثبَت الآن أمران معًا: المكان **يحسم حين لا تُعلَن العدّة** (مسار التوافق مع
// الملفّات القائمة)، **ولا يحسم حين تُعلَن** — والثاني تأكيد مضادّ يسقط لو عاد
// المكان يتجاوز ما أعلنه المستخدم أنه يملك.
const noKit: Partial<V2OnboardingChoices> = { equipment: [] }
check(
  'place → اختيار التمارين (حين لا تُعلَن العدّة)',
  JSON.stringify(planFor({ ...noKit, place: 'gym' }).workoutPlan) !==
    JSON.stringify(planFor({ ...noKit, place: 'home' }).workoutPlan),
)
check(
  '⟲ وبعدّة مُعلَنة كاملة لا يغيّر المكان الخطة — الأداة سلطة لا المكان',
  JSON.stringify(planFor({ place: 'gym' }).workoutPlan) ===
    JSON.stringify(planFor({ place: 'home' }).workoutPlan),
)
check('NEAT → TDEE', planFor({ neat: 'sedentary' }).targets.tdee !== planFor({ neat: 'high' }).targets.tdee)
const unrestrictedMeals = planFor({ dietPattern: 'none' }).nutritionPlan.meals
const veganMeals = planFor({ dietPattern: 'vegan' }).nutritionPlan.meals
check('dietPattern → تصفية الوجبات', unrestrictedMeals.some((meal) => !mealAllowedForDiet(meal, 'vegan')) && veganMeals.every((meal) => mealAllowedForDiet(meal, 'vegan')))
check('hasInjury → إظهار سؤال المناطق', !injuryAreasApply(false) && injuryAreasApply(true))
check('injury areas → استبعاد حركات', JSON.stringify(planFor({ hasInjury: true, injuries: ['knee'] }).workoutPlan) !== JSON.stringify(planFor({ hasInjury: true, injuries: ['shoulder'] }).workoutPlan))

console.log('\n═══ 7) never: لا تاريخ مصنوع ولا قيم خفية تعود ═══')
const neverAnswers = toAnswersFromV2({ ...base, level: 'advanced', trainedBefore: 'never', totalMonths: 'y3_plus', lastTrained: 'y1_plus', consistency: 'steady' })
check('never لا تحمل المدة/الانقطاع/الانتظام الخام', neverAnswers.trainingHistory?.trainedBefore === 'never' && neverAnswers.trainingHistory.totalMonths === undefined && neverAnswers.trainingHistory.lastTrained === undefined && neverAnswers.trainingHistory.consistency === undefined)
check('never ليست returning', neverAnswers.consistency === 'new' && resolveTrainingConsistency('never', null, null, null) === 'new')
check('never تُصنّف مبتدئًا مهما كان الادعاء', neverAnswers.experienceLevel === 'beginner')
const stale: OnboardingV2Draft = {
  step: 2, age: 30, gender: 'male', heightCm: 180, weightKg: 82,
  intent: 'meals', level: 'advanced', trainedBefore: 'never', totalMonths: 'y3_plus',
  lastTrained: 'y1_plus', consistency: 'steady', goal: 'cut', days: 4, duration: 60,
  place: 'gym', neat: 'moderate', dietPattern: 'none', hasInjury: false,
  injuries: ['knee'], healthDataConsent: true,
}
const cleared = normalizeDraft(stale)
check('تطبيع never يمحو كل متابعة قديمة', cleared.totalMonths === null && cleared.lastTrained === null && cleared.consistency === null)
check('trained → never → trained لا يعيد أجوبة قديمة', historyFollowUpsApply('months') && !historyFollowUpsApply('never') && cleared.totalMonths === null && historyFollowUpsApply('years'))
check('لا إصابة تمحو مناطق خفية أيضًا', cleared.injuries.length === 0)

console.log('\n═══ 8) صدق الحفظ: الكتابة تُفحص، والفشل يُبلَّغ ولا يُبتلع ═══')
// ═══ لماذا هنا؟ ═══
// هذا الإثبات يحرس **مسار الإكمال كاملًا** لا الأسئلة وحدها. وفشل الكتابة عند
// الإكمال هو أغلى فقدان بيانات في التطبيق: المستخدم أجاب عشرين سؤالًا ثم رأى
// شاشة نجاح كاذبة (تقرير R10 §A بند ١ و٤).
type StoreShim = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void; clear: () => void }
const realStore = (globalThis as unknown as { localStorage: StoreShim }).localStorage
function swapStore(store: StoreShim) {
  const g = globalThis as unknown as { localStorage: StoreShim; window: { localStorage: StoreShim } }
  g.localStorage = store
  g.window.localStorage = store
}
/** يحاكي حصّة صفرية (وضع التصفّح الخاص في Safari): الوجود قائم والكتابة ترمي. */
function quotaBlockedStore(): StoreShim {
  const inner = new Map<string, string>()
  return {
    getItem: (k) => (inner.has(k) ? (inner.get(k) as string) : null),
    setItem: () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e },
    removeItem: (k) => { inner.delete(k) },
    clear: () => { inner.clear() },
  }
}

const opForSave = buildOnboardingProfile(toAnswersFromV2({ ...base }))

// (أ) المسار الناجح — النتيجة `'ok'` والبايتات موجودة فعلًا.
realStore.removeItem(ONBOARDING_PROFILE_KEY)
const okResult = saveOnboardingProfile(opForSave)
check('حفظ ناجح يُرجع ok', okResult === 'ok')
check('حفظ ناجح يترك البايتات في التخزين فعلًا', realStore.getItem(ONBOARDING_PROFILE_KEY) !== null)
check('حفظ ناجح يجعل الملف مقروءًا بنفس القيم', loadOnboardingProfile()?.bodyMetrics.currentWeightKg === 82)

// (ب) المسار المحجوب — النتيجة سبب مسمّى، ولا شيء يُكتب، ولا استثناء يتسرّب.
realStore.removeItem(ONBOARDING_PROFILE_KEY)
const blocked = quotaBlockedStore()
swapStore(blocked)
let threw = false
let blockedResult: string = 'ok'
try { blockedResult = saveOnboardingProfile(opForSave) } catch { threw = true }
swapStore(realStore)
check('التخزين المحجوب لا يرمي على المستدعي', !threw)
check('التخزين المحجوب يُرجع سببًا مسمّى لا ok', blockedResult === 'quota')
check('التخزين المحجوب لا يترك بايتات نصف مكتوبة', blocked.getItem(ONBOARDING_PROFILE_KEY) === null)
realStore.removeItem(ONBOARDING_PROFILE_KEY)

// (د) بنية الإكمال في الواجهة — الترتيب نفسه محروس، لا النيّة.
// كل واحد من الثلاثة كان يُطلق **بلا قيد**؛ الفحص يستخرج كتلة `finalize`
// بحدودها ويؤكّد أن كلًّا منها يقع بعد فحص نتيجة كتابة، لا قبله.
const finalizeBlock = (() => {
  const start = viewSource.indexOf('const finalize = () => {')
  const end = viewSource.indexOf('\n  // [CTO-009/WP-2] الترحيب', start)
  return start >= 0 && end > start ? viewSource.slice(start, end) : ''
})()
check('كتلة الإكمال مستخرَجة بحدودها', finalizeBlock.length > 400)
const idxProfileCheck = finalizeBlock.indexOf("if (profileWrite !== 'ok')")
const idxMarkCompleted = finalizeBlock.indexOf('markCompleted(userId)')
const idxClearDraft = finalizeBlock.indexOf('clearDraftV2(userId)')
const idxOkStatus = finalizeBlock.indexOf("finalizeReduce(s, 'ok')")
check('نتيجة كتابة الملف تُفحص قبل أي وسم إكمال', idxProfileCheck > 0 && idxProfileCheck < idxMarkCompleted)
check('مسح المسودة يقع بعد فحص الكتابة لا قبله', idxProfileCheck > 0 && idxProfileCheck < idxClearDraft)
check('شاشة النجاح تقع بعد فحص الكتابة لا قبله', idxProfileCheck > 0 && idxProfileCheck < idxOkStatus)
check('فشل التخزين يعيد اللقطة ولا يمسح المسودة', finalizeBlock.includes('applyCustomization(snapshot)') && finalizeBlock.includes("finalizeReduce(st, 'storageFail')"))
check('كتابة التخصيص تُقاس بمؤشّر الفشل (نمط finishWorkout)', finalizeBlock.includes('const failureBefore = getStorageFailure()') && finalizeBlock.includes('if (getStorageFailure() !== failureBefore)'))
check('لا كتابة خام إلى localStorage في مسار الإكمال', !finalizeBlock.includes('localStorage.setItem'))
check('كاتب مصدر الحقيقة لا يبتلع الفشل', !/window\.localStorage\.setItem\(ONBOARDING_PROFILE_KEY/.test(profileSource))
check('شاشة فشل الحفظ تصرّح ببقاء البيانات', viewSource.includes('t.storage.kept') && V2_ONBOARDING.ar.storage.kept.length > 0 && V2_ONBOARDING.en.storage.kept.length > 0)

console.log('\n═══ 8ب) الأدوات والإصابة تصلان الملفّ فعلًا — لا حقلًا مثبَّتًا على الفراغ ═══')
const gymFull = profileFor({ place: 'gym' })
check('الأدوات المعلنة تصل Profile.equipment', gymFull.equipment?.includes('barbell') === true && gymFull.equipment?.includes('bodyweight') === true)
const homeMinimal = profileFor({ place: 'home', equipment: ['bands'] })
check('إعلان مختلف ⇒ أدوات مختلفة (لا [] ثابتة)', JSON.stringify(homeMinimal.equipment) !== JSON.stringify(gymFull.equipment))
check('وزن الجسم يُضاف دائمًا ولا يُنزع', homeMinimal.equipment?.includes('bodyweight') === true)
const bwOnly = profileFor({ place: 'home', equipment: ['bodyweight'] })
check('«وزن الجسم وحده» يفتح فرع gymAccess=bodyweight الذي كان غير قابل للوصول', bwOnly.gymAccess === 'bodyweight' && bwOnly.gymType === 'bodyweight')
check('وغيره لا يفتحه بالخطأ', gymFull.gymAccess === 'full' && homeMinimal.gymAccess === 'home')
check('مسودّة بلا إعلان أدوات تبقى كما كانت (توافق رجعي)', (profileFor({ equipment: [] }).equipment ?? []).length === 0)
const injured = profileFor({ hasInjury: true, injuries: ['knee', 'shoulder'] })
check('مناطق الإصابة تصل Profile.injuryAreas كمفاتيح', JSON.stringify(injured.injuryAreas) === JSON.stringify(['knee', 'shoulder']))
check('والنصّ القديم يبقى كما هو (توافق رجعي)', injured.injuries === 'knee، shoulder')
check('«لا إصابة» تُقرأ فعلًا فتُفرَّغ المناطق', (profileFor({ hasInjury: false, injuries: ['knee'] }).injuryAreas ?? []).length === 0)
check('مفتاح مخترَع لا يدخل المناطق', (profileFor({ hasInjury: true, injuries: ['knee', 'neck'] }).injuryAreas ?? []).join() === 'knee')

console.log('\n═══ 9) محاكاة الالتفاف: العدد/الربط/المفردات لا تمرّ رخوة ═══')
check('إضافة معرّف زائد كانت ستُكشف', [...ONBOARDING_QUESTION_IDS, 'filler.fake'].length !== 20)
check('ربط أسماء متفرقة بلا data-question-id لا يكفي', !viewSource.includes('data-question-name='))
check('مفردة مختلقة لا تنتمي للبنك', !canonical('totalMonths').includes('about_a_year'))

console.log(`\n${failed.length ? '❌' : '✅'} إثبات أسئلة الإعداد: ${passed} فحصًا، ${failed.length} فشل.`)
if (failed.length) {
  for (const name of failed) console.log(`   ✗ ${name}`)
  process.exit(1)
}
