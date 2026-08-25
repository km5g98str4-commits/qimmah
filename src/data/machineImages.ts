// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/media/build-machine-placeholders.mjs
// خريطة: مُعرّف جهاز قانوني → رسم توضيحي داخلي (IN-HOUSE) للجهاز في public/exercise-machine-images/.
//
// هذه بطاقات أجهزة لا تملك لقطة جهاز مرخّصة قابلة لإعادة التوزيع من أي مصدر (WorkoutX/free-exercise-db
// تعيدان وزنًا حرًّا، والملفات المحلّية السابقة كانت UNKNOWN/RESTRICTED بلا سلسلة حقوق — انظر
// docs/content/MEDIA-RIGHTS.md). فنعرض رسمًا توضيحيًا متجهيًا أصليًا (SVG) نملك حقوقه بالكامل،
// بدل مادة مقيّدة أو صورة «تشبه» الجهاز فتضلّل المستخدم. غياب الملف → البديل الأنيق (لا صورة مكسورة).
// التغطية الحالية: 26 جهازًا.

/** خريطة ثابتة: مُعرّف جهاز قانوني → مسار الرسم التوضيحي الداخلي. */
export const machineImages: Record<string, string> = {
  'chest-press-machine': '/exercise-machine-images/chest-press-machine.svg',
  'chest-supported-row-machine': '/exercise-machine-images/chest-supported-row-machine.svg',
  'decline-chest-press-machine': '/exercise-machine-images/decline-chest-press-machine.svg',
  'glute-kickback-machine': '/exercise-machine-images/glute-kickback-machine.svg',
  'glute-machine': '/exercise-machine-images/glute-machine.svg',
  'hack-squat-machine': '/exercise-machine-images/hack-squat-machine.svg',
  'hip-abduction-machine': '/exercise-machine-images/hip-abduction-machine.svg',
  'hip-adductor-machine': '/exercise-machine-images/hip-adductor-machine.svg',
  'incline-chest-press-machine': '/exercise-machine-images/incline-chest-press-machine.svg',
  'iso-lateral-chest-press': '/exercise-machine-images/iso-lateral-chest-press.svg',
  'iso-lateral-high-row': '/exercise-machine-images/iso-lateral-high-row.svg',
  'iso-lateral-incline-press': '/exercise-machine-images/iso-lateral-incline-press.svg',
  'iso-lateral-pulldown': '/exercise-machine-images/iso-lateral-pulldown.svg',
  'lateral-raise-machine': '/exercise-machine-images/lateral-raise-machine.svg',
  'pec-deck-machine': '/exercise-machine-images/pec-deck-machine.svg',
  'preacher-curl-machine': '/exercise-machine-images/preacher-curl-machine.svg',
  'rear-delt-row-machine': '/exercise-machine-images/rear-delt-row-machine.svg',
  'seated-calf-raise-machine': '/exercise-machine-images/seated-calf-raise-machine.svg',
  'seated-leg-curl': '/exercise-machine-images/seated-leg-curl.svg',
  'shoulder-press-machine': '/exercise-machine-images/shoulder-press-machine.svg',
  'single-arm-lat-pulldown': '/exercise-machine-images/single-arm-lat-pulldown.svg',
  'standing-calf-raise-machine': '/exercise-machine-images/standing-calf-raise-machine.svg',
  'standing-hip-extension-machine': '/exercise-machine-images/standing-hip-extension-machine.svg',
  'standing-leg-curl': '/exercise-machine-images/standing-leg-curl.svg',
  'triceps-extension-machine': '/exercise-machine-images/triceps-extension-machine.svg',
  'wide-grip-iso-lateral-pulldown': '/exercise-machine-images/wide-grip-iso-lateral-pulldown.svg',
}

/** يُرجع مسار صورة الجهاز إن توفّرت، وإلا undefined (فيرجع المكوّن للبديل الأنيق). */
export function getMachineImage(exerciseId: string): string | undefined {
  return machineImages[exerciseId]
}
