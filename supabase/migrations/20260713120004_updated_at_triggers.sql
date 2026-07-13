-- ============================================================================
-- 20260713120004 — updated_at triggers for every user table
-- ============================================================================
-- Idempotent: drop-then-create each trigger. One shared table list drives this
-- and the RLS migration — adding a table = editing the array in both places.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs',
    'nutrition_logs','water_logs','supplement_logs','medication_logs','step_logs',
    'achievements','custom_plans','todos'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;
