// إثبات تطابق رقم السعرات بين اللوحة والمعالج — [CTO-65] البند ٣.
//
// **قيس قبل أن يُصلَح.** الحزمة رجّحت أن السبب إعادة توليد عند فتح المعالج
// (`StepGeneratePlan` يستدعي `generatePlan` ويصفّر `targetsMeta`). القياس نفى
// ذلك: مسار الإعداد ← التخصيص المحفوظ ← إعادة التوليد يعطي **نفس الرقم بالضبط**
// (فارق صفر). السبب الحقيقي كان تسمية على قيمة: `StepBody` يعرض
// `maintenanceCalories` تحت تسمية «سعرات الهدف»، والفارق هو `CUT_DEFICIT` عينه.
//
// ولأنه ليس إعادة حساب، فالقرار المقفل ٣-٣ (لا تعديل آلي صامت) **لم يُخرق**
// أصلًا — لا شيء كان يُكتب. الخرق كان في §١-٧: رقم يقول عن نفسه ما ليس هو.

import { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { buildCustomizationFromOnboarding, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { getDefaultCustomization, loadCustomization, saveCustomization } from '@/lib/customization'
import { generatePlan } from '@/lib/planGenerator'
import { computeTargets, targetCaloriesFor } from '@/lib/calculators'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** جذر المستودع — يحقنه المُشغّل، لأن الحزمة تُكتب في مجلّد مؤقّت. */
declare const __QIMMAH_ROOT__: string
const read = (rel: string) => readFileSync(resolve(__QIMMAH_ROOT__, rel), 'utf8')

let pass = 0
const fails: string[] = []
const check = (label: string, ok: boolean) => {
  if (ok) { pass++; console.log('  ✓ ' + label) } else { fails.push(label); console.log('  ✗ ' + label) }
}

// ===== المسار الحقيقي: إعداد مكتمل ← ما تحفظه اللوحة ← ما يفتحه المعالج =====

const op = buildOnboardingProfile(
  toAnswersFromV2({
    age: 28, gender: 'male', heightCm: 178, weightKg: 82,
    intent: 'plan', level: 'intermediate', trainingYears: 3,
    goal: 'cut', days: 4, duration: 60, place: 'gym', pref: 'mixed',
    injuries: [], healthDataConsent: true,
  }),
)
saveOnboardingProfile(op)
const built = await buildCustomizationFromOnboarding(op, getDefaultCustomization())
saveCustomization(built)
const opened = loadCustomization() // ما يراه المعالج عند الفتح، بلا لمس شيء

console.log('\n═══ 1) فتح المعالج لا يغيّر رقمًا (نفي الفرضية بالقياس) ═══')
check('التخصيص المحفوظ يُقرأ كما كُتب', opened.targets.targetCalories === built.targets.targetCalories)
check('بصمة الملف لم تتغيّر بالفتح', opened.targetsMeta.lastCalculatedFromProfileHash === built.targetsMeta.lastCalculatedFromProfileHash)
check('إعادة التوليد تعطي نفس الرقم (فارق صفر)', generatePlan(opened.profile).targets.targetCalories === opened.targets.targetCalories)
check('إعادة الحساب المباشر تعطي نفس الرقم', computeTargets(opened.profile).targetCalories === opened.targets.targetCalories)

console.log('\n═══ 2) الفارق المُبلَّغ = عجز التنشيف لا إعادة حساب ═══')
const gap = opened.targets.maintenanceCalories - opened.targets.targetCalories
check('الملف المُنشِّف: الصيانة أعلى من الهدف', gap > 0)
check('الفارق = 400 بالضبط (CUT_DEFICIT)', gap === 400)
check('لولا الفارق لكان الإثبات فارغًا', opened.targets.maintenanceCalories !== opened.targets.targetCalories)
check('الرقم الذي تعرضه اللوحة هو هدف الهدف لا الصيانة', targetCaloriesFor(opened.profile.goal, opened.targets) === opened.targets.targetCalories)

console.log('\n═══ 3) الشاشة تعرض الرقم الذي تسمّيه ═══')
const stepBody = read('src/components/customizer/steps/StepBody.tsx')
// نستخرج سطر البطاقة المسمّاة «سعرات الهدف» ونفحص ما يربطه — لا نكتفي بوجود
// الاسم والقيمة متفرّقين في الملف (بوابة رخوة تُرضى من موضعين).
const labeled = stepBody.split('\n').find((l) => l.includes('d.bodyTargetCalories')) ?? ''
check('بطاقة «سعرات الهدف» موجودة في الشاشة', labeled.length > 0)
check('وتربط targets.targetCalories', /value=\{`\$\{ctx\.data\.targets\.targetCalories\}`\}/.test(labeled))
check('ولا تربط maintenanceCalories', !labeled.includes('maintenanceCalories'))
// الجارتان في نفس البطاقة تعرضان قيم الهدف — فالسعرات ليست استثناء بلا سبب.
check('البروتين المجاور من قيم الهدف', stepBody.includes('ctx.data.targets.proteinGrams'))
check('الماء المجاور من قيم الهدف', stepBody.includes('ctx.data.targets.waterLiters'))
// سعرات الصيانة تظهر باسمها في مكانها الصحيح — التسمية لم تُلغَ بل وُضعت موضعها.
const smart = read('src/components/customizer/steps/StepSmartCalculations.tsx')
check('سعرات الصيانة تُعرض باسمها في خطوة الحسابات', /d\.smartMaintenance.*maintenanceCalories/.test(smart))

console.log('\n═══ 4) محاكاة الالتفاف — تفشل بفحص مسمّى (§4.2) ═══')
const SMUGGLED = '          <LivePreview label={d.bodyTargetCalories} value={`${ctx.data.targets.maintenanceCalories}`} unit={d.unitCalories} />'
check(
  'التفاف: إعادة ربط الصيانة تحت نفس التسمية تُكشَف على السطر نفسه',
  SMUGGLED.includes('d.bodyTargetCalories') && SMUGGLED.includes('maintenanceCalories') && !/targets\.targetCalories\}`\}/.test(SMUGGLED),
)
// التفاف ثانٍ: وجود الاسم والقيمة في الملف متفرّقين لا يكفي — الفحص على السطر.
const SCATTERED = 'label={d.bodyTargetCalories}\n// somewhere else: ctx.data.targets.targetCalories'
const scatteredLine = SCATTERED.split('\n').find((l) => l.includes('d.bodyTargetCalories')) ?? ''
check(
  'التفاف: اسم وقيمة متفرّقان في الملف لا يُرضيان الفحص',
  !/value=\{`\$\{ctx\.data\.targets\.targetCalories\}`\}/.test(scatteredLine),
)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات تطابق رقم الخطة: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
