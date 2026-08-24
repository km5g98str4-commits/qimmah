# طلب تنفيذ إلى كود اكس — تشغيل staging

> **إلى:** كود اكس (يملك صلاحية Supabase التي لا أملكها).
> **الفرع:** `codex/qimmah-final-sovereign-convergence-001` · **الرأس:** `b91f1336`
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

## ١. أنشئ مشروع staging

- **الاسم:** `qimmah-staging` — اسمٌ لا يلتبس بالإنتاج أبدًا.
- **المنطقة:** الأقرب للسعودية.
- **كلمة مرور القاعدة:** ولّدها واحفظها عندك. **لا تدخل Git ولا تُرسَل في التقرير.**

**سجّل:** `project ref` · `URL` · `anon key`.
هذه الثلاثة **معرّفات عامّة** تظهر في الحزمة أصلًا — إرسالها لي آمن.
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

## ٣. شغّل القاعدة — أمر واحد

```bash
DATABASE_URL='postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres' \
SUPABASE_PROJECT_REF='<ref>' \
npm run db:commission
```

يطبّق ٣٣ هجرة بسجلّ، ويبذر ملح الهوية، ثم **يتحقّق من الكتالوج الحيّ**.

**معيار النجاح:** ينتهي بـ`✅ القاعدة مُشغَّلة ومُتحقَّق منها`.
سيسقط فحص «يوجد مؤسس» — **متوقَّع الآن**، يُسنَد الدور في §٦.

> **لا تطبّق الهجرات بيدك ولا بـ`supabase db push`.** إعادة التشغيل اليدوي تموت
> عند `20260822120002` (`cannot change return type`). السكربت يمسك سجلًّا في
> `supabase_migrations.schema_migrations` — نفس جدول Supabase CLI — ويطبّق كل
> هجرة داخل معاملة مع سطر سجلّها. **وإعادة تشغيله آمنة تمامًا.**

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
2. ثم:

```bash
DATABASE_URL='…' SUPABASE_PROJECT_REF='<ref>' \
FOUNDER_EMAIL='<بريد المؤسس>' \
npm run db:commission
```

**معيار النجاح:** `✓ أُسنِد دور المؤسس` و`✓ يوجد مؤسس واحد على الأقل`.

> السكربت **لا يُنشئ حسابات ولا يولّد كلمات مرور**. يُسنِد الدور لحسابٍ قائم فقط.

---

## ٧. انشر الطرفيتين

```bash
supabase functions deploy salla-webhook  --project-ref <ref>
supabase functions deploy qimmah-gateway --project-ref <ref>
```

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
