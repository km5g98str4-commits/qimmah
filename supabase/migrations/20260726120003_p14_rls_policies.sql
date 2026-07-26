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
