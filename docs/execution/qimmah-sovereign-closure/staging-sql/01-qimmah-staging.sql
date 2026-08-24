-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 1/6
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (13):
--   · 20260713120001_extensions_and_helpers.sql
--   · 20260713120002_core_active_tables.sql
--   · 20260713120003_sync_target_tables.sql
--   · 20260713120004_updated_at_triggers.sql
--   · 20260713120005_rls_enable_and_policies.sql
--   · 20260713120006_new_user_profile_trigger.sql
--   · 20260713120007_delete_own_account.sql
--   · 20260726120001_p14_coverage_tables.sql
--   · 20260726120002_p14_lww_updated_at.sql
--   · 20260726120003_p14_rls_policies.sql
--   · 20260726120004_p14_measurement_logs_tombstone.sql
--   · 20260726120005_p14_schema_guard.sql
--   · 20260806120001_entitlements_core.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120001_extensions_and_helpers.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120001') then
    raise notice 'تخطٍّ: 20260713120001_extensions_and_helpers.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120001$
-- ============================================================================
-- 20260713120001 — extensions + shared helpers
-- ============================================================================
-- Qimmah cloud persistence for the Capacitor iOS app's sync engine.
-- Every migration in this folder is idempotent and safe to re-run over any
-- prior install (Supabase CLI `db push`, or pasted into the SQL editor in
-- filename order). No migration DROPs a user-data table.
-- ============================================================================

-- uuid generation (enabled by default on Supabase; declared for safety/portability).
create extension if not exists "pgcrypto";

-- Shared BEFORE UPDATE trigger: stamp updated_at on every row mutation.
-- SECURITY INVOKER (default): runs as the caller, no privilege elevation.
-- search_path pinned empty; now() resolves from pg_catalog (always in path).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

  $qimmah_mig_20260713120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120001', '20260713120001_extensions_and_helpers.sql');
end
$qimmah_mig_20260713120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120002_core_active_tables.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120002') then
    raise notice 'تخطٍّ: 20260713120002_core_active_tables.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120002$
-- ============================================================================
-- 20260713120002 — core ACTIVE tables (the 5 the live sync engine pushes today)
-- ============================================================================
-- Contract source: src/lib/syncService.ts (workout_sessions, exercise_history,
-- measurement_logs, daily_logs) + src/lib/onboardingSync.ts (profiles).
-- Idempotency keys mirror the client upserts exactly:
--   workout_sessions / measurement_logs  → (user_id, local_id)
--   exercise_history                      → (user_id, exercise_id)
--   daily_logs                            → (user_id, date)
--   profiles                              → (user_id)
-- Flexible per-record shapes live in jsonb (data/values) to track the
-- local-first schema without lockstep column migrations.
-- ============================================================================

-- 1) profiles — 1:1 with an auth account (display_name + onboarding snapshot in data).
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

-- 2) workout_sessions — one finished/in-progress session; sets nested in data.
create table if not exists public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  local_id         text,
  date             date not null,
  started_at       timestamptz,
  finished_at      timestamptz,
  workout_day_id   text,
  workout_day_name text,
  data             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date desc);

-- 3) exercise_history — last/best performance aggregate per exercise.
create table if not exists public.exercise_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise_id  text not null,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, exercise_id)
);
create index if not exists exercise_history_user_idx
  on public.exercise_history (user_id);

-- 4) measurement_logs — body measurements per entry.
create table if not exists public.measurement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  local_id    text,
  date        date not null,
  -- VALUES is a reserved key word in Postgres — a column named `values` MUST be
  -- quoted or CREATE TABLE fails to parse. The quoted name is still exactly
  -- `values` (already lower-case), so PostgREST and the client are unaffected.
  "values"    jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists measurement_logs_user_date_idx
  on public.measurement_logs (user_id, date desc);

-- 5) daily_logs — aggregated day snapshot (today-flags / commitments / workoutCompleted).
create table if not exists public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, date desc);

  $qimmah_mig_20260713120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120002', '20260713120002_core_active_tables.sql');
end
$qimmah_mig_20260713120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120003_sync_target_tables.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120003') then
    raise notice 'تخطٍّ: 20260713120003_sync_target_tables.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120003$
-- ============================================================================
-- 20260713120003 — sync-target tables (close the "sync-blind" gap)
-- ============================================================================
-- These 8 user-data stores exist locally (historyStore / stepCounter /
-- achievements / customPlan / todo) but have NO cloud home yet. The sync engine
-- being wired in parallel will push them; this makes the DB provably ready.
-- Same idempotency contract as the core tables:
--   per-day logs        → unique (user_id, date)     (upsert on user_id,date)
--   per-account singles → unique (user_id)           (upsert on user_id)
-- Flexible record shapes → jsonb; scalar day-values (water_ml, steps) → typed.
-- Every table: id uuid PK, user_id → auth.users ON DELETE CASCADE,
--   created_at/updated_at. RLS + updated_at triggers are applied in later
--   migrations (0004/0005) over the shared table list — so this file only DDLs.
-- ============================================================================

-- Nutrition — per day (doneMeals flags + logged macros + optional water).
create table if not exists public.nutrition_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  done_meals  jsonb not null default '{}'::jsonb,
  water_ml    integer not null default 0,
  logged_food jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists nutrition_logs_user_date_idx
  on public.nutrition_logs (user_id, date desc);

-- Water — per day (kept as its own store client-side).
create table if not exists public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  water_ml    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, date desc);

-- Supplements taken — per day (id → done boolean map).
create table if not exists public.supplement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  done        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists supplement_logs_user_date_idx
  on public.supplement_logs (user_id, date desc);

-- Medications taken — per day (id → done boolean map). PDPL-sensitive health data.
create table if not exists public.medication_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  done        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists medication_logs_user_date_idx
  on public.medication_logs (user_id, date desc);

-- Steps — per day count (+ optional source: manual/healthkit/google-fit/external).
create table if not exists public.step_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  steps       integer not null default 0,
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists step_logs_user_date_idx
  on public.step_logs (user_id, date desc);

-- Achievements — one aggregate row per account (unlocked medals + PR count).
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- Custom plan — one per account (auto/custom workout plan snapshot).
create table if not exists public.custom_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- Todos — one per account (current-day todo list snapshot: date + items[]).
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

  $qimmah_mig_20260713120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120003', '20260713120003_sync_target_tables.sql');
end
$qimmah_mig_20260713120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120004_updated_at_triggers.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120004') then
    raise notice 'تخطٍّ: 20260713120004_updated_at_triggers.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120004$
-- ============================================================================
-- 20260713120004 — updated_at triggers for every user table
-- ============================================================================
-- Idempotent: drop-then-create each trigger. One shared table list drives this
-- and the RLS migration — adding a table = editing the array in both places.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs',
    'nutrition_logs','water_logs','supplement_logs','medication_logs','step_logs',
    'achievements','custom_plans','todos'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;

  $qimmah_mig_20260713120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120004', '20260713120004_updated_at_triggers.sql');
end
$qimmah_mig_20260713120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120005_rls_enable_and_policies.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120005_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120005') then
    raise notice 'تخطٍّ: 20260713120005_rls_enable_and_policies.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120005$
-- ============================================================================
-- 20260713120005 - Row Level Security: enable + 4 owner-only policies per table
-- ============================================================================
-- The privacy core. EVERY user table gets RLS ON and exactly four policies,
-- each strictly `auth.uid() = user_id`:
--   select  USING (auth.uid() = user_id)
--   insert  WITH CHECK (auth.uid() = user_id)
--   update  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--   delete  USING (auth.uid() = user_id)
--
-- anon access -> ZERO by construction two ways over: (1) policies are scoped
--   `to authenticated`, so the anon role has NO applicable policy at all; and
--   (2) even if reached, the anon JWT has auth.uid() = NULL and `NULL = user_id`
--   is never true. Proven empirically by `npm run db:verify`.
--
-- ENABLE (not FORCE) RLS on purpose: FORCE would also subject the table owner
--   (postgres) to RLS and break the SECURITY DEFINER delete_own_account() RPC,
--   which relies on owner RLS-bypass to wipe every table. anon is fully denied
--   without FORCE (see above).
--
-- `(select auth.uid())` wraps the call so Postgres evaluates it once per
--   statement (initplan) instead of per row - the Supabase-recommended pattern.
--
-- Idempotent + drift-proof: before recreating, DROP every existing policy on the
--   table (whatever its name, including hand-made dashboard policies), so
--   re-running always converges to exactly these four.
-- ============================================================================

do $$
declare
  t text;
  pol text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs',
    'nutrition_logs','water_logs','supplement_logs','medication_logs','step_logs',
    'achievements','custom_plans','todos'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I;', pol, t);
    end loop;

    execute format(
      'create policy "%1$s_select_own" on public.%1$s
         for select to authenticated using ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s
         for insert to authenticated with check ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$s
         for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s
         for delete to authenticated using ((select auth.uid()) = user_id);', t);
  end loop;
end;
$$;

  $qimmah_mig_20260713120005$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120005', '20260713120005_rls_enable_and_policies.sql');
end
$qimmah_mig_20260713120005_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120006_new_user_profile_trigger.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120006_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120006') then
    raise notice 'تخطٍّ: 20260713120006_new_user_profile_trigger.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120006$
-- ============================================================================
-- 20260713120006 - auto-create a profiles row on signup
-- ============================================================================
-- Keeps the app's assumption (profiles row exists for every account) true even
-- before the first onboarding push. SECURITY DEFINER so it can insert during the
-- auth signup transaction; search_path pinned empty + fully-qualified names.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

  $qimmah_mig_20260713120006$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120006', '20260713120006_new_user_profile_trigger.sql');
end
$qimmah_mig_20260713120006_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260713120007_delete_own_account.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260713120007_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260713120007') then
    raise notice 'تخطٍّ: 20260713120007_delete_own_account.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260713120007$
-- ============================================================================
-- 20260713120007 - self-service account deletion (App Store 5.1.1(v), PDPL)
-- ============================================================================
-- Called by the client: supabase.rpc('delete_own_account') (src/lib/authContext).
--
-- AUDIT of the prior version (SUPABASE-SCHEMA.sql): it deleted ONLY
--   `auth.users` and leaned entirely on ON DELETE CASCADE. That is correct *if*
--   every user table carries the cascade FK - but it is a single point of
--   failure: a table added later without the FK (or with RLS/ownership quirks)
--   would silently orphan that user's rows. That is the server-side twin of the
--   local resetQimmah hardcoded-list flaw.
--
-- REWRITE - fail-safe by construction, not by enumeration:
--   1. Dynamically scan information_schema for EVERY base table in `public`
--      that has a `user_id` column, and delete rows where user_id = auth.uid().
--      Any current OR FUTURE user table is covered automatically - nothing to
--      forget. (Belt: works even for a table missing the cascade FK.)
--   2. Then delete auth.users(id = uid) - removes the identity and cascades
--      anything else (suspenders).
--
-- Security:
--   * SECURITY DEFINER: runs as the function owner so it can touch auth.users.
--     Create it via the SQL editor / migration so the owner holds that right.
--   * Self-only: target is always auth.uid() from the JWT - no params, no
--     user-supplied identifiers, so it can never be aimed at another account.
--   * set search_path = '' hardens against search-path injection; all names are
--     schema-qualified and dynamic identifiers pass through format('%I').
--   * uid is bound as a parameter ($1 via USING) - never string-interpolated.
--   * revoke from public/anon; execute granted to authenticated only.
--   * No service_role key ever ships to the client.
-- ============================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tbl text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 1) Fail-safe explicit wipe: every public base table owning a user_id column.
  for tbl in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and t.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where user_id = $1', tbl) using uid;
  end loop;

  -- 2) Remove the auth identity (and cascade anything still referencing it).
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

  $qimmah_mig_20260713120007$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260713120007', '20260713120007_delete_own_account.sql');
end
$qimmah_mig_20260713120007_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260726120001_p14_coverage_tables.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260726120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260726120001') then
    raise notice 'تخطٍّ: 20260726120001_p14_coverage_tables.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260726120001$
-- ============================================================================
-- 20260726120001 — P14: cloud homes for the four P12 sync tables
-- ============================================================================
-- The P12 sync-coverage wave (docs/data/SYNC-COVERAGE.md) pushes 13 tables.
-- Twelve of them (13 minus this set, plus profiles/daily_logs/... ) already have
-- DDL in 0002/0003. These four had NO cloud home at all — the client would have
-- pushed into non-existent relations the moment VITE_SYNC_ENABLED flipped on:
--
--   nutrition_ledger  per (user, day) nutrition ledger detail   → unique (user_id, date)
--   recovery_logs     per (user, day) recovery-engine check     → unique (user_id, date)
--   workout_schedule  ONE weekly schedule row per account       → unique (user_id)
--   plan_templates    per (user, template) saved plan template  → unique (user_id, local_id)
--
-- Contract source (columns + idempotency keys are read off the client, not
-- invented here):
--   src/lib/syncStores.ts        enqueueCoverageSnapshot / hydrateCoverageFromCloud
--   src/lib/syncService.ts       productionTransport().upsert onConflict + tombstoneRow
--   src/lib/nutritionHistory.ts  src/lib/recoveryEngine.ts
--   src/lib/workoutCalendar.ts   src/features/customPlan/templates.ts
-- scripts/db/schema-rls-proof.ts fails the gate if this file ever drifts from
-- that contract.
--
-- IDEMPOTENCY (stronger than "re-runnable"): this migration CONVERGES. Beyond
-- `create table if not exists`, it re-adds any missing column, unique key and
-- check constraint — so a table hand-made in the dashboard, or an install that
-- predates a column, is repaired by re-running rather than left drifting. No
-- statement here ever drops a table, a column or a row.
--
-- INDEXES — deliberately only the unique btrees. Each idempotency key above is
-- backed by a unique index whose LEADING column is user_id, which is also the
-- only access path the client uses (`select * … eq('user_id', uid)`) and the one
-- the ON DELETE CASCADE needs. A separate `(user_id, date desc)` index — the
-- shape 0002/0003 use — would be pure duplication here: Postgres scans a btree
-- backwards, so the ascending unique index already serves date-desc ordering.
-- Unused indexes are not free (write amplification on every sync flush), so they
-- are omitted on purpose, not by oversight.
--
-- TOMBSTONES — nutrition_ledger / workout_schedule / plan_templates are in the
-- client's TOMBSTONE_TABLES: deleting = upserting a row with a WIPED payload and
-- `deleted_at = updated_at`. Hence `deleted_at timestamptz` on those three and
-- the `…_tombstone_payload_wiped` checks: the DB refuses to keep a deleted row's
-- content readable. recovery_logs is NOT a tombstone table (its store has no
-- delete path; the transport hard-deletes), so it has no deleted_at column.
-- ============================================================================

-- ── 1) nutrition_ledger — one row per (account, day); data = { entries: [...] }
create table if not exists public.nutrition_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ── 2) recovery_logs — one row per (account, day); data = the RecoveryEngineEntry
create table if not exists public.recovery_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ── 3) workout_schedule — exactly ONE row per account; data = the WeeklySchedule
create table if not exists public.workout_schedule (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ── 4) plan_templates — one row per (account, template); local_id = template.id
create table if not exists public.plan_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  local_id    text not null,
  data        jsonb not null default '{}'::jsonb,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ── Convergence: missing columns (repairs a pre-existing / hand-made table) ──
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('nutrition_ledger', 'deleted_at', 'timestamptz'),
      ('workout_schedule', 'deleted_at', 'timestamptz'),
      ('plan_templates',   'deleted_at', 'timestamptz'),
      ('nutrition_ledger', 'data',       'jsonb not null default ''{}''::jsonb'),
      ('recovery_logs',    'data',       'jsonb not null default ''{}''::jsonb'),
      ('workout_schedule', 'data',       'jsonb not null default ''{}''::jsonb'),
      ('plan_templates',   'data',       'jsonb not null default ''{}''::jsonb'),
      ('nutrition_ledger', 'created_at', 'timestamptz not null default now()'),
      ('recovery_logs',    'created_at', 'timestamptz not null default now()'),
      ('workout_schedule', 'created_at', 'timestamptz not null default now()'),
      ('plan_templates',   'created_at', 'timestamptz not null default now()'),
      ('nutrition_ledger', 'updated_at', 'timestamptz not null default now()'),
      ('recovery_logs',    'updated_at', 'timestamptz not null default now()'),
      ('workout_schedule', 'updated_at', 'timestamptz not null default now()'),
      ('plan_templates',   'updated_at', 'timestamptz not null default now()')
    ) as v(tbl, col, coldef)
  loop
    execute format(
      'alter table public.%I add column if not exists %I %s;', spec.tbl, spec.col, spec.coldef);
  end loop;
end;
$$;

-- ── Convergence: idempotency keys (the unique index each client upsert needs) ──
-- Names match what `unique (...)` inline would auto-generate, so a fresh install
-- and a repaired install end up with byte-identical catalog entries.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('nutrition_ledger', 'nutrition_ledger_user_id_date_key',      '(user_id, date)'),
      ('recovery_logs',    'recovery_logs_user_id_date_key',         '(user_id, date)'),
      ('workout_schedule', 'workout_schedule_user_id_key',           '(user_id)'),
      ('plan_templates',   'plan_templates_user_id_local_id_key',    '(user_id, local_id)')
    ) as v(tbl, cname, cols)
  loop
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relnamespace = 'public'::regnamespace
        and t.relname = spec.tbl
        and c.contype = 'u'
        and c.conname = spec.cname
    ) then
      execute format(
        'alter table public.%I add constraint %I unique %s;', spec.tbl, spec.cname, spec.cols);
    end if;
  end loop;
end;
$$;

-- ── Convergence: integrity constraints ──────────────────────────────────────
-- • *_data_is_object       — `data` is always a JSON object, never a scalar or
--                            array; every reader does `row.data.<field>`.
-- • *_date_sane            — rejects epoch-0 / corrupt dates from a bad client.
-- • plan_templates_local_id_sane — the idempotency key must be a real, bounded
--                            id (NULL local_ids would silently duplicate: in a
--                            unique index NULLs are distinct from each other).
-- • *_tombstone_payload_wiped — PRIVACY INVARIANT: a row carrying deleted_at
--                            must carry no readable payload. This is the DB half
--                            of tombstoneRow()'s wipe; it makes "deleted content
--                            stays readable in the cloud" unrepresentable rather
--                            than merely unlikely.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('nutrition_ledger', 'nutrition_ledger_data_is_object',
       'jsonb_typeof(data) = ''object'''),
      ('recovery_logs', 'recovery_logs_data_is_object',
       'jsonb_typeof(data) = ''object'''),
      ('workout_schedule', 'workout_schedule_data_is_object',
       'jsonb_typeof(data) = ''object'''),
      ('plan_templates', 'plan_templates_data_is_object',
       'jsonb_typeof(data) = ''object'''),

      ('nutrition_ledger', 'nutrition_ledger_date_sane',
       'date >= date ''2000-01-01'' and date < date ''2100-01-01'''),
      ('recovery_logs', 'recovery_logs_date_sane',
       'date >= date ''2000-01-01'' and date < date ''2100-01-01'''),

      ('plan_templates', 'plan_templates_local_id_sane',
       'char_length(local_id) between 1 and 128'),

      ('nutrition_ledger', 'nutrition_ledger_tombstone_payload_wiped',
       'deleted_at is null or data = ''{}''::jsonb'),
      ('workout_schedule', 'workout_schedule_tombstone_payload_wiped',
       'deleted_at is null or data = ''{}''::jsonb'),
      ('plan_templates', 'plan_templates_tombstone_payload_wiped',
       'deleted_at is null or data = ''{}''::jsonb')
    ) as v(tbl, cname, expr)
  loop
    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relnamespace = 'public'::regnamespace
        and t.relname = spec.tbl
        and c.contype = 'c'
        and c.conname = spec.cname
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%s);', spec.tbl, spec.cname, spec.expr);
    end if;
  end loop;
end;
$$;

-- ── Documentation that ships inside the database itself ─────────────────────
comment on table public.nutrition_ledger is
  'P12 nutrition ledger detail, one row per (account, day). data = { entries: [...] }. Tombstoned on delete (deleted_at + wiped payload). Aggregates stay in daily_logs — no duplicate source of truth.';
comment on table public.recovery_logs is
  'P12 recovery-engine v2 daily check, one row per (account, day). data = the RecoveryEngineEntry. No tombstone: the local store has no delete path.';
comment on table public.workout_schedule is
  'P12 weekly workout schedule — exactly one row per account. data = the WeeklySchedule. Clearing the schedule writes a tombstone.';
comment on table public.plan_templates is
  'P12 saved plan templates, one row per (account, template). local_id = the client template id. Tombstoned on delete.';
comment on column public.nutrition_ledger.deleted_at is
  'Tombstone stamp = the delete moment; also the LWW evidence other devices compare against. NULL on a live/revived row.';
comment on column public.workout_schedule.deleted_at is
  'Tombstone stamp = the delete moment; also the LWW evidence other devices compare against. NULL on a live/revived row.';
comment on column public.plan_templates.deleted_at is
  'Tombstone stamp = the delete moment; also the LWW evidence other devices compare against. NULL on a live/revived row.';

  $qimmah_mig_20260726120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260726120001', '20260726120001_p14_coverage_tables.sql');
end
$qimmah_mig_20260726120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260726120002_p14_lww_updated_at.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260726120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260726120002') then
    raise notice 'تخطٍّ: 20260726120002_p14_lww_updated_at.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260726120002$
-- ============================================================================
-- 20260726120002 — P14: updated_at that does not falsify LWW
-- ============================================================================
-- WHY A SECOND TRIGGER FUNCTION EXISTS
--
-- The shared `public.set_updated_at()` (migration 0001) unconditionally stamps
-- `new.updated_at = now()` on every UPDATE. That is right for a table whose
-- updated_at is bookkeeping. It is WRONG for these tables, where updated_at is
-- the conflict-resolution EVIDENCE the client reads back:
--
--   syncStores.hydrateCoverageFromCloud() resolves nutrition_ledger with
--   `cloudStamp: row.updated_at`, and syncService hydrate resolves
--   measurement_logs with `row.updated_at ?? row.date` — then writes that value
--   into the local record's `updatedAt`.
--
-- With now()-stamping, every cloud row is timestamped at SERVER WRITE TIME, i.e.
-- strictly later than the client edit it represents. A second device holding a
-- genuinely newer local edit can then lose the LWW comparison to an older cloud
-- row — silent local data loss, which docs/data/SYNC-COVERAGE.md explicitly
-- promises never happens ("لا حذف صامت").
--
-- `set_updated_at_lww()` fixes that while keeping the safety net:
--   • writer supplied a NEW updated_at  → keep it verbatim (it is the evidence).
--   • writer left it untouched or NULL  → stamp now() (never stale, never null).
--
-- Failure mode of the opposite choice, for the record: preserving a stale client
-- stamp risks another device overwriting this row (recoverable — the data still
-- exists on both devices); now()-stamping risks deleting a newer local edit
-- (unrecoverable). We take the recoverable risk.
--
-- Applied here to the four P14 tables. Migration 0004 extends it to
-- measurement_logs (same tombstone contract, same read-back-as-evidence path).
-- The remaining tables keep set_updated_at() — switching them is a separate,
-- separately-verified wave (see the P14 report's risk list).
--
-- Idempotent: create-or-replace the function; drop-then-create each trigger.
-- ============================================================================

create or replace function public.set_updated_at_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- `is not distinct from` (not `=`) so a NULL→NULL update also counts as
  -- "writer did not supply a stamp" instead of evaluating to NULL.
  if new.updated_at is null or new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

comment on function public.set_updated_at_lww() is
  'BEFORE UPDATE stamp for LWW tables: preserves a client-supplied updated_at (it is the sync conflict evidence), otherwise stamps now(). See supabase/migrations/20260726120002_p14_lww_updated_at.sql.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'nutrition_ledger','recovery_logs','workout_schedule','plan_templates'
  ]
  loop
    -- Drop BOTH names: an install that previously carried the plain stamp
    -- converges to the LWW one instead of running two triggers.
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('drop trigger if exists set_updated_at_lww on public.%I;', t);
    execute format(
      'create trigger set_updated_at_lww before update on public.%I
         for each row execute function public.set_updated_at_lww();', t);
  end loop;
end;
$$;

  $qimmah_mig_20260726120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260726120002', '20260726120002_p14_lww_updated_at.sql');
end
$qimmah_mig_20260726120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260726120003_p14_rls_policies.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260726120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260726120003') then
    raise notice 'تخطٍّ: 20260726120003_p14_rls_policies.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260726120003$
-- ============================================================================
-- 20260726120003 — P14: RLS + four owner-only policies on the new tables
-- ============================================================================
-- Identical contract to migration 0005, extended to the four P14 tables. Every
-- policy pins ownership to the JWT and nothing else:
--
--   select  USING       ((select auth.uid()) = user_id)
--   insert  WITH CHECK  ((select auth.uid()) = user_id)
--   update  USING + WITH CHECK  (both — so a row can neither be reached nor
--                                re-pointed at another account)
--   delete  USING       ((select auth.uid()) = user_id)
--
-- user_id is therefore never client-trusted: an INSERT/UPDATE naming another
-- account is rejected by WITH CHECK, and another account's rows are invisible to
-- SELECT/UPDATE/DELETE. Two accounts on the same table can never observe or
-- mutate each other — proven empirically by `npm run db:verify` (live project,
-- two throwaway users) and statically by `npm run test:db-schema`.
--
-- anon = zero access, two ways over: the policies are scoped `to authenticated`
-- so the anon role has no applicable policy at all; and even if one applied, an
-- anon JWT has auth.uid() = NULL and `NULL = user_id` is never true.
--
-- ENABLE (not FORCE): FORCE would subject the table owner to RLS and break the
-- SECURITY DEFINER delete_own_account() RPC, which needs owner bypass to wipe
-- every table. anon stays fully denied without FORCE (see above).
--
-- `(select auth.uid())` is wrapped so Postgres evaluates it once per statement
-- (initplan) instead of once per row — the Supabase-recommended shape.
--
-- Idempotent + drift-proof: every existing policy on the table is dropped first
-- (whatever its name — including hand-made dashboard policies), so re-running
-- always converges to exactly these four and nothing else.
-- ============================================================================

do $$
declare
  t text;
  pol text;
begin
  foreach t in array array[
    'nutrition_ledger','recovery_logs','workout_schedule','plan_templates'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I;', pol, t);
    end loop;

    execute format(
      'create policy "%1$s_select_own" on public.%1$s
         for select to authenticated using ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s
         for insert to authenticated with check ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$s
         for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id);', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s
         for delete to authenticated using ((select auth.uid()) = user_id);', t);
  end loop;
end;
$$;

  $qimmah_mig_20260726120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260726120003', '20260726120003_p14_rls_policies.sql');
end
$qimmah_mig_20260726120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260726120004_p14_measurement_logs_tombstone.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260726120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260726120004') then
    raise notice 'تخطٍّ: 20260726120004_p14_measurement_logs_tombstone.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260726120004$
-- ============================================================================
-- 20260726120004 — P14: close the measurement_logs tombstone gap
-- ============================================================================
-- NOT one of the four P14 tables — a blocking defect found while reading the
-- client contract against the existing DDL, in the same P12 tombstone feature.
--
-- THE BUG: measurement_logs is in the client's TOMBSTONE_TABLES, so deleting a
-- measurement upserts `{ user_id, local_id, values: {}, notes: null,
-- deleted_at, updated_at }` (syncService.tombstoneRow). Migration 0002 created
-- the table WITHOUT a deleted_at column. On a real project every measurement
-- deletion would fail with `column "deleted_at" does not exist` (PGRST204),
-- retry 8 times, then freeze the whole queue into `attention/retry-exhausted`.
-- The hydrate side already reads `row.deleted_at` — so the read half of the
-- feature was shipped against a column that was never created.
--
-- THE FIX, additive only:
--   1. add deleted_at (nullable — every existing row stays live);
--   2. the same privacy invariant the P14 tombstone tables get: a deleted row
--      keeps no readable payload;
--   3. move it onto set_updated_at_lww() (migration 0002) — measurement_logs
--      hydrate reads `row.updated_at` as LWW evidence AND writes it back into
--      the local record, so a now() stamp inflates it exactly as it would for
--      nutrition_ledger.
--
-- No data is read, rewritten or dropped. Re-running is a no-op.
-- ============================================================================

alter table public.measurement_logs add column if not exists deleted_at timestamptz;

comment on column public.measurement_logs.deleted_at is
  'Tombstone stamp = the delete moment; also the LWW evidence other devices compare against. NULL on a live/revived row.';

-- Privacy invariant: a tombstoned measurement keeps no readable body.
-- `notes is null` is included because tombstoneRow() wipes notes too.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relnamespace = 'public'::regnamespace
      and t.relname = 'measurement_logs'
      and c.contype = 'c'
      and c.conname = 'measurement_logs_tombstone_payload_wiped'
  ) then
    alter table public.measurement_logs
      add constraint measurement_logs_tombstone_payload_wiped
      -- "values" is quoted: VALUES is a reserved key word in Postgres.
      check (deleted_at is null or ("values" = '{}'::jsonb and notes is null))
      not valid;
    -- NOT VALID: enforced for every new/updated row, but pre-existing rows are
    -- not re-checked. They cannot violate it (deleted_at was NULL for all of
    -- them until this migration), so this only avoids a full-table scan lock on
    -- a live project. Validate later at leisure with:
    --   alter table public.measurement_logs
    --     validate constraint measurement_logs_tombstone_payload_wiped;
  end if;
end;
$$;

-- Same LWW-preserving stamp as the P14 tables (see migration 0002 for why).
drop trigger if exists set_updated_at on public.measurement_logs;
drop trigger if exists set_updated_at_lww on public.measurement_logs;
create trigger set_updated_at_lww before update on public.measurement_logs
  for each row execute function public.set_updated_at_lww();

  $qimmah_mig_20260726120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260726120004', '20260726120004_p14_measurement_logs_tombstone.sql');
end
$qimmah_mig_20260726120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260726120005_p14_schema_guard.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260726120005_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260726120005') then
    raise notice 'تخطٍّ: 20260726120005_p14_schema_guard.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260726120005$
-- ============================================================================
-- 20260726120005 — P14: final convergence + self-verifying schema guard
-- ============================================================================
-- Runs LAST by filename, so a full re-run of the folder always ends here. Two
-- jobs, in order:
--
--   A) CONVERGE — remove the one stray state a re-run can produce. Migration
--      20260713120004 puts `set_updated_at` on measurement_logs; 20260726120004
--      replaces it with `set_updated_at_lww`. Re-running the whole folder
--      re-creates the old one, leaving TWO before-update triggers whose
--      alphabetical order (set_updated_at → set_updated_at_lww) would let the
--      now() stamp win and silently falsify LWW again. So: on every LWW table,
--      drop the plain trigger and guarantee exactly the LWW one.
--
--   B) ASSERT — refuse to finish on a database that is not actually safe. Every
--      table the client can push to (the SyncTable union in src/lib/syncQueue.ts)
--      must have: the table itself, a user_id FK to auth.users ON DELETE
--      CASCADE, created_at/updated_at, an updated_at trigger, RLS enabled, and
--      exactly four policies — all four owner-scoped to auth.uid(), none granted
--      to anon/public. Tombstone tables must additionally have deleted_at.
--
--      A gap raises an exception, which aborts the migration transaction. That
--      is the intent: a half-secured schema must not be reported as applied.
--      This costs one catalog scan and touches no user data.
-- ============================================================================

-- ── A) Converge the LWW triggers ────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'nutrition_ledger','recovery_logs','workout_schedule','plan_templates','measurement_logs'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('drop trigger if exists set_updated_at_lww on public.%I;', t);
    execute format(
      'create trigger set_updated_at_lww before update on public.%I
         for each row execute function public.set_updated_at_lww();', t);
  end loop;
end;
$$;

-- ── B) Assert the whole sync surface is safe ────────────────────────────────
do $$
declare
  -- The client's SyncTable union (src/lib/syncQueue.ts). npm run test:db-schema
  -- fails if this list and the TypeScript union ever diverge.
  sync_tables text[] := array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs',
    'step_logs','achievements','custom_plans','todos',
    'nutrition_ledger','recovery_logs','workout_schedule','plan_templates'
  ];
  -- Client TOMBSTONE_TABLES: delete = upsert a wiped row carrying deleted_at.
  tombstone_tables text[] := array[
    'measurement_logs','nutrition_ledger','workout_schedule','plan_templates'
  ];
  t text;
  problems text[] := '{}';
  n int;
begin
  foreach t in array sync_tables
  loop
    -- table exists
    if not exists (
      select 1 from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relname = t and c.relkind = 'r'
    ) then
      problems := problems || format('%s: table missing', t);
      continue;
    end if;

    -- user_id FK → auth.users ON DELETE CASCADE (the account-deletion backstop)
    if not exists (
      select 1
      from pg_constraint c
      join pg_class child on child.oid = c.conrelid
      join pg_class parent on parent.oid = c.confrelid
      join pg_attribute a
        on a.attrelid = child.oid and a.attnum = c.conkey[1]
      where child.relnamespace = 'public'::regnamespace
        and child.relname = t
        and c.contype = 'f'
        and a.attname = 'user_id'
        and parent.relname = 'users'
        and parent.relnamespace = 'auth'::regnamespace
        and c.confdeltype = 'c'          -- 'c' = ON DELETE CASCADE
    ) then
      problems := problems || format('%s: user_id FK to auth.users ON DELETE CASCADE missing', t);
    end if;

    -- timestamps
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'created_at'
    ) then
      problems := problems || format('%s: created_at missing', t);
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'updated_at'
    ) then
      problems := problems || format('%s: updated_at missing', t);
    end if;

    -- exactly one BEFORE UPDATE stamping trigger
    select count(*) into n
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    where c.relnamespace = 'public'::regnamespace
      and c.relname = t
      and not tg.tgisinternal
      and tg.tgname in ('set_updated_at', 'set_updated_at_lww');
    if n <> 1 then
      problems := problems || format('%s: expected exactly 1 updated_at trigger, found %s', t, n);
    end if;

    -- RLS enabled
    if not exists (
      select 1 from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relname = t and c.relrowsecurity
    ) then
      problems := problems || format('%s: RLS not enabled', t);
    end if;

    -- exactly four policies, all owner-scoped, none reachable by anon/public
    select count(*) into n from pg_policies where schemaname = 'public' and tablename = t;
    if n <> 4 then
      problems := problems || format('%s: expected 4 policies, found %s', t, n);
    end if;

    select count(*) into n
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = t
      and (
        -- every policy must mention auth.uid() = user_id in whichever clause applies
        coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') not like '%auth.uid()%'
        or coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') not like '%user_id%'
      );
    if n > 0 then
      problems := problems || format('%s: %s policy(ies) not scoped to auth.uid() = user_id', t, n);
    end if;

    select count(*) into n
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = t
      and (p.roles && array['anon', 'public']::name[]);
    if n > 0 then
      problems := problems || format('%s: %s policy(ies) granted to anon/public', t, n);
    end if;
  end loop;

  -- tombstone tables need somewhere to put the stamp
  foreach t in array tombstone_tables
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'deleted_at'
    ) then
      problems := problems || format('%s: deleted_at missing (tombstone table)', t);
    end if;
  end loop;

  if array_length(problems, 1) > 0 then
    raise exception E'P14 schema guard FAILED — the sync surface is not safe:\n  %',
      array_to_string(problems, E'\n  ');
  end if;

  raise notice 'P14 schema guard: OK — % sync tables, RLS + owner-only policies + timestamps verified.',
    array_length(sync_tables, 1);
end;
$$;

  $qimmah_mig_20260726120005$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260726120005', '20260726120005_p14_schema_guard.sql');
end
$qimmah_mig_20260726120005_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260806120001_entitlements_core.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260806120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260806120001') then
    raise notice 'تخطٍّ: 20260806120001_entitlements_core.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260806120001$
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
-- لا فهرس يدوي على user_id: قيد `unique` أعلاه يُنشئ فهرسه بنفسه، والثاني
-- تكرار يكلّف كتابةً بلا مكسب قراءة.

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
-- ⚠️ `revoke all` ثم منح `select` وحده — **لا** سحب `insert, update, delete` فقط.
-- السحب الانتقائي يترك **TRUNCATE** بيد `authenticated`، و**RLS لا يحرس TRUNCATE
-- إطلاقًا**: هي صلاحية جدول لا صفّ. فكان بوسع أي مستخدم مسجَّل تنفيذ
-- `truncate public.entitlements` ومحو منح **كل** المستخدمين — أُثبت عمليًا قبل
-- الإصلاح. يحرسه الآن فحص TRUNCATE في `test:entitlements`.
revoke all on public.entitlements            from anon, authenticated;
revoke all on public.access_code_redemptions from anon, authenticated;
grant select on public.entitlements            to authenticated;
grant select on public.access_code_redemptions to authenticated;

  $qimmah_mig_20260806120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260806120001', '20260806120001_entitlements_core.sql');
end
$qimmah_mig_20260806120001_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '1/6'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  13                                                  as expected,
  case when count(*) filter (where m.version is not null) = 13
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260713120001'), ('20260713120002'), ('20260713120003'), ('20260713120004'), ('20260713120005'), ('20260713120006'), ('20260713120007'), ('20260726120001'), ('20260726120002'), ('20260726120003'), ('20260726120004'), ('20260726120005'), ('20260806120001')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;
