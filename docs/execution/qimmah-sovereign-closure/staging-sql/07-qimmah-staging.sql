-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 7/7
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (4):
--   · 20260826120003_founder_user_detail_history.sql
--   · 20260826120004_founder_pending_orders.sql
--   · 20260827120001_trial_ledger_canonical_race_guard.sql
--   · 20260827120002_canonical_identity_trailing_dot.sql
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

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '7/7'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  4                                                  as expected,
  case when count(*) filter (where m.version is not null) = 4
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260826120003'), ('20260826120004'), ('20260827120001'), ('20260827120002')) as v(version)
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
--            client_rpcs = 6 · legacy_open = 0 · migrations = 39
