# Qimmah — Product Logic Spec (Phase 1 Smart Foundation)

> هذا المستند يوثّق **مصدر الحقيقة للإعداد** كما هو منفّذ في Phase 1.
> المبدأ الأساسي: **الإعداد (Onboarding) هو مصدر الحقيقة الوحيد** — كل خطة تمرين،
> هدف سعرات، تقسيمة، هدف التزام أسبوعي، وأولوية لوحة تُشتق من إجابات الإعداد.
>
> قواعد ثابتة: لا بيانات وهمية · لا نصائح طبية · لا صور تقدّم · لا تبديل لغة إنجليزية ·
> لا حكم على BMI (رقم فقط) · لا خريطة عضلات/بطاقة مشاركة في هذا النطاق.

## 1. كائن مصدر الحقيقة (`OnboardingProfile`)

النوع في `src/types/onboarding.ts`. التخزين في `qimmah:onboarding:profile:v1`
(الإصدار `ONBOARDING_SCHEMA_VERSION = 1`). كل الحقول اختيارية ما لم تُذكر قيمة افتراضية آمنة.

| القسم | الحقول | ملاحظات |
|---|---|---|
| `profile` | `name?`, `sex?` (male/female), `age?` | الاسم اختياري — **لا اسم وهمي**. |
| `bodyMetrics` | `heightCm?`, `currentWeightKg?`, `targetWeightKg?` | وزن الهدف لـ bulk/cut فقط؛ يُشتق للباقي. |
| `goal` | `type?` (bulk/cut/recomp/strength) | أربعة مسارات لا تتداخل. |
| `trainingPreferences` | `experience?`, `consistency?`, `environment?`, `daysPerWeek?`, `sessionDurationMin?`, `splitMode?`, `advancedSplit?` | `consistency` لغير المبتدئ فقط؛ `advancedSplit` عند `splitMode=advanced` فقط. |
| `activityProfile` | `neat?`, `stepEstimate?` | تقدير الخطوات **اختياري بالكامل**. |
| `nutritionPreferences` | `style?` (meal_suggestions/macros_only/simple_guidance), `mealsPerDay?` | عدد الوجبات عند `meal_suggestions` فقط. |
| `foodPreferences` | `dietPattern?`, `dislikedFoods[]`, `allergies[]` | **اختياري — لا يحجب توليد الخطة**. |
| `limitations` | `injuries[]`, `notes?` | اختياري، بلا نصائح طبية. |
| `wellnessTracking` | `mode` (none/basic/detailed), `supplements[]`, `medications[]` | الافتراضي `none`، **القوائم تبدأ فارغة**. |
| `appPreferences` | `language: 'ar'`, `reminders: boolean` | العربية مثبّتة — لا تبديل إنجليزي. |
| `_meta` | `schemaVersion`, `completed`, `completedAt?`, `lastStep?`, `source` (onboarding/migrated) | حالة ومصدر. |

## 2. التدفّق (Core setup + optional enrichment)

الإعداد قد يُظهر **16–17 شاشة** بصريًا، لكنه منطقيًا: إعداد أساسي + إثراء اختياري.
**شاشة البناء لا تُحتسب خطوة نموذج.**

| # | الخطوة | شرط الظهور |
|---|---|---|
| 1 | الهدف (goal) | دائمًا |
| 2 | الجنس (sex) | دائمًا |
| 3 | العمر (منزلق 14–80) | دائمًا |
| 4 | الطول (منزلق 120–220) | دائمًا |
| 5 | الوزن الحالي (منزلق 30–250 + BMI رقمي) | دائمًا |
| 6 | وزن الهدف (منزلق) | **bulk/cut فقط** |
| 7 | الخبرة (training experience) | دائمًا |
| 8 | الانتظام (consistency) | **غير المبتدئ فقط** |
| 9 | بيئة التمرين (environment) | دائمًا |
| 10 | أيام التمرين (عدّاد 3–6) | دائمًا |
| 11 | مدّة الجلسة (session duration) | دائمًا |
| 12 | نمط التقسيمة (auto/advanced) | دائمًا |
| 13 | اختيار التقسيمة المتقدّمة | **split_mode=advanced فقط** |
| 14 | النشاط اليومي/NEAT + تقدير خطوات اختياري | دائمًا |
| 15 | أسلوب التغذية (style) | دائمًا |
| 16 | عدد الوجبات | **meal_suggestions فقط** |
| 17 | تفضيلات الأكل (food preferences) | دائمًا — **اختياري/يُتخطّى** |
| 18 | القيود + المكملات/الأدوية | دائمًا — **اختياري/يُتخطّى** (شاشة واحدة، مفصولة داخليًا) |
| — | شاشة البناء (0→100%) | ليست خطوة نموذج |

## 3. المنطق الشرطي (Acceptance)

- المبتدئ **لا يرى** الانتظام؛ يُخزَّن `consistency = 'new'` تلقائيًا.
- `recomp`/`strength` **لا تتطلّب** وزن هدف (يُشتق).
- `cut`: وزن الهدف **أقل** من الحالي (وإلا حظر + رسالة).
- `bulk`: وزن الهدف **أعلى** من الحالي (وإلا حظر + رسالة).
- خيارات التقسيمة المتقدّمة تظهر **فقط** عند `split_mode=advanced`.
- بيئة `home_gym`/`bodyweight` تُخزَّن صراحةً.
- `macros_only` **لا يتطلّب** عدد وجبات.
- `foodPreferences` قابلة للتخطّي ولا تحجب التوليد.
- `wellnessTracking` افتراضي `none`؛ `supplements`/`medications` تبدأ فارغة.
- **لا اسم وهمي ولا خطط مزروعة**.

## 4. التخزين والهجرة (`src/lib/onboardingProfile.ts`)

- مفتاح مُصدَّر: `qimmah:onboarding:profile:v1` (منفصل عن `qimmah:customization:v1`).
- `loadOnboardingProfile()` يدمج المحفوظ فوق الافتراضي — **لا يتعطّل على بيانات قديمة/تالفة** (try/catch → `null`).
- `migrateFromCustomization()` يبني مصدر حقيقة من تخصيص قديم محفوظ (يحفظ المستخدمين الحاليين).
- `ensureOnboardingProfile()` (يُستدعى مرّة عند إقلاع التطبيق): المفتاح الجديد → وإلا هجرة من تخصيص مكتمل → وإلا **إعداد فارغ آمن** (لا بيانات وهمية).

## 5. تسليم توليد الخطة (Handoff)

- عند الإكمال: تُبنى `OnboardingProfile` وتُحفظ، ثم `buildCustomizationFromOnboarding()` يحوّلها
  إلى `Profile` ويشغّل **المولّد الحالي** (`generatePlan`) لإنتاج: الأهداف، خطة التمرين، خطة التغذية،
  الالتزامات، القياسات، الجدول الأسبوعي.
- `toLegacyProfile()` هو جسر التحويل (sex→gender، goal→goalType، environment→gymType، neat→activityLevel، …).
- **لا تمارين/وجبات مكتوبة يدويًا** في الإعداد؛ ولا «سوق قوالب».
- الكائن جاهز للاستهلاك من Agent B (تغذية) و Agent C (تقسيمة/تمرين) عبر `loadOnboardingProfile()` / `ensureOnboardingProfile()`.

## 6. النسخ العربي
سعودي طبيعي ومهني، بلا لوم أو إشعار بالذنب، بلا حكم على الجسم أو على BMI. الأرقام والوحدات واضحة.
