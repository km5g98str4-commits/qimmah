-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 2/8
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
--   · 20260806120002_entitlement_rpcs.sql
--   · 20260806120003_table_privileges_hardening.sql
--   · 20260809120001_revocation_ledger.sql
--   · 20260809120002_code_grant_recovery.sql
--   · 20260809120003_public_execute_hardening.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260806120002_entitlement_rpcs.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260806120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260806120002') then
    raise notice 'تخطٍّ: 20260806120002_entitlement_rpcs.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260806120002$
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

  -- الإلغاء لاصق: لا مسار خدمة ذاتية يرفعه.
  -- كانت الدوال الثلاث تُصفّر `revoked_at` في الـupsert، فكان بوسع مُلغىً أن
  -- يستعيد وصوله ببدء تجربة أو استرداد كود أو مطالبة بشراء — تصعيد صلاحية
  -- كامل. الرفع بيد الإدارة وحدها (`admin_revoke` هو من وضعه).
  if exists (select 1 from public.entitlements e
             where e.user_id = uid and e.revoked_at is not null) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

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

  -- الإلغاء لاصق: لا مسار خدمة ذاتية يرفعه.
  -- كانت الدوال الثلاث تُصفّر `revoked_at` في الـupsert، فكان بوسع مُلغىً أن
  -- يستعيد وصوله ببدء تجربة أو استرداد كود أو مطالبة بشراء — تصعيد صلاحية
  -- كامل. الرفع بيد الإدارة وحدها (`admin_revoke` هو من وضعه).
  if exists (select 1 from public.entitlements e
             where e.user_id = uid and e.revoked_at is not null) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  -- قفل صفّ الكود: مستردّان متزامنان يتسلسلان هنا، والقراءة بعد القفل حديثة.
  -- البحث عبر **كل** إصدارات الملح: كود أُنشئ تحت ملح قديم يبقى قابلًا
  -- للاسترداد بعد الدوران. البحث بالإصدار النشط وحده كان يُعطّل كل كود قائم
  -- لحظة أول دوران — بصمت، وبلا أي رسالة تدلّ على السبب.
  select * into c from public.access_codes ac
   where ac.code_hash in (select ih.email_hash
                          from private.identity_hashes(upper(btrim(p_code))) ih)
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
  -- كود أقصر لا يقصّ منحة سارية أطول: المستخدم لا يُعاقَب على استرداد إضافي.
  if found and cur.revoked_at is null and cur.expires_at is not null
     and cur.expires_at > new_expiry then
    new_expiry := cur.expires_at;
  end if;
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

  -- الإلغاء لاصق: لا مسار خدمة ذاتية يرفعه.
  -- كانت الدوال الثلاث تُصفّر `revoked_at` في الـupsert، فكان بوسع مُلغىً أن
  -- يستعيد وصوله ببدء تجربة أو استرداد كود أو مطالبة بشراء — تصعيد صلاحية
  -- كامل. الرفع بيد الإدارة وحدها (`admin_revoke` هو من وضعه).
  if exists (select 1 from public.entitlements e
             where e.user_id = uid and e.revoked_at is not null) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

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

  $qimmah_mig_20260806120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260806120002', '20260806120002_entitlement_rpcs.sql');
end
$qimmah_mig_20260806120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260806120003_table_privileges_hardening.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260806120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260806120003') then
    raise notice 'تخطٍّ: 20260806120003_table_privileges_hardening.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260806120003$
-- ============================================================================
-- 20260806120003 — تحصين صلاحيات الجداول: أقلّ امتياز بدل المنح الافتراضي
-- ============================================================================
-- هجرة أمنية ضيّقة. **لا تمسّ أي سياسة RLS قائمة، ولا مخطّطًا، ولا بيانات.**
-- تعدّل الصلاحيات على مستوى الجدول (GRANT/REVOKE) وحدها.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- العلّة، مُثبَتة بالتنفيذ (`npm run test:privileges`، المرحلة أ):
--
--   Supabase يمنح `anon` و`authenticated` صلاحيات **كاملة** على جداول `public`
--   افتراضيًا. المستودع فعّل RLS على ٢٣ جدولًا وكتب سياسات مالك سليمة — لكنه
--   لم يسحب شيئًا من ذلك المنح. فبقي على **١٧ جدولًا**:
--       TRUNCATE · REFERENCES · TRIGGER
--
--   و**RLS لا تحرس TRUNCATE إطلاقًا**: هي صلاحية *جدول* لا *صفّ*، ولا سياسة
--   تراها. النتيجة المُقاسة: مستخدم مسجَّل **لا يرى** صفّ غيره (RLS تخفيه)،
--   ثم يمحوه بأمر واحد:
--       truncate public.workout_sessions;   -- قبل=١ صفّ، بعد=٠
--
--   أي أن كل بيانات كل المستخدمين — التمارين والقياسات والتغذية والملفات —
--   كانت قابلة للمحو الكامل من أي حساب.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- المبدأ المطبَّق هنا:
--
--   **لا يُعتمَد على RLS في حراسة عملية ليست على مستوى الصفّ.**
--   RLS تحرس SELECT/INSERT/UPDATE/DELETE صفًّا صفًّا. أمّا TRUNCATE و
--   REFERENCES و TRIGGER فتُحسم بصلاحية الجدول وحدها — فتُسحب صراحةً.
--
--   **`revoke all` ثم منح المطلوب فقط** — لا سحب انتقائي. القائمة الانتقائية
--   تحرس ما عدّدتَه فقط، وتترك ما لم يخطر ببالك (وTRUNCATE هو بالضبط ما لم
--   يخطر). العكس — سحب كل شيء ثم إعادة ما يلزم — يحرس المجهول أيضًا.
--
--   **لا منح جماعي.** ممنوع `grant ... on all tables in schema public`:
--   يعيد المشكلة بصيغة أخرى ويمنح الجداول القادمة بلا قرار. كل جدول يُسمّى،
--   وكل صلاحية مبرَّرة بفئته أدناه.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- الفئات الثلاث ومبرّر كلٍّ:
--
--   ① جداول المزامنة (١٧): العميل يكتب فيها مباشرةً عبر supabase-js، فيحتاج
--      `select, insert, update, delete`. RLS (سياسات المالك الأربع القائمة)
--      هي التي تحصر كل عملية في صفوف صاحبها — ولا تُمسّ هنا.
--
--   ② جداول الوصول المقروءة (٢): `entitlements` و`access_code_redemptions`.
--      `select` فقط؛ كل كتابة تمرّ بدالة SECURITY DEFINER. (حُصّنت أصلًا في
--      20260806120001 — تُذكر هنا لتكتمل المصفوفة ويصير الملف مرجعًا واحدًا.)
--
--   ③ الأكواد والسجلّات الدائمة (٤): لا صلاحية إطلاقًا لأي دور عميل.
--
--   وفي كل الفئات: `anon` **بلا أي صلاحية**. سياسات RLS كلّها `to authenticated`،
--   فالمنح لـanon كان بلا مستفيد أصلًا — ومع ذلك كان يحمل TRUNCATE.
--
--   `service_role` (مفتاح الخادم السرّي) يبقى كما هو: الإدارة والهجرات تحتاجه،
--   ولا يصل متصفّحًا أبدًا.
--
-- forward-only و idempotent: إعادة التشغيل تُقارب نفس الحالة بالضبط.
-- التراجع (إن لزم) = إعادة المنح يدويًا؛ لا تُبنى هنا لأن التراجع عن تحصين
-- أمني يجب أن يكون قرارًا واعيًا لا سطرًا جاهزًا.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- [PROD-DRIFT] الفعل صار **شاملًا للمخطّط** كتأكيده — والسبب عطلٌ مقيس لا تحسين
-- ═══════════════════════════════════════════════════════════════════════════
-- كانت هذه الهجرة تحصّن **قائمة مسمّاة** ثم تؤكّد **على المخطّط كلّه**. وذلك
-- تفاوتٌ بنيويّ: كل جدول خارج القائمة يبقى مكشوفًا، ثم يُسقِط التأكيدُ الهجرةَ
-- نفسها. فهي تفشل حيث تُحتاج بالضبط — على قاعدة فيها جدول لم تعرفه القائمة.
--
-- ولم يكن فرضًا: preflight الإنتاج (٤ سبتمبر ٢٠٢٦) قاس على
-- `ledlypcyrtnzvjvhykwz` ستّة جداول قديمة خارج القائمة —
-- `custom_foods` · `food_logs` · `progress_photos` · `weight_logs` ·
-- `workout_logs` · `workout_sets` — كلٌّ منها يمنح `anon` و`authenticated`
-- ‏`SELECT,INSERT,UPDATE,DELETE,REFERENCES,TRIGGER,TRUNCATE`. فكان التأكيدان
-- يسقطان والهجرةُ تُجهَض. وstaging لم يكشفها لأنه بُني نظيفًا من مجلّد الهجرات
-- وحده — **عطلٌ يعيش في الفرق بين البيئتين**، وهو ما وُجد الـpreflight له.
--
-- ═══ الثابت المطلوب — يُنفَّذ لا يُدَّعى ═══
--   ① `anon` لا يملك **شيئًا** على أي جدول في `public`. بلا استثناء.
--   ② `authenticated` لا يملك إلا ما تمنحه القائمة المسمّاة أدناه صراحةً.
--   ③ **الجدول المجهول يسقط إلى الصفر** — لا إلى ما ورثه من المنصّة. فالافتراض
--      «مغلق» لا «مفتوح»، والقائمة تمنح ولا تحرس.
--   ④ `service_role` (مفتاح الخادم) **لا يُمسّ**: السحب يسمّي دورَي العميل
--      وحدهما، فالإدارة والهجرات تبقى عاملة.
--
-- ولماذا لا استثناء للجداول الستّة: لا صفّ فيها (٠ مقيسًا)، ولا مستهلك لها في
-- الكود (أثرها الوحيد تعليق TODO وسطر وثيقة)، فلا سلطة عميل تُبرَّر لها. وأي
-- استثناء هنا كان سيُبقي `TRUNCATE` لـ`anon` على ستّة جداول **ليخضرّ فحص** —
-- وهو عين ما تمنعه هذه الهجرة. تُترك بيانات الجداول وبنيتها وRLS كما هي؛
-- **المسحوب صلاحيةُ العميل وحدها** (قرار المؤسس: لا حذف في هذا الإصدار).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  -- ① المزامنة: CRUD كامل، وRLS تحصره في صفوف المالك.
  sync_tables text[] := array[
    'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
    'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
    'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
    'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates'
  ];
  -- ② الوصول المقروء: SELECT فقط.
  read_only_tables text[] := array['entitlements', 'access_code_redemptions'];
  -- ③ غير مرئية لأي عميل — تُذكر توثيقًا، وحجبها من السحب الشامل لا منها.
  invisible_tables text[] := array[
    'access_codes', 'trial_ledger', 'purchase_ledger', 'code_redemption_ledger'
  ];
begin
  -- ═══ عقد الوجود: قائمةٌ تسمّي جدولًا غائبًا خطأُ عقدٍ لا حالةَ قاعدة ═══
  foreach t in array sync_tables || read_only_tables || invisible_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      raise exception 'hardening: expected table public.% is missing', t;
    end if;
  end loop;

  -- ═══ ① السحب **الشامل**: كل جدول أساسي في `public`، معروفًا كان أو مجهولًا ═══
  -- هنا صار الفعل بحجم التأكيد. الجدول الذي لم يخطر ببال أحد يفقد كل صلاحية
  -- عميل — فلا يبقى مكشوفًا ولا يُسقِط الهجرة.
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname
  loop
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;

  -- ═══ ② ثم يُعاد المطلوب وحده — والقائمة تمنح فقط، ولا تحرس ═══
  foreach t in array sync_tables loop
    -- لا TRUNCATE ولا REFERENCES ولا TRIGGER — CRUD صرفًا، وRLS تحصره بالصفّ.
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;

  foreach t in array read_only_tables loop
    execute format('grant select on public.%I to authenticated;', t);
  end loop;

  -- ③ لا سطر لـ`invisible_tables`: صفرُها ناتجُ السحب الشامل لا منحةٌ مضادّة.
  --    و`anon` لا يُمنح في أي فرع أعلاه — إطلاقًا.
end;
$$;

-- ── الحارس: كل جدول قادم يجب أن يُصنَّف، لا أن يُمنح بالوراثة ───────────────
-- الامتيازات الافتراضية للمخطّط هي منبع الثغرة: كل جدول جديد كان يُمنح كاملًا
-- لأدوار العميل تلقائيًا. تُلغى هنا، فيصير المنح قرارًا صريحًا لا وراثة صامتة.
-- (لا أثر رجعيًا على الجداول القائمة — لذلك سُحبت أعلاه واحدًا واحدًا.)
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ونفس الوراثة قائمة على **الدوال**: كل دالة جديدة في `public` كانت تُمنح
-- EXECUTE لـanon و authenticated تلقائيًا. أُثبت بالتنفيذ: دالة أُنشئت بعد
-- تحصين الجداول جاءت مفتوحة للدورين. الخطر ليس نظريًا — دالة `security definer`
-- إدارية تُضاف يومًا بلا `revoke` صريح تصير قابلة للنداء من زائر غير مسجَّل،
-- وهي بعينها آلية التصعيد التي يغلقها هذا الملف على مستوى الجداول.
-- بعد هذا السطر يصير كشف أي دالة قرارًا صريحًا (fail-closed): الدوال الأربع
-- المخصّصة للعميل مُنِحت صراحةً في 20260806120002، وما عداها مغلق.
-- (لا أثر رجعيًا: الدوال القائمة تحتفظ بمنحها المادّي.)
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ── تحقّق ذاتي: الهجرة تفشل صاخبةً إن بقي أثر للثغرة ───────────────────────
-- لا تكتفي بالتنفيذ بل تتحقّق من أثرها. بقاء صلاحية محظورة واحدة يوقف الهجرة
-- بدل أن يمرّ التحصين ناقصًا ويُظنّ تامًّا.
-- الفحص بقائمة **مسموح** لا بقائمة ممنوع: أي صلاحية خارج CRUD توقف الهجرة.
-- قائمة الممنوع تحرس ما عدّدتَه فقط — وهي بعينها العادة التي أنتجت الثغرة.
-- والمقلوبة تلتقط أيضًا ما لم يُخترَع بعد (مثل MAINTAIN في إصدارات أحدث).
do $$
declare leftover text;
begin
  select string_agg(format('%s.%s=%s', table_name, grantee, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee in ('anon', 'authenticated')
     and privilege_type not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if leftover is not null then
    raise exception 'hardening incomplete — client roles still hold: %', leftover;
  end if;

  -- وanon لا يملك شيئًا إطلاقًا، ولو من فئة CRUD.
  select string_agg(format('%s=%s', table_name, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon';
  if leftover is not null then
    raise exception 'hardening incomplete — anon still holds: %', leftover;
  end if;

  -- ═══ [PROD-DRIFT] الثابت موجبًا: كل جدول **خارج** القائمة يساوي صفرًا ═══
  -- التأكيدان أعلاه ينفيان (لا صلاحية محظورة · لا anon). وهذا يُثبت الوجه
  -- الموجب: أن الجدول الذي لا تعرفه القائمة **سقط إلى الصفر فعلًا** ولم يبقَ
  -- على وراثته. بدونه يمرّ CRUD موروثٌ لـ`authenticated` على جدولٍ مجهول
  -- صامتًا — فهو ينفي نجاحًا غير مستحقّ لا يلتقطه النفيان (§4.2).
  select string_agg(format('%s=%s', table_name, privilege_type), ', ')
    into leftover
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee = 'authenticated'
     and table_name not in (
       'profiles', 'workout_sessions', 'exercise_history', 'measurement_logs',
       'daily_logs', 'nutrition_logs', 'water_logs', 'supplement_logs',
       'medication_logs', 'step_logs', 'achievements', 'custom_plans', 'todos',
       'nutrition_ledger', 'recovery_logs', 'workout_schedule', 'plan_templates',
       'entitlements', 'access_code_redemptions'
     );
  if leftover is not null then
    raise exception 'hardening incomplete — unlisted table still grants authenticated: %', leftover;
  end if;
end;
$$;

  $qimmah_mig_20260806120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260806120003', '20260806120003_table_privileges_hardening.sql');
end
$qimmah_mig_20260806120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260809120001_revocation_ledger.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260809120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260809120001') then
    raise notice 'تخطٍّ: 20260809120001_revocation_ledger.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260809120001$
-- ============================================================================
-- 20260809120001 — P2: عقد الإلغاء الدائم — الحظر ينجو من حذف الحساب
-- ============================================================================
-- تكملة 20260806120001/2. تسدّ ثغرة أثبتتها مراجعة التقارب:
--
--   **الإلغاء كان يعيش في صفّ المستخدم وحده.** `admin_revoke` يضع `revoked_at`
--   على `public.entitlements` — وهو جدول فيه `user_id`، أي أن
--   `delete_own_account()` يمحوه مع الحساب. فكان مسار الالتفاف كاملًا:
--       إلغاء ← حذف الحساب ← إعادة التسجيل بنفس البريد ← claim_pending_grants()
--       ← **عودة Premium كاملة والحظر تبخّر.**
--
-- الإصلاح على نمط السجلّات الدائمة نفسه (§٢-د/هـ/و في هجرة النواة):
--
--   ① `revocation_ledger` — سجلّ دائم **بلا user_id** مُبصَم بالهوية المُملَّحة.
--      ينجو من حذف الحساب كما ينجو سجلّا التجربة والشراء.
--   ② الإلغاء **تاريخ لا حالة تُمحى**: كل إلغاء صفّ جديد، والرفع وسم
--      `lifted_at` على الصفّ لا حذفه — الأثر الإداري كامل في الاتجاهين.
--   ③ فحص الإلغاء في **كل** مسار خدمة ذاتية يمسح السجلّ الدائم عبر كل
--      إصدارات الملح، لا صفّ المستخدم وحده.
--   ④ الرفع بيد الإدارة حصرًا: `admin_unrevoke` (service_role) هو المسار
--      الوحيد — يكمل العقد الذي بدأه «الإلغاء لاصق».
--
-- حدود العقد — مسمّاة لا مسكوتًا عنها:
--   • الحظر يطارد **الهوية المُبصَمة** (البريد)، لا الشخص. بريد جديد كليًا =
--     هوية جديدة — وهذا حدّ بنيوي معلَن، نفسه حدّ سجلّ التجربة (§11/4 في
--     وثيقة المعمارية: غير قابل للإغلاق الكامل بلا توثيق هوية/دفع).
--   • تحديد معدّل المحاولات (rate limiting) على `redeem_access_code` **خارج
--     قدرة PostgreSQL وحدها**: الدالة لا ترى عنوان IP، وطبقة PostgREST هي
--     الموضع الصحيح. **عائق خارجي معلَن** في وثيقة المعمارية — ولا يُخترع هنا
--     محدِّد وهمي يوحي بحماية غير قائمة.
--
-- idempotent بالكامل، على نمط الهجرات السابقة.
-- ============================================================================

-- ── ١) السجلّ الدائم ────────────────────────────────────────────────────────
create table if not exists public.revocation_ledger (
  id               uuid primary key default gen_random_uuid(),
  email_hash       text not null,
  hash_version     int  not null,
  revoked_at       timestamptz not null default now(),
  revoked_by       text not null,
  revoked_reason   text not null,
  -- الرفع وسم لا حذف: التاريخ الإداري يبقى كاملًا.
  lifted_at        timestamptz,
  lifted_by        text,
  lifted_reason    text,
  retention_policy text not null default 'anti_abuse_ban',
  -- NULL عمدًا كسجلّ الشراء: الحظر يبقى حتى يُرفَع إداريًا؛ لا مؤقّت يُسقطه.
  retain_until     timestamptz,
  -- صفّ مرفوع يحمل من رفعه وسببه — لا رفع مجهول.
  constraint revocation_lift_shape
    check ((lifted_at is null) = (lifted_by is null) and (lifted_at is null) = (lifted_reason is null))
);
-- الفحص الساخن الوحيد: «هل لهذه الهوية حظر نشط؟» — فهرس جزئي على النشط فقط.
create index if not exists revocation_ledger_active_idx
  on public.revocation_ledger (email_hash) where lifted_at is null;

comment on table public.revocation_ledger is
  'حظر دائم بالهوية المُبصَمة — بلا user_id عمدًا كي ينجو من delete_own_account(). الرفع وسم لا حذف.';

-- نفس حزامَي النواة: RLS بصفر سياسات + REVOKE صريح. الهجرة السابقة
-- (20260806120003) قطعت الوراثة الافتراضية، لكن هذا الملف لا يفترضها —
-- يسحب صراحةً فيصمد وحده حتى في بيئة لم تشغّل التحصين.
alter table public.revocation_ledger enable row level security;
revoke all on public.revocation_ledger from public, anon, authenticated;

-- ── ٢) الفحص المركزي — مصدر واحد لقرار «محظور» ─────────────────────────────
/**
 * حظر نشط للهوية عبر كل إصدارات الملح، أو صفّ منحة مُلغى للمستخدم نفسه.
 * مصدر القرار الوحيد لكل مسارات الخدمة الذاتية — لا نسخ متفرّقة تتباعد.
 */
create or replace function private.is_access_revoked(p_uid uuid, p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (select 1 from public.entitlements e
                 where e.user_id = p_uid and e.revoked_at is not null)
      or exists (select 1 from private.identity_hashes(p_email) ih
                 join public.revocation_ledger r
                   on r.email_hash = ih.email_hash and r.lifted_at is null);
end;
$$;

-- ── ٣) الإلغاء يكتب السجلّ الدائم ──────────────────────────────────────────
create or replace function public.admin_revoke(p_user_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  em  text;
  ver int;
begin
  select u.email into em from auth.users u where u.id = p_user_id;
  if em is null then raise exception 'no_such_user' using errcode = 'P0002'; end if;

  ver := private.active_pepper_version();

  -- ① الأثر الدائم أولًا — هو ما ينجو من حذف الحساب.
  insert into public.revocation_ledger (email_hash, hash_version, revoked_by, revoked_reason)
  values (private.hash_identity(em, ver), ver, 'service_role', p_reason);

  -- ② صفّ المستخدم: يُوسَم إن وُجد، ويُنشأ موسومًا إن لم يوجد — مستخدم بلا
  --    منحة يظلّ قابلًا للحظر (كان `no_entitlement` يمنع حظره أصلًا).
  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   revoked_at, revoked_reason)
  values (p_user_id, em, 'none', 'none', now(), p_reason)
  on conflict (user_id) do update
    set revoked_at = now(), revoked_reason = p_reason;

  return 'revoked';
end;
$$;

-- ── ٤) الرفع — إداري حصرًا، وسم لا حذف ─────────────────────────────────────
create or replace function public.admin_unrevoke(p_user_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text;
  n  int;
begin
  select u.email into em from auth.users u where u.id = p_user_id;
  if em is null then raise exception 'no_such_user' using errcode = 'P0002'; end if;

  update public.revocation_ledger r
     set lifted_at = now(), lifted_by = 'service_role', lifted_reason = p_reason
   where r.lifted_at is null
     and r.email_hash in (select ih.email_hash from private.identity_hashes(em) ih);
  get diagnostics n = row_count;

  -- شرط `revoked_at is not null` مقصود: بدونه كان صفّ منحة غير محظور يُطابَق
  -- فيعود `unrevoked` نجاحًا صامتًا لمن لم يُحظر قط — والخطأ المسمّى أصدق.
  update public.entitlements
     set revoked_at = null, revoked_reason = null
   where user_id = p_user_id and revoked_at is not null;

  if n = 0 and not found then
    raise exception 'not_revoked' using errcode = 'P0002';
  end if;
  return 'unrevoked';
end;
$$;

-- ── ٥) مسارات الخدمة الذاتية تفحص السجلّ الدائم ────────────────────────────
-- إعادة تعريف كاملة (create or replace) — الفارق الوحيد عن 20260806120002 هو
-- استبدال فحص الصفّ المحلي بـ`private.is_access_revoked` الذي يمسح السجلّ
-- الدائم أيضًا. المنطق الباقي حرفيًا كما كان.

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
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;

  -- الإلغاء لاصق **وينجو من حذف الحساب**: الفحص يمسح السجلّ الدائم عبر كل
  -- إصدارات الملح — حذف الحساب وإعادة التسجيل لا يرفعان الحظر.
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  if exists (
    select 1 from private.identity_hashes(em) ih
    join public.trial_ledger t on t.email_hash = ih.email_hash
  ) then
    raise exception 'trial_already_used' using errcode = '23505';
  end if;

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

  -- الإلغاء لاصق **وينجو من حذف الحساب** — انظر start_trial.
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  select * into c from public.access_codes ac
   where ac.code_hash in (select ih.email_hash
                          from private.identity_hashes(upper(btrim(p_code))) ih)
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
  if found and cur.revoked_at is null and cur.expires_at is not null
     and cur.expires_at > new_expiry then
    new_expiry := cur.expires_at;
  end if;
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

-- my_entitlement: هوية محظورة في السجلّ الدائم تُعرَض `revoked` صراحةً حتى
-- بلا صفّ منحة — الصدق قبل الطمأنينة: `noAccess` كانت تخفي السبب الحقيقي.
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
declare
  uid uuid := auth.uid();
  em  text;
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
    select u.email into em from auth.users u where u.id = uid;
    if em is not null and private.is_access_revoked(uid, em) then
      return query select 'revoked'::text, 'none'::text, 'none'::text,
                          null::timestamptz, null::timestamptz, false, now();
    else
      return query select 'noAccess'::text, 'none'::text, 'none'::text,
                          null::timestamptz, null::timestamptz, false, now();
    end if;
  end if;
end;
$$;

-- ── ٦) الصلاحيات ───────────────────────────────────────────────────────────
-- `create or replace` يحفظ صلاحيات الدوال المعادة تعريفها؛ الجديدتان تُحسمان:
revoke all on function public.admin_unrevoke(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_unrevoke(uuid,text) to service_role;
revoke all on function private.is_access_revoked(uuid,text) from public, anon, authenticated;

  $qimmah_mig_20260809120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260809120001', '20260809120001_revocation_ledger.sql');
end
$qimmah_mig_20260809120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260809120002_code_grant_recovery.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260809120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260809120002') then
    raise notice 'تخطٍّ: 20260809120002_code_grant_recovery.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260809120002$
-- ============================================================================
-- 20260809120002 — P2: استرجاع منح الأكواد — code_redemption_ledger يعمل بالاتجاهين
-- ============================================================================
-- تكملة 20260809120001. تسدّ الفجوة الثانية من مراجعة التقارب:
--
--   **الاسترجاع كان للشراء وحده.** `claim_pending_grants()` تفحص
--   `purchase_ledger` فتعيد Premium بعد حذف الحساب — لكن `code_redemption_ledger`
--   كان يُستخدم **للمنع فقط** (لا استرداد ثانٍ لنفس الكود) لا للاسترجاع. فمن
--   استردّ كود ٩٠ يومًا وحذف حسابه في اليوم الخامس فقد الـ٨٥ الباقية بلا مسار
--   عودة — والسجلّ الذي يمنعه من الاسترداد مجددًا هو نفسه الذي يثبت حقّه.
--
-- سياسة الاسترجاع — أهلية المنحة، مسمّاة بندًا بندًا:
--
--   تُسترجَع منحة كود **إذا اجتمعت** الشروط الأربعة:
--     ① صفّ في `code_redemption_ledger` يطابق هوية المستخدم (عبر **كل**
--        إصدارات الملح) — إثبات استرداد شرعي سابق.
--     ② نافذة المنحة الأصلية ما زالت سارية:
--        `redeemed_at + duration_days > now()`. **منحة منتهية لا تُسترجَع.**
--     ③ الكود ما زال `enabled`. تعطيل الكود إبطال إداري — **كود مُبطَل لا
--        يُسترجَع** (مفتاح الطوارئ الوحيد للإدارة على منح كود مسرَّب).
--     ④ الهوية غير محظورة — `access_revoked` يسبق كل شيء (الهجرة السابقة).
--
--   وثلاثة قرارات صريحة لا سهوًا:
--     • **استنفاد الكود لا يُسقط الاسترجاع.** صفّ السجلّ *هو* الحصّة المستهلَكة
--       — الاسترجاع لا يستهلك حصّة جديدة ولا يلمس `redemption_count`. ولولا
--       هذا لصار كل كود فردي (`max_redemptions=1` الافتراضي) غير قابل
--       للاسترجاع أبدًا: استرداده بعينه هو ما يستنفده. أمّا **محاولة استرداد
--       جديدة** لكود مستنفَد فتبقى مرفوضة `invalid_code` كما كانت.
--     • **الاسترجاع يعيد المنحة الأصلية ولا يجدّدها**: `activated_at` يبقى
--       وقت الاسترداد الأصلي و`expires_at` نهايته الأصلية — حذف الحساب ليس
--       زرّ تمديد.
--     • **التجربة لا تُسترجَع عمدًا**: حذف الحساب يُنهي ما تبقّى منها،
--       و`trial_ledger` يُبقيها مرّة واحدة. سلوك قائم يُوثَّق لا يُغيَّر.
--
--   الأسبقية كما هي: شراء Premium أولًا، ثم أفضل منحة كود سارية (الأبعد
--   انتهاءً)، ولا تخفيض لمنحة قائمة أعلى أو أطول.
--
-- idempotent بالكامل (create or replace وحدها).
-- ============================================================================

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
  rec record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  -- ④ الإلغاء لاصق وينجو من حذف الحساب (20260809120001).
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  -- شراء مسجَّل تحت أي إصدار ملح ⇒ Premium — الأسبقية العليا، كما كان.
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

  -- منح الأكواد: أفضل منحة **مؤهَّلة** (الشروط ①–③ أعلاه)، الأبعد انتهاءً.
  select l.code_id,
         l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled                                                       -- ③
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()  -- ②
   order by original_expiry desc
   limit 1;

  select * into cur from public.entitlements where user_id = uid;

  if rec.code_id is not null then
    -- لا تخفيض: منحة قائمة أعلى رتبةً أو أطول أمدًا تبقى هي المعروضة.
    if found and cur.revoked_at is null
       and (private.grant_rank(cur.entitlement_type) > 2
            or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
            or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;

    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code',
          activation_code_id = rec.code_id, activated_at = rec.redeemed_at,
          expires_at = rec.original_expiry, no_expiry = false,
          revoked_at = null, revoked_reason = null;

    -- استرجاع صفّ الاسترداد المنسوب أيضًا — كي يرى المستخدم استرداده عبر
    -- سياسة `select_own` القائمة. لا يلمس `redemption_count`: الحصّة استُهلكت
    -- عند الاسترداد الأصلي وصفّ السجلّ الدائم شاهدها.
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

  $qimmah_mig_20260809120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260809120002', '20260809120002_code_grant_recovery.sql');
end
$qimmah_mig_20260809120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260809120003_public_execute_hardening.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260809120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260809120003') then
    raise notice 'تخطٍّ: 20260809120003_public_execute_hardening.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260809120003$
-- ============================================================================
-- 20260809120003 — إغلاق EXECUTE عبر PUBLIC: الموجود يُكنَس والقادم لا يرث
-- ============================================================================
-- تكملة 20260806120003 التي قطعت وراثة أدوار العميل (anon/authenticated) عن
-- الجداول والدوال — لكنها لم تمسّ **PUBLIC**، وهو دور آخر مختلف:
--
--   Postgres يمنح كل دالة جديدة `EXECUTE` لـPUBLIC **بافتراض مدمج في النواة**،
--   لا عبر default privileges قابلة للفحص. وPUBLIC يشمل كل الأدوار — بما فيها
--   anon وauthenticated وكل دور يُخترع لاحقًا. فـ`revoke from anon, authenticated`
--   وحده لا يغلق شيئًا ما دام PUBLIC مفتوحًا، ودالة SECURITY DEFINER إدارية
--   تُضاف يومًا بلا revoke صريح تولد قابلة للنداء من **أي** دور.
--
-- دوال الوصول القائمة سليمة أصلًا (كل revoke فيها يسمّي public صراحةً — أُثبت
-- جردًا قبل هذه الهجرة، فلا يُعاد كتابتها §2). المكشوف المتبقّي كان:
--   • دوال الـtrigger (set_updated_at · set_updated_at_lww · handle_new_user ·
--     entitlements_touch_updated_at) — غير قابلة للنداء المباشر أصلًا
--     («trigger functions can only be called as triggers»)، لكن أقلّ امتياز
--     لا يتّكل على هذا القيد وحده.
--   • **الافتراضي المدمج نفسه** — الثغرة الحقيقية: كل دالة قادمة ترث PUBLIC.
--
-- ملاحظة أمان على الكنس: سحب PUBLIC لا يمسّ المنح الاسمية (authenticated على
-- دوال الخدمة الذاتية، service_role على الإدارة) — تلك صفوف ACL مستقلّة.
-- وإطلاق الـtriggers لا يتأثر: صلاحية EXECUTE تُفحص عند create trigger لا عند
-- كل تنفيذ DML — ويثبتها سلوكيًا مرور فحوص اللمس والمزامنة في test:privileges.
--
-- forward-only و idempotent بالكامل.
-- ============================================================================

-- ── ١) القادم لا يرث: قطع الافتراضي المدمج ─────────────────────────────────
-- **الصيغة العامة بلا `in schema` مقصودة ومُلزِمة**: افتراضيات المخطّط تُضاف
-- فوق العامة ولا تنقص منها، فصيغة `in schema ... revoke` لا تنزع الافتراضي
-- المدمج شيئًا — أُثبت بالتنفيذ: الدالة التجريبية بقيت مكشوفة لـPUBLIC تحتها.
-- العامة وحدها تنزعه، وتسري على كل دالة يُنشئها دور الهجرات في أي مخطّط.
alter default privileges revoke all on functions from public;

-- ── ٢) كنس الموجود: كل دالة في public/private تفقد منحة PUBLIC ─────────────
-- ديناميكي كدالة الحذف (20260713120007): ما يوجد اليوم أو أضيف قبل إعادة
-- التشغيل يُكنَس كله — لا قائمة أسماء تشيخ.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  loop
    execute format('revoke all on function %s from public;', r.sig);
  end loop;
end;
$$;

-- ── ٣) تحقّق ذاتي: الهجرة تفشل صاخبةً إن بقي منفذ ──────────────────────────
-- proacl الفارغ يعني «الافتراضي المدمج» أي PUBLIC EXECUTE — لذلك يُفكّ
-- بـacldefault لا يُعامَل نظيفًا. وبقاء منحة واحدة يوقف الهجرة باسم الدالة.
do $$
declare leftover text;
begin
  select string_agg(fn, ', ') into leftover from (
    select n.nspname||'.'||p.proname as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace,
    lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where n.nspname in ('public', 'private')
      and a.grantee = 0  -- grantee 0 = PUBLIC
      and a.privilege_type = 'EXECUTE'
  ) x;
  if leftover is not null then
    raise exception 'public-execute hardening incomplete — PUBLIC can still execute: %', leftover;
  end if;
end;
$$;

  $qimmah_mig_20260809120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260809120003', '20260809120003_public_execute_hardening.sql');
end
$qimmah_mig_20260809120003_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '2/8'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  5                                                  as expected,
  case when count(*) filter (where m.version is not null) = 5
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260806120002'), ('20260806120003'), ('20260809120001'), ('20260809120002'), ('20260809120003')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;
