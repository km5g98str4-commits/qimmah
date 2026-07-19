# V3-INVENTORY — جرد صادق للبناء الحالي مقابل Qimmah Design Standard v3.0

> تقرير جرد فقط. **صفر تعديل** على كود الواجهة/المنطق/الاختبار. المخرجات markdown فقط.
> كل تصنيف مسند بمسار ملف دليل. ما لا يمكن التحقق منه مُصرَّح به صراحةً.

## 0) بوابة الدخول — تصريح الفعلية (اقرأ أولًا)

قبل أي رقم، صدقان لا بد منهما:

1. **القاعدة تحرّكت.** المعيار كتب القاعدة `f14cdeb`، لكن `origin/design/v21-promotion`
   الفعلي وقت الجرد على **`e2b27b3`** ("Add files via upload"). الجرد مبني على `e2b27b3`
   في worktree `audit/v3-inventory`.

2. **معيار v3.0 غير موجود على الفرع.** لا يوجد `docs/design/qimmah-v3.pdf` ولا أي قائمة
   بالشاشات الـ80 نصّيًا. الموجود فعلًا:
   - `docs/design/qimmah-v21.pdf` (معيار **v2.1**، ليس v3).
   - `docs/design/DESIGN-SOURCE-OF-TRUTH.md` + `DESIGN-DECISIONS.md` — كلاهما يصرّح أن
     الاتجاه المعتمد هو **v2.1 (Founder Refinement Pass)**، لا v3.
   - المعيار المُرسَل قال «اعتمد على قائمة الـ80 المذكورة أدناه» لكن **لا قائمة أُرفقت** في نصّه.

   **الأثر على الجرد:** لا يمكنني مطابقة 80 صفًا مرقّمًا مقابل مرجع رسمي غير موجود، ولا وسم
   طبقات «مصفوفة B» (Core v1 / v1.1 / Later / Research) من المعيار مباشرة. لذلك:
   - جدول الشاشات أدناه **مبني على المُلاحَظ في الكود** (سطح حقيقي لكل صف)، منظّمًا على
     المناطق الـ12 المُسمّاة في المعيار. الترقيم **إعادة بناء تقريبية** لا اقتباس من وثيقة v3.
   - وسم الطبقة (ب) **اجتهاد قائم على حرجية الشحن** لا اقتباس من مصفوفة B — موسوم بذلك.
   - عدد «80» لا يُوفَّق 1:1 هنا؛ رصدنا **~64 سطحًا متمايزًا**. الفجوة بين 64 و80 قد تكون
     شاشات معيار v3 لم تُنفَّذ، أو تفصيلًا مختلفًا في التقطيع — **غير قابل للتحقق بلا وثيقة v3**.

3. **طبقة V2 حيّة فعليًا.** ملفات V1 (`DashboardView/WorkoutView/NutritionView/ProgressView/`
   `ProfileView/StartView`) صارت مجرّد أغلفة تمرّر إلى مكوّن V2 (مثال `DashboardView.tsx:12`
   `return <TodayV2 {...props} />`). فالتجربة الحيّة هي v2.1 بالكامل، ليست خلف علم تطوير.

---

## (أ) جرد الشاشات الـ12 منطقة — المُلاحَظ في الكود

الحالة: **BUILT** (مركّب + مسار وصول) · **PARTIAL** (موجود لكن ناقص حالات/غير موصول/setup-only)
· **MISSING** (لا تنفيذ).

### منطقة 1 — Foundation / Auth
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 1 | Welcome / البداية | BUILT | `src/views/StartViewV2.tsx` (سطح داكن، لغة، CTAs) |
| 2 | تسجيل دخول / إنشاء حساب | BUILT | `src/views/LoginView.tsx` (Supabase حقيقي، سياسة كلمة مرور) |
| 3 | تأكيد البريد | BUILT | `src/views/VerifyEmailView.tsx` (بوابة فوق كل المسارات `App.tsx:324`) |
| 4 | كلمة مرور جديدة | BUILT | `src/views/ResetPasswordView.tsx` (بوابة الاستعادة `App.tsx:304`) |
| 5 | الخصوصية | BUILT | `src/views/PrivacyView.tsx` |
| 6 | الشروط | BUILT | `src/views/TermsView.tsx` |
| 7 | تواصل/دعم | BUILT | `src/views/ContactView.tsx` (mailto + بلاغ) |
| 8 | 404 | BUILT | `src/views/NotFoundView.tsx` |

### منطقة 2 — Onboarding
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 9 | خطوة 1: الهدف + موافقة بيانات صحية | BUILT | `src/views/OnboardingV2.tsx` + `src/lib/onboardingV2Flow.ts` |
| 10 | خطوة 2: التدريب (أيام/مدة) | BUILT | `onboardingV2Flow.ts` (DAYS/DURATIONS) |
| 11 | خطوة 3: المعدّات/المكان/الإصابات | BUILT | `OnboardingV2.tsx` (place+pref+injury) |
| 12 | «الخطة جاهزة» + بناء (spinner/خطأ/إعادة) | BUILT | `OnboardingV2.tsx` BuildingScreen |
| 13 | تعديل الخطة — الأساسيات | BUILT | `src/sections/CustomizationCenter.tsx` (StepBody/WorkoutTemplate/Nutrition) |
| 14 | تعديل الخطة — إضافات | BUILT | CustomizationCenter (SmartCalc/Wellness/Measurements/Commitments/Sections) |
| 15 | تعديل الخطة — مراجعة | BUILT | `src/components/customizer/steps/StepReview.tsx` |

> ملاحظة صدق: 8 خطوات customizer قديمة **ميتة** (مستوردة nowhere):
> `StepBasics/StepGoal/StepLook/StepMeals/StepMetrics/StepSchedule/StepSupplements/StepWorkouts`.

### منطقة 3 — Today
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 16 | مركز اليوم (3 حالات: مستخدم جديد/عادي/بعد التمرين) | BUILT | `src/views/TodayV2.tsx` + `src/lib/todayV2Model.ts` |
| 17 | مسار اليوم — 4 أعمدة (تدريب/تغذية/حركة/تعافٍ) | BUILT | `todayV2Model.ts:22` (`PillarKey`), حالات done/ready/active/locked |

### منطقة 4 — Workout
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 18 | نظرة اليوم/الخطة | BUILT | `src/views/WorkoutV2.tsx` (Plan) |
| 19 | جلسة نشطة (سطح داكن): تسجيل تكرارات/أوزان، مؤقّت راحة، حاسبة أقراص، إحماء | BUILT | `WorkoutV2.tsx` + `src/lib/workoutV2Persist.ts` |
| 20 | إتمام الجلسة + كشف PR | BUILT | `WorkoutV2.tsx:672` + `src/lib/finishWorkout.ts` + `src/lib/strength` |
| 21 | مكتبة التمارين (بحث/فلاتر/آلات) | BUILT | `src/views/ExerciseLibraryView.tsx` + `src/data/machineCatalog.ts` |
| 22 | تفصيل التمرين (نبذة/سجل/رسوم/أرقام) | BUILT | `src/components/ExerciseDetail.tsx` (4 تبويبات) |
| 23 | منشئ الخطة المخصّصة | PARTIAL | `src/features/customPlan/CustomPlanBuilder.tsx` مكتمل لكن **غير موصول** بأي view |
| 24 | استبدال تمرين | PARTIAL (stub) | زر «استبدال · لاحقًا» **معطّل** في `WorkoutV2.tsx` |

### منطقة 5 — Recovery
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 25 | عمود التعافي | PARTIAL | داخل Today فقط، لا شاشة مستقلّة; `src/lib/wellnessPlan.ts`, `recoveryState.ts` |
| 26 | تغطية العضلات (chips) | BUILT | `src/lib/muscleCoverage.ts` مُسطَّح في `MyStatsView.tsx` |
| 27 | خريطة العضلات البصرية | PARTIAL | `src/components/MuscleMap.tsx` مكتمل لكن **مُيتَّم** (مرجعه i18n فقط) |
| 28 | تتبّع Wellness | PARTIAL | قابل للتحرير في customizer فقط (`StepWellness.tsx`); لا شاشة تتبّع |
| 29 | الخطوات/الحركة | PARTIAL | `src/lib/stepCounter.ts` يغذّي عمود Today؛ **لا شاشة عدّاد** مخصّصة |

### منطقة 6 — Nutrition
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 30 | التغذية (حلقات ماكرو/وجبات/هدف) | BUILT | `src/views/NutritionV2.tsx` + `src/lib/nutritionV2Model.ts` |
| 31 | إضافة وجبة (بحث طعام/فلتر بروتين) | BUILT | `NutritionV2.tsx` (فوق `src/data/foodItems.ts`) |
| 32 | مسح باركود | BUILT | `src/features/barcode/ScanFoodPanel.tsx` → `BarcodeCamera.tsx` → OpenFoodFacts |
| 33 | الماء (إضافة سريعة) | BUILT | `NutritionV2.tsx` (حلقة الماء) |
| 34 | مكمّلات/أدوية | PARTIAL | مكتبات + بيانات في **setup فقط**؛ NutritionV2 لا يعرضها؛ `sections/Supplements.tsx` مُيتَّم |

### منطقة 7 — Progress
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 35 | موجز التقدّم + زخم تدريبي | BUILT | `src/views/ProgressV2.tsx` + `src/lib/progressV2Model.ts` |
| 36 | تفصيل الوزن (حزام هدف/خصر/دهون) | BUILT | `ProgressV2.tsx` (رسم SVG محلي) |
| 37 | تفصيل القوة (لكل رفعة/e1RM/سجل PR) | BUILT | `ProgressV2.tsx` + `src/lib/strength` |
| 38 | تسجيل القياسات | BUILT | `ProgressV2.tsx` (وزن/خصر/دهون + تحقق) |
| 39 | لوحتي | BUILT | `src/views/MyStatsView.tsx` (route `stats`) |
| 40 | معرض الأوسمة | PARTIAL | `AchievementToaster` حيّ؛ لكن `features/achievements/AchievementsCard.tsx` **مُيتَّم** |

### منطقة 8 — Intelligence
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 41 | بطاقات رؤى أسبوعية | BUILT | `src/lib/insights/generate.ts` مُسطَّح في Today + Progress (حتمي، مُحوَّط) |
| 42 | تلميحات تدريب/راحة (coaching) | BUILT | `src/lib/coaching/*` + `src/data/coaching/*` (داخل مؤقّت الراحة) |
| 43 | بطاقة درس/تعلّم | BUILT | `TodayV2` TodayLearnCard (`lessonRotation.ts`) |
| — | مساعد AI / أمر صوتي / معدّل قلب | MISSING | لا LLM ولا SpeechRecognition ولا عرض HR في الكود إطلاقًا |

### منطقة 9 — Settings
| # | الشاشة | الحالة | الدليل |
|---|--------|--------|--------|
| 44 | الإعدادات (حساب/بيانات/خطة/تذكير/جهاز) | BUILT | `src/views/SettingsView.tsx` |
| 45 | الملف الشخصي | BUILT | `src/views/ProfileV2.tsx` (شاشات فرعية داخلية) |
| 46 | إعدادات الإشعارات | BUILT | `NotificationSettingsPanel.tsx` + `NotificationsSettingsV2.tsx` |
| 47 | إعدادات الجهاز/Native | BUILT | `DeviceSettings.tsx` + `NativeSettingsPanel.tsx` |
| 48 | إدارة البيانات (تصدير/استيراد + معاينة/تراجع) | BUILT | `DataManagementPanel.tsx` + `src/lib/portability` |
| 49 | كيف نحسب أرقامك | BUILT | `src/views/CalcExplainerView.tsx` (route `calc`) |
| 50 | حذف الحساب (بتأكيد) | BUILT | داخل `SettingsView.tsx` |
| 51 | دليل التثبيت | BUILT | داخل `SettingsView.tsx` + `i18n/dict/installGuide.ts` |
| 52 | مراجعة المنتجات (طاقم) | BUILT (dev-only) | `App.tsx:376` مُقصى في الإنتاج |

### منطقة 10 — System States (73–80 في المعيار)
| # | الحالة | الوضع | الدليل |
|---|--------|-------|--------|
| 53 | تحميل التطبيق | BUILT | `AppLoading.tsx` (بوابة الإقلاع) |
| 54 | Splash | BUILT | `SplashScreen.tsx` (`main.tsx`) |
| 55 | هياكل (Skeletons) | BUILT | `ViewSkeletons.tsx` (Dashboard/Progress/Tab) كـ Suspense fallback |
| 56 | خطأ + إعادة محاولة | BUILT | `ErrorBoundary.tsx` (RouteErrorBoundary يلفّ كل المسارات) |
| 57 | Toast نجاح | BUILT | `SuccessToast.tsx` |
| 58 | Toast أوسمة | BUILT | `AchievementToaster.tsx` |
| 59 | دعوة/شريط تثبيت | BUILT | `InstallPrompt.tsx` + `InstallBanner.tsx` (سطحان) |
| 60 | حالات فارغة | PARTIAL | **لا قالب مشترك موصول**؛ `EmptyState.tsx` يُستورَد فقط من MuscleMap المُيتَّم؛ الباقي bespoke لكل شاشة (`NeedsData`, `EmptyHint`, `MissingPlan`) |
| 61 | مؤشّر offline | MISSING | لا مكوّن `navigator.onLine`/بانر offline؛ SW مسجّل لكن بلا بانر |

**إجمالي المرصود:** 61 صفًا مرقّمًا + عدّة أسطح فرعية (≈64 سطحًا). **لا يوفَّق 1:1 مع «80»
شاشة v3** لغياب الوثيقة (بند 0-2).

**العدّاد الإجمالي:** BUILT = **47** · PARTIAL = **12** · MISSING = **2** (+ حزمة
AI/صوت/HR غائبة كفئة).

---

## (ب) وسم طبقة الإصدار — اجتهاد حرجية الشحن (لا مصفوفة B رسمية)

> ⚠️ مصفوفة B من معيار v3 غير متوفّرة (بند 0). الوسم أدناه **اجتهادي** على أساس «ما يلزم
> للحلقة اليومية القابلة للشحن»، لا اقتباس من الوثيقة.

**Core v1** (الحلقة اليومية الحرجة): Auth (1–8)، Onboarding (9–15)، Today (16–17)،
Workout الأساسي (18–22)، Nutrition الأساسي (30–33)، Progress الأساسي (35–39)،
Settings الأساسي (44–50)، System states الأساسية (53–59).

- **Core v1 مبني بالكامل (BUILT):** ~**41** شاشة.
- **Core v1 PARTIAL:** **2** — الحالات الفارغة (60، لا قالب مشترك)، ومكمّلات/أدوية داخل
  التغذية (34، setup-only).
- **Core v1 MISSING:** **1** — مؤشّر offline (61).

**⇐ مسافة الشحن الحقيقية لـ Core v1 = بند PARTIAL واحد مؤثّر (الحالات الفارغة) + مؤشّر offline.**
البقية داخل Core v1 جاهزة.

**v1.1** (تحسينات قريبة): باركود (32 — مبني فعلًا)، كتالوج الآلات (21)، معرض الأوسمة (40)،
تفصيل القوة (37). **Later:** منشئ الخطة المخصّصة (23)، استبدال التمارين (24)، شاشة تعافٍ/خطوات
مستقلّة (25/29)، خريطة العضلات (27). **Research:** مساعد AI، أمر صوتي، معدّل القلب.

---

## (ج) تدقيق الأنظمة العرضية السبعة

| # | النظام | الحكم | الدليل |
|---|--------|-------|--------|
| 1 | **offline-first** | ✅ مطبّق كليًا | التسجيل يكتب `localStorage` **متزامنًا** ثم يُدرِج طابور مزامنة: `historyStore.ts:187-207` (تمارين)، `nutritionTracking.ts:126-140` (تغذية)، `stepCounter.ts:127-141` (خطوات). طابور حقيقي بتراجع أسّي `syncQueue.ts:145,196-205`، والتفريغ مفصول عن الكتابة (online/foreground فقط) `syncService.ts:530-558`. المزامنة **معطّلة افتراضيًا** خلف `VITE_SYNC_ENABLED` — التطبيق محلي 100%. |
| 2 | **أذونات عند-الحاجة** | ✅ مطبّق كليًا | لا إذن يُطلب عند الإقلاع. HealthKit خلف زرّ «اتصال» بعد عرض الفائدة `NativeSettingsPanel.tsx:40-45` + `healthKit.ts:50`. الإشعارات خلف مفتاح المستخدم `NotificationSettingsPanel.tsx:68-83`. الكاميرا عند فتح لوحة المسح `ScanFoodPanel.tsx:63`. **ملاحظة طفيفة:** الكاميرا بلا شاشة تفسير منفصلة قبل النافذة (لكن السياق «مسح باركود» ذاتي الوضوح). لا خرق. |
| 3 | **وسم «تقدير» + صدق HR** | ✅ مطبّق كليًا | كل سعرة/TDEE/ماكرو موسوم: `NutritionV2.tsx:207` («القيم تقديرية»)، `calculators.ts:1`، `CalcExplainerView.tsx:26`، `nutritionV2Model.ts:26`. **لا عرض HR إطلاقًا** فلا اختلاق؛ حالات HealthKit تُعرض `unavailable/denied` بصدق `healthKit.ts:55-57`؛ الخطوات تحمل `source` صادق `stepCounter.ts:119-121`. |
| 4 | **الثيم فاتح/داكن عبر توكنات** | ◑ مطبّق (بتحفّظ) | ثيمان كاملان مدفوعان بتوكنات `--c-*`: فاتح `tokens.css:263-278`، داكن `tokens.css:281-293` + `index.css:9-22`. **لكن** الاختيار **لكل سطح عبر className** (`v2-surface-light/dark`) لا مبدّل مستخدم؛ لا `prefers-color-scheme`. الثيم في الإعدادات **معطّل** («فاتح الآن»). ليس أسطحًا مبعثرة، لكنه ليس تبديلًا كاملًا للمستخدم. |
| 5 | **RTL منطقي + وسم غير لوني** | ✅ مطبّق كليًا | خصائص فيزيائية = **0**، منطقية = **99** عبر views/components/sections. الحالة تُرمَّز نص+أيقونة لا لونًا فقط: `MuscleMap.tsx:102-106` (شريط لوني `aria-hidden` + نص %)، `SuccessToast.tsx:45-49` (`role=status`+أيقونة+نص). |
| 6 | **توكنات Momentum موحّدة** | ✅ مطبّق كليًا | عائلة Momentum بقيم hex **ملموسة** (لا placeholder): Ember `#f0512a`، Blue `#2a6ce0`، Green `#1f9d57`، Teal `#12a594`، Error منفصل `#e11d2e` — `tokens.css:174-217`. Ember محجوز للفعل. تسرّب hex ضئيل: **9 إصابات فقط** في 93 ملفًا، الأسوأ `MuscleMap.tsx:25-32` (ألوان حالة inline بدل توكنات). |
| 7 | **حالات النظام كقوالب معاد استخدامها** | ◑ جزئي | تحميل/خطأ/toast/تثبيت قوالب حقيقية معاد استخدامها (`ViewSkeletons`, `ErrorBoundary`, `SuccessToast`). لكن **الحالات الفارغة ليست نظامًا موحّدًا**: `EmptyState.tsx` مُيتَّم عمليًا، والحالات bespoke لكل شاشة. **مؤشّر offline غائب.** |

**خلاصة السبعة:** 4 مطبّقة كليًا (1,2,3,5,6) · 2 جزئية بتحفّظ (4 الثيم، 7 الحالات) · 0 غائب
كليًا (لكن مؤشّر offline داخل نظام الحالات = فجوة نقطية).

---

## (د) قاعدة «اقترح لا تُغيّر» — المواضع الثمانية

| # | الموضع | الحكم | الدليل |
|---|--------|-------|--------|
| a | تغيير الخطة | تأكيد فقط (بلا تراجع) | حفظ صريح `CustomizationCenter.tsx:182,322` (معطّل حتى `allValid`) + `SuccessToast`؛ لكن `applyCustomization` (`customizationContext.tsx:38`) يستبدل الحالة **بلا لقطة/تراجع** |
| b | حفظ/إنهاء جلسة | ⚠️ **صامت** (+ إقرار لاحق) | `WorkoutV2.tsx:320` `persistFinishedSession` يكتب الجلسة + سجل PR **فور** آخر set قبل شاشة الملخّص؛ لا بوابة تأكيد قبل الكتابة ولا تراجع. **أضعف نقطة ضد القاعدة D.** |
| c | إنهاء | ⚠️ صامت | نفس مسار (b) |
| d | استبدال | غياب الميزة | نصوص `strings.ts:275,362` **غير موصولة** بأي view (نصوص ميتة) |
| e | تخفيف (deload) | غياب كإجراء مستخدم | `planGenerator.ts:1071` يُطبَّق **تلقائيًا** ومُفصَح عنه `:1104`؛ لا زر مستخدم |
| f | أمر صوتي | غياب الميزة | لا SpeechRecognition/MediaRecorder (عدا كاميرا الباركود) |
| g | إذن جديد | ✅ تأكيد (نافذة + toast) | `NotificationSettingsPanel.tsx:68` + `pwa.ts:106-120` (toast تأكيد واحد)؛ المفتاح قابل للعكس |
| h | تطبيق اقتراح AI | غياب الميزة | لا AI؛ الرؤى (`insights/generate.ts`) **تنقّل فقط** ولا تُعدّل الحالة — متوافقة مع D بالبناء |

**خلاصة D:** الموضعان الحقيقيان الوحيدان اللذان يشحنان — حفظ الخطة (a) وإنهاء الجلسة (b/c) —
**بلا تراجع**؛ (a) له تأكيد صريح، لكن (b/c) **يكتب صامتًا** (يشمل سجل PR الدائم). الأذونات (g)
مؤكَّدة. (d/e/f/h) غير منفّذة كطفرات مستخدم فلا تخرق. **أعلى خرق: إنهاء الجلسة يحفظ صامتًا بلا تراجع.**

---

## (هـ) أعلى 10 فجوات على Core v1 + أقرب 5 للجاهزية

### أعلى 10 فجوات (بالأثر)
1. **إنهاء الجلسة يحفظ صامتًا بلا تراجع** (خرق D، يكتب PR دائم) — `WorkoutV2.tsx:320`.
2. **لا نظام حالات فارغة موحّد** — `EmptyState.tsx` مُيتَّم، الحالات bespoke مبعثرة.
3. **مؤشّر offline غائب** رغم أن التطبيق offline-first (المستخدم لا يرى حالة الاتصال).
4. **حفظ الخطة بلا تراجع** — `applyCustomization` يستبدل بلا لقطة (`customizationContext.tsx:38`).
5. **مكمّلات/أدوية غير مسطَّحة في التغذية** — setup-only؛ NutritionV2 لا يعرضها.
6. **استبدال التمرين stub** («لاحقًا» معطّل) — فجوة وظيفية متوقّعة في الجلسة.
7. **الثيم غير قابل للتبديل للمستخدم** — معطّل («فاتح الآن») رغم اكتمال توكنات الداكن.
8. **منشئ الخطة المخصّصة غير موصول** — ميزة كاملة يتيمة (`features/customPlan/*`).
9. **خريطة العضلات البصرية مُيتَّمة** — `MuscleMap.tsx` مبني لكن غير مرسوم.
10. **تسرّب hex في MuscleMap** — ألوان حالة inline بدل توكنات (`MuscleMap.tsx:25-32`).

### أقرب 5 شاشات للجاهزية (PARTIAL بسيط)
1. **خريطة العضلات (27)** — مكوّن مكتمل؛ يحتاج **توصيلًا** بشاشة تعافٍ/تقدّم فقط.
2. **معرض الأوسمة (40)** — `AchievementsCard.tsx` مكتمل (192 سطرًا)؛ يحتاج mount فقط.
3. **مكمّلات/أدوية في التغذية (34)** — البيانات والمكتبات جاهزة؛ يحتاج سطح عرض في NutritionV2.
4. **مؤشّر offline (61)** — `navigator.onLine` + بانر صغير فوق `MobileShell`؛ لا اعتماديات.
5. **قالب حالة فارغة موحّد (60)** — `EmptyState.tsx` موجود؛ يحتاج تبنّيًا عبر الشاشات بدل bespoke.

---

## قيود التحقق (صدق)

- **لا وثيقة v3.** كل مطابقة «مقابل المعيار» أعلاه مبنية على المُلاحَظ + المناطق الـ12
  المُسمّاة، لا على شاشات v3 المرقّمة (غير متوفّرة). عدّاد «80» لا يُوفَّق هنا.
- **تحليل شيفرة ساكن فقط** — لا تشغيل/بناء/رسم runtime. أحكام الثيم من أسبقية CSS، لا معاينة.
- **الأدلة من فحص المصدر** على `e2b27b3`. أي ميزة مخطّطة خارج هذا الفرع ليست ضمن النطاق.
- ما لم يُتحقَّق منه صُرّح به موضعيًا (مثل: هل `StatusBadge` يرسم أيقونة لكل حالة — النص مؤكَّد،
  الأيقونة-لكل-حالة غير مؤكَّدة).
