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
-- تحتوي (1):
--   · 20260913120001_salla_batch_exports.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

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
  1                                                  as expected,
  case when count(*) filter (where m.version is not null) = 1
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260913120001')) as v(version)
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
--            client_rpcs = 6 · legacy_open = 0 · migrations = 45
