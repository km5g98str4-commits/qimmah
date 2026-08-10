-- ============================================================================
-- 20260811120001 — [CTO-BACKEND-001] سلامة الشراء — أربع ثغرات تُغلق قبل الـwebhook
-- ============================================================================
-- تمهيد إلزامي لـ`salla-webhook`. الأمر نصّ صراحةً: «إذا كانت الأربع ثغرات
-- الأمنية السابقة غير مغلقة: توقف عن بناء webhook، وأغلقها أولًا». وقد أُثبت
-- بالتنفيذ على Postgres حقيقي أن اثنتين منها **مفتوحتان على مصراعيهما**،
-- والأخريان ناقصتان. هذا الملف يغلق الأربع.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① ربط الطلب بالهوية — الثغرة الأخطر (كانت تصعيد صلاحية كامل)
--
--    `admin_grant_premium` كان يكتب السجلّ بـ`on conflict do nothing` **ثم
--    يمضي فيمنح** بصرف النظر. فكان مسار السرقة كاملًا وبخطوة واحدة:
--
--        admin_grant_premium('alice@…','salla','ORDER-X')   ← شراء صحيح
--        admin_grant_premium('mallory@…','salla','ORDER-X') ← نفس الطلب، بريد آخر
--        ⇒ السجلّ يبقى لأليس (القيد الفريد صمد)، **ومالوري تنال Premium**.
--
--    القيد الفريد كان يحرس **الجدول** ولا يحرس **المنحة**. أُثبت عمليًا قبل
--    الإصلاح (probe: `entitlements now: [alice premium, mallory premium]`).
--
--    العقد الجديد — `(provider, provider_order_id)` هوية شراء واحدة لا غير:
--      • نفس الطلب + نفس الهوية  ⇒ idempotent (يُعاد `premiumActive` بلا صفّ ثانٍ)
--      • نفس الطلب + هوية مختلفة ⇒ **استثناء `purchase_identity_conflict`**
--    والمقارنة تمرّ على **كل إصدارات الملح** (`identity_hashes`) لا الإصدار
--    النشط وحده — وإلا لصار دوران الملح بابًا خلفيًا للالتفاف.
--
-- ② الإلغاء الدائم يعلو على الشراء
--
--    `admin_grant_premium` كان المسار **الوحيد** الذي لا يفحص الإلغاء، وكان
--    `on conflict do update` فيه يضع `revoked_at = null` صراحةً. فكان الشراء
--    يرفع الحظر بصمت — بينما مسارات الخدمة الذاتية الأربع كلها تفحصه
--    (`private.is_access_revoked`). أُثبت عمليًا: `revoked_at after purchase: null`.
--
--    العقد الجديد: **الشراء يُسجَّل، والمنحة تُحجب.** المال حقيقي فيُحفَظ أثره
--    في السجلّ الدائم؛ والوصول يبقى محظورًا حتى `admin_unrevoke` وحده.
--    ولا يلمس هذا المسار `revoked_at` إطلاقًا — لا تصفيرًا ولا تعديلًا.
--
-- ③ أرضية العشوائية للأكواد
--
--    `admin_create_access_code` كان يقبل `'A'` كودًا صالحًا (أُثبت). ولمّا كان
--    تحديد المعدّل عائقًا خارجيًا معلَنًا (§11.2)، فالعشوائية هي **الحاجز
--    الوحيد القائم** ضد التخمين — ولا يجوز أن تكون نيّة الكاتب.
--    والفحص موضعه الدالة لا قيد الجدول: الجدول لا يرى إلا البصمة.
--
-- ④ أثر الشراء — من سجّله وبأي حدث
--
--    `purchase_ledger` كان بلا عمود فاعل. `access_codes` تحمل
--    `created_by`/`created_reason` NOT NULL، والشراء أولى بها: هو المسار الذي
--    سيكتب فيه **خادم آلي** لا إنسان.
--
-- idempotent بالكامل، على نمط الهجرات السابقة.
-- ============================================================================

-- ── ④ أعمدة الأثر ──────────────────────────────────────────────────────────
-- الإضافة بقيمة افتراضية ثم إسقاطها: الصفوف القائمة (إن وُجدت) تُوسم صراحةً
-- `legacy_unattributed` بدل أن تكذب باسم فاعل لم يكن، والإدخال الجديد **ملزَم**
-- بتسمية فاعله لأن العمود NOT NULL بلا افتراضي.
alter table public.purchase_ledger
  add column if not exists recorded_by  text not null default 'legacy_unattributed';
alter table public.purchase_ledger alter column recorded_by drop default;

alter table public.purchase_ledger
  add column if not exists source_event text;

comment on column public.purchase_ledger.recorded_by is
  'الفاعل الذي سجّل الشراء (webhook:salla · admin:<اسم>). NOT NULL بلا افتراضي — لا شراء مجهول المصدر.';
comment on column public.purchase_ledger.source_event is
  'معرّف حدث المزوّد الذي أنتج الصفّ — يربط السجّل بسطر التدقيق في salla_webhook_events.';

-- ── ③ أرضية العشوائية ──────────────────────────────────────────────────────
/**
 * أبجدية ٣٢ رمزًا بلا ملتبِس (I · L · O · U محذوفة) — نفس أبجدية الوثيقة.
 * الفحص ثلاثي لأن الطول وحده لا يعني عشوائية:
 *   • طول ≥ ١٠
 *   • كل الرموز داخل الأبجدية
 *   • ≥ ٦ رموز **متمايزة** — وإلا لمرّ 'AAAAAAAAAA' (١٠ أحرف، عشوائية صفر).
 * ترفع استثناءً مسمّى؛ لا ترجع false بصمت.
 */
create or replace function private.assert_code_entropy(p_code text)
returns void
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  c text := upper(btrim(coalesce(p_code, '')));
  distinct_chars int;
begin
  if length(c) < 10 then
    raise exception 'access_code_too_short: minimum 10 characters, got %', length(c)
      using errcode = '22023';
  end if;
  if c !~ '^[ABCDEFGHJKMNPQRSTVWXYZ0123456789]+$' then
    raise exception 'access_code_alphabet: only the 32-symbol unambiguous alphabet is allowed'
      using errcode = '22023';
  end if;
  select count(distinct ch) into distinct_chars
    from regexp_split_to_table(c, '') as ch;
  if distinct_chars < 6 then
    raise exception 'access_code_low_entropy: needs >= 6 distinct symbols, got %', distinct_chars
      using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_code_entropy(text) from public, anon, authenticated;

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
  -- الحاجز الوحيد القائم ضد التخمين ما دام تحديد المعدّل خارجيًا (§11.2).
  perform private.assert_code_entropy(p_code);
  ver := private.active_pepper_version();
  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason)
  values (private.hash_identity(upper(btrim(p_code)), ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, p_created_by, p_created_reason)
  returning access_codes.id into id;
  return id;
end;
$$;

-- ── ①+② مسار الشراء المحصَّن ───────────────────────────────────────────────
/**
 * يسجّل شراءً من مزوّد ويمنح Premium — بالعقد الكامل:
 *
 *   • (provider, provider_order_id) ⇒ هوية شراء واحدة. اختلافها ⇒ فشل مغلق.
 *   • الإلغاء الدائم يعلو: الشراء يُسجَّل والمنحة تُحجب.
 *   • التكرار لا يمنح مرّتين ولا يفشل — نفس الهوية تعيد نفس النتيجة.
 *   • كل صفّ يحمل فاعله وحدثه.
 *
 * تُرجع: premiumActive · pending_claim · revoked
 */
create or replace function public.admin_grant_premium(
  p_email text, p_provider text, p_provider_order_id text,
  p_amount_minor int default null, p_raw jsonb default null,
  p_recorded_by text default 'admin:unspecified', p_source_event text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver        int;
  h          text;
  uid        uuid;
  existing   record;
  owns_order boolean;
begin
  if coalesce(btrim(p_email), '') = '' then
    raise exception 'purchase_identity_missing' using errcode = '22023';
  end if;
  ver := private.active_pepper_version();
  h   := private.hash_identity(p_email, ver);

  -- ① الطلب مملوك لهوية واحدة. الفحص **قبل** أي كتابة، وعبر كل إصدارات الملح:
  --    لو قُورن بالإصدار النشط وحده لصار دوران الملح بابًا خلفيًا.
  select * into existing
    from public.purchase_ledger
   where provider = p_provider and provider_order_id = p_provider_order_id;

  if found then
    owns_order := exists (
      select 1 from private.identity_hashes(p_email) ih
       where ih.email_hash = existing.email_hash
    );
    if not owns_order then
      -- فشل مغلق. لا يُسجَّل شيء، ولا تُمنح منحة، ولا يُكشف مالك الطلب الأصلي.
      raise exception 'purchase_identity_conflict: order % is bound to another identity',
        p_provider_order_id using errcode = '23505';
    end if;
  else
    insert into public.purchase_ledger (provider, provider_order_id, email_hash, hash_version,
                                        amount_minor, raw, recorded_by, source_event)
    values (p_provider, p_provider_order_id, h, ver, p_amount_minor, p_raw,
            p_recorded_by, p_source_event);
  end if;

  select u.id into uid from auth.users u
   where lower(btrim(u.email)) = lower(btrim(p_email));

  -- ② الإلغاء يعلو على الشراء. السجلّ أعلاه بقي — المال حقيقي وأثره يُحفَظ —
  --    والمنحة تُحجب. ولا يُلمس `revoked_at` هنا إطلاقًا؛ `admin_unrevoke` وحده.
  if private.is_access_revoked(uid, p_email) then
    return 'revoked';
  end if;

  -- الحساب قد لا يكون موجودًا بعد (شراء قبل التسجيل) — السجلّ ينتظره،
  -- و`claim_pending_grants()` يلتقطه عند التسجيل بنفس البريد.
  if uid is null then return 'pending_claim'; end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, p_email, 'premium', 'salla', now(), null, true)
  on conflict (user_id) do update
    set entitlement_type = 'premium', source = 'salla', activated_at = now(),
        expires_at = null, no_expiry = true;
  -- ⚠️ لا `revoked_at = null` هنا — كان ذلك هو الثقب الثاني بعينه. الوصول إلى
  --    هذا السطر يعني أن `is_access_revoked` رجعت false أصلًا، فلا شيء يُرفع.
  return 'premiumActive';
end;
$$;

-- التوقيع تغيّر (بارامترَان جديدان) فالنسخة القديمة تبقى معلَّقة لو لم تُسقط —
-- وبقاؤها يعني مسارًا ثانيًا بلا حراسة. تُسقط صراحةً.
drop function if exists public.admin_grant_premium(text, text, text, int, jsonb);

-- ── الصلاحيات — service_role حصرًا كسابقتها ────────────────────────────────
revoke all on function public.admin_grant_premium(text,text,text,int,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_grant_premium(text,text,text,int,jsonb,text,text)
  to service_role;
revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;
