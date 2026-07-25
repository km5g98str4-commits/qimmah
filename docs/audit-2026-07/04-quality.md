# تدقيق «قِمّة» — جودة الكود والأداء وسلامة الأنواع

**الفرع:** `feature/p25-steps-health` · **HEAD:** `64702e0` · **التاريخ:** 2026-07-25
**النطاق:** 190 ملف `.ts/.tsx` داخل `src/` (تم تجاهل `dist/` و`node_modules/`)
**العدسة:** سلامة الأنواع · الأداء وحجم الحزمة · التحميل الكسول · إمكانية الوصول على مستوى الكود · اتساق RTL · معالجة الأخطاء · الاختبارات

---

## ملخّص تنفيذي (٥ أسطر)

1. **الأساس سليم:** `npm run typecheck` و`eslint` يمرّان بصفر أخطاء، لا يوجد `any` واحد في المشروع، و**التزام RTL مثالي 100%** — صفر استخدام لـ `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` في كامل `src/`.
2. **الخطر الأكبر ليس نوعيًا بل تشغيليًا:** لا يوجد **Error Boundary** في المشروع إطلاقًا، بينما تُقرأ بيانات المستخدم من `localStorage` عبر 17 موضع `JSON.parse(raw) as T` بلا تحقّق — أي بيانات تالفة = شاشة بيضاء دائمة وفقدان وصول المستخدم لتطبيقه المحلي.
3. **مسار فقدان بيانات صامت:** `writeJSON` يبتلع خطأ امتلاء التخزين، و`persistFinishedSession` لا يُرجع نجاحًا/فشلًا، و`WorkoutView.finish()` يعرض شاشة «أحسنت» بلا شرط — أي أن تمرينًا كاملًا قد يضيع بينما تُهنّئ الواجهة المستخدم.
4. **الحزمة 1,012 kB في ملف واحد** (272 kB مضغوطة) مع تحذير صريح من Vite، وبلا `React.lazy`/`Suspense`/`import()` ديناميكي واحد. المساهمون الكبار: Supabase 203 kB · `src/data` 386 kB · `config/strings` 51 kB (نصفها إنجليزي غير قابل للوصول).
5. **صفر اختبارات:** لا `vitest` ولا `jest` ولا سكربت `test` ولا ملف اختبار واحد — بينما `planGenerator.ts` (41 KB، قلب المنتج) و`historyStore.ts` (تطبيع + ترحيل بيانات) بلا أي شبكة أمان.

---

## النتائج مرتّبة حسب الخطورة

---

### 🔴 Q-01 — لا يوجد Error Boundary: أي خطأ رندر = شاشة بيضاء دائمة

**الملف:** `src/main.tsx:14-24` (وكامل المشروع)

**الدليل:**

```bash
$ grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" src
# لا نتائج — صفر
```

```tsx
// src/main.tsx:16-24
createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <CustomizationProvider>
        <App />
        <SplashScreen />
      </CustomizationProvider>
    </AuthProvider>
  </StrictMode>,
)
```

لا غلاف التقاط أخطاء على أي مستوى: لا حول `<App/>`، ولا حول أي `View`، ولا حول المكوّنات الثقيلة (`BodyModel3D`, `WorkoutMode`).

**الأثر:**
React 18 يفكّ تركيب الشجرة كاملة عند خطأ رندر غير ملتقط. النتيجة **شاشة بيضاء**. ولأن التطبيق **يحفظ على الجهاز فقط**، لا يوجد «تحديث الصفحة يصلحها» — إن كان السبب بيانات تالفة في `localStorage` فستُقرأ نفس البيانات في كل إقلاع، فيبقى المستخدم محبوسًا خارج تمارينه وقياساته إلى الأبد بلا رسالة ولا مخرج. هذا يجعل Q-02 وQ-03 قاتلَين بدل أن يكونا مزعجَين.

**الإصلاح المقترح:**
1. `src/components/ErrorBoundary.tsx` — مكوّن Class واحد مع `getDerivedStateFromError` + `componentDidCatch`، يعرض بطاقة عربية: «صار خلل غير متوقّع» + زر «إعادة المحاولة» + زر **«إصلاح البيانات المحلية»** يستدعي `resetQimmah` (موجود مسبقًا في `src/lib/resetQimmah.ts`) + زر «تصدير بياناتي» قبل المسح.
2. لفّ `<App/>` في `main.tsx`، **و** لفّ كل `View` داخل `MobileShell` بحدود منفصلة حتى لا يُسقط عطلٌ في تبويب «التقدّم» تبويبَ «التمرين» معه.

**الجهد:** S

---

### 🔴 Q-02 — فقدان تمرين مكتمل بصمت مع عرض شاشة نجاح

**الملفات:** `src/lib/historyStore.ts:107-114` · `src/lib/finishWorkout.ts:20-46` · `src/views/WorkoutView.tsx:44-61`

**الدليل:**

```ts
// src/lib/historyStore.ts:107-114 — الفشل يُبتلع ولا يُبلَّغ عنه
function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}
```

```ts
// src/lib/finishWorkout.ts:20 — التوقيع لا يحمل أي إشارة نجاح
export function persistFinishedSession(session: WorkoutSession): SessionPR[] {
  ...
  addSession(session)      // → writeJSON — قد يفشل بصمت
  saveHistory(history)     // → writeJSON — قد يفشل بصمت
  return prs
}
```

```tsx
// src/views/WorkoutView.tsx:44-61 — النجاح غير مشروط
const finish = (session: WorkoutSession) => {
  const prs = persistFinishedSession(session)
  ...
  setActiveDay(null)
  setSummary({ session, prs: prLabels, streakWeeks: weekly.streakWeeks, nextDayLabel })
}
```

**الأثر:**
`localStorage.setItem` يرمي `QuotaExceededError` عند الامتلاء، **ويرمي فورًا** في Safari الخاص (Private Browsing) وفي بعض إعدادات WKWebView على iOS. المشروع يحتفظ بـ **500 جلسة** بكامل تفاصيل المجموعات (`historyStore.ts:186 slice(0, 500)`) إضافةً إلى `dailyLogs` و`stepLog` و`measurementLogs` و`exerciseHistory` — بلوغ الحدّ وارد عمليًا. عندها: التمرين يضيع، السلسلة لا تتقدّم، الأرقام القياسية لا تُسجَّل، **والمستخدم يرى شاشة ملخّص تهنّئه**. هذه أسوأ حالة ممكنة لتطبيق لياقة: خسارة ثقة كاملة لأن الواجهة كذبت.

**الإصلاح المقترح:**
1. غيّر `writeJSON(key, value): void` → `writeJSON(key, value): boolean` (`return true` بعد النجاح، `return false` في `catch`).
2. مرّر الإشارة: `addSession`/`saveExerciseHistory` تُرجع `boolean`، و`persistFinishedSession` تُرجع `{ saved: boolean; prs: SessionPR[] }`.
3. في `WorkoutView.finish()`: إن `!saved` اعرض شاشة تحذير حمراء «ما قدرنا نحفظ التمرين — مساحة التخزين ممتلئة» مع زرَّي **«تصدير الجلسة كملف»** و«حذف جلسات قديمة»، ولا تعرض الملخّص التهنئي.
4. أضف تشذيبًا استباقيًا: عند فشل الكتابة، احذف أقدم 50 جلسة وأعد المحاولة مرة واحدة قبل إعلان الفشل.

**الجهد:** M

---

### 🔴 Q-03 — 18 من 21 كاتب `localStorage.setItem` بلا `try/catch`

**الملفات:** `today.ts:52,58` · `commitmentTracking.ts:33,39` · `wellnessTracking.ts:33,39` · `nutritionTracking.ts:74,84` · `measurementLog.ts:20` · `stepCounter.ts:65,90,110` · `customization.ts:258` · `onboarding.ts:46` · `appPreferences.ts:28` · `reminderPrefs.ts:38`

**الدليل:**

```ts
// src/lib/today.ts:56-59 — بلا حماية
export function saveToday(state: TodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TODAY_KEY, JSON.stringify(state))
}
```

```ts
// src/lib/measurementLog.ts:18-21 — بلا حماية
export function saveLogs(logs: MeasurementLog[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MEASUREMENT_LOGS_KEY, JSON.stringify(logs))
}
```

المقارنة تُظهر أن الفريق **يعرف** النمط الصحيح لكنه لم يُعمَّم — ثلاثة مواضع فقط محميّة: `historyStore.ts:107-114`, `onboardingProfile.ts:114`, `syncService.ts:68`، و`uiMode.ts:36-42` (الوحيد المحمي خارج ذلك).

**الأثر:**
كل هذه الدوال تُستدعى من **معالِجات أحداث React** (تعليم مهمة اليوم، إضافة ماء، تسجيل خطوات، حفظ قياس). استثناء غير ملتقط داخل معالِج حدث في React 18 يصعد إلى الأعلى؛ ومع غياب Error Boundary (Q-01) ⇒ **شاشة بيضاء لمجرد ضغطة زر «شربت كوب ماء»**. في Safari الخاص هذا يحدث من أول نقرة، لا عند الامتلاء فقط.

**الإصلاح المقترح:**
أنشئ `src/lib/safeStorage.ts` بواجهة واحدة موحّدة:

```ts
export function safeSet(key: string, value: unknown): boolean
export function safeGet<T>(key: string, fallback: T, validate?: (raw: unknown) => T): T
```

ثم استبدل كل الوصول المباشر لـ `window.localStorage` بها (48 موضعًا)، وأضف قاعدة ESLint `no-restricted-globals`/`no-restricted-properties` تمنع `localStorage` المباشر خارج `safeStorage.ts` حتى لا يتكرّر الانحراف.

**الجهد:** M

---

### 🔴 Q-04 — `JSON.parse(raw) as T`: 17 تأكيد نوع غير مُتحقَّق على بيانات غير موثوقة

**الملفات:** `measurementLog.ts:12` · `historyStore.ts:101` · `today.ts:45` · `commitmentTracking.ts:26` · `wellnessTracking.ts:26` · `nutritionTracking.ts:56` · `onboarding.ts:21` · `customization.ts:198` · `onboardingProfile.ts:90` · `reminderPrefs.ts:22` · `syncService.ts:59` · `appPreferences.ts:19` · `stepCounter.ts:57,76,99` · `CustomizationCenter.tsx:121` · `SettingsView.tsx:67`

**الدليل — الأخطر (`measurementLog.ts:8-16`):**

```ts
export function loadLogs(): MeasurementLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(MEASUREMENT_LOGS_KEY)
    return raw ? (JSON.parse(raw) as MeasurementLog[]) : []   // ← لا فحص Array.isArray
  } catch {
    return []
  }
}
```

والمستهلكون يفترضون مصفوفة فورًا:

```ts
// src/views/ProgressView.tsx:26     → const logs = loadLogs()   ثم trendFor(logs, ...)
// src/lib/measurementLog.ts:32      → loadLogs().filter((l) => l.id !== id)
// src/lib/measurementLog.ts:25      → [log, ...loadLogs()].slice(0, 200)
```

المقارنة تُظهر أن المشروع **يملك** المعالجة الصحيحة في مكان واحد فقط:

```ts
// src/lib/historyStore.ts:176-179 — النمط الصحيح
const raw = readJSON<unknown[]>(HISTORY_KEYS.workoutSessions, [])
if (!Array.isArray(raw)) return []
return raw.map(normalizeSession).filter(Boolean) as WorkoutSession[]
```

و`stepCounter.ts:76-85` أيضًا يطبّع فعليًا (`clampSteps` على كل قيمة). البقية تُصدّق الـ JSON على عِلّاته.

**الأثر:**
`try/catch` يحمي من JSON غير صالح **فقط**. JSON صالح بشكل خاطئ يمرّ سليمًا: لو صار المفتاح `{"a":1}` (استيراد ملف خاطئ عبر `SettingsView.tsx:67`، إصدار أقدم، تعديل يدوي، تعارض مزامنة) فإن `loadLogs()` تُعيد كائنًا، و`.filter is not a function` يُرمى **أثناء الرندر** ⇒ مع Q-01 = شاشة بيضاء دائمة، لأن نفس البيانات تُقرأ في كل إقلاع.

**الإصلاح المقترح:**
1. أضف حارسًا صغيرًا لكل قارئ — لا حاجة لمكتبة تحقّق خارجية (قاعدة الاعتماديات في `.claude/rules/security.md`):

```ts
export function loadLogs(): MeasurementLog[] {
  const raw = safeGet<unknown>(MEASUREMENT_LOGS_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeMeasurementLog).filter(Boolean) as MeasurementLog[]
}
```

2. عمّم `normalizeX` على غرار `normalizeSession`/`normalizeSet` الموجودة في `historyStore.ts:127-160`.
3. **الأولوية:** `measurementLog.ts` ثم `today.ts` ثم `customization.ts` (الأخير يغذّي كل الواجهة عبر Context).

**الجهد:** M

---

### 🔴 Q-05 — صفر اختبارات وصفر بنية اختبار

**الملف:** `package.json:8-14`

**الدليل:**

```bash
$ find . -path ./node_modules -prune -o -name "*.test.*" -print -o -name "*.spec.*" -print
# لا نتائج

$ grep -i "vitest\|jest\|testing-library\|playwright\|cypress" package.json
NONE
```

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "typecheck": "tsc -b --noEmit"
}
```

**الأثر:**
190 ملف مصدر بلا اختبار واحد. أخطر ثلاثة أجزاء بلا شبكة أمان:

| الملف | الحجم | لماذا هو الأخطر |
|---|---|---|
| `src/lib/planGenerator.ts` | 41 KB | **قلب المنتج** — يولّد خطة التمرين والتغذية. `pickForSlot` (سطر 348) و`buildDayExercises` منطق تفريعي معقّد؛ انحدار صامت هنا يعني خطة رديئة لكل مستخدم جديد، ولن يكشفه لا `tsc` ولا `eslint`. |
| `src/lib/historyStore.ts` | 23 KB | التطبيع (`normalizeSession`) + **الترحيل لمرة واحدة** (`ensureMigrated`, سطر 393). خطأ هنا = فقدان تاريخ المستخدم بلا رجعة، ويُنفَّذ مرة واحدة فقط فلا فرصة لإصلاحه لاحقًا. |
| `src/lib/calculators.ts` + `validation.ts` | 12 KB + 6 KB | حسابات BMR/TDEE/الماء وحدود الإدخال. أرقام خاطئة في تطبيق لياقة = مخاطرة على المستخدم مباشرة. |

**الإصلاح المقترح:**
1. `npm i -D vitest @vitest/coverage-v8` + `"test": "vitest run"` (Vitest يعيد استخدام `vite.config.ts` — بلا إعداد إضافي، وبلا jsdom في المرحلة الأولى).
2. ابدأ باختبارات **منطق خالص فقط** (لا DOM، لا مكوّنات) — أعلى عائد لأقل جهد:
   - `planGenerator`: لكل (هدف × خبرة × أيام) → الخطة غير فارغة، لا تمرين مكرّر في اليوم، عدد الأيام مطابق.
   - `historyStore`: `normalizeSession` على مدخلات تالفة (null، مصفوفة، كائن ناقص) → لا يرمي أبدًا؛ `ensureMigrated` idempotent.
   - `calculators`: قيم مرجعية معروفة + حدود.
   - `validation`: كل حقل عند min-1 وmax+1.
3. أضف `npm run typecheck && npm run lint && npm test` إلى بوابة التسليم في `CLAUDE.md`.

**الجهد:** M (البنية + الحزمة الأولى) / L (تغطية جيّدة)

---

### 🟠 Q-06 — حزمة واحدة 1,012 kB بلا أي تقسيم كود

**الملفات:** `vite.config.ts:28-46` · `src/App.tsx:2-15`

**الدليل — مخرجات البناء الفعلية:**

```
$ npm run build
dist/assets/index-caTgjF6t.js   1,012.24 kB │ gzip: 272.05 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
```

```bash
$ grep -rn "React.lazy\|lazy(\|Suspense\|import(" src --include="*.ts" --include="*.tsx"
# لا نتائج — صفر تحميل كسول في المشروع
```

كل الشاشات مستوردة استيرادًا ساكنًا في `App.tsx:2-15` (15 عرضًا) رغم أن أول شاشة يراها الزائر هي `StartView` فقط.

**تحليل مساهمة الحزمة** (عبر esbuild metafile على نفس نقطة الدخول — الإجمالي 1,313 KB بمقياس esbuild؛ النِّسب هي المهمّة):

| النظام الفرعي | بايت (مصغّر) | النسبة |
|---|---:|---:|
| Supabase (`auth-js` + `realtime-js` + `phoenix` + `storage-js` + `postgrest-js`) | **203,086** | 15.5% |
| كامل `src/data/` | **386,527** | 29.4% |
| `setup`/`customizer`/`planGenerator` | 138,958 | 10.6% |
| `foodItems` + بيانات الوجبات | 108,672 | 8.3% |
| `exercises` + `exerciseGuidance` + `exerciseDemos` | 106,436 | 8.1% |
| المكتبات + منتقياتها (`medications`, `supplementLibrary`, `*LibraryPicker`) | 110,870 | 8.4% |
| `dailyPhrases` | 61,757 | 4.7% |
| `config/strings` | 51,037 | 3.9% |
| `body3d` (`BodyModel3D` + mesh + render + anatomy) | 35,152 | 2.7% |
| `react-dom` | 130,301 | 9.9% |

**الأثر:**
الجمهور الأساسي جوّال سعودي/خليجي (`CLAUDE.md`: Mobile-first). 272 kB مضغوطة على 4G متوسط ≈ 1.5–2.5 ثانية تنزيل + ~600–900 ms تحليل/تنفيذ JS على هاتف متوسط — قبل ظهور أول بكسل مفيد. والزائر الذي يفتح صفحة البداية فقط يدفع ثمن مكتبة الأدوية (52 KB) ومحرّك 3D (35 KB) وقاعدة الأطعمة (92 KB) التي لن يراها أبدًا.

**الإصلاح المقترح — بالترتيب حسب العائد/المخاطرة:**

| # | الإجراء | التوفير التقديري | المخاطرة |
|---|---|---:|---|
| 1 | `manualChunks` في `vite.config.ts`: عزل `vendor-supabase`, `vendor-react`, `data-food`, `data-wellness` | يقسّم فقط، لا يقلّل | صفر |
| 2 | `React.lazy` لـ `SetupView` + `DemoView` + `SettingsView` + `PrivacyView`/`TermsView`/`ContactView` | ~140 KB خارج المسار الأول | منخفضة |
| 3 | `React.lazy` لـ `BodyModel3D` داخل `ProgressView.tsx:132` | ~35 KB | منخفضة |
| 4 | استيراد ديناميكي لبيانات الأطعمة داخل `QuickMealLogger` | ~92 KB | منخفضة |
| 5 | Q-07 (Supabase) | ~203 KB | متوسطة |
| 6 | Q-08 (`dailyPhrases`) + Q-09 (`strings` الإنجليزية) | ~55 KB | منخفضة |

مع `Suspense` واحد في `App.tsx` يعرض `SplashScreen` الموجود مسبقًا كـ `fallback` — الغلاف البصري جاهز.

**الجهد:** M

---

### 🟠 Q-07 — Supabase (203 KB = 15.5% من الحزمة) يُحمَّل ويُنشَأ عند الإقلاع دائمًا

**الملف:** `src/lib/supabaseClient.ts:7-33`

**الدليل:**

```ts
// src/lib/supabaseClient.ts:7 — استيراد ساكن على مستوى الوحدة
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let client: SupabaseClient | null = null

if (isSupabaseConfigured()) {          // ← يُنفَّذ وقت تحميل الوحدة
  try {
    client = createClient(url as string, anonKey as string, { ... })
  } catch {
    client = null
  }
}
```

توزيع الـ 203 KB: `auth-js` 97,442 · `realtime-js` 31,042 · `phoenix` 25,140 · `storage-js` 21,187 · `postgrest-js` 15,873 · `supabase-js` 9,601.

**الأثر:**
- الاستيراد **ساكن**، فالكود يدخل الحزمة سواء ضُبط Supabase أم لا. المستخدم الضيف (المسار الافتراضي حسب `App.tsx`) يدفع 203 KB كاملة مقابل صفر فائدة.
- **`realtime-js` + `phoenix` = 56 KB لخاصية لا يستخدمها المشروع إطلاقًا** — لا وجود لـ `.channel()` أو `.subscribe()` في `syncService.ts`؛ النطاق المعلن (`syncService.ts:5-11`) هو `upsert`/`select` فقط.
- `storage-js` 21 KB لتخزين ملفات غير مستخدم أيضًا.

**الإصلاح المقترح:**
1. حوّل `getSupabase()` إلى غير متزامنة مع استيراد ديناميكي وتخزين مؤقّت:

```ts
let clientPromise: Promise<SupabaseClient | null> | null = null

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(url!, anonKey!, { auth: { ... } }))
      .catch(() => null)
  }
  return clientPromise
}
```

`isSupabaseConfigured()` يبقى متزامنًا (يقرأ متغيّرات البيئة فقط) فلا تتأثّر واجهات الحالة في `SettingsView`/`syncService.getSyncStatus`.
2. مستدعيا `getSupabase()` هما `authContext.tsx` و`syncService.ts` فقط — وكلاهما داخل سياق غير متزامن أصلًا.
3. إن تعذّر ذلك، فعلى الأقل عزلها في `manualChunks` باسم `vendor-supabase` لتُحمَّل بالتوازي وتُخزَّن في الكاش مستقلة عن كود التطبيق.

**الجهد:** M

---

### 🟠 Q-08 — قراءات `localStorage` متزامنة في كل رندر على المسارات الساخنة

**الملفات:** `src/components/WorkoutMode.tsx:161` · `src/sections/WorkoutPlanSection.tsx:37` · `src/sections/Today.tsx:46` · `src/sections/RecentWorkout.tsx:31`

**الدليل — أ) `WorkoutMode` (شاشة النادي، الأخطر):**

```tsx
// src/components/WorkoutMode.tsx:161-162 — في جسم المكوّن، بلا useMemo
const rec = getRecord(exId)
const hint = progressionHint(rec)
```

سلسلة الاستدعاء:
```ts
// exerciseHistory.ts:32  getRecord() → loadHistory()
// exerciseHistory.ts:25  loadHistory() → getExerciseHistory()
// historyStore.ts:213    getExerciseHistory() → ensureMigrated() + readJSON(...)
// historyStore.ts:97-105 readJSON() → localStorage.getItem() + JSON.parse()
```

ويُدمج ذلك مع مؤقّت الراحة الذي يفرض رندرًا كل ثانية:

```tsx
// src/components/WorkoutMode.tsx:108-118
const [timer, setTimer] = useState<{ left: number; running: boolean }>({ left: 0, running: false })
useEffect(() => {
  if (!timer.running) return
  if (timer.left <= 0) { setTimer((p) => ({ ...p, running: false })); return }
  const id = window.setTimeout(() => setTimer((p) => ({ ...p, left: p.left - 1 })), 1000)
  return () => window.clearTimeout(id)
}, [timer.running, timer.left])
```

**النتيجة:** أثناء كل راحة (60–180 ثانية بعد **كل** مجموعة) تُنفَّذ `localStorage.getItem` + `JSON.parse` لكامل سجل التمارين **مرة كل ثانية**، ويُعاد رندر مكوّن بطول ~800 سطر يحوي كل حقول الإدخال والـ Steppers.

**ب) `WorkoutPlanSection` — قراءة داخل حلقة رندر:**

```tsx
// src/sections/WorkoutPlanSection.tsx:36-38
{day.exercises.map((pe) => {
  const rec = getRecord(pe.exerciseId)   // ← getItem + JSON.parse لكل تمرين
  const ex = getExercise(pe.exerciseId)
```

مع 5 أيام × 6 تمارين = **30 قراءة + 30 تحليل JSON** في كل رندر واحد.

**ج) `Today` — تطبيع 500 جلسة في كل رندر:**

```tsx
// src/sections/Today.tsx:46
const finishedToday = todaysFinishedSession()   // بلا useMemo
```
```ts
// workoutSessions.ts:70-73 → getWorkoutSessions() → readJSON + raw.map(normalizeSession)
```
و`Today` يُعاد رندره عند كل تبديل مهمة/إضافة ماء/تعليم مكمّل (يستهلك 4 هوكات حالة: `useToday`, `useNutritionToday`, `useWellnessToday`, `useCommitmentsToday`).

**د) `RecentWorkout.tsx:31** — `lastSession()` بلا `useMemo` (بينما `insights` تحته **مُذكَّرة** بشكل صحيح — دليل على أن السهو غير مقصود).

**الأثر:**
`localStorage` واجهة **متزامنة تحجب الخيط الرئيسي**. `JSON.parse` لسجل بحجم مئات الكيلوبايتات يكلّف 5–30 ms على هاتف متوسط. النتيجة: تلعثم واضح في شاشة التمرين النشط تحديدًا — وهي الشاشة التي يُفترض أن يستخدمها المستخدم وهو واقف في النادي بين المجموعات. هذا يفسّر مباشرةً ملاحظة «feels like wrapped website» المسجّلة في مراجعة الجهاز.

**الإصلاح المقترح:**
1. **كاش في الذاكرة داخل `historyStore.ts`** (أعلى عائد، تغيير موضعي واحد):
```ts
let historyCache: ExerciseHistory | null = null
export function getExerciseHistory(): ExerciseHistory {
  ensureMigrated()
  if (!historyCache) historyCache = readJSON<ExerciseHistory>(HISTORY_KEYS.exerciseHistory, {})
  return historyCache
}
export function saveExerciseHistory(h: ExerciseHistory): void {
  ensureMigrated(); historyCache = h; writeJSON(HISTORY_KEYS.exerciseHistory, h)
}
```
نفس النمط لـ `getWorkoutSessions` (مع إبطال الكاش في `saveWorkoutSession`/`setWorkoutSessions`).
2. لفّ القراءات في المكوّنات بـ `useMemo`: `Today.tsx:46` بـ `[]`، `RecentWorkout.tsx:31` بـ `[]`، و`WorkoutMode.tsx:161` بـ `[exId]`.
3. في `WorkoutPlanSection`، اقرأ السجل **مرة واحدة** فوق الحلقة: `const history = useMemo(() => loadHistory(), [])` ثم `history[pe.exerciseId]`.
4. اعزل المؤقّت في مكوّن `<RestTimer/>` مستقل، فلا يُعاد رندر شجرة التمرين كل ثانية.

**الجهد:** M

---

### 🟠 Q-09 — `src/data` كاملة (386 KB = 29% من الحزمة) تُحمَّل دائمًا

**الملفات:** `src/data/dailyPhrases.ts` · `src/data/medications.ts` · `src/data/supplementLibrary.ts` · `src/data/foodItems.ts`

**الدليل — أ) `dailyPhrases` = 61,757 بايت مقابل جملة واحدة يوميًا:**

```ts
// src/data/dailyPhrases.ts:10 — ~440 عبارة عربية
export const dailyPhrases: string[] = [
  'ابدأ اليوم. الخطوة الأولى أهم خطوة.',
  ...
]
// السطر 468
export function phraseForDay(d: Date = new Date()): string
```

المستهلك الوحيد:
```tsx
// src/views/DashboardView.tsx:14 + :91
import { phraseForDay } from '@/data/dailyPhrases'
const phrase = useMemo(() => phraseForDay(), [])
```

**62 KB لعرض سطر واحد** — أكبر من `exercises.ts` (60 KB) الذي يحمل مكتبة التمارين كاملة.

**ب) بيانات المكتبات (110,870 بايت) لا تُستخدم إلا في الإعداد:**

```bash
$ grep -rn "data/medications'" src
src/components/MedicationLibraryPicker.tsx:5   ← منتقي داخل SetupView فقط
src/lib/wellnessPlan.ts:4                      ← getMedication(id) لعرض الاسم

$ grep -rn "data/supplementLibrary'" src
src/components/SupplementLibraryPicker.tsx:5
src/lib/wellnessPlan.ts:3
```

**ج) `foodItems.ts` = 92,098 بايت (273 صنفًا) لتبويب التغذية وحده:**
```tsx
// src/components/nutrition/QuickMealLogger.tsx:4
import { FOOD_ESTIMATE_NOTE, searchFood, type FoodItem } from '@/data/foodItems'
```

**الأثر:**
مستخدم أنهى الإعداد ولا يفتح إلا الرئيسية والتمرين يحمّل 110 KB مكتبات مكمّلات/أدوية + 92 KB أطعمة في **كل** زيارة. وزائر صفحة البداية يحمّلها كذلك.

**الإصلاح المقترح:**
1. **`dailyPhrases`** — الأسرع والأنظف: أبقِ ~40 عبارة في الحزمة وانقل الباقي إلى `public/phrases.json` يُجلب كسولًا؛ أو استورد الوحدة ديناميكيًا داخل `GreetingCard`:
```tsx
const [phrase, setPhrase] = useState<string>('')
useEffect(() => { import('@/data/dailyPhrases').then((m) => setPhrase(m.phraseForDay())) }, [])
```
2. **المكتبات** — افصل «بيانات العرض المختصرة» (الاسم فقط، يحتاجها `wellnessPlan.ts`) عن «الكتالوج الكامل» (يحتاجه المنتقي داخل الإعداد)، وحمّل الكتالوج عبر `import()` عند فتح المنتقي.
3. **`foodItems`** — حمّلها ديناميكيًا داخل `QuickMealLogger` عند فتح لوحة البحث لأول مرة.

**الجهد:** M

---

### 🟠 Q-10 — `Icon` يقبل `name: string` غير مقيّد مع رجوع صامت لأيقونة خاطئة

**الملفات:** `src/components/Icon.tsx:3-13` · `src/lib/icons.ts:87,169-171`

**الدليل:**

```tsx
// src/components/Icon.tsx:3-12
interface IconProps {
  name: string          // ← أي نص، لا قيود
  className?: string
  strokeWidth?: number
}
export function Icon({ name, className, strokeWidth = 2 }: IconProps) {
  const Cmp = getIcon(name)
  return <Cmp className={className} strokeWidth={strokeWidth} />
}
```

```ts
// src/lib/icons.ts:87
export const icons: Record<string, IconComponent> = { ... }   // ← Record<string,...> يُلغي استنتاج المفاتيح

// src/lib/icons.ts:169-171
export function getIcon(name: string): IconComponent {
  return icons[name] ?? Sparkles      // ← فشل صامت
}
```

وينتقل عدم التقييد إلى مكوّنات المساعدة أيضًا:
```tsx
// src/views/DashboardView.tsx:363   function Chip({ icon, text }: { icon: string; text: string })
// src/views/DashboardView.tsx:373   function TeaserCard({ icon, ... }: { icon: string; ... })
// src/views/ExerciseLibraryView.tsx:249  function FilterRow({ icon, ... }: { icon: string; ... })
```

**الأثر:**
هذه **الثغرة النوعية الوحيدة الحقيقية** في مشروع نظيف الأنواع بامتياز (صفر `any`). `<Icon name="Dumbell" />` (خطأ مطبعي) يمرّ من `tsc` و`eslint` ويُشحن للإنتاج ليعرض ✨ في مكان الدمبل — بلا تحذير في الطرفية ولا في الـ console. مع 40+ موضع استدعاء يمرّر نصوصًا حرفية، الاحتمال تراكمي. وهو خطر خاص على قالب تجاري: المشتري الذي يخصّص الأيقونات لن يكتشف الخطأ إلا بصريًا.

**الإصلاح المقترح:**

```ts
// src/lib/icons.ts — احذف تعليق النوع ليستنتج TS المفاتيح
export const icons = { Activity, AlertTriangle, ... } satisfies Record<string, IconComponent>
export type IconName = keyof typeof icons

export function getIcon(name: IconName): IconComponent {
  return icons[name]
}
```
```tsx
// src/components/Icon.tsx
interface IconProps { name: IconName; className?: string; strokeWidth?: number }
```

`satisfies` يحافظ على تحقّق `IconComponent` **مع** استنتاج المفاتيح الحرفية. ثم مرّر `IconName` بدل `string` في كل الـ props المساعدة. تشغيل `npm run typecheck` بعدها سيكشف فورًا كل اسم أيقونة خاطئ في المشروع.

**الجهد:** S

---

### 🟡 Q-11 — عشر نوافذ ملء الشاشة بلا دلالات Dialog ولا حبس تركيز ولا Escape

**الملفات:** `ExerciseDetail.tsx:41` · `IngredientPicker.tsx:45` · `ExerciseLibraryPicker.tsx:66` · `SupplementLibraryPicker.tsx:42` · `MedicationLibraryPicker.tsx:46` · `CommitmentLibraryPicker.tsx:43` · `WorkoutSummary.tsx:55` · `WorkoutMode.tsx:133,287` · `PlanBuilder.tsx:596,614`

**الدليل:**

```tsx
// src/components/ExerciseDetail.tsx:41 — لا role، لا aria-modal، لا aria-labelledby
<div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-6">
  <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl bg-page shadow-card sm:rounded-3xl">
```

موضع واحد فقط في المشروع يفعلها بشكل صحيح:
```tsx
// src/components/WorkoutMode.tsx:586
<div className="fixed inset-0 z-40 ..." role="dialog" aria-modal="true">
```

ولا معالجة لـ Escape في أيٍّ منها:
```bash
$ grep -rn "'Escape'" src --include="*.tsx"
src/components/BodyModel3D.tsx:359    # لإلغاء تحديد عضلة، لا لإغلاق نافذة
```

ولا حبس تركيز، ولا `inert`/`aria-hidden` على الخلفية، ولا إعادة التركيز للزرّ المُطلِق عند الإغلاق، ولا قفل تمرير `<body>`.

**الأثر:**
- قارئ الشاشة يستمر في قراءة محتوى الصفحة خلف النافذة — المستخدم لا يعرف أنه في سياق مشروط.
- Tab يخرج من النافذة إلى عناصر مخفية بصريًا خلفها.
- لا Escape للإغلاق (توقّع أساسي على الويب وعلى غلاف iOS).
- تمرير الخلفية يتحرّك تحت النافذة على الجوال — أحد أوضح علامات «موقع ملفوف» لا تطبيق أصلي.

**الإصلاح المقترح:**
مكوّن `<Modal>` واحد مشترك في `src/components/Modal.tsx` يوفّر: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `useEffect` لـ Escape + حبس تركيز بسيط (أول/آخر عنصر قابل للتركيز) + `document.body.style.overflow = 'hidden'` مع تنظيف + إعادة التركيز عبر `useRef` للعنصر النشط السابق. ثم استبدل الـ `<div className="fixed inset-0 ...">` العشرة به. لا يتغيّر أي شكل بصري.

**الجهد:** M

---

### 🟡 Q-12 — أهداف لمس أصغر من 44 بكسل في مسارات تدميرية

**الملفات:** `StepNutrition.tsx:203` · `StepWorkoutTemplate.tsx:160,163,166` · `StepWellness.tsx:83,119` · `StepNutrition.tsx:223,224,225` · `StepCommitments.tsx:63,64` · `ProgressSection.tsx:131` · `SuccessToast.tsx:53`

**الدليل — الأصغر (24 بكسل، وهو زرّ حذف):**

```tsx
// src/components/customizer/steps/StepNutrition.tsx:203
<button type="button" onClick={() => removeIngredient(meal.id, k)}
  className="grid h-6 w-6 place-items-center rounded text-rose-500 hover:bg-rose-500/10"
  aria-label="حذف"><Icon name="X" className="h-3.5 w-3.5" /></button>
```

```tsx
// src/components/customizer/steps/StepWorkoutTemplate.tsx:160-166  — ثلاثة أزرار بـ 28 بكسل
<button ... className="grid h-7 w-7 ..." aria-label="أعلى">
<button ... className="grid h-7 w-7 ..." aria-label="أسفل">
<button ... className="grid h-7 w-7 ... bg-rose-500/10 ..." aria-label="حذف">
```

بينما `.btn` الأساسي في `styles/index.css:73` يعطي `py-3` (≈44px) — أي أن النظام صحيح والانحراف في الأزرار المخصّصة فقط.

**الأثر:**
`CLAUDE.md` ينصّ على Mobile-first، والحدّ الموصى به 44×44 (Apple HIG) / 24×24 كحدّ أدنى مطلق (WCAG 2.5.8). الأزرار الثلاثة المتجاورة بـ 28 بكسل في `StepWorkoutTemplate` (أعلى/أسفل/**حذف**) وصفة مباشرة لحذف تمرين بالخطأ أثناء إعادة الترتيب بإبهام واحد. المشكلة أخطر لأن كل هذه الأزرار **تدميرية** (حذف مكوّن، حذف وجبة، حذف مكمّل، حذف قياس).

**الإصلاح المقترح:**
1. أبقِ الحجم البصري كما هو وكبّر المساحة القابلة للّمس عبر hit-area شفاف:
```css
/* styles/index.css */
.tap-44 { position: relative; }
.tap-44::after { content: ''; position: absolute; inset: 50% auto auto 50%;
  width: 44px; height: 44px; transform: translate(-50%, -50%); }
```
ثم أضف `tap-44` لكل زرّ أيقوني أصغر من 44px. لا يتغيّر أي شكل.
2. اجعل زرّ الحذف مفصولًا بمسافة `gap-2` على الأقل عن أزرار الترتيب في `StepWorkoutTemplate`.

**الجهد:** S

---

### 🟡 Q-13 — تبويبات `AppNav` تفقد اسمها المتاح على الجوال

**الملف:** `src/components/AppNav.tsx:52-66`

**الدليل:**

```tsx
// src/components/AppNav.tsx:52-66
<button
  key={tab.id}
  type="button"
  onClick={() => onNavigate(tab.id)}
  className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 ...')}
>
  <Icon name={tab.icon} className="h-4 w-4" />
  <span className="hidden sm:inline">{tab.label}</span>   {/* ← display:none تحت 640px */}
</button>
```

لا `aria-label` على الزرّ، ولا بديل ظاهر على الجوال (قارن مع `CustomizationCenter.tsx:207-211` الذي يفعلها **صحيحًا** بـ `<span className="sm:hidden">معاينة</span>`).

**فحص شامل للمشروع:** صفر أزرار أيقونية بلا اسم متاح على أي مقاس، وموضع واحد فقط (هذا) يفقد الاسم على الجوال — أي أن مستوى a11y عالٍ عمومًا وهذه ثغرة نقطية.

**الأثر:**
`display: none` يُزيل العنصر من **شجرة إمكانية الوصول**، لا من العرض فقط. تحت 640px (الجمهور الأساسي) يصبح تبويبا «الرئيسية» و«الإعدادات» في `SettingsView.tsx:120` و`DemoView.tsx:36` زرَّين بلا اسم — VoiceOver يقرأ «زر» فقط. كما لا يوجد `aria-current` للتبويب النشط (بينما `MobileShell.tsx:103` يوفّره بشكل صحيح — دليل آخر على أن السهو نقطي).

**الإصلاح المقترح:**
```tsx
<button
  key={tab.id}
  type="button"
  onClick={() => onNavigate(tab.id)}
  aria-label={tab.label}
  aria-current={current === tab.id ? 'page' : undefined}
  className={...}
>
```

**الجهد:** S

---

### 🟡 Q-14 — مؤشّر التركيز محذوف بلا بديل في خريطة العضلات

**الملف:** `src/components/WeeklyMuscleMap.tsx:56-64`

**الدليل:**

```tsx
// src/components/WeeklyMuscleMap.tsx:56-64
<g
  role="button"
  tabIndex={0}
  aria-label={title}
  onClick={() => onSelect(def.m)}
  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(def.m)}
  className="cursor-pointer outline-none"        // ← outline محذوف، بلا بديل
>
```

فحص كامل: 34 استخدامًا لـ `outline-none` في المشروع، **32 منها** مصحوبة ببديل `focus:`/`focus-visible:` — بما فيها `BodyModel3D.tsx:423` (`outline-none ... focus-visible:ring-2 focus-visible:ring-primary`) و`.btn` في `styles/index.css:73`. هذا **الموضع الوحيد** بلا بديل.

**الأثر:**
مخالفة WCAG 2.4.7 (Focus Visible, مستوى AA). العناصر مُنفّذة بشكل ممتاز من ناحية الدلالة (`role` + `tabIndex` + `onKeyDown` + `<title>`) — أي أن الجهد بُذل لدعم لوحة المفاتيح ثم أُلغي أثره بجعل التركيز غير مرئي: مستخدم لوحة المفاتيح يتنقّل بين ~20 عضلة عمياءً بلا معرفة أين هو.

**الإصلاح المقترح:**
```tsx
className="cursor-pointer outline-none focus-visible:[outline:2px_solid_var(--c-primary)] focus-visible:[outline-offset:2px]"
```
أو أوضح لعناصر SVG — أضف مسار تحديد إضافي عند التركيز مطابقًا لمسار `selected` الموجود أصلًا في السطور 73-77.

**الجهد:** S

---

### 🟡 Q-15 — تسميات غير مرتبطة بحقول الإدخال في مسجّل الوجبات

**الملف:** `src/components/nutrition/QuickMealLogger.tsx:203-206, 232-238, 313-323`

**الدليل:**

```tsx
// src/components/nutrition/QuickMealLogger.tsx:203-212 — label شقيق للحقل، بلا htmlFor/id
<div className="mt-3 flex items-center gap-2">
  <label className="text-xs text-ink-500">{t.gramsAmount}</label>
  <input type="number" inputMode="numeric" min="1" max="3000" step="10"
    value={grams} onChange={(e) => setGrams(sanitizeNumericInput(e.target.value, { max: 3000 }))} ... />
```

```tsx
// src/components/nutrition/QuickMealLogger.tsx:311-323 — مكوّن Field، مستخدم 4 مرات (السطور 240-243)
function Field({ label, value, onChange, placeholder, max }: {...}) {
  return (
    <div>
      <label className="text-xs text-ink-500">{label}</label>
      <input type="number" ... />
    </div>
  )
}
```

بينما بقية المشروع يستخدم النمط الصحيح (لفّ ضمني):
```tsx
// src/components/customizer/Field.tsx:12          <label className="flex flex-col gap-1.5">
// src/sections/ProgressSection.tsx:75             <label key={m.id} className="flex flex-col gap-1">
// src/views/ProgressView.tsx:195                  <label ... htmlFor="reminder-enabled">
```

**الأثر:**
6 حقول (الغرامات + السعرات + البروتين + الكارب + الدهون + اسم الطعام) بلا اسم متاح — VoiceOver يقرأ «حقل نصي» بلا سياق. النقر على التسمية لا يركّز الحقل أيضًا. وهذه شاشة **يومية متكرّرة** (تسجيل كل وجبة).

**الإصلاح المقترح:**
حوّل الغلاف إلى `<label>` كما في بقية المشروع — أبسط وأقلّ عرضة للانحراف من `htmlFor`/`id`:
```tsx
function Field({ label, value, onChange, placeholder, max }) {
  return (
    <label className="block">
      <span className="text-xs text-ink-500">{label}</span>
      <input type="number" ... className="mt-1 w-full ..." />
    </label>
  )
}
```
ونفس المعالجة للسطرين 203 و232.

**الجهد:** S

---

### 🟡 Q-16 — `config/strings.ts` يشحن الترجمة الإنجليزية كاملة بينما اللغة مثبّتة على العربية

**الملفات:** `src/config/strings.ts:347,704,1061` · `src/App.tsx:30`

**الدليل:**

```ts
// src/config/strings.ts
const ar: ShellStrings = { ... }        // السطر 347 → ~356 سطرًا
const en: ShellStrings = { ... }        // السطر 704 → ~356 سطرًا
export function getStrings(lang: Lang): ShellStrings {   // السطر 1061
  return lang === 'en' ? en : ar
}
```

```tsx
// src/App.tsx:29-30
// اللغة مثبّتة على العربية حاليًا (الإنجليزية مخفية حتى اكتمال الترجمة).
const LANG = 'ar' as const
```

`LANG` تُمرَّر ثابتةً إلى كل عرض ومكوّن؛ ولا يوجد أي مسار في الواجهة يستدعي `setLanguage('en')`. ثلاثة مواضع تستدعي `getStrings('ar')` حرفيًا (`StepMeasurements.tsx:11`, `StepWellness.tsx:24`, `StepCommitments.tsx:15`). الحجم الكلي 51,037 بايت مصغّرًا ⇒ **~25 KB منها غير قابل للوصول**.

**الأثر:**
25 KB ميّتة في كل زيارة (≈2% من الحزمة، و~9% من كل `src` غير الـ vendor). Rollup لا يستطيع حذفها لأن `getStrings` تفرّع على قيمة وسيط وقت التشغيل.

**الإصلاح المقترح:**
انقل كل كائن لغة لملفه (`strings.ar.ts`, `strings.en.ts`) واجعل التحميل ديناميكيًا عند تفعيل الإنجليزية لاحقًا. حلّ فوري وأصغر: أضف حارسًا يسمح لـ Rollup بالتشذيب:
```ts
const I18N_EN_ENABLED = false as boolean
export function getStrings(lang: Lang): ShellStrings {
  return I18N_EN_ENABLED && lang === 'en' ? en : ar
}
```
(يبقى `en` مرجعًا للمترجم لكنه لا يُشحن بعد `dead code elimination`.) الحلّ الأنظف والمتوافق مع خطة التوطين هو فصل الملفات + `import()`.

**الجهد:** S

---

### 🟢 Q-17 — نصوص عربية مكتوبة داخل المكوّنات (مخالفة صريحة للقاعدة رقم 1)

**الملفات:** `src/views/DashboardView.tsx` · `src/views/ExerciseLibraryView.tsx:15-42` · `src/sections/MuscleCoverageSection.tsx:44-50` · `src/components/WeeklyMuscleMap.tsx` وغيرها

**الدليل:**

`CLAUDE.md` (قاعدة إلزامية رقم 1):
> **Data-driven**: أي نص أو رقم قابل للتخصيص يجب أن يكون في `src/config` … **ممنوع hardcoding داخل المكونات**.

المخالفات:
```tsx
// src/views/ExerciseLibraryView.tsx:15-28 — قائمة فلاتر كاملة داخل المكوّن
const MUSCLE_FILTERS: { value: Muscle | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'chest', label: 'صدر' },
  ...
]
const EQUIP_LABEL: Record<string, string> = { barbell: 'بار', dumbbell: 'دمبل', ... }
```
```tsx
// src/views/DashboardView.tsx:135,138  — بينما نفس المكوّن يستدعي getStrings() في السطر 128
<span className="text-sm font-black text-ink-900">سجّل أكل</span>
<span className="text-sm font-black text-ink-900">ابدأ تمرين</span>
// :219  'اليوم راحة — جهّز تغذيتك'
// :221  'خطوة وحدة تكفي اليوم. افتح التمرين وعلّم كل مجموعة وأنت تخلّصها.'
// :164  'خيارات أكثر · وضع متقدّم'
```
```tsx
// src/sections/MuscleCoverageSection.tsx:44-50
<h2 ...>عضلاتك هذا الأسبوع</h2>
<p ...>وش تمرّنت، وش تعافى، ووش ناقصك — توزيع أسبوعي واضح.</p>
<SummaryPill ... label="مكتملة" /> <SummaryPill ... label="ناقصة" /> <SummaryPill ... label="راحة" />
```

**الأثر:**
هذا **قالب تجاري** (`.claude/rules/product.md`: «سهولة التخصيص» أولوية رقم 2، و«التوطين: كل النصوص في `config`/`data`»). المشتري الذي يريد تغيير نبرة الشاشة الرئيسية أو ترجمتها مضطرّ للغوص في TSX — وهو تحديدًا ما تمنعه القاعدة. الوضع الحالي **مختلط**: نفس الملف يستدعي `getStrings(lang)` لبعض النصوص ويكتب البقية حرفيًا، وهو أسوأ من الاتساق في أي اتجاه لأنه يُخفي المشكلة.

**الإصلاح المقترح:**
1. وسّع `ShellStrings` بأقسام `dashboard` و`library` و`muscleCoverage`.
2. انقل النصوص دفعةً واحدة (بحث عن `>[؀-ۿ]` داخل JSX في `views/` و`sections/`).
3. أضف قاعدة ESLint مخصّصة أو فحص CI بسيط يمنع نصًّا عربيًا حرفيًا داخل JSX خارج `config/` و`data/`.

**الجهد:** M

---

### 🟢 Q-18 — `LineChart` ينهار على بيانات فارغة ويُنتج هندسة NaN لنقطة واحدة

**الملف:** `src/components/LineChart.tsx:14-26`

**الدليل:**

```tsx
// src/components/LineChart.tsx:14-26
const values = data.map((d) => d.value)
const min = Math.min(...values)           // data=[] → Infinity
const max = Math.max(...values)           // data=[] → -Infinity
const range = max - min || 1

const points = data.map((d, i) => {
  const x = pad + (i / (data.length - 1)) * (width - pad * 2)   // length=1 → 0/0 = NaN
  ...
})
const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ...`  // data=[] → undefined.x → TypeError
```

المستدعيان محميّان حاليًا:
```tsx
// src/components/ExerciseDetail.tsx:217   {stats.weightTrend.length >= 2 ? (... <LineChart .../>) : <EmptyHint .../>}
// src/sections/Dashboard.tsx:45           weightProgress ثابتة بـ 8 نقاط (data/dashboard.ts:35) — والملف غير قابل للوصول أصلًا
```

**الأثر:**
كامن لا فعلي اليوم. لكنه مكوّن مُصدَّر عام في قالب تجاري: أول مشترٍ يمرّر نقطة واحدة (`weightTrend` بجلسة واحدة، أو بيانات مستوردة) يحصل على SVG مشوّه أو **استثناء رندر ⇒ شاشة بيضاء** (Q-01). الحماية موضوعة في المستدعي لا في المكوّن — وهو عقد هشّ.

**الإصلاح المقترح:**
```tsx
export function LineChart({ data, height = 120 }: LineChartProps) {
  const id = useId()
  if (data.length < 2) return null      // أو رسم نقطة واحدة في المنتصف
  ...
}
```
(الحارس بعد `useId` للحفاظ على ترتيب الهوكات — نفس نمط `ExerciseDetail.tsx:39-40`.)

**الجهد:** S

---

### 🟢 Q-19 — 35 ملف مصدر غير قابل للوصول + `config/theme.ts` موثّق كنقطة تخصيص لكنه ميّت

**الملفات:** 14 قسم تسويقي في `src/sections/` · 9 خطوات مخصّص قديمة في `src/components/customizer/steps/` · 9 ملفات `src/data/` · `src/components/Header.tsx` · `src/components/customizer/EditableTable.tsx` · `src/config/theme.ts`

**الدليل** (تتبّع رسم الاعتماديات من `src/main.tsx`):

```
إجمالي ملفات src (غير type-only): 155 | قابلة للوصول: 120 | غير قابلة: 35
```

عيّنة:
```
src/sections/Hero.tsx            5047 B      src/sections/Pricing.tsx      3369 B
src/sections/Dashboard.tsx       3244 B      src/sections/Meals.tsx        3126 B
src/sections/Supplements.tsx     2557 B      src/sections/Audience.tsx     2441 B
src/components/Header.tsx        3275 B      src/config/theme.ts            885 B
src/components/customizer/steps/StepBasics.tsx / StepGoal.tsx / StepLook.tsx /
StepMeals.tsx / StepMetrics.tsx / StepSchedule.tsx / StepSupplements.tsx / StepWorkouts.tsx
src/data/{audience,benefits,commitment,dashboard,faq,features,pricing,problems,profile}.ts
```

**الحالة الخاصة لـ `config/theme.ts`** — `CLAUDE.md` ينصّ صراحةً:
> أي نص أو رقم قابل للتخصيص يجب أن يكون في `src/config` (`product.ts`, **`theme.ts`**, `content.ts`)

لكن مستهلكيه الوحيدين ميّتان:
```bash
$ grep -rn "config/theme" src
src/sections/Customization.tsx:3          ← غير قابل للوصول
src/components/customizer/steps/StepLook.tsx:4   ← غير قابل للوصول
```
أي أن **لوحة الألوان الخمس (`accentOptions`) الموثّقة كنقطة تخصيص رئيسية غير قابلة للوصول من التطبيق الفعلي**.

**الأثر:**
- تكلفة الحزمة **صفر** (Rollup يشذّبها بنجاح) — لذا هذه ليست مشكلة أداء.
- التكلفة **صيانة ومصداقية**: `CLAUDE.md` يصف المشروع بأنه «قالب ويب تجاري (Landing + معاينة منتج)» بينما `App.tsx` صار قشرة تطبيق كاملة بلا صفحة هبوط. الوثيقة الملزِمة للوكلاء تصف بنيةً لم تعد قائمة.
- خطر انحراف فعلي: خطوات المخصّص القديمة (`StepBasics` … `StepWorkouts`) تحمل أسماء مطابقة تقريبًا للخطوات الحيّة (`StepBody`, `StepGoal` مقابل `StepGeneratePlan`…) — وكيل أو مطوّر قادم قد يعدّل الملف الميّت ويظنّ أنه أصلح شيئًا.

**الإصلاح المقترح:**
1. **قرار المالك أولًا:** هل صفحة الهبوط جزء من المنتج المُباع؟
   - **نعم** ⇒ أعِد ربطها بمسار `#/landing` وأعِد وصل `config/theme.ts` بمسار تخصيص حيّ.
   - **لا** ⇒ انقل الـ 35 ملفًا إلى `legacy/` (أو احذفها) وحدّث `CLAUDE.md` ليصف البنية الحقيقية.
2. في الحالتين: أعِد وصل `accentOptions` بشاشة `SettingsView` أو `StepLook` حيّة، وإلا احذف الادعاء من `CLAUDE.md`.
3. أضف فحص CI بسيط (`knip` أو سكربت تتبّع رسم اعتماديات) يفشل عند وجود ملف مصدر غير قابل للوصول — لمنع تراكم الطبقة الميّتة مجدّدًا.

**الجهد:** S (الفرز) + قرار مالك

---

### 🟢 Q-20 — `useMemo` بتبعية واسعة يعيد حساب تغطية أسبوع كاملة عند تغيير اللون

**الملف:** `src/components/WeeklyMuscleMap.tsx:181-189`

**الدليل:**

```tsx
// src/components/WeeklyMuscleMap.tsx:181-189
const coverage = useMemo(() => {
  const result = computeWeeklyCoverage({
    sessions: loadSessions(),                        // قراءة + تطبيع حتى 500 جلسة
    plan: customization.workoutPlan,
    level: customization.profile.trainingLevel,
  })
  return result.weeklyCoverage
}, [customization])                                  // ← الكائن كاملًا
```

المقارنة داخل نفس المشروع تُظهر النمط الصحيح في ثلاثة مواضع:
```tsx
// src/components/BodyModel3D.tsx:119-124        }, [customization.workoutPlan, level])
// src/sections/RecentWorkout.tsx:32-42          }, [customization.workoutPlan, customization.profile.trainingLevel])
// src/sections/MuscleCoverageSection.tsx:22-28  }, [isDemo, plan, level])
```

**الأثر:**
`applyCustomization` في `customizationContext.tsx:39-42` يستبدل الكائن كاملًا، فأي تعديل (لون، اسم، وجبة، هدف ماء) يُبطل الذاكرة ويعيد قراءة كل الجلسات من `localStorage` وتطبيعها وحساب تغطية الأسبوع. أثر محدود اليوم لأن التخصيص نادر التغيّر، لكنه انحراف عن نمط المشروع نفسه.

**الإصلاح المقترح:**
```tsx
}, [customization.workoutPlan, customization.profile.trainingLevel])
```
وأضف `useMemo` مفقودًا في `MuscleCoverageSection.tsx:30` أيضًا (`summarizeMuscleGroups` تُستدعى خارج الذاكرة).

**الجهد:** S

---

## ما هو سليم (يستحق التثبيت لا الإصلاح)

| المجال | الحالة | الدليل |
|---|---|---|
| **RTL** | ✅ **مثالي 100%** | صفر `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` في كامل `src` (بما فيه `index.css`). استخدام صحيح لـ `ms-/me-/ps-/pe-/text-start/text-end/start-/end-` و`rtl:rotate-180` |
| **سلامة الأنواع** | ✅ صفر `any` | `strict: true` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch` في `tsconfig.app.json`؛ التأكيدان الوحيدان (`validation.ts:32`, `body3d/math.ts:73`) مبرَّران تقنيًا |
| **بوابات الجودة** | ✅ خضراء | `npm run typecheck` و`eslint --max-warnings 0` يمرّان بصفر مخرجات |
| **تسمية الأزرار الأيقونية** | ✅ صفر خرق | فحص كل `<button>` في المشروع: لا زرّ أيقوني بلا `aria-label`/`title` على أي مقاس (Q-13 يخصّ الجوال فقط) |
| **عناصر تفاعلية دلالية** | ✅ صفر `div onClick` | كل التفاعلات على `<button>`؛ الاستثناء الوحيد `<g role="button" tabIndex={0} onKeyDown>` في SVG — وهو الحلّ الصحيح |
| **حبس التمرير/التنقّل** | ✅ | `MobileShell.tsx:103` يوفّر `aria-current`، و`SplashScreen`/`SuccessToast` يستخدمان `role="status"` |
| **تطبيع بيانات الجلسات** | ✅ | `historyStore.ts:127-179` نموذج يُحتذى: `Array.isArray` + `normalizeSession`/`normalizeSet` بفحص نوع لكل حقل |
| **الترحيل** | ✅ | `ensureMigrated` (`historyStore.ts:390-500`) idempotent بحارس ذاكرة + علم مخزّن + `try/catch` شامل |
| **الأسرار** | ✅ | لا مفاتيح في الكود؛ `supabaseClient.ts` يقرأ `VITE_*` فقط ويتحمّل غيابها بأمان |

---

## خطة تنفيذ مقترحة بخطوات آمنة

كل موجة قابلة للدمج مستقلّة، وتنتهي بـ `npm run typecheck && npm run lint && npm run build`.

### الموجة 1 — إيقاف النزيف (لا تغيير سلوك مرئي) · S+M · **الأعلى أولوية**
> الهدف: ألّا يستطيع أي خطأ بيانات أن يحبس المستخدم خارج تطبيقه.

1. `ErrorBoundary` حول `<App/>` وحول كل View (**Q-01**) — تغيير مضاف بحت، صفر مخاطرة.
2. `src/lib/safeStorage.ts` + استبدال 48 موضع `localStorage` مباشر (**Q-03**) + قاعدة ESLint مانعة.
3. `Array.isArray` + `normalize*` لأخطر ثلاثة قرّاء: `measurementLog` ثم `today` ثم `customization` (**Q-04**).
4. حارس `data.length < 2` في `LineChart` (**Q-18**).

**بوابة القبول:** احقن يدويًا `localStorage.setItem('qimmah:measurementLogs:v1','{"a":1}')` وأعد التحميل ⇒ يجب أن يعمل التطبيق طبيعيًا (لا شاشة بيضاء).

---

### الموجة 2 — صدق الحفظ · M
> الهدف: ألّا تكذب الواجهة أبدًا بشأن ما حُفظ.

5. `writeJSON → boolean` وتمرير الإشارة عبر `addSession`/`saveExerciseHistory` (**Q-02**).
6. `persistFinishedSession` تُرجع `{ saved, prs }`، و`WorkoutView.finish()` يعرض حالة فشل صريحة مع خيار تصدير + تشذيب أقدم 50 جلسة وإعادة محاولة.

**بوابة القبول:** املأ `localStorage` عمدًا حتى `QuotaExceededError` ⇒ إنهاء تمرين يجب أن يُظهر تحذيرًا لا شاشة تهنئة.

---

### الموجة 3 — أداء شاشة النادي · M
> الهدف: إزالة التلعثم من الشاشة الأكثر استخدامًا.

7. كاش ذاكرة في `historyStore` لـ `getExerciseHistory` و`getWorkoutSessions` مع إبطال عند الكتابة (**Q-08**).
8. `useMemo` في `Today.tsx:46`, `RecentWorkout.tsx:31`, `WorkoutMode.tsx:161`; قراءة واحدة فوق الحلقة في `WorkoutPlanSection.tsx:37`.
9. عزل `<RestTimer/>` في مكوّن مستقل.
10. تضييق تبعية `WeeklyMuscleMap.tsx:189` (**Q-20**).

**بوابة القبول:** Chrome DevTools Performance — تسجيل 10 ثوانٍ أثناء راحة نشطة: صفر `JSON.parse` متكرّر، ورندرات `WorkoutMode` تقتصر على تغيّر الحالة الفعلي.

---

### الموجة 4 — تقسيم الحزمة · M
> الهدف: من 1,012 kB إلى ≤ 550 kB للمسار الأول.

11. `manualChunks` (بلا تغيير كود) — أساس آمن (**Q-06**).
12. `React.lazy` لـ Setup/Demo/Settings/Legal + `Suspense` بـ `SplashScreen` الموجود.
13. `React.lazy` لـ `BodyModel3D` (**Q-06 #3**).
14. `import()` ديناميكي لـ `foodItems` و`dailyPhrases` والمكتبات (**Q-09**).
15. تشذيب/فصل `strings.en` (**Q-16**).
16. `getSupabase()` غير متزامنة بـ `import()` (**Q-07**) — **آخر خطوة**، فهي الأعلى مخاطرة (تمسّ `authContext`).

**بوابة القبول:** حجم أكبر chunk في `npm run build` ≤ 550 kB وتحذير Vite يختفي.

---

### الموجة 5 — إمكانية الوصول · S+M

17. مكوّن `<Modal>` مشترك + استبدال الـ 10 نوافذ (**Q-11**).
18. `aria-label` + `aria-current` في `AppNav.tsx:52` (**Q-13**).
19. `focus-visible` في `WeeklyMuscleMap.tsx:63` (**Q-14**).
20. لفّ الحقول بـ `<label>` في `QuickMealLogger` (**Q-15**).
21. صنف `tap-44` على الأزرار الأيقونية الصغيرة (**Q-12**).

**بوابة القبول:** تنقّل كامل بلوحة المفاتيح عبر شاشات التمرين/التغذية/الإعداد بلا فقدان تركيز؛ Escape يغلق كل نافذة.

---

### الموجة 6 — شبكة الأمان والاتساق · M/L

22. Vitest + اختبارات منطق خالص لـ `planGenerator` / `historyStore` / `calculators` / `validation` (**Q-05**).
23. `IconName` عبر `satisfies` وإصلاح ما يكشفه `typecheck` (**Q-10**).
24. نقل النصوص العربية إلى `config/strings` (**Q-17**).
25. قرار المالك في الطبقة الميّتة و`config/theme.ts` + تحديث `CLAUDE.md` (**Q-19**).

**بوابة القبول:** `npm run typecheck && npm run lint && npm test && npm run build` كلها خضراء، وتُضاف إلى قسم «قبل التسليم» في `CLAUDE.md`.

---

## ملحق — منهجية القياس

- **حجم الحزمة الفعلي:** `npm run build` (Vite 5.4.21 / Rollup) ⇒ `1,012.24 kB` خام، `272.05 kB` gzip، chunk واحد.
- **تفكيك المساهمة:** `esbuild` metafile على نفس نقطة الدخول `src/main.tsx` بنفس الـ alias والـ define. إجماليه 1,313 KB (esbuild يشذّب أقل من Rollup) — استُخدم للنِّسب النسبية لا للأرقام المطلقة.
- **قابلية الوصول للملفات:** رسم اعتماديات من `src/main.tsx` عبر metafile، مطروحًا منه ملفات `types/` (type-only فلا تظهر في أي حزمة بطبيعتها).
- **فحص a11y للأزرار:** محلّل يحترم تداخل `{}` في وسم الفتح (لتفادي التقاط `=>` في معالِجات الأحداث كنهاية للوسم)، مع محاكاة إزالة العناصر المخفيّة بـ `display:none` تحت 640px.
