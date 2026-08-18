# دليل تشغيل بريد المعاملات — `APPLY_PENDING`

> **لا شيء في هذا الملف نُفِّذ.** كل خطوة أدناه تحتاج بيانات اعتماد أو لوحة تحكّم
> أو قرار مؤسس. الحالة الحالية: الكود مكتوب ومُثبَت **بلا شبكة**، والقاعدة
> والطرفية **غير منشورتين**.

## ١. ما هو محجوب خارجيًا (لا يُحلّ بكود)

| الحاجز | لماذا | من يفكّه |
|---|---|---|
| **`EMAIL_PROVIDER_EXTERNAL`** | لا حساب مزوّد بريد ولا مفتاح — لا في المستودع ولا على الجهاز | المؤسس: يفتح حسابًا (Resend/Postmark/SES) |
| **مصادقة النطاق** | SPF + DKIM + DMARC على نطاق المُرسِل. بدونها تذهب الرسائل للمهملات أو تُرفض | المؤسس: سجلّات DNS |
| **`supabase` CLI غير مثبَّت** | لا `supabase functions deploy` ولا `db push` من هذا الجهاز | المؤسس |
| **لا بيئة staging** | مشروع Supabase واحد فقط، وهو الإنتاج. تطبيق هجرة على قاعدة حيّة **فعل مؤسس** (الميثاق §1) | المؤسس |
| **جدولة التصريف** | `pg_cron` أو مجدول خارجي ينادي `{"action":"drain"}` | المؤسس |

**الحاجز الأول هو المُلزِم.** ما دام قائمًا، كل رسالة تنتهي في الصندوق الميت
بسبب `EMAIL_PROVIDER_EXTERNAL` — **وهذا صحيح ومقصود**: النظام لا يتظاهر
بالإرسال ولا يعيد المحاولة على حاجز لا تزيله الإعادة.

## ٢. ترتيب التطبيق (لا يُقفَز)

1. **مراجعة المعاينات بالعين.** افتح `rendered/index.html` واقرأ العشرين نسخة.
   النصّ ملك المؤسس، ولا يُنشر بريد لم يقرأه إنسان.
2. **حسم التعارض المرفوع** — نصّ `src/i18n/dict/access.ts` يعد المشتري بكود لا
   يصله (انظر `README.md` §١). قرار قبل الإطلاق.
3. **الهجرة** `20260816120004_email_outbox.sql` — إضافة صرفة، لا تمسّ جدولًا ولا
   دالة قائمة. تحقّق بعدها:
   ```sql
   select count(*) from pg_policies where tablename='email_outbox';         -- 0
   select * from information_schema.role_table_grants
    where table_name='email_outbox' and grantee in ('anon','authenticated'); -- 0 صفوف
   ```
4. **المزوّد**: حساب + مصادقة نطاق + ضبط `EMAIL_PROVIDER_*` و`EMAIL_FROM_ADDRESS`
   في **أسرار Supabase** (لا في المستودع).
5. **تمرين جاف على الإنتاج**: `EMAIL_PROVIDER_KIND=dryrun` ونشر الطرفية، ثم
   إدراج رسالة واحدة والتحقّق أن الصفّ يمرّ `queued → sent` بلا شبكة.
6. **رسالة حقيقية واحدة** إلى بريد المؤسس نفسه، بكل عميل يهمّنا:
   Gmail (ويب + أندرويد) · Apple Mail (iOS) · Outlook.com. تُفحَص: الاتجاه ·
   الوضع الداكن · الزرّ · النسخة النصّية.
7. **وصل webhook سلة** — الرقعة في §٣.
8. **جدولة التصريف** كل ٥ دقائق:
   ```sql
   select cron.schedule('qimmah-mail-drain', '*/5 * * * *', $$
     select net.http_post(
       url := '<functions-url>/qimmah-mailer',
       headers := jsonb_build_object('Authorization', 'Bearer <QIMMAH_MAILER_SECRET>',
                                     'content-type', 'application/json'),
       body := '{"action":"drain"}'::jsonb)
   $$);
   ```
   (يحتاج `pg_cron` + `pg_net` مفعّلتين — قرار مؤسس.)

## ٣. الوصل بـwebhook سلة — رقعة مقترحة

`supabase/functions/salla-webhook/index.ts` **ملك حارة أخرى ولم يُمَسّ**
(الميثاق §1.4). الرقعة الجاهزة: [`salla-webhook-integration.patch`](./salla-webhook-integration.patch).

**موضعها:** بعد سطر `console.log('[salla-webhook]', …)` وقبل `return json(…)` —
أي **بعد تثبيت المنحة** وخارج ذرّيتها.

**لماذا خارج الذرّية:** المنحة مسار لا يُعاد، والبريد مسار يفشل ويُعاد. لو دخل
الإدراجُ معاملةَ المنح لجعل فشلَ بريدٍ يُسقط شراءً مدفوعًا.

**لماذا لا نداء HTTP للمُرسِل هنا:** الطرفية تملك `service_role` أصلًا، فالإدراج
نداء RPC واحد بلا قفزة شبكة في المسار الحرج وبلا سرّ ثانٍ.

⚠️ **دلتا خصوصية تُعلَن ولا تُخبَّأ.** `salla_webhook_events` لا تخزّن بريدًا
صريحًا عمدًا. وهذه الرقعة تكتب البريد الصريح في `email_outbox` — **لأن الإرسال
يحتاج عنوانًا**، ولا سبيل لاشتقاقه من بصمة. الحدّ: الصفّ عابر، ويُفرَّغ آليًا
لحظة النجاح بقيد `email_outbox_sent_is_redacted`.

⚠️ **حدّ معلَن: فشل الإدراج لا يُعاد تلقائيًا.** الطرفية تردّ ٢٠٠ عند
`processed`، فلا تعيد سلة، وإعادتها لن تنفع (`salla_ingest_event` سترى الحدث
`duplicate`). فالفشل يُسجَّل بمستوى `error` باسم الطلب، **والاسترداد بمهمّة
مطابقة** تُدرج بريدًا لكل صفّ في `purchase_ledger` بلا صفّ مقابل في
`email_outbox`. المهمّة **لم تُبنَ** — بند مفتوح.

**بديل (لم يُنفَّذ، يحتاج قرارًا):** `create or replace` لـ`salla_ingest_event`
في هجرة **جديدة** تُدرج البريد داخل نفس المعاملة ⇒ لا فقد ممكن أصلًا. الثمن أن
حارةً تعيد تعريف دالة حارة أخرى — يُرفع للمنسّق ولا يُفعل اجتهادًا (§1.4/٤).

## ٤. تشغيل يدوي (بلا مجدول)

```bash
# إدراج رسالة شراء (لا يُرسل — يُدرج فقط)
curl -X POST "$FUNCTIONS_URL/qimmah-mailer" \
  -H "Authorization: Bearer $QIMMAH_MAILER_SECRET" \
  -H 'content-type: application/json' \
  -d '{"template":"premium_purchase","lang":"ar","to":"buyer@example.com",
       "idempotencyKey":"premium_purchase:salla:ORD-1029",
       "data":{"orderRef":"ORD-1029","recipientEmail":"buyer@example.com"}}'

# تصريف ما حان وقته
curl -X POST "$FUNCTIONS_URL/qimmah-mailer" \
  -H "Authorization: Bearer $QIMMAH_MAILER_SECRET" \
  -H 'content-type: application/json' -d '{"action":"drain"}'
```

**رسالة الكود لا تُدرَج**: تُرسَل بالتمرير المباشر لحظة توليد الكود، ولا يُعاد
إرسالها أبدًا. ضاعت ⇒ **يُصدَر كود جديد**، وهذا ما تقوله الرسالة للمستخدم نصًّا.

## ٥. تشخيص

```sql
-- ما هو عالق أو ميت
select state, template_id, count(*), max(last_reason)
  from public.email_outbox group by 1,2 order by 1;

-- الموتى القابلون لإعادة التشغيل (حمولتهم محفوظة)
select idempotency_key, template_id, attempts, last_reason, dead_at
  from public.email_outbox where state='dead' and payload is not null;

-- إعادة تشغيل ميت بعد إصلاح السبب
update public.email_outbox
   set state='queued', attempts=0, next_attempt_at=now(), dead_at=null
 where idempotency_key = '...' and payload is not null;
```

`last_reason = 'EMAIL_PROVIDER_EXTERNAL'` ⇒ لا مزوّد. اضبطه ثم أعِد التشغيل.
`carries_secret = true` وميت ⇒ **السرّ ضاع**. لا تُعِد التشغيل (لا حمولة)؛
أصدِر كودًا جديدًا.
