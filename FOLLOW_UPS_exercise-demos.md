# متابعات — عروض التمارين المتحركة (P2.5)

## ما تم تنفيذه
- **عرض متحرك حقيقي** لكل تمرين في بطاقة التفاصيل (`ExerciseDetail`) عبر مكوّن `ExerciseDemo`:
  يبدّل بين إطار البداية وإطار النهاية لمحاكاة الحركة، مع زر تشغيل/إيقاف + رابط «شاهد على يوتيوب».
- **المصدر:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) — ترخيص **The Unlicense**
  (ملكية عامة، بلا حقوق نشر ولا علامات تجارية). تُخدَم عبر **jsDelivr CDN**
  (`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/...`) مع CORS وتخزين أسبوع.
- **التغطية:** ١٠٣ تمرينًا من أصل ١٧٠ مربوطة بعروض حقيقية موثّقة (تم التحقق من تحميل كل رابط — HTTP 200).
- الباقي (٦٧ تمرينًا) يعرض **إطارًا بديلًا أنيقًا** («العرض قريبًا» + أيقونة + رابط يوتيوب يعمل) — **لا تُعرض أبدًا صورة مكسورة**
  (معالجة `onError` ترجع للإطار البديل تلقائيًا).

## كيف تُوسّع التغطية (للمؤسّس / وكيل لاحق)
لكل تمرين على الإطار البديل، أضف مدخلًا في `src/data/exerciseDemos.ts` ضمن `DEMO_FRAMES`:
```ts
"معرّف-التمرين": ["Folder_Name/0.jpg", "Folder_Name/1.jpg"],
```
حيث `Folder_Name` هو `id` التمرين في free-exercise-db (راجع `dist/exercises.json` في المستودع).
**شرط القبول:** تحقّق أن الرابطين يحمّلان فعليًا (HTTP 200) قبل الإضافة — وأن التمرين يطابق الحركة الصحيحة
(تجنّب المطابقة التقريبية الخاطئة التي تعرض تمرينًا مختلفًا).

أو زوّد **حزمة أصول GIF خاصة** (يرفعها المؤسّس على CDN/Blob) واربط روابطها بنفس الطريقة —
المكوّن يقبل أي عدد من الإطارات.

## التمارين على الإطار البديل حاليًا (٦٧)
أجهزة/كابل متخصّصة، حركات وزن جسم نادرة، كارديو/إحماء/مرونة لا تملك صور متتابعة مناسبة في المصدر:

`incline-machine-press, pec-deck, machine-row, rear-delt-fly, bulgarian-split-squat, smith-machine-squat,
dumbbell-rdl, cable-kickback, bodyweight-calf-raise, side-plank, kettlebell-swing, smith-machine-bench,
svend-press, machine-fly, knee-push-up, chest-supported-row, single-arm-cable-row, meadows-row,
neutral-grip-pulldown, machine-lateral-raise, seated-lateral-raise, cable-rear-delt-fly, landmine-press,
pike-push-up, machine-curl, triceps-dip-machine, cable-overhead-extension, diamond-push-up, jm-press,
pendulum-squat, sissy-squat, belt-squat, wall-sit, nordic-curl, single-leg-rdl, machine-hip-thrust,
single-leg-hip-thrust, abduction-machine, banded-lateral-walk, frog-pump, single-leg-calf-raise,
bicycle-crunch, hollow-hold, cable-woodchop, machine-crunch, toes-to-bar, flutter-kicks,
incline-treadmill-walk, stairmaster, burpees, high-knees, battle-ropes, assault-bike, outdoor-walk,
arm-circles, hip-flexor-stretch, world-greatest-stretch, leg-swings, shoulder-dislocates,
thoracic-rotation, ankle-mobility, hamstring-stretch, child-pose, decline-machine-press,
low-row-machine, machine-rdl, adduction-machine`

## مخاطر / ملاحظات
- **اعتماد على CDN خارجي:** الصور تُحمَّل من jsDelivr وقت التشغيل. عند انقطاع الشبكة يظهر الإطار البديل (لا كسر).
  لاستقلال تام، يمكن لاحقًا استضافة الصور ذاتيًا (free-exercise-db ملكية عامة فيُسمح بذلك).
- المطابقات تمّت يدويًا للتمارين الشائعة لضمان عرض الحركة الصحيحة؛ المطابقة التقريبية رُفضت لتفادي عرض تمرين خاطئ.
