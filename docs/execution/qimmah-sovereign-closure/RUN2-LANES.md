# الجولة الثانية — ملكيّة الحارات وحالتها

**فرع التكامل:** `codex/qimmah-sovereign-closure-001` · **الأساس عند الإطلاق:** `4214e98`
**قاعدة الاستئناف:** كل حارة تُودِع في فرعها بعد كل مهمّة. أي انقطاع لا يُفقد إلا العمل غير المُودَع.

## الحارات الجارية

| الحارة | الفرع | الأساس | النطاق | الملفّات المملوكة (مختصَرًا) |
|---|---|---|---|---|
| المحرّك | `s/plan-engine` | `d4bae0e` | الإصابات · المعدّات · وزن الهدف · المدّة · اليوم ٤ · دفع/سحب · المدخلات الخاملة | `planGenerator` · `planDerive` · `planRationale` · `workoutSubstitution` · `equipmentAccess` · `calculators` · `workoutCalendar` · `dataOwnership` · `workoutStats` · `workoutV2Model` · `exercises.ts` (خرائط العضلات فقط) |
| الأرقام | `s/numerals` | `fa482f6` | طيّ الأرقام · `type=number` · تفضيل نمط الأرقام · توحيد المُنسِّقات | `validation` · `numberFormat` · `appPreferences` · `SettingsView` · `NutritionView` · `CalcExplainerView` · `ExerciseLibraryView` · `StepsView` · `WorkoutMode` · `WorkoutSummary` · `customizer/**` |
| التعافي | `s/data-recovery` | `fa482f6` | تسلسل استرجاع الحالة · الإصلاح ليس تعديلًا مدفوعًا | `customization` · `customizationContext` · `safeStorage` |
| الطعام | `s/food-search` | `702bcda` | توحيد سلطة البحث · عطل الحمولة B2 · معمارية الذيل الطويل | `lib/food/**` · `QuickMealLogger` · `foodItems` |
| الإعداد | `s/entry-journey` | `fa482f6` | فقدان البيانات · الاسم · المعدّات · مفاتيح الإصابة · تماسك الأسئلة · الكشف · نيّة التجربة | `OnboardingV2` · `SetupView` · `reveal/**` · `PlanPreviewView` · `onboardingV2Flow` · `onboardingV2Adapter` · `onboardingProfile` · `profileV2Model` · `StepBody` |
| التجارة | `s/commerce-honesty` | `fa482f6` | تصنيف أسباب الفشل · دورة حياة البوّابة · رابط سلة · آلة حالة التجربة | `lib/access/**` · `PremiumGate` · `dict/access` · `LoginView` · `config/product` |
| المحتوى | `s/exercise-content` | `fa482f6` | نصائح الإنجليزية ١٨١/١٨١ · مصالحة مكتبة ٥٨٨ ميغا · تقاعد الطبقة الميتة | `exerciseGuidance` · `ExerciseDetail` · `ExerciseMedia` · بيانات الوسائط والبيانات الوصفية |
| الرئيسية | `s/today-workout` | `fa482f6` | الإحماء · حلقات الماكرو · التاريخ ثنائي الاتجاه · الخطوات · التثبيت · معنى المقاييس · وصولية | `TodayV2` · `WorkoutView` · `ProgressV2` · `ProfileV2` · `RecoveryView` · `MyStatsView` · `todayV2Model` · `measurementLog` · `MobileShell` |
| اللوحة | `s/admin-surface` | `fa482f6` | البحث الخادمي · تفصيل المستخدم · المؤشّرات · إدارة الأكواد · نظافة الهجرات | `src/admin/**` · هجرات **جديدة فقط** · `scripts/db/**` |

## عقود بين الحارات — يحسمها المنسّق عند الدمج

1. **`plannedSplitLabel(profile)`** يُصدَّر من `planGenerator` (حارة المحرّك) ويستهلكه ملخّص الإعداد (حارة الإعداد) بدل `splitFor()` المحلّي الذي يكذب في ٢ من ٤ أعداد أيام.
2. **`foldDigits`** يُصدَّر من `numberFormat` (حارة الأرقام)؛ الحارات الأخرى تحوّل `type="number"` إلى `type="text" + inputMode` وتمرّ بـ`sanitizeNumericInput`.
3. **المدّة الواحدة** من `workoutStats.ts:47-52` (حارة المحرّك)؛ الرئيسية وشاشة التمرين تستهلكانها بدل خمس تنفيذات متنازعة.
4. **نيّة التجربة الدائمة**: الإعداد يسجّلها، وطبقة الوصول (التجارة) تستأنفها بعد المصادقة. تغييرات `App.tsx` **للمنسّق وحده**.
5. **`src/App.tsx` و`package.json` محجوزان للمنسّق** — لا تلمسهما حارة.

## ما لم يُطلَق بعد

- **المدرّب الذكي** — أولوية ١٠. لا يؤخّر إغلاق P0/P1. الحكم القائم: غير موجود على أي فرع، ويستثنيه `BACKLOG.md:32`.
- **الهجوم الخصومي (الحارة J)** — يبدأ **بعد** الدمج، لا قبله: مهاجمة كود لم يهبط بلا معنى.
- **مصفوفة المتصفّح النهائية** (Chromium + WebKit، ٣٢٠/٣٩٠/٤٣٠، عربي وإنجليزي) — بعد التقارب.

## حقائق بيئة مقيسة في هذه الجولة

- **موصل Cloudflare عبر MCP يعمل ومُوثَّق** — وصل إلى الـAPI وأعاد خطأ حقيقيًّا:
  `10042 — Please enable R2 through the Cloudflare Dashboard`. أي أن **R2 غير مفعّل على الحساب**،
  فخيار استضافة شظايا الطعام عليه **يحتاج تفعيلًا من لوحة المؤسس** أوّلًا.
- **لا أدوات Pages في الموصل إطلاقًا** (D1 · KV · R2 · Hyperdrive · Workers · وثائق فقط)
  ⇒ لا نشر ولا سرد نشرات من هنا. والشبكة المحلّية تردّ 403 على `api.cloudflare.com` و000 على `*.pages.dev`.
- **مكتبة الوسائط الإنتاجية موجودة** في `~/Documents/Saudi Training/QIMMAH_Exercise_Image_Library`
  (٥٨٨ ميغا · ١٨١ صفًّا · **٩ معتمدة · ٣٦ مولَّدة بانتظار QA · ١٣٦ في الطابور**)، ومعيارها
  `PRODUCTION_STANDARD.md` مملوك نظيف الحقوق. وتغطّي بالاسم عددًا من فجوات الـ٣٧ — ومنها
  `chest-press-machine` و`incline-chest-press-machine` اللتان سُحبت صورتاهما سابقًا لسوء نسبة.
