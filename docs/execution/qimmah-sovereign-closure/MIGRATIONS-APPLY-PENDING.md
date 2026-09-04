# الهجرات المنتظرة — الترتيب والأوامر والتحقّق

> ## ⛔ [PROD-DRIFT] اقرأ هذا قبل أي شيء — حالة الإنتاج المقيسة (٤ سبتمبر ٢٠٢٦)
>
> قِيس `ledlypcyrtnzvjvhykwz` قراءةً فقط، فتبيّن ثلاثة أمور تُبطل ما كان مفترضًا:
>
> **① سجلّ الهجرات غائبٌ كليًّا.** لا مخطّط `supabase_migrations` ولا جدول
> `schema_migrations` — **صفر نسخة مسجَّلة**. ومع ذلك الجداول السبعة عشر
> موجودة بأعمدتها وسياساتها ومُشغِّلاتها الصحيحة: أجسام الأساس لُصقت يدويًّا
> بلا غلاف التسجيل. فقائمة «المنتظر» أدناه **لا تصف الإنتاج**: المنتظر هناك
> ‏**٤٤** بمنطق السجلّ، و٣٢ بمنطق المخطّط.
>
> **② ستّة جداول قديمة خارج المجلّد** (`custom_foods` · `food_logs` ·
> `progress_photos` · `weight_logs` · `workout_logs` · `workout_sets`) — صفر
> صفّ، ولا مستهلك. كانت تُجهض `20260806120003` قبل إصلاحه؛ صار الثابت شاملًا
> للمخطّط فتسقط صلاحياتها إلى الصفر وتبقى بنيتها. لا تُحذف في هذا الإصدار.
>
> **③ ثلاثة جداول تنحرف في أعمدتها** (`medication_logs` · `nutrition_logs` ·
> `supplement_logs`: عمود `data` بدل أعمدة المجلّد). **`create table if not
> exists` يتخطّاها ولن يُصالحها أبدًا** — والانحراف خامل لأنها خارج اتحاد
> `SyncTable`. يحرسه `test:baseline-parity`.
>
> ### الاستراتيجية المعتمدة للسجلّ — الخيار ١ (قرار المؤسس)
>
> تُعاد الحِزَم من ١ إلى ٨ بترتيبها، فتُنفَّذ **أجسام** الأساس فعلًا ويُبنى
> السجلّ بصدق، ويتقارب الإنتاج مع staging على تاريخٍ واحد من ٤٤ نسخة.
> **وممنوع:** إدراج صفوف السجلّ يدويًّا · `migration repair` لوسم أجسام لم
> تُنفَّذ · أساسٌ خاصّ بالإنتاج يفرّع التاريخ. سببُ المنع واحد: كلّها تَعِد
> بأن شيئًا طُبّق ولم يُتحقَّق منه — وهو بعينه ما أوصلنا إلى هنا.
>
> ### ⚠️ الحزمة ١ وحدة **لا تتجزّأ** — لا تتوقّف في منتصفها
>
> `20260713120004` يضع الطابع البسيط على `measurement_logs`، و`20260726120004`
> يستبدله بـ`set_updated_at_lww`، و`20260726120005` يُقارب البقيّة. فالتوقّف
> **بين** هذه الملفّات يترك سلطة LWW **مُكذَّبة بصمت**: طابع `now()` يفوز
> ترتيبًا أبجديًّا فيدهس أحدث القيم. مُثبَتٌ بالتنفيذ في `test:baseline-parity`
> ⑦ (يعيد إنتاج الحالة الفاسدة ثم يُغلقها). **الحزمة ١ تُلصَق كاملةً أو لا
> تُلصَق.**


> **[WAVE3]** أُضيفت `20260831120001_purchase_batch_disable` (إطفاء دفعة صكوك
> الشراء + حفظ سبب الإطفاء المفرد) — فصار المنتظر **٢٧ هجرة**، وحِزَم اللصق
> أُعيد توليدها (٨ حزم · ٤٤ هجرة). **شرط قبل رفع أي دفعة حقيقية إلى سلة**:
> بلا هذه الهجرة يدخل المخزون نافذة الحوادث بلا مِفتاح إطفاء جماعي.

> **حالة الحقيقة اليوم:** خمس وعشرون هجرة مكتوبة في المستودع و**لم تُطبَّق على أي
> قاعدة إنتاج أو تجربة**. الاثنتا عشرة الأولى من موجات سابقة، وثلاث من موجة
> `[ADMIN-R4]`، وستّ من `[COMMISSIONING]`، والأربع الأخيرة من `[ADMIN-CONV]`
> (الحملات · `signedInToday` · اكتمال صفحة الحساب · الطلبات المعلّقة).
>
> **وقد طُبّقت الحزمة كاملةً من قاعدة نظيفة** — صفر فشل — على PostgreSQL داخل
> العملية عبر `test:migration-order` و`test:admin-db` و`test:admin-codes`
> (والحزمة الأقدم على عنقود PostgreSQL 16 حقيقي عبر `test:commissioning`).
> فما ينقص هو **تفويض التطبيق على قاعدة المؤسس**، لا صحّة الهجرات.
>
> ⚠️ **وهي هجرات تُطبَّق مرّة واحدة، لا تُعاد.** إعادة تشغيل الحزمة على قاعدة
> طُبّقت عليها ترفع أخطاء (سياسات وقيود موجودة أصلًا). فخطأُ إعادةٍ **ليس**
> دليلًا على فساد القاعدة — وهذا مسجَّل هنا كي لا يُقرأ يومًا على أنه كذلك.
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

## ١. الترتيب — خمس وعشرون خطوة، بهذا التسلسل حرفيًا

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
| ١٦ | `20260824120001_roles_and_redeem_rate_limit.sql` | دور `support` · `private.is_admin`/`require_admin` · دفتر محاولات الاستهلاك · `private.redeem_core` · `redeem_access_code_v2` | ٢ · ١٠ |
| ١٧ | `20260824120002_founder_operations_reads.sql` | **تعيد تعريف** القراءات الأربع بحارس `require_admin` · `founder_failed_orders` · `founder_code_redemptions` · `founder_email_health` · `founder_grants_by_source` · وتوسّع `founder_code_page` | **١٥ و١٦ إلزامًا** |
| ١٨ | `20260824120003_food_submissions.sql` | `food_submissions` + `submit_missing_food` + طابور المراجعة وقراره | ١٦ · ١٧ |
| ١٩ | `20260824120004_activation_hardening.sql` | نزع الغلاف القديم عن العميل (تجاوز حدّ المعدّل) · `private.canonical_identity` + عمود بصمة ثانٍ على `trial_ledger` · فحص تأكيد البريد داخل `redeem_core` · طول الكود المُصدَر ٨٠ بتًا | **١٤ و١٦ إلزامًا** |
| ٢٠ | `20260824120005_campaign_is_not_a_credential.sql` | `private.issue_code_core` (موضع الإصدار الوحيد) · أرضية الإنتروبيا ترفض الكود الحرفي · `founder_issue_code_batch` · سقف القوّة يتوقّف عن ادّعاء رقم للكود اليدوي · أرضية المولّد ١٦ | **١٤ و١٩ إلزامًا** |
| ٢١ | `20260824120006_gateway_network_limit.sql` | `private.gate_attempts` + `public.gate_admit` — حدٌّ لكل **عنوان شبكة**، تناديه طرفية البوّابة بمفتاح الخدمة وحدها | ٢ (الملح) |
| ٢٢ | `20260826120001_founder_code_batches.sql` | `founder_code_batches` — الحملات مجمّعة بالوسم: صادر/مستبدَل/متبقٍ/معطَّل | ١ · ١٦ |
| ٢٣ | `20260826120002_founder_snapshot_signed_in_today.sql` | **تعيد تعريف** `founder_executive_snapshot()` بمفتاح `signedInToday` | **١٧ إلزامًا** |
| ٢٤ | `20260826120003_founder_user_detail_history.sql` | **تعيد تعريف** `founder_user_detail(uuid)` بـ`commerce.codeHistory` و`foodSubmissions` | **١٧ و١٨ إلزامًا** |
| ٢٥ | `20260826120004_founder_pending_orders.sql` | `founder_pending_orders` — أحداث سلة العالقة (`received`/`verified`) | ٨ · ١٦ |
| ٢٦ | `20260829120001_purchase_credentials.sql` | **صكّ الشراء** — `grant_purpose` على `access_codes` · `private.issue_credential_core` · `grant_premium_from_code` (السلطة الواحدة) · **تعيد تعريف** `redeem_core` بفرع الشراء · `founder_issue_purchase_batch` · `founder_purchase_batches` | **٢٠ و٢١ إلزامًا** |
| ٢٧ | `20260830120001_premium_authority_hardening.sql` | **تصليب سلطة Premium** — `entitlements.purchase_ledger_id` + فهرس فريد (شراءٌ واحد ⇒ منحة حيّة واحدة) · مُشغِّل يمنع الهبوط عن Premium · **تعيد تعريف** `grant_premium_from_code` | **٢٦ إلزامًا** |

> ⛔ **والخطوة ٢٧ بعد ٢٦ قطعًا.** تعيد تعريف `private.grant_premium_from_code`
> التي تُنشئها ٢٦، وتضيف عمودًا يقرأه جسدها الجديد. عكس الترتيب يترك السلطة
> بلا ربطٍ بشرائها — أي **بلا سدّ إعادة تدوير البريد** — بلا خطأ واحد.
>
> **تحقّق بعد ٢٦:**
> ```sql
> select to_regprocedure('public.founder_issue_purchase_batch(text, text, int, timestamptz)') is not null as issuance,
>        exists (select 1 from information_schema.columns
>                 where table_name = 'access_codes' and column_name = 'grant_purpose') as purpose_col;
> -- المتوقَّع: issuance = true · purpose_col = true
> ```
>
> **تحقّق بعد ٢٧:**
> ```sql
> select to_regclass('public.entitlements_one_live_premium_per_purchase') is not null as unique_index,
>        exists (select 1 from pg_trigger where tgname = 'entitlements_block_premium_downgrade') as downgrade_guard;
> -- المتوقَّع: كلاهما true. وإن كان أحدهما false فالسدّ غائب والصكّ الواحد يمنح مرارًا.
> ```

> ⛔ **والخطوتان ٢٣ و٢٤ بعد ١٧ قطعًا** (و٢٤ بعد ١٨ أيضًا: تقرأ `food_submissions`).
> كلتاهما تعيد تعريف دالّة عرّفتها ١٧ — عكس الترتيب يكتب النسخة القديمة فوق
> الجديدة **بلا خطأ واحد**، نفس الفخّ المُثبَت أعلاه.

> ⛔ **والخطوة ٢٠ بعد ١٤ و١٩ قطعًا.** تعيد تعريف `founder_issue_access_code`
> (من ١٤، ثم ١٩) و`admin_create_access_code` و`private.generate_access_code`.
> تطبيقها قبلهما يجعل الأقدم يكتب فوق الأحدث بلا خطأ.
>
> ⚠️ **وأثرٌ يُقال قبل التطبيق:** بعدها **لا يستطيع أحد إصدار كود يكتبه بيده**
> على المسار المتاح للمتصفّح. اسم الحملة يبقى في `p_label` كما كان دائمًا،
> والأكواد تُولَّد. من كان يخطّط لكود حملة مقروء يعرف ذلك **قبل** التطبيق لا
> بعده.

> ⛔ **والخطوة ١٩ بعد ١٤ و١٦ قطعًا.** هي تعيد تعريف `founder_issue_access_code`
> (من ١٤) و`private.redeem_core` (من ١٦)، وتنزع منحة `redeem_access_code`
> التي أضافتها ١٦. تطبيقها قبلهما يجعل الأقدم يكتب فوق الأحدث بلا خطأ — نفس
> الفخّ الموصوف أعلاه بالضبط.
>
> ⚠️ **وأثرٌ يُقال قبل التطبيق لا بعده:** بعد الخطوة ١٩، صفوف `trial_ledger`
> القائمة تبقى `canonical_hash = null` **ولا backfill لها** — السجلّ يحفظ
> البصمة لا البريد. فحارس الأسماء المستعارة **يحرس ما بعد التطبيق**، ومن
> استهلك تجربته قبله يبقى محروسًا بالبصمة الخام كما كان.

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
| ١٥ | `select prosrc like '%webhookProcessed%' from pg_proc where proname='founder_executive_snapshot';` | `true` |
| ١٦ | `select to_regprocedure('public.redeem_access_code_v2(text)') is not null and to_regprocedure('private.redeem_core(text)') is not null;` | `true` |
| ١٧ | `select prosrc like '%require_admin%' from pg_proc where proname='founder_executive_snapshot';` | **`true` — وهذا هو الفحص الذي يكشف الترتيب المعكوس**: تطبيق ١٧ قبل ١٥ يُعيد الحارس القديم بلا خطأ واحد |
| ١٨ | `select to_regprocedure('public.submit_missing_food(text,text,text,text,numeric,numeric,numeric,numeric,text,text)') is not null and (select count(*) from information_schema.role_table_grants where table_name='food_submissions' and grantee='authenticated' and privilege_type='SELECT') = 1;` | `true` · `1` |
| ٢٢ | `select to_regprocedure('public.founder_code_batches(integer)') is not null;` | `true` |
| ٢٣ | `select prosrc like '%signedInToday%' from pg_proc where proname='founder_executive_snapshot';` | `true` — **وهذا يكشف الترتيب المعكوس**: تطبيق ٢٣ قبل ١٧ يُرجِع الجسد القديم بلا خطأ |
| ٢٤ | `select prosrc like '%codeHistory%' and prosrc like '%foodSubmissions%' from pg_proc where proname='founder_user_detail';` | `true` |
| ٢٥ | `select to_regprocedure('public.founder_pending_orders(integer)') is not null;` | `true` |

**وفحص شامل أخير — الحارس في جسم كل دالة مؤسس، بدوره الصحيح:**

```sql
-- القراءات تحمل require_admin (المؤسس والدعم)، والأفعال require_founder وحدها.
-- دالّة بلا أيّ من الحارسين ⇒ توقّف فورًا ولا تُصدر الدور.
select proname,
       prosrc like '%require_admin%'   as admin_gated,
       prosrc like '%require_founder%' as founder_gated
  from pg_proc where proname like 'founder\_%' order by proname;
-- المتوقَّع: كل صفّ فيه واحد من العمودين true على الأقل — ولا **فعل**
-- (issue/enable/revoke/review/issue_batch) يحمل require_admin.
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
