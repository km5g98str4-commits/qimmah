-- ============================================================================
-- 20260806120001 — P2: نظام الوصول (Access & Entitlements) — المخطط والحراسة
-- ============================================================================
-- الحزمة الثانية من برنامج الوصول. **قاعدة بيانات وإثبات فقط** — لا واجهة، لا
-- مسارات، لا نصوص خصوصية (تلك P2b)، لا سلة، لا Edge Functions، لا بريد.
--
-- المرجع: docs/product/ACCESS-ENTITLEMENT-ARCHITECTURE.md + §0.1 في الميثاق.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- المبادئ الأربعة التي يفرضها هذا الملف بنيويًا (لا بالنية):
--
--  ① العميل لا يمنح نفسه شيئًا.
--     `entitlements` و`access_code_redemptions` لهما سياسة SELECT للمالك فقط
--     و**لا سياسة كتابة إطلاقًا** — فلا INSERT/UPDATE/DELETE من المتصفّح مهما
--     كان الـJWT. وجداول الأكواد والسجلّات لا سياسة لها **أصلًا** (RLS مفعّل
--     بصفر سياسات) **مع** REVOKE صريح من anon/authenticated — حزامان لا واحد،
--     لأن Supabase يمنح الأدوار صلاحيات الجداول افتراضيًا.
--
--  ② الحالة تُشتقّ ولا تُخزَّن.
--     **لا عمود `status`.** قيمة مخزَّنة تقول «تجربة نشطة» تصير كذبة بمجرّد
--     تجاوز الساعة الـ٧٢ (خرق §5 «صدق المعروض»). المخزَّن هو **المنحة**
--     (النوع · `no_expiry` · `expires_at` · `revoked_at`)، والحالة الفعّالة
--     تُحسب في `public.my_entitlement()` من هذه الحقول + **وقت قاعدة البيانات**.
--
--  ③ الهويّة تُبصَم بملح مُرقَّم، ولا تُخزَّن نصًّا.
--     لا بريد صريح في أي سجلّ دائم. `hash_version` على **كل** صفّ، والملح
--     يُقرأ من `private.identity_pepper` بالإصدار المطلوب. **إصدار مجهول ⇒
--     استثناء، لا رجوع صامت لإصدار آخر** (§4.2: الاستثناء يُحرَس ولا يُطبَّع).
--
--  ④ السجلّات الدائمة **بلا عمود `user_id`** — عمدًا.
--     `delete_own_account()` (هجرة 20260713120007) يحذف صفوف **كل** جدول فيه
--     `user_id` ديناميكيًا. فلو حملت السجلّات العمود لانفتحت ثغرتان دفعةً:
--     إعادة التجربة بحذف الحساب، وضياع Premium بلا استرجاع. غيابه هو ما يجعل
--     «مرّة واحدة» تعني مرّة واحدة، و«اشتريت» تبقى صحيحة بعد الحذف.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- دوران الملح — السلوك الموثَّق (وليس مسكوتًا عنه):
--
--   • الإصدار النشط = أعلى `version` بلا `retired_at`. الصفوف الجديدة تُبصَم به.
--   • **التقاعد يوقف الإصدار ولا يحذف السرّ.** حذف ملح قديم يجعل بصمات صفوفه
--     غير قابلة للمطابقة إلى الأبد — أي يفتح ثغرة إعادة التجربة **بصمت**.
--     لذلك `retired_at` وسم لا حذف، والصف يبقى.
--   • البحث عن هوية يمرّ على **كل** الإصدارات المعروفة (`identity_hashes`) —
--     وهذا **ليس** رجوعًا صامتًا: هو مسح مُعلَن ومحدود لأننا لا نملك البريد
--     نصًّا لإعادة بصمه. الرجوع الصامت الممنوع هو أن يُطلَب إصدار بعينه فيُخدَم
--     بإصدار آخر — وذلك يرفع استثناء هنا.
--   • هجرة إصدار جديد: أدخِل صفًّا جديدًا، ووسم القديم `retired_at`، **ولا
--     تحذفه**. لا حاجة لإعادة كتابة أي سجلّ.
--
-- الاحتفاظ (بيانات وصفية فقط — **لا أتمتة حذف في P2**):
--   • `trial_ledger`  : `retention_policy='anti_abuse_24m'` و`retain_until`
--                       محسوب = أول تجربة + ٢٤ شهرًا.
--   • `purchase_ledger`: `retention_policy='contract_premium_recovery'` و
--                       `retain_until` **NULL عمدًا** — الاحتفاظ مربوط ببقاء
--                       التزام الاسترجاع/العقد، ويُحسم بسياسة قانونية/محاسبية
--                       معتمدة لا بمؤقّت في المخطّط.
--   • لا cron، لا trigger حذف، لا `delete from` في هذا الملف.
--
-- idempotent بالكامل: `create ... if not exists` · `create or replace` ·
-- السياسات تُحذف كلها (أيًّا كان اسمها) ثم تُعاد — فلا تتعارض مع سياسة يدوية.
-- ============================================================================

-- ── ٠) مخطط الأسرار — لا يقرؤه أي دور عميل ─────────────────────────────────
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.identity_pepper (
  version    int primary key,
  pepper     text not null check (length(pepper) >= 32),
  issued_at  timestamptz not null default now(),
  -- وسم توقّف الإصدار. **ليس حذفًا** — انظر «دوران الملح» أعلاه.
  retired_at timestamptz
);
revoke all on private.identity_pepper from public, anon, authenticated;

comment on table private.identity_pepper is
  'ملح مُرقَّم لبصمة الهوية. التقاعد يوقف الإصدار ولا يحذف السرّ — حذفه يفتح ثغرة إعادة التجربة بصمت.';

-- ── ١) دوال البصمة ─────────────────────────────────────────────────────────
-- sha256() و convert_to() من نواة Postgres — لا حاجة لـpgcrypto.

/** الإصدار النشط. لا إصدار نشط ⇒ استثناء (لا افتراض صامت). */
create or replace function private.active_pepper_version()
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v int;
begin
  select max(version) into v from private.identity_pepper where retired_at is null;
  if v is null then
    raise exception 'identity_pepper: no active version' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

/** بصمة هوية بإصدار **محدَّد**. إصدار مجهول ⇒ استثناء، لا رجوع لإصدار آخر. */
create or replace function private.hash_identity(p_email text, p_version int)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s text;
  n text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'hash_identity: empty identity' using errcode = '22023';
  end if;
  select pepper into s from private.identity_pepper where version = p_version;
  if s is null then
    -- الحارس المركزي: لا رجوع صامت لأي إصدار آخر مهما كان متاحًا.
    raise exception 'hash_identity: unknown pepper version %', p_version using errcode = 'P0002';
  end if;
  return encode(sha256(convert_to(n || ':' || s, 'UTF8')), 'hex');
end;
$$;

/** كل بصمات هوية عبر كل الإصدارات المعروفة — للبحث لا للإدخال. مسح معلَن. */
create or replace function private.identity_hashes(p_email text)
returns table (email_hash text, hash_version int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select private.hash_identity(p_email, p.version), p.version
    from private.identity_pepper p
    order by p.version desc;
end;
$$;

-- ── ٢) الجداول ─────────────────────────────────────────────────────────────

-- ٢-أ) أكواد الوصول. RLS بصفر سياسات + REVOKE ⇒ لا يراها عميل إطلاقًا.
create table if not exists public.access_codes (
  id               uuid primary key default gen_random_uuid(),
  code_hash        text not null unique,
  hash_version     int  not null,
  label            text,
  duration_days    int  not null default 14 check (duration_days between 1 and 3650),
  starts_at        timestamptz not null default now(),
  expires_at       timestamptz,
  max_redemptions  int  not null default 1 check (max_redemptions >= 1),
  redemption_count int  not null default 0 check (redemption_count >= 0),
  enabled          boolean not null default true,
  -- أثر إداري: من أنشأ ولماذا. لا يُكشف لأي دور عميل (RLS + REVOKE).
  created_by       text not null,
  created_reason   text not null,
  updated_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- شبكة الأمان البنيوية للتزامن: حتى لو أخطأ القفل، الحدّ لا يُتجاوَز.
  constraint access_codes_within_limit check (redemption_count <= max_redemptions),
  constraint access_codes_window check (expires_at is null or expires_at > starts_at)
);

-- ٢-ب) المنحة الحالية لكل مستخدم. **لا عمود status** — الحالة تُشتقّ.
create table if not exists public.entitlements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  email              text not null,
  entitlement_type   text not null check (entitlement_type in ('none','trial','special','premium')),
  source             text not null check (source in ('none','trial','code','salla','manual')),
  activation_code_id uuid references public.access_codes(id),
  activated_at       timestamptz,
  expires_at         timestamptz,
  no_expiry          boolean not null default false,
  revoked_at         timestamptz,
  revoked_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- منحة بلا انتهاء لا تحمل تاريخ انتهاء، والعكس.
  constraint entitlements_no_expiry_shape check (not no_expiry or expires_at is null),
  -- Premium وحدها بلا انتهاء؛ التجربة والكود موقوتان دائمًا.
  constraint entitlements_premium_shape
    check ((entitlement_type = 'premium') = no_expiry or entitlement_type = 'none'),
  constraint entitlements_timed_shape
    check (entitlement_type not in ('trial','special') or expires_at is not null)
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);

-- ٢-ج) استرداد لكل مستخدم — **فيه user_id عمدًا**: يُمحى مع الحساب (PDPL).
--      حدّ الاستخدام لا يعتمد عليه، بل على السجلّ الدائم في ٢-و.
create table if not exists public.access_code_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.access_codes(id),
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);
create index if not exists access_code_redemptions_user_idx on public.access_code_redemptions (user_id);
create index if not exists access_code_redemptions_code_idx on public.access_code_redemptions (code_id);

-- ٢-د) سجلّ التجربة — **بلا user_id**: ينجو من حذف الحساب.
create table if not exists public.trial_ledger (
  email_hash       text primary key,
  hash_version     int  not null,
  first_trial_at   timestamptz not null default now(),
  retention_policy text not null default 'anti_abuse_24m',
  -- بيانات احتفاظ وصفية. **لا أتمتة حذف في P2** — القيمة تُقرأ ولا تُنفَّذ.
  retain_until     timestamptz not null default (now() + interval '24 months'),
  constraint trial_ledger_retention check (retention_policy = 'anti_abuse_24m')
);
comment on column public.trial_ledger.retain_until is
  'وسم احتفاظ (٢٤ شهرًا) — بلا حذف آلي في P2؛ التنفيذ يحتاج سياسة معتمدة.';

-- ٢-هـ) سجلّ الشراء — **بلا user_id**: Premium يُسترجَع بعد حذف الحساب.
create table if not exists public.purchase_ledger (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null check (provider in ('salla','manual')),
  provider_order_id text not null,
  email_hash        text not null,
  hash_version      int  not null,
  amount_minor      int  check (amount_minor is null or amount_minor >= 0),
  currency          text not null default 'SAR',
  granted_at        timestamptz not null default now(),
  raw               jsonb,
  retention_policy  text not null default 'contract_premium_recovery',
  -- NULL عمدًا: الاحتفاظ مربوط بالعقد/الاسترجاع لا بمؤقّت — قرار قانوني.
  retain_until      timestamptz,
  -- تكرار حدث المزوّد لا يمنح مرّتين.
  unique (provider, provider_order_id)
);
create index if not exists purchase_ledger_hash_idx on public.purchase_ledger (email_hash);
comment on column public.purchase_ledger.retain_until is
  'NULL عمدًا — الاحتفاظ ببقاء التزام الاسترجاع/العقد، ويُحسم بسياسة قانونية/محاسبية معتمدة.';

-- ٢-و) سجلّ استرداد الأكواد — **بلا user_id**: الحدّ ينجو من حذف الحساب.
create table if not exists public.code_redemption_ledger (
  code_id      uuid not null references public.access_codes(id),
  email_hash   text not null,
  hash_version int  not null,
  redeemed_at  timestamptz not null default now(),
  -- قيد مسمّى لا `primary key (...)` مجرّدة: الأخيرة تُقرأ عمودًا اسمه `primary`
  -- في حارس المخطّط القائم، والاسم يظهر في رسالة الخطأ عند التصادم.
  constraint code_redemption_ledger_pkey primary key (code_id, email_hash)
);
create index if not exists code_redemption_ledger_hash_idx on public.code_redemption_ledger (email_hash);

-- ── ٣) updated_at تلقائيًا (نفس نمط الهجرات القائمة) ────────────────────────
create or replace function public.entitlements_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists entitlements_touch on public.entitlements;
create trigger entitlements_touch before update on public.entitlements
  for each row execute function public.entitlements_touch_updated_at();

drop trigger if exists access_codes_touch on public.access_codes;
create trigger access_codes_touch before update on public.access_codes
  for each row execute function public.entitlements_touch_updated_at();

-- ── ٤) RLS + الصلاحيات ─────────────────────────────────────────────────────
-- القراءة الوحيدة المسموحة للعميل: صفّه هو في entitlements و redemptions.
-- الكتابة: **لا سياسة كتابة على أي جدول** — كل تغيير يمرّ بدالة SECURITY DEFINER.

do $$
declare t text; pol text;
begin
  foreach t in array array[
    'entitlements','access_codes','access_code_redemptions',
    'trial_ledger','purchase_ledger','code_redemption_ledger'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- تقارب حتمي: تُحذف كل سياسة قائمة أيًّا كان اسمها ثم تُعاد المسموحة فقط.
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I;', pol, t);
    end loop;
  end loop;

  -- قراءة المالك فقط — SELECT وحدها. لا insert/update/delete policy عمدًا.
  execute 'create policy "entitlements_select_own" on public.entitlements
             for select to authenticated using ((select auth.uid()) = user_id)';
  execute 'create policy "access_code_redemptions_select_own" on public.access_code_redemptions
             for select to authenticated using ((select auth.uid()) = user_id)';
end;
$$;

-- الحزام الثاني: Supabase يمنح الأدوار صلاحيات الجداول افتراضيًا، فتُسحب صراحةً.
revoke all on public.access_codes            from anon, authenticated;
revoke all on public.trial_ledger            from anon, authenticated;
revoke all on public.purchase_ledger         from anon, authenticated;
revoke all on public.code_redemption_ledger  from anon, authenticated;
revoke insert, update, delete on public.entitlements            from anon, authenticated;
revoke insert, update, delete on public.access_code_redemptions from anon, authenticated;
revoke all on public.entitlements            from anon;
revoke all on public.access_code_redemptions from anon;
grant select on public.entitlements            to authenticated;
grant select on public.access_code_redemptions to authenticated;
