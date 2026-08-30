// البرامج الجاهزة الحتمية — [FOUNDER-QA-P0].
//
// **هذه fixtures منتج، لا خطط مولَّدة.** المنتج لا يخترع قوائم تمارين عشوائية:
// ثمانية برامج مكتوبة بيد، كل يوم فيها قائمة معرّفات **من الكتالوج القانوني
// حصرًا** (`src/data/exercises.ts` أو ما يُحلّ عبر `LEGACY_EXERCISE_ID_MAP`).
// معرّف مخترع = فشل بوابة باسمه في `npm run test:builtin-templates`.
//
// ثلاثة قوانين تحكم كل يوم هنا، وكلها محروسة بالبرهان لا بالنيّة:
//   ① **أجهزة فقط** — نفس قانون `workoutTemplates.ts`: لا وزن حرّ ولا كيبل حرّ
//      داخل برنامج جاهز. الوزن الحرّ والكيبل يبقيان للمكتبة والبنّاء المخصّص.
//   ② **ترتيب Q19** — `src/lib/workoutOrder.ts`: مركّبات الأرجل ثم المركّبات
//      العلوية ثم العزل ثم السمانة/الكور. الأيام هنا مكتوبة **مرتّبة أصلًا**.
//   ③ **حجم عاقل** — بين ٤ و٩ تمارين في اليوم.
//
// **المجموعات والتكرارات والراحة لا تُكتب هنا إطلاقًا.** الاتفاقية القائمة في
// `src/lib/planGenerator.ts` (`setsFor` + `SCHEMES`) هي المصدر الوحيد، وتُطبَّق
// حين تُبنى الخطة من القالب. كتابة أرقام هنا كانت ستخلق مصدرًا ثانيًا يشيخ.
//
// النصوص (أسماء البرامج والأيام ووصفها) في `src/i18n/dict/builtInTemplates.ts`
// بالعربية والإنجليزية معًا — البيانات هنا معرّفات فقط.
//
// ── الاستبدالات والإسقاطات المعلَنة (مادة المؤسس ↔ الكتالوج) ───────────────
// المؤسس سمّى التمارين بأسمائها الدارجة؛ ما لم يكن له نظير جهاز في الكتالوج
// **لم يُخترع له معرّف**، بل استُبدل بأقرب جهاز حقيقي أو أُسقط — والاثنان معلنان:
//   • «triceps pushdown» → `triceps-extension-machine`.
//     السبب: `cable-triceps-pushdown` موجود لكنه `equipment: ['cable']`، وقانون
//     ① يمنع الكيبل الحرّ داخل برنامج جاهز. جهاز مدّ الترايسبس هو نظيره الموجّه.
//   • «pec deck / chest fly» → `pec-deck-machine` (نظير مباشر، بلا استبدال).
//   • «biceps curl» → `preacher-curl-machine` (جهاز البايسبس القانوني).
//   • «rear delt fly» → `reverse-pec-deck` (جهاز، وهو نظير الرفرفة الخلفية).
//   • «calf raise» → `standing-calf-raise-machine` / `seated-calf-raise-machine`.
//   • «hammer curl if available» → **أُسقط**. لا جهاز مطرقة في الكتالوج
//     (`hammer-curl` دمبل)، و`machine-curl` كان سيكرّر خانة البايسبس نفسها في
//     اليوم. المؤسس علّقه بـ«if available»، وغيابه أصدق من نظير مفتعل.
//     أثره: يوم السحب ٥ تمارين لا ٦ — داخل النطاق العاقل.
//   • «seated row / chest supported row» → `seated-row-machine` في النسخة أ
//     و`chest-supported-row-machine` في النسخة ب، كي تختلف النسختان فعلًا.
//   • «seated/lying leg curl» → `seated-leg-curl` في أ و`lying-leg-curl` في ب.
//
// ── إعادة الترتيب المعلَنة ─────────────────────────────────────────────────
// قوائم المؤسس تضع أحيانًا تمرين عزل قبل مركّب (فلاي الصدر قبل السحب العلوي في
// UPPER A، وقبل ضغط الكتف في PUSH؛ وضغط الصدر قبل دفع الأرجل في FULL BODY A/C).
// قانون Q19 يمنع ذلك، وله برهان قائم على الجذع. فحُفظ **اختيار التمارين كما هو
// حرفيًا** وأُعيد ترتيبها داخل اليوم بالقانون. لا تمرين حُذف بسبب الترتيب.

import type { WorkoutTemplate, TemplateDay } from '@/types/workout'
import {
  builtInSessions,
  builtInVariants,
  builtInProgramSources,
  type BuiltInSessionSource,
  type BuiltInProgramSource,
} from '@/data/builtInProgramsSource.generated'
import { getExercise } from '@/data/exercises'
import { isDayOrdered, orderDayExerciseIds } from '@/lib/workoutOrder'
import { builtInTemplateStrings } from '@/i18n/dict/builtInTemplates'
import type { BuiltInTemplateId } from '@/i18n/dict/builtInTemplates'

/** الحدّ الأدنى/الأقصى العاقل لعدد تمارين اليوم الواحد. */
export const MIN_DAY_EXERCISES = 4
export const MAX_DAY_EXERCISES = 9

/**
 * [DATASET-B] الأيام والبرامج لم تعد مكتوبة هنا بيدٍ. مصدرها الوحيد هو الوحدة
 * المولّدة من مجموعة البيانات المعتمدة (برهان ١٢/١٢، بصمة في الملف المولّد):
 *
 *   Dataset B  →  scripts/build-builtin-programs-source.mjs
 *              →  src/data/builtInProgramsSource.generated.ts  (مطبوعة الأنواع)
 *              →  هنا: تركيب WorkoutTemplate بالنموذج القائم
 *              →  generatePlanFromTemplate  →  الخطة  →  الجلسة
 *
 * **المشاركة القانونية محفوظة:** «سفلي أ» و«أرجل أ» تسميتان تشيران إلى
 * `cs-lower-a` نفسها. مصفوفة التمارين تعيش في الجلسة وحدها، فلا نسختان تتباعدان.
 */

/** الجلسة القانونية لتسمية يوم. يرمي عند معرّف لا يُحلّ — لا إصلاح صامت. */
function sessionForVariant(variantId: string): BuiltInSessionSource {
  const v = builtInVariants[variantId]
  if (!v) throw new Error(`[builtin-templates] unresolvable variant id: ${variantId}`)
  const session = builtInSessions[v.sessionId]
  if (!session) throw new Error(`[builtin-templates] variant '${variantId}' points at missing session '${v.sessionId}'`)
  return session
}

/** ترتيب العرض — نفس ترتيب مادة المؤسس، مقروءًا من المصدر المولّد. */
export const BUILT_IN_TEMPLATE_IDS: readonly BuiltInTemplateId[] = builtInProgramSources
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((p) => p.templateId as BuiltInTemplateId)

function buildDay(templateId: BuiltInTemplateId, variantId: string, index: number): TemplateDay {
  const v = builtInVariants[variantId]
  const session = sessionForVariant(variantId)
  return {
    // معرّف اليوم فريد داخل البرنامج حتى لو تكرّرت تسميته.
    id: `${templateId}-d${index + 1}-${v.dayKind}`,
    nameAr: builtInTemplateStrings.ar.days[v.dayKind],
    nameEn: builtInTemplateStrings.en.days[v.dayKind],
    exerciseIds: [...session.exerciseIds],
  }
}

function buildTemplate(source: BuiltInProgramSource): WorkoutTemplate {
  const id = source.templateId as BuiltInTemplateId
  const ar = builtInTemplateStrings.ar.templates[id]
  const en = builtInTemplateStrings.en.templates[id]
  // البرنامج المتناوب يعرض دورته الكاملة أيامًا؛ غيره يعرض جدوله الأسبوعي.
  // في الحالتين كل معرّف يُحلّ لتسمية حقيقية — لا معرّف وهمي في أي مسار.
  const variantIds = source.rotation
    ? [...source.rotation.sequence]
    : source.schedule.filter((e) => e.type === 'workout').map((e) => e.variantId as string)
  return {
    id,
    nameAr: ar.name,
    nameEn: en.name,
    descriptionAr: ar.description,
    descriptionEn: en.description,
    recommendedFor: ar.recommendedFor,
    days: variantIds.map((vid, i) => buildDay(id, vid, i)),
  }
}

/** البرامج الجاهزة الثمانية، مبنيّة من مجموعة البيانات المعتمدة والقاموس. */
export const builtInWorkoutTemplates: WorkoutTemplate[] = builtInProgramSources
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(buildTemplate)

export const builtInTemplateMap: Record<string, WorkoutTemplate> = Object.fromEntries(
  builtInWorkoutTemplates.map((t) => [t.id, t]),
)

/** بيانات البرنامج كما وردت في المجموعة — أيام/أسبوع، المستوى، الجدول، التناوب. */
export const builtInProgramMeta: Record<string, BuiltInProgramSource> = Object.fromEntries(
  builtInProgramSources.map((p) => [p.templateId, p]),
)

/** الوصول المُعنوَن ببرنامج جاهز واحد. */
export function getBuiltInTemplate(id: string): WorkoutTemplate | undefined {
  return builtInTemplateMap[id]
}

/** اسم البرنامج بلغة المعروض — بلا نصّ صلب في المكوّن. */
export function builtInTemplateCopy(id: BuiltInTemplateId, lang: 'ar' | 'en') {
  return builtInTemplateStrings[lang].templates[id]
}

// ── الحارس البنيوي ──────────────────────────────────────────────────────────
//
// `validateBuiltInTemplates` ليست تكرارًا للبرهان بل **بنيته**: البرهان يشغّلها
// على الحقيقة (يتوقّع صفر) وعلى نسخ مشوّهة عمدًا (يتوقّع رمزًا **مسمّىً**). فحصٌ
// يسقط بـ`TypeError` لا يثبت شيئًا (§4.2).

export type BuiltInTemplateIssueCode =
  | 'unknown-exercise-id'
  | 'non-machine-exercise'
  | 'duplicate-exercise-in-day'
  | 'day-size-out-of-range'
  | 'order-law-violation'
  | 'missing-name'
  | 'identical-ar-en-name'
  | 'latin-digits-in-arabic'
  | 'duplicate-template-id'
  | 'duplicate-day-id'

export interface BuiltInTemplateIssue {
  code: BuiltInTemplateIssueCode
  where: string
  detail: string
}

/** أرقام لاتينية داخل نصّ عربي — صنف عطل معروف (BUG-019). */
const LATIN_DIGIT = /[0-9]/
const ARABIC_LETTER = /[؀-ۿ]/

/**
 * [DATASET-B] قانون العدّة: **جهاز أو محطّة كيبل**، ولا شيء غيرهما.
 *
 * كان الفحص يشترط `machine` وحده. مادة المؤسس المعتمدة تنصّ صراحةً على
 * «Machine/cable only — no barbells, no dumbbells»، ومجموعة البيانات تحمل
 * تمرينَي كيبل مبرمَجين (`cable-triceps-pushdown` و`cable-biceps-curl`).
 * فوُسِّع الشرط ليطابق السياسة المعلنة، **ولم يُرخَ**: البار والدمبل والكيتل
 * والمقعد ووزن الجسم كلها تسقط كما كانت.
 */
const ALLOWED_EQUIPMENT = new Set(['machine', 'cable'])

function isMachineOrCable(exerciseId: string): boolean {
  const ex = getExercise(exerciseId)
  return Boolean(ex && ex.equipment.length > 0 && ex.equipment.every((q) => ALLOWED_EQUIPMENT.has(q)))
}

/**
 * يفحص طقم برامج جاهزة بالكامل. يُرجع قائمة أعطال (فارغة = سليم). لا يرمي أبدًا:
 * المدخل المشوّه يجب أن يخرج **عطلًا مسمّىً** لا استثناءً.
 */
export function validateBuiltInTemplates(templates: readonly WorkoutTemplate[]): BuiltInTemplateIssue[] {
  const issues: BuiltInTemplateIssue[] = []
  const push = (code: BuiltInTemplateIssueCode, where: string, detail: string) => {
    issues.push({ code, where, detail })
  }

  const seenTemplateIds = new Set<string>()
  const seenDayIds = new Set<string>()

  for (const t of templates) {
    if (seenTemplateIds.has(t.id)) push('duplicate-template-id', t.id, 'معرّف برنامج مكرّر')
    seenTemplateIds.add(t.id)

    for (const [field, value] of [
      ['nameAr', t.nameAr],
      ['nameEn', t.nameEn],
      ['descriptionAr', t.descriptionAr],
      ['descriptionEn', t.descriptionEn],
      ['recommendedFor', t.recommendedFor],
    ] as const) {
      if (typeof value !== 'string' || value.trim() === '') {
        push('missing-name', `${t.id}.${field}`, 'نصّ مفقود أو فارغ')
      }
    }
    if (typeof t.nameAr === 'string' && typeof t.nameEn === 'string' && t.nameAr.trim() && t.nameAr === t.nameEn) {
      push('identical-ar-en-name', `${t.id}.name`, 'العربية والإنجليزية متطابقتان — ترجمة ناقصة')
    }
    for (const [field, value] of [
      ['nameAr', t.nameAr],
      ['descriptionAr', t.descriptionAr],
      ['recommendedFor', t.recommendedFor],
    ] as const) {
      if (typeof value === 'string' && ARABIC_LETTER.test(value) && LATIN_DIGIT.test(value)) {
        push('latin-digits-in-arabic', `${t.id}.${field}`, value)
      }
    }

    for (const d of t.days) {
      const where = `${t.id}/${d.id}`
      if (seenDayIds.has(d.id)) push('duplicate-day-id', where, 'معرّف يوم مكرّر')
      seenDayIds.add(d.id)

      for (const [field, value] of [
        ['nameAr', d.nameAr],
        ['nameEn', d.nameEn],
      ] as const) {
        if (typeof value !== 'string' || value.trim() === '') {
          push('missing-name', `${where}.${field}`, 'اسم يوم مفقود أو فارغ')
        }
      }
      if (typeof d.nameAr === 'string' && typeof d.nameEn === 'string' && d.nameAr.trim() && d.nameAr === d.nameEn) {
        push('identical-ar-en-name', `${where}.name`, 'اسم اليوم واحد باللغتين')
      }
      if (typeof d.nameAr === 'string' && ARABIC_LETTER.test(d.nameAr) && LATIN_DIGIT.test(d.nameAr)) {
        push('latin-digits-in-arabic', `${where}.nameAr`, d.nameAr)
      }

      const ids = d.exerciseIds
      if (ids.length < MIN_DAY_EXERCISES || ids.length > MAX_DAY_EXERCISES) {
        push('day-size-out-of-range', where, `${ids.length} خارج [${MIN_DAY_EXERCISES}, ${MAX_DAY_EXERCISES}]`)
      }

      const seen = new Set<string>()
      for (const id of ids) {
        // ① حارس منع الاختراع: كل معرّف يجب أن يُحلّ لتمرين حقيقي في الكتالوج.
        if (!getExercise(id)) {
          push('unknown-exercise-id', where, id)
        } else if (!isMachineOrCable(id)) {
          // ② قانون العدّة — معرّف حقيقي لكنه وزن حرّ لا يمرّ (الكيبل مسموح).
          push('non-machine-exercise', where, id)
        }
        if (seen.has(id)) push('duplicate-exercise-in-day', where, id)
        seen.add(id)
      }

      // ③ قانون ترتيب Q19.
      if (!isDayOrdered(ids)) {
        push('order-law-violation', where, orderDayExerciseIds(ids).join(' → '))
      }
    }
  }

  return issues
}
