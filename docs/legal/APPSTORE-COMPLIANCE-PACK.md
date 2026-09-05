# حزمة امتثال App Store — قِمّة / App Store Compliance Pack — Qimmah

> **المهمة الأولى — غرفة الإطلاق والامتثال.** ثلاث وثائق جاهزة للتسليم: (أ) سياسة الخصوصية · (ب) شروط الاستخدام · (ج) نصوص أذونات iOS الحرفية.
>
> **ليست استشارة قانونية.** المواضع المعلَّمة **[قرار المالك]** تحتاج قرارًا تجاريًا/قانونيًا قبل النشر.
>
> **Not legal advice.** Fields marked **[OWNER-DECISION]** need a business/legal decision before publishing.
>
> ### الحقول الثلاثة الفارغة — فراغها مقصود، وهذا حكمها ([CTO-24] أولًا)
>
> | الحقل | من يملؤه | متى |
> |---|---|---|
> | **تاريخ النشر** | **المؤسس** | لحظة النشر الفعلي — لا قبله |
> | **جهة الاختصاص/التحكيم** | ⚖️ **يُرفع لأبو فهاد** | **بعد ساعة مع مستشار قانوني مختص** |
> | **آلية النقل عبر الحدود (PDPL)** | ⚖️ **يُرفع لأبو فهاد** | كذلك |
>
> **لا يملؤهما وكيل ولا CTO** — بندان قانونيان حقيقيان في وثيقة ملزمة. **التوصية الصريحة: ساعة مع مستشار مختص قبل التقديم أرخص ألف مرّة من صياغة اجتهادية.**
>
> **فراغ موسوم خير من التزام مرتجل.**

**تاريخ الإصدار:** 2026-07-30 · **أساس التحقّق:** `chore/proof-exclusions-doc` @ `9dbb541`

---

## 0. علاقة هذه الحزمة بما في المستودع — اقرأ هذا أولًا

المستودع يحوي `docs/legal/privacy-policy.md` و`docs/legal/terms-of-service.md`، وهما مبنيّان على `integration/wave4`. **فحصتُ الشيفرة الحالية قبل الكتابة (§2 من الميثاق)، ووجدتُ الوثيقتين متخلّفتين عن سلوك التطبيق في نقاط جوهرية** — لا تجميلية:

| # | ما تقوله الوثيقة القائمة | ما تفعله الشيفرة فعلًا | الدليل |
|---|---|---|---|
| 1 | «**لا نطلب موقعك** أو جهات اتصالك أو صورك» (§3) | التطبيق **يطلب الموقع** لجدولة الوضع الداكن، والإذن مشحون في `Info.plist` | `src/lib/geolocation.ts` · `ios/App/App/Info.plist` (`NSLocationWhenInUseUsageDescription`) |
| 2 | «يقرأ التطبيق **عدد الخطوات فقط**» (§2د) | يقرأ **٢٤ نوعًا** من HealthKit: نشاط، قياسات جسد، قلب، نوم، تنفّس وأكسجين، تغذية — **إضافة إلى سجلّ التمارين** | `src/lib/health/metrics.ts:72–103` · `HealthKitStepsPlugin.swift:94–97` |
| 3 | «الحد الأدنى للعمر **12 سنة**» (§10) | مدقّق الإعداد يرفض ما دون **13** | `src/lib/onboardingV2Flow.ts:28` مقابل `src/data/policyCopy.ts:19` |
| 4 | لا ذكر لموافقة صحية منفصلة تسبق جمع بيانات الجسد | الموافقة الصحية **تسبق** أول حقل جسدي فعلًا (سلوك جديد بعد `4895c4f`) | `src/lib/onboardingV2Flow.ts:130–140` |

**النقطتان ١ و٢ ادّعاءان غير صحيحين في وثيقة خصوصية منشورة.** هذه ليست مسألة صياغة: نشر «لا نطلب موقعك» في تطبيق يطلب الموقع هو الصنف الذي يُسقط المراجعة ويُسقط الثقة.

**لذلك:** نصوص §أ و§ب أدناه **تحلّ محل** الملفّين القائمين بالكامل، ولا تُدمج معهما. استبدال، لا ترقيع.

---

## 0.1 خريطة الحقيقة — كل ادّعاء وسنده في الشيفرة

كل جملة في الوثائق أدناه مشدودة إلى هذا الجدول. ما ليس هنا، لا يُكتب هناك.

| الحقيقة | السند |
|---|---|
| المزامنة **مطفأة افتراضيًا** — لا تعمل إلا إذا كانت `VITE_SYNC_ENABLED === 'true'` حرفيًا | `src/lib/syncQueue.ts:9` |
| HealthKit **قراءة فقط** — مجموعة الكتابة فارغة صراحةً | `HealthKitStepsPlugin.swift:141` → `requestAuthorization(toShare: [], read: readTypes)` |
| الموافقة الصحية **قبل** أي حقل جسدي، لا بعده | `src/lib/onboardingV2Flow.ts:132–134` |
| القاصر (<18) تُقصر أهدافه على **المحافظة** | `src/lib/calculators.ts:82, 92` |
| الكاميرا للباركود حصرًا، والفك على الجهاز | `ios/App/App/BarcodeScanPlugin.swift` |
| **لا تتبّع ولا ATT** — لا `NSUserTrackingUsageDescription` ولا SDK تتبّع | فحص `ios/` و`src/`: صفر نتائج |
| الإشعارات **محلية**، والإذن يُطلب عند التفعيل لا عند الإقلاع | `src/lib/notifications/engine.ts:52` |
| الموقع **عند-الحاجة فقط**، والرفض لا يحجب (بديل: اختيار المدينة يدويًا) | `src/lib/geolocation.ts` |

---
---

# (أ) سياسة الخصوصية — قِمّة

**آخر تحديث:** [قرار المالك — تاريخ النشر] · **المسؤول عن البيانات:** تطبيق قِمّة — يمثّله مالكه · **للتواصل:** **qimmah.support@gmail.com**

## ١. مبدأنا في جملة واحدة

**قِمّة محلي افتراضيًا.** بياناتك تُحفظ على جهازك أولًا. المزامنة السحابية **اختيارية** ولا تعمل إلا عند تسجيل الدخول بحساب. بلا حساب، لا تغادر بياناتك جهازك.

هذا ليس وعدًا تسويقيًا، بل وصف لكيفية بناء التطبيق: التخزين المحلي هو المسار الأصلي، والمزامنة طبقة فوقه تُفعَّل باختيارك.

## ٢. ما الذي نجمعه، ولماذا

**أ) بيانات الحساب** — البريد الإلكتروني وكلمة المرور واسم العرض (اختياري). الغرض: تسجيل الدخول والمزامنة. تُدار كلمة المرور لدى مزوّد المصادقة (Supabase) ولا نطّلع عليها إطلاقًا.

**ب) بيانات جسدك** — العمر، الجنس، الطول، الوزن، الوزن المستهدف، مستوى الخبرة، والهدف. الغرض: حساب احتياجك التقديري من الطاقة وبناء خطتك. **لا نجمع هذه البيانات قبل موافقتك الصحية الصريحة** (انظر §٣).

**ج) بيانات تمرينك وقياساتك** — الجلسات (التمارين والأوزان والتكرارات)، الأرقام القياسية، القياسات (الوزن، الخصر، نسبة الدهون)، المكمّلات والأدوية التي تختار متابعتها، والإصابات التي تُدخلها. الغرض: عرض تقدّمك وتكييف خطتك.

**د) سجلّاتك اليومية** — التغذية والسعرات، الماء، الخطوات، الإنجازات، الخطط المخصّصة، والمهام.

**هـ) الكاميرا** — تُستخدم **لمسح باركود المنتجات الغذائية فقط**. تُقرأ الصورة على جهازك لفكّ الرمز، ولا تُحفظ صورة ولا تُرسَل.

**و) موقعك** — يُطلب **فقط** إذا فعّلت جدولة الوضع الداكن، ولمرّة واحدة في كل مرّة، لحساب وقت الغروب والشروق في منطقتك. **لا يُخزَّن ولا يُرسَل إلى أي جهة.** ولك بديل كامل: اختيار مدينتك يدويًا. رفض الإذن **لا يحجب عنك الميزة**.

**ز) الإشعارات** — تنبيهات **محلية** على جهازك (التمرين، الراحة، الماء، المكمّلات، الملخّص الأسبوعي). أوقاتها وفترة هدوئها تبقى على جهازك ولا تُرسل إلى خادم. **لا يوجد خادم إشعارات.** ونص شاشة القفل عام دائمًا — لا أسماء أدوية ولا مكمّلات ولا تفاصيل صحية.

**ح) التشخيص** — التطبيق **لا يجمع بيانات استخدام افتراضيًا**. إن فعّلها المالك مستقبلًا، فأحداث مجهولة بلا معرّف شخصي وبموافقتك.

## ٣. الموافقة الصحية — منفصلة، وقبل الجمع لا بعده

بيانات جسدك وصحتك تُعامَل معاملة خاصة:

1. **الموافقة تسبق الحقل.** في أول خطوة من الإعداد، لا يُقبل منك عمر ولا طول ولا وزن قبل موافقتك الصريحة على معالجة بياناتك الصحية. الإذن أولًا، ثم الجمع.
2. **الموافقة على المعالجة ليست موافقة على المزامنة.** موافقتك على أن يحسب التطبيق خطتك من بياناتك **لا تعني** أنها تغادر جهازك. مزامنة بياناتك الصحية الحسّاسة تحتاج **موافقة منفصلة صريحة** — قرار ثانٍ مستقل، لا بندًا مطويًّا في الأول.
3. **الرجوع متاح.** يمكنك سحب الموافقة، وحينها تتوقّف المعالجة المبنيّة عليها.

## ٤. ما الذي يبقى على جهازك، وما الذي يُزامَن

**على جهازك دائمًا:** كل ما سبق في §٢، افتراضيًا وبالكامل.

**يُزامَن — وفقط عند اجتماع كل هذه الشروط:** أن تسجّل الدخول بحساب · وأن تكون المزامنة مفعّلة · وأن تكون قد وافقت موافقة منفصلة على مزامنة بياناتك الصحية الحسّاسة.

عند المزامنة، تُرسَل بياناتك عبر اتصال مشفّر (HTTPS) إلى حسابك أنت وحدك، ومحميّة بصلاحيات على مستوى الصف (RLS) بحيث لا يصل إليها غيرك.

## ٥. ما الذي يغادر جهازك، ولمن

| الوجهة | متى | ماذا يُرسَل |
|---|---|---|
| **Supabase** | عند تسجيل الدخول وتفعيل المزامنة | بيانات حسابك وملفك وسجلّاتك — مرتبطة بمعرّف حسابك، خلف RLS |
| **Open Food Facts** | عند مسح أو بحث باركود | **رقم الباركود فقط** — ولا شيء عنك |
| **GitHub / jsDelivr** | عند عرض صورة تمرين توضيحية | طلب تحميل صورة (يظهر عنوان IP لجهازك للمزوّد كأي طلب ويب) — بلا بيانات عنك |
| **YouTube** | عند ضغطك «شاهد الأداء» | يُفتح رابط بحث في متصفّحك خارج التطبيق — لا تضمين ولا تتبّع داخلي |
| **Apple Health** | بعد ربطك الصريح | **لا شيء يُرسَل.** الاتجاه قراءة فقط: من Health إلى جهازك |

## ٦. بيانات Apple Health — ماذا نقرأ، ولماذا، وماذا لا نفعل

**لا يطلب قِمّة أي بيانات صحية عند الإقلاع.** لا يحدث شيء حتى تختار بنفسك ربط تطبيق الصحة.

**ماذا نقرأ:** بعد موافقتك، نقرأ ما تسمح به من: النشاط (الخطوات، المسافة، الطوابق، الطاقة النشطة وطاقة الأساس، دقائق التمرين والوقوف) · قياسات الجسم (الطول، الوزن، نسبة الدهون، الكتلة الصافية) · القلب (النبض، نبض الراحة، متوسط نبض المشي، تغيّرية النبض، VO₂ Max، تعافي النبض) · النوم ومراحله · التنفّس وأكسجين الدم وحرارة المعصم أثناء النوم · ما سجّلته تطبيقات التغذية الأخرى (الماء، السعرات، البروتين، الكربوهيدرات، الدهون) · وسجلّ تمارينك المسجَّلة.

**لماذا:** لعرض تقدّمك بصدق دون أن تُدخل يدويًا ما سجّلته أجهزتك أصلًا.

**وماذا لا نفعل — بوضوح:**
- **لا نكتب شيئًا إلى تطبيق الصحة.** الصلاحية المطلوبة قراءة فقط، ومجموعة الكتابة فارغة في الشيفرة.
- **لا نبيع بياناتك الصحية، ولا نشاركها مع أي طرف ثالث، ولا نستخدمها في أي إعلان أو تسويق أو تحليل سلوكي.**
- **لا نرسلها إلى Apple** — القراءة من تطبيق الصحة إلى جهازك.
- **التحكّم بيدك مقياسًا مقياسًا.** تختار ما تربطه وما تتركه، وفصل أي مقياس **يحذف ما استُورد منه**.
- **الإدخال اليدوي يبقى متاحًا دائمًا.** الرفض لا يعطّل التطبيق.

## ٧. ما لا نفعله — إطلاقًا

- **لا إعلانات.** لا لافتة، ولا مدمجة، ولا برعاية.
- **لا تتبّع عبر التطبيقات أو المواقع.** لا نطلب إذن التتبّع (ATT) لأننا لا نتتبّع.
- **لا بيع لبياناتك، ولا مشاركتها لأغراض تسويقية** — لا الصحية ولا غيرها.
- **لا أدوات تتبّع من طرف ثالث** (لا Google ولا Meta ولا سواها).
- **لا نطلب جهات اتصالك ولا صورك ولا ميكروفونك.**

## ٨. حقوقك

**الاطّلاع والتصحيح** — بياناتك معروضة داخل التطبيق، وملفك قابل للتعديل في أي وقت.

**التصدير** — «الملف الشخصي ← الإعدادات والخصوصية ← الخصوصية والبيانات» ينزّل نسخة JSON من بياناتك المتاحة على جهازك. لا حاجة لطلب ولا انتظار.

**حذف الحساب وأثره الكامل** — «الإعدادات والخصوصية ← حذف الحساب نهائيًا»، ويؤدي إلى:
1. حذف صفوفك من جميع جداول بيانات المستخدم على الخادم، **قبل** حذف حساب المصادقة؛
2. ثم حذف حساب المصادقة نفسه؛
3. ثم مسح كل بيانات قِمّة من جهازك — ولا يبقى إلا تفضيل غير شخصي كاللغة.

**وإن تعذّر الحذف من الخادم، لا يُحذف شيء ولا يُدَّعى نجاح.** تُخبَر بصراحة، وتعيد المحاولة أو تتواصل معنا. حذف التطبيق وحده لا يحذف حسابك السحابي إن كنت قد فعّلت المزامنة — استخدم الحذف داخل التطبيق.

**الاعتراض وتقييد المعالجة** — سحب الموافقة الصحية يوقف المعالجة المبنيّة عليها.

**حقوقك بموجب نظام حماية البيانات الشخصية (السعودية)** محفوظة، ولأي طلب: **qimmah.support@gmail.com**.

## ٩. القاصرون

**الحد الأدنى للعمر:** **١٣ سنة.** رقم نهائي بتوقيع المؤسس ([CTO-14]). وتوحيد الواجهتين معه مرصود في «ه-١».

**للمستخدمين دون ١٨ سنة:** تُقصر أهداف التغذية على **المحافظة** فقط — لا تنشيف ولا تضخيم. هذا اختيار مقصود: أجسام النمو ليست مكانًا لعجز أو فائض حراري يقترحه تطبيق. تبقى كل الأرقام تقديرية، وننصح بمراجعة مختص تغذية أو نمو قبل أي هدف يتعلّق بتغيير الوزن.

**لا يوجد مسار موافقة وليّ أمر في هذه النسخة**، ولا ندّعي التحقّق من وثيقة هوية.

## ١٠. مكان التخزين والنقل عبر الحدود

عند تفعيل المزامنة، تُخزَّن بياناتك على بنية Supabase في **اليابان** (`ap-northeast-1` — طوكيو)، أي نقل عبر الحدود من المملكة. تُحكَم هذه المعالجة تعاقديًّا عبر مُلحق معالجة البيانات (DPA) الخاص بالمزوّد. **لا ندّعي قرار كفاية ولا اعتمادًا رسميًا لأي وجهة**؛ والاعتماد النهائي لآلية النقل بموجب PDPL بيد المالك ومستشاره القانوني قبل الإطلاق العام. **[قرار المالك]**

## ١١. مدة الاحتفاظ

بياناتك المحلية تبقى على جهازك حتى تحذفها أو تحذف التطبيق. بياناتك السحابية — إن فعّلت المزامنة — تبقى ما دام حسابك قائمًا، وتُمحى بحذفه (§٨).

## ١٢. الأمان

اتصالات مشفّرة (HTTPS) · مصادقة وصلاحيات صف (RLS) على الخادم · **لا مفاتيح سرّية داخل التطبيق** (المفاتيح العامة فقط، والحماية الحقيقية في RLS لا في إخفاء المفتاح).

## ١٣. تغييرات هذه السياسة

قد نحدّثها؛ يُنشر التاريخ أعلاه، والتغييرات الجوهرية تُبلَّغ داخل التطبيق أو بالبريد.

## ١٤. التواصل

تطبيق قِمّة — يمثّله مالكه — **qimmah.support@gmail.com**

---

# (A) Privacy Policy — Qimmah

**Last updated:** [OWNER-DECISION — publication date] · **Controller:** Qimmah App — represented by its owner · **Contact:** **qimmah.support@gmail.com**

## 1. Our principle, in one sentence

**Qimmah is local-first.** Your data is stored on your device first. Cloud sync is **optional** and runs only when you sign in with an account. Without an account, your data never leaves your device.

This is not a marketing promise — it describes how the app is built: local storage is the primary path, and sync is a layer above it that you switch on.

## 2. What we collect, and why

**a) Account** — email, password, optional display name. Purpose: sign-in and sync. Passwords are handled by our auth provider (Supabase); we never see them.

**b) Your body data** — age, gender, height, weight, target weight, experience level, and goal. Purpose: to estimate your energy needs and build your plan. **We do not collect any of this before your explicit health consent** (see §3).

**c) Training and measurements** — sessions (exercises, weights, reps), personal records, measurements (weight, waist, body-fat %), the supplements and medications you choose to track, and injuries you enter. Purpose: to show your progress and adapt your plan.

**d) Daily logs** — nutrition and calories, water, steps, achievements, custom plans, and tasks.

**e) Camera** — used **only** to scan food-product barcodes. Frames are decoded on your device; no image is stored or sent.

**f) Location** — requested **only** if you turn on dark-mode scheduling, one shot at a time, to work out your local sunset and sunrise. **It is never stored and never sent anywhere.** You have a full alternative: pick your city manually. Denying the permission **does not block the feature**.

**g) Notifications** — **local** reminders on your device (workout, rest, water, supplements, weekly summary). Their times and quiet hours stay on your device and are never sent to a server. **There is no push server.** Lock-screen copy is always generic — never medication or supplement names, never health details.

**h) Diagnostics** — the app collects **no usage data by default**. If the owner enables it later, only anonymous events with no personal identifier, and with your consent.

## 3. Health consent — separate, and before collection

Your body and health data is treated differently:

1. **Consent comes before the field.** On the first setup step, no age, height, or weight is accepted until you explicitly consent to your health data being processed. Permission first, collection second.
2. **Consent to process is not consent to sync.** Agreeing that the app may compute your plan from your data does **not** mean that data leaves your device. Syncing sensitive health data requires a **separate, explicit consent** — a second independent decision, not a clause folded into the first.
3. **You can withdraw.** Withdrawing consent stops the processing that relies on it.

## 4. What stays on your device, and what syncs

**On your device, always:** everything in §2, by default and in full.

**Synced — only when all of these are true:** you are signed in · sync is enabled · and you have separately consented to syncing your sensitive health data.

When syncing, data travels over an encrypted (HTTPS) connection to your own account only, protected by row-level security so nobody else can reach it.

## 5. What leaves your device, and to whom

| Destination | When | What is sent |
|---|---|---|
| **Supabase** | Signed in, with sync enabled | Your account, profile, and logs — tied to your account id, behind RLS |
| **Open Food Facts** | You scan or search a barcode | **The barcode number only** — nothing about you |
| **GitHub / jsDelivr** | Viewing an exercise demo image | An image request (your IP is visible to the CDN, as with any web request) — nothing about you |
| **YouTube** | You tap "watch form" | Opens a search URL in your browser, outside the app — no embed, no in-app tracking |
| **Apple Health** | After you explicitly connect | **Nothing is sent.** The direction is read-only: from Health onto your device |

## 6. Apple Health data — what we read, why, and what we never do

**Qimmah requests no health data at launch.** Nothing happens until you choose to connect the Health app yourself.

**What we read:** with your permission — activity (steps, distance, flights, active and resting energy, exercise and stand minutes) · body measurements (height, weight, body-fat %, lean mass) · heart (heart rate, resting and walking heart rate, HRV, VO₂ Max, heart-rate recovery) · sleep and its stages · respiratory rate, blood oxygen, and sleeping wrist temperature · nutrition logged by other apps (water, calories, protein, carbohydrates, fat) · and your recorded workouts.

**Why:** to show your progress honestly, without asking you to retype what your devices already recorded.

**And what we never do — plainly:**
- **We never write anything to the Health app.** The requested scope is read-only, and the write set is empty in code.
- **We never sell your health data, never share it with any third party, and never use it for advertising, marketing, or behavioural profiling.**
- **We never send it to Apple** — the flow is from Health onto your device.
- **Control is per metric.** You choose what to connect; disconnecting a metric **deletes what was imported from it**.
- **Manual entry always remains available.** Declining does not disable the app.

## 7. What we never do

- **No ads.** Not banner, not embedded, not sponsored.
- **No cross-app or cross-site tracking.** We do not show the tracking (ATT) prompt because we do not track.
- **We never sell your data or share it for marketing** — health data or otherwise.
- **No third-party tracking SDKs** (no Google, no Meta, none).
- **We never ask for your contacts, photos, or microphone.**

## 8. Your rights

**Access and correction** — your data is visible in the app, and your profile is editable at any time.

**Export** — **Profile → Settings & privacy → Privacy & data** downloads a JSON copy of the data available on your device. No request, no waiting.

**Account deletion, and exactly what it does** — **Settings & privacy → Delete account permanently**:
1. deletes your rows from every user-data table on the server, **before** deleting the auth account;
2. then deletes the auth account itself;
3. then wipes all Qimmah data from your device — leaving only a non-personal preference such as language.

**If server deletion fails, nothing is deleted and no success is claimed.** You are told plainly, and you can retry or contact us. Deleting the app alone does not delete your cloud account if you enabled sync — use in-app deletion.

**Objection and restriction** — withdrawing health consent stops the processing that relies on it.

**Your rights under the Saudi PDPL** are preserved. For any request: **qimmah.support@gmail.com**.

## 9. Minors

**Minimum age:** **13 years.** Final, signed off by the founder ([CTO-14]). Aligning the two UI surfaces is tracked in "E-1".

**For users under 18:** nutrition goals are limited to **Maintenance** only — no cut, no bulk. This is deliberate: a growing body is not a place for an app-suggested caloric deficit or surplus. All figures remain estimates, and we recommend consulting a nutrition or growth specialist before any weight-change goal.

**There is no parental-consent flow in this version**, and we make no claim of identity-document verification.

## 10. Storage location and cross-border transfer

With sync enabled, your data is stored on Supabase infrastructure in **Japan** (`ap-northeast-1`, Tokyo) — a cross-border transfer out of the Kingdom. This processing is safeguarded contractually through the provider's Data Processing Addendum (DPA). **We claim no adequacy decision or formal approval for any destination**; final sign-off on the transfer mechanism under the PDPL rests with the owner and legal counsel before public launch. **[OWNER-DECISION]**

## 11. Retention

Local data stays on your device until you delete it or the app. Cloud data — if you enabled sync — remains while your account exists, and is erased when you delete it (§8).

## 12. Security

Encrypted (HTTPS) connections · server-side auth and row-level security · **no secret keys inside the app** (public keys only; the real protection is RLS, not key obscurity).

## 13. Changes

We may update this policy; the date above is published, and material changes are notified in-app or by email.

## 14. Contact

Qimmah App — represented by its owner — **qimmah.support@gmail.com**

---
---

# (ب) شروط الاستخدام — قِمّة

**آخر تحديث:** [قرار المالك] · تطبيق قِمّة — يمثّله مالكه · **qimmah.support@gmail.com**

## ١. قبول الشروط

باستخدامك قِمّة توافق على هذه الشروط وعلى سياسة الخصوصية. إن لم توافق، فلا تستخدم التطبيق.

## ٢. ما هو قِمّة — وما ليس هو

قِمّة أداة تنظّم تمرينك وتغذيتك وقياساتك وتعرض تقدّمك.

**الأرقام التي تراها تقديرات.** السعرات والماكروز والاحتياج اليومي وتقديرات نسبة الدهون كلها **محسوبة من مدخلاتك أنت** بمعادلات عامة منشورة، لا مقاسة منك. ستقترب من الواقع بقدر دقّة ما تُدخله، وتبقى تقديرًا في كل الأحوال.

**وقِمّة ليس جهة طبية.** المحتوى لأغراض اللياقة والمعلومات العامة — **ليس تشخيصًا ولا علاجًا ولا وصفة ولا توصية طبية**. متابعة المكمّلات والأدوية في التطبيق **تنظيم شخصي لما تتناوله أنت أصلًا**، وليست اقتراح دواء ولا جرعة ولا توقيتًا.

نحن نعرض ونحسب ونذكّر. **الطبيب يشخّص ويصف.** إن كانت لديك حالة صحية أو إصابة أو حمل، أو كنت تتناول دواءً، فحديث قصير مع مختص مؤهّل قبل تغيير تمرينك أو تغذيتك خطوة تستحقّها. وفي أي طارئ صحي، اتصل بالجهات الطبية مباشرة — لا تراجع تطبيقًا.

## ٣. سنّ الأهلية والقاصرون

**الحد الأدنى للعمر:** **١٣ سنة** — نهائي بتوقيع المؤسس ([CTO-14]). انظر «ه-١».

إنشاء الحساب يتطلّب تأكيدًا صريحًا للعمر وموافقة على هذه الشروط وسياسة الخصوصية. لا ندّعي التحقّق من هوية ولا يوجد مسار موافقة وليّ أمر في هذه النسخة.

**لمن هم دون ١٨:** الأهداف مقصورة على **المحافظة** — لا تنشيف ولا تضخيم. القيد مقصود ولمصلحتك، وليس عيبًا في التطبيق.

## ٤. حسابك

أنت مسؤول عن سرّية بيانات دخولك وعن النشاط على حسابك. زوّدنا ببيانات صحيحة وحدّثها عند الحاجة — دقّة خطتك تعتمد عليها.

## ٥. الاستخدام المقبول

لا تُسِئ استخدام الخدمة: لا وصول غير مصرّح به، ولا هندسة عكسية بما يخالف النظام، ولا محتوى غير قانوني، ولا انتحال هوية، ولا تعطيل للخدمة أو بنيتها.

## ٦. المحتوى الخاص بك

**ما تُدخله يبقى ملكك** — سجلّاتك وقياساتك وملاحظاتك. تمنحنا ترخيصًا محدودًا لمعالجته وتخزينه ومزامنته **لتشغيل الخدمة لك أنت فقط**، كما في سياسة الخصوصية. لا نستخدم محتواك لغير ذلك.

## ٧. خدمات أطراف ثالثة

يعتمد التطبيق على: Supabase (المصادقة والمزامنة) · Open Food Facts (بيانات المنتجات بالباركود — ترخيص ODbL) · **جدول تركيب الأغذية السعودي (SFCT) الصادر عن الهيئة العامة للغذاء والدواء — مصدر القيم الغذائية للأطباق السعودية التقليدية** · صور توضيحية من مصادر عامة (GitHub/jsDelivr) · روابط بحث خارجية على YouTube · وApple HealthKit عند ربطك له. استخدامك لتلك الخدمات قد يخضع لشروطها، ولسنا مسؤولين عن محتواها أو توفّرها.

**وعن القيم الغذائية تحديدًا:** نعتمد مصادر رسمية ومنشورة حيثما توفّرت، ونذكر مصدر كل قيمة. ومع ذلك تبقى **القيمة المعروضة عن الطعام تقديرًا لوجبتك أنت** — حجم الحصة وطريقة التحضير واختلاف العبوات تُغيّرها. ولا نضمن خلوّ أي منتج من مسبّبات الحساسية: **حين لا تصلنا معلومة الحساسية نقولها صراحةً، والمرجع النهائي عبوة المنتج نفسها.**

## ٨. الوصول والدفع

**مجانًا بلا حساب وبلا دفع:** إعداد ملفك الشخصي، وتوليد خطتك، ومعاينة الخطة كاملةً، وإنشاء الحساب. كما يمكن تصفّح شاشات التطبيق في وضع المعاينة.

**خلف الوصول المدفوع:** الأفعال المنتِجة وحدها — تسجيل التمارين والمجموعات، وتسجيل الطعام والماء، وتسجيل الوزن والقياسات، وتسجيل التعافي، وحفظ تعديلات الخطة. ويُفتح ذلك بإحدى ثلاث بوّابات لا رابع لها: **تجربة مدّتها ٧٢ ساعة** تُمنح مرّة واحدة لكل حساب مُوثَّق، أو **قِمّة Premium**، أو **كود وصول** بمدّة محدودة.

**قِمّة Premium عملية شراء واحدة، وليست اشتراكًا شهريًا ولا تجديدًا تلقائيًا.** يشمل تحديثات قِمّة — بلا اشتراك شهري. ويُعرض السعر وشروط الشراء والاسترداد على قناة الشراء قبل إتمام أي عملية.

## ٩. إخلاء المسؤولية وحدودها

تُقدَّم الخدمة «كما هي» دون ضمانات صريحة أو ضمنية. **لا نضمن دقّة التقديرات ولا بلوغ نتيجة معيّنة** — النتائج تعتمد على عوامل كثيرة خارج التطبيق. إلى الحد الذي يسمح به النظام، لا نتحمّل مسؤولية أضرار غير مباشرة أو تبعية ناشئة عن استخدامك التطبيق أو اعتمادك على محتواه.

## ١٠. الإنهاء

يمكنك الإنهاء بحذف حسابك في أي وقت من داخل التطبيق. وقد نوقف الوصول عند خرق هذه الشروط.

## ١١. القانون الحاكم

تُحكم هذه الشروط بأنظمة المملكة العربية السعودية. **[قرار المالك — جهة الاختصاص/التحكيم]**

## ١٢. التغييرات

قد نحدّث هذه الشروط؛ يُنشر التاريخ أعلاه، والاستمرار في الاستخدام بعد التحديث يعني الموافقة.

## ١٣. التواصل

تطبيق قِمّة — يمثّله مالكه — **qimmah.support@gmail.com**

---

# (B) Terms of Service — Qimmah

**Last updated:** [OWNER-DECISION] · Qimmah App — represented by its owner · **qimmah.support@gmail.com**

## 1. Acceptance

By using Qimmah you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the app.

## 2. What Qimmah is — and what it is not

Qimmah organises your training, nutrition, and measurements, and shows your progress.

**The numbers you see are estimates.** Calories, macros, daily needs, and body-fat estimates are all **computed from your own inputs** using published general formulas — not measured from you. They get closer to reality as your inputs get more accurate, and they remain estimates either way.

**And Qimmah is not a medical provider.** Content is for fitness and general information — **not diagnosis, treatment, prescription, or medical advice**. Tracking supplements and medications in the app is **personal organisation of what you already take**; it is not a suggestion of a drug, a dose, or a schedule.

We display, calculate, and remind. **A doctor diagnoses and prescribes.** If you have a medical condition, an injury, or a pregnancy, or you take medication, a short conversation with a qualified professional before changing your training or nutrition is worth having. And in a medical emergency, contact emergency services directly — not an app.

## 3. Eligibility and minors

**Minimum age:** **13 years** — final, signed off by the founder ([CTO-14]). See "E-1".

Creating an account requires an explicit age confirmation and acceptance of these Terms and the Privacy Policy. We make no claim of identity verification, and there is no parental-consent flow in this version.

**For users under 18:** goals are limited to **Maintenance** — no cut, no bulk. The limit is deliberate and in your interest; it is not a defect.

## 4. Your account

You are responsible for your credentials and for activity on your account. Provide accurate information and keep it current — the accuracy of your plan depends on it.

## 5. Acceptable use

Do not misuse the service: no unauthorised access, no unlawful reverse-engineering, no illegal content, no impersonation, no disruption of the service or its infrastructure.

## 6. Your content

**What you enter remains yours** — your logs, measurements, and notes. You grant us a limited licence to process, store, and sync it **solely to operate the service for you**, as described in the Privacy Policy. We do not use your content for anything else.

## 7. Third-party services

The app relies on Supabase (auth and sync) · Open Food Facts (barcode product data — ODbL licence) · **the Saudi Food Composition Tables (SFCT), published by the Saudi Food and Drug Authority — the source of nutrition values for traditional Saudi dishes** · exercise demo images from public sources (GitHub/jsDelivr) · external YouTube search links · and Apple HealthKit if you connect it. Your use of those services may be subject to their terms; we are not responsible for their content or availability.

**On nutrition values specifically:** we use official, published sources wherever they exist, and we state the source of each value. Even so, the value shown for a food remains **an estimate for your particular serving** — portion size, preparation, and packaging differences all change it. And we do not guarantee that any product is free of allergens: **when allergen information hasn't reached us we say so plainly, and the product's own packaging is the final word.**

## 8. Access and payment

**Free, with no account and no payment:** setting up your profile, generating your plan, previewing the full plan, and creating an account. You can also browse the app's screens in preview mode.

**Behind paid access:** the productive actions only — logging workouts and sets, logging food and water, logging weight and measurements, logging recovery, and saving plan edits. These open through one of three gates and no fourth: a **72-hour trial** granted once per verified account, **Qimmah Premium**, or an **access code** of limited duration.

**Qimmah Premium is a one-time purchase — not a monthly subscription and not an auto-renewing plan.** It includes Qimmah updates — no monthly subscription. Price, purchase terms, and refund terms are shown on the purchase channel before any purchase is completed.

## 9. Disclaimers and limitation of liability

The service is provided "as is" without express or implied warranties. **We do not guarantee the accuracy of estimates or any particular outcome** — results depend on many factors outside the app. To the extent permitted by law, we are not liable for indirect or consequential damages arising from your use of the app or reliance on its content.

## 10. Termination

You may terminate at any time by deleting your account in the app. We may suspend access for breach of these Terms.

## 11. Governing law

These Terms are governed by the laws of the Kingdom of Saudi Arabia. **[OWNER-DECISION — venue/arbitration]**

## 12. Changes

We may update these Terms; the date above is published, and continued use after an update means acceptance.

## 13. Contact

Qimmah App — represented by its owner — **qimmah.support@gmail.com**

---
---

# (ج) نصوص أذونات iOS الحرفية / iOS Purpose Strings — verbatim

## قبل النصوص: ثلاث حقائق تقنية تحكم هذه المهمة

**١. الإشعارات ليس لها Purpose String على iOS.** نص تنبيه الإشعارات يكتبه النظام (`"…" Would Like to Send You Notifications`) و**لا يقبل تخصيصًا** — لا يوجد مفتاح في `Info.plist` لذلك، خلافًا للكاميرا والموقع والصحة. الأثر: النص الوحيد الذي نملكه هو **شاشة التمهيد داخل التطبيق قبل استدعاء النظام**، وقد كتبتها في §ج-٤ لأنها الشيء الفعلي القابل للتسليم هنا.

**٢. `NSHealthUpdateUsageDescription` يجب ألّا يُشحن.** التطبيق **لا يكتب** إلى تطبيق الصحة إطلاقًا — مجموعة الكتابة فارغة صراحةً في `HealthKitStepsPlugin.swift:141`. شحن نص كتابة لإذن لا نستعمله يفتح على المراجع سؤال «أين تكتبون؟» بلا إجابة، ويُعدّ طلب صلاحية زائدة عن الحاجة. **التوصية: لا يُضاف.** وقد كتبتُ نصّه أدناه **موقوفًا** ليكون جاهزًا في اليوم الذي تُبنى فيه الكتابة فعلًا — لا قبله.

**٣. النصوص الحالية في `Info.plist` مكتوبة عربي+إنجليزي في سلسلة واحدة.** الأسلوب الصحيح هو `InfoPlist.strings` في `ar.lproj` و`en.lproj` فيرى المستخدم لغته وحدها. سلّمتُ النسختين: المُوطَّنة (المعتمدة) والمدمجة (بديل مؤقّت). التفصيل في «يُرفع لغرفة الهندسة/ه-٢».

---

## ج-١ · `NSHealthShareUsageDescription` — قراءة بيانات الصحة

**النسخة المُوطَّنة — المعتمدة:**

`ar.lproj/InfoPlist.strings`
```
"NSHealthShareUsageDescription" = "ليعرض قِمّة تقدّمك دون أن تُعيد إدخال ما سجّلته أجهزتك، يقرأ ما تسمح به من نشاطك وقياساتك وقلبك ونومك وتغذيتك. قراءة فقط — لا نكتب في تطبيق الصحة، ولا نشارك بياناتك، ولا نستخدمها في إعلانات.";
```

`en.lproj/InfoPlist.strings`
```
"NSHealthShareUsageDescription" = "So Qimmah can show your progress without you retyping what your devices already recorded, it reads the activity, measurements, heart, sleep, and nutrition data you allow. Read-only — we never write to Health, never share your data, and never use it for ads.";
```

**البديل المؤقّت (سلسلة واحدة مدمجة، إن تعذّرت التوطئة قبل التسليم):**
```
ليعرض قِمّة تقدّمك دون أن تُعيد إدخال ما سجّلته أجهزتك، يقرأ ما تسمح به من نشاطك وقياساتك وقلبك ونومك وتغذيتك. قراءة فقط — لا نكتب في تطبيق الصحة، ولا نشارك بياناتك، ولا نستخدمها في إعلانات. Qimmah reads the activity, measurements, heart, sleep, and nutrition data you allow, to show your progress without retyping what your devices recorded. Read-only, never shared, never used for ads.
```

> **لماذا تغيّر عن النص الحالي:** النص المشحون اليوم يعدّد ٢٤ مقياسًا بالاسم في فقرة واحدة طويلة. تنبيه HealthKit صندوق صغير — النص بهذا الطول **يُقتطع فعليًا فيقرأ المستخدم أوّله ولا يصل إلى «قراءة فقط، بلا مشاركة»، وهي أهم جملة فيه**. النسخة أعلاه تُبقي التحديد (خمس فئات، لا «بياناتك الصحية» المبهمة التي ترفضها Apple) وتُقدّم الطمأنة إلى داخل الحيّز المقروء. والتعداد الكامل مكانه سياسة الخصوصية §٦ وملاحظات المراجع، حيث تُقرأ فعلًا.

---

## ج-٢ · `NSHealthUpdateUsageDescription` — كتابة بيانات الصحة · ⛔ موقوف، لا يُشحن

> **لا يُضاف إلى `Info.plist` في هذه النسخة.** التطبيق لا يكتب إلى تطبيق الصحة (`toShare: []`). النص محفوظ هنا لليوم الذي تُبنى فيه الكتابة، ويُراجَع حينها لا اليوم.

`ar` — عند بناء الكتابة مستقبلًا:
```
"NSHealthUpdateUsageDescription" = "بموافقتك، يحفظ قِمّة التمارين التي تسجّلها في التطبيق داخل تطبيق الصحة لتبقى سجلّاتك كاملة في مكان واحد. لا نحفظ شيئًا لم تسجّله بنفسك.";
```
`en`:
```
"NSHealthUpdateUsageDescription" = "With your permission, Qimmah saves the workouts you log here into the Health app so your records stay complete in one place. We save nothing you did not log yourself.";
```

---

## ج-٣ · `NSCameraUsageDescription` — الكاميرا للباركود

`ar.lproj`
```
"NSCameraUsageDescription" = "لتضيف منتجًا غذائيًا إلى سجلّك بمسح باركوده بدل كتابة قيمه يدويًا، يحتاج قِمّة الكاميرا. تُقرأ الصورة على جهازك لحظةً لفكّ الرمز، ولا تُحفظ ولا تُرسَل.";
```

`en.lproj`
```
"NSCameraUsageDescription" = "To add a food product to your log by scanning its barcode instead of typing its values, Qimmah needs the camera. Frames are decoded on your device and never stored or sent.";
```

---

## ج-٤ · الموقع — `NSLocationWhenInUseUsageDescription`

> غير مذكور في التكليف لأن الوثائق القائمة تنفي وجوده — **وهو موجود ومشحون فعلًا**. أُدرجه لأن تركه يعني شحن إذن بنص لا يطابق سياسة الخصوصية.

`ar.lproj`
```
"NSLocationWhenInUseUsageDescription" = "عند تفعيلك جدولة الوضع الداكن، يستخدم قِمّة موقعك مرّة واحدة ليعرف وقت الغروب عندك. لا يُحفظ موقعك ولا يُشارك، ويمكنك اختيار مدينتك يدويًا بدلًا منه.";
```

`en.lproj`
```
"NSLocationWhenInUseUsageDescription" = "When you turn on dark-mode scheduling, Qimmah uses your location once to find your local sunset time. Your location is never stored or shared, and you can pick your city manually instead.";
```

---

## ج-٥ · الإشعارات — نص التمهيد داخل التطبيق (لا يوجد Purpose String)

يُعرض **قبل** استدعاء `requestPermissions()`، فيصل المستخدم إلى تنبيه النظام غير المخصَّص وهو يعرف مسبقًا ما يوافق عليه:

**العربية**
> **نذكّرك بما اخترته أنت**
> تذكير التمرين، ونهاية الراحة، والماء، وملخّصك الأسبوعي — في الأوقات التي تحدّدها. كل التنبيهات تُجدوَل على جهازك، ونصّها على شاشة القفل عام دائمًا: لا أسماء أدوية ولا مكمّلات.
> [ تفعيل التذكيرات ]   [ ليس الآن ]

**English**
> **Reminders for what you chose**
> Workout reminders, rest-timer alerts, water, and your weekly summary — at the times you set. Every reminder is scheduled on your device, and lock-screen text is always generic: no medication or supplement names.
> [ Turn on reminders ]   [ Not now ]

**قاعدة السلوك:** «ليس الآن» **لا يستدعي تنبيه النظام إطلاقًا** — إذن iOS يُطلب مرة واحدة فقط، وإحراقه على مستخدم متردّد يعني فقدانه نهائيًا إلى إعدادات النظام. ولا يُستدعى الإذن عند الإقلاع بأي حال.

---
---

# يُرفع لغرفة الهندسة

بنود تمسّ الشيفرة أو تحتاج صلاحية. **لا أنفّذها ولا آمر بها** — أرفعها موثّقة بأدلّتها.

### ه-١ · تناقض ثلاثي في الحد الأدنى للعمر — يحجب النشر

ثلاثة أرقام متعارضة في ثلاثة مواضع:

| الموضع | القيمة | الملف |
|---|---|---|
| مربّع الأهلية عند التسجيل | «عمري **١٢** سنة أو أكثر» | `src/data/policyCopy.ts:19, 23, 29, 33` |
| تلميح حقل العمر | «سنة (**١٢–٩٠**)» | `src/i18n/dict/onboarding.ts:603, 1033` |
| المدقّق الفعلي | **١٣–١٠٠** | `src/lib/onboardingV2Flow.ts:28` |

**الأثر:** ابن الثانية عشرة يُقرّ بأهليته، ويقرأ تلميحًا يؤكّد أن ١٢ مقبول، ثم يُرفض إدخاله بلا سبب مفهوم. وسياسة الخصوصية المنشورة تعلن ١٢ بينما التطبيق يفرض ١٣ — تعارض معلَن.

**لماذا يحجب النشر:** الحد الأدنى للعمر مدخل مباشر في تصنيف العمر في App Store Connect وفي بند القاصرين. لا يمكن ملء `[قرار المالك]` في §٩ من السياسة و§٣ من الشروط قبل حسمه. **تركتُ الرقم فراغًا في الوثيقتين عمدًا** — كتابة رقم أعرف أنه متنازَع عليه أسوأ من فراغ ظاهر.

**القرار — نهائي بتوقيع المؤسس ([CTO-14])، بعد توحيد [CTO-13] قرار ١:** الحدّ **١٣** (المدقّق هو الأصح صناعةً)، فتُصحَّح الواجهتان إليه:

| الموضع | من | إلى |
|---|---|---|
| `src/data/policyCopy.ts:19, 23, 29, 33` | ١٢ | **١٣** |
| `src/i18n/dict/onboarding.ts:603, 1033` | ١٢–٩٠ | **١٣–١٠٠** |
| `src/lib/onboardingV2Flow.ts:28` | ١٣–١٠٠ | بلا تغيير (المرجع) |

**نُفِّذ ومثبَّت في وثائق هذه الحزمة** (§٩ من السياسة و§٣ من الشروط) — **بلا وسم تحفّظ، الرقم موقَّع.** **يبقى المعلَّق:** تصحيح الواجهتين، وهو تعديل كود في نطاق حارة A — خارج هذه الغرفة.

### ه-٢ · نصوص الأذونات: طول مُقتطِع + توطئة مفقودة

`NSHealthShareUsageDescription` الحالي في `Info.plist` فقرة تعدّد ٢٤ مقياسًا. تنبيه HealthKit يقتطعها عمليًا، **فتضيع جملة «قراءة فقط، بلا مشاركة، بلا إعلانات»** — وهي الجملة التي تُطمئن المستخدم وتُقنع المراجع.

وكل النصوص الثلاثة مكتوبة عربي+إنجليزي في سلسلة واحدة، فيرى كل مستخدم لغةً لا يقرؤها ملتصقة بلغته.

**المقترح:** استبدال النصوص بنسخ §ج، وإنشاء `ar.lproj/InfoPlist.strings` و`en.lproj/InfoPlist.strings`.

### ه-٣ · بوّابة الموافقة المنفصلة لمزامنة البيانات الصحية غير مُنفَّذة

الميثاق §٨ قرار مقفل رقم ٥: «بيانات الصحة الحسّاسة تُزامَن خلف موافقة منفصلة صريحة فقط». والسياسة أعلاه (§٣ و§٤) تعلن ذلك للمستخدم.

**الحالة في الشيفرة:** `healthDataConsent` موافقة **معالجة** واحدة (`onboardingV2Flow.ts:53`)، ولا توجد موافقة **مزامنة** ثانية مستقلة. و`onboardingProfile.ts` يُدرِج الملف الكامل — بما فيه `limitations.injuries` و`consents` — في طابور المزامنة العام (وهو التعارض الكامن الموثّق في الميثاق §١١).

**خامد اليوم فقط لأن `VITE_SYNC_ENABLED` مطفأة افتراضيًا** (`syncQueue.ts:9`).

**الخطر المحدَّد:** لحظة تفعيل علم المزامنة تصبح §٣-٢ و§٤ من سياسة الخصوصية **ادّعاءً غير صحيح** — أي أن الالتزام القانوني ينكسر بتبديل علم، بلا تعديل سطر في الوثيقة.

**التوصية:** إمّا أن تسبق بوّابة الموافقة المنفصلة تفعيل العلم، أو يُوسَم تفعيل العلم صراحةً بأنه محجوب على البوّابة. لا يجوز أن يكون المانع الوحيد هو أن الميزة مطفأة.

### ه-٤ · وثيقتان قائمتان تحملان ادّعاءين غير صحيحين

`docs/legal/privacy-policy.md` §٣ ينفي طلب الموقع (والتطبيق يطلبه)، و§٢د يحصر HealthKit في الخطوات (والتطبيق يقرأ ٢٤ نوعًا). و`docs/appstore/05-reviewer-notes.md:23` يقول للمراجع نصًّا: «الإذن الوحيد هو الكاميرا» — والتطبيق يشحن **ثلاثة** أذونات.

**الأثر على المراجعة:** إخبار المراجع أن الكاميرا هي الإذن الوحيد، ثم عرض تنبيه HealthKit وتنبيه موقع عليه، تناقضٌ يقرأه المراجع بأسوأ تفسير ممكن.

**التوصية:** §أ و§ب من هذه الحزمة تحلّان محل الملفّين القانونيين. وملاحظات المراجع أعالجها في **المهمة الثانية** (التي تشمل الشرح الاستباقي لـHealthKit والموافقة الصحية وحاجز القاصرين).

### ه-٥ · مراجعة `app-privacy-labels.md` مطلوبة

بطاقات خصوصية App Store مبنيّة على نفس الافتراض القديم (خطوات فقط، بلا موقع). نطاق **Health & Fitness** و**Location** فيها يحتاج إعادة اشتقاق من `src/lib/health/metrics.ts`. البطاقة المخالفة للسلوك سبب رفض مستقل عن نص السياسة.

### ه-٦ · توحيد بريد التواصل — ✅ **مغلق**

**البريد المعتمد بتوقيع المؤسس ([CTO-21] خامسًا): `qimmah.support@gmail.com`** — مملوء في كل مواضع هذه الحزمة (٦ مواضع: السياسة عربي/إنجليزي، الشروط عربي/إنجليزي، وحقلا التواصل).

**~~يبقى على المنسّق توحيده خارج هذه الحزمة~~ — أُغلق في [FINAL-COPY-RC]:** `site/support.html` و`site/press.html` وُحِّدا على العنوان المعتمد، و`docs/legal/privacy-policy.md` لم يعد يحمل بريدًا أصلًا (النصّ الحيّ يقرأ `VITE_LEGAL_CONTACT_EMAIL`). **ويحرسه الآن** `run-site-truth-proof.mjs` §٦ بنيويًّا. **يبقى خارج المستودع:** App Store Connect.

> **وملاحظة تسقط تبعًا:** كنتُ نبّهت أن `support@qimmah.app` يفترض نطاقًا بريديًا مُعدًّا — والاختيار الآن Gmail، فالافتراض ساقط والبريد يعمل فورًا. وهذا يزيل اعتمادًا كان قائمًا على تفعيل `qimmah.app` (ه-١٤ في وثيقة الموقع يبقى قائمًا للنطاق نفسه، لا للبريد).

---

## ما لم أفعله، ولماذا

- **لم أعدّل أي ملف شيفرة أو `Info.plist`.** حدود الغرفة: مواد جاهزة للتسليم، لا تعديل كود.
- **لم أحذف `privacy-policy.md` ولا `terms-of-service.md`.** حذفهما فعل لا رجعة فيه ويحتاج موافقتك؛ وقد وسمتهما بديلين في §٠.
- **لم أملأ الحد الأدنى للعمر.** حسمه قرار مالك (ه-١) وأي رقم أكتبه اليوم يناقض أحد المواضع الثلاثة.
- **لم أضف `NSHealthUpdateUsageDescription`.** التطبيق لا يكتب إلى الصحة؛ إضافته طلب صلاحية زائدة.
