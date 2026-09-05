// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. المولّد: scripts/media/build-exercise-cards.mjs
// المصدر: مادة المؤسس «قائمة_التمارين_المصورة.docx» (٢٠٢٦-٠٩-٠٥) — 63 بطاقة،
// أُدخلت الجاهزة منها هنا. سجلّ الاستلام كاملًا (الأصول غير المقصوصة + SHA-256 + سبب كل
// استبعاد) في assets/exercise-cards-intake/.
//
// الحقوق: **IN-HOUSE** — أكّد المؤسس أن الرسوم مولَّدة/مُكلَّفة له ولا يملكها طرف ثالث
// (٢٠٢٦-٠٩-٠٦). لا مصدر طرف ثالث ولا علامة مائية. يحرسها npm run test:media-rights.
//
// لماذا مقصوصة: كل بطاقة وصلت بشريط عنوان **محروق في الصورة** يحمل الاسم بالعربية
// والإنجليزية. قُصَّ لأنه يكرّر اسمًا يرسمه التطبيق بنفسه، **ولا يتبدّل بلغة المستخدم**
// (خرق §6)، وبعضه عربية مشوّهة («الباينة» بدل البايسبس · «جرفول»). الأصل كامل محفوظ
// في assets/exercise-cards-intake/original/ — القصّ قابل للنقض.
//
// هذه البطاقات **رسوم لا فوتوغرافيا**، ولا تُوصف للمستخدم بغير ذلك. تعلو على المخطّط
// والرسم الداخليين، ولا تعلو أبدًا على لقطة مرخّصة قائمة (stills).

/** خريطة ثابتة: مُعرّف تمرين → بطاقة الحركة الداخلية. */
export const exerciseCards: Record<string, string> = {
  'ankle-mobility': '/exercise-cards/ankle-mobility.jpg',
  'assault-bike': '/exercise-cards/assault-bike.jpg',
  'banded-lateral-walk': '/exercise-cards/banded-lateral-walk.jpg',
  'battle-ropes': '/exercise-cards/battle-ropes.jpg',
  'belt-squat': '/exercise-cards/belt-squat.jpg',
  'bicycle-crunch': '/exercise-cards/bicycle-crunch.jpg',
  'cable-hip-adduction': '/exercise-cards/cable-hip-adduction.jpg',
  'cable-woodchop': '/exercise-cards/cable-woodchop.jpg',
  'chest-press-machine': '/exercise-cards/chest-press-machine.jpg',
  'chest-supported-row': '/exercise-cards/chest-supported-row.jpg',
  'chest-supported-row-machine': '/exercise-cards/chest-supported-row-machine.jpg',
  'decline-chest-press-machine': '/exercise-cards/decline-chest-press-machine.jpg',
  'dumbbell-sumo-squat': '/exercise-cards/dumbbell-sumo-squat.jpg',
  'elliptical': '/exercise-cards/elliptical.jpg',
  'frog-pump': '/exercise-cards/frog-pump.jpg',
  'glute-kickback-machine': '/exercise-cards/glute-kickback-machine.jpg',
  'glute-machine': '/exercise-cards/glute-machine.jpg',
  'hack-squat-machine': '/exercise-cards/hack-squat-machine.jpg',
  'high-knees': '/exercise-cards/high-knees.jpg',
  'hip-abduction-machine': '/exercise-cards/hip-abduction-machine.jpg',
  'hip-adductor-machine': '/exercise-cards/hip-adductor-machine.jpg',
  'hollow-hold': '/exercise-cards/hollow-hold.jpg',
  'incline-chest-press-machine': '/exercise-cards/incline-chest-press-machine.jpg',
  'iso-lateral-chest-press': '/exercise-cards/iso-lateral-chest-press.jpg',
  'iso-lateral-high-row': '/exercise-cards/iso-lateral-high-row.jpg',
  'iso-lateral-incline-press': '/exercise-cards/iso-lateral-incline-press.jpg',
  'iso-lateral-pulldown': '/exercise-cards/iso-lateral-pulldown.jpg',
  'jump-rope': '/exercise-cards/jump-rope.jpg',
  'landmine-press': '/exercise-cards/landmine-press.jpg',
  'lateral-raise-machine': '/exercise-cards/lateral-raise-machine.jpg',
  'leg-swings': '/exercise-cards/leg-swings.jpg',
  'meadows-row': '/exercise-cards/meadows-row.jpg',
  'mountain-climber': '/exercise-cards/mountain-climber.jpg',
  'nordic-curl': '/exercise-cards/nordic-curl.jpg',
  'outdoor-walk': '/exercise-cards/outdoor-walk.jpg',
  'pendlay-row': '/exercise-cards/pendlay-row.jpg',
  'pike-push-up': '/exercise-cards/pike-push-up.jpg',
  'preacher-curl-machine': '/exercise-cards/preacher-curl-machine.jpg',
  'rear-delt-row-machine': '/exercise-cards/rear-delt-row-machine.jpg',
  'rowing-machine': '/exercise-cards/rowing-machine.jpg',
  'seated-calf-raise-machine': '/exercise-cards/seated-calf-raise-machine.jpg',
  'seated-leg-curl': '/exercise-cards/seated-leg-curl.jpg',
  'shoulder-dislocates': '/exercise-cards/shoulder-dislocates.jpg',
  'shoulder-press-machine': '/exercise-cards/shoulder-press-machine.jpg',
  'single-arm-lat-pulldown': '/exercise-cards/single-arm-lat-pulldown.jpg',
  'single-arm-pushdown': '/exercise-cards/single-arm-pushdown.jpg',
  'single-leg-hip-thrust': '/exercise-cards/single-leg-hip-thrust.jpg',
  'single-leg-rdl': '/exercise-cards/single-leg-rdl.jpg',
  'standing-calf-raise-machine': '/exercise-cards/standing-calf-raise-machine.jpg',
  'standing-leg-curl': '/exercise-cards/standing-leg-curl.jpg',
  'stationary-bike': '/exercise-cards/stationary-bike.jpg',
  'thoracic-rotation': '/exercise-cards/thoracic-rotation.jpg',
  'toes-to-bar': '/exercise-cards/toes-to-bar.jpg',
  'treadmill-run': '/exercise-cards/treadmill-run.jpg',
  'triceps-extension-machine': '/exercise-cards/triceps-extension-machine.jpg',
  'wall-sit': '/exercise-cards/wall-sit.jpg',
  'wide-grip-iso-lateral-pulldown': '/exercise-cards/wide-grip-iso-lateral-pulldown.jpg',
}

/** عدد البطاقات المشحونة. */
export const EXERCISE_CARD_COUNT = 57

/** يُرجع مسار البطاقة إن توفّرت، وإلا undefined. */
export function getExerciseCard(exerciseId: string): string | undefined {
  return exerciseCards[exerciseId]
}
