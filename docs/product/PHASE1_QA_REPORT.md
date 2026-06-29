# Qimmah — Phase 1 QA / Trust Hardening Report

> Agent 5 (Trust / Cleanup / Regression QA).
> Base: `origin/integration/phase1-smart-foundation`.
> Scope: trust + safety + regression hardening. Small P0/P1 fixes only; larger
> items documented as follow-ups (no later-phase feature work).

## ملخّص تنفيذي
الأساس سليم: `build` + `lint` + `typecheck` تمرّ كلها على نسخة نظيفة. مصدر الحقيقة
(`OnboardingProfile` / `qimmah:onboarding:profile:v1`) متّسق، وكل مسارات القراءة من
`localStorage` محميّة بـ try/catch مع رجوع آمن. عُزلت بيانات النموذج (Demo) عن التدفّق
الحقيقي. عولجت خمس مشاكل P1 (تفصيلها أدناه) دون أي تغيير في النطاق.

## P0/P1 issues fixed

| # | Severity | File(s) | المشكلة | الإصلاح |
|---|---|---|---|---|
| 1 | **P1** | `src/lib/resetQimmah.ts` | «إعادة الضبط» لم تمسح **مصدر الحقيقة للإعداد** `qimmah:onboarding:profile:v1` ولا مفاتيح التذكيرات/المزامنة/جلسة Supabase — تبقى بيانات إعداد قديمة بعد الضبط. | إضافة المفاتيح الأربعة الناقصة (`onboarding:profile:v1`, `reminders:v1`, `sync:meta:v1`, `supabase-auth:v1`). الآن **كل** مفاتيح `qimmah:*` المستخدمة في الكود مشمولة. |
| 2 | **P1** | `src/sections/CustomizationCenter.tsx` | شِيپس الخطوات (الدوائر العلوية) كانت تقفز لأي خطوة عبر `setStep(i)` **متجاوزةً** حارس الصلاحية الذي يحمي زر «التالي»، و`saveAndClose` لم يتحقّق من الصلاحية — يُمكن إكمال الإعداد بحقول مطلوبة ناقصة. | الشِّيپس تُقفل للأمام عند أول خطوة ناقصة (`canReachStep`)، الرجوع للخلف حرّ، وزر الإكمال مُعطّل (`disabled`) و`saveAndClose` يقفز لأول خطوة ناقصة بدل الحفظ غير الصالح. |
| 3 | **P1** | `StepWelcome.tsx`, `StepBasics.tsx` | اسم المؤسّس «زياد» مستخدَم كـ placeholder في حقل الاسم داخل التدفّق الحقيقي (قالب للبيع لا يجب أن يحمل اسمًا شخصيًا). | تغيير الـ placeholder إلى «مثال: محمد» (محايد). لم يبقَ أي «زياد» مستقلّ في `src`. |
| 4 | **P1** | `src/sections/ProgressSection.tsx`, `src/config/strings.ts` | نص ثابت في التدفّق الحقيقي يذكر **صور التقدّم** ويدّعي «رفع الصور الفعلي قيد التطوير» — صور التقدّم خارج نطاق Phase 1 (ادّعاء ميزة غير موجودة). | استبدال النص بضمان خصوصية نظيف («قياساتك وملاحظاتك محفوظة على جهازك فقط…») وإزالة ذكر صور التقدّم من نص الخصوصية الإنجليزي. |
| 5 | **P1** | `src/App.tsx` | رجوع الخصوصية/الشروط كان `window.history.back()` — عند فتح `#/privacy` أو `#/terms` مباشرةً أو بعد تحديث الصفحة قد يقذف المستخدم خارج التطبيق. | الرجوع الآن إلى آخر مسار داخلي مُلتقَط (`beforeLegalRef`) عبر `navigate()` المحروس — لا قذف ولا حصر. |

## Trust / safety checks (pass / fail / risk per item)

| # | البند | الحالة | الدليل / ملاحظة |
|---|---|---|---|
| 1 | لا بيانات مستخدم حقيقية وهمية | **PASS** | `defaultOnboardingProfile()` فارغ آمن؛ `buildOnboardingProfile` لا يضع اسمًا؛ `buildCustomizationFromOnboarding` يفرّغ supplements/medications/workouts/meals/metrics. |
| 2 | لا «زياد/Ziyad» في التدفّق الحقيقي | **PASS** (بعد الإصلاح) | الـ placeholders غُيّرت؛ grep لا يُظهر أي «زياد» مستقلّ في `src`. الباقي «زيادة» (= increase). |
| 3 | بيانات النموذج معزولة في وضع النموذج | **PASS** | «أحمد محمد» وعيّنة الدواء في `DemoCustomizationProvider` فقط (`applyCustomization` = no-op)؛ `DemoModeProvider` يجعل التتبّع في الذاكرة بلا كتابة. التطبيق الحقيقي يستخدم `CustomizationProvider`. |
| 4 | لا صور تقدّم في التدفّق الحقيقي | **PASS** (بعد الإصلاح) | أُزيل ادّعاء «رفع الصور قيد التطوير» من `ProgressSection` ونص الخصوصية. لا نوع/مدخل صورة فعلي في القياسات. عنصر `progress-photo` في مكتبة الالتزامات يبقى التزامًا يفعله المستخدم بنفسه (لا يدّعي التطبيق تخزين صور) — انظر FOLLOW_UPS. |
| 5 | لا ادّعاء تكامل Apple Health/Google Fit | **PASS** | `ProgressView` يعرض نائبًا صادقًا: «قريبًا: Apple Health و Google Fit» بلا زر اتصال/تبديل وهمي. |
| 6 | لا نصائح طبية | **PASS** | `HealthNotice` تنبيه عام بمراجعة المختص؛ لا تشخيص؛ BMI رقم فقط بلا حكم. |
| 7 | لا توصيات جرعات | **PASS** | `medications.ts`: «لا توجد جرعات موصى بها — يُدخلها المستخدم»؛ `wellnessPlan` ينشئ دواءً بجرعة فارغة. |
| 8 | نص الأدوية/المكملات «للمتابعة فقط» | **PASS** | `StepSupplements` + `strings.ts`: «للتنظيم والمتابعة فقط… لا تبدأ أو توقف أو تغيّر جرعة أي دواء بدون استشارة الطبيب». |
| 9 | مسارات الإعدادات/الخصوصية/الشروط تعمل | **PASS** | `settings`/`privacy`/`terms` معرّفة في `appRoutes` ومربوطة في `App.tsx` و`SettingsView`. |
| 10 | localStorage تالف لا يُسقط التطبيق | **PASS** | كل دوال التحميل (12 مسار `JSON.parse`) داخل try/catch مع رجوع افتراضي آمن. |
| 11 | الهجرة القديمة لا تُسقط التطبيق | **PASS** | `ensureOnboardingProfile` يلفّ الهجرة بـ try/catch → إعداد فارغ آمن عند أي خطأ. |
| 12 | إعادة الضبط تمسح كل مفاتيح قِمّة (تذكير/مزامنة) | **PASS** (بعد الإصلاح) | `QIMMAH_KEYS` الآن يغطّي كل مفاتيح `qimmah:*` المستخدمة (تحقّق عبر `comm`). |
| 13 | لا يُكمَل الإعداد بنقر الشِّيپس والحقول ناقصة | **PASS** (بعد الإصلاح) | الإعداد الحقيقي (`PlanBuilder`) خطّي ومحروس أصلًا؛ ثغرة الشِّيپس في `CustomizationCenter` أُغلقت. |
| 14 | رجوع الخصوصية/الشروط لا يحصر المستخدم | **PASS** (بعد الإصلاح) | الرجوع إلى آخر مسار داخلي مُلتقَط بدل `history.back()`. |
| 15 | المسارات غير المعروفة ترجع بأمان | **PASS** | `routeFromHash` يرجع null لغير المعروف؛ معالج hashchange + تأثير `view→hash` يصحّحان لوجهة آمنة. |
| 16 | علامة البناء باقية | **PASS** | `BUILD_LABEL` في الفوتر و`console.info` عند الإقلاع. |
| 17 | لا حذف كود ميّت غير متعلّق | **PASS** | لم يُحذف أي ملف؛ تعديلات نصّية/منطقية دقيقة فقط. |

## Grep findings (real-flow vs demo-only)

- **«زياد/Ziyad»**: كان في placeholders حقل الاسم (`StepWelcome`, `StepBasics`) — **تدفّق حقيقي**، أُصلح. باقي النتائج «زيادة» (increase) — إيجابيات كاذبة.
- **«جرعة/dose»**: كلّها إمّا قيم يُدخلها المستخدم، أو بيانات عرض في صفحة الهبوط (`data/supplements.ts`)، أو تنويهات سلامة صحيحة. لا توصية جرعة من التطبيق.
- **«Apple Health/Google Fit»**: في `strings.ts` فقط، يُعرض كـ«قريبًا» في `ProgressView` — صادق، لا ادّعاء تكامل.
- **«صور تقدّم/progress photo»**: ادّعاء «قيد التطوير» في التدفّق الحقيقي (`ProgressSection` + خصوصية EN) — أُزيل. عنصر مكتبة الالتزامات `progress-photo` التزام ذاتي للمستخدم (ليس ميزة تطبيق) — مُوثّق كمتابعة.
- **«أحمد محمد» / عيّنة دواء**: في `DemoCustomizationProvider` فقط — **demo-only**، لا يُكتب في تخزين المستخدم.

## QA scenarios (verified in code)

| سيناريو | النتيجة |
|---|---|
| مستخدم جديد (localStorage فارغ) | `ensureOnboardingProfile` → إعداد فارغ آمن؛ الحراسة تمنع فتح اللوحة قبل الإكمال → `start`. |
| إعداد مبتدئ | لا تظهر خطوة «الانتظام»؛ يُخزّن `consistency='new'`. |
| إعداد متقدّم | تظهر خطوة التقسيمة المتقدّمة فقط عند `split_mode=advanced`. |
| localStorage تالف | كل المسارات ترجع افتراضيًا بلا انهيار. |
| الهجرة القديمة | `migrateFromCustomization` ضمن try/catch؛ فشل → افتراضي آمن. |
| setup → dashboard | `PlanBuilder` يبني مصدر الحقيقة ثم يولّد الخطة ويعلّم الإكمال ثم يدخل اللوحة. |
| اللوحة بلا بيانات وهمية | الخطة مشتقّة من الملف؛ القوائم الوهمية مفرّغة؛ تتبّع «اليوم» يبدأ نظيفًا. |
| إعادة الضبط | تمسح كل مفاتيح `qimmah:*` ثم تعيد التحميل إلى `start`. |

## Build / Lint / Typecheck
- `npm run build` → ✅ ينجح (تحذير حجم chunk فقط — غير حاجب، موجود في الأساس).
- `npm run lint` → ✅ بلا أخطاء/تحذيرات.
- `npm run typecheck` (`tsc -b --noEmit`) → ✅ بلا أخطاء.

## Remaining risks / follow-ups
انظر `FOLLOW_UPS.md`. أبرزها (كلها خارج نطاق Phase 1 / غير حاجبة):
1. `getDefaultCustomization()` يبذر مكملات/وجبات افتراضية بجرعات؛ التدفّق الحقيقي يفرّغها لكنها أساس عرض النموذج — يُفضّل توثيقها كـ«demo seed» صراحةً.
2. عنصر التزام `progress-photo` في المكتبة — قرار منتج (إبقاء كالتزام ذاتي أم إزالته مع نطاق الصور).
3. حجم الحزمة > 500KB — تحسين أداء مستقبلي (code-splitting).
