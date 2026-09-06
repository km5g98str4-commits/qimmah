-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 7/9
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (6):
--   · 20260826120003_founder_user_detail_history.sql
--   · 20260826120004_founder_pending_orders.sql
--   · 20260827120001_trial_ledger_canonical_race_guard.sql
--   · 20260827120002_canonical_identity_trailing_dot.sql
--   · 20260827120003_advisor_staging_reconciliation.sql
--   · 20260827120004_gateway_stamp_enforcement.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260826120003_founder_user_detail_history.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260826120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260826120003') then
    raise notice 'تخطٍّ: 20260826120003_founder_user_detail_history.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260826120003$
-- ============================================================================
-- [ADMIN-CONV] اكتمال صفحة الحساب — سجلّ الأكواد وبلاغات الطعام
-- ============================================================================
-- صفحة الحساب تجيب «هل استحقاقه صحيح؟» بعدّادات: `codesRedeemed = 2` رقمٌ بلا
-- أسماء — أيّ كودين؟ من أيّ حملة؟ ومتى؟ فسؤال دعم واقعي («استخدمت كود رمضان
-- وما فُتح لي») لا يُجاب منها. وكذلك بلاغات الطعام: المستخدم يسأل «وش صار على
-- بلاغي؟» ولا شيء في صفحته يريه.
--
-- ═══ حدود ما يُضاف — بنفس عقد الشاشة ═══
--   • **سجلّ الأكواد**: وسم الحملة وتاريخ الاستهلاك والمدّة فقط. لا بصمة ولا
--     كود خام (لا يوجد خام أصلًا) ولا أثر إداري.
--   • **بلاغات الطعام**: المعرّف والحالة واسم المنتج والتاريخ فقط — **لا حقول
--     `evidence_*`**: أرقام المستخدم دليلٌ يعيش في طابور المراجعة لا في صفحة
--     الحساب، ونقلها هنا يجعلها تُقرأ ملفًّا غذائيًّا شخصيًّا وهي ليست كذلك.
--   • وكتل المنتج (تمارين · تغذية · قياسات) تبقى خارج الصفحة كما كانت —
--     الإضافة لا تلمس حدّ الموافقة بحرف.
--
-- ═══ لماذا الجسد منسوخ كاملًا لا مرقوعًا ═══
-- عقد `test:migration-order`: جسمُ الدالّة الحيّة يطابق **آخر ملفٍ يعرّفها
-- نصًّا**. ⇐ منقولة حرفيًّا من `20260824120002_founder_operations_reads.sql`،
-- والزيادتان الوحيدتان: `commerce.codeHistory` و`foodSubmissions`.
-- ============================================================================

create or replace function public.founder_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  out_json jsonb;
  acct     record;
  ent      record;
  redeemed bigint;
  bought   bigint;
  last_ord record;
  banned   boolean;
  code_history jsonb;
  food_reports jsonb;
begin
  perform private.require_admin();

  if p_user_id is null then
    raise exception 'founder_user_detail: user id required' using errcode = '22023';
  end if;

  select u.id,
         u.email                                  as mail,
         u.email_confirmed_at is not null          as verified,
         u.last_sign_in_at                         as seen_at,
         coalesce(p.created_at, u.created_at)      as made_at,
         p.display_name                            as name,
         (p.data #>> '{_meta,completed}')          as done_flag
    into acct
    from auth.users u
    left join public.profiles p on p.user_id = u.id
   where u.id = p_user_id;

  if not found then
    raise exception 'founder_user_detail: no such account' using errcode = 'P0002';
  end if;

  select e.entitlement_type, e.source, e.activated_at, e.expires_at,
         e.no_expiry, e.revoked_at, e.revoked_reason
    into ent
    from public.entitlements e
   where e.user_id = p_user_id;

  -- سجلّات التجارة مفتاحها بصمة الهوية لا المعرّف — لا `user_id` فيها عمدًا.
  select count(*) into redeemed
    from public.code_redemption_ledger l
   where acct.mail is not null
     and l.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih);

  select count(*) into bought
    from public.purchase_ledger pl
   where acct.mail is not null
     and pl.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih);

  select pl.provider_order_id, pl.granted_at
    into last_ord
    from public.purchase_ledger pl
   where acct.mail is not null
     and pl.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
   order by pl.granted_at desc
   limit 1;

  select exists (
    select 1 from public.revocation_ledger r
     where acct.mail is not null
       and r.lifted_at is null
       and r.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
  ) into banned;

  -- [ADMIN-CONV] العدّاد يصير أسماءً: أيّ حملة ومتى وبأيّ مدّة. المصفوفة
  -- الفارغة **جواب مقيس** («ما استبدل شيئًا») لا غياب — الخادم عدّ ولم يجد.
  select coalesce(jsonb_agg(jsonb_build_object(
           'label',         c.label,
           'redeemed_at',   l.redeemed_at,
           'duration_days', c.duration_days
         ) order by l.redeemed_at desc), '[]'::jsonb)
    into code_history
    from (
      select l0.code_id, l0.redeemed_at
        from public.code_redemption_ledger l0
       where acct.mail is not null
         and l0.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
       order by l0.redeemed_at desc
       limit 50
    ) l
    join public.access_codes c on c.id = l.code_id;

  -- [ADMIN-CONV] بلاغات الطعام: **الحقول الأربعة وحدها** — لا evidence_* هنا.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           f.id,
           'status',       f.status,
           'product_name', f.product_name,
           'submitted_at', f.submitted_at
         ) order by f.submitted_at desc), '[]'::jsonb)
    into food_reports
    from (
      select f0.id, f0.status, f0.product_name, f0.submitted_at
        from public.food_submissions f0
       where f0.submitted_by = p_user_id
       order by f0.submitted_at desc
       limit 50
    ) f;

  out_json := jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),

    'account', jsonb_build_object(
      'user_id',         acct.id,
      'display_name',    acct.name,
      -- التقنيع في SQL: القيمة الكاملة لا تدخل حمولة الشبكة أصلًا.
      'email_masked',    case
                           when acct.mail is null or position('@' in acct.mail) = 0 then null
                           else left(acct.mail, 1) || '••••@' || split_part(acct.mail, '@', 2)
                         end,
      'email_verified',  acct.verified,
      'created_at',      acct.made_at,
      'last_sign_in_at', acct.seen_at
    ),

    'entitlement', jsonb_build_object(
      -- الحالة تُشتقّ بوقت القاعدة، ولا تُقرأ من عمود مخزَّن قد يشيخ.
      'state',          coalesce(
                          private.derive_state(ent.entitlement_type, ent.no_expiry,
                                               ent.expires_at, ent.revoked_at),
                          'noAccess'),
      'source',         ent.source,
      'activated_at',   ent.activated_at,
      'expires_at',     ent.expires_at,
      'revoked_at',     ent.revoked_at,
      'revoked_reason', ent.revoked_reason
    ),

    -- الجهل ليس نفيًا: بلا علامة إكمال الجواب `unknown` لا `incomplete`.
    'onboarding', case when acct.done_flag is not null then 'complete' else 'unknown' end,

    'commerce', jsonb_build_object(
      'codesRedeemed',  redeemed,
      'purchases',      bought,
      'lastOrderId',    last_ord.provider_order_id,
      'lastPurchaseAt', last_ord.granted_at,
      'accessRevoked',  banned,
      'codeHistory',    code_history
    ),

    'foodSubmissions', food_reports
  );

  return out_json;
end;
$$;

-- الصلاحيات تُعاد **صراحةً** مع كل إعادة تعريف (عرف 20260822120003): البيان
-- المكرّر أرخص من افتراض غير مفحوص عن قاعدةٍ لم تُطبَّق عليها السوابق بترتيبها.
revoke all on function public.founder_user_detail(uuid) from public, anon;
grant execute on function public.founder_user_detail(uuid) to authenticated;

  $qimmah_mig_20260826120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260826120003', '20260826120003_founder_user_detail_history.sql');
end
$qimmah_mig_20260826120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260826120004_founder_pending_orders.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260826120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260826120004') then
    raise notice 'تخطٍّ: 20260826120004_founder_pending_orders.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260826120004$
-- ============================================================================
-- [ADMIN-CONV] الطلبات المعلّقة — النصف الثاني من طابور التسليم
-- ============================================================================
-- `founder_failed_orders` أجابت «ما الذي فشل؟»، وبقي «ما الذي **علِق**؟» بلا
-- قائمة: حدثٌ وصل (`received`) أو تحقّق توقيعه (`verified`) ثم لم يبلغ
-- `processed` — وهو أخطر تشغيليًّا من الفاشل، لأن الفاشل أعلن نفسه والمعلّق
-- صامت. عدّاده موجود في اللقطة (`webhookPending`)، ورقمٌ بلا أسماء غير قابل
-- للفعل: من «معلّقان» لا طريق إلى العميلين.
--
-- نفس عقد `founder_failed_orders` حرفيًّا — نفس الأعمدة ونفس التقنيع
-- (ثمانية رموز من التجزئة، لا بريد) — والفرق الوحيد شرط التصنيف.
-- ============================================================================

create or replace function public.founder_pending_orders(p_limit int default 50)
returns table (
  provider_order_id text,
  classification    text,
  reason            text,
  received_at       timestamptz,
  amount_minor      int,
  currency          text,
  identity_ref      text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select s.provider_order_id,
           s.classification,
           s.reason,
           s.received_at,
           s.amount_minor,
           s.currency,
           -- مرجع هوية لا هوية: ثمانية رموز من التجزئة تكفي للمطابقة مع
           -- سجلّ الشراء، ولا تُعيد بناء بريد أحد.
           case when s.email_hash is null then null else left(s.email_hash, 8) end
      from public.salla_webhook_events s
     where s.classification in ('received', 'verified')
     order by s.received_at desc
     limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke all on function public.founder_pending_orders(int) from public, anon;
grant execute on function public.founder_pending_orders(int) to authenticated;

comment on function public.founder_pending_orders(int) is
  'أحداث سلة العالقة قبل المعالجة — أسماء لا عدد. هوية مُقنَّعة بمرجع تجزئة.';

  $qimmah_mig_20260826120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260826120004', '20260826120004_founder_pending_orders.sql');
end
$qimmah_mig_20260826120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260827120001_trial_ledger_canonical_race_guard.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260827120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260827120001') then
    raise notice 'تخطٍّ: 20260827120001_trial_ledger_canonical_race_guard.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260827120001$
-- ═══════════════════════════════════════════════════════════════════════════
-- [RED-TEAM] سدّ سباق TOCTOU في حارس البصمة القانونية للتجربة (F-4)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ═══ الثقب مقيسٌ لا مُتوهَّم ═══
-- `start_trial` (منذ 20260824120004) يمنع مزرعة التجارب بالأسماء المستعارة
-- عبر فحصٍ **غير قافلٍ**:  `exists (select 1 from trial_ledger where
-- canonical_hash = ...)`. والعمود `canonical_hash` **بلا قيد فرادة**، فالفحص
-- شرطٌ يُقرأ لا قفلٌ يُمسك.
--
-- على عنقود Postgres حقيقي متعدّد الاتصالات: حسابان بنفس صندوق Gmail
-- (`me@gmail.com` و`me+farm@gmail.com`) يناديان `start_trial` **في آنٍ واحد**.
-- كلاهما يقرأ الجدول فارغًا من بصمته القانونية (لم تُثبَّت أخرى بعد)، فيُدرج
-- كلٌّ صفَّه (بصمة خام مختلفة، **بصمة قانونية واحدة**)، ويفوز الاثنان.
-- مقيس: **٥ من ٨** جولات تسابق منحت الصندوق الواحد تجربتين — أي أن حارس F-4،
-- الذي يصمد تسلسليًّا، يُلتفّ عليه بالتزامن. والوسم `+` بريدٌ يصل ويُؤكَّد فعلًا،
-- فالاستغلال لا يتوقّف على شذوذٍ في مزوّد الهوية — يتوقّف على توقيتٍ يملكه المهاجم.
--
-- ═══ العلاج: يُدرِج القفلَ الذي كان الفحص يفترضه ═══
-- قيد فرادة جزئي على `canonical_hash` يجعل الإدراج الثاني بنفس البصمة القانونية
-- **يصطدم** بالأوّل: تحت READ COMMITTED ينتظر الثاني إثباتَ الأوّل ثم يسقط
-- بـ`unique_violation` (23505)، فتُلغى معاملته ولا يُمنح. النتيجة: **فائزٌ واحد
-- لا اثنان** — نفس نمط الفرادة الذي يحرس به هذا المخطّط الشراء المكرّر
-- (`purchase_ledger`) والكودَ المكرّر (`access_codes.code_hash`). لا منطق جديد،
-- ولا مسار خدمة يتغيّر: مجرّد القفل الذي كان مفترَضًا صار قائمًا.
--
-- ⚠️ حدوده المعلَنة:
--   • الفهرس جزئيّ `where canonical_hash is not null`: الصفوف بلا بصمة قانونية
--     (بريدٌ بلا `@`، أو صفوف سابقة لـ20260824120004) تبقى محروسةً بالبصمة
--     الخام (المفتاح الأوّل للجدول) كما كانت — والقيم NULL المتعدّدة مسموحة.
--   • **لا يدمج أبرياء:** بصمةٌ قانونية واحدة تعني صندوقًا واحدًا بالتعريف
--     (نقاط/وسم Gmail، أو وسم `+` لأي نطاق). ونقطتان خارج Gmail تعطيان بصمتين
--     قانونيتين مختلفتين ⇒ مفتاحين مختلفين ⇒ تجربتان مسموحتان — يحرسه التأكيد
--     المضادّ في scripts/attack/canonical-trial-race-attack.mjs.
--   • الفهرس غير الفريد `trial_ledger_canonical_hash` (20260824120004) يبقى؛
--     حذفه يعني تحرير هجرة مطبَّقة، ونتركه — كلفة كتابةٍ ضئيلة، والمخطِّط يستعمل
--     الفريد. توحيدهما دَينٌ موثّق لا شرطُ صحّة.
--
-- idempotent: `create unique index if not exists`، ومحروسٌ بوجود العمود.
--
-- ⚠️ **مشروطٌ بوجود `canonical_hash`** — لا افتراضًا أنه دائمًا هناك: بيئات
-- الإثبات المضادّ (entitlements-proof) تُعيد بناء حالة **ما قبل F-4** باستثناء
-- 20260824120004 (منشئةِ العمود) وتطبيق ما بعدها. فالحارس هنا يجعل هذه الهجرة
-- **لا-عمليّة** في تلك البيئة — وهو صحيحٌ دلاليًّا: قفلُ البصمة القانونية لا
-- معنى له قبل وجود البصمة القانونية. وفي أي تطبيق كامل العمود موجود دائمًا
-- (تسلسل الهجرات يضمنه)، فيُنشأ الفهرس دائمًا حيث يلزم.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'trial_ledger'
       and column_name = 'canonical_hash'
  ) then
    create unique index if not exists trial_ledger_canonical_unique
      on public.trial_ledger (canonical_hash)
      where canonical_hash is not null;

    comment on index public.trial_ledger_canonical_unique is
      'فرادة البصمة القانونية — تجربة واحدة لكل صندوق. تحوّل فحص start_trial غير القافل إلى قفل إدراج، فيسقط سباق الأسماء المستعارة المتزامن (F-4 TOCTOU).';
  end if;
end
$$;

  $qimmah_mig_20260827120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260827120001', '20260827120001_trial_ledger_canonical_race_guard.sql');
end
$qimmah_mig_20260827120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260827120002_canonical_identity_trailing_dot.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260827120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260827120002') then
    raise notice 'تخطٍّ: 20260827120002_canonical_identity_trailing_dot.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260827120002$
-- ============================================================================
-- [COMMISSIONING · RED-TEAM F-4-LOW] تطبيع النقطة اللاحقة في النطاق
-- ============================================================================
-- كشف الهجوم العدائي ثغرة تطبيع منخفضة: `foo@gmail.com.` (نقطة لاحقة في
-- النطاق) يُنتج بصمة قانونية **مختلفة** عن `foo@gmail.com`، فيفتح تجربة ٧٢
-- ساعة ثانية للصندوق نفسه. والأمر ليس خاصًّا بجيميل: `a@x.com.` كذلك يخالف
-- `a@x.com`. مقيس قبل الإصلاح على عنقود حقيقي:
--   canonical_identity('foo@gmail.com.') = 'foo@gmail.com.'  ≠  'foo@gmail.com'
--
-- ═══ لماذا آمن بنيويًّا ═══
-- النقطة اللاحقة لا تميّز وجهتين حقيقيّتين: DNS يساوي `x.com` و`x.com.` (الأخيرة
-- اسم مؤهَّل كاملًا ينتهي بالجذر). فقصّها **لا يدمج** بريدين مختلفين، بل يمنع
-- تشظّي الصندوق الواحد إلى بصمتين. والتعديل الوحيد: `rtrim(النطاق, '.')` في
-- موضعَي النطاق (فحص جيميل وإعادة التركيب) — وما عداه يبقى حرفيًّا كما كان.
--
-- ═══ لماذا هجرة منفصلة لا تعديلٌ للسابقة ═══
-- الهجرة السابقة (20260824120004) مسجَّلة/مُطبَّقة، فتعديلها يكسر حتمية
-- التطبيق. الصيغة المعتمدة: إعادة تعريف كاملة الجسد في هجرة جديدة، فتصير هي
-- آخر مُعرِّف (يقارنه test:migration-order بالجسد الحيّ).
-- ============================================================================

create or replace function private.canonical_identity(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- النطاق مُطبَّعًا: النقطة اللاحقة تُقصّ (نفس الوجهة في DNS)، فلا تفتح تجربة ثانية.
  select case
    when p_email is null or btrim(p_email) = '' then null
    when position('@' in lower(btrim(p_email))) = 0 then lower(btrim(p_email))
    when rtrim(split_part(lower(btrim(p_email)), '@', 2), '.') in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1), '.', '')
           || '@gmail.com'
    else split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1)
         || '@' || rtrim(split_part(lower(btrim(p_email)), '@', 2), '.')
  end;
$$;

comment on function private.canonical_identity(text) is
  'بصمة الهوية القانونية: تطبيع جيميل (نقاط/وسم +) والوسم + عمومًا وقصّ النقطة اللاحقة في النطاق. تجربة واحدة لكل صندوق. [F-4-LOW: النقطة اللاحقة].';

  $qimmah_mig_20260827120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260827120002', '20260827120002_canonical_identity_trailing_dot.sql');
end
$qimmah_mig_20260827120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260827120003_advisor_staging_reconciliation.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260827120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260827120003') then
    raise notice 'تخطٍّ: 20260827120003_advisor_staging_reconciliation.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260827120003$
-- ============================================================================
-- [STAGING-ADVISOR] مصالحة نتائج مستشار الأمان الحيّ — ثلاثة بنود لا غير
-- ============================================================================
-- المصدر: تشغيل Security Advisor على qimmah-staging بعد بلوغها ٣٩ هجرة.
-- النطاق محصور عمدًا في البنود الثلاثة المسمّاة، ولا يلمس المنح المقصودة
-- (start_trial · my_entitlement · claim_pending_grants · founder_*) بحرف —
-- «لا سحب شامل» شرطُ التكليف، والتأكيد المضادّ أدناه يحرسه (§4.2).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① `private.gtin_check_digit_valid` — search_path متحوّل (mutable).
--
--    أحمر: الدالّة الوحيدة في المخطّط بلا `set search_path` — إذ هي immutable
--    عادية لا SECURITY DEFINER، فلم يلتقطها عرف «كل definer مثبَّت المسار».
--    وهي تُنفَّذ داخل قيد CHECK على `food_submissions.barcode`، أي **بمسار
--    بحث المستدعي** وقت الإدراج — والدوال المضمّنة فيها (btrim · substr ·
--    char_length) تُحلّ عبر مسار البحث كسائر الأسماء.
--
--    أخضر: إعادة تعريف **كاملة الجسد حرفيًّا** (عقد test:migration-order:
--    الجسد الحيّ يطابق آخر ملف يعرّفه نصًّا) والزيادة الوحيدة سطر
--    `set search_path = ''`. لا تغيّر دلاليًّا: `pg_catalog` يُبحث ضمنيًّا
--    دائمًا، فتبقى الدوال المضمّنة تُحلّ منه بعينه — والمقفول هو إمكانية
--    تقديم مخطّط دخيل عليه في مسار المستدعي.
--
-- ② + ③ `handle_new_user()` و`entitlements_touch_updated_at()` — منفَّذتان
--    لِـanon/authenticated وهما مساعدتا trigger لا غير.
--
--    أحمر: أُنشئتا (20260713120006 · 20260806120001) **قبل** قطع وراثة
--    الامتيازات الافتراضية (20260806120003)، فورثتا منحة EXECUTE الاسمية
--    لأدوار العميل من افتراضيات المنصّة وبقيت. وكنس 20260809120003 نزع
--    PUBLIC (grantee 0) وحده — لا الصفوف الاسمية. الخطر نظريّ اليوم
--    («trigger functions can only be called as triggers») لكن رأس
--    20260809120003 نفسه يقرّر: أقلّ امتياز لا يتّكل على هذا القيد وحده —
--    وكلتاهما SECURITY DEFINER، وهو بالضبط صنف الدوال الذي يستحق الحسم.
--
--    أخضر: سحب EXECUTE الاسمي من أدوار العميل. إطلاق الـtriggers **لا يتأثر**:
--    صلاحية EXECUTE تُفحص عند `create trigger` بهوية مالك الجدول لا عند كل
--    DML بهوية المستخدم — المبدأ مقرَّر ومُثبَت سلوكيًّا في 20260809120003
--    (فحوص اللمس والمزامنة في test:privileges).
--
-- idempotent · forward-only · لا هجرة تُعاد كتابتها (§2 و§4.1).
-- ============================================================================

-- ── ① تثبيت مسار البحث — الجسد منقول حرفيًّا من 20260824120003 ──────────────
create or replace function private.gtin_check_digit_valid(p_code text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  s   text := btrim(coalesce(p_code, ''));
  n   int;
  i   int;
  d   int;
  mult int;
  total int := 0;
begin
  if s !~ '^[0-9]+$' then return false; end if;
  n := char_length(s);
  if n not in (8, 12, 13, 14) then return false; end if;
  -- من اليمين: الخانة الأخيرة هي خانة التحقّق، وما قبلها يتناوب ٣ ثم ١.
  for i in 1 .. n - 1 loop
    d := substr(s, n - i, 1)::int;
    mult := case when i % 2 = 1 then 3 else 1 end;
    total := total + d * mult;
  end loop;
  return ((10 - (total % 10)) % 10) = substr(s, n, 1)::int;
end;
$$;

comment on function private.gtin_check_digit_valid(text) is
  'تحقّق GTIN-8/12/13/14 بخانة mod-10. سلطة خادم — لا تثق بتحقّق المتصفّح. [ADVISOR: search_path مثبَّت].';

-- ── ② + ③ مساعدتا الـtrigger تفقدان منحة أدوار العميل ───────────────────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.entitlements_touch_updated_at() from public, anon, authenticated;

-- ── تحقّق ذاتي (§4.2): الإصلاح وقع، والمقصود لم يُمسّ ───────────────────────
do $$
begin
  -- (أ) مسار البحث صار مثبَّتًا فعلًا — لا اكتفاءً بأن البيان مرّ.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'gtin_check_digit_valid'
       and p.proconfig is not null
       and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
  ) then
    raise exception 'advisor-fix incomplete: gtin_check_digit_valid search_path still mutable';
  end if;

  -- (ب) مساعدتا الـtrigger لم تعودا قابلتين للنداء من أدوار العميل.
  if has_function_privilege('anon', 'public.handle_new_user()', 'execute')
     or has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
     or has_function_privilege('anon', 'public.entitlements_touch_updated_at()', 'execute')
     or has_function_privilege('authenticated', 'public.entitlements_touch_updated_at()', 'execute') then
    raise exception 'advisor-fix incomplete: trigger helpers still executable by client roles';
  end if;

  -- (جـ) **التأكيد المضادّ — لم يصر السحبُ قاعدة**: المنح المقصودة حيّة.
  --      سقوط أيٍّ منها يعني أن الهجرة تجاوزت تكليفها، فتفشل صاخبةً.
  --      **فحص الوجود أولًا**: بيئات الإثبات المضادّ تبني تاريخًا مبتورًا بلا
  --      بعض هذه الدوالّ، فالتأكيد يقيس ما هو موجود ولا ينهار على دالّةٍ غائبة
  --      (has_function_privilege يرمي على توقيعٍ لا وجود له).
  if (to_regprocedure('public.start_trial()') is not null
        and not has_function_privilege('authenticated', 'public.start_trial()', 'execute'))
     or (to_regprocedure('public.my_entitlement()') is not null
        and not has_function_privilege('authenticated', 'public.my_entitlement()', 'execute'))
     or (to_regprocedure('public.claim_pending_grants()') is not null
        and not has_function_privilege('authenticated', 'public.claim_pending_grants()', 'execute'))
     or (to_regprocedure('public.redeem_access_code_v2(text)') is not null
        and not has_function_privilege('authenticated', 'public.redeem_access_code_v2(text)', 'execute'))
     or (to_regprocedure('public.founder_executive_snapshot()') is not null
        and not has_function_privilege('authenticated', 'public.founder_executive_snapshot()', 'execute')) then
    raise exception 'advisor-fix overreach: an intentional authenticated grant was lost';
  end if;
end;
$$;

  $qimmah_mig_20260827120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260827120003', '20260827120003_advisor_staging_reconciliation.sql');
end
$qimmah_mig_20260827120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260827120004_gateway_stamp_enforcement.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260827120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260827120004') then
    raise notice 'تخطٍّ: 20260827120004_gateway_stamp_enforcement.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260827120004$
-- ============================================================================
-- [GATEWAY-ENFORCEMENT] الختم يصير سلطةً في القاعدة — إغلاق الالتفاف على البوّابة
-- ============================================================================
-- الثغرة المقيسة: `qimmah-gateway` **يسكّ** ختم `x-qimmah-gate`، و`contract.mjs`
-- يعلن أن السلطة وقت التشغيل هي `private.gate_stamp_valid` — لكن هذه الدالّة
-- **لم تكن موجودة**. فالدوالّ الأربع تبقى ممنوحة لـ`authenticated`، والمتصفّح
-- ينادي PostgREST مباشرةً متجاوزًا البوّابة كليًّا. هذه الهجرة تجعل المعمار
-- المعلَن صحيحًا من طرفٍ إلى طرف — **بلا سلطة هوية ثانية وبلا كشف سرّ**.
--
-- ═══ التدفّق الذي تُتمّه ═══
--   متصفّح مصادَق → qimmah-gateway → حدّ لكل عنوان → ختم HMAC قصير العمر →
--   PostgREST RPC → القاعدة تتحقّق: (١) الهوية من auth.uid() حصرًا،
--   (٢) الفعل يطابق الـRPC، (٣) uid الختم = auth.uid()، (٤) نافذة الختم حاليّة
--   أو السابقة، (٥) صحّة الـHMAC → عندها فقط تُنفَّذ الطفرة.
--
-- ═══ الهوية تبقى auth.uid() وحدها ═══
-- الختم لا يحمل هوية ولا يُصدّق على مستخدم — يقول «مررتُ بالبوّابة» لا «أنا فلان»
-- (نصّ contract.mjs حرفيًّا). كل هوية تُشتقّ من `auth.uid()` كما كانت، ولا سطر
-- في عقد القاعدة يقبل معرّفًا يقوله المستدعي.
--
-- ═══ السرّ: Supabase Vault حصرًا — لا نصّ في جدول ولا في هجرة ═══
-- `private.gate_secret()` يقرأ `vault.decrypted_secrets` (المخزن الوحيد الذي
-- تقرؤه القاعدة ولا يبلغه أي دور عميل). **لا يُكتب السرّ هنا.** يُزرَع مرّةً على
-- staging بأمر منفصل يوثّقه الرَّنبوك، وبنفس القيمة يُضبط متغيّر البيئة
-- `QIMMAH_GATE_SECRET` للطرفية. غياب السرّ ⇒ **فشلٌ مغلق**: كل نداء مبوَّب يُرفض.
--   provisioning (على staging، مرّة، بدور الخدمة/محرّر SQL):
--     select vault.create_secret('<٣٢ محرفًا+ عشوائيّة staging>',
--            'qimmah_gate_secret', 'HMAC key shared with qimmah-gateway env');
--
-- ═══ الحساب لا يعتمد pgcrypto ولا مخطّط extensions ═══
-- الـHMAC مبنيّ على `sha256()` من نواة Postgres (نفس اختيار hash_identity)،
-- فيعمل على الإنتاج وعلى صندوق PGlite بلا اختلاف — ولا يحتاج `extensions.hmac`
-- الذي لا يوجد في الصندوق. مُثبَت مطابقًا بايتًا-ببايت لِـ`hmacHex` في البوّابة.
--
-- ═══ التصنيف الصريح — ما يُبوَّب وما لا يُبوَّب ═══
--   • **يُبوَّب** (طفرات تمرّ عبر GATED_ACTIONS، ولا مستدعي داخليّ لها — مُتحقَّق
--     بالمسح): start_trial · redeem_access_code_v2 · claim_pending_grants ·
--     submit_missing_food. كلٌّ يشترط أصلًا `auth.uid()` غير فارغ، فلا مسار خدمة
--     ينكسر (دور الخدمة بلا JWT يسقط عند «not authenticated» قبل الحارس).
--   • **لا يُبوَّب — عمدًا**: `my_entitlement` (قراءة على كل تحميل صفحة) ·
--     دوالّ المؤسس/الإدارة (تُنادى من لوحة الإدارة لا من البوّابة، وتحرس نفسها
--     بـrequire_admin) · `salla_ingest_event` و`gate_admit` (دور الخدمة، خادم
--     إلى خادم، لا متصفّح). تبويبها كان سيكسر مسارات شرعية.
--
-- idempotent · forward-only · لا هجرة سابقة تُحرَّر.
-- ============================================================================

-- ── ١) HMAC-SHA256 على نواة Postgres — مطابق لِـWeb Crypto في البوّابة ──────
-- مُثبَت: encode(gate_hmac_sha256(key, msg),'hex') = contract.mjs hmacHex(key,msg).
create or replace function private.gate_hmac_sha256(p_key bytea, p_msg bytea)
returns bytea
language plpgsql
immutable
set search_path = ''
as $$
declare
  blocksize int := 64;   -- كتلة SHA-256
  k    bytea := p_key;
  ipad bytea := ''::bytea;
  opad bytea := ''::bytea;
  i    int;
  kb   int;
begin
  -- مفتاح أطول من الكتلة يُختصر بالتجزئة، ثم يُبطَّن يمينًا بالأصفار.
  if octet_length(k) > blocksize then k := sha256(k); end if;
  while octet_length(k) < blocksize loop k := k || '\x00'::bytea; end loop;
  for i in 0 .. blocksize - 1 loop
    kb := get_byte(k, i);
    ipad := ipad || set_byte('\x00'::bytea, 0, kb # 54);   -- 0x36
    opad := opad || set_byte('\x00'::bytea, 0, kb # 92);   -- 0x5c
  end loop;
  return sha256(opad || sha256(ipad || p_msg));
end;
$$;

-- ── ٢) السرّ من Vault — فشلٌ مغلق عند الغياب ────────────────────────────────
-- يُقرأ في سياق المُعرِّف (postgres) ولا يبلغ العميل أبدًا: الخارج بوليان فقط.
-- غياب مخطّط vault (بيئة غير-Supabase) أو غياب الصفّ ⇒ null ⇒ رفض.
create or replace function private.gate_secret()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare s text;
begin
  begin
    select decrypted_secret into s
      from vault.decrypted_secrets
     where name = 'qimmah_gate_secret'
     limit 1;
  exception when others then
    return null;   -- لا vault ⇒ فشل مغلق، لا استثناء يتسرّب
  end;
  s := nullif(btrim(coalesce(s, '')), '');
  -- نفس حدّ البوّابة (readGatewayConfig): سرٌّ أقصر من ٣٢ = تهيئة ناقصة = رفض.
  if s is null or length(s) < 32 then return null; end if;
  return s;
end;
$$;

-- ── ٣) السلطة وقت التشغيل — الدالّة التي يسمّيها contract.mjs ─────────────────
-- تطابق verifyStamp حرفًا بحرف: شكل `window.sig`، النافذة حاليّة أو السابقة،
-- والرسالة `action|uid|window`. مقارنة ثابتة الزمن (نيّة timingSafeEqualHex).
create or replace function private.gate_stamp_valid(p_action text, p_uid uuid, p_stamp text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret     text := private.gate_secret();
  dot        int;
  w_text     text;
  sig_hex    text;
  w          bigint;
  now_window bigint;
  msg        text;
  expected   bytea;
  provided   bytea;
  i          int;
  diff       int := 0;
begin
  if secret is null then return false; end if;          -- فشل مغلق: لا سرّ
  if p_uid is null then return false; end if;           -- لا هوية ⇒ لا ختم
  if p_stamp is null or p_stamp = '' then return false; end if;

  dot := strpos(p_stamp, '.');
  if dot <= 1 then return false; end if;                -- مشوَّه: لا فاصل نافذة
  w_text  := left(p_stamp, dot - 1);
  sig_hex := substr(p_stamp, dot + 1);
  if w_text !~ '^[0-9]+$' then return false; end if;    -- نافذة مشوَّهة
  if sig_hex !~ '^[0-9a-f]{64}$' then return false; end if; -- توقيع مشوَّه
  w := w_text::bigint;

  -- window = floor(epoch / STAMP_WINDOW_SECONDS)، STAMP_WINDOW_SECONDS = 120.
  now_window := floor(extract(epoch from now()) / 120)::bigint;
  if w <> now_window and w <> now_window - 1 then
    return false;                                        -- منتهٍ أو مستقبليّ
  end if;

  -- stampMessage(action, uid, window) = 'action|uid|window' — الربط بالهوية
  -- والفعل هنا: ختمُ فعلٍ آخر أو مستخدمٍ آخر يعطي HMAC مختلفًا فيُرفض.
  msg := p_action || '|' || p_uid::text || '|' || w::text;
  expected := private.gate_hmac_sha256(convert_to(secret, 'UTF8'), convert_to(msg, 'UTF8'));
  provided := decode(sig_hex, 'hex');

  -- مقارنة تمرّ على كل بايت دائمًا (لا تنهار عند أول اختلاف).
  if octet_length(provided) <> octet_length(expected) then return false; end if;
  for i in 0 .. octet_length(expected) - 1 loop
    diff := diff | (get_byte(provided, i) # get_byte(expected, i));
  end loop;
  return diff = 0;
end;
$$;

-- ── ٤) الحارس الذي تناديه كل RPC مبوَّبة ────────────────────────────────────
-- يقرأ الهوية من auth.uid() (السلطة الوحيدة)، والختم من ترويسة PostgREST
-- `request.headers` باسمه المتعاقَد عليه `x-qimmah-gate`. رفضٌ ⇒ استثناء يُجهض
-- المعاملة **قبل أي طفرة**.
create or replace function private.gate_enforce(p_action text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hdrs  json;
  stamp text;
  uid   uuid := auth.uid();
begin
  if uid is null then
    raise exception 'gate: not authenticated' using errcode = '28000';
  end if;

  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    hdrs := null;
  end;
  -- PostgREST يخفض أسماء الترويسات؛ STAMP_HEADER = 'x-qimmah-gate'.
  stamp := case when hdrs is null then null else hdrs ->> 'x-qimmah-gate' end;

  if not private.gate_stamp_valid(p_action, uid, stamp) then
    raise exception 'gate_stamp_invalid: %', p_action using errcode = '28000';
  end if;
end;
$$;

-- دوالّ الحارس سرّية: لا دور عميل يناديها مباشرةً (المخطّط private محجوب أصلًا).
revoke all on function private.gate_hmac_sha256(bytea, bytea) from public, anon, authenticated;
revoke all on function private.gate_secret()                  from public, anon, authenticated;
revoke all on function private.gate_stamp_valid(text, uuid, text) from public, anon, authenticated;
revoke all on function private.gate_enforce(text)             from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ٥) إعادة تعريف الطفرات الأربع — **الجسد منقول حرفيًّا** من آخر مُعرِّف لكلٍّ،
--    والزيادة الوحيدة سطرٌ واحد: `perform private.gate_enforce('<action>');`
--    مباشرةً بعد فحص «not authenticated» وقبل أي قراءة أو كتابة. عقد
--    test:migration-order: هذا الملف يصير آخر مُعرِّف، فيطابق الجسدَ الحيّ.
-- ════════════════════════════════════════════════════════════════════════════

-- ⇐ منقولة حرفيًّا من 20260824120004_activation_hardening.sql + سطر الحارس.
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

revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- ⇐ منقولة حرفيًّا من 20260824120001_roles_and_redeem_rate_limit.sql + الحارس.
--   الفعل هنا `redeem_access_code` (مفتاح GATED_ACTIONS)، لا اسم الـRPC `_v2`.
create or replace function public.redeem_access_code_v2(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em  text;
  ver int;
  h   text;
  res text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.gate_enforce('redeem_access_code');
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  if private.redeem_rate_exceeded(em) then
    -- الحدّ نفسه لا يُسجَّل محاولةً: وإلا لأطال المهاجمُ حظرَ نفسه بلا نهاية،
    -- وصار الحدّ عقوبةً دائمة بدل نافذة متدحرجة.
    return jsonb_build_object('outcome', 'rate_limited', 'reason', 'too_many_attempts');
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  begin
    res := private.redeem_core(p_code);
  exception when others then
    -- ⚠️ الارتداد هنا **إلى نقطة الحفظ فقط**: الكتلة الداخلية تُلغى، والمعاملة
    -- تبقى حيّة. ولذلك يُثبَّت الصفّ أدناه — وهو ما يستحيل لو رفعنا للخارج.
    insert into private.redeem_attempts (email_hash, hash_version, succeeded)
    values (h, ver, false);
    return jsonb_build_object('outcome', 'failed', 'reason', sqlerrm);
  end;

  insert into private.redeem_attempts (email_hash, hash_version, succeeded)
  values (h, ver, true);
  return jsonb_build_object('outcome', res, 'reason', null);
end;
$$;

revoke all on function public.redeem_access_code_v2(text) from public, anon;
grant execute on function public.redeem_access_code_v2(text) to authenticated;

-- ⇐ منقولة حرفيًّا من 20260816120001_commerce_integrity_fixes.sql + الحارس.
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

revoke all on function public.claim_pending_grants() from public, anon;
grant execute on function public.claim_pending_grants() to authenticated;

-- ⇐ منقولة حرفيًّا من 20260824120003_food_submissions.sql + الحارس.
create or replace function public.submit_missing_food(
  p_product_name text,
  p_brand        text default null,
  p_barcode      text default null,
  p_serving_desc text default null,
  p_kcal         numeric default null,
  p_protein_g    numeric default null,
  p_carbs_g      numeric default null,
  p_fat_g        numeric default null,
  p_note         text default null,
  p_lang         text default 'ar'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_count int;
  bc  text := nullif(btrim(coalesce(p_barcode, '')), '');
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.gate_enforce('submit_missing_food');

  if coalesce(btrim(p_product_name), '') = '' then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'name_required');
  end if;

  -- باركود مكتوب لكنه غير صالح: يُقال صراحةً، ولا يُبتلع ولا يُخزَّن مشوَّهًا.
  if bc is not null and not private.gtin_check_digit_valid(bc) then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'barcode_checksum');
  end if;

  select count(*) into today_count
    from public.food_submissions f
   where f.submitted_by = uid and f.submitted_at > now() - interval '24 hours';
  if today_count >= 20 then
    return jsonb_build_object('outcome', 'rate_limited', 'reason', 'daily_limit');
  end if;

  -- بلاغٌ مفتوح بنفس الباركود: ليس خطأ المستخدم، ولا يستحقّ صفًّا ثانيًا.
  if bc is not null and exists (
      select 1 from public.food_submissions f
       where f.barcode = bc and f.status = 'pending') then
    return jsonb_build_object('outcome', 'already_queued', 'reason', 'barcode_pending');
  end if;

  insert into public.food_submissions (
    submitted_by, product_name, brand, barcode, serving_desc,
    evidence_kcal, evidence_protein_g, evidence_carbs_g, evidence_fat_g,
    evidence_note, lang)
  values (uid, btrim(p_product_name), nullif(btrim(coalesce(p_brand, '')), ''), bc,
          nullif(btrim(coalesce(p_serving_desc, '')), ''),
          p_kcal, p_protein_g, p_carbs_g, p_fat_g,
          nullif(btrim(coalesce(p_note, '')), ''), coalesce(p_lang, 'ar'))
  returning id into new_id;

  return jsonb_build_object('outcome', 'queued', 'id', new_id);
end;
$$;

revoke all on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ٦) تحقّق ذاتي (§4.2): البنية أُنشئت، والحارس موصول، والمقصود لم يُمسّ.
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  -- (أ) دوالّ الحارس موجودة بالأسماء التي يعتمدها العقد.
  if to_regprocedure('private.gate_stamp_valid(text, uuid, text)') is null
     or to_regprocedure('private.gate_enforce(text)') is null
     or to_regprocedure('private.gate_secret()') is null then
    raise exception 'gateway-enforcement incomplete: guard functions missing';
  end if;

  -- (ب) كل RPC مبوَّبة تحمل نداء الحارس في جسدها الحيّ (الوصل فعليّ لا مُدّعى).
  if (select prosrc from pg_proc where oid = 'public.start_trial()'::regprocedure)
        not like '%gate_enforce(''start_trial'')%'
     or (select prosrc from pg_proc where oid = 'public.redeem_access_code_v2(text)'::regprocedure)
        not like '%gate_enforce(''redeem_access_code'')%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%gate_enforce(''claim_pending_grants'')%'
     or (select prosrc from pg_proc where oid = 'public.submit_missing_food(text,text,text,text,numeric,numeric,numeric,numeric,text,text)'::regprocedure)
        not like '%gate_enforce(''submit_missing_food'')%' then
    raise exception 'gateway-enforcement incomplete: a gated RPC is missing its guard';
  end if;

  -- (جـ) **التأكيد المضادّ**: المنح المقصودة لم تُسحب — لا تبويب صامت لِما لا يُبوَّب.
  if not (has_function_privilege('authenticated', 'public.start_trial()', 'execute')
      and has_function_privilege('authenticated', 'public.redeem_access_code_v2(text)', 'execute')
      and has_function_privilege('authenticated', 'public.claim_pending_grants()', 'execute')
      and has_function_privilege('authenticated', 'public.my_entitlement()', 'execute')) then
    raise exception 'gateway-enforcement overreach: an intentional grant was lost';
  end if;

  -- (د) my_entitlement **ليست مبوَّبة** (قراءة على كل تحميل صفحة): لو حملت
  --     الحارس لانكسر كل دخول. تأكيدٌ صريح أنها بقيت خارج التبويب.
  if (select prosrc from pg_proc where oid = 'public.my_entitlement()'::regprocedure)
        like '%gate_enforce%' then
    raise exception 'gateway-enforcement overreach: my_entitlement must not be gated';
  end if;
end;
$$;

  $qimmah_mig_20260827120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260827120004', '20260827120004_gateway_stamp_enforcement.sql');
end
$qimmah_mig_20260827120004_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '7/9'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  6                                                  as expected,
  case when count(*) filter (where m.version is not null) = 6
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260826120003'), ('20260826120004'), ('20260827120001'), ('20260827120002'), ('20260827120003'), ('20260827120004')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;
