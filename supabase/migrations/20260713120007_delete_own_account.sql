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
