# تدقيق طبقة البيانات — قِمّة (Qimmah)

> نطاق التدقيق: `src/lib/historyStore.ts`، `src/lib/syncService.ts`، `src/lib/supabaseClient.ts`، `src/lib/authContext.tsx`، `src/lib/resetQimmah.ts`، وكل وحدات التخزين المحلي في `src/lib/` + مسارات الاستيراد/التصدير في `src/views/SettingsView.tsx`.
> التاريخ: 2026-07-25 · الفرع: `feature/p25-steps-health` · قراءة فقط (لم يُعدَّل أي ملف كود).
> منهج: كل نتيجة أدناه مبنيّة على سطر كود قرأته فعليًا ومقتبس هنا. لا توجد نتيجة مبنيّة على تخمين.

---

## ملخّص تنفيذي (٥ أسطر)

1. **المزامنة السحابية غير موجودة عمليًا**: `syncLocalToCloud` و`pullCloudToLocal` و`fullSync` و`getSyncStatus` ليس لها **ولا استدعاء واحد** في التطبيق، بينما تُخبر الواجهة المستخدم حرفيًا: «بياناتك محفوظة على هذا الجهاز وعلى حسابك السحابي» — وعد كاذب يقود لفقدان كامل عند مسح المتصفّح.
2. **لا عزل بين الحسابات**: كل مفاتيح التخزين عامّة بلا لاحقة `user_id`، و`signOut()` لا يمسح أي بيانات محلية — فالمستخدم الثاني على نفس الجهاز يرى تمارين وقياسات وأوزان المستخدم الأول فورًا.
3. **امتلاء التخزين (Quota) غير معالَج في مكانين خطرين**: 16 استدعاء `setItem` بلا `try/catch` (بعضها داخل `useState` initializer فيبيّض التطبيق عند الإقلاع)، و`writeJSON` في `historyStore` يبتلع الخطأ صامتًا فتظهر شاشة «تم حفظ التمرين» بينما لم يُحفظ شيء.
4. **فقدان بيانات مؤكَّد يوميًا**: سجلّ الأطعمة المسجّلة (`log: LoggedFood[]` بسعراته وماكروزه) لا يُنسخ إلى المتجر الدائم إطلاقًا ويُمحى عند تغيّر اليوم؛ كما أنّ استعادة نسخة احتياطية **لا تُرجع القياسات** إلى الواجهة بسبب ازدواج مفتاحين.
5. **الأمان جيّد نسبيًا**: لا أسرار في الكود، `.env` مستبعَد من Git، و`SUPABASE-SCHEMA.sql` يفعّل RLS بسياسات `auth.uid() = user_id` لكل الجداول. الثغرة الأمنية الوحيدة الحقيقية سلوكية (تسرّب بين الحسابات محليًا) لا سرّية.

**إحصاءات مطلوبة بالسؤال:**

| المقياس | النتيجة |
|---|---|
| عدد `JSON.parse` في المستودع (خارج `dist/`, `node_modules/`) | **17** |
| منها بلا `try/catch` | **0** — كلها محميّة ✅ |
| عدد `localStorage.setItem` | **21** |
| منها بلا `try/catch` | **16** ❌ (القائمة الكاملة في النتيجة D-03) |
| عدد مفاتيح `qimmah:*` الفريدة في الكود | **22** |
| منها مفقود من `resetQimmah` | **3** (`steps`, `stepSource`, `stepGoal`) |
| استدعاءات دوال المزامنة الفعلية في الواجهة | **0** |
| أسرار مسرَّبة / `VITE_*` حسّاس | **0** ✅ |

---

## النتائج مرتّبة حسب الخطورة

### 🔴 حرِج (Critical)

---

#### D-01 — تسرّب بيانات بين الحسابات: المفاتيح غير مرتبطة بالمستخدم و`signOut` لا يمسح شيئًا

**الملف:** `src/lib/historyStore.ts:22-31` + `src/lib/authContext.tsx:100-105`

**الدليل:**

```ts
// historyStore.ts:22 — مفاتيح ثابتة عامّة، لا user_id ولا أي عزل
export const HISTORY_KEYS = {
  workoutSessions: 'qimmah:history:workoutSessions:v1',
  exerciseHistory: 'qimmah:history:exerciseHistory:v1',
  dailyLogs: 'qimmah:history:dailyLogs:v1',
  measurementLogs: 'qimmah:history:measurementLogs:v1',
  ...
} as const
```

```tsx
// authContext.tsx:100 — الخروج يمسح جلسة Supabase فقط
async signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
  setSession(null)
  setUser(null)
},
```

لا يوجد في المستودع كلّه أي استدعاء لمسح بيانات محلية عند تغيّر المستخدم — لا داخل `signOut`، ولا داخل `onAuthStateChange` (`authContext.tsx:71-74` يكتفي بـ `setSession/setUser`).

**الأثر — سيناريو ملموس:**
جهاز مشترك في صالة (أو هاتف زياد يعيره لصديقه):
1. زياد يسجّل الدخول، يسجّل 40 جلسة تمرين + وزنه 78 كجم + قياسات الخصر + سجلّ أدويته.
2. يضغط «تسجيل الخروج».
3. صديقه يسجّل الدخول بحسابه.
4. **الشاشة الرئيسية تعرض تمارين زياد الأربعين، وزنه، محيط خصره، وقائمة أدويته** — لأن الواجهة تقرأ `localStorage` مباشرة لا من الحساب.
5. لو فُعّلت المزامنة لاحقًا، `syncLocalToCloud` سيرفع بيانات زياد إلى **حساب صديقه** السحابي (`syncService.ts:130` يبني كل صف بـ `user_id: userId` = المستخدم الحالي) — تلوّث دائم لا رجعة فيه.

**الإصلاح المقترح:**
1. أضف طبقة توليد مفاتيح واحدة: `scopedKey(base: string, ownerId: string | 'guest')` تُرجع `qimmah:u:<ownerId>:<base>`، وحوّل كل الوحدات لاستخدامها (لا مفاتيح حرفية بعد اليوم).
2. أضف هجرة لمرّة واحدة تنقل المفاتيح العامّة الحالية إلى نطاق `guest` (البيانات الموجودة كلها وُلدت في وضع الضيف).
3. في `AuthProvider`، عند `onAuthStateChange` بحدث `SIGNED_IN` بمعرّف يختلف عن آخر معرّف مخزّن → أعِد تهيئة الذاكرة/الحالة من نطاق المستخدم الجديد. عند `SIGNED_OUT` → ارجع لنطاق `guest`.
4. أضف حاجز أمان صريح: خزّن `qimmah:lastOwner:v1`، وإن اختلف عن المستخدم الحالي عند الإقلاع اعرض خيار «هذه بيانات حساب آخر — احتفظ / امسح» بدل الدمج الصامت.

**الجهد:** L

---

#### D-02 — المزامنة السحابية كود ميت، والواجهة تَعِد المستخدم بنسخة سحابية غير موجودة

**الملف:** `src/lib/syncService.ts:116, 194, 285` + `src/config/strings.ts:384`

**الدليل:**

بحث شامل عن كل مستدعي دوال المزامنة في `src/`:

```
src/lib/syncService.ts:116:export async function syncLocalToCloud(...)   ← 0 مستدعٍ
src/lib/syncService.ts:194:export async function pullCloudToLocal(...)   ← 0 مستدعٍ
src/lib/syncService.ts:285:export async function fullSync(...)           ← 0 مستدعٍ (إلا داخل نفسه)
src/lib/syncService.ts:92 :export function  getSyncStatus(...)           ← 0 مستدعٍ
```

المستورد الوحيد للوحدة في كل التطبيق:

```tsx
// src/views/SettingsView.tsx:14
import { markPendingSync } from '@/lib/syncService'
```

وفي المقابل، النصّ المعروض للمستخدم المسجَّل:

```ts
// src/config/strings.ts:384
cloudNote: 'بياناتك محفوظة على هذا الجهاز وعلى حسابك السحابي.',
```

ويُعرض فعليًا في `src/views/SettingsView.tsx:112-116`:

```tsx
const accountStatus = !auth.configured
  ? t.auth.disabledTitle
  : auth.user
    ? t.auth.cloudNote   // ← «محفوظة … على حسابك السحابي» — غير صحيح
    : t.auth.guestNote
```

كما أنّ `markPendingSync()` (`syncService.ts:75`) يضبط `pending: true` **بلا أي مسار يمسحه** (المسح يحدث فقط في `writeMeta` داخل `syncLocalToCloud`/`pullCloudToLocal` وهما لا يُستدعيان).

**الأثر — سيناريو ملموس:**
مستخدم ينشئ حسابًا لأن التطبيق أخبره أن بياناته «محفوظة على حسابك السحابي». يتمرّن 6 أشهر. يبدّل الجوّال / يمسح بيانات المتصفّح / يفتح Safari في وضع خاص → **كل شيء يختفي**: 150 جلسة، كل الأرقام القياسية، كل القياسات. لا نسخة سحابية إطلاقًا، وهو لم يُصدّر نسخة احتياطية لأنه صدّق الرسالة. هذه أخطر نتيجة على المستخدم وعلى مصداقية المنتج التجاري (تخالف `.claude/rules/copywriting.md`: «لا وعود نتائج مضمونة» ومعيار الصدق في `.claude/rules/product.md`).

**الإصلاح المقترح (خياران، اختر واحدًا قبل أي عمل على الواجهة):**
- **الخيار الصادق السريع (S):** غيّر `cloudNote` إلى ما يطابق الواقع — مثلًا: «حسابك يحفظ هويتك فقط. بياناتك على هذا الجهاز — صدّر نسخة احتياطية بانتظام.» وأضف تذكيرًا بالتصدير في `SettingsView`. هذا يزيل الخطر فورًا.
- **الخيار الكامل (L):** صِل المزامنة فعليًا: استدعِ `fullSync()` بعد `SIGNED_IN` في `AuthProvider`، و`syncLocalToCloud()` عند `visibilitychange → hidden` وعند `beforeunload` إن كان `pending`، واعرض `getSyncStatus()` في شاشة الإعدادات. لا تفعل ذلك قبل إصلاح D-01 (وإلا رفعت بيانات حساب إلى حساب آخر) و D-09 (التعارض).

**الجهد:** S (الخيار الصادق) / L (الخيار الكامل)

---

#### D-03 — امتلاء التخزين يُسقط التطبيق عند الإقلاع: 16 استدعاء `setItem` بلا حماية، أربعة منها داخل مُهيّئ الحالة

**الملف:** `src/lib/today.ts:52` (الأخطر) + `src/lib/nutritionTracking.ts:74` + `src/lib/wellnessTracking.ts:33` + `src/lib/commitmentTracking.ts:33` (و12 موقعًا آخر)

**الدليل:**

```ts
// today.ts:39-54 — لاحظ: setItem خارج نطاق try تمامًا
export function loadToday(): TodayState {
  if (typeof window === 'undefined') return freshState()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(TODAY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TodayState
      if (parsed && parsed.date === today && parsed.done) return parsed
    }
  } catch {
    /* تجاهل البيانات التالفة */
  }
  const fresh = freshState()
  window.localStorage.setItem(TODAY_KEY, JSON.stringify(fresh))   // ← سطر 52: خارج try
  return fresh
}
```

و`loadToday()` تُستدعى داخل مُهيّئ حالة React:

```ts
// today.ts:64
const [state, setState] = useState<TodayState>(() => (demo ? freshState() : loadToday()))
```

نفس النمط بالحرف في:
- `nutritionTracking.ts:73-75` (`readStorage`، وتُستدعى من `snapshot()` في مخزن `useSyncExternalStore`)
- `wellnessTracking.ts:32-34` (`loadWellnessToday`، مُهيّئ `useState` سطر 44)
- `commitmentTracking.ts:32-34` (`loadCommitmentsToday`، مُهيّئ `useState` سطر 44)

**القائمة الكاملة للـ 16 موقعًا بلا `try/catch`:**

| # | الموقع | الدالة |
|---|---|---|
| 1 | `src/lib/today.ts:52` | `loadToday` ← **مُهيّئ حالة** |
| 2 | `src/lib/today.ts:58` | `saveToday` |
| 3 | `src/lib/nutritionTracking.ts:74` | `readStorage` ← **مُهيّئ مخزن** |
| 4 | `src/lib/nutritionTracking.ts:84` | `saveNutritionToday` |
| 5 | `src/lib/wellnessTracking.ts:33` | `loadWellnessToday` ← **مُهيّئ حالة** |
| 6 | `src/lib/wellnessTracking.ts:39` | `saveWellnessToday` |
| 7 | `src/lib/commitmentTracking.ts:33` | `loadCommitmentsToday` ← **مُهيّئ حالة** |
| 8 | `src/lib/commitmentTracking.ts:39` | `saveCommitmentsToday` |
| 9 | `src/lib/customization.ts:258` | `saveCustomization` |
| 10 | `src/lib/measurementLog.ts:20` | `saveLogs` |
| 11 | `src/lib/appPreferences.ts:28` | `savePreferences` |
| 12 | `src/lib/onboarding.ts:46` | `saveOnboarding` |
| 13 | `src/lib/reminderPrefs.ts:38` | `saveReminderPrefs` |
| 14 | `src/lib/stepCounter.ts:65` | `saveStepGoal` |
| 15 | `src/lib/stepCounter.ts:90` | `persist` (سجل الخطوات) |
| 16 | `src/lib/stepCounter.ts:110` | `persistSources` |

(المحميّة فعلًا وللمقارنة: `historyStore.ts:110`، `historyStore.ts:496`، `onboardingProfile.ts:114`، `syncService.ts:68`، `uiMode.ts:38`.)

**الأثر — سيناريو ملموس:**
مستخدم عنده ~400 جلسة تمرين مع مجموعات مفصّلة؛ حجم `qimmah:history:workoutSessions:v1` يقترب من سقف الـ 5MB. يفتح التطبيق في يوم جديد:
- `loadToday()` تحاول كتابة حالة يوم جديد → `QuotaExceededError` يُرمى من السطر 52.
- الاستثناء يقع داخل مُهيّئ `useState` أثناء أول render → React لا يلتقطه (لا `ErrorBoundary` في `main.tsx`) → **شاشة بيضاء عند كل فتح**، بلا رسالة، وبلا طريقة للمستخدم لتصدير بياناته أو إصلاح الوضع.
- نفس الشيء يحدث في Safari «تصفّح خاص» على iOS القديم حيث الحصّة صفر: التطبيق لا يقلع أساسًا لمستخدم لم يخزّن شيئًا بعد.

**الإصلاح المقترح:**
1. أنشئ وحدة `src/lib/safeStorage.ts` واحدة تصدّر `readRaw/writeRaw/removeRaw` مع `try/catch` وكشف `QuotaExceededError` (وأسماؤه في Firefox: `NS_ERROR_DOM_QUOTA_REACHED`, code 22/1014).
2. استبدل الـ 21 استدعاء `localStorage` المباشر بها — ممنوع `localStorage` خارج هذه الوحدة (أضف قاعدة ESLint `no-restricted-properties`).
3. لا تكتب أبدًا داخل دالة قراءة: `loadToday`/`readStorage`/`loadWellnessToday`/`loadCommitmentsToday` يجب أن تُرجع الحالة الجديدة بلا حفظ، ويتم الحفظ في `useEffect` بعد التركيب.
4. أضف `ErrorBoundary` حول `<App />` في `main.tsx` يعرض شاشة عربية فيها زر «تصدير نسختي» + «إعادة الضبط».

**الجهد:** M

---

#### D-04 — امتلاء التخزين يُفقد التمرين صامتًا بينما تعرض الواجهة «تم الحفظ» وشاشة الأرقام القياسية

**الملف:** `src/lib/historyStore.ts:107-114`

**الدليل:**

```ts
function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* تجاهل امتلاء التخزين */      // ← الابتلاع الصامت
  }
}
```

ومسار إنهاء التمرين لا يفحص أي نتيجة:

```ts
// finishWorkout.ts:36-44
addSession(session)          // → saveWorkoutSession → writeJSON (قد تفشل صامتًا)
let history = loadHistory()
session.exercises.forEach((e) => { history = recordExercise(history, e, when) })
saveHistory(history)         // → writeJSON (قد تفشل صامتًا)
return prs                   // ← تُعاد الأرقام القياسية بغضّ النظر
```

```tsx
// WorkoutView.tsx:45-60 — النتيجة تُعرض دائمًا كنجاح
const prs = persistFinishedSession(session)
...
setSummary({ session, prs: prLabels, streakWeeks: weekly.streakWeeks, nextDayLabel })
```

`saveWorkoutSession` كذلك يقصّ إلى 500 جلسة بلا أي إشعار (`historyStore.ts:186`: `.slice(0, 500)`).

**الأثر — سيناريو ملموس:**
مستخدم أنهى تمرين ساقين ثقيل، سجّل 24 مجموعة، حقّق رقمًا قياسيًا في السكوات. الحصّة ممتلئة. التطبيق يعرض له شاشة تهنئة: «رقم قياسي جديد: سكوات · 140 كجم» وسلسلة الأسابيع. يغلق التطبيق. **لا شيء حُفظ.** يفتحه بعد ساعة فيجد سجل التمرين خاليًا وسلسلته مكسورة، ولا يعلم أنّ الجلسة لم تُكتب.

**الإصلاح المقترح:**
1. اجعل `writeJSON` تُرجع `boolean` (أو `{ ok, reason }`) بدل `void`، ومرّر النتيجة عبر `saveWorkoutSession` → `persistFinishedSession` → `WorkoutView`.
2. عند الفشل: اعرض شريطًا أحمر صريحًا «لم نستطع حفظ التمرين — مساحة الجهاز ممتلئة» مع زرّي «صدّر نسختي الآن» و«احذف جلسات أقدم من سنة».
3. أضف تقليمًا استباقيًا: قبل الكتابة، إن تجاوز الحجم عتبة (مثلًا 3.5MB) أرشِف الجلسات الأقدم من 12 شهرًا في نسخة تصدير واقترح حذفها.
4. اجعل حدّ الـ 500 صريحًا للمستخدم (رسالة «نحتفظ بآخر 500 جلسة») بدل القصّ الصامت.

**الجهد:** M

---

### 🟠 عالٍ (High)

---

#### D-05 — سجلّ الأطعمة المسجّلة (سعرات/ماكروز/جرامات) يُمحى نهائيًا عند منتصف الليل

**الملف:** `src/lib/nutritionTracking.ts:50-76, 120-133` + `src/lib/historyStore.ts:50-55`

**الدليل:**

الحالة اليومية تحوي مصفوفة الأطعمة المسجّلة:

```ts
// nutritionTracking.ts:39-44
export interface NutritionTodayState {
  date: string
  doneMeals: Record<string, boolean>
  waterMl: number
  log: LoggedFood[]        // ← فيها calories/protein/carbs/fat/grams لكل صنف
}
```

لكن ما يُنسخ إلى المتجر الدائم هو حقلان فقط:

```ts
// nutritionTracking.ts:126-130
realCache = next
saveNutritionToday(next)
// عكس الحالة في المتجر التاريخي الدائم (لا يُصفّر مع تغيّر اليوم).
saveNutritionLog(next.date, { doneMeals: next.doneMeals, waterMl: next.waterMl })
saveWaterLog(next.date, next.waterMl)
```

ونموذج المتجر الدائم أصلًا لا يملك حقلًا للسجل:

```ts
// historyStore.ts:50-55
export interface NutritionLog {
  date: string
  doneMeals: Record<string, boolean>
  waterMl?: number
  updatedAt: string
}                                    // ← لا وجود لـ log/LoggedFood
```

والأسوأ: القراءة نفسها تدمّر بيانات الأمس قبل أن يقرأها أحد:

```ts
// nutritionTracking.ts:73-75 — عند اختلاف التاريخ تُكتب حالة فارغة فوق القديمة
const f = fresh()
window.localStorage.setItem(NUTRITION_TODAY_KEY, JSON.stringify(f))
return f
```

**الأثر — سيناريو ملموس:**
مستخدم في مرحلة تنشيف يسجّل بدقّة كل وجبة (14 صنفًا، 2,100 سعرة، 165غ بروتين). في اليوم التالي يفتح التطبيق ليقارن أمسه باليوم → **قسم التغذية فارغ تمامًا لكل الأيام السابقة**. لا سعرات، لا ماكروز، لا أوزان جرامات. الشيء الوحيد الباقي هو «كم وجبة علّمها منجزة» و«كم شرب ماء». كل قيمة المنتج التغذوية تتبخّر يوميًا، ولا يمكن رسم أي منحنى سعرات تاريخي.

**الإصلاح المقترح:**
1. أضف `log?: LoggedFood[]` (وربّما `totals`) إلى `NutritionLog` في `historyStore.ts`.
2. في `nutritionTracking.setState` مرّر `log: next.log` ضمن `saveNutritionLog`.
3. أزل الكتابة التدميرية من `readStorage`: عند اختلاف التاريخ، انسخ الحالة القديمة إلى `saveNutritionLog(old.date, …)` **قبل** إرجاع الحالة الجديدة (احتياط لأي كتابة ضاعت).
4. اجعل واجهة التغذية تقرأ يوم اليوم من المتجر الدائم لا من مفتاح `nutritionToday` (مصدر حقيقة واحد).

**الجهد:** M

---

#### D-06 — استعادة نسخة احتياطية لا تُرجع القياسات: مفتاحان للقياسات، الواجهة تقرأ واحدًا والاستيراد يكتب الآخر

**الملف:** `src/lib/measurementLog.ts:6-20` مقابل `src/lib/historyStore.ts:261-278` + `src/views/SettingsView.tsx:78`

**الدليل:**

الواجهة تقرأ المفتاح **القديم** مباشرة:

```ts
// measurementLog.ts:6
export const MEASUREMENT_LOGS_KEY = 'qimmah:measurementLogs:v1'
export function loadLogs(): MeasurementLog[] { ... getItem(MEASUREMENT_LOGS_KEY) ... }
```

```tsx
// ProgressView.tsx:26        const logs = loadLogs()
// ProgressSection.tsx:21     useState(() => (demo ? [] : loadLogs()))
```

بينما الاستيراد يكتب المفتاح **الجديد** فقط:

```ts
// SettingsView.tsx:78
if (parsed.history) importHistory(parsed.history)
```

```ts
// historyStore.ts:377
if (Array.isArray(snap.measurementLogs)) writeJSON(HISTORY_KEYS.measurementLogs, snap.measurementLogs)
//                                                  ^ 'qimmah:history:measurementLogs:v1'
```

**الأثر — سيناريو ملموس:**
مستخدم يشتري جوّالًا جديدًا. على القديم يضغط «تصدير نسخة» (تحتوي 60 قياس وزن ومحيط). على الجديد يستورد الملف. الرسالة تقول «تم استيراد نسختك بنجاح» (`SettingsView.tsx:81`). يفتح «التقدّم» → **سجل القياسات فارغ**، ومنحنى الوزن مسطّح على صفر. البيانات موجودة فعلًا في `localStorage` تحت المفتاح الجديد لكن لا أحد يقرأها. المستخدم يستنتج أن نسخته الاحتياطية تالفة.

**الإصلاح المقترح:**
1. احذف `MEASUREMENT_LOGS_KEY` كمخزن، واجعل `measurementLog.ts` غلافًا رفيعًا فوق `historyStore` تمامًا كما فعل `workoutSessions.ts` و`exerciseHistory.ts` (`loadLogs = getMeasurementLogs`, `saveLogs = setMeasurementLogs`).
2. أبقِ المفتاح القديم في `OLD_KEYS` للترحيل فقط (هو موجود أصلًا في `historyStore.ts:37`).
3. أضف اختبارًا يمنع أي قارئ خارج `historyStore` من لمس مفاتيح `qimmah:` مباشرة.

**الجهد:** S

---

#### D-07 — حذف قياس واحد يقصّ المتجر الدائم ويلغي الاستيراد

**الملف:** `src/lib/measurementLog.ts:23-38`

**الدليل:**

```ts
export function addLog(log: MeasurementLog): MeasurementLog[] {
  const next = [log, ...loadLogs()].slice(0, 200)     // ← سقف 200 على المفتاح القديم
  saveLogs(next)
  saveMeasurementLogHistory(log)                       // ← سقف 1000 على المتجر الدائم
  return next
}

export function deleteLog(id: string): MeasurementLog[] {
  const next = loadLogs().filter((l) => l.id !== id)
  saveLogs(next)
  setMeasurementLogs(next)     // ← يستبدل المتجر الدائم كاملًا بقائمة المفتاح القديم
  return next
}
```

سقفان مختلفان (200 مقابل 1000 في `historyStore.ts:269`) على نفس البيانات، و`deleteLog` يفرض القائمة الأقصر على الأطول.

**الأثر — سيناريو ملموس:**
1. المستخدم استورد نسخة فيها 350 قياسًا → المتجر الدائم صار فيه 350، المفتاح القديم ما زال فيه 200 (أو صفر على جهاز جديد).
2. يحذف قياسًا واحدًا خاطئًا.
3. `setMeasurementLogs(next)` يكتب قائمة المفتاح القديم فوق المتجر الدائم → **تختفي 150+ قياسًا دفعة واحدة**، ويصبح التصدير القادم ناقصًا نهائيًا.

**الإصلاح المقترح:** يُحلّ تلقائيًا بتنفيذ D-06 (مخزن واحد وسقف واحد). إن أُجّل D-06، غيّر `deleteLog` ليقرأ `getMeasurementLogs()` ويحذف منه بالمعرّف بدل استبداله بقائمة أخرى، ووحّد السقف على 1000.

**الجهد:** S

---

#### D-08 — الخطوات وملف الإعداد خارج «إعادة الضبط» وخارج «النسخة الاحتياطية»

**الملف:** `src/lib/resetQimmah.ts:3-32` + `src/lib/historyStore.ts:345-368` + `src/views/SettingsView.tsx:46-52`

**الدليل:**

مفاتيح الخطوات الثلاثة موجودة في الكود:

```ts
// stepCounter.ts:6-8
export const STEP_LOG_KEY = 'qimmah:steps:v1'
export const STEP_SOURCE_KEY = 'qimmah:stepSource:v1'
export const STEP_GOAL_KEY = 'qimmah:stepGoal:v1'
```

لكن قائمة إعادة الضبط لا تذكرها إطلاقًا (القائمة الكاملة `resetQimmah.ts:3-32` تنتهي عند `qimmah:history:migrated:v1`).

ولقطة التصدير لا تحتوي خطوات ولا ملف الإعداد:

```ts
// historyStore.ts:345-354
export interface HistorySnapshot {
  workoutSessions; exerciseHistory; dailyLogs; measurementLogs;
  nutritionLogs; waterLogs; supplementLogs; medicationLogs
}                                    // ← لا steps
```

```ts
// SettingsView.tsx:46-52 — حمولة التصدير
const payload: QimmahExport = {
  version: EXPORT_VERSION, exportedAt, customization,
  history: exportHistory(), preferences: loadPreferences(),
}     // ← لا onboardingProfile (qimmah:onboarding:profile:v1) ولا steps ولا reminders ولا uiMode
```

بينما `resetQimmah` **يحذف** `qimmah:onboarding:profile:v1` (سطر 7).

**الأثر — سيناريوهان ملموسان:**
- **(أ) بقايا بعد إعادة الضبط:** المستخدم يبيع جوّاله، يضغط «إعادة ضبط كاملة» ليمسح بياناته. يفتح المشتري التطبيق فيجد **سجلّ خطوات المالك السابق لكل الأيام** وهدفه اليومي — بيانات صحّية شخصية بقيت رغم «الضبط الكامل».
- **(ب) فقدان عند الاستعادة:** المستخدم يصدّر نسخة، يعيد الضبط، يستورد. `qimmah:onboarding:profile:v1` (مصدر حقيقة الإعداد بحسب `onboardingProfile.ts:41`) لم يُصدَّر لكنه حُذف بالضبط → `loadOnboardingProfile()` تُرجع `null` → `useDashboardSignals` (`dashboardLayout.ts:89`) يسقط للافتراضات، وإعادة توليد الخطة تفقد مدخلات المستخدم الأصلية (الإصابات، الحساسيات، الأطعمة المكروهة، الأدوية) نهائيًا.

**الإصلاح المقترح:**
1. أنشئ **سجلّ مفاتيح واحد** (`src/lib/storageKeys.ts`) يعرّف كل مفتاح مرّة واحدة مع وسم `{ resettable: boolean; exportable: boolean }`، واجعل `QIMMAH_KEYS` و`HistorySnapshot` مشتقّين منه — يستحيل بعدها نسيان مفتاح.
2. أضف فورًا للـ 3 مفاتيح المفقودة إلى `QIMMAH_KEYS`.
3. وسّع `QimmahExport` ليشمل `onboardingProfile` و`steps` و`stepGoal` و`reminders` و`uiMode`، وارفع `EXPORT_VERSION` إلى 3 مع قراءة رجعية للنسخة 2.
4. أضف اختبارًا: كل مفتاح `qimmah:` مكتشَف بالبحث في `src/` يجب أن يكون في السجلّ، وإلا يفشل البناء.

**الجهد:** M

---

#### D-09 — الرفع للسحابة «آخر كاتب يفوز» بلا أي حارس زمني: جهاز قديم يمحو تقدّم جهاز حديث

**الملف:** `src/lib/syncService.ts:141, 153, 178`

**الدليل:**

```ts
// 1) جلسات التمرين
const { error } = await supabase.from('workout_sessions').upsert(rows, { onConflict: 'user_id,local_id' })
// 2) سجل أداء التمارين
const { error } = await supabase.from('exercise_history').upsert(exRows, { onConflict: 'user_id,exercise_id' })
// 4) اللقطات اليومية
const { error } = await supabase.from('daily_logs').upsert(dailyRows, { onConflict: 'user_id,date' })
```

الحقل `updated_at` يُحسب ويُرسل (`syncService.ts:139, 150, 175`) لكن **لا يُقارَن بأي شيء**: لا `.filter('updated_at', 'lt', …)` ولا دالة قاعدة بيانات تحسم التعارض. التعليق في رأس الملف يقول «القاعدة: عند تساوي updated_at يفوز المحلي» — وهي مطبَّقة في السحب فقط (`syncService.ts:230, 266`) لا في الرفع.

كذلك `measurement_logs` تُرفع بلا `updated_at` إطلاقًا (`syncService.ts:159-166`) رغم أنّ العمود موجود في المخطط (`SUPABASE-SCHEMA.sql:125`) — فيبقى على `default now()` أي «الآن» في كل مرة.

**الأثر — سيناريو ملموس (بعد وصل المزامنة، انظر D-02):**
1. المستخدم يتمرّن على الآيباد اليوم: سكوات 140 كجم رقم قياسي جديد → يُرفع لـ `exercise_history`.
2. يفتح الجوّال الذي لم يُفتح منذ أسبوعين (بياناته قديمة: أفضل سكوات 120 كجم).
3. `syncLocalToCloud` على الجوّال يعمل → `upsert` على `(user_id, 'squat')` **يستبدل** 140 بـ 120 في السحابة.
4. `daily_logs` أسوأ: مفتاح التعارض `(user_id, date)` — لقطة اليوم القديمة من الجوّال تمحو لقطة اليوم الكاملة من الآيباد (التمرين + الالتزامات + العلامات) لنفس التاريخ.

**الإصلاح المقترح:**
1. اجعل حسم التعارض في قاعدة البيانات لا في العميل: أضف تريغر `before update` على كل جدول يمنع الكتابة إن كان `new.updated_at <= old.updated_at` (أو `returning` مع `where excluded.updated_at > table.updated_at` عبر `on conflict do update … where`).
2. مرّر `updated_at` صريحًا لـ `measurement_logs` أيضًا.
3. اجعل `daily_logs` تُدمج على مستوى الحقل (jsonb merge في القاعدة) بدل استبدال المستند كاملًا، لأن اللقطة اليومية يكتبها ثلاثة مصادر مختلفة (`today.ts:69`, `commitmentTracking.ts:49`, `historyStore.ts:190`).
4. أضف اختبار تعارض: جهازان، كتابتان متقاطعتان، تأكيد أن الأحدث يفوز في الاتجاهين.

**الجهد:** L

---

#### D-10 — المتجر يعامل ترتيب الإدراج كترتيب زمني، والهجرة والسحب يكسران هذا الافتراض

**الملف:** `src/lib/historyStore.ts:183-193, 401-416` + `src/lib/syncService.ts:209-212` + المستهلكون

**الدليل:**

الكتابة تُقدِّم دائمًا في الأول، والقصّ يزيل من الذيل:

```ts
// historyStore.ts:185-187
const existing = getWorkoutSessions().filter((s) => s.id !== session.id)
const next = [session, ...existing].slice(0, 500)
writeJSON(HISTORY_KEYS.workoutSessions, next)
```

ولا يوجد أي `sort` بالتاريخ في الملف كلّه. والمستهلكون يعتمدون أن الفهرس 0 = الأحدث:

```ts
// workoutSessions.ts:65-67
export function lastSession(): WorkoutSession | undefined { return getWorkoutSessions()[0] }
```
```ts
// progressStats.ts:36-40 — «الأقدم→الأحدث»
const finished = loadSessions().filter((s) => s.finishedAt)
const points = finished.slice(0, limit).map(...)
return points.reverse()
```

لكن الهجرة تُلحق القديم في **الذيل** بلا فرز:

```ts
// historyStore.ts:406
const merged = [...current, ...oldSessions.filter((s) => !seen.has(s.id))]
writeJSON(HISTORY_KEYS.workoutSessions, merged)   // ← بلا slice ولا sort
```

والسحب السحابي يُقدِّم كل جلسة مسحوبة إلى **الرأس** واحدة تلو الأخرى:

```ts
// syncService.ts:209-212
;(cloudSessions ?? []).forEach((row) => {
  const s = row.data as WorkoutSession | null
  if (s && s.id && !localSessionIds.has(s.id)) saveWorkoutSession(s)   // ← prepend لكل واحدة
})
```

**الأثر — سيناريوهان:**
- **(أ) عرض خاطئ:** بعد سحب سحابي (أو بعد الهجرة على مستخدم قديم)، «آخر تمرين» في اللوحة يعرض جلسة من قبل ثلاثة أشهر، ورسم `recentVolumes` يعرض 8 نقاط عشوائية زمنيًا موسومة «الأقدم→الأحدث».
- **(ب) فقدان فعلي:** السحب يستدعي `saveWorkoutSession` لكل صف سحابي، وكل استدعاء يقصّ `.slice(0, 500)` من الذيل. مع 480 جلسة محلية + 60 سحابية، **آخر 40 جلسة محليّة (وهي الأقدم في الذيل) تُحذف** — وهي أيضًا العملية O(n²): 60 قراءة+كتابة لمصفوفة كاملة.

**الإصلاح المقترح:**
1. اجعل `getWorkoutSessions()` تُرجع مفروزة تنازليًا بـ `finishedAt ?? startedAt ?? date` — يصبح الترتيب ضمانًا لا صدفة.
2. طبّق القصّ **بعد** الفرز فقط (نحتفظ بالأحدث 500، لا بآخر 500 مُدرَجة).
3. في الهجرة والسحب: ادمج في مصفوفة واحدة في الذاكرة ثم اكتب مرّة واحدة (`setWorkoutSessions(mergedSorted)`) بدل `saveWorkoutSession` في حلقة.

**الجهد:** M

---

### 🟡 متوسط (Medium)

---

#### D-11 — التغذية والماء والمكملات والأدوية لا تُرفع ولا تُسحب رغم وجود جداولها

**الملف:** `src/lib/syncService.ts:128-180` مقابل `SUPABASE-SCHEMA.sql:149-201`

**الدليل:**

المخطط يعرّف الجداول:

```sql
create table if not exists public.nutrition_logs   ( ... unique (user_id, date) );
create table if not exists public.water_logs       ( ... unique (user_id, date) );
create table if not exists public.supplement_logs  ( ... unique (user_id, date) );
create table if not exists public.medication_logs  ( ... unique (user_id, date) );
create table if not exists public.workout_sets     ( ... );
create table if not exists public.profiles         ( ... data jsonb ... );
```

لكن `syncLocalToCloud` يعالج أربعة جداول فقط (تعليقه الخاص يعترف: «النطاق الحالي (أساسي)»): `workout_sessions`, `exercise_history`, `measurement_logs`, `daily_logs`. لا `nutrition_logs` ولا `water_logs` ولا `supplement_logs` ولا `medication_logs` ولا `profiles` (أي أن **التخصيص والخطة كلها لا تُرفع**).

**الأثر:** حتى بعد وصل المزامنة (D-02)، المستخدم الذي يفقد جهازه يستعيد التمارين والقياسات فقط، ويفقد: كل تاريخ التغذية، كل تاريخ الماء، سجل المكملات والأدوية، **وخطته المولّدة وملفه الشخصي بالكامل** — فيُطلب منه إعادة الإعداد من الصفر.

**الإصلاح المقترح:** أضف الجداول الأربعة بنفس نمط `daily_logs` (`onConflict: 'user_id,date'`) في الرفع والسحب، وأضف رفع `profiles` (`data: customization`, `onConflict: 'user_id'`). نفّذ ذلك بعد D-09 حتى لا تُضاعف مشكلة التعارض.

**الجهد:** M

---

#### D-12 — الهجرة: قراءة/كتابة للخريطة كاملة داخل حلقة، وبلا سقف حجم

**الملف:** `src/lib/historyStore.ts:409-415`

**الدليل:**

```ts
merged.forEach((s) => {
  if (s.finishedAt) {
    const logs = readJSON<ByDate<DailyLog>>(HISTORY_KEYS.dailyLogs, {})   // ← قراءة كاملة داخل الحلقة
    logs[s.date] = { ...(logs[s.date] ?? { date: s.date, updatedAt: nowISO() }), workoutCompleted: true, date: s.date, updatedAt: nowISO() }
    writeJSON(HISTORY_KEYS.dailyLogs, logs)                                // ← كتابة كاملة داخل الحلقة
  }
})
```

**الجانب الإيجابي المؤكَّد:** الهجرة **آمنة للتشغيل المتكرّر فعلًا** — كل خطوة إمّا تُزيل التكرار بالمعرّف (`seen` في الخطوتين 1 و3)، أو تدمج بأولوية الجديد (`{ ...oldHistory, ...current }` سطر 422)، أو تُحرس بـ `if (!logs[date])` (الخطوات 4-6). و`readJSON` يبتلع أخطاء التحليل فتتحمّل البيانات التالفة. علم `MIGRATION_FLAG` يُكتب أخيرًا (سطر 496)، فلو فشلت الكتابة تُعاد الهجرة في الإقلاع التالي بأمان.

**الأثر:** مستخدم قديم عنده 300 جلسة منتهية → 300 دورة قراءة+تحليل+كتابة+تسلسل لخريطة الأيام كاملة، كلها **متزامنة على الخيط الرئيسي أثناء أول render** (لأن `ensureMigrated` تُستدعى من `getWorkoutSessions` وهي تُستدعى من مُهيّئات الحالة). النتيجة تجميد ملحوظ (ثوانٍ) عند أول فتح بعد التحديث، مع احتمال إسقاط الصفحة من المتصفّح على جوّال ضعيف. كما أنّ `writeJSON(HISTORY_KEYS.workoutSessions, merged)` بلا `.slice(0, 500)` قد يكتب حجمًا يتجاوز الحصّة → تُبتلع الكتابة صامتًا (D-04) وتُفقد كل الجلسات المدمجة.

**الإصلاح المقترح:** اقرأ `dailyLogs` مرّة واحدة قبل الحلقة، حدّثها في الذاكرة، واكتبها مرّة واحدة بعدها. أضف `.slice(0, 500)` بعد فرز `merged` (انظر D-10). فكّر في تشغيل الهجرة داخل `useEffect` عند الإقلاع مع شاشة «جارٍ تحديث بياناتك» بدل تشغيلها ضمنيًا من أول قراءة.

**الجهد:** S

---

#### D-13 — تدفّق المصادقة الضمني (implicit) مع توجيه hash: رمز الوصول يمرّ في شريط العنوان ويصطدم بالراوتر

**الملف:** `src/lib/supabaseClient.ts:21-28` + `src/lib/appRoutes.ts:43-56`

**الدليل:**

```ts
// supabaseClient.ts:21-28 — لا flowType، وافتراضي supabase-js v2 هو implicit
client = createClient(url as string, anonKey as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,        // ← يلتقط الرموز من hash العنوان
    storageKey: 'qimmah:supabase-auth:v1',
  },
})
```

```ts
// appRoutes.ts:43-47 — الراوتر نفسه يقرأ hash
export function routeFromHash(): AppRoute | null {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(h) ? (h as AppRoute) : null
}
```

الإصدار المثبّت: `@supabase/supabase-js@2.108.2` (من `node_modules`). لا توجد قيمة `flowType` في أي مكان في `src/`، ولا مسار مخصّص لردّ نداء المصادقة في `ROUTES` (`appRoutes.ts:23-38`).

**الأثر — سيناريو ملموس:** المستخدم يسجّل حسابًا، ويصله بريد التأكيد. يضغط الرابط → يعود إلى `https://app/#access_token=eyJ…&refresh_token=…&type=signup`. رمز التحديث طويل العمر يصبح جزءًا من عنوان الصفحة: يُسجَّل في تاريخ المتصفّح، ويُلتقط في لقطات الشاشة، ويظهر لأي شخص ينظر للشاشة. وفي نفس اللحظة `routeFromHash()` لا تتعرّف على المقطع فتُرجع `null` → المستخدم يهبط على الشاشة الاحتياطية لا على «تم تأكيد بريدك». (لا توجد استغلالية عن بعد هنا لعدم وجود `dangerouslySetInnerHTML` في المستودع، لكن التعرّض المحلي حقيقي.)

**الإصلاح المقترح:**
1. اضبط `flowType: 'pkce'` في `createClient` — يستبدل الرموز في الـ hash بـ `?code=` قصير العمر يُبدَّل عبر الخادم.
2. أضف مسار `authCallback` إلى `ROUTES` وعالج نتيجة `detectSessionInUrl` صراحة، ثم `history.replaceState` لتنظيف العنوان.
3. اضبط Redirect URL في لوحة Supabase على المسار المخصّص.
> ملاحظة: هذا يحتاج تحققًا على الجهاز (يمسّ تدفّق تسجيل الدخول الحيّ)، فلا تدمجه بلا اختبار فعلي.

**الجهد:** M

---

#### D-14 — لا رؤوس أمان في إعدادات النشر

**الملف:** `netlify.toml` (كامل، 12 سطرًا) + `vercel.json` (كامل، 7 أسطر)

**الدليل:** الملفان يحتويان `build`/`publish`/`redirects` فقط. لا `[[headers]]` في Netlify ولا `"headers"` في Vercel — أي لا `Content-Security-Policy`، ولا `X-Frame-Options`/`frame-ancestors`، ولا `Referrer-Policy`، ولا `X-Content-Type-Options`.

**الأثر:** أي سكربت طرف ثالث يدخل الصفحة (عبر اعتمادية مخترقة مثلًا) يستطيع قراءة `localStorage` كاملًا — بما فيه جلسة Supabase تحت `qimmah:supabase-auth:v1` — وإرسالها لأي وجهة، بلا أي قيد شبكي. كذلك يمكن تضمين الموقع في `<iframe>` في صفحة تصيّد. وبما أنّ `registerStepBridge()` يعرّض `window.QimmahSteps.ingest` عالميًا (`main.tsx:11`, `stepCounter.ts:199-205`)، فأي سكربت في الصفحة يستطيع كتابة بيانات خطوات مزيّفة.

**الإصلاح المقترح:** أضف كتلة رؤوس في `netlify.toml` و`vercel.json`: `Content-Security-Policy` (يسمح بـ `'self'` + نطاق Supabase فقط في `connect-src`)، `X-Frame-Options: DENY`، `Referrer-Policy: strict-origin-when-cross-origin`، `X-Content-Type-Options: nosniff`، `Permissions-Policy` بتعطيل ما لا يُستخدم. هذا لا يمسّ أي كود تطبيق.

**الجهد:** S

---

### 🟢 منخفض (Low)

---

#### D-15 — `markPendingSync` علم أحادي الاتجاه لا يُمسح أبدًا

**الملف:** `src/lib/syncService.ts:74-77` + `src/views/SettingsView.tsx:80, 107`

**الدليل:**

```ts
export function markPendingSync(): void {
  writeMeta({ ...readMeta(), pending: true })
}
```

المسح الوحيد يحدث في `writeMeta({ lastSyncedAt, pending: false })` داخل `syncLocalToCloud` (سطر 183) و`pullCloudToLocal` (سطر 274) — وكلاهما غير مُستدعى (D-02). فيبقى `qimmah:sync:meta:v1` على `{"pending":true}` إلى الأبد.

**الأثر:** لا أثر مرئي اليوم لأن `getSyncStatus` غير مستخدَم أيضًا — لكنه فخّ جاهز: أول من يعرض حالة المزامنة في الواجهة سيرى «توجد تغييرات لم تُرفع بعد» دائمًا ولن يفهم السبب.

**الإصلاح المقترح:** إما وصل المزامنة (D-02) وإزالة العلم من مسارات لا ترفع شيئًا، أو حذف `markPendingSync` من `SettingsView` حتى تُوصل المزامنة فعليًا.

**الجهد:** S

---

#### D-16 — تكرار `dayStamp` في ثلاثة ملفات

**الملف:** `src/lib/historyStore.ts:14-19`، `src/lib/today.ts:16-21`، `src/lib/streaks.ts:8-13`

**الدليل:** ثلاث نسخ متطابقة حرفيًا من نفس الدالة. تعليق `historyStore.ts:13` يبرّرها: «مكرّر هنا لكسر الاعتماد الدائري مع today.ts».

**الأثر:** لا خطأ اليوم (التطبيقات الثلاثة متطابقة). لكن أي تعديل مستقبلي على معالجة التوقيت (مثلًا بداية اليوم عند 4 صباحًا لمن يتمرّن ليلًا، أو تثبيت المنطقة الزمنية) سيُطبَّق في ملف واحد ويترك اثنين — فتختلف السلاسل عن السجلّات عن اللقطات اليومية بيوم كامل.

**الإصلاح المقترح:** انقل `dayStamp` إلى `src/lib/dayStamp.ts` بلا أي اعتماديات (يكسر الدورة)، واستورده في الثلاثة.

**الجهد:** S

---

#### D-17 — نقاط إيجابية مؤكَّدة (لا تُغيَّر)

للحفاظ عليها أثناء الإصلاح:

- **كل الـ 17 `JSON.parse` محميّة بـ `try/catch`** — لا يوجد أي مسار انهيار من بيانات تالفة عند القراءة. (`historyStore.ts:99-104`, `today.ts:42-50`, `stepCounter.ts:54-60/73-85/96-105`, `customization.ts` داخل `loadCustomization`, `onboardingProfile.ts:55-74`, `SettingsView.tsx:66-84`, `CustomizationCenter.tsx:120-132`, وبقيتها.)
- **التطبيع الدفاعي عند القراءة ممتاز**: `normalizeSession/normalizeExercise/normalizeSet` (`historyStore.ts:129-173`) تضمن ألّا تنهار أي واجهة على جلسة تالفة، و`normalizeSession` ترفض السجلّات بلا `id`.
- **الهجرة idempotent فعلًا** (انظر D-12) ولا تحذف المفاتيح القديمة — استرجاع ممكن دائمًا.
- **لا أسرار**: لا شيء يطابق أنماط المفاتيح السرّية في `src/` أو ملفات الجذر؛ `.env` مستبعد في `.gitignore` والملف المتتبَّع الوحيد هو `.env.example` بقيم فارغة؛ `VITE_SUPABASE_ANON_KEY` عام بالتصميم وموثّق كذلك في `supabaseClient.ts:1-5`.
- **RLS مفعّل بالكامل** في `SUPABASE-SCHEMA.sql:240-264`: تمكين `row level security` + أربع سياسات (`select/insert/update/delete`) بشرط `auth.uid() = user_id` لكل جدول.
- **`clampSteps`/`clampGoal`** (`stepCounter.ts:37-48`) و`normalizeSource` (سطر 25) تصدّ القيم الشاذّة قبل الحفظ — نموذج يُحتذى لبقية الوحدات.
- **`getSupabase()` لا يرمي أبدًا** ووضع الضيف مسار أول-درجة في كل الطبقات — أساس سليم للـ local-first.

---

## خطة تنفيذ مقترحة بخطوات آمنة

المبدأ: **لا تلمس الواجهة قبل إغلاق الموجة 0 والموجة 1.** كل موجة على فرع مستقل، مع `npm run typecheck && npm run build` أخضر قبل الدمج.

### الموجة 0 — إيقاف النزيف فورًا (نصف يوم، لا مخاطرة)
| # | العمل | النتيجة |
|---|---|---|
| 0.1 | صحّح `cloudNote` عربي/إنجليزي ليطابق الواقع + أضف تذكير تصدير في الإعدادات | D-02 (الشقّ الخطر) |
| 0.2 | أضف مفاتيح الخطوات الثلاثة إلى `QIMMAH_KEYS` | D-08 (أ) |
| 0.3 | أضف رؤوس الأمان في `netlify.toml` و`vercel.json` | D-14 |
| 0.4 | أزل `markPendingSync()` من `SettingsView` (أو علّقه بـ TODO مربوط بـ D-02) | D-15 |

**بوابة:** بناء أخضر + تحقّق بصري أن نص الحساب صار صادقًا.

### الموجة 1 — صلابة التخزين (١–٢ يوم)
| # | العمل | النتيجة |
|---|---|---|
| 1.1 | `src/lib/safeStorage.ts` + قاعدة ESLint تمنع `localStorage` المباشر خارجها | D-03 |
| 1.2 | أخرج كل كتابة من دوال القراءة الأربع (`loadToday`, `readStorage`, `loadWellnessToday`, `loadCommitmentsToday`) | D-03 |
| 1.3 | `writeJSON` تُرجع `boolean`؛ ثمّرها حتى `WorkoutView` مع شريط فشل صريح | D-04 |
| 1.4 | `ErrorBoundary` حول `<App />` مع زر تصدير طوارئ | D-03 |
| 1.5 | `src/lib/storageKeys.ts` = سجلّ المفاتيح الوحيد + اختبار «لا مفتاح خارج السجلّ» | D-08 |

**بوابة:** اختبار يدوي بحصّة مصطنعة ممتلئة (املأ `localStorage` بسلسلة كبيرة) → التطبيق يقلع ويعرض رسالة، لا شاشة بيضاء.

### الموجة 2 — مصدر حقيقة واحد (١–٢ يوم)
| # | العمل | النتيجة |
|---|---|---|
| 2.1 | `measurementLog.ts` يصبح غلافًا فوق `historyStore` (سقف واحد، مفتاح واحد) | D-06, D-07 |
| 2.2 | أضف `log` إلى `NutritionLog` واحفظه؛ أزل الكتابة التدميرية في `readStorage` | D-05 |
| 2.3 | `getWorkoutSessions` تفرز بالتاريخ؛ القصّ بعد الفرز؛ الهجرة والسحب يكتبان مرّة واحدة | D-10, D-12 |
| 2.4 | وسّع `QimmahExport` (v3) ليشمل `onboardingProfile` + الخطوات + التذكيرات + `uiMode`، مع قراءة رجعية v2 | D-08 (ب) |

**بوابة (حرجة):** دورة كاملة على الجهاز — صدّر نسخة → أعد الضبط → استورد → تأكّد أن **القياسات والتغذية والخطوات وملف الإعداد** كلها عادت. هذه البوابة هي الاختبار الحقيقي لهذه الموجة.

### الموجة 3 — عزل الحسابات (٢–٣ أيام، تحتاج مراجعة زياد قبل البدء)
| # | العمل | النتيجة |
|---|---|---|
| 3.1 | `scopedKey(base, ownerId)` فوق سجلّ المفاتيح؛ كل الوحدات تمرّ به | D-01 |
| 3.2 | هجرة لمرّة واحدة: المفاتيح العامّة الحالية → نطاق `guest` (بلا حذف) | D-01 |
| 3.3 | `AuthProvider` يعيد التهيئة عند تغيّر `user.id`؛ `qimmah:lastOwner:v1` + شاشة «بيانات حساب آخر» | D-01 |

**بوابة:** حسابان على نفس المتصفّح؛ تأكيد أن الثاني لا يرى ولا بايت من الأول، وأن الرجوع للأول يستعيد بياناته كاملة.

### الموجة 4 — المزامنة الحقيقية (اختيارية، بعد قرار المالك)
لا تبدأ قبل اكتمال الموجات 0–3.
| # | العمل | النتيجة |
|---|---|---|
| 4.1 | حسم التعارض في القاعدة (`on conflict … where excluded.updated_at > …`) + `updated_at` للقياسات | D-09 |
| 4.2 | أضف `nutrition/water/supplement/medication_logs` + `profiles` للرفع والسحب | D-11 |
| 4.3 | صِل `fullSync` بـ `SIGNED_IN` و`visibilitychange`، واعرض `getSyncStatus` | D-02 |
| 4.4 | `flowType: 'pkce'` + مسار ردّ نداء مخصّص + تنظيف العنوان | D-13 |
| 4.5 | وحّد `dayStamp` في ملف واحد | D-16 |

**بوابة:** اختبار جهازين حقيقي (كتابة متقاطعة، وضع طيران، ثم عودة اتصال) — الأحدث يفوز في الاتجاهين ولا يختفي شيء.

---

### توصية ختامية

طبقة البيانات **مبنيّة جيّدًا من حيث التصميم** (local-first، تطبيع دفاعي، هجرة idempotent، RLS سليم، بلا أسرار) لكنها **غير مكتملة العقود**: الكتابة لا تُبلّغ عن فشلها، والمفاتيح ليست مسجَّلة في مكان واحد، والمزامنة موعودة وغير موصولة، والمخازن مزدوجة في موضعين.

قبل الانتقال للعمل على الواجهة، الحدّ الأدنى غير القابل للتفاوض هو **الموجة 0 + الموجة 1 + الموجة 2**. هذه الثلاث تغلق كل مسارات فقدان البيانات المؤكَّدة (D-02 نصًّا، D-03، D-04، D-05، D-06، D-07، D-08) دون لمس أي بكسل في الواجهة. الموجة 3 (عزل الحسابات) ضرورية قبل أي إطلاق تجاري يسمح بأكثر من مستخدم على جهاز.
