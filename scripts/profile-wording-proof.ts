// إثبات صياغة الملف الشخصي الواعية بالمستوى — [CTO-65] البند ٥.
//
// الفجوة: `profileV2Model` كان يحمل خريطة ثابتة
// `GOAL_AR = { cut: 'تنشيف', … }` ويبني منها التسمية وعنوان البرنامج. فالمبتدئ
// الذي اختار في الإعداد «خسارة دهون» يجد في ملفه «تنشيف» و«برنامج التنشيف» —
// نفس التطبيق يسمّي هدفه باسمين، وأحدهما مصطلح جُنِّب له عمدًا.
//
// ⚠️ **شرط القبول المعلن: الاختبار السلبي.** `goalWordingFor(lang, null)` يسقط
// على صياغة المتوسّط، أي **يعيد «تنشيف»** — فلو مرّرنا `null` لبدا البند منجزًا
// وهو ليس كذلك. القسم ٣ أدناه يحرس هذا تحديدًا.

import { buildProfileV2Model, type AuthSummary } from '@/lib/profileV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import { goalWordingFor } from '@/i18n/dict/onboardingIntent'
import { onboardingIntentStrings } from '@/i18n/dict/onboardingIntent'
import { v2LevelFromExperience } from '@/lib/onboardingV2Flow'
import { declaredGoalLabel } from '@/lib/declaredGoalWording'
import { goalChoices } from '@/data/planBuilder'
import { saveOnboardingProfile, clearOnboardingProfile, defaultOnboardingProfile } from '@/lib/onboardingProfile'
import type { ExperienceLevel } from '@/types/profile'
import type { V2Level } from '@/lib/onboardingV2Flow'
import type { Lang } from '@/lib/appPreferences'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

declare const __QIMMAH_ROOT__: string
const read = (rel: string) => readFileSync(resolve(__QIMMAH_ROOT__, rel), 'utf8')

let pass = 0
const fails: string[] = []
const check = (label: string, ok: boolean) => {
  if (ok) { pass++; console.log('  ✓ ' + label) } else { fails.push(label); console.log('  ✗ ' + label) }
}

const AUTH: AuthSummary = { displayName: 'زياد', email: null, signedIn: false }

/** يبني نموذج الملف كما تبنيه الشاشة، لمستخدم أكمل الإعداد بخبرة بعينها. */
function modelFor(experience: ExperienceLevel | undefined, lang: Lang) {
  clearOnboardingProfile()
  const op = defaultOnboardingProfile()
  op.trainingPreferences = { ...op.trainingPreferences, experience, daysPerWeek: 4 }
  op._meta = { ...op._meta, completed: true }
  saveOnboardingProfile(op)
  const c = getDefaultCustomization()
  c.profile = { ...c.profile, goal: 'cut', trainingLevel: 'intermediate' } // ← الافتراضي الملوَّث عمدًا
  return buildProfileV2Model(c, AUTH, lang)
}

console.log('\n═══ 1) المستوى المحفوظ يقود الصياغة ═══')
const GYM_TERM_AR = 'تنشيف'
const beginner = modelFor('beginner', 'ar')
check('المبتدئ يرى لغة النتيجة لا مصطلح الصالة', beginner.trainingIdentity.goalLabel === 'خسارة دهون')
check('المبتدئ لا يرى «تنشيف» في تسمية هدفه', !beginner.trainingIdentity.goalLabel!.includes(GYM_TERM_AR))
check('ولا في عنوان خطته', !beginner.trainingIdentity.planTitle.includes(GYM_TERM_AR))
check('ولا في عنوان برنامجه', !beginner.program.title.includes(GYM_TERM_AR))
check('عنوان البرنامج اسم من القاموس', beginner.program.title === 'برنامج خسارة الدهون')

const intermediate = modelFor('intermediate', 'ar')
check('المتوسّط يرى المصطلح الشائع', intermediate.trainingIdentity.goalLabel === GYM_TERM_AR)
const advanced = modelFor('advanced', 'ar')
check('المتقدّم يرى المصطلح القياسي', advanced.trainingIdentity.goalLabel.includes('Cut'))
check('المستويات الثلاثة لا تعطي نفس التسمية (وإلا كان الإثبات فارغًا)',
  new Set([beginner.trainingIdentity.goalLabel, intermediate.trainingIdentity.goalLabel, advanced.trainingIdentity.goalLabel]).size === 3)

console.log('\n═══ 2) الإنجليزية تتبع نفس القاعدة ═══')
const beginnerEn = modelFor('beginner', 'en')
check('المبتدئ بالإنجليزية: لغة نتيجة', beginnerEn.trainingIdentity.goalLabel === 'Fat loss')
check('ولا كلمة "Cut" في عنوان برنامجه', !beginnerEn.program.title.includes('Cut'))
check('المتوسّط بالإنجليزية: "Cut"', modelFor('intermediate', 'en').trainingIdentity.goalLabel === 'Cut')
check('لا تسمية عربية تتسرّب للواجهة الإنجليزية', !/[؀-ۿ]/.test(beginnerEn.trainingIdentity.goalLabel + beginnerEn.program.title))

console.log('\n═══ 3) الاختبار السلبي — «لا مستوى» لا يمرّ صامتًا (شرط قبول) ═══')
// أ) المصدر يعيد null فعلًا حين لا إجابة — لا يخترع مستوى.
check('v2LevelFromExperience(undefined) = null', v2LevelFromExperience(undefined) === null)
check('ولا يخترع مستوى لقيمة مجهولة', v2LevelFromExperience('x' as ExperienceLevel) === null)
// ب) الفخّ نفسه: تمرير null إلى goalWordingFor يعيد صياغة المتوسّط.
check('الفخّ قائم فعلًا: goalWordingFor(ar, null).cut = «تنشيف»', goalWordingFor('ar', null).cut.label === GYM_TERM_AR)
// ج) والنموذج لا يقع فيه: مستخدم بلا خبرة محفوظة لا يرى «تنشيف».
const unknown = modelFor(undefined, 'ar')
check('بلا مستوى محفوظ: التسمية ليست «تنشيف»', unknown.trainingIdentity.goalLabel !== GYM_TERM_AR)
check('بلا مستوى محفوظ: تُعرض صياغة المبتدئ', unknown.trainingIdentity.goalLabel === 'خسارة دهون')
check('بلا مستوى محفوظ: عنوان البرنامج بلا مصطلح صالة', !unknown.program.title.includes(GYM_TERM_AR))
// د) والافتراضي الملوَّث في الملف الشخصي لا ينقذ الحالة: `trainingLevel` كان
//    'intermediate' في كل استدعاء أعلاه، ولو كان هو المصدر لسقط الفحص (ج).
check('الافتراضي trainingLevel=intermediate لم يقُد الصياغة', unknown.trainingIdentity.goalLabel !== intermediate.trainingIdentity.goalLabel)

console.log('\n═══ 4) القاموس مكتمل — لا صياغة بلا عنوان برنامج ═══')
const LEVELS: V2Level[] = ['beginner', 'intermediate', 'advanced']
for (const lang of ['ar', 'en'] as Lang[]) {
  const w = onboardingIntentStrings[lang].goalWording
  check(`${lang}: كل مستوى×هدف له label وdesc وprogramTitle غير فارغة`,
    LEVELS.every((l) => (['cut', 'maintain', 'bulk'] as const).every((g) => w[l][g].label.trim() && w[l][g].desc.trim() && w[l][g].programTitle.trim())))
}
check('عنوان برنامج المبتدئ يختلف عن المتوسّط (ar)', onboardingIntentStrings.ar.goalWording.beginner.cut.programTitle !== onboardingIntentStrings.ar.goalWording.intermediate.cut.programTitle)
check('عنوان برنامج المبتدئ يختلف عن المتوسّط (en)', onboardingIntentStrings.en.goalWording.beginner.cut.programTitle !== onboardingIntentStrings.en.goalWording.intermediate.cut.programTitle)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 4.5) الوعد نفسه في معاينة الخطة والمراجعة — [CTO-67] البند ٤ ═══')
// الفجوة: [CTO-65] البند ٥ أصلح **الملف الشخصي**، وبقيت معاينة «تعديل خطتي»
// تعرض `identity.mainGoal` — سلسلة تُكتب عند إكمال الإعداد من `goalChoices`
// بالمصطلح الخام. فالمبتدئ الذي اختار «خسارة دهون» يقرأ «تنشيف» في معاينته:
// **نفس الوعد مكسورًا على شاشة أخرى**، وهو نمط تكرّر مرّتين فيُحرَس مرّتين.
const wordingFor = (experience: ExperienceLevel | undefined, lang: Lang) => {
  clearOnboardingProfile()
  const op = defaultOnboardingProfile()
  op.trainingPreferences = { ...op.trainingPreferences, experience, daysPerWeek: 4 }
  op._meta = { ...op._meta, completed: true }
  saveOnboardingProfile(op)
  return declaredGoalLabel(lang, 'cut')
}
check('المعاينة: المبتدئ يرى لغة النتيجة', wordingFor('beginner', 'ar') === 'خسارة دهون')
check('المعاينة: المتوسّط يرى المصطلح الشائع', wordingFor('intermediate', 'ar') === GYM_TERM_AR)
check('المعاينة: المتقدّم يرى المصطلح القياسي', wordingFor('advanced', 'ar')!.includes('Cut'))
check('المعاينة: بلا مستوى محفوظ لا يتسرّب «تنشيف»', wordingFor(undefined, 'ar') !== GYM_TERM_AR)
check('المعاينة بالإنجليزية: لغة نتيجة للمبتدئ', wordingFor('beginner', 'en') === 'Fat loss')
check('المعاينة: بلا هدف محفوظ تُعاد null (فتسقط الشاشة على المخزَّن)', declaredGoalLabel('ar', null) === null)
// اقتران بالملف الشخصي: **مصدر واحد** لا مصدران — نفس المدخل يعطي نفس المخرج.
check(
  'المعاينة والملف الشخصي يعطيان التسمية نفسها لنفس المستخدم',
  wordingFor('beginner', 'ar') === modelFor('beginner', 'ar').trainingIdentity.goalLabel &&
    wordingFor('advanced', 'ar') === modelFor('advanced', 'ar').trainingIdentity.goalLabel,
)
// وشاشتا العرض تستهلكان المصدر الواحد فعلًا — لا تحسبان الصياغة بأنفسهما.
const previewSrc = read('src/components/customizer/PreviewSummary.tsx')
const reviewSrc = read('src/components/customizer/steps/StepReview.tsx')
check('المعاينة تستهلك المصدر الواحد', previewSrc.includes("declaredGoalLabel") && previewSrc.includes("from '@/lib/declaredGoalWording'"))
check('والمراجعة كذلك', reviewSrc.includes('declaredGoalLabel') && reviewSrc.includes("from '@/lib/declaredGoalWording'"))
check('ولا واحدة منهما تعرض `identity.mainGoal` عاريًا', !/>\{data\.identity\.mainGoal\}</.test(previewSrc) && !/>\{data\.identity\.mainGoal\}</.test(reviewSrc))

console.log('\n═══ 5) محاكاة الالتفاف — تفشل بفحص مسمّى (§4.2) ═══')
const model = read('src/lib/profileV2Model.ts')
const bridge = read('src/lib/declaredGoalWording.ts')
check('خريطة المصطلحات الثابتة أُزيلت من الملف', !/const GOAL_AR\s*[:=]/.test(model))
check('الصياغة تُقرأ من قاموس الإعداد', model.includes("from '@/i18n/dict/onboardingIntent'"))
check('ومصدر المستوى واحد يستهلكه الملف الشخصي', model.includes("from '@/lib/declaredGoalWording'"))
check('والمصدر الواحد نفسه يقرأ من قاموس الإعداد لا من خريطة ثابتة', bridge.includes("from '@/i18n/dict/onboardingIntent'") && !/const GOAL_AR\s*[:=]/.test(bridge))
// التعليقات تُنزع: الحكم على الكود المنفَّذ لا على شرحه — تعليق يشرح ما نتجنّبه
// كان يُسقط الفحص، وهو ما وقع فعلًا عند كتابته.
const bridgeCode = bridge.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check('ولا يقرأ المستوى من `profile.trainingLevel` الملوَّث', !/profile\.trainingLevel/.test(bridgeCode))
// التفاف: عرض `identity.mainGoal` عاريًا في المعاينة كان يعيد «تنشيف» للمبتدئ.
clearOnboardingProfile()
const opBeginner = defaultOnboardingProfile()
opBeginner.trainingPreferences = { ...opBeginner.trainingPreferences, experience: 'beginner' }
opBeginner._meta = { ...opBeginner._meta, completed: true }
saveOnboardingProfile(opBeginner)
const RAW_STORED_GOAL = goalChoices.find((x) => x.value === 'cut')?.label ?? ''
check('التفاف: المخزَّن الخام هو «تنشيف» فعلًا (وإلا كان الفحص فارغًا)', RAW_STORED_GOAL === GYM_TERM_AR)
check('التفاف: ولذلك عرضه عاريًا كان يخالف ما يراه المبتدئ', RAW_STORED_GOAL !== declaredGoalLabel('ar', 'cut'))
check('لا تمرير null مباشر إلى goalWordingFor', !/goalWordingFor\([^)]*,\s*null\s*\)/.test(model))
// التفاف: إعادة المصدر إلى `profile.trainingLevel` (الافتراضي الملوَّث) يجب أن
// يسقط الفحص (ج) — نبرهن ذلك بحساب ما كانت ستعطيه تلك القراءة لنفس الحالة.
const SMUGGLED_LEVEL: V2Level = 'intermediate' // ما كان `profile.trainingLevel` سيسلّمه
check('التفاف: قراءة trainingLevel الافتراضي كانت تعيد «تنشيف»', goalWordingFor('ar', SMUGGLED_LEVEL).cut.label === GYM_TERM_AR)
check('التفاف: ولذلك الفحص (ج) كان سيسقط بها', goalWordingFor('ar', SMUGGLED_LEVEL).cut.label !== unknown.trainingIdentity.goalLabel)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات صياغة الملف الواعية بالمستوى: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
