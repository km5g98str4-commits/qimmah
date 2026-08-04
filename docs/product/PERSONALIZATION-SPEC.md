# وثيقة التخصيص — Personalization Specification v0.1 (هيكل)

**الحالة:** مسودة هيكلية — تُملأ الفجوات الموسومة ثم تُعتمد من المؤسس قبل أول سطر تنفيذ.
**المراجع:** وثيقة الرؤية (28 يوليو) · تقرير التحليل التنافسي (Onboarding & Personalization) · معيار التصميم Qimmah v3.0 · قواعد النبرة (فصحى دافئة، بلا لوم).
**الوسوم:** `[مقرر]` من البحث/الرؤية · `[كود]` يملؤه الوكيل من فحص الجذع · `[قرار مؤسس]` يحتاج اعتمادًا.

---

## 1. الغرض والنطاق
- بناء محرك تخصيص حقيقي: Onboarding تكيّفي ≤20 سؤالًا → خطة تدريب وتغذية مخصّصة → إعادة معايرة مستمرة. `[مقرر]`
- خارج النطاق في v1: الشخصية التفاعلية (Mascot)، النظام الاجتماعي، المهام اليومية. `[مقرر — Backlog]`

## 2. نموذج بيانات المستخدم (UserProfile)
### 2.1 الحقول
- **الهوية والأساسيات:** الاسم، العمر، الجنس، الطول، الوزن الحالي، الوزن المستهدف. `[مقرر]`
- **المستوى:** مبتدئ/متوسط/متقدّم + سنوات التدريب — يقود صياغة كل ما بعده. `[مقرر]`
- **اللوجستيات:** أيام التدريب/أسبوع، مدة الجلسة، المكان، المعدّات، وقت التمرين المفضّل، أيام الراحة. `[مقرر]`
- **الصحة والقيود (حسّاس):** إصابات/قيود حركية — اختياري بموافقة صريحة وخيار تخطٍّ واضح. `[مقرر]`
- **النشاط اليومي:** مستوى النشاط، متوسط الخطوات، نمط العمل، النوم (مدة/جودة). `[مقرر]`
- **التغذية:** تفضيلات/حساسية، عدد الوجبات، القدرة على الطبخ، أطعمة خليجية مفضّلة. `[مقرر]`
- **السياق المحلي:** الجدولة حول الصلوات؟ وضع رمضان؟ حساسية الحرّ؟ `[مقرر — تمايز]`
- **مشتقّات سلوكية (تُبنى لاحقًا من الاستخدام):** الالتزام، الاستبدالات المتكررة، صعوبة مُبلّغة، توقف منتصف الجلسة.
- `[كود — مُعبّأ]` مطابقة الحقول مع `onboardingProfile` الحالي على الجذع: ما الموجود، ما يُمدّد، ما يُهاجَر.
  1. **المخطّط موجود ومكتمل نسبيًا، لكنّ التعبئة شبه فارغة.** مصدر الحقيقة هو `OnboardingProfile` في `src/types/onboarding.ts` (167 سطرًا، `ONBOARDING_SCHEMA_VERSION = 2`)، ويُخزَّن تحت مفتاح `qimmah:onboarding:profile:v1` عبر `src/lib/onboardingProfile.ts` (440 سطرًا). الكائن مقسّم إلى 12 قسمًا: `profile` · `bodyMetrics` · `goal` · `trainingPreferences` · `activityProfile` · `nutritionPreferences` · `foodPreferences` · `limitations` · `wellnessTracking` · `appPreferences` · `consents` · `_meta`.
  2. **موجود في النوع وتملؤه الواجهة فعليًا (5 حقول فقط):** `goal.type` (`bulk|cut|maintain`)، `trainingPreferences.daysPerWeek`، `trainingPreferences.sessionDurationMin`، `trainingPreferences.environment`، `limitations.injuries[]` — إضافةً إلى `consents.healthData.accepted`.
  3. **موجود في النوع لكن لا سؤال له في التدفّق الحيّ (يُملأ بقيم افتراضية ثابتة):** `profile.name` · `profile.sex` · `profile.age` · `bodyMetrics.heightCm` · `bodyMetrics.currentWeightKg` · `trainingPreferences.experience` · `trainingPreferences.consistency` · `trainingPreferences.splitMode/advancedSplit` · `activityProfile.neat` · `activityProfile.stepEstimate` · `nutritionPreferences.*` · `foodPreferences.*` · `wellnessTracking.*`. المسار: `OnboardingV2` → `toAnswersFromV2` (`src/lib/onboardingV2Adapter.ts:42`) يبني فوق `defaultAnswers` (`src/lib/planBuilderAnswers.ts:60`) → `buildOnboardingProfile`. النتيجة الحرفية لكل مستخدم جديد: **العمر 25، الطول 170 سم، الوزن 75 كجم، الجنس `unspecified`، NEAT = `moderate`، الوجبات 4، `dietPattern: 'none'`**.
  4. **الأثر المحسوب (أهم فجوة):** لأن الجنس/العمر/الطول/الوزن ثابتة، فإنّ `computeTargets` (`src/lib/calculators.ts:295`) يُخرج **نفس BMR لكل مستخدمي التطبيق**. الفروق الوحيدة الفعلية بين خطّتين اليوم هي: الهدف، عدد الأيام، مدة الجلسة، بيئة التمرين، والإصابات. أي معيار قبول من نوع «ثلاثة مستخدمين → ثلاث خطط» يمرّ اليوم بحدّ أدنى شكليّ فقط.
  5. **غير موجود إطلاقًا في النوع ويحتاج تمديدًا (`[تمديد]`):** سنوات التدريب كرقم (الموجود هو `ExperienceLevel` دلالي + `ExperienceBand`) · وقت التمرين المفضّل · أيام الراحة/الأيام المفضّلة داخل الإعداد (`preferredDays` موجود في `Profile` فقط ويُمرَّر `[]` دائمًا — `onboardingProfile.ts:263`) · نمط العمل · النوم (مدة/جودة) · القدرة على الطبخ · الأطعمة الخليجية المفضّلة (الموجود هو `dislikedFoods` سلبي فقط) · الميزانية الغذائية.
  6. **السياق المحلي غير موجود بالكامل:** بحث نصّي شامل في `src/` عن `ramadan|رمضان|prayer|صلاة|صلوات` أعاد **صفر نتائج**. لا حقل ولا سؤال ولا نصّ. حساسية الحرّ كذلك غير موجودة. (`src/data/scheduleCities.ts` يخص المدن للإشعارات لا الصلوات.)
  7. **المشتقّات السلوكية غير موجودة كحقول:** لا `adherence` ولا عدّاد استبدالات ولا «توقّف منتصف الجلسة». الأقرب الموجود: `src/lib/exerciseHistory.ts` (سجلّ لكل تمرين + `streakFullReps`) و`src/lib/recovery.ts` (تقرير ذاتي: `effort` · `sleep` · `soreness` · `energy`) — وكلاهما **لا يُغذّي مولّد الخطة**.
  8. **الهجرة (`[هجرة]`) — البنية التحتية جاهزة:** `migrateFromCustomization` (`onboardingProfile.ts:371`) يبني مصدر الحقيقة من التخصيص القديم، و`ensureOnboardingProfile` (`:427`) يضمن وجوده، و`loadOnboardingProfile` (`:88`) يدمج بأمان فوق الافتراضي. هجرات القيم الملغاة موجودة: `recomp → cut` و`strength → bulk` (`migrateLegacyOnbGoal`, `:79`). أي حقل جديد اختياري لا يحتاج هجرة كاسرة؛ أي تغيير في شكل قسم قائم يستوجب رفع `ONBOARDING_SCHEMA_VERSION` من 2 إلى 3.
  9. **حقول تُهدر اليوم:** `V2Pref` (أجهزة/أوزان حرة/مزيج) يُسأل في الواجهة و**لا يُحفَظ** — موثّق صراحةً في `onboardingV2Adapter.ts:21` و`:39`. وكذلك `Profile.muscleFocus` يُثبَّت على `'balanced'` و`equipment` على `[]` و`schedulingStyle` على `'flexible'` في `toLegacyProfile` (`onboardingProfile.ts:255–263`).
- `[قرار مؤسس]` هل نجمع "الميزانية الغذائية" في v1 أم نؤجلها؟

### 2.2 التخزين والخصوصية
- محلي أولًا عبر safeStorage؛ المزامنة السحابية اختيارية عند تسجيل الدخول (سياسة "محلي افتراضيًا"). `[مقرر]`
- بيانات الصحة الحسّاسة: لا تُزامَن إلا بموافقة منفصلة صريحة. `[قرار مؤسس — الصياغة]`
- `[كود — مُعبّأ]` مخطط Supabase الحالي + RLS: ما يلزم من جداول/أعمدة جديدة.
  1. **مصدر الحقيقة ليس `SUPABASE-SCHEMA.sql`.** ذلك الملف (354 سطرًا) موسوم في أول 12 سطر بـ `⚠ SUPERSEDED — do not apply this file to new projects` ويُحتفظ به للتوثيق التاريخي فقط. المخطّط الفعلي في `supabase/migrations/` — سبعة ملفات مؤرّخة (`20260713120001` … `20260713120007`).
  2. **13 جدولًا قائمًا:** `profiles` · `workout_sessions` · `exercise_history` · `measurement_logs` · `daily_logs` · `nutrition_logs` · `water_logs` · `supplement_logs` · `medication_logs` · `step_logs` · `achievements` · `custom_plans` · `todos`.
  3. **`profiles` مخطّط مرن أصلًا:** أعمدته `id` · `user_id` (FK إلى `auth.users` بـ `on delete cascade`) · `display_name` · **`data jsonb not null default '{}'`** · `created_at` · `updated_at` · `unique(user_id)`. أي حقل تخصيص جديد **لا يحتاج عمودًا جديدًا** — يُكتب داخل `data.onboarding`.
  4. **RLS مكتمل ومُحكم:** `20260713120005_rls_enable_and_policies.sql` يفرض على **كل** الجداول الثلاثة عشر أربع سياسات `select/insert/update/delete` بشرط `(select auth.uid()) = user_id`، مقيّدة `to authenticated` (فلا سياسة أصلًا لدور `anon`). الحلقة تُسقط كل سياسة قائمة قبل إعادة الإنشاء، فهي idempotent ومقاومة للانحراف. `delete_own_account()` (ملف `…0007`) بـ `SECURITY DEFINER` و`set search_path = ''`.
  5. **ما يُكتب اليوم من الإعداد:** `persistOnboardingToProfile` (`src/lib/onboardingSync.ts:57`) يكتب **لقطة مصغّرة فقط** في `profiles.data.onboarding`: `heightCm` · `currentWeightKg` · `targetWeightKg` · `goalType` · `onboardingCompleted` · `updatedAt` (الدالة `essentialsFrom`, `:24`). أي أنّ الإصابات والموافقة الصحية والتفضيلات **لا تصل السحابة** عبر هذا المسار — وهذا يتوافق صدفةً مع سياسة «الحسّاس لا يُزامَن».
  6. **المسار الثاني يخالف ذلك:** `saveOnboardingProfile` (`onboardingProfile.ts:128`) ينفّذ `enqueueSyncOperation('profiles', 'profile', { data: { onboarding: value } })` — أي **الكائن الكامل** بما فيه `limitations.injuries` و`consents`. هذا المسار خامد اليوم لأن المزامنة خلف علم بيئي مطفأ افتراضيًا: `VITE_SYNC_ENABLED === 'true'` (`src/lib/syncQueue.ts:7`, `isSyncEnabled` `:61`). **قبل تفعيل العلم يجب حسم تعارض هذين المسارين** وإلا سُرِّبت البيانات الحسّاسة ضمن المزامنة العامة.
  7. **ما يلزم إضافته:** لا جداول جديدة ولا أعمدة جديدة لتخزين حقول التخصيص (`jsonb` يكفي). ما يلزم فعلًا: (أ) **جدول `checkins`** إن اعتُمد Check-in الأسبوعي في §5 (لا وجود له اليوم بأي اسم)، (ب) **مفتاح موافقة منفصل** داخل `profiles.data` لبيانات الصحة (النوع الحالي `OnbConsents` يحمل موافقة واحدة `healthData` فقط)، (ج) إضافة `'checkins'` إلى `SyncTable` و`SYNC_TABLES` في `syncQueue.ts:12,28` إن أُريد مزامنته.
  8. **ملاحظة تشغيلية:** الجداول الأربعة الجديدة (`step_logs` · `achievements` · `custom_plans` · `todos`) موصولة بالعميل عبر `src/lib/syncStores.ts` (173 سطرًا) لكن المزامنة ككل لم تُفعَّل بعد على الإنتاج.

## 3. محرك الأسئلة المتفرّعة (Adaptive Question Engine)
### 3.1 البنية
- رسم بياني للأسئلة (Question Graph): كل سؤال = { id، شرط الظهور، صياغات حسب المستوى (ar/en)، نوع الإجابة، أثره على الخطة }. `[مقرر]`
- **قاعدة ذهبية:** كل سؤال يغيّر شيئًا في المخرجات؛ ما لا يغيّر يُحذف أو يؤجَّل داخل التطبيق. `[مقرر — من البحث]`
- السقف ≤20، والمسار الفعلي للمبتدئ أقصر (12–15). `[مقرر]`
- شريط تقدّم + رسائل تأكيد قصيرة بين الكتل. `[مقرر — من البحث]`

### 3.2 منطق التفريع (أمثلة ملزمة)
- سؤال الهدف: المبتدئ يرى (خسارة دهون/بناء عضل/لياقة/صحة عامة)؛ المتقدّم يرى (Cut/Lean Bulk/Maintenance/Recomposition/Strength/Hypertrophy). `[مقرر]`
- لا مصطلحات RIR/RPE/Deload في مسار المبتدئ. `[مقرر]`
- سؤال رمضان/الصلاة يظهر للجميع (بصياغة محايدة وقابل للتخطي). `[قرار مؤسس — التوقيت: دائمًا أم موسميًا؟]`
- `[كود — مُعبّأ]` جرد أسئلة الـOnboarding الحالية على الجذع ومصيرها (تبقى/تُعاد صياغتها/تُحذف).
  1. **التدفّق الحيّ = `OnboardingV2` وحده.** `src/views/SetupView.tsx:53–59` يوجّه كل وضع غير `advanced` إلى `OnboardingV2` بلا أي بوابة معاينة (تعليق «preview-gated» في رأس `OnboardingV2.tsx:78` **قديم ولا يطابق الواقع**). ثلاث خطوات + شاشة «جاهز»: `0 goal · 1 training · 2 equipment · 3 ready` (`OnboardingV2.tsx:85`).
  2. **الجرد الكامل — ستة أسئلة فعلية فقط + إقرار واحد:**

     | # | السؤال (النص الحرفي) | الخطوة | القيم | الحقل المخزَّن | الأثر الفعلي في المخرجات | المصير المقترح |
     |---|---|---|---|---|---|---|
     | 1 | «ما هدفك الآن؟» | 0 | `cut` · `maintain` · `bulk` | `goal.type` | السعرات (±400/±300)، نظام التكرار/الراحة (`SCHEMES`)، الالتزامات، وزن الهدف المشتق | **تبقى** — تُعاد صياغتها لتتفرّع حسب المستوى (§3.2) |
     | 2 | إقرار البيانات الصحية (checkbox) | 0 | نعم/لا (إلزامي للمتابعة) | `consents.healthData.accepted` | لا أثر في الخطة — بوابة قانونية | **تبقى** — لكن تُنقل بعد سؤال المستوى لأن إلزامها في الشاشة الأولى يرفع الاحتكاك |
     | 3 | «كم يوم تتمرن بالأسبوع؟» | 1 | 3 · 4 · 5 · 6 (`DAYS`) | `trainingPreferences.daysPerWeek` | التقسيمة (`splitDays`)، توزيع الأسبوع، معامل النشاط (أيام×0.025) | **تبقى** كما هي |
     | 4 | «مدة التمرين المناسبة لك؟» | 1 | 30 · 45 · 60 · 75 (`DURATIONS`) | `trainingPreferences.sessionDurationMin` | عدد تمارين الجلسة (`targetExerciseCount`, ‎−2…+2) | **تبقى** كما هي |
     | 5 | «مكان التمرين» | 2 | نادي · منزل · أجهزة فقط | `trainingPreferences.environment` | فلتر الأدوات (`makeEquipmentGate`) واختيار الحوض | **تبقى** — تُعاد صياغتها لفصل «النادي» عن «الأدوات المتاحة» |
     | 6 | «ماذا تفضّل؟» (أجهزة/أوزان حرة/مزيج) | 2 | `machines` · `free` · `mixed` | **لا شيء — يُهمَل** | **صفر** (موثّق في `onboardingV2Adapter.ts:21,39`) | **يخالف القاعدة الذهبية اليوم** → إمّا تُوصَل بمرشّح فعلي أو تُحذف |
     | 7 | «عندك إصابة أو تمرين ممنوع؟» + 6 مناطق | 2 | `knee` `shoulder` `lower_back` `wrist` `elbow` `ankle` | `limitations.injuries[]` | استبعاد تمارين عبر `detectInjuries` + `INJURY_RISKY_IDS` (`planGenerator.ts:188,204`) + تحذير | **تبقى** كما هي |

  3. **الحقل الحرّ الوحيد المفقود مقابل الوعد:** لا سؤال عن الاسم، العمر، الجنس، الطول، الوزن، الخبرة، الانتظام، التغذية، النشاط اليومي، أو التقسيمة. النصوص من `V2_ONBOARDING` في `src/design-system/v2/labels.ts` (251 سطرًا، ar+en).
  4. **`src/i18n/dict/onboarding.ts` (1303 سطرًا) لا يخدم التدفّق الحيّ.** مستهلكوه الوحيدون هم `src/sections/CustomizationCenter.tsx` و20 ملفًا في `src/components/customizer/steps/` — أي المسار **المتقدّم** (`mode === 'advanced'`) الذي يُفتح من الإعدادات بعد اكتمال الإعداد (`src/App.tsx:361`). هناك فقط يستطيع المستخدم إدخال الجنس/الطول/الوزن/العمر (`StepBody.tsx:105–144`).
  5. **حكم على القاعدة الذهبية:** من 7 عناصر، **6 لها أثر و1 بلا أثر** (تفضيل المعدّات). لكنّ المشكلة العكسية أكبر: **الأثر الأقوى في الخطة (الجسم والجنس والخبرة) لا سؤال له إطلاقًا** ويُملأ بثوابت. البناء الجديد يبدأ من سدّ هذه الفجوة لا من تقليم الأسئلة.
  6. **مادّة جاهزة لإعادة الاستخدام:** `src/data/planBuilder.ts` (277 سطرًا) يحتوي مسبقًا مجموعات خيارات معرَّفة وغير مستخدمة في التدفّق الحيّ: `experienceChoices` · `consistencyChoicesV2` · `gymTypeChoices` · `environmentChoices` · `splitModeChoices` · `advancedSplitChoices` · `neatChoices` · `nutritionStyleChoices` · `mealDistributionChoices` · `appetiteTimingChoices` · `dietPatternChoices` · `allergyChoices` · `injuryChoices` · `wellnessModeChoices` · `sessionDurationChoices` — إضافةً إلى `recommendedDaysFor(level)` (`:267`). أي محرّك أسئلة جديد يبني فوق هذه القوائم لا من الصفر.
  7. **لا محرّك تفريع موجود.** الحالي آلة حالة خطّية في `src/lib/onboardingV2Flow.ts` (150 سطرًا): `validateStep` · `canAdvance` · `finalizeReduce` + مسوّدة قابلة للاستئناف مملوكة للحساب (`saveDraftV2`/`loadDraftV2`, `DRAFT_VERSION = 3`). لا Question Graph ولا شروط ظهور ولا صياغات حسب المستوى.

### 3.3 تسلسل الكتل (من البلوبرنت)
شاشة القيمة → النية → المستوى → الأساسيات → اللوجستيات → التغذية → السياق المحلي → الحسّاس (اختياري) → "نبني خطتك" → **معاينة الخطة** → إنشاء الحساب ("احفظ خطتك") → Paywall لاحقًا. `[مقرر]`
- هدف زمني: أول خطة < 3 دقائق. `[مقرر]`

## 4. توليد الخطط
### 4.1 التدريب
- اختيار التقسيمة من: الأيام × المدة × المعدّات × المستوى × الهدف (لا قوالب موحّدة للمتشابهين ظاهريًا). `[مقرر]`
- اختيار التمرين بمعايير: العضلة المستهدفة، نمط الحركة، المهارة، المعدّات، الإصابات، الحجم الأسبوعي، التكرار لكل عضلة، Progressive Overload، التفضيلات، الأداء السابق. `[مقرر]`
- المركّب قبل العزل؛ المبتدئ يميل للأجهزة؛ Warm-up/Working sets. `[مقرر — كإرشاد لا قاعدة جامدة]`
- `[كود — مُعبّأ]` تشريح `planGenerator` الحالي (~861 سطرًا): ما يُحتفظ به، ما يُعاد بناؤه، وفجوة المعايير أعلاه.
  0. **تصحيح رقمي:** `src/lib/planGenerator.ts` = **1112 سطرًا** لا ~861. (الاشتقاقات الخفيفة نُقلت إلى `src/lib/planDerive.ts` — 30 سطرًا — وتُعاد تصديرها من السطر 49.)
  1. **البنية الفعلية — سبع طبقات:** (أ) محرّك التقسيمة `expTier` → `splitDays`/`advancedSplitDays` → `DaySpec[]`؛ (ب) حوض التمارين المصفّى؛ (ج) نظام الفتحات `SLOTS: Record<DayType, Slot[]>` (`:266`) بسبعة أنواع أيام `full|upper|lower|push|pull|arms|core`؛ (د) اختيار التمرين `pickForSlot`/`buildDayExercises`؛ (هـ) الحمل `setsFor` + `SCHEMES: Record<GoalType, RepScheme>` (`:137`)؛ (و) الجدول الأسبوعي `buildScheduleFromSpecs`/`TRAIN_PATTERN`؛ (ز) التغذية `generateNutrition` + الالتزامات + القياسات.
  2. **ما يُحتفظ به (سليم وقابل للبناء عليه):**
     - `SLOTS` + `TYPE_MUSCLES` — نموذج فتحات صريح بالعضلة والدور (`compound|isolation|any`) وأنماط الحركة. هذا هو العمود الفقري لأي محرّك أفضل.
     - خوارزمية التنويع `buildMuscleRankMap` + `partitionOrder` (`:413`, `:432`) — توزيع round-robin داخل العضلة يمنع تكرار «علوي أ» و«علوي ب». حلّ مدروس وموثّق، لا يُعاد بناؤه.
     - `makeEquipmentGate`/`resolveGymAccess` في `src/lib/equipmentAccess.ts` (46 سطرًا) — مصدر واحد يشاركه محرّك الاستبدال. يُحتفظ به كما هو.
     - تصفية الإصابات `detectInjuries` + `INJURY_RISKY_IDS` + `makeInjuryFilter` (`:188–249`).
     - `SCHEMES` و`setsFor` و`targetExerciseCount` — منطق حمل واضح ومُعلَّل.
     - `applyDeload` (`:1045`) للرجوع بعد انقطاع، و`levelOk`/`cableOk`/`prefersMachines` (تفضيل الأجهزة للمبتدئ = المعيار مُطبَّق فعلًا).
  3. **ما يُعاد بناؤه:**
     - **`toLegacyProfile` هو عنق الزجاجة الحقيقي، لا المولّد.** المولّد يقرأ `Profile` فقط، و`toLegacyProfile` (`onboardingProfile.ts:196`) يُثبّت `muscleFocus: 'balanced'` و`equipment: []` و`schedulingStyle: 'flexible'` و`preferredDays: []` و`nutritionStyle: 'high_protein'` مهما كانت إجابات المستخدم. أي تخصيص جديد يجب أن يمرّ من هنا وإلا لا يصل المولّد.
     - **`splitDays`** يختار التقسيمة من **الأيام + التركيز العضلي فقط** (`:559`) — لا يدخل الهدف ولا الخبرة ولا المدة ولا المعدّات في القرار. هذا يخالف مباشرةً معيار السطر 50 («الأيام × المدة × المعدّات × المستوى × الهدف»).
     - **حوض «الأجهزة فقط»**: في النادي (`full` أو `small`) الحوض يُقصَر حصريًا على `primaryMachineIdSet` = **31 معرّفًا** من `src/data/machineCatalog.ts:213` — أي لا بار ولا دمبل ولا كيبل إطلاقًا لمستخدم النادي (`planGenerator.ts:701–708`). مكتبة `src/data/exercises.ts` تحوي **181 تمرينًا**، فالمستخدَم فعليًا في النادي **17%** منها.
     - **`ACCESSORY_POOL`** (`:355`) ثلاث فئات فقط (ترايسبس/بايسبس/بطن) بإضافة واحدة في نهاية اليوم.
  4. **فجوة المعايير مقابل السطر 51 — عشرة معايير، خمسة مطبَّقة:**

     | المعيار | الحالة | الدليل |
     |---|---|---|
     | العضلة المستهدفة | ✅ مطبَّق | `Slot.muscles` + `ex.primaryMuscle` |
     | نمط الحركة | ✅ مطبَّق | `Slot.patterns` + `COMPOUND_PATTERNS` (`:110`) |
     | المهارة/المستوى | ✅ مطبَّق | `levelOk` (`:154`) + `expTier` (`:58`) |
     | المعدّات | ✅ مطبَّق | `makeEquipFilter` → `equipmentAccess.ts` |
     | الإصابات | ✅ مطبَّق | `detectInjuries` + `INJURY_RISKY_IDS` |
     | الحجم الأسبوعي | ⚠️ جزئي | المجموعات ثابتة حسب الدرجة (`setsFor`) — **لا حساب لمجموع مجموعات كل عضلة في الأسبوع** ولا حدّ أدنى/أقصى |
     | التكرار لكل عضلة | ⚠️ تحذير فقط | لا فرض؛ فقط تحذير نصّي إن دُرِّبت الأرجل أقل من مرّتين (`:1088–1093`) |
     | Progressive Overload | ❌ غير موجود | لا ذكر له في المولّد. الموجود `progressionHint` في `src/lib/exerciseHistory.ts:131` — **دالة مُصدَّرة لا يستدعيها أي ملف** (كود ميت) |
     | التفضيلات | ❌ غير موجود | `V2Pref` مُهمَل، و`muscleFocus` مثبَّت على `'balanced'` |
     | الأداء السابق | ❌ غير موجود | بحث `history|lastPerformance|previousWeight` في `planGenerator.ts` = صفر نتائج. `startingWeight: ''` دائمًا (`:676`) |

  5. **Warm-up/Working sets:** غير موجود — لا تمييز بين مجموعة إحماء ومجموعة عمل في `PlanExercise`.
  6. **«المركّب قبل العزل»:** مضمون ضمنًا بترتيب `SLOTS` (الفتحات المركّبة أولًا) لا بقاعدة صريحة قابلة للتخصيص.
  7. **الخلاصة:** المولّد **يُوسَّع لا يُستبدل**. العمل الحقيقي: (أ) توسيع `Profile`/`toLegacyProfile` لتمرير الإجابات الجديدة، (ب) إدخال الهدف/المدة/المعدّات في `splitDays`، (ج) طبقة حجم أسبوعي لكل عضلة، (د) وصل `exerciseHistory` بالمولّد للتقدّم التدريجي.
- `[قرار مؤسس]` مصدر بيانات التمارين الموسّعة (المكتبة الحالية أم مصدر خارجي مرخّص).

### 4.2 التغذية
- BMR (معادلة معلنة) → TDEE → سعرات الهدف → ماكروز — كلها تُعرض في صفحة "كيف يحسب قِمّة أرقامك؟" بحدود الدقة. `[مقرر]`
- لغة متحفّظة: "تقديري"، نطاقات لا وعود. `[مقرر]`
- `[كود — مُعبّأ]` مطابقة مع `calculators` الحالي وصفحة الحسابات في الموقع.
  1. **`src/lib/calculators.ts` (421 سطرًا) يغطّي السلسلة كاملة ومصادرها موثّقة داخل الكود.** `computeTargets` (`:295`) يُخرج 16 حقلًا في `Targets` (`src/types/profile.ts:100`).
  2. **BMR:** Mifflin-St Jeor مع استشهاد صريح: `doi:10.1093/ajcn/51.2.241, PMID 2305711` (`:182`). `bmrFor` (`:184`)، و«غير محدّد» الجنس = متوسط تقريبي مع تنويه نصّي في `notes` (`:367`).
  3. **TDEE — انحراف مقصود وموسوم:** ليست الجداول القياسية 1.2–1.9. المعادلة `NEAT + (أيام التمرين × 0.025)` بسقف `1.9` (`totalActivityMultiplier`, `:109`)، وNEAT = 1.20/1.35/1.45. الكود يصنّف نفسه بوضوح: `NON-STANDARD Qimmah heuristic; no primary source was found` (`:15–16`). **صادق، لكن الوثيقة تَعِد «معادلة معلنة» — يلزم قرار: نُبقيها ونعلنها كاجتهاد، أم نعود لمعامل قياسي.**
  4. **السعرات:** `CUT_DEFICIT = 400` و`BULK_SURPLUS = 300` — كلاهما موسوم `NON-STANDARD fixed Qimmah policy; individual response is not encoded` (`:41,44`). أرضية أمان `calorieFloor` + تنبيه `LOW_CALORIE_NOTE` عند نزول الخام تحت العتبة (`:243,314`).
  5. **الماكروز:** بروتين `1.8 غ/كجم` باستشهاد Morton 2018 (`doi:10.1136/bjsports-2017-097608`)؛ دهون `27%` من السعرات ضمن AMDR 20–35% (National Academies DRI)؛ الكارب = الباقي (`:320–322`).
  6. **الماء:** `0.035 لتر/كجم` مقيَّدًا في `[2.5, 4.0]` لتر، مع تعليق مرجعي مفصّل (EFSA 2010 / IOM 2004) وإقرار بأن قاعدة 35 مل/كجم غير قياسية (`:51–66`).
  7. **حراسات موجودة:** `isMinorAge` (<18) → `effectiveGoalTypeForAge` يفرض `maintenance` ويُلغي توقّع الوزن (`:336`)؛ `MINOR_BMI_LABEL` يمنع تصنيف BMI للبالغين على القاصرين؛ `BMI_NOTE` صريح أن BMI لا يفرّق العضلات عن الدهون.
  8. **صفحة الحسابات موجودة فعلًا:** `src/views/CalcExplainerView.tsx` (274 سطرًا) بعنوان «كيف نحسب أرقامك؟»، نصوصها في `src/i18n/dict/calcScreen.ts` (184 سطرًا، ar+en). تعرض خمس بطاقات: BMR (بالمعادلة الحرفية `BMR = 10×w + 6.25×h − 5×age ± s`) · TDEE (بجدول المعاملات وتمييز اختيار المستخدم) · السعرات · البروتين · الماكروز · BMI. مكوّن ثانٍ مختصر: `src/components/nutrition/CalorieExplainer.tsx` (153 سطرًا).
  9. **الفجوات مقابل §4.2:** (أ) **لا نطاقات** — كل الأرقام مفردة (`targetCalories` رقم واحد)؛ الوثيقة تطلب «نطاقات لا وعود». (ب) `estimatedWeeksToGoal` يعرض **مدّة قاطعة** مشتقّة من قاعدة 7700 سعرة/كجم الثابتة (Wishnofsky 1958، موسومة تاريخيًا) — أقرب لوعد منها لتقدير. (ج) `bmrFor` يعتمد الوزن الكلي فقط؛ لا Katch-McArdle ولا نسبة دهون. (د) `CALC_FORMULA_VERSION = 'p25-water-cap4-minor-bmi'` مُضمَّن في `profileHash` (`:406`) — أي تعديل في المعادلات يجب أن يرفع هذا الوسم وإلا لن تُعاد الحسابات للمستخدمين الحاليين.
  10. **`defaultProfile` (`:376`) ليس محايدًا:** ذكر، 24 سنة، 178 سم، 86 كجم، هدف `cutting`. وهو الأساس الذي يُدمَج فوقه أي حقل ناقص من الإعداد.

## 5. إعادة المعايرة المستمرة
- **Check-in أسبوعي** (نموذج MacroFactor): طاقة/جوع/نوم/إكمال/صعوبة/آلام → اقتراح تعديل **يُقبل أو يُعدَّل أو يُرفض** مع شرح السبب. `[مقرر]`
- **إشارات سلبية سلوكية** (نموذج Fitbod): تخطي متكرر، استبدال متكرر، RPE مرتفع → اقتراح إعادة معايرة لا تغيير صامت. `[مقرر]`
- طبقة تنعيم: لا مبالغة في التصحيح من أسبوع واحد. `[مقرر]`
- `[قرار مؤسس]` حدود التعديل الآلي بلا سؤال (إن وُجدت) مقابل "اقترح دائمًا".

## 6. التكامل مع الموجود
- `[كود — مُعبّأ]` خريطة الملفات المتأثرة على الجذع: onboarding views، planGenerator، calculators، i18n/dict، syncService.
  1. **شاشات الإعداد ومنطقه (المسار الحيّ):**
     - `src/views/OnboardingV2.tsx` — **578 سطرًا** — الشاشة الوحيدة الحيّة؛ 3 خطوات + `ReadyScreen`/`BuildingScreen`/`ErrorScreen`. **إعادة بناء شبه كاملة.**
     - `src/lib/onboardingV2Flow.ts` — **150 سطرًا** — آلة الحالة والمسوّدة. **يُستبدل بمحرّك رسم بياني.**
     - `src/lib/onboardingV2Adapter.ts` — **63 سطرًا** — الجسر إلى `Answers`. **يُحذف أو يُدمج** بعد توسيع الأسئلة.
     - `src/lib/planBuilderAnswers.ts` — **140 سطرًا** — `Answers` + `defaultAnswers` + `buildOnboardingProfile`. **يُوسَّع.**
     - `src/views/SetupView.tsx` — **63 سطرًا** — التوجيه + حاجز الأخطاء. **تعديل طفيف.**
     - `src/lib/onboarding.ts` — **154 سطرًا** — بوابة الإكمال/المالك/المسوّدة. **يبقى.**
     - `src/lib/onboardingProfile.ts` — **440 سطرًا** — التخزين والهجرة و`toLegacyProfile`. **أكبر ملف يتأثّر منطقيًا.**
     - `src/types/onboarding.ts` — **167 سطرًا** — يُمدَّد + رفع `ONBOARDING_SCHEMA_VERSION` إلى 3.
     - `src/data/planBuilder.ts` — **277 سطرًا** — بنك الخيارات الجاهز. **يُعاد استخدامه، يُوسَّع.**
     - `src/design-system/v2/labels.ts` — **251 سطرًا** — `V2_ONBOARDING` + `V2_GOAL_MODEL`. **يُوسَّع بنصوص كل سؤال جديد (ar/en).**
  2. **المسار المتقدّم (يتأثّر تبعًا):** `src/sections/CustomizationCenter.tsx` (**336 سطرًا**) + **20 ملفًا** في `src/components/customizer/steps/` (أبرزها `StepBody.tsx` 9.6 كب، `StepNutrition.tsx` 14.7 كب، `StepWellness.tsx` 11.2 كب، `StepWorkoutTemplate.tsx` 11.0 كب، `StepGeneratePlan.tsx` 10.4 كب) + `src/components/customizer/` (5 ملفات مساعدة). **قرار مطلوب: هل يبقى مسارين للإدخال أم يُوحَّدان؟**
  3. **مولّد الخطة:** `src/lib/planGenerator.ts` (**1112 سطرًا**) · `src/lib/planDerive.ts` (30) · `src/lib/equipmentAccess.ts` (46) · `src/lib/workoutPlan.ts` · `src/lib/nutritionPlan.ts` · `src/lib/commitmentPlan.ts` · `src/lib/dietFilter.ts`. البيانات: `src/data/exercises.ts` (593 سطرًا / 181 تمرينًا) · `src/data/machineCatalog.ts` (235 سطرًا / 31 معرّفًا أساسيًا) · `src/data/mealTemplates.ts` (42 سطرًا / 26 قالبًا) · `src/data/workoutTemplates.ts`.
  4. **الحسابات:** `src/lib/calculators.ts` (**421 سطرًا**) · `src/views/CalcExplainerView.tsx` (274) · `src/components/nutrition/CalorieExplainer.tsx` (153) · `src/i18n/dict/calcScreen.ts` (184) · `src/i18n/dict/calorieExplainer.ts` (81).
  5. **i18n:** `src/i18n/dict/` = **16 ملفًا / 3317 سطرًا** إجمالًا. الأكبر `onboarding.ts` (**1303 سطرًا**، ar+en، ~1158 مفتاحًا) ويخدم المسار المتقدّم فقط. نصوص التدفّق الحيّ خارج `i18n/` في `design-system/v2/labels.ts` — **ازدواجية يجب حسمها قبل إضافة أي سؤال.**
  6. **المزامنة:** `src/lib/syncService.ts` (**558 سطرًا**) · `src/lib/syncQueue.ts` (227) · `src/lib/syncStores.ts` (173) · `src/lib/onboardingSync.ts` (93). المخطّط: `supabase/migrations/` (7 ملفات) + `SUPABASE-SCHEMA.sql` (354 سطرًا، **مهجور/تاريخي**).
  7. **إجمالي السطح المباشر:** ≈ **7986 سطرًا** عبر 25 ملفًا أساسيًا (بلا ملفات الـ20 خطوة في `customizer/steps/`).
- `[كود — مُعبّأ]` ما يتقاطع مع PRs المفتوحة (#4 خطوات، #7 خريطة عضلات، #9 أطعمة سعودية).
  1. **حقيقة أساسية تعيد تأطير الثلاثة:** `main` (عند `b0a7e3f`) هو **سلف مباشر** لـ`design/v21-promotion` — الجذع يسبقه بـ**453 commit** والـ`main` يسبق الجذع بـ**صفر**. وكذلك `integration/phase2.5` (سلف، الجذع يسبقه بـ424). أي أنّ «الفرق مقابل `main`» في PR #7 و#9 هو **قِدَم القاعدة** لا محتوى جديد.
  2. **PR #9 — `claude/p10-integrate-qa-deploy-kr4q6x` (130 طبقًا سعوديًا): محفوظ فعليًا على الجذع، لا تقاطع ولا مخاطرة.**
     - رأس الفرع `aa9d665` هو **سلف مباشر** للجذع؛ الجذع يسبقه بـ195 commit والفرع يسبق الجذع بـ**صفر**. أي أنّ كل محتواه **مدموج أصلًا**.
     - الأصل الاستراتيجي موجود ومقيس: `src/data/saudiFoods.ts` على الجذع = **1940 سطرًا / 130 عنصرًا** بالمعرّفات `sfct-1` … `sfct-130`، جميعها `category: 'أطباق سعودية تقليدية'` و`servingGrams: 100`. أُدخلت بالـcommit ‏`65b639c` وهو سلف للجذع.
     - **الجذع أحدث من الـPR لا أقدم:** الفرق الوحيد بين النسختين أربعة أسطر `nameEn` صُقلت على الجذع بعد الـPR (`sfct-1` → `Qursan (Riyadh)`، `sfct-60` → `Matazeez (Qassim)`، `sfct-94` → `Mutton Kabsa`، `sfct-96` → `Chicken Kabsa (Al-Bahah)`).
     - مكتبة الأطعمة على الجذع = **641 عنصرًا**: 411 داخل `src/data/foodItems.ts` (5704 سطرًا) + 130 من `saudiFoods.ts` + 40 من `gccStaples.ts` + 60 من `foodR2EatingOut.ts` (ملف موجود على الجذع وغير موجود على الـPR). للمقارنة: `main` يحوي 165 عنصرًا فقط بلا `saudiFoods.ts`.
     - **الأثر على وثيقة التخصيص:** الأصل مضمون بأي قرار لأنه **داخل الجذع نفسه**. الحقل الغائب هو الطرف الآخر: لا حقل «أطعمة خليجية مفضّلة» في `OnbFoodPreferences` (الموجود `dislikedFoods` سلبي فقط)، فالـ641 عنصرًا غير موصولة بأي تفضيل إيجابي في التخصيص.
  3. **PR #7 — `claude/p31-muscle-lib-8w7upl` (`react-body-highlighter`): تقاطع صفري مع كل مساحات التخصيص.**
     - مقابل الجذع: **commit واحد فريد** هو `3ee9331` («P3.1: replace hand-drawn muscle map with react-body-highlighter (MIT)»)، بحجم **+384 / −547** عبر 10 ملفات.
     - ملفاته: تعديل `src/components/WeeklyMuscleMap.tsx` (215 سطرًا)، حذف `src/data/bodyAnatomy.ts` (−416)، إضافة `src/data/muscleLibraryMap.ts` (+44)، `src/proof/muscleMapProof.tsx` (+74)، `scripts/p31-muscle-proof.mjs` (+66)، `docs/product/P31.md` (+90) + صورة، و`package.json` (+1) مع `package-lock.json` (+13).
     - **`git show --name-only 3ee9331` لا يحوي أي ملف** من: onboarding · `planGenerator.ts` · `calculators.ts` · `syncService.ts` · `src/i18n/` · `src/types/`. **صفر تقاطع على المساحات الست.** (فروقه مقابل `main` في `planGenerator` و`calculators` و`types` كلّها commits موجودة على الجذع أصلًا.)
     - **الاعتمادية ليست جديدة:** `react-body-highlighter@^2.0.5` **موجودة سلفًا على الجذع** في `dependencies` بالإصدار نفسه. دلتا الاعتماديات = صفر.
     - **حالة الجذع للمقارنة (لدراسة خريطة العضلات):** المسار الحيّ هو `MuscleCoverageGrid` في `src/components/MuscleMap.tsx` (164 سطرًا) — **شبكة بطاقات لكل مجموعة عضلية** بحالات `trained/ready/recovering/fresh/undertrained`، لا صورة جسم. ويوجد `src/lib/muscleMapLib.ts` (87 سطرًا) يحمل جسر المكتبة `MUSCLE_SLUG` لكن **لا يستورده أي ملف** (كود ميت، وهو المرجع الوحيد المتبقّي للمكتبة على الجذع). خريطة `MUSCLE_TO_LIBRARY` في الـPR و`MUSCLE_SLUG` على الجذع **متطابقتان: 19 مفتاحًا بالقيم نفسها**. الفرق الجوهري: الـPR يُبقي `<Model>` تشريحيًا مرسومًا، والجذع استبقى الخريطة وألغى الجسم لصالح البطاقات. الملفات `WeeklyMuscleMap.tsx` · `muscleLibraryMap.ts` · `bodyAnatomy.ts` · `muscleMapProof.tsx` **غير موجودة على الجذع**.
     - **الأثر على وثيقة التخصيص:** لا شيء. القرار في مصيره مستقلّ تمامًا عن هذه الوثيقة ويبقى مفتوحًا لدراسة خريطة العضلات.
  4. **PR #4 — `feature/p25-steps-health`: التقاطع الوحيد الحقيقي، وموضعه `planGenerator`.**
     - «الخطوات + سيم الصحة» المذكور في عنوان الـPR **موجود أصلًا على الجذع**: قاعدة الاشتقاق `dfa19ee` («P2.5: manual steps + honest health seam») سلف للجذع، والجذع يشحن `src/lib/stepCounter.ts` (218 سطرًا) و`src/lib/healthKit.ts`.
     - الجديد فعلًا مقابل الجذع = **6 commits**: عروض التمارين وتسمية الأيام (`64702e0`)، نموذج عضلات ثلاثي الأبعاد بلا اعتماديات (`9a2a606`)، إصلاحات موجة 1 (`ffed40c`)، طبقة تخزين آمنة (`754fff4`)، تحذير الحساسية (`5ebf057`)، تحديث بطاقة الوزن الحيّ (`cb43ef4`). الحجم داخل `src/` = **43 ملفًا، +4876 / −270**.
     - **تصادم مباشر مع §4.1:** `src/lib/planGenerator.ts` معدَّل بـ**103 أسطر** — إعادة هيكلة تسمية الأيام: `DaySpec` من `{nameAr, nameEn}` إلى `{baseAr, baseEn}`، حذف `AR_ALPHA`، إضافة `arDayNum(n)` و`dayLabel(spec, dayNumber)`، وإسقاط معامل الفهرس من `fullDay()` · `ulDay()` · `pplDay()` · `advancedDaySpec()`. أي عمل على المولّد في هذه الوثيقة **سيتصادم نصيًا** مع هذا الفرع.
     - **تقاطع تافه لكن واسع الانتشار:** استبدال `localStorage.setItem(K, JSON.stringify(v))` بـ`writeJson(K, v)` من `src/lib/safeStorage.ts` (+130، غير موجود على الجذع) في 12 ملفًا — منها `onboarding.ts` و`onboardingProfile.ts` (سطران/ثلاثة) و`syncService.ts` (3 أسطر). **لا تغيير في التدفّق ولا في الأسئلة.**
     - **لا تقاطع إطلاقًا:** `src/lib/calculators.ts` غير ممسوس؛ و`git diff -- src/types/` **فارغ تمامًا** — `profile.ts` و`onboarding.ts` سليمان.
     - **عائق بنيوي:** الفرع **لا يحوي مجلد `src/i18n/` إطلاقًا** ويعتمد `src/config/strings.ts`، بينما الجذع يشحن شجرة `src/i18n/` بـ19 ملفًا (16 قاموسًا). أي دمج يستوجب ترحيل النصوص أولًا.
     - يضيف كذلك **84 عنصر طعام** بفئة `'مطاعم'` داخل `foodItems.ts` (مجموع الفرع 271 عنصرًا) — وهو مسار مختلف عن `foodR2EatingOut.ts` الموجود على الجذع (60 عنصرًا)، فاحتمال الازدواج قائم.
  5. **جدول التقاطع المختصر:**

     | مساحة الجذع | PR #4 (6 commits فريدة) | PR #7 (1 commit فريد) | PR #9 (0 commits فريدة) |
     |---|---|---|---|
     | تدفّق الإعداد | سطران — استبدال `writeJson` فقط | لا | مدموج أصلًا |
     | `planGenerator.ts` | **103 أسطر — تصادم فعلي** | لا | مدموج أصلًا |
     | `calculators.ts` | لا | لا | مدموج أصلًا |
     | `i18n/dict` | لا (**الفرع بلا `src/i18n/`**) | لا (**الفرع بلا `src/i18n/`**) | مدموج أصلًا |
     | `syncService.ts` | 3 أسطر — `writeJson` | لا | مدموج أصلًا |
     | `types/profile.ts` + `types/onboarding.ts` | **لا (الفرق فارغ)** | **لا** | مدموج أصلًا |
     | اعتماديات جديدة | لا | لا (المكتبة على الجذع بالإصدار نفسه) | لا |

## 7. معايير القبول (DoD)
- ثلاثة مستخدمين افتراضيون مختلفو المدخلات → ثلاث خطط مختلفة فعليًا (اختبار آلي). `[مقرر]`
- مبتدئ لا يرى مصطلحًا متقدمًا في كامل مساره (اختبار نصوص). `[مقرر]`
- كل سؤال موصول بأثر في الخطة (اختبار تغطية الرسم البياني). `[مقرر]`
- المسار كاملًا يعمل بلا حساب حتى شاشة الحفظ؛ وrtl/ar سليمة في كل شاشة. `[مقرر]`
- سيناريوهات فشل التخزين والشبكة مغطاة بواجهات صادقة. `[مقرر]`

## 8. قرارات مفتوحة للمؤسس (تُحسم قبل الاعتماد)
| # | القرار | الخيارات | التوصية المبدئية |
|---|--------|----------|------------------|
| 1 | الميزانية الغذائية في v1 | نعم / تأجيل | تأجيل |
| 2 | سؤال رمضان | دائم / موسمي | دائم بصياغة محايدة |
| 3 | حدود التعديل الآلي | اقترح دائمًا / آلي ضمن نطاق | اقترح دائمًا في v1 |
| 4 | مصدر مكتبة التمارين الموسّعة | الحالية / خارجي مرخّص | يُحسم بعد جرد `[كود]` |
| 5 | مزامنة بيانات الصحة الحسّاسة | موافقة منفصلة / ضمن العامة | موافقة منفصلة |
