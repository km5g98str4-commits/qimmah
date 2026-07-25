# تدقيق معماري — تطبيق قِمّة (عدسة: البنية وإعادة الهيكلة)

**التاريخ:** 2026-07-25 · **الفرع:** `feature/p25-steps-health` · **النطاق:** `src/` فقط (تجاهل `dist/` و`node_modules/`)
**الحالة الأساسية:** `npx tsc -b --noEmit` يمرّ بلا أخطاء (EXIT=0) — كل خطوة في خطة إعادة الهيكلة يجب أن تُبقي هذا أخضر.

---

## ملخّص تنفيذي (٥ أسطر)

1. **الطبقات سليمة في اتجاه واحد فقط**: لا يوجد أي وصول مباشر لـ `localStorage` من مكوّن (تحقّقت بـ grep على `src/**/*.tsx` — صفر نتائج)، لكن **المنطق الحسابي** تسرّب إلى المكوّنات في ثلاثة مواضع على الأقل، وأنتج **رقمين مختلفين لنفس القيمة** يراها المستخدم (مدة التمرين).
2. **التكرار هو المشكلة الأولى**: ٣ نسخ من `workoutStreak`، ٨ نسخ من محلّل الأرقام، ٤ من `round`، ٣ هوكات «تتبّع اليوم» متطابقة بنيويًا، ومكوّن `Chip` مكرّر حرفيًا في ملفّين.
3. **الكود الميّت كبير ومُتحقَّق منه**: ١٥ قسم Landing + `Header.tsx` + ٨ خطوات customizer + ٦ ملفات `data` + تصديرات ميتة داخل ملفات حيّة ≈ **١٧٠٠+ سطر** لا يستوردها أحد (تحقّقت بـ grep لكل اسم).
4. **خرق قاعدة CLAUDE.md رقم ١ (لا hardcoding في المكوّنات)** واسع: `PlanBuilder.tsx` وحده يحوي ~٧٣ نصًا عربيًا مضمّنًا، و`NutritionView.tsx` يحوي أرقام أهداف سحرية (2000/120/200/70)، رغم وجود `config/strings.ts` وخاصية `lang` مُمرَّرة عبر ٣٦ ملفًا.
5. **أخطر أثر عملي**: مفاتيح تخزين الخطوات (`qimmah:steps:v1` وأخواتها) **غير مُدرجة** في `QIMMAH_KEYS`، فـ«إعادة ضبط قِمّة» تترك بيانات المستخدم خلفها — نتيجة مباشرة لسجلّ مفاتيح مكرّر يدويًا.

---

## النتائج مرتّبة حسب الخطورة

### 🔴 A-01 — تقديران مختلفان لمدّة التمرين يظهران للمستخدم في نفس الجلسة

**الملف:** `src/lib/workoutStats.ts:48` و `src/views/WorkoutView.tsx:222`

**الدليل:**
```ts
// src/lib/workoutStats.ts:48 — تُستخدم في بطاقة «تمرينك اليوم»
export function estimateDurationMin(day: PlanDay | undefined): number {
  if (!day) return 0
  const sec = day.exercises.reduce((sum, pe) => sum + Math.max(1, pe.sets) * (40 + (pe.restSec || 60)), 0)
  return Math.max(5, Math.round(sec / 60))
}
```
```ts
// src/views/WorkoutView.tsx:222 — تُستخدم في قائمة أيام الخطة
function estDayMinutes(day: PlanDay): number {
  const sec = day.exercises.reduce((sum, pe) => {
    const ex = getExercise(pe.exerciseId)
    const sets = pe.sets || ex?.defaultSets || 3
    const rest = pe.restSec || ex?.defaultRestSec || 90
    return sum + sets * (rest + 40)
  }, 0)
  return Math.max(5, Math.round(sec / 60 / 5) * 5)   // تقريب لأقرب ٥ دقائق
}
```
المستهلكان: `src/sections/TodayWorkoutHero.tsx:44` (`estimateDurationMin`) و `src/views/WorkoutView.tsx:176` (`estDayMinutes`).

**الأثر:** نفس اليوم التدريبي يُعرض بـ«~٤٥ د» في الرئيسية و«~٥٠ د» في تبويب التمرين. الافتراضي الاحتياطي مختلف (60ث مقابل 90ث)، والتقريب مختلف. المستخدم يرى تناقضًا في منتج يُباع على «مصدر حقيقة واحد».

**الإصلاح:** احذف `estDayMinutes` من `WorkoutView.tsx`؛ وسّع `estimateDurationMin` لتقرأ الافتراضيات من المكتبة (`ex?.defaultSets` / `ex?.defaultRestSec`) واجعل التقريب موحّدًا، ثم استوردها في الموضعين. الثوابت (40ث لكل مجموعة، سقف الراحة الافتراضي) تنتقل إلى ثوابت مُسمّاة أعلى الملف.

**الجهد:** S

---

### 🔴 A-02 — سجلّ مفاتيح التخزين مكرّر يدويًا؛ إعادة الضبط لا تمسح بيانات الخطوات

**الملف:** `src/lib/resetQimmah.ts:3` مقابل `src/lib/stepCounter.ts:6-8`

**الدليل:**
```ts
// src/lib/stepCounter.ts:6
export const STEP_LOG_KEY = 'qimmah:steps:v1'
export const STEP_SOURCE_KEY = 'qimmah:stepSource:v1'
export const STEP_GOAL_KEY = 'qimmah:stepGoal:v1'
```
```ts
// src/lib/resetQimmah.ts:3 — قائمة نصوص حرفية، لا تستورد أي ثابت
export const QIMMAH_KEYS = [
  'qimmah:customization:v1', 'qimmah:onboarding:v1', 'qimmah:onboarding:profile:v1',
  'qimmah:today:v1', 'qimmah:nutritionToday:v1', 'qimmah:wellnessToday:v1',
  /* … 24 مفتاحًا … لا يوجد أي qimmah:steps* */
]
```
سبعة عشر ثابت مفتاح مُصدَّر عبر `src/lib/*.ts` (`PREFS_KEY`, `TODAY_KEY`, `UI_MODE_KEY`, `HISTORY_KEYS`, …) وكلها مُعاد كتابتها كنصوص في `resetQimmah.ts`.

**الأثر:** «إعادة ضبط قِمّة» تترك سجل الخطوات وهدفها ومصدرها على الجهاز. المستخدم يظنّ أنه بدأ من الصفر بينما بياناته موجودة. وكل مفتاح جديد مستقبلًا سيُنسى بنفس الطريقة.

**الإصلاح:** أنشئ `src/lib/storageKeys.ts` يجمع كل المفاتيح (أو صدّر مصفوفة `ALL_KEYS` تُبنى من الثوابت المستوردة). اجعل `resetQimmah` يستورد الثوابت بدل تكرار النصوص:
```ts
import { STEP_GOAL_KEY, STEP_LOG_KEY, STEP_SOURCE_KEY } from './stepCounter'
export const QIMMAH_KEYS = [ …, STEP_LOG_KEY, STEP_SOURCE_KEY, STEP_GOAL_KEY ]
```
أضف تعليقًا واحدًا في `storageKeys.ts`: «أي مفتاح جديد يُضاف هنا حصرًا».

**الجهد:** S

---

### 🔴 A-03 — سلسلة الرجوع لأهداف التغذية مكتوبة ٣ مرّات، وبأرقام سحرية داخل المكوّن

**الملف:** `src/views/NutritionView.tsx:48-52`, `src/sections/DailySummary.tsx:27-31`, `src/views/DashboardView.tsx:199`

**الدليل:**
```tsx
// src/views/NutritionView.tsx:48 — أرقام مضمّنة في مكوّن
const targetCalories = np.targetCalories || customization.targets.targetCalories || customization.targets.maintenanceCalories || 2000
const targetProtein  = np.targetProtein  || customization.targets.proteinGrams || 120
const targetCarbs    = np.targetCarbs    || customization.targets.carbsGrams   || 200
const targetFat      = np.targetFat      || customization.targets.fatGrams     || 70
const targetWaterMl  = Math.round((np.targetWaterLiters || customization.targets.waterLiters || 3) * 1000)
```
```tsx
// src/sections/DailySummary.tsx:27 — نفس السلسلة، بلا الرقم الأخير
const targetCalories = np.targetCalories || t.targetCalories || t.maintenanceCalories || 0
const targetProtein  = np.targetProtein  || t.proteinGrams || 0
```
```tsx
// src/views/DashboardView.tsx:199 — نسخة ثالثة مختصرة
const calories = customization.nutritionPlan.targetCalories || customization.targets.targetCalories || 0
```

**الأثر:** ثلاث شاشات تعرض ثلاثة أرقام مختلفة لنفس المستخدم عندما تكون الأهداف صفرًا (تبويب التغذية يعرض 2000 سعرة وهمية، اللوحة تعرض 0، الملخّص يعرض 0). وهذا خرق مباشر لقاعدة CLAUDE.md «ممنوع hardcoding داخل المكونات» ولقاعدة المنتج «لا بيانات وهمية».

**الإصلاح:** أضف في `src/lib/nutritionPlan.ts` دالة واحدة:
```ts
export interface ResolvedNutritionTargets { calories: number; protein: number; carbs: number; fat: number; waterMl: number }
export function resolveNutritionTargets(np: NutritionPlan, t: Targets): ResolvedNutritionTargets
```
واستدعِها من الشاشات الثلاث. أي قيمة احتياطية تبقى صفرًا (بلا 2000/120/200/70) مع حالة فارغة صريحة توجّه المستخدم للإعداد.

**الجهد:** S

---

### 🟠 A-04 — ثلاث نسخ من `workoutStreak` ونسختان من عدّاد أيام الأسبوع (اثنتان ميتتان ومتباعدتان)

**الملف:** `src/lib/streaks.ts:49` · `src/lib/workoutStats.ts:23` · `src/lib/progressStats.ts:84`

**الدليل:**
```ts
// streaks.ts:49 — الحيّة (عبر currentWeekSummary)؛ تقرأ الجلسات + لقطات DailyLog
export function workoutStreak(today = new Date()): number { const days = workoutDays() /* … */ }
// workoutStats.ts:23 — ميتة؛ تقرأ loadSessions() فقط، وتُرجع 0 مبكّرًا إن لم يتمرّن أمس
export function workoutStreak(sessions = loadSessions()): number { /* … */ }
// progressStats.ts:84 — ميتة؛ نسخة ثالثة بمنطق cursor مختلف
export function workoutStreak(): number { /* … */ }
```
تحقّق الاستيراد: `grep -rn "from '@/lib/workoutStats'"` يعطي `estimateDurationMin` فقط؛ و`ProgressView.tsx:7` يستورد من `progressStats` أربع دوال ليس منها `workoutStreak`. كذلك `weeklyCompleted` (workoutStats.ts:41) و`weeklyWorkoutCount` (streaks.ts:68) نسختان لنفس العدّاد، الأولى ميتة.

**الأثر:** ثلاثة تعريفات لمفهوم «السلسلة» في منتج محوره السلسلة. أي تعديل مستقبلي يقع على النسخة الخطأ، والاختبار على واحدة لا يغطي البقية.

**الإصلاح:** احذف `workoutStreak` و`weeklyCompleted` من `workoutStats.ts` و`workoutStreak` من `progressStats.ts`. أبقِ `streaks.ts` مصدرًا وحيدًا. ما يتبقّى من `workoutStats.ts` هو `estimateDurationMin` فقط → انقلها إلى `workoutPlan.ts` واحذف الملف (بعد إصلاح A-01).

**الجهد:** S

---

### 🟠 A-05 — ثلاثة هوكات «تتبّع اليوم» متطابقة بنيويًا، والرابع أُعيدت كتابته وحده

**الملف:** `src/lib/today.ts:62` · `src/lib/commitmentTracking.ts:42` · `src/lib/wellnessTracking.ts:42` · `src/lib/nutritionTracking.ts:149`

**الدليل:** الثلاثة الأولى نسخ حرفية تقريبًا (نفس `fresh()` / نفس `load…()` / نفس `persist` / نفس `useEffect` بـ focus+visibilitychange):
```ts
// today.ts:73 ≡ commitmentTracking.ts:52 ≡ wellnessTracking.ts:53
useEffect(() => {
  const check = () => { const today = getDayStamp(); setState((prev) => { if (prev.date === today) return prev; const fresh = freshState(); persist(fresh); return fresh }) }
  window.addEventListener('focus', check)
  document.addEventListener('visibilitychange', check)
  return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```
بينما `nutritionTracking.ts:100-180` بُني على `useSyncExternalStore` بمخزن مشترك ومزامنة `storage` بين التبويبات:
```ts
// nutritionTracking.ts:165 — الوحيد الذي يزامن بين النسخ والتبويبات
const onStorage = (e: StorageEvent) => { if (!demo && e.key === NUTRITION_TODAY_KEY) { realCache = readStorage(); notify() } }
```

**الأثر:** عدم تماثل سلوكي حقيقي: لو ظهر نفس عنصر «التزام» أو «مكمّل» في مكوّنين على نفس الصفحة، لن يتزامنا (كل `useState` نسخته الخاصة)، ولن يتزامنا بين تبويبين — بينما التغذية تتزامن. ثلاثة أماكن لإصلاح أي خلل في التصفير اليومي.

**الإصلاح:** استخرج `src/lib/dailyStore.ts` بمصنع عام:
```ts
export function createDailyStore<T extends { date: string }>(opts: {
  key: string; fresh: () => T; parse: (raw: unknown, today: string) => T | null; onPersist?: (s: T) => void
}): { use: () => [T, (m: (p: T) => T) => void] }
```
بنفس عقد `useSyncExternalStore` الموجود في `nutritionTracking`، ثم أعد بناء `today` / `commitments` / `wellness` فوقه (٣ ملفات تنكمش إلى ~٣٠ سطرًا لكل منها). التغذية تُهاجَر أخيرًا.

**الجهد:** M

---

### 🟠 A-06 — كود ميّت مُتحقَّق منه: ~١٧٠٠ سطر لا يستوردها أحد

**الملف:** `src/sections/*` (١٥ ملفًا) · `src/components/Header.tsx` · `src/components/customizer/steps/*` (٨ ملفات) · `src/data/*` (٦ ملفات) + تصديرات ميتة

**الدليل:** فحص آلي (grep لكل اسم ملف داخل `import … from`) ثم تحقّق يدوي لكل اسم:
```
sections/  Meals(69) Hero(107) Pricing(91) Audience(72) Dashboard(72) Supplements(60)
           BodyMetrics(42) FinalCta(36) WorkoutTracker(58) Customization(54) Solution(45)
           CommitmentKeys(29) Faq(49) Problem(32) Benefits(30)          = 846 سطرًا
components/Header.tsx (88)
customizer/steps/ StepLook(82) StepMeals(33) StepGoal(48) StepWorkouts(32)
                  StepMetrics(30) StepSupplements(47) StepSchedule(36) StepBasics(60) = 368 سطرًا
data/      audience.ts benefits.ts faq.ts pricing.ts problems.ts commitment.ts (يستوردها فقط ما سبق)
```
تصديرات ميتة داخل ملفات حيّة:
- `src/lib/workoutValidation.ts:21` `validateWorkoutPlan` — المستورد الوحيد للملف هو `StepWorkoutTemplate.tsx:10` وهو يستورد `analyzeWorkoutBalance` فقط.
- `src/lib/muscleCoverage.ts:205` `summarizeCoverage` — لا مستورد (المستخدَم هو `summarizeMuscleGroups`).
- `src/lib/exerciseHistory.ts:138` `recordWeight` (موسوم «توافق قديم») — لا مستورد.
- `src/components/WeeklyMuscleMap.tsx:177` `WeeklyMuscleMap` — الاستيراد الوحيد من الملف هو `FlatMuscleBody` في `BodyModel3D.tsx:3`.
- `src/lib/workoutSessions.ts:10` `WORKOUT_SESSIONS_KEY` و`src/lib/exerciseHistory.ts:10` `EXERCISE_HISTORY_KEY` و`saveSessions` — لا مستورد.

**الأثر:** كل قارئ جديد للمستودع (أو مشترٍ للقالب) يظنّ أن Landing حيّ. `npm run build` يحمل الملفات في الرسم البياني (tree-shaking يزيلها من الحزمة لكنها تبقى في typecheck و lint وفي وقت المراجعة). خطر أكبر: تعديل ملف ميّت ظنًّا أنه حيّ.

**الإصلاح:** ثلاث موجات آمنة (كل موجة = commit مستقل + `typecheck && build`):
1. حذف التصديرات الميتة داخل الملفات الحيّة (٥ تصديرات).
2. نقل ملفات Landing الخمسة عشر + بياناتها الستة إلى `src/_legacy/landing/` **أو** حذفها بعد موافقة المالك (حذف ملفات = عملية تحتاج موافقة صريحة حسب قواعدك).
3. حذف خطوات customizer الثمانية غير المستخدمة + `Header.tsx`.

**الجهد:** M (الحذف نفسه S؛ الموافقة والتحقق يستهلكان الوقت)

---

### 🟠 A-07 — منطق «إضافة ماء مخصّصة» مكرّر بالكامل بين قسمين

**الملف:** `src/sections/Today.tsx:392-441` (`CustomWater`) و `src/views/NutritionView.tsx:248-291` (`WaterPanel`)

**الدليل:**
```tsx
// Today.tsx:396           |  // NutritionView.tsx:251
const { min, max } = NUM_LIMITS.waterMl
const amount = Number(ml)
const valid = inRange(amount, min, max)
const submit = () => { if (!valid) return; onAdd(Math.round(amount)); setMl(''); /* … */ }
// … نفس <input onChange={sanitizeNumericInput(e.target.value, { max })} onKeyDown Enter …
// … نفس {ml !== '' && !valid && <p …>{NUM_MESSAGES.waterMl}</p>}
```
وكذلك أزرار `+250 / +500` وشريط التقدّم مكرّران (Today.tsx:262-269 مقابل NutritionView.tsx:270-273).

**الأثر:** أي تغيير في حدود الماء أو نصّ الخطأ أو سلوك Enter يجب تكراره مرّتين؛ وقد تباعدا فعلًا (Today فيه زر إغلاق `X` و`autoFocus`، NutritionView لا).

**الإصلاح:** استخرج `src/components/nutrition/WaterInput.tsx` بواجهة `{ waterMl, targetMl, onAdd, compact? }` واستهلكه في الموضعين. المنطق الرقمي يبقى في `lib/validation.ts` كما هو.

**الجهد:** S

---

### 🟠 A-08 — ثمانية محلّلات أرقام + أربع `round` + ثلاث `clamp` رغم وجود `lib/validation.ts`

**الملف:** `src/lib/exerciseHistory.ts:37` · `src/lib/exerciseStats.ts:7` · `src/lib/trainingInsights.ts:32` · `src/lib/progressStats.ts:9` · `src/lib/measurementLog.ts:46` · `src/components/WorkoutMode.tsx:51` · `src/components/WorkoutSummary.tsx:22` · `src/components/customizer/steps/StepBody.tsx:40`

**الدليل:** نسختان متطابقتان حرفيًا:
```ts
// src/lib/exerciseHistory.ts:37  ≡  src/lib/exerciseStats.ts:7
const numOf = (w?: string): number => { if (!w) return NaN; const m = String(w).match(/[\d.]+/); return m ? Number(m[0]) : NaN }
```
و`oneRepMax` مكرّرة حرفيًا كذلك:
```ts
// src/lib/exerciseHistory.ts:67  ≡  src/lib/exerciseStats.ts:13
function oneRepMax(weight: number, reps: number): number {
  if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) return NaN
  return Math.round(weight * (1 + reps / 30))
}
```
و`round`: `calculators.ts:96`, `nutritionPlan.ts:8`, `DailySummary.tsx:11`, `NutritionView.tsx:16`.
و`clamp`: `validation.ts:71` (المصدر الرسمي)، `planGenerator.ts:42`، `PlanBuilder.tsx:115` (`clampN`).

**الأثر:** الدلالات تتباعد بصمت — `progressStats.ts:9` يُرجع `0` للقيم غير الصالحة بينما `exerciseHistory.ts:37` يُرجع `NaN`. إذا استُبدل أحدهما بالآخر تنهار حسابات الحجم أو الأرقام القياسية بلا خطأ ظاهر.

**الإصلاح:** أنشئ `src/lib/num.ts` يصدّر `parseNumeric(v): number | null` و`round`/`round1` و`clamp` (بإعادة تصدير `clamp` من `validation.ts` تفاديًا لكسر المستوردين)، وأضف `oneRepMax` إلى `src/lib/exerciseHistory.ts` وصدّرها ليستوردها `exerciseStats.ts`. عدّل كل موضع على حدة (٨ تعديلات صغيرة مستقلة).

**الجهد:** M

---

### 🟠 A-09 — نصوص عربية مضمّنة في مكوّنات تستقبل `lang` (خرق صريح لقاعدة CLAUDE.md #1)

**الملف:** `src/components/PlanBuilder.tsx` (~٧٣ نصًا) · `src/views/DashboardView.tsx` · `src/views/WorkoutView.tsx` · `src/sections/Today.tsx` · `src/sections/CustomizationCenter.tsx` · `src/views/SettingsView.tsx`

**الدليل:**
```tsx
// src/views/DashboardView.tsx:33 — يستقبل lang ثم يتجاهله
export function DashboardView({ lang, onNavigate }: DashboardViewProps) { … }
// :102
{name ? `أهلًا يا ${name} 👋` : 'أهلًا بك 👋'}
// :164
{isSimple ? 'خيارات أكثر · وضع متقدّم' : 'عرض أبسط'}
// :272 — منطق أعمال + نصوص داخل JSX
const title = hasWorkoutToday ? `ابدأ بتمرين اليوم: ${dayName}` : 'اليوم راحة — جهّز تغذيتك'
const hint  = hasWorkoutToday ? 'خطوة وحدة تكفي اليوم. افتح التمرين وعلّم كل مجموعة وأنت تخلّصها.' : '…'
```
```tsx
// src/views/WorkoutView.tsx:30 — نفس النمط
<H2 icon="Zap">بدء سريع</H2>  … <H2 icon="CalendarDays">خطتي</H2>  … <H2 icon="Layers">قوالبي</H2>
```
```tsx
// src/components/WorkoutMode.tsx:423 — نصّ وحيد خارج نظام t.* وسط عشرات t.*
{st.completed ? t.setSaved : 'تم'}
```
```tsx
// src/views/SettingsView.tsx:81 — نصوص داخل window.alert
window.alert('تم استيراد نسختك بنجاح.')
window.alert('تعذّرت قراءة الملف. تأكّد أنّه نسخة قِمّة صحيحة.')
```

**الأثر:** (أ) خرق مباشر لقاعدة «كل نص قابل للتخصيص في `config`/`data`» — وهي قاعدة بيع للقالب. (ب) تسريب لغوي: أي محاولة تفعيل `lang='en'` تُنتج شاشات نصفها عربي. (ج) `getStrings` موجود ومستخدم في نفس الملفات، فالتناقض داخلي لا خارجي.

**الإصلاح:** موجات لكل شاشة على حدة:
1. أضف مساحات أسماء جديدة في `config/strings.ts`: `dashboard`, `workoutTab`, `todayCard`, `setup`, `planBuilder`.
2. انقل النصوص شاشةً شاشة (كل شاشة = commit)، مع الإبقاء على `getStrings(lang)` كما هو.
3. `PlanBuilder.tsx`: انقل عناوين/تلميحات الخطوات إلى `src/data/planBuilder.ts` بجانب `goalChoices` الموجودة فعلًا هناك — فالبيانات نصفها منقول أصلًا.

**الجهد:** L

---

### 🟡 A-10 — منطق أعمال داخل المكوّنات: حجم الجلسة، التصدير/الاستيراد، اختيار الخطوة التالية

**الملف:** `src/components/WorkoutSummary.tsx:31-52` · `src/views/SettingsView.tsx:45-109` · `src/sections/CustomizationCenter.tsx:107-134` · `src/views/DashboardView.tsx:265-293`

**الدليل:**
```tsx
// WorkoutSummary.tsx:31 — يعيد كتابة sessionVolume داخل useMemo
session.exercises.forEach((e) => { e.sets?.forEach((x) => { if (x.completed) { setsDone++; volume += num(x.weightKg) * num(x.actualReps || x.targetReps) } }) })
```
```ts
// src/lib/progressStats.ts:15 — الدالة الموجودة فعلًا لنفس الحساب
export function sessionVolume(s: WorkoutSession): number { /* نفس المعادلة + توافق الحقول القديمة */ }
```
```tsx
// SettingsView.tsx:53 — Blob/URL/anchor داخل مكوّن
const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
const a = document.createElement('a'); a.href = url; a.download = `qimmah-backup-…json`; a.click()
// وتكرار شبه كامل في CustomizationCenter.tsx:107 (a.download = 'qimmah-plan.json')
```

**الأثر:** `WorkoutSummary` لا يحتسب الحقول القديمة (`ex.weight × repsDone × targetSets`) التي يحتسبها `sessionVolume`، فحجم جلسة مستورَدة/قديمة يظهر صفرًا في الملخّص وصحيحًا في شاشة التقدّم. ومنطق النسخ الاحتياطي غير قابل للاختبار لأنه محبوس في JSX.

**الإصلاح:**
- `WorkoutSummary`: استورد `sessionVolume` من `progressStats` وأبقِ في المكوّن العدّ التقديمي فقط (`setsDone`, `muscles`, `mins`).
- أنشئ `src/lib/backup.ts` يصدّر `buildBackup()`, `downloadBackup()`, `parseBackup(text)` واستهلكه من `SettingsView` و`CustomizationCenter`.
- `NextActionCard`: انقل قرار «الخطوة التالية» إلى `lib/dashboardLayout.ts` (المكان الطبيعي — فيه `buildLeadOrder` أصلًا) وأعِد `{ titleKey, hintKey, route }`.

**الجهد:** M

---

### 🟡 A-11 — `WorkoutMode.tsx` يحمل حدود ورسائل تحقّق خاصة به بدل `lib/validation.ts`

**الملف:** `src/components/WorkoutMode.tsx:34-68` مقابل `src/lib/validation.ts:48-79`

**الدليل:**
```tsx
// WorkoutMode.tsx:34
const MAX_WEIGHT = 500
const MAX_REPS = 100
function weightInvalid(v: string): boolean { if (!String(v).trim()) return false; const n = parseVal(v); return Number.isNaN(n) || n < 0 || n > MAX_WEIGHT }
function repsInvalid(v: string): boolean { /* نفس الشكل بـ MAX_REPS */ }
```
```ts
// src/lib/validation.ts:48 — نفس الحدود، موجودة ومُترجَمة
export const NUM_LIMITS = { workoutWeight: { min: 0, max: 500 }, reps: { min: 0, max: 100 }, /* … */ } as const
export const NUM_MESSAGES: Record<NumLimitKey, string> = { workoutWeight: 'أدخل وزنًا بين 0 و500 كجم.', reps: 'أدخل تكرارات بين 0 و100.', /* … */ }
export function inRange(n: number, min: number, max: number): boolean
```
`Today.tsx:19` و`QuickMealLogger.tsx:6` و`StepNutrition.tsx:17` تستورد `NUM_LIMITS` بشكل صحيح — `WorkoutMode` وحده يخالف.

**الأثر:** تغيير سقف الوزن في `validation.ts` لا يؤثّر على شاشة التمرين النشط (أهم شاشة إدخال في المنتج). والرسائل تُقرأ من `t.errWeight/t.errReps` بينما `NUM_MESSAGES` تحمل نصوصًا موازية — مصدران للنصّ نفسه.

**الإصلاح:** استبدل `MAX_WEIGHT/MAX_REPS` بـ `NUM_LIMITS.workoutWeight.max` / `NUM_LIMITS.reps.max`، واستبدل `weightInvalid/repsInvalid` بـ `!inRange(...)` مع الإبقاء على قاعدة «الفارغ مسموح» في مساعد صغير واحد. احذف `parseVal` لصالح `parseNumeric` من A-08.

**الجهد:** S

---

### 🟡 A-12 — معالجان (wizard) متوازيان بنفس المسؤوليات

**الملف:** `src/components/PlanBuilder.tsx` (790 سطرًا) و `src/sections/CustomizationCenter.tsx` (318 سطرًا)، يختار بينهما `src/views/SetupView.tsx:13`

**الدليل:**
```tsx
// SetupView.tsx:11
if (mode !== 'advanced') return <PlanBuilder onComplete={…} onExit={…} />
return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
```
كلاهما يبني `steps[]`، يحسب `progress = Math.round(((idx+1)/total)*100)`، يرسم شريط تقدّم متطابق تقريبًا، يدير `next/back`، ويستدعي `setLastStep` من `lib/onboarding`:
```tsx
// PlanBuilder.tsx:549                      // CustomizationCenter.tsx:89
useEffect(() => { saveDraft(a); setLastStep(idx) }, [a, idx])   |   useEffect(() => { setLastStep(step) }, [step])
```
وداخل `PlanBuilder` وحده: `Step` interface، ١٨ `steps.push(...)` متتالية، وستة مكوّنات عرض محلية (`List/Question/OptionCard/OptionRow/Stepper/Toggle/Slider`) في نفس الملف.

**الأثر:** الملف الأضخم في المكوّنات (790 سطرًا) غير قابل للاختبار ولا للمراجعة؛ وكل تحسين في تجربة المعالج (مثل حفظ التقدّم أو التحقّق) يجب تنفيذه مرّتين بشكلين مختلفين.

**الإصلاح — بخطوات آمنة:**
1. استخرج مكوّنات العرض من `PlanBuilder.tsx` إلى `src/components/planBuilder/controls.tsx` (`OptionCard`, `OptionRow`, `Slider`, `Stepper`, `Toggle`, `Question`, `List`) — نقل خالص، بلا تغيير منطق. (~250 سطرًا تخرج)
2. استخرج تعريف الخطوات إلى `src/components/planBuilder/steps.tsx` كدالة `buildSteps(a, set, toggleIn): Step[]`. (~330 سطرًا تخرج)
3. استخرج قشرة المعالج `src/components/wizard/WizardShell.tsx` (رأس + شريط تقدّم + شريط إجراءات) واستهلكها من الاثنين.
4. يبقى `PlanBuilder.tsx` ~١٥٠ سطرًا: الحالة + التنقّل + الإنهاء.

**الجهد:** L

---

### 🟡 A-13 — مكوّنات عرض صغيرة مكرّرة (أحدها متطابق حرفيًا)

**الملف:** `src/sections/DailySummary.tsx:124` و `src/views/DashboardView.tsx:340` (و`TodayWorkoutHero.tsx:141`, `ExerciseLibraryView.tsx:269`)

**الدليل:** متطابقان حرفًا بحرف:
```tsx
// DailySummary.tsx:124  ≡  DashboardView.tsx:340
function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
      <Icon name={icon} className="h-3.5 w-3.5 text-primary-c" />
      {text}
    </span>
  )
}
```
جرد كامل للتكرار: `Chip` ×٤ · `Stat` ×٤ (`DashboardView:331`, `RecentWorkout:87`, `StepGeneratePlan:200`, `QuickMealLogger:328`) · `Card` ×٣ (`ProgressView:158`, `StepGeneratePlan:188`, `StepSmartCalculations:97`) · `Field` ×٣ (`StepCommitments:93`, `StepWellness:152`, `QuickMealLogger:310`) · `Stepper` ×٢ بواجهتين مختلفتين (`PlanBuilder:727`, `WorkoutMode:632`) · `MiniTarget`/`StatCard`/`CalCell`/`EqCell`/`MacroCard`/`MacroMini` كلها بطاقات رقم+تسمية.

**الأثر:** تغيير الهوية البصرية (حواف، ألوان، مقاسات لمس) يتطلّب لمس ١٥+ موضعًا. وقاعدة `frontend.md` تنصّ على إعادة استخدام أصناف `styles/index.css` — والتكرار هنا يتجاوزها.

**الإصلاح:** أنشئ `src/components/ui/` يضمّ `Chip.tsx`, `StatTile.tsx`, `Field.tsx`, `SectionCard.tsx`. ابدأ بـ`Chip` (تكرار حرفي ⇒ استبدال بلا مخاطرة)، ثم `Stat`، ثم البقية تدريجيًا. `Stepper` تُترك مؤقتًا (واجهتان مختلفتان جوهريًا).

**الجهد:** M

---

### 🟡 A-14 — أربع دوال «الاسم ثنائي اللغة» بنفس القاعدة وترتيب مختلف

**الملف:** `src/lib/wellnessPlan.ts:43` و `:51` · `src/lib/commitmentPlan.ts:21` · `src/lib/workoutPlan.ts:41`

**الدليل:**
```ts
// wellnessPlan.ts:43 / :51 / commitmentPlan.ts:21 — ثلاث نسخ متطابقة
const ar = X.customNameAr || lib?.nameAr || ''
const en = X.customNameEn || lib?.nameEn || ''
if (lang === 'en') return en || ar
return ar && en ? `${ar} — ${en}` : ar || en
```
```ts
// workoutPlan.ts:41 — نفس المفهوم بترتيب معكوس (إنجليزي أولًا)
export function exerciseDisplayName(nameAr: string, nameEn: string, lang: Lang): string {
  if (lang === 'en') return nameEn
  return nameEn && nameAr ? `${nameEn} — ${nameAr}` : nameEn || nameAr
}
```

**الأثر:** المستخدم العربي يرى «الكرياتين — Creatine» في المكملات و«Bench Press — ضغط صدر» في التمارين. عدم اتّساق مقصود أم سهو؟ لا يوجد مكان واحد يوثّق القرار.

**الإصلاح:** أضف في `src/lib/i18nName.ts`:
```ts
export function bilingualName(ar: string, en: string, lang: Lang, order: 'ar-first' | 'en-first' = 'ar-first'): string
```
وأعد كتابة الأربع فوقها بسطر واحد لكل منها، مع تثبيت القرار في تعليق واحد.

**الجهد:** S

---

### 🟡 A-15 — منطق اشتقاق الخبرة/الهدف مكرّر بين `dashboardLayout` و`onboardingProfile`

**الملف:** `src/lib/dashboardLayout.ts:32` و `:49` مقابل `src/lib/onboardingProfile.ts:271` و `:310`

**الدليل:** متطابقتان جسمًا:
```ts
// dashboardLayout.ts:49                       // onboardingProfile.ts:310
function experienceFromProfile(p: Profile)     function experienceFromLegacy(p: Profile)
{ if (p.experienceLevel) return p.experienceLevel
  if (p.trainingLevel === 'beginner') return 'beginner'
  if (p.trainingLevel === 'advanced') return 'advanced'
  if (p.trainingLevel === 'intermediate') return 'intermediate'
  return undefined }
```
و`goalFromProfile` (dashboardLayout.ts:32) يعيد بناء نفس خريطة `GOALTYPE_TO_ONB` (onboardingProfile.ts:271) بـ `switch`.

**الأثر:** أي تعديل على هجرة الأهداف القديمة (مثل `recomposition → cut`) يجب إجراؤه مرّتين؛ لو نُسي أحدهما تختلف أولوية بطاقات اللوحة عن الخطة المولّدة لنفس المستخدم.

**الإصلاح:** صدّر `experienceFromLegacy` و`goalTypeToOnb` من `onboardingProfile.ts` واستوردهما في `dashboardLayout.ts`، واحذف النسختين المحليتين. (`onboardingProfile` لا يستورد `dashboardLayout` ⇒ لا اعتماد دائري.)

**الجهد:** S

---

### 🟡 A-16 — ألوان خام مكرّرة داخل المكوّنات (لون العلامة في ٥ مواضع)

**الملف:** `tailwind.config.js:36` · `src/config/theme.ts:10` · `src/lib/customization.ts:136` · `src/components/MuscleMap.tsx:21` · `src/components/WeeklyMuscleMap.tsx:30` · `src/App.tsx:63`

**الدليل:**
```
tailwind.config.js:36              500: '#F26A21',
src/config/theme.ts:10             swatch: '#F26A21',
src/lib/customization.ts:136       primary: '#F26A21',
src/components/MuscleMap.tsx:21    fresh: { label: 'تمرنت حديثًا', color: '#F26A21', fill: 'soft' },
src/components/WeeklyMuscleMap.tsx:30  const HEAT = '#F26A21'
src/App.tsx:63                     'color:#F26A21;font-weight:bold'
```
وخريطة ألوان الحالة مكرّرة كذلك: `MuscleMap.tsx:17-25` (`STATUS_META`) مقابل `MuscleCoverageSection.tsx:49-51` (`tone="#1F9D57" / "#D6553A" / "#E0941F"` مضمّنة في JSX).

**الأثر:** خرق لقاعدة `frontend.md` («لا تكرّر قيم الألوان الخام؛ استخدم لوحة tailwind.config.js»). تخصيص لون العلامة من مركز التخصيص لا ينعكس على خرائط العضلات لأنها تحمل النسخة الثابتة.

**الإصلاح:** أنشئ `src/config/palette.ts` (أو وسّع `config/theme.ts`) يصدّر `BRAND` وخريطة `MUSCLE_STATUS_COLORS: Record<MuscleStatus, string>`، واستورده في `MuscleMap` و`MuscleCoverageSection` و`WeeklyMuscleMap` و`customization.ts`. الألوان التي تُرسم في SVG تبقى قيمًا (لا يمكن استخدام أصناف Tailwind فيها) لكن من مصدر واحد.

**الجهد:** S

---

### 🟢 A-17 — ملفات ضخمة تتجاوز حدّ المراجعة المعقول

**الملف:** `src/data/foodItems.ts` (3642) · `src/config/strings.ts` (1063) · `src/lib/planGenerator.ts` (911) · `src/components/PlanBuilder.tsx` (790) · `src/components/WorkoutMode.tsx` (657) · `src/lib/historyStore.ts` (500)

**الدليل:** بنية `strings.ts` = واجهة واحدة (`ShellStrings`، أسطر 6-349) + كائن `ar` (350-706) + كائن `en` (707-1060) + `getStrings` (1061):
```ts
// src/config/strings.ts:1061
export function getStrings(lang: Lang): ShellStrings { return lang === 'en' ? en : ar }
```
و`planGenerator.ts` يجمع خمس مسؤوليات مستقلة: توليد التمرين (42-632)، الجدول الأسبوعي (633-709)، التغذية (711-791)، الالتزامات (793-806)، القياسات (808-811) — بلا اعتماد متبادل بينها عمليًا.

**الأثر:** المراجعة والتعديل بطيئان، وتضارب الدمج شبه مضمون عند عمل موازٍ (وهو نمط عملك حسب الذاكرة: عدّة جلسات على نفس المستودع).

**الإصلاح:**
- `strings.ts` → `src/config/strings/{index.ts,types.ts,ar.ts,en.ts}` مع بقاء `getStrings` في `index.ts` (لا يتغيّر أي مستورد).
- `planGenerator.ts` → `src/lib/plan/{workout.ts,schedule.ts,nutrition.ts,commitments.ts,index.ts}`؛ `index.ts` يعيد تصدير كل ما هو مُصدَّر اليوم (لا يتغيّر أي مستورد).
- `foodItems.ts` → تقسيم حسب الفئة (`foods/protein.ts`, `foods/carbs.ts`, …) + `foods/index.ts` يجمعها.
- `PlanBuilder.tsx` و`WorkoutMode.tsx` ← انظر A-12 و A-11.

**الجهد:** M لكل ملف (نقل خالص + إعادة تصدير ⇒ لا كسر)

---

### 🟢 A-18 — تعارض أسماء أنواع: `types/index.ts` القديم مقابل أنواع النطاق الجديدة

**الملف:** `src/types/index.ts:28` مقابل `src/types/workout.ts:35`

**الدليل:**
```ts
// src/types/index.ts:28 — نوع Landing القديم
export interface Exercise { name: string; muscle: string; sets: number; reps: string; weight: string; done: boolean }
// src/types/workout.ts:35 — نوع النطاق الحقيقي
export interface Exercise { id: string; nameAr: string; nameEn: string; primaryMuscle: Muscle; /* … 20 حقلًا */ }
```
`types/index.ts` (177 سطرًا) لا يزال حيًّا عبر ٤ مستوردين فقط: `LineChart.tsx:2` (`ProgressPoint`), `exerciseStats.ts:5` (`ProgressPoint`), `customization.ts:10` (`RoutineDay`, `SupplementItem`), `planGenerator.ts:20` (`RoutineDay`), `icons.ts:85` (`IconComponent`) — والبقية يستوردها كود ميّت (`Audience.tsx`, `data/pricing.ts`, …).

**الأثر:** `import type { Exercise } from '@/types'` يعطي نوعًا مختلفًا تمامًا عن `from '@/types/workout'` — فخّ صامت للمساهم الجديد، ويستحيل على TypeScript تحذيرك منه.

**الإصلاح:** بعد حذف كود Landing (A-06): انقل الأنواع الأربعة الحيّة (`ProgressPoint`, `RoutineDay`, `SupplementItem`, `IconComponent`) إلى ملفاتها الطبيعية (`types/progress.ts`, `types/workout.ts`, `types/wellness.ts`, `lib/icons.ts`) واحذف `types/index.ts` كليًّا.

**الجهد:** S (بعد A-06)

---

### 🟢 A-19 — `lang` مُمرَّرة عبر ٣٦ ملفًا رغم أنها ثابتة `'ar'`

**الملف:** `src/App.tsx:28` وامتدادها في `src/views/*` و`src/sections/*` و`src/components/*`

**الدليل:**
```tsx
// src/App.tsx:28
const LANG = 'ar' as const   // «اللغة مثبّتة على العربية حاليًا»
// ثم تُمرّر يدويًا في كل موضع:
{view === 'dashboard' && <DashboardView lang={LANG} onNavigate={navigate} />}
```
٣٦ ملفًا يعلن `lang: Lang` في واجهته، و٤٦ موضع تمرير `lang={…}` (`DemoView` وحده ٩ مرّات). ومع ذلك `DashboardView` و`WorkoutView` يتجاهلان القيمة عمليًا (انظر A-09).

**الأثر:** ضجيج في كل واجهة مكوّن، ونسيان التمرير في مكوّن جديد لا يُكتشف إلا بصريًا. وهو أيضًا سبب بنيوي لخرق A-09: تمرير الخاصية أسهل من استخدامها.

**الإصلاح:** أنشئ `src/lib/langContext.tsx` (`LangProvider` + `useLang()`) ولفّ التطبيق في `main.tsx`. ثم أزل `lang` من المكوّنات الورقية أولًا (التي لا تمرّرها لأبنائها)، وصعودًا. **لا تنفّذ هذه قبل A-09** — إزالة الخاصية قبل توحيد النصوص تخفي الخرق بدل إصلاحه.

**الجهد:** M

---

### 🟢 A-20 — نظامان متوازيان لتشريح الجسم (~١٩٠٠ سطر) لعرض واحد

**الملف:** `src/data/bodyAnatomy.ts` (335) + `src/components/WeeklyMuscleMap.tsx` (242) مقابل `src/data/bodyModel3d.ts` (457) + `src/lib/body3d/{mesh,render,raster,math}.ts` (~١٠٥٠) + `src/components/BodyModel3D.tsx` (510)

**الدليل:**
```tsx
// src/components/BodyModel3D.tsx:3 — المجسّم ثلاثي الأبعاد يستورد الجسم المسطّح كوضع بديل
import { FlatMuscleBody } from './WeeklyMuscleMap'
```
```ts
// src/data/bodyAnatomy.ts:5 — «الإحداثيات على لوحة 0 0 220 470»
// src/data/bodyModel3d.ts:4  — «طول الجسم 180 وحدة، y=0 عند باطن القدم»
```
المستهلك الوحيد للاثنين معًا هو `src/views/ProgressView.tsx:132` (`<BodyModel3D />`). والتصدير `WeeklyMuscleMap` (البطاقة الكاملة، `:177`) ميّت — لا مستورد.

**الأثر:** نظامان لتمثيل نفس الشيء (تغطية العضلات على جسم) بمصدري حقيقة لأبعاد الجسم، لخدمة شاشة واحدة. عبء صيانة غير مبرَّر في قالب تجاري بلا مكتبات رسم خارجية (وهو قرار جيد لكنه مكلف مضاعفًا هنا).

**الإصلاح:** قرار منتج قبل الكود: هل الوضع «المسطّح» مطلوب؟
- إن نعم: احذف تصدير `WeeklyMuscleMap` الميّت وأعِد تسمية الملف إلى `components/FlatMuscleBody.tsx` (اسم الملف يجب أن يطابق تصديره الحيّ).
- إن لا: احذف `bodyAnatomy.ts` + `WeeklyMuscleMap.tsx` كليًّا واحذف وضع «مسطّح» من `BodyModel3D`. توفير ~٥٨٠ سطرًا.

**الجهد:** S (تنظيف) / M (حذف كامل)

---

### 🟢 A-21 — مساعدات مكرّرة بين `PlanBuilder` وطبقة `lib`

**الملف:** `src/components/PlanBuilder.tsx:118` و `:124` مقابل `src/lib/calculators.ts:227` و `src/lib/onboardingProfile.ts:158`

**الدليل:**
```tsx
// PlanBuilder.tsx:118 — حساب BMI داخل مكوّن
function bmiOf(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}
// PlanBuilder.tsx:124  ≡  onboardingProfile.ts:158
const showsTargetWeight = (g?: GoalValue) => g === 'cut' || g === 'bulk'
```
```ts
// src/lib/calculators.ts:227 — نفس معادلة BMI موجودة أصلًا في المحرّك
const bmi = round1(w / Math.pow(h / 100, 2))
```
كذلك `src/lib/calculators.ts:110` يصدّر `BMI_NOTE` وتنبيهًا محايدًا لا يستخدمه `PlanBuilder` — الذي يعرض الرقم عاريًا (`PlanBuilder.tsx:286`).

**الأثر:** ثلاث نسخ لقاعدة «متى نسأل عن وزن الهدف» — لو تغيّرت (مثلًا أُضيف هدف رابع) يظهر عدم اتّساق بين المعالج والمولّد. ونصّ التنبيه الطبي المحايد (قاعدة `product.md`: «لا ادعاءات طبية») يظهر في مكان ولا يظهر في آخر.

**الإصلاح:** صدّر `bmiOf` من `calculators.ts` (بإعادة استخدام `round1`) و`showsTargetWeight` من `onboardingProfile.ts`، واستوردهما في `PlanBuilder`. أضف `BMI_NOTE` تحت الرقم في `PlanBuilder.tsx:286`.

**الجهد:** S

---

### 🟢 A-22 — نصوص المنتج مضمّنة داخل `planGenerator.ts` بدل `config`/`data`

**الملف:** `src/lib/planGenerator.ts:522`, `:633`, `:705`, `:790`, `:877-897`

**الدليل:**
```ts
// :633
const WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
// :705
rows.push({ day: d, title: 'راحة واستشفاء', type: 'rest' })
// :790
return { plan, warning: within ? undefined : 'هذه أمثلة وجبات مبدئية وليست خطة كاملة مطابقة للأهداف.' }
// :877
if (isConservativeStart) warnings.push('بدأنا بحجم أخفّ هذا الأسبوع لبداية آمنة — زِد تدريجيًا بعدها.')
// :895
const levelAr = p.trainingLevel === 'beginner' ? 'مبتدئ' : p.trainingLevel === 'intermediate' ? 'متوسط' : 'متقدّم'
```
بينما `SPLIT_TITLES` (`:522`) موجودة بالفعل بصيغة `{ ar, en }` — أي أن نصف الملف مُعدّ للترجمة والنصف الآخر لا.

**الأثر:** خرق لقاعدة «كل النصوص في `config`/`data` لتسهيل الترجمة لاحقًا» (`copywriting.md`). وتغيير نبرة رسالة التحذير يتطلّب تعديل محرّك التوليد — وهو أكثر ملف يجب ألّا يُلمس بلا داعٍ.

**الإصلاح:** انقل النصوص إلى `src/data/planCopy.ts` كخريطة مفاتيح ⟶ `{ ar, en }`، واجعل `generatePlan` يُرجع **مفاتيح** التحذير بدل نصوصها (`warningKeys: string[]`) وتُترجم في طبقة العرض. خطوة انتقالية آمنة: أبقِ `warningsAr` كما هو وأضف `warningKeys` بجانبه، ثم أزل الأول بعد تحويل المستهلكين.

**الجهد:** M

---

## خطة تنفيذ مقترحة بخطوات آمنة

**القاعدة الحاكمة:** كل خطوة = commit واحد + `npm run typecheck && npm run build` أخضر قبل الانتقال للتالية. لا خطوة تجمع «حذف» و«إعادة كتابة» معًا.

### الموجة ١ — إصلاحات صحّة وتناقض (يوم واحد، مخاطرة شبه صفرية)

| # | الخطوة | النتيجة | الملفات |
|---|--------|---------|---------|
| 1.1 | أضف مفاتيح الخطوات إلى `QIMMAH_KEYS` باستيراد الثوابت | إصلاح تسرّب بيانات عند إعادة الضبط (A-02) | `lib/resetQimmah.ts` |
| 1.2 | وحّد تقدير المدة على `estimateDurationMin` واحذف `estDayMinutes` | اختفاء الرقمين المتناقضين (A-01) | `lib/workoutStats.ts`, `views/WorkoutView.tsx` |
| 1.3 | أضف `resolveNutritionTargets` واستهلكها في ٣ شاشات | اختفاء 2000/120/200/70 السحرية (A-03) | `lib/nutritionPlan.ts` + ٣ شاشات |
| 1.4 | `WorkoutSummary` يستدعي `sessionVolume` | حجم الجلسة صحيح للبيانات القديمة (A-10) | `components/WorkoutSummary.tsx` |
| 1.5 | `WorkoutMode` يستخدم `NUM_LIMITS`/`inRange` | مصدر واحد لحدود الإدخال (A-11) | `components/WorkoutMode.tsx` |

### الموجة ٢ — حذف الميّت (نصف يوم، تحتاج موافقتك على الحذف)

| # | الخطوة | النتيجة |
|---|--------|---------|
| 2.1 | حذف التصديرات الميتة الخمسة (`validateWorkoutPlan`, `summarizeCoverage`, `recordWeight`, `workoutStreak`×2, `weeklyCompleted`, `saveSessions`, مفتاحان قديمان) | −١٥٠ سطرًا، بلا لمس أي مستورد |
| 2.2 | **[يحتاج موافقتك]** نقل/حذف ١٥ قسم Landing + ٦ ملفات data | −١١٠٠ سطر |
| 2.3 | **[يحتاج موافقتك]** حذف ٨ خطوات customizer + `Header.tsx` | −٤٥٠ سطرًا |
| 2.4 | قرار `WeeklyMuscleMap`: إعادة تسمية أو حذف | −٠ أو −٥٨٠ سطرًا (A-20) |
| 2.5 | حذف `types/index.ts` بعد نقل أنواعه الأربعة الحيّة | نهاية تعارض `Exercise` (A-18) |

### الموجة ٣ — توحيد المساعدات (يوم، نقل خالص)

| # | الخطوة | النتيجة |
|---|--------|---------|
| 3.1 | `src/lib/num.ts`: `parseNumeric` + `round`/`round1` + إعادة تصدير `clamp` | يستبدل ٨ محلّلات و٤ `round` (A-08) |
| 3.2 | `oneRepMax` تُصدَّر من `exerciseHistory` ويستوردها `exerciseStats` | نسخة واحدة (A-08) |
| 3.3 | `bilingualName` في `lib/i18nName.ts` + تحويل الدوال الأربع | قرار ترتيب موحّد وموثّق (A-14) |
| 3.4 | `dashboardLayout` يستورد `experienceFromLegacy`/`goalTypeToOnb` | نهاية التكرار (A-15) |
| 3.5 | `PlanBuilder` يستورد `bmiOf`/`showsTargetWeight` + يعرض `BMI_NOTE` | (A-21) |
| 3.6 | `src/config/palette.ts` + توحيد `#F26A21` وألوان الحالة | (A-16) |

### الموجة ٤ — استخراج مكوّنات (يوم–يومان)

| # | الخطوة | النتيجة |
|---|--------|---------|
| 4.1 | `components/nutrition/WaterInput.tsx` واستهلاكه في الموضعين | (A-07) |
| 4.2 | `components/ui/{Chip,StatTile}.tsx` — يبدأ بـ`Chip` المتطابق حرفيًا | (A-13) |
| 4.3 | `lib/backup.ts` (`buildBackup`/`downloadBackup`/`parseBackup`) | (A-10) |
| 4.4 | نقل قرار «الخطوة التالية» إلى `lib/dashboardLayout.ts` | (A-10) |

### الموجة ٥ — تقسيم الملفات الضخمة (نقل خالص + إعادة تصدير ⇒ صفر كسر)

| # | الخطوة | النتيجة |
|---|--------|---------|
| 5.1 | `config/strings.ts` → `config/strings/{index,types,ar,en}.ts` | ١٠٦٣ → ٤ ملفات، لا مستورد يتغيّر (A-17) |
| 5.2 | `lib/planGenerator.ts` → `lib/plan/*` + `index.ts` يعيد التصدير | ٩١١ → ٥ ملفات (A-17) |
| 5.3 | `data/foodItems.ts` → `data/foods/*` + `index.ts` | ٣٦٤٢ → حسب الفئة (A-17) |
| 5.4 | `PlanBuilder.tsx` → `components/planBuilder/{controls,steps}.tsx` | ٧٩٠ → ~١٥٠ (A-12) |

### الموجة ٦ — إصلاحات بنيوية (تحتاج قرارك أولًا)

| # | الخطوة | الشرط |
|---|--------|-------|
| 6.1 | `lib/dailyStore.ts` وإعادة بناء الهوكات الثلاثة فوقه | بعد الموجة ٣ (A-05) |
| 6.2 | نقل النصوص العربية المضمّنة إلى `config/strings` شاشةً شاشة | الأكبر أثرًا على «جاهز للبيع» (A-09) |
| 6.3 | `WizardShell` مشتركة بين المعالجين | بعد 5.4 (A-12) |
| 6.4 | `LangProvider` وإزالة `lang` prop | **بعد 6.2 حصرًا** (A-19) |
| 6.5 | نقل نصوص `planGenerator` إلى `data/planCopy.ts` | بعد 5.2 (A-22) |

### ما لا أنصح به الآن
- **لا** توحّد `muscleCoverage.ts` و`muscleGroupCoverage.ts`: الأول يحسب لكل عضلة، الثاني يجمّع لمجموعات ويستورد الأول (`muscleGroupCoverage.ts:6`) — التقسيم صحيح، فقط `summarizeCoverage` الميتة تُحذف.
- **لا** تلمس `lib/historyStore.ts` (500 سطرًا): مسؤولية واحدة واضحة (متجر دائم + ترحيل idempotent)، والحجم مبرَّر بعدد أنواع السجلّات. الوحيد الذي يستحق النقل هو `dayStamp` المكرّرة (`:14`) — تُترك عمدًا لكسر اعتماد دائري مع `today.ts` (موثّق في التعليق نفسه)؛ إن أردت إزالتها انقل `getDayStamp` إلى `lib/date.ts` محايد يستورده الاثنان.
