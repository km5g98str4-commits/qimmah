// كتالوج الأجهزة (Phase 2) — الأجهزة صديقة المبتدئ، منظَّمة حسب المجموعة العضلية.
//
// الهدف: مكتبة أجهزة واضحة للنادي التجاري يفهمها المبتدئ بسهولة:
//  - اسم إنجليزي أولًا (اسم الجهاز كما هو شائع في الصالة) + عنوان فرعي عربي + العضلة الهدف بالعربية.
//  - كل عنصر يشير إلى تمرين موجود في exercises.ts (exerciseId) ليعمل الـ demo (الفيديو) والخطة معه.
//
// ملاحظة: هذا الكتالوج طبقة تنظيم/عرض فوق exercises.ts — لا يكرّر بيانات التمرين الغذائية/الإرشادية.
// كل exerciseId هنا يجب أن يكون موجودًا في exercises.ts (يتحقّق منه سكربت QA + الدالة assertCatalogIntegrity).

import { getExercise } from '@/data/exercises'

/** المجموعات الأساسية في كتالوج الأجهزة. */
export type MachineGroupKey = 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps'

/** عنصر جهاز واحد في الكتالوج. */
export interface MachineItem {
  /** معرّف التمرين في exercises.ts (مصدر الـ demo/الفيديو والخطة). */
  exerciseId: string
  /** اسم الجهاز بالإنجليزية أولًا (كما هو شائع في الصالة). */
  nameEn: string
  /** عنوان فرعي بالعربية. */
  nameAr: string
  /** العضلة الهدف بالعربية (للعرض السريع). */
  targetMuscleAr: string
  /** تصنيف فرعي داخل المجموعة (مثل: صدر مستوي / كوادز / هامسترنج). */
  subGroupAr?: string
}

/** مجموعة أجهزة (Chest/Back/Legs/...). */
export interface MachineGroup {
  key: MachineGroupKey
  titleEn: string
  titleAr: string
  items: MachineItem[]
}

/**
 * كتالوج الأجهزة — مرتّب بحسب أولوية المبتدئ داخل كل مجموعة.
 * الأسماء العربية للأقسام الفرعية تتبع طلب المؤسس (صدر مستوي/علوي/سفلي، لاتس وسط/سفلي، ...).
 */
export const machineCatalog: MachineGroup[] = [
  {
    key: 'chest',
    titleEn: 'Chest',
    titleAr: 'الصدر',
    items: [
      { exerciseId: 'chest-press-machine', nameEn: 'Chest Press Machine', nameAr: 'ضغط صدر مستوي', targetMuscleAr: 'الصدر', subGroupAr: 'صدر مستوي' },
      { exerciseId: 'incline-machine-press', nameEn: 'Incline Chest Press Machine', nameAr: 'ضغط صدر علوي', targetMuscleAr: 'الصدر العلوي', subGroupAr: 'صدر علوي' },
      { exerciseId: 'decline-machine-press', nameEn: 'Decline Chest Press Machine', nameAr: 'ضغط صدر سفلي', targetMuscleAr: 'الصدر السفلي', subGroupAr: 'صدر سفلي' },
      { exerciseId: 'pec-deck', nameEn: 'Pec Deck (Chest Fly)', nameAr: 'تفتيح الصدر (بيك دك)', targetMuscleAr: 'الصدر', subGroupAr: 'تفتيح' },
    ],
  },
  {
    key: 'back',
    titleEn: 'Back',
    titleAr: 'الظهر',
    items: [
      { exerciseId: 'machine-row', nameEn: 'Seated Row Machine', nameAr: 'تجديف جهاز', targetMuscleAr: 'الظهر العلوي', subGroupAr: 'ظهر علوي' },
      { exerciseId: 'lat-pulldown', nameEn: 'Lat Pulldown', nameAr: 'سحب أمامي (لات)', targetMuscleAr: 'العضلة الجناحية (لاتس)', subGroupAr: 'لاتس الوسط' },
      { exerciseId: 'low-row-machine', nameEn: 'Low Row Machine', nameAr: 'تجديف منخفض', targetMuscleAr: 'اللاتس السفلي', subGroupAr: 'لاتس سفلي' },
    ],
  },
  {
    key: 'legs',
    titleEn: 'Legs',
    titleAr: 'الأرجل',
    items: [
      // — أمامية الفخذ (Quads) —
      { exerciseId: 'leg-extension', nameEn: 'Leg Extension Machine', nameAr: 'تمديد الأرجل', targetMuscleAr: 'أمامية الفخذ', subGroupAr: 'كوادز' },
      { exerciseId: 'leg-press', nameEn: 'Leg Press Machine', nameAr: 'دفع الأرجل', targetMuscleAr: 'أمامية الفخذ', subGroupAr: 'كوادز' },
      { exerciseId: 'hack-squat', nameEn: 'Hack Squat Machine', nameAr: 'هاك سكوات', targetMuscleAr: 'أمامية الفخذ', subGroupAr: 'كوادز' },
      { exerciseId: 'belt-squat', nameEn: 'Belt Squat Machine', nameAr: 'سكوات بالحزام', targetMuscleAr: 'أمامية الفخذ', subGroupAr: 'كوادز' },
      // — خلفية الفخذ (Hamstrings) —
      { exerciseId: 'lying-leg-curl', nameEn: 'Lying Leg Curl Machine', nameAr: 'ثني الأرجل مستلقي', targetMuscleAr: 'خلفية الفخذ', subGroupAr: 'هامسترنج' },
      { exerciseId: 'seated-leg-curl', nameEn: 'Seated Leg Curl Machine', nameAr: 'ثني الأرجل جالس', targetMuscleAr: 'خلفية الفخذ', subGroupAr: 'هامسترنج' },
      { exerciseId: 'machine-rdl', nameEn: 'RDL Machine', nameAr: 'الرفعة الرومانية بالجهاز', targetMuscleAr: 'خلفية الفخذ', subGroupAr: 'هامسترنج' },
      { exerciseId: 'glute-ham-raise', nameEn: 'Glute-Ham Raise (GHR)', nameAr: 'رفع الجلوت-هام', targetMuscleAr: 'خلفية الفخذ', subGroupAr: 'هامسترنج' },
      // — المؤخرة (Glutes) —
      { exerciseId: 'machine-hip-thrust', nameEn: 'Hip Thrust Machine', nameAr: 'دفع الورك بالجهاز', targetMuscleAr: 'المؤخرة', subGroupAr: 'جلوت' },
      { exerciseId: 'glute-kickback-machine', nameEn: 'Glute Kickback Machine', nameAr: 'ركلة المؤخرة بالجهاز', targetMuscleAr: 'المؤخرة', subGroupAr: 'جلوت' },
      { exerciseId: 'abduction-machine', nameEn: 'Hip Abduction Machine', nameAr: 'مباعدة الأرجل', targetMuscleAr: 'المؤخرة (الجانبية)', subGroupAr: 'جلوت' },
      { exerciseId: 'adduction-machine', nameEn: 'Hip Adduction Machine', nameAr: 'تقريب الأرجل', targetMuscleAr: 'العضلات المقرّبة', subGroupAr: 'جلوت' },
      // — السمانة (Calves) —
      { exerciseId: 'standing-calf-raise', nameEn: 'Standing Calf Raise Machine', nameAr: 'رفع السمانة واقف', targetMuscleAr: 'السمانة', subGroupAr: 'سمانة' },
      { exerciseId: 'seated-calf-raise', nameEn: 'Seated Calf Raise Machine', nameAr: 'رفع السمانة جالس', targetMuscleAr: 'السمانة', subGroupAr: 'سمانة' },
    ],
  },
  {
    key: 'shoulders',
    titleEn: 'Shoulders',
    titleAr: 'الأكتاف',
    items: [
      { exerciseId: 'shoulder-press-machine', nameEn: 'Shoulder Press Machine', nameAr: 'ضغط كتف جهاز', targetMuscleAr: 'الأكتاف' },
      { exerciseId: 'machine-lateral-raise', nameEn: 'Lateral Raise Machine', nameAr: 'رفرفة جانبي جهاز', targetMuscleAr: 'الكتف الجانبي' },
      { exerciseId: 'reverse-pec-deck', nameEn: 'Reverse Pec Deck', nameAr: 'رفرفة خلفي جهاز', targetMuscleAr: 'الكتف الخلفي' },
    ],
  },
  {
    key: 'biceps',
    titleEn: 'Biceps',
    titleAr: 'البايسبس',
    items: [
      { exerciseId: 'machine-curl', nameEn: 'Biceps Curl Machine', nameAr: 'ثني البايسبس جهاز', targetMuscleAr: 'البايسبس' },
      { exerciseId: 'preacher-curl', nameEn: 'Preacher Curl Machine', nameAr: 'ثني بريتشر', targetMuscleAr: 'البايسبس' },
    ],
  },
  {
    key: 'triceps',
    titleEn: 'Triceps',
    titleAr: 'الترايسبس',
    items: [
      { exerciseId: 'triceps-dip-machine', nameEn: 'Triceps Dip Machine', nameAr: 'غطس ترايسبس جهاز', targetMuscleAr: 'الترايسبس' },
    ],
  },
]

/** كل معرّفات تمارين الأجهزة في الكتالوج (مسطّحة). */
export const machineCatalogExerciseIds: string[] = machineCatalog.flatMap((g) => g.items.map((i) => i.exerciseId))

/** مجموعة بحث سريعة: هل هذا التمرين ضمن كتالوج الأجهزة المنسّق؟ */
export const machineCatalogIdSet: ReadonlySet<string> = new Set(machineCatalogExerciseIds)

/** يعيد مجموعة كتالوج بمفتاحها. */
export function getMachineGroup(key: MachineGroupKey): MachineGroup | undefined {
  return machineCatalog.find((g) => g.key === key)
}

/**
 * تحقّق سلامة: كل exerciseId في الكتالوج موجود في exercises.ts. يُرجع قائمة المفقود (فارغة = سليم).
 * يُستخدم في QA — لا يرمي استثناء في الإنتاج.
 */
export function catalogMissingIds(): string[] {
  return machineCatalogExerciseIds.filter((id) => !getExercise(id))
}
