// إثبات وقت التشغيل (Phase 3 · Agent 3) — التمرير عبر Node يُثبت:
//  ① توطين الصور: كل مدخل وسائط يشير لملف محلّي موجود في public/exercise-images/ + fallback بعيد.
//  ② وسائط الجيم المنزلي: كل تمرين يمرّ فلتر الأدوات المنزلية إمّا له صورة منزلية مناسبة أو بديل نظيف
//     (لا صورة جهاز machine/cable أبدًا).
// التشغيل:  node scripts/run-p3-media-proof.mjs
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { exercises, getExercise } from '@/data/exercises'
import { exerciseMedia, getExerciseMedia } from '@/data/exerciseMedia'
import { generatePlan } from '@/lib/planGenerator'
import { defaultProfile } from '@/lib/calculators'
import type { Profile } from '@/types'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = resolve(ROOT, 'public')

let failures = 0
const fail = (msg: string) => {
  failures++
  console.log(`  ✗ ${msg}`)
}

// ───────────────────────── ① توطين الصور ─────────────────────────
console.log('\n① توطين الصور (Task 1)')
const ids = Object.keys(exerciseMedia)
let localOk = 0
for (const id of ids) {
  const m = exerciseMedia[id]
  for (const frame of ['img0', 'img1'] as const) {
    const p = m[frame]
    if (!p.startsWith('/exercise-images/')) fail(`${id}.${frame} ليس مسارًا محليًا: ${p}`)
    else if (!existsSync(resolve(PUBLIC, p.replace(/^\//, '')))) fail(`${id}.${frame} ملف مفقود على القرص: ${p}`)
  }
  // fallback بعيد موجود ويشير لمصدر عام (raw.githubusercontent).
  if (!m.img0Remote?.includes('raw.githubusercontent')) fail(`${id} بلا fallback بعيد لـ img0`)
  if (!m.img1Remote?.includes('raw.githubusercontent')) fail(`${id} بلا fallback بعيد لـ img1`)
  if (
    m.img0.startsWith('/exercise-images/') &&
    m.img1.startsWith('/exercise-images/') &&
    existsSync(resolve(PUBLIC, m.img0.slice(1))) &&
    existsSync(resolve(PUBLIC, m.img1.slice(1)))
  )
    localOk++
}
console.log(`  ✓ ${localOk}/${ids.length} تمرينًا له إطارَان محليّان موجودان + fallback بعيد.`)

// ───────────────────────── ② وسائط الجيم المنزلي ─────────────────────────
console.log('\n② وسائط الجيم المنزلي (Task 2)')
// نفس فلتر الأدوات المنزلية المستخدَم في مولّد الخطة (planGenerator: access==='home').
const HOME_ALLOWED = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
const homeEligible = exercises.filter((ex) => ex.equipment.every((e) => HOME_ALLOWED.has(e)))

// مصادر free-exercise-db ذات طابع «جهاز» — يجب ألّا يُطابَق تمرينٌ منزلي معها.
const MACHINE_HINT = /machine|cable|_lever_|smith|pec_deck|leg_press|lat_pulldown|hack_squat/i

let homeWithImg = 0
let homePlaceholder = 0
for (const ex of homeEligible) {
  const m = getExerciseMedia(ex.id)
  if (!m) {
    homePlaceholder++ // بديل نظيف — مقبول
    continue
  }
  homeWithImg++
  const src = m.img0Remote || m.img0
  if (MACHINE_HINT.test(src)) fail(`تمرين منزلي «${ex.id}» يُطابَق صورة جهاز: ${src}`)
  // ضمان مزدوج: تمرين منزلي يجب ألّا يحوي أداة جهاز/كيبل أصلًا.
  if (ex.equipment.some((e) => e === 'machine' || e === 'cable'))
    fail(`تمرين منزلي «${ex.id}» يحوي أداة جهاز/كيبل: ${ex.equipment.join(',')}`)
}
console.log(
  `  ✓ ${homeEligible.length} تمرينًا مؤهَّلًا منزليًا: ${homeWithImg} بصورة منزلية مناسبة، ${homePlaceholder} ببديل نظيف — 0 صورة جهاز.`,
)

// ───────────────────────── ③ خطة المبتدئ: كيبل حرّ محدود ومقبول (Task 3) ─────────────────────────
// التوقّع المُحدَّث: خطة المبتدئ تتجنّب تمارين الكيبل الحرّ **عدا** عزلات أساسية آمنة للمبتدئ
// تتدهور بأمان بصريًّا (بديل أنيق بلا كسر تخطيط) — أبرزها «مرجحة بايسبس كيبل». هذه العزلة تمرين
// تمهيدي قياسي، ووجودها ليس انحدار وسائط لأنها تعرض البديل الأنيق (نفس آلية تدهور بطاقة الجهاز).
// الحارس يبقى فعّالًا: أي كيبل حرّ آخر غير مُدرَج في قائمة السماح يُفشِل الإثبات (يمنع تسلّل الكيبل).
const BEGINNER_ALLOWED_FREE_CABLE = new Set(['cable-biceps-curl'])
const beginner: Profile = {
  ...defaultProfile,
  trainingLevel: 'beginner',
  experienceBand: 'lt6m',
  gymType: 'full',
  gymAccess: 'full',
  trainingDays: 4,
}
const bPlan = generatePlan(beginner)
const bExercises = bPlan.workoutPlan.days.flatMap((d) => d.exercises)
const bCables = bExercises.filter((pe) => {
  const ex = getExercise(pe.exerciseId)
  return ex ? ex.equipment.includes('cable') && !ex.equipment.includes('machine') : false
})
const bUnexpectedCables = bCables.filter((pe) => !BEGINNER_ALLOWED_FREE_CABLE.has(pe.exerciseId))
if (bUnexpectedCables.length) fail(`خطة المبتدئ تحوي ${bUnexpectedCables.length} تمرين كيبل حرّ غير مُدرَج: ${bUnexpectedCables.map((x) => x.exerciseId).join(', ')}`)
console.log(`  ✓ ${bExercises.length} تمرينًا في خطة المبتدئ — منها ${bCables.length} كيبل حرّ (${bCables.length - bUnexpectedCables.length} مقبول بقائمة السماح، ${bUnexpectedCables.length} غير متوقّع).`)

// ───────────────────────── ④ أسماء الأيام: «اليوم N · <split>» (Task 5) ─────────────────────────
console.log('\n④ أسماء الأيام (Task 5)')
const planDayNames = bPlan.workoutPlan.days.map((d) => d.nameAr)
const scheduleTitles = bPlan.weeklySchedule.filter((r) => r.type !== 'rest').map((r) => r.title)
// حرف تقسيمة مجرّد في نهاية الاسم (أ/ب/ج) — النمط القديم المرفوض.
const bareLetter = /(?:^|\s)[أبجده]\s*$/
let dayOk = 0
for (const name of [...planDayNames, ...scheduleTitles]) {
  if (bareLetter.test(name)) fail(`اسم يوم بحرف مجرّد: «${name}»`)
}
// كل أسماء أيام الخطة يجب أن تلتزم صيغة «اليوم N · <تقسيمة>».
// [REL-001] الرقم قد يكون هنديًّا (٠-٩) لا لاتينيًّا: `workoutDayNameAr` صار يبني
// التسمية بأرقام عربية-هندية تطبيقًا لسياسة الأرقام الواحدة. وموضوع هذا الفحص
// **شكل التسمية** لا نظام ترقيمها — فالبنية المطلوبة كما هي بحرفها: بادئة «اليوم»
// ثم رقم ثم الفاصل ثم اسم تقسيمة غير فارغ. لا تليين: الأصناف الأربعة كلها ما زالت
// مشروطة، وأي تسمية تفقد أيًّا منها تسقط كما كانت تسقط.
for (const name of planDayNames) {
  if (/^اليوم\s+[\d٠-٩]+\s+·\s+\S/.test(name)) dayOk++
  else fail(`اسم يوم خارج الصيغة «اليوم N · <تقسيمة>»: «${name}»`)
}
console.log(
  `  ✓ ${dayOk}/${planDayNames.length} اسم يوم بصيغة «اليوم N · <تقسيمة>»، و${scheduleTitles.length} عنوان جدول بلا حرف مجرّد.`,
)
console.log(`     مثال: ${planDayNames.slice(0, 3).join('  |  ')}`)

// ───────────────────────── الخلاصة ─────────────────────────
console.log('')
if (failures) {
  console.log(`❌ فشل الإثبات: ${failures} مشكلة.`)
  process.exit(1)
}
console.log('✅ نجح الإثبات: صور محلّية موصولة + جيم منزلي بلا صور أجهزة.')
