import type { WorkoutTemplate } from '@/types/workout'

// قوالب جداول التمرين — تستخدم معرّفات تمارين قانونية من exercises.ts.
// P12 «أجهزة فقط»: كل التمارين الأساسية في قوالب النادي من كتالوج الأجهزة المعتمد
// (machineCatalog.ts) حصريًا — لا بار/دمبل/وزن جسم أساسي. الاستثناءان:
//  • home-workout: قالب منزلي بلا أجهزة — يبقى بتمارين المنزل (وزن جسم/دمبل).
//  • كارديو fat-loss: أجهزة كارديو (سير/دراجة/تجديف) خارج الكتالوج لأنها ليست تمارين مقاومة.

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'full-body-3',
    nameAr: 'جسم كامل ٣ أيام',
    nameEn: 'Full Body 3 Days',
    descriptionAr: 'تمرين كامل للجسم ثلاث مرات بالأسبوع — مثالي للبداية والوقت المحدود.',
    descriptionEn: 'Whole-body training three times a week — great for beginners and busy weeks.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'full-body-3-d1', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['hack-squat-machine', 'chest-press-machine', 'seated-row-machine', 'shoulder-press-machine', 'ab-crunch-machine'] },
      { id: 'full-body-3-d2', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['glute-drive-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'cable-crunch'] },
      { id: 'full-body-3-d3', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['leg-press-machine', 'iso-lateral-chest-press', 'chest-supported-row-machine', 'lateral-raise-machine', 'cable-crunch'] },
    ],
  },
  {
    id: 'push-pull-legs',
    nameAr: 'دفع / سحب / أرجل',
    nameEn: 'Push / Pull / Legs',
    descriptionAr: 'تقسيمة كلاسيكية: يوم دفع، يوم سحب، يوم أرجل.',
    descriptionEn: 'Classic split: a push day, a pull day, and a legs day.',
    recommendedFor: 'متوسط',
    days: [
      { id: 'push-pull-legs-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['chest-press-machine', 'shoulder-press-machine', 'incline-chest-press-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'] },
      { id: 'push-pull-legs-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['iso-lateral-high-row', 'lat-pulldown-machine', 'seated-row-machine', 'reverse-pec-deck', 'preacher-curl-machine'] },
      { id: 'push-pull-legs-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['hack-squat-machine', 'seated-leg-curl', 'leg-press-machine', 'leg-extension-machine', 'standing-calf-raise-machine'] },
    ],
  },
  {
    id: 'ppl-3',
    nameAr: 'PPL ٣ أيام',
    nameEn: 'PPL 3 Days',
    descriptionAr: 'دفع/سحب/أرجل بنسخة أجهزة أسهل على المفاصل.',
    descriptionEn: 'Push/Pull/Legs in a machine-friendly variation.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'ppl-3-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['chest-press-machine', 'shoulder-press-machine', 'incline-chest-press-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'] },
      { id: 'ppl-3-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown-machine', 'seated-row-machine', 'chest-supported-row-machine', 'reverse-pec-deck', 'cable-biceps-curl'] },
      { id: 'ppl-3-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['hack-squat-machine', 'leg-press-machine', 'lying-leg-curl', 'leg-extension-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'upper-lower-4',
    nameAr: 'علوي / سفلي ٤ أيام',
    nameEn: 'Upper / Lower 4 Days',
    descriptionAr: 'يومان علوي ويومان سفلي — توازن جيد بين التكرار والراحة.',
    descriptionEn: 'Two upper and two lower days — a solid balance of frequency and recovery.',
    recommendedFor: 'متوسط',
    days: [
      { id: 'upper-lower-4-d1', nameAr: 'علوي أ', nameEn: 'Upper A', exerciseIds: ['chest-press-machine', 'seated-row-machine', 'shoulder-press-machine', 'lat-pulldown-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'] },
      { id: 'upper-lower-4-d2', nameAr: 'سفلي أ', nameEn: 'Lower A', exerciseIds: ['hack-squat-machine', 'glute-drive-machine', 'leg-press-machine', 'lying-leg-curl', 'standing-calf-raise-machine'] },
      { id: 'upper-lower-4-d3', nameAr: 'علوي ب', nameEn: 'Upper B', exerciseIds: ['incline-chest-press-machine', 'chest-supported-row-machine', 'shoulder-press-machine', 'wide-grip-lat-pulldown', 'cable-biceps-curl', 'triceps-extension-machine'] },
      { id: 'upper-lower-4-d4', nameAr: 'سفلي ب', nameEn: 'Lower B', exerciseIds: ['leg-press-machine', 'hack-squat-machine', 'leg-extension-machine', 'seated-leg-curl', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'four-day-split',
    nameAr: 'تقسيمة ٤ أيام',
    nameEn: '4 Days Split',
    descriptionAr: 'تقسيمة عضلية: صدر/ترايسبس، ظهر/بايسبس، أكتاف/كور، أرجل.',
    descriptionEn: 'Body-part split: chest/triceps, back/biceps, shoulders/core, legs.',
    recommendedFor: 'متوسط–متقدّم',
    days: [
      { id: 'four-day-split-d1', nameAr: 'صدر وترايسبس', nameEn: 'Chest & Triceps', exerciseIds: ['chest-press-machine', 'incline-chest-press-machine', 'iso-lateral-chest-press', 'assisted-dip-machine', 'cable-triceps-pushdown'] },
      { id: 'four-day-split-d2', nameAr: 'ظهر وبايسبس', nameEn: 'Back & Biceps', exerciseIds: ['iso-lateral-high-row', 'seated-row-machine', 'lat-pulldown-machine', 'chest-supported-row-machine', 'preacher-curl-machine', 'cable-biceps-curl'] },
      { id: 'four-day-split-d3', nameAr: 'أكتاف وكور', nameEn: 'Shoulders & Core', exerciseIds: ['shoulder-press-machine', 'lateral-raise-machine', 'reverse-pec-deck', 'rear-delt-row-machine', 'ab-crunch-machine', 'cable-crunch'] },
      { id: 'four-day-split-d4', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['hack-squat-machine', 'leg-press-machine', 'seated-leg-curl', 'leg-extension-machine', 'standing-calf-raise-machine'] },
    ],
  },
  {
    id: 'machine-only',
    nameAr: 'أجهزة فقط',
    nameEn: 'Machine Only',
    descriptionAr: 'كل التمارين على الأجهزة والكيبل — مريح وآمن للمبتدئين.',
    descriptionEn: 'All machine and cable based — comfortable and safe for beginners.',
    recommendedFor: 'مبتدئ',
    days: [
      { id: 'machine-only-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['chest-press-machine', 'shoulder-press-machine', 'incline-chest-press-machine', 'cable-triceps-pushdown'] },
      { id: 'machine-only-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown-machine', 'seated-row-machine', 'chest-supported-row-machine', 'reverse-pec-deck', 'cable-biceps-curl'] },
      { id: 'machine-only-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press-machine', 'hack-squat-machine', 'leg-extension-machine', 'lying-leg-curl', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'home-workout',
    nameAr: 'تمرين منزلي',
    nameEn: 'Home Workout',
    descriptionAr: 'وزن الجسم والدمبل — بدون نادي وبدون أجهزة معقّدة.',
    descriptionEn: 'Bodyweight and dumbbells — no gym, no complex machines.',
    recommendedFor: 'مبتدئ',
    days: [
      { id: 'home-workout-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['push-up', 'dumbbell-shoulder-press', 'bench-dip', 'plank'] },
      { id: 'home-workout-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['dumbbell-row', 'dumbbell-curl', 'rear-delt-fly', 'side-plank'] },
      { id: 'home-workout-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['bodyweight-squat', 'dumbbell-rdl', 'walking-lunge', 'glute-bridge', 'bodyweight-calf-raise'] },
    ],
  },
  {
    id: 'beginner-gym',
    nameAr: 'مبتدئ في النادي',
    nameEn: 'Beginner Gym',
    descriptionAr: 'برنامج بسيط للبداية بثلاثة أيام كاملة وغير مرهقة.',
    descriptionEn: 'A simple starter program — three light full-body days.',
    recommendedFor: 'مبتدئ',
    days: [
      { id: 'beginner-gym-d1', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['chest-press-machine', 'lat-pulldown-machine', 'leg-press-machine', 'ab-crunch-machine'] },
      { id: 'beginner-gym-d2', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['shoulder-press-machine', 'seated-row-machine', 'leg-extension-machine', 'lying-leg-curl'] },
      { id: 'beginner-gym-d3', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['incline-chest-press-machine', 'chest-supported-row-machine', 'hack-squat-machine', 'standing-calf-raise-machine'] },
    ],
  },
  {
    id: 'fat-loss',
    nameAr: 'خسارة دهون',
    nameEn: 'Fat Loss',
    descriptionAr: 'جسم كامل مع كارديو في النهاية — حركة أكثر وحرق أعلى.',
    descriptionEn: 'Full-body sessions finished with cardio — more movement, more burn.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'fat-loss-d1', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['hack-squat-machine', 'chest-press-machine', 'seated-row-machine', 'ab-crunch-machine', 'treadmill-run'] },
      { id: 'fat-loss-d2', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['leg-press-machine', 'shoulder-press-machine', 'lat-pulldown-machine', 'cable-crunch', 'stationary-bike'] },
      { id: 'fat-loss-d3', nameAr: 'جسم كامل', nameEn: 'Full Body', exerciseIds: ['pendulum-squat-machine', 'iso-lateral-chest-press', 'chest-supported-row-machine', 'ab-crunch-machine', 'rowing-machine'] },
    ],
  },
  {
    id: 'muscle-gain',
    nameAr: 'بناء عضل',
    nameEn: 'Muscle Gain',
    descriptionAr: 'أربعة أيام تضخيم (علوي/سفلي ×٢) بحجم عمل أعلى.',
    descriptionEn: 'Four hypertrophy days (upper/lower ×2) with higher volume.',
    recommendedFor: 'متوسط–متقدّم',
    days: [
      { id: 'muscle-gain-d1', nameAr: 'علوي أ', nameEn: 'Upper A', exerciseIds: ['chest-press-machine', 'seated-row-machine', 'shoulder-press-machine', 'lat-pulldown-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'] },
      { id: 'muscle-gain-d2', nameAr: 'سفلي أ', nameEn: 'Lower A', exerciseIds: ['hack-squat-machine', 'seated-leg-curl', 'leg-press-machine', 'leg-extension-machine', 'standing-calf-raise-machine'] },
      { id: 'muscle-gain-d3', nameAr: 'علوي ب', nameEn: 'Upper B', exerciseIds: ['incline-chest-press-machine', 'chest-supported-row-machine', 'lateral-raise-machine', 'wide-grip-lat-pulldown', 'cable-biceps-curl', 'triceps-extension-machine'] },
      { id: 'muscle-gain-d4', nameAr: 'سفلي ب', nameEn: 'Lower B', exerciseIds: ['pendulum-squat-machine', 'glute-drive-machine', 'lying-leg-curl', 'leg-extension-machine', 'seated-calf-raise-machine'] },
    ],
  },
  {
    id: 'custom',
    nameAr: 'مخصّص',
    nameEn: 'Custom',
    descriptionAr: 'ابدأ من يوم فارغ وأضف تمارينك من المكتبة بنفسك.',
    descriptionEn: 'Start from an empty day and add exercises from the library yourself.',
    recommendedFor: 'الكل',
    days: [{ id: 'custom-d1', nameAr: 'تمرين', nameEn: 'Workout', exerciseIds: [] }],
  },
]

export const templateMap: Record<string, WorkoutTemplate> = Object.fromEntries(
  workoutTemplates.map((t) => [t.id, t]),
)

export function getTemplate(id: string): WorkoutTemplate | undefined {
  return templateMap[id]
}
