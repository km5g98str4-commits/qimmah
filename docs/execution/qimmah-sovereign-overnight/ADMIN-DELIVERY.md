# المركز التنفيذي — تسليم موجة [OVERNIGHT-ADMIN]

> **الحالة بسطر واحد:** الوحدة صارت **موصولة في الكود ومركَّبة على مسار**، والأرقام
> **لا تزال غير متاحة** لأن الهجرتين اللتين تُنشئان الدور ودوال القراءة
> **لم تُطبَّقا على أي قاعدة**. هذا ليس عطلًا مُخفى: كل بطاقة تقول سببها،
> وشريط الشاشة يقول حالة القراءة باسمها.

المرجع النظري يبقى [`docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md`](../../product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md).
هذا الملف **ملحق تسليم** لا نسخة منه (الميثاق §1.5): يحمل ما تغيّر في هذه الموجة،
والعدّاد الملزم، وسجلّ الانحراف، والـrunbook.

---

## ١. ما هبط فعلًا

| البند | الملف | الحالة |
|---|---|---|
| نقطة تركيب واحدة | `src/admin/ui/AdminRoute.tsx` · تُصدَّر من `src/admin/index.ts` | ✅ |
| قراءة حيّة عبر RPC | `src/admin/contract/liveSource.ts` | ✅ في الكود · ⏳ تنتظر تطبيق الهجرة |
| تزويد دور المؤسس | `supabase/migrations/20260816120002_founder_role_provisioning.sql` | ⏳ APPLY_PENDING |
| قراءات تجميعية محروسة | `supabase/migrations/20260816120003_founder_dashboard_reads.sql` | ⏳ APPLY_PENDING |
| `adminRoleProvisioning()` صادقة | `src/admin/auth/adminRole.ts` | ✅ (كانت ثابتًا يكذب) |
| أقسام التجارة والأخطاء | `src/admin/ui/AdminShell.tsx` | ✅ |
| إثبات قاعدة بيانات منفَّذ | `scripts/run-admin-db-proof.mjs` | ✅ داخل `test:gate` |
| إثبات التركيب والرسم | `scripts/run-admin-mount-proof.mjs` | ✅ داخل `test:gate` |

**ما لم يتغيّر عمدًا:** `WIRING_STATE` في `src/admin/contract/source.ts` ما زال
`EXTERNALLY_BLOCKED` — وهو **صادق اليوم**: لا مسار قراءة مُصرَّح قائم على أي
قاعدة، والحجب من **خارج** المستودع بالضبط كما يقول الاسم. يُقلَب إلى `'LIVE'`
في الموجة التي تلي التطبيق.

---

## ٢. رقعة الوصل — تُطبَّق بيد المؤسس

الوحدة **لا تلمس** `App.tsx` ولا `appRoutes.ts` (الميثاق §1.4). الرقعتان أدناه
جاهزتان للتطبيق كما هما.

### ٢-أ) `src/lib/appRoutes.ts`

أضِف `'admin'` إلى الاتحاد وإلى `ROUTES` — **ولا تُضِفه إلى `MAIN_TABS`**:

```diff
   | 'productReview'
   | 'stats'
+  // المركز التنفيذي — يُحسم الدور داخل المكوّن، والمسار وحده لا يمنح شيئًا.
+  | 'admin'
   | 'recovery'
```

```diff
   'productReview',
   'stats',
+  'admin',
 ]
```

### ٢-ب) `src/App.tsx`

**١) في `createLazyViews()`** — بجانب بقية الحِزم الكسولة:

```diff
     MyStatsView: lazy(() => import('@/views/MyStatsView').then((m) => ({ default: m.MyStatsView }))),
     RecoveryView: lazy(() => import('@/views/RecoveryView').then((m) => ({ default: m.RecoveryView }))),
+    // المركز التنفيذي — حزمة مستقلّة لا تدخل حزمة الإقلاع. الحارس داخل المكوّن
+    // نفسه، فجلب الحزمة **لا يمنح شيئًا**: من ليس مؤسسًا يرى شاشة المنع.
+    AdminRoute: lazy(() => import('@/admin').then((m) => ({ default: m.AdminRoute }))),
   }
 }
```

**٢) في سلسلة عرض الشاشات** — يُدرَج الفرع التالي **قبل** `} else if (view === 'calc') {`:

```diff
   } else if (view === 'productReview') {
     content = import.meta.env.DEV && V.ReviewPanelView ? (
       <V.ReviewPanelView lang={LANG} onBack={() => setView('settings')} />
     ) : (
       <V.NotFoundView lang={LANG} onHome={() => setView('dashboard')} onBack={() => setView('dashboard')} />
     )
+  } else if (view === 'admin') {
+    // لا حراسة هنا عمدًا: `AdminRoute` يحسم الدور بنفسه من `app_metadata`،
+    // ويرسم شاشة المنع لكل من ليس مؤسسًا. حارسٌ ثانٍ في الموجّه كان سيصير
+    // مصدر حقيقة ثانيًا ينحرف عن الأول.
+    content = <V.AdminRoute />
   } else if (view === 'calc') {
```

**٣) لا شيء في `guardRoute`.** `'admin'` **لا يُضاف** إلى `needsAccount` ولا إلى
`MAIN_TABS`: تحويل الزائر إلى `accountRequired` كان سيقول له «أنشئ حسابًا لترى
اللوحة» — وهو وعد كاذب، لأن الحساب لا يمنح الدور. شاشة المنع أصدق.

> ⚠️ **بعد تطبيق الرقعة**، الفحصان في `scripts/admin-dashboard-proof.ts` القسم
> ١٨ ينتقلان تلقائيًا إلى الفرع «موصول»، ويطلبان أن يكون الاستيراد **كسولًا من
> `@/admin`** وأن يكون `'admin'` في `ROUTES` — فالوصل الخاطئ يُكشف باسمه.

---

## ٣. سجلّ المقاييس — المصدر الحقيقي أو سبب الغياب

| المقياس | المصدر الحقيقي | الحالة |
|---|---|---|
| `platform.buildLabel` · `platform.syncPipeline` · `platform.entitlementSource` · `platform.backendConfigured` | ملاحظة العميل لنفسه | ✅ **متاح الآن** |
| `users.total` · `users.newToday` · `users.new7d` · `users.new30d` · `users.growthSeries` | `public.profiles` عبر `founder_executive_snapshot()` | 🔌 موصول · ⏳ الهجرة |
| `users.verified` | `auth.users.email_confirmed_at` عبر نفس الدالة | 🔌 موصول · ⏳ الهجرة |
| `activity.signedIn7d` · `activity.signedIn30d` · `activity.dormant30d` | `auth.users.last_sign_in_at` | 🔌 موصول · ⏳ الهجرة |
| `entitlement.premiumActive` · `entitlement.trialActive` · `entitlement.trialExpired` · `entitlement.previewOnly` · `entitlement.conversionOfAccounts` | `public.entitlements` + `private.derive_state` | 🔌 موصول · ⏳ الهجرة |
| `entitlement.activationRedeemed` · `entitlement.activationPending` | `public.code_redemption_ledger` · `public.access_codes` | 🔌 موصول · ⏳ الهجرة |
| `commerce.ordersSeen` · `commerce.ordersFailed` | `public.salla_webhook_events` | 🔌 موصول · ⏳ الهجرة |
| `commerce.ordersPaid` | `public.purchase_ledger` | 🔌 موصول · ⏳ الهجرة |
| `commerce.codesIssued` · `commerce.codesRedeemed` · `commerce.codesUnused` | `public.access_codes` · `public.code_redemption_ledger` | 🔌 موصول · ⏳ الهجرة |
| `commerce.revokedActive` | `public.revocation_ledger` (`lifted_at is null`) | 🔌 موصول · ⏳ الهجرة |
| `entitlement.activationFailed24h` · `commerce.redemptionFailures24h` | **لا مصدر** — لا سجلّ لمحاولات مرفوضة | ⛔ غير متاح · قرار أمني |
| `errors.clientErrors24h` · `errors.rpcFailures24h` | **لا مصدر** — لا مسار أخطاء | ⛔ غير متاح |
| `activity.productActive7d` · `activity.workoutsCompleted7d` · `activity.nutritionLogged7d` · `activity.measurementsLogged30d` · `activity.activeSeries` · `activity.retentionCohorts` | `daily_logs` · `workout_sessions` · `measurement_logs` | ⛔ متحيّز بالموافقة — **لا يرفعه خادم** |
| `onboarding.completionRate` · `onboarding.stuckCount` | `profiles.data._meta.completed` | ⛔ بسط متحيّز بالموافقة |

**القاعدة المطلقة:** كل صفّ في العمودين الأخيرين يعرض «غير متاح» + سببه + مالكه.
**ولا واحد منها يعرض صفرًا.** يحرسه `test:admin-mount` بمحاكاة التفاف.

---

## ٤. عدّاد السجلّ

> ⚠️ **مربوط بالكود.** `test:admin-dashboard` يقرأ هذا الجدول ويقارنه بـ
> `METRIC_REGISTRY` رقمًا برقم. أي انحراف يُسقط البوابة **باسمه**.

| الدرجة | العدد |
|---|---|
| `AVAILABLE_NOW` | **٤** — وضع المنصّة كاملًا، ولا واحد منها يقرأ صفّ مستخدم |
| `endpoint-missing` | **٢٦** — المصدر موجود والمسار ينتظر تطبيق الهجرة |
| `source-system-missing` | **١٢** — لا جدول ولا سجلّ أصلًا |
| `IMPOSSIBLE_WITHOUT_CONSENT_CHANGE` | **٨** — متحيّز بنيويًا بمقام الموافقة |

المجموع: **٥٠ مقياسًا**.

### ٤-أ. ما أضافته موجة [ADMIN-R4] — أحد عشر بندًا

> **القاعدة الحاكمة في هذه الإضافة: مقياسٌ بلا مصدر يُعلَن «غير مقيس»، ولا
> يُحذف ولا يُصفَّر.** الحذف يجعل القمع يبدأ من «شراء» فيُقرأ كأن كل زائر
> يشتري؛ والتصفير يقول «ما دخل أحد» عن شيء لا نقيسه أصلًا.

**رحلة الزائر — سبعة بنود، `source-system-missing` كلها** (مجموعة `journey`
الجديدة). ما ينقص **ليس دالة خادم** بل خطّ أحداث عميل بأكمله: `trackLocal()`
محلّي ولا يغادر الجهاز، ولا مسار يستقبل حدثًا واحدًا. تطبيق أي هجرة **لا يرفع
هذه البنود**:

| المعرّف | المرحلة |
|---|---|
| `journey.landing` | وصلوا الصفحة الأولى |
| `journey.onboardingStarted` | بدأوا التخصيص |
| `journey.onboardingCompleted` | أكملوا التخصيص |
| `journey.reveal` | شافوا معاينة الخطة |
| `journey.premiumCta` | ضغطوا زرّ Premium |
| `journey.trialCta` | ضغطوا زرّ التجربة |
| `journey.sallaClick` | خرجوا إلى سلة |

ومرحلتا القمع الأخيرتان (**شراء** و**استحقاق**) لهما مصدر حقيقي، وتُقرآن من
`commerce.ordersPaid` و`entitlement.premiumActive` — فالقمع تسع مراحل، سبعٌ
منها تقول «غير مقيسة» صراحةً.

**تفصيل التجارة — أربعة بنود:**

| المعرّف | الدرجة | المصدر |
|---|---|---|
| `commerce.webhookProcessed` | `endpoint-missing` | `salla_webhook_events` بتصنيف `processed` |
| `commerce.webhookPending` | `endpoint-missing` | تصنيف `received`/`verified` |
| `commerce.webhookRetried` | `source-system-missing` | **لا عمود محاولات في الجدول.** الحدث المُعاد يصل ببصمة مطابقة فيُصنَّف `duplicate` — وهو ليس «إعادة محاولة» ولا يُقرأ كذلك |
| `commerce.grantsManual` | `endpoint-missing` | `entitlements` بمصدر `manual` |

**سبب لاإتاحة جديد:** `reason.notInstrumented` — نصّه يقول حرفيًا «ما نقيسه
بعد — مو صفر»، ويميّزه عن `reason.migrationPending` الذي يَعِد بأن الرقم يظهر
لحظة تطبيق الهجرة.

---

## ٥. انحراف معلَن مع وثيقة العقد

`docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md` **مملوكة لحارة أخرى** ولم
تُمَسّ في هذه الموجة، فصارت متأخّرة عن السجلّ. الانحراف **مُعلَن هنا لا مسكوت
عنه** (الميثاق §4.2)، والتعديلات المطلوبة عليها بالضبط:

1. **§10 (الخلاصة الصادقة)** — الأعداد الأربعة صارت ٤ / ٢٦ / ١٢ / ٨ والمجموع ٥٠
   (كانت ٤ / ١٦ / ٧ / ٨ ومجموعها ٣٥، ثم ٤ / ٢٣ / ٤ / ٨ ومجموعها ٣٩).
2. **§5 (جدول المقاييس)** — تُضاف أربعة أسطر لم تكن موجودة:
   `entitlement.trialExpired` · مجموعة `commerce` الثمانية · مجموعة `errors`
   الاثنان.
3. **§5 (الاستحقاق)** — عمود الحالة ينتقل من `source-system-missing` إلى
   `endpoint-missing`: جداول `entitlements` و`access_codes` و
   `code_redemption_ledger` **هبطت مع خلفية التجارة** على هذا الفرع، فوصف
   «لا نظام مصدر» صار خاطئًا.

حتى تُطبَّق: **`ADMIN-DELIVERY.md` هو مرجع العدّ**، ووثيقة العقد مرجع المعنى.

---

## ٦. الـrunbook — APPLY_PENDING

**لم يُطبَّق شيء.** لا يوجد `supabase` CLI على هذا الجهاز، ولا بيئة staging،
والمشروع الوحيد **إنتاجي**. الخطوات أدناه تُنفَّذ بيد المؤسس، بالترتيب.

### ٦-أ) قبل أي شيء — نسخة احتياطية
لقطة قاعدة (Dashboard ← Database ← Backups) قبل أي هجرة على الإنتاج.

### ٦-ب) تطبيق الهجرتين

```bash
# الترتيب إلزامي: الثانية تنادي private.require_founder() من الأولى.
supabase db push            # أو: تنفيذ الملفّين نصًّا في SQL Editor بالترتيب
```

الملفّان:
1. `supabase/migrations/20260816120002_founder_role_provisioning.sql`
2. `supabase/migrations/20260816120003_founder_dashboard_reads.sql`

كلاهما `create or replace` بالكامل — **قابلان لإعادة التشغيل بلا أثر جانبي**،
ولا يحملان `drop` ولا `delete` ولا `truncate` ولا `alter table` واحدة.

### ٦-ج) منح الدور — **بمفتاح `service_role` حصرًا، ومرّة واحدة**

من SQL Editor في لوحة Supabase (يعمل بصلاحية المالك):

```sql
select public.admin_set_role('<بريد-المؤسس>', 'founder', 'OVERNIGHT-ADMIN initial provisioning');
```

> ⛔ **لا تنادِ هذه الدالة من التطبيق ولا من أي كود يصل المتصفّح.** لا `anon`
> ولا `authenticated` تملك EXECUTE عليها؛ ولو نُوديت من العميل لعادت
> `permission denied` — وهذا هو المقصود.

### ٦-د) تحديث الجلسة

`app_metadata` يدخل الـJWT عند إصداره. بعد المنح: **سجّل خروجًا ثم دخولًا**
(أو انتظر تجديد الرمز) وإلا بقيت الجلسة القديمة بلا الادّعاء. الشاشة ستقول
حينها `denied-by-server` — وهي رسالة صحيحة لا عطل.

### ٦-هـ) التحقّق

```sql
-- ١) الدور وصل الحساب
select raw_app_meta_data ->> 'qimmah_role' from auth.users where email = '<بريد-المؤسس>';
-- ٢) الدالة تعمل للمؤسس وتُرفض لغيره (نفّذ الثاني من جلسة مستخدم عادي)
select public.founder_executive_snapshot();
```

ثم افتح `#/admin`: الشريط العلوي يجب أن يقول «الأرقام تحت جاية من الخادم الآن».

### ٦-و) التراجع

```sql
select public.admin_clear_role('<بريد-المؤسس>', 'rollback');
-- ولإزالة المسار كلّه (لا يحذف أي بيانات):
drop function if exists public.founder_executive_snapshot();
drop function if exists public.founder_user_page(text,int,int);
```

---

## ٧. ما لم يُنفَّذ — بصراحة

| البند | لماذا |
|---|---|
| تطبيق الهجرتين | لا CLI ولا staging على الجهاز؛ المشروع الوحيد إنتاجي (§6). |
| صفحة تفصيل مستخدم حيّة | لا دالة تفصيل، والتعمّق يفتح سطح خصوصية يستحق موجته. الجدول يعمل بلا زرّ «افتح» بدل أن يَعِد بما لا يفتح. |
| أفعال إدارية (منح/إيقاف من الشاشة) | القدرة موجودة في القاعدة (`admin_grant_premium` · `admin_revoke`) لكنها `service_role`، ووصلها بالمتصفّح يحتاج Edge Function مُراجَعة. **اللوحة للقراءة فقط.** |
| `activity.*` و`onboarding.*` | متحيّزة بمقام الموافقة — **قرار منتج لا نقص مسار**، ولا يرفعها تطبيق هجرة. |
| سجلّ محاولات التفعيل المرفوضة | سجلّ يحمل الأكواد المُدخَلة يصير قاموس تخمين. المقبول عدّاد مجمَّع بالنافذة — قرار أمني قائم بذاته. |
| قلب `WIRING_STATE` إلى `LIVE` | يتبع التطبيق، لا يسبقه. |
