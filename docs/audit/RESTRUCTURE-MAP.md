# قِمّة — خريطة إعادة الهيكلة (RESTRUCTURE MAP)

**الأساس:** `audit/code-notes-full` @ 19ec00a · التاريخ: 2026-07-24
**المصدر:** كل بند هنا مشتق من `docs/audit/CODE-NOTES-FULL.md` (يُشار له CN + رقم القسم) — لا ادعاء جديد بلا دليل هناك.
**المنهج:** تقرير فقط — صفر تعديل كود. أي حذف ملفات لاحق يبقى **مبوّبًا بموافقة المالك** حسب قواعد المشروع.

---

## 1. الهيكل المستهدف (اتجاه الطبقات)

```
types/  config/  data/  i18n/          ← لا تستورد شيئًا من الأسفل
        ↓
lib/    (منطق نقي + مخازن + sync)      ← لا JSX، لا استيراد features/components
        ↓
components/  features/                  ← كل ميزة تسجّل مفاتيحها/محوّلاتها بنفسها
        ↓
views/  (شاشات — صفر localStorage خام)
        ↓
App.tsx (قارئ جدول route واحد ~150 سطرًا)
```

الفجوة المقاسة اليوم: **42 استيرادًا عابرًا للطبقات** (CN 0.3)، منها 9 حواف lib→features عالية الخطورة، و~30 تذوب بنقل `type Lang` وحده (CN 0.2).

## 2. موجات التنفيذ (مرتّبة بالاعتماديات لا بالأهمية فقط)

| الموجة | المحتوى | البوابة |
|---|---|---|
| **W0 — إصلاحات سلوكية نقطية** | R7 أوسمة + R8 فجوة التصدير + R6 كاتب profiles | test:gate + إثبات جديد لكل واحدة |
| **W1 — فكّ القفل** | R1 نقل Lang + R2 قلب registry/syncStores + R3 إصلاح scripts المثبِّتة للميت | typecheck + build + test:gate |
| **W2 — الحذف الكبير** | R4: حذف 62 ملفًا / 6,567 سطرًا على 3 دفعات (تسويقي → معالج قديم → ميزات/قواميس) + التبعية الميتة | reachability قبل/بعد + موافقة المالك على كل دفعة |
| **W3 — التوحيد البنيوي** | R5 جدول route + R10/R11 توحيد الإشعارات والبيانات + R12 سدّ userDataKeys + R14 اشتراكات المخازن | بوابة كاملة + فحص جهاز |
| **W4 — التفكيك** | R9 تفكيك WorkoutV2 + R15/R16 تقاعد محوّلات v1 وقشرتها | بوابة كاملة + لقطات شاشة |
| **W5 — النصوص** | R13 + R20: توحيد أنظمة النصوص الخمسة على i18n/dict تدريجيًا | فحص EN/AR على كل شاشة تُرحَّل |

## 3. أعلى 20 إعادة هيكلة (مرتّبة: أثر ÷ مخاطرة، مع احترام الاعتماديات)

| # | إعادة الهيكلة | الدليل (CN) | الحجم | المخاطرة | لماذا هذا الترتيب |
|---|---|---|---|---|---|
| R1 | نقل `type Lang` (+`ThemePref`) إلى `i18n/types.ts` مع إعادة تصدير مؤقتة من appPreferences | 0.2 | S | شبه صفرية | سطر واحد يذيب ~30/42 انتهاك طبقة — أعلى عائد/كلفة في التقرير كله |
| R2 | قلب اقتران registry/syncStores: كل ميزة تسجّل StoreDef/sync-adapter بنفسها (أو نقل تعريفات المفاتيح لـuserDataKeys) | 0.3/0.4 · قسم 3 (registry:34-37، syncStores:24-31) | M | متوسطة | **بوابة الحذف**: بدونها customPlan/todo الميتة لا تُحذف |
| R3 | إصلاح scripts المثبِّتة للميت: إحالة data-portability-proof (داخل test:gate!) إلى portability-proof، إصلاح/إحالة proof:p4a3 المكسور، حسم p12-gif-manifest | قسم 7 (:19 المكسور · package.json:22,33,60) | S | منخفضة | يفكّ 701 سطر ميت من أجهزة الإنعاش ويصلح بوابة CI مكسورة فعليًا |
| R4 | حذف الكود الميت: 62 ملفًا / 6,567 سطرًا (11.3%) على 3 دفعات + إزالة `react-body-highlighter` | 0.1 · 8 | M | منخفضة بعد R2+R3 | أكبر تنظيف منفرد؛ يقلّص سطح كل بحث/refactor لاحق بالتُسع |
| R5 | جدول route واحد `{id, lazyComponent, guard, tab?, inShell}` في appRoutes وApp.tsx قارئ له | 0.7 (App:64-76,334-443,393) | M | متوسطة | يطوي 3 قوائم مُزامَنة يدويًا؛ إضافة مسار تصبح سطرًا واحدًا |
| R6 | توحيد كتابة `profiles.data.onboarding` عبر syncQueue+LWW (إلغاء مسار onboardingSync المباشر) | قسم 2 (onboardingSync + onboardingProfile:128 + syncService:125,422) | M | متوسطة | **أخطر فجوة سلامة بيانات** (H1) — سباق كتّاب ثلاثة قائم |
| R7 | إعادة وصل التقييم الدوري `evaluateAchievements` (المستدعي الوحيد مات مع useAchievements) | قسم 7 (useAchievements.ts:40) | S | منخفضة | إصلاح سلوكي مرئي للمستخدم: أوسمة بروتين/خطوات/ستريك لا تُفتح اليوم |
| R8 | portability: تصدير `active-workout:v2` الحي وإسقاط `activeSession:v1` المتقاعد | قسم 3 (registry:147-153) | S | منخفضة | فجوة تصدير بيانات فعلية (H3) — سطران في registry |
| R9 | تفكيك WorkoutV2 (1,211 سطرًا) إلى 6 قطع؛ أولها `hooks/useActiveWorkout` الذي يُخرج كل localStorage من الview | قسم 4 (خطة القطع الست في ملاحظات القسم) | L | عالية | أكبر god-file؛ يؤجَّل لما بعد الحذف والتوحيد لتقليل rebase |
| R10 | واجهة إشعارات واحدة: توحيد على NotificationsSettingsV2 وتقاعد NotificationSettingsPanel + مبدّل DeviceSettings | قسم 4/5 (ProfileV2:63 · SettingsView:284) | M | متوسطة | نسختان حيتان الآن تتباعدان مع كل تعديل |
| R11 | سطح بيانات واحد: دمج DataScreen (ProfileV2:239-377) وDataManagementPanel | قسم 4/5 | M | متوسطة | نفس منطق R10 لكن لسطح PDPL الحساس |
| R12 | سدّ فجوات userDataKeys: مفاتيح dataOwnership الخمسة + sync:meta + syncQueue/backup + undoBackup + notifications:v1: + coach:lessons + todo:v1 | 0.9 · قسم 1/2 (dataOwnership) | S | منخفضة | «السجل الوحيد» الذي لا يعرف مفاتيح مالكه ذاته يقوّض wipe/عزل الحساب |
| R13 | إخراج نصوص UI من calculators.ts (:116-155) وexerciseGuidance.ts إلى i18n ووصل بديل i18nLabels الميت | قسم 1 (H6) | M | منخفضة | يصلح عيبًا مرئيًا: وضع EN يعرض قوائم عربية |
| R14 | اشتراك مخازن موحّد (subscribe/useSyncExternalStore) بدل عدّادات bump في NutritionV2/ProgressV2 وتعميمه تدريجيًا | 0.5 (NutritionV2:75-83 · ProgressV2:52-55) | M | متوسطة | النمط الصحيح موجود في 3 مخازن — تعميمه يزيل فئة كاملة من بقّات «الشاشة لا تتحدث» |
| R15 | تقاعد محوّلات v1→v2 الست (9-13 سطرًا لكل منها) وإعادة تسمية شاشات V2 قانونيًا | 0.8 · قسم 4 | S | منخفضة | طبقة تسمية مزدوجة بلا وظيفة تربك كل بحث |
| R16 | تقاعد قشرة v1: نقل تدفقات SettingsView الفريدة (حذف حساب/إعادة توليد/لغة/موافقة/dev) لسطح v2 ثم إحالة AppNav/Footer/getStrings للشاشات السبع | قسم 4 (SettingsView) · قسم 5 (AppNav) | L | عالية | يعتمد على R10+R11 أولًا؛ يُغلق ازدواج القشرة نهائيًا |
| R17 | حسم MyStatsView اليتيمة: دمج في ProgressV2 (مع statsSummary وdict/statsScreen) أو حذفها — **قرار منتج** | قسم 4 (appRoutes:26,50 · App:67,74,430) | M | متوسطة | شاشة كاملة لا يصل إليها أي زر — إبقاؤها المعلّق أسوأ الخيارات |
| R18 | مرافق v2 مشتركة: توحيد GOAL_AR (×5) وe1rm (×3) وnumOf (×3) وestimateDuration (×3) + رفع SubScreen/Group/toAr/`t(a,e)` لـcomponents/v2 | قسم 2 (الملاحظات) · قسم 4 (الملاحظات) | S | منخفضة | تكرار صامت يتباعد؛ إصلاحه يسبق أي عمل على الشاشات |
| R19 | إخراج المنطق من data/: searchFood من foodItems (:5657-5677)، خبز الإرشاد من exercises (:223-225)، محوّلات planBuilder (:232-267) → lib | قسم 6 | S | منخفضة | يعيد data/ بيانات صافية ويمهّد لتحميل كسول لاحق |
| R20 | توحيد أنظمة النصوص الخمسة على i18n/dict: بتر قسمَي `tabs`/`start` الميتين من config/strings فورًا، ثم ترحيل شاشة-بشاشة، ودمج design-system/v2/labels أخيرًا | 0.6 · قسم 6 (خريطة config/strings الحية) | L | متوسطة | الأطول نفَسًا — يُنفَّذ تدريجيًا خلف كل موجة أخرى |

### ما بعد العشرين (نقطية، تُلتقط مع أقرب موجة)
- دمج InstallBanner/InstallPrompt + نقل مفتاحه لـlib/installState (CN قسم 5، M12).
- نقل InsightCardsView من lib/ إلى components/insights (CN قسم 3).
- حسم حدث `qimmah:steps-updated` اليتيم: وصله أو حذفه (CN 0.5).
- حذف حدثَي analytics غير المُطلقَين أو إطلاقهما فعلًا (CN قسم 3).
- تنظيف types/index.ts (الأنواع التسويقية الميتة + Exercise المنحرف) (CN قسم 6).
- ثوابت مسمّاة للمفاتيح الحرفية (authContext:276، syncStores:38، registry:155,176).
- إعادة تسمية recoveryState→passwordRecoveryState وحسم تصنيف handedness.

## 4. قواعد أمان التنفيذ

1. **كل حذف خلف قياس reachability قبل/بعد** — لا حذف بالحدس؛ والدفعات الثلاث في W2 كل منها commit مستقل قابل للرجوع.
2. **الموجات W0/W1 قبل أي حذف** — الميت المربوط (CN 0.4) يكسر البناء لو حُذف قبل R2.
3. لا تُدمج موجتان في PR واحد؛ بوابة `npm run typecheck && npm run build && npm run test:gate` بعد كل موجة.
4. القرارات المعلّمة «قرار منتج» (R17، customPlan/todo revive-or-delete، ScanFoodPanel↔products) تُعرض على المالك قبل موجتها.

## 5. حدود هذه الخريطة

- الأحجام (S/M/L) تقديرات قراءة لا قياس زمن — UNVERIFIED.
- ترتيب R6 (سباق profiles) قد يرتفع لـW0 فورًا إذا أثبت جهاز فعلي خسارة بيانات.
- الخريطة مبنية على @19ec00a؛ فروع الأمام (feature/p25-steps-health وما بعدها) قد تحرّك المراجع السطرية.
