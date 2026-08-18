# R5 — مكتبة التمارين · تغطية الوسائط · محتوى التدريب AR/EN

**النطاق:** فحص جنائي للقراءة فقط · `/Users/ziyad/qimmah-deploy`
**الفرع:** `codex/qimmah-sovereign-closure-001` · **الرأس:** `740023b`
**التاريخ:** 2026-08-18

> **كل رقم في هذا التقرير مُحتسَب برمجيًا** — بحزم `esbuild` يستورد وحدات التطبيق الحقيقية بنفس مُحمِّل
> `scripts/exercise/run-exercise-production-proof.mjs`. لا تقدير ولا عدّ يدوي.
> السكربتات: `…/scratchpad/recon/{count1,inv,orph,gap,cov,about,bypass,generic,layers,ch,table}.ts` عبر `run.mjs`.

---

## ⓪ الخلاصة — تصحيح أرقام التقرير السابق

| البند | الادّعاء السابق | **المُحتسَب** | الحكم |
|---|---|---|---|
| عدد التمارين | 181 | **181** | ✅ |
| لقطات فوتوغرافية معتمدة | ~121 | **121** | ✅ |
| بطاقات أجهزة SVG | 25 | **23** معتمدة | ❌ **+2 زائدة** |
| صور مفقودة | 35 | **37** | ❌ **−2 ناقصة** |
| فيديو NEEDS_REVIEW | 22 | **22** | ✅ |
| مجموع الصور المعتمدة | — | **144** (121 + 23) | — |
| فيديو معتمد | — | **159 / 181** | — |

### 🔎 سبب الخطأ — طبقتان لا طبقة

الأرقام «25 و35» **صحيحة تمامًا… لكن لطبقة متجاوَزة**:

| الطبقة | الملف | التصنيف |
|---|---|---|
| **الوسيطة (P10 · متجاوَزة)** | `src/data/exerciseMediaManifest.generated.ts` | `stills` 121 · `placeholder-only` **25** · `missing` **35** |
| **الإنتاجية (القانونية)** | `src/data/exerciseProductionManifest.generated.ts` | `APPROVED` **144** (121 stills + 23 diagram) · `MISSING` **37** |

الفرق بالضبط: من الـ25 `placeholder-only` **صار 23 رسمًا معتمدًا**، و**تمرينان سقطا إلى `MISSING`** لأن رسمهما
الداخلي لم يُنتَج بعد وصورتهما الفوتوغرافية سُحبت لنسبة خاطئة:

- `chest-press-machine` — جهاز ضغط الصدر
- `incline-chest-press-machine` — جهاز ضغط صدر علوي

**من قرأ الطبقة الوسيطة حصل على 25/35؛ ومن قرأ الطبقة الإنتاجية يحصل على 23/37.** الثانية هي التي تحكم الشاشة.

### ثلاثة اكتشافات إضافية

1. 🔴 **الطبقة كلّها غير موجودة على `main`.** الرأس **متقدّم 156 التزامًا** على `main`، و`main` لا يملك
   `exerciseProductionManifest.generated.ts` ولا `exerciseVideoRegistry.ts` ولا `exerciseCuesEn.generated.ts`.
   و`main` ينشر تلقائيًا على Cloudflare Pages ⇒ **الإنتاج الحيّ اليوم بلا مانيفست وسائط، بلا سجلّ فيديو، وبلا إرشاد إنجليزي.**
2. 🟠 **«الإرشاد الإنجليزي غير متاح» لم يُغلق — انكمش.** على الرأس: **3 من 4 كتل** صارت مغطّاة، وبقيت
   **«Technique tips» فارغة في 181/181**. على `main`: **الكتل الأربع** فارغة في **181/181**.
3. 🟡 **`FOUNDER-MEDIA-GAPS.md` المودَع يُسقِط التمرينين أعلاه** ويقول «٢٥ بطاقة SVG» — نفس خطأ الطبقة.

---

## ① الكتالوج القانوني

| البند | القيمة | الدليل |
|---|---|---|
| **ملف الكتالوج** | `src/data/exercises.ts` | مصفوفة `exercises` مبنيّة بدالة `ex()` (سطر 195) |
| **عدد التمارين** | **181** | `exercises.length === 181` |
| معرّفات فريدة | **181** — لا تكرار | `new Set(ids).size === 181` |
| تغطية المانيفست الإنتاجي | **181 / 181** | كل معرّف له مدخل |
| **طبقة القراءة الوحيدة للواجهة** | `src/lib/exerciseProductionMedia.ts` | `productionEntryFor` · `approvedImageFor` · `approvedVideoFor` · `hasApprovedVideo` · `videoEmbedUrl` |
| مرشّح المكتبة | `src/lib/exerciseLibrary.ts:16` — `filterExerciseLibrary` | بحث AR/EN + فلترة عضلة/عدّة + فرز حسب اللغة |

### ملفات الوسائط ذات الصلة

| الملف | الدور | حيّ؟ |
|---|---|---|
| `src/data/exerciseProductionManifest.generated.ts` | **المانيفست القانوني** (152 كيلوبايت) | ✅ |
| `src/data/exerciseVideoRegistry.ts` | سجلّ مراجع الفيديو (94 كيلوبايت · 181 مدخلًا) | ✅ يغذّي المانيفست |
| `src/data/exerciseMedia.ts` | طبقة أدلّة: 125 معرّفًا × إطارين + روابط بعيدة | ⚠️ تُقرأ مباشرة من `ExerciseMedia.tsx` (§⑥) |
| `src/data/machineImages.ts` | 24 رسمًا داخليًا SVG | ⚠️ نفس الشيء |
| `src/data/exerciseGifs.ts` | خريطة GIF | ⚠️ **فارغة فعليًا** (`public/exercise-gifs/` فيه `.gitkeep` فقط) |
| `src/data/exerciseMediaManifest.generated.ts` | الطبقة الوسيطة P10 (67 كيلوبايت) | 🪦 متجاوَزة |
| **`src/lib/exerciseMediaPipeline.ts`** | واجهة P10 فوق الطبقة الوسيطة + تحميل مسبق | 🪦 **ميت — صفر مستهلك في `src/`** |

> 🪦 **`src/lib/exerciseMediaPipeline.ts` طبقة ميتة.** بحث كامل عبر `src/` لا يجد مستوردًا واحدًا؛
> مستهلكه الوحيد سكربت إثباته `scripts/media-pipeline-proof.ts`. ومع ذلك **`npm run test:media-pipeline` يظلّ داخل
> `test:gate` بـ15 فحصًا خضراء تُثبت سلوك كودٍ لا يصل مستخدمًا.** هذه هي بالضبط الآلية التي أنتجت خطأ «25/35»:
> طبقة متقاعدة ما زالت خضراء فتبدو مصدرًا للحقيقة.

---

## ② جرد الوسائط — الجدول الدقيق

المصدر: `EXERCISE_PRODUCTION_MANIFEST` مقروءًا لكل معرّف في `exercises`.

### ٢-١ صور

| الحالة | العدد | النسبة |
|---|---|---|
| **APPROVED** | **144** | 79.6% |
| NEEDS_REVIEW | **0** | — |
| REJECTED | **0** | — |
| **MISSING** | **37** | 20.4% |
| **المجموع** | **181** | 100% |

تفكيك الـ144 المعتمدة:

| النوع | العدد | إطار نهاية | المصدر | الرخصة |
|---|---|---|---|---|
| `stills` | **121** | ✅ 121/121 | `yuhonas/free-exercise-db` | `Unlicense / public-domain dedication` |
| `diagram` (SVG داخلي) | **23** | ❌ (إطار واحد بالتصميم) | `null` | `null` ⚠️ |

> ⚠️ **فجوة اتّساق سجلّات (لا فجوة حقوق):** الـ23 رسمًا تحمل `imageSource: null` و`imageLicense: null`
> **داخل المانيفست الإنتاجي**. سلسلة حقوقها كاملة لكن في سجلّ آخر —
> `scripts/media/provenance-manifest.json` بحكم `IN-HOUSE` ونصّ ترخيص صريح («Qimmah owns full rights»).
> **من يفحص المانيفست الإنتاجي وحده يقرأ «بلا مصدر وبلا ترخيص» على 23 أصلًا نملكها بالكامل.**

### ٢-٢ فيديو

| الحالة | العدد | النسبة |
|---|---|---|
| **APPROVED** | **159** | 87.8% |
| **NEEDS_REVIEW** | **22** | 12.2% |
| REJECTED | 0 | — |
| MISSING | 0 | — |

- ثقة المطابقة (المعتمدة): `high` **88** · `medium` **71**. الـ22 غير المعتمدة `null`.
- **64 قناة**: `ScottHermanFitness` 31 · `Colossus Fitness` 11 · `Buff Dudes Workouts` 9 · `Bodybuilding.com` 9 · `Runna` 7 · `NASM` 6 · `Jeff Nippard` 6 · `Life Fitness/Hammer Strength` 4 · `Squat University` 4 …
- **صفر مرجع معتمد بقناة `null`** — كل معتمد منسوب لقناة مسمّاة.
- **لا استضافة ذاتية إطلاقًا.** التضمين على `youtube-nocookie.com` بلا `autoplay`، ويُبنى **بعد نقرة المستخدم فقط**
  (`src/lib/exerciseProductionMedia.ts:75` · حارسه `exercise-production-proof.ts:200`).
- **عنوان الفيديو لا يُصدَّر للواجهة إطلاقًا** — `ApprovedVideoRef` بلا حقل `title` عمدًا، لأن عناوين الطرف الثالث
  تحمل ألفاظًا مُرقَّبة. تسمية الزرّ من القاموس («شاهد طريقة الأداء»).

### ٢-٣ سجلّ الحقوق والمنشأ

| البند | القيمة |
|---|---|
| الملف | `scripts/media/provenance-manifest.json` (294 كيلوبايت) |
| الحارس | `npm run test:media-rights` → `scripts/media/media-rights-proof.mjs` |
| مجموع الأصول المُراجَعة | **274** = (125 معرّف صور × 2 إطار = **250**) + **24** رسمًا SVG |
| الأحكام المسموحة | `CLEARLY-LICENSED` · `IN-HOUSE` فقط |
| `UNKNOWN` / `RESTRICTED` | **0** — وجود أيّها يُفشل البوابة |
| ما يتحقّق منه | SHA-256 لكل بايت · magic bytes · تقديم HTTP فعلي · مطابقة الـupstream (بـ`--remote`) |

> **الفارق 274 ↔ 265:** سجلّ الحقوق يغطّي **9 أصول أكثر** ممّا يشحنه المانيفست الإنتاجي —
> 8 إطارات صور + رسم SVG واحد. هذه هي اليتامى في §④.

---

## ③ جدول فجوات المؤسس — كل ناقص باسمه

**56 تمرينًا** من 181 فيه فجوة واحدة على الأقل:

| التصنيف | العدد |
|---|---|
| صورة مفقودة فقط | **34** |
| فيديو بانتظار المراجعة فقط | **19** |
| **الاثنان معًا** | **3** (`incline-chest-press-machine` · `single-arm-pushdown` · `thoracic-rotation`) |
| **مجموع الصفوف** | **56** |
| مجموع فجوة الصور | 34 + 3 = **37** ✅ |
| مجموع فجوة الفيديو | 19 + 3 = **22** ✅ |

| # | id | الاسم العربي | English name | muscle | الناقص | سبب/ملاحظة المانيفست |
|---|----|--------------|--------------|--------|--------|----------------------|
| 1 | `chest-press-machine` | جهاز ضغط الصدر | Chest Press Machine | chest | **image MISSING** | Machine card with no in-house diagram yet — upstream photography was a mis-attribution and was withdrawn. / Title names the exact exercise. Colossus F |
| 2 | `iso-lateral-chest-press` | ضغط صدر أيزو-لاترال | Iso-Lateral Chest Press | chest | **video NEEDS_REVIEW** | In-house vector diagram: this machine card deliberately refuses free-weight photography. / Hammer Strength Iso-Lateral machine variant. No tutorial fr |
| 3 | `incline-chest-press-machine` | جهاز ضغط صدر علوي | Incline Chest Press Machine | chest | **image MISSING + video NEEDS_REVIEW** | Machine card with no in-house diagram yet — upstream photography was a mis-attribution and was withdrawn. / A candidate titled 'Seated Incline Machine |
| 4 | `iso-lateral-incline-press` | ضغط علوي أيزو-لاترال | Iso-Lateral Incline Press | chest | **video NEEDS_REVIEW** | In-house vector diagram: this machine card deliberately refuses free-weight photography. / Hammer Strength Iso-Lateral incline variant. No reputable i |
| 5 | `chest-supported-row-machine` | تجديف بمسند صدر | Chest-Supported Row Machine | back | **video NEEDS_REVIEW** | In-house vector diagram: this machine card deliberately refuses free-weight photography. / No trustworthy full-length machine-specific tutorial found  |
| 6 | `cable-shoulder-press` | ضغط كتف كيبل | Cable Shoulder Press | shoulders | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact exercise match. Physique Development is a credentialed evidence-based coaching channel but |
| 7 | `face-pull` | سحب للوجه كيبل | Face Pull | shoulders | **video NEEDS_REVIEW** | HELD FOR FOUNDER DECISION (tone, not accuracy): the verified video is the best technique source for this movement, but its YouTube title carries censo |
| 8 | `triceps-extension-machine` | جهاز مد ترايسبس | Triceps Extension Machine | triceps | **video NEEDS_REVIEW** | In-house vector diagram: this machine card deliberately refuses free-weight photography. / Search surfaced 'Tricep Pushdown Machine / Proper Technique |
| 9 | `mountain-climber` | تسلق الجبل | Mountain Climber | core | **image MISSING** | No rights-cleared visual matched this movement yet. / Title names the exact exercise and it is a genuine form tutorial, but Fit Father Project is a mi |
| 10 | `treadmill-run` | جري على السير | Treadmill Run | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Treadmill-specific proper-form tutorial (17:35), not a HIIT workout. Channel is a treadmill-focu |
| 11 | `stationary-bike` | دراجة ثابتة | Stationary Bike | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Proper 'how to use the machine' tutorial (setup + correct pedalling), not a workout video. Chann |
| 12 | `rowing-machine` | جهاز التجديف | Rowing Machine | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Concept2 is the erg manufacturer and is on the approved reputable-source list. Covers the catch, |
| 13 | `elliptical` | الإليبتيكال | Elliptical | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Machine-use technique tutorial, not a workout video. Manufacturer instructional channel, hence m |
| 14 | `jump-rope` | نط الحبل | Jump Rope | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Jump Rope Dudes is the leading jump-rope-specialist instructional channel. 8:23 beginner form/te |
| 15 | `decline-dumbbell-press` | بنش منخفض دمبل | Decline Dumbbell Press | chest | **video NEEDS_REVIEW** | Search returned only unvetted small channels for the decline dumbbell press. No reputable instructional match confirmed before the web-search budget r |
| 16 | `incline-cable-fly` | تفتيح كيبل مائل | Incline Cable Fly | chest | **video NEEDS_REVIEW** | Candidates found were either the low-to-high standing cable fly (already used for low-cable-fly) or an incline DUMBBELL fly (idAvu2HvqSQ, ScottHermanF |
| 17 | `svend-press` | سفيند بريس | Svend Press | chest | **video NEEDS_REVIEW** | Several plate-pinch/Svend press candidates appeared in search but none from a confirmed reputable instructional channel, and none were fetched before  |
| 18 | `machine-fly` | تفتيح جهاز | Machine Fly | chest | **video NEEDS_REVIEW** | Overlaps heavily with pec-deck-machine. No separate verified machine-fly video from a reputable channel. Consider reusing the pec deck reference (H4mV |
| 19 | `knee-push-up` | ضغط على الركبتين | Knee Push-Up | chest | **video NEEDS_REVIEW** | NASM likely has a modified/knee push-up entry in the same series as WDIpL0pjun0 and 0JUrOH--Kdk, but it was not located before the web-search budget w |
| 20 | `pendlay-row` | تجديف بندلاي | Pendlay Row | back | **image MISSING** | No rights-cleared visual matched this movement yet. |
| 21 | `chest-supported-row` | تجديف بإسناد الصدر | Chest-Supported Row | back | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact-name match for the chest-supported DUMBBELL row. Channel is an established fitness-educati |
| 22 | `close-grip-pulldown` | سحب قبضة ضيقة | Close-Grip Pulldown | back | **video NEEDS_REVIEW** | Only personal channels with no verifiable coaching credentials were found. Deliberately left null rather than shipping an unvetted form video. |
| 23 | `single-arm-cable-row` | تجديف كيبل بذراع واحدة | Single-Arm Cable Row | back | **video NEEDS_REVIEW** | Not researched. No ID was guessed. |
| 24 | `meadows-row` | تجديف ميدوز | Meadows Row | back | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact-name match; established fitness-education brand but not top-tier, hence medium. Verified a |
| 25 | `neutral-grip-pulldown` | سحب قبضة محايدة | Neutral-Grip Pulldown | back | **video NEEDS_REVIEW** | Not researched. No ID was guessed. |
| 26 | `arnold-press` | ضغط أرنولد | Arnold Press | shoulders | **video NEEDS_REVIEW** | HELD FOR FOUNDER DECISION (tone, not accuracy): the verified video is the best technique source for this movement, but its YouTube title carries censo |
| 27 | `landmine-press` | ضغط لاندماين | Landmine Press | shoulders | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact-match technique video from a strength-and-conditioning channel. Small channel, hence mediu |
| 28 | `pike-push-up` | ضغط بايك | Pike Push-Up | shoulders | **image MISSING** | No rights-cleared visual matched this movement yet. / Calisthenics-specialist channel with progressions, which suits this bodyweight movement. Not on  |
| 29 | `assisted-dip-machine` | جهاز غطس مساعد | Assisted Dip Machine | triceps | **video NEEDS_REVIEW** | All candidates were small/unvetted gym-walkthrough channels. No reputable instructional match. Not guessed. |
| 30 | `single-arm-pushdown` | دفع ترايسبس بذراع واحدة | Single-Arm Pushdown | triceps | **image MISSING + video NEEDS_REVIEW** | No rights-cleared visual matched this movement yet. / Real video with an exactly matching title, but 'Hammer Fitness' is not a vetted instructional ch |
| 31 | `jm-press` | جي إم بريس | JM Press | triceps | **video NEEDS_REVIEW** | Multiple JM press candidates appeared in search but none from a confirmed reputable instructional channel, and none were fetched before the web-search |
| 32 | `belt-squat` | سكوات بالحزام | Belt Squat | quads | **image MISSING** | No rights-cleared visual matched this movement yet. / Straightforward machine-setup and execution tutorial, clean title. Small gym channel — medium. A |
| 33 | `wall-sit` | جلسة الحائط | Wall Sit | quads | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact-title match, demonstrated by a certified trainer. Well+Good is mainstream wellness media r |
| 34 | `single-leg-hip-thrust` | دفع الورك برجل واحدة | Single-Leg Hip Thrust | glutes | **image MISSING** | No rights-cleared visual matched this movement yet. / Muscle & Motion is a well-regarded anatomy/biomechanics education brand (3D muscle animation + d |
| 35 | `banded-lateral-walk` | مشي جانبي بالمطاط | Banded Lateral Walk | glutes | **image MISSING** | No rights-cleared visual matched this movement yet. / NASM is on the approved list. Short (0:17) but a clean full demonstration. |
| 36 | `frog-pump` | ضخّ الضفدع للجلوت | Frog Pump | glutes | **image MISSING** | No rights-cleared visual matched this movement yet. / Bret Contreras (glute research) is on the approved list and popularized this exercise. |
| 37 | `bicycle-crunch` | كرنش الدراجة | Bicycle Crunch | core | **image MISSING** | No rights-cleared visual matched this movement yet. / NAMING CAUTION: 'Air Bike' is Bodybuilding.com's database name for the bicycle crunch (lying, al |
| 38 | `hollow-hold` | ثبات الجسم المقعّر | Hollow Body Hold | core | **image MISSING** | No rights-cleared visual matched this movement yet. / Sourced from the Muscle & Strength exercise-database page /exercises/hollow-body-hold, which emb |
| 39 | `cable-woodchop` | قطع الخشب كيبل | Cable Woodchop | core | **image MISSING** | No rights-cleared visual matched this movement yet. / Official Bodybuilding.com exercise-database demonstration. |
| 40 | `toes-to-bar` | أصابع للبار | Toes to Bar | core | **image MISSING** | No rights-cleared visual matched this movement yet. / WODprep is a well-established CrossFit skill-coaching channel; toes-to-bar is a CrossFit gymnast |
| 41 | `incline-treadmill-walk` | مشي مائل على السير | Incline Treadmill Walk | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Title names the exact activity and the channel is a dedicated exercise-demonstration library. Me |
| 42 | `stairmaster` | جهاز الدرج (ستيرماستر) | Stairmaster | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / McKinley Health Center is the University of Illinois student health centre - an institutional, n |
| 43 | `burpees` | بيربي | Burpees | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Official CrossFit movement-standards demonstration - the canonical reference for burpee form. |
| 44 | `high-knees` | رفع الركب (جري ثابت) | High Knees | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact title match from PureGym's exercise-library series (PureGym is a major UK gym chain). Cave |
| 45 | `battle-ropes` | حبال القتال | Battle Ropes | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Genuine 5:06 technique tutorial from a mainstream fitness publication. Medium because the title  |
| 46 | `assault-bike` | الدراجة الهوائية (أسولت) | Assault Bike | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / Official technique tutorial from Assault Fitness, the manufacturer of the AssaultBike - the auth |
| 47 | `outdoor-walk` | مشي خارجي | Outdoor Walk | cardio | **image MISSING** | No rights-cleared visual matched this movement yet. / FLAG FOR HUMAN REVIEW. No true 'how to do an outdoor walk' instructional video exists - outdoor  |
| 48 | `leg-swings` | أرجحة الأرجل (إحماء) | Leg Swings | hamstrings | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact-title match. PureGym is a large gym chain producing clean instructional demos, but not a t |
| 49 | `shoulder-dislocates` | مرونة الكتف بالعصا/المطاط | Shoulder Dislocates | shoulders | **image MISSING** | No rights-cleared visual matched this movement yet. / Exact match for banded shoulder dislocates / pass-throughs as a mobility drill. Small coaching c |
| 50 | `thoracic-rotation` | تدوير الفقرات الصدرية | Thoracic Rotation | back | **image MISSING + video NEEDS_REVIEW** | No rights-cleared visual matched this movement yet. / Not researched. Also note the name covers several distinct drills (open-book, quadruped/thread-t |
| 51 | `ankle-mobility` | مرونة الكاحل | Ankle Mobility Drill | calves | **image MISSING** | No rights-cleared visual matched this movement yet. / Covers three ankle mobility drills (11:00) rather than a single named drill — appropriate for a  |
| 52 | `child-pose` | وضعية الطفل (استرخاء) | Child’s Pose | back | **video NEEDS_REVIEW** | Not researched. No ID was guessed. |
| 53 | `decline-chest-press-machine` | جهاز ضغط صدر سفلي | Decline Chest Press Machine | chest | **video NEEDS_REVIEW** | In-house vector diagram: this machine card deliberately refuses free-weight photography. / No tutorial located for the decline chest press machine spe |
| 54 | `machine-rdl` | الرفعة الرومانية بالجهاز | RDL Machine | hamstrings | **video NEEDS_REVIEW** | The exercise name is ambiguous — 'RDL machine' is used for at least three different things (a dedicated plate-loaded RDL/hip-hinge machine, a Smith-ma |
| 55 | `dumbbell-sumo-squat` | سكوات سومو دمبل | Dumbbell Sumo Squat | quads | **image MISSING** | No rights-cleared visual matched this movement yet. / Title names the exact exercise (dual-dumbbell variant). Channel (Team Evolve / Vivian Ngo) is sm |
| 56 | `cable-hip-adduction` | ضم الفخذ كيبل | Cable Hip Adduction | glutes | **image MISSING** | No rights-cleared visual matched this movement yet. / '(LF Cable)' = Life Fitness cable column, i.e. the cable hip adduction. Scott Herman Fitness is  |

### الطابع الحاكم لفجوة الصور الـ37

| المجموعة | العدد | الملاحظة |
|---|---|---|
| كارديو وتكييف | 13 | سير · دراجة ثابتة · تجديف · إهليلجي · نطّ حبل · بيربي · حبال قتال · أسولت بايك · ستيرماستر · مشي مائل · رفع ركب · مشي خارجي · تسلّق الجبل |
| حركية وإحماء | 4 | `leg-swings` · `shoulder-dislocates` · `thoracic-rotation` · `ankle-mobility` |
| بطاقتا جهاز بلا رسم | 2 | `chest-press-machine` · `incline-chest-press-machine` |
| وزن حرّ/كيبل متخصّص | 18 | `pendlay-row` · `meadows-row` · `landmine-press` · `belt-squat` · `frog-pump` … |

**الاستنتاج (لا حقيقة مؤكَّدة):** مكتبة `yuhonas/free-exercise-db` العامّة — مصدر الـ121 لقطة كلّها —
لا تغطّي أجهزة الكارديو ولا دروب الحركية. **فالفجوة شكل المصدر، لا حذفٌ وقع.**
هذا اتّساق ملاحظ عبر الـ37، ولم أتحقّق من محتوى المكتبة المنبع مباشرة.

---

## ④ وجود الملفات على القرص — مانيفست ↔ قرص

### ٤-١ لا مدخل مانيفست يشير إلى ملف غير موجود

| الفحص | النتيجة |
|---|---|
| ملفات صور مُشار إليها من المانيفست | **265** (242 إطار stills + 23 رسمًا) |
| **مداخل تشير إلى ملف غير موجود** | **0** ✅ |

### ٤-٢ اليتامى — ملفات على القرص لا يشير إليها المانيفست

| المجلد | ملفات | مُشار إليها | **يتيمة** |
|---|---|---|---|
| `public/exercise-images/` | 250 | 242 | **8** |
| `public/exercise-machine-images/` | 25 | 23 | **2** |
| `public/exercise-gifs/` | 1 | 0 | **1** |

**قائمة اليتامى الكاملة:**

| الملف | التفسير | حكم |
|---|---|---|
| `/exercise-images/chest-press-machine/{0,1}.jpg` | **مسحوبة عمدًا** — الصورة كانت نسبةً خاطئة (محطة كيبل لا جهاز ضغط صدر). موثّق في `src/data/exercises.ts` قرب `PLACEHOLDER_ONLY_EXERCISE_IDS` | 🟢 مقصود · يُحذف مع تنظيف |
| `/exercise-images/incline-machine-press/{0,1}.jpg` | نفس السبب (رجل على بنش مائل يسحب كيبل) | 🟢 مقصود |
| `/exercise-images/adduction-machine/{0,1}.jpg` | معرّف قديم لا يقابله مدخل مانيفست | 🟡 يحتاج تفسيرًا |
| `/exercise-images/low-row-machine/{0,1}.jpg` | معرّف قديم لا يقابله مدخل مانيفست | 🟡 يحتاج تفسيرًا |
| `/exercise-machine-images/pec-deck-machine.svg` | `pec-deck-machine` حصل على **لقطتين فوتوغرافيتين** (`/exercise-images/pec-deck/{0,1}.jpg`) فتقاعد رسمه | 🟢 مقصود · **لكن ما زال في `machineImages.ts`** فيدخل عدّ الحقوق (24 لا 23) |
| `/exercise-machine-images/.gitkeep` · `/exercise-gifs/.gitkeep` | حرّاس مجلدات | 🟢 لا شيء |

> **الأثر العملي:** ~1.1 ميغابايت من الصور المسحوبة ما زالت تُشحن في `public/`. **لا تصل مستخدمًا**
> (المانيفست لا يشير إليها والـ`placeholderOnly` يمنعها)، لكنها تكبّر الحزمة وتضلّل من يعدّ الملفات.

---

## ⑤ محتوى التدريب AR/EN — التغطية بالأرقام

### ٥-١ الجدول الكامل (من `exercises` + `exerciseGuidance` + `coaching/cues`)

| الحقل | عربي | إنجليزي | ملاحظة |
|---|---|---|---|
| **الاسم** (`nameAr`/`nameEn`) | **181 / 181** | **181 / 181** | ✅ تكافؤ تام |
| **العضلة الأساسية** (`primaryMuscle`) | **181 / 181** | — | مشترك · تسمية من `muscleLabels` |
| **العضلات التفصيلية** (`primaryMusclesDetailed`) | **169 / 181** | — | ⚠️ **12 فارغة** — كلّها كارديو |
| العضلات الثانوية التفصيلية | 84 / 181 | — | 97 بلا ثانوية (كثير منها مقصود) |
| **العدّة** (`equipment`) | **181 / 181** | — | مشترك |
| **الملاحظات** (`notesAr`/`notesEn`) | **7 / 181** | **0 / 181** | 🔴 `notesEn` صفر مطلق |
| **خطوات الأداء** (cue `steps`) | **181 / 181** | **181 / 181** | ✅ من `EXERCISE_CUES` / `EXERCISE_CUES_EN` |
| **الأخطاء الشائعة** (cue `mistakes`) | **181 / 181** | **181 / 181** | ✅ |
| **السلامة** (cue `safety`) | **181 / 181** | **181 / 181** | ✅ |
| **نقاط التكنيك** (`techniqueTips*`) | **181 / 181** | **0 / 181** | 🔴 **الفجوة الحيّة** |
| `howToEn` مؤلَّف | — | **0 / 181** | مغطّى الآن بـcue |
| `techniqueTipsEn` مؤلَّف | — | **0 / 181** | **غير مغطّى** |
| `commonMistakesEn` مؤلَّف | — | **0 / 181** | مغطّى بـcue |
| `safetyNotesEn` مؤلَّف | — | **0 / 181** | مغطّى بـcue |
| استخدام `FALLBACK_CUE` العامّ | **0 / 181** | **0 / 181** | ✅ لا تمرين يسقط للنصّ العامّ |

**الـ12 بلا عضلات تفصيلية (كلها `cardio`):**
`treadmill-run` · `stationary-bike` · `rowing-machine` · `elliptical` · `jump-rope` · `incline-treadmill-walk` ·
`stairmaster` · `burpees` · `high-knees` · `battle-ropes` · `assault-bike` · `outdoor-walk`
⇒ خريطة العضلات في بطاقاتها **تُرسم فارغة**، وهي نفسها الـ12 المفقودة الصور. **بطاقة عارية تمامًا.**

### ٥-٢ 🔴 الفجوة الحيّة: «Technique tips» فارغة في 181/181 بالإنجليزية

محاكاة `AboutTab` (`src/components/ExerciseDetail.tsx:187-197`) بنفس منطقها لكل تمرين:

| الكتلة | عربي | **إنجليزي** |
|---|---|---|
| «كيف تؤديه» / How to perform | 0 / 181 فارغة | **0 / 181 فارغة** ✅ |
| **«نصائح تقنية» / Technique tips** | 0 / 181 فارغة | 🔴 **181 / 181 فارغة** |
| «أخطاء شائعة» / Common mistakes | 0 / 181 فارغة | **0 / 181 فارغة** ✅ |
| «سلامة» / Safety | 0 / 181 فارغة | **0 / 181 فارغة** ✅ |

النصّ الظاهر: `libraryStrings.en.guidanceUnavailable` = **"English guidance for this exercise is not available yet."**

**السلسلة السببية بالسطر:**

```
src/components/ExerciseDetail.tsx:195   const tips = g.tips        ← وحدها بلا احتياطي cue
src/lib/exerciseGuidance.ts:523         tips: getTechniqueTips(ex, 'en')
src/lib/exerciseGuidance.ts:161-164     if (exercise.techniqueTipsEn?.length) return exercise.techniqueTipsEn
                                        if (getExercise(exercise.id)) return []   ← يعيد [] لكل الـ181
```

الأسطر الثلاثة الأخرى (`howTo` · `mistakes` · `safety`) تحمل احتياطي `cue.*` فتنجو؛ و`tips` لا نظير لها في
`ExerciseCue` (بنيته `steps` · `mistakes` · `safety` فقط) فتبقى عارية.

**المفارقة الحاكمة:** `TECHNIQUE_BY_PATTERN_EN` **مؤلَّفة بالكامل** (10 أنماط × 3 نقاط) في
`src/lib/exerciseGuidance.ts:95-105`، **وغير قابلة للوصول لأي تمرين كتالوج** — الشرط `if (getExercise(id)) return []`
يسبقها دائمًا. **محتوى إنجليزي مكتوب ومُختبَر يقف خلف سطرٍ لا يمرّره.**

**والأهمّ — تكافؤ لا ترجمة مخترعة:** حسبتُ العربية مقابل مولّدها العامّ:

> **181 من 181** من قيم `techniqueTipsAr` هي **حرفيًا** ناتج `[«ركّز على {عضلة} طوال الحركة.», ...TECHNIQUE_BY_PATTERN[نمط].slice(0,2)]`
> — أي **صفر تمرين** يحمل نقاط تكنيك عربية مؤلَّفة خصّيصًا له.

فالعربي يرى **النصّ العامّ حسب نمط الحركة**، والإنجليزي يُمنع من رؤية **توأمه الإنجليزي المؤلَّف**.
الحاجز ليس «لا نخترع ترجمة» — الطرفان عامّان بالتساوي. **الحاجز سطر واحد.**

### ٥-٣ هل توجد مجموعة إرشاد إنجليزي معتمدة غير موصولة؟

| البحث | النتيجة |
|---|---|
| `EXERCISE_CUES_EN` (181 مدخلًا · 162 كيلوبايت) | **موجودة و<u>موصولة</u>** على هذا الفرع — `getCue(id,'en')` تصلها من `ExerciseDetail.tsx:193` |
| `git log --all` على `exerciseCuesEn.generated.ts` | التزام واحد: `a806db6` «إرشاد إنجليزي مؤلَّف لكل ١٨١ تمرينًا — كان صفرًا» |
| `git branch --contains a806db6` | **7 فروع `codex/*` و`o/*` — و`main` ليست منها** |
| بحث كل المراجع عن `howToEn: [` بمحتوى | **صفر** — لا فرع يحمل بيانات `howToEn` مؤلَّفة |
| بحث كل المراجع عن `techniqueTipsEn: [` | **صفر** |
| `claude/p14-english-content-completion` | يحمل إثباتات اللغة لا بيانات إرشاد لكل تمرين |

**الحكم:** لا توجد مجموعة إرشاد إنجليزي «معتمدة ومهجورة» في مكان آخر. الموجود مجموعتان:
مجموعة `EXERCISE_CUES_EN` **موصولة أصلًا** هنا (وغائبة عن `main`)، وجداول الأنماط الإنجليزية `*_BY_PATTERN_EN`
**داخل `exerciseGuidance.ts` نفسه**، محجوبة بشرطٍ واحد.

### ٥-٤ ⚠️ البوابات تُثبِّت الفراغ لا تكشفه

| البوابة | ما تؤكّده |
|---|---|
| `test:guidance-honesty` (4 فحوص · خضراء) | «**Guidance returns empty English content for known catalog items**» — تُثبت الفراغ عمدًا |
| `test:english-content` (91 فحصًا · خضراء) | «التمرين الحقيقي بلا إنجليزي مؤلف لا يتلقى ترجمة مخترعة» + تكافؤ أعداد جداول الأنماط |
| `test:coaching` (38 · خضراء) · `test:exercise-production` (65 · خضراء) · `test:media-rights` · `test:exercise-media` · `test:media-pipeline` (15) | كلها خضراء |

**كل البوابات خضراء وكتلة كاملة من الشاشة الإنجليزية فارغة في 181/181.** البوابة لا تكذب — تحرس عقدًا
(«لا ترجمة مخترعة») لا **تجربة** («المستخدم الإنجليزي يرى محتوى»). **فجوة تعريف، لا فجوة تنفيذ.**

---

## ⑥ الوصل الحيّ — إثبات المسار

### ٦-١ سلسلة الوصول

| # | الحلقة | الملف:السطر | الحالة |
|---|---|---|---|
| 1 | تعريف المسار `'exercises'` | `src/lib/appRoutes.ts:17,53` | ✅ |
| 2 | رابط عميق `#/exercises/<id>` | `src/lib/appRoutes.ts:100,117,124` | ✅ يصمد على إعادة التحميل |
| 3 | استيراد كسول | `src/App.tsx:25-26` `lazy(() => import('@/views/ExerciseLibraryView'))` | ✅ |
| 4 | التركيب | `src/App.tsx:582-586` `{view === 'exercises' && <V.ExerciseLibraryView lang={LANG} />}` | ✅ |
| 5 | فتح التفصيل | `src/views/ExerciseLibraryView.tsx:283` `<ExerciseDetail …>` | ✅ |
| 6 | بطاقة التفصيل | `src/components/ExerciseDetail.tsx:38` `export function ExerciseDetail` | ✅ 4 تبويبات |

**الحكم: `ExerciseLibraryView` → `ExerciseDetail` مسار حيّ مركَّب ومطروق. لا توأم ميت لهما.**

### ٦-٢ هل يقرأ التفصيل المانيفست والإرشاد؟

| ما يُقرأ | الملف:السطر | المصدر |
|---|---|---|
| **الفيديو المعتمد** | `ExerciseDetail.tsx:17` استيراد · `:444` `approvedVideoFor(exerciseId)` · `:447` `videoEmbedUrl` | ✅ **المانيفست الإنتاجي** |
| **الإرشاد العامّ** | `ExerciseDetail.tsx:11,187` `guidanceFor(ex, lang)` | ✅ يمرّر اللغة |
| **الإرشاد المؤلَّف** | `ExerciseDetail.tsx:12,193` `getCue(ex.id, lang)` | ✅ **يمرّر اللغة** — إصلاح على هذا الفرع، غائب عن `main` |
| **صورة البطاقة في القائمة** | `ExerciseLibraryView.tsx:16,385,388` `approvedImageFor` / `productionEntryFor` | ✅ **المانيفست الإنتاجي** |
| ⚠️ **صورة رأس التفصيل** | `ExerciseDetail.tsx:115,182-183` → `ExerciseMedia` → `ExerciseMedia.tsx:4-6` | ❌ `exerciseMedia.ts` · `exerciseGifs.ts` · `machineImages.ts` **مباشرة** |

### ٦-٣ ⚠️ خرق العقد: مسار قراءة ثانٍ يتخطّى المانيفست

عقد `src/lib/exerciseProductionMedia.ts:2-4` نصًّا:

> «Screens call THESE functions. They must not reach into exerciseMedia / exerciseGifs / machineImages /
> Exercise.videoUrl directly any more.»

**`ExerciseMedia.tsx` — راسم رأس بطاقة التفصيل — يفعل ذلك بالضبط.** فحصتُ الأثر الفعلي:

| الفحص | النتيجة |
|---|---|
| تمارين غير معتمدة الصورة يرسم لها الرأس صورةً رغم ذلك | **0 / 37** ✅ |
| تمارين غير معتمدة تعطي حالة فراغ صادقة | **37 / 37** ✅ |

> **الحكم: خطر كامن لا عطل حيّ.** الطبقتان متّفقتان اليوم لأنهما وُلّدتا من نفس حالة القرص.
> لكن **الاتفاق مصادفة توليد لا ضمان بنيوي**: إضافة مدخل إلى `exerciseMedia.ts` بلا إعادة توليد المانيفست
> تُظهر للمستخدم صورةً **لم توقّع عليها بوابة الحقوق** — وهذا نصّ ما يمنعه العقد.
> البطاقة في القائمة أُصلحت بالفعل (تعليق `[FINAL-CONVERGENCE]` في `ExerciseLibraryView.tsx:375-384`
> يشرح أن `chest-press-machine` كان يُعرض من الطبقة القديمة رغم `MISSING`) — **والرأس لم يُصلَح بعد.**

### ٦-٤ توائم ومكوّنات مجاورة

| المكوّن | الحالة |
|---|---|
| `src/views/ExerciseLibraryView.tsx` | ✅ حيّ · مركَّب من `App.tsx:584` |
| `src/components/ExerciseDetail.tsx` | ✅ حيّ |
| `src/components/ExerciseMedia.tsx` | ✅ حيّ (لكن §٦-٣) |
| `src/components/ExerciseLibraryPicker.tsx` | ✅ حيّ — `StepWorkoutTemplate.tsx:196` ← `CustomizationCenter` ← `SetupView` |
| `src/features/customPlan/ExercisePickerSheet.tsx` | ✅ حيّ — `CustomPlanBuilder.tsx:305` ← `WorkoutView.tsx:491` |
| **`src/lib/exerciseMediaPipeline.ts`** | 🪦 **ميت** — صفر مستورد في `src/`؛ يحرسه `test:media-pipeline` بـ15 فحصًا داخل البوابة |
| `src/data/exerciseMediaManifest.generated.ts` | 🪦 متجاوَز — يغذّي الطبقة الميتة أعلاه فقط |
| `src/views/WorkoutV2.tsx` | 🪦 غير مركَّب في `App.tsx` (المركَّب `WorkoutView`) — و`workoutV2Model.ts:78,105` يستدعي `getCue(ex.id)` **بلا لغة** ⇒ عربي دائمًا. خامد لأن الشاشة ميتة، ويصير عطلًا لحظة إحيائها. *(نطاق حارة H — للتوثيق لا للإصلاح هنا)* |

> **الاثنان معًا — `exerciseMediaPipeline` و`exerciseMediaManifest.generated`، معًا 71 كيلوبايت مصدرًا و15 فحص بوابة —
> ليسا مجرّد كودٍ ميت. هما مصدر الحقيقة الذي قرأه التقرير السابق فأنتج 25/35 بدل 23/37.**

---

## ⑦ ATHLEAN-X — الحالة والحقوق

ثلاثة مداخل تخصّ القناة في `src/data/exerciseVideoRegistry.ts`:

| # | التمرين | الحالة | معرّف الفيديو | العنوان (بيانات مراجعة لا نصّ واجهة) |
|---|---|---|---|---|
| 1 | `face-pull` (سحب للوجه كيبل) | 🔴 **NEEDS_REVIEW** · `youtubeVideoId: null` | محفوظ في الملاحظة: `ljgqer1ZpXg` | "STOP F*cking Up Face Pulls (PROPER FORM!)" |
| 2 | `arnold-press` (ضغط أرنولد) | 🔴 **NEEDS_REVIEW** · `youtubeVideoId: null` | محفوظ في الملاحظة: `ris9tKqMwgU` | "Stop F*cking Up The Arnold Press (PROPER FORM!)" |
| 3 | `ab-wheel-rollout` (دولاب البطن) | 🟢 **APPROVED** · `high` | `5I3LgiumTJM` | "The Ultimate Ab Rollout Progression (BEGINNER TO ADVANCED!)" |

**الطبيعة الدقيقة للحجز (`exerciseVideoRegistry.ts:476` و`:1268`):**

> «**HELD FOR FOUNDER DECISION (tone, not accuracy)**» — الفيديو المُتحقَّق منه **أفضل مصدر تقني** للحركة،
> لكن عنوانه على يوتيوب يحمل **لفظًا بذيئًا مُرقَّبًا**. قِمّة عربية أولًا وموجّهة للعائلة، والنقر يكشف العنوان.
> **المعرّف محفوظ للاستعادة بسطر واحد إن اعتُمد.**

**حالة الحقوق:** لا إشكال حقوق إطلاقًا في الثلاثة. **لا يُنزَّل ولا يُعاد استضافة أي فيديو** — مراجع فقط،
تُضمَّن على `youtube-nocookie.com` بعد نقرة المستخدم. `ab-wheel-rollout` معتمد لأن ATHLEAN-X **على قائمة المصادر
المعتمدة**، والحاجز على الاثنين الآخرين **نبرة عنوان فقط**.

**رابع ذو صلة — `bulgarian-split-squat`** (`exerciseVideoRegistry.ts:707`): مرجع ATHLEAN-X أعلى سلطة
(`hiLF_pF3EJM`) **رُفض لنفس سبب النبرة** وشُحن بديل نظيف العنوان من `Colossus Fitness` (`HBYGeyb4sSM`, medium).
**فالقرار كلّف ثقة مطابقة من `high` إلى `medium` على تمرين واحد على الأقل.**

**الأدلّة الكاملة:** `scripts/exercise/video-research.json:522,1107,1458` — ومعها نصّ تحقّق oEmbed لكل معرّف.
**التوثيق:** `docs/execution/qimmah-postweb/exercise/DEPENDENCIES.md` §D-4 · `EXERCISE-PRODUCTION-REPORT.md` §٤-٥.

**القرار المطلوب من المؤسس (ثلاثة خيارات، لا رابع):**
1. **استعادة الاثنين** — سلطة القناة تفوز؛ `159 → 161` معتمدًا؛ المستخدم قد يرى العنوان بعد النقر.
2. **إبقاء الحجز** — النبرة تفوز؛ التمرينان بلا فيديو؛ والقرار مُعلَن موثّق (الوضع الحالي).
3. **بحث بديل نظيف العنوان** لكل منهما — كلفة بحث، ونتيجة `medium` غالبًا كما حدث في `bulgarian-split-squat`.

---

## ⑧ الوثيقة المودَعة `FOUNDER-MEDIA-GAPS.md` — تدقيق

`docs/execution/qimmah-canonical-launch/FOUNDER-MEDIA-GAPS.md` (46 سطرًا · أُودعت في `740023b`)

| البند في الوثيقة | ما تقوله | **المُحتسَب** | الحكم |
|---|---|---|---|
| ① صور مفقودة | **35** — والقائمة فيها 35 معرّفًا | **37** | ❌ **تُسقِط `chest-press-machine` و`incline-chest-press-machine`** |
| ② فيديو NEEDS_REVIEW | 22 — والقائمة 22 معرّفًا | **22** | ✅ مطابقة تامّة معرّفًا بمعرّف |
| ③ إرشاد عربي مؤلَّف | ١٨١ / ١٨١ | 181/181 لخطوات وأخطاء وسلامة | ✅ |
| ③ إرشاد إنجليزي مؤلَّف | ١٨١ / ١٨١ | 181/181 لخطوات وأخطاء وسلامة · **0/181 لنقاط التكنيك** | ⚠️ **صحيح جزئيًا — يُقرأ كتغطية تامّة وليست تامّة** |
| ③ فيديو معتمد | 159 / ١٨١ | 159 | ✅ |
| ③ صور فوتوغرافية | ١٢١ · `Unlicense` | 121 | ✅ |
| ③ بطاقات أجهزة SVG | **٢٥** | **23** معتمدة (24 ملفًا · 24 مدخلًا في `machineImages.ts`) | ❌ |

**الوثيقة تعلن «كل رقم هنا مقروء من البيانات، لا مُدَّعى» — وهو صحيح، لكنّها قرأت الطبقة الوسيطة المتقاعدة.**
تصحيحها = تغيير رقمين وإضافة معرّفين، وتوضيح أن التغطية الإنجليزية 3 كتل من 4.

---

## ⑨ حالة البوابات — كل ما شُغّل هنا (للقراءة فقط)

| البوابة | الأمر | النتيجة |
|---|---|---|
| جاهزية مكتبة التمارين | `node scripts/exercise/run-exercise-production-proof.mjs` | ✅ **65 فحصًا · 0 فشل** |
| حارس وسائط التمارين | `node scripts/media/exercise-media-audit.mjs --check` | ✅ لا أصل مُشار إليه ومفقود |
| المحتوى الإنجليزي | `node scripts/run-english-content-proof.mjs` | ✅ **91 نجح · 0 فشل** |
| طبقة التدريب | `node scripts/coaching/run-coaching-proof.mjs` | ✅ **38 فحصًا** |
| صدق الإرشاد | `node scripts/run-guidance-honesty-proof.mjs` | ✅ **4 فحوص** |
| كتالوج الوسائط (الطبقة الميتة) | `node scripts/run-media-pipeline-proof.mjs` | ✅ **15 فحصًا** |

كلها تكتب في `tmpdir()` حصرًا — **لم يُعدَّل أي ملف في المستودع.**

---

## ⑩ الفجوات مرتّبة — وما تلمسه كل معالجة

| # | الفجوة | الخطورة | الملفات التي يلمسها الإصلاح |
|---|---|---|---|
| **1** | كل الطبقة (مانيفست + سجلّ فيديو + إرشاد إنجليزي) **غير موجودة على `main`** — 156 التزامًا | 🔴 **P0** | قرار دمج/ترقية — **بيد المؤسس حصرًا** (§1 من الميثاق). لا ملفات. |
| **2** | «Technique tips» فارغة في **181/181** بالإنجليزية (الأربع كلّها على `main`) | 🔴 **P1** | `src/lib/exerciseGuidance.ts:161-164` (أو `src/components/ExerciseDetail.tsx:195`) · وتحديث `scripts/run-guidance-honesty-proof.mjs` + `scripts/english-content-proof.ts` لأن الفحص الحالي **يؤكّد الفراغ** |
| **3** | **37 تمرينًا** بلا أي صورة — أغلبها كارديو وحركية | 🟠 P2 | `src/data/exerciseMedia.ts` أو `src/data/machineImages.ts` + إعادة توليد `exerciseProductionManifest.generated.ts` عبر `npm run build:exercise-production-manifest` + `scripts/media/provenance-manifest.json` |
| **4** | **22 فيديو** NEEDS_REVIEW (منها قرار ATHLEAN-X المعلَّق) | 🟠 P2 | `scripts/exercise/video-research.json` → `npm run build:exercise-video-registry` → `src/data/exerciseVideoRegistry.ts` → إعادة توليد المانيفست |
| **5** | رأس التفصيل يتخطّى المانيفست (خطر كامن) | 🟠 P2 | `src/components/ExerciseMedia.tsx` — تحويلها إلى `approvedImageFor` على نمط `ExerciseLibraryView.tsx:385` |
| **6** | `FOUNDER-MEDIA-GAPS.md` يقول 35/25 بدل 37/23 | 🟡 P3 | `docs/execution/qimmah-canonical-launch/FOUNDER-MEDIA-GAPS.md` |
| **7** | **12 تمرين كارديو** بلا `primaryMusclesDetailed` ⇒ خريطة عضلات فارغة | 🟡 P3 | `src/data/exercises.ts` — خريطة `muscleDetailById` |
| **8** | 23 رسمًا معتمدًا بـ`imageSource/imageLicense = null` في المانيفست الإنتاجي | 🟡 P3 | `scripts/exercise/build-exercise-production-manifest.ts` — نقل حكم `IN-HOUSE` من سجلّ الحقوق |
| **9** | 11 ملفًا يتيمًا في `public/` (~1.1 ميغابايت) + `pec-deck-machine` في `machineImages.ts` بلا استعمال | 🟡 P3 | `public/exercise-images/{adduction-machine,chest-press-machine,incline-machine-press,low-row-machine}/` · `public/exercise-machine-images/pec-deck-machine.svg` · `src/data/machineImages.ts` · `scripts/media/provenance-manifest.json` (العدّ 274) |
| **10** | طبقة ميتة تُحرَس بـ15 فحص بوابة وتضلّل التقارير | 🟡 P3 | `src/lib/exerciseMediaPipeline.ts` · `src/data/exerciseMediaManifest.generated.ts` · `scripts/media-pipeline-proof.ts` · بند `test:media-pipeline` في `package.json` |
| **11** | `notesEn` صفر في 181/181 | 🟢 P4 | `src/data/exercises.ts` |
| **12** | `workoutV2Model.ts:78,105` يستدعي `getCue` بلا لغة (شاشة ميتة) | 🟢 P4 | نطاق حارة H — توثيق فقط |

### ⚠️ ما لا يجوز فعله بلا قرار مؤسس

- **الفجوتان 3 و4 محتوى لا كود.** ملء 37 صورة و22 فيديو **قرار مصدر ومراجعة**، لا موجة برمجية.
- **الفجوة 2 تمسّ عقدًا معلَنًا.** «لا ترجمة مخترعة» قرار موثّق يحرسه إثباتان.
  الإصلاح المقترح **لا يخرقه** (الجداول الإنجليزية مؤلَّفة والعربية عامّة بالتساوي) لكنه **يغيّر عقدًا مكتوبًا**
  ⇒ **يُرفع ولا يُنفَّذ اجتهادًا** (§7 من الميثاق).
- **الفجوة 9 حذف ملفات** ⇒ يُعرض الأمر ويُنتظر الموافقة.

---

## ⑪ تمييز الثقة (§10 من الميثاق)

**حقائق مؤكَّدة — محسوبة من الكود المُنفَّذ:**
181 تمرينًا · 144 صورة معتمدة (121 + 23) · 37 مفقودة · 159 فيديو معتمدًا · 22 NEEDS_REVIEW ·
0 مدخل مانيفست بلا ملف · 11 ملفًا يتيمًا · 181/181 تغطية cue بالعربية والإنجليزية ·
0/181 لكل حقول `*En` المؤلَّفة على التمارين · 181/181 كتلة «Technique tips» فارغة بالإنجليزية ·
181/181 نقاط تكنيك عربية = النصّ العامّ · 12 تمرينًا بلا عضلات تفصيلية · `main` متأخّرة 156 التزامًا وبلا الملفات الثلاثة.

**استنتاجات:**
فجوة الصور الـ37 تعكس شكل `free-exercise-db` لا حذفًا (اتّساق ملاحظ عبر الـ37، بلا فحص المنبع) ·
التقرير السابق قرأ الطبقة الوسيطة (تطابق 25/35 معها تامّ) · خرق العقد في `ExerciseMedia.tsx` كامن لا حيّ (0/37 اليوم).

**افتراضات — لم تُفحص هنا:**
سلوك المتصفح الفعلي لم يُشغَّل (لا خادم تطوير في هذه الحارة) — كل استنتاجات الشاشة من محاكاة منطق
`AboutTab` بنفس أسطره · لم أفتح أي وسيط ولم أنزّل شيئًا · صحّة الوسائط بصريًا (هل الصورة تطابق الحركة)
خارج نطاق هذا الفحص، وقد سبق أن كشفت مراجعة بصرية نسبتين خاطئتين سُحبتا.
