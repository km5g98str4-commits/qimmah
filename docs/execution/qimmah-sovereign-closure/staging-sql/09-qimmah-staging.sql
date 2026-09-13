-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 9/9
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (3):
--   · 20260906120001_entitlement_writer_serialization.sql
--   · 20260906120002_claim_binds_purchase_ledger.sql
--   · 20260913120001_salla_batch_exports.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260906120001_entitlement_writer_serialization.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260906120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260906120001') then
    raise notice 'تخطٍّ: 20260906120001_entitlement_writer_serialization.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260906120001$
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

  $qimmah_mig_20260906120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260906120001', '20260906120001_entitlement_writer_serialization.sql');
end
$qimmah_mig_20260906120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260906120002_claim_binds_purchase_ledger.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260906120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260906120002') then
    raise notice 'تخطٍّ: 20260906120002_claim_binds_purchase_ledger.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260906120002$
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

  $qimmah_mig_20260906120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260906120002', '20260906120002_claim_binds_purchase_ledger.sql');
end
$qimmah_mig_20260906120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260913120001_salla_batch_exports.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260913120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260913120001') then
    raise notice 'تخطٍّ: 20260913120001_salla_batch_exports.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260913120001$
-- ============================================================================
-- [SALLA-PROD-001] سجلّ تصدير دفعات الشراء إلى سلة + مخزون سلة + بحث دعم بالبصمة
-- ============================================================================
-- ما كان ناقصًا: لا أثر في القاعدة لـ«هذه الدفعة رُفعت إلى سلة»، فلا تسوية ولا
-- إنذار نفاد ولا حماية من رفع دفعةٍ متداولة. وما يُضاف هنا **لا يلمس سلطة المنحة**:
-- الاسترداد والإطفاء والعدّ كما هي؛ هذا الملف يضيف سجلًّا وقارئَين ودالّة دعم.
--
-- الثوابت:
--   • الوسم المسموح للقناة «سلة» نمطٌ صارم `SALLA-(TEST|LAUNCH|SUPPORT)-nnn` —
--     فـ`FOUNDER-RESERVE-001` وأي احتياطي **لا يمكن** تسجيله مصدَّرًا لسلة بنيويًّا.
--   • دفعة تُسجَّل مصدَّرة **مرّة واحدة**، وهي **بِكر** لحظتها (لا مستردّ ولا معطَّل)،
--     وعددها يساوي الصادر — وإلّا خطأ مسمّى. لا تصدير لدفعة متداولة.
--   • البصمة المسجَّلة هي بصمة مجموعة الأكواد (sha256 للمرتَّب) كما يطبعها
--     `scripts/salla/export-batch.mjs` — تسويةٌ بلا أي نصّ خام في القاعدة.
--   • بحث الدعم `founder_code_lookup(p_code)`: يبصم ما ألصقه العميل ويعيد حالته
--     ووسمه وتاريخ استرداده — **لا يعيد الكود ولا يخزّنه ولا يسجّله**.
-- ============================================================================

create table if not exists public.purchase_batch_exports (
  label          text primary key,
  channel        text not null check (channel in ('salla')),
  expected_count int  not null check (expected_count > 0),
  file_digest    text not null check (file_digest ~ '^[0-9a-f]{16,64}$'),
  exported_at    timestamptz not null default now(),
  exported_by    text not null,
  note           text,
  constraint purchase_batch_exports_label_shape
    check (label ~ '^SALLA-(TEST|LAUNCH|SUPPORT)-[0-9]{3}$')
);
alter table public.purchase_batch_exports enable row level security;
revoke all on table public.purchase_batch_exports from public, anon, authenticated;

comment on table public.purchase_batch_exports is
  '[SALLA-PROD-001] دفعات الشراء المسجَّلة مصدَّرةً إلى قناة بيع (سلة) — مرّة لكل وسم، بصمة مجموعة لا نصّ.';

-- ── ١) تسجيل التصدير — مؤسس، مرّة، دفعة بِكر، عدد مطابق ───────────────────
create or replace function public.founder_mark_purchase_batch_exported(
  p_label text, p_channel text, p_count int, p_digest text, p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  lbl text := btrim(coalesce(p_label, ''));
  issued int; redeemed int; disabled int;
begin
  perform private.require_founder();
  if lbl !~ '^SALLA-(TEST|LAUNCH|SUPPORT)-[0-9]{3}$' then
    raise exception 'label_not_salla_channel' using errcode = '22023';
  end if;
  if coalesce(p_channel, '') <> 'salla' then
    raise exception 'unsupported_channel' using errcode = '22023';
  end if;
  if p_digest is null or p_digest !~ '^[0-9a-f]{16,64}$' then
    raise exception 'digest_required' using errcode = '22023';
  end if;
  select count(*),
         count(*) filter (where c.redemption_count >= c.max_redemptions),
         count(*) filter (where not c.enabled)
    into issued, redeemed, disabled
    from public.access_codes c
   where c.grant_purpose = 'purchase' and c.label = lbl;
  if issued = 0 then
    raise exception 'no_such_batch' using errcode = 'P0002';
  end if;
  if issued <> coalesce(p_count, -1) then
    raise exception 'count_mismatch' using errcode = '22023';
  end if;
  if redeemed > 0 or disabled > 0 then
    raise exception 'batch_not_pristine' using errcode = '22023';
  end if;
  if exists (select 1 from public.purchase_batch_exports e where e.label = lbl) then
    raise exception 'already_exported' using errcode = '23505';
  end if;
  insert into public.purchase_batch_exports (label, channel, expected_count, file_digest, exported_by, note)
  values (lbl, 'salla', issued, lower(p_digest), 'founder:' || coalesce(auth.uid()::text, 'unknown'), nullif(btrim(coalesce(p_note, '')), ''));
  return jsonb_build_object('label', lbl, 'channel', 'salla', 'expected_count', issued, 'exported_at', now());
end;
$$;
revoke all on function public.founder_mark_purchase_batch_exported(text, text, int, text, text) from public, anon;
grant execute on function public.founder_mark_purchase_batch_exported(text, text, int, text, text) to authenticated;
comment on function public.founder_mark_purchase_batch_exported(text, text, int, text, text) is
  '[SALLA-PROD-001] يسجّل دفعة شراء مصدَّرةً إلى سلة — مرّة واحدة، دفعة بِكر، عدد مطابق، وسم بنمط القناة فقط.';

-- ── ٢) مخزون سلة — لكل دفعة مصدَّرة: ما استُردّ وما بقي وإنذار النفاد ─────────
create or replace function public.founder_salla_inventory(p_low_threshold int default 20)
returns table (
  label                     text,
  channel                   text,
  exported_at               timestamptz,
  expected_count            int,
  file_digest_prefix        text,
  codes_issued              bigint,
  codes_redeemed            bigint,
  codes_disabled_unredeemed bigint,
  codes_unredeemed          bigint,
  low_stock                 boolean,
  count_matches             boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select e.label, e.channel, e.exported_at, e.expected_count, left(e.file_digest, 12),
           count(c.id),
           count(c.id) filter (where c.redemption_count >= c.max_redemptions),
           count(c.id) filter (where c.redemption_count < c.max_redemptions and not c.enabled),
           count(c.id) filter (where c.redemption_count < c.max_redemptions and c.enabled
                                 and (c.expires_at is null or c.expires_at > now())),
           (count(c.id) filter (where c.redemption_count < c.max_redemptions and c.enabled
                                 and (c.expires_at is null or c.expires_at > now())))
             <= greatest(coalesce(p_low_threshold, 20), 0),
           count(c.id) = e.expected_count
      from public.purchase_batch_exports e
      left join public.access_codes c on c.grant_purpose = 'purchase' and c.label = e.label
     group by e.label, e.channel, e.exported_at, e.expected_count, e.file_digest
     order by e.exported_at desc;
end;
$$;
revoke all on function public.founder_salla_inventory(int) from public, anon;
grant execute on function public.founder_salla_inventory(int) to authenticated;
comment on function public.founder_salla_inventory(int) is
  '[SALLA-PROD-001] مخزون قناة سلة بالدفعة: الصادر/المستردّ/المعطَّل/غير المستردّ، وإنذار نفاد عند عتبة، ومطابقة العدد المسجَّل.';

-- ── ٣) بحث دعم بالبصمة — العميل يلصق كوده، المؤسس يرى حالته ولا يرى نصّه ────
create or replace function public.founder_code_lookup(p_code text)
returns table (
  found            boolean,
  label            text,
  grant_purpose    text,
  status           text,
  redemption_count int,
  max_redemptions  int,
  last_redeemed_at timestamptz,
  disabled_reason  text,
  exported_channel text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized text;
begin
  perform private.require_admin();
  begin
    normalized := private.normalize_access_code(p_code);
  exception when sqlstate '22023' then
    return query select false, null::text, null::text, 'malformed'::text, null::int, null::int, null::timestamptz, null::text, null::text;
    return;
  end;
  return query
    select true, c.label, c.grant_purpose,
           case
             when not c.enabled                                      then 'disabled'
             when c.expires_at is not null and c.expires_at <= now() then 'expired'
             when c.redemption_count >= c.max_redemptions            then 'redeemed'
             else 'issued'
           end,
           c.redemption_count, c.max_redemptions,
           (select max(l.redeemed_at) from public.access_code_redemptions l where l.code_id = c.id),
           c.disabled_reason,
           (select e.channel from public.purchase_batch_exports e where e.label = c.label)
      from public.access_codes c
     where c.code_hash in (select ih.email_hash from private.identity_hashes(normalized) ih)
     limit 1;
  if not found then
    return query select false, null::text, null::text, 'not_found'::text, null::int, null::int, null::timestamptz, null::text, null::text;
  end if;
end;
$$;
revoke all on function public.founder_code_lookup(text) from public, anon;
grant execute on function public.founder_code_lookup(text) to authenticated;
comment on function public.founder_code_lookup(text) is
  '[SALLA-PROD-001] بحث دعم: بصمة ما ألصقه العميل ⇒ حالة الصكّ ووسمه — لا نصّ يُعاد ولا يُخزَّن.';

-- ── ٤) عرض الدفعات يحمل حالة التصدير — عمودان مُلحقان، والمفردات القائمة كما هي ──
drop function if exists public.founder_purchase_batches(int);
create or replace function public.founder_purchase_batches(p_limit int default 100)
returns table (
  label                     text,
  codes_issued              bigint,
  codes_redeemed            bigint,
  codes_disabled_unredeemed bigint,
  codes_expired_unredeemed  bigint,
  codes_unredeemed          bigint,
  last_issued_at            timestamptz,
  last_redeemed_at          timestamptz,
  exported_channel          text,
  exported_at               timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select c.label,
           count(*),
           count(*) filter (where c.redemption_count >= c.max_redemptions),
           count(*) filter (where c.redemption_count < c.max_redemptions
                              and not c.enabled),
           count(*) filter (where c.redemption_count < c.max_redemptions
                              and c.enabled
                              and c.expires_at is not null and c.expires_at <= now()),
           count(*) filter (where c.redemption_count < c.max_redemptions
                              and c.enabled
                              and (c.expires_at is null or c.expires_at > now())),
           max(c.created_at),
           (select max(l.redeemed_at)
              from public.code_redemption_ledger l
              join public.access_codes c2 on c2.id = l.code_id
             where c2.grant_purpose = 'purchase'
               and c2.label is not distinct from c.label),
           (select e.channel from public.purchase_batch_exports e where e.label = c.label),
           (select e.exported_at from public.purchase_batch_exports e where e.label = c.label)
      from public.access_codes c
     where c.grant_purpose = 'purchase'
     group by c.label
     order by max(c.created_at) desc
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;
revoke all on function public.founder_purchase_batches(int) from public, anon;
grant execute on function public.founder_purchase_batches(int) to authenticated;
comment on function public.founder_purchase_batches(int) is
  'مخزون صكوك الشراء بالوسم: صادر/مستردّ/معطَّل/منتهٍ/غير مستردّ + حالة التصدير إلى القناة. «غير مستردّ» لا يدّعي مكان الصكّ.';

  $qimmah_mig_20260913120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260913120001', '20260913120001_salla_batch_exports.sql');
end
$qimmah_mig_20260913120001_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '9/9'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  3                                                  as expected,
  case when count(*) filter (where m.version is not null) = 3
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260906120001'), ('20260906120002'), ('20260913120001')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;

-- ═══════════════════════════════════════════════════════════════════════════
-- الحزمة الأخيرة — بذرة الملح ثم التحقّق
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ **بذرة الملح خطوة لا تنشئها أي هجرة — لأنها سرّ.** وبدونها ترفع كل
--    دالّة كتابة `identity_pepper: no active version` عند أول مستخدم حقيقي.
--    ولا تُعاد إن كانت مبذورة: استبدال ملح قائم يُبطل **كل** بصمة مسجَّلة
--    (التجارب والأكواد والمشتريات). و`on conflict do nothing` يضمن ذلك.
insert into private.identity_pepper (version, pepper)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (version) do nothing;

-- ── التحقّق: من الكتالوج الحيّ لا من عدّ الملفات ──────────────────────────
-- عدُّ الملفات يقول «طُبِّق». الكتالوج يقول «يعمل».
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r')                            as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)       as with_rls,
  (select count(*) from pg_policies where schemaname = 'public')               as policies,
  (select count(*) from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and privilege_type in ('INSERT','UPDATE','DELETE'))                      as anon_writes,
  (select count(*) from private.identity_pepper)                               as pepper,
  (select count(*) from information_schema.role_routine_grants
    where grantee = 'authenticated' and routine_schema = 'public'
      and routine_name in ('my_entitlement','start_trial','redeem_access_code_v2',
                           'claim_pending_grants','submit_missing_food','delete_own_account'))
                                                                               as client_rpcs,
  (select count(*) from information_schema.role_routine_grants
    where grantee in ('anon','authenticated') and routine_schema = 'public'
      and routine_name = 'redeem_access_code')                                 as legacy_open,
  (select count(*) from supabase_migrations.schema_migrations)                 as migrations;

-- المتوقَّع: tables = with_rls · policies > 0 · anon_writes = 0 · pepper = 1
--            client_rpcs = 6 · legacy_open = 0 · migrations = 47
