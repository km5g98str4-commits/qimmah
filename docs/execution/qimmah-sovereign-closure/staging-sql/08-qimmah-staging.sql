-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 8/8
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
--   · 20260829120001_purchase_credentials.sql
--   · 20260830120001_premium_authority_hardening.sql
--   · 20260831120001_purchase_batch_disable.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260829120001_purchase_credentials.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260829120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260829120001') then
    raise notice 'تخطٍّ: 20260829120001_purchase_credentials.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260829120001$
-- ============================================================================
-- [COMMERCE-W1] صكّ الشراء — الكود يُطبع بغرضه، وسلطة Premium تبقى واحدة
-- ============================================================================
-- تكليف المؤسس (QIMMAH FINAL — WAVE 1): سلة في V1 **قناة دفع وتسليم فقط** —
-- تسلّم المشتري كودًا فريدًا وُلِّد عندنا مسبقًا، وقِمّة وحدها سلطة الصلاحية
-- والاسترداد والهوية والدوام والسحب. لا OAuth ولا webhook ولا قراءة حالة دفع
-- في مسار V1 (الـwebhook القائم يُحفظ كما هو بنيةً مؤجَّلة لـV2 ولا يُحذف).
--
-- ═══ القرار المعماري: توسيع الأصل القائم، لا أصل ثانٍ ═══
-- بديلان عُرضا في التكليف: (أ) توسيع `access_codes` بغرضٍ منمَّط، أو
-- (ب) أصل «صكوك شراء» مستقلّ. اختير (أ) لأن كل ضمانة يطلبها التكليف قائمةٌ
-- ومُهاجَمة على الأصل الحالي: توليد ٨٠ بتًا خادميًّا (20260824120005) ·
-- تخزين بصمة لا نصًّا (20260806120001) · قفل صفّ + قيد بنيوي للتزامن ·
-- سجلّ استرداد ينجو من حذف الحساب · حدّ معدّل (20260824120001) · ختم بوّابة
-- (20260827120004) · تعطيل إداري وأثر تدقيق. أصلٌ ثانٍ كان يعني نسخ هذه
-- السلسلة كلّها ومضاعفة سطح الهجوم — وهو بعينه ما يمنعه مبدأ «سلطة واحدة
-- لا اثنتان تتباعدان» (§0.2).
--
-- ═══ التقارب مع V2 — سلطة شراء واحدة ═══
-- استرداد صكّ الشراء **يكتب `purchase_ledger`** (provider = 'purchase_code'،
-- provider_order_id = معرّف الكود) — وهو نفس السجلّ الذي يكتبه webhook سلة
-- (provider = 'salla') والمنح اليدوي (provider = 'manual'). فحين يحيا الـwebhook
-- في V2 يتقارب على **نفس** سلطة Premium: `claim_pending_grants` تقرأ السجلّ
-- الواحد، والاسترجاع بعد حذف الحساب يعمل للقنوات الثلاث بلا كود جديد.
--
-- ═══ لماذا provider = 'purchase_code' لا 'salla' ═══
-- صدق تشغيلي: بلا webhook لا تملك قِمّة **دليلًا** أن الكود مرّ بسلة فعلًا —
-- تملك دليلًا أن صكّ شراء وُلِّد عندنا واستُردّ. التسمية تقول ما نعلمه فقط،
-- والحملة (SALLA-LAUNCH-001) تعيش في `label` كما قرّر المؤسس للحملات.
--
-- ═══ تغيير مبدأ مُعلَن — يُسمّى ولا يُمرَّر صامتًا ═══
-- `20260822120002` قرّرت: «المؤسس من المتصفّح يفتح بابًا موقوتًا قابلًا للسحب،
-- ومفتاح الخادم وحده يفتح بابًا دائمًا». هذه الهجرة تُدخل استثناءً محسوبًا:
-- المتصفّح يُصدر **صكًّا حاملًا** لا منحة مباشرة — الصكّ يجب أن يُستردّ من
-- حساب مُوثَّق، وهو مفرد الاستخدام، ومرئي بالعدّ في اللوحة، وقابل للتعطيل قبل
-- الاسترداد وللسحب بعده (`admin_revoke`). جلسة مؤسس مخترقة كانت أصلًا تُصدر
-- أكواد ٣٦٥٠ يومًا × ٥٠٠ — فالحدّ الأمني الفعلي لم يتغيّر، والمسار البديل
-- (مفتاح الخادم بيد المؤسس لكل دفعة سلة) أخطر تشغيليًّا من المتصفّح المُدوَّر.
--
-- idempotent · forward-only · لا هجرة سابقة تُحرَّر · لا إسقاط لأي بيانات.
-- الأكواد التاريخية كلّها تُوسم `special` بالافتراض — **لا إعادة تفسير صامتة**.
-- ============================================================================

-- ── ١) الغرض المنمَّط + قيود الشكل البنيوية ────────────────────────────────
alter table public.access_codes
  add column if not exists grant_purpose text not null default 'special';

comment on column public.access_codes.grant_purpose is
  'special = وصول موقوت (duration_days) · purchase = صكّ شراء يمنح Premium دائمًا. الافتراض special فلا يُعاد تفسير كود تاريخي.';

alter table public.access_codes drop constraint if exists access_codes_purpose;
alter table public.access_codes add constraint access_codes_purpose
  check (grant_purpose in ('special', 'purchase'));

-- صكّ الشراء مفرد الاستخدام **بنيويًّا** — لا قاعدة عمل أقوى معتمدة (التكليف).
alter table public.access_codes drop constraint if exists access_codes_purchase_single_use;
alter table public.access_codes add constraint access_codes_purchase_single_use
  check (grant_purpose <> 'purchase' or max_redemptions = 1);

-- صكّ الشراء بلا مدّة، والموقوت لا يكون بلا مدّة — التكافؤ لا التلميح.
-- (قيد المدى القائم access_codes_duration_days_check يمرّ على NULL بطبيعة CHECK.)
alter table public.access_codes alter column duration_days drop not null;
alter table public.access_codes drop constraint if exists access_codes_purpose_duration_shape;
alter table public.access_codes add constraint access_codes_purpose_duration_shape
  check ((grant_purpose = 'purchase') = (duration_days is null));

-- ── ٢) مفردات السجلّ والمنحة تتّسع للقناة الجديدة ──────────────────────────
-- `purchase_ledger.provider`: 'purchase_code' = صكّ استُردّ داخل قِمّة.
alter table public.purchase_ledger drop constraint if exists purchase_ledger_provider_check;
alter table public.purchase_ledger add constraint purchase_ledger_provider_check
  check (provider in ('salla', 'manual', 'purchase_code'));

-- `entitlements.source` يتبعه: `claim_pending_grants` تكتب source = provider
-- السجلّ حرفيًّا، فغياب القيمة هنا كان سيُفشل الاسترجاع بعد أول استرداد صكّ.
alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements add constraint entitlements_source_check
  check (source in ('none', 'trial', 'code', 'salla', 'manual', 'purchase_code'));

-- ── ٣) سلطة المنح الواحدة لمسار الصكّ ──────────────────────────────────────
-- موضع واحد يكتب أثر الشراء ويرفع المنحة — يستدعيه الاسترداد الأول وإعادة
-- المحاولة كليهما، فلا نسختان تتباعدان (نفس مبدأ redeem_core/issue_code_core).
create or replace function private.grant_premium_from_code(
  p_user_id uuid, p_email text, p_code_id uuid, p_label text,
  p_email_hash text, p_hash_version int
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- أثر الشراء الدائم — بلا user_id، ينجو من حذف الحساب (نفس عقد الجدول).
  -- المبلغ NULL عمدًا: بلا webhook لا نعلم ما دُفع في سلة — الغياب يُقال
  -- ولا يُخترع رقم (§5). القيد الفريد (provider, provider_order_id) هو
  -- الحزام الثاني ضدّ ازدواج المنح تحت أي سباق.
  insert into public.purchase_ledger (provider, provider_order_id, email_hash,
                                      hash_version, amount_minor, raw, recorded_by, source_event)
  values ('purchase_code', p_code_id::text, p_email_hash, p_hash_version, null,
          jsonb_build_object('code_id', p_code_id, 'label', p_label),
          -- الفاعل هو مسار الاسترداد نفسه بهوية مستردّه — لا شراء مجهول المصدر.
          'redeem:' || p_user_id::text, null)
  on conflict (provider, provider_order_id) do nothing;

  -- Premium دائم: no_expiry=true وexpires_at=null (قيد entitlements_premium_shape).
  -- لا لمس لـrevoked_at: الإلغاء لاصق ولا يرفعه مسار خدمة ذاتية — والمُلغى
  -- أصلًا لا يبلغ هذا الموضع (is_access_revoked يرفض قبله).
  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activation_code_id, activated_at, expires_at, no_expiry)
  values (p_user_id, p_email, 'premium', 'purchase_code', p_code_id, now(), null, true)
  on conflict (user_id) do update
    set entitlement_type = 'premium', source = 'purchase_code',
        activation_code_id = excluded.activation_code_id,
        activated_at = excluded.activated_at, expires_at = null, no_expiry = true;
end;
$$;

revoke all on function private.grant_premium_from_code(uuid, text, uuid, text, text, int)
  from public, anon, authenticated;

comment on function private.grant_premium_from_code(uuid, text, uuid, text, text, int) is
  'الموضع الوحيد الذي يحوّل صكّ شراء إلى Premium: purchase_ledger ثم رفع المنحة. يستدعيه الاسترداد وإعادة المحاولة معًا.';

-- ── ٤) redeem_core — الجسد الحيّ (من 20260827120004→20260824120004) + فرع الصكّ ──
-- الزيادات ثلاث لا رابع لها، وما عداها منقول حرفيًّا:
--   ① فحص «الاستنفاد» فُصل عن كتلة الصلاحية — نفس الخطأ بنفس الترتيب الظاهر
--      للموقوت، لكن الفصل يتيح للفرع ② أن يسبقه.
--   ② **إعادة محاولة الصكّ مقنَّعة لا معاقَبة**: هوية استردّت هذا الصكّ
--      (المعاملة أُثبتت والردّ ضاع في الشبكة) تنال 'premiumActive' قيمةً لا
--      استثناء 'code_already_redeemed' — العقد يطلب أن تكون إعادة المحاولة
--      بعد المهلة آمنة، والمستخدم دفع فلا يُقال له «كودك مستهلك». سلوك
--      الموقوت **لم يُمسّ**: نفس الرسائل حرفيًّا.
--   ③ بعد الكتابة: صكّ الشراء يمنح Premium عبر السلطة الواحدة (البند ٣)
--      ويعيد 'premiumActive'؛ والموقوت يسلك مساره القديم حرفًا بحرف.
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

revoke all on function private.redeem_core(text) from public, anon, authenticated;

-- ── ٥) نواة الإصدار تتعلّم الغرض — والنواة تبقى واحدة ──────────────────────
-- المنطق الكامل ينتقل إلى نواة عارفة بالغرض، و`issue_code_core` القديمة تصير
-- غلافًا حرفيًّا فوقها بغرض 'special' — فلا يوجد مُصدِران يتباعدان بتحرير.
-- (توقيع القديمة لا يُمسّ: تغييره يُنشئ حِملًا ثانيًا — مقيس في 20260824120005.)
create or replace function private.issue_credential_core(
  p_purpose         text,
  p_reason          text,
  p_label           text,
  p_duration_days   int,
  p_max_redemptions int,
  p_expires_at      timestamptz
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
  if p_purpose not in ('special', 'purchase') then
    raise exception 'issue_credential_core: unknown purpose %', coalesce(p_purpose, '<null>')
      using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_issue_access_code: reason required' using errcode = '22023';
  end if;

  -- شكل الغرض يُفرض هنا قبل الإدراج — فالخطأ يصل باسمه لا باسم قيد CHECK.
  if p_purpose = 'purchase' then
    if p_duration_days is not null then
      raise exception 'purchase_credential_has_no_duration' using errcode = '22023';
    end if;
    if coalesce(p_max_redemptions, 0) <> 1 then
      raise exception 'purchase_credential_is_single_use' using errcode = '22023';
    end if;
  else
    if coalesce(p_duration_days, 0) < 1 or p_duration_days > 3650 then
      raise exception 'founder_issue_access_code: duration out of range' using errcode = '22023';
    end if;
    if coalesce(p_max_redemptions, 0) < 1 then
      raise exception 'founder_issue_access_code: max redemptions must be >= 1' using errcode = '22023';
    end if;
  end if;

  -- التوليد خادميّ دائمًا — ١٦ رمزًا = ٨٠ بتًا (أرضية 20260824120005).
  raw_code   := private.generate_access_code(16);
  normalized := private.normalize_access_code(raw_code);
  ver        := private.active_pepper_version();
  actor      := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  -- نفس سدّ تسريب البصمة: تصادم unique يخرج باسم عامّ لا بـDETAIL يحمل الهاش.
  begin
    insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                     expires_at, max_redemptions, created_by, created_reason,
                                     entropy_ceiling_bits, generated_server_side, grant_purpose)
    values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
            p_expires_at, p_max_redemptions, actor, btrim(p_reason),
            char_length(normalized) * 5, true, p_purpose)
    returning access_codes.id into new_id;
  exception when unique_violation then
    raise exception 'code_already_exists' using errcode = '23505';
  end;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'grant_purpose',   p_purpose,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', char_length(normalized) * 5,
    'generated',       true,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function private.issue_credential_core(text, text, text, int, int, timestamptz)
  from public, anon, authenticated;

comment on function private.issue_credential_core(text, text, text, int, int, timestamptz) is
  'موضع الإصدار الوحيد لكل الأغراض. توليد خادمي ١٦ رمزًا = ٨٠ بتًا دائمًا؛ شكل الغرض يُفرض باسمه.';

-- الغلاف القديم — التوقيع السداسي حرفيًّا، رفض الكود الحرفي باسمه كما كان،
-- والتفويض إلى النواة العارفة بالغرض. لا مستدعٍ يتغيّر.
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
begin
  if nullif(btrim(coalesce(p_code, '')), '') is not null then
    raise exception 'code_must_be_generated: a campaign is a label (p_label), not a secret; leave p_code null'
      using errcode = '22023';
  end if;
  return private.issue_credential_core('special', p_reason, p_label,
                                       p_duration_days, p_max_redemptions, p_expires_at);
end;
$$;

revoke all on function private.issue_code_core(text, text, int, int, timestamptz, text)
  from public, anon, authenticated;

comment on function private.issue_code_core(text, text, int, int, timestamptz, text) is
  'غلاف توافق فوق issue_credential_core بغرض special. يرفض أي كود حرفي (code_must_be_generated).';

-- ── ٦) الإصدار الدفعيّ لصكوك الشراء — مخزون سلة يُولَّد هنا ────────────────
-- **الوسم إلزامي**: مخزون شراء بلا اسم دفعة لا يُدقَّق ولا يُحصى. النموذج:
-- SALLA-LAUNCH-001 وسمًا، وتحته صكوك فردية قوية — نفس نموذج الحملات المُعلَن.
create or replace function public.founder_issue_purchase_batch(
  p_reason     text,
  p_label      text,
  p_count      int default 1,
  p_expires_at timestamptz default null
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
  if nullif(btrim(coalesce(p_label, '')), '') is null then
    raise exception 'purchase_batch_label_required' using errcode = '22023';
  end if;
  n := coalesce(p_count, 1);
  if n < 1 or n > 500 then
    raise exception 'batch_count_out_of_range' using errcode = '22023';
  end if;
  for i in 1 .. n loop
    one := private.issue_credential_core('purchase', p_reason, btrim(p_label),
                                         null, 1, p_expires_at);
    codes := codes || jsonb_build_array(one -> 'code');
  end loop;
  -- ⚠️ الصكوك الخام هنا **آخر مرّة تظهر فيها** — التصدير لسلة يقع الآن أو لا يقع.
  return jsonb_build_object(
    'label',           btrim(p_label),
    'grant_purpose',   'purchase',
    'count',           n,
    'max_redemptions', 1,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', 80,
    'codes',           codes,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.founder_issue_purchase_batch(text, text, int, timestamptz)
  from public, anon;
grant execute on function public.founder_issue_purchase_batch(text, text, int, timestamptz)
  to authenticated;

comment on function public.founder_issue_purchase_batch(text, text, int, timestamptz) is
  'دفعة صكوك شراء لمخزون سلة: وسم إلزامي، مفردة الاستخدام، Premium دائم عند الاسترداد. الخام يعود مرّة واحدة.';

-- ── ٧) قراءات المؤسس: عدّ صادق لا يدّعي علم ما لا نعلم ─────────────────────
-- حملات الوصول الموقوت تُفرز عن مخزون الشراء — الخلط كان سيقرأ «متبقٍ» على
-- صكوك لا نعلم أهي في مخزون سلة أم بيد مشترٍ لم يفعّل بعد.
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
           count(*) filter (where c.enabled
                              and c.redemption_count < c.max_redemptions
                              and (c.expires_at is null or c.expires_at > now())),
           count(*) filter (where not c.enabled),
           max(c.created_at)
      from public.access_codes c
     -- [COMMERCE-W1] هذه القراءة للحملات الموقوتة حصرًا؛ مخزون الشراء له
     -- founder_purchase_batches بمفرداته الصادقة. سلوكها على كل صفّ تاريخي
     -- مطابق حرفيًّا (كل الأكواد قبل هذه الهجرة special بالافتراض).
     where c.grant_purpose = 'special'
     group by c.label
     order by max(c.created_at) desc
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.founder_code_batches(int) from public, anon;
grant execute on function public.founder_code_batches(int) to authenticated;

comment on function public.founder_code_batches(int) is
  'الحملات الموقوتة مجمّعة بالوسم (special حصرًا). مخزون الشراء في founder_purchase_batches.';

/**
 * عدّ دفعات الشراء — **بمفردات لا تكذب**:
 *   codes_unredeemed = صادر ولم يُستردّ ولم يُعطَّل ولم تنته نافذته.
 *   ⚠️ بلا webhook لا تعلم قِمّة أين هذا الصكّ: في مخزون سلة، أم سُلِّم
 *   لمشترٍ لم يفعّل بعد، أم انكشف في مكان آخر. فالاسم «غير مستردّ» لا
 *   «متبقٍ في سلة» — التكليف يمنع الادّعاء الثاني إلا بدليل من سلة.
 * الأعمدة الأربعة (مستردّ · معطَّل غير مستردّ · منتهٍ غير مستردّ · غير
 * مستردّ) تقسم «الصادر» قسمة تامّة — فالجمع يُدقَّق ولا يتقاطع.
 */
create or replace function public.founder_purchase_batches(p_limit int default 100)
returns table (
  label                     text,
  codes_issued              bigint,
  codes_redeemed            bigint,
  codes_disabled_unredeemed bigint,
  codes_expired_unredeemed  bigint,
  codes_unredeemed          bigint,
  last_issued_at            timestamptz,
  last_redeemed_at          timestamptz
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
               and c2.label is not distinct from c.label)
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
  'مخزون صكوك الشراء بالوسم: صادر/مستردّ/معطَّل/منتهٍ/غير مستردّ. «غير مستردّ» لا يدّعي مكان الصكّ — لا دليل بلا webhook.';

-- ── ٨) صفحة الأكواد ترى الغرض — والمفردات القائمة لا تُمسّ ─────────────────
-- إعادة إعلان حرفية لنسخة 20260824120004، بعمود `grant_purpose` يُضاف قبل
-- `total_rows` لا غير. مفردات الحالة الأربع (issued/redeemed/expired/disabled)
-- **كما هي** — توسيعها كسر صامت لعقد العميل (التحذير الموثّق داخلها).
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
  entropy_ceiling_bits int,
  generated_server_side boolean,
  grant_purpose    text,
  total_rows       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
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
           f.entropy_ceiling_bits,
           f.generated_server_side,
           f.grant_purpose,
           (select count(*) from filtered)
      from filtered f
     order by f.created_at desc
     limit size offset (pg - 1) * size;
end;
$$;

revoke all on function public.founder_code_page(text, int, int) from public, anon;
grant execute on function public.founder_code_page(text, int, int) to authenticated;

-- ── ٩) تحقّق ذاتي (§4.2) — البنية أُنشئت، والمقصود لم يُمسّ، والشكل يُهاجَم ──
do $$
declare
  probe_id uuid;
begin
  -- (أ) العمود والقيود موجودة بأسمائها المتعاقَد عليها.
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'access_codes'
                    and column_name = 'grant_purpose') then
    raise exception 'commerce-w1 incomplete: grant_purpose column missing';
  end if;
  if to_regprocedure('private.grant_premium_from_code(uuid, text, uuid, text, text, int)') is null
     or to_regprocedure('private.issue_credential_core(text, text, text, int, int, timestamptz)') is null
     or to_regprocedure('public.founder_issue_purchase_batch(text, text, int, timestamptz)') is null
     or to_regprocedure('public.founder_purchase_batches(int)') is null then
    raise exception 'commerce-w1 incomplete: a purchase-credential function is missing';
  end if;

  -- (ب) المفردات اتّسعت فعلًا — لا اكتفاءً بنيّة التوسيع.
  if (select pg_get_constraintdef(oid) from pg_constraint
       where conname = 'purchase_ledger_provider_check') not like '%purchase_code%' then
    raise exception 'commerce-w1 incomplete: purchase_ledger provider vocabulary not extended';
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
       where conname = 'entitlements_source_check') not like '%purchase_code%' then
    raise exception 'commerce-w1 incomplete: entitlements source vocabulary not extended';
  end if;

  -- (جـ) هجوم الشكل: صكّ شراء بمدّة أو بتعدّد استخدام **يُرفض بنيويًّا**.
  begin
    insert into public.access_codes (code_hash, hash_version, duration_days,
                                     max_redemptions, created_by, created_reason, grant_purpose)
    values ('selfcheck-' || gen_random_uuid()::text, 1, 14, 1, 'selfcheck', 'shape attack', 'purchase');
    raise exception 'commerce-w1 shape hole: purchase credential accepted a duration';
  exception
    when check_violation then null; -- المطلوب: قيد الشكل أطلق باسمه
  end;
  begin
    insert into public.access_codes (code_hash, hash_version, duration_days,
                                     max_redemptions, created_by, created_reason, grant_purpose)
    values ('selfcheck-' || gen_random_uuid()::text, 1, null, 3, 'selfcheck', 'shape attack', 'purchase');
    raise exception 'commerce-w1 shape hole: purchase credential accepted multi-use';
  exception
    when check_violation then null;
  end;
  -- والموقوت بلا مدّة يُرفض كذلك — التكافؤ من طرفيه.
  begin
    insert into public.access_codes (code_hash, hash_version, duration_days,
                                     max_redemptions, created_by, created_reason, grant_purpose)
    values ('selfcheck-' || gen_random_uuid()::text, 1, null, 1, 'selfcheck', 'shape attack', 'special');
    raise exception 'commerce-w1 shape hole: special code accepted null duration';
  exception
    when check_violation then null;
  end;
  -- والشكل الصحيح يمرّ — بوابة ترفض كل شيء ليست بوابة. ثم يُمحى الأثر.
  insert into public.access_codes (code_hash, hash_version, duration_days,
                                   max_redemptions, created_by, created_reason, grant_purpose)
  values ('selfcheck-' || gen_random_uuid()::text, 1, null, 1, 'selfcheck', 'shape probe', 'purchase')
  returning id into probe_id;
  delete from public.access_codes where id = probe_id;

  -- (د) الجسد الحيّ موصول: redeem_core يعرف الغرض ويستدعي السلطة الواحدة.
  if (select prosrc from pg_proc where oid = 'private.redeem_core(text)'::regprocedure)
        not like '%grant_premium_from_code%' then
    raise exception 'commerce-w1 incomplete: redeem_core lacks the purchase branch';
  end if;

  -- (هـ) التأكيد المضادّ: قراءة الحملات لم تعد تخلط المخزونين، وقراءة المخزون
  -- لا تدّعي «متبقّيًا في سلة» (لا عمود بهذا الادّعاء أصلًا).
  if (select prosrc from pg_proc where oid = 'public.founder_code_batches(int)'::regprocedure)
        not like '%grant_purpose = ''special''%' then
    raise exception 'commerce-w1 incomplete: founder_code_batches still mixes purchase inventory';
  end if;

  -- (و) المنح المقصودة لم تُمسّ، والنواة الخاصّة محجوبة عن أدوار العميل.
  -- منحُ الإصدار الدفعيّ ابنُ هذه الهجرة، فوجوده مضمون هنا.
  if not has_function_privilege('authenticated', 'public.founder_issue_purchase_batch(text, text, int, timestamptz)', 'execute') then
    raise exception 'commerce-w1 overreach: founder batch issuance lost its grant';
  end if;
  if has_function_privilege('anon', 'public.founder_issue_purchase_batch(text, text, int, timestamptz)', 'execute') then
    raise exception 'commerce-w1 overreach: anon can reach purchase issuance';
  end if;
  -- ⚠️ الدالّتان أدناه تُنشئهما هجرات **سابقة**، لا هذه. فحصُ «لم نسحب منحتهما»
  -- يُحرَس بوجودهما: في السلسلة الكاملة تُوجَدان فيُنفَّذ الفحص، وفي بيئة
  -- counter-proof تستبعد سلفهما (مثل redeem_access_code_v2 حين تُستبعَد هجرة
  -- حدّ المعدّل) لا منحةَ لهما تُفقَد أصلًا — فالتخطّي هنا صحّةٌ لا تراخٍ.
  if to_regprocedure('public.redeem_access_code_v2(text)') is not null
     and not has_function_privilege('authenticated', 'public.redeem_access_code_v2(text)', 'execute') then
    raise exception 'commerce-w1 overreach: redeem_access_code_v2 lost its grant';
  end if;
  if to_regprocedure('public.my_entitlement()') is not null
     and not has_function_privilege('authenticated', 'public.my_entitlement()', 'execute') then
    raise exception 'commerce-w1 overreach: my_entitlement lost its grant';
  end if;
end;
$$;

  $qimmah_mig_20260829120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260829120001', '20260829120001_purchase_credentials.sql');
end
$qimmah_mig_20260829120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260830120001_premium_authority_hardening.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260830120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260830120001') then
    raise notice 'تخطٍّ: 20260830120001_premium_authority_hardening.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260830120001$
-- ════════════════════════════════════════════════════════════════════════════
-- [COMMERCE-W1-HARDENING] سلطة Premium — عطلان مقيسان على الأرض، لا مراجعةُ نصّ
-- ════════════════════════════════════════════════════════════════════════════
-- forward-only: لا هجرة سابقة تُحرَّر، ولا بيانات تُحذف.
--
-- ① [P0 · إيراد] صكّ شراء واحد يمنح Premium دائمًا **بلا حدّ** بإعادة تدوير
--    البريد — والمؤسس لا يرى شيئًا.
--
--    مُقاس على عنقود حقيقي بكل الهجرات (failed=0):
--      credential BL9X4PR95KJ6TWS3
--      u1 يستردّ                       ⇒ premiumActive
--      update auth.users set email=…   (العنوان يتحرّر)
--      u2 يسجّل العنوان ويستردّ نفسه   ⇒ premiumActive
--      منح Premium دائمة حيّة          = ٢
--      عدّاد الصكّ                      = 1/1
--      founder_purchase_batches        = issued 1 · redeemed 1 · unredeemed 0
--    فالازدواج **غير مرئيّ في كل قراءات المؤسس**، ويتكرّر بلا حدّ.
--
--    السبب: فرعا الشراء (إعادة المحاولة في `redeem_core`، وفرع
--    `claim_pending_grants`) يتعرّفان على «صاحب الشراء» **ببصمة البريد** لا
--    بالحساب. وهذا **مقصود وصحيح** — به ينجو الشراء من حذف الحساب (PDPL يمحو
--    صفّ المنحة، فيسترجعه صاحبه بعد التسجيل). لكنّ الربط بالبريد وحده يجعل
--    **من يملك العنوان لاحقًا** يملك الشراء.
--
--    فالثابت الصحيح ليس «لا ربط بالبريد» بل:
--        **شراءٌ واحد ⇒ منحة Premium حيّة واحدة على الأكثر، في كل لحظة.**
--    وهو يُبقي المسار المشروع كما هو (بعد الحذف لا صفّ حيّ ⇒ الاسترجاع يعمل)،
--    ويسدّ إعادة التدوير (الصفّ الأول ما زال حيًّا ⇒ الثاني مرفوض).
--
--    ويُنفَّذ **بنيويًّا لا بفحصٍ مشروط**: `if exists` يتسابق (اتصالان لا يريان
--    أحدهما الآخر)، والفهرس الفريد يفرضه المحرّك.
--
-- ② [P1 · صدق الحالة] «Premium لا تُخفَّض» كانت **تُدَّعى ولا تُقاس تحت التزامن**.
--    `start_trial` وفرع الكود الموقوت يقرآن الحالة ثم يكتبان، و`do update`
--    فيهما **بلا `where`** — فمنحةُ Premium تُلحق بينهما تُدهَس:
--      before: trial|trial                     A: premiumActive · B: specialAccessActive
--      after : special|code|expires=+14d       my_entitlement ⇒ specialAccessActive
--    ووقع بلا أي تلاعب: ١ من ٣٠ جولة على اتصالين مستقلّين.
--    والأسوأ أثرًا فرع التجربة: بعد ٧٢ ساعة يقرأ المشتري `trialExpired` ويُقفل
--    عليه — وهو مالكُ Premium دائمة.
--
--    والعلاج **مانعٌ عند الجدول لا عند كل كاتب**: كاتبٌ واحد يُنسى يعيد العطل،
--    وهذه الهجرة نفسها تضيف كتّابًا. فالحارس مُشغِّل `before update` يرفض أي
--    هبوط عن Premium حيّة **مهما كان الكاتب** — حاضرًا كان أو قادمًا.
-- ════════════════════════════════════════════════════════════════════════════

-- ── ① ربط المنحة بشرائها + الفريد البنيوي ──────────────────────────────────
alter table public.entitlements
  add column if not exists purchase_ledger_id uuid references public.purchase_ledger(id);

comment on column public.entitlements.purchase_ledger_id is
  'الشراء الذي وُلدت منه هذه المنحة. الفهرس الفريد أدناه يجعل الشراء الواحد منحةً حيّة واحدة — سدُّ إعادة تدوير البريد.';

-- سدّ استباقي لأي صفّ قائم: يربط كل منحة شراء بسجلّها عبر بصمة البريد.
-- (لا شيء في الإنتاج اليوم — الهجرة APPLY_PENDING — لكن السدّ يجعلها آمنة
--  على أي قاعدة سبقتها، ولا يعتمد على فراغها.)
update public.entitlements e
   set purchase_ledger_id = p.id
  from public.purchase_ledger p
 where e.purchase_ledger_id is null
   and e.entitlement_type = 'premium'
   and p.email_hash in (select ih.email_hash from private.identity_hashes(e.email) ih);

-- الحزام: شراءٌ واحد ⇒ منحة Premium واحدة. الصفّ المحذوف (PDPL) يحرّر الشراء
-- لصاحبه — والصفّ الحيّ يمنع غيره. **لا استثناء للملغى**: شراءٌ استُهلك يبقى
-- مستهلَكًا، ورفعُ الحظر فعلُ مؤسس لا مسار خدمة ذاتية.
create unique index if not exists entitlements_one_live_premium_per_purchase
  on public.entitlements (purchase_ledger_id)
  where entitlement_type = 'premium' and purchase_ledger_id is not null;

-- ── ② مانع الهبوط عن Premium — عند الجدول، لكل كاتب ────────────────────────
create or replace function private.entitlements_block_premium_downgrade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Premium حيّة لا تُستبدل بأضعف منها. الإلغاء ليس هبوطًا (النوع يبقى premium
  -- ويُضبط revoked_at)، والحذف ليس هبوطًا (DELETE لا يمرّ هنا).
  if old.entitlement_type = 'premium'
     and old.revoked_at is null
     and new.entitlement_type is distinct from 'premium' then
    -- لا استثناء يُرفع: الكاتب المتسابق يظنّ أنه كتب، والحقيقة الحيّة
    -- (`my_entitlement`) تبقى premiumActive — والعميل يعيد قراءتها بعد كل
    -- استرداد. الرفض الصامت هنا **يحفظ المدفوع**؛ والاستثناء كان سيُسقط
    -- استردادًا مشروعًا لكود موقوت يملكه صاحب Premium أصلًا.
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
  'يمنع هبوط منحة Premium حيّة إلى trial/special مهما كان الكاتب — سدُّ سباق القراءة-ثمّ-الكتابة في start_trial وفرع الكود الموقوت.';

-- ── ③ السلطة الواحدة تسجّل شراءها ──────────────────────────────────────────
-- الجسد منقول من 20260829120001 بزيادتين: ربط `purchase_ledger_id`، وتحويل
-- انتهاك الفريد إلى `invalid_code` — نفس رسالة المجهول، فلا يصير الردّ عرّافًا
-- يميّز «صكّ قائم لغيري» عن «صكّ لا وجود له».
create or replace function private.grant_premium_from_code(
  p_user_id uuid, p_email text, p_code_id uuid, p_label text,
  p_email_hash text, p_hash_version int
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ledger_id uuid;
begin
  insert into public.purchase_ledger (provider, provider_order_id, email_hash,
                                      hash_version, amount_minor, raw, recorded_by, source_event)
  values ('purchase_code', p_code_id::text, p_email_hash, p_hash_version, null,
          jsonb_build_object('code_id', p_code_id, 'label', p_label),
          'redeem:' || p_user_id::text, null)
  on conflict (provider, provider_order_id) do nothing
  returning id into ledger_id;

  if ledger_id is null then
    select id into ledger_id from public.purchase_ledger
     where provider = 'purchase_code' and provider_order_id = p_code_id::text;
  end if;

  begin
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry,
                                     purchase_ledger_id)
    values (p_user_id, p_email, 'premium', 'purchase_code', p_code_id, now(), null, true, ledger_id)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = 'purchase_code',
          activation_code_id = excluded.activation_code_id,
          activated_at = excluded.activated_at, expires_at = null, no_expiry = true,
          purchase_ledger_id = excluded.purchase_ledger_id;
  exception when unique_violation then
    -- الشراء له منحة حيّة على حسابٍ آخر: إعادة تدوير عنوان، لا إعادة محاولة.
    raise exception 'invalid_code' using errcode = '22023';
  end;
end;
$$;
revoke all on function private.grant_premium_from_code(uuid, text, uuid, text, text, int)
  from public, anon, authenticated;

comment on function private.grant_premium_from_code(uuid, text, uuid, text, text, int) is
  'الموضع الوحيد الذي يحوّل صكّ شراء إلى Premium: purchase_ledger ثم رفع المنحة مربوطةً بشرائها. شراءٌ واحد ⇒ منحة حيّة واحدة.';

-- ── ④ تحقّق ذاتيّ: الهجرة تفشل إن لم تُركَّب سدودها ────────────────────────
do $$
begin
  if to_regclass('public.entitlements_one_live_premium_per_purchase') is null then
    raise exception 'hardening incomplete: unique index missing';
  end if;
  if not exists (select 1 from pg_trigger
                  where tgname = 'entitlements_block_premium_downgrade'
                    and tgrelid = 'public.entitlements'::regclass) then
    raise exception 'hardening incomplete: downgrade trigger missing';
  end if;
  if (select prosrc from pg_proc where oid = 'private.grant_premium_from_code(uuid,text,uuid,text,text,int)'::regprocedure)
       not like '%purchase_ledger_id%' then
    raise exception 'hardening incomplete: grant does not bind its purchase';
  end if;
end $$;

  $qimmah_mig_20260830120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260830120001', '20260830120001_premium_authority_hardening.sql');
end
$qimmah_mig_20260830120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260831120001_purchase_batch_disable.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260831120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260831120001') then
    raise notice 'تخطٍّ: 20260831120001_purchase_batch_disable.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260831120001$
-- ═══════════════════════════════════════════════════════════════════════════
-- [WAVE3-SALLA-PREP] إطفاء دفعة صكوك الشراء — وسدّ فجوة تدقيق الإطفاء المفرد
--
-- ═══ لماذا هذه الهجرة شرطٌ قبل رفع أي دفعة حقيقية إلى سلة ═══
-- ملفّ التصدير هو النصوص الخام كلّها في ملفّ واحد. تسرُّبه (مشاركة خاطئة،
-- جهاز مخترق، بريد غالط) يعني ٥٠٠ صكّ مكشوف — والاستجابة الوحيدة اليوم إطفاءٌ
-- صكًّا صكًّا: خمسمئة عملية يدوية في منتصف حادثة. هذه الهجرة تجعل الاستجابة
-- نداءً واحدًا ذرّيًّا.
--
-- ═══ الثوابت الحاكمة (نصّ اعتماد المؤسس — Wave 3 Part A/C) ═══
--   ١) يطال **غير المستردّ فقط** — بنفس مسند «غير مستردّ» في
--      `founder_purchase_batches` حرفيًّا، فالزرّ والعدّاد لا يفترقان أبدًا.
--   ٢) Premium الممنوح لمشترٍ شرعي **لا يُمسّ**: `private.derive_state` تقرأ
--      صفّ المنحة وحده ولا تعود إلى `access_codes` إطلاقًا — فالإطفاء بنيويًّا
--      عاجز عن سحب منحة. (ولسحب حسابٍ بعينه: `founder_revoke_access` القائمة.)
--   ٣) للمؤسس وحده (`require_founder`)، والدعم قارئ لا كاتب.
--   ٤) **اتجاه واحد**: لا `p_enabled`، ولا دالّة تمكين دفعيّ — تمكينُ دفعةٍ
--      مخترقة من متصفّحٍ هو بذاته أداة منحٍ جماعي، فيبقى خارج المتصفّح عمدًا
--      كما بقي `admin_grant_premium` (قرار 20260822120002 نفسه).
--
-- ═══ ولماذا لا يشمل «المنتهي غير المستردّ» ═══
-- مسند العدّاد يفصل الأقسام فصلًا تامًّا، والمنتهي قسمٌ ثالث يرفضه
-- `redeem_core` بفحص `expires_at` بنيويًّا — إطفاؤه لا يضيف أمانًا، وضمُّه
-- كان سيجعل `disabled_count` أكبر من رقم «غير مستردّ» الذي يراه المؤسس لحظة
-- الضغط، فيُقرأ الفارق عطلًا.
--
-- ═══ التزامن — لماذا يكفي READ COMMITTED ═══
-- `redeem_core` يقفل صفّ الصكّ بـ`for update`، وUPDATE الدفعة يقفل كل صفّ
-- يمسّه. أيّهما سبق حَجَب الآخر، وعند فكّ الحجب يُعاد تقييم المسند على الصفّ
-- الطازج (EvalPlanQual):
--   • الاسترداد سبق ⇒ العدّاد ارتفع ⇒ مسند الدفعة يُسقط الصفّ ⇒ المنحة تبقى.
--   • الإطفاء سبق ⇒ الاسترداد يقرأ `enabled=false` ⇒ `invalid_code` ولا منحة.
-- لا حالة هجينة في الاتجاهين — ويقيسها `attack-purchase-race` على عنقود حقيقي.
--
-- ═══ فجوة التدقيق المسدودة (Part B) ═══
-- `founder_set_code_enabled` كانت **تشترط** `p_reason` ثم **ترميه**: تكتب
-- `enabled/updated_by/updated_at` فقط، وسطر `created_reason = c.created_reason`
-- إسنادٌ ذاتيّ بلا أثر. فمؤسسٌ يطفئ صكًّا في حادثة لا يستطيع غدًا أن يجيب
-- «لماذا؟». تُسدّ بثلاثة أعمدة على الصفّ نفسه — وهو نمط التدقيق القائم في هذا
-- المخطط (`entitlements.revoked_reason` · `revocation_ledger`)، لا نظام تدقيق
-- عامّ لا يحتاجه سطحٌ بهذا الحجم.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ① أعمدة التدقيق — مَن ومتى ولماذا، على الصفّ المُطفأ نفسه ──────────────
alter table public.access_codes add column if not exists disabled_reason text;
alter table public.access_codes add column if not exists disabled_at timestamptz;
alter table public.access_codes add column if not exists disabled_by text;

comment on column public.access_codes.disabled_reason is
  'سبب آخر إطفاء — يُكتب مع كل إطفاء (مفرد أو دفعيّ) ويُمحى عند إعادة التمكين المفرد كي لا يبقى سببٌ بائت على صفّ حيّ.';
comment on column public.access_codes.disabled_at is 'لحظة آخر إطفاء بساعة القاعدة.';
comment on column public.access_codes.disabled_by is 'فاعل آخر إطفاء بصيغة founder:<uuid> — من require_founder لا من مدخل عميل.';

-- ── ② سدّ الفجوة الحيّة: الإطفاء المفرد يحفظ سببه ─────────────────────────
-- الشكل الراجع يبقى متوافقًا ({id, enabled})؛ الإضافة إضافة لا استبدال.
create or replace function public.founder_set_code_enabled(
  p_code_id uuid, p_enabled boolean, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor text;
  row_after record;
begin
  perform private.require_founder();

  if p_code_id is null then
    raise exception 'founder_set_code_enabled: code id required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_set_code_enabled: reason required' using errcode = '22023';
  end if;

  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  update public.access_codes c
     set enabled = coalesce(p_enabled, false),
         updated_by = actor,
         updated_at = now(),
         -- الإطفاء يُدوَّن؛ وإعادة التمكين تمحو أثر إطفاءٍ لم يعد قائمًا —
         -- سببٌ بائت على صفّ حيّ يُقرأ حالةً وهو تاريخ.
         disabled_reason = case when coalesce(p_enabled, false) then null else btrim(p_reason) end,
         disabled_at     = case when coalesce(p_enabled, false) then null else now() end,
         disabled_by     = case when coalesce(p_enabled, false) then null else actor end
   where c.id = p_code_id
  returning c.id, c.enabled into row_after;

  if not found then
    raise exception 'founder_set_code_enabled: no such code' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', row_after.id, 'enabled', row_after.enabled);
end;
$$;

-- ── ③ إطفاء الدفعة — اتجاه واحد، غير المستردّ فقط، عدّ صادق ────────────────
create or replace function public.founder_disable_purchase_batch(
  p_label text, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor text;
  n int;
  batch_exists boolean;
begin
  perform private.require_founder();

  if coalesce(btrim(p_label), '') = '' then
    raise exception 'founder_disable_purchase_batch: label required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_disable_purchase_batch: reason required' using errcode = '22023';
  end if;

  -- وسمٌ لا دفعة له خطأ مسمّى لا «صفر» — الصفر جوابُ دفعةٍ استُهلكت، لا جوابُ
  -- خطأ إملائي في منتصف حادثة.
  select exists (
    select 1 from public.access_codes
     where grant_purpose = 'purchase' and label = btrim(p_label)
  ) into batch_exists;
  if not batch_exists then
    raise exception 'founder_disable_purchase_batch: no such batch' using errcode = 'P0002';
  end if;

  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  -- المسند = «غير مستردّ» في `founder_purchase_batches` **حرفيًّا**:
  --   redemption_count < max_redemptions AND enabled AND (لا انتهاء أو لم يحن)
  -- فالرقم الراجع هو نفسه الرقم الذي كان معروضًا في عمود «غير مستردّ».
  update public.access_codes c
     set enabled = false,
         updated_by = actor,
         updated_at = now(),
         disabled_reason = btrim(p_reason),
         disabled_at = now(),
         disabled_by = actor
   where c.grant_purpose = 'purchase'
     and c.label = btrim(p_label)
     and c.redemption_count < c.max_redemptions
     and c.enabled
     and (c.expires_at is null or c.expires_at > now());
  get diagnostics n = row_count;

  return jsonb_build_object('label', btrim(p_label), 'disabled_count', n, 'disabled_at', now());
end;
$$;

comment on function public.founder_disable_purchase_batch(text, text) is
  'مِفتاح إطفاء الدفعة — اتجاه واحد (يسحب ولا يمنح)، غير المستردّ فقط، وPremium الممنوح لا يُمسّ بنيويًّا. لا نظير تمكينٍ دفعيّ عمدًا.';

revoke all on function public.founder_disable_purchase_batch(text, text) from public, anon;
grant execute on function public.founder_disable_purchase_batch(text, text) to authenticated;

-- ── ④ تحقّق ذاتيّ — الهجرة تفشل إن رخُصت سدودها ────────────────────────────
do $$
declare
  src text;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'access_codes'
                    and column_name = 'disabled_reason') then
    raise exception 'wave3 incomplete: disabled_reason column missing';
  end if;

  src := (select prosrc from pg_proc where oid = 'public.founder_set_code_enabled(uuid,boolean,text)'::regprocedure);
  if src not like '%disabled_reason%' then
    raise exception 'wave3 incomplete: single-code disable still discards its reason';
  end if;

  -- ⚠️ لا فحص `prosrc LIKE '%require_founder%'` هنا **عمدًا**: بيئة التأكيد
  -- المضادّ في `test:admin-db` تنزع سطور البوّابة من كل الهجرات لتثبت أن
  -- المنع كان منها — وفحصٌ نصّي هنا يُفجّر تلك البيئة المقصودة. البوّابة
  -- مُثبتة **سلوكيًّا** في ثلاثة أطقم: `purchase-credential` ⑩ (الدعم يُردّ
  -- باسمه) · `admin-db` (كل فعل require_founder + محاكاة عبث) · `admin-codes`.
  src := (select prosrc from pg_proc where oid = 'public.founder_disable_purchase_batch(text,text)'::regprocedure);
  if src not like '%redemption_count < c.max_redemptions%' then
    raise exception 'wave3 incomplete: batch disable predicate does not exclude redeemed rows';
  end if;
  if src like '%enabled = true%' then
    raise exception 'wave3 incomplete: batch function must never enable';
  end if;

  -- ⚔️ الاتجاه الواحد بنيويًّا: لا دالّة عامّة تحمل «تمكين دفعة» بأي اسم.
  if exists (
    select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.proname ~ '(enable|activate).*(batch|bulk)|(batch|bulk).*(enable|activate)'
  ) then
    raise exception 'wave3 violation: a public mass-enable primitive exists';
  end if;
end $$;

  $qimmah_mig_20260831120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260831120001', '20260831120001_purchase_batch_disable.sql');
end
$qimmah_mig_20260831120001_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '8/8'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  3                                                  as expected,
  case when count(*) filter (where m.version is not null) = 3
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260829120001'), ('20260830120001'), ('20260831120001')) as v(version)
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
--            client_rpcs = 6 · legacy_open = 0 · migrations = 44
