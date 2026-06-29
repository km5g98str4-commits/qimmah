import type { Exercise, ExEnvironment, ExLevel, Muscle, MovementPattern } from '@/types/workout'
import type { MuscleId } from '@/types/muscles'
import { getCommonMistakes, getSafetyNotes, getTechniqueTips } from '@/lib/exerciseGuidance'

// مكتبة التمارين — ١٧٠ تمرينًا تغطي كل المجموعات العضلية + كارديو + إحماء/مرونة.
// كل تمرين له رابط شرح غير فارغ. الروابط غالبًا «بحث يوتيوب موثوق» وليست بالضرورة رسمية —
// لذلك نوضّح المصدر عبر videoSource ('youtube_search' أو 'trusted_video').

function video(nameEn: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(nameEn + ' exercise form')}`
}

// خريطة العضلات التفصيلية لكل تمرين (هوية كمال الأجسام).
// primary = العضلات المحرّكة الأساسية، secondary = المساعِدة.
interface MuscleDetail {
  primary: MuscleId[]
  secondary?: MuscleId[]
}

const muscleDetailById: Record<string, MuscleDetail> = {
  // ===== الصدر =====
  'barbell-bench-press': { primary: ['chest_mid', 'triceps', 'front_delts'], secondary: ['chest_upper'] },
  'incline-barbell-press': { primary: ['chest_upper', 'front_delts', 'triceps'], secondary: ['chest_mid'] },
  'dumbbell-bench-press': { primary: ['chest_mid', 'triceps', 'front_delts'], secondary: ['chest_upper'] },
  'incline-dumbbell-press': { primary: ['chest_upper', 'front_delts', 'triceps'], secondary: ['chest_mid'] },
  'chest-press-machine': { primary: ['chest_mid', 'triceps'], secondary: ['front_delts'] },
  'incline-machine-press': { primary: ['chest_upper', 'front_delts'], secondary: ['triceps'] },
  'pec-deck': { primary: ['chest_mid'], secondary: ['front_delts'] },
  'cable-crossover': { primary: ['chest_mid', 'chest_lower'], secondary: ['front_delts'] },
  'dumbbell-fly': { primary: ['chest_mid'], secondary: ['front_delts'] },
  'push-up': { primary: ['chest_mid', 'triceps'], secondary: ['front_delts', 'abs'] },
  'incline-push-up': { primary: ['chest_mid'], secondary: ['triceps', 'front_delts'] },

  // ===== الظهر =====
  deadlift: { primary: ['lower_back', 'glutes', 'hamstrings'], secondary: ['traps', 'lats', 'upper_back', 'quads', 'forearms'] },
  'barbell-row': { primary: ['lats', 'upper_back'], secondary: ['biceps', 'rear_delts', 'lower_back', 'forearms'] },
  'dumbbell-row': { primary: ['lats', 'upper_back'], secondary: ['biceps', 'rear_delts'] },
  'lat-pulldown': { primary: ['lats'], secondary: ['biceps', 'upper_back'] },
  'seated-cable-row': { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts'] },
  'machine-row': { primary: ['upper_back', 'lats'], secondary: ['biceps'] },
  't-bar-row': { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts'] },
  'pull-up': { primary: ['lats'], secondary: ['biceps', 'upper_back', 'forearms'] },
  'chin-up': { primary: ['lats', 'biceps'], secondary: ['upper_back'] },
  'straight-arm-pulldown': { primary: ['lats'], secondary: ['triceps'] },
  'dumbbell-shrug': { primary: ['traps'], secondary: ['forearms'] },

  // ===== الأكتاف =====
  'overhead-press': { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['traps', 'upper_back'] },
  'dumbbell-shoulder-press': { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['traps'] },
  'shoulder-press-machine': { primary: ['front_delts', 'side_delts'], secondary: ['triceps'] },
  'lateral-raise': { primary: ['side_delts'], secondary: ['traps'] },
  'cable-lateral-raise': { primary: ['side_delts'], secondary: ['traps'] },
  'rear-delt-fly': { primary: ['rear_delts'], secondary: ['upper_back'] },
  'reverse-pec-deck': { primary: ['rear_delts'], secondary: ['upper_back'] },
  'front-raise': { primary: ['front_delts'], secondary: ['side_delts'] },
  'face-pull': { primary: ['rear_delts'], secondary: ['traps', 'upper_back'] },

  // ===== البايسبس =====
  'barbell-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'dumbbell-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'hammer-curl': { primary: ['biceps', 'forearms'] },
  'preacher-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'cable-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'concentration-curl': { primary: ['biceps'] },

  // ===== الترايسبس =====
  'triceps-pushdown': { primary: ['triceps'] },
  'rope-pushdown': { primary: ['triceps'] },
  'overhead-triceps-extension': { primary: ['triceps'] },
  'skull-crusher': { primary: ['triceps'] },
  'close-grip-bench-press': { primary: ['triceps', 'chest_mid'], secondary: ['front_delts'] },
  'bench-dip': { primary: ['triceps'], secondary: ['chest_lower', 'front_delts'] },

  // ===== الأرجل / الكوادز =====
  'barbell-back-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lower_back', 'abs'] },
  'front-squat': { primary: ['quads'], secondary: ['glutes', 'abs', 'lower_back'] },
  'leg-press': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'hack-squat': { primary: ['quads'], secondary: ['glutes'] },
  'leg-extension': { primary: ['quads'] },
  'goblet-squat': { primary: ['quads', 'glutes'], secondary: ['abs'] },
  'bulgarian-split-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'walking-lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'smith-machine-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'bodyweight-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'step-up': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },

  // ===== الهامسترنج =====
  'romanian-deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  'dumbbell-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  'lying-leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'seated-leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'good-morning': { primary: ['hamstrings', 'lower_back'], secondary: ['glutes'] },

  // ===== الجلوتس =====
  'hip-thrust': { primary: ['glutes'], secondary: ['hamstrings'] },
  'glute-bridge': { primary: ['glutes'], secondary: ['hamstrings'] },
  'cable-kickback': { primary: ['glutes'], secondary: ['hamstrings'] },
  'sumo-deadlift': { primary: ['glutes', 'quads'], secondary: ['hamstrings', 'lower_back', 'traps'] },
  'cable-pull-through': { primary: ['glutes', 'hamstrings'], secondary: ['lower_back'] },
  'kettlebell-swing': { primary: ['glutes', 'hamstrings'], secondary: ['lower_back', 'quads', 'abs'] },

  // ===== السمانة =====
  'standing-calf-raise': { primary: ['calves'] },
  'seated-calf-raise': { primary: ['calves'] },
  'bodyweight-calf-raise': { primary: ['calves'] },

  // ===== الكور =====
  plank: { primary: ['abs'], secondary: ['obliques', 'lower_back'] },
  'side-plank': { primary: ['obliques'], secondary: ['abs'] },
  'hanging-leg-raise': { primary: ['abs'], secondary: ['obliques'] },
  'cable-crunch': { primary: ['abs'], secondary: ['obliques'] },
  crunch: { primary: ['abs'] },
  'russian-twist': { primary: ['obliques'], secondary: ['abs'] },
  'ab-wheel-rollout': { primary: ['abs'], secondary: ['obliques', 'lower_back'] },
  'mountain-climber': { primary: ['abs'], secondary: ['obliques'] },

  // ===== أجهزة مُضافة (Phase 2 — استكمال كتالوج الأجهزة) =====
  'decline-machine-press': { primary: ['chest_lower', 'triceps'], secondary: ['front_delts'] },
  'low-row-machine': { primary: ['lats', 'upper_back'], secondary: ['biceps'] },
  'machine-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  'glute-kickback-machine': { primary: ['glutes'], secondary: ['hamstrings'] },
  'adduction-machine': { primary: ['glutes'] },

  // ===== كارديو (بلا عضلة هدف تفصيلية) =====
  'treadmill-run': { primary: [] },
  'stationary-bike': { primary: [] },
  'rowing-machine': { primary: [] },
  elliptical: { primary: [] },
  'jump-rope': { primary: [] },
}

// خريطة احتياطية من العضلة العامة إلى العضلات التفصيلية (للتمارين المخصّصة دون تفصيل صريح).
const coarseToDetailed: Record<Muscle, MuscleId[]> = {
  chest: ['chest_mid'],
  back: ['lats', 'upper_back'],
  shoulders: ['side_delts', 'front_delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  legs: ['quads', 'glutes'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  quads: ['quads'],
  calves: ['calves'],
  core: ['abs'],
  cardio: [],
}

interface ExInput {
  id: string
  nameAr: string
  nameEn: string
  primaryMuscle: Muscle
  equipment: string[]
  level: ExLevel
  movementPattern: MovementPattern
  environment: ExEnvironment
  defaultSets?: number
  defaultReps?: string
  defaultRestSec?: number
  secondaryMuscles?: string[]
  videoUrl?: string
  alternatives?: string[]
  notesAr?: string
  techniqueTipsAr?: string[]
  commonMistakesAr?: string[]
  safetyNotesAr?: string[]
}

function ex(p: ExInput): Exercise {
  const detail = muscleDetailById[p.id]
  const primaryDetailed = detail?.primary ?? coarseToDetailed[p.primaryMuscle] ?? []
  const secondaryDetailed = detail?.secondary ?? []
  // رابط مخصّص = فيديو موثوق محدّد؛ غير ذلك = بحث يوتيوب موثوق (نوضّحه للمستخدم).
  const hasCustomVideo = Boolean(p.videoUrl)
  const base: Exercise = {
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    primaryMuscle: p.primaryMuscle,
    secondaryMuscles: p.secondaryMuscles ?? [],
    primaryMusclesDetailed: primaryDetailed,
    secondaryMusclesDetailed: secondaryDetailed,
    equipment: p.equipment,
    level: p.level,
    movementPattern: p.movementPattern,
    environment: p.environment,
    defaultSets: p.defaultSets ?? 3,
    defaultReps: p.defaultReps ?? '8–12',
    defaultRestSec: p.defaultRestSec ?? 90,
    videoUrl: p.videoUrl ?? video(p.nameEn),
    videoSource: hasCustomVideo ? 'trusted_video' : 'youtube_search',
    alternatives: p.alternatives ?? [],
    notesAr: p.notesAr ?? '',
    notesEn: '',
    techniqueTipsAr: p.techniqueTipsAr ?? [],
    commonMistakesAr: p.commonMistakesAr ?? [],
    safetyNotesAr: p.safetyNotesAr ?? [],
  }
  // نضمن أن كل تمرين له إرشاد غير فارغ (الخاص به أو الافتراضي حسب نمط الحركة).
  return {
    ...base,
    techniqueTipsAr: getTechniqueTips(base),
    commonMistakesAr: getCommonMistakes(base),
    safetyNotesAr: getSafetyNotes(base),
  }
}

export const exercises: Exercise[] = [
  // ===== الصدر =====
  ex({ id: 'barbell-bench-press', nameAr: 'بنش بريس بار', nameEn: 'Barbell Bench Press', primaryMuscle: 'chest', equipment: ['barbell', 'bench'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '6–10', defaultRestSec: 120 }),
  ex({ id: 'incline-barbell-press', nameAr: 'بنش مائل بار', nameEn: 'Incline Barbell Press', primaryMuscle: 'chest', equipment: ['barbell', 'bench'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '8–10', defaultRestSec: 120 }),
  ex({ id: 'dumbbell-bench-press', nameAr: 'بنش بريس دمبل', nameEn: 'Dumbbell Bench Press', primaryMuscle: 'chest', equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'gym' }),
  ex({ id: 'incline-dumbbell-press', nameAr: 'بنش مائل دمبل', nameEn: 'Incline Dumbbell Press', primaryMuscle: 'chest', equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'gym' }),
  ex({ id: 'chest-press-machine', nameAr: 'ضغط صدر جهاز', nameEn: 'Chest Press Machine', primaryMuscle: 'chest', equipment: ['machine'], level: 'beginner', movementPattern: 'push', environment: 'gym' }),
  ex({ id: 'incline-machine-press', nameAr: 'ضغط صدر مائل جهاز', nameEn: 'Incline Machine Press', primaryMuscle: 'chest', equipment: ['machine'], level: 'beginner', movementPattern: 'push', environment: 'gym' }),
  ex({ id: 'pec-deck', nameAr: 'تفتيح جهاز (بيك دك)', nameEn: 'Pec Deck Machine', primaryMuscle: 'chest', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'cable-crossover', nameAr: 'تفتيح كيبل', nameEn: 'Cable Crossover', primaryMuscle: 'chest', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'dumbbell-fly', nameAr: 'تفتيح دمبل', nameEn: 'Dumbbell Fly', primaryMuscle: 'chest', equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'push-up', nameAr: 'ضغط (تمرين الجسم)', nameEn: 'Push-Up', primaryMuscle: 'chest', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'push', environment: 'both', defaultReps: '10–20', defaultRestSec: 60 }),
  ex({ id: 'incline-push-up', nameAr: 'ضغط مائل', nameEn: 'Incline Push-Up', primaryMuscle: 'chest', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'push', environment: 'home', defaultReps: '12–20', defaultRestSec: 45 }),

  // ===== الظهر =====
  ex({ id: 'deadlift', nameAr: 'رفعة ميتة', nameEn: 'Deadlift', primaryMuscle: 'back', equipment: ['barbell'], level: 'advanced', movementPattern: 'hinge', environment: 'gym', defaultReps: '4–6', defaultRestSec: 150 }),
  ex({ id: 'barbell-row', nameAr: 'تجديف بار', nameEn: 'Barbell Row', primaryMuscle: 'back', equipment: ['barbell'], level: 'intermediate', movementPattern: 'pull', environment: 'gym', defaultReps: '8–10', defaultRestSec: 120 }),
  ex({ id: 'dumbbell-row', nameAr: 'تجديف دمبل', nameEn: 'Dumbbell Row', primaryMuscle: 'back', equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'pull', environment: 'gym' }),
  ex({ id: 'lat-pulldown', nameAr: 'سحب أمامي (لات)', nameEn: 'Lat Pulldown', primaryMuscle: 'back', equipment: ['machine', 'cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12' }),
  ex({ id: 'seated-cable-row', nameAr: 'تجديف كيبل جالس', nameEn: 'Seated Cable Row', primaryMuscle: 'back', equipment: ['cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12' }),
  ex({ id: 'machine-row', nameAr: 'تجديف جهاز', nameEn: 'Machine Row', primaryMuscle: 'back', equipment: ['machine'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12' }),
  ex({ id: 't-bar-row', nameAr: 'تجديف تي-بار', nameEn: 'T-Bar Row', primaryMuscle: 'back', equipment: ['barbell', 'machine'], level: 'intermediate', movementPattern: 'pull', environment: 'gym', defaultReps: '8–12' }),
  ex({ id: 'pull-up', nameAr: 'عقلة', nameEn: 'Pull-Up', primaryMuscle: 'back', equipment: ['bodyweight'], level: 'advanced', movementPattern: 'pull', environment: 'both', defaultReps: '6–10', defaultRestSec: 120 }),
  ex({ id: 'chin-up', nameAr: 'عقلة قبضة عكسية', nameEn: 'Chin-Up', primaryMuscle: 'back', equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'pull', environment: 'both', defaultReps: '6–10', defaultRestSec: 120 }),
  ex({ id: 'straight-arm-pulldown', nameAr: 'سحب بذراع ممدودة كيبل', nameEn: 'Straight-Arm Pulldown', primaryMuscle: 'back', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'dumbbell-shrug', nameAr: 'رفرفة الترابيس دمبل', nameEn: 'Dumbbell Shrug', primaryMuscle: 'back', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),

  // ===== الأكتاف =====
  ex({ id: 'overhead-press', nameAr: 'ضغط كتف بار واقف', nameEn: 'Overhead Press', primaryMuscle: 'shoulders', equipment: ['barbell'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '6–10', defaultRestSec: 120 }),
  ex({ id: 'dumbbell-shoulder-press', nameAr: 'ضغط كتف دمبل', nameEn: 'Dumbbell Shoulder Press', primaryMuscle: 'shoulders', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '8–12' }),
  ex({ id: 'shoulder-press-machine', nameAr: 'ضغط كتف جهاز', nameEn: 'Shoulder Press Machine', primaryMuscle: 'shoulders', equipment: ['machine'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '10–12' }),
  ex({ id: 'lateral-raise', nameAr: 'رفرفة جانبي دمبل', nameEn: 'Lateral Raise', primaryMuscle: 'shoulders', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'cable-lateral-raise', nameAr: 'رفرفة جانبي كيبل', nameEn: 'Cable Lateral Raise', primaryMuscle: 'shoulders', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'rear-delt-fly', nameAr: 'رفرفة خلفي دمبل', nameEn: 'Rear Delt Fly', primaryMuscle: 'shoulders', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'reverse-pec-deck', nameAr: 'خلفي جهاز عكسي', nameEn: 'Reverse Pec Deck', primaryMuscle: 'shoulders', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'front-raise', nameAr: 'رفرفة أمامي دمبل', nameEn: 'Front Raise', primaryMuscle: 'shoulders', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'face-pull', nameAr: 'سحب للوجه كيبل', nameEn: 'Face Pull', primaryMuscle: 'shoulders', equipment: ['cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '15–20', defaultRestSec: 45 }),

  // ===== البايسبس =====
  ex({ id: 'barbell-curl', nameAr: 'تمرير بار', nameEn: 'Barbell Curl', primaryMuscle: 'biceps', equipment: ['barbell'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '8–12', defaultRestSec: 60 }),
  ex({ id: 'dumbbell-curl', nameAr: 'تمرير دمبل', nameEn: 'Dumbbell Curl', primaryMuscle: 'biceps', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'hammer-curl', nameAr: 'تمرير مطرقة', nameEn: 'Hammer Curl', primaryMuscle: 'biceps', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'preacher-curl', nameAr: 'تمرير بريتشر', nameEn: 'Preacher Curl', primaryMuscle: 'biceps', equipment: ['machine', 'ez-bar'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'cable-curl', nameAr: 'تمرير كيبل', nameEn: 'Cable Curl', primaryMuscle: 'biceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'concentration-curl', nameAr: 'تمرير مركّز', nameEn: 'Concentration Curl', primaryMuscle: 'biceps', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '10–12', defaultRestSec: 45 }),

  // ===== الترايسبس =====
  ex({ id: 'triceps-pushdown', nameAr: 'دفع ترايسبس كيبل', nameEn: 'Triceps Pushdown', primaryMuscle: 'triceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'rope-pushdown', nameAr: 'دفع ترايسبس حبل', nameEn: 'Rope Pushdown', primaryMuscle: 'triceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'overhead-triceps-extension', nameAr: 'تمديد ترايسبس علوي دمبل', nameEn: 'Overhead Triceps Extension', primaryMuscle: 'triceps', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'skull-crusher', nameAr: 'سكال كراشر', nameEn: 'Skull Crusher', primaryMuscle: 'triceps', equipment: ['ez-bar', 'bench'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '8–12', defaultRestSec: 60 }),
  ex({ id: 'close-grip-bench-press', nameAr: 'بنش قبضة ضيقة', nameEn: 'Close-Grip Bench Press', primaryMuscle: 'triceps', equipment: ['barbell', 'bench'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '8–10', defaultRestSec: 90 }),
  ex({ id: 'bench-dip', nameAr: 'غطس على المقعد', nameEn: 'Bench Dip', primaryMuscle: 'triceps', equipment: ['bodyweight', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'home', defaultReps: '10–15', defaultRestSec: 45 }),

  // ===== الأرجل / الكوادز =====
  ex({ id: 'barbell-back-squat', nameAr: 'سكوات خلفي بار', nameEn: 'Barbell Back Squat', primaryMuscle: 'quads', equipment: ['barbell'], level: 'advanced', movementPattern: 'squat', environment: 'gym', defaultReps: '5–8', defaultRestSec: 150 }),
  ex({ id: 'front-squat', nameAr: 'سكوات أمامي', nameEn: 'Front Squat', primaryMuscle: 'quads', equipment: ['barbell'], level: 'advanced', movementPattern: 'squat', environment: 'gym', defaultReps: '6–8', defaultRestSec: 120 }),
  ex({ id: 'leg-press', nameAr: 'دفع الأرجل جهاز', nameEn: 'Leg Press', primaryMuscle: 'quads', equipment: ['machine'], level: 'beginner', movementPattern: 'squat', environment: 'gym', defaultReps: '10–12', defaultRestSec: 120 }),
  ex({ id: 'hack-squat', nameAr: 'هاك سكوات جهاز', nameEn: 'Hack Squat', primaryMuscle: 'quads', equipment: ['machine'], level: 'intermediate', movementPattern: 'squat', environment: 'gym', defaultReps: '8–12', defaultRestSec: 120 }),
  ex({ id: 'leg-extension', nameAr: 'تمديد الأرجل جهاز', nameEn: 'Leg Extension', primaryMuscle: 'quads', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'goblet-squat', nameAr: 'سكوات جوبليت دمبل', nameEn: 'Goblet Squat', primaryMuscle: 'quads', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'squat', environment: 'both', defaultReps: '10–12', defaultRestSec: 90 }),
  ex({ id: 'bulgarian-split-squat', nameAr: 'سكوات بلغاري', nameEn: 'Bulgarian Split Squat', primaryMuscle: 'quads', equipment: ['dumbbell'], level: 'intermediate', movementPattern: 'lunge', environment: 'both', defaultReps: '8–12', defaultRestSec: 75 }),
  ex({ id: 'walking-lunge', nameAr: 'طعنات مشي', nameEn: 'Walking Lunge', primaryMuscle: 'quads', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'lunge', environment: 'both', defaultReps: '10–12', defaultRestSec: 75 }),
  ex({ id: 'smith-machine-squat', nameAr: 'سكوات سميث', nameEn: 'Smith Machine Squat', primaryMuscle: 'quads', equipment: ['smith'], level: 'beginner', movementPattern: 'squat', environment: 'gym', defaultReps: '8–12', defaultRestSec: 120 }),
  ex({ id: 'bodyweight-squat', nameAr: 'سكوات وزن الجسم', nameEn: 'Bodyweight Squat', primaryMuscle: 'quads', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'squat', environment: 'home', defaultReps: '15–25', defaultRestSec: 45 }),
  ex({ id: 'step-up', nameAr: 'صعود على منصة', nameEn: 'Step-Up', primaryMuscle: 'quads', equipment: ['dumbbell', 'bodyweight'], level: 'beginner', movementPattern: 'lunge', environment: 'home', defaultReps: '10–12', defaultRestSec: 60 }),

  // ===== الهامسترنج =====
  ex({ id: 'romanian-deadlift', nameAr: 'رفعة رومانية بار', nameEn: 'Romanian Deadlift', primaryMuscle: 'hamstrings', equipment: ['barbell'], level: 'intermediate', movementPattern: 'hinge', environment: 'gym', defaultReps: '8–10', defaultRestSec: 120 }),
  ex({ id: 'dumbbell-rdl', nameAr: 'رفعة رومانية دمبل', nameEn: 'Dumbbell RDL', primaryMuscle: 'hamstrings', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'hinge', environment: 'both', defaultReps: '10–12', defaultRestSec: 90 }),
  ex({ id: 'lying-leg-curl', nameAr: 'ثني الأرجل مستلقي جهاز', nameEn: 'Lying Leg Curl', primaryMuscle: 'hamstrings', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'seated-leg-curl', nameAr: 'ثني الأرجل جالس جهاز', nameEn: 'Seated Leg Curl', primaryMuscle: 'hamstrings', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'good-morning', nameAr: 'غود مورننق بار', nameEn: 'Good Morning', primaryMuscle: 'hamstrings', equipment: ['barbell'], level: 'advanced', movementPattern: 'hinge', environment: 'gym', defaultReps: '8–10', defaultRestSec: 90 }),

  // ===== الجلوتس =====
  ex({ id: 'hip-thrust', nameAr: 'دفع الورك بار', nameEn: 'Hip Thrust', primaryMuscle: 'glutes', equipment: ['barbell', 'bench'], level: 'intermediate', movementPattern: 'hinge', environment: 'gym', defaultReps: '8–12', defaultRestSec: 90 }),
  ex({ id: 'glute-bridge', nameAr: 'جسر الجلوت', nameEn: 'Glute Bridge', primaryMuscle: 'glutes', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'hinge', environment: 'home', defaultReps: '12–20', defaultRestSec: 45 }),
  ex({ id: 'cable-kickback', nameAr: 'رفسة كيبل للجلوت', nameEn: 'Cable Kickback', primaryMuscle: 'glutes', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'sumo-deadlift', nameAr: 'رفعة ميتة سومو', nameEn: 'Sumo Deadlift', primaryMuscle: 'glutes', equipment: ['barbell'], level: 'advanced', movementPattern: 'hinge', environment: 'gym', defaultReps: '5–8', defaultRestSec: 150 }),
  ex({ id: 'cable-pull-through', nameAr: 'سحب بين الأرجل كيبل', nameEn: 'Cable Pull-Through', primaryMuscle: 'glutes', equipment: ['cable'], level: 'beginner', movementPattern: 'hinge', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),

  // ===== السمانة =====
  ex({ id: 'standing-calf-raise', nameAr: 'رفع السمانة واقف', nameEn: 'Standing Calf Raise', primaryMuscle: 'calves', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–20', defaultRestSec: 45 }),
  ex({ id: 'seated-calf-raise', nameAr: 'رفع السمانة جالس', nameEn: 'Seated Calf Raise', primaryMuscle: 'calves', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–20', defaultRestSec: 45 }),
  ex({ id: 'bodyweight-calf-raise', nameAr: 'رفع السمانة وزن الجسم', nameEn: 'Bodyweight Calf Raise', primaryMuscle: 'calves', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'isolation', environment: 'home', defaultReps: '15–25', defaultRestSec: 30 }),

  // ===== الكور =====
  ex({ id: 'plank', nameAr: 'بلانك', nameEn: 'Plank', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '30–60 ث', defaultRestSec: 45 }),
  ex({ id: 'side-plank', nameAr: 'بلانك جانبي', nameEn: 'Side Plank', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '20–40 ث', defaultRestSec: 30 }),
  ex({ id: 'hanging-leg-raise', nameAr: 'رفع الأرجل معلق', nameEn: 'Hanging Leg Raise', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'core', environment: 'gym', defaultReps: '10–15', defaultRestSec: 60 }),
  ex({ id: 'cable-crunch', nameAr: 'كرنش كيبل', nameEn: 'Cable Crunch', primaryMuscle: 'core', equipment: ['cable'], level: 'beginner', movementPattern: 'core', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'crunch', nameAr: 'كرنش', nameEn: 'Crunch', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '15–25', defaultRestSec: 30 }),
  ex({ id: 'russian-twist', nameAr: 'تويست روسي', nameEn: 'Russian Twist', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '20–30', defaultRestSec: 30 }),
  ex({ id: 'ab-wheel-rollout', nameAr: 'عجلة البطن', nameEn: 'Ab Wheel Rollout', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'advanced', movementPattern: 'core', environment: 'both', defaultReps: '8–12', defaultRestSec: 60 }),
  ex({ id: 'mountain-climber', nameAr: 'تسلق الجبل', nameEn: 'Mountain Climber', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '30–45 ث', defaultRestSec: 30 }),

  // ===== كارديو =====
  ex({ id: 'treadmill-run', nameAr: 'جري على السير', nameEn: 'Treadmill Run', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '20–30 د', defaultRestSec: 0 }),
  ex({ id: 'stationary-bike', nameAr: 'دراجة ثابتة', nameEn: 'Stationary Bike', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '20–30 د', defaultRestSec: 0 }),
  ex({ id: 'rowing-machine', nameAr: 'جهاز التجديف', nameEn: 'Rowing Machine', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '10–20 د', defaultRestSec: 0 }),
  ex({ id: 'elliptical', nameAr: 'الإليبتيكال', nameEn: 'Elliptical', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '20–30 د', defaultRestSec: 0 }),
  ex({ id: 'jump-rope', nameAr: 'نط الحبل', nameEn: 'Jump Rope', primaryMuscle: 'cardio', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'cardio', environment: 'home', defaultSets: 1, defaultReps: '10–15 د', defaultRestSec: 0 }),
  ex({ id: 'kettlebell-swing', nameAr: 'أرجحة الكيتل بل', nameEn: 'Kettlebell Swing', primaryMuscle: 'glutes', equipment: ['kettlebell'], level: 'intermediate', movementPattern: 'hinge', environment: 'both', defaultReps: '15–20', defaultRestSec: 60 }),

  // ===== الصدر (إضافات) =====
  ex({ id: 'decline-barbell-press', nameAr: 'بنش منخفض بار', nameEn: 'Decline Barbell Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['barbell', 'bench'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '8–10', defaultRestSec: 90 }),
  ex({ id: 'decline-dumbbell-press', nameAr: 'بنش منخفض دمبل', nameEn: 'Decline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '8–12', defaultRestSec: 90 }),
  ex({ id: 'smith-machine-bench', nameAr: 'بنش سميث', nameEn: 'Smith Machine Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['smith', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '8–12', defaultRestSec: 90, alternatives: ['dumbbell-bench-press', 'chest-press-machine'] }),
  ex({ id: 'low-cable-fly', nameAr: 'تفتيح كيبل سفلي', nameEn: 'Low Cable Fly', primaryMuscle: 'chest', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'incline-cable-fly', nameAr: 'تفتيح كيبل مائل', nameEn: 'Incline Cable Fly', primaryMuscle: 'chest', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'chest-dip', nameAr: 'غطس الصدر (متوازي)', nameEn: 'Chest Dip', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'push', environment: 'both', defaultReps: '8–12', defaultRestSec: 90, alternatives: ['push-up', 'chest-press-machine'] }),
  ex({ id: 'svend-press', nameAr: 'سفيند بريس', nameEn: 'Svend Press', primaryMuscle: 'chest', equipment: ['plate'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '15–20', defaultRestSec: 45 }),
  ex({ id: 'machine-fly', nameAr: 'تفتيح جهاز', nameEn: 'Machine Fly', primaryMuscle: 'chest', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60, alternatives: ['pec-deck', 'dumbbell-fly'] }),
  ex({ id: 'knee-push-up', nameAr: 'ضغط على الركبتين', nameEn: 'Knee Push-Up', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['bodyweight'], level: 'beginner', movementPattern: 'push', environment: 'home', defaultReps: '10–15', defaultRestSec: 45, notesAr: 'بديل مبتدئ للضغط العادي.', alternatives: ['incline-push-up', 'push-up'] }),

  // ===== الظهر (إضافات) =====
  ex({ id: 'pendlay-row', nameAr: 'تجديف بندلاي', nameEn: 'Pendlay Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['barbell'], level: 'advanced', movementPattern: 'pull', environment: 'gym', defaultReps: '6–8', defaultRestSec: 120 }),
  ex({ id: 'chest-supported-row', nameAr: 'تجديف بإسناد الصدر', nameEn: 'Chest-Supported Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75, alternatives: ['machine-row', 'seated-cable-row'] }),
  ex({ id: 'wide-grip-pulldown', nameAr: 'سحب واسع (لات)', nameEn: 'Wide-Grip Lat Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['machine', 'cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75, alternatives: ['lat-pulldown', 'pull-up'] }),
  ex({ id: 'close-grip-pulldown', nameAr: 'سحب قبضة ضيقة', nameEn: 'Close-Grip Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75 }),
  ex({ id: 'single-arm-cable-row', nameAr: 'تجديف كيبل بذراع واحدة', nameEn: 'Single-Arm Cable Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'inverted-row', nameAr: 'تجديف مقلوب (وزن الجسم)', nameEn: 'Inverted Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['bodyweight'], level: 'beginner', movementPattern: 'pull', environment: 'both', defaultReps: '8–15', defaultRestSec: 60, alternatives: ['dumbbell-row', 'seated-cable-row'] }),
  ex({ id: 'barbell-shrug', nameAr: 'رفرفة الترابيس بار', nameEn: 'Barbell Shrug', primaryMuscle: 'back', equipment: ['barbell'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'rack-pull', nameAr: 'راك بل (رفعة من الحامل)', nameEn: 'Rack Pull', primaryMuscle: 'back', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['barbell'], level: 'intermediate', movementPattern: 'hinge', environment: 'gym', defaultReps: '5–8', defaultRestSec: 120 }),
  ex({ id: 'meadows-row', nameAr: 'تجديف ميدوز', nameEn: 'Meadows Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['barbell'], level: 'advanced', movementPattern: 'pull', environment: 'gym', defaultReps: '8–12', defaultRestSec: 75 }),
  ex({ id: 'neutral-grip-pulldown', nameAr: 'سحب قبضة محايدة', nameEn: 'Neutral-Grip Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75 }),

  // ===== الأكتاف (إضافات) =====
  ex({ id: 'arnold-press', nameAr: 'ضغط أرنولد', nameEn: 'Arnold Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['dumbbell'], level: 'intermediate', movementPattern: 'push', environment: 'gym', defaultReps: '8–12', defaultRestSec: 90 }),
  ex({ id: 'seated-dumbbell-press', nameAr: 'ضغط كتف دمبل جالس', nameEn: 'Seated Dumbbell Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '8–12', defaultRestSec: 90, alternatives: ['dumbbell-shoulder-press', 'shoulder-press-machine'] }),
  ex({ id: 'push-press', nameAr: 'بوش بريس', nameEn: 'Push Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'quads'], equipment: ['barbell'], level: 'advanced', movementPattern: 'push', environment: 'gym', defaultReps: '5–8', defaultRestSec: 120 }),
  ex({ id: 'upright-row', nameAr: 'تجديف عمودي', nameEn: 'Upright Row', primaryMuscle: 'shoulders', secondaryMuscles: ['biceps'], equipment: ['barbell'], level: 'intermediate', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'machine-lateral-raise', nameAr: 'رفرفة جانبي جهاز', nameEn: 'Machine Lateral Raise', primaryMuscle: 'shoulders', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45, alternatives: ['lateral-raise', 'cable-lateral-raise'] }),
  ex({ id: 'seated-lateral-raise', nameAr: 'رفرفة جانبي جالس', nameEn: 'Seated Lateral Raise', primaryMuscle: 'shoulders', equipment: ['dumbbell', 'bench'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'cable-rear-delt-fly', nameAr: 'رفرفة خلفي كيبل', nameEn: 'Cable Rear Delt Fly', primaryMuscle: 'shoulders', equipment: ['cable'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'landmine-press', nameAr: 'ضغط لاندماين', nameEn: 'Landmine Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'chest'], equipment: ['barbell'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '8–12', defaultRestSec: 75 }),
  ex({ id: 'pike-push-up', nameAr: 'ضغط بايك', nameEn: 'Pike Push-Up', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'push', environment: 'home', defaultReps: '8–12', defaultRestSec: 60, alternatives: ['dumbbell-shoulder-press'] }),

  // ===== البايسبس (إضافات) =====
  ex({ id: 'incline-dumbbell-curl', nameAr: 'تمرير دمبل مائل', nameEn: 'Incline Dumbbell Curl', primaryMuscle: 'biceps', equipment: ['dumbbell', 'bench'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'ez-bar-curl', nameAr: 'تمرير بار متعرّج', nameEn: 'EZ-Bar Curl', primaryMuscle: 'biceps', equipment: ['ez-bar'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '8–12', defaultRestSec: 60, alternatives: ['barbell-curl', 'dumbbell-curl'] }),
  ex({ id: 'spider-curl', nameAr: 'تمرير سبايدر', nameEn: 'Spider Curl', primaryMuscle: 'biceps', equipment: ['dumbbell', 'bench'], level: 'intermediate', movementPattern: 'isolation', environment: 'gym', defaultReps: '10–12', defaultRestSec: 45 }),
  ex({ id: 'cable-hammer-curl', nameAr: 'تمرير مطرقة كيبل (حبل)', nameEn: 'Cable Hammer Curl', primaryMuscle: 'biceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'reverse-curl', nameAr: 'تمرير عكسي', nameEn: 'Reverse Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: ['ez-bar'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60 }),
  ex({ id: 'machine-curl', nameAr: 'تمرير جهاز', nameEn: 'Machine Curl', primaryMuscle: 'biceps', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60, alternatives: ['preacher-curl', 'cable-curl'] }),

  // ===== الترايسبس (إضافات) =====
  ex({ id: 'triceps-dip-machine', nameAr: 'غطس ترايسبس جهاز', nameEn: 'Triceps Dip Machine', primaryMuscle: 'triceps', equipment: ['machine'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '10–12', defaultRestSec: 60, alternatives: ['bench-dip', 'triceps-pushdown'] }),
  ex({ id: 'single-arm-pushdown', nameAr: 'دفع ترايسبس بذراع واحدة', nameEn: 'Single-Arm Pushdown', primaryMuscle: 'triceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'cable-overhead-extension', nameAr: 'تمديد ترايسبس علوي كيبل', nameEn: 'Cable Overhead Extension', primaryMuscle: 'triceps', equipment: ['cable'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60 }),
  ex({ id: 'dumbbell-kickback', nameAr: 'ركلة ترايسبس دمبل', nameEn: 'Dumbbell Kickback', primaryMuscle: 'triceps', equipment: ['dumbbell'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–15', defaultRestSec: 45 }),
  ex({ id: 'diamond-push-up', nameAr: 'ضغط ماسي', nameEn: 'Diamond Push-Up', primaryMuscle: 'triceps', secondaryMuscles: ['chest'], equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'push', environment: 'home', defaultReps: '8–15', defaultRestSec: 60 }),
  ex({ id: 'jm-press', nameAr: 'جي إم بريس', nameEn: 'JM Press', primaryMuscle: 'triceps', equipment: ['barbell', 'bench'], level: 'advanced', movementPattern: 'push', environment: 'gym', defaultReps: '8–10', defaultRestSec: 75 }),

  // ===== الكوادز (إضافات) =====
  ex({ id: 'pendulum-squat', nameAr: 'بندولم سكوات', nameEn: 'Pendulum Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: ['machine'], level: 'intermediate', movementPattern: 'squat', environment: 'gym', defaultReps: '8–12', defaultRestSec: 120 }),
  ex({ id: 'sissy-squat', nameAr: 'سيسي سكوات', nameEn: 'Sissy Squat', primaryMuscle: 'quads', equipment: ['bodyweight'], level: 'advanced', movementPattern: 'squat', environment: 'both', defaultReps: '10–15', defaultRestSec: 60 }),
  ex({ id: 'reverse-lunge', nameAr: 'طعنة خلفية', nameEn: 'Reverse Lunge', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: ['dumbbell'], level: 'beginner', movementPattern: 'lunge', environment: 'both', defaultReps: '10–12', defaultRestSec: 60, alternatives: ['walking-lunge', 'step-up'] }),
  ex({ id: 'leg-press-narrow', nameAr: 'دفع أرجل قبضة ضيقة', nameEn: 'Narrow-Stance Leg Press', primaryMuscle: 'quads', equipment: ['machine'], level: 'beginner', movementPattern: 'squat', environment: 'gym', defaultReps: '10–12', defaultRestSec: 120 }),
  ex({ id: 'belt-squat', nameAr: 'سكوات بالحزام', nameEn: 'Belt Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: ['machine'], level: 'intermediate', movementPattern: 'squat', environment: 'gym', defaultReps: '10–15', defaultRestSec: 90 }),
  ex({ id: 'wall-sit', nameAr: 'جلسة الحائط', nameEn: 'Wall Sit', primaryMuscle: 'quads', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'squat', environment: 'home', defaultSets: 3, defaultReps: '30–60 ث', defaultRestSec: 45 }),

  // ===== الهامسترنج (إضافات) =====
  ex({ id: 'stiff-leg-deadlift', nameAr: 'رفعة بأرجل مفرودة', nameEn: 'Stiff-Leg Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: ['barbell'], level: 'intermediate', movementPattern: 'hinge', environment: 'gym', defaultReps: '8–10', defaultRestSec: 120, alternatives: ['romanian-deadlift', 'dumbbell-rdl'] }),
  ex({ id: 'nordic-curl', nameAr: 'نوردك كيرل', nameEn: 'Nordic Hamstring Curl', primaryMuscle: 'hamstrings', equipment: ['bodyweight'], level: 'advanced', movementPattern: 'isolation', environment: 'both', defaultReps: '5–8', defaultRestSec: 90 }),
  ex({ id: 'single-leg-rdl', nameAr: 'رفعة رومانية برجل واحدة', nameEn: 'Single-Leg RDL', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: ['dumbbell'], level: 'intermediate', movementPattern: 'hinge', environment: 'both', defaultReps: '8–10', defaultRestSec: 75 }),
  ex({ id: 'glute-ham-raise', nameAr: 'رفع الجلوت-هام (GHR)', nameEn: 'Glute-Ham Raise', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: ['machine'], level: 'advanced', movementPattern: 'isolation', environment: 'gym', defaultReps: '8–12', defaultRestSec: 75 }),

  // ===== الجلوتس (إضافات) =====
  ex({ id: 'machine-hip-thrust', nameAr: 'دفع الورك جهاز', nameEn: 'Machine Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: ['machine'], level: 'beginner', movementPattern: 'hinge', environment: 'gym', defaultReps: '10–15', defaultRestSec: 75, alternatives: ['hip-thrust', 'glute-bridge'] }),
  ex({ id: 'single-leg-hip-thrust', nameAr: 'دفع الورك برجل واحدة', nameEn: 'Single-Leg Hip Thrust', primaryMuscle: 'glutes', equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'hinge', environment: 'home', defaultReps: '10–15', defaultRestSec: 60 }),
  ex({ id: 'abduction-machine', nameAr: 'مباعدة الأرجل جهاز', nameEn: 'Hip Abduction Machine', primaryMuscle: 'glutes', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '15–20', defaultRestSec: 45 }),
  ex({ id: 'banded-lateral-walk', nameAr: 'مشي جانبي بالمطاط', nameEn: 'Banded Lateral Walk', primaryMuscle: 'glutes', equipment: ['band'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–15 لكل جهة', defaultRestSec: 45 }),
  ex({ id: 'frog-pump', nameAr: 'ضخّ الضفدع للجلوت', nameEn: 'Frog Pump', primaryMuscle: 'glutes', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'hinge', environment: 'home', defaultReps: '15–25', defaultRestSec: 45 }),

  // ===== السمانة (إضافات) =====
  ex({ id: 'leg-press-calf-raise', nameAr: 'رفع السمانة على جهاز الدفع', nameEn: 'Leg Press Calf Raise', primaryMuscle: 'calves', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–20', defaultRestSec: 45 }),
  ex({ id: 'donkey-calf-raise', nameAr: 'رفع السمانة (دونكي)', nameEn: 'Donkey Calf Raise', primaryMuscle: 'calves', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–20', defaultRestSec: 45 }),
  ex({ id: 'single-leg-calf-raise', nameAr: 'رفع السمانة برجل واحدة', nameEn: 'Single-Leg Calf Raise', primaryMuscle: 'calves', equipment: ['dumbbell', 'bodyweight'], level: 'beginner', movementPattern: 'isolation', environment: 'both', defaultReps: '12–20', defaultRestSec: 40 }),

  // ===== الكور / البطن (إضافات) =====
  ex({ id: 'leg-raise', nameAr: 'رفع الأرجل مستلقي', nameEn: 'Lying Leg Raise', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '12–20', defaultRestSec: 40 }),
  ex({ id: 'bicycle-crunch', nameAr: 'كرنش الدراجة', nameEn: 'Bicycle Crunch', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '20–30', defaultRestSec: 30 }),
  ex({ id: 'dead-bug', nameAr: 'الحشرة الميتة', nameEn: 'Dead Bug', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '10–12 لكل جهة', defaultRestSec: 30 }),
  ex({ id: 'hollow-hold', nameAr: 'ثبات الجسم المقعّر', nameEn: 'Hollow Body Hold', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'core', environment: 'home', defaultReps: '20–40 ث', defaultRestSec: 45 }),
  ex({ id: 'cable-woodchop', nameAr: 'قطع الخشب كيبل', nameEn: 'Cable Woodchop', primaryMuscle: 'core', equipment: ['cable'], level: 'intermediate', movementPattern: 'core', environment: 'gym', defaultReps: '12–15 لكل جهة', defaultRestSec: 45 }),
  ex({ id: 'machine-crunch', nameAr: 'كرنش جهاز', nameEn: 'Machine Crunch', primaryMuscle: 'core', equipment: ['machine'], level: 'beginner', movementPattern: 'core', environment: 'gym', defaultReps: '12–20', defaultRestSec: 45, alternatives: ['cable-crunch', 'crunch'] }),
  ex({ id: 'toes-to-bar', nameAr: 'أصابع للبار', nameEn: 'Toes to Bar', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'advanced', movementPattern: 'core', environment: 'gym', defaultReps: '8–12', defaultRestSec: 60, alternatives: ['hanging-leg-raise', 'leg-raise'] }),
  ex({ id: 'pallof-press', nameAr: 'ضغط بالوف (مقاومة دوران)', nameEn: 'Pallof Press', primaryMuscle: 'core', equipment: ['cable', 'band'], level: 'beginner', movementPattern: 'core', environment: 'both', defaultReps: '12–15 لكل جهة', defaultRestSec: 45 }),
  ex({ id: 'flutter-kicks', nameAr: 'رفرفة الأرجل', nameEn: 'Flutter Kicks', primaryMuscle: 'core', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'core', environment: 'home', defaultReps: '30–45 ث', defaultRestSec: 30 }),

  // ===== كارديو (إضافات) =====
  ex({ id: 'incline-treadmill-walk', nameAr: 'مشي مائل على السير', nameEn: 'Incline Treadmill Walk', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '20–40 د', defaultRestSec: 0 }),
  ex({ id: 'stairmaster', nameAr: 'جهاز الدرج (ستيرماستر)', nameEn: 'Stairmaster', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '15–25 د', defaultRestSec: 0 }),
  ex({ id: 'burpees', nameAr: 'بيربي', nameEn: 'Burpees', primaryMuscle: 'cardio', secondaryMuscles: ['chest', 'quads'], equipment: ['bodyweight'], level: 'intermediate', movementPattern: 'cardio', environment: 'home', defaultSets: 4, defaultReps: '10–15', defaultRestSec: 45 }),
  ex({ id: 'high-knees', nameAr: 'رفع الركب (جري ثابت)', nameEn: 'High Knees', primaryMuscle: 'cardio', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'cardio', environment: 'home', defaultSets: 4, defaultReps: '30–45 ث', defaultRestSec: 30 }),
  ex({ id: 'battle-ropes', nameAr: 'حبال القتال', nameEn: 'Battle Ropes', primaryMuscle: 'cardio', secondaryMuscles: ['shoulders'], equipment: ['rope'], level: 'intermediate', movementPattern: 'cardio', environment: 'gym', defaultSets: 4, defaultReps: '20–30 ث', defaultRestSec: 45 }),
  ex({ id: 'assault-bike', nameAr: 'الدراجة الهوائية (أسولت)', nameEn: 'Assault Bike', primaryMuscle: 'cardio', equipment: ['machine'], level: 'beginner', movementPattern: 'cardio', environment: 'gym', defaultSets: 1, defaultReps: '10–20 د', defaultRestSec: 0 }),
  ex({ id: 'outdoor-walk', nameAr: 'مشي خارجي', nameEn: 'Outdoor Walk', primaryMuscle: 'cardio', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'cardio', environment: 'home', defaultSets: 1, defaultReps: '30–45 د', defaultRestSec: 0, notesAr: 'خيار سهل لزيادة النشاط اليومي (NEAT).' }),

  // ===== إحماء / مرونة =====
  ex({ id: 'arm-circles', nameAr: 'تدوير الذراعين (إحماء)', nameEn: 'Arm Circles', primaryMuscle: 'shoulders', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '15–20', defaultRestSec: 20, notesAr: 'إحماء للكتف قبل تمارين الدفع.' }),
  ex({ id: 'cat-cow', nameAr: 'تمدّد القطة-البقرة', nameEn: 'Cat-Cow Stretch', primaryMuscle: 'back', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'home', defaultSets: 2, defaultReps: '8–10', defaultRestSec: 20 }),
  ex({ id: 'hip-flexor-stretch', nameAr: 'تمدّد عضلة الورك القابضة', nameEn: 'Hip Flexor Stretch', primaryMuscle: 'quads', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '30 ث لكل جهة', defaultRestSec: 15 }),
  ex({ id: 'world-greatest-stretch', nameAr: 'أعظم تمدّد (World’s Greatest)', nameEn: 'World’s Greatest Stretch', primaryMuscle: 'hamstrings', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '5–6 لكل جهة', defaultRestSec: 20 }),
  ex({ id: 'leg-swings', nameAr: 'أرجحة الأرجل (إحماء)', nameEn: 'Leg Swings', primaryMuscle: 'hamstrings', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '12–15 لكل جهة', defaultRestSec: 15 }),
  ex({ id: 'shoulder-dislocates', nameAr: 'مرونة الكتف بالعصا/المطاط', nameEn: 'Shoulder Dislocates', primaryMuscle: 'shoulders', equipment: ['band'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '10–12', defaultRestSec: 20 }),
  ex({ id: 'thoracic-rotation', nameAr: 'تدوير الفقرات الصدرية', nameEn: 'Thoracic Rotation', primaryMuscle: 'back', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'home', defaultSets: 2, defaultReps: '8–10 لكل جهة', defaultRestSec: 15 }),
  ex({ id: 'ankle-mobility', nameAr: 'مرونة الكاحل', nameEn: 'Ankle Mobility Drill', primaryMuscle: 'calves', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '10–12 لكل جهة', defaultRestSec: 15 }),
  ex({ id: 'hamstring-stretch', nameAr: 'تمدّد الهامسترنج', nameEn: 'Standing Hamstring Stretch', primaryMuscle: 'hamstrings', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'both', defaultSets: 2, defaultReps: '30 ث', defaultRestSec: 15 }),
  ex({ id: 'child-pose', nameAr: 'وضعية الطفل (استرخاء)', nameEn: 'Child’s Pose', primaryMuscle: 'back', equipment: ['bodyweight'], level: 'beginner', movementPattern: 'mobility', environment: 'home', defaultSets: 2, defaultReps: '30–45 ث', defaultRestSec: 15 }),

  // ===== أجهزة إضافية (Phase 2 — استكمال كتالوج الأجهزة للمبتدئين) =====
  // أجهزة موجّهة آمنة للمبتدئ تكمّل الأسماء المطلوبة في كتالوج الأجهزة (machineCatalog.ts).
  ex({ id: 'decline-machine-press', nameAr: 'ضغط صدر سفلي جهاز', nameEn: 'Decline Chest Press Machine', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['machine'], level: 'beginner', movementPattern: 'push', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75, alternatives: ['chest-press-machine', 'pec-deck'] }),
  ex({ id: 'low-row-machine', nameAr: 'تجديف منخفض جهاز (لاتس سفلي)', nameEn: 'Low Row Machine', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['machine'], level: 'beginner', movementPattern: 'pull', environment: 'gym', defaultReps: '10–12', defaultRestSec: 75, alternatives: ['machine-row', 'lat-pulldown'] }),
  ex({ id: 'machine-rdl', nameAr: 'الرفعة الرومانية بالجهاز', nameEn: 'RDL Machine', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: ['machine'], level: 'beginner', movementPattern: 'hinge', environment: 'gym', defaultReps: '10–12', defaultRestSec: 90, alternatives: ['lying-leg-curl', 'dumbbell-rdl'] }),
  ex({ id: 'glute-kickback-machine', nameAr: 'ركلة المؤخرة بالجهاز', nameEn: 'Glute Kickback Machine', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '12–15', defaultRestSec: 60, alternatives: ['machine-hip-thrust', 'cable-kickback'] }),
  ex({ id: 'adduction-machine', nameAr: 'تقريب الأرجل جهاز', nameEn: 'Hip Adduction Machine', primaryMuscle: 'glutes', equipment: ['machine'], level: 'beginner', movementPattern: 'isolation', environment: 'gym', defaultReps: '15–20', defaultRestSec: 45, alternatives: ['abduction-machine'] }),
]

/** الاسم العربي للعضلة الهدف (المجموعة العامة) — يُعرض كسطر/رقاقة في بطاقة التمرين. */
export const MUSCLE_LABEL_AR: Record<Muscle, string> = {
  chest: 'الصدر',
  back: 'الظهر',
  shoulders: 'الأكتاف',
  biceps: 'البايسبس',
  triceps: 'الترايسبس',
  legs: 'الأرجل',
  glutes: 'المؤخرة',
  hamstrings: 'خلفية الفخذ',
  quads: 'أمامية الفخذ',
  calves: 'السمانة',
  core: 'البطن',
  cardio: 'كارديو',
}

/** العضلة الهدف للتمرين بالعربية (target_muscle_ar). */
export function targetMuscleAr(ex: Exercise): string {
  return MUSCLE_LABEL_AR[ex.primaryMuscle] ?? ex.primaryMuscle
}

/** خريطة سريعة للوصول لتمرين بالمعرّف. */
export const exerciseMap: Record<string, Exercise> = Object.fromEntries(
  exercises.map((e) => [e.id, e]),
)

export function getExercise(id: string): Exercise | undefined {
  return exerciseMap[id]
}

/** بدائل التمرين: من حقل alternatives إن وُجد، وإلا تمارين بنفس العضلة. */
export function getAlternatives(id: string): Exercise[] {
  const ex = getExercise(id)
  if (!ex) return []
  if (ex.alternatives.length) {
    return ex.alternatives.map(getExercise).filter((e): e is Exercise => Boolean(e))
  }
  return exercises.filter((e) => e.id !== id && e.primaryMuscle === ex.primaryMuscle).slice(0, 4)
}
