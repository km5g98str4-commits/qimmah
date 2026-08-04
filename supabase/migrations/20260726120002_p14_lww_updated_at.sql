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
