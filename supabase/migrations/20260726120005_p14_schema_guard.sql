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
