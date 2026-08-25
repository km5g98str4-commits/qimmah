// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/build-exercise-media.mjs  •  بيانات: yuhonas/free-exercise-db (Unlicense / ملكية عامة)
// لإعادة التوليد:  node scripts/build-exercise-media.mjs
// لفتح GIF المتحرّك (اختياري):  WORKOUTX_API_KEY=xxxx node scripts/build-exercise-media.mjs
//
// التغطية تُقاس من exerciseProductionManifest.generated.ts (الحاكم) — هذا الملف طبقة أدلّة اللقطات فقط.
// أُزيلت أربع خرائط خاطئة نمط حركة (single-leg-rdl · nordic-curl · جهازا ضغط الصدر) — انظر NEVER_MATCH في المولّد.
// (استُبعِدت بطاقات الأجهزة في PLACEHOLDER_ONLY_EXERCISE_IDS — لا تُطابَق بصور وزن حرّ خاطئة.)
// الصور مُنزَّلة محليًا في public/exercise-images/ (لا اعتماد على شبكة وقت التشغيل)؛ الروابط البعيدة تبقى كـ fallback.

/** وسائط تمرين واحد: إطار بداية + إطار نهاية (واختياريًا GIF متحرّك يُفضّل عند توفّره). */
export interface ExerciseMedia {
  /** إطار بداية الحركة (0.jpg) — مسار محلّي مُلتزَم في المستودع. */
  img0: string
  /** إطار نهاية الحركة (1.jpg) — للتلاشي المتبادل ومحاكاة الحركة (مسار محلّي). */
  img1: string
  /** مصدر بعيد بديل لإطار البداية (raw.githubusercontent) — يُستخدم فقط عند تعذّر تحميل الملف المحلّي. */
  img0Remote?: string
  /** مصدر بعيد بديل لإطار النهاية — يُستخدم فقط عند تعذّر تحميل الملف المحلّي. */
  img1Remote?: string
  /** GIF متحرّك (WorkoutX) — يُفضّل على الصور الثابتة عند توفّره. */
  gifUrl?: string
}

/** خريطة ثابتة: مُعرّف تمرين قِمّة → وسائط مطابقة من قاعدة بيانات عامة. التمارين غير المطابِقة غائبة عمدًا. */
export const exerciseMedia: Record<string, ExerciseMedia> = {
  "ab-wheel-rollout": {
    "img0": "/exercise-images/ab-wheel-rollout/0.jpg",
    "img1": "/exercise-images/ab-wheel-rollout/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/1.jpg"
  },
  "adduction-machine": {
    "img0": "/exercise-images/adduction-machine/0.jpg",
    "img1": "/exercise-images/adduction-machine/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hip_Adduction/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hip_Adduction/1.jpg"
  },
  "arm-circles": {
    "img0": "/exercise-images/arm-circles/0.jpg",
    "img1": "/exercise-images/arm-circles/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arm_Circles/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arm_Circles/1.jpg"
  },
  "arnold-press": {
    "img0": "/exercise-images/arnold-press/0.jpg",
    "img1": "/exercise-images/arnold-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/1.jpg"
  },
  "barbell-back-squat": {
    "img0": "/exercise-images/barbell-back-squat/0.jpg",
    "img1": "/exercise-images/barbell-back-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg"
  },
  "barbell-bench-press": {
    "img0": "/exercise-images/barbell-bench-press/0.jpg",
    "img1": "/exercise-images/barbell-bench-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg"
  },
  "barbell-curl": {
    "img0": "/exercise-images/barbell-curl/0.jpg",
    "img1": "/exercise-images/barbell-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/1.jpg"
  },
  "barbell-row": {
    "img0": "/exercise-images/barbell-row/0.jpg",
    "img1": "/exercise-images/barbell-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/1.jpg"
  },
  "barbell-shrug": {
    "img0": "/exercise-images/barbell-shrug/0.jpg",
    "img1": "/exercise-images/barbell-shrug/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/1.jpg"
  },
  "bench-dip": {
    "img0": "/exercise-images/bench-dip/0.jpg",
    "img1": "/exercise-images/bench-dip/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/1.jpg"
  },
  "bodyweight-calf-raise": {
    "img0": "/exercise-images/bodyweight-calf-raise/0.jpg",
    "img1": "/exercise-images/bodyweight-calf-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Raise_On_A_Dumbbell/1.jpg"
  },
  "bodyweight-squat": {
    "img0": "/exercise-images/bodyweight-squat/0.jpg",
    "img1": "/exercise-images/bodyweight-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/1.jpg"
  },
  "bulgarian-split-squat": {
    "img0": "/exercise-images/bulgarian-split-squat/0.jpg",
    "img1": "/exercise-images/bulgarian-split-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/1.jpg"
  },
  "cable-crossover": {
    "img0": "/exercise-images/cable-crossover/0.jpg",
    "img1": "/exercise-images/cable-crossover/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/1.jpg"
  },
  "cable-curl": {
    "img0": "/exercise-images/cable-curl/0.jpg",
    "img1": "/exercise-images/cable-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/1.jpg"
  },
  "cable-hammer-curl": {
    "img0": "/exercise-images/cable-hammer-curl/0.jpg",
    "img1": "/exercise-images/cable-hammer-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Preacher_Curl/1.jpg"
  },
  "cable-kickback": {
    "img0": "/exercise-images/cable-kickback/0.jpg",
    "img1": "/exercise-images/cable-kickback/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/1.jpg"
  },
  "cable-lateral-raise": {
    "img0": "/exercise-images/cable-lateral-raise/0.jpg",
    "img1": "/exercise-images/cable-lateral-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/1.jpg"
  },
  "cable-overhead-extension": {
    "img0": "/exercise-images/cable-overhead-extension/0.jpg",
    "img1": "/exercise-images/cable-overhead-extension/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/1.jpg"
  },
  "cable-pull-through": {
    "img0": "/exercise-images/cable-pull-through/0.jpg",
    "img1": "/exercise-images/cable-pull-through/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/1.jpg"
  },
  "cable-rear-delt-fly": {
    "img0": "/exercise-images/cable-rear-delt-fly/0.jpg",
    "img1": "/exercise-images/cable-rear-delt-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/1.jpg"
  },
  "cat-cow": {
    "img0": "/exercise-images/cat-cow/0.jpg",
    "img1": "/exercise-images/cat-cow/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/1.jpg"
  },
  "chest-dip": {
    "img0": "/exercise-images/chest-dip/0.jpg",
    "img1": "/exercise-images/chest-dip/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/1.jpg"
  },
  "child-pose": {
    "img0": "/exercise-images/child-pose/0.jpg",
    "img1": "/exercise-images/child-pose/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Childs_Pose/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Childs_Pose/1.jpg"
  },
  "chin-up": {
    "img0": "/exercise-images/chin-up/0.jpg",
    "img1": "/exercise-images/chin-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/1.jpg"
  },
  "close-grip-bench-press": {
    "img0": "/exercise-images/close-grip-bench-press/0.jpg",
    "img1": "/exercise-images/close-grip-bench-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/1.jpg"
  },
  "close-grip-pulldown": {
    "img0": "/exercise-images/close-grip-pulldown/0.jpg",
    "img1": "/exercise-images/close-grip-pulldown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/1.jpg"
  },
  "concentration-curl": {
    "img0": "/exercise-images/concentration-curl/0.jpg",
    "img1": "/exercise-images/concentration-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Concentration_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Concentration_Curl/1.jpg"
  },
  "crunch": {
    "img0": "/exercise-images/crunch/0.jpg",
    "img1": "/exercise-images/crunch/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/1.jpg"
  },
  "dead-bug": {
    "img0": "/exercise-images/dead-bug/0.jpg",
    "img1": "/exercise-images/dead-bug/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/1.jpg"
  },
  "deadlift": {
    "img0": "/exercise-images/deadlift/0.jpg",
    "img1": "/exercise-images/deadlift/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/1.jpg"
  },
  "decline-barbell-press": {
    "img0": "/exercise-images/decline-barbell-press/0.jpg",
    "img1": "/exercise-images/decline-barbell-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/1.jpg"
  },
  "decline-dumbbell-press": {
    "img0": "/exercise-images/decline-dumbbell-press/0.jpg",
    "img1": "/exercise-images/decline-dumbbell-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/1.jpg"
  },
  "diamond-push-up": {
    "img0": "/exercise-images/diamond-push-up/0.jpg",
    "img1": "/exercise-images/diamond-push-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up_Close-Grip/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up_Close-Grip/1.jpg"
  },
  "donkey-calf-raise": {
    "img0": "/exercise-images/donkey-calf-raise/0.jpg",
    "img1": "/exercise-images/donkey-calf-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Donkey_Calf_Raises/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Donkey_Calf_Raises/1.jpg"
  },
  "dumbbell-bench-press": {
    "img0": "/exercise-images/dumbbell-bench-press/0.jpg",
    "img1": "/exercise-images/dumbbell-bench-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/1.jpg"
  },
  "dumbbell-curl": {
    "img0": "/exercise-images/dumbbell-curl/0.jpg",
    "img1": "/exercise-images/dumbbell-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/1.jpg"
  },
  "dumbbell-fly": {
    "img0": "/exercise-images/dumbbell-fly/0.jpg",
    "img1": "/exercise-images/dumbbell-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/1.jpg"
  },
  "dumbbell-kickback": {
    "img0": "/exercise-images/dumbbell-kickback/0.jpg",
    "img1": "/exercise-images/dumbbell-kickback/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/1.jpg"
  },
  "dumbbell-rdl": {
    "img0": "/exercise-images/dumbbell-rdl/0.jpg",
    "img1": "/exercise-images/dumbbell-rdl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "dumbbell-row": {
    "img0": "/exercise-images/dumbbell-row/0.jpg",
    "img1": "/exercise-images/dumbbell-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Incline_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Incline_Row/1.jpg"
  },
  "dumbbell-shoulder-press": {
    "img0": "/exercise-images/dumbbell-shoulder-press/0.jpg",
    "img1": "/exercise-images/dumbbell-shoulder-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/1.jpg"
  },
  "dumbbell-shrug": {
    "img0": "/exercise-images/dumbbell-shrug/0.jpg",
    "img1": "/exercise-images/dumbbell-shrug/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/1.jpg"
  },
  "ez-bar-curl": {
    "img0": "/exercise-images/ez-bar-curl/0.jpg",
    "img1": "/exercise-images/ez-bar-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/1.jpg"
  },
  "face-pull": {
    "img0": "/exercise-images/face-pull/0.jpg",
    "img1": "/exercise-images/face-pull/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/1.jpg"
  },
  "flutter-kicks": {
    "img0": "/exercise-images/flutter-kicks/0.jpg",
    "img1": "/exercise-images/flutter-kicks/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flutter_Kicks/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flutter_Kicks/1.jpg"
  },
  "front-raise": {
    "img0": "/exercise-images/front-raise/0.jpg",
    "img1": "/exercise-images/front-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/1.jpg"
  },
  "front-squat": {
    "img0": "/exercise-images/front-squat/0.jpg",
    "img1": "/exercise-images/front-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/1.jpg"
  },
  "glute-bridge": {
    "img0": "/exercise-images/glute-bridge/0.jpg",
    "img1": "/exercise-images/glute-bridge/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/1.jpg"
  },
  "glute-ham-raise": {
    "img0": "/exercise-images/glute-ham-raise/0.jpg",
    "img1": "/exercise-images/glute-ham-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Ham_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Ham_Raise/1.jpg"
  },
  "goblet-squat": {
    "img0": "/exercise-images/goblet-squat/0.jpg",
    "img1": "/exercise-images/goblet-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/1.jpg"
  },
  "good-morning": {
    "img0": "/exercise-images/good-morning/0.jpg",
    "img1": "/exercise-images/good-morning/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Good_Morning/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Good_Morning/1.jpg"
  },
  "hammer-curl": {
    "img0": "/exercise-images/hammer-curl/0.jpg",
    "img1": "/exercise-images/hammer-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/1.jpg"
  },
  "hamstring-stretch": {
    "img0": "/exercise-images/hamstring-stretch/0.jpg",
    "img1": "/exercise-images/hamstring-stretch/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Hamstring_and_Calf_Stretch/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Hamstring_and_Calf_Stretch/1.jpg"
  },
  "hanging-leg-raise": {
    "img0": "/exercise-images/hanging-leg-raise/0.jpg",
    "img1": "/exercise-images/hanging-leg-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/1.jpg"
  },
  "hip-flexor-stretch": {
    "img0": "/exercise-images/hip-flexor-stretch/0.jpg",
    "img1": "/exercise-images/hip-flexor-stretch/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Intermediate_Hip_Flexor_and_Quad_Stretch/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Intermediate_Hip_Flexor_and_Quad_Stretch/1.jpg"
  },
  "hip-thrust": {
    "img0": "/exercise-images/hip-thrust/0.jpg",
    "img1": "/exercise-images/hip-thrust/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/1.jpg"
  },
  "incline-barbell-press": {
    "img0": "/exercise-images/incline-barbell-press/0.jpg",
    "img1": "/exercise-images/incline-barbell-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg"
  },
  "incline-cable-fly": {
    "img0": "/exercise-images/incline-cable-fly/0.jpg",
    "img1": "/exercise-images/incline-cable-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Flye/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Cable_Flye/1.jpg"
  },
  "incline-dumbbell-curl": {
    "img0": "/exercise-images/incline-dumbbell-curl/0.jpg",
    "img1": "/exercise-images/incline-dumbbell-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/1.jpg"
  },
  "incline-dumbbell-press": {
    "img0": "/exercise-images/incline-dumbbell-press/0.jpg",
    "img1": "/exercise-images/incline-dumbbell-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/1.jpg"
  },
  "incline-push-up": {
    "img0": "/exercise-images/incline-push-up/0.jpg",
    "img1": "/exercise-images/incline-push-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/1.jpg"
  },
  "inverted-row": {
    "img0": "/exercise-images/inverted-row/0.jpg",
    "img1": "/exercise-images/inverted-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/1.jpg"
  },
  "jm-press": {
    "img0": "/exercise-images/jm-press/0.jpg",
    "img1": "/exercise-images/jm-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/JM_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/JM_Press/1.jpg"
  },
  "kettlebell-swing": {
    "img0": "/exercise-images/kettlebell-swing/0.jpg",
    "img1": "/exercise-images/kettlebell-swing/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/1.jpg"
  },
  "knee-push-up": {
    "img0": "/exercise-images/knee-push-up/0.jpg",
    "img1": "/exercise-images/knee-push-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/1.jpg"
  },
  "lat-pulldown": {
    "img0": "/exercise-images/lat-pulldown/0.jpg",
    "img1": "/exercise-images/lat-pulldown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "lateral-raise": {
    "img0": "/exercise-images/lateral-raise/0.jpg",
    "img1": "/exercise-images/lateral-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/1.jpg"
  },
  "leg-extension": {
    "img0": "/exercise-images/leg-extension/0.jpg",
    "img1": "/exercise-images/leg-extension/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/1.jpg"
  },
  "leg-press": {
    "img0": "/exercise-images/leg-press/0.jpg",
    "img1": "/exercise-images/leg-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/1.jpg"
  },
  "leg-press-calf-raise": {
    "img0": "/exercise-images/leg-press-calf-raise/0.jpg",
    "img1": "/exercise-images/leg-press-calf-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/1.jpg"
  },
  "leg-press-narrow": {
    "img0": "/exercise-images/leg-press-narrow/0.jpg",
    "img1": "/exercise-images/leg-press-narrow/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Narrow_Stance_Leg_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Narrow_Stance_Leg_Press/1.jpg"
  },
  "leg-raise": {
    "img0": "/exercise-images/leg-raise/0.jpg",
    "img1": "/exercise-images/leg-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Lying_Leg_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Lying_Leg_Raise/1.jpg"
  },
  "low-cable-fly": {
    "img0": "/exercise-images/low-cable-fly/0.jpg",
    "img1": "/exercise-images/low-cable-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Cable_Crossover/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Cable_Crossover/1.jpg"
  },
  "low-row-machine": {
    "img0": "/exercise-images/low-row-machine/0.jpg",
    "img1": "/exercise-images/low-row-machine/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Pulley_Row_To_Neck/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Pulley_Row_To_Neck/1.jpg"
  },
  "lying-leg-curl": {
    "img0": "/exercise-images/lying-leg-curl/0.jpg",
    "img1": "/exercise-images/lying-leg-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/1.jpg"
  },
  "machine-crunch": {
    "img0": "/exercise-images/machine-crunch/0.jpg",
    "img1": "/exercise-images/machine-crunch/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/1.jpg"
  },
  "machine-curl": {
    "img0": "/exercise-images/machine-curl/0.jpg",
    "img1": "/exercise-images/machine-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bicep_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bicep_Curl/1.jpg"
  },
  "machine-fly": {
    "img0": "/exercise-images/machine-fly/0.jpg",
    "img1": "/exercise-images/machine-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Cable_Flyes/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Cable_Flyes/1.jpg"
  },
  "machine-rdl": {
    "img0": "/exercise-images/machine-rdl/0.jpg",
    "img1": "/exercise-images/machine-rdl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "machine-row": {
    "img0": "/exercise-images/machine-row/0.jpg",
    "img1": "/exercise-images/machine-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shotgun_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shotgun_Row/1.jpg"
  },
  "neutral-grip-pulldown": {
    "img0": "/exercise-images/neutral-grip-pulldown/0.jpg",
    "img1": "/exercise-images/neutral-grip-pulldown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "overhead-press": {
    "img0": "/exercise-images/overhead-press/0.jpg",
    "img1": "/exercise-images/overhead-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/1.jpg"
  },
  "overhead-triceps-extension": {
    "img0": "/exercise-images/overhead-triceps-extension/0.jpg",
    "img1": "/exercise-images/overhead-triceps-extension/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Overhead_Triceps_Extension/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Overhead_Triceps_Extension/1.jpg"
  },
  "pallof-press": {
    "img0": "/exercise-images/pallof-press/0.jpg",
    "img1": "/exercise-images/pallof-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press/1.jpg"
  },
  "pec-deck-machine": {
    "img0": "/exercise-images/pec-deck/0.jpg",
    "img1": "/exercise-images/pec-deck/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/1.jpg"
  },
  "plank": {
    "img0": "/exercise-images/plank/0.jpg",
    "img1": "/exercise-images/plank/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/1.jpg"
  },
  "pull-up": {
    "img0": "/exercise-images/pull-up/0.jpg",
    "img1": "/exercise-images/pull-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/1.jpg"
  },
  "push-press": {
    "img0": "/exercise-images/push-press/0.jpg",
    "img1": "/exercise-images/push-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Press/1.jpg"
  },
  "push-up": {
    "img0": "/exercise-images/push-up/0.jpg",
    "img1": "/exercise-images/push-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clock_Push-Up/1.jpg"
  },
  "rack-pull": {
    "img0": "/exercise-images/rack-pull/0.jpg",
    "img1": "/exercise-images/rack-pull/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rack_Pull_with_Bands/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rack_Pull_with_Bands/1.jpg"
  },
  "rear-delt-fly": {
    "img0": "/exercise-images/rear-delt-fly/0.jpg",
    "img1": "/exercise-images/rear-delt-fly/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Flyes/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Flyes/1.jpg"
  },
  "reverse-curl": {
    "img0": "/exercise-images/reverse-curl/0.jpg",
    "img1": "/exercise-images/reverse-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Barbell_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Barbell_Curl/1.jpg"
  },
  "reverse-lunge": {
    "img0": "/exercise-images/reverse-lunge/0.jpg",
    "img1": "/exercise-images/reverse-lunge/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crossover_Reverse_Lunge/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crossover_Reverse_Lunge/1.jpg"
  },
  "reverse-pec-deck": {
    "img0": "/exercise-images/reverse-pec-deck/0.jpg",
    "img1": "/exercise-images/reverse-pec-deck/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/1.jpg"
  },
  "romanian-deadlift": {
    "img0": "/exercise-images/romanian-deadlift/0.jpg",
    "img1": "/exercise-images/romanian-deadlift/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/1.jpg"
  },
  "rope-pushdown": {
    "img0": "/exercise-images/rope-pushdown/0.jpg",
    "img1": "/exercise-images/rope-pushdown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/1.jpg"
  },
  "russian-twist": {
    "img0": "/exercise-images/russian-twist/0.jpg",
    "img1": "/exercise-images/russian-twist/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/1.jpg"
  },
  "seated-cable-row": {
    "img0": "/exercise-images/seated-cable-row/0.jpg",
    "img1": "/exercise-images/seated-cable-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/1.jpg"
  },
  "seated-dumbbell-press": {
    "img0": "/exercise-images/seated-dumbbell-press/0.jpg",
    "img1": "/exercise-images/seated-dumbbell-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/1.jpg"
  },
  "seated-lateral-raise": {
    "img0": "/exercise-images/seated-lateral-raise/0.jpg",
    "img1": "/exercise-images/seated-lateral-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/1.jpg"
  },
  "side-plank": {
    "img0": "/exercise-images/side-plank/0.jpg",
    "img1": "/exercise-images/side-plank/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Up_to_Side_Plank/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push_Up_to_Side_Plank/1.jpg"
  },
  "single-arm-cable-row": {
    "img0": "/exercise-images/single-arm-cable-row/0.jpg",
    "img1": "/exercise-images/single-arm-cable-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Single-Arm_High_Pulley_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Single-Arm_High_Pulley_Row/1.jpg"
  },
  "single-leg-calf-raise": {
    "img0": "/exercise-images/single-leg-calf-raise/0.jpg",
    "img1": "/exercise-images/single-leg-calf-raise/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/1.jpg"
  },
  "sissy-squat": {
    "img0": "/exercise-images/sissy-squat/0.jpg",
    "img1": "/exercise-images/sissy-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/1.jpg"
  },
  "skull-crusher": {
    "img0": "/exercise-images/skull-crusher/0.jpg",
    "img1": "/exercise-images/skull-crusher/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Close-Grip_Bench_To_Skull_Crusher/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Close-Grip_Bench_To_Skull_Crusher/1.jpg"
  },
  "smith-machine-bench": {
    "img0": "/exercise-images/smith-machine-bench/0.jpg",
    "img1": "/exercise-images/smith-machine-bench/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Bench_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Bench_Press/1.jpg"
  },
  "smith-machine-squat": {
    "img0": "/exercise-images/smith-machine-squat/0.jpg",
    "img1": "/exercise-images/smith-machine-squat/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Squat/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Squat/1.jpg"
  },
  "spider-curl": {
    "img0": "/exercise-images/spider-curl/0.jpg",
    "img1": "/exercise-images/spider-curl/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/1.jpg"
  },
  "step-up": {
    "img0": "/exercise-images/step-up/0.jpg",
    "img1": "/exercise-images/step-up/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Step-up_with_Knee_Raise/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Step-up_with_Knee_Raise/1.jpg"
  },
  "stiff-leg-deadlift": {
    "img0": "/exercise-images/stiff-leg-deadlift/0.jpg",
    "img1": "/exercise-images/stiff-leg-deadlift/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/1.jpg"
  },
  "straight-arm-pulldown": {
    "img0": "/exercise-images/straight-arm-pulldown/0.jpg",
    "img1": "/exercise-images/straight-arm-pulldown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/1.jpg"
  },
  "sumo-deadlift": {
    "img0": "/exercise-images/sumo-deadlift/0.jpg",
    "img1": "/exercise-images/sumo-deadlift/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/1.jpg"
  },
  "svend-press": {
    "img0": "/exercise-images/svend-press/0.jpg",
    "img1": "/exercise-images/svend-press/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Svend_Press/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Svend_Press/1.jpg"
  },
  "t-bar-row": {
    "img0": "/exercise-images/t-bar-row/0.jpg",
    "img1": "/exercise-images/t-bar-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_T-Bar_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_T-Bar_Row/1.jpg"
  },
  "triceps-dip-machine": {
    "img0": "/exercise-images/triceps-dip-machine/0.jpg",
    "img1": "/exercise-images/triceps-dip-machine/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/1.jpg"
  },
  "triceps-pushdown": {
    "img0": "/exercise-images/triceps-pushdown/0.jpg",
    "img1": "/exercise-images/triceps-pushdown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/1.jpg"
  },
  "upright-row": {
    "img0": "/exercise-images/upright-row/0.jpg",
    "img1": "/exercise-images/upright-row/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Upright_Barbell_Row/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Upright_Barbell_Row/1.jpg"
  },
  "walking-lunge": {
    "img0": "/exercise-images/walking-lunge/0.jpg",
    "img1": "/exercise-images/walking-lunge/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/1.jpg"
  },
  "wide-grip-pulldown": {
    "img0": "/exercise-images/wide-grip-pulldown/0.jpg",
    "img1": "/exercise-images/wide-grip-pulldown/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg"
  },
  "world-greatest-stretch": {
    "img0": "/exercise-images/world-greatest-stretch/0.jpg",
    "img1": "/exercise-images/world-greatest-stretch/1.jpg",
    "img0Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Worlds_Greatest_Stretch/0.jpg",
    "img1Remote": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Worlds_Greatest_Stretch/1.jpg"
  }
}

/** يُرجع وسائط التمرين إن وُجدت مطابقة، وإلا undefined (يعرض المكوّن بديلًا أنيقًا). */
export function getExerciseMedia(exerciseId: string): ExerciseMedia | undefined {
  return exerciseMedia[exerciseId]
}
