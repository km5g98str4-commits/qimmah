# حزمة المتجر وTestFlight — قِمّة / Store & TestFlight Pack — Qimmah

> **المهمة الثانية — غرفة الإطلاق والامتثال.** نصوص جاهزة للّصق في App Store Connect: الأوصاف · كلمات ASO · نصوص اللقطات · ملاحظات المراجع · حزمة TestFlight.
>
> **الهوية:** «درّب بوضوح. تقدّم بثقة.» · **اللغتان:** كل نص بالعربية والإنجليزية.
>
> **النبرة — محدَّثة على [CTO-17]:** نصوص المتجر **تسويق**، فسجلّها **عامية بيضاء دافئة** (عربي) و**إنجليزي ودود غير رسمي**. حُوِّلت كل النصوص المعروضة للمستخدم في هذه الحزمة.
>
> **استثناءان يبقيان بلا تحويل، بقصد:**
> - **§٤ ملاحظات App Review** — مخاطَبة مهنية لمراجع Apple، لا نصّ مستخدم. تبقى إنجليزية رسمية.
> - **سطر العلامة «درّب بوضوح. تقدّم بثقة.»** — علامة معتمدة، وأفعال أمر تعمل في السجلّين. لا تُمسّ.

**تاريخ الإصدار:** 2026-07-30 · **أساس التحقّق:** `chore/proof-exclusions-doc` @ `9dbb541` · **مكمّلة لـ:** [`APPSTORE-COMPLIANCE-PACK.md`](../legal/APPSTORE-COMPLIANCE-PACK.md)

---

## 0. علاقتها بحزمة المتجر القائمة

`docs/appstore/` يحوي حزمة جيدة (`01-naming` … `08-app-preview-storyboard`) **أبني عليها ولا أكرّرها**:

| الملف القائم | الحكم |
|---|---|
| `01-naming.md` | **سليم ويُعتمد كما هو.** الاسم والعنوان الفرعي والنص الترويجي وكلمات المفتاح مدروسة بحدود أحرف محقّقة. §٢ و§٣ أدناه يوسّعانه (نسخة إنجليزية كاملة + بنك كلمات خليجي)، ولا ينقضانه. |
| `02-description.md` | **سليم في العربية.** §١ أدناه يضيف النسخ الناقصة (قصيرة، TestFlight) ويصحّح سطرين تقادما. |
| `03-age-rating.md` | **سليم منهجيًا، وبند واحد فيه تقادم:** يقول «الحد الأدنى في الإعداد ١٢» (سطر ٦٨) — والمدقّق يفرض ١٣. مربوط بـ«ه-١». |
| `04-screenshots.md` | **سليم تقنيًا** (١٣٢٠×٢٨٦٨ محقّق). §٤ أدناه يوسّع الستّ لقطات إلى **ثماني** تحكي رحلة. |
| `05-reviewer-notes.md` | ⚠️ **يُستبدل بالكامل.** يقول للمراجع «الإذن الوحيد هو الكاميرا» والتطبيق يشحن ثلاثة أذونات. §٥ أدناه بديله. |

---
---

# ١ · أوصاف التطبيق

## ١-أ · الوصف الكامل — العربية (حقل Description، الحد ٤٠٠٠ حرفًا)

```
درّب بوضوح. تقدّم بثقة.

قِمّة يجمع تمرينك وتغذيتك وقياساتك وتقدّمك في تطبيق عربي واحد يشتغل على جهازك أول. خطتك تنبني من
إعدادك أنت — هدفك، وجسمك، ووقتك — بخطوات واضحة وأرقام صادقة، بلا وعود مبالغ فيها.

تمارينك
خطة تنبني لك تلقائيًا من إعدادك، ووضع تمرين مباشر يسجّل أوزانك وتكراراتك مع مؤقّت راحة ويرصد
أرقامك القياسية. اختر من مكتبة تمارين مصوّرة، أو ابنِ خطتك بنفسك، وتابع تغطية عضلاتك كل أسبوع.
تبي نسخة الأجهزة؟ بدّلها بضغطة.

تغذيتك
أهداف سعرات وماكروز محسوبة من ملفك، وتسجيل وجبات سريع من قاعدة أطعمة واسعة فيها أكلات سعودية.
امسح باركود المنتج بالكاميرا ويتسجّل عندك، وتابع ماءك اليومي.

تقدّمك
سجّل وزنك وقياساتك وشوف اتجاهك في رسم واضح. تابع تطوّر قوّتك وأرقامك القياسية، واجمع الأوسمة
والسلاسل اللي تعكس التزامك.

حركتك وعافيتك
اربط تطبيق الصحة ويقرأ قِمّة خطواتك ونومك وقياساتك — بموافقتك، وقراءة فقط — فما تعيد إدخال شي
سجّلته أجهزتك. وتابع مكمّلاتك وأدويتك في مكان واحد (للمتابعة فقط، مو نصيحة طبية). وفعّل تذكير
محلي يخلّيك على المسار.

يومك
شاشة «اليوم» تعطيك خطوتك الجاية ومسار يومك بلمحة، ومعها قائمة مهامك.

خصوصيتك أول
بلا إعلانات، وبلا تتبّع. بياناتك محفوظة على جهازك أول؛ والمزامنة السحابية اختيارية وما تشتغل إلا
إذا سجّلت دخولك. وتقدر تصدّر بياناتك أو تحذف حسابك وكل بياناته من داخل التطبيق في أي وقت.

أرقام صادقة
اللي يعرضه قِمّة من سعرات واحتياج يومي وتقديرات هو تقريب محسوب من مدخلاتك، مو قياس طبي ولا
تشخيص. التطبيق أداة تنظيم ومتابعة، ومو بديل عن المختص. وللمستخدمين دون ١٨ سنة الأهداف تقتصر
على المحافظة.

قِمّة عربي أول، ومعه الإنجليزي.

قِمّة+ (لاحقًا): خطط وتحليلات أعمق — والأساسيات تبقى مجانية.
```

> **ما تغيّر عن `02-description.md`:** فقرة «حركتك وعافيتك» كانت تقول «سجّل خطواتك اليومية» فقط — وهو وصف ناقص لتطبيق يقرأ ٢٤ مقياسًا من HealthKit؛ الوصف الآن يذكر الربط والقراءة-فقط والموافقة. وأُضيفت فقرة «أرقام صادقة» — تحمل التحفّظ الطبي وقيد القاصرين، ويقرأها المراجع قبل أن يبحث عنها.

## ١-ب · Full description — English

```
Train with clarity. Progress with confidence.

Qimmah pulls your training, nutrition, measurements, and progress into one Arabic-first app that
lives on your phone. Your plan gets built from your own setup — your goal, your body, your schedule —
in clear steps with honest numbers, no big promises.

Your training
A plan built automatically from your setup, plus a live workout mode that logs your weights and reps
with a rest timer and keeps an eye on your PRs. Pick from an illustrated exercise library, or build
your own plan, and watch your muscle coverage week by week. Want the machines version? One tap.

Your nutrition
Calorie and macro targets worked out from your profile, and quick meal logging from a big food
database with Saudi dishes in it. Scan a product barcode with the camera and it lands in your log.
Track your water while you're at it.

Your progress
Log your weight and measurements and see where you're heading on a clear chart. Follow your strength
gains and PRs, and collect the medals and streaks that show you kept at it.

Movement & wellness
Connect the Health app and Qimmah reads your steps, sleep, and measurements — with your permission,
read-only — so you're not retyping what your devices already recorded. Keep your supplements and
medications in one place (tracking only — not medical advice). Turn on a local reminder to stay on it.

Your day
The "Today" screen gives you your next step and how your day is going at a glance, plus your to-do list.

Privacy first
No ads, no tracking. Your data sits on your phone first; cloud sync is optional and only runs if you
sign in. You can export your data, or delete your account and everything in it, right from the app.

Honest numbers
The calories, daily needs, and estimates Qimmah shows are worked out from what you enter — they're not
a medical measurement or a diagnosis. It's a tracking and organising tool, not a replacement for a
professional. For users under 18, goals stay on maintenance.

Qimmah is Arabic-first, with English right there too.

Qimmah+ (later): deeper plans and insights — the essentials stay free.
```

## ١-ج · الوصف القصير

> **ملاحظة تقنية:** App Store **لا يملك حقل «وصف قصير»** — ذاك حقل Google Play. أقرب ما يقابله: **Subtitle** (٣٠ حرفًا) و**Promotional Text** (١٧٠). سلّمتُ الاثنين، وأضفت نسخة ٨٠ حرفًا صالحة لمتجر Play مستقبلًا ولبطاقات المشاركة.

| الاستخدام | العربية | English |
|---|---|---|
| **Subtitle** (≤٣٠) | `درّب بوضوح. تقدّم بثقة.` (٢٣) | `Train clearly. Progress surely.` (31 → **trim**) · بديل: `Train with clarity.` (19) |
| **قصير ~٨٠** | `تمارين وتغذية وتقدّم بالعربية — على جهازك أول، بلا إعلانات ولا تتبّع.` (٦٧) | `Arabic-first workouts, nutrition, and progress. On your phone. No ads, no tracking.` (83) |

> ⚠️ العنوان الفرعي الإنجليزي `Train clearly. Progress surely.` = ٣١ حرفًا، **فوق الحد بحرف واحد**. البديل المعتمد: `Train with clarity.` (١٩) أو `Train clearly, progress surely` (٣٠ — بلا نقطة ختامية). **يُعدّ في عدّاد ASC قبل الحفظ.**

## ١-د · النص الترويجي (≤١٧٠، يُعدَّل بلا بناء جديد)

**العربية — معتمد (١٤٠):**
```
درّب بوضوح. تقدّم بثقة. قِمّة يجمع تمارينك وتغذيتك وقياساتك وتقدّمك في تطبيق عربي واحد يشتغل على جهازك — بخطوات واضحة، بلا إعلانات ولا تتبّع.
```

**English (150):**
```
Train with clarity. Progress with confidence. Qimmah pulls your training, nutrition, measurements, and progress into one Arabic-first app on your phone — no ads, no tracking.
```

**بدائل للتدوير** (موسمية أو عند إبراز ميزة):

| # | العربية | English |
|---|---|---|
| ب | جديد: امسح باركود المنتج وسجّل وجبتك بثانية. تابع تمرينك وخطواتك وقياساتك — كله بالعربية، وكله على جهازك أول. | New: scan a product barcode and log your meal in a second. Track your training, steps, and measurements — Arabic-first, on your phone. |
| ج | اربط تطبيق الصحة مرّة، وخلّ خطواتك ونومك وقياساتك توصل لحالها. قراءة فقط، بموافقتك، وبلا مشاركة. | Connect the Health app once and let your steps, sleep, and measurements show up on their own. Read-only, with your permission, never shared. |
| د | خطتك تنبني من إعدادك: تمارين، وسعرات، ومكمّلات، وتذكيرات. وشوف تقدّمك بلغة صادقة بلا وعود مبالغ فيها. | Your plan gets built from your setup: workouts, calories, supplements, reminders. See your progress in honest language, not promises. |

---
---

# ٢ · كلمات ASO — السعودية والخليج

## ٢-أ · حقل Keywords (١٠٠ حرفًا، فواصل بلا مسافات)

**المعتمد للمتجر العربي — ٨٤ حرفًا (من `01-naming.md`، محقّق ومُقرّ):**
```
تمرين,لياقة,تغذية,نادي,جيم,سعرات,رجيم,عضلات,دمبل,وزن,بروتين,gym,workout,fitness,diet
```

**١٦ حرفًا شاغرة** — الترشيح لملئها، مرتّبًا بالقيمة:

| المرشّح | الأحرف | لماذا |
|---|---|---|
| `,باركود` | ٧ | ميزة حقيقية، ونية بحث عالية التحويل، ومنافسة منخفضة في السوق العربي |
| `,مكملات` | ٧ | ميزة حقيقية وبحث خليجي ثابت |
| `,رشاقة` | ٦ | مرادف واسع، يميل لجمهور أنثوي أغفلته القائمة |
| `,ماكروز` | ٧ | مصطلح خليجي شائع بين المتمرّنين |

**التوصية:** `,باركود,رشاقة` (١٣ حرفًا → المجموع ٩٧). الباركود يلتقط نية عالية، ورشاقة توسّع الجمهور. **يُعاد العدّ في عدّاد ASC — التشكيل يُحسب حرفًا عند Apple.**

## ٢-ب · حقل Keywords للمتجر الإنجليزي (إن فُعّل)

```
workout,gym,fitness,nutrition,calories,macros,tracker,strength,barcode,protein,arabic,saudi,health
```
٩٧ حرفًا. `arabic` و`saudi` مقصودتان: المغترب الباحث عن تطبيق بلغته يكتبهما.

## ٢-ج · بنك المصطلحات — سلوك البحث الخليجي

> لا يُلصق كما هو. مرجع للتدوير بعد أول بيانات ASO حقيقية.

**عربي فصيح (عمود الفقرات):** تمرين · تمارين · لياقة · تغذية · سعرات · حريرية · عضلات · وزن · رجيم · بروتين · مكملات · قياسات · تقدّم · خطة · رشاقة · صحة · نادي · جيم · باركود · ماكروز · دهون · كتلة

**عامّي خليجي (يُكتب في البحث ولو لم يُكتب في الواجهة):** نحافة · تنشيف · تضخيم · بلك · كارديو · حديد · ترينر · دايت · كوتش

> **تمييز حاكم:** «تنشيف» و«تضخيم» و«بلك» كلمات **بحث** لا كلمات **واجهة**. نبرة التطبيق فصحى دافئة (§٦ من الميثاق)، وحقل الكلمات المفتاحية **لا يُعرض للمستخدم إطلاقًا** — فلا تعارض بين وضعها هناك وبين النبرة. لكن **لا تتسرّب إلى الوصف أو العنوان الفرعي**، فتلك نصوص مقروءة.
>
> ⚠️ **وقيد امتثال يسبق ذلك:** التطبيق **يحجب** التنشيف والتضخيم عمّن هم دون ١٨. استهدافهما في البحث مشروع (الأغلبية بالغة)، لكن **ممنوع أن يَعِد الوصف أو اللقطات بهدف يُحجب عن جزء من المستخدمين** بلا ذكر القيد. لذلك ذُكر القيد في فقرة «أرقام صادقة».

**إنجليزي يكتبه المستخدم الخليجي بحروف لاتينية:** gym · workout · fitness · diet · calories · macros · protein · tracker · strength · cutting · bulking · bodybuilding

**لا تُستخدم إطلاقًا** — تُسقط المراجعة أو تخالف الميثاق:
- أسماء منافسين (`MyFitnessPal`, `Fitbit`, `Nike`) — Apple ترفض علامات الغير.
- ادّعاءات طبية: `علاج` · `شفاء` · `حرق دهون مضمون` · `إنقاص الوزن السريع`.
- `مجاني` / `free` — Apple تعدّها حشوًا سعريًا.
- `الأفضل` / `رقم ١` / `best` — مبالغة مرفوضة في الميثاق وفي إرشادات Apple.

---
---

# ٣ · لقطات الشاشة — ثماني لقطات تحكي رحلة

المطلوب رحلة لا معرضًا. القوس: **يصل مشوّشًا ← يُعدّ مرّة ← يتمرّن ← يأكل ← يرى تقدّمه ← يثق بالأرقام ← يطمئن على بياناته.**

| # | الشاشة | العنوان (عربي) | Caption (English) | الحالة |
|---|---|---|---|---|
| ٠١ | Welcome (`StartViewV2`) | **درّب بوضوح. تقدّم بثقة.** | Train with clarity. Progress with confidence. | ✅ ملتقطة |
| ٠٢ | الإعداد — خطوة الجسد | **إعداد واحد، وخطتك جاهزة** | One setup, and your plan is ready | ⚠️ جديدة |
| ٠٣ | Today | **ابدأ يومك بخطوة واضحة** | Start your day with one clear step | ✅ ملتقطة |
| ٠٤ | Active Workout (داكن) | **سجّل كل مجموعة بثقة** | Log every set with confidence | ✅ ملتقطة |
| ٠٥ | Nutrition + الباركود | **امسح الباركود، وسجّل وجبتك** | Scan the barcode, log your meal | ⚠️ تُعاد |
| ٠٦ | Progress | **شوف تقدّمك بصدق** | See your progress, honestly | ✅ ملتقطة |
| ٠٧ | ربط تطبيق الصحة | **بياناتك توصل لحالها — بإذنك** | Your data shows up on its own — with your OK | ⚠️ جديدة |
| ٠٨ | الخصوصية والبيانات | **بياناتك على جهازك وبيدك** | Your data, on your phone, yours | ⚠️ جديدة |

**لماذا تغيّرت الستّ إلى ثماني:**
- **٠٢ (الإعداد)** — الرحلة تبدأ بـ«ماذا يُطلب مني؟». اللقطة تُري الإعداد قصيرًا لا استجوابًا، وتُظهر مربّع الموافقة الصحية في سياقه الطبيعي.
- **٠٥ (الباركود)** — كان «تتبّع تغذيتك بسهولة» وهو وصف حالة لا فعل. الباركود **أعلى ميزة تحويلًا** ولا تظهر في المجموعة الحالية إطلاقًا.
- **٠٧ (الصحة)** — التطبيق يقرأ ٢٤ مقياسًا ولا لقطة تُظهره. وميزة تُطلب لها صلاحية حسّاسة يجب أن تُرى قبل التنزيل لا بعده.
- **٠٨ (الخصوصية)** — «بلا إعلانات ولا تتبّع» ادّعاء نصّي بلا دليل بصري. شاشة التصدير والحذف تحوّله إلى شيء مرئي، وهي **فارق تنافسي حقيقي** في فئة تبيع بياناتها.
- حُذف «تابع رحلتك التدريبية» (الملف الشخصي): تكرار لـ٠٦ بلا معلومة جديدة.

**قيود ثابتة:** ١٣٢٠ × ٢٨٦٨ · عمودي · RTL · بناء `VITE_DESIGN_V2=true` · العنوان ≤ ٦ كلمات ويبدأ بفعل حيثما أمكن · بيانات البذرة `reviewer` (`scripts/run-demo-seed.mjs --profile=reviewer`).

> **يُرفع لغرفة الهندسة (ه-٧):** اللقطات ٠٢ و٠٥ و٠٧ و٠٨ تحتاج التقاطًا، و`scripts/appstore-screenshot-factory.mjs` ما زال يستهدف ١٢٦٠×٢٧٣٦ (مقاس **غير مقبول** من Apple) ويتعثّر في أتمتة الإعداد. الإصلاح موصوف في `04-screenshots.md:43–47`.

---
---

# ٤ · ملاحظات App Review — يُلصق في App Store Connect

> **يحلّ محل `05-reviewer-notes.md` بالكامل.** الملف القائم يخبر المراجع أن الكاميرا هي الإذن الوحيد — والتطبيق يشحن ثلاثة. **مراجع يُخبَر بشيء ثم يرى غيره على جهازه يعيد قراءة كل ما قلته بأسوأ تفسير.**
>
> فلسفة هذه النسخة: **كل ما قد يثير سؤالًا، نجيب عنه قبل أن يُسأل.** ثلاثة مواضع تحديدًا — حاجز القاصرين، الموافقة الصحية، HealthKit — لأن كلًّا منها إن اكتُشف بلا تفسير يكلّف دورة رفض كاملة.

```
Qimmah is an Arabic-first (RTL) fitness and nutrition app for the Saudi/Gulf market.
It is local-first: data is stored on the device, and cloud sync is optional and only
runs when the user signs in.

LANGUAGE
- The UI defaults to Arabic. To review in English: Profile (الملف الشخصي) → Settings
  (الإعدادات) → Language → English. All primary screens are localized.

PERMISSIONS — THE APP REQUESTS THREE, NONE AT LAUNCH
None of these is requested on first launch. Each is requested only at the moment the
user turns the relevant feature on, and denying any of them never blocks the app.

1) Camera — barcode only.
   Nutrition (التغذية) → Add meal → Scan. Point at any packaged-food EAN/UPC barcode.
   Frames are decoded on-device; no image is stored or transmitted. If a barcode is not
   in the Open Food Facts database, the app shows an honest "not found" state — expected
   behaviour, not a bug.

2) HealthKit — READ-ONLY. See the dedicated section below.

3) Location — only for dark-mode scheduling.
   Profile → Settings → Appearance → schedule dark mode by sunset. The location is used
   once to compute local sunset/sunrise, is never stored and never transmitted, and the
   user can pick a city manually instead. If you decline, the manual city picker appears
   — the feature still works.

Local notifications are also used (workout, rest, water, supplements, weekly summary).
They are scheduled entirely on-device; there is no push server. Permission is requested
only when the user enables a reminder in Settings, never at launch.

HEALTHKIT — WHY THE SCOPE IS BROAD, AND WHY IT IS READ-ONLY
- Entry point: Profile → Apple Health → Connect. Nothing happens until the user taps it.
- Qimmah requests READ access only. The write (toShare) set is explicitly EMPTY in the
  source: HealthKitStepsPlugin.swift — healthStore.requestAuthorization(toShare: [], read: readTypes).
  We therefore intentionally ship NO NSHealthUpdateUsageDescription: the app writes nothing
  to Health, so requesting write access would be asking for a capability we do not use.
- The read scope covers activity, body measurements, heart, sleep, respiratory metrics,
  nutrition logged by other apps, and recorded workouts. The reason it is broad is that the
  app's progress surfaces mirror what the user's own devices already recorded, so the user
  is not asked to retype it. Every type maps to a metric shown in the app; there is no
  collection without a corresponding display.
- Control is per metric: the user chooses which metrics to connect, and disconnecting a
  metric deletes the data imported from it.
- Health data is never sold, never shared with any third party, and never used for
  advertising or profiling. There is no ad SDK and no analytics SDK in the app.
- Declining HealthKit is fully supported — manual entry remains available throughout.

HEALTH-DATA CONSENT — WHY THERE IS A CHECKBOX BEFORE THE FIRST FIELD
On the first onboarding step you will see a health-data consent checkbox that must be
ticked before age, gender, height, and weight can be entered. This is deliberate: consent
precedes collection rather than following it. It is enforced in the flow logic
(src/lib/onboardingV2Flow.ts) and covered by an automated test, not just UI ordering.
This consent covers on-device processing to build the plan; syncing health data to the
cloud is a separate matter and sync is off in this build.

UNDER-18 GOAL RESTRICTION — EXPECTED BEHAVIOUR, NOT A BUG
If you enter an age under 18 during setup, the "cut" and "bulk" nutrition goals become
unavailable and the goal is limited to "maintenance", with an on-screen explanation.
This is an intentional safety restriction: the app will not propose a caloric deficit or
surplus to a growing body. It is enforced in the calculation layer (src/lib/calculators.ts),
so it cannot be bypassed by changing the goal later. To review the full set of goals, enter
an age of 18 or above.

SIGN-IN / ACCOUNT
- Email + password only (Supabase). No third-party or social login, so Sign in with Apple
  is not applicable (Guideline 4.8 — own account system only).
- The app is fully usable without an account; sign-in only adds optional cloud sync.
- Account deletion is in the app: Profile → Settings & privacy → Delete account
  (type-to-confirm). It deletes the user's server rows, then the auth account, then wipes
  local data (Guideline 5.1.1(v)). If server deletion fails, nothing is deleted and no
  success is claimed.
- Data export: Profile → Settings & privacy → Privacy & data → export JSON.

PRIVACY
- No ads, no third-party tracking, no ATT prompt (we do not track, so we do not ask).
- Analytics are off by default. Sync is off by default in this build.

MEDICAL DISCLAIMER
Fitness and nutrition guidance only. All calories, targets, and estimates are computed
from user input and are explicitly presented as estimates, not medical measurements.
Medication and supplement entries are user tracking for personal reference — the app
gives no dosing advice and makes no medical recommendation. Disclaimers are in-app.
```

**قبل اللصق، تُملأ:** `[المالك]` رقم باركود اختباري معروف · بيانات الحساب التجريبي (§٥-ب) · تأكيد أن البناء المرسل مبنيّ بـ`VITE_DESIGN_V2=true` مطابقًا للقطات.

---
---

# ٥ · حزمة TestFlight

## ٥-أ · معلومات النسخة التجريبية

**Beta App Description — عربي:**
```
قِمّة — تطبيق لياقة وتغذية عربي يشتغل على جهازك أول. جرّب الإعداد، وابنِ خطتك، وسجّل تمرين كامل،
وامسح باركود منتج، وتابع تقدّمك. المزامنة السحابية مطفية في هذي النسخة: كل بياناتك على جهازك.
```

**Beta App Description — English:**
```
Qimmah — an Arabic-first fitness and nutrition app that runs on your phone. Try the setup, build your
plan, log a full workout, scan a product barcode, and follow your progress. Cloud sync is off in this
build: everything stays on your device.
```

## ٥-ب · «What to Test» — ما نطلب اختباره

```
اللي نبي رأيك فيه في هذي الجولة:

١. الإعداد — الخطوات واضحة؟ وشرح الموافقة الصحية وصلك قبل ما توافق؟
٢. التمرين المباشر — سجّل جلسة كاملة لين «إنهاء التمرين». كل مجموعاتك انحفظت؟
٣. الباركود — امسح ثلاثة منتجات من سوبرماركتك. أيّها ما طلع؟ (نجمع القائمة.)
٤. الأطعمة السعودية — دوّر على أكلاتك المعتادة. وش الطبق الناقص؟
٥. تطبيق الصحة — اربطه وافصله. البيانات المستوردة انحذفت عند الفصل؟
٦. العربية والاتجاه — فيه نص إنجليزي مسرَّب؟ أو رقم/سهم في الجهة الغلط؟
٧. التذكيرات — فعّلها يومين. وصلت في وقتها؟ ونصّها محترم على شاشة القفل؟

ونبي منك بعد: الشاشة اللي حسّيتها بطيئة · واللحظة اللي وقفت فيها وما دريت وش الخطوة الجاية.

⚠️ المزامنة مطفية في هذي النسخة — بياناتك على جهازك بس. وحذف التطبيق يحذفها معه.
   صدّر نسخة قبل ما تحذف: الملف الشخصي ← الإعدادات والخصوصية ← الخصوصية والبيانات.
```

```
What we want from you this round:

1. Setup — are the steps clear? Did the health-consent explanation land before you agreed?
2. Live workout — log a full session through "Finish workout". Did all your sets stick?
3. Barcode — scan three products from your local store. Which ones didn't turn up? (We're collecting the list.)
4. Saudi foods — search the dishes you actually eat. What's missing?
5. Health app — connect it, then disconnect. Did the imported data actually go away?
6. Arabic & RTL — any English text leaking through, or a number/arrow on the wrong side?
7. Reminders — turn them on for two days. Did they show up on time, and was the lock-screen text respectful?

We also want: the screen that felt slow · the moment you stalled and didn't know what came next.

⚠️ Sync is off in this build — your data is on your phone only, and deleting the app takes it with it.
   Export a copy first: Profile → Settings & privacy → Privacy & data.
```

> **تنويه المزامنة ليس تفصيلًا.** مختبِر يقضي أسبوعين في تسجيل بياناته ثم يفقدها بحذف التطبيق **يفقدها فعلًا** — لا نسخة سحابية. التحذير قبل الفقد لا بعده.

## ٥-ج · Beta App Review Information

TestFlight الخارجي يمرّ بمراجعة Apple. **يُلصق فيها نصّ §٤ نفسه** — المراجع نفسه والأسئلة نفسها. إعادة كتابة مختصرة تعني احتمال تناقض بين النسختين.

## ٥-د · الحساب التجريبي

**الأصل: لا حاجة لحساب.** التطبيق يعمل بالكامل بلا تسجيل دخول — وهذا نصف قصة الخصوصية. يُذكر للمراجع صراحةً.

**لكن يُزوَّد حساب** لأن حذف الحساب والمزامنة لا يُختبران بدونه (وGuideline 5.1.1(v) يُختبر عمليًا):

| الحقل | القيمة |
|---|---|
| البريد | `[المالك — يُنشأ على مشروع الإنتاج]` |
| كلمة المرور | `[المالك — قوية]` |
| البذر | `node scripts/run-demo-seed.mjs --profile=reviewer` ثم الحقن عبر Web Inspector (`docs/content/DEMO-ACCOUNTS.md`) |

**تحذير تشغيلي:** بروفايل `reviewer` مصمَّم لهذا الغرض (٣ أسابيع تمارين، ٦ أيام تغذية، نزول ~٢ كجم، وسام واحد) — أي أن الشاشات لن تكون فارغة. وبما أن **حذف الحساب قابل للاختبار فعلًا**، فقد يحذفه المراجع: **يُعاد البذر قبل كل تقديم**، ولا يُستخدم هذا الحساب لأي غرض آخر.

## ٥-هـ · مجموعات الاختبار

| المجموعة | العدد | التركيز | لماذا |
|---|---|---|---|
| داخلية | ١–٣ | بوابات وامتثال ومسار الحذف | قبل أي خارجي |
| خليجية | ٨–١٥ | الأطعمة والباركود والعربية | قاعدة الأطعمة والباركود **إقليميّتان** — لا يكشفهما إلا مختبِر يتسوّق هنا |
| أجهزة | ٣–٥ | iPhone قديم + iOS الأدنى + iPad | ⚠️ يتقاطع مع دَين «فشل إقلاع iOS (`ERR_UNKNOWN`)» المفتوح في الميثاق |

> **يُرفع لغرفة الهندسة (ه-٨):** دَين «فشل إقلاع iOS على جهاز فعلي» ما زال مفتوحًا في الميثاق §١١ (حارة D). **TestFlight خارجي قبل إغلاقه يعني احتمال مجموعة مختبِرين تواجه شاشة لا تُقلع** — وهي أغلى طريقة لاكتشاف عطل معروف.

---
---

# يُرفع لغرفة الهندسة

### ه-٧ · مصنع اللقطات: مقاس مرفوض + أربع لقطات ناقصة
`scripts/appstore-screenshot-factory.mjs` يستهدف **١٢٦٠×٢٧٣٦** وهو مقاس **لا تقبله Apple** (المطلوب ١٣٢٠×٢٨٦٨)، ويتعثّر في أتمتة الإعداد. واللقطات ٠٢ و٠٥ و٠٧ و٠٨ (§٣) غير ملتقطة. الإصلاح موصوف بدقّة في `04-screenshots.md:43–47`.

### ه-٨ · TestFlight خارجي مقابل دَين إقلاع iOS
`ERR_UNKNOWN` على جهاز فعلي دَين مفتوح (الميثاق §١١، حارة D). **توصية: لا تُفتح مجموعة خارجية قبل إغلاقه** — الداخلية تكفي حتى ذلك الحين.

### ه-٩ · `03-age-rating.md:68` تقادم
يقول «الحد الأدنى في الإعداد ١٢» والمدقّق يفرض ١٣. مربوط بـ«ه-١» في حزمة الامتثال؛ يُصحَّح مع توحيد الرقم.

### ه-١٠ · تأكيد علم `VITE_DESIGN_V2` قبل الأرشفة
الشاشات المصوّرة v2.1 ولا تُبنى إلا بـ`VITE_DESIGN_V2=true`. **بناء بلا العلم = مراجع يرى واجهة v1 لا تطابق اللقطات** — سبب رفض مباشر بتهمة «لقطات مضلّلة». يُثبَّت في قائمة ما قبل الأرشفة.

---

## ما لم أفعله، ولماذا

- **لم أستبدل `05-reviewer-notes.md` بالحذف** — §٤ بديله المعتمد، والحذف فعل لا رجعة فيه يحتاج موافقتك.
- **لم أثبّت الحد الأدنى للعمر** في نصوص المتجر — معلّق على «ه-١»، وتصنيف العمر في ASC يعتمد عليه.
- **لم ألتقط لقطات** — تحتاج تعديل `scripts/` وبناءً بعَلَم، وكلاهما خارج حدود الغرفة.
- **لم أضع تصنيف عمر رقميًا** في أي نص — Apple **تحسبه** ولا يُدّعى (`03-age-rating.md` محقّ في هذا).
