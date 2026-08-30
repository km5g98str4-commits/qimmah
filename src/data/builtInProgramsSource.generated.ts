// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المولّد: scripts/build-builtin-programs-source.mjs
// المصدر:  data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json (Dataset B)
// إعادة التوليد: node scripts/build-builtin-programs-source.mjs
// الحارس: npm run test:builtin-templates
//
// بصمة المصدر (sha256): 3bcec17a9267eac9ba4c3ed7b1550a96f271db4af633c02c1f2f067fe663b4c7
//
// هذا هو **مصدر الحقيقة الوحيد** لمحتوى البرامج الجاهزة. الجلسة القانونية
// تُكتب مرّة واحدة في `builtInSessions`، و`builtInVariants` تسميات تشير إليها —
// فيومَا «سفلي أ» و«أرجل أ» يتشاركان تعريفًا واحدًا ولا يتباعدان بالسهو.

/** نوع اليوم كما يقرؤه القاموس — تسمية معروضة، لا الجلسة نفسها. */
export type BuiltInDayKind =
  | 'upperA'
  | 'upperB'
  | 'lowerA'
  | 'lowerB'
  | 'legsA'
  | 'legsB'
  | 'fullA'
  | 'fullB'
  | 'fullC'
  | 'pushA'
  | 'pushB'
  | 'pullA'
  | 'pullB'
  | 'upperCompact'
  | 'begFullA'
  | 'begFullB'
  | 'machinesA'
  | 'machinesB'
  | 'machinesC'

export interface BuiltInSessionSource {
  readonly id: string
  readonly warmupId: string
  readonly prescriptionTier: string
  /** بترتيب Q19 القانوني — الفهرس هو ترتيب الأداء. */
  readonly exerciseIds: readonly string[]
}

export interface BuiltInVariantSource {
  readonly id: string
  readonly dayKind: BuiltInDayKind
  readonly sessionId: string
}

export interface BuiltInScheduleEntry {
  readonly day: number
  readonly type: string
  readonly variantId: string | null
}

export interface BuiltInRotation {
  readonly cycleWeeks: number
  readonly sequence: readonly string[]
  readonly weeks: readonly { readonly week: number; readonly variantIds: readonly string[] }[]
}

export interface BuiltInProgramSource {
  readonly templateId: string
  readonly datasetProgramId: string
  readonly order: number
  readonly daysPerWeek: number
  readonly level: string
  readonly variantIds: readonly string[]
  readonly schedule: readonly BuiltInScheduleEntry[]
  readonly rotation: BuiltInRotation | null
}

/** بصمة مجموعة البيانات التي وُلّد منها هذا الملف — يفحصها الحارس. */
export const DATASET_B_SHA256 = '3bcec17a9267eac9ba4c3ed7b1550a96f271db4af633c02c1f2f067fe663b4c7'

/** الجلسات القانونية — مصفوفة التمارين تعيش هنا وحدها. */
export const builtInSessions: Record<string, BuiltInSessionSource> = {
  'cs-upper-a': {
    id: 'cs-upper-a',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-row-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'],
  },
  'cs-lower-a': {
    id: 'cs-lower-a',
    warmupId: 'warmup-lower',
    prescriptionTier: 'standard',
    exerciseIds: ['hack-squat-machine', 'leg-press-machine', 'seated-leg-curl', 'leg-extension-machine', 'seated-calf-raise-machine', 'ab-crunch-machine'],
  },
  'cs-upper-b': {
    id: 'cs-upper-b',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['chest-press-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'chest-supported-row-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'triceps-extension-machine'],
  },
  'cs-lower-b': {
    id: 'cs-lower-b',
    warmupId: 'warmup-lower',
    prescriptionTier: 'standard',
    exerciseIds: ['leg-press-machine', 'hack-squat-machine', 'glute-machine', 'lying-leg-curl', 'leg-extension-machine', 'standing-calf-raise-machine'],
  },
  'cs-fullbody-a': {
    id: 'cs-fullbody-a',
    warmupId: 'warmup-full',
    prescriptionTier: 'standard',
    exerciseIds: ['leg-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-row-machine', 'seated-leg-curl', 'lateral-raise-machine', 'seated-calf-raise-machine'],
  },
  'cs-fullbody-b': {
    id: 'cs-fullbody-b',
    warmupId: 'warmup-full',
    prescriptionTier: 'standard',
    exerciseIds: ['hack-squat-machine', 'incline-chest-press-machine', 'chest-supported-row-machine', 'shoulder-press-machine', 'lat-pulldown-machine', 'leg-extension-machine', 'preacher-curl-machine'],
  },
  'cs-fullbody-c': {
    id: 'cs-fullbody-c',
    warmupId: 'warmup-full',
    prescriptionTier: 'standard',
    exerciseIds: ['leg-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-leg-curl', 'pec-deck-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'],
  },
  'cs-push-a': {
    id: 'cs-push-a',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'],
  },
  'cs-pull-a': {
    id: 'cs-pull-a',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['lat-pulldown-machine', 'seated-row-machine', 'chest-supported-row-machine', 'reverse-pec-deck', 'preacher-curl-machine', 'cable-biceps-curl'],
  },
  'cs-push-b': {
    id: 'cs-push-b',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['chest-press-machine', 'incline-chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'triceps-extension-machine'],
  },
  'cs-pull-b': {
    id: 'cs-pull-b',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['lat-pulldown-machine', 'chest-supported-row-machine', 'seated-row-machine', 'reverse-pec-deck', 'preacher-curl-machine', 'cable-biceps-curl'],
  },
  'cs-upper-compact': {
    id: 'cs-upper-compact',
    warmupId: 'warmup-upper',
    prescriptionTier: 'standard',
    exerciseIds: ['incline-chest-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-row-machine', 'shoulder-press-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'],
  },
  'cs-beginner-fullbody-a': {
    id: 'cs-beginner-fullbody-a',
    warmupId: 'warmup-full',
    prescriptionTier: 'beginner',
    exerciseIds: ['leg-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-row-machine', 'seated-leg-curl', 'lateral-raise-machine'],
  },
  'cs-beginner-fullbody-b': {
    id: 'cs-beginner-fullbody-b',
    warmupId: 'warmup-full',
    prescriptionTier: 'beginner',
    exerciseIds: ['hack-squat-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'seated-row-machine', 'leg-extension-machine'],
  },
  'cs-beginner-machines-b': {
    id: 'cs-beginner-machines-b',
    warmupId: 'warmup-full',
    prescriptionTier: 'beginner',
    exerciseIds: ['hack-squat-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'leg-extension-machine', 'preacher-curl-machine'],
  },
  'cs-beginner-machines-c': {
    id: 'cs-beginner-machines-c',
    warmupId: 'warmup-full',
    prescriptionTier: 'beginner',
    exerciseIds: ['leg-press-machine', 'chest-press-machine', 'seated-row-machine', 'seated-leg-curl', 'pec-deck-machine', 'cable-triceps-pushdown'],
  },
}

/** التسميات المعروضة، وكلٌّ يشير إلى جلسة قانونية (المشاركة = اسمان لجلسة واحدة). */
export const builtInVariants: Record<string, BuiltInVariantSource> = {
  'upper-a': { id: 'upper-a', dayKind: 'upperA', sessionId: 'cs-upper-a' },
  'lower-a': { id: 'lower-a', dayKind: 'lowerA', sessionId: 'cs-lower-a' },
  'upper-b': { id: 'upper-b', dayKind: 'upperB', sessionId: 'cs-upper-b' },
  'lower-b': { id: 'lower-b', dayKind: 'lowerB', sessionId: 'cs-lower-b' },
  'fb-a': { id: 'fb-a', dayKind: 'fullA', sessionId: 'cs-fullbody-a' },
  'fb-b': { id: 'fb-b', dayKind: 'fullB', sessionId: 'cs-fullbody-b' },
  'fb-c': { id: 'fb-c', dayKind: 'fullC', sessionId: 'cs-fullbody-c' },
  'push-a': { id: 'push-a', dayKind: 'pushA', sessionId: 'cs-push-a' },
  'pull-a': { id: 'pull-a', dayKind: 'pullA', sessionId: 'cs-pull-a' },
  'legs-a': { id: 'legs-a', dayKind: 'legsA', sessionId: 'cs-lower-a' },
  'push-b': { id: 'push-b', dayKind: 'pushB', sessionId: 'cs-push-b' },
  'pull-b': { id: 'pull-b', dayKind: 'pullB', sessionId: 'cs-pull-b' },
  'legs-b': { id: 'legs-b', dayKind: 'legsB', sessionId: 'cs-lower-b' },
  'ulf-upper': { id: 'ulf-upper', dayKind: 'upperCompact', sessionId: 'cs-upper-compact' },
  'beg-fb-a': { id: 'beg-fb-a', dayKind: 'begFullA', sessionId: 'cs-beginner-fullbody-a' },
  'beg-fb-b': { id: 'beg-fb-b', dayKind: 'begFullB', sessionId: 'cs-beginner-fullbody-b' },
  'machines-a': { id: 'machines-a', dayKind: 'machinesA', sessionId: 'cs-beginner-fullbody-a' },
  'machines-b': { id: 'machines-b', dayKind: 'machinesB', sessionId: 'cs-beginner-machines-b' },
  'machines-c': { id: 'machines-c', dayKind: 'machinesC', sessionId: 'cs-beginner-machines-c' },
}

/** البرامج الثمانية بترتيب العرض. */
export const builtInProgramSources: readonly BuiltInProgramSource[] = [
  {
    templateId: 'builtin-upper-lower-4',
    datasetProgramId: 'ul-4day-machines',
    order: 1,
    daysPerWeek: 4,
    level: 'beginner_to_intermediate',
    variantIds: ['upper-a', 'lower-a', 'upper-b', 'lower-b'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'upper-a' },
      { day: 2, type: 'workout', variantId: 'lower-a' },
      { day: 3, type: 'rest', variantId: null },
      { day: 4, type: 'workout', variantId: 'upper-b' },
      { day: 5, type: 'workout', variantId: 'lower-b' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest_or_light', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-full-body-3',
    datasetProgramId: 'fullbody-3day-machines',
    order: 2,
    daysPerWeek: 3,
    level: 'beginner',
    variantIds: ['fb-a', 'fb-b', 'fb-c'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'fb-a' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'workout', variantId: 'fb-b' },
      { day: 4, type: 'rest', variantId: null },
      { day: 5, type: 'workout', variantId: 'fb-c' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-ppl-6',
    datasetProgramId: 'ppl-6day-machines',
    order: 3,
    daysPerWeek: 6,
    level: 'intermediate',
    variantIds: ['push-a', 'pull-a', 'legs-a', 'push-b', 'pull-b', 'legs-b'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'push-a' },
      { day: 2, type: 'workout', variantId: 'pull-a' },
      { day: 3, type: 'workout', variantId: 'legs-a' },
      { day: 4, type: 'workout', variantId: 'push-b' },
      { day: 5, type: 'workout', variantId: 'pull-b' },
      { day: 6, type: 'workout', variantId: 'legs-b' },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-ppl-3',
    datasetProgramId: 'ppl-3day-machines',
    order: 4,
    daysPerWeek: 3,
    level: 'beginner_to_intermediate',
    variantIds: ['push-a', 'pull-a', 'legs-a'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'push-a' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'workout', variantId: 'pull-a' },
      { day: 4, type: 'rest', variantId: null },
      { day: 5, type: 'workout', variantId: 'legs-a' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-upper-lower-full-3',
    datasetProgramId: 'ulf-3day-machines',
    order: 5,
    daysPerWeek: 3,
    level: 'beginner_to_intermediate',
    variantIds: ['ulf-upper', 'lower-a', 'fb-a'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'ulf-upper' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'workout', variantId: 'lower-a' },
      { day: 4, type: 'rest', variantId: null },
      { day: 5, type: 'workout', variantId: 'fb-a' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-full-body-2',
    datasetProgramId: 'fullbody-2day-beginner',
    order: 6,
    daysPerWeek: 2,
    level: 'beginner',
    variantIds: ['beg-fb-a', 'beg-fb-b'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'beg-fb-a' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'rest', variantId: null },
      { day: 4, type: 'workout', variantId: 'beg-fb-b' },
      { day: 5, type: 'rest', variantId: null },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
  {
    templateId: 'builtin-upper-lower-3',
    datasetProgramId: 'ul-rotating-3day-machines',
    order: 7,
    daysPerWeek: 3,
    level: 'intermediate',
    variantIds: ['upper-a', 'lower-a', 'upper-b', 'lower-b'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'upper-a' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'workout', variantId: 'lower-a' },
      { day: 4, type: 'rest', variantId: null },
      { day: 5, type: 'workout', variantId: 'upper-b' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: { cycleWeeks: 4, sequence: ['upper-a', 'lower-a', 'upper-b', 'lower-b'], weeks: [{ week: 1, variantIds: ['upper-a', 'lower-a', 'upper-b'] }, { week: 2, variantIds: ['lower-b', 'upper-a', 'lower-a'] }, { week: 3, variantIds: ['upper-b', 'lower-b', 'upper-a'] }, { week: 4, variantIds: ['lower-a', 'upper-b', 'lower-b'] }] },
  },
  {
    templateId: 'builtin-beginner-machines-3',
    datasetProgramId: 'beginner-machines-3day',
    order: 8,
    daysPerWeek: 3,
    level: 'beginner',
    variantIds: ['machines-a', 'machines-b', 'machines-c'],
    schedule: [
      { day: 1, type: 'workout', variantId: 'machines-a' },
      { day: 2, type: 'rest', variantId: null },
      { day: 3, type: 'workout', variantId: 'machines-b' },
      { day: 4, type: 'rest', variantId: null },
      { day: 5, type: 'workout', variantId: 'machines-c' },
      { day: 6, type: 'rest', variantId: null },
      { day: 7, type: 'rest', variantId: null },
    ],
    rotation: null,
  },
]

/** البدائل المعتمدة لكل تمرين مبرمَج — أجهزة/كيبل فقط، بنفس وظيفة الحركة. */
export const builtInSubstitutions: Record<string, readonly string[]> = {
  'ab-crunch-machine': [],
  'cable-biceps-curl': ['preacher-curl-machine', 'machine-curl'],
  'cable-triceps-pushdown': ['rope-pushdown', 'triceps-extension-machine', 'single-arm-pushdown'],
  'chest-press-machine': ['iso-lateral-chest-press', 'incline-chest-press-machine'],
  'chest-supported-row-machine': ['seated-row-machine', 't-bar-row-machine', 'seated-cable-row'],
  'glute-machine': ['glute-kickback-machine', 'standing-hip-extension-machine', 'cable-pull-through'],
  'hack-squat-machine': ['leg-press-machine', 'belt-squat'],
  'incline-chest-press-machine': ['iso-lateral-incline-press', 'chest-press-machine'],
  'lat-pulldown-machine': ['iso-lateral-pulldown', 'wide-grip-lat-pulldown', 'neutral-grip-pulldown'],
  'lateral-raise-machine': ['cable-lateral-raise'],
  'leg-extension-machine': [],
  'leg-press-machine': ['hack-squat-machine', 'leg-press-narrow', 'belt-squat'],
  'lying-leg-curl': ['seated-leg-curl', 'standing-leg-curl'],
  'pec-deck-machine': ['machine-fly', 'cable-crossover'],
  'preacher-curl-machine': ['cable-biceps-curl', 'machine-curl'],
  'reverse-pec-deck': ['rear-delt-row-machine', 'face-pull', 'cable-rear-delt-fly'],
  'seated-calf-raise-machine': ['standing-calf-raise-machine', 'leg-press-calf-raise'],
  'seated-leg-curl': ['lying-leg-curl', 'standing-leg-curl'],
  'seated-row-machine': ['seated-cable-row', 'iso-lateral-high-row', 'chest-supported-row-machine'],
  'shoulder-press-machine': ['cable-shoulder-press'],
  'standing-calf-raise-machine': ['seated-calf-raise-machine', 'leg-press-calf-raise'],
  'triceps-extension-machine': ['cable-triceps-pushdown', 'rope-pushdown'],
}
