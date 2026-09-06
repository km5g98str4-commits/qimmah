-- ============================================================================
-- [RELEASE-REVIEW-001] تسلسل كتّاب المنحة لكل مستخدم — سدّ سباق «الكود ثم التجربة»
-- ============================================================================
-- الثغرة المقيسة (على Postgres 16 حقيقي، ٥ من ١٢ تكرارًا): `start_trial` تتسابق
-- مع `redeem_access_code_v2` لنفس الحساب. كلتاهما تقرأ صفّ المنحة (لا شيء)
-- ثم تكتب بـ`on conflict do update`. الفائز الثاني يكتب فوق الأوّل — فيهبط
-- صكّ ١٤ يومًا حيّ إلى تجربة ٧٢ ساعة، **ويُستهلك سجلّ التجربة معًا**.
-- مانع الهبوط القائم (20260830120001) يحرس Premium وحدها لا `special`.
--
-- ═══ السدّان — بنيويّان لا أخلاقيّان (§4.2) ═══
--   ① **قفل استشاري معامَلاتي لكل مستخدم** في أوّل كل كاتب منحة
--      (start_trial · redeem_core · claim_pending_grants): الكاتب الثاني ينتظر
--      إثبات الأوّل، فيرى صفّه ويقرّر على حقيقةٍ لا على فراغ. لا سلطة هوية
--      ثانية: المفتاح من `auth.uid()` وحده.
--   ② **مانع الهبوط يعمّ الرتب**: منحة حيّة غير ملغاة لا تُستبدل بأدنى منها
--      مهما كان الكاتب — Premium كما كانت، و`special` غير المنتهية كذلك.
--      رفضٌ صامت كسابقه: الحقيقة الحيّة هي `my_entitlement`.
--
-- الأجساد الثلاثة منقولة حرفيًّا من آخر مُعرِّف لكلٍّ + سطر القفل وحده.
-- idempotent · forward-only · لا هجرة سابقة تُحرَّر.
-- ============================================================================

-- ── ١) القفل — مفتاحه هوية الجلسة حصرًا ─────────────────────────────────────
create or replace function private.lock_entitlement_writer(p_uid uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  -- مفتاحان: نطاقٌ ثابت للمنح + بصمة المستخدم. يُحرَّر مع نهاية المعاملة.
  perform pg_advisory_xact_lock(hashtext('qimmah.entitlement_writer'), hashtext(p_uid::text));
end;
$$;

revoke all on function private.lock_entitlement_writer(uuid) from public, anon, authenticated;

comment on function private.lock_entitlement_writer(uuid) is
  'قفل معامَلاتي لكل مستخدم يسلسل كتّاب المنحة (تجربة · كود · مطالبة) فلا يكتب أحدهم فوق الآخر على قراءةٍ بائتة.';

-- ── ٢) مانع الهبوط يعمّ الرتب ───────────────────────────────────────────────
create or replace function private.entitlements_block_premium_downgrade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- الرتب مضمَّنة لا مستدعاة: المُشغِّل يعمل بدور الكاتب (invoker)، ومخطّط
  -- `private` محجوب عن أدوار العميل والخدمة — فنداءُ `private.grant_rank` هنا
  -- كان سيُسقط كل كتابة بمفتاح الخدمة بـ«permission denied». نفس الجدول حرفيًّا.
  old_rank int := case old.entitlement_type when 'premium' then 3 when 'special' then 2 when 'trial' then 1 else 0 end;
  new_rank int := case new.entitlement_type when 'premium' then 3 when 'special' then 2 when 'trial' then 1 else 0 end;
begin
  -- منحة حيّة (غير ملغاة، ولم تنتهِ) لا تُستبدل بأدنى منها رتبةً — أيًّا كان
  -- الكاتب. الإلغاء ليس هبوطًا (النوع يبقى ويُضبط revoked_at)، والحذف لا يمرّ هنا.
  if old.revoked_at is null
     and (old.no_expiry or (old.expires_at is not null and old.expires_at > now()))
     and new_rank < old_rank then
    -- رفضٌ صامت: الكاتب المتسابق يظنّ أنه كتب، والحقيقة الحيّة (`my_entitlement`)
    -- تبقى الأعلى — والعميل يعيد قراءتها بعد كل استرداد.
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists entitlements_block_premium_downgrade on public.entitlements;
create trigger entitlements_block_premium_downgrade
  before update on public.entitlements
  for each row execute function private.entitlements_block_premium_downgrade();

comment on function private.entitlements_block_premium_downgrade() is
  'يمنع هبوط أي منحة حيّة إلى رتبة أدنى (premium→special/trial · special→trial) مهما كان الكاتب.';

-- ── ٣) الكتّاب الثلاثة — الجسد حرفيًّا + سطر القفل ──────────────────────────
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
  canon text;
  ch    text;
  cur   record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.gate_enforce('start_trial');
  perform private.lock_entitlement_writer(uid);

  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;

  -- الإلغاء لاصق **وينجو من حذف الحساب**: الفحص يمسح السجلّ الدائم عبر كل
  -- إصدارات الملح — حذف الحساب وإعادة التسجيل لا يرفعان الحظر.
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  -- البصمة الخام — كما كانت حرفيًّا. حارس كل الصفوف القائمة.
  if exists (
    select 1 from private.identity_hashes(em) ih
    join public.trial_ledger t on t.email_hash = ih.email_hash
  ) then
    raise exception 'trial_already_used' using errcode = '23505';
  end if;

  -- [F-4] والبصمة القانونية — تلتقط `a+farm@x` بعد `a@x`. تُفحص عبر كل
  -- إصدارات الملح كالأولى، فتدوير الملح لا يفتح مزرعة تجارب.
  canon := private.canonical_identity(em);
  if canon is not null then
    if exists (
      select 1 from private.identity_hashes(canon) ih
      join public.trial_ledger t on t.canonical_hash = ih.email_hash
    ) then
      raise exception 'trial_already_used' using errcode = '23505';
    end if;
  end if;

  select * into cur from public.entitlements where user_id = uid;
  if found and cur.revoked_at is null and private.grant_rank(cur.entitlement_type) >= 1 then
    raise exception 'trial_not_applicable' using errcode = '22023';
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);
  ch  := case when canon is null then null else private.hash_identity(canon, ver) end;

  insert into public.trial_ledger (email_hash, hash_version, canonical_hash, canonical_hash_version)
  values (h, ver, ch, case when ch is null then null else ver end);

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

create or replace function private.redeem_core(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  conf timestamptz;
  ver int;
  h text;
  normalized text;
  c record;
  cur record;
  new_expiry timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.lock_entitlement_writer(uid);
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  -- [F-2c] وصولٌ يُسجَّل على عنوان بريد — فيلزمه ما يلزم التجربة والمطالبة.
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;
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
  then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  -- [COMMERCE-W1 ②] صكّ استردّته هذه الهوية من قبل: المعاملة الأولى أُثبتت
  -- (السجلّ الدائم شاهدها) — إعادة المحاولة تتقارب على نفس النتيجة قيمةً.
  -- **قبل** فحص الاستنفاد عمدًا: الصكّ مفرد الاستخدام، فبعد نجاحه هو مستنفَد
  -- دائمًا — ولو سبق الفحصُ لكان جواب صاحب الصكّ «كود غير صالح» وهو مالكه.
  if c.grant_purpose = 'purchase' and exists (
       select 1 from private.identity_hashes(em) ih
       join public.code_redemption_ledger l
         on l.code_id = c.id and l.email_hash = ih.email_hash) then
    perform private.grant_premium_from_code(uid, em, c.id, c.label, h, ver);
    return 'premiumActive';
  end if;

  if c.redemption_count >= c.max_redemptions then
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

  -- [COMMERCE-W1 ③] صكّ الشراء ⇒ Premium دائم عبر السلطة الواحدة. يشمل حامل
  -- Premium القائم الذي يستردّ صكًّا آخر: الصكّ يُستهلك، الأثر يُسجَّل،
  -- والمنحة تبقى Premium — لا حالة متناقضة ولا ازدواج (القيد الفريد يحرس).
  if c.grant_purpose = 'purchase' then
    perform private.grant_premium_from_code(uid, em, c.id, c.label, h, ver);
    return 'premiumActive';
  end if;

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

revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;
revoke all on function public.claim_pending_grants() from public, anon;
grant execute on function public.claim_pending_grants() to authenticated;
revoke all on function private.redeem_core(text) from public, anon, authenticated;

-- ── ٤) تحقّق ذاتي (§4.2) ────────────────────────────────────────────────────
do $$
begin
  if (select prosrc from pg_proc where oid = 'public.start_trial()'::regprocedure)
        not like '%lock_entitlement_writer(uid)%'
     or (select prosrc from pg_proc where oid = 'private.redeem_core(text)'::regprocedure)
        not like '%lock_entitlement_writer(uid)%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%lock_entitlement_writer(uid)%' then
    raise exception 'writer-serialization incomplete: a grant writer is missing its lock';
  end if;
  -- حارس البوّابة لم يُمسّ (التأكيد المضادّ لِـ20260827120004).
  if (select prosrc from pg_proc where oid = 'public.start_trial()'::regprocedure)
        not like '%gate_enforce(''start_trial'')%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%gate_enforce(''claim_pending_grants'')%' then
    raise exception 'writer-serialization overreach: gate guard lost';
  end if;
  if not exists (select 1 from pg_trigger
                  where tgname = 'entitlements_block_premium_downgrade'
                    and tgrelid = 'public.entitlements'::regclass) then
    raise exception 'writer-serialization incomplete: downgrade trigger missing';
  end if;
end;
$$;
