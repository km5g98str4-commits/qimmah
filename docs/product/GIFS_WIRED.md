# وصل 60 GIF متحرّك لمكتبة التمارين (WorkoutX)

## الملخص
تم دمج فرع `feature/workoutx-gifs` (60 ملف GIF متحرّك، 360×360، 12 إطار، إطار موحّد) في
`public/exercise-gifs/<exercise-id>.gif` وتوصيلها بواجهة التطبيق عبر خريطة ثابتة محلّية —
بدون أي استدعاء شبكة وقت التشغيل، وبدون أسرار.

## العدد
- **60/60** ملف GIF مُطابَق ومُوصَّل في `src/data/exerciseGifs.ts`.
- جميع المعرّفات (ids) تطابق `src/data/exercises.ts` تمامًا (تحقّق آلي، صفر معرّفات غير متطابقة).

## سلسلة الوسائط (Media Chain)
`src/components/ExerciseMedia.tsx` يطبّق الترتيب التالي لكل تمرين:

1. **GIF متحرّك محلّي** — `getExerciseGif(exerciseId)` من `src/data/exerciseGifs.ts`.
2. **صورة ثابتة** — من `src/data/exerciseMedia.ts` (قاعدة free-exercise-db محليًا، ثم رابط بعيد عند الحاجة).
3. **بديل أنيق (Placeholder)** — تدرّج داكن + أيقونة دمبل + رقائق العضلات، عند غياب أي وسيط.

عند فشل تحميل أي مصدر (`onError`) يتم الانتقال تلقائيًا للمصدر التالي في السلسلة — لا صورة مكسورة أبدًا.

## أماكن الظهور
- **مكتبة التمارين** (`ExerciseLibraryView.tsx` → `ExerciseThumb`): صورة مصغّرة 48×48، GIF أولًا ثم صورة ثابتة.
- **تفاصيل التمرين** (`ExerciseDetail.tsx`): يستخدم `ExerciseMedia` مباشرة، ارتفاع `h-40`.
- **تنفيذ التمرين (Runtime)** (`WorkoutMode.tsx`): أُضيف `ExerciseMedia` أعلى بطاقة رأس التمرين، ارتفاع `h-48`،
  بإطار مقصوص (`overflow-hidden`) متوافق مع زوايا البطاقة الموجودة.

جميع الأسطح تستخدم `object-cover` مع ارتفاع ثابت — الملفات المربّعة (360×360) تُعرض مركزيّة ومقصوصة بانتظام
بلا تشويه، بغضّ النظر عن نسبة إطار الحاوية.

## السلوك عند غياب GIF
تمارين خارج الـ60 (مثال: `face-pull`) لا تملك مدخلًا في `exerciseGifs.ts` — تتحول السلسلة تلقائيًا للصورة
الثابتة إن وُجدت، وإلا للبديل الأنيق. تم التحقّق يدويًا أن `face-pull` (ضمن `exercises.ts` لكن خارج الـ60)
يعمل بلا كسر.

## التحقّق (Headless)
على حزمة البناء (`npm run build` → `npm run preview`):
- `GET /exercise-gifs/push-up.gif` → `200 OK`, `Content-Type: image/gif`, حجم حقيقي (~380KB).
- `GET /exercise-gifs/deadlift.gif` → `200 OK`, `Content-Type: image/gif`.
- `GET /exercise-gifs/face-pull.gif` (غير موجود) → `200 OK` لكن `Content-Type: text/html` (SPA fallback إلى
  `index.html`) — يُلتقط بواسطة `onError` في `<img>` فينتقل للمصدر التالي في السلسلة.

## البوابات (Gates)
- `npm run build` ✅ (يشمل `tsc -b`)
- `npm run lint` ✅ (صفر تحذيرات)
- `npm run typecheck` ✅

## المخاطر
- 110 تمرين من أصل 170 لا تزال بلا GIF (تعتمد على الصورة الثابتة أو البديل) — تحسين مستقبلي عند توفّر مزيد
  من ملفات WorkoutX.
- حجم الحزمة الإجمالي لملفات GIF (~60 ملف) يزيد وزن `public/` — لا يؤثر على حجم الـ JS bundle لأنها أصول
  ثابتة تُحمَّل عند الطلب فقط.
