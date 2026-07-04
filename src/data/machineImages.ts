// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/p12-sync-machine-images.mjs
// خريطة: مُعرّف جهاز قانوني → صورة/لقطة **الجهاز نفسه** في public/exercise-machine-images/.
//
// هذه بطاقات أجهزة لا تملك لقطة جهاز من قنوات المقاومة (WorkoutX/free-exercise-db تعيد وزنًا حرًّا)،
// فنعرض لها صورة الجهاز الحقيقية المجلوبة من مصادر مفتوحة الترخيص عبر scripts/p12-fetch-machine-images.mjs.
// حتى تُجلب الصور تبقى الخريطة فارغة وتظهر البطاقات على البديل الأنيق (لا لقطة وزن حرّ أبدًا).
// التغطية الحالية: 0 جهازًا.

/** خريطة ثابتة: مُعرّف جهاز قانوني → مسار صورة الجهاز المحلّية. */
export const machineImages: Record<string, string> = {
}

/** يُرجع مسار صورة الجهاز إن توفّرت، وإلا undefined (فيرجع المكوّن للبديل الأنيق). */
export function getMachineImage(exerciseId: string): string | undefined {
  return machineImages[exerciseId]
}
