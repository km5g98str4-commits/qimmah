// كتالوج الأجهزة (P12) — الأجهزة هي التمارين الأساسية الوحيدة في التطبيق.
//
// الكتالوج المعتمد من المؤسس: كل جهاز بمعرّف قانوني (slug) واسم ثنائي اللغة وتصنيف فرعي
// ثنائي اللغة (subGroup). الحركات الحرّة (بار/بنش) ليست أساسية — تظهر فقط كبدائل دمبل/كيبل
// (انظر machineAlternatives.ts) وخطوات الاستخدام في machineHowTo.ts.
//
// ملاحظة: هذا الكتالوج طبقة تنظيم/عرض فوق exercises.ts — كل exerciseId يجب أن يكون موجودًا
// في exercises.ts (يتحقّق منه catalogMissingIds).

import { canonicalExerciseId, getExercise } from '@/data/exercises'

/** المجموعات الأساسية في كتالوج الأجهزة. */
export type MachineGroupKey = 'chest' | 'back' | 'shoulders' | 'legs' | 'biceps' | 'triceps' | 'abs'

/** تصنيف فرعي ثنائي اللغة داخل المجموعة (مثل: صدر مستوي / Flat Chest). */
export interface MachineSubGroup {
  ar: string
  en: string
}

/** عنصر جهاز واحد في الكتالوج. */
export interface MachineItem {
  /** معرّف التمرين القانوني في exercises.ts (مصدر الـ demo/الفيديو والخطة). */
  exerciseId: string
  /** اسم الجهاز بالإنجليزية (كما هو شائع في الصالة). */
  nameEn: string
  /** الاسم العربي. */
  nameAr: string
  /** العضلة الهدف بالعربية (للعرض السريع). */
  targetMuscleAr: string
  /** التصنيف الفرعي ثنائي اللغة داخل المجموعة. */
  subGroup: MachineSubGroup
  /**
   * @deprecated استخدم subGroup.ar — يبقى للتوافق مع الواجهات القديمة.
   */
  subGroupAr?: string
  /** أسماء بديلة قابلة للبحث (مثل أسماء Hammer Strength للأجهزة Iso-Lateral). */
  aliasesEn?: string[]
  /** مجموعات/عضلات أخرى يخدمها الجهاز (مشاركة بين الأقسام). */
  sharedGroups?: string[]
}

/** مجموعة أجهزة (Chest/Back/Legs/...). */
export interface MachineGroup {
  key: MachineGroupKey
  titleEn: string
  titleAr: string
  items: MachineItem[]
}

// اختصارات التصنيفات الفرعية (ثنائية اللغة).
const SUB = {
  chestFlat: { ar: 'صدر مستوي', en: 'Flat Chest' },
  chestIncline: { ar: 'صدر علوي', en: 'Upper Chest' },
  chestDecline: { ar: 'صدر سفلي', en: 'Lower Chest' },
  latsLower: { ar: 'لاتس سفلي', en: 'Lower Lats' },
  latsWidth: { ar: 'لاتس جانبي', en: 'Lat Width' },
  upperBack: { ar: 'ظهر علوي', en: 'Upper Back' },
  frontDelt: { ar: 'كتف أمامي', en: 'Front Delts' },
  sideDelt: { ar: 'كتف جانبي', en: 'Side Delts' },
  rearDelt: { ar: 'كتف خلفي', en: 'Rear Delts' },
  quads: { ar: 'فخذ أمامي', en: 'Quads' },
  hamstrings: { ar: 'فخذ خلفي', en: 'Hamstrings' },
  adductors: { ar: 'الفخذ الداخلي', en: 'Inner Thigh' },
  glutes: { ar: 'الألوية', en: 'Glutes' },
  calves: { ar: 'البطات', en: 'Calves' },
  biceps: { ar: 'بايسبس', en: 'Biceps' },
  triceps: { ar: 'ترايسبس', en: 'Triceps' },
  abs: { ar: 'البطن', en: 'Abs' },
} as const satisfies Record<string, MachineSubGroup>

/** يبني عنصر كتالوج مع ملء subGroupAr المتوافق تلقائيًا. */
function item(i: Omit<MachineItem, 'subGroupAr'>): MachineItem {
  return { ...i, subGroupAr: i.subGroup.ar }
}

/**
 * كتالوج الأجهزة المعتمد — الأجهزة الأساسية الوحيدة في التطبيق، منظّمة حسب المجموعة
 * والتصنيف الفرعي بترتيب أولوية المبتدئ.
 */
export const machineCatalog: MachineGroup[] = [
  {
    key: 'chest',
    titleEn: 'Chest',
    titleAr: 'الصدر',
    items: [
      item({ exerciseId: 'chest-press-machine', nameEn: 'Chest Press Machine', nameAr: 'جهاز ضغط الصدر', targetMuscleAr: 'الصدر', subGroup: SUB.chestFlat }),
      item({ exerciseId: 'iso-lateral-chest-press', nameEn: 'Iso-Lateral Chest Press', nameAr: 'ضغط صدر أيزو-لاترال', targetMuscleAr: 'الصدر', subGroup: SUB.chestFlat, aliasesEn: ['Hammer Strength Chest Press'] }),
      item({ exerciseId: 'incline-chest-press-machine', nameEn: 'Incline Chest Press Machine', nameAr: 'جهاز ضغط صدر علوي', targetMuscleAr: 'الصدر العلوي', subGroup: SUB.chestIncline }),
      item({ exerciseId: 'iso-lateral-incline-press', nameEn: 'Iso-Lateral Incline Press', nameAr: 'ضغط علوي أيزو-لاترال', targetMuscleAr: 'الصدر العلوي', subGroup: SUB.chestIncline, aliasesEn: ['Hammer Strength Incline Press'] }),
      item({ exerciseId: 'decline-chest-press-machine', nameEn: 'Decline Chest Press Machine', nameAr: 'جهاز ضغط صدر سفلي', targetMuscleAr: 'الصدر السفلي', subGroup: SUB.chestDecline }),
      item({ exerciseId: 'assisted-dip-machine', nameEn: 'Assisted Dip Machine', nameAr: 'جهاز غطس مساعد', targetMuscleAr: 'الصدر السفلي والترايسبس', subGroup: SUB.chestDecline, sharedGroups: ['triceps'] }),
      item({ exerciseId: 'pec-deck-machine', nameEn: 'Pec Deck Machine', nameAr: 'جهاز فلاي صدر', targetMuscleAr: 'وسط الصدر', subGroup: SUB.chestFlat }),
    ],
  },
  {
    key: 'back',
    titleEn: 'Back',
    titleAr: 'الظهر',
    items: [
      // — لاتس سفلي —
      item({ exerciseId: 'lat-pulldown-machine', nameEn: 'Lat Pulldown Machine (Seated/Lever)', nameAr: 'جهاز سحب علوي', targetMuscleAr: 'اللاتس السفلي', subGroup: SUB.latsLower }),
      item({ exerciseId: 'single-arm-lat-pulldown', nameEn: 'Single-Arm Lat Pulldown', nameAr: 'سحب علوي بذراع واحدة', targetMuscleAr: 'اللاتس السفلي', subGroup: SUB.latsLower }),
      item({ exerciseId: 'iso-lateral-pulldown', nameEn: 'Iso-Lateral Pulldown', nameAr: 'سحب أيزو-لاترال', targetMuscleAr: 'اللاتس السفلي', subGroup: SUB.latsLower, aliasesEn: ['Hammer Strength Pulldown'] }),
      item({ exerciseId: 'iso-lateral-high-row', nameEn: 'Iso-Lateral High Row', nameAr: 'تجديف عالي أيزو-لاترال', targetMuscleAr: 'اللاتس السفلي', subGroup: SUB.latsLower, aliasesEn: ['Hammer Strength High Row'] }),
      // — لاتس جانبي (عرض الظهر) —
      item({ exerciseId: 'wide-grip-lat-pulldown', nameEn: 'Wide-Grip Lat Pulldown', nameAr: 'سحب علوي قبضة واسعة', targetMuscleAr: 'اللاتس الجانبي', subGroup: SUB.latsWidth }),
      item({ exerciseId: 'wide-grip-iso-lateral-pulldown', nameEn: 'Wide-Grip Iso-Lateral Pulldown', nameAr: 'سحب أيزو-لاترال واسع', targetMuscleAr: 'اللاتس الجانبي', subGroup: SUB.latsWidth, aliasesEn: ['Hammer Strength Wide-Grip Pulldown'] }),
      item({ exerciseId: 'seated-row-machine', nameEn: 'Seated Row Machine', nameAr: 'جهاز تجديف جالس', targetMuscleAr: 'اللاتس والظهر العلوي', subGroup: SUB.latsWidth, sharedGroups: ['upper-back'] }),
      // — ظهر علوي —
      item({ exerciseId: 'chest-supported-row-machine', nameEn: 'Chest-Supported Row Machine', nameAr: 'تجديف بمسند صدر', targetMuscleAr: 'الظهر العلوي', subGroup: SUB.upperBack }),
      item({ exerciseId: 't-bar-row-machine', nameEn: 'T-Bar Row Machine', nameAr: 'جهاز تجديف تي-بار', targetMuscleAr: 'الظهر العلوي', subGroup: SUB.upperBack }),
      item({ exerciseId: 'rear-delt-row-machine', nameEn: 'Rear Delt Row Machine', nameAr: 'تجديف كتف خلفي', targetMuscleAr: 'الكتف الخلفي والظهر العلوي', subGroup: SUB.upperBack, sharedGroups: ['rear-delts'] }),
    ],
  },
  {
    key: 'shoulders',
    titleEn: 'Shoulders',
    titleAr: 'الأكتاف',
    items: [
      item({ exerciseId: 'shoulder-press-machine', nameEn: 'Shoulder Press Machine', nameAr: 'جهاز ضغط كتف', targetMuscleAr: 'الكتف الأمامي', subGroup: SUB.frontDelt }),
      item({ exerciseId: 'lateral-raise-machine', nameEn: 'Lateral Raise Machine', nameAr: 'جهاز رفرفة جانبية', targetMuscleAr: 'الكتف الجانبي', subGroup: SUB.sideDelt }),
      item({ exerciseId: 'reverse-pec-deck', nameEn: 'Reverse Pec Deck', nameAr: 'بيك دك عكسي', targetMuscleAr: 'الكتف الخلفي والظهر العلوي', subGroup: SUB.rearDelt, aliasesEn: ['Rear Delt Machine'], sharedGroups: ['upper-back'] }),
    ],
  },
  {
    key: 'legs',
    titleEn: 'Legs',
    titleAr: 'الأرجل',
    items: [
      // — فخذ أمامي (Quads) —
      item({ exerciseId: 'leg-extension-machine', nameEn: 'Leg Extension Machine', nameAr: 'جهاز مد الأرجل', targetMuscleAr: 'أمامية الفخذ', subGroup: SUB.quads }),
      item({ exerciseId: 'hack-squat-machine', nameEn: 'Hack Squat Machine', nameAr: 'هاك سكوات جهاز', targetMuscleAr: 'أمامية الفخذ', subGroup: SUB.quads }),
      item({ exerciseId: 'leg-press-machine', nameEn: 'Leg Press Machine', nameAr: 'جهاز دفع الأرجل', targetMuscleAr: 'أمامية الفخذ', subGroup: SUB.quads }),
      // — فخذ خلفي (Hamstrings) —
      item({ exerciseId: 'seated-leg-curl', nameEn: 'Seated Leg Curl', nameAr: 'ثني أرجل جالس', targetMuscleAr: 'خلفية الفخذ', subGroup: SUB.hamstrings }),
      item({ exerciseId: 'lying-leg-curl', nameEn: 'Lying Leg Curl', nameAr: 'ثني أرجل مستلقي', targetMuscleAr: 'خلفية الفخذ', subGroup: SUB.hamstrings }),
      item({ exerciseId: 'standing-leg-curl', nameEn: 'Standing Leg Curl', nameAr: 'ثني أرجل واقف', targetMuscleAr: 'خلفية الفخذ', subGroup: SUB.hamstrings }),
      // — الفخذ الداخلي (Adductors) —
      item({ exerciseId: 'hip-adductor-machine', nameEn: 'Hip Adductor Machine', nameAr: 'جهاز ضم الفخذ', targetMuscleAr: 'الفخذ الداخلي', subGroup: SUB.adductors }),
      item({ exerciseId: 'hip-abduction-machine', nameEn: 'Hip Abduction Machine', nameAr: 'جهاز مباعدة الأرجل', targetMuscleAr: 'الفخذ الخارجي والألوية', subGroup: SUB.glutes }),
      // — الألوية (Glutes) —
      item({ exerciseId: 'glute-machine', nameEn: 'Glute Machine', nameAr: 'جهاز الألوية', targetMuscleAr: 'الألوية', subGroup: SUB.glutes }),
      item({ exerciseId: 'glute-kickback-machine', nameEn: 'Glute Kickback Machine', nameAr: 'جهاز ركل خلفي', targetMuscleAr: 'الألوية', subGroup: SUB.glutes }),
      item({ exerciseId: 'standing-hip-extension-machine', nameEn: 'Standing Hip Extension Machine', nameAr: 'مد ورك واقف', targetMuscleAr: 'الألوية', subGroup: SUB.glutes }),
      // — البطات (Calves) —
      item({ exerciseId: 'seated-calf-raise-machine', nameEn: 'Seated Calf Raise Machine', nameAr: 'رفع بطات جالس', targetMuscleAr: 'البطات', subGroup: SUB.calves }),
      item({ exerciseId: 'standing-calf-raise-machine', nameEn: 'Standing Calf Raise Machine', nameAr: 'رفع بطات واقف', targetMuscleAr: 'البطات', subGroup: SUB.calves }),
    ],
  },
  {
    key: 'biceps',
    titleEn: 'Biceps',
    titleAr: 'البايسبس',
    items: [
      item({ exerciseId: 'preacher-curl-machine', nameEn: 'Preacher Curl Machine', nameAr: 'جهاز مرجحة بايسبس', targetMuscleAr: 'البايسبس', subGroup: SUB.biceps }),
      item({ exerciseId: 'cable-biceps-curl', nameEn: 'Cable Biceps Curl', nameAr: 'مرجحة بايسبس كيبل', targetMuscleAr: 'البايسبس', subGroup: SUB.biceps }),
    ],
  },
  {
    key: 'triceps',
    titleEn: 'Triceps',
    titleAr: 'الترايسبس',
    items: [
      item({ exerciseId: 'triceps-extension-machine', nameEn: 'Triceps Extension Machine', nameAr: 'جهاز مد ترايسبس', targetMuscleAr: 'الترايسبس', subGroup: SUB.triceps }),
      item({ exerciseId: 'cable-triceps-pushdown', nameEn: 'Cable Triceps Pushdown', nameAr: 'دفع ترايسبس كيبل', targetMuscleAr: 'الترايسبس', subGroup: SUB.triceps }),
      item({ exerciseId: 'assisted-dip-machine', nameEn: 'Assisted Dip Machine', nameAr: 'جهاز غطس مساعد', targetMuscleAr: 'الترايسبس والصدر السفلي', subGroup: SUB.triceps, sharedGroups: ['chest'] }),
    ],
  },
  {
    key: 'abs',
    titleEn: 'Abs',
    titleAr: 'البطن',
    items: [
      item({ exerciseId: 'ab-crunch-machine', nameEn: 'Ab Crunch Machine', nameAr: 'جهاز طحن البطن', targetMuscleAr: 'البطن', subGroup: SUB.abs }),
    ],
  },
]

/** كل معرّفات تمارين الأجهزة في الكتالوج (مسطّحة، بلا تكرار — الجهاز المشترك يظهر مرة). */
export const machineCatalogExerciseIds: string[] = Array.from(
  new Set(machineCatalog.flatMap((g) => g.items.map((i) => i.exerciseId))),
)

/** مجموعة بحث سريعة: هل هذا التمرين ضمن كتالوج الأجهزة القابل للتصفّح (يشمل الذراعين/البطن)؟
 *  للعرض/التصفّح فقط (مكتبة الأجهزة + مصنّف الباني). ليست مجموعة «الأساسيات». */
export const machineCatalogIdSet: ReadonlySet<string> = new Set(machineCatalogExerciseIds)

/**
 * قائمة الأساسيات المعتمدة (قرار زياد النهائي، P12) — المصدر الوحيد لما يختاره
 * مولّد الخطط والقوالب كتمرين «أساسي». **لا شيء خارج هذه القائمة يكون أساسيًا.**
 * أجهزة الذراعين/البطن والكيبل تبقى في المكتبة وكبدائل، لكنها لا تظهر أساسيات خطة أبدًا.
 * الترتيب مطابق لقائمة زياد (صدر ← ظهر ← أكتاف ← أرجل) ليكون تدقيقه بصريًا سهلًا.
 */
export const PRIMARY_MACHINE_IDS: readonly string[] = [
  // الصدر (٦)
  'chest-press-machine', 'iso-lateral-chest-press', 'incline-chest-press-machine',
  'iso-lateral-incline-press', 'decline-chest-press-machine', 'assisted-dip-machine',
  // الظهر (١٠)
  'lat-pulldown-machine', 'single-arm-lat-pulldown', 'iso-lateral-pulldown',
  'iso-lateral-high-row', 'wide-grip-lat-pulldown', 'wide-grip-iso-lateral-pulldown',
  'seated-row-machine', 'chest-supported-row-machine', 't-bar-row-machine', 'rear-delt-row-machine',
  // الأكتاف (٣)
  'shoulder-press-machine', 'lateral-raise-machine', 'reverse-pec-deck',
  // الأرجل (١٢)
  'leg-extension-machine', 'hack-squat-machine', 'leg-press-machine',
  'seated-leg-curl', 'lying-leg-curl', 'standing-leg-curl', 'hip-adductor-machine',
  'glute-machine', 'glute-kickback-machine', 'standing-hip-extension-machine',
  'seated-calf-raise-machine', 'standing-calf-raise-machine',
]

/** مجموعة الأساسيات المعتمدة — يستخدمها المولّد والقوالب وQA. */
export const primaryMachineIdSet: ReadonlySet<string> = new Set(PRIMARY_MACHINE_IDS)

/**
 * هل هذا المعرّف تمرينًا **أساسيًا** (ضمن قائمة زياد الـ٣٢)؟
 * يقبل المعرّفات القديمة أيضًا (يحوّلها للقانوني قبل الفحص).
 * ملاحظة: أجهزة الذراعين/البطن ضمن الكتالوج القابل للتصفّح لكنها ليست أساسيات → تُعيد false.
 */
export function isMachinePrimary(id: string): boolean {
  return primaryMachineIdSet.has(canonicalExerciseId(id))
}

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
