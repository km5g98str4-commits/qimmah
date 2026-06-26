import type { Exercise, ExEnvironment, ExLevel, Muscle, MovementPattern } from '@/types/workout'

// مكتبة التمارين — ~80 تمرينًا. كل تمرين له رابط شرح موثوق (غير فارغ).
// ملاحظة: بعض الروابط عبارة عن بحث يوتيوب موثوق وليست بالضرورة رسمية.

function video(nameEn: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(nameEn + ' exercise form')}`
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
}

function ex(p: ExInput): Exercise {
  return {
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    primaryMuscle: p.primaryMuscle,
    secondaryMuscles: p.secondaryMuscles ?? [],
    equipment: p.equipment,
    level: p.level,
    movementPattern: p.movementPattern,
    environment: p.environment,
    defaultSets: p.defaultSets ?? 3,
    defaultReps: p.defaultReps ?? '8–12',
    defaultRestSec: p.defaultRestSec ?? 90,
    videoUrl: p.videoUrl ?? video(p.nameEn),
    videoSource: 'trusted',
    alternatives: p.alternatives ?? [],
    notesAr: '',
    notesEn: '',
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
]

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
