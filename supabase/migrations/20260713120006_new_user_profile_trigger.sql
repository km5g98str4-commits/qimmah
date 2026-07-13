-- ============================================================================
-- 20260713120006 - auto-create a profiles row on signup
-- ============================================================================
-- Keeps the app's assumption (profiles row exists for every account) true even
-- before the first onboarding push. SECURITY DEFINER so it can insert during the
-- auth signup transaction; search_path pinned empty + fully-qualified names.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
