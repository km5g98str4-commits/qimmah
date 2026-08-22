# الهجرات المنتظرة — الترتيب والأوامر والتحقّق

> **حالة الحقيقة اليوم:** خمس عشرة هجرة مكتوبة في المستودع و**لم تُطبَّق على أي
> قاعدة قط** — لا إنتاج ولا تجربة. الاثنتا عشرة الأولى من موجات سابقة، والثلاث
> الأخيرة من موجة `[ADMIN-R4]`.
>
> ⛔ **لا يُطبَّق شيء من هذا الملف آليًا.** التطبيق فعل مؤسس، ويحتاج تفويضًا
> مسمّىً في كل مرّة (الميثاق §1). ما هنا **قائمة وأوامر ومتحقّقات**، لا سكربت.

**مربوط بالكود:** `test:migration-order` يقرأ هذا الملف ويقارنه بشجرة
`supabase/migrations/**` — كل هجرة منتظرة يجب أن تكون مسمّاة هنا، **وبالترتيب
نفسه**. وثيقةٌ ترتّب خطأً أخطر من لا وثيقة.

---

## ٠. لماذا الترتيب حاكم — وليس نصيحة

تسع دوال في هذا المستودع معرَّفة في **أكثر من هجرة** بـ`create or replace`.
ومعنى ذلك بالضبط:

> **هجرة متأخّرة طُبِّقت مبكّرًا تكتب النسخة القديمة فوق الجديدة — بلا خطأ واحد.**

لا رسالة، لا تحذير، لا فشل. القاعدة تبدو سليمة تمامًا وهي ناقصة. وهذا مُثبَت
بالتنفيذ لا مفترضًا: `test:migration-order` يبني قاعدة ثانية بترتيب معكوس
لملفّين متعاقبين، ويؤكّد أن **لا خطأ يُرفع** وأن حقول الهجرة الأخيرة **اختفت**.

---

## ١. الترتيب — خمس عشرة خطوة، بهذا التسلسل حرفيًا

| # | الملف | ماذا يفعل | يعتمد على |
|---|---|---|---|
| ١ | `20260806120001_entitlements_core.sql` | مخطّط الوصول: `identity_pepper` · `access_codes` · `entitlements` · `access_code_redemptions` · `code_redemption_ledger` · `purchase_ledger` + دوال البصمة + RLS | — |
| ٢ | `20260806120002_entitlement_rpcs.sql` | دوال الوصول: `derive_state` · `my_entitlement` · `start_trial` · `redeem_access_code` · الدوال الإدارية | ١ |
| ٣ | `20260806120003_table_privileges_hardening.sql` | أقلّ امتياز على مستوى الجدول بدل المنح الافتراضي | ١ |
| ٤ | `20260809120001_revocation_ledger.sql` | سجلّ الإلغاء الدائم — الحظر ينجو من حذف الحساب | ١ · ٢ |
| ٥ | `20260809120002_code_grant_recovery.sql` | استرجاع منح الأكواد بالاتجاهين | ٤ |
| ٦ | `20260809120003_public_execute_hardening.sql` | إغلاق `EXECUTE` عبر `PUBLIC` — الموجود يُكنَس والقادم لا يرث | ٣ |
| ٧ | `20260809120004_entitlement_security_remediation.sql` | **المرجع الأمني**: عقد شكل الكود · تطبيع الاسترداد · مصدر المنحة | ٢ · ٤ · ٥ |
| ٨ | `20260812120001_salla_webhook_ingest.sql` | `salla_webhook_events` + مسار الابتلاع فوق الأساس المُراجَع | ٧ |
| ٩ | `20260816120001_commerce_integrity_fixes.sql` | تصحيحا سلامة التجارة (اكتُشفا بمهاجمة المخطّط) | ٨ |
| ١٠ | `20260816120002_founder_role_provisioning.sql` | `private.account_role` · `is_founder` · **`require_founder`** · `admin_set_role`/`admin_clear_role` | — (يحتاج `private`) |
| ١١ | `20260816120003_founder_dashboard_reads.sql` | `founder_executive_snapshot()` · `founder_user_page()` | ١٠ · ١ · ٨ |
| ١٢ | `20260816120004_email_outbox.sql` | صندوق البريد الصادر — إضافة صرفة | ١ |
| ١٣ | `20260822120001_founder_user_detail.sql` | `founder_user_detail(uuid)` — صفحة الحساب الواحد | ١٠ · ١١ |
| ١٤ | `20260822120002_founder_code_management.sql` | `generate_access_code` · `founder_issue_access_code` · `founder_set_code_enabled` · `founder_revoke_access` · `founder_code_page` | ١٠ · ٧ · ٤ |
| ١٥ | `20260822120003_founder_snapshot_commerce_detail.sql` | **تعيد تعريف** `founder_executive_snapshot()` بحقول الـwebhook والمنح اليدوية | **١١ إلزامًا** · ٨ |

> ⛔ **الخطوة ١٥ بعد ١١ قطعًا.** عكسهما هو المثال المُثبَت أعلاه: تعود النسخة
> القديمة بلا خطأ، فتظهر اللوحة صادقة وهي عمياء عن حالة الـwebhook.

---

## ٢. خطوة الملح اليدوية — قبل أي كتابة، ومرّة واحدة

بعد الخطوة ١ وقبل أي استعمال، يُبذر سرّ البصمة يدويًا. **بدونه ترفع كل دالة
كتابة استثناء `identity_pepper: no active version`** — الاسترداد والمنح
والحظر كلها.

```sql
-- محرّر SQL في لوحة Supabase · مرّة واحدة لكل مشروع · لا يُكرَّر
insert into private.identity_pepper (version, pepper)
values (1, '<٣٢ حرفًا عشوائيًا على الأقل — وَلِّده خارج المتصفّح>');
```

**التحقّق:**

```sql
select version, length(pepper) >= 32 as ok, retired_at from private.identity_pepper;
-- المتوقَّع: صفّ واحد · ok = true · retired_at = null
```

> ⚠️ **السرّ لا يُكتب في المستودع ولا في أي ملف بيئة للعميل.** ولا يُحذف أبدًا
> عند التدوير: التقاعد وسم (`retired_at`) لا حذف — حذفه يفتح ثغرة إعادة تجربة
> بصمت (رأس `20260806120001`).

---

## ٣. الأوامر التي يشغّلها المؤسس

**قبل كل شيء:** مشروع تجربة منفصل. `db:verify` ينشئ مستخدمين ويحذفهم — لا
يُشغَّل على الإنتاج أبدًا.

```bash
# ① ربط المشروع (مرّة واحدة)
supabase link --project-ref <PROJECT_REF>

# ② معاينة ما سيُطبَّق — بلا تنفيذ
supabase db diff --linked

# ③ التطبيق بالترتيب أعلاه (الـCLI يطبّق معجميًا = نفس الترتيب)
supabase db push

# ④ بذر الملح — من محرّر SQL في اللوحة (§٢)، لا من الـCLI
```

> **ملاحظة تشغيلية مسجَّلة:** `supabase` CLI **غير مثبَّت على جهاز التطوير
> الحالي**، ولا يوجد مشروع تجربة منفصل حتى كتابة هذا السطر. الخطوتان شرطان
> سابقان على التطبيق، لا تفصيلان.

---

## ٤. التحقّق بعد كل خطوة

| بعد | استعلام التحقّق | المتوقَّع |
|---|---|---|
| ١ | `select count(*) from information_schema.tables where table_schema='public' and table_name in ('access_codes','entitlements','purchase_ledger','code_redemption_ledger','access_code_redemptions');` | `5` |
| ٢ | `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('my_entitlement','start_trial','redeem_access_code');` | `3` |
| ٣ | `select count(*) from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE');` | `0` |
| ٤ | `select count(*) from information_schema.tables where table_schema='public' and table_name='revocation_ledger';` | `1` |
| ٥ | `select prosrc like '%code_redemption_ledger%' from pg_proc where proname='claim_pending_grants';` | `true` |
| ٦ | `select count(*) from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE' and p.pronamespace='public'::regnamespace;` | `0` |
| ٧ | `select to_regprocedure('private.normalize_access_code(text)') is not null;` | `true` |
| ٨ | `select count(*) from information_schema.tables where table_schema='public' and table_name='salla_webhook_events';` | `1` |
| ٩ | `select to_regprocedure('public.salla_ingest_event(text,text,text,text,integer,text,text,boolean,text)') is not null;` | `true` |
| ١٠ | `select to_regprocedure('private.require_founder()') is not null;` | `true` |
| ١١ | `select to_regprocedure('public.founder_executive_snapshot()') is not null and to_regprocedure('public.founder_user_page(text,integer,integer)') is not null;` | `true` |
| ١٢ | `select count(*) from information_schema.tables where table_schema='public' and table_name='email_outbox';` | `1` |
| ١٣ | `select to_regprocedure('public.founder_user_detail(uuid)') is not null;` | `true` |
| ١٤ | `select to_regprocedure('private.generate_access_code(integer)') is not null and to_regprocedure('public.founder_code_page(text,integer,integer)') is not null;` | `true` |
| ١٥ | `select prosrc like '%webhookProcessed%' from pg_proc where proname='founder_executive_snapshot';` | **`true` — وهذا هو الفحص الذي يكشف الترتيب المعكوس** |

**وفحص شامل أخير — البوّابة في جسم كل دالة مؤسس:**

```sql
select proname, prosrc like '%require_founder%' as gated
  from pg_proc where proname like 'founder\_%' order by proname;
-- المتوقَّع: كل صفّ gated = true. أي false ⇒ توقّف فورًا ولا تُصدر الدور.
```

---

## ٥. تزويد دور المؤسس — آخر خطوة، وبعد التحقّق لا قبله

الدور يُصدَر من **مفتاح الخادم حصرًا** ولا مسار عميل واحد يصل إليه:

```sql
select public.admin_set_role('<بريد المؤسس>', 'founder', '<سبب مكتوب>');
```

**التحقّق:**

```sql
select raw_app_meta_data ->> 'qimmah_role'  as role,
       raw_app_meta_data ->> 'qimmah_role_set_at' as set_at,
       raw_user_meta_data ? 'qimmah_role'   as forged_copy_exists
  from auth.users where lower(email) = lower('<بريد المؤسس>');
-- المتوقَّع: role = 'founder' · set_at مكتوب · forged_copy_exists = false
```

> ⚠️ **تسجيل الخروج والدخول من جديد بعد التزويد.** الادّعاء يُقرأ من الجلسة،
> والجلسة القائمة صدرت قبل أن يُكتب الدور.

**التراجع الكامل بخطوة واحدة:**

```sql
select public.admin_clear_role('<بريد المؤسس>', '<سبب>');
```

---

## ٦. المخاطر الباقية — مسمّاة لا مسكوتًا عنها

1. **لا مشروع تجربة.** كل ما سبق مُثبَت على PostgreSQL داخل العملية (PGlite)
   عبر `test:admin-db` · `test:admin-codes` · `test:migration-order` ·
   `test:entitlements` · `test:privileges`. وذلك **إثبات سلوك لا إثبات بيئة**:
   فروق نسخة Postgres وامتدادات Supabase وطبقة PostgREST خارج الصندوق.
2. **`auth.users` مصغّر في الصندوق.** الأعمدة الثلاثة
   (`raw_app_meta_data` · `last_sign_in_at` · `created_at`) تُضاف في الإثبات لا
   في الهجرة — الهجرة لا يجوز أن تعدّل مخطّط المصادقة الذي تديره المنصّة.
3. **تحديد معدّل محاولات الاسترداد خارج قدرة PostgreSQL وحدها** (الدالة لا ترى
   عنوان IP). عائق معلَن في وثيقة المعمارية، ولا يُخترع هنا محدِّد وهمي.
4. **الحظر يطارد الهوية المُبصَمة لا الشخص.** بريد جديد كليًا = هوية جديدة —
   حدّ بنيوي معلَن.
