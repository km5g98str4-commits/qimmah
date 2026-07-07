import type { Lang } from '@/lib/appPreferences'

export interface LibraryStrings {
  // ExerciseLibraryView — header
  eyebrow: string
  title: string
  countSuffix: string // "{n} تمرين بشرح ومجموعات مستهدفة."
  // view switch
  allExercises: string
  machinesForBeginners: string
  // search
  searchPlaceholder: string
  searchAria: string
  clearSearchAria: string
  // filters
  filterMuscle: string
  filterEquipment: string
  all: string
  resultsSuffix: string // "{n} نتيجة · مرتّبة أبجديًا"
  noResults: string // ExerciseLibraryView empty state
  // machine catalog
  machineHint: string // "الأجهزة الموجّهة... اختر جهازًا..." (before count)
  machineHintSuffix: string // "{n} جهازًا."
  // muscle filter labels
  muscleAll: string
  muscleChest: string
  muscleBack: string
  muscleShoulders: string
  muscleBiceps: string
  muscleTriceps: string
  muscleQuads: string
  muscleQuadsFront: string
  muscleHamstrings: string
  muscleGlutes: string
  muscleCalves: string
  muscleCore: string
  muscleCardio: string
  // equipment labels
  equipBarbell: string
  equipDumbbell: string
  equipMachine: string
  equipCable: string
  equipBodyweight: string
  equipBench: string
  equipKettlebell: string
  equipSmith: string
  equipEzBar: string
  // ExerciseDetail — tabs
  tabAbout: string
  tabHistory: string
  tabCharts: string
  tabRecords: string
  close: string
  // level labels
  levelBeginner: string
  levelIntermediate: string
  levelAdvanced: string
  // AboutTab blocks
  targetMuscles: string
  primary: string
  secondary: string
  howToPerform: string
  techniqueTips: string
  commonMistakes: string
  watchOnYouTube: string
  addToMyPlan: string
  // HistoryTab
  historyEmpty: string
  lastWeight: string
  bestWeight: string
  lastReps: string
  workout: string // fallback day name
  setUnit: string // "مجموعة"
  volumeLabel: string // "حجم" prefix
  kg: string
  // ChartsTab
  chartsEmpty: string
  bestOneRepMax: string
  bestVolume: string
  sessionsCount: string
  topSetWeightTrend: string
  needTwoSessions: string
  // RecordsTab
  recordsEmpty: string
  recBestWeight: string
  recBestReps: string
  recBestVolume: string
  recBestOneRepMax: string
  // ExerciseLibraryPicker
  pickerTitle: string
  pickerSearchPlaceholder: string
  pickerNoResults: string
  add: string
  // picker muscle options
  muscleAllOptions: string // "كل العضلات"
  // picker environment options
  envAll: string
  envGym: string
  envHome: string
  envBoth: string
  // picker level options
  levelAll: string
}

const ar: LibraryStrings = {
  eyebrow: 'المكتبة',
  title: 'مكتبة التمارين',
  countSuffix: 'تمرين بشرح ومجموعات مستهدفة.',
  allExercises: 'كل التمارين',
  machinesForBeginners: 'الأجهزة (للمبتدئين)',
  searchPlaceholder: 'ابحث باسم التمرين بالعربي أو الإنجليزي…',
  searchAria: 'بحث',
  clearSearchAria: 'مسح البحث',
  filterMuscle: 'العضلة',
  filterEquipment: 'المعدّات',
  all: 'الكل',
  resultsSuffix: 'نتيجة · مرتّبة أبجديًا',
  noResults: 'ما فيه نتائج مطابقة — جرّب كلمة أو فلتر مختلف.',
  machineHint: 'الأجهزة الموجّهة أسهل وأأمن للبداية — اختر جهازًا لتشاهد الشرح والعضلة المستهدفة.',
  machineHintSuffix: 'جهازًا.',
  muscleAll: 'الكل',
  muscleChest: 'صدر',
  muscleBack: 'ظهر',
  muscleShoulders: 'أكتاف',
  muscleBiceps: 'بايسبس',
  muscleTriceps: 'ترايسبس',
  muscleQuads: 'أرجل',
  muscleQuadsFront: 'أرجل (أمامي)',
  muscleHamstrings: 'خلفي الفخذ',
  muscleGlutes: 'جلوتس',
  muscleCalves: 'سمانة',
  muscleCore: 'كور',
  muscleCardio: 'كارديو',
  equipBarbell: 'بار',
  equipDumbbell: 'دمبل',
  equipMachine: 'جهاز',
  equipCable: 'كيبل',
  equipBodyweight: 'وزن الجسم',
  equipBench: 'مقعد',
  equipKettlebell: 'كيتل بل',
  equipSmith: 'سميث',
  equipEzBar: 'إيزي بار',
  tabAbout: 'عن التمرين',
  tabHistory: 'التاريخ',
  tabCharts: 'الرسوم',
  tabRecords: 'الأرقام',
  close: 'إغلاق',
  levelBeginner: 'مبتدئ',
  levelIntermediate: 'متوسط',
  levelAdvanced: 'متقدّم',
  targetMuscles: 'العضلات المستهدفة',
  primary: 'أساسية',
  secondary: 'ثانوية',
  howToPerform: 'طريقة الأداء',
  techniqueTips: 'نصائح تقنية',
  commonMistakes: 'أخطاء شائعة',
  watchOnYouTube: 'شاهد على يوتيوب',
  addToMyPlan: 'أضف لخطتي',
  historyEmpty: 'ما فيه سجلّ لهذا التمرين بعد. سجّل تمرينك وبيظهر هنا.',
  lastWeight: 'آخر وزن',
  bestWeight: 'أفضل وزن',
  lastReps: 'آخر تكرارات',
  workout: 'تمرين',
  setUnit: 'مجموعة',
  volumeLabel: 'حجم',
  kg: 'كجم',
  chartsEmpty: 'بعد ما تسجّل تمارين، بتشوف هنا تطوّر الوزن والحجم وتقدير الـ 1RM.',
  bestOneRepMax: 'أعلى 1RM تقديري',
  bestVolume: 'أفضل حجم',
  sessionsCount: 'عدد الجلسات',
  topSetWeightTrend: 'تطوّر وزن أعلى مجموعة',
  needTwoSessions: 'تحتاج جلستين على الأقل لعرض رسم التطوّر.',
  recordsEmpty: 'لا أرقام قياسية بعد — كل جلسة تقربك من رقم جديد.',
  recBestWeight: 'أفضل وزن',
  recBestReps: 'أعلى تكرارات',
  recBestVolume: 'أفضل حجم (وزن×تكرار)',
  recBestOneRepMax: 'أعلى 1RM تقديري',
  pickerTitle: 'مكتبة التمارين',
  pickerSearchPlaceholder: 'ابحث عن تمرين…',
  pickerNoResults: 'ما فيه نتائج مطابقة.',
  add: 'أضف',
  muscleAllOptions: 'كل العضلات',
  envAll: 'أي مكان',
  envGym: 'نادي',
  envHome: 'منزل',
  envBoth: 'الاثنين',
  levelAll: 'أي مستوى',
}

const en: LibraryStrings = {
  eyebrow: 'Library',
  title: 'Exercise library',
  countSuffix: 'exercises with guidance and target sets.',
  allExercises: 'All exercises',
  machinesForBeginners: 'Machines (for beginners)',
  searchPlaceholder: 'Search by exercise name in Arabic or English…',
  searchAria: 'Search',
  clearSearchAria: 'Clear search',
  filterMuscle: 'Muscle',
  filterEquipment: 'Equipment',
  all: 'All',
  resultsSuffix: 'results · sorted alphabetically',
  noResults: 'No matching results — try a different word or filter.',
  machineHint: 'Guided machines are easier and safer to start with — pick a machine to see the guidance and target muscle.',
  machineHintSuffix: 'machines.',
  muscleAll: 'All',
  muscleChest: 'Chest',
  muscleBack: 'Back',
  muscleShoulders: 'Shoulders',
  muscleBiceps: 'Biceps',
  muscleTriceps: 'Triceps',
  muscleQuads: 'Legs',
  muscleQuadsFront: 'Legs (quads)',
  muscleHamstrings: 'Hamstrings',
  muscleGlutes: 'Glutes',
  muscleCalves: 'Calves',
  muscleCore: 'Core',
  muscleCardio: 'Cardio',
  equipBarbell: 'Barbell',
  equipDumbbell: 'Dumbbell',
  equipMachine: 'Machine',
  equipCable: 'Cable',
  equipBodyweight: 'Bodyweight',
  equipBench: 'Bench',
  equipKettlebell: 'Kettlebell',
  equipSmith: 'Smith',
  equipEzBar: 'EZ bar',
  tabAbout: 'About',
  tabHistory: 'History',
  tabCharts: 'Charts',
  tabRecords: 'Records',
  close: 'Close',
  levelBeginner: 'Beginner',
  levelIntermediate: 'Intermediate',
  levelAdvanced: 'Advanced',
  targetMuscles: 'Target muscles',
  primary: 'Primary',
  secondary: 'Secondary',
  howToPerform: 'How to perform',
  techniqueTips: 'Technique tips',
  commonMistakes: 'Common mistakes',
  watchOnYouTube: 'Watch on YouTube',
  addToMyPlan: 'Add to my plan',
  historyEmpty: 'No log for this exercise yet. Log a workout and it will show here.',
  lastWeight: 'Last weight',
  bestWeight: 'Best weight',
  lastReps: 'Last reps',
  workout: 'Workout',
  setUnit: 'set',
  volumeLabel: 'Volume',
  kg: 'kg',
  chartsEmpty: 'Once you log workouts, you will see weight and volume progress and estimated 1RM here.',
  bestOneRepMax: 'Best est. 1RM',
  bestVolume: 'Best volume',
  sessionsCount: 'Sessions',
  topSetWeightTrend: 'Top set weight trend',
  needTwoSessions: 'You need at least two sessions to show the progress chart.',
  recordsEmpty: 'No PRs yet — every session gets you closer to a new one.',
  recBestWeight: 'Best weight',
  recBestReps: 'Best reps',
  recBestVolume: 'Best volume (weight×reps)',
  recBestOneRepMax: 'Best est. 1RM',
  pickerTitle: 'Exercise library',
  pickerSearchPlaceholder: 'Search for an exercise…',
  pickerNoResults: 'No matching results.',
  add: 'Add',
  muscleAllOptions: 'All muscles',
  envAll: 'Anywhere',
  envGym: 'Gym',
  envHome: 'Home',
  envBoth: 'Both',
  levelAll: 'Any level',
}

export const libraryStrings: Record<Lang, LibraryStrings> = { ar, en }
