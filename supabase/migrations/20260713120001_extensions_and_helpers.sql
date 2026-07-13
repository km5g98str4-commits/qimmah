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
