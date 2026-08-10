-- ============================================================================
-- 20260811120002 — [CTO-BACKEND-001] تدقيق أحداث سلة + الاستيعاب الذرّي
-- ============================================================================
-- سلة **تعيد إرسال الحدث ثلاث مرّات بفواصل ~٥ دقائق** إن لم تتلقَّ ردًّا ناجحًا
-- (توثيق سلة الرسمي). فالتكرار ليس حالة حافّة نادرة — إنه **السلوك المتوقَّع**،
-- وأي تصميم لا يفترضه سيمنح مرّتين ويسجّل مرّتين في أول انقطاع شبكة.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- لماذا الاستيعاب دالة واحدة في القاعدة لا خطوتين في الـEdge Function:
--
--   لو كتبت الدالةُ الطرفية سطرَ التدقيق ثم نادت المنحة في نداءين منفصلين،
--   لصار بينهما نافذةُ فشلٍ حقيقية: انقطاع بعد التدقيق وقبل المنحة يترك حدثًا
--   موسومًا «مستلَم» بلا منحة، وإعادةُ المحاولة تراه مكرَّرًا فتتخطّاه —
--   **فيضيع شراء مدفوع بصمت**. الذرّية هنا ليست ترفًا معماريًا؛ هي الفرق بين
--   «العميل دفع ولم يصله شيء» و«وصله».
--
--   فالدالة أدناه تفعل الاثنين في معاملة واحدة: إمّا سطر تدقيق ومنحة معًا،
--   أو لا شيء.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ما **لا** يُخزَّن هنا — عمدًا وبقاعدة لا بنيّة:
--
--   • **لا سرّ ولا مفتاح HMAC ولا توقيع.** الأمر نصّ عليه، والسبب أعمق من
--     الامتثال: جدولٌ فيه التوقيع يجعل تسريب قراءةٍ واحدة تسريبَ قدرةٍ على
--     التزوير. التحقّق يتمّ في الطرفية ولا يترك أثرًا هنا إلا **نتيجته**.
--   • **لا بريد صريح ولا حمولة خام.** حمولة سلة تحمل الاسم والجوال والعنوان.
--     تخزينها يحوّل جدول تدقيق إلى مستودع بيانات شخصية بلا مبرّر — ويخرق
--     المبدأ ③ في هجرة النواة («لا بريد صريح في أي سجلّ دائم»). المخزَّن
--     **بصمة** الهوية، ووصف مقتضب للحدث.
--
-- المفتاح المُعاد للتكرار: بصمة sha256 لجسم الطلب الخام. إعادةُ سلة ترسل نفس
-- الجسم حرفيًا ⇒ نفس البصمة ⇒ تُلتقط. وحدثٌ لاحق مشروع لنفس الطلب يحمل
-- `created_at` مختلفًا ⇒ بصمة مختلفة ⇒ **لا يُحجب** — وهذا مقصود: التكرار
-- يُمنع، والتاريخ لا يُبتر.
--
-- idempotent بالكامل.
-- ============================================================================

-- ── ١) جدول التدقيق ────────────────────────────────────────────────────────
create table if not exists public.salla_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null default 'salla' check (provider in ('salla')),
  -- بصمة الجسم الخام — مفتاح منع التكرار. لا الجسم نفسه.
  event_fingerprint  text not null unique,
  event_name         text,
  provider_order_id  text,
  -- بصمة الهوية لا البريد. `null` مسموح: الحمولة المشوَّهة قد لا تحمل هوية.
  email_hash         text,
  hash_version       int,
  order_status_slug  text,
  amount_minor       int check (amount_minor is null or amount_minor >= 0),
  currency           text,
  classification     text not null check (classification in
                       ('received','verified','ignored','processed','duplicate','rejected','failed')),
  -- سبب مقروء آليًا: `unsupported_event` · `bad_signature` · `unpaid` …
  reason             text,
  received_at        timestamptz not null default now(),
  retention_policy   text not null default 'webhook_audit_12m',
  retain_until       timestamptz not null default (now() + interval '12 months'),
  constraint salla_webhook_events_retention check (retention_policy = 'webhook_audit_12m')
);

create index if not exists salla_webhook_events_order_idx
  on public.salla_webhook_events (provider_order_id);
create index if not exists salla_webhook_events_class_idx
  on public.salla_webhook_events (classification, received_at desc);

comment on table public.salla_webhook_events is
  'تدقيق أحداث سلة — بلا أسرار وبلا توقيع وبلا بريد صريح وبلا حمولة خام. البصمة تمنع التكرار.';
comment on column public.salla_webhook_events.retain_until is
  'وسم احتفاظ (١٢ شهرًا) — بلا حذف آلي؛ التنفيذ يحتاج سياسة معتمدة كسائر السجلّات.';

-- نفس حزامَي بقية جداول الوصول: RLS بصفر سياسات + REVOKE صريح.
alter table public.salla_webhook_events enable row level security;
revoke all on public.salla_webhook_events from public, anon, authenticated;

-- ── ٢) الاستيعاب الذرّي ────────────────────────────────────────────────────
/**
 * يستوعب حدث سلة **مُتحقَّقًا منه مسبقًا** في معاملة واحدة.
 *
 * الطرفية (`salla-webhook`) مسؤولة عن: التحقّق من التوقيع · تحليل الحمولة ·
 * تقرير «مدفوع أم لا» وفق العقد. وهذه الدالة مسؤولة عن: منع التكرار · الكتابة
 * الذرّية · تصنيف النتيجة. **لا تثق هذه الدالة بأن التوقيع فُحص** — هي غير
 * قابلة للنداء إلا بـservice_role، وهو ما لا يبلغه متصفّح إطلاقًا.
 *
 * @param p_should_grant  قرار الطرفية: هل هذا حدث دفع مكتمل يستحق منحة؟
 *                        false ⇒ يُسجَّل الحدث ويُصنَّف، ولا تُمسّ المنح.
 *
 * تُرجع: processed · duplicate · ignored · rejected · failed
 */
create or replace function public.salla_ingest_event(
  p_fingerprint    text,
  p_event_name     text,
  p_order_id       text,
  p_email          text,
  p_amount_minor   int,
  p_currency       text,
  p_status_slug    text,
  p_should_grant   boolean,
  p_reason         text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver   int;
  h     text;
  grant_result text;
  final text;
begin
  if coalesce(btrim(p_fingerprint), '') = '' then
    raise exception 'ingest_fingerprint_missing' using errcode = '22023';
  end if;

  -- منع التكرار أولًا وبالقيد الفريد لا بفحصٍ سابقٍ للكتابة: الفحص-ثم-الكتابة
  -- يترك سباقًا بين محاولتَي إعادةٍ متزامنتين، والقيد لا يتركه.
  if exists (select 1 from public.salla_webhook_events
              where event_fingerprint = p_fingerprint) then
    return 'duplicate';
  end if;

  if p_email is not null and btrim(p_email) <> '' then
    ver := private.active_pepper_version();
    h   := private.hash_identity(p_email, ver);
  end if;

  if not p_should_grant then
    -- التصنيف والسبب حقلان مختلفان: التصنيف من قائمة القيد المغلقة، والسبب
    -- نصّ حرّ. خلطهما يكسر القيد — وقد كسره فعلًا في أول تشغيل.
    --
    -- والتمييز بينهما ليس شكليًا:
    --   `ignored`  = الحدث ليس لنا أو لم يُدفع بعد — لا شيء يُفعل، ولا قلق.
    --   `rejected` = طلب **مدفوع** يخالف السياسة (منتج/مبلغ/عملة/هوية ناقصة)
    --                — وهذا يستحق عين إنسان، لا أن يغرق بين آلاف المتجاهَل.
    insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
      email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
    values (p_fingerprint, p_event_name, p_order_id, h, ver, p_status_slug,
            p_amount_minor, p_currency,
            case when p_reason in ('unsupported_event', 'unpaid_or_incomplete')
                 then 'ignored' else 'rejected' end,
            p_reason)
    on conflict (event_fingerprint) do nothing;
    return case when p_reason in ('unsupported_event', 'unpaid_or_incomplete')
                then 'ignored' else 'rejected' end;
  end if;

  begin
    grant_result := public.admin_grant_premium(
      p_email, 'salla', p_order_id, p_amount_minor, null,
      'webhook:salla', p_fingerprint);
    final := 'processed';
  exception when others then
    -- تعارض هوية الطلب (`purchase_identity_conflict`) وغيره: يُسجَّل مرفوضًا
    -- **ولا يُبتلع**. سطر التدقيق يبقى ليُقرأ، والطرفية تُرجع خطأ لسلة.
    insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
      email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
    values (p_fingerprint, p_event_name, p_order_id, h, ver, p_status_slug,
            p_amount_minor, p_currency, 'rejected', sqlerrm)
    on conflict (event_fingerprint) do nothing;
    return 'rejected';
  end;

  insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
    email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
  values (p_fingerprint, p_event_name, p_order_id, h, ver, p_status_slug,
          p_amount_minor, p_currency, final, grant_result)
  on conflict (event_fingerprint) do nothing;

  return final;
end;
$$;

-- ── ٣) الصلاحيات — service_role حصرًا ──────────────────────────────────────
-- الطرفية تعمل بمفتاح الخدمة؛ المتصفّح لا يبلغ هذه الدالة بأي حال.
revoke all on function public.salla_ingest_event(text,text,text,text,int,text,text,boolean,text)
  from public, anon, authenticated;
grant execute on function public.salla_ingest_event(text,text,text,text,int,text,text,boolean,text)
  to service_role;
