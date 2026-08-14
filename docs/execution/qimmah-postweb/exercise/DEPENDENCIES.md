# اعتماديات على رأس Web Sovereign النهائي — حارة التمارين

**الفرع:** `codex/qimmah-exercise-production-001` · **الأساس:** `1bcf7a9` = `[PKG-7][green]`

> **لماذا هذا الملف موجود:** حارة Web Sovereign كانت **تعمل فعليًا** أثناء هذه الموجة، و`PKG-6`
> (`f49ae01`) قد شدّد للتوّ ملكية المسار والتركيز والتمرير في نافذة تفاصيل التمرين. القاعدة الحاكمة
> (الميثاق §1.4/٤): **إن اضطرت حارتان لنفس الملف فالجواب: لا.** فما يحتاج ملفًا من ملفات `PKG-6`
> **لم يُنفَّذ هنا**، بل يُسجَّل أدناه بديفّ جاهز يُطبَّق حين يهبط الرأس النهائي.
>
> **كل ما دون ذلك نُفِّذ فعلًا** — البيانات والمحتوى والمانيفست وطبقة القراءة والإثبات.

---

## D-1 · وصل نافذة تفاصيل التمرين بالمانيفست الموحّد

**ما هو:** `ExerciseDetail.tsx` ما زالت تقرأ الوسائط من الطبقات المتفرّقة، وتعرض زر يوتيوب من
`ex.videoUrl` — وهو **رابط بحث** لا فيديو (١٨١/١٨١ منها `videoSource: 'youtube_search'`).

**لماذا لم يُنفَّذ هنا:** `src/components/ExerciseDetail.tsx` من ملفات `PKG-6` المباشرة.

**الفعل حين يهبط الرأس** — في `AboutTab` بـ`src/components/ExerciseDetail.tsx`:

```diff
-import { getCue } from '@/lib/coaching'
+import { getCue } from '@/lib/coaching'
+import { approvedVideoFor } from '@/lib/exerciseProductionMedia'
+import { exerciseVideoStrings } from '@/i18n/dict/exerciseVideo'

 function AboutTab({ ex, d, lang, onAddToPlan }: …) {
   const g = guidanceFor(ex, lang)
-  const cue = getCue(ex.id)
-  const howTo = lang !== 'en' ? cue.steps : g.howTo
+  const cue = getCue(ex.id, lang)          // ← الإنجليزية صارت مؤلَّفة، لا فارغة
+  const howTo = cue.steps
   const tips = g.tips
-  const mistakes = lang !== 'en' ? cue.mistakes : g.mistakes
-  const safety = lang !== 'en' ? cue.safety : g.safety
+  const mistakes = cue.mistakes
+  const safety = cue.safety
+  const video = approvedVideoFor(ex.id)
+  const v = exerciseVideoStrings[lang]
```

ثم يُستبدل زر يوتيوب (السطر ~٢٢٦) بمرجع **معتمد فقط**:

```diff
-{ex.videoUrl && (
-  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" …>
-    <Icon name="Play" className="h-4 w-4" />
-    {d.watchOnYouTube}
-  </a>
-)}
+{video && (
+  <a href={video.canonicalUrl} target="_blank" rel="noopener noreferrer"
+     className="btn-ghost min-h-[44px] px-4 py-2.5 text-sm"
+     aria-label={v.playAria(exerciseName(ex, lang))}>
+    <Icon name="Play" className="h-4 w-4" />
+    {v.watchHowTo}
+  </a>
+)}
```

**الأثر:** الإنجليزية تكفّ عن عرض «الإرشاد غير متاح» في أربع كتل × ١٨١ تمرينًا؛ وزر الفيديو يظهر
لـ**١٥٩** تمرينًا بمرجع مُتحقَّق منه بدل ١٨١ رابط بحث.

> **بديل التضمين داخل التطبيق** (بدل الفتح الخارجي): استخدم `videoEmbedUrl(ex.id)` داخل
> `<iframe>` **لا يُركَّب إلا بعد ضغطة المستخدم** — النطاق `youtube-nocookie` وبلا تشغيل تلقائي،
> ويحرس ذلك تأكيدان مضادّان في `test:exercise-production`. القرار بين «فتح خارجي» و«تضمين
> بضغطة» **قرار منتج مفتوح** (§3) — لم يُحسم هنا.

**ما يجب ألّا ينكسر:** ثوابت `PKG-6` كلها — `role="dialog"` · `aria-modal` · Escape · عودة التركيز ·
`<Block title={d.howToPerform}` · نصّ زر الرجوع العربي حرفيًا · أهداف اللمس ٤٤بكسل.
يحرسها `test:exercise-library` و`test:e2e:exercises`.

---

## D-2 · تسريب بطاقة الجهاز في شبكة المكتبة — عيب صدق مؤكَّد

**ما هو:** `ExerciseLibraryView.tsx:352` يقرأ الصورة المصغّرة مباشرة:

```ts
const media = getExerciseMedia(exerciseId)
const src = getExerciseGif(exerciseId) || media?.gifUrl || media?.img0
```

هذا المسار **يتجاوز `isPlaceholderOnlyMedia`**. النتيجة المقاسة: `chest-press-machine` تُرسَم في
الشبكة بـ`/exercise-images/chest-press-machine/0.jpg` — **وأصلها `Cable_Chest_Press`**، أي صورة
محطة كيبل لا جهاز ضغط صدر. نافذة التفاصيل ترفضها بحقّ؛ **الشبكة تعرضها.**

**الدليل:** `docs/execution/qimmah-postweb/exercise/metadata-audit.json` → `summary.gridPlaceholderLeak`
(عنصر واحد، مُعاد حسابه في كل تشغيل).

**لماذا لم يُصلَح هنا:** `src/views/ExerciseLibraryView.tsx` من ملفات `PKG-6` المباشرة.

**الفعل حين يهبط الرأس** — بدّل المسار المتفرّق بطبقة القراءة الواحدة:

```diff
-const media = getExerciseMedia(exerciseId)
-const src = getExerciseGif(exerciseId) || media?.gifUrl || media?.img0
+const src = approvedImageFor(exerciseId)?.start ?? null
```

`approvedImageFor` يعيد الرسم الداخلي لبطاقة الجهاز، و`null` لما لا أصل معتمد له — فتظهر الحالة
الصادقة بدل صورة جهاز آخر. **وهذا يغلق العيب ويوحّد مسار القراءة في خطوة واحدة.**

---

## D-3 · `getVideoLabel` كود ميت بمفردات لا تطابق الواقع

`src/lib/exerciseGuidance.ts:203` يوزّع على `'official' | 'custom' | 'trusted'`، بينما
`exercises.ts:217` لا يُصدر إلا `'trusted_video' | 'youtube_search'`. **والدالة بلا مستورد واحد.**

**التوصية:** تُحذف مع موجة تنظيف الطبقة الميتة (§11/٩ في الميثاق)، **لا الآن** — الحذف يحتاج
`grep` للمراجع الديناميكية وPR مجمَّعًا بالعناقيد. سُجّلت هنا كي لا تضيع.

> **وبعد وصل D-1**، يصير `Exercise.videoUrl` (رابط البحث) بلا مستهلك في شاشة التفاصيل، لكنه
> **يبقى مستهلكًا** في `WorkoutMode.tsx` و`ExerciseLibraryPicker.tsx` و`workoutValidation.ts`.
> توحيدها على المانيفست **موجة مستقلة**، لا بند داخل هذه.

---

## D-4 · قرار المؤسس المعلَّق — نبرة عنوانَي ATHLEAN-X

`face-pull` و`arnold-press`: أفضل مرجعين تقنيًا للحركتين من ATHLEAN-X، **وعنواهما يحملان شتيمة
مُموّهة** («STOP F\*cking Up…»). قِمّة عربية أولًا وموجّهة للعائلة، والضغط على الزر **يكشف العنوان**.

**ما فُعل:** خُفِّضا إلى `NEEDS_REVIEW` — **قرار تحفّظي معلَن، لا صامت**. المعرّفان المُتحقَّق منهما
محفوظان في `notes` داخل `video-research.json`، فالاستعادة **سطر واحد** إن اعتُمدا.

**ما يحتاج قرارًا:** هل تُقبل سلطة القناة مع عنوان كهذا، أم يُبحث عن بديل أنظف عنوانًا وأقلّ سلطة؟
**السؤال للمؤسس، لا للوكيل** (§3).

---

## D-5 · `test:guidance-honesty` — فحص صار وصفه غير مطابق

`scripts/run-guidance-honesty-proof.mjs` يحمل فحصًا عنوانه:

> `'Guidance returns empty English content for known catalog items'`

وهو يتحقّق بمطابقة نصّية للسطر `if (getExercise(exercise.id)) return []` في `exerciseGuidance.ts`.

**الحالة بعد هذه الموجة:** السطر **باقٍ كما هو** ولم يُمَسّ، والفحص **يمرّ بحقّ** بوصفه «الاحتياط
الأمين موجود». لكن **العنوان** صار وصفًا غير دقيق للسلوك: بعد وصل D-1، الإنجليزية لن تكون فارغة —
لأن عندها الآن محتوى **مؤلَّفًا** (`EXERCISE_CUES_EN`)، لا مترجَمًا آليًا.

**التمييز الحاكم:** مقصد البوابة «**لا نستنتج إنجليزية**» — وهذا **لم يُخرَق**: الإنجليزية مؤلَّفة
بنفس مِعمار العربية الشاحنة، لا مستنتجة من نصّها.

**ما لم يُفعل ولماذا:** لم أعدّل ذلك السكربت. تعديل بوابة غير مملوكة لحارتي — ولو بإعادة تسمية —
هو بالضبط ما يحذّر منه §4.2. **يُرفَع بندًا مسمّىً بدل الإصلاح الصامت** (§1.5).

**الاقتراح للمنسّق** — إعادة تسمية سطر واحدة تجعل العنوان يطابق ما يُفحَص فعلًا:

```diff
-  ['Guidance returns empty English content for known catalog items',
+  ['Guidance keeps an honest empty-English fallback for items with no authored English',
```

> والضمان السلوكي الحقيقي صار مغطّى بأقوى منه في `test:exercise-production`:
> تغطية إنجليزية ١٨١/١٨١ · تطابق عدد الخطوات مع العربية · **نقاء اللغة** بتأكيد مضادّ يسقط
> بفحص مسمّى عند تسريب حرف عربي إلى الإنجليزية.

---

## D-6 · سطور `package.json` المطلوبة (لا يلمسها هذا الفرع)

`package.json` محجور على المنسّق (§1.4/٢). المطلوب إضافته:

```json
"audit:exercise-metadata": "node scripts/exercise/run-exercise-metadata-audit.mjs",
"build:exercise-video-registry": "node scripts/exercise/build-video-registry.mjs",
"build:exercise-production-manifest": "node scripts/exercise/run-build-exercise-production-manifest.mjs",
"verify:exercise-video": "node scripts/exercise/verify-video-registry.mjs",
"test:exercise-production": "node scripts/exercise/run-exercise-production-proof.mjs"
```

وتعديل `coaching:build` ليولّد اللغتين معًا:

```diff
-"coaching:build": "node scripts/coaching/extract-manifest.mjs && node scripts/coaching/build-cues.mjs",
+"coaching:build": "node scripts/coaching/extract-manifest.mjs && node scripts/coaching/build-cues.mjs && node scripts/coaching/build-cues-en.mjs",
```

وإلحاق `test:exercise-production` بسلسلة `test:gate`.

> ⚠️ **`verify:exercise-video` تبقى خارج `test:gate` عمدًا** — تُجري ~١٦٠ نداءً شبكيًا، وبوابة
> تعتمد على مزوّد خارجي تحمرّ لأسباب ليست كودنا (§4.0: أحمر بلا سبب مسمّى أسوأ من لا فحص).
> تُشغَّل عند الطلب وعند كل تغيير في سجلّ البحث.
