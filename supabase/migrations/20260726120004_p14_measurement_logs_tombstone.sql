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
