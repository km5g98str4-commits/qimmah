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
  values      jsonb not null default '{}'::jsonb,
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
