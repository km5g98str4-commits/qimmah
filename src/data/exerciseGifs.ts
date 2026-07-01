// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/fetch-workoutx-media.mjs  •  بيانات GIF: WorkoutX (تُجلب مرّة واحدة وقت البناء).
// كل ملف gif يُنزَّل (vendored) في public/exercise-gifs/ — العرض وقت التشغيل لا يحتاج مفتاحًا ولا شبكة.
// لإعادة التوليد (يستهلك حصّة WorkoutX):  WORKOUTX_API_KEY=xxxx node scripts/fetch-workoutx-media.mjs
//
// التغطية الحالية: 0/174 — لم تُجلب أي GIF بعد (مضيف WorkoutX خارج قائمة السماح للشبكة في هذه البيئة).
// عند فتح الوصول لـ api.workoutxapp.com يُعاد تشغيل السكربت مرّة واحدة فتُملأ هذه الخريطة تلقائيًا.

/** خريطة ثابتة: مُعرّف تمرين قِمّة → مسار GIF متحرّك محلّي (public/exercise-gifs/<id>.gif). */
export const exerciseGifs: Record<string, string> = {}

/** يُرجع مسار الـ GIF المحلّي إن توفّر، وإلا undefined (فيرجع المكوّن للصورة الثابتة ثم البديل الأنيق). */
export function getExerciseGif(exerciseId: string): string | undefined {
  return exerciseGifs[exerciseId]
}
