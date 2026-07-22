# قِمّة — التدقيق البنيوي العميق (كشف كامل، قبل أي إصلاح)

**الأساس:** `origin/design/v21-promotion` @ **cc96d84** · التاريخ: 2026-07-21 · **تقرير فقط — صفر تعديل كود.**
**المنهج:** ٥ وكلاء قراءة متوازيون غطّوا الكود «من وإلى» (القشرة/التمرير · التنقّل/الإعدادات · طبقة البيانات · الشاشات/الميزات · الأداء/الترجمة/صقل iOS)، ثم مراجعة حاكم ثانٍ مستقل (القسم H). كل نتيجة بدليل `file:line`.

---

## A. الحكم التنفيذي — «هل هو صفحة HTML محوّلة لتطبيق؟»

**نعم بنيويًا — في القشرة.** المستند نفسه هو المتمرِّر (body scroll): `html/body` بلا قفل ارتفاع أو `overflow:hidden` (`styles/index.css:30-45`)، الهيدر `sticky` داخل تدفّق المستند لا `fixed` (`MobileShell.tsx:88`)، منطقة المحتوى `<main>` **بلا** `overflow-y` (`MobileShell.tsx:141`)، وكل شاشة رئيسية `min-h-screen` تدفع المستند كله للتمرّر. هذا **توقيع «موقع ويب ملفوف»** حرفيًا — تويتر وأمثاله يعكسونه: قشرة مقفلة على الشاشة + منطقة داخلية واحدة تتمرّر تحت إطار ثابت.

**والأدهى:** الـscrollbar الذي يزعجك **مُصمَّم ظاهرًا عمدًا** — `::-webkit-scrollbar { width:10px }` بمقبض وخلفية مستايلة (`styles/index.css:113-125`)، ولا يوجد أي إخفاء له في المشروع كله. وارتداد WKWebView الأصلي غير معطَّل (AppDelegate قالب خام؛ لا `bounces=false`).

لكن الصورة ليست سوداء بالكامل: التقسيم الكسول للمسارات ممتاز، الأمان/الأذونات مضبوطة، وoverlays (الأوراق/التمرين النشط) تستخدم النمط الصحيح أصلًا. **الخلل بنيوي ومركّز — وقابل للإصلاح بمسار محدّد** (القسم G).

---

## B. القشرة والتمرير (جذر «إحساس الويب»)

| # | المشكلة | الدليل | الحل التقني الأفضل |
|---|---|---|---|
| B1 | scrollbar ظاهر ومستايل (10px) على حافة الشاشة | `index.css:113-125`؛ لا `scrollbar-width:none` في المشروع | `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` — إصلاح فوري صفر مخاطرة |
| B2 | المستند كله يتمرّر (لا قشرة مقفلة) | `index.css:30-45` بلا height/overflow؛ `MobileShell.tsx:77,86` `min-h-screen`؛ `<main>` بلا overflow (`:141`) | `html,body,#root{height:100dvh;overflow:hidden}` + القشرة عمود flex بارتفاع كامل + `<main>` هو **المتمرِّر الوحيد** (`flex-1 overflow-y-auto overscroll-y-contain`) |
| B3 | الهيدر sticky (يتحرك مع bounce) والـnav fixed (يهتز أثناء الزخم) | `MobileShell.tsx:88,147` | بعد B2: الهيدر والـnav صفّان عاديان فوق/تحت المتمرِّر — يثبتان تلقائيًا بلا fixed/sticky |
| B4 | ارتداد WKWebView الأصلي غير معطَّل | `AppDelegate.swift` خام؛ `capacitor.config.ts` بلا scrollEnabled/bounces | بعد نجاح B2: `ios.scrollEnabled:false` (أو `webView.scrollView.bounces=false`) — **آخر خطوة** حتى لا نقفل قشرة لا تتمرّر |
| B5 | كل شاشة رئيسية `min-h-screen` (تكرار ثلاثي التعشيش) | TodayV2:46 · WorkoutV2:919/961 · NutritionV2:97/406 · ProgressV2:78+ · ProfileV2:70/382 · RecoveryV2:53/137 | إزالة `min-h-screen` من جذور الشاشات بعد B2 (الـ`<main>` يملك الارتفاع) |

**ترتيب التنفيذ الآمن:** B1 → B2 → B3+B5 → B4. الشاشات الغامرة (التمرين النشط/Onboarding) سليمة أصلًا — لا تُلمس.

---

## C. التنقّل وبنية المعلومات («الحوسة»)

| # | المشكلة | الدليل | الحل الأفضل |
|---|---|---|---|
| C1 | **نظاما إعدادات كاملان** يعيشان معًا ويحيل أحدهما للآخر بقشرة مختلفة (ProfileV2 داخلي + SettingsView القديم بهيدر AppNav وفوتر خاصين) | `ProfileV2.tsx:198-231,226-227` → `SettingsView.tsx:142,376` (٩ مجموعات إضافية) | **إعدادات واحدة** بنمط iOS: صفحة واحدة، كل صف → لوحة تفصيل واحدة (عمق ≤2)؛ حذف SettingsView وAppNav وNotificationSettingsPanel القديمة بعد نقل وظائفها (حذف الحساب، تعديل الخطة، اللغة) |
| C2 | زر «تسجيل» الأوسط **نسخة من تبويب التغذية** (نفس route وid — الاثنان يضيئان معًا) | `MobileShell.tsx:64-65` | تحويله لـ**ورقة تسجيل سريع** فعلية (وجبة · ماء · وزن · تعافٍ) — وهذا يحل شكواك «ما هو نفس المخصص له» |
| C3 | شارة «حساب» في الهيدر `<span>` ميت بلا onClick — والمدخل الحقيقي أيقونة الأفاتار جنبه | `MobileShell.tsx:98-106` مقابل `:108-119` | حذف الشارة (قرار الهيدر الكامل مؤجّل بطلبك) |
| C4 | **صفوف خادعة:** «حذف الحساب» في خصوصية v2 لا يحذف بل يقفز للنظام القديم؛ «مشاركة بيانات الصحة» صف **معطَّل** «غير مربوطة بعد» بينما الربط الفعلي في شاشة أخرى | `ProfileV2.tsx:188,186` | قاعدة: لا صف معطَّل «ديكور» — إمّا يعمل في مكانه أو يُخفى |
| C5 | «عام» (اللغة/الوحدات/الأرقام) صفوف **للعرض فقط** بلا تعديل | `ProfileV2.tsx:207-209` | جعلها قابلة للتعديل في مكانها |
| C6 | «الأدوية والمكمّلات» من الملف يرمي على الإعدادات القديمة العامة (رابط مضلِّل) | `ProfileV2.tsx:106` | وجهة صحيحة أو صف مخصّص |
| C7 | التصدير/الاستيراد له **٣ أبواب** بمسارات مختلفة | بياناتي + خصوصية→بيانات + DataManagementPanel القديم | باب واحد |
| C8 | شاشتان يتيمتان بلا أي رابط داخلي (`stats`/MyStatsView و`exercises`/مكتبة التمارين كمسار) + ٦ مكونات تسويقية ميتة في الحزمة (Header.tsx وsections/*) و٦ أغلفة v1 مجرد إعادة تصدير | `App.tsx:410,430`؛ 0 مستوردين للأقسام | وصلها أو حذفها؛ تنظيف الميت |
| C9 | Profile ليس تبويبًا — مخفي خلف الأفاتار فقط | `MAIN_TABS` (`appRoutes.ts:54`) | ترقيته تبويبًا خامسًا (ضمن حل C2) — **مقترح، بانتظار قرار الهيدر** |

**البنية المستهدفة المقترحة:** ٥ تبويبات حقيقية `[اليوم · التمارين · (+) تسجيل · التقدّم · الملف]`، إعدادات واحدة بعمق ≤2، صفر صفوف خادعة، صفر إحالات تُبدّل القشرة.

---

## D. طبقة البيانات والحالة («الخلل الكبير» — تأكّد)

| # | المشكلة | الدليل | الحل الأفضل |
|---|---|---|---|
| D1 | **الماء في ٤ مفاتيح بكاتبَين متنافسين** (v1 nutritionTracking + v2 nutritionV2Model كلاهما يعكس للسجل القانوني؛ mirror الـv2 يترك `nutritionLogs.waterMl` قديمًا) — رقمان مختلفان للماء حسب القارئ | `nutritionTracking.ts:136-137` + `nutritionV2Model.ts:46-47`؛ ١٣ ملف قارئ | **حقيقة واحدة لكل معلومة:** متجر nutritionDay واحد؛ حذف كاتب v1؛ البقية مشتقات |
| D2 | **جيلان يعيشان معًا:** v1 (`*Tracking/*Today/activeSession`) + v2 — وactiveSession **ميت** (`saveActiveSession` لا يُستدعى) + ٣ توائم legacy للتاريخ + migration يعاد فحصه في كل قراءة | `activeSession.ts:151`؛ `historyStore.ts:35-44,451` | تنفيذ «REMOVAL PLAN» المكتوب أصلًا في الكود: حذف جيل v1 والمفاتيح القديمة بعد migration نهائي |
| D3 | **عزل الحسابات غير متّسق:** ~13 مفتاحًا موسومًا بالمستخدم مقابل ~25 مفتاح بيانات مستخدم **عالمية** يحميها فقط مسح-عند-التبديل (والكود نفسه يسمّيها "critical flaw #4")؛ ضيف→مسجَّل لا يمسح | `accountScope.ts:3-5,54-72`؛ `App.tsx:114-115` | استراتيجية واحدة: توسيم كل مفاتيح بيانات المستخدم بالـuid (النمط موجود في todo/plates/recovery) من سجلّ مفاتيح مركزي |
| D4 | **لا نظام اشتراك:** ~60 مفتاحًا، 4 contexts فقط، والباقي قراءة localStorage + عدّادات `tick/bump` يدوية؛ حدث `qimmah:steps-updated` يُبثّ **بلا مستمع** | `NutritionV2.tsx:75,83`؛ `healthKit.ts:120` | تعميم `useSyncExternalStore` (النمط مثبت أصلًا في nutritionTracking وachievements) — يلغي الـbumps ويحل التحديث بين الشاشات |
| D5 | **مزامنة server-wins عمياء:** `updated_at` يُكتب ولا يُقرأ للحسم — جهاز بتعديلات أحدث يخسرها عند الترطيب | `syncService.ts:249-251,268-329` | LWW فعلي بالـ`updated_at` الموجود |
| D6 | اقتران البيانات بالإقلاع: نماذج Today/Workout/Progress تسحب `exercises` (73KB) + `exerciseCues.generated` (**201KB**) ستاتيكيًا → عنقود 162KB | `workoutV2Model.ts:10-11`؛ `coaching/cues.ts:6` | تحميل الـcues/الميتاداتا كسولًا بالمعرّف (السابقة موجودة: `onboardingProfile.ts:286`) |

---

## E. الشاشات والميزات (ملاحظاتك + ما نبشناه)

| # | المشكلة | الدليل | الحل الأفضل |
|---|---|---|---|
| E1 | **أعمدة مسار اليوم غير قابلة للضغط** (إلا التعافي) — مؤكّد: الثلاثة الأخرى spans بلا أزرار | `TodayV2.tsx:93-108` | كل عمود زر → وجهته (تدريب→workout، تغذية→nutrition، حركة→progress) |
| E2 | «اليوم» قصيرة فعلًا: insight واحد فقط (`max={1}`)، وعمودا الحركة/التعافي **دائمًا dashed** (التعافي hardcoded locked، والحركة تتطلب مصدر خطوات) | `InsightCardsView` max=1 (`TodayV2.tsx:113`)؛ `todayV2Model.ts:195-197` | رفع سقف الرؤى + توصيل عمود التعافي بحالته الفعلية + hero أغنى — **يرتبط بقرارك «هيلث عند البداية» الذي يُحيي عمود الحركة** |
| E3 | «رؤى الأسبوع»: جمل طويلة بلا عناوين، عنوان EN غير متّسق بين الشاشات، خطر تسريب مفتاح عضلة خام | `insightCopy.ts:10-24`؛ `generate.ts:63` | إعادة كتابة copy: عنوان قصير + جملة + فعل، وتوحيد العناوين |
| E4 | **صور التمارين موجودة (125 تمرينًا بصور ملتزمة + مكوّن cross-fade) لكنها غير مستخدمة في مسار التمرين** — شاشة التفاصيل النشطة ترسم أيقونة دمبل ثابتة؛ ولا يوجد GIF/فيديو إطلاقًا (`exerciseGifs = {}` عمدًا) | `WorkoutV2.tsx:965`؛ `exerciseMedia.ts`؛ `exerciseGifs.ts:8` | مرحلة ١ (يوم): استخدام `ExerciseMedia` الموجود في detail+active. مرحلة ٢ (مشروع): مصدر GIF/فيديو مرخَّص أو إنتاج خاص — **قرار محتوى** |
| E5 | **لا مبرّر لعدد المجموعات:** «4×8–12» يُشتق من المستوى+الهدف (`setsFor`+`SCHEMES`) لكن **صفر** شفافية للمستخدم | `planGenerator.ts:118-144`؛ لا "لماذا" في WorkoutV2 | سطر rationale تحت الأرقام («٤ مجموعات لأنك متوسط + هدفك تنشيف») — البيانات موجودة |
| E6 | ترتيب التمارين **سليم فعليًا** (compound-first بأولويات صريحة) — شكواك غالبًا عن غياب التفسير لا الترتيب | `planGenerator.ts:266-337` | يغطّيه E5 (الشفافية) — يُراجَع معك بعد التجربة |
| E7 | **الباركود:** الفرضية الأولى مرتّبة = غياب `focusMode:'continuous'` في قيود الكاميرا (WKWebView يعلق على تركيز بعيد فتبقى الأعمدة الرفيعة مشوشة) ثم فكّ الإطار الكامل مع باركود صغير (الإطار التجميلي ≠ منطقة الفك) ثم توقيت zxing في WKWebView | `BarcodeCamera.tsx:79-85,35,137-140` | إضافة focus/zoom constraints + قصّ ROI؛ وإن لم يكفِ: **بديل native** (MLKit plugin أو BarcodeDetector) — الأصلي هو الحل المضمون على iOS |
| E8 | **الجرامات:** stepper الحصص موجود؛ لا إدخال جرامات — والبيانات تسمح (~600 صنف فيها `servingGrams`؛ مجموعة eating-out ينقصها) + حقل `sizes` (S/M/L) **موجود في البيانات وميت في الواجهة** | `NutritionV2.tsx:299-327`؛ `foodItems.ts:53-59` | إدخال جرامات ↔ حصص متزامنان (تعديل أحدهما يحدّث الآخر) + تفعيل sizes + إكمال `servingGrams` للناقص |
| E9 | **«أضف يدويًا» عند فشل الباركود طريق مسدود** — يقفل الماسح ويرجعك للبحث بلا نموذج؛ ولا يوجد quick-add سعرات/بروتين مخصّص | `ScanFoodPanel.tsx:154,174`؛ `NutritionV2.tsx:461` | نموذج إدخال يدوي فعلي (اسم + سعرات + بروتين + جرامات) |
| E10 | **التعافي ضحل** (قرارك: إعادة): سلايدر+٣ اختيارات → ٤ توصيات من جمع نقاط ثابت؛ السجل قائمة نصية بتواريخ ISO خام؛ معزول عن هيلث/الحمل الفعلي | `recovery.ts:49-63`؛ `RecoveryView.tsx:180-190` | إعادة تصميم: اتجاه أسبوعي مرئي + ربط بحمل التدريب الفعلي (+ نوم هيلث لاحقًا) مع بقاء قاعدة «اقتراح لا تغيير» |
| E11 | رسم الوزن sparkline بلا محاور/تواريخ، والمسافة بالفهرس لا بالزمن (انحدار مضلِّل عند فجوات التسجيل) | `ProgressV2.tsx:518-539` | رسم بمحور زمني حقيقي + نقاط وتواريخ (مكوّن رسم واحد يعاد استخدامه) |
| E12 | **هيلث «عند البداية»** (قرارك المعتمد): Swift جاهز أصلًا (يقبل مصفوفة metrics)؛ التغيير = نداء واحد شامل عند أول فتح + مواءمة صفوف شاشة 68 | `HealthKitStepsPlugin.swift:36-56`؛ `healthKit.ts:142,194,240` | `requestAuthorization({metrics:[steps,weight,heartRate]})` عند أول إقلاع بعد الترحيب، وشاشة 68 تعرض الحالة |

---

## F. الأداء والترجمة وصقل iOS

| # | المشكلة | الدليل | الحل الأفضل |
|---|---|---|---|
| F1 | **سبلاش ٢٫١٥ ثانية مؤقّت تجميلي فوق تطبيق جاهز** — أكبر مكسب إحساس فوري (~1.5s) | `SplashScreen.tsx:6-7`؛ `main.tsx:69-81` | إخفاؤه عند الجاهزية الفعلية (auth-ready) أو سقف ~700ms |
| F2 | **لا إيماءة رجوع بالسحب من الحافة** — من أقوى علامات «الويب» | لا `allowsBackForwardNavigationGestures`؛ hash routing | تفعيل سحب-الرجوع أو محاكاته على مستوى الشاشات الداخلية |
| F3 | **شريط الحالة مقفول على نمط داكن** لا يتبع الثيم (نص شبه مخفي في الفاتح) | `capacitor.config.ts:34`؛ `nativeShell.ts:36` | `StatusBar.setStyle` ديناميكي مع `applyTheme` |
| F4 | هابتكس في التمرين فقط (٤ مواضع) — فرص مفقودة (إنجاز/تسجيل/تأكيد) | grep `playHaptic` | توسيع التغطية عبر نفس `nativeFeedback` |
| F5 | خطوط: Tajawal بـ٥ أوزان **كاملة الـsubsets** بلا preload (~150-200KB معطِّلة أول نص) | `fonts.ts` مقابل subsets الجاهزة | `arabic-*` subsets + إسقاط وزن مكرّر + preload |
| F6 | مكتبة `react-body-highlighter` **ميتة** (import type فقط) وchunk لها بلا معنى + `dailyPhrases.ts` (417 سطرًا) بلا مستورد | `muscleMapLib.ts:1`؛ vite.config:82 | حذف التبعية والملفات الميتة |
| F7 | **تسريبات EN المتبقية ضيّقة:** رقائق العضلات على صور التمارين دائمًا عربية (المكوّن بلا lang) + `servingLabelAr` في نتائج البحث (لا يوجد EN في البيانات) + aria-labels قليلة؛ ومحتوى التعليم/النصائح عربي-فقط **مخفي** في EN (فقد ميزة لا تسريب) | `ExerciseMedia.tsx:168,191`؛ `NutritionV2.tsx:309` | تمرير lang للمكوّن + إضافة `servingLabelEn`؛ وقرار منفصل: ترجمة محتوى التعليم أم إبقاؤه عربيًا |
| F8 | أرقام غير متّسقة داخل العربية (سعرات بأرقام غربية بينما بقية الشاشات هندية-عربية) | `NutritionV2.tsx:118-119` مقابل `toAr` | توحيد عبر منسّق واحد |
| F9 | ثنائيات صغيرة: خلفية native `#101216` مقابل storyboard `#0F1115` (وميض محتمل) ولا تطابق Sand؛ landscape مسموح على قشرة عمودية؛ `ITSAppUsesNonExemptEncryption` ناقص | `capacitor.config.ts:11,20,35`؛ Info.plist | توحيد الألوان بحسب الثيم؛ قفل portrait؛ إضافة المفتاح |
| F10 | لا دعم Dynamic Type (أحجام ثابتة + `user-scalable=no`) | index.html؛ `text-[10px]` | خارطة أحجام نسبية — **مشروع لاحق، يُقيَّم أثره** |

---

## G. المسار المقترح (للمراجعة معك — ليس خطة معتمدة)

**المرحلة ١ — «يصير آيفون»:** B1→B5 (القشرة والتمرير) + F1 (السبلاش) + F3 (شريط الحالة) + F2 (سحب الرجوع). *هذه وحدها تقلب الإحساس.*
**المرحلة ٢ — «يرتّب بيته»:** C1-C9 (إعدادات واحدة + تبويبات حقيقية + تنظيف الميت) — يعتمد جزئيًا على **قرار الهيدر المؤجّل عندك**.
**المرحلة ٣ — «يصدق مع بياناته»:** D1-D5 (توحيد الحقائق، حذف v1، اشتراكات، عزل موحّد، LWW).
**المرحلة ٤ — «يكتمل كمنتج»:** E1-E12 (أعمدة قابلة للضغط، صور التمارين في مسار التمرين، الباركود native، جرامات+حصص، تعافٍ معاد، هيلث عند البداية، rationale) + F4-F8.
**مؤجَّل بقرار:** F10 (Dynamic Type)، GIF/فيديو التمارين (قرار محتوى/ترخيص)، ترجمة محتوى التعليم. ~~مستوى Eat Lab~~ — **أُلغي كمرجع بقرار المالك (2026-07-21)**.

---

## H. حكم الوكيل الثاني (مراجعة مستقلة، بمرجعية Apple HIG)

> وكيل مستقل أعاد التحقق من الكود بنفسه (٢٥ من ~٤٠ ادعاءً أُعيد فحصها سطرًا سطرًا) وحكم على كل توصية. **خلاصته: التقرير موثوق — صفر اختلاقات، خطأ وقائعي واحد، و٣ مبالغات صُحّحت أدناه.** النص الكامل كما ورد:

### H.1 Spot-Check Results (evidence-verified)

| # | Claim | Verdict |
|---|---|---|
| a | Body-scroll shell (document is the scroller) | **CONFIRMED** — all cited lines accurate. Nuance: `overscroll-behavior:none` already attempted at CSS level (`index.css:35,44`); unreliable in WKWebView, so B4 stands. |
| b | Visible styled 10px scrollbar, never hidden | **CONFIRMED** (`index.css:113-125`; zero hiding rules project-wide) |
| c | Center "Log" tab duplicates Nutrition tab | **CONFIRMED** (`MobileShell.tsx:64-65`; center button permanently styled primary at `:163`, no quick-log sheet exists) |
| d | Dead Account badge span | **CONFIRMED** (`MobileShell.tsx:98-106`) |
| e | Two full settings systems | **CONFIRMED** (ProfileV2:198-231 ↔ SettingsView 489 lines with own AppNav/Footer chrome; decoy rows at ProfileV2:186,188 confirmed) |
| f | Exercise images exist but workout path shows placeholder | **CONFIRMED** (125 dirs in public/exercise-images; ExerciseMedia never imported by WorkoutV2; placeholder at `:965`) |
| g | Barcode constraints lack focus/ROI | **CONFIRMED, with correction** — file is `src/features/barcode/BarcodeCamera.tsx`; see E7 verdict. |

Also independently verified: D1 dual-writer water divergence, D2 dead `saveActiveSession`, D3 "critical flaw #4" comment, D4 orphan `steps-updated` event, D5 blind server-wins, F1 2150ms splash, F3 locked dark status bar, F5 five full-subset font weights, F6 type-only import, F8 numeral inconsistency, C8 orphan routes, E1/E2 pillar/insight caps, E12 Swift metrics array.

**Inaccuracies found (minor, none change recommendations):**
1. **C8 "0 importers" wrong as stated** — `SetupView.tsx:2` imports CustomizationCenter (live); Footer is transitively live until C1 deletes SettingsView. Deletion must be import-graph-verified.
2. **F9 overstates the dark-on-dark flash** (~2 RGB units, imperceptible). The REAL first-paint problem: native chrome (storyboard/splash/status bar/WebView bg) is dark-only while the app ships a Sand light theme → dark→light flash on every cold start for light-theme users. Belongs in Phase 1.
3. **E7's lead hypothesis overweighted** — iOS camera streams default to continuous autofocus at AVCaptureDevice level; stronger causes are 720p full-frame decode with thin EAN-13 bars + zxing throughput in WKWebView. **`BarcodeDetector` is NOT available in WKWebView — strike that fallback**; the guaranteed native path is `@capacitor-mlkit/barcode-scanning` or AVFoundation `AVCaptureMetadataOutput`.

### H.2 Section Verdicts

**B — Shell & Scroll:** B1 AGREE. **B2 AGREE — the right architecture, not merely acceptable** (body-scroll alternative rejected: sticky header rides rubber-band, fixed nav jitters; since iOS 13 inner CSS scrollers get identical compositor inertia). Two required additions: (1) restore status-bar-tap scroll-to-top via Capacitor's `statusTap` event on the inner `<main>`; (2) inner scroller must use `overscroll-behavior: contain` — NOT `none`. B3 AGREE. **B4 AGREE-WITH-CHANGES:** prefer `webView.scrollView.bounces=false` over `ios.scrollEnabled:false` (the latter can break keyboard scroll-into-view); killing WebView rubber-band is HIG-correct ONLY because inner-scroller rubber-band is preserved — never "upgrade" contain to none. B5 AGREE.

**C — Navigation & IA:** C1 AGREE (worst IA defect in the app; target = exact iOS Settings pattern). **C2 AGREE-WITH-CHANGES:** raised center action is a tolerated convention, not HIG-sanctioned — acceptable since logging is the core loop, on three conditions: native sheet manners (dimmed backdrop, grabber, drag-to-dismiss), no tab-selection state on the button, VoiceOver-reachable as a button. C3-C7 AGREE (all verified). C8 AGREE-WITH-CHANGES (fix dead-list per H.1#1). C9 AGREE (HIG 3–5 tabs; Profile behind unlabeled avatar fails discoverability).

**D — Data layer: sound engineering, NOT over-engineering — AGREE on all six.** Decisive fact: every recommendation reuses a pattern already in the repo (uid-scoping in todo/plates/recovery; useSyncExternalStore in nutritionTracking/achievements; `updated_at` already written; v1-removal plan already written in code comments) — the recommendations finish the codebase's own started migrations. D3 caveat: guest→signed-in should be an explicit adopt-or-wipe decision at sign-up, not a reflexive wipe. D5: LWW is proportionate; CRDTs would be over-engineering.

**E — Screens & features:** E1-E6 AGREE (E6's self-restraint — declining to "fix" correct ordering — commended). **E7 AGREE-WITH-CHANGES** per H.1#3. E8-E11 AGREE (E9 is a retention bug, not polish; E11 is data honesty). **E4 AGREE and PROMOTE** — highest perceived-quality-per-day item in the section; one-day cost against a ready component. **E12 AGREE with caution:** HIG/App Review favor point-of-use requests with stated benefit — the first-open request MUST be preceded by a benefit screen (the report's "بعد الترحيب" placement satisfies this; keep it).

**F — Perf/i18n/polish:** F1 AGREE (single highest-leverage perceived-speed fix). **F2 AGREE-WITH-CHANGES — under-scoped:** `allowsBackForwardNavigationGestures` only walks WKWebView history; ProfileV2's state-driven sub-screens won't back-swipe until routed (do with C1); and in RTL the back-swipe starts from the RIGHT edge — any simulated gesture must be direction-aware. F3 AGREE (first-minute credibility hit). F4 AGREE (extend but keep restraint — haptics lose meaning when overused). F5-F8 AGREE. **F9 AGREE-WITH-CHANGES** per H.1#2 (theme-aware first paint is the real defect). **F10 AGREE with deferral** — but stop actively blocking accessibility zoom (`user-scalable=no`) on content surfaces once the shell is locked.

**G — Phasing: AGREE-WITH-CHANGES:**
1. Add to Phase 1: theme-aware first-paint continuity + `statusTap` scroll-to-top + hide-tab-bar-under-keyboard.
2. F2 split: WKWebView gesture flag now; state-driven sub-screen back-swipe in Phase 2 (with C1's routing).
3. **Promote E4 (exercise images in workout path) from Phase 4 to Phase 2.**
4. Phase 3 internal order: **D5 (LWW) before D3 (key re-scoping)** — changing key layout while sync blindly server-wins risks amplifying data loss.
5. Phase 2's dependency on the deferred header decision: honest, correctly flagged.

### H.3 What the First Team Missed (7 items)
1. **Status-bar-tap scroll-to-top** dies when B2 lands — restore via Capacitor `statusTap`.
2. **Tab bar rides above the keyboard** (Keyboard.resize:'native' shrinks the WebView) — hide nav on keyboard-open.
3. **Per-tab scroll position restoration** — tab switches reset scroll to top; native tab controllers preserve offsets.
4. **RTL back-gesture direction** — back-swipe originates from the right edge in an RTL app.
5. **Theme-dimension of launch continuity** — dark-only native chrome vs Sand light theme = dark flash every cold start.
6. **Sheet presentation manners unaudited** (drag-to-dismiss, grabber, backdrop) — flagged as unverified risk; stakes rise with C2's new sheet.
7. **`user-scalable=no` as an a11y blocker** on content surfaces — cheaper than and independent of the Dynamic Type project.

### H.4 Section Scores (fit for a respectable native-feeling iPhone app)

| Section | Score | Reason |
|---|---|---|
| B — Shell & scroll | **9/10** | Forensically accurate; correct target architecture; missed statusTap/keyboard consequences. |
| C — Navigation & IA | **8.5/10** | Dual-settings kill + 5-tab IA exactly right; minor dead-list error; center-action HIG deviation unacknowledged. |
| D — Data layer | **9/10** | Verified letter-for-letter; finishes the code's own migrations — proportionate. |
| E — Screens & features | **8/10** | Strong; barcode fix mis-weighted its lead hypothesis and named an unavailable API. |
| F — Perf/i18n/polish | **8.5/10** | Splash + status bar = the two highest-leverage feel wins; F9 misread, F2 under-scoped. |
| G — Phasing | **8/10** | Right Phase-1 answer; needs H.3 additions, E4 promotion, D5-before-D3. |

**Overall: the first team's report is trustworthy** — zero fabrications, one factual error (C8), three overstatements (F9, E7, C2 phrasing). The proposed architecture (locked shell, single inner scroller with preserved inner bounce, 5-tab IA with true quick-log sheet, one settings tree, single-source data) **is the correct blueprint for a respectable native-feeling iPhone app**, subject to the changes and seven missed items above.

---

## I. ملحق التحقق (بطلب المالك — 2026-07-21)

### I.0 تثبيت هوية النسخة على الجهاز

| الحلقة | الدليل | الحالة |
|---|---|---|
| مصدر بناء الجهاز | `~/qimmah-device` HEAD = **cc96d84**، الشجرة نظيفة (صفر تعديلات) | ✅ |
| هدف التطوير | `origin/design/v21-promotion` = **cc96d84** | ✅ |
| الأصول المشحونة | `dist` المبني ≡ `ios/App/App/public` (diff فارغ) | ✅ |
| زمن البناء | 21 يوليو 10:33 (نفس جلسة التثبيت) | ✅ |
| التطبيق على الجهاز | `com.qimmah.mobile 1.0.0` ظهر عبر `devicectl` بعد التثبيت مباشرة أثناء الاتصال؛ الجهاز غير متصل وقت كتابة الملحق فلا يمكن إعادة الفحص اللحظي | ✅ (بتحفّظ الاتصال) |

**الخلاصة: ما على الجهاز = cc96d84 بلا تعديل، وهو نفسه هدف التطوير.**

### I.1 جدول أيام التمرين
**دوران، لا تقويم:** يوم التمرين يُختار بـ `getDay() % plan.days.length` (`workoutPlan.ts:96-100`) — لا يعرف أيام الأسبوع الفعلية **ولا يُرجع «راحة» أبدًا**. التقسيم يُشتق آليًا من عدد الأيام (`splitDays` `planGenerator.ts:559-577`): ≤3 جسم كامل · 4 علوي/سفلي · 5 ع/س+تركيز · 6-7 دفع/سحب/أرجل. المستخدم يختار **العدد فقط** (3-6 في الإعداد)؛ اختيار أيام أسبوع محدّدة **غير موجود** (`preferredDays` يُهيّأ فارغًا ولا يكتبه أحد — `onboardingProfile.ts:263`). وجدول «روتيني» الأسبوعي القابل للتحرير (`StepSchedule.tsx`) **عرض فقط — لا يغذّي اختيار تمرين اليوم**، فأيام «الراحة» فيه لا تمنع الدوران. وضع split متقدّم موجود في الكود (`arnold/bro_split`) لكن **لا واجهة تفعّله**.

### I.2 حالة الإنهاء المبكر
زر «أنهِ التمرين» يظهر بعد **مجموعة واحدة مكتملة** (`doneSets >= 1` — `WorkoutV2.tsx:703-705`). لا حفظ بلا تأكيد: شيت «هل انتهيت؟» بإحصائيات، والكتابة الوحيدة في `confirmFinish` (`:407-429`) مع تراجع ٨ ثوانٍ يعيد **كل** المفاتيح (snapshot شامل — `workoutFinishUndo.ts`). **لكن:** إنهاء جلسة بتمرين واحد **يقلب اليوم كله «مكتمل»** — `todaysFinishedSession` يفحص وجود `finishedAt` فقط لا اكتمال التمارين (`workoutSessions.ts:70-73`)، فتنقلب Today لـafterWorkout وعمود التدريب لـdone. *(قرار المالك: يبقى الإنهاء المبكر متاحًا بتأكيد — المشكلة في دلالة «اكتمال اليوم» الثنائية.)*

### I.3 تاريخ الطعام التفصيلي
**لا يُحتفظ به عبر الأيام.** قائمة الأصناف تعيش في مفتاح واحد لليوم الحالي فقط (`qimmah:nutrition:v2` — `nutritionV2Model.ts:100-108`)؛ أول كتابة في يوم جديد **تستبدل قائمة أمس نهائيًا** (`persist` يكتب فوق المفتاح كاملًا). ما يُرحَّل للسجل الدائم **مجاميع فقط** `{calories, protein, carbs, fat}` (`mirrorToCanonical` `:44-51`؛ `historyStore.ts:51-59`). **لا توجد أي واجهة لتصفّح أصناف الأيام الماضية** — المستخدم لا يستطيع رؤية ما أكله قبل ٣ أيام صنفًا-صنفًا.

### I.4 مصدر الوزن والقياسات
مصدر واحد: `qimmah:history:measurementLogs:v1` عبر `measurementLog.ts` (غلاف على historyStore). الحقول: `weightKg/waistCm/bodyFatPercent` + وسم مصدر. **اليدوي بلا وسم؛ استيراد هيلث موسوم `source:'health'`** بمعرّف يومي حتمي، وفصله يحذف المستورد فقط (`:36-61`). الكُتّاب: `WeightLogScreen` (التقدّم) + `connectHealthWeight` (هيلث). القارئ: `progressV2Model.measurementSeries`. ملاحظة: سقفان غير متطابقين (٢٠٠ في مسار الكتابة مقابل ١٠٠٠ في المتجر)، والمفتاح **عالمي غير موسوم بالمستخدم** (ضمن مشكلة D3).

### I.5 تغطية المزامنة الفعلية
**مطفأة افتراضيًا** (`VITE_SYNC_ENABLED === 'true'` فقط يفعّلها — `syncQueue.ts:7`)، ومحروسة بثلاثية (مفعّلة + مستخدم مطابق + ليست جلسة استعادة). **المُغطّى (٩ جداول):** profiles، workout_sessions، exercise_history، measurement_logs، daily_logs (يحمل تغذية/ماء/مكملات/أدوية اليومية كمجاميع)، step_logs، achievements، custom_plans، todos. **غير المُغطّى:** التخصيص/الأهداف (`customization`)، قائمة أصناف اليوم، سجل التعافي، تفضيلات التذكيرات/الإشعارات، هدف/مصدر الخطوات، إعدادات الأقراص/الإحماء، دروس التعلّم. **المشغّلات:** online / عودة الواجهة / appStateChange + تفريغ بعد الترطيب من السحابة.

### I.6 استعادة الجلسة النشطة
**متينة.** كل حالة الجلسة (المجموعات/الموضع/الاستبدالات/طوابع الراحة) تُحفظ عند كل تغيير في `qimmah:active-workout:v2:<owner>` وتُستعاد عند الفتح بعد تحقق عدائي `isUsableSession` (١٢+ شرط بنية — `WorkoutV2.tsx:133-169`): أي جلسة من خطة تغيّرت/فاسدة **تُرفض وتُحذف بأمان** ويرجع المستخدم للخطة. هوية الجلسة مشتقة من `startedAt` فالإنهاء بعد الاستعادة idempotent.

### I.7 مؤقت الخلفية
مؤقّت الراحة **بطوابع زمنية** (`endsAt`) لا عدّاد — يصمد على الخلفية/قتل التطبيق، وعند العودة يُعاد حساب الساعة فورًا (`visibilitychange/focus` — `:316-326`). **لكن: لا يوجد أي إشعار محلي عند انتهاء الراحة والتطبيق بالخلفية** — إشعارات `@capacitor/local-notifications` تغطي التذكيرات اليومية فقط (تمرين/ماء/ملخّص/مكملات — `notifications/schedule.ts:64-96`). هابتك الانتهاء يعمل في المقدّمة فقط؛ المستخدم لن يعرف أن الراحة انتهت إلا بفتح التطبيق.

### I.8 إضافة الوزن من التقدّم
تدفّق كامل يعمل: التقدّم → بلاطة الوزن → «تسجيل وزن اليوم» → ٣ حقول (الوزن مطلوب 15-250، الخصر 30-250 اختياري، الدهون 2-70 اختياري — `ProgressV2.tsx:168-193` + `validation.ts:8`) → `addLog` بمعرّف UUID → **تحديث فوري** للشاشة (revision bump، النموذج يُعاد بناؤه من المتجر مباشرة).

### I.9 سلامة الاستيراد
سلسلة كاملة: حجم ≤25MB → JSON reviver **يرفض `__proto__/constructor/prototype`** بأي عمق → سقوف عقد/عمق → فحص نوع الحزمة + إصدار المخطط → allowlist صارم (أي مفتاح غير مسجّل يُفشل الاستيراد كله) → **معاينة بعدّادات لكل متجر** → تأكيد صريح → **تطبيق ذرّي** (snapshot قبل أي كتابة، تحقق نهائي بالمحمّلات الفعلية، أي فشل = استرجاع كامل) → إعادة توسيم للمستخدم الحالي (التوكن ليس في الـallowlist أبدًا) → **تراجع** موسوم بالمستخدم → **حجب أثناء استعادة كلمة المرور**. الاختبارات: ١٩ فحص أمان + ٦ ملفات هجوم (تلوث prototype، حقن عبر-مستخدم، إصدار مزيّف...) + إثباتا نقل 35+14 في البوابة.

### I.10 مصفوفة الأزرار والتدفقات

الحكم: **WORKS** يعمل كموصوف · **DEAD** بلا معالج/عرض فقط · **MISLEADING** وجهة غير متوقعة.

**MobileShell (الهيدر + التبويبات)** — `MobileShell.tsx`
| العنصر | الفعل/الوجهة | الحكم |
|---|---|---|
| شعار «قِمّة» | dashboard | WORKS (:90) |
| شارة حساب/ضيف | لا شيء — `<span>` بلا onClick | **DEAD** (:98-106) |
| مبدّل اللغة | يبدّل اللغة/الاتجاه | WORKS (:107) |
| أفاتار | profile | WORKS (:108) |
| تبويبات اليوم/التمارين/التغذية/التقدّم | وجهاتها | WORKS (:61-66) |
| الزر المركزي «تسجيل» | **nutrition (نفس تبويب التغذية)** | **MISLEADING** (:63-64) |

**TodayV2** — hero CTA ✅ · عمود التعافي ✅ · **أعمدة تدريب/تغذية/حركة DEAD** (:102-108) · بطاقة الرؤية ✅ · بطاقات الخطوات ✅ · بطاقة تعلّم (اقرأ/فهمت) ✅.

**WorkoutV2** — الخطة (رجوع/صفوف/ابدأ الجلسة) ✅ · التفاصيل (ابدأ/استبدال) ✅ · النشط: إغلاق→تأكيد ✅، ترطيب (250/500/مخصص/لاحقًا/فترات/إيقاف/تراجع) ✅، إحماء (إخفاء/تعطيل) ✅، استبدال+تراجع ✅، تبديل اليد ✅، حاسبة أقراص ✅، Steppers ✅، أنهِ المجموعة ✅، أنهِ التمرين (مبكر بعد ≥1) ✅ · الراحة (+15ث/تخطي/إخفاء النصيحة) ✅ · الإنهاء (تم/تراجع 8ث/شيت تأكيد/شيت تجاهل) ✅ · MissingPlan→الإعداد ✅. **صفوف قائمة المجموعات عرض فقط** (DEAD إخباري).

**NutritionV2** — أضف وجبة ✅ · ماء 250/500/مخصص ✅ · صفوف الوجبات ✅ · بحث/فلتر بروتين/حصص −+ ✅ · باركود: فتح/كشّاف/جرّب مجددًا ✅، **«أضف يدويًا» MISLEADING/dead-end** (يغلق الماسح فقط، لا نموذج — `ScanFoodPanel:154,174` + `NutritionV2:462`).

**ProgressV2** — بلاطات الوزن/القوة ✅ · صف التعافي ✅ · تسجيل الوزن (تحقق+حفظ) ✅ · **صفوف الرفعات وسجل PR عرض فقط** (DEAD — :387,462-486).

**ProfileV2** — بطاقة البرنامج ✅ · «الإعدادات والخصوصية» ✅ · **«القياسات والصور»→progress MISLEADING** (لا صور — :105) · **«الأدوية والمكمّلات»→SettingsView القديمة MISLEADING/decoy** (لا قسم مطابق — :106) · الإعدادات: الثيم/الغروب/المدينة ✅، الإشعارات ✅، **عام (لغة/وحدات/أرقام) DEAD عرض فقط** (:207-209)، الحساب→النظام القديم (يعمل لكنه قفزة قشرة) · الخصوصية: **«مشاركة بيانات الصحة» DEAD/decoy معطّل** (:186)، حذف الحساب→النظام القديم ✅ · بياناتي (تصدير/استيراد/تأكيد/تراجع) ✅ · NativeSettingsPanel (ربط/فصل خطوات ووزن، خطوات يدوية+حفظ، فحص نبض، هابتكس) ✅ كلها.

**RecoveryView** — كل المدخلات + «اعرض توصيتي» + النتيجة (افتح التمرين/تم) ✅ · السجل عرض فقط.

**SettingsView القديمة** — دخول/خروج ✅ · حذف الحساب (تأكيد بكلمة، يمسح بعد تأكيد الخادم فقط) ✅ · تصدير/استيراد ✅ · إعادة ضبط ✅ · تعديل/إعادة توليد الخطة ✅ · تذكيرات v1 ✅ · هيلث (نسخة ثانية) ✅ · خصوصية/شروط/تحليلات ✅ · لغة ✅ · «كيف نحسب أرقامك» ✅.

**Start/Onboarding** — CTA تسجيل/دخول ✅ · رجوع/التالي/موافقة الصحة/ادخل/إعادة محاولة ✅.

**خلاصة المصفوفة — ٩ عناصر معطوبة/مضلّلة مؤكّدة:** شارة الحساب الميتة · تكرار «تسجيل»=«التغذية» · «أضف يدويًا» طريق مسدود · «الأدوية والمكمّلات» decoy · «القياسات والصور» مضلّل · «مشاركة بيانات الصحة» decoy معطّل · صفوف «عام» عرض-فقط · صفوف الرفعات/PR غير تفاعلية · أعمدة مسار اليوم الثلاثة غير قابلة للضغط.
