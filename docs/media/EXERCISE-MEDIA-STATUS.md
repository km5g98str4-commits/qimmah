# حالة وسائط التمارين — قياس لا تقدير

> مُولَّد آليًا: `npm run build:media-status` · حارسه `npm run test:media-provenance`.
> **لا تُحرّر الأرقام يدويًا** — الحارس يسقط إن خالف رقمٌ منشور المقيسَ (`REPORT_COUNT_DRIFT`).
> تاريخ مراجعة سجلّ الحقوق: 2026-07-16

## ١. الأرقام الأربعة

```
REAL_PHOTO_COUNT = 115
VERIFIED_LICENSE_COUNT = 177
FALLBACK_COUNT = 62
UNRESOLVED_COUNT = 0
```

على مستوى **التمرين** (181 تمرينًا في الكتالوج):

| القيمة | العدد | ما تعنيه بالضبط |
|---|---:|---|
| `REAL_PHOTO_COUNT` | 115 | تمارين تعرض **فوتوغرافيا لشخص حقيقي** يؤدّي الحركة. |
| `FALLBACK_COUNT` | 62 | تمارين تعرض **رسمًا متجهيًا داخليًا** — 37 رسم حركة + 25 مخطّط جهاز. |
| `VERIFIED_LICENSE_COUNT` | 177 | تمارين كلّ أصولها المشحونة تحمل ترخيصًا معلنًا ودليلًا قابلًا للفتح. |
| `UNRESOLVED_COUNT` | 0 | تمارين تُعرض بأصل لا يمكن إثبات حقوقه. |
| بلا وسائط | 4 | تمارين لا تعرض شيئًا (حالة فارغة صادقة). |

وعلى مستوى **الملف** (297 أصلًا في سجلّ الحقوق):

| النوع | عدد الملفات |
|---|---:|
| `REAL_PHOTO` | 234 |
| `IN_HOUSE_ILLUSTRATION` | 37 |
| `IN_HOUSE_DIAGRAM` | 26 |
| `rightsStatus = VERIFIED` | 297 |
| `rightsStatus = UNRESOLVED` | 0 |

### ما يقوله هذا عن الالتزام السابق

التزام `39fd151` أعلن «صورة لكل تمرين — ١٨١/١٨١ بنمط داخلي موحّد». **الرقم صحيح
والوصف صحيح**: ١٨١ تمرينًا تعرض شيئًا، و«بنمط داخلي موحّد» تصف الرسوم. لكن من يقرأ
«صورة لكل تمرين» يفهم فوتوغرافيا. الحقيقة المقيسة: **115 فوتوغرافيا و62 رسمًا**.

## ٢. سلّم المصادر المطلوب — وأين نقف منه

| الرتبة | المصدر المطلوب | ما لدينا اليوم |
|---|---|---|
| ١ | فوتوغرافيا حقيقية نظيفة الحقوق | 115 تمرينًا من `yuhonas/free-exercise-db` (Unlicense معلن) |
| ٢ | أصول مصنّع رسمية بإذن إعادة استخدام | **صفر** — لا اتفاق مع أي مصنّع |
| ٣ | صور نظيفة الحقوق من مصدر معتبر | **صفر** |
| ٤ | رسم محايد كبديل معلَن | 62 تمرينًا (رسوم داخلية نملك حقوقها كاملة) |

### تحفّظ حقوقي يجب أن يعرفه المؤسس

الرتبة ١ تستند إلى **ترخيص المستودع المُعلن** (`Unlicense` على `yuhonas/free-exercise-db`،
وجذره `wrkout/exercises.json`). **لا يوجد في المستودع إقرار عارض ولا منحة مصوّر** لأيٍّ من
الـ234 لقطة. الوسم `REAL_PHOTO` يصف **شكل الأصل** (فوتوغرافيا لا رسمًا) ولا يدّعي
أكثر. إن كان الإطلاق التجاري يتطلّب سلسلة حقوق أقوى من «ترخيص مستودع»، فهذه مراجعة
قانونية مفتوحة — تُحسم بقرار مؤسس لا باجتهاد وكيل.

## ٣. نقص واجهة موثَّق — `UI_PROVENANCE_NULL`

سلسلة الحقوق كاملة في `scripts/media/provenance-manifest.json` لكل أصل مشحون.
غير أنّ **المانيفست الذي يقرأه التطبيق** (`src/data/exerciseProductionManifest.generated.ts`)
يحمل `imageSource: null` و`imageLicense: null` لـ**25** بطاقة جهاز — فالتطبيق
لا يرى نَسَبها ولو كان موجودًا على القرص.

### الإصلاح المطلوب (خارج حارة هذا الإثبات)

في `scripts/exercise/build-exercise-production-manifest.ts` السطران ٩٦–١٠٠: فرع
`image?.kind === 'illustration'` يملأ المصدر والترخيص، وفرع `'diagram'` لا يفعل فيسقط
إلى `img.source ?? null`. يكفي أن يشمل الشرطُ `'diagram'` بقيمة
`'qimmah-inhouse-schematic'`، ثم `npm run build:exercise-production-manifest`.
بعده تُفرَّغ قائمة الاستثناء في `scripts/media/media-provenance-proof.ts` وتسقط
الاثنتان معًا بـ`ALLOWLIST_STALE` إن نُسي تفريغها.

القائمة محروسة: مُعرَّف سادس وعشرون بلا نَسَب يسقط بـ`UI_PROVENANCE_NULL`.

## ٤. أصول محمولة لا تصل شاشة (5)

صفوف في سجلّ الحقوق لا يشير إليها أي مدخل `APPROVED`. لا خطر حقوقي فيها — لكنها
وزن يُشحن بلا مقابل، وذكرها أصدق من السكوت عنها. **لا تُحذف بيد وكيل**.

| الأصل | المسار | النوع |
|---|---|---|
| `exercise:adduction-machine:img0` | `/exercise-images/adduction-machine/0.jpg` | صورة حقيقية |
| `exercise:adduction-machine:img1` | `/exercise-images/adduction-machine/1.jpg` | صورة حقيقية |
| `exercise:low-row-machine:img0` | `/exercise-images/low-row-machine/0.jpg` | صورة حقيقية |
| `exercise:low-row-machine:img1` | `/exercise-images/low-row-machine/1.jpg` | صورة حقيقية |
| `machine:pec-deck-machine` | `/exercise-machine-images/pec-deck-machine.svg` | مخطّط جهاز داخلي |

## ٥. قائمة الاقتناء بالأولوية — أين تحتاج فوتوغرافيا حقيقية أولًا

مرتّبة بعدد مرّات ظهور التمرين في القوالب الجاهزة — أي بعدد المستخدمين الذين سيرون
البديل. `0` يعني أنه لا يظهر في قالب جاهز ويصل عبر الاختيار اليدوي. التعادل يُفكّ أبجديًا.

مصادر الإشارة المقروءة: `src/data/workoutTemplates.ts` · `src/data/workoutTemplatesBuiltIn.ts`.

| # | التمرين | الاسم الإنجليزي | المعدّات | النوع الحالي | ظهور في القوالب |
|---:|---|---|---|---|---:|
| 1 | تجديف كتف خلفي | Rear Delt Row Machine | machine | مخطّط جهاز داخلي | 9 |
| 2 | جهاز الألوية | Glute Machine | machine | مخطّط جهاز داخلي | 8 |
| 3 | جهاز مباعدة الأرجل | Hip Abduction Machine | machine | مخطّط جهاز داخلي | 8 |
| 4 | جهاز ضغط صدر علوي | Incline Chest Press Machine | machine | مخطّط جهاز داخلي | 8 |
| 5 | جهاز مرجحة بايسبس | Preacher Curl Machine | machine | مخطّط جهاز داخلي | 8 |
| 6 | رفع بطات جالس | Seated Calf Raise Machine | machine | مخطّط جهاز داخلي | 8 |
| 7 | ثني أرجل جالس | Seated Leg Curl | machine | مخطّط جهاز داخلي | 8 |
| 8 | جهاز مد ترايسبس | Triceps Extension Machine | machine | مخطّط جهاز داخلي | 8 |
| 9 | جهاز ضغط الصدر | Chest Press Machine | machine | مخطّط جهاز داخلي | 7 |
| 10 | تجديف بمسند صدر | Chest-Supported Row Machine | machine | مخطّط جهاز داخلي | 7 |
| 11 | جهاز رفرفة جانبية | Lateral Raise Machine | machine | مخطّط جهاز داخلي | 7 |
| 12 | جهاز ضغط كتف | Shoulder Press Machine | machine | مخطّط جهاز داخلي | 7 |
| 13 | مرونة الكاحل | Ankle Mobility Drill | bodyweight | رسم حركة داخلي | 0 |
| 14 | الدراجة الهوائية (أسولت) | Assault Bike | machine | رسم حركة داخلي | 0 |
| 15 | مشي جانبي بالمطاط | Banded Lateral Walk | band | رسم حركة داخلي | 0 |
| 16 | حبال القتال | Battle Ropes | rope | رسم حركة داخلي | 0 |
| 17 | سكوات بالحزام | Belt Squat | machine | رسم حركة داخلي | 0 |
| 18 | كرنش الدراجة | Bicycle Crunch | bodyweight | رسم حركة داخلي | 0 |
| 19 | بيربي | Burpees | bodyweight | رسم حركة داخلي | 0 |
| 20 | تمرير مطرقة كيبل (حبل) | Cable Hammer Curl | cable | لا وسائط | 0 |
| 21 | ضم الفخذ كيبل | Cable Hip Adduction | cable | رسم حركة داخلي | 0 |
| 22 | ضغط كتف كيبل | Cable Shoulder Press | cable | رسم حركة داخلي | 0 |
| 23 | قطع الخشب كيبل | Cable Woodchop | cable | رسم حركة داخلي | 0 |
| 24 | تجديف بإسناد الصدر | Chest-Supported Row | dumbbell/bench | رسم حركة داخلي | 0 |
| 25 | جهاز ضغط صدر سفلي | Decline Chest Press Machine | machine | مخطّط جهاز داخلي | 0 |
| 26 | سكوات سومو دمبل | Dumbbell Sumo Squat | dumbbell | رسم حركة داخلي | 0 |
| 27 | الإليبتيكال | Elliptical | machine | رسم حركة داخلي | 0 |
| 28 | ضخّ الضفدع للجلوت | Frog Pump | bodyweight | رسم حركة داخلي | 0 |
| 29 | جهاز ركل خلفي | Glute Kickback Machine | machine | مخطّط جهاز داخلي | 0 |
| 30 | هاك سكوات جهاز | Hack Squat Machine | machine | مخطّط جهاز داخلي | 0 |
| 31 | رفع الركب (جري ثابت) | High Knees | bodyweight | رسم حركة داخلي | 0 |
| 32 | جهاز ضم الفخذ | Hip Adductor Machine | machine | مخطّط جهاز داخلي | 0 |
| 33 | ثبات الجسم المقعّر | Hollow Body Hold | bodyweight | رسم حركة داخلي | 0 |
| 34 | مشي مائل على السير | Incline Treadmill Walk | machine | رسم حركة داخلي | 0 |
| 35 | ضغط صدر أيزو-لاترال | Iso-Lateral Chest Press | machine | مخطّط جهاز داخلي | 0 |
| 36 | تجديف عالي أيزو-لاترال | Iso-Lateral High Row | machine | مخطّط جهاز داخلي | 0 |
| 37 | ضغط علوي أيزو-لاترال | Iso-Lateral Incline Press | machine | مخطّط جهاز داخلي | 0 |
| 38 | سحب أيزو-لاترال | Iso-Lateral Pulldown | machine | مخطّط جهاز داخلي | 0 |
| 39 | نط الحبل | Jump Rope | bodyweight | رسم حركة داخلي | 0 |
| 40 | ضغط لاندماين | Landmine Press | barbell | رسم حركة داخلي | 0 |
| 41 | أرجحة الأرجل (إحماء) | Leg Swings | bodyweight | رسم حركة داخلي | 0 |
| 42 | تفتيح جهاز | Machine Fly | machine | لا وسائط | 0 |
| 43 | الرفعة الرومانية بالجهاز | RDL Machine | machine | لا وسائط | 0 |
| 44 | تجديف ميدوز | Meadows Row | barbell | رسم حركة داخلي | 0 |
| 45 | تسلق الجبل | Mountain Climber | bodyweight | رسم حركة داخلي | 0 |
| 46 | نوردك كيرل | Nordic Hamstring Curl | bodyweight | رسم حركة داخلي | 0 |
| 47 | مشي خارجي | Outdoor Walk | bodyweight | رسم حركة داخلي | 0 |
| 48 | تجديف بندلاي | Pendlay Row | barbell | رسم حركة داخلي | 0 |
| 49 | ضغط بايك | Pike Push-Up | bodyweight | رسم حركة داخلي | 0 |
| 50 | جهاز التجديف | Rowing Machine | machine | رسم حركة داخلي | 0 |
| 51 | مرونة الكتف بالعصا/المطاط | Shoulder Dislocates | band | رسم حركة داخلي | 0 |
| 52 | بلانك جانبي | Side Plank | bodyweight | لا وسائط | 0 |
| 53 | سحب علوي بذراع واحدة | Single-Arm Lat Pulldown | machine | مخطّط جهاز داخلي | 0 |
| 54 | دفع ترايسبس بذراع واحدة | Single-Arm Pushdown | cable | رسم حركة داخلي | 0 |
| 55 | دفع الورك برجل واحدة | Single-Leg Hip Thrust | bodyweight | رسم حركة داخلي | 0 |
| 56 | رفعة رومانية برجل واحدة | Single-Leg RDL | dumbbell | رسم حركة داخلي | 0 |
| 57 | جهاز الدرج (ستيرماستر) | Stairmaster | machine | رسم حركة داخلي | 0 |
| 58 | رفع بطات واقف | Standing Calf Raise Machine | machine | مخطّط جهاز داخلي | 0 |
| 59 | مد ورك واقف | Standing Hip Extension Machine | machine | مخطّط جهاز داخلي | 0 |
| 60 | ثني أرجل واقف | Standing Leg Curl | machine | مخطّط جهاز داخلي | 0 |
| 61 | دراجة ثابتة | Stationary Bike | machine | رسم حركة داخلي | 0 |
| 62 | تدوير الفقرات الصدرية | Thoracic Rotation | bodyweight | رسم حركة داخلي | 0 |
| 63 | أصابع للبار | Toes to Bar | bodyweight | رسم حركة داخلي | 0 |
| 64 | جري على السير | Treadmill Run | machine | رسم حركة داخلي | 0 |
| 65 | جلسة الحائط | Wall Sit | bodyweight | رسم حركة داخلي | 0 |
| 66 | سحب أيزو-لاترال واسع | Wide-Grip Iso-Lateral Pulldown | machine | مخطّط جهاز داخلي | 0 |

## ٦. مكتبة المؤسس الخارجية — الكلفة الحقيقية للاستيراد

مسح نقطة-زمن (2026-08-28) لـ`/Users/ziyad/Documents/Saudi Training/QIMMAH_Exercise_Image_Library`.
**قُرئت `manifests/production_queue.json` و`PRODUCTION_STANDARD.md` فقط — لم يُنسخ ملف ثنائي واحد.**
هذا المسح خارج المستودع، فلا يُعاد قياسه في CI؛ رقمه يشيخ ويُعاد قياسه يدويًا.

### أولًا وقبل أي رقم: هذه مكتبة **توليد ذكاء اصطناعي**، لا فوتوغرافيا

- PRODUCTION_STANDARD.md §Locked visual identity: مرجع هوية إلزامي 00_reference/athlete_identity_anchor.png ورياضي واحد بنفس الوجه بالضبط في كل صورة
- PRODUCTION_STANDARD.md §Required asset layout: «Generate one native two-panel source» ثم يُشقّ بـprocess_composite.py
- PRODUCTION_STANDARD.md §Visual QA gate: «Extra/missing fingers or limbs» — عيبٌ لا يقع إلا في التوليد
- production_queue.json: حقل generationAttempt في كل صفّ، وqaResult ∈ approved/pending_detailed_review/not_started

«photorealistic» في المواصفة تصف الأسلوب البصري المطلوب من المولّد، لا مصدرًا فوتوغرافيًا. الرتبة ١ في سلّم المصادر (فوتوغرافيا حقيقية) لا تتحقّق بهذه المكتبة مهما بلغت جودتها.

**أي استيراد منها يهبط في الرتبة ٤ من سلّم المصادر (رسم/توليد محايد كبديل معلَن)،
لا الرتبة ١.** وسمها الصحيح عند الاستيراد يكون نوعًا ثالثًا معلنًا (مثل
`AI_GENERATED`) — لا `REAL_PHOTO` بحال. وسمها `REAL_PHOTO` هو بعينه الكذب الذي
يمنعه `PHOTO_WITHOUT_SOURCE`.

### ثانيًا: ما الجاهز فعلًا

| القياس | العدد | من ١٨١ |
|---|---:|---|
| صفوف في طابور الإنتاج | 181 | — |
| `status = approved` | 9 | 181 |
| `status = generated_pending_qa` | 36 | 181 |
| `status = queued` (لم يُولَّد بعد) | 136 | 181 |
| صفوف لها ملفات صور على القرص | 45 | 181 |
| صفوف بلا مسار صورة إطلاقًا | 136 | 181 |

### ثالثًا: كم منها ينطبق على كتالوجنا

المكتبة مبنية على مصنّف مختلف (`Saudi_Practical_Exercise_Database_550`) — أسماؤها
ليست أسماء كتالوجنا.

| القياس | العدد |
|---|---:|
| تطابق باسم إنجليزي **حرفي** | 74 |
| تطابق يتجاهل ترتيب الكلمات | 78 |
| مُعرّفات كتالوج مختلفة يمكن بلوغها | 77 |
| صفوف **لها ملفات** وتنطبق على الكتالوج | 21 |
| صفوف **معتمدة** وتنطبق على الكتالوج | 7 |

طريقة القياس: المطابقة على nameEn في src/data/exercises.ts بعد تطبيع الحروف الصغيرة وإزالة غير الأبجدي-الرقمي؛ والمطابقة الثانية تتجاهل ترتيب الكلمات (مجموعة الكلمات نفسها).

### الخلاصة بالأرقام

- **اليوم**، ما يمكن استيراده بلا عمل يدوي: **7 تمارين** (معتمدة + تنطبق على مُعرّف كتالوج).
- **بعد مراجعة الجودة** للـ36 المعلّقة: يرتفع السقف إلى **21 تمرينًا**.
- **الباقي 136 صفًّا لم يُولَّد بعد** — الكلفة توليد ومراجعة، لا استيراد.
- وأيًّا كان العدد، يبقى **103 صفًّا** يحتاج **جدول ربط أسماء يُكتب بيد** قبل أن يعرف الكودُ لأي تمرين هو.

## ٧. الجدول الكامل — 181 تمرينًا

| المُعرّف | الاسم | النوع | المصدر | الترخيص | الحقوق | نَسَب مرئي للتطبيق |
|---|---|---|---|---|---|---|
| `ab-crunch-machine` | جهاز طحن البطن | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `ab-wheel-rollout` | عجلة البطن | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `ankle-mobility` | مرونة الكاحل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `arm-circles` | تدوير الذراعين (إحماء) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `arnold-press` | ضغط أرنولد | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `assault-bike` | الدراجة الهوائية (أسولت) | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `assisted-dip-machine` | جهاز غطس مساعد | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `banded-lateral-walk` | مشي جانبي بالمطاط | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `barbell-back-squat` | سكوات خلفي بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `barbell-bench-press` | بنش بريس بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `barbell-curl` | تمرير بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `barbell-row` | تجديف بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `barbell-shrug` | رفرفة الترابيس بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `battle-ropes` | حبال القتال | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `belt-squat` | سكوات بالحزام | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `bench-dip` | غطس على المقعد | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `bicycle-crunch` | كرنش الدراجة | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `bodyweight-calf-raise` | رفع السمانة وزن الجسم | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `bodyweight-squat` | سكوات وزن الجسم | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `bulgarian-split-squat` | سكوات بلغاري | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `burpees` | بيربي | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `cable-biceps-curl` | مرجحة بايسبس كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-crossover` | تفتيح كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-hammer-curl` | تمرير مطرقة كيبل (حبل) | لا وسائط | — | — | VERIFIED | لا |
| `cable-hip-adduction` | ضم الفخذ كيبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `cable-kickback` | رفسة كيبل للجلوت | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-lateral-raise` | رفرفة جانبي كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-overhead-extension` | تمديد ترايسبس علوي كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-pull-through` | سحب بين الأرجل كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-rear-delt-fly` | رفرفة خلفي كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-shoulder-press` | ضغط كتف كيبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `cable-triceps-pushdown` | دفع ترايسبس كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `cable-woodchop` | قطع الخشب كيبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `cat-cow` | تمدّد القطة-البقرة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `chest-dip` | غطس الصدر (متوازي) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `chest-press-machine` | جهاز ضغط الصدر | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `chest-supported-row` | تجديف بإسناد الصدر | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `chest-supported-row-machine` | تجديف بمسند صدر | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `child-pose` | وضعية الطفل (استرخاء) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `chin-up` | عقلة قبضة عكسية | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `close-grip-bench-press` | بنش قبضة ضيقة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `close-grip-pulldown` | سحب قبضة ضيقة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `concentration-curl` | تمرير مركّز | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `crunch` | كرنش | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dead-bug` | الحشرة الميتة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `deadlift` | رفعة ميتة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `decline-barbell-press` | بنش منخفض بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `decline-chest-press-machine` | جهاز ضغط صدر سفلي | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `decline-dumbbell-press` | بنش منخفض دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `diamond-push-up` | ضغط ماسي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `donkey-calf-raise` | رفع السمانة (دونكي) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-bench-press` | بنش بريس دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-curl` | تمرير دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-fly` | تفتيح دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-kickback` | ركلة ترايسبس دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-rdl` | رفعة رومانية دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-row` | تجديف دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-shoulder-press` | ضغط كتف دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-shrug` | رفرفة الترابيس دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `dumbbell-sumo-squat` | سكوات سومو دمبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `elliptical` | الإليبتيكال | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `ez-bar-curl` | تمرير بار متعرّج | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `face-pull` | سحب للوجه كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `flutter-kicks` | رفرفة الأرجل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `frog-pump` | ضخّ الضفدع للجلوت | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `front-raise` | رفرفة أمامي دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `front-squat` | سكوات أمامي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `glute-bridge` | جسر الجلوت | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `glute-ham-raise` | رفع الجلوت-هام (GHR) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `glute-kickback-machine` | جهاز ركل خلفي | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `glute-machine` | جهاز الألوية | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `goblet-squat` | سكوات جوبليت دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `good-morning` | غود مورننق بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `hack-squat-machine` | هاك سكوات جهاز | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `hammer-curl` | تمرير مطرقة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `hamstring-stretch` | تمدّد الهامسترنج | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `hanging-leg-raise` | رفع الأرجل معلق | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `high-knees` | رفع الركب (جري ثابت) | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `hip-abduction-machine` | جهاز مباعدة الأرجل | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `hip-adductor-machine` | جهاز ضم الفخذ | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `hip-flexor-stretch` | تمدّد عضلة الورك القابضة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `hip-thrust` | دفع الورك بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `hollow-hold` | ثبات الجسم المقعّر | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `incline-barbell-press` | بنش مائل بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `incline-cable-fly` | تفتيح كيبل مائل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `incline-chest-press-machine` | جهاز ضغط صدر علوي | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `incline-dumbbell-curl` | تمرير دمبل مائل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `incline-dumbbell-press` | بنش مائل دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `incline-push-up` | ضغط مائل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `incline-treadmill-walk` | مشي مائل على السير | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `inverted-row` | تجديف مقلوب (وزن الجسم) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `iso-lateral-chest-press` | ضغط صدر أيزو-لاترال | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `iso-lateral-high-row` | تجديف عالي أيزو-لاترال | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `iso-lateral-incline-press` | ضغط علوي أيزو-لاترال | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `iso-lateral-pulldown` | سحب أيزو-لاترال | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `jm-press` | جي إم بريس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `jump-rope` | نط الحبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `kettlebell-swing` | أرجحة الكيتل بل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `knee-push-up` | ضغط على الركبتين | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `landmine-press` | ضغط لاندماين | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `lat-pulldown-machine` | جهاز سحب علوي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `lateral-raise` | رفرفة جانبي دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `lateral-raise-machine` | جهاز رفرفة جانبية | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `leg-extension-machine` | جهاز مد الأرجل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `leg-press-calf-raise` | رفع السمانة على جهاز الدفع | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `leg-press-machine` | جهاز دفع الأرجل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `leg-press-narrow` | دفع أرجل قبضة ضيقة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `leg-raise` | رفع الأرجل مستلقي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `leg-swings` | أرجحة الأرجل (إحماء) | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `low-cable-fly` | تفتيح كيبل سفلي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `lying-leg-curl` | ثني أرجل مستلقي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `machine-curl` | تمرير جهاز | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `machine-fly` | تفتيح جهاز | لا وسائط | — | — | VERIFIED | لا |
| `machine-rdl` | الرفعة الرومانية بالجهاز | لا وسائط | — | — | VERIFIED | لا |
| `meadows-row` | تجديف ميدوز | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `mountain-climber` | تسلق الجبل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `neutral-grip-pulldown` | سحب قبضة محايدة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `nordic-curl` | نوردك كيرل | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `outdoor-walk` | مشي خارجي | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `overhead-press` | ضغط كتف بار واقف | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `overhead-triceps-extension` | تمديد ترايسبس علوي دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `pallof-press` | ضغط بالوف (مقاومة دوران) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `pec-deck-machine` | جهاز فلاي صدر | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `pendlay-row` | تجديف بندلاي | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `pike-push-up` | ضغط بايك | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `plank` | بلانك | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `preacher-curl-machine` | جهاز مرجحة بايسبس | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `pull-up` | عقلة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `push-press` | بوش بريس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `push-up` | ضغط (تمرين الجسم) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `rack-pull` | راك بل (رفعة من الحامل) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `rear-delt-fly` | رفرفة خلفي دمبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `rear-delt-row-machine` | تجديف كتف خلفي | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `reverse-curl` | تمرير عكسي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `reverse-lunge` | طعنة خلفية | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `reverse-pec-deck` | بيك دك عكسي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `romanian-deadlift` | رفعة رومانية بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `rope-pushdown` | دفع ترايسبس حبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `rowing-machine` | جهاز التجديف | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `russian-twist` | تويست روسي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `seated-cable-row` | تجديف كيبل جالس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `seated-calf-raise-machine` | رفع بطات جالس | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `seated-dumbbell-press` | ضغط كتف دمبل جالس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `seated-lateral-raise` | رفرفة جانبي جالس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `seated-leg-curl` | ثني أرجل جالس | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `seated-row-machine` | جهاز تجديف جالس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `shoulder-dislocates` | مرونة الكتف بالعصا/المطاط | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `shoulder-press-machine` | جهاز ضغط كتف | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `side-plank` | بلانك جانبي | لا وسائط | — | — | VERIFIED | لا |
| `single-arm-cable-row` | تجديف كيبل بذراع واحدة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `single-arm-lat-pulldown` | سحب علوي بذراع واحدة | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `single-arm-pushdown` | دفع ترايسبس بذراع واحدة | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `single-leg-calf-raise` | رفع السمانة برجل واحدة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `single-leg-hip-thrust` | دفع الورك برجل واحدة | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `single-leg-rdl` | رفعة رومانية برجل واحدة | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `sissy-squat` | سيسي سكوات | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `skull-crusher` | سكال كراشر | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `smith-machine-bench` | بنش سميث | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `smith-machine-squat` | سكوات سميث | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `spider-curl` | تمرير سبايدر | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `stairmaster` | جهاز الدرج (ستيرماستر) | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `standing-calf-raise-machine` | رفع بطات واقف | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `standing-hip-extension-machine` | مد ورك واقف | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `standing-leg-curl` | ثني أرجل واقف | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `stationary-bike` | دراجة ثابتة | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `step-up` | صعود على منصة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `stiff-leg-deadlift` | رفعة بأرجل مفرودة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `straight-arm-pulldown` | سحب بذراع ممدودة كيبل | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `sumo-deadlift` | رفعة ميتة سومو | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `svend-press` | سفيند بريس | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `t-bar-row-machine` | جهاز تجديف تي-بار | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `thoracic-rotation` | تدوير الفقرات الصدرية | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `toes-to-bar` | أصابع للبار | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `treadmill-run` | جري على السير | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `triceps-extension-machine` | جهاز مد ترايسبس | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `upright-row` | تجديف عمودي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `walking-lunge` | طعنات مشي | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `wall-sit` | جلسة الحائط | رسم حركة داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | نعم |
| `wide-grip-iso-lateral-pulldown` | سحب أيزو-لاترال واسع | مخطّط جهاز داخلي | qimmah-inhouse-schematic | In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark) | VERIFIED | لا |
| `wide-grip-lat-pulldown` | سحب علوي قبضة واسعة | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
| `world-greatest-stretch` | أعظم تمدّد (World’s Greatest) | صورة حقيقية | yuhonas/free-exercise-db | Unlicense / public-domain dedication | VERIFIED | نعم |
