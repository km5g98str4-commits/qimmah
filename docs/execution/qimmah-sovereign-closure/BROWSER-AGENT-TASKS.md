# تشغيل staging من المتصفّح — بلا طرفية ولا كلمة مرور

> **لمن:** وكيل متصفّح (إضافة كروم) أو المؤسس بنفسه.
> **المدّة:** ~٢٠ دقيقة. **المطلوب:** حساب Supabase مفتوح في المتصفّح فقط.
>
> ⚠️ **لا تلمس مشروع الإنتاج `ledlypcyrtnzvjvhykwz` بأي شكل.**
> ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
> وتشغيله هنا أسقط أوّل محاولة بـ`permission denied to alter role`.

المشروع التجريبي موجود سلفًا: **`odpkvswfiihrkglgfghd`**

---

## ١. طبّق المخطّط — ست لصقات

افتح **SQL Editor** في لوحة مشروع `odpkvswfiihrkglgfghd`، والصق الملفات من
`docs/execution/qimmah-sovereign-closure/staging-sql/` **بالترتيب**:

| # | الملف | الحجم |
|---|---|---|
| ١ | `01-qimmah-staging.sql` | ٧١ ك.ب |
| ٢ | `02-qimmah-staging.sql` | ٥٠ ك.ب |
| ٣ | `03-qimmah-staging.sql` | ٥٥ ك.ب |
| ٤ | `04-qimmah-staging.sql` | ٥٤ ك.ب |
| ٥ | `05-qimmah-staging.sql` | ٣٨ ك.ب |
| ٦ | `06-qimmah-staging.sql` | ٤٦ ك.ب |

**الترتيب مُلزَم** — بعض الهجرات تعيد تعريف دوالّ سابقة، وعكسه يجعل الأقدم
يكتب فوق الأحدث **بلا خطأ يظهر**.

✅ **وإعادة اللصق آمنة** — الهجرة المسجَّلة تُقفَز فعلًا. مقيسٌ: إعادة لصق الست
تُنتج ٣٣ إشعار تخطٍّ بلا خطأ واحد (`test:staging-sql`).

### الحزمة السادسة تعرض صفّ التحقّق

يجب أن يقول:

| العمود | المتوقَّع |
|---|---|
| `tables` = `with_rls` | ٢٧ = ٢٧ |
| `policies` | ٧١ |
| `anon_writes` | **٠** |
| `pepper` | **١** |
| `client_rpcs` | **٦** |
| `legacy_open` | **٠** |
| `migrations` | **٣٣** |

**انسخ هذا الصفّ وأرسله.** أي رقم مختلف = توقّف وأرسله كما هو.

---

## ٢. فعّل تأكيد البريد

**Authentication → Providers → Email → Confirm email = ON**

⚠️ **حرج**: التجربة والاسترداد والمطالبة كلّها تشترط `email_confirmed_at`.
بدونه لا يعمل شيء من نموذج الوصول.

---

## ٣. انسخ مفتاحين

**Settings → API:**

- `anon` / `public` key ← **أرسله** (معرّف عام يظهر في حزمة التطبيق أصلًا)
- `service_role` key ← ⛔ **لا ترسله ولا تكتبه في أي مكان**

---

## ٤. أنشئ حسابك ثم أسنِد الدور

**بهذا الترتيب — الدور يُسنَد لحسابٍ قائم:**

1. سجّل حسابك من التطبيق (بعد بنائه على staging) وأكّد بريدك.
2. ثم في SQL Editor:

```sql
select public.admin_set_role('<بريدك>', 'founder', 'staging commissioning');

select email, raw_app_meta_data ->> 'qimmah_role' as role
from auth.users where email = '<بريدك>';
```

**المتوقَّع:** `role = founder`.

> الدور يُكتب في `raw_app_meta_data` وحده — لا في `user_metadata` الذي يعدّله
> المستخدم بنفسه. ولا تُنشأ حسابات هنا ولا تُولَّد كلمات مرور.

---

## ٥. الطرفيات — تحتاج طرفية أوامر

**Edge Functions لا تُنشر من المتصفّح.** تُترك لجلسة فيها `supabase` CLI:

```bash
supabase functions deploy salla-webhook  --project-ref odpkvswfiihrkglgfghd
supabase functions deploy qimmah-gateway --project-ref odpkvswfiihrkglgfghd
```

**لكن أسرارها تُضبط من المتصفّح الآن** (Edge Functions → Secrets):

```
SALLA_WEBHOOK_SECRET        سرّ التوقيع من لوحة سلة
SALLA_AMOUNT_POLICY         off
SALLA_PAID_STATUS_SLUGS     completed
SALLA_EXPECTED_PRODUCT_IDS  <معرّف منتج قِمّة>
QIMMAH_GATE_SECRET          ٣٢ محرفًا عشوائيًّا فأكثر
```

---

## ما تُرسله

1. **صفّ التحقّق** من الحزمة السادسة
2. **`anon key`**
3. تأكيد أن تأكيد البريد مُفعَّل
4. أي خطأ ظهر — **كما هو، بلا إصلاح**

> الفرق بين بيئتنا وSupabase الحقيقي هو ما نشتريه بهذه المهمّة. إصلاحه في
> مكانه يُخفيه ويُفقدها قيمتها. أوّل محاولة سقطت — وسقوطها كشف عيبين حقيقيّين
> في أدواتنا ما كانا ليظهرا لولا أنها نُقلت كما هي.
