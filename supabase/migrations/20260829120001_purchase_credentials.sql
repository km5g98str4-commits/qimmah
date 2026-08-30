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
