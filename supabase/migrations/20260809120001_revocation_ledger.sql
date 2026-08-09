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
