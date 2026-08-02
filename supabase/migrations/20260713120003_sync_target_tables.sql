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
