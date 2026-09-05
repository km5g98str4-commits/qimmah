# نصّ `privacyBody` — سجلّ قانوني فصيح (عربي + إنجليزي)

> **مادة إدخال لمسار B — ليست أمرًا.** كُتبت في غرفة المنتج والمحتوى بتكليف **[CTO-53] ثالثًا**.
> الإدراج والبوابات والهبوط كلها من صلاحية مسار B والمنسّق (§1.3/§1.4). لم يُلمس أي كود ولا فرع ولا `package.json`.
>
> **الوجهة:** [`src/config/strings.ts`](../../src/config/strings.ts) — `legal.privacyBody`
> العربي عند [`:641`](../../src/config/strings.ts#L641) (العنوان [`:638`](../../src/config/strings.ts#L638)) · الإنجليزي عند [`:1113`](../../src/config/strings.ts#L1113) (العنوان [`:1110`](../../src/config/strings.ts#L1110)).
> **السطر [`:646`](../../src/config/strings.ts#L646) هو أثقل بنود دَين «عامّية-في-القانوني»** المرصود في [`REGISTER-INVENTORY.md`](./REGISTER-INVENTORY.md) — يفتتحه فعل «تقدر» في نصّ سياسة خصوصية. هذه الوثيقة تطفئه.

**تاريخ الكتابة:** 2026-07-31 · **الجذع المرجعي للفحص:** `site/launch-pack` @ `cf433e2`

---

## ١. القاعدة النبريّة المطبَّقة

الوجهة المعتمدة ([CTO-21]/[CTO-37]) — **العامّية السعودية البيضاء سجلّ الواجهة، والفصحى سجلّ القانوني.** سياسة الخصوصية **قانونية خالصة**: لا «تقدر»، ولا «ما نبيع»، ولا «عندك». الضمير للمستخدم بصيغة «يمكنك»، والنفي بـ«لا نبيع»، والشرط بـ«ما لم» و«إلا إذا».

**قاعدة الشاشة قائمة كما هي:** الكتلة القانونية **صوت ثانٍ معلَن مفصول بصريًا** داخل شاشة صوتُها صوت المنتج — الفصل بصري لا يُبرّر تليين النصّ.

---

## ٢. النصّ العربي — جاهز للنسخ

```ts
privacyBody: [
  'يعمل قِمّة بمبدأ «المحلي أولًا»: تُحفَظ بياناتك على جهازك أولًا وتبقى فيه. والمزامنة السحابية طبقة اختيارية فوق ذلك، لا تعمل إلا بعد تسجيل الدخول بحساب وتفعيلها. وما لم يتحقّق الشرطان معًا، لا تغادر بياناتك جهازك.',
  'الموافقة الصحية تسبق الجمع ولا تليه. لا يقبل التطبيق منك عمرًا ولا جنسًا ولا طولًا ولا وزنًا قبل موافقتك الصريحة على معالجة بياناتك الصحية، وهي موافقة منفصلة عن إنشاء الحساب. ويمكنك سحبها في أي وقت، فتتوقّف المعالجة المبنيّة عليها.',
  'والموافقة على المعالجة ليست موافقة على المزامنة. مغادرة بياناتك الصحية الحسّاسة — الأدوية والمكمّلات وحساسيات الطعام والإصابات — إلى حسابك السحابي تستلزم موافقة ثانية مستقلّة، لا بندًا مطويًّا في الأولى.',
  'وعند تفعيل المزامنة تُرسَل بياناتك عبر اتصال مشفّر إلى حسابك وحده، محميّةً بصلاحيات على مستوى الصف (Row Level Security) بحيث لا يطّلع عليها سواك.',
  'لا نبيع بياناتك ولا نشاركها مع معلنين، ولا نستخدمها في تتبّعك خارج التطبيق. وتبقى قياساتك وسجلّاتك ملكًا لك، ويمكنك محوها متى شئت من «الإعدادات ← إعادة ضبط البيانات».',
  'وإحصاءات الاستخدام مجهولة بالكامل: لا اسم ولا بريد ولا أي بيانات تعرّف بك، ومعرّفها رقم عشوائي يُولَّد على جهازك وغير مرتبط بحسابك. ولا تُرسَل هذه الإحصاءات إلى أي جهة ما لم تُضبَط للنسخة وجهة إرسال معلنة، ويمكنك إيقافها في كل الأحوال من «الإعدادات ← الخصوصية».',
  'ولا يطلب التطبيق موقعك إلا إذا فعّلت جدولة الوضع الداكن، ولغرض واحد: حساب وقتَي الغروب والشروق في منطقتك. لا يُخزَّن موقعك ولا يُرسَل، ولك بديل كامل باختيار مدينتك يدويًا، ورفض الإذن لا يحجب عنك شيئًا.',
  'وتُستخدم الكاميرا لمسح باركود المنتجات الغذائية فقط. تُقرأ الصورة على جهازك لفكّ الرمز فلا تُحفَظ ولا تُرسَل، ويُرسَل رقم الباركود وحده إلى قاعدة Open Food Facts لجلب بيانات المنتج، دون أي بيانات عنك.',
  'والحدّ الأدنى لاستخدام قِمّة اثنتا عشرة سنة. ولمن أعمارهم من 12 إلى 17 لا تُحسب ولا تُعرض وصفات رقمية مشتقة من نموذج البالغين، وتبقى التمارين وتسجيل الطعام والتقدّم والإرشادات النوعية متاحة.',
  'ويمكنك تصدير نسخة كاملة من بياناتك متى شئت من «الإعدادات ← البيانات»، وحذف حسابك من «الإعدادات ← الحساب ← حذف الحساب». وإذا تعذّر إتمام الحذف على الخادم فلا يُحذَف شيء ولا تُنهى جلستك، ويُعرَض لك تعذّره صراحةً بدل ادّعاء نجاح لم يقع.',
  'ولأي سؤال أو طلب يتعلّق ببياناتك: qimmah.support@gmail.com.',
],
```

---

## ٣. النصّ الإنجليزي — جاهز للنسخ

```ts
privacyBody: [
  'Qimmah is local-first: your data is stored on your device and stays there. Cloud sync is an optional layer on top, active only after you sign in and turn it on. Unless both conditions are met, your data does not leave your device.',
  'Health consent precedes collection; it does not follow it. The app accepts no age, sex, height, or weight from you before your explicit consent to the processing of your health data — a consent separate from creating an account. You may withdraw it at any time, and the processing based on it stops.',
  'Consent to processing is not consent to sync. For your sensitive health data — medications, supplements, food allergies, and injuries — to leave your device for your cloud account, a second, independent consent is required, not a clause folded into the first.',
  'When sync is enabled, your data is transmitted over an encrypted connection to your account alone, protected by Row Level Security so that no one but you can read it.',
  'We do not sell your data or share it with advertisers, and we do not use it to track you across apps. Your measurements and logs remain yours, and you may erase them at any time from Settings → Reset data.',
  'Usage analytics are fully anonymous: no name, no email, no identifying data. The identifier is a random value generated on your device and unlinked to your account. These analytics are transmitted nowhere unless a declared destination is configured for the build, and you may switch them off in every case from Settings → Privacy.',
  'The app requests your location only if you enable dark-mode scheduling, and for a single purpose: computing your local sunset and sunrise times. Your location is neither stored nor transmitted, you have a full alternative in choosing your city manually, and declining the permission withholds nothing from you.',
  'The camera is used solely to scan food-product barcodes. The image is read on your device to decode the barcode and is neither stored nor transmitted; only the barcode number is sent to the Open Food Facts database to retrieve product data, with no data about you.',
  'The minimum age to use Qimmah is twelve. Users aged 12–17 receive no numeric prescriptions derived from the adult model; workouts, food logging, progress tracking, and qualitative guidance remain available.',
  'You may export a full copy of your data at any time from Settings → Data, and delete your account from Settings → Account → Delete account. If the deletion cannot be completed on the server, nothing is deleted and your session is not ended; the failure is shown to you plainly rather than a success that did not occur.',
  'For any question or request concerning your data: qimmah.support@gmail.com.',
],
```

---

## ٤. سند كل بند — لا ادّعاء بلا مصدر

| # | البند | مصدر حقيقته |
|---|-------|-------------|
| ١ | المحلي أولًا · المزامنة اختيارية بشرطين | [`syncQueue.ts:9`](../../src/lib/syncQueue.ts#L9) `VITE_SYNC_ENABLED` افتراضه **OFF** ولا يفعّله إلا السلسلة `"true"` · [`:95-96`](../../src/lib/syncQueue.ts#L95) `isSyncEnabled()` · [`syncService.ts:201`](../../src/lib/syncService.ts#L201) يعيد «غير مفعّلة في هذه النسخة» · فلسفة `CLAUDE.md` §9 |
| ٢ | الإذن قبل الجمع | [`onboardingV2Flow.ts:132-134`](../../src/lib/onboardingV2Flow.ts#L132) — `healthConsent` يُفحص **قبل** أي حقل جسدي، ويحرسه `test:policy` · نوع الموافقة [`types/onboarding.ts:134-140`](../../src/types/onboarding.ts#L134) |
| ٣ | نطاق الحسّاس + موافقة ثانية | النطاق من الشكل الفعلي: [`onboardingProfile.ts:54-56`](../../src/lib/onboardingProfile.ts#L54) — `foodPreferences.allergies` · `limitations.injuries` · `wellnessTracking.{supplements,medications}` · **قرار مقفل** `CLAUDE.md` §8 رقم ٥ |
| ٤ | RLS + اتصال مشفّر | نمط الحذف الذاتي عبر RLS [`authContext.tsx:406`](../../src/lib/authContext.tsx#L406) · موائم لصفحة الموقع |
| ٥ | لا بيع ولا معلنين · إعادة الضبط | `resetQimmah` [`lib/resetQimmah.ts`](../../src/lib/resetQimmah.ts) · تسمية الزر [`strings.ts:566`](../../src/config/strings.ts#L566) / EN [`:1038`](../../src/config/strings.ts#L1038) |
| ٦ | التحليلات مجهولة · **ولا تُرسَل بلا وجهة** | [`analytics/consent.ts:1-7`](../../src/lib/analytics/consent.ts#L1) معرّف UUID محلي غير مرتبط بالمصادقة · [`analytics/index.ts:37-58`](../../src/lib/analytics/index.ts#L37) المزوّد **no-op** ما لم يكن `VITE_ANALYTICS_ENDPOINT` رابط HTTPS صالحًا · [`.env.example:37`](../../.env.example#L37) القيمة **فارغة** |
| ٧ | الموقع لجدولة الغروب وحدها | [`geolocation.ts:1-3`](../../src/lib/geolocation.ts#L1) «لجدولة الغروب، شاشة ٦٦… عند الرفض يلجأ المستدعي للبديل اليدوي — لا حجب» · [`appPreferences.ts:13-18`](../../src/lib/appPreferences.ts#L13) · [`Info.plist:31`](../../ios/App/App/Info.plist#L31) `NSLocationWhenInUseUsageDescription` |
| ٨ | الكاميرا للباركود · ورقم الباركود لطرف ثالث | فكّ الرمز محليًا [`webZxingEngine`](../../src/features/barcode/) عبر `getUserMedia` [`ScanFoodPanel.tsx:57`](../../src/features/barcode/ScanFoodPanel.tsx#L57) · الطلب الشبكي [`openFoodFacts.ts:6`](../../src/features/barcode/openFoodFacts.ts#L6) `https://world.openfoodfacts.org/api/v2/product` و[`:131`](../../src/features/barcode/openFoodFacts.ts#L131) يرسل **الباركود وحده** |
| ٩ | ١٢ حدًّا أدنى · ١٨ عتبة مسار البالغين | [`profileDomain.ts`](../../src/config/profileDomain.ts) `AGE_RANGE = { min: 12, max: 100 }` · [`calculators.ts`](../../src/lib/calculators.ts) `ADULT_MIN_AGE = 18` · `MINOR_BMI_LABEL` · `MINOR_PLAN_NOTE` |
| ١٠ | التصدير · الحذف · **صدق الفشل** | التصدير عبر [`lib/portability`](../../src/lib/portability/) و[`DataManagementPanel.tsx:24`](../../src/components/DataManagementPanel.tsx#L24) · الحذف [`authContext.tsx:398`](../../src/lib/authContext.tsx#L398) · **صدق الفشل** [`:415-419`](../../src/lib/authContext.tsx#L415): فشل حذف مستخدم المصادقة ⇒ لا يُحذف صفّ ولا تُنهى الجلسة |
| ١١ | بريد الدعم | **قرار مؤسس موقّع** [CTO-21] خامسًا — موثّق في [`APPSTORE-COMPLIANCE-PACK.md:611`](../legal/APPSTORE-COMPLIANCE-PACK.md) |

---

## ٥. البنود المعلّقة — لا تُؤكَّد قبل هبوطها

### ‏🔶 البند ١٠ — نصف الجملة الخاص بشمول الحذف · `[معلّق على هبوط B]`

النصّ الحالي على الجذع ([`:646`](../../src/config/strings.ts#L646)) يَعِد بحذف **«حسابك وكل بياناته نهائيًا»**. والكود اليوم:

- ✅ **صادق عند فشل الخطوة الأولى**: تعذّر `delete_own_account` ⇒ `ok:false` بلا حذف أي صفّ ([`authContext.tsx:415-419`](../../src/lib/authContext.tsx#L415)) — هذا مثبت وأدرجته في النصّ أعلاه.
- ⚠️ **غير مثبت في الخطوة الثانية**: تنظيف الجداول الخمسة بعد نجاح الحذف **best-effort داخل `try/catch` صامت** ([`:431-437`](../../src/lib/authContext.tsx#L431)) — فقد يبقى صفّ ولا يعلم المستخدم. وهذا بالضبط ما يعالجه بند **`authDeletePartial`** المسنَد لمسار B في [CTO-47].

**لذلك:** كلمة **«نهائيًا»** أو **«وكل بياناته»** لا تُكتب قبل هبوط B. النصّ أعلاه **يتجنّبها عمدًا** ويكتفي بـ«وحذف حسابك».

**بعد هبوط `authDeletePartial` — تُستبدل بداية البند ١٠ العربي بـ:**
> `'ويمكنك تصدير نسخة كاملة من بياناتك متى شئت من «الإعدادات ← البيانات»، وحذف حسابك وكل بياناته نهائيًا من «الإعدادات ← الحساب ← حذف الحساب». وإذا تعذّر…'`

**والإنجليزي بـ:** `'…and permanently delete your account and all its data from Settings → Account → Delete account. If the deletion…'`

### ‏🔶 البند ٣ — بوّابة الموافقة الثانية · `[معلّق على هبوط G]`

نصّ البند التزام مسنَد إلى **قرار مؤسس مقفل** (`CLAUDE.md` §8 رقم ٥)، لكن **بوّابته غير موجودة في الكود اليوم**: لا أثر لـ`syncConsent` في `src/`، والبوابة عمل مسار G (`g/sync-consent-gate`) وهو **غير هابط**.

**النشر آمن اليوم بيقين**: `VITE_SYNC_ENABLED` مطفأ ([`syncQueue.ts:9`](../../src/lib/syncQueue.ts#L9)) فلا مزامنة تقع أصلًا، فالوعد لا يُخالَف. **لكن الأمان ظرفي لا بنيوي** — تفعيل علم المزامنة قبل هبوط G يجعل هذا البند وعدًا مخالفًا للكود. الميثاق يرصد التعارض نفسه في «دَين مفتوح موثّق».

---

## ٦. مواءمة صفحة خصوصية الموقع

فُحصت [`site/privacy.html`](../../site/privacy.html) بندًا بندًا. **الحقائق متطابقة** في: المحلي أولًا · الموافقة الصحية قبل الجمع · «الموافقة على المعالجة ليست موافقة على المزامنة» · الموقع للغروب وحده مع البديل اليدوي · الكاميرا للباركود والباركود لطرف ثالث · RLS · لا تتبّع طرف ثالث. النصّ أعلاه **مشتقّ من نفس الحقائق** بصياغة أقصر تناسب شاشة داخل التطبيق.

**فارق واحد يحتاج انتباه B:** الموقع يقول «قِمّة **لا يجمع** بيانات استخدام افتراضيًا»، والكود `DEFAULT_CONSENT = 'granted'` ([`consent.ts:18`](../../src/lib/analytics/consent.ts#L18)) — أي **الموافقة ممنوحة افتراضيًا** ونموذجها opt-out. والعبارتان تتصالحان اليوم فقط لأن المزوّد `no-op` بلا وجهة إرسال. صياغتي أعلاه («لا تُرسَل… ما لم تُضبَط للنسخة وجهة إرسال معلنة») **تصف الحالتين معًا بلا تناقض** وتصمد لو ضُبطت الوجهة لاحقًا.

---

## ٧. يُرفع لغرفة الهندسة

1. **تعارض بريد الدعم — تناقض داخل الحزمة الواحدة.** [`strings.ts:675`](../../src/config/strings.ts#L675) و[`:1147`](../../src/config/strings.ts#L1147) ما زالا يحملان `support@qimmah.app`، وهو موثّق في [`docs/release/RC-v1.2.0.md:132`](../release/RC-v1.2.0.md) بأنه **«عنوان وهمي»**. المعتمد بتوقيع المؤسس ([CTO-21] خامسًا) `qimmah.support@gmail.com`، وصفحات الموقع صُحّحت في `a8ced00` — **والتطبيق لم يُصحّح**. نصّي يحمل المعتمد، فسيقع التطبيق على تناقض داخلي: سياسة الخصوصية تقول بريدًا وشاشة «تواصل معنا» تقول آخر. **تصحيح `contact.emailValue` (موضعان) شرط لاتّساق الشاشة** — ولمسار B أن يقرّر ضمّه أو تسلسله.
2. **البند ٦ يصحّح ادّعاء قائمًا.** النصّ الحالي [`:645`](../../src/config/strings.ts#L645) يقول «**نستخدم** إحصاءات استخدام مجهولة» بصيغة المضارع المؤكِّد، وبناء اليوم **لا يرسل شيئًا** (`.env.example:37` فارغ ⇒ `noopProvider`). الصيغة الجديدة تُسقط الادّعاء بلا إنقاص للشفافية.
3. **البند ٣ لا يُنشَر مع علم مزامنة مفعّل** قبل هبوط G — انظر §٥ أعلاه.
4. **طول المصفوفة تغيّر من ٥ إلى ١١** عنصرًا. الحقل `string[]` يُعرَض فقرةً لكل عنصر، فالتغيير آمن بنيويًا — لكن **يقع على B فحصه بصريًا بالعربية والإنجليزية** (§6 من الميثاق: RTL أولًا).
5. **`CLAUDE.md` §6 و`.claude/rules/copywriting.md`** ما زالا يوجبان «فصحى دافئة» لكل نصّ — وهو ما ينقض وجهة [CTO-21]/[CTO-37] نصًّا. **تعديلهما فعل مؤسّس؛ لم أمسّهما.** (لا يعطّل هذه الوثيقة: القانوني فصيح في القراءتين.)

---

## ٨. ما تحتاجه هذه الوثيقة منك — قرارات المالك

| # | القرار | لماذا يحتاجك أنت |
|---|--------|------------------|
| ١ | **تصحيح `contact.emailValue` — الآن أم موجة تالية؟** | العنوان القائم وهمي موثّق، والتناقض داخل الشاشة نفسها. القرار توقيت لا مبدأ. |
| ٢ | **تاريخ «آخر تحديث» للسياسة** | حقل النشر في حزمة الامتثال ما زال `[قرار المالك]`، والمتجر يطلبه. |
| ٣ | **البند ٩ — اعتماد الصياغة القانونية لعمر ١٢–١٧** | المؤسس حسم `AGE_RANGE.min = 12` وحدّ البالغين = 18؛ يبقى اعتماد الصياغة القانونية ومسألة غياب موافقة ولي الأمر للمراجع القانوني. |
| ٤ | **الترتيب مقابل مسار G** | إن كان تفعيل المزامنة قريبًا، فبوّابة G تسبق نشر البند ٣ لا تليه. |
