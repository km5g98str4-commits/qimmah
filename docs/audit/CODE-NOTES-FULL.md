# قِمّة — Code Notes الكامل (ملف-بملف)

**الأساس:** `audit/code-notes-full` @ 19ec00a (feature/p25-steps-health + P4 calendar + P5 session-engine) · التاريخ: 2026-07-24
**المنهج:** تقرير فقط — صفر تعديل كود. تدقيق ملف-بملف عبر ٦ وكلاء قراءة متوازيين (lib أ–م · lib ن–ي+الفرعية · views/sections/App · components · data/i18n/config/types/features · scripts/ios) + تحليل بنيوي مركزي (رسم بياني كامل للاستيرادات بأداة node مخصّصة). كل ادعاء بدليل `file:line`؛ ما لم يُتحقّق منه معلَّم **UNVERIFIED**.
**العلاقة بالتدقيق السابق:** `docs/audit/APP-STRUCTURE-DEEP-AUDIT.md` (@770912e على فرع audit/app-structure-deep) غطّى القشرة/التمرير/IA. هذا التقرير لا يكرّره — ينزل لمستوى الملف الواحد ويعيد فحص طبقة البيانات **بعد** موجات الأساس (syncLww · dataOwnership · userDataKeys · canonical nutrition · workoutCalendar · workoutSessionEngine).

**مفتاح الحكم (verdict):** `keep` سليم · `refactor` يبقى بمكانه مع إصلاح · `merge→X` يُدمج في X · `delete` يُحذف (بعد تحقق import-graph) · `move→X` ينقل إلى X.

---

## 0. الحقائق البنيوية المركزية (تحقّق مباشر — أداة رسم استيرادات على كل src/)

### 0.1 الكود الميت: 62 ملفًا غير قابل للوصول من main.tsx

قياس بأداة reachability (اجتياز متعدٍّ من `src/main.tsx` عبر كل import ثابت وكسول، أُعيد تشغيله للتثبيت قبل الإقفال): من **335 ملف كود** (بعد استبعاد `vite-env.d.ts` البيئي) **273 قابلة للوصول؛ 62 ملفًا ميتة في التطبيق**. خمسة منها فقط يستهلكها scripts/ (التفصيل في القسم 8):

| المجموعة الميتة | الملفات | ملاحظة |
|---|---|---|
| أقسام تسويقية (v1 landing) | `sections/{Dashboard,Meals,Supplements,Customization,CommitmentKeys}.tsx` + `components/Header.tsx` + `config/{content,theme}.ts` + `data/{dashboard,features,goal,profile,commitment}.ts` | لا مستورد حي — بقايا القالب التسويقي |
| معالج التخصيص القديم (جزئيًا) | `components/customizer/steps/{StepBasics,StepGoal,StepLook,StepMeals,StepMetrics,StepSchedule,StepSupplements,StepWorkouts}.tsx` + `customizer/EditableTable.tsx` | 8 من 20 خطوة ميتة؛ الباقي حيّ فقط عبر SetupView→CustomizationCenter |
| ميزة الخطة المخصّصة كاملة | `features/customPlan/*` (7 ملفات، ~1330 سطرًا) | ميتة بالكامل من الواجهة؛ ما زالت مسجّلة في portability/syncStores (انظر 0.4) |
| todo الواجهة | `features/todo/{TodoWidget,useTodos,strings}` | store.ts حيّ فقط عبر portability/syncStores |
| مكوّنات UI | `components/{EmptyState,MuscleChips,MuscleMap,ProgressBar,SectionHeading}.tsx` + `machine/*` (3) + `nutrition/CalorieExplainer.tsx` | CalorieExplainer استُبدل بـ views/CalcExplainerView |
| lib ميتة | `lib/{dataPortability,i18nLabels,muscleGroupCoverage,muscleMapLib,servingDisplay,supabase,trainingInsights,workoutStats}.ts` + `lib/notifications/copy.ts` | dataPortability استُبدل بـ lib/portability/*؛ muscleMapLib يستورد نوعًا من react-body-highlighter (تبعية ميتة في package.json) |
| قواميس i18n ميتة | `i18n/dict/{calorieExplainer,dashboard,profileScreen,progressScreen,workoutScreen}.ts` (~730 سطرًا) | **الشاشات الخمس الأثقل لا تستهلك قواميسها** — الترجمات مكتوبة ثم هُجرت والشاشات تحمل نصوصها inline (انظر 0.6) |
| data ميتة | `data/{dailyPhrases(472),machineAlternatives,machineHowTo(546),dataPortabilityCopy}.ts` + `design-system/tokens.ts` | machineAlternatives يستهلكه scripts/p12-gif-manifest.mjs فقط |
| products جزئيًا | `features/products/{offSource,saudiSeed}.ts` | offSource يستهلكه proof فقط؛ saudiSeed مات لكن مفتاح بوابته حي |
| achievements جزئيًا | `features/achievements/AchievementsCard.tsx` | البطاقة ماتت، الـengine حي |

> القائمة الكاملة ملفًا-بملف موزّعة على جداول الأقسام أدناه مع حكم لكل ملف.

### 0.2 جاذبية `Lang`: أكبر fan-in في المشروع وهمي

`lib/appPreferences.ts` عليه **118 مستوردًا** (الأعلى في المشروع) — لكن **104 منها تستورد `type Lang` فقط** (`appPreferences.ts:8`). نوع من قيمتين يعيش داخل وحدة تخزين localStorage، فيسحب كل قاموس i18n وكل ملف data وكل مكوّن نحو طبقة التخزين. هذا مصدر 30+ من انتهاكات الطبقات في 0.3.
**الإصلاح (S، صفر مخاطرة):** نقل `Lang` (و`ThemePref`) إلى `src/i18n/types.ts` وإعادة التصدير مؤقتًا من appPreferences.

كما أن appPreferences نفسه خليط مسؤوليات: لغة + هابتكس + ثيم + جدول غروب + **حارس تمرين نشط يمسح مفاتيح نطاق workout** (`appPreferences.ts:114-125` يفحص بادئة `qimmah:active-workout:v2:`) — اقتران عكسي من «تفضيلات» إلى نطاق التمرين.

### 0.3 انتهاكات الطبقات: 42 استيرادًا عابرًا للطبقات (قياس آلي)

الاتجاه المفترض: `types/config/data/i18n` ← `lib` ← `components/features` ← `views` ← `App`. المقاس فعليًا:

| النمط | العدد | أمثلة (file:line في جداول الأقسام) | الخطورة |
|---|---|---|---|
| `i18n/* → lib/*` | 18 | 16 قاموسًا تستورد `type Lang` من appPreferences + `LanguageContext→appPreferences` + `LanguageToggle→cn` | منخفضة — تحلّ بنقل النوع (0.2) |
| `data/* → lib/*` | 12 | `data/achievements→lib/appPreferences`، `data/exercises→lib/exerciseGuidance` (منطق داخل data)، `data/coaching/*→lib/coaching/types` (3)، `data/notificationCopy→lib/notifications/types` | متوسطة |
| `lib → features` | 9 | `portability/registry.ts→features/{achievements,customPlan,todo}` (3)، `syncStores.ts→features/{customPlan,todo}` (2)، `profileV2Model.ts→features/achievements/engine`، `dataPortability.ts→features/*` (3 حواف من ملف ميت) | **عالية** — البنية التحتية تعرف الميزات بالاسم؛ يقلب الاتجاه ويمنع حذف customPlan الميت |
| `lib → components` (JSX في lib) | 1 | `lib/insights/InsightCardsView.tsx→components/Icon` | متوسطة — مكوّن UI كامل داخل lib/ |
| `config → lib` | 1 | `config/strings.ts→lib/appPreferences` | منخفضة |
| `i18n → components` | 1 | `LanguageToggle→Icon` | منخفضة |

**التصحيح البنيوي للفئة العالية:** registry/syncStores يجب أن تكون **نقاط تسجيل** (كل feature يسجّل نفسه) لا قوائم مركزية تستورد الميزات — أو تُنقل تعريفات مفاتيح الميزة إلى `userDataKeys.ts` وتقرأ الطبقتان منه.

### 0.4 الميت المربوط: customPlan/todo أمثلة «ميزة ميتة لا يمكن حذفها»

`features/customPlan/*` غير قابل للوصول من أي شاشة، لكن حذفه يكسر البناء لأن ثلاث بنى تحتية تستورده بالاسم: `lib/portability/registry.ts`، `lib/syncStores.ts`، (والقديم `lib/dataPortability.ts` الميت أصلًا). نفس النمط مع `features/todo/store.ts`. أي إعادة هيكلة يجب أن تفكّ هذا الاقتران أولًا (فصل «تعريف المفتاح/schema» عن «كود الميزة»).

### 0.5 نظام الأحداث والاشتراكات: النمط الصحيح موجود لكنه مطبَّق على 3 مخازن من ~25

- المخازن ذات `subscribe` + `useSyncExternalStore`: `nutritionV2Model` (`:163`)، محوّل `nutritionTracking`، `achievements/engine` (`:120,127`). **الباقي كله** قراءة localStorage خام + عدّادات bump يدوية في الشاشات.
- الأحداث المخصّصة: `qimmah:immersive` (مُرسَل من `WorkoutV2.tsx:199-200`، مستمَع في MobileShell) سليم؛ **`qimmah:steps-updated` (`healthKit.ts:120`) يُبثّ بلا أي مستمع** (يتيم — أُعيد التحقق عند 19ec00a: grep كامل على src لا يُظهر أي `addEventListener` له).

### 0.6 خريطة i18n المقلوبة

بنية `i18n/dict/` (16 قاموسًا، ~3,140 سطرًا) هي النظام المعتمد، لكن:
- 5 قواميس ميتة بالكامل (0.1) بينها قواميس أثقل الشاشات (workoutScreen, progressScreen, profileScreen).
- الشاشات الحية تحمل نصوصها العربية inline: قياس آلي (أسطر تحوي محارف عربية، شاملة كائنات labels المحلية) — `WorkoutV2` **114 سطرًا**، **`App.tsx` 91**، `ProfileV2` 85، `ProgressV2` 52، `NotificationsSettingsV2` 50، `NutritionV2` 44، `SettingsView` 36، `RecoveryView` 28 (أغلبها كائنات labels محلية ثنائية اللغة داخل الشاشة — نمط ثالث غير القاموسَين).
- 3 ميزات لها ملفات strings خاصة خارج i18n: `features/customPlan/strings.ts` (254)، `features/todo/strings.ts`، `features/products/reviewPanel/strings.ts`.
- `config/strings.ts` (1,401 سطرًا) نظام رابع أقدم (تسويقي + بعض شاشات v1) ما زال عليه 24 مستوردًا.
**النتيجة: أربعة أنظمة نصوص متوازية.** الهدف: نظام واحد (`i18n/dict/*` لكل نص واجهة، والبيانات ثنائية اللغة تبقى في data/).

### 0.7 التوجيه: جدولان و«سلسلة if» ثالثة

`lib/appRoutes.ts` يملك جدول ROUTES (`:32-51`) + MAIN_TABS (`:54`) + hook — لكنه لا يعرف الحراسة ولا التبويب المقابل ولا مكوّن الشاشة. فتُعاد كتابة هذه المعرفة مرّتين في App.tsx: قوائم needsAccount اليدوية داخل `guardRoute` (`App.tsx:64-76`) وسلسلة if للعرض (`App.tsx:334-443`) + خريطة tab يدوية (`App.tsx:393`). إضافة مسار جديد اليوم = 5 مواضع تعديل. **الهدف:** جدول route واحد `{ id, component, guard, tab?, chrome }` في appRoutes، وApp.tsx ينكمش لقارئ جدول (~150 سطرًا).

### 0.8 سلامة الأنواع والوصول المباشر للتخزين (قياس آلي عند 19ec00a)

- **`as any`: صفر** في كل src/ — انضباط ممتاز. `as unknown as`: **5 مواضع فقط**، كلها في حدود parsing مبرّرة: `validation.ts:32`، `pwa.ts:58`، `syncService.ts:265`، `portability/format.ts:13`، `portability/importer.ts:109`. لا «ثقوب أنواع» جوهرية.
- **`localStorage` مباشر خارج lib/**: 34 موضعًا — أثقلها `views/WorkoutV2.tsx` (8)، `features/products/store.ts` (5)، `features/todo/store.ts` (4)، `features/products/saudiSeed.ts` (4)، `features/barcode/openFoodFacts.ts` (3)، `features/achievements/engine.ts` (3)، `views/OnboardingV2.tsx` (2)، `components/InstallBanner.tsx` (2)، `views/NutritionV2.tsx` (1). مخازن features مقبولة مبدئيًا (طبقة store داخل الميزة) — أما **views فمخالفة صريحة**.
- **أزواج v1/v2 في views**: `WorkoutView`/`NutritionView`/`ProgressView`/`ProfileView`/`DashboardView`/`StartView` ليست شاشات مكرّرة بل **محوّلات مسار رقيقة (9–13 سطرًا)** تعيد تصدير شاشة V2 المقابلة (مثال `WorkoutView.tsx:12` يعرض `WorkoutV2`). طبقة تسمية مزدوجة بلا وظيفة — دمج بإعادة تسمية (التفصيل في جدول views).

### 0.9 حالة موجات الأساس عند 19ec00a (لتقييم «المقاعد المحجوزة»)

- `userDataKeys.ts` سجلّ 110 أسطر موجود ويغطّي معظم المفاتيح؛ العدّ الفعلي للمفاتيح المستعملة نصيًا `'qimmah:*'` في src = **72 مفتاحًا فريدًا** — الفجوات المكتشفة مفصّلة في جدول lib.
- `syncLww.ts` موجود (48 سطرًا) — مدى تطبيقه الفعلي في syncService مفصّل في قسم sync أدناه.
- seams موسومة `@deprecated` ما زالت حية: `workoutPlan.ts:96` (التدوير الأعمى)، `workoutSessions.ts:82` (اكتمال اليوم القديم)، `nutritionTracking.ts:25` (مفتاح v1)، `machineCatalog.ts:34`. REMOVAL PLAN مكتوبة في `nutritionV2Model.ts:63-67`.

---


# 1. src/lib — الجذر أ–م

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| lib/accountScope.ts | 129 | مسح عزل الحساب على الجهاز (allowlist) + مطابقة آخر مستخدم | لا شيء جوهري — تصميم fail-safe سليم | keep |
| lib/activeSession.ts | 168 | لقطة تمرين نشط قابلة للاستئناف + مساعدي مؤقت راحة نقيين | **نصف التخزين ميت**: load/save/clearActiveSession/isRestorable (:130,:151,:161,:97) لا يستهلكها إلا dataPortability الميت + scripts؛ الحي فقط restRemainingSec/restIsFinished (:60,:65) + ثابت المفتاح؛ الـregistry نفسه يصف المفتاح «retire» | refactor (إبقاء مساعدي الراحة، حذف تخزين اللقطة الميت) |
| lib/appPreferences.ts | 210 | تفضيلات الجهاز: لغة + ثيم + جدول غروب | لا شيء جوهري داخليًا (مشكلته جاذبية `Lang` — انظر 0.2) | refactor (نقل Lang) |
| lib/appRoutes.ts | 95 | راوتر hash (أنواع + routeFromHash + hook) | لا شيء جوهري داخليًا (النقص: لا يعرف guard/tab/component — انظر 0.7) | refactor (توسعة الجدول) |
| lib/authContext.tsx | 484 | مزوّد Supabase auth + تدفقات الاستعادة وحذف الحساب | مفتاح حرفي `'qimmah:supabase-auth:v1'` :276 بدل ثابت مشترك (مسجّل لكنه غير مستورد) | keep (ثانوي: ثابت مسمّى) |
| lib/buildInfo.ts | 17 | ثوابت نسخة/commit البناء | لا شيء جوهري | keep |
| lib/calculators.ts | 421 | محرّك أهداف تغذية/طاقة + ثوابت خيارات وتسميات | **تسميات UI عربية-فقط مضمّنة** (:116-155 خيارات؛ :96,:189,:195,:248,:255 ملاحظات) تستهلكها شاشات حية بينما نظيرها الإنجليزي i18nLabels.ts ميت → وضع EN يعرض عربيًا | refactor (نقل النصوص لـ i18n؛ إبقاء الرياضيات) |
| lib/cn.ts | 4 | أداة دمج classnames | لا شيء جوهري | keep |
| lib/commitmentPlan.ts | 35 | مصنع خطة الالتزام + تسميات | نص ثنائي inline :18 (ثانوي) | keep |
| lib/commitmentTracking.ts | 97 | مخزن التزامات اليوم + hook | لا شيء جوهري (المفتاح مسجّل) | keep |
| lib/customization.ts | 303 | نموذج التخصيص المركزي + تخزين + هجرتان قديمتان + إعادة حساب أهداف | كبير مختلط (نموذج+افتراضيات+هجرات+recompute)؛ تسميات userType عربية :37-41 | refactor (فصل الهجرات) |
| lib/customizationContext.tsx | 84 | سياق React للتخصيص | لا شيء جوهري | keep |
| lib/dataOwnership.ts | 189 | ختم الملكية + بوابة التبنّي + مشغّل الهجرات + الحجر | يملك 5 مفاتيح (dataOwner:v1، dataOwner:pending:v1، migrations:v1، migrationSnapshot:v1:، quarantine:v1:) **كلها غير مسجّلة في userDataKeys** رغم ادعائه «المصدر الوحيد» | keep (تسجيل مفاتيحه) |
| lib/dataPortability.ts | 159 | باني تصدير بيانات قديم موحّد | **ميت** (غير قابل للوصول)؛ مستورده الوحيد scripts/data-portability-proof.ts؛ خلَفه lib/portability/ | delete (بعد فحص الـscript) |
| lib/deepLinkRecovery.ts | 86 | سباكة استعادة كلمة المرور عبر deep-link | لا شيء جوهري | keep |
| lib/demoMode.tsx | 15 | علم سياق الوضع التجريبي | لا شيء جوهري | keep |
| lib/dietFilter.ts | 74 | مرشّح مكونات/وجبات حسب النمط الغذائي (نقي) | لا شيء جوهري | keep |
| lib/equipmentAccess.ts | 46 | بوابة معدات أحادية المصدر من الملف الشخصي | لا شيء جوهري | keep |
| lib/exerciseGuidance.ts | 369 | إرشاد تقني/أخطاء/سلامة لكل نمط حركة | **محتوى داخل lib** متضخم: 3 مجموعات متداخلة (:10-87، :152، :279)؛ تسميات فيديو عربية :125؛ MUSCLE_AR :89 يكرّر muscles.ts | move→data + i18n |
| lib/exerciseHistory.ts | 150 | مخزن أرقام/آخر-أفضل للتمرين (يفوّض historyStore) | تصديران ميتان recordWeight :138 وEXERCISE_HISTORY_KEY :10؛ oneRepMax محلي :67 يكرّر strength/e1rm؛ نص تلميح عربي :133 | refactor |
| lib/exerciseLabels.ts | 24 | تسميات معدات موطّنة عبر i18n | لا شيء جوهري | keep |
| lib/exerciseStats.ts | 100 | تاريخ/أرقام/اتجاه لكل تمرين من الجلسات | numOf :7 + oneRepMax :13 تكرار لـ strength/e1rm | keep (ثانوي: توحيد e1rm) |
| lib/finishWorkout.ts | 59 | منسّق حفظ الجلسة المنتهية + كشف الأرقام | لا شيء جوهري | keep |
| lib/geolocation.ts | 26 | غلاف geolocation لمرة واحدة | لا شيء جوهري | keep |
| lib/handedness.ts | 32 | تفضيل استخدام يد واحدة | تضارب تصنيف: التعليق :4 يقول device-level لكن userDataKeys يسجّله kind='user' | keep (حسم التصنيف) |
| lib/healthKit.ts | 261 | ربط HealthKit (خطوات/وزن/نبض) + حالة لكل مقياس | **حدث يتيم** `qimmah:steps-updated` يُبثّ :120 بلا مستمع في src كلها | keep (وصل الحدث أو حذفه) |
| lib/historyStore.ts | 565 | المخزن التاريخي المحلي القانوني + هجرة قديمة لمرة واحدة | كبير لكنه متماسك وقانوني | keep |
| lib/i18nLabels.ts | 78 | ترجمات EN لخيارات calculators | **ميت**؛ مستورده الوحيد CalorieExplainer الميت؛ إصلاح EN غير موصول | delete (بعد وصل بديل في i18n) |
| lib/icons.ts | 219 | خريطة أسماء lucide → مكونات | لا شيء جوهري | keep |
| lib/installState.ts | 42 | علم رفض تثبيت PWA + كشف iOS-Safari | لا شيء جوهري | keep |
| lib/measurementLog.ts | 88 | واجهة سجلات القياسات فوق historyStore + استيراد Health | numOf محلي :72 (تكرار تافه) | keep |
| lib/medalArt.ts | 89 | باني SVG للأوسمة (مشترك React+scripts) | لا شيء جوهري (باني نص لا JSX) | keep |
| lib/monitoring.ts | 151 | تهيئة Sentry + حدود مسح PII | لا شيء جوهري (تصميم خصوصية قوي) | keep |
| lib/muscleCoverage.ts | 247 | محرك تغطية العضلات الأسبوعي + تعافٍ (توصيات ثنائية) | فرع ميت: summarizeCoverage :239 يفحص `status==='trained'` وderiveStatus لا يعيدها أبدًا | keep (حذف الشرط الميت) |
| lib/muscleGroupCoverage.ts | 87 | تجميع تغطية بمستوى المجموعة | **ميت**؛ مستورده الوحيد MuscleMap الميت؛ يتداخل مع muscleCoverage | delete |
| lib/muscleMapLib.ts | 87 | جسر react-body-highlighter + تسميات عربية | **ميت**؛ صفر مستورد؛ تبعيته في package.json ميتة أيضًا | delete (+ إزالة التبعية) |
| lib/muscles.ts | 39 | تسميات عضلات ثنائية + عضلات هدف اليوم | القيم العربية مكرّرة في exerciseGuidance (مشكلة ذاك الملف) | keep |

**ملاحظات القسم (أ–م):**
- نظاما portability متعايشان: dataPortability.ts الميت (monolith للـscripts فقط) مقابل lib/portability/ القانوني — حذف الأول يفكّ أيضًا وهم «استخدام» تخزين activeSession.
- **فجوات userDataKeys** (الذي يدّعي المصدر الوحيد): `qimmah:migrations:v1` + مفاتيح dataOwnership الأربعة كلها غير مسجّلة.
- معادلة Epley 1RM **مكررة ثلاثًا**: exerciseStats:13 وexerciseHistory:67 يعيدان تنفيذها رغم وجود strength/e1rm القانوني؛ ومحلّل numOf منسوخ في 3 ملفات.
- تسرّب i18n داخل lib: calculators.ts وexerciseGuidance.ts يحملان UI عربيًا-فقط تعرضه شاشات حية، والمرافق الإنجليزي i18nLabels.ts ميت → مستخدم EN يرى قوائم عربية.
- تصنيف العضلات مكرّر بثلاث طرق (muscleCoverage الحي، muscleGroupCoverage الميت، muscleMapLib الميت).
- صفر `as any` في الـ37 ملفًا كلها؛ عزل accountScope+dataOwnership وحدود monitoring سليمة.

---

# 2. src/lib — الجذر ن–ي

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| lib/nativeFeedback.ts | 20 | غلاف هابتكس Capacitor مبوّب بالتفضيلات | لا شيء جوهري | keep |
| lib/nativeShell.ts | 49 | تهيئة status-bar + splash + قفل zoom | لون مؤقت `#101216` :12 (placeholder موثّق) | keep |
| lib/nutritionPlan.ts | 152 | بناة ماكروز/قوالب وجبات + أسماء عرض | تصدير ميت `mealAlternatives` :112 (صفر مستهلك) | refactor (حذفه) |
| lib/nutritionTracking.ts | 254 | محوّل React فوق nutritionV2Model + historyStore | مفتاح v1 `@deprecated` :25 لم يعد يُكتب لكنه مُصدَّر؛ `MEAL_SLOTS` عربي inline :32؛ حي فقط عبر achievements | refactor (تقليص لسطح achievements) |
| lib/nutritionV2Model.ts | 379 | مخزن يوم التغذية القانوني + view-model واعٍ بالهدف | مفتاح legacy موثّق :67 (خطة إزالة مكتوبة)؛ نصوص hero/nudge عربية كثيفة | keep |
| lib/onboarding.ts | 154 | حالة بوابة الإعداد لكل حساب | لا شيء جوهري | keep |
| lib/onboardingProfile.ts | 440 | مخزن الملف المصدر + تحويل ثنائي الاتجاه للقديم | كبير مختلط (تخزين + هجرة + اشتقاق أهداف)؛ يضيف عملية sync للـprofiles :128 | refactor (فصل الهجرة) |
| lib/onboardingSync.ts | 93 | كتابة «أساسيات» الإعداد مباشرة لعمود profiles | **كاتب سحابي ثانٍ لنفس العمود يتجاوز syncQueue+LWW**: يكتب شكل essentials مختزلًا بينما onboardingProfile:128/syncService:422 يكتبان الشكل الكامل → سباق last-write-wins على مستوى العمود (الدفاع القرائي `_meta` موجود لكن سباق الكتابة قائم؛ الخسارة الفعلية UNVERIFIED) | refactor (توحيد عبر القائمة) |
| lib/onboardingV2Adapter.ts | 63 | خيارات v2 → `Answers` | إسقاط حقل `pref` موثّق مقصود | keep |
| lib/onboardingV2Flow.ts | 150 | آلة حالة تدفق v2 نقية + مسودة بنطاق المالك | لا شيء جوهري | keep |
| lib/passwordPolicy.ts | 38 | قوة/صلاحية كلمة المرور | لا شيء جوهري | keep |
| lib/planBuilderAnswers.ts | 140 | نموذج `Answers` + بناء ملف الإعداد | `showsTargetWeight` :86 مكرّر في onboardingProfile:193 | keep |
| lib/planDayNames.ts | 139 | تطبيع أسماء أيام الخطة وقت القراءة | لا شيء جوهري | keep |
| lib/planDerive.ts | 30 | اشتقاقات إعداد خفيفة | لا شيء جوهري | keep |
| lib/planGenerator.ts | 1112 | محرّك الخطط القاعدي (تقسيم+تمارين+تغذية+التزامات+قياسات) | **متضخم متعدد المسؤوليات**؛ `TRAIN_PATTERN` :763 نسخة موثقة في workoutCalendar؛ `buildWeeklySchedule` القديم :820 ما زال للـcustomizer؛ تحذيرات/أيام عربية inline | refactor (فصل توليد التغذية ~150 سطرًا أولًا) |
| lib/profileV2Model.ts | 181 | view-model الملف الشخصي من مخازن حقيقية | تسميات عربية inline؛ `GOAL_AR` مكرّر عبر نماذج v2؛ يستورد features/achievements/engine (انتهاك 0.3) | refactor |
| lib/progressStats.ts | 103 | اشتقاقات تقدم (حجم/أرقام/عضلات) | نسخة ميتة `workoutStreak` :84 (القانوني streaks.ts) | refactor (حذفها) |
| lib/progressV2Model.ts | 332 | view-model «الملخّص» 14 يومًا | كبير؛ KPIs غير قياسية موثقة؛ عربي inline كثيف | keep |
| lib/pwa.ts | 124 | التقاط prompt التثبيت + أذونات الإشعارات | double-cast :58 مبرّر (API غير قياسي) | keep |
| lib/recovery.ts | 106 | منطق تسجيل التعافي + سجل بنطاق المالك | لا شيء جوهري | keep |
| lib/recoveryState.ts | 106 | منطق نقي لمراحل استعادة كلمة المرور | شبه تصادم اسمي مع recovery.ts (نطاقان مختلفان) | keep (إعادة تسمية مقترحة passwordRecoveryState) |
| lib/reminderPrefs.ts | 34 | seam توافق فوق notifications/prefs | حي عبر سجل portability فقط | keep |
| lib/reminders.ts | 34 | seam توافق فوق محرك الإشعارات | حي عبر resetQimmah | keep |
| lib/resetQimmah.ts | 52 | مسح كامل عبر wipeUserData + إلغاء الإشعارات | لا شيء جوهري | keep |
| lib/servingDisplay.ts | 81 | تنسيق عرض الحصص المنزلية | **ميت** — صفر استيراد (متحقق) | delete |
| lib/statsSummary.ts | 206 | تجميعات «لوحتي» نقية | لا شيء جوهري (لكن شاشته يتيمة — انظر views) | keep/merge مع مصير MyStatsView |
| lib/stepCounter.ts | 218 | مخزن سجل الخطوات + جسر `window.QimmahSteps` | لا شيء جوهري | keep |
| lib/streaks.ts | 189 | streak قانوني + التزام أسبوعي | لا شيء جوهري (قانوني) | keep |
| lib/sunTimes.ts | 36 | حساب شروق/غروب للثيم | لا شيء جوهري | keep |
| lib/supabase.ts | 14 | barrel يعيد تصدير supabaseClient | **ميت** — الجميع يستورد supabaseClient مباشرة | delete |
| lib/supabaseClient.ts | 101 | عميل Supabase كسول + حالة الإعداد | URL افتراضي + anon JWT حرفيان :17-19 (آمنان بـRLS لكن مضمّنان في المصدر) | keep |
| lib/syncLww.ts | 48 | أساسيات حلّ Last-Writer-Wins | لا شيء جوهري (قانوني موثوق) | keep |
| lib/syncQueue.ts | 237 | طابور عمليات sync متين بنطاق المالك | لا شيء جوهري | keep |
| lib/syncService.ts | 609 | منسّق sync السحابي (hydrate/flush/merge) | **يستخدم syncLww فعليًا** — LWW حقيقي لكل سجل (جلسات/تاريخ تمارين/قياسات + شرائح daily_logs :274-376)؛ المخازن المساعدة تستخدم queue-pending كبديل LWW صادق (موثق :141-144)؛ upsert الـprofiles دمج سطحي :125 (انظر onboardingSync)؛ كبير لكنه متماسك | keep |
| lib/syncStores.ts | 196 | محوّل sync للمخازن المساعدة (خطوات/أوسمة/customPlan/todos) | يعيد إعلان `ACHIEVEMENTS_KEY` حرفيًا :38 بدل الاستيراد؛ يستورد features بالاسم (انتهاك 0.3/0.4) | refactor |
| lib/today.ts | 117 | مخزن تبديلات اليوم + `getDayStamp`/`weekdayName` المشتركة | يخلط أداة تاريخ مشتركة (21 مستوردًا) مع مخزن محدد | refactor (فصل dateUtils) |
| lib/todayV2Model.ts | 428 | view-model مركز القيادة (4 حالات) | كبير؛ يستهلك workoutCalendar+sessionEngine بشكل صحيح؛ عربي inline كثيف | keep |
| lib/trainingInsights.ts | 139 | مولّد insights تدريبية قديم | **ميت** — صفر استيراد (متحقق) | delete |
| lib/useOnlineStatus.ts | 26 | hook حالة الاتصال | لا شيء جوهري | keep |
| lib/userDataKeys.ts | 110 | سجل مفاتيح localStorage المركزي | الفجوات: مفاتيح dataOwnership الخمسة + `qimmah:sync:meta` وsyncQueue/syncBackup وportability:undoBackup وnotifications:v1: وcoach:lessons وtodo:v1 غير موثقة فيه (قياس 0.9) | refactor (سدّ الفجوات) |
| lib/validation.ts | 114 | حدود إدخال + منظفات رقمية | double-cast :32 مبرّر | keep |
| lib/wellnessPlan.ts | 60 | بناة عناصر مكملات/أدوية | نصوص عربية inline في البناة | keep |
| lib/wellnessTracking.ts | 99 | مخزن تبديل يومي للمكملات + hook | لا شيء جوهري | keep |
| lib/workoutCalendar.ts | 602 | **مصدر حقيقة الجدول الأسبوعي** (أي يوم خطة/راحة اليوم) | كبير لكنه متماسك؛ نسخ TRAIN_PATTERN موثّقة عمدًا (تفادي تحميل قاعدة التمارين) | keep (قانوني) |
| lib/workoutDayLabel.ts | 34 | أداة تسمية «اليوم N · split» | لا شيء جوهري | keep |
| lib/workoutFinishUndo.ts | 52 | لقطة/استرجاع تخزين للتراجع عن الإنهاء | لا شيء جوهري | keep |
| lib/workoutHydration.ts | 85 | تفضيل ترطيب أثناء التمرين + ماء عبر المخزن القانوني | لا شيء جوهري | keep |
| lib/workoutPlan.ts | 105 | مساعدي عرض الخطة + `createPlanExercise` | `@deprecated todayPlanDay` :101 **ميت فعليًا** (صفر مستهلك؛ البديل داخل workoutCalendar) | refactor (حذف todayPlanDay) |
| lib/workoutSessionEngine.ts | 207 | **مصدر حقيقة الاكتمال** (dayCompletion/todaysCompletion) | لا شيء جوهري (قانوني) | keep |
| lib/workoutSessions.ts | 90 | غلاف رقيق للجلسات فوق historyStore | `@deprecated todaysFinishedSession` :87 **ميت فعليًا** (صفر مستهلك) | refactor (حذفه) |
| lib/workoutStats.ts | 52 | إحصاءات streak/أسبوع/مدة قديمة | **ميت** — صفر استيراد؛ يكرّر streaks/estimateDuration | delete |
| lib/workoutSubstitution.ts | 104 | مرتّب بدائل واعٍ بالمعدات (نقي) | لا شيء جوهري | keep |
| lib/workoutSummary.ts | 68 | ملخص آخر تمرين بنطاق المالك + هجرة | لا شيء جوهري | keep |
| lib/workoutV2Model.ts | 151 | view-model تبويب التمرين من اليوم المحلول | `GOAL`/`CATEGORY_LABEL` عربية inline؛ `estimateDurationMin` مكرّر | refactor (توحيد التسميات/التقدير) |
| lib/workoutV2Persist.ts | 58 | تحويل لقطة v2 المنتهية → WorkoutSession قانوني | لا شيء جوهري | keep |
| lib/workoutValidation.ts | 96 | اتساق الخطة + تحذيرات توازن | تصدير ميت `validateWorkoutPlan` :21 (المستخدم analyzeWorkoutBalance فقط)؛ تحذيرات عربية inline | refactor (حذف الميت) |

**ملاحظات القسم (ن–ي):**
- **ملكية «تمرين اليوم» نظيفة بعد الموجات**: workoutCalendar يملك «أي يوم/راحة»، workoutSessionEngine يملك «حقيقة الاكتمال»، workoutV2Model عرض، workoutV2Persist تحويل، historyStore تخزين — **لا سلطات حية متنافسة**.
- **الـseams الموسومة @deprecated صارت ميتة فعلًا لا مهجورة**: `todayPlanDay` و`todaysFinishedSession` صفر مستورد (متحقق grep) — حذف آمن.
- مفتاح التغذية v1 متقاعد بشكل صحيح: الهجرة `nutrition-unify-v1-to-v2` تحذفه؛ nutritionTracking حي فقط عبر achievements.
- **syncService يطبّق LWW حقيقيًا** عبر resolveLww/buildPendingSet لكل سجل — ليس naive overwrite. لا حذف صامت في أي مسار.
- **أخطر فجوة sync**: عمود `profiles.data.onboarding` له **ثلاثة كتّاب** بشكلين مختلفين، وonboardingSync يكتب مباشرة متجاوزًا القائمة → سباق كتابة (انظر جدول الصف).
- تكرار عابر للنماذج: خريطة `GOAL_AR` معرّفة مستقلًا في 5 نماذج v2؛ `estimateDurationMin` منسوخ 3 مرات؛ `showsTargetWeight` مرتان — مرشّح `lib/v2/labels` مشترك.

---

# 3. src/lib — المجلدات الفرعية

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| lib/analytics/consent.ts | 89 | مخزن موافقة التحليلات + معرّف مجهول | المفتاح `qimmah:analytics:v1` مسجّل (userDataKeys:87) — لا شيء جوهري | keep |
| lib/analytics/events.ts | 49 | سجلّ أسماء الأحداث + خصائص صارمة لكل حدث | حدثان يتيمان: `onboarding_step_viewed`، `onboarding_abandoned` معرّفان (:19,:20) ولا يُطلقان أبدًا (تحقق: صفر مواقع track) | refactor |
| lib/analytics/index.ts | 133 | واجهة موحّدة: track/consent/buffer واختيار المزوّد | `initAnalytics` تُستدعى مرة واحدة (main.tsx:35) — لا شيء جوهري | keep |
| lib/analytics/milestones.ts | 38 | قفل «أول مرة» للأحداث المعلمية | المفتاح مسجّل (userDataKeys:88) — لا شيء جوهري | keep |
| lib/analytics/provider.ts | 37 | عقد المزوّد + نقطة تبديل | تجريد نظيف بنقطة `setProvider` واحدة | keep |
| lib/analytics/providers/console.ts | 14 | مزوّد DEV على console | لا شيء جوهري | keep |
| lib/analytics/providers/http.ts | 87 | مزوّد دفعات sendBeacon/fetch | لا شيء جوهري | keep |
| lib/analytics/providers/noop.ts | 9 | المزوّد الصامت الافتراضي | لا شيء جوهري | keep |
| lib/coaching/cues.ts | 34 | بحث cue للتمرين + fallback | نصوص عربية fallback (:14-18) لكنها محتوى مؤلّف مقبول | keep |
| lib/coaching/hash.ts | 10 | تجزئة FNV-1a حتمية | مشترك بين lessonRotation وrestTips | keep |
| lib/coaching/index.ts | 5 | Barrel | لا شيء جوهري | keep |
| lib/coaching/lessonRotation.ts | 69 | تدوير دروس نقي + حفظ بنطاق المالك | المفتاح `qimmah:coach:lessons:v1` مسجّل (:68) | keep |
| lib/coaching/restTips.ts | 29 | منتقي نصائح راحة نقي | لا شيء جوهري | keep |
| lib/coaching/types.ts | 33 | أنواع coaching | لا شيء جوهري | keep |
| lib/insights/generate.ts | 86 | مولّد بطاقات مرتّبة من المقاييس | لا شيء جوهري | keep |
| lib/insights/index.ts | 22 | Barrel + بناة pure/live | لا شيء جوهري | keep |
| lib/insights/metrics.ts | 205 | 7 حسابات مقاييس نقية | الأكبر لكنه متماسك أحادي الغرض | keep |
| lib/insights/readers.ts | 90 | محوّل store→InsightInput | خريطة `MUSCLE_TO_GROUP` بعربي inline (:19-24) — تسميات تخص i18n/data (ثانوي) | keep |
| lib/insights/types.ts | 79 | أنواع insights | لا شيء جوهري | keep |
| lib/insights/InsightCardsView.tsx | 62 | قائمة بطاقات JSX (عرضية) | **طبقة خاطئة**: JSX داخل lib/ يستورد `@/components/Icon` (:5) + cn + appRoutes؛ يستهلكه TodayV2/ProgressV2 | move→components/insights |
| lib/notifications/copy.ts | 70 | بناة نصوص إشعارات inline | **ميت**: صفر استخدام؛ خلَفه `@/data/notificationCopy` (تعليق الملف نفسه يقرّ :46)؛ نصوص عربية مكرّرة متباعدة | delete |
| lib/notifications/engine.ts | 110 | مطابقة جدولة Capacitor | reconcile متسلسل بحارس generation | keep |
| lib/notifications/index.ts | 4 | Barrel | لا شيء جوهري | keep |
| lib/notifications/planWeek.ts | 27 | صفوف روتين → خطة أيام الأسبوع | مفاتيح أيام عربية كخريطة بحث (:4-14) بيانات لا UI | keep |
| lib/notifications/prefs.ts | 119 | تفضيلات بنطاق المالك + هجرة قديمة | المفتاحان مسجّلان (userDataKeys:69,:58) | keep |
| lib/notifications/restEnd.ts | 85 | إشعار نهاية الراحة (منفذ قابل للحقن) | يستخدم `notificationMessage` القانوني | keep |
| lib/notifications/schedule.ts | 121 | نطاقات ID + باني الخطة + ساعات الهدوء | يستخدم النص القانوني — لا تكرار | keep |
| lib/notifications/supplementNames.ts | 21 | قراءة أسماء مكملات المستخدم | يستهلكه NotificationsSettingsV2 | keep |
| lib/notifications/types.ts | 43 | أنواع الإشعارات | لا شيء جوهري | keep |
| lib/portability/errors.ts | 9 | صنف PortabilityError | لا شيء جوهري | keep |
| lib/portability/exporter.ts | 116 | بناء الحزمة + مشاركة/تنزيل محلي | عنوان مشاركة عربي inline (:88) نص منتج | keep |
| lib/portability/format.ts | 65 | schema الحزمة + ملخص عربي | double-cast (:13) مبرّر | keep |
| lib/portability/guard.ts | 22 | إعادة فحص حدود المالك/الاستعادة | لا شيء جوهري | keep |
| lib/portability/importer.ts | 309 | خط parse+validate+undo+apply | الأكبر؛ مختلط (parse/snapshot/apply) لكنه وحدة أمنية متماسكة؛ double-cast (:109) يُتحقق بعده | refactor (حدّي) |
| lib/portability/index.ts | 41 | Barrel + readFileText | لا شيء جوهري | keep |
| lib/portability/registry.ts | 222 | قائمة سماح المخازن + io خام | **اقتران بالميزات بالاسم**: features/achievements/engine (:34)، customPlan/storage (:36)، todo/store (:37)؛ يسجّل مخزن `activeSession` **المتقاعد** (:147-153) بينما مخزن `active-workout:v2` الحي **غير مُصدَّر** في portability؛ مفاتيح حرفية مكرّرة :155,:176 | refactor |
| lib/strength/e1rm.ts | 88 | معادلات e1RM + سلاسل | لا شيء جوهري | keep |
| lib/strength/index.ts | 5 | Barrel | لا شيء جوهري | keep |
| lib/strength/plates.ts | 164 | حساب الأقراص + مخزن إعداد | المفتاح `qimmah:plates:v1` مسجّل (:66) | keep |
| lib/strength/prs.ts | 155 | كشف أرقام قياسية موحّد | لا شيء جوهري | keep |
| lib/strength/warmup.ts | 75 | سلّم إحماء + تفضيل | المفتاح مسجّل (:67) | keep |

**ملاحظات القسم:**
- اقتران registry/الميزات: `portability/registry.ts` (:34,:36,:37) و`syncStores.ts` (:24-31) يصعدان من lib إلى features — الحل قلب الاتجاه: كل ميزة تسجّل StoreDef/sync-adapter بنفسها (نقطة تسجيل) فتبقى lib محايدة.
- ثغرة portability حقيقية: المخزن المتقاعد `qimmah:activeSession:v1` يُصدَّر بينما مخزن الجلسة الحي `qimmah:active-workout:v2` **غائب من التصدير** — إدخال ميت + فجوة تصدير معًا.
- `lib/dataPortability.ts` الميت هو سلف مجلد portability/ بنفس `BUNDLE_KIND`/schema v1 — يُحذف مع `notifications/copy.ts` (كلاهما صفر استيراد حي).
- النص القانوني للإشعارات = `data/notificationCopy` (`notificationMessage`)؛ بعد حذف copy.ts لا يبقى تكرار.
- سلامة أنواع قوية في النطاق كله: صفر `as any`؛ كل مفاتيح localStorage في النطاق متتبَّعة في userDataKeys.

---

# 4. src/views + src/sections + App.tsx + main.tsx

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| App.tsx | 455 | راوتر hash + حراسة حساب/إعداد + مصالحة الإقلاع | **3 قوائم مسارات تُزامَن يدويًا**: needsAccount :64-76، سلسلة if للعرض :334-443، خريطة tab :393؛ appRoutes لا يحمل component/guard/tab؛ 91 سطرًا بعربي inline | refactor (جدول route واحد) |
| main.tsx | 87 | إقلاع: مزوّدات + ثيم/تحليلات/مراقبة + SW/native | نظيف — كل سطر تهيئة واحدة | keep |
| views/WorkoutV2.tsx | 1211 | حلقة التمرين v2: خطة→تفاصيل→نشط→اكتمال + راحة + بدائل + ترطيب + أقراص + إحماء | **god-file**؛ localStorage خام في view (:263,275,289,301,372)؛ ~108 نصوص ثنائية inline (~113 سطرًا)؛ بثّ immersive :199-200؛ استيراد workoutSessions :29 نوع-فقط (سليم) | refactor (تفكيك — انظر الملاحظات) |
| views/ProfileV2.tsx | 548 | تبويب «حسابي» v2: هوية + إحصاءات + برنامج + شاشات فرعية (إعدادات/خصوصية/بيانات/إشعارات) | تصدير/استيراد بيانات خاص (:239-377) **يكرّر** DataManagementPanel في SettingsView؛ `SubScreen`/`Group` منسوخة في NotificationsSettingsV2 :379 | refactor (توحيد الأسطح المكررة) |
| views/OnboardingV2.tsx | 578 | إعداد v2 ثلاثي الخطوات + خط توليد حقيقي | كبير؛ localStorage :261-262 (seam فحص DEV محروس)؛ نصوص ثنائية inline؛ المنطق في onboardingV2Flow (سليم) | keep |
| views/ProgressV2.tsx | 540 | تبويب «التقدّم» v2: ملخص + momentum/وزن/قوة + تسجيل وزن | يعيد بناء النموذج كل render عبر `setRevision` :52,55 (لا memo/subscribe)؛ رسوم SVG يدوية تتداخل مع MyStatsView؛ نصوص inline | refactor (اشتراك مخزن + توحيد الرسوم) |
| views/SettingsView.tsx | 489 | مسار «الإعدادات»: حساب/حذف، بيانات، إعادة توليد خطة، تذكيرات، لغة، dev | **قشرة v1** (AppNav+Footer+getStrings :2-3,8)؛ NotificationSettingsPanel :284 يكرّر NotificationsSettingsV2؛ DataManagementPanel يكرّر DataScreen في ProfileV2 | refactor→دمج في سطح v2 (يملك تدفقات فريدة: حذف حساب/إعادة توليد/لغة/dev) |
| views/NutritionV2.tsx | 468 | تبويب «التغذية» v2: سعرات/ماكروز + ماء + بحث طعام + باركود | إبطال كاش يدوي بحالة `tick` بعد كتابات localStorage (:75-81,83) بدل اشتراك المخزن؛ نصوص inline | refactor (اشتراك) |
| views/NotificationsSettingsV2.tsx | 396 | إعدادات تذكيرات v2 (رئيسي + لكل نوع + هدوء) | **UI إشعارات موازٍ** لـNotificationSettingsPanel؛ `SubScreen`/`Group` منسوخة من ProfileV2 :374,389؛ AR_WEEKDAYS inline :25 | refactor (توحيد بواجهة واحدة) |
| views/MyStatsView.tsx | 396 | مسار «لوحتي» v1: ملخص أسبوعي تدريب/تغذية/وزن | **يتيمة**: لا عنصر UI يوصل إليها (hash يدوي فقط)؛ تتداخل بقوة مع ProgressV2؛ قصدية بقائها UNVERIFIED | merge→ProgressV2 |
| views/LoginView.tsx | 319 | دخول/تسجيل/نسيان (Supabase) | قشرة v1 + getStrings :4؛ كبيرة لكن أحادية المسؤولية | keep (ترحيل i18n لاحقًا) |
| views/ExerciseLibraryView.tsx | 308 | مكتبة التمارين: بحث/تصفية + كتالوج الأجهزة | قاموس library سليم؛ قراءة data مباشرة (مقبول) | keep |
| views/CalcExplainerView.tsx | 275 | «كيف نحسب أرقامك؟» بأرقام المستخدم الحية | قشرة v1 (Footer) + قاموس calcScreen؛ اشتقاق نقي | keep |
| views/RecoveryView.tsx | 234 | تسجيل تعافٍ ذاتي → اقتراح غير طبي + سجل | `loadRecoveryLog` يعاد كل render :40 (ثانوي)؛ `toAr`/`Segmented` منسوخة محليًا | keep |
| views/ResetPasswordView.tsx | 212 | هبوط استعادة كلمة المرور | قشرة v1 + getStrings :4؛ نظيفة | keep |
| views/TodayV2.tsx | 210 | تبويب «اليوم» v2 (مركز القيادة) | نظيفة: نموذج memoized، صفر localStorage | keep |
| views/StartViewV2.tsx | 116 | شاشة الترحيب v2 | علامات SVG inline؛ نظيفة | keep |
| views/VerifyEmailView.tsx | 71 | بوابة تأكيد البريد | نصوص `en?:` inline بلا قاموس؛ صغيرة | keep |
| views/ContactView.tsx | 70 | صفحة تواصل ثابتة | قشرة v1 + getStrings | keep |
| views/NotFoundView.tsx | 48 | صفحة 404 | قشرة v1 + getStrings | keep |
| views/SetupView.tsx | 63 | موزّع الإعداد: onboarding→V2، متقدم→CustomizationCenter + حد أخطاء | نظيفة | keep |
| views/PrivacyView.tsx | 50 | سياسة الخصوصية | قشرة v1 + getStrings؛ شبه مطابقة لـTerms | keep (قشرة Legal مشتركة مقترحة) |
| views/TermsView.tsx | 50 | الشروط | كما فوق | keep |
| views/ProfileView.tsx | 13 | محوّل مسار → ProfileV2 | seam رقيق | merge (إعادة تسمية V2 نهائيًا) |
| views/WorkoutView.tsx | 13 | محوّل → WorkoutV2 | seam رقيق | merge |
| views/ProgressView.tsx | 13 | محوّل → ProgressV2 | seam رقيق | merge |
| views/DashboardView.tsx | 13 | محوّل → TodayV2 | seam رقيق | merge |
| views/StartView.tsx | 13 | محوّل → StartViewV2 (مستورد eager في App :3) | seam رقيق | merge |
| views/NutritionView.tsx | 9 | محوّل → NutritionV2 | seam رقيق | merge |
| sections/CustomizationCenter.tsx | 337 | معالج تحرير الخطة المتقدم (عبر SetupView) | القسم الحي الوحيد؛ reviver محروس :129-151؛ narrowing مقبول | keep (move→views/ or components/customizer) |
| sections/Dashboard.tsx | 73 | معاينة تسويقية «اللوحة» | **ميت**: صفر مستورد + يعتمد data/config ميتة | delete |
| sections/Meals.tsx | 69 | معاينة تسويقية «الوجبات» | ميت | delete |
| sections/Supplements.tsx | 60 | معاينة تسويقية «المكملات» | ميت | delete |
| sections/Customization.tsx | 54 | معاينة تسويقية «التخصيص» | ميت | delete |
| sections/CommitmentKeys.tsx | 29 | معاينة تسويقية «الالتزام» | ميت | delete |

**ملاحظات القسم:**
- **شكل توحيد التوجيه**: ترقية appRoutes من union+مصفوفتين إلى **جدول سجلات** `{ id, lazyComponent, guard: 'public'|'account'|'onboarded', tab?, inShell }` — App يعرض بالبحث ويشتق الحراسة والتبويب من السجل؛ تنهار القوائم الثلاث لمصدر واحد.
- **تفكيك WorkoutV2 (6 قطع)**: (1) `lib/workoutV2Session.ts` أنواع + isUsableSession + applySubs + parseReps (:82-169) نقي قابل للاختبار؛ (2) `hooks/useActiveWorkout.ts` كل حالة الجلسة والـ10 effects (:192-594) — **أكبر مكسب، يُخرج localStorage من الview**؛ (3) `components/workout/` ودجات التركيز Stepper/PlateStackPanel/HydrationReminder/WarmupPanel/RestPanel (:733-908)؛ (4) شاشتا ما قبل الجلسة PlanScreen+DetailScreen (:910-995)؛ (5) CompleteScreen+FinishConfirmSheet (:997-1081)؛ (6) صفائح SubstitutionSheet+UndoSubToast+DiscardConfirmSheet (:1090-1188). يتبقى منسّق ~150 سطرًا.
- **SettingsView مقابل ProfileV2**: ليسا نسختين لدور واحد بل يستضيفان **نظامين فرعيين مكررين فعلًا**: إشعارات (NotificationsSettingsV2 مقابل NotificationSettingsPanel) وتصدير/استيراد بيانات (DataScreen مقابل DataManagementPanel). الحذف المباشر غير آمن — SettingsView يملك تدفقات فريدة (حذف الحساب، إعادة توليد الخطة، موافقة التحليلات، دليل التثبيت، اللغة، أدوات dev). التوصية: نقل الفريد لسطح v2 وإحالة قشرة v1 للتقاعد وإبقاء UI واحد للإشعارات وواحد للبيانات.
- **بقايا v1 الحقيقية = i18n/القشرة لا المخازن**: 7 شاشات ما زالت على getStrings + AppNav/Footer (Settings/Login/ResetPassword/Privacy/Terms/Contact/NotFound). لا شاشة تقرأ seam مخزن @deprecated (متحقق).
- **MyStatsView يتيمة موصولة بالراوتر فقط** (appRoutes:26,50، App:67,74,430) — دمج مقترح في ProgressV2 مع نقل statsSummary أو إحالتهما معًا.
- تكرار عابر للشاشات يستحق الرفع لـ`components/v2/`: SubScreen+Group (ProfileV2:379,517 وNotificationsSettingsV2:374,389)، toAr (3 شاشات)، مساعد `t(a,e)` (6+ شاشات)، كود رسوم SVG (ProgressV2/MyStatsView).
- سلامة أنواع نظيفة في النطاق كله (صفر `as any`).

---

# 5. src/components

### الجذر

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| components/AppLoading.tsx | 12 | fallback دوّار للـSuspense | لا شيء جوهري | keep |
| components/AppNav.tsx | 79 | هيدر بسيط لصفحات الإعدادات (شعار + شارة) | قشرة ثانية؛ مستهلكه الوحيد SettingsView:142؛ منطق الشارة مكرّر من MobileShell:69-74 | refactor (هيدر مشترك مع MobileShell) |
| components/CanonicalMark.tsx | 15 | علامة SVG للهوية | لا شيء جوهري | keep |
| components/CommitmentLibraryPicker.tsx | 80 | منتقي مكتبة الالتزامات | هيكل شبه مطابق لـ4 منتقيات أخرى (تكرار) | refactor→منتقٍ مشترك |
| components/DataManagementPanel.tsx | 247 | تصدير/استيراد البيانات (PDPL) | لا شيء جوهري (النصوص عبر getStrings) — لكنه مكرّر وظيفيًا مع DataScreen في ProfileV2 | merge→سطح بيانات واحد |
| components/DeviceSettings.tsx | 131 | تثبيت PWA + تفعيل الإشعارات | تفعيل الإشعارات يتداخل مع NotificationSettingsPanel — كلاهما في SettingsView | refactor |
| components/EmptyState.tsx | 37 | حالة فراغ قابلة لإعادة الاستخدام | **ميت**: «مستورده» في MyStatsView دالة محلية بنفس الاسم (:347)؛ خلَفه StateBlock variant='empty' | delete |
| components/ErrorBoundary.tsx | 185 | حدود أخطاء التطبيق والمسارات | كائن FALLBACK عربي :17-21 (ملاذ أخير مقصود) | keep |
| components/ExerciseDetail.tsx | 341 | صفيحة تفاصيل التمرين (4 تبويبات) | تسرّب i18n: `'كيف تؤديه'` :126 خارج القاموس | keep (إصلاح النص) |
| components/ExerciseLibraryPicker.tsx | 147 | منتقي تمارين | تكرار هيكل المنتقيات | refactor |
| components/ExerciseMedia.tsx | 198 | صورة/gif التمرين مع سلسلة fallback | `muscleLabelAr()` :168,190 رقائق عربية دائمًا بلا خاصية lang | keep (فجوة i18n) |
| components/ExerciseName.tsx | 29 | اسم تمرين ثنائي مع `<bdi>` | لا شيء جوهري | keep |
| components/Footer.tsx | 49 | فوتر الروابط | لا شيء جوهري | keep |
| components/Header.tsx | 88 | هيدر الهبوط القديم (مراسي #hero) | **ميت**: مراجعه تعليقات فقط؛ مراسيه تشير لأقسام محذوفة | delete |
| components/Icon.tsx | 16 | أيقونة بالاسم عبر lib/icons | نمط سجل الأيقونات الصحيح | keep |
| components/IngredientPicker.tsx | 91 | منتقي مكونات | تكرار الهيكل | refactor |
| components/InstallBanner.tsx | 71 | شريط تثبيت PWA (في MobileShell) | **انتهاك طبقة: localStorage :12,38** بمفتاح حرفي بينما شقيقه InstallPrompt يستخدم lib/installState؛ يكرّر غرض InstallPrompt | refactor/merge |
| components/InstallPrompt.tsx | 91 | حوار تثبيت PWA سفلي (في App) | يتداخل مع InstallBanner (دعوتا تثبيت قد تظهران معًا) | merge مع InstallBanner |
| components/LineChart.tsx | 45 | رسم SVG خطي بلا تبعيات | لا شيء جوهري | keep |
| components/MedalBadge.tsx | 59 | SVG وسام | `dangerouslySetInnerHTML` :34 (موثّق آمن، بلا إدخال مستخدم) | keep |
| components/MedicationLibraryPicker.tsx | 96 | منتقي أدوية | تكرار الهيكل | refactor |
| components/MinorGoalNotice.tsx | 42 | تنويه هدف تحت 18 | تسرّب i18n: نص ثنائي كامل inline :22-24 + aria-label :35 | keep (إصلاح النصوص) |
| components/MobileShell.tsx | 201 | **قشرة التطبيق الحية الأساسية** (هيدر + تبويبات سفلية) | skip-link عربي :84 ونص offline :131-132 inline (تسرّب جزئي) | keep |
| components/MuscleChips.tsx | 32 | رقائق عضلات | **ميت**: «مستورده» دالة محلية في MyStatsView (:388) | delete |
| components/MuscleMap.tsx | 164 | شبكة التغطية الأسبوعية القديمة | **ميت**: يستورد muscleGroupCoverage الميت + EmptyState الميت | delete |
| components/NativeSettingsPanel.tsx | 270 | HealthKit/خطوات/وزن/نبض + هابتكس | تسرّب وحدات: `'كجم'` :221، `'نبضة/د'` :245؛ مشترك بين SettingsView وProfileV2 (سليم) | keep |
| components/NotificationSettingsPanel.tsx | 254 | تفضيلات الإشعارات (v1) | **نسخة مكررة من views/NotificationsSettingsV2 وكلاهما حي** | merge→NotificationsSettingsV2 |
| components/ProgressBar.tsx | 21 | شريط تقدم | **ميت**: مستوردوه sections الميتة + AchievementsCard الميت | delete |
| components/SectionHeading.tsx | 30 | عنوان قسم هبوط | **ميت** | delete |
| components/Skeleton.tsx | 53 | أساسيات skeleton + LoadingBoundary | لا شيء جوهري | keep |
| components/SourceChip.tsx | 35 | رقاقة المصدر (صحة/يدوي) | قاموس ar/en محلي :8-14 خارج i18n | keep (نقل النصوص) |
| components/SplashScreen.tsx | 64 | splash الهوية عند الإقلاع | لا شيء جوهري | keep |
| components/StateBlock.tsx | 100 | سطح حالات موحّد (فراغ/offline/خطأ) | مصمّم جيدًا | keep |
| components/SuccessToast.tsx | 70 | toast نجاح | لا شيء جوهري | keep |
| components/SupplementLibraryPicker.tsx | 85 | منتقي مكملات | تكرار الهيكل | refactor |
| components/ViewSkeletons.tsx | 98 | هياكل الشاشات | لا شيء جوهري | keep |
| components/stateBlockMeta.ts | 25 | خريطة variant→عرض نقية | لا شيء جوهري | keep |
| components/coaching/TodayLearnCard.tsx | 68 | بطاقة درس يومي (عربي فقط) | **أسوأ تسرّب i18n**: `'تعلّم'` :36,48، `'أغلق'/'اقرأ'` :52، `'فهمت'` :63 | keep (إصلاح النصوص) |

### components/customizer/

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| customizer/EditableTable.tsx | 98 | جدول تحرير عام | **ميت**: مستورده الخطوات الخمس الميتة فقط | delete |
| customizer/Field.tsx | 22 | حقل مشترك + `inputClass` | الخطوات الحية تعيد إعلان Field/inputCls محليًا بدل استخدامه | keep (فرض الاستخدام) |
| customizer/PreviewSummary.tsx | 64 | بطاقة معاينة حية | لا شيء جوهري | keep |
| customizer/StepHeader.tsx | 22 | ترويسة خطوة | لا شيء جوهري | keep |
| customizer/stepProps.ts | 17 | نوع `WizardCtx` مشترك | سياق سليم يمنع prop drilling | keep |
| steps/StepWelcome.tsx | 63 | ترحيب + اسم | لا شيء جوهري | keep |
| steps/StepBody.tsx | 179 | مدخلات جسم/هدف + حارس قاصر | لا شيء جوهري | keep |
| steps/StepGeneratePlan.tsx | 209 | معاينة توليد الخطة | `d` مظلَّل :93؛ deps معطلة :41 (ثانوي) | keep |
| steps/StepSmartCalculations.tsx | 181 | أهداف محسوبة قابلة للتحرير | `fieldInput` :124 يكرّر Field | keep |
| steps/StepWorkoutTemplate.tsx | 212 | قالب + أيام تمرين | `smallInput` :15 مكرّر؛ aria-labels موجودة | keep |
| steps/StepNutrition.tsx | 258 | باني خطة وجبات | `.ar` قسري في وضع EN :169,178؛ `inputCls` :21 مكرّر | keep |
| steps/StepWellness.tsx | 163 | محرر مكملات/أدوية | Field/inputCls محليان :155,:22 | keep |
| steps/StepCommitments.tsx | 103 | محرر التزامات | Field/inputCls محليان :96,:13 | keep |
| steps/StepMeasurements.tsx | 85 | رقائق أنواع القياسات | `nameAr` أولًا دائمًا :38 (فجوة i18n) | keep |
| steps/StepSections.tsx | 79 | تبديل الأقسام الظاهرة | لا شيء جوهري | keep |
| steps/StepReview.tsx | 138 | مراجعة + متقدم | `window.confirm` :122 مقبول | keep |
| steps/StepBasics.tsx | 62 | خطوة هوية قديمة | **ميت** (غير موصولة في CustomizationCenter) | delete |
| steps/StepGoal.tsx | 45 | خطوة هدف قديمة | **ميت** | delete |
| steps/StepLook.tsx | 84 | خطوة ألوان قديمة | **ميت**؛ يستورد config/theme الميت :4 | delete |
| steps/StepMeals.tsx | 35 | جدول وجبات قديم | **ميت** (schema قديمة) | delete |
| steps/StepMetrics.tsx | 32 | جدول مقاييس قديم | **ميت** | delete |
| steps/StepSchedule.tsx | 38 | جدول أسبوعي قديم | **ميت** | delete |
| steps/StepSupplements.tsx | 47 | جدول مكملات قديم | **ميت** | delete |
| steps/StepWorkouts.tsx | 34 | جدول قوة قديم | **ميت** | delete |

### components/machine/ + nutrition/

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| machine/MachineAltCards.tsx | 78 | بطاقات بدائل الجهاز | **ميت**: صفر مستورد | delete |
| machine/MachineHowTo.tsx | 50 | خطوات استخدام الجهاز | **ميت** | delete |
| machine/machineInfo.ts | 23 | بحث الكتالوج بمعرّف التمرين | **ميت** | delete |
| nutrition/CalorieExplainer.tsx | 153 | لوحة شرح السعرات القديمة | **ميت**: خلَفه CalcExplainerView الحي (App:384) | delete |

**ملاحظات القسم:**
- **AppNav مقابل MobileShell: ليسا قشرتين متنافستين.** MobileShell هي القشرة الحية (App.tsx:391 لكل التبويبات)؛ AppNav هيدر مبسّط لصفحة الإعدادات فقط (SettingsView:142) ولا يعرضان معًا أبدًا. المشكلة الحقيقية: تكرار منطق الشارة، وAppNav شبه يتيم — يذوب مع تقاعد قشرة v1.
- **تكرار الإشعارات مؤكّد**: NotificationSettingsPanel (عبر SettingsView:284) وNotificationsSettingsV2 (عبر ProfileV2:63) واجهتان حيتان معًا + مبدّل ثالث في DeviceSettings. الدمج على سطح واحد (V2 يبدو القانوني — الحسم قرار طبقة views).
- **فرز الـcustomizer (متحقق من CustomizationCenter:10-20)**: 11 خطوة حية / 8 ميتة (معالج قديم بجداول EditableTable وschema مسطّحة خلَفه مسار مولّد الخطط).
- **قائمة الموتى صحيحة غير متضخمة**: «مستوردو» EmptyState/MuscleChips دوال محلية بنفس الاسم داخل MyStatsView (:347,:388)، ومراجع Header تعليقات فقط.
- **أسوأ تسرّبات i18n مرتبة**: TodayLearnCard (~5 نصوص) ثم MinorGoalNotice ثم SourceChip ثم NativeSettingsPanel (وحدتان) ثم ExerciseDetail.
- **تكرار يستحق التوحيد**: (أ) 5 منتقيات مكتبات بهيكل modal+بحث+تصفية شبه مطابق؛ (ب) خطوات customizer تعيد إعلان Field/inputCls؛ (ج) InstallBanner/InstallPrompt دعوتا تثبيت قد تتزامنان.
- **صحة الطبقة**: صفر `as any`؛ صفر استيراد lucide مباشر (الكل عبر Icon→lib/icons)؛ انتهاك localStorage وحيد (InstallBanner:12,38)؛ aria-labels موجودة في العينات المفحوصة.
- WeeklyMuscleMap غير موجود على هذا الفرع (@19ec00a) — موجود فقط كتعديل غير مسلّم في checkout آخر (حد تغطية).

---

# 6. src/data + src/config + src/i18n + src/types + src/design-system

### data/ (39 ملفًا)

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| data/profile.ts | 11 | حقول ملف v1 قديمة | **ميت** (صفر مستورد) | delete |
| data/goal.ts | 12 | نبذة هدف v1 قديمة | **ميت** | delete |
| data/exerciseGifs.ts | 13 | خريطة id→gif + getter | بيانات نظيفة؛ حي | keep |
| data/scheduleCities.ts | 27 | مدن جدول الغروب | بيانات نظيفة | keep |
| data/measurementTypes.ts | 29 | أنواع القياسات + getter | نظيف | keep |
| data/routine.ts | 31 | التقسيم الأسبوعي الافتراضي | حي عبر customization؛ نوع `RoutineDay` قديم من types/index | keep |
| data/dataPortabilityCopy.ts | 33 | نصوص تصدير/استيراد | **ميت** (مستدعوه ميتون) | delete |
| data/commitment.ts | 35 | مفاتيح التزام v1 | **ميت** | delete |
| data/insightCopy.ts | 37 | نصوص insights | حي (4 مستوردين) | keep |
| data/policyCopy.ts | 38 | نصوص خصوصية/شروط | حي | keep |
| data/features.ts | 40 | قائمة ميزات الهبوط القديمة | **ميت** | delete |
| data/machineImages.ts | 41 | خريطة صور الأجهزة | حي | keep |
| data/supplements.ts | 41 | مكملات افتراضية | حي عبر customization | keep |
| data/coaching/restTips.ts | 42 | نصائح راحة ثنائية | بيانات نظيفة | keep |
| data/mealTemplates.ts | 42 | قوالب وجبات | نظيف | keep |
| data/dashboard.ts | 44 | بطاقات لوحة v1 | **ميت** | delete |
| data/meals.ts | 51 | خطة وجبات افتراضية | حي عبر customization | keep |
| data/gccStaples.ts | 56 | أطعمة خليجية `FoodItem[]` | حي عبر دمج foodItems | keep |
| data/muscleGroups.ts | 64 | بيانات عضلات + getters موطّنة | نظيف | keep |
| data/foodR2EatingOut.ts | 74 | أطعمة مطاعم | حي عبر دمج foodItems | keep |
| data/commitmentLibrary.ts | 88 | مكتبة التزامات | حي | keep |
| data/machineAlternatives.ts | 96 | بدائل الأجهزة + getters | **ميت في التطبيق** — يستهلكه scripts/p12-gif-manifest.mjs فقط | delete بعد تحديث الـscript (أو نقل للـscripts) |
| data/workoutTemplates.ts | 98 | قوالب تمارين | حي | keep |
| data/mealIngredients.ts | 119 | قاعدة مكونات | نظيف | keep |
| data/nativeSettings.ts | 120 | نصوص الإعدادات الأصلية | حي | keep |
| data/notificationCopy.ts | 146 | نصوص التذكيرات القانونية | حي (النظام القانوني) | keep |
| data/supplementLibrary.ts | 158 | مكتبة مكملات | حي | keep |
| data/medications.ts | 232 | قاعدة أدوية | حي | keep |
| data/machineCatalog.ts | 235 | كتالوج أجهزة + مساعدات | `catalogMissingIds` (:233) منطق تحقق — طبقة خاطئة خفيفة | keep |
| data/planBuilder.ts | 277 | بيانات خيارات الخطة + محوّلات | `gymTypeToAccess`/`experienceToBand`/`recommendedDaysFor` (:232-267) منطق في data | refactor (نقل المحوّلات→lib) |
| data/achievements.ts | 307 | تعريفات الأوسمة + getters | نظيف؛ حي | keep |
| data/coaching/lessons.ts | 343 | دروس coaching | بيانات نظيفة | keep |
| data/dailyPhrases.ts | 472 | عبارات يومية + منطق تاريخ (:458-468) | **ميت** + منطق-في-data | delete |
| data/machineHowTo.ts | 546 | خطوات استخدام الأجهزة | **ميت** (مستورده الوحيد MachineHowTo الميت) | delete |
| data/exercises.ts | 593 | كتالوج 181 تمرينًا + دوال كثيرة | **طبقة خاطئة**: يستورد lib/exerciseGuidance (:5) ويخبز الإرشاد وقت التحميل (:223-225) | refactor (نقل الخبز لـlib/خطوة بناء) |
| data/exerciseMedia.ts | 781 | خريطة وسائط التمارين | نظيف | keep |
| data/saudiFoods.ts | 1940 | 130 طبقًا سعوديًا | **لا تكرار مع foodItems** — معرّفات `sfct-*` مميزة، نفس نوع FoodItem، لا انحراف schema؛ يُستهلك فقط عبر دمج foodItems (:1) | keep |
| data/coaching/exerciseCues.generated.ts | 2894 | cues عربية مولّدة آليًا | المولّد scripts/coaching/build-cues.mjs (ترويسة :1) موجود وموصول (`npm run coaching:build`) | keep |
| data/foodItems.ts | 5704 | قاعدة الطعام الرئيسية + دمج + بحث | **طبقة خاطئة**: `searchFood`/`normalizeSearch` (:5657-5677) محرك بحث داخل data؛ الدمج (:5638-5642) سليم | refactor (نقل البحث→lib) |

### config/ (4)

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| config/product.ts | 37 | هوية المنتج + تنقّل | نظيف؛ حي | keep |
| config/content.ts | 147 | نصوص الهبوط القديمة | **ميت** — كل مستورديه sections ميتة | delete |
| config/theme.ts | 37 | خيارات لون التمييز | **ميت** | delete |
| config/strings.ts | 1401 | نصوص v1 ثنائية + getStrings | ~24 مستوردًا حيًا لكن لأقسام فرعية فقط؛ **قسما `tabs` و`start` ميتان بالكامل** (صفر مرجع — التبويبات الآن من design-system/v2/labels)؛ معظم مفاتيح workout/nutrition خلَفتها i18n/dict وبقيت تسميات pickers فقط | refactor (بتر الميت، ثم ترحيل تدريجي لـi18n/dict) |

### i18n/ (19)

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| i18n/index.ts | 12 | barrel | `useStrings` معاد تصديره بلا مستهلك خارجي | keep |
| i18n/LanguageContext.tsx | 83 | سياق اللغة + `t` | حي | keep |
| i18n/LanguageToggle.tsx | 62 | زر AR/EN | حي | keep |
| i18n/dict/insights.ts | 31 | قوالب insights | حي (2) | keep |
| i18n/dict/muscleCoverage.ts | 39 | نصوص تغطية العضلات | حي (1) | keep |
| i18n/dict/achievements.ts | 61 | شاشة الأوسمة | حي (3) | keep |
| i18n/dict/calorieExplainer.ts | 81 | نصوص شرح السعرات | **ميت** (مستورده الوحيد ميت) | delete |
| i18n/dict/installGuide.ts | 94 | دليل تثبيت PWA | حي (2) | keep |
| i18n/dict/profileScreen.ts | 108 | شاشة الملف | **ميت** (صفر مستورد) | delete |
| i18n/dict/misc.ts | 127 | نصوص مشتركة | حي (8) | keep |
| i18n/dict/wellnessScreen.ts | 134 | شاشة المكملات | حي (3) | keep |
| i18n/dict/statsScreen.ts | 141 | شاشة لوحتي | حي (1 — MyStatsView اليتيمة) | keep (مصيره مع MyStatsView) |
| i18n/dict/workoutScreen.ts | 148 | شاشة التمرين | **ميت** (مستوردوه MachineHowTo/AltCards ميتون) | delete |
| i18n/dict/nutritionScreen.ts | 150 | شاشة التغذية | حي (2) | keep |
| i18n/dict/calcScreen.ts | 184 | شاشة الحاسبة | حي (1) | keep |
| i18n/dict/progressScreen.ts | 199 | شاشة التقدّم | **ميت** (مستورده MuscleMap الميت) | delete |
| i18n/dict/dashboard.ts | 242 | لوحة قديمة | **ميت** (صفر مستورد) | delete |
| i18n/dict/library.ts | 275 | شاشات المكتبة/المنتقيات | حي (4) | keep |
| i18n/dict/onboarding.ts | 1303 | نصوص إعداد v2 | حي (22 مستوردًا) — الملف القانوني الثقيل | keep |

### types/ (8)

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| types/index.ts | 177 | خليط barrel قديم (15 مستوردًا) | **خليط**: مجموعة حية (NavItem, ProgressPoint, RoutineDay, SupplementItem, Meal, MacroTarget, Icon*) + أنواع تسويقية ميتة (PainPoint/ValuePillar/AudienceItem/FaqItem/PricingPlan/WorkoutDay/BodyMetric صفر مرجع)؛ `Exercise` (:28) **يكرّر بانحراف** القانوني في types/workout | refactor (حذف الميت والمكرّر) |
| types/muscles.ts | 80 | MuscleId + أنواع العضلات | حي (13) | keep |
| types/nutrition.ts | 75 | أنواع التغذية | حي (9) | keep |
| types/onboarding.ts | 167 | أنواع الإعداد | حي (9) | keep |
| types/profile.ts | 118 | أنواع الملف | حي (24) | keep |
| types/progress.ts | 71 | أنواع التقدّم | حي (12) | keep |
| types/wellness.ts | 88 | أنواع المكملات | حي (7) | keep |
| types/workout.ts | 105 | `Exercise` القانوني + أنماط | حي (28 — الأعلى) | keep |

### design-system/ (4)

| الملف | الأسطر | الغرض | الملاحظات | الحكم |
|---|---|---|---|---|
| design-system/fonts.ts | 49 | استيرادات @fontsource | حي (main.tsx) | keep |
| design-system/tokens.css | 436 | متغيرات CSS | حي | keep |
| design-system/tokens.ts | 99 | مرآة JS للتوكنز | **ميت** (صفر مستورد؛ tokens.css هو الحي) | delete |
| design-system/v2/labels.ts | 251 | تسميات v2.1 القانونية | حي (MobileShell، onboarding، StartViewV2) — نظام نصوص خامس لكنه موصول فعلًا | keep (دمجه لاحقًا في i18n/dict) |

**ملاحظات القسم:**
- **foodItems مقابل saudiFoods: لا تكرار** — مصادر إقليمية تُدمج في foodItems (:5638-5642) بنفس النوع. المشكلة الوحيدة محرك البحث داخل الملف.
- **خريطة config/strings الحية**: الأقسام الحية = brand/nav/lang/badge (قشرة)، auth، settings، pwa، legal/notFound/errorBoundary/contact + **تسميات المنتقيات فقط** من workout/nutrition/wellness/commit/progress. الميت القابل للبتر فورًا: `tabs` و`start` كاملان.
- **حساب i18n/dict**: 3,317 سطرًا في 16 ملفًا؛ **الميت = 778 سطرًا / 5 ملفات**؛ الحي = 2,539 سطرًا يهيمن عليها onboarding (1303).
- **صحة types/**: 7 من 8 ملفات نظيفة أحادية المصدر؛ العلّة الوحيدة types/index.ts (خليط v1 نصفه ميت + Exercise منحرف).
- مولّد exerciseCues موجود وموصول — الملف المولّد سليم.

---

# 7. src/features + scripts/ + ios/App

| الملف | الأسطر | الغرض | الملاحظات (دليل :line) | الحكم |
|---|---|---|---|---|
| achievements/AchievementToaster.tsx | 66 | toaster الاحتفالات العالمي (App:440) | لا شيء جوهري | keep |
| achievements/AchievementsCard.tsx | 192 | بطاقة الأوسمة + الصفيحة الكاملة | **ميت**: صفر مستورد (المرجع في dict تعليق) | delete |
| achievements/engine.ts | 352 | محرك أوسمة محلي: حالة + طابور احتفال + تقييم + تسجيل أرقام | singletons قابلة للتغيير على مستوى الوحدة (نمط external-store متوقع)؛ حي عبر registry:34 وWorkoutV2:43 وprofileV2Model:15 | keep |
| achievements/useAchievements.ts | 51 | جسر useSyncExternalStore للمحرك | `useCelebrations` حي؛ **hook useAchievements ميت** (مستهلكه الوحيد البطاقة الميتة) — وكان **المستدعي الدوري الوحيد لـevaluateAchievements (:40)** → أوسمة البروتين/الخطوات/الستريك لا تُفتح الآن إلا عند إنهاء تمرين عبر registerWorkoutPRs — **فجوة سلوكية** | refactor (إعادة وصل التقييم الدوري) |
| barcode/BarcodeCamera.tsx | 157 | كاميرا zxing + torch | لا شيء جوهري | keep |
| barcode/ScanFoodPanel.tsx | 190 | مسح→بحث→FoodItem (كسول في NutritionV2:18) | يبني FoodItem مباشرة (:83) متجاوزًا قاعدة products بأكملها | keep (قرار منتج) |
| barcode/openFoodFacts.ts | 104 | بحث OFF + كاش `qimmah:off:cache:v1` | **تكامل OFF مكرّر** مع products/offSource (جالبان، شكلان، كاشان) | refactor (توحيد) |
| customPlan/CustomPlanBuilder.tsx | 477 | معالج خطة يدوية ثلاثي الخطوات | **ميت** (يوصَل عبر barrel ميت فقط) | delete أو revive (قرار منتج) |
| customPlan/ExercisePickerSheet.tsx | 256 | منتقي تمارين للباني | ميت (مستورده الباني الميت :10) | delete معه |
| customPlan/PlanChoiceScreen.tsx | 96 | اختيار تلقائي/يدوي | ميت | delete معه |
| customPlan/defaults.ts | 123 | مساعدات شكل الخطة | ميت (:12) | delete معه |
| customPlan/index.ts | 19 | barrel | ميت — الحي يستورد /storage مباشرة | delete |
| customPlan/storage.ts | 109 | حفظ الخطة اليدوية لكل حساب | **حي فقط عبر** registry:36 وsyncStores:24-30؛ تصديرات getActivePlan/hasCustomPlan/clearCustomPlan بلا مستدعٍ حي | refactor (فصل تعريف المفتاح عن الميزة) |
| customPlan/strings.ts | 254 | قاموس محلي للباني | ميت + تجزئة i18n | delete معه |
| products/index.ts | 21 | barrel قاعدة المنتجات | حي في DEV فقط | keep (dev) |
| products/offSource.ts | 141 | جالب OFF + `registerOffFetcher()` أثر جانبي عند التحميل (:110) | **ميت**: مستورده الوحيد saudiSeed غير المستورد → **الأثر الجانبي لا يعمل أبدًا** → مسار OFF في resolveBarcode معطّل دائمًا | delete أو وصل |
| products/resolve.ts | 106 | محلّل باركود موحّد قابل للتوصيل | `resolveBarcode` (:89) بلا مستدعٍ حي؛ مع موت offSource المسار البعيد no-op دائم | refactor (وصله بالمسح أو حذفه) |
| products/reviewPanel/ReviewPanelView.tsx | 325 | واجهة مراجعة المنتجات الداخلية | مبوّبة `import.meta.env.DEV` (App:36,378) | keep (dev) |
| products/reviewPanel/seed.ts | 55 | زرع 3 منتجات تجريبية | بيانات عربية hardcoded (dev) | keep (dev) |
| products/reviewPanel/strings.ts | 92 | قاموس اللوحة | تجزئة i18n (dev) | keep (dev) |
| products/saudiSeed.ts | 90 | زرع OFF سعودي لمرة واحدة | **ميت**: صفر مستورد؛ مفتاح بوابته حي في التخزين | delete |
| products/store.ts | 251 | قاعدة منتجات + سجل تدقيق + دمج مصادر | **منفصلة عن مسار المسح الحي بالكامل** — لا يمارسها إلا لوحة الـdev | keep (dev) أو دمج بمسار المسح |
| products/types.ts | 82 | أنواع المنتجات | dev | keep (dev) |
| todo/TodoWidget.tsx | 205 | ودجة مهام اليوم | **ميت**: صفر مستورد | delete أو revive (قرار منتج) |
| todo/store.ts | 85 | حفظ todos لكل حساب + ترحيل يومي | حي فقط عبر registry:37 وsyncStores:31 | refactor (فصل المفتاح) |
| todo/strings.ts | 61 | قاموس محلي | ميت | delete معه |
| todo/useTodos.ts | 100 | hook مهام (useState خام لا useSyncExternalStore) | ميت؛ نمط مخالف لنمط achievements | delete معه |

## جدول scripts/ (~126 ملفًا — مجموعات)

| المجموعة | العدد التقريبي | موصولة؟ | الحكم |
|---|---|---|---|
| مشغّلات الإثبات `run-*-proof` + منطقها | ~45 زوجًا | معظمها عبر `test:*`/`proof:*`/`test:gate` (package.json:20-77) | keep — بوابة CI |
| E2E (`e2e/`, `e2e-auth/`, e2e-onboarding) | 7 | `test:e2e*` | keep |
| بناة الوسائط/الأصول | ~15 | `build:media`, `media:gifs`, `coaching:build` موصولة؛ الباقي يدوي | keep الموصول؛ الباقي one-offs |
| مصانع اللقطات (`*-shot`, appstore-factory, brand/, launch/) | ~18 | غير موصولة | keep كأدوات يدوية |
| DB (`db/verify-rls`) | 3 | `db:verify` | keep |
| أداء/جودة (perf-budget, qa-smoke, food-db-validate) | 4 | perf:budget موصول؛ food-db-validate يستدعيه run-food-db-proof:11 | keep |

**الـstale/المكسور المؤكد:**
- `run-p4a3-ssr-proof.mjs` يستورد `@/sections/MyTargets` **غير الموجود** (:19) → **الأمر الموصول `proof:p4a3` (package.json:22) مكسور فعليًا**.
- `data-portability-proof.ts` (موصول في `test:data-portability` وداخل `test:gate`) يستورد `lib/dataPortability` **الميت** :9 — إثبات قديم يبقي وحدة ميتة على أجهزة الإنعاش؛ النظام الحي مغطى بـ`portability-proof.ts` المنفصل.
- `p12-gif-manifest.mjs` يحلّل `data/machineAlternatives.ts` الميت (:82) — يتيم.
- `render-muscle-map.mjs` يخدم ميزة الخريطة الميتة — يتيم.
- مشغّلات يتيمة بلا أي مرجع: run-demo-seed، run-logic-audit-proof، run-momentum-proof، run-p10-i18n-proof، run-p10a3-session-proof، run-p12-a3-proof، run-p12-{b,c,d}-qa، run-p12-install-qa، run-wave5-cross-system-smoke، p3proof، p3_a2_proof، p10-a1-proof.

## جدول ios/App + capacitor.config.ts

| الملف | الأسطر | الملاحظات | الحكم |
|---|---|---|---|
| App/AppDelegate.swift | 49 | delegate قياسي؛ تسجيل الـplugin في QimmahBridgeViewController | keep |
| App/HealthKitStepsPlugin.swift | 157 | 5 دوال؛ **فراغات صادقة** (`NSNull()`، `days:[]`)؛ التسجيل عند capacitorDidLoad (:153-156) | keep |
| App/Info.plist | 70 | Camera (باركود ✓)، HealthShare (✓)، LocationWhenInUse (:29 ✓ لجدول الغروب) — الثلاثة لميزات حية؛ لا NSHealthUpdate (صحيح، قراءة فقط)؛ لا أذونات بقايا | keep |
| App/App.entitlements | 8 | healthkit فقط — مبرّر | keep |
| CapApp-SPM/Package.swift | 37 | 6 إضافات Capacitor؛ HealthKit إضافة محلية مخصصة؛ الموقع عبر WebView API | keep |
| App.xcodeproj/project.pbxproj | ~330 | HealthKitStepsPlugin في Sources؛ entitlements في الإعدادين | keep |
| capacitor.config.ts | 44 | appId com.qimmah.mobile؛ splash/statusbar داكنان | keep |

**ملاحظات القسم:**
- **الاقتران «ميت-لا-يُحذف» موثّق بالسطر**: registry.ts L36 يستورد `CUSTOM_PLAN_KEY, loadCustomPlanRecord` من customPlan/storage وL37 من todo/store (مستخدمة في STORE_DEFS L141-146, L184-189)؛ syncStores L24-31 كذلك. registry حي عبر portability→DataManagementPanel+ProfileV2؛ syncStores حي عبر syncService:27.
- achievements/engine **ليس** مقترنًا عبر syncStores — الأخير يعيد إعلان المفتاح حرفيًا عمدًا (L38 مع تعليق L11-14) لتفادي تحميل المحرك.
- **عقد healthKit JS↔Swift: ناجح وصادق.** jsName مطابق (healthKit.ts:46)؛ الدوال الخمس 1:1؛ الأصلي يعيد فراغات صادقة وJS لا يختلق (الوزن يُستورد فقط عند وجود sample :200-207، النبض لا يُحفظ :246-251). ملحوظة: `permission:'authorized'` قد تكون متفائلة (HealthKit يعيد نجاح التفويض بعد العرض حتى مع الرفض) لكن معالجة الفراغ الصادق تغطيها.
- إذن الموقع في Info.plist **ليس بقايا**: يخدم جدول الغروب الاختياري (geolocation+sunTimes+appPreferences الموصولة في ProfileV2).
- **تبعية ميتة في package.json**: `react-body-highlighter` — مستوردها الوحيد muscleMapLib الميت → قابلة للإزالة. (باقي التبعيات لم تُدقّق حصريًا — UNVERIFIED.)
- ازدواجية OFF: مسار المسح الحي (barcode/openFoodFacts) ومسار dev (products/offSource+resolve+store) تكاملان متوازيان؛ المسح لا يكتب في قاعدة المنتجات أبدًا.

---

# 8. إجماليات الكود الميت بالأسطر (قياس آلي عند 19ec00a)

المنهج: أداة reachability (BFS من `src/main.tsx` عبر كل import ثابت + `import()` كسول + alias `@/`) ثم `wc -l` على كل ملف غير قابل للوصول. `vite-env.d.ts` مستبعَد (إعلان بيئي يحمّله tsc عبر include، ليس كودًا ميتًا).

## 8.1 الأرقام الرئيسية

| المقياس | القيمة |
|---|---|
| ملفات src الكلية (ts/tsx بلا d.ts) | **335 ملفًا / 57,919 سطرًا** |
| الملفات الميتة (غير قابلة للوصول من main.tsx) | **62 ملفًا / 6,567 سطرًا** |
| نسبة الميت | **18.5% من الملفات · 11.3% من الأسطر** |
| «الميت المربوط» الإضافي (حي فقط عبر registry/syncStores — 0.4) | `customPlan/storage.ts` (109) + `todo/store.ts` (85) = **194 سطرًا** |
| ميت-في-التطبيق لكن scripts تستهلكه | **5 ملفات / 701 سطر** (8.3) |

## 8.2 توزيع الأسطر الميتة على المجلدات

| المجلد | أسطر ميتة | أثقل الملفات |
|---|---|---|
| features/ | **2,014** | customPlan 1,225 (6 ملفات) · todo 366 (3) · products 231 (2) · AchievementsCard 192 |
| data/ | **1,289** | machineHowTo 546 · dailyPhrases 472 · machineAlternatives 96 |
| components/ | **1,151** | منها customizer القديم 475 (9 ملفات) · machine/* 151 · CalorieExplainer 153 · MuscleMap 164 |
| i18n/dict/ | **778** | dashboard 242 · progressScreen 199 · workoutScreen 148 · profileScreen 108 · calorieExplainer 81 |
| lib/ | **767** | dataPortability 159 · trainingInsights 139 · muscleMapLib 87 · muscleGroupCoverage 87 · servingDisplay 81 |
| sections/ | **285** | 5 أقسام تسويقية (Dashboard 73 أثقلها) |
| config/ | **184** | content 147 · theme 37 |
| design-system/ | **99** | tokens.ts (المرآة الميتة لـtokens.css) |
| **المجموع** | **6,567** | |

## 8.3 الميت الذي تُبقيه scripts على أجهزة الإنعاش (701 سطر)

| الملف | الأسطر | الـscript المستهلك | موصول في package.json؟ |
|---|---|---|---|
| lib/dataPortability.ts | 159 | data-portability-proof.ts | **نعم — داخل `test:gate`** (package.json:33,60) |
| features/products/offSource.ts | 141 | p8a2-off-proof.ts | نعم — `proof:p8a2off` (:26) |
| features/todo/TodoWidget.tsx + useTodos.ts | 305 | p10-a5-harness.tsx | نعم — `proof:p10a5` (:28) |
| data/machineAlternatives.ts | 96 | p12-gif-manifest.mjs | لا — script يتيم |

> تصحيح عدّ: القسم 0.1 في مسودته الأولى قال «61 ملفًا» و«أربعة يستهلكها scripts» — إعادة التشغيل قبل الإقفال تثبّت **62** و**5** (الفرق: خلط css في بسط النسخة الأولى، وعدم رصد زوج todo في p10-a5-harness). الجداول الملفية لم تتأثر.

## 8.4 ميت على مستوى التصدير داخل ملفات حية (غير مشمول في 6,567)

مواضع مؤكدة بالسطر في الجداول أعلاه: تخزين لقطة activeSession (:97-168 عدا مساعدي الراحة)، `mealAlternatives` (nutritionPlan:112)، `validateWorkoutPlan` (workoutValidation:21)، `recordWeight`+`EXERCISE_HISTORY_KEY` (exerciseHistory:138,:10)، `workoutStreak` (progressStats:84)، `todayPlanDay` (workoutPlan:101)، `todaysFinishedSession` (workoutSessions:87)، فرع `status==='trained'` (muscleCoverage:239)، قسما `tabs`+`start` في config/strings، `getActivePlan/hasCustomPlan/clearCustomPlan` (customPlan/storage). **إجمالي أسطرها الدقيق UNVERIFIED** (لم تُقس آليًا على مستوى التصدير) — تقدير يدوي ~400-600 سطر إضافي.

---

# 9. ملخص النتائج حسب الخطورة

**التغطية:** 335 ملف src ملفًا-بملف (أقسام 1-6) + features (قسم 7) + ~126 script في مجموعات + 7 ملفات ios/App + capacitor.config. **الأحكام الملفية:** keep ≈ 223 · delete = 62 (مطابقة قائمة الميت) · refactor ≈ 49 · merge ≈ 10 · move = 2.

## 9.1 عالية (تمسّ السلوك أو سلامة البيانات الآن) — 6

| # | الخلاصة | الدليل | الإصلاح |
|---|---|---|---|
| H1 | **سباق كتّاب عمود profiles**: ثلاثة كتّاب بشكلين مختلفين، onboardingSync يكتب مباشرة متجاوزًا syncQueue+LWW (الخسارة الفعلية UNVERIFIED) | onboardingSync.ts + onboardingProfile:128 + syncService:422,125 | توحيد الكتابة عبر القائمة |
| H2 | **فجوة الأوسمة السلوكية**: hook useAchievements ميت وكان المستدعي الدوري الوحيد لـevaluateAchievements → أوسمة البروتين/الخطوات/الستريك لا تُفتح إلا عند إنهاء تمرين | useAchievements.ts:40 | إعادة وصل التقييم الدوري |
| H3 | **فجوة تصدير البيانات**: مخزن الجلسة الحي `active-workout:v2` غائب من portability بينما `activeSession:v1` المتقاعد مُصدَّر | portability/registry.ts:147-153 | تبديل الإدخالين |
| H4 | **بوابة proof مكسورة**: `proof:p4a3` يستورد `@/sections/MyTargets` غير الموجود؛ و`test:gate` يعتمد إثباتًا يستورد lib ميتة | run-p4a3-ssr-proof.mjs:19 · package.json:22,33,60 | إصلاح/إحالة الإثباتين |
| H5 | **lib→features اقتران بالاسم** (9 حواف): البنية التحتية تستورد الميزات فيقلب اتجاه الطبقات ويمنع حذف الميت | registry.ts:34-37 · syncStores.ts:24-31 | قلب الاتجاه لنقاط تسجيل |
| H6 | **وضع EN يعرض عربيًا في شاشات حية**: تسميات calculators/exerciseGuidance عربية-فقط ونظيرها الإنجليزي i18nLabels.ts ميت | calculators.ts:116-155 · i18nLabels.ts | نقل التسميات لـi18n ووصلها |

## 9.2 متوسطة (بنيوية — تتراكم كلفتها مع كل تعديل) — 12

| # | الخلاصة | المرجع |
|---|---|---|
| M1 | 62 ملفًا ميتًا / 6,567 سطرًا (11.3%) بينها 4 ميزات شبه كاملة | 0.1 · 8 |
| M2 | خمسة أنظمة نصوص متوازية (i18n/dict + config/strings + strings ميزات + inline + design-system/v2/labels) و~500 سطر عربي inline في الشاشات الحية | 0.6 |
| M3 | التوجيه ثلاثي المصادر: ROUTES + needsAccount اليدوية + سلسلة if (إضافة مسار = 5 مواضع) | 0.7 · App.tsx |
| M4 | WorkoutV2 god-file (1,211 سطرًا) + 34 موضع localStorage خام خارج lib (أثقلها views) | 0.8 · قسم 4 |
| M5 | واجهتا إعدادات إشعارات حيتان معًا + مبدّل ثالث في DeviceSettings | قسم 4/5 |
| M6 | سطحا تصدير/استيراد بيانات مكرّران (DataScreen مقابل DataManagementPanel) | قسم 4 |
| M7 | فجوات userDataKeys رغم ادعاء «المصدر الوحيد»: مفاتيح dataOwnership الخمسة + sync:meta وأخوتها | 0.9 · قسم 1/2 |
| M8 | نمط الاشتراك الصحيح مطبَّق على 3 مخازن من ~25؛ الباقي عدّادات bump يدوية (NutritionV2:75-83، ProgressV2:52-55) | 0.5 |
| M9 | حدث `qimmah:steps-updated` يتيم (يُبثّ بلا مستمع) | healthKit.ts:120 |
| M10 | مسار OFF في resolveBarcode معطّل دائمًا (أثر offSource الجانبي لا يعمل) + تكامل OFF مزدوج | قسم 7 |
| M11 | منطق داخل data/: searchFood في foodItems، خبز الإرشاد في exercises، محوّلات planBuilder | قسم 6 |
| M12 | دعوتا تثبيت PWA قد تظهران معًا (InstallBanner بـlocalStorage خام + InstallPrompt) | قسم 5 |

## 9.3 منخفضة (جودة/تكرار — لا أثر سلوكي) — 12

| # | الخلاصة | المرجع |
|---|---|---|
| L1 | جاذبية `type Lang`: 104/118 مستوردًا لأجل النوع فقط → ~30 انتهاك طبقة يذوب بنقله | 0.2 |
| L2 | Epley 1RM منفَّذ 3 مرات، numOf ×3، GOAL_AR ×5، estimateDuration ×3، showsTargetWeight ×2 | قسم 1/2 |
| L3 | 7+ صادرات ميتة داخل ملفات حية | 8.4 |
| L4 | تبعية `react-body-highlighter` ميتة في package.json | قسم 7 |
| L5 | 5 منتقيات مكتبات بهيكل شبه مطابق + خطوات customizer تعيد إعلان Field/inputCls | قسم 5 |
| L6 | SubScreen/Group/toAr/`t(a,e)` منسوخة عبر الشاشات؛ رسوم SVG مكررة (ProgressV2/MyStatsView) | قسم 4 |
| L7 | تسريبات i18n نقطية: TodayLearnCard (الأسوأ) ثم MinorGoalNotice وSourceChip وNativeSettingsPanel وExerciseDetail وMobileShell | قسم 5 |
| L8 | حدثا analytics معرّفان لا يُطلقان (onboarding_step_viewed/abandoned) | events.ts:19-20 |
| L9 | types/index.ts خليط: أنواع تسويقية ميتة + `Exercise` منحرف عن القانوني | قسم 6 |
| L10 | مفاتيح حرفية بدل ثوابت مسمّاة (authContext:276، syncStores:38، registry:155,176) | قسم 1/3 |
| L11 | تصادمات تسمية/تصنيف: recoveryState↔recovery، handedness (device أم user؟)، MEAL_SLOTS inline | قسم 1/2 |
| L12 | InsightCardsView (JSX) داخل lib/ + AppNav شبه يتيم بمنطق شارة مكرّر | قسم 3/5 |

## 9.4 ما ثبت سليمًا (يستحق التسجيل)

- **صفر `as any` في src كلها**؛ 5 مواضع `as unknown as` كلها مبرّرة في حدود parsing.
- **syncService يطبّق LWW حقيقيًا لكل سجل** — لا naive overwrite ولا حذف صامت.
- ملكية «تمرين اليوم» نظيفة بعد موجات P4/P5: calendar→engine→model→persist→history بلا سلطات متنافسة.
- عقد healthKit JS↔Swift صادق (فراغات صادقة، لا اختلاق قيم)؛ أذونات Info.plist الثلاثة كلها لميزات حية.
- foodItems/saudiFoods بلا تكرار schema؛ مولّد exerciseCues موصول؛ صفر استيراد lucide مباشر.

## 9.5 حدود التغطية (UNVERIFIED)

- أسطر الميت على مستوى التصدير داخل ملفات حية (8.4) — تقدير يدوي.
- خسارة بيانات فعلية من سباق H1 — السباق مقاس بنيويًا، وقوع الخسارة غير مُعاد إنتاجه.
- تبعيات package.json عدا react-body-highlighter لم تُدقّق حصريًا.
- WeeklyMuscleMap وbodyAnatomy: تعديلات غير مسلّمة في checkout آخر — خارج هذا الفرع (@19ec00a).
- scripts/ دُقّقت في مجموعات لا ملفًا-بملفًا؛ سلوكها وقت التشغيل لم يُنفَّذ (عدا قراءة الاستيرادات).
- ios/App: مراجعة كود ثابتة؛ لم تُبنَ أو تُشغَّل على جهاز.
