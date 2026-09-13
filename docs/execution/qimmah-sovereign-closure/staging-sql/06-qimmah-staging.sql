-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 6/9
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
--   · 20260824120004_activation_hardening.sql
--   · 20260824120005_campaign_is_not_a_credential.sql
--   · 20260824120006_gateway_network_limit.sql
--   · 20260826120001_founder_code_batches.sql
--   · 20260826120002_founder_snapshot_signed_in_today.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120004_activation_hardening.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120004') then
    raise notice 'تخطٍّ: 20260824120004_activation_hardening.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120004$
-- ═══════════════════════════════════════════════════════════════════════════
-- [COMMISSIONING §5 · §12] إحكام التفعيل — إغلاق أربعة مسارات مسمّاة
-- ═══════════════════════════════════════════════════════════════════════════
--
-- التكليف يقول حرفيًّا: «Activation mutations must be rate-limited and
-- replay-safe» و«Trial creation must resist trivial repeated farming».
-- وهذه الهجرة تغلق أربعة مواضع تُخالف ذلك اليوم، ثلاثة منها مُسمّاة في
-- `docs/security/COMMERCE-ADMIN-THREAT-MODEL.md` والرابع **أدخلته الهجرة
-- التي سبقتها بساعات** — ويُغلق هنا بنفس الصراحة التي كُتب بها.
--
-- ┌───┬──────────────────────────────────────────────────────────────────────┐
-- │ ١ │ **تجاوز حدّ المعدّل** — `20260824120001` أضافت `redeem_access_code_v2` │
-- │   │ محدودةَ المعدّل، **وأبقت** `redeem_access_code` القديمة ممنوحة       │
-- │   │ لـ`authenticated` بلا أي حدّ. فالحارس الجديد كان يُلتفّ عليه بتغيير   │
-- │   │ **اسم الدالّة في الطلب**. مقيس: ٣٠ محاولة عبر القديمة ⇒ ٣٠ وصلت       │
-- │   │ المنطق بلا خنق، مقابل ٢٠ مخنوقة من ٣٠ عبر `_v2`.                     │
-- │   │ وقد كان التعليق في تلك الهجرة **يُعلن** التجاوز — والإعلان ليس إغلاقًا.│
-- │ ٢ │ **F-2c** — الاسترداد لا يفحص تأكيد البريد، بينما `start_trial`        │
-- │   │ و`claim_pending_grants` تفحصانه. التناظر يكتمل هنا.                  │
-- │ ٣ │ **F-4** — وسم `+` (والنقاط في Gmail) يفتح تجارب ٧٢ ساعة بلا حدّ من     │
-- │   │ صندوق بريد واحد.                                                     │
-- │ ٤ │ **F-5 (نصفه)** — لا مولّد أكواد في المستودع كلّه؛ العقد يفرض الشكل    │
-- │   │ لا العشوائية. يُضاف المولّد ويصير هو الافتراض.                        │
-- └───┴──────────────────────────────────────────────────────────────────────┘
--
-- ⚠️ **ما لا تفعله هذه الهجرة عمدًا:** لا تمنع كودًا نصّيًّا ضعيفًا يمرّره
-- المؤسس صراحةً. «هل تُسمح أكواد حملات مقروءة مثل `RAMADAN2345` أصلًا؟» قرار
-- عمل لا قرار وكيل (§0.1 من الميثاق يجيز «حملات مؤقّتة أو أكوادًا»)، فيُرفَع
-- مسمّى ولا يُحسم هنا. والمُتاح الآن: الافتراض صار عشوائيًّا ٨٠ بتًا، وضعف أي
-- كود نصّي صار **مقيسًا ومحفوظًا** في العمود `entropy_bits` بدل أن يكون
-- غير مرئي.

-- ── ١) إغلاق تجاوز حدّ المعدّل ──────────────────────────────────────────────
/**
 * `redeem_access_code` تبقى موجودة بتوقيعها وسلوكها — **ويُنزَع وصول العميل
 * إليها**. ولماذا النزع لا إضافة حدّ داخلها: الدالّة **ترفع** عند الفشل،
 * والرفع يُلغي معاملته بما فيها صفّ المحاولة، فحدٌّ داخلها يعدّ النجاحات وحدها
 * — حارسٌ لا يُطلق. المسار الوحيد الذي يستطيع تثبيت المحاولة هو `_v2`.
 *
 * ولا ينكسر العميل المشحون: هو ينادي `_v2` أولًا ولا يسقط إلى القديمة إلا حين
 * تردّ `PGRST202/42883` — أي على قاعدة **لم تُطبَّق عليها هذه الهجرة أصلًا**،
 * وهناك تكون المنحة القديمة ما تزال قائمة. فالارتداد يبقى ذا معنى حيث يلزم،
 * ويستحيل حيث لا يلزم.
 */
revoke execute on function public.redeem_access_code(text) from public, anon, authenticated;

comment on function public.redeem_access_code(text) is
  'غلاف توافق للخادم فقط. نُزع وصول العميل في 20260824120004: كان يلتفّ على حدّ المعدّل بتغيير الاسم.';

-- ── ٢) الهوية القانونية: تطبيع الأسماء المستعارة (F-4) ─────────────────────
/**
 * **لا تُعدَّل `hash_identity` نفسها.** تغيير مدلول البصمة يُبطل كل السجلّات
 * القائمة — وهي البصمة التي يقوم عليها سجلّ التجارب والأكواد والمشتريات.
 * فالطريق الصحيح دالّة تطبيع **قبل** البصمة، وعمود بصمة ثانٍ **يُضاف**.
 *
 * والتطبيع محافظ عمدًا: وسم `+` يُقصّ لكل النطاقات (سلوكٌ قياسي عند كل مزوّد
 * تقريبًا)، أمّا حذف النقاط فلـGmail وحدها — لأنه سلوك Gmail خاصةً، وتعميمه
 * على نطاقات تعتبر النقطة حرفًا معنويًّا يدمج **حسابين مختلفين لشخصين
 * مختلفين**. والخطأ في هذا الاتجاه يحرم بريئًا من تجربته.
 */
create or replace function private.canonical_identity(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null or btrim(p_email) = '' then null
    when position('@' in lower(btrim(p_email))) = 0 then lower(btrim(p_email))
    when split_part(lower(btrim(p_email)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1), '.', '')
           || '@gmail.com'
    else split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1)
         || '@' || split_part(lower(btrim(p_email)), '@', 2)
  end;
$$;

revoke all on function private.canonical_identity(text) from public, anon, authenticated;

comment on function private.canonical_identity(text) is
  'يقصّ وسم + لكل النطاقات، ويحذف النقاط لـGmail وحدها. يُستعمل قبل hash_identity ولا يستبدلها.';

/**
 * العمود الثاني — **يُضاف ولا يستبدل**. الصفوف القائمة تبقى `null` ولا يمكن
 * ملؤها بأثر رجعي: السجلّ يحفظ البصمة لا البريد، ولا سبيل لاشتقاق الشكل
 * القانوني من تجزئة. وهذه حقيقة تُقال لا تُداري — **التطبيع يحرس ما بعده**،
 * ومن استهلك تجربته قبل هذه الهجرة يبقى محروسًا بالبصمة الخام كما كان.
 */
alter table public.trial_ledger add column if not exists canonical_hash text;
alter table public.trial_ledger add column if not exists canonical_hash_version int;

create index if not exists trial_ledger_canonical_hash
  on public.trial_ledger (canonical_hash) where canonical_hash is not null;

comment on column public.trial_ledger.canonical_hash is
  'بصمة الشكل القانوني للبريد (بلا وسم + وبلا نقاط في Gmail). null للصفوف السابقة لـ20260824120004 — لا backfill ممكن من تجزئة.';

-- ── ٣) `start_trial` تفحص البصمتين ────────────────────────────────────────
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

-- ── ٤) الاسترداد يفحص تأكيد البريد (F-2c) ─────────────────────────────────
/**
 * التناظر يكتمل: التجربة (٧٢ ساعة) والمطالبة (Premium) تفحصان `email_confirmed_at`
 * منذ `20260816120001`، والاسترداد (وصول بمدّة) لم يكن يفحصه. والفحص يوضع في
 * **النواة** لا في المدخلين، فلا ينفرد أحدهما بحارس.
 *
 * ويصل المستخدم اسمٌ صادق: `_v2` تُرجع الفشل قيمةً بسببه المسمّى، فتعرض
 * الشاشة «أكّد بريدك ثم أعد المحاولة» لا «كودك خاطئ» — والكود ليس خاطئًا.
 */
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
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  -- [F-2c] وصولٌ بمدّة يُسجَّل على عنوان بريد — فيلزمه ما يلزم التجربة والمطالبة.
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

revoke all on function private.redeem_core(text) from public, anon, authenticated;

-- ── ٥) طول الكود المُصدَر: ٦٠ بتًا ⇐ ٨٠ (نصف F-5) ─────────────────────────
/**
 * ═══ تصحيح لوثيقة التهديدات قبل أي كود ═══
 * `COMMERCE-ADMIN-THREAT-MODEL.md` §٢-٨ يقول «**لا مولّد أكواد في المستودع
 * كلّه**». **هذا بائت.** `20260822120002` أضافت `private.generate_access_code`
 * وتستعملها `founder_issue_access_code` فعلًا. والمولّد القائم **جيّد**: نفس
 * الأبجدية، اشتقاق من `uuid_send(gen_random_uuid())`، وتجاوزٌ صريح للبايتين ٦
 * و٨ الحاملَين بتّات النسخة والنوع، و٣٢ تقسم ٢٥٦ بلا باقٍ فلا انحياز modulo.
 *
 * فلا يُعاد بناؤه — **ولا يُلمس**. الخلل الباقي وحده هو **الطول**:
 * `founder_issue_access_code` تناديه بـ١٢ رمزًا = **٦٠ بتًا**. والتوصية في
 * §٢-٨ نفسها ≥١٦ رمزًا = ٨٠ بتًا. فالتغيير سطرٌ واحد في موضع الإصدار، لا
 * مولّد ثانٍ ولا سلطة إصدار ثانية (§0.2: سلطة واحدة لا اثنتان تتباعدان).
 *
 * ⚠️ **الأكواد المُصدَرة قبل هذه الهجرة تبقى ١٢ رمزًا وصالحة.** الطول يُقرأ من
 * الكود لا من عمود، والتجزئة لا تُعكَس. فهذه ترقية **لما بعدها**، وتُقال كما هي.
 */

/**
 * قياس مسمّى لكود **نصّي** يمرّره المؤسس. لا يمنع — يقيس ويحفظ، فيصير ضعف
 * كود الحملة **مرئيًّا في وحدة التحكّم** بدل أن يكون غير مرئي أصلًا.
 *
 * والسقف الرياضي `len × log2(32)` **سقفٌ لا شهادة**: كودٌ معجميّ مثل
 * `RAMADAN2345` يبلغ ٥٥ بتًا سقفًا وإنتروبيته الفعلية قريبة من الصفر. والاسم
 * يقول ذلك — `entropy_ceiling_bits` لا `entropy_bits`.
 */
alter table public.access_codes add column if not exists entropy_ceiling_bits int;
alter table public.access_codes add column if not exists generated_server_side boolean not null default false;

comment on column public.access_codes.entropy_ceiling_bits is
  'سقف رياضي (len × 5) لا إنتروبيا فعلية: كود معجميّ يبلغ السقف نفسه وقيمته الحقيقية أدنى بكثير.';
comment on column public.access_codes.generated_server_side is
  'true ⇒ اشتُقّ من private.generate_access_code. false ⇒ نصّ خارجي، والسقف أعلاه لا يشهد له.';

/**
 * إعادة إعلان حرفية لـ`founder_issue_access_code` من `20260822120002`،
 * بثلاثة فروق لا رابع: `generate_access_code(16)` بدل `(12)`، وتعبئة العمودين
 * أعلاه، وإعلان `entropy_ceiling_bits` في الرد كي يرى المُصدِر ما أصدر.
 * وما عدا ذلك — الحرّاس والرسائل وشكل الرد — منقول كما هو.
 */
create or replace function public.founder_issue_access_code(
  p_reason          text,
  p_label           text default null,
  p_duration_days   int  default 14,
  p_max_redemptions int  default 1,
  p_expires_at      timestamptz default null,
  p_code            text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_code   text;
  normalized text;
  ver        int;
  new_id     uuid;
  actor      text;
  was_gen    boolean;
begin
  perform private.require_founder();

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_issue_access_code: reason required' using errcode = '22023';
  end if;
  if coalesce(p_duration_days, 0) < 1 or p_duration_days > 3650 then
    raise exception 'founder_issue_access_code: duration out of range' using errcode = '22023';
  end if;
  if coalesce(p_max_redemptions, 0) < 1 then
    raise exception 'founder_issue_access_code: max redemptions must be >= 1' using errcode = '22023';
  end if;

  was_gen  := nullif(btrim(coalesce(p_code, '')), '') is null;
  -- [F-5] ١٦ رمزًا = ٨٠ بتًا. كان ١٢ = ٦٠، وهي التوصية المكتوبة في §٢-٨ نفسها.
  raw_code := coalesce(nullif(btrim(coalesce(p_code, '')), ''), private.generate_access_code(16));
  -- العقد نفسه لا نسخة منه: كود اليد وكود المولّد يمرّان بنفس البوّابة.
  normalized := private.normalize_access_code(raw_code);
  ver := private.active_pepper_version();
  -- من أصدر: معرّف الجلسة لا سلسلة عامّة — أثرٌ يُسأل عنه.
  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason,
                                   entropy_ceiling_bits, generated_server_side)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, actor, btrim(p_reason),
          char_length(normalized) * 5, was_gen)
  returning access_codes.id into new_id;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', char_length(normalized) * 5,
    'generated',       was_gen,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  from public, anon;
grant execute on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  to authenticated;

/**
 * والمسار الإداري (`service_role`) يعبّئ العمودين كذلك، فلا يصير الحقلان
 * صادقَين في مدخلٍ وفارغَين في آخر. ولا يتغيّر شيء آخر فيه.
 */
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
                                   expires_at, max_redemptions, created_by, created_reason,
                                   entropy_ceiling_bits, generated_server_side)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, p_created_by, p_created_reason,
          char_length(normalized) * 5, false)
  returning access_codes.id into id;
  return id;
end;
$$;

revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;

/**
 * ⚠️ **ما يبقى مفتوحًا بعد هذه الهجرة، ويُرفَع قرارًا لا يُفترَض:**
 * كودٌ نصّيٌّ ضعيف يمرّره المؤسس (`RAMADAN2345`) ما زال **مقبولًا**. ومنعُه
 * قرار عمل لا قرار وكيل: §0.1 من الميثاق يجيز «حملات مؤقّتة أو أكوادًا»،
 * وكود الحملة المقروء قد يكون مقصودًا. المتاح الآن أن ضعفه **مقيس ومحفوظ**
 * في `entropy_ceiling_bits` ومميَّز بـ`generated_server_side = false`.
 */

-- ── ٦) قوّة الكود تصل الشاشة ──────────────────────────────────────────────
/**
 * إعادة إعلان حرفية لـ`founder_code_page` من `20260824120002`، بعمودين
 * يُضافان قبل `total_rows` لا غير. **ولا تُجدَّد مفردات الحالة** — التحذير
 * المكتوب داخل جسمها يشرح لماذا: العميل والقاموسان يعرفون أربع قيم فقط،
 * وتوسيعها كسرٌ صامت لطرف العقد الآخر.
 *
 * والعمودان `null` للأكواد السابقة — **غيابٌ يُقال لا صفرٌ يُختلق** (التكليف:
 * «Never convert we-do-not-collect-this into the number zero»).
 */
drop function if exists public.founder_code_page(text, int, int);

create or replace function public.founder_code_page(p_search text, p_page int, p_page_size int)
returns table (
  code_id          uuid,
  label            text,
  status           text,
  duration_days    int,
  max_redemptions  int,
  redemption_count int,
  starts_at        timestamptz,
  expires_at       timestamptz,
  created_by       text,
  created_reason   text,
  created_at       timestamptz,
  updated_by       text,
  updated_at       timestamptz,
  last_redeemed_at timestamptz,
  -- [COMMISSIONING §5] قوّة الكود تصل الشاشة — وإلا فالقول إنها «مرئيّة في
  -- وحدة التحكّم» ادّعاءٌ بلا مسار، وهو ما يمنعه التكليف نصًّا.
  entropy_ceiling_bits int,
  generated_server_side boolean,
  total_rows       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- ⚠️ **الترقيم واحد لا صفر** — كما في `20260822120002` حرفيًّا.
  -- الصيغة الأولى هنا حسبت `off = page * lim` (صفريّة)، فصارت الصفحة الأولى
  -- التي يطلبها العميل (`1`) تُزيح خمسين صفًّا وتعود فارغة. كسرٌ صامت: لا خطأ
  -- يُرفع، ولا نصّ يتغيّر — قائمةٌ تبدو «لا أكواد» وفيها أكواد.
  size int  := least(greatest(coalesce(p_page_size, 25), 1), 200);
  pg   int  := greatest(coalesce(p_page, 1), 1);
  term text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform private.require_admin();
  return query
    with filtered as (
      select c.*
        from public.access_codes c
       where term is null
          or c.label ilike '%' || term || '%'
          or c.created_reason ilike '%' || term || '%'
          or c.created_by ilike '%' || term || '%'
    )
    select f.id,
           f.label,
           -- الحالة مشتقّة لا مخزَّنة: مخزَّنةً كانت ستشيخ بصمت عند الانتهاء.
           --
           -- ⚠️ **المفردات هي مفردات `20260822120002` حرفًا بحرف** ولا تُجدَّد.
           -- الصيغة الأولى هنا سمّتها `active/exhausted/scheduled` — أوصاف أدقّ
           -- بالإنجليزية، وكارثة عمليًّا: `CodeStatus` في العميل و`codeStatus`
           -- في القاموسين يعرفون أربع قيم فقط (`issued`/`redeemed`/`expired`/
           -- `disabled`)، فكل صفٍّ كان سيصل الشاشة بحالةٍ **لا ترجمة لها**.
           -- توسيع مفردات عقدٍ قائم ليس تحسينًا بل كسرٌ صامت لطرفه الآخر.
           case
             when not f.enabled                                      then 'disabled'
             when f.expires_at is not null and f.expires_at <= now() then 'expired'
             when f.redemption_count >= f.max_redemptions            then 'redeemed'
             else 'issued'
           end,
           f.duration_days,
           f.max_redemptions,
           f.redemption_count,
           f.starts_at,
           f.expires_at,
           f.created_by,
           f.created_reason,
           f.created_at,
           f.updated_by,
           f.updated_at,
           (select max(l.redeemed_at) from public.access_code_redemptions l where l.code_id = f.id),
           -- `null` للأكواد السابقة لـ20260824120004 — **غيابٌ يُقال لا صفرٌ
           -- يُختلق**: صفرٌ هنا يعني «بلا إنتروبيا إطلاقًا» وهو ادّعاء كاذب.
           f.entropy_ceiling_bits,
           f.generated_server_side,
           (select count(*) from filtered)
      from filtered f
     order by f.created_at desc
     limit size offset (pg - 1) * size;
end;
$$;

revoke all on function public.founder_code_page(text, int, int) from public, anon;
grant execute on function public.founder_code_page(text, int, int) to authenticated;

  $qimmah_mig_20260824120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120004', '20260824120004_activation_hardening.sql');
end
$qimmah_mig_20260824120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120005_campaign_is_not_a_credential.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120005_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120005') then
    raise notice 'تخطٍّ: 20260824120005_campaign_is_not_a_credential.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120005$
-- ═══════════════════════════════════════════════════════════════════════════
-- [STAGING-COMMISSIONING §8] الحملة اسمٌ، والكود سرّ — ولا يجتمعان في حقل واحد
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ═══ القرار الذي تنفّذه هذه الهجرة ═══
-- حكم المؤسس، حرفيًّا: «لا تدع سلاسل ضعيفة مقروءة مثل `RAMADAN2345` تعمل
-- مباشرةً كأسرار Premium. إن احتاجت الحملات أسماءً مقروءة فالنموذج:
-- حملة = RAMADAN، وتُولَّد تحتها أكواد فردية قوية. لا تخلط **وسم الحملة**
-- بـ**بيانات الاعتماد الحاملة**.»
--
-- وهذا يغلق `F-5` — آخر عيب بقي مفتوحًا في `COMMERCE-ADMIN-THREAT-MODEL.md`،
-- وكان مرفوعًا هناك صراحةً بوصفه **قرار عمل لا قرار وكيل**. وقد صدر القرار.
--
-- ═══ الثقب مقيسٌ لا مُتوهَّم ═══
-- على PostgreSQL 16 حقيقي بالهجرات الإحدى والثلاثين من قاعدة نظيفة: أصدر
-- المؤسس الحرفَ `RAMADAN2345` (٣٠ يومًا · ٥٠٠ استهلاك)، **واستبدله مستخدمان
-- غير مترابطين** فنال كلٌّ منهما وصولًا مدفوعًا كاملًا. و`specialAccessActive`
-- في العميل تكافئ `premiumActive` في الفتح — أي أن كودًا يُخمَّن بقاموس في
-- ثوانٍ كان يفتح التطبيق المدفوع بأكمله.
--
-- ═══ ولماذا لا جدول حملات جديد ═══
-- **الحملة موجودة أصلًا**: `access_codes.label` هو حقلها، ووثيقة المعمارية
-- تقولها نصًّا («A campaign is an `access_codes` row (`label` + `duration_days`)»)،
-- وتعليق العمود نفسه يقول `campaign / influencer`، وقاموسا الواجهة يسمّيانه
-- «الحملة». فإنشاء جدول `campaigns` هنا كان سيصنع **سلطة ثانية** لمفهوم قائم —
-- وهو بالضبط ما يمنعه التكليف (§17). لا يتغيّر المخطّط؛ يتغيّر **من يملك حقّ
-- اختيار السرّ**.
--
-- ═══ وشكل التغيير: استبدالٌ لا حِمل زائد ═══
-- ⚠️ إضافة وسيط بقيمة افتراضية إلى `founder_issue_access_code` **لا تستبدلها
-- بل تُنشئ حِملًا ثانيًا**، فيصير النداء القديم `function ... is not unique`.
-- مقيسٌ على staging لا مفترَض. ولذلك: التوقيع السداسي يبقى **حرفيًّا كما هو**،
-- والإصدار الدفعيّ يأتي باسمٍ جديد فوق **نواة مشتركة** — لا نسختين تتباعدان.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١) النواة: موضع الإصدار الوحيد ────────────────────────────────────────
/**
 * كل ما كان داخل `founder_issue_access_code` ينتقل هنا حرفيًّا، ويضاف إليه
 * شيئان: **أرضية الإنتروبيا** و**سدّ تسريب البصمة**. والمدخلان العامّان
 * (المفرد والدفعيّ) يستدعيانها، فلا يوجد تنفيذان للإصدار يتباعدان بتحرير —
 * نفس مبدأ `private.redeem_core`.
 *
 * ولا تفحص هذه النواة الدور: الفحص يبقى في المدخل العامّ حيث كان، كي لا
 * يتغيّر اسم الخطأ الذي تعتمده الاختبارات (`founder_role_required`).
 */
create or replace function private.issue_code_core(
  p_reason          text,
  p_label           text,
  p_duration_days   int,
  p_max_redemptions int,
  p_expires_at      timestamptz,
  p_code            text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_code   text;
  normalized text;
  ver        int;
  new_id     uuid;
  actor      text;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_issue_access_code: reason required' using errcode = '22023';
  end if;
  if coalesce(p_duration_days, 0) < 1 or p_duration_days > 3650 then
    raise exception 'founder_issue_access_code: duration out of range' using errcode = '22023';
  end if;
  if coalesce(p_max_redemptions, 0) < 1 then
    raise exception 'founder_issue_access_code: max redemptions must be >= 1' using errcode = '22023';
  end if;

  -- ══ أرضية الإنتروبيا — الحكم نفسه، منفَّذًا ══
  --
  -- الوسيط `p_code` **يبقى في التوقيع** (نزعه يكسر النداءات القائمة ويُنشئ
  -- حِملًا)، ويصير رفضه **مسمّى**: من يمرّر حرفًا يُقال له أين يضع اسم حملته
  -- بدل أن يُترك يخمّن. والرسالة تحمل الجواب لا اللوم (§6).
  --
  -- ولماذا رفضٌ تامّ لا «أرضية طول»: حرفٌ من ستّة عشر رمزًا يكتبه إنسان ليس
  -- عشوائيًّا — `QIMMAHRAMADAN25` يبلغ الأرضية طولًا وإنتروبيته الفعلية قريبة
  -- من الصفر. **الطول ليس عشوائية**، والفرق بينهما هو العيب كلّه.
  if nullif(btrim(coalesce(p_code, '')), '') is not null then
    raise exception 'code_must_be_generated: a campaign is a label (p_label), not a secret; leave p_code null'
      using errcode = '22023';
  end if;

  raw_code   := private.generate_access_code(16);   -- ٨٠ بتًا
  normalized := private.normalize_access_code(raw_code);
  ver        := private.active_pepper_version();
  actor      := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  -- ══ وسدّ تسريبٍ صغير كان يعيد ما يحجبه الجدول ══
  -- تصادم `code_hash` كان يخرج `unique_violation` ومعه **البصمة المملّحة** في
  -- `DETAIL` — وهي القيمة التي تحرص `founder_code_page` على ألّا تعيدها أبدًا.
  -- تُبتلع هنا وتُستبدل باسمٍ عامّ. (والتصادم في ٨٠ بتًا لا يُذكر — و«لا يُذكر»
  -- ليست «مستحيل».)
  begin
    insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                     expires_at, max_redemptions, created_by, created_reason,
                                     entropy_ceiling_bits, generated_server_side)
    values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
            p_expires_at, p_max_redemptions, actor, btrim(p_reason),
            char_length(normalized) * 5, true)
    returning access_codes.id into new_id;
  exception when unique_violation then
    raise exception 'code_already_exists' using errcode = '23505';
  end;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', char_length(normalized) * 5,
    'generated',       true,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function private.issue_code_core(text,text,int,int,timestamptz,text)
  from public, anon, authenticated;

comment on function private.issue_code_core(text,text,int,int,timestamptz,text) is
  'موضع الإصدار الوحيد. يرفض أي كود حرفي (code_must_be_generated) ويولّد ١٦ رمزًا = ٨٠ بتًا.';

-- ── ٢) المدخل المفرد: نفس التوقيع، نفس اسم الخطأ، نواةٌ واحدة ──────────────
create or replace function public.founder_issue_access_code(
  p_reason          text,
  p_label           text default null,
  p_duration_days   int  default 14,
  p_max_redemptions int  default 1,
  p_expires_at      timestamptz default null,
  p_code            text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.require_founder();
  return private.issue_code_core(p_reason, p_label, p_duration_days,
                                 p_max_redemptions, p_expires_at, p_code);
end;
$$;

revoke all on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  from public, anon;
grant execute on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  to authenticated;

-- ── ٣) الإصدار الدفعيّ — بدونه لا يستطيع المؤسس تشغيل حملة أصلًا ──────────
/**
 * ═══ لماذا هذا **ليس** ميزة إضافية بل شرطُ صحّة للقرار أعلاه ═══
 * قبل هذه الهجرة كانت الحملة تُدار بكودٍ واحد مقروء و`max_redemptions = 500`.
 * وبعد أرضية الإنتروبيا يصير الكود الواحد عشوائيًّا — لكنه **يبقى سرًّا واحدًا
 * يتقاسمه خمسمئة إنسان**: يكفي أن ينشره واحد لينتهي. ونموذج المؤسس المُعلَن
 * «أكواد فردية قوية تحت اسم حملة» يحتاج مُصدِرًا دفعيًّا — وإلا فُرِض عليه
 * خمسمئة نداء أو العودة إلى السرّ المتقاسَم. فمنعُ الأول بلا إتاحة الثاني
 * يبدو إحكامًا وهو دفعٌ إلى الحيلة.
 *
 * **اسمٌ جديد لا وسيط جديد**: إضافة `p_count` إلى الدالّة القائمة تُنشئ حِملًا
 * زائدًا (مقيس)، فيصير النداء السداسي القائم في العميل ملتبسًا. والاسم الجديد
 * لا يمسّ عقد العميل الحالي بحرف.
 *
 * والحدّ ٥٠٠ في النداء الواحد: سقفٌ يمنع نداءً واحدًا يقفل الجدول طويلًا.
 */
create or replace function public.founder_issue_code_batch(
  p_reason          text,
  p_label           text default null,
  p_duration_days   int  default 14,
  p_max_redemptions int  default 1,
  p_expires_at      timestamptz default null,
  p_count           int  default 1
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n     int;
  i     int;
  one   jsonb;
  codes jsonb := '[]'::jsonb;
begin
  perform private.require_founder();
  n := coalesce(p_count, 1);
  if n < 1 or n > 500 then
    raise exception 'batch_count_out_of_range' using errcode = '22023';
  end if;
  for i in 1 .. n loop
    one := private.issue_code_core(p_reason, p_label, p_duration_days,
                                   p_max_redemptions, p_expires_at, null);
    codes := codes || jsonb_build_array(one -> 'code');
  end loop;
  -- ⚠️ الأكواد الخام هنا **آخر مرّة تظهر فيها** — كما في المفرد تمامًا.
  return jsonb_build_object(
    'label',           p_label,
    'count',           n,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', 80,
    'codes',           codes,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int)
  from public, anon;
grant execute on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int)
  to authenticated;

comment on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int) is
  'حملة = وسم واحد (p_label) فوق أكواد فردية مولَّدة. الأكواد تعود مرّة واحدة ولا تُستعاد.';

-- ── ٤) صدق رقم القوّة: سقفٌ لا يكذب ───────────────────────────────────────
/**
 * `entropy_ceiling_bits = char_length × 5` بلا حدّ أعلى كان يقول عن كودٍ
 * **أضعف** إنه **أقوى**: أربعون رمزًا من حرف واحد مكرّر تُبلِّغ ٢٠٠ بتًا
 * وإنتروبيتها صفر. والرقم يظهر في وحدة تحكّم المؤسس، فيقرأ ضعفًا قوّةً.
 *
 * والمسار المولَّد صار وحده على الطريق العامّ (البند ١)، فطوله ١٦ دائمًا
 * وسقفه ٨٠ صادق. يبقى `admin_create_access_code` — مسار مفتاح الخادم — يقبل
 * حرفًا، فيتوقّف عن **ادّعاء رقم**: `null` تعني «لا نعرف»، وتعرضها الواجهة
 * «قوّته ما تُقاس» بنصّها القائم.
 *
 * ⚠️ **ولا يُفرَض عليه أرضية — والسبب يُصحَّح هنا لأن أوّل صياغةٍ له كانت خطأً.**
 *
 * كُتب أوّلًا أن الأرضية هنا «زينة» لأن حامل مفتاح الخادم «يملك القاعدة أصلًا
 * ويستطيع `insert` مباشرةً». **وهذا غير صحيح، ومقيس:** محاولة إدراج مباشر
 * في `public.access_codes` بدور `service_role` تُردّ
 * `permission denied for schema private` — لأن البصمة تحتاج
 * `private.hash_identity`، والملح يعيش في مخطَّط لا يبلغه ذلك الدور. أي أن
 * هذه الدالّة **بوّابة حقيقية لا واجهة**، وأرضيةٌ فيها كانت ستعني شيئًا.
 *
 * فالسبب الباقي **تشغيليّ مُعلَن لا أمنيّ**: نحو عشرين تأكيدًا داخل البوّابة
 * يزرع أكوادًا حرفية قصيرة عبر هذا المسار، وفرضُ الأرضية هنا يعيد كتابة أطقم
 * إثباتٍ لا علاقة لها بقرار الحملات. والمسار **لا يبلغه متصفّح إطلاقًا**
 * (`service_role` وحده، ويحرس غيابَه من الحزمة `test:attack-bundle`)، فمن
 * يسلكه يفعله بمفتاح خادمٍ وقصدٍ صريح لا بالخطأ.
 *
 * ⚠️ **وهذا الفرق يُرفَع للمؤسس ولا يُحسم هنا:** حكمُه يمنع السلاسل المقروءة
 * أن تعمل أسرارًا، وهذا المسار ما زال يقبلها لحامل مفتاح الخادم. إغلاقه قرارٌ
 * كلفتُه إعادة كتابة تلك التأكيدات — والكلفة تُقال لصاحب القرار لا تُقرَّر عنه.
 */
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
  -- نفس سدّ التسريب الذي في النواة، وللسبب نفسه: `unique_violation` الخام
  -- تحمل **البصمة المملّحة** في `DETAIL`. وأثرها هنا أخفّ (مفتاح الخادم يملك
  -- القاعدة أصلًا) — لكن **اختلاف السلوك بين مدخلين هو ما يُنسى ويُستغَلّ**،
  -- فيتطابقان.
  begin
    insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                     expires_at, max_redemptions, created_by, created_reason,
                                     entropy_ceiling_bits, generated_server_side)
    values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
            p_expires_at, p_max_redemptions, p_created_by, p_created_reason,
            -- **الغياب يُقال ولا يُخترَع رقم**: طولُ حرفٍ يكتبه إنسان لا يشهد
            -- لعشوائيته، فلا يُحوَّل إلى «بتّات» تُقرأ شهادةَ قوّة.
            null, false)
    returning access_codes.id into id;
  exception when unique_violation then
    raise exception 'code_already_exists' using errcode = '23505';
  end;
  return id;
end;
$$;

revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;

-- ── ٥) وأرضية المولّد نفسه ترتفع ٬١٢ ⇐ ٬١٦ ────────────────────────────────
/**
 * الافتراض كان ١٢ رمزًا (٦٠ بتًا) والرفع يعيش في موضع النداء وحده — أي أن أي
 * مستدعٍ قادم ينسى تمرير ١٦ يقع على ٦٠ بتًا صامتة. الافتراض الآمن يُنقل إلى
 * **الدالّة**، والحدّ الأدنى معه: ما دون ١٦ يُرفض باسمه بدل أن يُرفَع بصمت،
 * فلا يظنّ مستدعٍ أنه نال ما طلب.
 * (لا مستدعي خارجيّ اليوم: الدالّة ممنوحة للمالك وحده — مقيس.)
 */
create or replace function private.generate_access_code(p_symbols int default 16)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  n        int := coalesce(p_symbols, 16);
  out_code text := '';
  buf      bytea;
  i        int;
  b        int;
begin
  if n < 16 then
    raise exception 'code_entropy_floor: 16 symbols (80 bits) is the minimum' using errcode = '22023';
  end if;
  if n > 24 then n := 24; end if;
  while char_length(out_code) < n loop
    buf := uuid_send(gen_random_uuid());
    for i in 0..15 loop
      -- ⚠️ البايتان ٦ و٨ يحملان بتّات نسخة/نوع ثابتة — تجاوزهما شرط صدق العدّ.
      continue when i = 6 or i = 8;
      exit when char_length(out_code) >= n;
      b := get_byte(buf, i);
      -- 256 على 32 بلا باقٍ ⇒ توزيع منتظم تمامًا، بلا انحياز modulo.
      out_code := out_code || substr(alphabet, (b % 32) + 1, 1);
    end loop;
  end loop;
  return out_code;
end;
$$;

revoke all on function private.generate_access_code(int) from public, anon, authenticated;

comment on function private.generate_access_code(int) is
  'أرضية ١٦ رمزًا = ٨٠ بتًا. ما دونها يُرفض باسمه لا يُرفَع بصمت.';

  $qimmah_mig_20260824120005$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120005', '20260824120005_campaign_is_not_a_credential.sql');
end
$qimmah_mig_20260824120005_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120006_gateway_network_limit.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120006_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120006') then
    raise notice 'تخطٍّ: 20260824120006_gateway_network_limit.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120006$
-- ═══════════════════════════════════════════════════════════════════════════
-- [STAGING-COMMISSIONING §7] حدّ الشبكة — الطبقة التي تعجز عنها القاعدة وحدها
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ═══ الحقيقة البنيوية التي فرضت هذا التصميم ═══
-- **القاعدة لا ترى عنوان الشبكة إطلاقًا.** مسحُ الهجرات الاثنتين والثلاثين لا
-- يجد `inet_client_addr` ولا `x-forwarded-for` ولا نظيرًا. ولذلك حدّ الاسترداد
-- القائم مربوط ببصمة **البريد**، وأثره مقيس: ثلاثة حسابات جديدة × اثنتا عشرة
-- محاولة ⇒ ٣٠ بلغت فحص الكود و٦ مخنوقة. أي أن الحدّ يصمد داخل الحساب، وثمن
-- تصفيره حسابٌ ببريد مؤكَّد.
--
-- والتوصية السابقة — «قاعدة Cloudflare أمام Supabase REST» — **مستحيلة**:
-- المتصفّح يطلب `<ref>.supabase.co` مباشرةً، ونطاقُه ليس نطاقنا. فالموضع
-- الوحيد الذي تملكه قِمّة هو كودٌ تكتبه: طرفية `qimmah-gateway`.
--
-- ═══ وتقسيمُ العمل بين الطرفية والقاعدة ═══
-- الطرفية وحدها تملك **العنوان**. والقاعدة وحدها تملك **حالةً مشتركة تدوم**:
-- الطرفيات عابرة ومتعدّدة النسخ، فعدّادٌ في ذاكرتها يُصفَّر بنسخة جديدة ولا
-- يُشارَك بين النسخ — حارسٌ لا يُطلق. فكلٌّ يقدّم ما لا يملكه الآخر.
--
-- ⚠️ **وحدُّ هذه الهجرة معلَن:** الدوالّ تبقى ممنوحة لـ`authenticated`، فمن
-- ينادي PostgREST مباشرةً يتخطّى هذه الطبقة. ونزعُ المنحة كان سيوجب تمرير
-- معرّف المستخدم وسيطًا — أي **سلطة هوية ثانية** يمنعها التكليف (§17).
-- فالضمان الحقيقي يبقى في القاعدة (إنتروبيا ٨٠ بتًا · تجربة لكل هوية قانونية ·
-- حدّ لكل بريد · تأكيد بريد)، وهذه **طبقةٌ في العمق لا سورٌ حول القلعة**.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١) دفتر محاولات الشبكة ────────────────────────────────────────────────
/**
 * العنوان يُخزَّن **مجزّأً بالملح نفسه** لا نصًّا. وعنوان IP بيان شخصي في
 * كثير من الولايات، وتسريب قاعدة يسرّب خريطة «من طلب ماذا ومتى». والتجزئة
 * تكفي تمامًا للغرض: الحدّ يحتاج **مساواة** لا قراءة.
 */
create table if not exists private.gate_attempts (
  ip_hash      text        not null,
  hash_version int         not null,
  action       text        not null,
  attempted_at timestamptz not null default now()
);

create index if not exists gate_attempts_window
  on private.gate_attempts (ip_hash, action, attempted_at desc);

revoke all on private.gate_attempts from public, anon, authenticated;

comment on table private.gate_attempts is
  'محاولات لكل عنوان شبكة — مجزّأة بالملح. تكتبها الطرفية عبر gate_admit وحدها.';

-- ── ٢) القرار: سماحٌ أو منع، وتسجيلٌ في الحالتين ─────────────────────────
/**
 * ⚠️ **يُسجَّل الطلب قبل الحكم لا بعده.** لو سجّلنا المسموح وحده لصار المهاجم
 * الذي بلغ حدّه غيرَ مُحصىً بعد بلوغه — فيتجدّد له الحدّ بمجرّد مرور النافذة
 * ولو ظلّ يطرق كل ثانية. التسجيل أوّلًا يجعل النافذة **متدحرجة فعلًا**.
 *
 * والتنظيف داخل نفس النداء: صفوفٌ أقدم من يومٍ تُحذف، فلا يحتاج الجدول وظيفة
 * دورية لا وجود لها في هذه البيئة (ولا نَعِد بواحدة).
 */
create or replace function public.gate_admit(p_ip text, p_action text, p_max int)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ver int;
  h   text;
  n   int;
  lim int := greatest(coalesce(p_max, 20), 1);
begin
  if coalesce(btrim(p_ip), '') = '' or coalesce(btrim(p_action), '') = '' then
    -- **فشلٌ مغلق**: بلا عنوان أو فعل لا قياس، ولا تمرير بلا قياس.
    return 'deny';
  end if;
  ver := private.active_pepper_version();
  h   := private.hash_identity('ip:' || btrim(p_ip), ver);

  -- ⚠️ **مقصورٌ على المفتاح الذي يُفحَص الآن** لا كنسٌ عامّ للجدول.
  -- وحارس `schema-rls-proof` يمنع أي `delete` غير مقصور في هذا المجلّد — وهو
  -- محقّ: حذفٌ عامّ في هجرة هو كيف تُمسح بيانات مستخدمين بسطرٍ لا ينتبه له أحد.
  -- والقصر هنا كافٍ: صفوف مفتاحٍ لا يُنادى مرّة أخرى لا تدخل أي حساب.
  delete from private.gate_attempts
   where ip_hash = h and attempted_at < now() - interval '24 hours';

  insert into private.gate_attempts (ip_hash, hash_version, action)
  values (h, ver, btrim(p_action));

  select count(*) into n
    from private.gate_attempts a
   where a.ip_hash = h
     and a.action = btrim(p_action)
     and a.attempted_at > now() - interval '1 hour';

  return case when n > lim then 'deny' else 'allow' end;
end;
$$;

-- ⚠️ **للخادم وحده.** لو نالها العميل لاستطاع حرقَ حدِّ عنوانٍ آخر بإغراقه
-- (منعُ خدمةٍ موجَّه)، أو استنزافَ حدّ نفسه بلا مرور بالبوّابة.
revoke all on function public.gate_admit(text, text, int) from public, anon, authenticated;
grant execute on function public.gate_admit(text, text, int) to service_role;

comment on function public.gate_admit(text, text, int) is
  'حدّ لكل عنوان شبكة لكل فعل، نافذة ساعة متدحرجة. تناديها الطرفية بمفتاح الخدمة وحدها.';

  $qimmah_mig_20260824120006$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120006', '20260824120006_gateway_network_limit.sql');
end
$qimmah_mig_20260824120006_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260826120001_founder_code_batches.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260826120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260826120001') then
    raise notice 'تخطٍّ: 20260826120001_founder_code_batches.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260826120001$
-- ============================================================================
-- [ADMIN-CONV] عرض الحملات — الوسم يُقرأ مجمّعًا، لا كودًا كودًا
-- ============================================================================
-- بعد `20260824120005` صارت الحملة **وسمًا فوق أكواد فردية مولَّدة** (حكم
-- المؤسس: «حملة = RAMADAN، وتُولَّد تحتها أكواد قوية»). فسؤال المؤسس التشغيلي
-- تغيّر شكله: لم يعد «ما حال هذا الكود؟» بل **«ما حال هذه الحملة؟»** — كم صدر
-- تحتها، كم استُهلك، كم بقي حيًّا، وكم عُطِّل. وصفحة الأكواد تجيب كودًا كودًا،
-- فخمسمئة صفّ لا تُقرأ حملةً.
--
-- ═══ لماذا قراءة تجميع لا جدول حملات ═══
-- نفس قرار `20260824120005` حرفيًّا: **الحملة موجودة أصلًا** — هي
-- `access_codes.label`. جدول `campaigns` كان سيصنع سلطة ثانية لمفهوم قائم.
-- فالتجميع هنا `group by label` على الجدول الواحد، والحالة تُشتقّ بوقت
-- القاعدة كما في `founder_code_page` — لا عمود مخزَّن يشيخ.
--
-- ═══ عقد الإرجاع ═══
-- لكل وسم أربعة أعداد: صادر (كل ما أُنشئ) · مستبدَل (استُنفدت استخداماته) ·
-- متبقٍ (مفعَّل وغير مستنفَد وغير منتهٍ) · معطَّل. **ولا بصمة ولا كود خام** —
-- نفس قاعدة صفحة الأكواد. والوسم `null` صفّ مستقل لا يُطوى: أكواد بلا حملة
-- حقيقةٌ تُعرض باسمها («بلا وسم») لا تُخفى.
-- ============================================================================

create or replace function public.founder_code_batches(p_limit int default 100)
returns table (
  label            text,
  codes_issued     bigint,
  codes_redeemed   bigint,
  codes_remaining  bigint,
  codes_disabled   bigint,
  last_issued_at   timestamptz
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
           -- «متبقٍ» = ما يستطيع مستخدم استهلاكه الآن فعلًا: مفعَّل، وغير
           -- مستنفَد، وغير منتهٍ. الشروط الثلاثة معًا — شرطان يكذبان.
           count(*) filter (where c.enabled
                              and c.redemption_count < c.max_redemptions
                              and (c.expires_at is null or c.expires_at > now())),
           count(*) filter (where not c.enabled),
           max(c.created_at)
      from public.access_codes c
     group by c.label
     order by max(c.created_at) desc
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

-- نفس نمط بقيّة القراءات: `anon` لا ينفّذ، و`authenticated` ينفّذ ثم يُردّ من
-- داخل الجسم إن لم يكن إداريًّا — طبقتان لا واحدة.
revoke all on function public.founder_code_batches(int) from public, anon;
grant execute on function public.founder_code_batches(int) to authenticated;

comment on function public.founder_code_batches(int) is
  'الحملات مجمّعة بالوسم: صادر/مستبدَل/متبقٍ/معطَّل. لا بصمة ولا كود خام.';

  $qimmah_mig_20260826120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260826120001', '20260826120001_founder_code_batches.sql');
end
$qimmah_mig_20260826120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260826120002_founder_snapshot_signed_in_today.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260826120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260826120002') then
    raise notice 'تخطٍّ: 20260826120002_founder_snapshot_signed_in_today.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260826120002$
-- ============================================================================
-- [ADMIN-CONV] «من دخل اليوم؟» — مفتاح واحد جديد في لقطة اللوحة
-- ============================================================================
-- اللقطة تجيب «سجّلوا دخول ٧ أيام / ٣٠ يومًا» ولا تجيب **اليوم** — وهو أول
-- سؤال يسأله مؤسس يفتح لوحته صباحًا. والمصدر موجود في الدالة نفسها أصلًا:
-- `riyadh_start` محسوبة لعدّ «حسابات اليوم»، و`auth.users.last_sign_in_at`
-- مقروء لعدّ الأسبوع. فالإضافة مفتاح واحد يقرن الاثنين.
--
-- ⚠️ **ولا عدّاد محذوفين هنا عمدًا**: حذف الحساب يمحو صفّه من `auth.users`
-- و`profiles` معًا، فلا مصدر يُعدّ منه — واختراع رقم من فرق لقطات هو بالضبط
-- «رقم لا نعرف من أين جاء». بناء سجلّ حذف بلا PII قرار مؤسس مرفوع في
-- `docs/product/ADMIN-DASHBOARD-DECISIONS.md`.
--
-- ═══ لماذا الجسد منسوخ كاملًا لا مرقوعًا ═══
-- نفس عقد المستودع (رأس `20260824120002` يشرحه): `test:migration-order` يشترط
-- أن يطابق جسمُ كل دالّة حيّة **آخر ملفٍ يعرّفها نصًّا**. فالملف الأخير يحمل
-- النسخة النهائية كاملة، واختصارها رقعةً ديناميكية يجعل الحيّ لا يطابق أي ملف.
--
-- ⇐ منقولة حرفيًّا من `20260824120002_founder_operations_reads.sql`، والزيادة
--    الوحيدة مفتاح `signedInToday` في كتلة `activity`.
-- ============================================================================

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
  perform private.require_admin();

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
      -- [ADMIN-CONV] «اليوم» بيوم الرياض نفسه الذي تُعدّ به الحسابات الجديدة —
      -- مقياسان بنافذتين مختلفتين في شاشة واحدة يقرآن تناقضًا وهميًّا.
      'signedInToday', (select count(*) from auth.users u where u.last_sign_in_at >= riyadh_start),
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
                          and (c.expires_at is null or c.expires_at > now())),
      -- ── [ADMIN-R4] حالة الـwebhook والمنح اليدوية ──
      'webhookProcessed', (select count(*) from public.salla_webhook_events s
                            where s.classification = 'processed'),
      'webhookPending',   (select count(*) from public.salla_webhook_events s
                            where s.classification in ('received','verified')),
      'grantsManual',     (select count(*) from public.entitlements e where e.source = 'manual')
      -- ⚠️ **`webhookRetried` غير موجود هنا عمدًا**: لا عمود محاولات في الجدول.
      --    الحدث المُعاد يصل ببصمة مطابقة فيُصنَّف `duplicate` — وذلك ليس
      --    «إعادة محاولة». إخراج عدد التكرارات باسم «أُعيدت محاولتها» كذبٌ
      --    بالتسمية، والواجهة تُبقيه «غير مقيس» ولا تراه صفرًا.
    )
  ) into out_json;

  return out_json;
end;
$$;

-- الصلاحيات تُعاد **صراحةً** مع كل إعادة تعريف (عرف 20260822120003): البيان
-- المكرّر أرخص من افتراض غير مفحوص عن قاعدةٍ لم تُطبَّق عليها السوابق بترتيبها.
revoke all on function public.founder_executive_snapshot() from public, anon;
grant execute on function public.founder_executive_snapshot() to authenticated;

  $qimmah_mig_20260826120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260826120002', '20260826120002_founder_snapshot_signed_in_today.sql');
end
$qimmah_mig_20260826120002_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '6/9'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  5                                                  as expected,
  case when count(*) filter (where m.version is not null) = 5
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260824120004'), ('20260824120005'), ('20260824120006'), ('20260826120001'), ('20260826120002')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;
