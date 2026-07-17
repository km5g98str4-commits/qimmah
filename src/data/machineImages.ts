// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/p12-sync-machine-images.mjs
// خريطة: مُعرّف جهاز قانوني → صورة/لقطة **الجهاز نفسه** في public/exercise-machine-images/.
//
// هذه بطاقات أجهزة لا تملك لقطة جهاز من قنوات المقاومة (WorkoutX/free-exercise-db تعيد وزنًا حرًّا)،
// فنعرض لها صورة الجهاز الحقيقية المجلوبة من مصادر مفتوحة الترخيص عبر scripts/p12-fetch-machine-images.mjs.
// حتى تُجلب الصور تبقى الخريطة فارغة وتظهر البطاقات على البديل الأنيق (لا لقطة وزن حرّ أبدًا).
// التغطية الحالية: 23 جهازًا (أُزيلت decline-chest-press-machine — علامة FITWILL).

/** خريطة ثابتة: مُعرّف جهاز قانوني → مسار صورة الجهاز المحلّية. */
export const machineImages: Record<string, string> = {
  'chest-supported-row-machine': '/exercise-machine-images/chest-supported-row-machine.jpg',
  // decline-chest-press-machine: أُزيلت صورته (علامة FITWILL — RESTRICTED في MEDIA-RIGHTS.md).
  // التمرين نفسه يبقى؛ البطاقة تتدهور للبديل الأنيق. لا تُعِد إضافتها دون إذن مكتوب.
  'glute-kickback-machine': '/exercise-machine-images/glute-kickback-machine.jpg',
  'glute-machine': '/exercise-machine-images/glute-machine.jpg',
  'hack-squat-machine': '/exercise-machine-images/hack-squat-machine.jpg',
  'hip-abduction-machine': '/exercise-machine-images/hip-abduction-machine.jpg',
  'hip-adductor-machine': '/exercise-machine-images/hip-adductor-machine.jpg',
  'iso-lateral-chest-press': '/exercise-machine-images/iso-lateral-chest-press.jpg',
  'iso-lateral-high-row': '/exercise-machine-images/iso-lateral-high-row.jpg',
  'iso-lateral-incline-press': '/exercise-machine-images/iso-lateral-incline-press.jpg',
  'iso-lateral-pulldown': '/exercise-machine-images/iso-lateral-pulldown.jpg',
  'lateral-raise-machine': '/exercise-machine-images/lateral-raise-machine.jpg',
  'pec-deck-machine': '/exercise-machine-images/pec-deck-machine.jpg',
  'preacher-curl-machine': '/exercise-machine-images/preacher-curl-machine.jpg',
  'rear-delt-row-machine': '/exercise-machine-images/rear-delt-row-machine.jpg',
  'seated-calf-raise-machine': '/exercise-machine-images/seated-calf-raise-machine.jpg',
  'seated-leg-curl': '/exercise-machine-images/seated-leg-curl.jpg',
  'shoulder-press-machine': '/exercise-machine-images/shoulder-press-machine.jpg',
  'single-arm-lat-pulldown': '/exercise-machine-images/single-arm-lat-pulldown.jpg',
  'standing-calf-raise-machine': '/exercise-machine-images/standing-calf-raise-machine.jpg',
  'standing-hip-extension-machine': '/exercise-machine-images/standing-hip-extension-machine.jpg',
  'standing-leg-curl': '/exercise-machine-images/standing-leg-curl.jpg',
  'triceps-extension-machine': '/exercise-machine-images/triceps-extension-machine.jpg',
  'wide-grip-iso-lateral-pulldown': '/exercise-machine-images/wide-grip-iso-lateral-pulldown.jpg',
}

/** يُرجع مسار صورة الجهاز إن توفّرت، وإلا undefined (فيرجع المكوّن للبديل الأنيق). */
export function getMachineImage(exerciseId: string): string | undefined {
  return machineImages[exerciseId]
}
