# 12 — استرجاع القاعدة بلا كلفة (نسخة منطقية مُختبَرة)

> **[RELEASE-REVIEW] ٦ سبتمبر ٢٠٢٦.** الإنتاج على خطّة Supabase **Free**: لا نسخ احتياطي
> آليّ ولا استرجاع لنقطة زمنية (PITR). قرار المؤسس: **لا كلفة إضافية**. فهذا الإجراء هو
> أقوى مسار استرجاع متاح بلا كلفة — **نسخة منطقية** بـ`pg_dump` تُؤخذ يدويًّا وتُستعاد
> بـ`pg_restore`. **ليس PITR** ولا يُسمّى كذلك: يستعيد لحظة أخذ النسخة فقط.

## ما أُثبت بالتنفيذ (٦ سبتمبر)

قاعدة محلّية مبنيّة من الهجرات الـ٤٦ كاملةً، مزروعة بمستخدمَين وثلاثة صكوك وشراء
واحد، ثم `pg_dump --format=custom --no-owner --no-privileges`، ثم `pg_restore` في
قاعدة فارغة (**بلا شيم**): صفر خطأ، وتطابق تامّ:

| المقياس | المصدر | المستعاد |
|---|---|---|
| جداول public+private | 30 | 30 |
| دوالّ public+private | 70 | 70 |
| سياسات RLS | 71 | 71 |
| مُشغِّلات | 21 | 21 |
| جداول RLS مفعّل | 27 | 27 |
| auth.users / entitlements / access_codes / purchase_ledger / pepper | 2 / 1 / 3 / 1 / 1 | مطابق |
| بصمة جسد `claim_pending_grants` | aa67998b6f3f | aa67998b6f3f |

## الإجراء — يُنفَّذ من جهاز المؤسس (لا من CI)

1. **الأداة:** خادم الإنتاج PostgreSQL **17** — يلزم `pg_dump`/`pg_restore` إصدار **≥ 17**
   (إصدار ١٦ يرفض الخادم الأحدث). تثبيت: `apt install postgresql-client-17` أو
   Postgres.app على macOS.
2. **سلسلة الاتصال:** لوحة Supabase ← Project Settings ← Database ← Connection string
   (**Session pooler** أو الاتصال المباشر، منفذ 5432). كلمة المرور من اللوحة — **لا تُلتزم
   ولا تُلصق في وثيقة**.
3. **النسخة:**
   ```bash
   pg_dump "$PROD_DB_URL" --format=custom --no-owner --no-privileges \
     --schema=public --schema=private --schema=auth --schema=supabase_migrations \
     -f "qimmah-prod-$(date -u +%Y%m%dT%H%MZ).dump"
   ```
   تُحفظ في مكانين مشفَّرين على الأقل (قرص محلّي + سحابة شخصية). النسخة تحمل بريد
   المستخدمين وبصمات الهوية والملح — **بيانات شخصية**: تُعامل كسرّ.
4. **الإيقاع:** قبل كل هجرة إنتاج، وقبل كل دفعة صكوك، وأسبوعيًّا على الأقل بعد الإطلاق.
5. **تمرين الاستعادة (شهريًّا):** قاعدة محلّية فارغة ← `pg_restore --no-owner
   --no-privileges --exit-on-error -d "$LOCAL_DB_URL" <file>` ← قارن العدّادات
   بالاستعلام أدناه ← اقرأ `supabase_migrations.schema_migrations` (يجب أن يساوي الإنتاج).
6. **الاستعادة الحقيقية** (كارثة): مشروع Supabase جديد ← `pg_restore` بنفس الأعلام ←
   إعادة زرع ما **لا** تحمله النسخة (أدناه) ← تبديل `VITE_SUPABASE_URL/ANON_KEY` في
   Cloudflare Pages ← نشر.

### استعلام المقارنة
```sql
select 'tables='||count(*) from pg_tables where schemaname in ('public','private')
union all select 'functions='||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')
union all select 'policies='||count(*) from pg_policies
union all select 'triggers='||count(*) from pg_trigger where not tgisinternal
union all select 'migrations='||count(*) from supabase_migrations.schema_migrations
union all select 'users='||count(*) from auth.users
union all select 'entitlements='||count(*) from public.entitlements
union all select 'purchase_ledger='||count(*) from public.purchase_ledger
union all select 'pepper='||count(*) from private.identity_pepper;
```

## ما **لا** تغطّيه النسخة المنطقية — يُعاد زرعه يدويًّا

- **Vault:** `qimmah_gate_secret` (سرّ البوّابة) — يُزرع من جديد بنفس قيمة
  `QIMMAH_GATE_SECRET` في بيئة الطرفية.
- **Edge Functions وأسرارها:** `qimmah-gateway` تُنشر من المستودع؛ `SUPABASE_SERVICE_ROLE_KEY`
  و`QIMMAH_GATE_SECRET` تُضبط في لوحة المشروع الجديد.
- **إعدادات Auth في اللوحة:** SMTP المخصّص (المُرسل `qimmah.support@gmail.com`)، Site URL
  وRedirect URLs (`https://qimmah-8qp.pages.dev/#/reset`)، قوالب البريد.
- **مفاتيح المشروع:** anon/service_role تتغيّر مع المشروع الجديد ⇒ تُحدَّث في Pages
  وفي `src/lib/supabaseClient.ts` الافتراضي.
- **Storage** (إن استُعمل لاحقًا) — لا يحمله `pg_dump`.
- **سجلّات المنصّة** (auth/edge logs) — لا تُستعاد.

## حدود الصدق

- يُستعاد **ما حتى لحظة النسخة**؛ ما بعدها مفقود. هذا هو ثمن «بلا كلفة».
- لم تُؤخذ نسخة إنتاج فعلية من بيئة المراجعة: لا سلسلة اتصال قاعدة (كلمة مرور) في تلك
  البيئة، والمنفذ الشبكي إلى `supabase.co` محجوب فيها. **أوّل نسخة إنتاج فعل مؤسس**
  بالخطوات ٢–٣ أعلاه، وتمرين الاستعادة الأوّل يُنفَّذ عليها.
