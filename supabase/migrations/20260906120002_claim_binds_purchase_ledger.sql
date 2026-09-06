-- ============================================================================
-- [RELEASE-REVIEW-002] المطالبة تربط شراءها — إغلاق نصف الثغرة الباقي من 20260830120001
-- ============================================================================
-- الثغرة المقيسة (Postgres 16 حقيقي): `20260830120001` أنشأ الفهرس الفريد
-- «شراءٌ واحد ⇒ منحة Premium حيّة واحدة» على `purchase_ledger_id`، لكن
-- `claim_pending_grants` وحدها ظلّت تمنح Premium **بلا** ربط الصفّ. فالمسار:
--   A يستردّ صكّ شراء (Premium على L) → A يبدّل بريده → B يسجّل بالبريد القديم
--   ويؤكّده → B ينادي claim_pending_grants → Premium ثانية من نفس الشراء،
--   purchase_ledger_id = null فلا يسري الفهرس. مكرَّر بلا حدّ.
--
-- الإصلاح: المطالبة تختار صفّ الشراء **غير المرتبط بمنحة حيّة على حساب آخر**،
-- وتكتب `purchase_ledger_id`، وتعامل `unique_violation` كخسارة سباق — فتسقط إلى
-- بقيّة المسار (كود موقوت · حالة قائمة · noAccess) بلا استثناء يصل العميل.
-- الجسد منقول حرفيًّا من 20260906120001 (بقفل الكاتب وحارس البوّابة) + هذا الربط.
-- `admin_grant_premium` (مسار سلة V2 — غير منشور) يبقى كما هو ويُسجَّل دَينًا مسمًّى.
-- idempotent · forward-only.
-- ============================================================================

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
  purchase_ledger_uuid uuid;
  purchase_bound boolean := false;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.gate_enforce('claim_pending_grants');
  perform private.lock_entitlement_writer(uid);
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

  -- [RELEASE-REVIEW-002] الشراء يُربط بصفّه: `purchase_ledger_id` يُكتب هنا كما
  -- في `grant_premium_from_code`، فيسري الفهرس الفريد «شراءٌ واحد ⇒ منحة Premium
  -- حيّة واحدة» على هذا المسار أيضًا. الصفّ الأحدث الذي **لا يحمل** منحة حيّة على
  -- حساب آخر هو ما يُطالَب به — وشراءٌ مستهلَك على حساب غيري لا يُمنح مرّتين.
  select p.id, p.provider into purchase_ledger_uuid, purchase_provider
    from private.identity_hashes(em) ih
    join public.purchase_ledger p on p.email_hash = ih.email_hash
   where not exists (select 1 from public.entitlements e
                      where e.purchase_ledger_id = p.id
                        and e.entitlement_type = 'premium'
                        and e.user_id <> uid)
   order by p.granted_at desc, p.id desc
   limit 1;
  if purchase_ledger_uuid is not null then
    begin
      insert into public.entitlements (user_id, email, entitlement_type, source,
                                       activated_at, expires_at, no_expiry, purchase_ledger_id)
      values (uid, em, 'premium', purchase_provider, now(), null, true, purchase_ledger_uuid)
      on conflict (user_id) do update
        set entitlement_type = 'premium', source = purchase_provider, activated_at = now(),
            expires_at = null, no_expiry = true, activation_code_id = null,
            purchase_ledger_id = purchase_ledger_uuid
        where public.entitlements.entitlement_type <> 'premium'
           or public.entitlements.source <> purchase_provider
           or public.entitlements.purchase_ledger_id is distinct from purchase_ledger_uuid;
      purchase_bound := true;
    exception when unique_violation then
      -- سباقٌ خسره هذا الحساب: الشراء صار حيًّا على غيره بين الفحص والكتابة.
      purchase_bound := false;
    end;
    if purchase_bound then return 'premiumActive'; end if;
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

revoke all on function public.claim_pending_grants() from public, anon;
grant execute on function public.claim_pending_grants() to authenticated;

do $$
begin
  if (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%purchase_ledger_id = purchase_ledger_uuid%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%lock_entitlement_writer(uid)%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%gate_enforce(''claim_pending_grants'')%' then
    raise exception 'claim-binding incomplete: ledger binding, writer lock or gate guard missing';
  end if;
end;
$$;
