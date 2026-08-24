# طلب تنفيذ إلى كود اكس — تشغيل staging

> **تحديث بعد محاولتك الأولى — اقرأ هذا القسم قبل كل شيء.**
>
> ✅ **مشروع staging أُنشئ:** `odpkvswfiihrkglgfghd` — والإنتاج لم يُمَسّ. ممتاز.
>
> ✅ **وتوقُّفك عند السقوط بدل إصلاحه كان صحيحًا تمامًا** — الخطأ الذي أرسلتَه
> كشف عيبًا حقيقيًّا في أدواتنا، ولو أصلحتَه في مكانه لبقي مخفيًّا.
>
> ### سبب السقوط — وليس هجراتنا
>
> `permission denied to alter role` جاء من **تشغيل `scripts/db/lib/supabase-shim.sql`
> على القاعدة الحقيقية**. وذلك الملف يجعل Postgres عاديًّا **يشبه** Supabase،
> ولا يُشغَّل **على** Supabase (الذي يملك تلك الأدوار سلفًا). اسمه كان مضلّلًا.
>
> **أُصلح الآن:** الملف يرفض العمل على قاعدة Supabase حقيقية برسالة مسمّاة.
> ومعه أُصلح عيبٌ أعمق: كل إثباتاتنا كانت تعمل بصلاحية superuser، وSupabase لا
> يعطيها. صار عندنا إثبات `test:nonsuperuser-apply` يطبّق **الهجرات الثلاث
> والثلاثين بدور غير متميّز** — ويمرّ ٣٣/٣٣.
>
> **⇒ هجراتنا لا تحتاج superuser. ما فشل هو الأداة الخطأ في المكان الخطأ.**
>
> ### ولا تحتاج كلمة مرور القاعدة أصلًا
>
> عندك أدوات Supabase — استعمل `apply_migration` / `execute_sql`، وهي تمرّ عبر
> واجهة الإدارة بلا `psql` وبلا كلمة مرور. **§٣ أدناه أُعيدت كتابتها لهذا
> المسار.** ولا تشغّل الشيم إطلاقًا.

---

> **إلى:** كود اكس (يملك صلاحية Supabase التي لا أملكها).
> **الفرع:** `codex/qimmah-final-sovereign-convergence-001` · **الرأس:** آخر التزام على الفرع
> **لا تبنِ شيئًا جديدًا.** كل الكود جاهز ومُختبَر. المطلوب **تشغيل** لا تطوير.

---

## ٠. اقرأ هذا أوّلًا — أربعة ممنوعات قاطعة

| ممنوع | لماذا |
|---|---|
| ❌ لمس مشروع الإنتاج `ledlypcyrtnzvjvhykwz` بأي شكل | حارس `preflight` يرفضه بالاسم — **لا تتجاوزه** |
| ❌ توليد كلمة مرور لمستخدم أو إرسالها | التفعيل يمرّ دائمًا برابط دعوة أو كلمة يضعها المستخدم |
| ❌ إدخال أي سرّ في Git | المفاتيح في لوحة Supabase وحدها. `.env` في `.gitignore` |
| ❌ الدمج إلى `main` أو `push --force` | الدمج بيد المؤسس حصرًا |

**وممنوع كذلك:** إعادة تصميم أي شيء · تعطيل اختبار ليمرّ · «إضعاف مؤقّت للأمان»
لتخضرّ بوّابة · شراء حقيقي من سلة (انظر §٩).

---

## ١. أنشئ مشروع staging — ✅ **منجَزة**

`odpkvswfiihrkglgfghd` · `https://odpkvswfiihrkglgfghd.supabase.co` · `ACTIVE_HEALTHY`.

**الباقي منها:** أرسل `anon key` (معرّف عام يظهر في الحزمة أصلًا — إرساله آمن).
أمّا `service_role key` وكلمة مرور القاعدة فـ**لا تُرسَل ولا تُكتب في أي ملف**.

---

## ٢. سجّل المرجع في حارس البيئة

```jsonc
// scripts/staging/environment.json
"stagingAllowedRefs": ["<ref>"],
"productionRefs": ["ledlypcyrtnzvjvhykwz"]   // ← موجود سلفًا، لا تلمسه
```

**تحقّق (الاثنان معًا، وإلا لا تكمل):**

```bash
SUPABASE_PROJECT_REF=<ref>                node scripts/staging/preflight.mjs   # يمرّ
SUPABASE_PROJECT_REF=ledlypcyrtnzvjvhykwz node scripts/staging/preflight.mjs   # production_ref_denied
```

---

## ٣. طبّق الهجرات — ✅ **منجَزة**

طُبِّقت الحِزَم الست على `odpkvswfiihrkglgfghd`، وصفّ التحقّق عاد:

```
tables 27 · with_rls 27 · policies 71 · anon_writes 0
pepper 1 · client_rpcs 6 · legacy_open 0 · migrations 33
```

⚠️ **وهذا يقول إن البنية موجودة، لا إنها تعمل** — ولذلك §٣٫٥.

<details><summary>التعليمات الأصلية (للمرجع)</summary>

### طبّق الهجرات — عبر أدوات Supabase، بلا كلمة مرور

**لا تشغّل `supabase-shim.sql`.** وهو الآن يرفض ذلك من نفسه.

طبّق ملفات `supabase/migrations/*.sql` **بترتيب اسمها** واحدًا واحدًا عبر
`apply_migration` (اسم الهجرة = اسم الملف بلا `.sql`). ثلاث وثلاثون ملفًّا.

**الترتيب مُلزَم** — بعضها يعيد تعريف دوالّ سابقة، وعكسه يجعل الأقدم يكتب فوق
الأحدث بلا خطأ.

### ثم بذرة الملح — خطوة لا تنشئها أي هجرة (لأنها سرّ)

بدونها ترفع **كل** دالّة كتابة `identity_pepper: no active version` عند أول
مستخدم حقيقي. عبر `execute_sql`:

```sql
insert into private.identity_pepper (version, pepper)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (version) do nothing;
```

> ⚠️ **لا تطبع الملح ولا ترسله.** ولا تعِد تشغيلها إن كان مبذورًا — استبدال ملح
> قائم يُبطل كل بصمة مسجَّلة (التجارب والأكواد والمشتريات).

### ثم تحقّق — من الكتالوج الحيّ لا من عدّ الملفات

```sql
select
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r')                              as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity)         as with_rls,
  (select count(*) from pg_policies where schemaname='public')               as policies,
  (select count(*) from information_schema.role_table_grants
    where grantee='anon' and table_schema='public'
      and privilege_type in ('INSERT','UPDATE','DELETE'))                    as anon_writes,
  (select count(*) from private.identity_pepper)                             as pepper,
  (select count(*) from information_schema.role_routine_grants
    where grantee in ('anon','authenticated') and routine_schema='public'
      and routine_name='redeem_access_code')                                 as legacy_open;
```

**المتوقَّع:** `tables = with_rls` · `policies > 0` · `anon_writes = 0` ·
`pepper = 1` · `legacy_open = 0`.

**أرسل لي هذا الصفّ كما هو.**

</details>

---

## ٣٫٥. الفحص السلوكي — الخطوة التالية مباشرةً

الصق في **SQL Editor** ملفًّا واحدًا:

```
docs/execution/qimmah-sovereign-closure/staging-smoke.sql
```

يمرّ على الرحلات التجارية كما يمرّ عليها مستخدم حقيقي: تجربة ٧٢ ساعة تُمنح
مرّة واحدة · وسم `+` لا يفتح ثانية · كود يُصدَر بستّة عشر رمزًا · كودٌ مقروء
مثل `RAMADAN2345` يُرفض · الاسترداد يفتح الوصول وإعادته تُرفض · حدّ المعدّل
يُطلق. ثم **ينظّف نفسه** فلا يترك أثرًا يلتبس ببياناتك.

⚠️ **شغّله قبل أن تنشئ حسابك** (§٦). حارسه يرفض العمل على قاعدة فيها حساب
حقيقي — وهو ما يحميك من تشغيله على الإنتاج، ويعني أنه يعمل مرّة واحدة فقط
قبل أوّل تسجيل.

**المتوقَّع:** `✅ الفحص السلوكي: 9 نجحت · ٠ فشل`
ثم الصفّ الأخير: `leftover_users = 0 · leftover_codes = 0 · total_users = 0`.

**أرسل الإشعارات التسعة والصفّ الأخير كما هي.** وأي `✗` = توقّف وأرسله بلا إصلاح.

---

## ٤. اضبط المصادقة

- **فعّل تأكيد البريد (Email confirmations).** ⚠️ **حرج**: التجربة والاسترداد
  والمطالبة كلّها تشترط `email_confirmed_at`. بدونه لا يعمل شيء.
- أضف روابط إعادة التوجيه (Redirect URLs) لرابط المعاينة الذي ستنشره في §٧.

---

## ٥. ابنِ التطبيق على staging وانشره

```bash
VITE_SUPABASE_URL='https://<ref>.supabase.co' \
VITE_SUPABASE_ANON_KEY='<anon key>' \
npm run build
```

> ⚠️ **اترك `VITE_APP_ENV` بلا قيمة.** لو ضبطتَها `founder_preview` لصارت
> الاستحقاقات تُقرأ من مخزن تقليد محلّي ولا تلمس staging إطلاقًا — أي نسخة
> «تجريبية» تُثبت التطبيق ولا تُثبت الخادم بشيء.

**تحقّق قبل النشر (سطر واحد):**

```bash
grep -rl 'ledlypcyrtnzvjvhykwz' dist/assets/*.js | wc -l    # لازم 0
grep -rl '<ref>'                dist/assets/*.js | wc -l    # لازم ≥ 1
```

انشر `dist/` على نطاق معاينة، وأعطني الرابط.

---

## ٦. أنشئ حساب المؤسس ثم أسنِد الدور

**بهذا الترتيب:**

1. يسجّل المؤسس حسابه **من التطبيق نفسه** (تسجيل عادي) ويؤكّد بريده.
2. ثم عبر `execute_sql` (بلا كلمة مرور):

```sql
select public.admin_set_role('<بريد المؤسس>', 'founder', 'staging commissioning');
```

**تحقّق:**

```sql
select email, raw_app_meta_data ->> 'qimmah_role' as role
from auth.users where email = '<بريد المؤسس>';
```

**المتوقَّع:** `role = founder`.

> ⚠️ الدور يُكتب في `raw_app_meta_data` وحده — لا في `user_metadata` الذي
> يستطيع المستخدم تعديله بنفسه. ولا يُنشأ حساب هنا ولا تُولَّد كلمة مرور.

---

## ٧. انشر الطرفيتين

```bash
npx supabase@2.115.0 functions deploy salla-webhook  --project-ref <ref> --use-api
npx supabase@2.115.0 functions deploy qimmah-gateway --project-ref <ref> --use-api
```

> `--use-api` يحزم على الخادم بدل Docker محلّيًا — بدونه تسقط على آلة بلا Docker.
> والأداة تعمل بـ`npx` بلا تثبيت (مقيس). فالنشر **محجوبٌ باعتماد لا بأداة**:
> يحتاج `SUPABASE_ACCESS_TOKEN` **في بيئة جلستك**.
> ⛔ **ولا يُلصَق رمز وصول في محادثة** — رمزٌ ظهر في محادثة محروقٌ ويُلغى فورًا.


`supabase/config.toml` موجود ويحمل `verify_jwt` لكل طرفية — **لا تعدّله**.

### ⚠️ الفحص الأهمّ في هذه المهمّة كلّها

بوّابة منصّة Supabase تتحقّق من JWT افتراضًا، وسلة **لا ترسل JWT**. فإن لم
يسرِ `verify_jwt = false` رُدّت **كل** عملية شراء ٤٠١ **قبل أن يعمل سطر من
كودنا** — ولا يظهر ذلك في أي اختبار عندنا.

```bash
curl -i -X POST 'https://<ref>.supabase.co/functions/v1/salla-webhook' \
  -H 'content-type: application/json' -d '{}'
```

| ما يعود | الحكم |
|---|---|
| `{"outcome":"unauthorized","reason":"missing_signature"}` | ✅ **كودنا عمل ورفض** — `verify_jwt` سرى |
| ٤٠١ بشكل آخر (رسالة المنصّة) | ❌ البوّابة ردّت قبلنا — **لم يسرِ**. انشر بـ`--no-verify-jwt` |

**أرسل لي جسم الردّ حرفيًّا.**

---

## ٨. اضبط الأسرار (لوحة Supabase → Edge Functions → Secrets)

```
SALLA_WEBHOOK_SECRET        سرّ التوقيع من لوحة سلة
SALLA_AMOUNT_POLICY         off                    ← عمدًا حتى تُلتقط حمولة حقيقية
SALLA_PAID_STATUS_SLUGS     completed
SALLA_EXPECTED_PRODUCT_IDS  <معرّف منتج قِمّة>
QIMMAH_GATE_SECRET          ٣٢ محرفًا عشوائيًّا فأكثر (openssl rand -hex 32)
```

> `SALLA_AMOUNT_POLICY=off` مقصود: المقارنة تجري على **إجمالي الطلب** الذي قد
> يشمل الشحن والضريبة. تُضبط `exact` بعد رؤية حمولة حقيقية، لا قبلها.

---

## ٩. سلة — استكشاف بلا صرف

**اكتشف وأبلغ، ولا تشترِ:**

- هل لسلة صندوق اختبار (sandbox/test order) لهذا المتجر؟
- معرّف منتج قِمّة · السعر الحالي · شرائح الحالة المتاحة
- استراتيجية التوقيع المضبوطة (`signature` أم `token`) · رابط الـwebhook

> ⛔ **لا تنفّذ شراءً بمال حقيقي.** إن كان الشراء الحقيقي هو الإثبات الوحيد
> المتبقّي فأبلغ فقط — القرار للمؤسس وحده (١٩٫٩٩ ريالًا).

---

## ١٠. فحص ترويسة عنوان العميل — عشر دقائق

هذا يفكّ آخر مجهول في حدّ الشبكة.

انشر طرفية مؤقّتة تعيد ترويسات الطلب:

```ts
Deno.serve((req) => new Response(
  JSON.stringify(Object.fromEntries(req.headers)), { headers: {'content-type':'application/json'} }))
```

نادِها **من شبكتين مختلفتين** (جوال + واي‑فاي مثلًا)، وأبلغني:
**أي ترويسة حملت العنوان الحقيقي فعلًا** (`cf-connecting-ip` · `x-real-ip` ·
`x-forwarded-for` · غيرها). ثم **احذف الطرفية المؤقّتة**.

---

## ١١. شغّل الرحلات على القاعدة الحقيقية

```bash
DATABASE_URL='…' node scripts/db/commissioning-journeys.mjs
```

**متوقَّع:** `✅ رحلات التكليف: 125 نجحت · 0 فشلت`.
**أي فشل هنا فرقٌ حقيقي بين Supabase وبيئتنا — أرسله كاملًا ولا تُصلحه بنفسك.**

> **وعلاقتها بـ§٣٫٥:** ذاك فحصٌ من المتصفّح يغطّي الرحلات التجارية الأربع بلا
> طرفية ولا كلمة مرور — وهو ما أمكن فعله فعلًا. وهذا أوسع (١٢٥ فحصًا) لكنّه
> يشترط `DATABASE_URL`. **فلا يُغني أحدهما عن الآخر**: §٣٫٥ يُشغَّل الآن،
> و§١١ حين تتوفّر طرفية بكلمة مرور القاعدة.

---

## ما أريده منك في التقرير

| أرسل | لا ترسل أبدًا |
|---|---|
| `project ref` · `URL` · `anon key` | ❌ `service_role key` |
| رابط المعاينة | ❌ كلمة مرور القاعدة |
| مخرجات `db:commission` كاملة | ❌ `SALLA_WEBHOOK_SECRET` |
| جسم ردّ فحص §٧ حرفيًّا | ❌ `QIMMAH_GATE_SECRET` |
| أسماء ترويسات §١٠ | |
| نتائج §٩ عن سلة | |
| مخرجات §١١ | |

**وإن سقط شيء:** أرسل الخطأ كما هو. **لا تُصلحه ولا تلتفّ عليه** — الفرق بين
بيئتنا وSupabase هو بالضبط ما أريد رؤيته، وإخفاؤه يُفقد المهمّة قيمتها.

---

## بعد رجوعك

أُكمل أنا: اختبار المؤسس (§٥ في `STAGING-COMMISSIONING-RUNBOOK.md`) · قياس
التجربة الحقيقية ٧٢ ساعة على خادم حقيقي · قلب `WIRING_STATE` إلى `'LIVE'` ·
ورفع تصنيفات التقرير من `CODE_PROVEN` إلى `STAGING_PROVEN`.
