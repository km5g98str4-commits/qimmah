# Milestone 4A — Backend & Privacy Readiness (Qimmah iOS)

> Preparation package. **No Supabase changes are applied by this repo.** The one
> safe/local code change made alongside this doc is the client-side account-deletion
> fix (delete all user-owned tables by `user_id`, not `id`) in `src/lib/authContext.tsx`.

Grounded in the actual code:
- Cloud tables in use (via `syncService.ts` / `onboardingSync.ts`): **`profiles`,
  `workout_sessions`, `exercise_history`, `measurement_logs`, `daily_logs`** — all keyed
  by `user_id`.
- Everything is local-first (localStorage + `historyStore`); the cloud is a per-user
  backup/sync of the above tables. No third-party analytics SDK is present.

---

## 1) `delete_own_account` — production SQL

### Final SQL (recommended: explicit deletes, no FK-cascade assumption)

```sql
-- Self-service account deletion. Deletes the caller's own rows and auth user.
-- SECURITY DEFINER runs as the function owner (bypasses RLS for the delete),
-- but can ONLY ever target auth.uid() (the caller from the JWT) — no parameters,
-- no dynamic SQL, so it cannot be abused to delete another user.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''          -- hardens against search_path injection
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.workout_sessions  where user_id = uid;
  delete from public.exercise_history   where user_id = uid;
  delete from public.measurement_logs   where user_id = uid;
  delete from public.daily_logs         where user_id = uid;
  delete from public.profiles           where user_id = uid;

  delete from auth.users where id = uid;   -- ends the account itself
end;
$$;

-- Least privilege: only signed-in users may call it.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

> Alternative (cascade): add `references auth.users(id) on delete cascade` to each
> table's `user_id`, then the function only needs `delete from auth.users where id = uid`.
> The explicit-delete version above is preferred because it makes **no assumption** about
> existing foreign keys and works even if cascades were never configured.

### Required privileges
- The function **owner** must be able to delete from `auth.users` (Supabase's SQL editor
  runs as an admin role that satisfies this — create the function there).
- Callers only need `EXECUTE` (granted to `authenticated`, revoked from `anon`/`public`).

### `SECURITY DEFINER` safety
- Target is always `auth.uid()` — derived from the verified JWT, not a parameter.
- No parameters, no dynamic SQL → cannot be coerced to another user's id.
- `set search_path = ''` prevents a malicious schema from shadowing objects.
- `revoke ... from anon` → cannot be called anonymously.
- **No service-role key is ever exposed to the client** — the client calls
  `supabase.rpc('delete_own_account')` with the normal anon key + the user's session.

### RLS assumptions
- RLS does **not** restrict the `SECURITY DEFINER` body (runs as owner) — intended, so the
  function can fully delete the account.
- The **client-side best-effort deletes** (fallback if the function isn't deployed yet) DO
  rely on per-user `DELETE` RLS policies (section 2). Without them, the fallback silently
  no-ops (caught), but the RPC still does the real work once deployed.

### Rollback notes
- DDL rollback: `drop function public.delete_own_account();` (and drop any cascade FKs if
  you added them).
- **Data is irreversible** by design — a deleted account/user data cannot be restored.
  The only "rollback" is of the migration, not the data.
- Deploy in staging first; verify with a throwaway account before production.

---

## 2) RLS review checklist

Run for **every** user-owned table: `profiles`, `workout_sessions`, `exercise_history`,
`measurement_logs`, `daily_logs`.

- [ ] `alter table public.<t> enable row level security;`
- [ ] **SELECT own**: `using (auth.uid() = user_id)`
- [ ] **INSERT own**: `with check (auth.uid() = user_id)`
- [ ] **UPDATE own**: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`
- [ ] **DELETE own**: `using (auth.uid() = user_id)`  ← needed for the client fallback
- [ ] No policy grants cross-user access (no `using (true)` on these tables).
- [ ] `anon` role has **no** access to user tables (only `authenticated`).

Example (repeat per table):
```sql
alter table public.profiles enable row level security;
create policy "own_select" on public.profiles for select using (auth.uid() = user_id);
create policy "own_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own_update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.profiles for delete using (auth.uid() = user_id);
```

**Public/read-only tables:** none today (food/exercise reference data is bundled in the
app, not in Supabase). If any reference table is added later, keep it read-only:
`grant select` to `authenticated`/`anon`, **no** insert/update/delete policy.

---

## 3) Public Privacy Policy

- **Recommended URL:** a public static page on the existing Cloudflare Pages deploy, e.g.
  `https://qimmah-8qp.pages.dev/privacy` (or a dedicated marketing domain). Must be a
  **public web URL** — the in-app `PrivacyView` does **not** satisfy App Store review.
- Provide the same URL in App Store Connect (App Privacy → Privacy Policy URL).

### Required content sections
1. Who we are + contact.
2. **Data we collect:** account **email**; fitness/health data **you enter** (workouts,
   sets/reps/weight, body measurements, nutrition logs, supplements/medications you choose
   to track); app preferences.
3. **How it's stored:** on your device (local-first) and, when signed in, backed up to your
   own account in our cloud provider (Supabase).
4. **Camera:** used only to **scan product barcodes on-device**; no images are uploaded.
5. **Fitness/health data handling:** used only to run the app's tracking features; **not**
   sold, **not** used for advertising, **not** shared for third-party marketing. Medication
   tracking is **for personal tracking only, not medical advice**.
6. **Third parties (processors):** Supabase (backup/sync of your data); Open Food Facts
   (barcode lookups send only the product barcode, not personal data).
7. **Account deletion:** how to delete in-app (Settings → Delete account) and what it
   removes.
8. Data retention, children's policy, changes to policy, **support contact**.

---

## 4) App Store Connect — App Privacy Labels

Declare in App Store Connect → App Privacy. Current app (no analytics/ads SDK):

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|-----------|-----------|--------------------|--------------------|---------|
| Contact Info → **Email Address** | Yes | **Yes** | No | App Functionality (account) |
| Health & Fitness → **Fitness** (workouts, measurements) | Yes | **Yes** | No | App Functionality |
| Health & Fitness → **Health** (nutrition, supplements, meds you log) | Yes | **Yes** | No | App Functionality |
| User Content → **Other User Content** (notes) | Yes | **Yes** | No | App Functionality |
| Identifiers → **User ID** | Yes | **Yes** | No | App Functionality |
| Usage Data / Diagnostics | **No** | — | — | (no analytics SDK present — verify before submit) |

- **Tracking:** **None** (no cross-app/website tracking, no ad identifiers).
- **Third-party sharing:** **None for advertising.** Supabase is a **processor** (your
  backend), not "sharing" in Apple's sense. Open Food Facts receives only a product barcode.
- **Data used to track you:** none.
- Before submitting: confirm no analytics/crash SDK was added; if one is added later, add
  Diagnostics/Usage accordingly.

---

## Deployment order (when approved)
1. Deploy RLS policies (section 2) to staging → verify.
2. Deploy `delete_own_account` (section 1) → verify with a throwaway account
   (confirm auth.users row + all 5 tables are gone).
3. Publish the public Privacy Policy page + set the URL + support URL in App Store Connect.
4. Fill App Privacy Labels per section 4.
5. Promote to production.
