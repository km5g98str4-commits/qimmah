// ⚠️ طبقة GIF مُعطّلة عمدًا (P0 — إزالة العلامة المائية).
// كانت هذه الخريطة تشير إلى ملفات GIF من WorkoutX (api.workoutxapp.com) تحمل علامة مائية
// قطرية «…Y API». المصدر مملوك ومُعلَّم، فأُزيلت الملفات من public/exercise-gifs/ وفُرِّغت الخريطة.
// النتيجة: يرجع ExerciseMedia تلقائيًا إلى الإطارات الثابتة النظيفة من free-exercise-db
// (ملكية عامة، عبر exerciseMedia.ts) حيثما توفّرت، وإلا البديل الأنيق — لا علامة مائية إطلاقًا.

/** خريطة الـ GIF — فارغة عمدًا بعد إزالة أصول WorkoutX المُعلَّمة (لا مصدر GIF نظيف حاليًا). */
export const exerciseGifs: Record<string, string> = {}

/** يُرجع مسار الـ GIF المحلّي إن توفّر، وإلا undefined (فيرجع المكوّن للصورة الثابتة ثم البديل الأنيق). */
export function getExerciseGif(exerciseId: string): string | undefined {
  return exerciseGifs[exerciseId]
}
