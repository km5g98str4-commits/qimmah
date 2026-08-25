// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/media/build-exercise-illustrations.mjs
// خريطة: مُعرّف تمرين قانوني → رسم حركة داخلي (IN-HOUSE) في public/exercise-illustrations/.
//
// هذه تمارين لا تملك لقطة مرخّصة قابلة لإعادة التوزيع (أغلبها كارديو/إحماء/حركات كيبل
// خارج تغطية free-exercise-db)، وتمرينان أُزيلت صورتاهما لأنهما كانتا لنمط حركة مختلف
// (single-leg-rdl · nordic-curl — انظر docs/content/MEDIA-RIGHTS.md). فنعرض رسم حركة
// متجهيًا أصليًا نملك حقوقه بالكامل، يقول عن نفسه إنه رسم لا صورة — لا مادة «تشبه»
// التمرين فتضلّل. غياب الملف → البديل الأنيق (لا صورة مكسورة).
// التغطية الحالية: 37 تمرينًا.

/** خريطة ثابتة: مُعرّف تمرين قانوني → مسار رسم الحركة الداخلي. */
export const exerciseIllustrations: Record<string, string> = {
  'ankle-mobility': '/exercise-illustrations/ankle-mobility.svg',
  'assault-bike': '/exercise-illustrations/assault-bike.svg',
  'banded-lateral-walk': '/exercise-illustrations/banded-lateral-walk.svg',
  'battle-ropes': '/exercise-illustrations/battle-ropes.svg',
  'belt-squat': '/exercise-illustrations/belt-squat.svg',
  'bicycle-crunch': '/exercise-illustrations/bicycle-crunch.svg',
  'burpees': '/exercise-illustrations/burpees.svg',
  'cable-hip-adduction': '/exercise-illustrations/cable-hip-adduction.svg',
  'cable-shoulder-press': '/exercise-illustrations/cable-shoulder-press.svg',
  'cable-woodchop': '/exercise-illustrations/cable-woodchop.svg',
  'chest-supported-row': '/exercise-illustrations/chest-supported-row.svg',
  'dumbbell-sumo-squat': '/exercise-illustrations/dumbbell-sumo-squat.svg',
  'elliptical': '/exercise-illustrations/elliptical.svg',
  'frog-pump': '/exercise-illustrations/frog-pump.svg',
  'high-knees': '/exercise-illustrations/high-knees.svg',
  'hollow-hold': '/exercise-illustrations/hollow-hold.svg',
  'incline-treadmill-walk': '/exercise-illustrations/incline-treadmill-walk.svg',
  'jump-rope': '/exercise-illustrations/jump-rope.svg',
  'landmine-press': '/exercise-illustrations/landmine-press.svg',
  'leg-swings': '/exercise-illustrations/leg-swings.svg',
  'meadows-row': '/exercise-illustrations/meadows-row.svg',
  'mountain-climber': '/exercise-illustrations/mountain-climber.svg',
  'nordic-curl': '/exercise-illustrations/nordic-curl.svg',
  'outdoor-walk': '/exercise-illustrations/outdoor-walk.svg',
  'pendlay-row': '/exercise-illustrations/pendlay-row.svg',
  'pike-push-up': '/exercise-illustrations/pike-push-up.svg',
  'rowing-machine': '/exercise-illustrations/rowing-machine.svg',
  'shoulder-dislocates': '/exercise-illustrations/shoulder-dislocates.svg',
  'single-arm-pushdown': '/exercise-illustrations/single-arm-pushdown.svg',
  'single-leg-hip-thrust': '/exercise-illustrations/single-leg-hip-thrust.svg',
  'single-leg-rdl': '/exercise-illustrations/single-leg-rdl.svg',
  'stairmaster': '/exercise-illustrations/stairmaster.svg',
  'stationary-bike': '/exercise-illustrations/stationary-bike.svg',
  'thoracic-rotation': '/exercise-illustrations/thoracic-rotation.svg',
  'toes-to-bar': '/exercise-illustrations/toes-to-bar.svg',
  'treadmill-run': '/exercise-illustrations/treadmill-run.svg',
  'wall-sit': '/exercise-illustrations/wall-sit.svg',
}

/** رسم الحركة الداخلي لتمرين، أو undefined إن لم يكن له رسم. */
export function getExerciseIllustration(exerciseId: string): string | undefined {
  return exerciseIllustrations[exerciseId]
}
