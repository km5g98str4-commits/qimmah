# Breach Response Runbook — Qimmah (PDPL / SDAIA)

> Closes PDPL gap **B-1** (`docs/legal/pdpl-gap-checklist.md`, on branch
> `legal/appstore-pack`): "No documented breach-response process." Saudi PDPL
> requires the controller to notify **SDAIA
> within 72 hours** of becoming aware of a personal-data breach, and to inform
> **affected data subjects without undue delay** where risk is high.
>
> **Controller:** Qimmah App — represented by its owner. **Owner contact / DPO:**
> `[OWNER-EMAIL]` · user-facing `support@qimmah.app`.
> This runbook traces to the code as merged on `integration/wave3`.

## 0. What data exists (scope of any breach)

| Location | Data | Code anchor |
|---|---|---|
| **Supabase (cloud)** — account | email, password hash, display name | Supabase GoTrue; client `src/lib/supabaseClient.ts` (`DEFAULT_SUPABASE_URL = …ledlypcyrtnzvjvhykwz.supabase.co`) |
| **Supabase (cloud)** — synced app data (13 tables, RLS own-row) | `profiles, workout_sessions, exercise_history, measurement_logs, daily_logs` (`…120002`), `nutrition_logs, water_logs, supplement_logs, medication_logs, step_logs, achievements, custom_plans, todos` (`…120003`) | `supabase/migrations/*.sql`; RLS `…120005_rls_enable_and_policies.sql` |
| **Device (local-first)** | full history mirror in `localStorage` (`qimmah:*`) | `src/lib/historyStore.ts` (`HISTORY_KEYS`) |
| **Analytics** | anonymous counts/enums only — **no** email/name/barcode, random device id | `src/lib/analytics/index.ts` (`isValidHttpsEndpoint` HTTPS-only, consent-gated `consent==='granted'`, `getAnonId`); policy on branch `legal/appstore-pack` `docs/legal/privacy-policy.md` §analytics |

Health/fitness data is **local-first**; it reaches the cloud only for a signed-in
user via the sync queue (`src/lib/syncQueue.ts` → `syncService.flushSyncQueue`).
A lost/stolen *device* is a user-security event, not a controller breach, unless
it exposes cloud credentials.

## 1. Detect

Sources to watch (owner, weekly + on alert):
- **Supabase → Auth logs / Logs Explorer** — anomalous sign-ins, mass failures, admin/API-key use.
- **Supabase → Database → RLS** — confirm every table still shows *RLS enabled* (a disabled policy = exposure). Baseline: `…120005`.
- **Supabase → Settings → API** — unexpected `service_role` usage (server-only secret; must never be in the app — see `.claude/rules/security.md`).
- **App reports** — users emailing `support@qimmah.app` about foreign data / account access.

Declare a **suspected breach** the moment any of the above indicates unauthorized access, disclosure, loss, or alteration of personal data. Record the **awareness timestamp (UTC)** — the 72h clock starts here.

## 2. Contain (first 1–4h)

1. **Rotate the anon key** — Supabase → Settings → API → roll `anon`/publishable key; update `VITE_SUPABASE_ANON_KEY` and ship. (URL/anon are public by design; rotate to invalidate abuse.)
2. **Revoke sessions** — Supabase → Auth → sign out all users / rotate JWT secret. App restores from `storageKey: 'qimmah:supabase-auth:v1'`; rotation forces re-auth.
3. **If service_role leaked** — rotate it immediately; audit all rows changed since the leak window.
4. **Freeze sync if a data path is implicated** — sync is gated by `syncAllowedFor()` (`syncQueue.ts`, requires signed-in owner + `!recoveryActive`); a build with `isSyncEnabled()` false stops cloud writes without data loss (local queue persists).
5. **Preserve evidence** — export Supabase logs before rotation; do not delete.

## 3. Assess (parallel, within 24h)

- **Scope:** which tables/rows/users? RLS own-row (`auth.uid() = user_id`) limits blast radius to the compromised path.
- **Data categories:** account (email) vs health/fitness (special-category → higher risk) vs anonymous analytics (not personal → typically excludes).
- **Risk to subjects:** likelihood + severity of harm → decides whether affected-user notice is required.
- **Root cause:** credential leak, RLS regression, dependency CVE, phishing.

## 4. Notify SDAIA — within 72h of awareness

Submit via the SDAIA channel (owner's counsel confirms the current portal/form). Include:
- controller identity + DPO contact (`[OWNER-EMAIL]`);
- breach description, categories & approximate number of subjects/records;
- awareness timestamp and timeline;
- likely consequences;
- measures taken/proposed (containment above);
- whether affected subjects were/will be notified.

If full facts aren't ready by 72h, **notify on time with what is known** and supplement. Log the submission reference.

## 5. Notify affected users — without undue delay (high risk)

Send in-app and/or by email to affected accounts. Templates below (fill `[…]`).

### Arabic (المتأثّرون)
> **بخصوص أمان بياناتك في قِمّة**
> نكتب إليك لإبلاغك بحادثة أمنية اكتُشفت بتاريخ `[التاريخ]` قد تكون أثّرت في بياناتك
> (`[نوع البيانات: بريد الحساب / سجلّات التمرين …]`). فور علمنا اتخذنا هذه الخطوات:
> `[إبطال الجلسات / تدوير المفاتيح / …]`. للحيطة، نوصي بتغيير كلمة المرور، والحذر من رسائل
> تنتحل صفة قِمّة. لا نطلب كلمة مرورك أبدًا عبر البريد. للاستفسار: `support@qimmah.app`.
> نعتذر عن القلق، ونلتزم بحماية بياناتك. — فريق قِمّة

### English (affected)
> **About the security of your Qimmah data**
> We're writing to let you know about a security incident detected on `[date]` that
> may have affected your data (`[category: account email / workout logs …]`). On
> becoming aware we: `[revoked sessions / rotated keys / …]`. As a precaution we
> recommend changing your password and being alert to messages impersonating Qimmah
> — we never ask for your password by email. Questions: `support@qimmah.app`.
> We're sorry for the concern and remain committed to protecting your data. — The Qimmah team

## 6. Recover & learn (≤ 2 weeks)

- Confirm RLS re-enabled on all 13 tables; re-run the DB verifier: `node scripts/db/run-verify-rls.mjs` (needs staging `SUPABASE_*`, see `scripts/db/apply-guide.md`).
- Users can self-remediate: change password (in-app reset, see `docs/QA-RESET-PASSWORD.md`) or delete account (`public.delete_own_account`, `…120007`, which cascades + wipes rows).
- Post-incident note: root cause, timeline, fix, prevention. Store with this runbook.

## Timeline summary

| Clock from awareness | Action |
|---|---|
| 0h | Declare, timestamp, start log |
| 1–4h | Contain (rotate keys, revoke sessions, freeze sync) |
| ≤24h | Assess scope & risk |
| **≤72h** | **Notify SDAIA** |
| ASAP (high risk) | Notify affected users (templates above) |
| ≤2wk | Recover, verify RLS, post-incident review |
