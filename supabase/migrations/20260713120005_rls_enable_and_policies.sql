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
