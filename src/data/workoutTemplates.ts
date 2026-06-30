import type { WorkoutTemplate } from '@/types/workout'

// قوالب جداول التمرين — تستخدم معرّفات تمارين من exercises.ts.
// عملية وآمنة: المبتدئ غير محمّل، Machine Only أجهزة، Home Workout وزن جسم/دمبل.

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'full-body-3',
    nameAr: 'جسم كامل ٣ أيام',
    nameEn: 'Full Body 3 Days',
    descriptionAr: 'تمرين كامل للجسم ثلاث مرات بالأسبوع — مثالي للبداية والوقت المحدود.',
    descriptionEn: 'Whole-body training three times a week — great for beginners and busy weeks.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'full-body-3-d1', nameAr: 'اليوم ١ · جسم كامل', nameEn: 'Day 1 · Full Body', exerciseIds: ['barbell-back-squat', 'barbell-bench-press', 'barbell-row', 'overhead-press', 'plank'] },
      { id: 'full-body-3-d2', nameAr: 'اليوم ٢ · جسم كامل', nameEn: 'Day 2 · Full Body', exerciseIds: ['deadlift', 'incline-dumbbell-press', 'lat-pulldown', 'dumbbell-shoulder-press', 'hanging-leg-raise'] },
      { id: 'full-body-3-d3', nameAr: 'اليوم ٣ · جسم كامل', nameEn: 'Day 3 · Full Body', exerciseIds: ['leg-press', 'dumbbell-bench-press', 'seated-cable-row', 'lateral-raise', 'cable-crunch'] },
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
      { id: 'push-pull-legs-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['barbell-bench-press', 'overhead-press', 'incline-dumbbell-press', 'lateral-raise', 'triceps-pushdown'] },
      { id: 'push-pull-legs-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['deadlift', 'lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl'] },
      { id: 'push-pull-legs-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['barbell-back-squat', 'romanian-deadlift', 'leg-press', 'leg-extension', 'standing-calf-raise'] },
    ],
  },
  {
    id: 'ppl-3',
    nameAr: 'PPL ٣ أيام',
    nameEn: 'PPL 3 Days',
    descriptionAr: 'دفع/سحب/أرجل بنسخة أجهزة ودمبل أسهل على المفاصل.',
    descriptionEn: 'Push/Pull/Legs in a machine & dumbbell-friendly variation.',
    recommendedFor: 'مبتدئ–متوسط',
    days: [
      { id: 'ppl-3-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['chest-press-machine', 'shoulder-press-machine', 'incline-dumbbell-press', 'cable-lateral-raise', 'rope-pushdown'] },
      { id: 'ppl-3-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown', 'seated-cable-row', 'machine-row', 'face-pull', 'cable-curl'] },
      { id: 'ppl-3-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['hack-squat', 'leg-press', 'lying-leg-curl', 'leg-extension', 'seated-calf-raise'] },
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
      { id: 'upper-lower-4-d1', nameAr: 'علوي أ', nameEn: 'Upper A', exerciseIds: ['barbell-bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown', 'barbell-curl', 'triceps-pushdown'] },
      { id: 'upper-lower-4-d2', nameAr: 'سفلي أ', nameEn: 'Lower A', exerciseIds: ['barbell-back-squat', 'romanian-deadlift', 'leg-press', 'lying-leg-curl', 'standing-calf-raise'] },
      { id: 'upper-lower-4-d3', nameAr: 'علوي ب', nameEn: 'Upper B', exerciseIds: ['incline-dumbbell-press', 'seated-cable-row', 'dumbbell-shoulder-press', 'pull-up', 'hammer-curl', 'skull-crusher'] },
      { id: 'upper-lower-4-d4', nameAr: 'سفلي ب', nameEn: 'Lower B', exerciseIds: ['deadlift', 'hack-squat', 'walking-lunge', 'seated-leg-curl', 'seated-calf-raise'] },
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
      { id: 'four-day-split-d1', nameAr: 'صدر وترايسبس', nameEn: 'Chest & Triceps', exerciseIds: ['barbell-bench-press', 'incline-dumbbell-press', 'cable-crossover', 'close-grip-bench-press', 'rope-pushdown'] },
      { id: 'four-day-split-d2', nameAr: 'ظهر وبايسبس', nameEn: 'Back & Biceps', exerciseIds: ['deadlift', 'barbell-row', 'lat-pulldown', 'seated-cable-row', 'barbell-curl', 'hammer-curl'] },
      { id: 'four-day-split-d3', nameAr: 'أكتاف وكور', nameEn: 'Shoulders & Core', exerciseIds: ['overhead-press', 'lateral-raise', 'rear-delt-fly', 'face-pull', 'hanging-leg-raise', 'plank'] },
      { id: 'four-day-split-d4', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['barbell-back-squat', 'leg-press', 'romanian-deadlift', 'leg-extension', 'standing-calf-raise'] },
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
      { id: 'machine-only-d1', nameAr: 'دفع', nameEn: 'Push', exerciseIds: ['chest-press-machine', 'shoulder-press-machine', 'pec-deck', 'triceps-pushdown'] },
      { id: 'machine-only-d2', nameAr: 'سحب', nameEn: 'Pull', exerciseIds: ['lat-pulldown', 'machine-row', 'seated-cable-row', 'reverse-pec-deck', 'cable-curl'] },
      { id: 'machine-only-d3', nameAr: 'أرجل', nameEn: 'Legs', exerciseIds: ['leg-press', 'hack-squat', 'leg-extension', 'lying-leg-curl', 'seated-calf-raise'] },
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
      { id: 'beginner-gym-d1', nameAr: 'اليوم ١ · جسم كامل', nameEn: 'Day 1 · Full Body', exerciseIds: ['chest-press-machine', 'lat-pulldown', 'leg-press', 'plank'] },
      { id: 'beginner-gym-d2', nameAr: 'اليوم ٢ · جسم كامل', nameEn: 'Day 2 · Full Body', exerciseIds: ['shoulder-press-machine', 'seated-cable-row', 'leg-extension', 'lying-leg-curl'] },
      { id: 'beginner-gym-d3', nameAr: 'اليوم ٣ · جسم كامل', nameEn: 'Day 3 · Full Body', exerciseIds: ['incline-machine-press', 'machine-row', 'goblet-squat', 'standing-calf-raise'] },
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
      { id: 'fat-loss-d1', nameAr: 'اليوم ١ · جسم كامل', nameEn: 'Day 1 · Full Body', exerciseIds: ['goblet-squat', 'push-up', 'dumbbell-row', 'plank', 'treadmill-run'] },
      { id: 'fat-loss-d2', nameAr: 'اليوم ٢ · جسم كامل', nameEn: 'Day 2 · Full Body', exerciseIds: ['leg-press', 'dumbbell-shoulder-press', 'lat-pulldown', 'mountain-climber', 'stationary-bike'] },
      { id: 'fat-loss-d3', nameAr: 'اليوم ٣ · جسم كامل', nameEn: 'Day 3 · Full Body', exerciseIds: ['walking-lunge', 'dumbbell-bench-press', 'seated-cable-row', 'russian-twist', 'rowing-machine'] },
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
      { id: 'muscle-gain-d1', nameAr: 'علوي أ', nameEn: 'Upper A', exerciseIds: ['barbell-bench-press', 'barbell-row', 'dumbbell-shoulder-press', 'lat-pulldown', 'barbell-curl', 'triceps-pushdown'] },
      { id: 'muscle-gain-d2', nameAr: 'سفلي أ', nameEn: 'Lower A', exerciseIds: ['barbell-back-squat', 'romanian-deadlift', 'leg-press', 'leg-extension', 'standing-calf-raise'] },
      { id: 'muscle-gain-d3', nameAr: 'علوي ب', nameEn: 'Upper B', exerciseIds: ['incline-barbell-press', 'seated-cable-row', 'lateral-raise', 'pull-up', 'hammer-curl', 'skull-crusher'] },
      { id: 'muscle-gain-d4', nameAr: 'سفلي ب', nameEn: 'Lower B', exerciseIds: ['hack-squat', 'hip-thrust', 'lying-leg-curl', 'walking-lunge', 'seated-calf-raise'] },
    ],
  },
  {
    id: 'custom',
    nameAr: 'مخصّص',
    nameEn: 'Custom',
    descriptionAr: 'ابدأ من يوم فارغ وأضف تمارينك من المكتبة بنفسك.',
    descriptionEn: 'Start from an empty day and add exercises from the library yourself.',
    recommendedFor: 'الكل',
    days: [{ id: 'custom-d1', nameAr: 'يوم ١', nameEn: 'Day 1', exerciseIds: [] }],
  },
]

export const templateMap: Record<string, WorkoutTemplate> = Object.fromEntries(
  workoutTemplates.map((t) => [t.id, t]),
)

export function getTemplate(id: string): WorkoutTemplate | undefined {
  return templateMap[id]
}
