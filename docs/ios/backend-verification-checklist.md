# Qimmah — Backend Verification Checklist (RLS + Account Deletion)

Run against a **staging** Supabase project first, never production-first. The app touches
nothing here; this is manual DB verification for the schema in `SUPABASE-SCHEMA.sql`.

## 0. Deploy
- [ ] Run `SUPABASE-SCHEMA.sql` in the target project's SQL Editor. It is idempotent (safe to
      re-run). It creates the **5 active** tables + `set_updated_at`, `handle_new_user`,
      **`delete_own_account`**, and per-user RLS. The DEFERRED appendix is commented out — do
      not enable it in v1.
- [ ] Confirm no errors; `delete_own_account` and `handle_new_user` appear under Database →
      Functions.

## 1. RLS verification (per table: profiles, workout_sessions, exercise_history, measurement_logs, daily_logs)
- [ ] **RLS is ON.** `select relname, relrowsecurity from pg_class where relname in
      ('profiles','workout_sessions','exercise_history','measurement_logs','daily_logs');`
      → every `relrowsecurity = true`.
- [ ] **Four policies exist per table** (select/insert/update/delete own). `select tablename,
      policyname, cmd from pg_policies where schemaname='public' order by tablename;`
- [ ] **Cross-user read is blocked.** Create user A and user B. As A (A's JWT), insert a row.
      As B, `select * from <table>` → **0 rows of A's data**. Repeat update/delete attempts as
      B on A's row → **0 rows affected**.
- [ ] **`anon` has no access.** With the anon key (no session), `select`/`insert` on each table
      → denied / 0 rows.
- [ ] **Auto-profile trigger.** Sign up a new user → exactly one `profiles` row exists for that
      `user_id` (`handle_new_user`).
- [ ] **FK cascade shape.** `select conname, confrelid::regclass from pg_constraint where
      contype='f' and conrelid::regclass::text like 'public.%';` → every user table FKs to
      `auth.users` with `on delete cascade`.

## 2. Account-deletion test (`delete_own_account`)
Use a **throwaway account** with data in every active table.
- [ ] Seed: as the test user, create ≥1 row in each of the 5 active tables (via the app's sync
      or manual insert with that `user_id`).
- [ ] Call it authenticated: from the app (`supabase.rpc('delete_own_account')`) or SQL Editor
      *impersonating the user's JWT* — **not** as the service role.
- [ ] **Auth user gone:** `select * from auth.users where id = '<uid>';` → 0 rows.
- [ ] **All data gone (cascade):** for each active table, `select count(*) from <t> where
      user_id = '<uid>';` → 0. (Also check any DEFERRED table if you enabled it.)
- [ ] **Session invalid:** the client is signed out; re-using the old token fails.
- [ ] **Local wipe (client side):** after the RPC, the app runs `resetQimmah()` → all
      `qimmah:*` keys cleared, app returns to the auth screen.
- [ ] **Not-authenticated guard:** calling `delete_own_account()` with no session raises
      `not authenticated` (does nothing).
- [ ] **Anon cannot call it:** with the anon role, `select public.delete_own_account();` →
      permission denied (revoked from anon/public).

## 3. Function-owner privilege check
- [ ] Confirm `delete_own_account` can delete from `auth.users` (owner has the privilege —
      true when created in Supabase SQL Editor). If deletion of `auth.users` fails, the
      function was created under an under-privileged role — recreate it in the SQL Editor.

## 4. Client contract
- [ ] `src/lib/authContext.tsx` calls `supabase.rpc('delete_own_account')` — name matches the
      function. ✅ (verified in repo)
- [ ] Client best-effort per-table deletes (`user_id`) remain as a fallback and are harmless
      (cascade already removed the rows).

## Sign-off
- [ ] Staging passes 1–3 fully.
- [ ] Only then apply to production, and re-run section 1 (RLS) + section 2 (deletion) once
      against production with a throwaway account.
