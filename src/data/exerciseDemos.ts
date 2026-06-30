// عروض التمارين المتحركة (Exercise demos)
// ----------------------------------------------------------------------------
// المصدر: free-exercise-db (https://github.com/yuhonas/free-exercise-db)
// الترخيص: The Unlicense — ملكية عامة (Public Domain)، لا حقوق نشر ولا علامات تجارية.
// تُقدَّم لكل تمرين صورتان: وضع البداية (0) ووضع النهاية (1). يبدّل المشغّل بينهما
// بشكل متكرّر لمحاكاة حركة التمرين (عرض متحرك بإطارين).
// تُخدَم عبر jsDelivr CDN (تخزين مؤقّت + CORS) بدل raw.githubusercontent لتفادي الحدود.
//
// تغطية: ١٠٣ تمرينًا من أصل ١٧٠ مربوطة بعروض حقيقية موثّقة. البقية تعرض إطارًا
// أنيقًا بديلًا («العرض قريبًا») + رابط بحث يوتيوب — لا تُعرض أبدًا صورة مكسورة.
// لتوسيع التغطية: أضف مدخلًا هنا (id التمرين → مساري الإطارين) بعد التحقق من تحميلهما.

/** قاعدة رابط الوسائط على CDN (jsDelivr يخدم محتوى GitHub مع تخزين وCORS). */
export const DEMO_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises'

/**
 * خريطة id التمرين → مسارات الإطارات (نسبية لقاعدة CDN).
 * كل قيمة [إطار البداية، إطار النهاية]. جميع المسارات مُتحقَّق من تحميلها (HTTP 200).
 */
const DEMO_FRAMES: Record<string, string[]> = {
  "ab-wheel-rollout": ["Barbell_Ab_Rollout/0.jpg", "Barbell_Ab_Rollout/1.jpg"],
  "arnold-press": ["Arnold_Dumbbell_Press/0.jpg", "Arnold_Dumbbell_Press/1.jpg"],
  "barbell-back-squat": ["Barbell_Squat/0.jpg", "Barbell_Squat/1.jpg"],
  "barbell-bench-press": ["Barbell_Bench_Press_-_Medium_Grip/0.jpg", "Barbell_Bench_Press_-_Medium_Grip/1.jpg"],
  "barbell-curl": ["Barbell_Curl/0.jpg", "Barbell_Curl/1.jpg"],
  "barbell-row": ["Bent_Over_Barbell_Row/0.jpg", "Bent_Over_Barbell_Row/1.jpg"],
  "barbell-shrug": ["Barbell_Shrug/0.jpg", "Barbell_Shrug/1.jpg"],
  "bench-dip": ["Bench_Dips/0.jpg", "Bench_Dips/1.jpg"],
  "bodyweight-squat": ["Bodyweight_Squat/0.jpg", "Bodyweight_Squat/1.jpg"],
  "cable-crossover": ["Cable_Crossover/0.jpg", "Cable_Crossover/1.jpg"],
  "cable-crunch": ["Cable_Crunch/0.jpg", "Cable_Crunch/1.jpg"],
  "cable-curl": ["Standing_Biceps_Cable_Curl/0.jpg", "Standing_Biceps_Cable_Curl/1.jpg"],
  "cable-hammer-curl": ["Cable_Hammer_Curls_-_Rope_Attachment/0.jpg", "Cable_Hammer_Curls_-_Rope_Attachment/1.jpg"],
  "cable-lateral-raise": ["Cable_Seated_Lateral_Raise/0.jpg", "Cable_Seated_Lateral_Raise/1.jpg"],
  "cable-pull-through": ["Pull_Through/0.jpg", "Pull_Through/1.jpg"],
  "cat-cow": ["Cat_Stretch/0.jpg", "Cat_Stretch/1.jpg"],
  "chest-dip": ["Dips_-_Chest_Version/0.jpg", "Dips_-_Chest_Version/1.jpg"],
  "chest-press-machine": ["Machine_Bench_Press/0.jpg", "Machine_Bench_Press/1.jpg"],
  "chin-up": ["Chin-Up/0.jpg", "Chin-Up/1.jpg"],
  "close-grip-bench-press": ["Close-Grip_Barbell_Bench_Press/0.jpg", "Close-Grip_Barbell_Bench_Press/1.jpg"],
  "close-grip-pulldown": ["Close-Grip_Front_Lat_Pulldown/0.jpg", "Close-Grip_Front_Lat_Pulldown/1.jpg"],
  "concentration-curl": ["Concentration_Curls/0.jpg", "Concentration_Curls/1.jpg"],
  "crunch": ["Crunches/0.jpg", "Crunches/1.jpg"],
  "dead-bug": ["Dead_Bug/0.jpg", "Dead_Bug/1.jpg"],
  "deadlift": ["Barbell_Deadlift/0.jpg", "Barbell_Deadlift/1.jpg"],
  "decline-barbell-press": ["Decline_Barbell_Bench_Press/0.jpg", "Decline_Barbell_Bench_Press/1.jpg"],
  "decline-dumbbell-press": ["Decline_Dumbbell_Bench_Press/0.jpg", "Decline_Dumbbell_Bench_Press/1.jpg"],
  "donkey-calf-raise": ["Donkey_Calf_Raises/0.jpg", "Donkey_Calf_Raises/1.jpg"],
  "dumbbell-bench-press": ["Dumbbell_Bench_Press/0.jpg", "Dumbbell_Bench_Press/1.jpg"],
  "dumbbell-curl": ["Dumbbell_Bicep_Curl/0.jpg", "Dumbbell_Bicep_Curl/1.jpg"],
  "dumbbell-fly": ["Dumbbell_Flyes/0.jpg", "Dumbbell_Flyes/1.jpg"],
  "dumbbell-kickback": ["Tricep_Dumbbell_Kickback/0.jpg", "Tricep_Dumbbell_Kickback/1.jpg"],
  "dumbbell-row": ["Bent_Over_Two-Dumbbell_Row/0.jpg", "Bent_Over_Two-Dumbbell_Row/1.jpg"],
  "dumbbell-shoulder-press": ["Dumbbell_Shoulder_Press/0.jpg", "Dumbbell_Shoulder_Press/1.jpg"],
  "dumbbell-shrug": ["Dumbbell_Shrug/0.jpg", "Dumbbell_Shrug/1.jpg"],
  "elliptical": ["Elliptical_Trainer/0.jpg", "Elliptical_Trainer/1.jpg"],
  "ez-bar-curl": ["Close-Grip_EZ_Bar_Curl/0.jpg", "Close-Grip_EZ_Bar_Curl/1.jpg"],
  "face-pull": ["Face_Pull/0.jpg", "Face_Pull/1.jpg"],
  "front-raise": ["Front_Dumbbell_Raise/0.jpg", "Front_Dumbbell_Raise/1.jpg"],
  "front-squat": ["Front_Barbell_Squat/0.jpg", "Front_Barbell_Squat/1.jpg"],
  "glute-bridge": ["Barbell_Glute_Bridge/0.jpg", "Barbell_Glute_Bridge/1.jpg"],
  "glute-ham-raise": ["Glute_Ham_Raise/0.jpg", "Glute_Ham_Raise/1.jpg"],
  "glute-kickback-machine": ["Glute_Kickback/0.jpg", "Glute_Kickback/1.jpg"],
  "goblet-squat": ["Goblet_Squat/0.jpg", "Goblet_Squat/1.jpg"],
  "good-morning": ["Good_Morning/0.jpg", "Good_Morning/1.jpg"],
  "hack-squat": ["Hack_Squat/0.jpg", "Hack_Squat/1.jpg"],
  "hammer-curl": ["Hammer_Curls/0.jpg", "Hammer_Curls/1.jpg"],
  "hanging-leg-raise": ["Hanging_Leg_Raise/0.jpg", "Hanging_Leg_Raise/1.jpg"],
  "hip-thrust": ["Barbell_Hip_Thrust/0.jpg", "Barbell_Hip_Thrust/1.jpg"],
  "incline-barbell-press": ["Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg", "Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg"],
  "incline-cable-fly": ["Incline_Cable_Flye/0.jpg", "Incline_Cable_Flye/1.jpg"],
  "incline-dumbbell-curl": ["Alternate_Incline_Dumbbell_Curl/0.jpg", "Alternate_Incline_Dumbbell_Curl/1.jpg"],
  "incline-dumbbell-press": ["Incline_Dumbbell_Press/0.jpg", "Incline_Dumbbell_Press/1.jpg"],
  "incline-push-up": ["Incline_Push-Up/0.jpg", "Incline_Push-Up/1.jpg"],
  "inverted-row": ["Inverted_Row/0.jpg", "Inverted_Row/1.jpg"],
  "jump-rope": ["Rope_Jumping/0.jpg", "Rope_Jumping/1.jpg"],
  "lat-pulldown": ["Wide-Grip_Lat_Pulldown/0.jpg", "Wide-Grip_Lat_Pulldown/1.jpg"],
  "lateral-raise": ["Side_Lateral_Raise/0.jpg", "Side_Lateral_Raise/1.jpg"],
  "leg-extension": ["Leg_Extensions/0.jpg", "Leg_Extensions/1.jpg"],
  "leg-press": ["Leg_Press/0.jpg", "Leg_Press/1.jpg"],
  "leg-press-calf-raise": ["Calf_Press_On_The_Leg_Press_Machine/0.jpg", "Calf_Press_On_The_Leg_Press_Machine/1.jpg"],
  "leg-press-narrow": ["Narrow_Stance_Leg_Press/0.jpg", "Narrow_Stance_Leg_Press/1.jpg"],
  "leg-raise": ["Flat_Bench_Lying_Leg_Raise/0.jpg", "Flat_Bench_Lying_Leg_Raise/1.jpg"],
  "low-cable-fly": ["Low_Cable_Crossover/0.jpg", "Low_Cable_Crossover/1.jpg"],
  "lying-leg-curl": ["Lying_Leg_Curls/0.jpg", "Lying_Leg_Curls/1.jpg"],
  "mountain-climber": ["Mountain_Climbers/0.jpg", "Mountain_Climbers/1.jpg"],
  "overhead-press": ["Standing_Military_Press/0.jpg", "Standing_Military_Press/1.jpg"],
  "overhead-triceps-extension": ["Cable_Rope_Overhead_Triceps_Extension/0.jpg", "Cable_Rope_Overhead_Triceps_Extension/1.jpg"],
  "pallof-press": ["Pallof_Press/0.jpg", "Pallof_Press/1.jpg"],
  "pendlay-row": ["Bent_Over_Barbell_Row/0.jpg", "Bent_Over_Barbell_Row/1.jpg"],
  "plank": ["Plank/0.jpg", "Plank/1.jpg"],
  "preacher-curl": ["Preacher_Curl/0.jpg", "Preacher_Curl/1.jpg"],
  "pull-up": ["Pullups/0.jpg", "Pullups/1.jpg"],
  "push-press": ["Push_Press/0.jpg", "Push_Press/1.jpg"],
  "push-up": ["Pushups/0.jpg", "Pushups/1.jpg"],
  "rack-pull": ["Rack_Pulls/0.jpg", "Rack_Pulls/1.jpg"],
  "reverse-curl": ["Standing_Dumbbell_Reverse_Curl/0.jpg", "Standing_Dumbbell_Reverse_Curl/1.jpg"],
  "reverse-lunge": ["Crossover_Reverse_Lunge/0.jpg", "Crossover_Reverse_Lunge/1.jpg"],
  "reverse-pec-deck": ["Reverse_Machine_Flyes/0.jpg", "Reverse_Machine_Flyes/1.jpg"],
  "romanian-deadlift": ["Romanian_Deadlift/0.jpg", "Romanian_Deadlift/1.jpg"],
  "rope-pushdown": ["Triceps_Pushdown_-_Rope_Attachment/0.jpg", "Triceps_Pushdown_-_Rope_Attachment/1.jpg"],
  "rowing-machine": ["Rowing_Stationary/0.jpg", "Rowing_Stationary/1.jpg"],
  "russian-twist": ["Russian_Twist/0.jpg", "Russian_Twist/1.jpg"],
  "seated-cable-row": ["Seated_Cable_Rows/0.jpg", "Seated_Cable_Rows/1.jpg"],
  "seated-calf-raise": ["Seated_Calf_Raise/0.jpg", "Seated_Calf_Raise/1.jpg"],
  "seated-dumbbell-press": ["Dumbbell_Shoulder_Press/0.jpg", "Dumbbell_Shoulder_Press/1.jpg"],
  "seated-leg-curl": ["Seated_Leg_Curl/0.jpg", "Seated_Leg_Curl/1.jpg"],
  "shoulder-press-machine": ["Machine_Shoulder_Military_Press/0.jpg", "Machine_Shoulder_Military_Press/1.jpg"],
  "single-arm-pushdown": ["Reverse_Grip_Triceps_Pushdown/0.jpg", "Reverse_Grip_Triceps_Pushdown/1.jpg"],
  "skull-crusher": ["EZ-Bar_Skullcrusher/0.jpg", "EZ-Bar_Skullcrusher/1.jpg"],
  "spider-curl": ["Spider_Curl/0.jpg", "Spider_Curl/1.jpg"],
  "standing-calf-raise": ["Standing_Calf_Raises/0.jpg", "Standing_Calf_Raises/1.jpg"],
  "stationary-bike": ["Recumbent_Bike/0.jpg", "Recumbent_Bike/1.jpg"],
  "step-up": ["Dumbbell_Step_Ups/0.jpg", "Dumbbell_Step_Ups/1.jpg"],
  "stiff-leg-deadlift": ["Stiff-Legged_Barbell_Deadlift/0.jpg", "Stiff-Legged_Barbell_Deadlift/1.jpg"],
  "straight-arm-pulldown": ["Straight-Arm_Pulldown/0.jpg", "Straight-Arm_Pulldown/1.jpg"],
  "sumo-deadlift": ["Sumo_Deadlift/0.jpg", "Sumo_Deadlift/1.jpg"],
  "t-bar-row": ["T-Bar_Row_with_Handle/0.jpg", "T-Bar_Row_with_Handle/1.jpg"],
  "treadmill-run": ["Running_Treadmill/0.jpg", "Running_Treadmill/1.jpg"],
  "triceps-pushdown": ["Triceps_Pushdown/0.jpg", "Triceps_Pushdown/1.jpg"],
  "upright-row": ["Upright_Barbell_Row/0.jpg", "Upright_Barbell_Row/1.jpg"],
  "walking-lunge": ["Dumbbell_Lunges/0.jpg", "Dumbbell_Lunges/1.jpg"],
  "wide-grip-pulldown": ["Wide-Grip_Lat_Pulldown/0.jpg", "Wide-Grip_Lat_Pulldown/1.jpg"],
}

export interface ExerciseDemo {
  /** إطارات العرض المتحرك (روابط كاملة جاهزة للعرض). */
  frames: string[]
}

/**
 * يعيد عرض التمرين المتحرك إن توفّر، أو null للاعتماد على الإطار البديل.
 * يحوّل المسارات النسبية إلى روابط CDN كاملة.
 */
export function getExerciseDemo(exerciseId: string): ExerciseDemo | null {
  const frames = DEMO_FRAMES[exerciseId]
  if (!frames || frames.length === 0) return null
  return { frames: frames.map((p) => `${DEMO_BASE}/${p}`) }
}

/** هل لهذا التمرين عرض متحرك مربوط؟ */
export function hasExerciseDemo(exerciseId: string): boolean {
  return exerciseId in DEMO_FRAMES
}

/** عدد التمارين المغطّاة بعروض متحركة (للتوثيق/التقارير). */
export const DEMO_COVERAGE_COUNT = Object.keys(DEMO_FRAMES).length
