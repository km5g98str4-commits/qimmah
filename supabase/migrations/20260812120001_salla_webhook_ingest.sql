-- ============================================================================
-- 20260812120001 — [CTO-SALLA-002] طبقة سلة فوق الأساس المُراجَع
-- ============================================================================
-- **هذه الهجرة إضافة، لا إعادة تعريف.** الأساس المُراجَع
-- (`20260809120004_entitlement_security_remediation`) هو المرجع الأمني، وكل ما
-- هنا مبنيّ **فوقه** لا بدلًا منه.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ما رُفض عمدًا ولم يُنقل: `20260811120001_purchase_integrity`
--
--   كان نسخة موازية من نفس التحصين كُتبت على خطّ متباعد، وترقيمها الأحدث كان
--   سيجعلها **تفوز صامتةً** على المُراجَع فتعيد فتح أربع ثغرات أُثبتت بالتشغيل:
--     ① فحص الأبجدية بعد `upper()` ⇒ `ſ` تنطوي إلى `S` وتمرّ.
--     ② `provider_order_id` بلا `btrim` ⇒ `' ORD-1 '` طلبٌ آخر.
--     ③ الإعادة تُعيد تأريخ `activated_at` لمنحة قائمة.
--     ④ `source` مثبَّت على `'salla'` ⇒ منحة يدوية تكذب على نفسها.
--
--   **ملف أحدث ليس ملفًا أصحّ.** المنقول من تلك الهجرة شيء واحد لا نظير له في
--   المُراجَع: **أعمدة الأثر** — وهي أدناه.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ما تضيفه هذه الهجرة، وثلاثتها غير موجودة في الأساس:
--   ① أثر الشراء: من سجّله وبأي حدث.
--   ② جدول تدقيق أحداث سلة.
--   ③ استيعاب ذرّي يمنع التكرار ويكتب ويصنّف في معاملة واحدة.
--
-- والتوسعة الوحيدة على دالة مُراجَعة (`admin_grant_premium`) **تحافظ على جسدها
-- حرفيًا** وتضيف بارامترَي أثر بقيم افتراضية. كل ثابت أمني فيها كما هو:
-- `btrim` · مقارنة البصمة بإصدار **صفّها** لا الإصدار النشط · حارس عدم إعادة
-- التأريخ · `source = p_provider` · الإلغاء الدائم يعلو.
--
-- idempotent بالكامل.
-- ============================================================================

-- ── ① أثر الشراء ───────────────────────────────────────────────────────────
alter table public.purchase_ledger
  add column if not exists recorded_by  text not null default 'legacy_unattributed';
alter table public.purchase_ledger alter column recorded_by drop default;
alter table public.purchase_ledger
  add column if not exists source_event text;

comment on column public.purchase_ledger.recorded_by is
  'الفاعل الذي سجّل الشراء (webhook:salla · admin:<اسم>). NOT NULL بلا افتراضي — لا شراء مجهول المصدر.';
comment on column public.purchase_ledger.source_event is
  'بصمة حدث المزوّد الذي أنتج الصفّ — تربطه بسطر التدقيق في salla_webhook_events.';

-- ── توسعة `admin_grant_premium` — جسد المُراجَع حرفيًا + بارامترا أثر ───────
-- تُسقط نسخة الخمسة بارامترات كي لا يبقى مساران: الجديدة تخدم النداءات
-- الخماسية عبر القيم الافتراضية، فلا كسر للمستدعين القدامى.
drop function if exists public.admin_grant_premium(text, text, text, int, jsonb);

create or replace function public.admin_grant_premium(
  p_email text, p_provider text, p_provider_order_id text,
  p_amount_minor int default null, p_raw jsonb default null,
  p_recorded_by text default 'admin:unspecified', p_source_event text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver int;
  h text;
  uid uuid;
  order_id text;
  existing record;
begin
  if p_provider not in ('salla', 'manual') then
    raise exception 'invalid_purchase_provider' using errcode = '22023';
  end if;
  -- تطبيع المسافات: بدونه `' ORD-1 '` طلبٌ آخر، وهو التفاف كامل على حارس الهوية.
  order_id := btrim(p_provider_order_id);
  if order_id is null or order_id = '' then
    raise exception 'invalid_provider_order_id' using errcode = '22023';
  end if;

  ver := private.active_pepper_version();
  h := private.hash_identity(p_email, ver);
  -- الإدراج هو حدّ التزامن: نسخة مكرّرة متزامنة تنتظر المفتاح الفريد ثم تسقط
  -- إلى تحقّق الصفّ غير القابل للتغيير أدناه.
  insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version,
                                      amount_minor, raw, recorded_by, source_event)
  values (p_provider, order_id, h, ver, p_amount_minor, p_raw, p_recorded_by, p_source_event)
  on conflict (provider, provider_order_id) do nothing
  returning * into existing;

  if not found then
    select * into existing from public.purchase_ledger p
     where p.provider = p_provider and p.provider_order_id = order_id
     for update;
    -- المقارنة بإصدار ملح **الصفّ نفسه** لا الإصدار النشط: المقارنة بالنشط
    -- ترفض نفس الهوية بعد الدوران.
    if existing.email_hash <> private.hash_identity(p_email, existing.hash_version) then
      raise exception 'purchase_identity_mismatch' using errcode = '23505';
    end if;
    -- إعادة idempotent: الشراء الدائم (المبلغ والحمولة والأثر) غير قابل للتغيير
    -- ولا يُحدَّث من وسائط الإعادة عمدًا.
  end if;

  select u.id into uid from auth.users u
   where lower(btrim(u.email)) = lower(btrim(p_email));
  if uid is null then return 'pending_claim'; end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, p_email, 'premium', p_provider, now(), null, true)
  on conflict (user_id) do update
    set entitlement_type = 'premium', source = p_provider, activated_at = now(),
        expires_at = null, no_expiry = true, activation_code_id = null
    -- الإعادة لا تعيد كتابة منحة Premium متحقّقة (ولا مصدرها ولا توقيتها).
    -- والشراء المعلّق يظلّ قادرًا على ترقية تجربة أو كود.
    where public.entitlements.entitlement_type <> 'premium';

  -- الإلغاء الدائم يعلو: الشراء يُسجَّل والوصول يبقى محظورًا.
  if private.is_access_revoked(uid, p_email) then
    return 'revoked';
  end if;
  return 'premiumActive';
end;
$$;

-- ── ② جدول تدقيق أحداث سلة ─────────────────────────────────────────────────
-- سلة **تعيد الإرسال ثلاث مرّات بفواصل ~٥ دقائق** إن لم تتلقَّ ردًّا ناجحًا،
-- فالتكرار سلوك متوقَّع لا حالة حافّة.
--
-- ولا يُخزَّن هنا: سرّ · توقيع · بريد صريح · حمولة خام. جدولٌ فيه التوقيع يجعل
-- تسريب قراءةٍ واحدة تسريبَ قدرةٍ على التزوير؛ والحمولة الخام تحوّل جدول تدقيق
-- إلى مستودع بيانات شخصية. المخزَّن بصمةُ الهوية ووصفٌ مقتضب.
create table if not exists public.salla_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null default 'salla' check (provider in ('salla')),
  -- بصمة الجسم الخام — مفتاح منع التكرار. لا الجسم نفسه.
  event_fingerprint  text not null unique,
  event_name         text,
  provider_order_id  text,
  email_hash         text,
  hash_version       int,
  order_status_slug  text,
  amount_minor       int check (amount_minor is null or amount_minor >= 0),
  currency           text,
  classification     text not null check (classification in
                       ('received','verified','ignored','processed','duplicate','rejected','failed')),
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

-- نفس حزامَي بقية جداول الوصول: RLS بصفر سياسات + REVOKE صريح.
alter table public.salla_webhook_events enable row level security;
revoke all on public.salla_webhook_events from public, anon, authenticated;

-- ── ③ الاستيعاب الذرّي ─────────────────────────────────────────────────────
/**
 * يستوعب حدث سلة **مُتحقَّقًا منه مسبقًا** في معاملة واحدة.
 *
 * لماذا معاملة واحدة لا نداءان من الطرفية: لو كتبت الطرفيةُ سطرَ التدقيق ثم
 * نادت المنحة منفصلين، لصار بينهما نافذةُ فشل حقيقية — انقطاع بعد التدقيق
 * وقبل المنحة يترك حدثًا موسومًا «مستلَم» بلا منحة، وإعادةُ سلة تراه مكرَّرًا
 * فتتخطّاه، **فيضيع شراء مدفوع بصمت**.
 *
 * @param p_should_grant قرار الطرفية: أهذا حدث دفع مكتمل يستحق منحة؟
 *                       false ⇒ يُسجَّل ويُصنَّف، ولا تُمسّ المنح.
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
  ver          int;
  h            text;
  grant_result text;
begin
  if coalesce(btrim(p_fingerprint), '') = '' then
    raise exception 'ingest_fingerprint_missing' using errcode = '22023';
  end if;

  if exists (select 1 from public.salla_webhook_events
              where event_fingerprint = p_fingerprint) then
    return 'duplicate';
  end if;

  if p_email is not null and btrim(p_email) <> '' then
    ver := private.active_pepper_version();
    h   := private.hash_identity(p_email, ver);
  end if;

  if not p_should_grant then
    -- التصنيف من قائمة القيد المغلقة، والسبب نصّ حرّ. وخلطهما يكسر القيد.
    --   `ignored`  = ليس لنا أو لم يُدفع بعد — لا شيء يُفعل.
    --   `rejected` = طلبٌ **مدفوع** يخالف السياسة — يستحق عين إنسان.
    insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
      email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
    values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
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
  exception when others then
    -- تعارض هوية الطلب وغيره: يُسجَّل مرفوضًا **ولا يُبتلع**.
    insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
      email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
    values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
            p_amount_minor, p_currency, 'rejected', sqlerrm)
    on conflict (event_fingerprint) do nothing;
    return 'rejected';
  end;

  insert into public.salla_webhook_events (event_fingerprint, event_name, provider_order_id,
    email_hash, hash_version, order_status_slug, amount_minor, currency, classification, reason)
  values (p_fingerprint, p_event_name, btrim(p_order_id), h, ver, p_status_slug,
          p_amount_minor, p_currency, 'processed', grant_result)
  on conflict (event_fingerprint) do nothing;

  return 'processed';
end;
$$;

-- ── الصلاحيات — service_role حصرًا ─────────────────────────────────────────
revoke all on function public.admin_grant_premium(text,text,text,int,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_grant_premium(text,text,text,int,jsonb,text,text)
  to service_role;
revoke all on function public.salla_ingest_event(text,text,text,text,int,text,text,boolean,text)
  from public, anon, authenticated;
grant execute on function public.salla_ingest_event(text,text,text,text,int,text,text,boolean,text)
  to service_role;
