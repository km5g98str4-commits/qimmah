# CONTRACT-CHANGES-SINCE-PKG7 — ما تغيّر بعد الأساس الذي بدأت عليه Phase II

**الأمر:** `[QIM-CODEX-WORK-TRACE-001]` البند ٥ · **قراءة فقط، لا هجرة ولا rebase.**

| | |
|---|---|
| **الأساس (PKG-7)** | `1bcf7a99c657558f982154696b907efbd3d78ac5` — 2026-08-14 14:08 +0300 |
| **الرأس النهائي** | `d83add22e904819c7d7fdc27890c757cd5dbaa5c` — 2026-08-14 21:38 +0000 |
| **الفارق** | ٣ التزامات: `e8f3bb6` (PKG-8) · `9f88e43` (PKG-9) · `d83add2` (docs) |
| **الحجم** | ٢٤ ملفًا · **+1,761 / −269** — منها **٩ ملفات مصدر فقط** (+264/−242) |

> **لماذا `1bcf7a9` بالذات؟** ليس اختيارًا تحليليًا — إنه حقيقة من Git:
> `git merge-base` بين **كل** فرع من فروع Phase II الخمسة وفرع Web Sovereign يعطي `1bcf7a9` **بالضبط**.
> الحارات الخمس كلها تفرّعت من PKG-7، والمشوار تقدّم فوقه ثلاث خطوات بعدها.

---

## 0. الخلاصة في سطرين

**تسعة ملفات مصدر فقط تغيّرت بعد PKG-7. ولا واحد منها يلمسه أي فرع من فروع Phase II الخمسة.**
الأثر الحقيقي **ليس تعارض دمج** — بل **تغييران في العقد** (`ProfileV2Model.settings`، وملكية مفتاح Quick Log)
و**سياستان أشدّ** (`completed === true`، وحذف الحساب للمسجَّل فقط) يجب أن يعرفها من يبني فوق الرأس النهائي.

---

## 1. ملفات المصدر التسعة — الجرد الكامل

| الملف | +/− | PKG | نوع التغيير |
|---|---|---|---|
| `src/views/ProfileV2.tsx` | +?/−272 صافي | 8, 9 | **CONTRACT** — إعادة هيكلة كاملة |
| `src/lib/profileV2Model.ts` | +15/−… | 8 | **CONTRACT كاسر** — حذف حقل |
| `src/views/NotificationsSettingsV2.tsx` | +31/−… | 8 | a11y — أهداف لمس + `h1`→`h2` |
| `src/components/NativeSettingsPanel.tsx` | +6/−… | 8 | a11y — هدف لمس ٤٤بكسل |
| `src/i18n/dict/profileScreen.ts` | +12 | 8 | i18n — ٤ مفاتيح جديدة |
| `src/lib/quickLogIntent.ts` | +80 (جديد) | 9 | **CONTRACT** — مالك مفتاح جديد |
| `src/App.tsx` | +24/−… | 9 | **CONTRACT** — `openQuickLog` أُعيدت كتابته |
| `src/views/NutritionView.tsx` | +41/−… | 9 | **CONTRACT** — استهلاك النيّة |
| `src/lib/onboarding.ts` | +25/−… | 9 | **CONTRACT** — تشديد قراءة الإكمال |

---

## 2. التغييرات المصنَّفة حسب محاور الأمر

### 2.1 Routes — ✅ **لا تغيير**

`ROUTES` في `src/lib/appRoutes.ts` **لم يُمسّ بين PKG-7 والرأس النهائي**.
القائمة الثابتة (٢٢ مسارًا): `start · login · signup · forgot · setup · dashboard · workout · exercises ·
nutrition · progress · measurements · steps · profile · calc · recovery · settings · privacy · terms ·
contact · reset · productReview · stats`؛ و`notfound`/`accountRequired` داخليان.
`MAIN_TABS` = `dashboard · workout · nutrition · progress · profile` (٥).

> آخر تغيير على المسارات كان **PKG-5** (`measurements`) و**PKG-6** (`#/exercises/:id`) — **قبل** الأساس، فهما في قاعدة Phase II أصلًا.

**⚠ لكن مسارًا داخليًا واحدًا تغيّر:** أسماء شاشات Profile الداخلية `data` ⇒ **`data-privacy`** و**`data-settings`**.
ليست مسارات hash ولا تظهر في الرابط، لكن أي اختبار يقود شاشات Profile الداخلية بالاسم سيتأثّر.

### 2.2 State shape — ⚠ **تغيير كاسر واحد**

```diff
  export interface ProfileV2Model {
    …
    privacy: { usageEventsLocalOnly; healthSharingAvailable; dataExportAvailable; deleteAccountAvailable }
-   settings: { language: string; units: string; numerals: string; appearance: string; remindersAvailable: boolean }
    subscription: { … }
  }
```

**الحقل `settings` حُذف من `ProfileV2Model` نهائيًا** (PKG-8، BUG-020/021).
السبب: كان Profile يكرّر حقائق تملكها `#/settings` القانونية — واللغة والوحدات والأرقام والمظهر
لها الآن مالك واحد (`SettingsView` + `numberFormat.ts` من PKG-7).

**من يكسره:** أي كود يقرأ `model.settings.*`. **فحصٌ آلي مباشر:**
```bash
git grep -n "model\.settings\." -- src/
```
**النتيجة على الرأس النهائي: صفر.** والبديل المُعتمد: القارئ يذهب إلى `#/settings` عبر `openCanonicalSettings`.

> ⚠ **لا تستخدم النمط الفضفاض `\.settings\.`** — فهو يلتقط `t.settings.languageHint`
> في `SettingsView.tsx:252`، وهي **مساحة اسم في القاموس** لا حقل في النموذج. إيجابية كاذبة.

**وتغيير سلوكي ثانٍ في نفس الملف:**
```diff
- deleteAccountAvailable: true,           // كان دائمًا صحيحًا
+ deleteAccountAvailable: auth.signedIn,  // صار مشروطًا بتسجيل الدخول
```
الضيف لم يعد يُعرض عليه وعد حساب غير موجود؛ يُعرض له بدلًا منه **إدارة بيانات الجهاز**
(`deviceDataTitle`/`deviceDataNote`، مفتاحان جديدان في `profileScreen.ts`).

### 2.3 Storage keys — ⚠ **مفتاح واحد صار له مالك حصري**

| المفتاح | قبل PKG-8 | بعد PKG-9 |
|---|---|---|
| `qimmah:quick-log-intent` (sessionStorage) | يُقرأ ويُكتب **خامًا في ٣ مواضع حيّة**: `App.tsx` · `ProfileV2.tsx` · `NutritionView.tsx` — كلٌّ يحرسه بطريقته أو لا يحرسه | **مملوك حصريًا** لـ`src/lib/quickLogIntent.ts` |

**العقد الجديد — ثلاث دوالّ لا غير:**

```ts
export const QUICK_LOG_INTENT_KEY = 'qimmah:quick-log-intent'
export type QuickLogIntent = 'meal' | 'water' | 'routine'

requestQuickLogIntent(intent)            // كتابة آمنة تحت تخزين محجوب
takeQuickLogIntent(accepted[])           // قراءة **مستهلِكة ومحصورة بالمالك**
clearQuickLogIntent()                    // مسح بلا قراءة
```

**ثلاث ضمانات لم تكن موجودة:**
1. **التخزين المحجوب لا يرمي.** في Safari مع منع الكعكات، الوصول إلى `window.sessionStorage` **نفسه**
   يرمي `SecurityError` — لا دوالّه فقط. كان هذا يقتل زرّ التسجيل السريع كلّه (BUG-024).
2. **`accepted` ليس تزيينًا.** «التغذية» تملك `meal`/`water`، و«ملفك» يملك `routine`.
   بدونه تبتلع شاشةٌ نيّةَ الأخرى حين تُركَّب قبلها.
3. **المسح يسبق الإعادة** ⇒ لا نيّة معلّقة تخطف زيارة لاحقة (BUG-026).

> **⚠ لأي حارة تضيف مفتاح تخزين:** `src/lib/userDataKeys.ts` هو السجلّ القانوني،
> و«أي مفتاح نصّي غير مسجَّل فيه يحتاج تحقيقًا». `quickLogIntent` نيّة جلسة لا بيانات مستخدم.

**ولا مفتاح تخزين أُضيف لسياق العودة إلى Profile** — استُخدم `window.history.state` بدلًا منه:

```ts
const PROFILE_RETURN_SCREEN_STATE = 'qimmahProfileReturnScreen'  // في history.state لا في التخزين
```

### 2.4 Profile shape — ⚠ **إعادة هيكلة واسعة**

`ProfileV2.tsx`: **−272 سطرًا صافيًا** (PKG-8) — أكبر تقليص في السلسلة كلها.

| قبل | بعد |
|---|---|
| `Privacy(… onDelete)` | `Privacy(… onManageAccount)` |
| `Settings(… onAccount)` | `Settings(… onCanonicalSettings)` |
| شاشة `data` واحدة | `data-privacy` و`data-settings` (لحفظ سياق العودة) |
| واجهة نقل بيانات **ثانية** داخل Profile | **مالك واحد**: `DataManagementPanel` |
| `h1` مكرّر في نسل Profile | `MobileShell` يملك `h1` وحيدًا؛ النسل `h2` |
| `InfoRow(...)` | `InfoRow(..., testId?)` |

### 2.5 Access policy — ✅ **لا تغيير على السلطة**

`PAID_ACTIONS` ما زالت **١٣ فعلًا**؛ و`guard.ts`/`entitlementStore.ts`/`provider.tsx`/`paidActions.ts`
**لم تُمسّ بين PKG-7 والرأس**. سياسة «مرئي لا قابل للاستخدام» كما هي.

**لكن أُضيف حارس جديد على حدّ مختلف:** `scripts/production-bundle-safety-proof.mjs` (PKG-9)
يفحص **الأصل المبني** لا المصدر — أن بذرة الاستحقاق التجريبي (`QIMMAH-TEST-*`، `qimmah:entitlement-mock`)
**غائبة عن حزمة الإنتاج**، ويُثبت أن الماسح **مبصر** بإيجادها في بناء mock مقابل.

⚠ **استثناء واحد مُعلَن ومحروس:** `@supabase/auth-js` v2.108.2 يحمل `GOTRUE_URL` افتراضيًا ميتًا
`http://localhost:9999`. الاستثناء **مسمّى ومبرَّر** (`createClient` يتلقّى دائمًا url صريحًا)
**ومحروس** بثلاث حقن لنقاط نهاية مملوكة ما زالت تفشل.

### 2.6 Search behavior — ✅ **لا تغيير**

لا شيء في الملفات التسعة يمسّ البحث. مرشِّح مكتبة التمارين النقي في `src/lib/exerciseLibrary.ts`
استقرّ عند **PKG-6** — أي **داخل** قاعدة Phase II.

> ⚠ هذا يعني أن بند **D-04** في `HEAD-DEPENDENCIES.md` (اعتماد المطبِّع العربي المشترك في `exerciseLibrary.ts:22`)
> ما زال **صالحًا كما كُتب** — الملف لم يتحرّك بعد PKG-7.

### 2.7 Settings — ✅ **لا تغيير على `SettingsView`**

`src/views/SettingsView.tsx` استقرّ عند **PKG-7** ولم يُمسّ بعده.
`DataManagementPanel` و`numberFormat.ts` كذلك. **ما تغيّر هو من يشير إليها:**
Profile صار يوجّه إلى `#/settings` القانونية بدل تكرارها.

### 2.8 Exercise detail behavior — ✅ **لا تغيير**

`ExerciseDetail.tsx` و`ExerciseLibraryView.tsx` و`exerciseLibrary.ts` كلها استقرّت عند **PKG-6**.
عقد `#/exercises/:exerciseId` وسلوك الخروج من الرابط المباشر **داخل قاعدة Phase II**.

### 2.9 Nutrition state — ⚠ **تغيير محصور في استهلاك النيّة**

`nutritionV2Model.ts` و`nutritionTracking.ts` و`nutritionHistory.ts` — **لم تُمسّ** بعد PKG-7.
نموذج البيانات مستقرّ منذ **PKG-3**.

**ما تغيّر في `NutritionView.tsx` (PKG-9) عرضٌ لا بيانات:**
```diff
- try { consume(window.sessionStorage.getItem('qimmah:quick-log-intent')) } catch { }
+ apply(takeQuickLogIntent(['meal', 'water']))
```
و**«ماء» صارت نيّة عاملة** بعد أن كانت زرًّا ميتًا (BUG-025) — عبر `focusRequested`
على `WaterPanel`، **لا بإضافة ماء نيابة عن المستخدم**:

> `nutrition.water` **فعل مدفوع**، وإضافته تلقائيًا تكتب بيانات لم يطلبها وتلتفّ على بوّابة Premium معًا.

`WaterPanel` اكتسب خاصّيتين اختياريتين: `focusRequested?: boolean` · `onFocusHandled?: () => void`.

### 2.10 Dashboard assumptions — ⚠ **افتراض إقلاع أشدّ**

```diff
- completed: !!parsed.completed,
+ completed: state.completed === true,
```
مع رفض صريح لكل شكل غير كائن قبله (`null` · مصفوفة · نصّ · رقم).

**الأثر:** `{"completed":"yes-please"}` كان **يفتح `#/dashboard`** لمستخدم بلا ملف ولا خطة (BUG-028).
وصفه المستند بدقّة: **«دخول صامت على بيانات غير موجودة، أخطر من الانهيار لأنه لا يُرى.»**

**ولا ثمن للتشدّد:** المفتاح لم يُكتب قط إلا `true` أو `false` (`markCompleted`/`resetOnboarding`)،
والمسار القديم في `syncService` يستعمل `=== true` أصلًا — فهذا **التزام بسابقة قائمة** لا اختراع.

**افتراض ثانٍ تغيّر — `openQuickLog` في `App.tsx`:**
```diff
- window.sessionStorage.setItem('qimmah:quick-log-intent', target)   // تُكتب أولًا
- navigate(...)                                                       // ثم يُحسم المقصد
+ const destination = guardRoute(intended, uid)                       // يُحسم المقصد أولًا
+ if (destination !== intended) { setView(destination); return }      // حوّل الحارس ⇒ لا نيّة تُكتب
+ requestQuickLogIntent(target); navigate(intended)
```
**القاعدة الجديدة:** النيّة تُكتب **بعد** حسم المقصد لا قبله.

### 2.11 Test harnesses — ⚠ **٥ سكربتات جديدة و٥ معدَّلة**

**جديد بعد PKG-7:**

| السكربت | npm script | داخل `test:gate`؟ | داخل CI؟ |
|---|---|---|---|
| `scripts/profile-reliability-proof.ts` + runner | `test:profile-reliability` | ✅ **عبر `test:profile-wording`** | ✅ |
| `scripts/e2e/profile-reliability.mjs` | `test:e2e:profile` | ❌ | ❌ |
| `scripts/quick-log-reliability-proof.ts` + runner | `test:quick-log` | ✅ **مباشرة** | ✅ |
| `scripts/e2e/dirty-state-recovery.mjs` | `test:e2e:dirty-state` | ❌ | ❌ |
| `scripts/production-bundle-safety-proof.mjs` | `test:bundle-safety` | ❌ | ❌ |

**معدَّل بعد PKG-7:** `run-delete-account-proof.mjs` (تعليق ← ربط حيّ، **أقوى**) ·
`run-momentum-proof.mjs` و`run-wave5-cross-system-smoke.mjs` (`h1`→`h2`، **مكافئ**) ·
`e2e/progress-reliability.mjs` و`e2e/profile-reliability.mjs` (توقّع عنوان المسار القانوني).

**⚠ تغييران في `package.json` يجب معرفتهما قبل أي دمج:**
1. `test:gate` اكتسب `test:quick-log` **قبل** `test:workout-day-source` الأخيرة —
   بينما حارات Phase II الثلاث تُلحق سكربتاتها **بعدها**. الحلّ **اتحاد** لا اختيار طرف (§4.1).
2. `test:profile-wording` صار **سلسلة**: `run-profile-wording-proof.mjs && npm run test:profile-reliability`.

---

## 3. مصفوفة القرار — ماذا يعني كل تغيير لمن يبني فوق الرأس

| # | التغيير | PKG | Phase II يجب أن يتكيّف؟ | لماذا |
|---|---|---|---|---|
| C-1 | حذف `ProfileV2Model.settings` | 8 | **لا حاليًا** — ولا حارة تقرؤه (`grep` = صفر) | كاسر لو أُضيف قارئ جديد |
| C-2 | `deleteAccountAvailable = auth.signedIn` | 8 | **لا** | لا حارة تلمس حقيقة الحساب |
| C-3 | مالك حصري لمفتاح Quick Log | 9 | **نعم — قاعدة دائمة** | أي وصول خام جديد للمفتاح **خرق**، ويسقط `test:quick-log` بفحص مسمّى |
| C-4 | `completed === true` | 9 | **لا** — لكن يجب **معرفته** | أي fixture اختبار يكتب `completed` بقيمة غير منطقية **لن يُقبل بعد اليوم** |
| C-5 | `openQuickLog` يحسم المقصد قبل الكتابة | 9 | **لا** | داخلي في `App.tsx` |
| C-6 | شاشات Profile الداخلية `data-privacy`/`data-settings` | 8 | **لا** | داخلي؛ لا مسار hash |
| C-7 | `h1` واحد يملكه `MobileShell` | 8 | **نعم — اللوحة التنفيذية** | `AdminShell` سيحتاج قرار عنوان صريحًا؛ الحارس `test:e2e:profile` **خارج CI** |
| C-8 | `test:gate` اكتسب `test:quick-log` | 9 | **نعم — كل حارة تعدّل `package.json`** | تعارض نصّي مؤكَّد ⇒ اتحاد + §4.1 |
| C-9 | `test:profile-wording` صار سلسلة | 8 | **نعم — نفس السبب** | نفس السطر |
| C-10 | حارس سلامة الأصل المبني | 9 | **نعم — حارة الطعام** | أي بيانات جديدة تُشحن تمرّ بأصل الإنتاج |

---

## 4. ما لم يتغيّر — وهو الأهمّ عمليًا

| المنطقة | آخر مسّ | الحالة |
|---|---|---|
| `src/lib/appRoutes.ts` | PKG-6 | ✅ مستقرّ — داخل قاعدة Phase II |
| `src/lib/access/**` (كل الطبقة) | FUX-2 | ✅ مستقرّ — `PAID_ACTIONS` = 13 |
| `src/lib/planGenerator.ts` · `planRationale.ts` | — | ✅ **لم تُمسّ إطلاقًا** في البرنامج كلّه |
| منطق QAE | — | ✅ **منطقة لا-مساس** مُصانة |
| `src/lib/exerciseLibrary.ts` · `ExerciseDetail.tsx` | PKG-6 | ✅ مستقرّ |
| `src/lib/nutritionV2Model.ts` · `nutritionTracking.ts` | PKG-3 | ✅ مستقرّ |
| `src/views/SettingsView.tsx` · `numberFormat.ts` · `DataManagementPanel.tsx` | PKG-7 | ✅ مستقرّ |
| `src/lib/userDataKeys.ts` | — | ✅ السجلّ القانوني بلا تغيير |
| `src/lib/onboardingV2Flow.ts` · `types/onboarding.ts` | PKG-2 | ✅ مستقرّ |
| Supabase · القاعدة · المزامنة · Salla | — | ✅ **لم تُمسّ** — لا اعتمادية ولا خلفية تغيّرت |
| `package-lock.json` | — | ✅ **لم يتغيّر** — لا اعتمادية أُضيفت في PKG-8/9 |

---

## 5. الحكم

> **الفارق بين PKG-7 والرأس النهائي صغير ومحصور: ٩ ملفات مصدر، لا واحد منها في مسار أي حارة.**

**تعارضات الدمج المتوقّعة عند الهبوط:** `package.json` **فقط** (٣ حارات من ٥)، ويُحسم **بالاتحاد**
لا بـ`--theirs`/`--ours`، **وتُطبع قيمة `test:gate` بعد الحسم للتحقّق** (§4.1 — سابقة `license: "Commercial"`).

**ما يحتاج قرارًا واعيًا لا حسمًا آليًا:** C-3 (ملكية مفتاح Quick Log كقاعدة دائمة) و
C-7 (`h1` واحد — يخصّ اللوحة التنفيذية تحديدًا) و**ازدواج الحرّاس** (DUP-1/DUP-2 في مصفوفة الأثر).

---

*المصاحبان:* [`CODEX-WORK-TRACE.md`](./CODEX-WORK-TRACE.md) · [`PHASE-II-IMPACT-MATRIX.md`](./PHASE-II-IMPACT-MATRIX.md)
