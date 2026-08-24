-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 3/6
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (5):
--   · 20260809120004_entitlement_security_remediation.sql
--   · 20260812120001_salla_webhook_ingest.sql
--   · 20260816120001_commerce_integrity_fixes.sql
--   · 20260816120002_founder_role_provisioning.sql
--   · 20260816120003_founder_dashboard_reads.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260809120004_entitlement_security_remediation.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260809120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260809120004') then
    raise notice 'تخطٍّ: 20260809120004_entitlement_security_remediation.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260809120004$
-- ============================================================================
-- 20260809120004 — P2: إصلاحات أمان الوصول النهائية (forward-only)
-- ============================================================================
-- يسد أربعة عيوب مؤكدة بعد دمج خط الوصول:
--   1) إعادة تشغيل طلب مزوّد لهوية أخرى لا تمنح وصولًا جديدًا.
--   2) سجل الإلغاء الدائم يعلو على كل منحة؛ admin_unrevoke وحدها ترفعه.
--   3) عقد كود الوصول (≥10 من أبجدية 32 رمزًا) يُفرض في قاعدة البيانات.
--   4) مصدر المنحة يحفظ manual أو salla بصدق، ويصمد بعد الاسترجاع.
--
-- لا تغيّر هجرة سابقة ولا تمسّ بيانات قائمة: تعيد تعريف الدوال فقط، ولذلك هي
-- قابلة لإعادة التشغيل في PostgreSQL/PGlite وتبقى آمنة كتقدّم أمامي.
-- ============================================================================

-- ── ١) عقد كود الوصول المركزي ────────────────────────────────────────────
-- 24 حرفًا لاتينيًا بلا I/O (لتجنّب الالتباس) + الأرقام 2–9 = 32 رمزًا.
-- trim + upper هما التطبيع الوحيد؛ أي فراغ داخلي أو Unicode lookalike مرفوض.
create or replace function private.normalize_access_code(p_code text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare trimmed text; normalized text;
begin
  trimmed := btrim(p_code);
  -- Validate the original ASCII form before case folding: Unicode letters such
  -- as long-s (ſ) must not fold into an allowed symbol through upper().
  if trimmed is null
     or char_length(trimmed) < 10
     or trimmed !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz23456789]+$'
  then
    raise exception 'invalid_access_code' using errcode = '22023';
  end if;
  return upper(trimmed);
end;
$$;

-- ── ٢) الإنشاء الإداري يفرض العقد قبل الهاش ──────────────────────────────
create or replace function public.admin_create_access_code(
  p_code text, p_created_by text, p_created_reason text,
  p_duration_days int default 14, p_max_redemptions int default 1,
  p_label text default null, p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare ver int; id uuid; normalized text;
begin
  normalized := private.normalize_access_code(p_code);
  ver := private.active_pepper_version();
  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, p_created_by, p_created_reason)
  returning access_codes.id into id;
  return id;
end;
$$;

-- ── ٣) الاسترداد يستخدم التطبيع نفسه، مع خطأ عام يمنع التعداد ────────────
create or replace function public.redeem_access_code(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  ver int;
  h text;
  normalized text;
  c record;
  cur record;
  new_expiry timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  begin
    normalized := private.normalize_access_code(p_code);
  exception when sqlstate '22023' then
    raise exception 'invalid_code' using errcode = '22023';
  end;

  ver := private.active_pepper_version();
  h := private.hash_identity(em, ver);
  select * into c from public.access_codes ac
   where ac.code_hash in (select ih.email_hash
                          from private.identity_hashes(normalized) ih)
   for update;
  if not found
     or not c.enabled
     or c.starts_at > now()
     or (c.expires_at is not null and c.expires_at <= now())
     or c.redemption_count >= c.max_redemptions
  then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  if exists (select 1 from private.identity_hashes(em) ih
             join public.code_redemption_ledger l
               on l.code_id = c.id and l.email_hash = ih.email_hash) then
    raise exception 'code_already_redeemed' using errcode = '23505';
  end if;

  update public.access_codes
     set redemption_count = redemption_count + 1, updated_at = now()
   where id = c.id;
  insert into public.code_redemption_ledger (code_id, email_hash, hash_version)
  values (c.id, h, ver);
  insert into public.access_code_redemptions (code_id, user_id) values (c.id, uid)
  on conflict (code_id, user_id) do nothing;

  new_expiry := now() + make_interval(days => c.duration_days);
  select * into cur from public.entitlements where user_id = uid;
  if found and cur.expires_at is not null and cur.expires_at > new_expiry then
    new_expiry := cur.expires_at;
  end if;
  if found and private.grant_rank(cur.entitlement_type) > 2 then
    return 'premiumActive';
  end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activation_code_id, activated_at, expires_at, no_expiry)
  values (uid, em, 'special', 'code', c.id, now(), new_expiry, false)
  on conflict (user_id) do update
    set entitlement_type = 'special', source = 'code', activation_code_id = c.id,
        activated_at = now(), expires_at = new_expiry, no_expiry = false;
  return 'specialAccessActive';
end;
$$;

-- ── ٤) الطلب مسجّل لهوية واحدة، والمنحة تحفظ مصدرها الحقيقي ──────────────
create or replace function public.admin_grant_premium(
  p_email text, p_provider text, p_provider_order_id text,
  p_amount_minor int default null, p_raw jsonb default null
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
  order_id := btrim(p_provider_order_id);
  if order_id is null or order_id = '' then
    raise exception 'invalid_provider_order_id' using errcode = '22023';
  end if;

  ver := private.active_pepper_version();
  h := private.hash_identity(p_email, ver);
  -- The insert is the concurrency boundary.  A simultaneous duplicate waits on
  -- the unique key, then falls through to the immutable-row verification below.
  insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version,
                                      amount_minor, raw)
  values (p_provider, order_id, h, ver, p_amount_minor, p_raw)
  on conflict (provider, provider_order_id) do nothing
  returning * into existing;

  if not found then
    select * into existing from public.purchase_ledger p
     where p.provider = p_provider and p.provider_order_id = order_id
     for update;
    -- Compare with the purchase row's own pepper version.  Comparing with the
    -- currently-active version would reject the same identity after rotation.
    if existing.email_hash <> private.hash_identity(p_email, existing.hash_version) then
      raise exception 'purchase_identity_mismatch' using errcode = '23505';
    end if;
    -- Idempotent replay: the durable purchase (including amount/currency/raw)
    -- is immutable and is deliberately not updated from replay arguments.
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
    -- A replay must not rewrite an already-materialized Premium grant (including
    -- its source/timestamps).  A pending purchase may still upgrade trial/code.
    where public.entitlements.entitlement_type <> 'premium';

  if private.is_access_revoked(uid, p_email) then
    return 'revoked';
  end if;
  return 'premiumActive';
end;
$$;

-- ── ٥) الاسترجاع لا يختلق Salla ويحترم الإلغاء الدائم ────────────────────
create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  cur record;
  rec record;
  purchase_provider text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  select p.provider into purchase_provider from private.identity_hashes(em) ih
    join public.purchase_ledger p on p.email_hash = ih.email_hash
   order by p.granted_at desc, p.id desc
   limit 1;
  if purchase_provider is not null then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', purchase_provider, now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = purchase_provider, activated_at = now(),
          expires_at = null, no_expiry = true, activation_code_id = null
      where public.entitlements.entitlement_type <> 'premium'
         or public.entitlements.source <> purchase_provider;
    return 'premiumActive';
  end if;

  select l.code_id, l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()
   order by original_expiry desc
   limit 1;
  select * into cur from public.entitlements where user_id = uid;
  if rec.code_id is not null then
    if found and (private.grant_rank(cur.entitlement_type) > 2
                  or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
                  or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code', activation_code_id = rec.code_id,
          activated_at = rec.redeemed_at, expires_at = rec.original_expiry, no_expiry = false;
    insert into public.access_code_redemptions (code_id, user_id)
    values (rec.code_id, uid)
    on conflict (code_id, user_id) do nothing;
    return 'specialAccessActive';
  end if;
  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;

-- ── ٦) الحالة الفعّالة تقرأ السجلّ الدائم قبل صف المنحة ──────────────────
create or replace function public.my_entitlement()
returns table (
  state text, entitlement_type text, source text, activated_at timestamptz,
  expires_at timestamptz, no_expiry boolean, server_time timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); em text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if private.is_access_revoked(uid, em) then
    return query select 'revoked'::text, 'none'::text, 'none'::text,
                        null::timestamptz, null::timestamptz, false, now();
    return;
  end if;
  return query
    select private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at),
           e.entitlement_type, e.source, e.activated_at, e.expires_at, e.no_expiry, now()
      from public.entitlements e where e.user_id = uid;
  if not found then
    return query select 'noAccess'::text, 'none'::text, 'none'::text,
                        null::timestamptz, null::timestamptz, false, now();
  end if;
end;
$$;

-- ── ٧) الامتيازات الصريحة: لا منفذ PUBLIC ولا إدارة من العميل ────────────
revoke all on function private.normalize_access_code(text) from public, anon, authenticated, service_role;
revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;
revoke all on function public.claim_pending_grants() from public, anon;
grant execute on function public.claim_pending_grants() to authenticated;
revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;
revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz) to service_role;
revoke all on function public.admin_grant_premium(text,text,text,int,jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_grant_premium(text,text,text,int,jsonb) to service_role;

  $qimmah_mig_20260809120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260809120004', '20260809120004_entitlement_security_remediation.sql');
end
$qimmah_mig_20260809120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260812120001_salla_webhook_ingest.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260812120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260812120001') then
    raise notice 'تخطٍّ: 20260812120001_salla_webhook_ingest.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260812120001$
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

  $qimmah_mig_20260812120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260812120001', '20260812120001_salla_webhook_ingest.sql');
end
$qimmah_mig_20260812120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260816120001_commerce_integrity_fixes.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260816120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260816120001') then
    raise notice 'تخطٍّ: 20260816120001_commerce_integrity_fixes.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260816120001$
-- ═══════════════════════════════════════════════════════════════════════════
-- [OVERNIGHT-5] تصحيحان في سلامة التجارة — كلاهما اكتُشف بمهاجمة المخطّط.
--
-- هجرة **تصحيحية مستقلّة** لا تعديلٌ في مكانها: لو كانت الهجرات الأصلية قد
-- طُبِّقت على قاعدة حيّة، فالتعديل في مكانه لا يعمل أبدًا. المستقلّة تعمل في
-- الحالتين، وتترك أثرًا مقروءًا لسببها.
--
-- ① F-1 · P1 — خطأ عابر أثناء المنح كان **يحرق البصمة فيضيع طلب مدفوع**.
-- ② F-2 · P1 — `claim_pending_grants` لم تكن تشترط بريدًا مؤكَّدًا، بينما
--    `start_trial` تشترطه — وعدم التماثل على المنحة **الأثمن**.
--
-- الدالّتان تُعاد كتابتهما بالكامل (`create or replace`) لأن Postgres لا يقبل
-- ترقيع جسم دالّة. وما عدا الكتلتين المشروحتين أعلاه منقول حرفيًّا.
-- ═══════════════════════════════════════════════════════════════════════════

-- ① F-1 ─────────────────────────────────────────────────────────────────────
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
  exception
    -- ── العابر يُعاد رميه، ولا يُكتب له سطر ببصمة ─────────────────────────
    -- `when others` كان يبتلع فشل التسلسل والجمود ومهلة القفل أيضًا، فيكتب
    -- سطر تدقيق **يحمل البصمة** ويعيد `rejected` ⇒ HTTP 200 ⇒ سلة تتوقّف عن
    -- إعادة الإرسال، ومحاولاتها الثلاث تصطدم كلّها بالبصمة فتُقرأ `duplicate`.
    -- النتيجة: **طلب مدفوع يضيع بلا أثر ولا مسار استرجاع** — وهو بالضبط ما
    -- ادّعت هذه الدالّة أنها تمنعه.
    -- فالعابر يُرفَع كما هو: لا سطر تدقيق، والدالّة الطرفية تعيد 5xx، وسلة
    -- تعيد المحاولة — والمحاولة التالية تجد البصمة نظيفة.
    when sqlstate '40001'   -- serialization_failure
      or sqlstate '40P01'   -- deadlock_detected
      or sqlstate '55P03'   -- lock_not_available
      or sqlstate '57014'   -- query_canceled
      or sqlstate '08006'   -- connection_failure
      or sqlstate '53300'   -- too_many_connections
      or sqlstate '53200'   -- out_of_memory
    then
      raise;
    -- ── الدائم وحده يُسجَّل مرفوضًا: قرار نهائي يستحق عين إنسان ───────────
    when others then
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


-- ② F-2 ─────────────────────────────────────────────────────────────────────
create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  conf timestamptz;
  cur record;
  rec record;
  purchase_provider text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  -- التحقّق من البريد **شرط للمِنحة**، لا للتجربة وحدها.
  -- كانت `start_trial` تشترط `email_confirmed_at`، وهذه لا تشترطه — بينما هي
  -- تمنح ما هو **أثمن**: Premium دائم مسجَّل على عنوان بريد. فمن يسجّل بعنوان
  -- غيره ولم يؤكّده كان يستلم شراء صاحبه. عدم التماثل هنا هو الثغرة نفسها.
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  select p.provider into purchase_provider from private.identity_hashes(em) ih
    join public.purchase_ledger p on p.email_hash = ih.email_hash
   order by p.granted_at desc, p.id desc
   limit 1;
  if purchase_provider is not null then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', purchase_provider, now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = purchase_provider, activated_at = now(),
          expires_at = null, no_expiry = true, activation_code_id = null
      where public.entitlements.entitlement_type <> 'premium'
         or public.entitlements.source <> purchase_provider;
    return 'premiumActive';
  end if;

  select l.code_id, l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()
   order by original_expiry desc
   limit 1;
  select * into cur from public.entitlements where user_id = uid;
  if rec.code_id is not null then
    if found and (private.grant_rank(cur.entitlement_type) > 2
                  or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
                  or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code', activation_code_id = rec.code_id,
          activated_at = rec.redeemed_at, expires_at = rec.original_expiry, no_expiry = false;
    insert into public.access_code_redemptions (code_id, user_id)
    values (rec.code_id, uid)
    on conflict (code_id, user_id) do nothing;
    return 'specialAccessActive';
  end if;
  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;


  $qimmah_mig_20260816120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260816120001', '20260816120001_commerce_integrity_fixes.sql');
end
$qimmah_mig_20260816120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260816120002_founder_role_provisioning.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260816120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260816120002') then
    raise notice 'تخطٍّ: 20260816120002_founder_role_provisioning.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260816120002$
-- ============================================================================
-- 20260816120001 — [OVERNIGHT-ADMIN] تزويد دور المؤسس (`qimmah_role`)
-- ============================================================================
-- الحلقة المفقودة بين حارس الواجهة (`src/admin/auth/adminRole.ts`) والخادم:
-- الحارس يقرأ `app_metadata.qimmah_role` ويرفض كل ما عداه، **ولا شيء في
-- المستودع كان يُصدر هذا الادّعاء**. فكل مستخدم — بما فيهم المؤسس — كان يُمنع.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- أربعة مبادئ يفرضها هذا الملف بنيويًا:
--
--  ① **الدور يُكتب في `raw_app_meta_data` وحده.**
--     `raw_user_meta_data` يكتبه صاحب الحساب بنفسه عبر `auth.updateUser` — وهو
--     المسار الذي يخزّن فيه `authContext.tsx` اسم العرض. فكتابة الدور هناك
--     تعني حرفيًا أن **كل مستخدم يرقّي نفسه**. هذا الملف لا يلمس ذلك الحقل
--     إطلاقًا، ودالة القراءة أدناه لا تنظر إليه ولو حمل القيمة الصحيحة.
--
--  ② **المنح فعل `service_role` حصرًا.**
--     لا `anon` ولا `authenticated` ولا `public` تملك EXECUTE على دوال المنح.
--     ولا يوجد مسار واحد — سياسة، دالة، أو trigger — يسمح لمستخدم بأن يمنح
--     نفسه أو غيره. المنع هو الافتراض، والاستثناء الوحيد مفتاح الخادم.
--
--  ③ **القائمة البيضاء واحدة: `founder`.**
--     أي قيمة أخرى تُرفض باستثناء مسمّى، فلا تُكتب قيمة مجهولة تصير لاحقًا
--     «دورًا غير معروف» في الواجهة بلا أن يعرف أحد من كتبها.
--
--  ④ **الأثر يُكتب داخل نفس الحقل، لا في جدول جديد.**
--     `qimmah_role_set_at` و`qimmah_role_set_by` و`qimmah_role_reason` تُكتب
--     بجانب الدور. جدول تدقيق مستقلّ كان سيضيف سطح RLS جديدًا يجب حراسته،
--     مقابل معلومة تعيش أصلًا مع الصفّ الذي تصفه.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة. الـrunbook في
--    `docs/execution/qimmah-sovereign-overnight/ADMIN-DELIVERY.md`.
--
-- ملاحظة تنفيذية: كل الدوال `language plpgsql` عمدًا. جسم plpgsql يُفحَص نحويًا
-- عند الإنشاء ولا تُحلّ أسماء أعمدته، فتُنشأ الدالة على صندوق الإثبات الرملي
-- (الذي يحمل `auth.users` مصغّرًا) بلا فشل — ويبقى السلوك الحقيقي مُختبَرًا
-- بـ`test:admin-db` الذي يبني الأعمدة الناقصة قبل النداء.
-- ============================================================================

-- ── ١) قراءة الدور — من مصدر الخادم وحده ───────────────────────────────────
/**
 * دور الحساب كما يراه الخادم. `null` = لا دور.
 *
 * **لا يقرأ `raw_user_meta_data` إطلاقًا.** هذا ليس سهوًا يُصلَح لاحقًا بل هو
 * الشرط الذي يجعل الدالة ذات معنى، ويحرسه `test:admin-db` بفحص مسمّى يكتب
 * ادّعاءً مزوّرًا في `raw_user_meta_data` ويتأكّد أنه لا يمنح شيئًا.
 */
create or replace function private.account_role(p_uid uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r text;
begin
  if p_uid is null then
    return null;
  end if;
  select u.raw_app_meta_data ->> 'qimmah_role' into r
    from auth.users u
   where u.id = p_uid;
  return r;
end;
$$;

/**
 * هل **صاحب الجلسة الحالية** مؤسس؟ الافتراض `false` في كل مسار.
 *
 * ⚠️ **`coalesce` هنا ليست تزيينًا — بدونها البوّابة تفشل مفتوحة.**
 * حسابٌ بلا ادّعاء يجعل `account_role()` تعيد `NULL`، فيصير
 * `NULL = 'founder'` قيمتُه `NULL` لا `false`. وتُعيد الدالة `NULL`، فيصير
 * `if not private.is_founder()` في الحارس `not NULL` = `NULL` — **وشرطٌ قيمته
 * `NULL` لا يُنفَّذ**، فلا يُرفع الاستثناء ويمرّ الجميع.
 * كُشف هذا بإثبات منفَّذ (`test:admin-db`) لا بمراجعة نظر، ويحرسه الآن فحص
 * مسمّى يسحب الدور ثم يتأكّد أن الباب أُغلق **في نفس اللحظة**.
 */
create or replace function private.is_founder()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return false;
  end if;
  return coalesce(private.account_role(uid) = 'founder', false);
end;
$$;

/**
 * الحارس المشترك: يرفع استثناء مسمّى بدل أن يعيد صفوفًا فارغة.
 *
 * الفرق جوهري: دالة تعيد **صفرًا** لغير المصرَّح له تُقرأ في اللوحة رقمًا
 * («لا مستخدمين») لا منعًا. والاستثناء المسمّى يصل الواجهة حالةَ خطأ فتعرض
 * «غير متاح» — وهو الصدق المطلوب في §5 من الميثاق.
 */
create or replace function private.require_founder()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- `is not true` لا `not (...)`: حزام ثانٍ ضدّ ثلاثية القيم. حتى لو عادت
  -- الدالة يومًا بـ`NULL`، يبقى الجواب منعًا. **الافتراض منع في الطبقتين.**
  if private.is_founder() is not true then
    raise exception 'founder_role_required' using errcode = '42501';
  end if;
end;
$$;

-- ── ٢) المنح والسحب — `service_role` حصرًا ─────────────────────────────────
/**
 * يمنح دورًا لحساب بالبريد. `service_role` فقط.
 * @param p_role القيمة الوحيدة المقبولة: 'founder'.
 */
create or replace function public.admin_set_role(p_email text, p_role text, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
  n   text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'admin_set_role: empty identity' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'admin_set_role: reason required' using errcode = '22023';
  end if;
  -- قائمة بيضاء صارمة — لا قيمة مجهولة تُكتب فتصير لغزًا بعد شهر.
  if p_role is distinct from 'founder' then
    raise exception 'admin_set_role: unknown role %', coalesce(p_role, '<null>') using errcode = '22023';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = n;
  if uid is null then
    raise exception 'admin_set_role: no such account' using errcode = 'P0002';
  end if;

  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
           'qimmah_role',        p_role,
           'qimmah_role_set_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'qimmah_role_set_by', 'service_role',
           'qimmah_role_reason', btrim(p_reason)
         )
   where u.id = uid;

  return uid;
end;
$$;

/** يسحب الدور. وسمُ السحب يبقى، فلا يختفي أثر من كان مؤسسًا. */
create or replace function public.admin_clear_role(p_email text, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
  n   text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'admin_clear_role: empty identity' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'admin_clear_role: reason required' using errcode = '22023';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = n;
  if uid is null then
    raise exception 'admin_clear_role: no such account' using errcode = 'P0002';
  end if;

  update auth.users u
     set raw_app_meta_data = (coalesce(u.raw_app_meta_data, '{}'::jsonb) - 'qimmah_role') || jsonb_build_object(
           'qimmah_role_cleared_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'qimmah_role_reason',     btrim(p_reason)
         )
   where u.id = uid;

  return uid;
end;
$$;

-- ── ٣) الصلاحيات — المنع أولًا ثم استثناء واحد مسمّى ───────────────────────
-- `public` يُسمّى صراحةً: الدور الذي يشمل الجميع، وسحبه من anon/authenticated
-- وحدهما يترك الباب مفتوحًا لكل دور يُخترع لاحقًا (هجرة 20260809120003).
revoke all on function private.account_role(uuid)    from public, anon, authenticated;
revoke all on function private.is_founder()          from public, anon, authenticated;
revoke all on function private.require_founder()     from public, anon, authenticated;
revoke all on function public.admin_set_role(text,text,text)   from public, anon, authenticated;
revoke all on function public.admin_clear_role(text,text)      from public, anon, authenticated;
grant execute on function public.admin_set_role(text,text,text) to service_role;
grant execute on function public.admin_clear_role(text,text)    to service_role;

comment on function public.admin_set_role(text,text,text) is
  'يمنح qimmah_role في app_metadata. service_role حصرًا — لا مسار عميل واحد يصل إليها.';
comment on function private.is_founder() is
  'دور صاحب الجلسة من app_metadata وحده. لا ينظر إلى user_metadata مهما حمل.';

  $qimmah_mig_20260816120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260816120002', '20260816120002_founder_role_provisioning.sql');
end
$qimmah_mig_20260816120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260816120003_founder_dashboard_reads.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260816120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260816120003') then
    raise notice 'تخطٍّ: 20260816120003_founder_dashboard_reads.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260816120003$
-- ============================================================================
-- 20260816120002 — [OVERNIGHT-ADMIN] قراءات المركز التنفيذي (تجميعات فقط)
-- ============================================================================
-- مسار القراءة الوحيد المصرَّح به للوحة. كل ما فيه **للقراءة**: لا INSERT ولا
-- UPDATE ولا DELETE ولا TRUNCATE في أي سطر.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① **البوّابة داخل الدالة، لا عند المستدعي.**
--    `private.require_founder()` أوّل سطر في كل دالة. العميل لا يمرّر دورًا ولا
--    علمًا ولا مفتاحًا: الخادم يقرأ `auth.uid()` ثم `raw_app_meta_data` بنفسه.
--    فلا شيء يصل المتصفّح يمكن تزويره لفتح الباب.
--
-- ② **المنع يُرفع استثناءً مسمّى، لا يُعاد صفرًا.**
--    دالة تعيد `0` لغير المصرَّح له تُقرأ في اللوحة **رقمًا** («لا مستخدمين»)
--    لا منعًا — وهو بالضبط الكذب الذي يمنعه عقد البيانات. الاستثناء يصل
--    الواجهة حالةَ خطأ فتعرض «غير متاح».
--
-- ③ **تجميعات وحقول تشغيلية فقط.**
--    ولا حقل صحّي واحد: لا وزن، ولا محيط، ولا إصابة، ولا دواء، ولا حساسية،
--    ولا اسم طعام. صفّ الجدول يحمل ما يلزم للدعم التشغيلي وحده، والبريد
--    **يُقنَّع في SQL** فلا يغادر القاعدة كاملًا أصلًا.
--
-- ④ **ما لا مصدر له لا يُختلق.**
--    محاولات الاسترداد المرفوضة، ونشاط المنتج، وإكمال التخصيص: لا تُرجعها هذه
--    الدوال إطلاقًا. الواجهة تُبقيها «غير متاح» ولا تراها صفرًا.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الـrunbook في `docs/execution/qimmah-sovereign-overnight/ADMIN-DELIVERY.md`.
--
-- تسمية `founder_*` لا `admin_*` عمدًا: ثابتٌ قائم في `test:privileges` يفرض
-- ألّا تُمنح أي دالة `admin\_%` لدور عميل. وهذه الدوال **يجب** أن تُمنح لـ
-- `authenticated` (المؤسس مستخدم مسجَّل)، فبقاؤها خارج ذلك الفضاء الاسمي يحفظ
-- الثابت القائم بدل أن يخرقه — وحارسها الخاصّ في `test:admin-db`: كل دالة
-- `founder_*` تحمل `require_founder()` في جسمها.
-- ============================================================================

-- ── ١) اللقطة التنفيذية — كائن jsonb واحد ─────────────────────────────────
/**
 * كل أرقام اللوحة في نداء واحد. المفاتيح تطابق معرّفات `METRIC_REGISTRY`
 * حرفيًا، فأي انحراف بين الطرفين يظهر مفتاحًا مفقودًا لا رقمًا خاطئًا.
 *
 * `as_of` من **وقت قاعدة البيانات** لا من ساعة المتصفّح: رقمٌ بلحظة قياس
 * يكتبها العميل يمكن أن يبدو حديثًا وهو قديم.
 */
create or replace function public.founder_executive_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  out_json     jsonb;
  riyadh_start timestamptz;
  total_users  bigint;
begin
  perform private.require_founder();

  -- منتصف ليل الرياض: الحسابات «اليوم» تُقاس بيوم المستخدم لا بـUTC.
  riyadh_start := date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh';

  select count(*) into total_users from public.profiles;

  select jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),

    -- ── الحسابات: المقام كامل بحكم مُشغّل handle_new_user ──
    'users', jsonb_build_object(
      'total',    total_users,
      'newToday', (select count(*) from public.profiles p where p.created_at >= riyadh_start),
      'new7d',    (select count(*) from public.profiles p where p.created_at >= now() - interval '7 days'),
      'new30d',   (select count(*) from public.profiles p where p.created_at >= now() - interval '30 days'),
      'verified', (select count(*) from auth.users u where u.email_confirmed_at is not null),
      'growthSeries', coalesce((
        select jsonb_agg(jsonb_build_object('date', d.day, 'value', d.n) order by d.day)
          from (
            select to_char(date_trunc('day', p.created_at at time zone 'Asia/Riyadh'), 'YYYY-MM-DD') as day,
                   count(*) as n
              from public.profiles p
             where p.created_at >= now() - interval '90 days'
             group by 1
          ) d
      ), '[]'::jsonb)
    ),

    -- ── الدخول: من جدول المصادقة. «سجّلوا دخول» لا «نشطون» (الجلسة تُجدَّد) ──
    'activity', jsonb_build_object(
      'signedIn7d',  (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '7 days'),
      'signedIn30d', (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '30 days'),
      'dormant30d',  (select count(*) from auth.users u
                       where u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 days')
    ),

    -- ── الاستحقاق: الحالة تُشتقّ بوقت القاعدة، ولا تُقرأ من عمود مخزَّن ──
    'entitlement', jsonb_build_object(
      'premiumActive', (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'premiumActive'),
      'trialActive',   (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialActive'),
      'trialExpired',  (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialExpired'),
      -- المعاينة = حساب بلا أي استحقاق فعّال. يُشتقّ من المقام الكامل.
      'previewOnly',   greatest(total_users - (
                         select count(*) from public.entitlements e
                          where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                                in ('premiumActive','trialActive','specialAccessActive')), 0),
      'revokedActive', (select count(*) from public.revocation_ledger r where r.lifted_at is null)
    ),

    -- ── التجارة: أوامر سلة والأكواد ──
    'commerce', jsonb_build_object(
      'ordersSeen',   (select count(distinct s.provider_order_id) from public.salla_webhook_events s
                        where s.provider_order_id is not null),
      'ordersPaid',   (select count(*) from public.purchase_ledger l),
      'ordersFailed', (select count(*) from public.salla_webhook_events s
                        where s.classification in ('failed','rejected')),
      'codesIssued',  (select count(*) from public.access_codes c),
      'codesRedeemed',(select count(*) from public.code_redemption_ledger g),
      'codesUnused',  (select count(*) from public.access_codes c
                        where c.enabled and c.redemption_count = 0
                          and (c.expires_at is null or c.expires_at > now()))
    )
  ) into out_json;

  return out_json;
end;
$$;

-- ── ٢) صفحة جدول المستخدمين — بحث وترتيب على الخادم ───────────────────────
/**
 * صفحة واحدة من جدول المستخدمين.
 *
 * **البريد يُقنَّع هنا** لا في الواجهة: القيمة الكاملة لا تغادر القاعدة أصلًا،
 * فلا يوجد مسار شبكة يحملها ولو أخطأ مكوّن لاحقًا.
 * و`onboarding` يعيد `'unknown'` حين لا توجد علامة إكمال — **لا** `'incomplete'`:
 * العلامة لا تصل الخادم إلا بمزامنة موافَق عليها، فالجهل ليس نفيًا.
 */
create or replace function public.founder_user_page(p_search text, p_page int, p_page_size int)
returns table (
  user_id         uuid,
  display_name    text,
  email_masked    text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  entitlement     text,
  onboarding      text,
  total_rows      bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q      text := lower(btrim(coalesce(p_search, '')));
  size   int  := least(greatest(coalesce(p_page_size, 25), 1), 200);
  pg     int  := greatest(coalesce(p_page, 1), 1);
begin
  perform private.require_founder();

  return query
  with base as (
    select u.id,
           p.display_name as name,
           u.email        as mail,
           coalesce(p.created_at, u.created_at) as made_at,
           u.last_sign_in_at as seen_at,
           coalesce(
             (select private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                from public.entitlements e where e.user_id = u.id),
             'noAccess') as ent_state,
           (p.data #>> '{_meta,completed}') as done_flag
      from auth.users u
      left join public.profiles p on p.user_id = u.id
  ), filtered as (
    select * from base
     where q = ''
        or lower(coalesce(name, '')) like '%' || q || '%'
        or lower(coalesce(mail, '')) like '%' || q || '%'
        or id::text like '%' || q || '%'
  ), counted as (
    select f.*, count(*) over () as n from filtered f
  )
  select c.id,
         c.name,
         case
           when c.mail is null or position('@' in c.mail) = 0 then null
           else left(c.mail, 1) || '••••@' || split_part(c.mail, '@', 2)
         end,
         c.made_at,
         c.seen_at,
         case c.ent_state
           when 'premiumActive'       then 'premium'
           when 'trialActive'         then 'trial'
           when 'specialAccessActive' then 'code'
           when 'noAccess'            then 'preview'
           when 'trialExpired'        then 'preview'
           else 'unknown'
         end,
         case when c.done_flag is not null then 'complete' else 'unknown' end,
         c.n
    from counted c
   order by c.made_at desc nulls last, c.id
   offset (pg - 1) * size
   limit size;
end;
$$;

-- ── ٣) الصلاحيات ──────────────────────────────────────────────────────────
-- `public` أولًا (الدور الجامع)، ثم `anon` — ويبقى `authenticated` **وحده**
-- ممنوحًا، لأن البوّابة الحقيقية داخل الدالة لا عند المنح.
revoke all on function public.founder_executive_snapshot()          from public, anon;
revoke all on function public.founder_user_page(text,int,int)       from public, anon;
grant execute on function public.founder_executive_snapshot()        to authenticated;
grant execute on function public.founder_user_page(text,int,int)     to authenticated;

comment on function public.founder_executive_snapshot() is
  'تجميعات المركز التنفيذي. للقراءة فقط، وبوّابة الدور داخل الدالة — تُرفع استثناءً مسمّى لا صفرًا.';
comment on function public.founder_user_page(text,int,int) is
  'صفحة جدول المستخدمين. البريد مُقنَّع في SQL، ولا حقل صحّي واحد في المخرجات.';

  $qimmah_mig_20260816120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260816120003', '20260816120003_founder_dashboard_reads.sql');
end
$qimmah_mig_20260816120003_wrap$;
