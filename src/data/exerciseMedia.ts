// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/build-exercise-media.mjs  •  بيانات: yuhonas/free-exercise-db (Unlicense / ملكية عامة)
// لإعادة التوليد:  node scripts/build-exercise-media.mjs
// لفتح GIF المتحرّك (اختياري):  WORKOUTX_API_KEY=xxxx node scripts/build-exercise-media.mjs
//
// التغطية: 136/170 تمرينًا له صورة حقيقية.

/** وسائط تمرين واحد: إطار بداية + إطار نهاية (واختياريًا GIF متحرّك يُفضّل عند توفّره). */
export interface ExerciseMedia {
  /** إطار بداية الحركة (0.jpg). */
  img0: string
  /** إطار نهاية الحركة (1.jpg) — للتلاشي المتبادل ومحاكاة الحركة. */
  img1: string
  /** GIF متحرّك (WorkoutX) — يُفضّل على الصور الثابتة عند توفّره. */
  gifUrl?: string
}

/** خريطة ثابتة: مُعرّف تمرين قِمّة → وسائط مطابقة من قاعدة بيانات عامة. التمارين غير المطابِقة غائبة عمدًا. */
export const exerciseMedia: Record<string, ExerciseMedia> = {
  "ab-wheel-rollout": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/1.jpg"
  },
  "adduction-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hip_Adduction/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hip_Adduction/1.jpg"
  },
  "arm-circles": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arm_Circles/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arm_Circles/1.jpg"
  },
  "arnold-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/1.jpg"
  },
  "barbell-back-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg"
  },
  "barbell-bench-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg"
  },
  "barbell-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/1.jpg"
  },
  "barbell-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/1.jpg"
  },
  "barbell-shrug": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/1.jpg"
  },
  "bench-dip": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/1.jpg"
  },
  "bodyweight-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/1.jpg"
  },
  "bodyweight-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/1.jpg"
  },
  "bulgarian-split-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/1.jpg"
  },
  "cable-crossover": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/1.jpg"
  },
  "cable-crunch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/1.jpg"
  },
  "cable-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/1.jpg"
  },
  "cable-hammer-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/1.jpg"
  },
  "cable-kickback": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/1.jpg"
  },
  "cable-lateral-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/1.jpg"
  },
  "cable-overhead-extension": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/1.jpg"
  },
  "cable-pull-through": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/1.jpg"
  },
  "cable-rear-delt-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/1.jpg"
  },
  "cat-cow": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/1.jpg"
  },
  "chest-dip": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/1.jpg"
  },
  "chest-press-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Chest_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Chest_Press/1.jpg"
  },
  "child-pose": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Childs_Pose/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Childs_Pose/1.jpg"
  },
  "chin-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/1.jpg"
  },
  "close-grip-bench-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/1.jpg"
  },
  "close-grip-pulldown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/1.jpg"
  },
  "concentration-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Concentration_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Concentration_Curl/1.jpg"
  },
  "crunch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/1.jpg"
  },
  "dead-bug": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/1.jpg"
  },
  "deadlift": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/1.jpg"
  },
  "decline-barbell-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/1.jpg"
  },
  "decline-dumbbell-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/1.jpg"
  },
  "decline-machine-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leverage_Decline_Chest_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leverage_Decline_Chest_Press/1.jpg"
  },
  "diamond-push-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up_Close-Grip/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up_Close-Grip/1.jpg"
  },
  "donkey-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Donkey_Calf_Raises/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Donkey_Calf_Raises/1.jpg"
  },
  "dumbbell-bench-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/1.jpg"
  },
  "dumbbell-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/1.jpg"
  },
  "dumbbell-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/1.jpg"
  },
  "dumbbell-kickback": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/1.jpg"
  },
  "dumbbell-rdl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "dumbbell-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Incline_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Incline_Row/1.jpg"
  },
  "dumbbell-shoulder-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/1.jpg"
  },
  "dumbbell-shrug": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/1.jpg"
  },
  "ez-bar-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/1.jpg"
  },
  "face-pull": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/1.jpg"
  },
  "flutter-kicks": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flutter_Kicks/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flutter_Kicks/1.jpg"
  },
  "front-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/1.jpg"
  },
  "front-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/1.jpg"
  },
  "glute-bridge": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/1.jpg"
  },
  "glute-ham-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Ham_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Ham_Raise/1.jpg"
  },
  "glute-kickback-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Kickback/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Kickback/1.jpg"
  },
  "goblet-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/1.jpg"
  },
  "good-morning": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Good_Morning/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Good_Morning/1.jpg"
  },
  "hack-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hack_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hack_Squat/1.jpg"
  },
  "hammer-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/1.jpg"
  },
  "hamstring-stretch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Hamstring_and_Calf_Stretch/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Hamstring_and_Calf_Stretch/1.jpg"
  },
  "hanging-leg-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/1.jpg"
  },
  "hip-flexor-stretch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Intermediate_Hip_Flexor_and_Quad_Stretch/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Intermediate_Hip_Flexor_and_Quad_Stretch/1.jpg"
  },
  "hip-thrust": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/1.jpg"
  },
  "incline-barbell-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg"
  },
  "incline-cable-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Flye/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Flye/1.jpg"
  },
  "incline-dumbbell-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/1.jpg"
  },
  "incline-dumbbell-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/1.jpg"
  },
  "incline-machine-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Chest_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Chest_Press/1.jpg"
  },
  "incline-push-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/1.jpg"
  },
  "inverted-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/1.jpg"
  },
  "jm-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/JM_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/JM_Press/1.jpg"
  },
  "kettlebell-swing": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/1.jpg"
  },
  "knee-push-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/1.jpg"
  },
  "lat-pulldown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "lateral-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/1.jpg"
  },
  "leg-extension": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/1.jpg"
  },
  "leg-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/1.jpg"
  },
  "leg-press-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/1.jpg"
  },
  "leg-press-narrow": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Narrow_Stance_Leg_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Narrow_Stance_Leg_Press/1.jpg"
  },
  "leg-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Lying_Leg_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Lying_Leg_Raise/1.jpg"
  },
  "low-cable-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Cable_Crossover/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Cable_Crossover/1.jpg"
  },
  "low-row-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Pulley_Row_To_Neck/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Pulley_Row_To_Neck/1.jpg"
  },
  "lying-leg-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/1.jpg"
  },
  "machine-crunch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/1.jpg"
  },
  "machine-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bicep_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bicep_Curl/1.jpg"
  },
  "machine-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Cable_Flyes/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Cable_Flyes/1.jpg"
  },
  "machine-hip-thrust": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/1.jpg"
  },
  "machine-lateral-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/1.jpg"
  },
  "machine-rdl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "machine-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shotgun_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shotgun_Row/1.jpg"
  },
  "neutral-grip-pulldown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "nordic-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Band_Hamstring_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Band_Hamstring_Curl/1.jpg"
  },
  "overhead-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/1.jpg"
  },
  "overhead-triceps-extension": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Overhead_Triceps_Extension/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Overhead_Triceps_Extension/1.jpg"
  },
  "pallof-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press/1.jpg"
  },
  "pec-deck": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/1.jpg"
  },
  "plank": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/1.jpg"
  },
  "preacher-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/1.jpg"
  },
  "pull-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/1.jpg"
  },
  "push-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Press/1.jpg"
  },
  "push-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/1.jpg"
  },
  "rack-pull": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rack_Pull_with_Bands/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rack_Pull_with_Bands/1.jpg"
  },
  "rear-delt-fly": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/1.jpg"
  },
  "reverse-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Barbell_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Barbell_Curl/1.jpg"
  },
  "reverse-lunge": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crossover_Reverse_Lunge/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crossover_Reverse_Lunge/1.jpg"
  },
  "reverse-pec-deck": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/1.jpg"
  },
  "romanian-deadlift": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "rope-pushdown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/1.jpg"
  },
  "russian-twist": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/1.jpg"
  },
  "seated-cable-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/1.jpg"
  },
  "seated-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/1.jpg"
  },
  "seated-dumbbell-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/1.jpg"
  },
  "seated-lateral-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/1.jpg"
  },
  "seated-leg-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/1.jpg"
  },
  "shoulder-press-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Shoulder_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Shoulder_Press/1.jpg"
  },
  "side-plank": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Up_to_Side_Plank/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Up_to_Side_Plank/1.jpg"
  },
  "single-arm-cable-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Single-Arm_High_Pulley_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Single-Arm_High_Pulley_Row/1.jpg"
  },
  "single-leg-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/1.jpg"
  },
  "single-leg-rdl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/1.jpg"
  },
  "sissy-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/1.jpg"
  },
  "skull-crusher": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Close-Grip_Bench_To_Skull_Crusher/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Close-Grip_Bench_To_Skull_Crusher/1.jpg"
  },
  "smith-machine-bench": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Bench_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Bench_Press/1.jpg"
  },
  "smith-machine-squat": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Squat/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Squat/1.jpg"
  },
  "spider-curl": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/1.jpg"
  },
  "standing-calf-raise": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/1.jpg"
  },
  "step-up": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Step-up_with_Knee_Raise/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Step-up_with_Knee_Raise/1.jpg"
  },
  "stiff-leg-deadlift": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/1.jpg"
  },
  "straight-arm-pulldown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/1.jpg"
  },
  "sumo-deadlift": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/1.jpg"
  },
  "svend-press": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Svend_Press/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Svend_Press/1.jpg"
  },
  "t-bar-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_T-Bar_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_T-Bar_Row/1.jpg"
  },
  "triceps-dip-machine": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/1.jpg"
  },
  "triceps-pushdown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/1.jpg"
  },
  "upright-row": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Upright_Barbell_Row/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Upright_Barbell_Row/1.jpg"
  },
  "walking-lunge": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/1.jpg"
  },
  "wide-grip-pulldown": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "world-greatest-stretch": {
    "img0": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Worlds_Greatest_Stretch/0.jpg",
    "img1": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Worlds_Greatest_Stretch/1.jpg"
  }
}

/** يُرجع وسائط التمرين إن وُجدت مطابقة، وإلا undefined (يعرض المكوّن بديلًا أنيقًا). */
export function getExerciseMedia(exerciseId: string): ExerciseMedia | undefined {
  return exerciseMedia[exerciseId]
}
