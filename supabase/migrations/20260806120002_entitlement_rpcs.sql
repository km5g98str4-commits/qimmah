-- ============================================================================
-- 20260806120002 — P2: دوال الوصول (RPCs) — المنح والاسترداد والاشتقاق
-- ============================================================================
-- تكملة 20260806120001. **كل** تغيير على حالة الوصول يمرّ من هنا: لا سياسة
-- كتابة على أي جدول (انظر الهجرة السابقة §٤)، فالدوال هي المنفذ الوحيد.
--
-- كل دالة: `security definer` + `set search_path = ''` + كل اسم مُؤهَّل بمخطّطه
-- + كل مُدخل مربوط كمعامل (لا تركيب نصّي) ⇒ لا حقن search_path ولا SQL.
--
-- الهدف من `search_path = ''`: الدالة تعمل بصلاحيات مالكها، فلو ورث search_path
-- من المستدعي لأمكن لمستخدم أن يزرع `public` وهميًا ويخطف اسمًا غير مؤهَّل.
-- التفريغ يجعل كل اسم غير مؤهَّل خطأً وقت التنفيذ — الفشل صاخب لا صامت.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- الاشتقاق بدل التخزين: لا عمود `status`. الحالة الفعّالة تُحسب من
-- (النوع · no_expiry · expires_at · revoked_at) + **وقت قاعدة البيانات** `now()`.
-- ساعة العميل لا تدخل أي قرار — لا تمديد تجربة بتغيير ساعة الجهاز.
--
-- الأسبقية: revoked > premium > special > trial > none.
-- Premium **لا تُخفَّض أبدًا** بكود أو تجربة لاحقة (تُسجَّل الاستردادات ولا تُغيّر
-- المنحة) — قرار مؤسس ٦.
-- ============================================================================

-- ── ١) الاشتقاق — مصدر الحقيقة الوحيد لأي حالة معروضة ──────────────────────
create or replace function private.derive_state(
  p_type text, p_no_expiry boolean, p_expires_at timestamptz, p_revoked_at timestamptz
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_revoked_at is not null                                    then 'revoked'
    when p_type = 'premium' and p_no_expiry                          then 'premiumActive'
    when p_type = 'special' and p_expires_at > now()                 then 'specialAccessActive'
    when p_type = 'trial'   and p_expires_at > now()                 then 'trialActive'
    when p_type = 'trial'                                            then 'trialExpired'
    else 'noAccess'
  end;
$$;

/** رتبة الأسبقية — تمنع أي مسار من تخفيض منحة أعلى. */
create or replace function private.grant_rank(p_type text)
returns int
language sql
immutable
security definer
set search_path = ''
as $$
  select case p_type when 'premium' then 3 when 'special' then 2 when 'trial' then 1 else 0 end;
$$;

-- ── ٢) القراءة الوحيدة المعتمدة للعميل ─────────────────────────────────────
create or replace function public.my_entitlement()
returns table (
  state            text,
  entitlement_type text,
  source           text,
  activated_at     timestamptz,
  expires_at       timestamptz,
  no_expiry        boolean,
  server_time      timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return query
    select private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at),
           e.entitlement_type, e.source, e.activated_at, e.expires_at, e.no_expiry, now()
    from public.entitlements e
    where e.user_id = uid;
  if not found then
    -- لا صفّ ⇒ لا وصول. صادقة صراحةً بدل صفّ فارغ يُقرأ خطأً.
    return query select 'noAccess'::text, 'none'::text, 'none'::text,
                        null::timestamptz, null::timestamptz, false, now();
  end if;
end;
$$;

-- ── ٣) بدء التجربة — ٧٢ ساعة بالضبط، مرّة واحدة لكل هوية مُبصَمة ───────────
create or replace function public.start_trial()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  em    text;
  conf  timestamptz;
  ver   int;
  h     text;
  cur   record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  -- التجربة للحساب **المُوثَّق** فقط — بريد غير مؤكَّد = مزرعة تجارب.
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;

  -- ترتيب الفحصين مقصود: **ضمان الهوية الدائم أولًا**، ثم حالة الحساب.
  -- لو سبق فحصُ الحساب لابتلع السببَ الحقيقي: مستخدم استنفد تجربته يحمل منحة
  -- تجربة برتبة ١، فكان يُرفَض بـ`trial_not_applicable` — رسالة تصف عرَضًا لا
  -- علّة، وتُخفي أن السجلّ الدائم هو ما منعه. الضمان الذي ينجو من حذف الحساب
  -- يجب أن يكون هو المتكلّم.
  if exists (
    -- مسح كل الإصدارات المعروفة: هوية جرّبت تحت ملح قديم تبقى معروفة.
    select 1 from private.identity_hashes(em) ih
    join public.trial_ledger t on t.email_hash = ih.email_hash
  ) then
    raise exception 'trial_already_used' using errcode = '23505';
  end if;

  -- لم يجرّب قط، لكن يحمل منحة أعلى (Premium/كود) ⇒ التجربة بلا معنى ولا تُخفّض.
  select * into cur from public.entitlements where user_id = uid;
  if found and cur.revoked_at is null and private.grant_rank(cur.entitlement_type) >= 1 then
    raise exception 'trial_not_applicable' using errcode = '22023';
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  insert into public.trial_ledger (email_hash, hash_version) values (h, ver);

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, em, 'trial', 'trial', now(), now() + interval '72 hours', false)
  on conflict (user_id) do update
    set entitlement_type = 'trial', source = 'trial', activated_at = now(),
        expires_at = now() + interval '72 hours', no_expiry = false,
        revoked_at = null, revoked_reason = null;

  return 'trialActive';
end;
$$;

-- ── ٤) استرداد كود — آمن تحت التزامن، والحدّ ينجو من حذف الحساب ────────────
create or replace function public.redeem_access_code(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em  text;
  ver int;
  h   text;
  c   record;
  cur record;
  new_expiry timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  -- قفل صفّ الكود: مستردّان متزامنان يتسلسلان هنا، والقراءة بعد القفل حديثة.
  select * into c from public.access_codes
   where code_hash = private.hash_identity(upper(btrim(p_code)), ver)
   for update;

  -- رسالة واحدة لكل حالات الرفض: لا تفرّق «غير موجود» عن «معطّل» عن «منتهٍ».
  if not found
     or not c.enabled
     or c.starts_at > now()
     or (c.expires_at is not null and c.expires_at <= now())
     or c.redemption_count >= c.max_redemptions
  then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  -- هوية استردّت هذا الكود سابقًا (حتى لو حُذف حسابها) لا تستردّه مرّة أخرى.
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
  -- Premium قائمة ⇒ تُسجَّل الاستردادات ولا تُخفَّض المنحة (أسبقية Premium).
  if found and cur.revoked_at is null and private.grant_rank(cur.entitlement_type) > 2 then
    return 'premiumActive';
  end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activation_code_id, activated_at, expires_at, no_expiry)
  values (uid, em, 'special', 'code', c.id, now(), new_expiry, false)
  on conflict (user_id) do update
    set entitlement_type = 'special', source = 'code', activation_code_id = c.id,
        activated_at = now(), expires_at = new_expiry, no_expiry = false,
        revoked_at = null, revoked_reason = null;

  return 'specialAccessActive';
end;
$$;

-- ── ٥) استرجاع المنح المعلّقة — شراء قبل الحساب، أو بعد حذفه ───────────────
create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em  text;
  cur record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  -- شراء مسجَّل تحت أي إصدار ملح ⇒ Premium. هذا ما يجعل الشراء ينجو من حذف
  -- الحساب: purchase_ledger بلا user_id فلم يمسّه delete_own_account().
  if exists (select 1 from private.identity_hashes(em) ih
             join public.purchase_ledger p on p.email_hash = ih.email_hash) then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', 'salla', now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = 'salla', activated_at = now(),
          expires_at = null, no_expiry = true, revoked_at = null, revoked_reason = null;
    return 'premiumActive';
  end if;

  select * into cur from public.entitlements where user_id = uid;
  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;

-- ── ٦) الإدارة — service_role حصرًا، لا يبلغها متصفّح ──────────────────────
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
declare ver int; id uuid;
begin
  ver := private.active_pepper_version();
  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason)
  values (private.hash_identity(upper(btrim(p_code)), ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, p_created_by, p_created_reason)
  returning access_codes.id into id;
  return id;
end;
$$;

create or replace function public.admin_grant_premium(
  p_email text, p_provider text, p_provider_order_id text,
  p_amount_minor int default null, p_raw jsonb default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare ver int; h text; uid uuid;
begin
  ver := private.active_pepper_version();
  h   := private.hash_identity(p_email, ver);

  -- تكرار حدث المزوّد لا يمنح مرّتين ولا يفشل: القيد الفريد + do nothing.
  insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version,
                                      amount_minor, raw)
  values (p_provider, p_provider_order_id, h, ver, p_amount_minor, p_raw)
  on conflict (provider, provider_order_id) do nothing;

  -- الحساب قد لا يكون موجودًا بعد (شراء قبل التسجيل) — السجلّ ينتظره.
  select u.id into uid from auth.users u where lower(btrim(u.email)) = lower(btrim(p_email));
  if uid is null then return 'pending_claim'; end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, p_email, 'premium', 'salla', now(), null, true)
  on conflict (user_id) do update
    set entitlement_type = 'premium', source = 'salla', activated_at = now(),
        expires_at = null, no_expiry = true, revoked_at = null, revoked_reason = null;
  return 'premiumActive';
end;
$$;

create or replace function public.admin_revoke(p_user_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.entitlements
     set revoked_at = now(), revoked_reason = p_reason
   where user_id = p_user_id;
  if not found then raise exception 'no_entitlement' using errcode = 'P0002'; end if;
  return 'revoked';
end;
$$;

-- ── ٧) الصلاحيات — من ينادي ماذا ───────────────────────────────────────────
revoke all on function public.my_entitlement()                from public, anon;
revoke all on function public.start_trial()                   from public, anon;
revoke all on function public.redeem_access_code(text)        from public, anon;
revoke all on function public.claim_pending_grants()          from public, anon;
grant execute on function public.my_entitlement()             to authenticated;
grant execute on function public.start_trial()                to authenticated;
grant execute on function public.redeem_access_code(text)     to authenticated;
grant execute on function public.claim_pending_grants()       to authenticated;

-- الإدارة: تُسحب من الجميع بما فيهم authenticated. service_role وحده.
revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_grant_premium(text,text,text,int,jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_revoke(uuid,text)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;
grant execute on function public.admin_grant_premium(text,text,text,int,jsonb) to service_role;
grant execute on function public.admin_revoke(uuid,text) to service_role;

-- الدوال الداخلية لا يناديها أحد من الخارج إطلاقًا.
revoke all on function private.hash_identity(text,int)   from public, anon, authenticated;
revoke all on function private.identity_hashes(text)     from public, anon, authenticated;
revoke all on function private.active_pepper_version()   from public, anon, authenticated;
revoke all on function private.derive_state(text,boolean,timestamptz,timestamptz)
  from public, anon, authenticated;
revoke all on function private.grant_rank(text)          from public, anon, authenticated;
