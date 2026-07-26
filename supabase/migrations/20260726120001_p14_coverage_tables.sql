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
