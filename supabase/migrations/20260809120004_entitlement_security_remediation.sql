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
