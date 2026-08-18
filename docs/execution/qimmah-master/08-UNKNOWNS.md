# 08 — UNKNOWNS REGISTER (سجلّ المجهول)

> **Canonical owner of one fact only: what we do not know, and the exact task that would settle it.**
> "Probably", "looks like" and "should be" are not project state. Anything not `VERIFIED`
> lives here with a **concrete discovery task** — never as a vague worry.

Every row: what is unknown · why it matters · **the exact command or action that resolves it** · who can run it.

---

## UNK-01 — Is `VITE_ENTITLEMENT_MODE=mock` ever set in a real deploy? 🔴 entitlement integrity

`src/lib/access/entitlementSource.ts:34` — when this build-time variable equals `mock`, the
client grants Premium from `sessionStorage` and **never asks the server**
(`entitlementSource.ts:103,133-135`; code `QIMMAH-TEST-OK` flips it on).

The guard is real: `mockEnabled()` is checked before the key is ever read, so a production
build cannot be tricked at runtime. **What is unknown is build-time**: the variable appears
in **no** `.env.example`, **no** `vite.config.ts`, **no** `wrangler.toml`. So we cannot prove
it is unset in the Cloudflare Pages project.

- **why it matters:** if it is set on any deployed environment, entitlement is client-authoritative there — DEC-005 broken in fact while true in code.
- **resolve:** Cloudflare Pages → project `qimmah` → Settings → Environment variables; confirm `VITE_ENTITLEMENT_MODE` is absent for **both** production and preview. Then `grep -r "QIMMAH-TEST-OK" dist/assets/` on a production build → must be empty.
- **who:** founder (Cloudflare is unreachable from agent containers) · **task:** `QIM-V1-006`

## UNK-02 — Which of the 24 migrations are actually applied to production? 🔴

`13 APPLY_PENDING` is inherited from an earlier report, not measured against the live database.
- **why it matters:** it sets what "production" even means for entitlement, Salla and admin.
- **resolve:** against the production project — `select * from supabase_migrations.schema_migrations order by version;` then diff against `ls supabase/migrations/`. Then `npm run test:db-schema` pointed at production.
- **who:** founder (DEC-003 — an agent may write a migration, never apply one) · **task:** `FA-03`

## UNK-03 — Is the email provider live? 🟠

`20260816120004_email_outbox.sql` + `supabase/functions/qimmah-mailer/` exist and are
proof-covered. Whether a provider credential is configured, and whether any mail has ever
been delivered, is unmeasured from here.
- **why it matters:** activation codes and password reset are delivered by email. A dead provider = a dead commercial path with no error surfaced to anyone.
- **resolve:** confirm `QIMMAH_MAILER_SECRET` and the provider credential in the Supabase panel; then `select state, count(*) from email_outbox group by state;` — any `dead` row is a real delivery failure.
- **who:** founder · **task:** `QIM-V1-012` (dependency)

## UNK-04 — Does the deployed production build actually match `main`? 🟠

`BUILD_LABEL` exposes the commit hash in the footer, but Cloudflare is **unreachable from
agent containers** (`api.cloudflare.com` → 403, `*.pages.dev` → 000, `wrangler whoami` →
`fetch failed`, MCP connector has no Pages tools).
- **resolve (read-only, works):** `curl -s "https://r.jina.ai/https://qimmah-8qp.pages.dev/" | grep -i "build\|qimmah-env"` — expect `cc60adf` and `production`.
- **who:** anyone with normal network; founder for authoritative confirmation · **task:** `QIM-V1-007`

## UNK-05 — Salla store: what does the live product page actually say? 🟠

**DEC-015** settles the policy (19.99, one-time, no permanent second price). What is still
unmeasured is the **live storefront**: the violating strings are known from repo documents, not
from the store itself.
- **why it matters:** the copy the customer actually reads is the claim we are liable for.
- **resolve:** open the live Salla product page, capture price, period and the refund line verbatim.
- **who:** founder · **task:** `FA-01`

## UNK-06 — Does any thrown error message carry user text into the console? 🟡

`ErrorBoundary.tsx:57,164` logs the error object and React `componentStack`. React does not
include props, so no direct PII — but an error *message* is unbounded, and some are built
from user input.
- **resolve:** grep every `throw new Error(` in `src/` for an interpolated user value (`${...}` fed by profile/food/search input).
- **who:** agent, read-only · **task:** `QIM-V1-009`

## UNK-07 — WebKit coverage on the current ground 🟡

WebKit evidence exists (222 ✓ · 0 ✗ across p1 · p3 · p8) but was captured on an **earlier
head**, before the SOVEREIGN-ENTRY and FOOD merges. The audience is iOS-Safari-dominant and
a WebKit-only storage bug (BUG-024) has already shipped here once.
- **resolve:** `E2E_ENGINE=webkit npm run test:e2e:onboarding` and the persona matrix on `139a7b0`. WebKit 26.5 is confirmed working on the founder's machine; **not installed in this container**.
- **who:** founder machine, or a container with WebKit · **task:** `QIM-V1-008`

## UNK-08 — Are the 82 MB food shards reachable in production? 🟡

The shards are generated and fingerprint-matched **locally**. Whether production serves them
depends on DEC-102 (commit vs host) — which is undecided, so today the answer is "no, and the
product degrades honestly".
- **resolve:** decide DEC-102, then request one shard URL from the deployed origin.
- **who:** founder · **task:** `QIM-V1-011` / `FA-02`

## UNK-09 — 37 missing images: which are rights, which are tone? 🟢

DEC-104 says the mix is both, and names `face-pull` and `arnold-press` as tone. The full
split across all 37 is not enumerated anywhere.
- **resolve:** `npm run media:audit` and annotate each gap `RIGHTS` | `TONE` | `MISSING`.
- **who:** agent produces the list, founder rules on tone · **task:** `QIM-V1-013`

---

## Closed this session — recorded so nobody re-opens them

| was unknown | now |
|---|---|
| Which branch is the real frontier? | **VERIFIED** — `139a7b0`, by containment over all 80 branches (`00-GROUND.md`) |
| Is the gate green on the frontier? | **VERIFIED** — `npm ci` · typecheck · lint · build · `test:gate` all exit 0, measured here |
| Why is CI red? | **VERIFIED** — `test:e2e:onboarding`, stale harness, first red commit `7eaed49`, reproduced locally |
| Does `main` hold anything the frontier lacks? | **VERIFIED** — no. 0 ahead, 228 behind |
| Is any valuable work stranded? | **VERIFIED** — 8 branches carry unique commits; each classified in `03-BRANCH-LEDGER.md` |
| Is admin secured by a frontend password? | **VERIFIED — no.** Server-owned `qimmah_role` in `app_metadata`; a claim forged into `user_metadata` returns a named denial (`src/admin/auth/adminRole.ts:66,88-91`) |
| Is crash reporting on? | **VERIFIED — no.** Sentry is DSN-gated and `VITE_SENTRY_DSN` is set nowhere (`src/lib/monitoring.ts:135`) → `QIM-V1-009` |
| Is sync on? | **VERIFIED — off.** `VITE_SYNC_ENABLED=""`, and only the literal `'true'` enables it (`src/lib/syncQueue.ts:11`) |
