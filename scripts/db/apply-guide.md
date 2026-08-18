# Qimmah — Supabase schema apply & verify guide

Owner-run steps to apply the migrations and **prove** RLS + account deletion on a
real project. Nothing here is applied automatically; the app ships no service key.

> This schema serves the **Capacitor iOS app's sync engine** (`src/lib/syncService.ts`,
> `src/lib/onboardingSync.ts`). It is local-first: device is the source of truth,
> Supabase is the per-account cloud mirror.

---

## 0. Staging first (strongly recommended)

Create a **separate staging project** and run everything there before prod:

- Staging = a throwaway Supabase project. `db:verify` creates and deletes test
  users on it — never run it against production.
- Keep prod and staging keys in separate env files. The `service_role` key is
  **server-only** — never `VITE_`, never committed, never in the app bundle.

Project separation closes the "shared template DB" risk: profile upserts from
testers must never land in a shared/default project.

---

## 1. Apply the migrations

The migrations live in `supabase/migrations/` and are **idempotent** (safe to
re-run over any prior install; no user-data table is ever dropped).

### Option A — Supabase CLI (preferred)

```bash
supabase link --project-ref <your-project-ref>
supabase db push        # applies every migration in timestamp order
```

### Option B — SQL editor (manual)

Paste and run each file **in filename order**:

1. `20260713120001_extensions_and_helpers.sql`
2. `20260713120002_core_active_tables.sql`
3. `20260713120003_sync_target_tables.sql`
4. `20260713120004_updated_at_triggers.sql`
5. `20260713120005_rls_enable_and_policies.sql`
6. `20260713120006_new_user_profile_trigger.sql`
7. `20260713120007_delete_own_account.sql`
8. `20260726120001_p14_coverage_tables.sql`
9. `20260726120002_p14_lww_updated_at.sql`
10. `20260726120003_p14_rls_policies.sql`
11. `20260726120004_p14_measurement_logs_tombstone.sql`
12. `20260726120005_p14_schema_guard.sql`
13. `20260806120001_entitlements_core.sql`
14. `20260806120002_entitlement_rpcs.sql`
15. `20260806120003_table_privileges_hardening.sql`
16. `20260809120001_revocation_ledger.sql`
17. `20260809120002_code_grant_recovery.sql`
18. `20260809120003_public_execute_hardening.sql`
19. `20260809120004_entitlement_security_remediation.sql`
20. `20260812120001_salla_webhook_ingest.sql`
21. `20260816120001_commerce_integrity_fixes.sql`
22. `20260816120002_founder_role_provisioning.sql`
23. `20260816120003_founder_dashboard_reads.sql`
24. `20260816120004_email_outbox.sql`

> **القائمة مولَّدة من `supabase/migrations/` ويحرسها `test:migration-guide`.**
> كانت تتوقّف عند الملف الثاني عشر بينما المستودع يشحن أربعة وعشرين — أي أن اثني
> عشر ملفًا (الاستحقاقات · التجارة · ويبهوك سلة · **دور المؤسس** · **قراءات
> اللوحة** · صندوق البريد) لم تكن مذكورة إطلاقًا. فمن يتبع الخيار (ب) حرفيًّا
> يطبّق نصف المخطّط ثم يجد اللوحة التنفيذية مغلقة عليه بلا سبب ظاهر — والسبب
> وثيقةٌ شاخت، لا عطل في الكود. **الملفّان ٢٢ و٢٣ هما اللذان يفتحان اللوحة.**

Re-running any file is safe — **and order matters on a re-run**: file 12 is the
convergence step that resolves the one collision a full re-run can create (file 4
re-adds the plain `set_updated_at` trigger to `measurement_logs`; file 12 removes
it again in favour of the LWW one). It also refuses to finish if any sync table is
missing RLS, a policy, a timestamp or its cascade FK — a failed guard means the
migration transaction aborts, which is the point: a half-secured schema must never
report as applied. Background: `docs/data/SUPABASE-P14-SCHEMA.md`.

---

## 2. Precondition for automated verification

`db:verify` creates two fresh throwaway users each run, so on the **staging/test**
project:

- **Auth → Providers → Email → “Confirm email” = OFF** (so `signUp` returns a
  session immediately). Leave it **ON** for production.

---

## 3. Run the verification

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon key>"
# optional, staging only — enables definitive post-deletion row-count checks:
export SUPABASE_SERVICE_ROLE_KEY="<service role key>"

npm run db:verify
```

It asserts, for **every** user table:

- own INSERT/UPSERT succeeds, own SELECT returns own rows
- cross-user SELECT / UPDATE / DELETE are all blocked (0 rows)
- cross-user INSERT (`user_id` = other) is rejected by `WITH CHECK`
- anon SELECT returns 0 rows, anon INSERT is rejected

plus, on the four tombstone tables: a wiped tombstone upsert is accepted, the
client's `deleted_at`/`updated_at` survive the trigger (the LWW evidence stays
intact), a tombstone that still carries a payload is **rejected**, and a newer
edit revives the row;

then calls `delete_own_account()` and asserts every table is wiped for that user
(service key) **or** that the deleted user can no longer authenticate (cascade
guaranteed by the FKs). Both test users are removed at the end — no residue.

Exit code `0` = all green; `1` = a check failed (printed in the FAILURES list);
`2` = missing env / precondition.

---

### Offline pre-check (no project needed)

```bash
npm run test:db-schema
```

Reads the client's `SyncTable` union and the migration folder and proves they
agree: column/key contract, RLS with four owner-only policies, **two-account
isolation executed against the policy predicates parsed out of the migrations**,
tombstone columns, re-runnability, and non-destructiveness. It runs inside
`npm run test:gate`. It cannot replace `db:verify` — it does not prove Postgres
accepts the SQL — but it catches every client↔DB drift before a project is touched.

---

## 4. Manual spot-checks (SQL editor, optional but good for the record)

```sql
-- Every user table has RLS enabled:
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and relname in (
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs',
    'nutrition_logs','water_logs','supplement_logs','medication_logs','step_logs',
    'achievements','custom_plans','todos',
    'nutrition_ledger','recovery_logs','workout_schedule','plan_templates'
  )
order by relname;   -- expect relrowsecurity = true for all 17

-- Exactly four policies per table, all owner-scoped:
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- Deletion RPC exists, is SECURITY DEFINER, and anon cannot execute it:
select proname, prosecdef from pg_proc where proname = 'delete_own_account';
```

Also run **Database → Advisors** (Security + Performance) and confirm no RLS gaps.

---

## 5. Rollback notes

- Migrations are additive and idempotent; re-applying fixes drift.
- To reset **RLS policies** only: re-run `..._rls_enable_and_policies.sql` — it
  drops all existing policies per table and recreates the canonical four.
- **Never** `drop table` a user-data table as a rollback step. Dropping user
  data is a separate, deliberate, reviewed operation — never automated.
- The tables are protected by `ON DELETE CASCADE` to `auth.users`, so deleting a
  project's auth users cleans their rows regardless of policy state.
