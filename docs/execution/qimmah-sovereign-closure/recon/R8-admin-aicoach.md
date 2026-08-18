# LANE R8 — Founder Executive Dashboard + AI Coach (read-only forensics)

Repo: `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b`
Method: static read of working tree + `supabase/migrations/**` + `dist/` + git history. No writes, no builds, no network.

---

## HEADLINE

| Question | Answer |
|---|---|
| Dashboard route | `#/admin` — real, mounted, no route guard, no UI link anywhere |
| Auth mechanism | `app_metadata.qimmah_role === 'founder'` (client) + `private.require_founder()` raising `42501` inside every `founder_*` SQL function (server). Fails closed in both layers. |
| Client secrets | **Zero.** No password, no allowlisted email, no service key. Only 2 public `VITE_*` flags. |
| Live data today | **None.** Both founder migrations are `APPLY_PENDING`, and per the runbook the 8 prior commerce migrations were never applied to any DB either. |
| Practical consequence | **No account carries `qimmah_role`** ⇒ the founder himself currently sees `AdminDenied`. |
| AI Coach | **MISSING** — never existed on any branch, and explicitly listed as out-of-scope in the backlog. |

---

# PART A — FOUNDER EXECUTIVE DASHBOARD

## A1. Module map — `src/admin/` (17 files, 3,776 lines)

| File | Lines | Role |
|---|---|---|
| `src/admin/index.ts` | 52 | Barrel. **Deliberately does not export `contract/fixtures`** so a production import stays visible in the import line. |
| `src/admin/auth/adminRole.ts` | 179 | The only security file in the lane. `resolveAdminRole` / `isAdmin` / `canRead` / `adminRoleProvisioning`. |
| `src/admin/contract/types.ts` | 272 | `MetricValue<T>` 4-state (`ready` / `loading` / `error` / `unavailable`), snapshot shapes, `PlatformPosture`. |
| `src/admin/contract/metrics.ts` | 635 | `METRIC_REGISTRY` — 39 metric definitions, each with source/aggregation/privacyClass/availability/reason. |
| `src/admin/contract/source.ts` | 182 | Builds the **absence snapshot** (every metric at its declared unavailability grade). Never calls the network. `WIRING_STATE = 'EXTERNALLY_BLOCKED'`. |
| `src/admin/contract/liveSource.ts` | 262 | The only network path: `rpc('founder_executive_snapshot')` + `rpc('founder_user_page')`. Overlays the absence snapshot. |
| `src/admin/contract/fixtures.ts` | 397 | Test fixtures (5,000-row user set). Not exported from the barrel, not in `dist/`. |
| `src/admin/model/attention.ts` | 165 | Derives the "what needs me now" queue; 3 states (detected / clean / **cannot detect**). |
| `src/admin/model/filters.ts` | 303 | Pure search/sort/paginate/virtualize + filter applicability. |
| `src/admin/ui/AdminRoute.tsx` | 93 | **The single mount point.** Resolves role first, fetches only if founder. |
| `src/admin/ui/AdminShell.tsx` | 348 | The one screen: posture strip, 3 tabs (overview / users / charts), 6 sections, ~30 metric cards, roadmap panel. |
| `src/admin/ui/AdminDenied.tsx` | 60 | Denial screen; names the reason and the provisioning state; no retry button. |
| `src/admin/ui/UserTable.tsx` | 290 | Search/sort/filter/paginate + virtualization above 60 rows. |
| `src/admin/ui/UserDetail.tsx` | 138 | Per-user drill-down panel — **never rendered on the live route** (see A5). |
| `src/admin/ui/AttentionPanel.tsx` | 96 | Renders the attention queue incl. the "cannot monitor yet" section. |
| `src/admin/ui/MetricCard.tsx` | 124 | Card with `data-metric` / `data-state`; handles all 4 states. |
| `src/admin/ui/Charts.tsx` | 180 | `TrendChart` / `FunnelChart` (inline SVG, no dependency). |

Strings: `src/i18n/dict/admin.ts` (700 lines, ar+en).

### Route — exact and reachable

- `src/lib/appRoutes.ts:38` adds `'admin'` to the `AppRoute` union; `:68` adds it to `ROUTES` (so `routeFromHash()` matches it and it is not a 404).
- `src/App.tsx:48` — lazy chunk: `AdminRoute: lazy(() => import('@/admin').then((m) => ({ default: m.AdminRoute })))`.
- `src/App.tsx:539-543` — `} else if (view === 'admin') { content = <V.AdminRoute /> }`, with an explicit comment that no route guard is applied here on purpose.
- `guardRoute()` (`src/App.tsx:112-131`) — `'admin'` is **not** in `needsAccount` and not in `MAIN_TABS`, so it passes through untouched. A logged-out guest typing `#/admin` mounts the component and gets `AdminDenied`.
- **Mount condition for the actual dashboard:** `AdminRoute.tsx:53-54` — `auth.loading ? CLOSED_DECISION : resolveAdminRole(auth.user)`, then `isAdmin(decision)`. Everything else renders `AdminDenied`.
- **Discoverability: zero.** `grep` for `navigate('admin')` / `setView('admin')` / `#/admin` outside `src/admin/` returns nothing. There is no menu item, no settings link, no footer link. The route is URL-typed only.

### Production bundle

**Included, as its own lazy chunk — not tree-shaken.**
`dist/assets/index-BQQ_77x9.js` (80,022 bytes, built at `BUILD_LABEL=bcec642`, one commit behind HEAD) contains `data-admin-shell`, `founder_executive_snapshot`, `founder_user_page`, `qimmah_role`, `EXTERNALLY_BLOCKED`.
`fixtures` / `FIXTURE` / `makeFixture`: **0 hits across all of `dist/assets`** — the fixture module is correctly excluded. (`dist/` is git-ignored, `.gitignore:7`.)

### What each proof actually proves

All six admin proofs plus the attack script are wired into `test:gate` (`package.json:77`).

| Script | What it really proves |
|---|---|
| `scripts/run-admin-mount-proof.mjs` (279) + `scripts/admin-mount-proof.tsx` | Builds the **real** module with stubbed `@/lib/supabaseClient` and `@/lib/authContext`. Proves: each non-founder persona renders `data-admin-denied` with **zero RPC calls and zero `getSupabase()` calls** (it counts the client request itself, so "fetch client then check role" cannot slip through); founder-before-data renders `data-admin-loading` with no number in the DOM; every Supabase error code maps to its named `LiveReadState` (`rpc-missing` / `denied-by-server` / `failed` / `no-backend`); a payload without `as_of` is rejected **entirely**; a missing field/block ⇒ `unavailable`, not `0`; string / `null` / `NaN` ⇒ `unavailable`; a **measured** `0` passes through as `0`; an injected `redemptionFailures24h` key is ignored because it has no source; a malformed row drops the **whole page** not half of it; emails arrive masked. Also scans the built bundle and `dist/` for fixtures and privileged keys. |
| `scripts/run-admin-render-proof.mjs` (156) + `admin-render-proof.tsx` | Server-renders `AdminShell` in ar and en. Proves: the denial screen leaks **no** dashboard trace and is <3,000 chars (no hidden panel in the output); founder sees `data-admin-shell` + `data-metric` cards; all 4 metric states surface as `data-state`; ≥15 unavailable cards exist and **none of them prints `0`**; every declared unavailability reason string is actually displayed; no ar/en cross-leak; a 5,000-row table renders <60 rows (virtualization); ≥8 filters render `disabled`; no full email addresses. `--emit` writes `docs/proof/admin/admin-preview.html`. |
| `scripts/run-admin-access-denial-proof.mjs` (143) + `admin-access-denial-proof.ts` | Battery on `resolveAdminRole` / `canRead` / `adminRoleProvisioning`, and asserts the provisioning migration file exists on disk. **Plus mutation testing**: it corrupts the guard four ways (most importantly, making it read `user_metadata`) and requires the battery to **fail** each time. |
| `scripts/run-admin-secret-leak-proof.mjs` (159) | Three layers: (1) no `service_role` / `SUPABASE_SERVICE_ROLE_KEY` / `supabaseAdmin` name or JWT value anywhere in `src/`; (2) the service key in `.env.example` carries **no** `VITE_` prefix, and every client env read is `VITE_*`, and the admin code reads only its two declared flags; (3) `dist/` scanned both by name and by **decoding JWT payloads and checking the role claim**. Closed with an injection simulation proving the scanner is not silently inert. |
| `scripts/run-admin-dashboard-proof.mjs` (251) + `admin-dashboard-proof.ts` | Registry↔doc parity (every metric documented both ways), no duplicate ids, `backendGap` only paired with `NEEDS_BACKEND`, `AVAILABLE_NOW` restricted to the platform group and never naming a table, **no `?? 0` / `|| 0` in any UI or contract file**, live reader builds on the gap snapshot and checks the role *before* `getSupabase(`, `source.ts` does not import fixtures, `WIRING_STATE` literal present. Then unit-proves filter/sort/paginate/search on 5,000 fixture rows and that a **disabled filter never filters** (would otherwise return an empty list that reads like an answer). Ends with file-level circumvention simulation on a temp tree. |
| `scripts/run-admin-db-proof.mjs` (283) | **Executed, not textual.** Runs the repo's migration files on real Postgres in-process (PGlite) and exercises four personas: anon, ordinary user, forger writing `raw_user_meta_data`, provisioned founder. Counter-assertion: a second environment with `perform private.require_founder();` stripped, where the ordinary user must **succeed** — otherwise the denial in the healthy env proved nothing. This is where the tri-valued-logic fail-open bug (`NULL = 'founder'` ⇒ `NULL`, and `if not NULL` never executes) was caught and fixed with `coalesce(..., false)`. |
| `scripts/attack/admin-escalation-attack.mjs` | Twisted claim shapes (null / object / array / case / whitespace / `__proto__` / `Symbol`), the full Supabase session shape (`session.user.app_metadata`), the both-claims case (server wins), and a **declared limit**: a claim inherited via prototype *is* read — mitigated only because `app_metadata` is built by `JSON.parse`, which inherits nothing. |

---

## A2. Authority — how founder identity is established

**Client layer** — `src/admin/auth/adminRole.ts`:
- `:66` `ADMIN_ROLE_CLAIM = 'qimmah_role'`; `:69` whitelist is the single value `'founder'`.
- `:83-105` `resolveAdminRole()` reads **only** `session.app_metadata[claim]`. Order is deliberate: forgery is checked *before* acceptance, so a claim living in `user_metadata` returns the named reason `'forged-claim'` (`:89-92`) rather than being silently folded into "no role".
- `:53` `CLOSED_DECISION = { role: 'denied', reason: 'not-resolved' }` is both the initial state and what `AdminRoute.tsx:53` uses **while auth is still loading** — unresolved denies exactly like rejected.
- `:119-127` `canRead()` additionally gates `privacyClass: 'product'` fields behind an explicit `drilldown` flag, so a founder does not fetch what the screen is not showing.

**Server layer** — `supabase/migrations/20260816120002_founder_role_provisioning.sql`:
- `private.account_role(uuid)` reads `auth.users.raw_app_meta_data ->> 'qimmah_role'` — never `raw_user_meta_data` (which the account owner can write via `auth.updateUser`, the same path `authContext.tsx` uses for `display_name`).
- `private.is_founder()` returns `coalesce(private.account_role(uid) = 'founder', false)`.
- `private.require_founder()` raises `'founder_role_required'` with `errcode = '42501'` when `private.is_founder() is not true` (belt-and-braces against three-valued logic). It is the **first statement** in both read functions (`20260816120003:57` and `:162`).
- All functions are `security definer` with `set search_path = ''`.
- **Role issuance is `service_role`-only**: the grant/revoke functions in `20260816120002` are revoked from `public, anon, authenticated`. There is no policy, function, or trigger that lets a user grant themselves or anyone else.
- Client-side classification of the server's refusal: `liveSource.ts:105-113` maps `42501` / `founder_role_required` → `'denied-by-server'`, `PGRST202` / `42883` → `'rpc-missing'`.

**Client-side secrets: none.**
`grep -niE "password|secret|passcode|api[_-]?key|token|allowlist|@gmail|ziyad|ADMIN_EMAIL|founderEmail"` over `src/admin/` **and** `src/lib/access/` → **0 hits**. The only `import.meta.env` reads in `src/admin/` are `VITE_SYNC_ENABLED` and `VITE_ENTITLEMENT_MODE` (`source.ts:76,78`) — both public posture flags, and `test:admin-secret-leak` asserts the admin code reads exactly those two and nothing else.

**Fails closed?** Yes, in both layers, and the closure is proven by execution (`test:admin-db`) and by mutation (`test:admin-access-denial`).

⚠️ **But the practical state today is stricter than intended.** `20260816120002` is `APPLY_PENDING`, so **no account in any database carries `qimmah_role`**. The dashboard is therefore currently unreachable *for the founder as well*: every visitor to `#/admin` gets `AdminDenied` with reason `no-role-claim`. There is no client-side override, and correctly so.

---

## A3. KPI coverage — required executive set vs. what exists

Registry totals (`src/admin/contract/metrics.ts`): **39 metrics** — 4 `AVAILABLE_NOW`, 27 `NEEDS_BACKEND` (23 `endpoint-missing`, 4 `source-system-missing`), 8 `IMPOSSIBLE_WITHOUT_CONSENT_CHANGE`.

Definitions used below: **PRESENT** = card exists, RPC computes it, would light up the moment the migrations are applied. **PARTIAL** = defined and rendered but the source or the read path is incomplete. **ABSENT** = no metric, no card, no query.

| Required executive metric | Status | Evidence |
|---|---|---|
| Total users | **PRESENT** | `users.total` · `select count(*) from public.profiles` (`20260816120003:62`) · card `AdminShell.tsx:198` |
| New today | **PRESENT** | `users.newToday` · counted from **Riyadh midnight**, not UTC (`:60`) |
| New 7d | **PRESENT** | `users.new7d` |
| New 30d | **PRESENT** | `users.new30d` |
| Preview count | **PRESENT** | `entitlement.previewOnly` — derived server-side as `profiles − active grants`, floored at 0 |
| Trial active | **PRESENT** | `entitlement.trialActive` via `private.derive_state(...)` (state derived at DB time, not from a stored column) |
| Trial expired | **PRESENT** | `entitlement.trialExpired` |
| Premium | **PRESENT** | `entitlement.premiumActive` |
| Purchases | **PRESENT** | `commerce.ordersSeen` / `ordersPaid` (`purchase_ledger`) / `ordersFailed` (`salla_webhook_events.classification`) |
| Activation codes issued | **PRESENT** | `commerce.codesIssued` ← `count(*) from public.access_codes` |
| Activation codes redeemed | **PRESENT** | `commerce.codesRedeemed` ← `code_redemption_ledger` |
| Activation codes **failed** | **ABSENT (declared)** | `commerce.redemptionFailures24h` + `entitlement.activationFailed24h` are declared with `backendGap: 'source-system-missing'` — **no audit log of rejected redemption attempts exists**, and `metrics.ts:519` states building one is a security decision (storing attempted codes would create a guessing dictionary). `liveSource.ts:190` refuses to read this key even if the payload ever contained it. |
| Onboarding completion | **PARTIAL / structurally blocked** | `onboarding.completionRate` + `stuckCount` exist and render, but are marked `IMPOSSIBLE_WITHOUT_CONSENT_CHANGE`: the numerator (`profiles.data._meta.completed`) only reaches the server through consented sync, so the ratio would be biased. Honest by design, not a wiring gap. |
| Reveal completion | **ABSENT** | No metric id mentions plan reveal / preview-reveal anywhere in the registry. |
| CTA → Salla funnel | **ABSENT** | No client analytics reach any server. `trackLocal()` is local-only; `errors.clientErrors24h` documents that no client pipeline exists at all. |
| Salla → activation funnel | **PARTIAL** | `entitlement.activationFunnel` (`liveSource.ts:176-180`) has 3 stages: issued → redeemed → active. That is the **code** funnel. The order→grant leg (`salla_webhook_events` → `purchase_ledger` → `entitlements`) has all three counts but no funnel view joining them. |
| Recent activity | **PARTIAL** | `activity.signedIn7d` / `signedIn30d` are real (from `auth.users.last_sign_in_at`) and explicitly labelled "signed in", not "active" — the comment at `20260816120003:88` calls out that a renewed session is not usage. There is no event feed / recent-actions list. |
| Inactive users | **PRESENT** | `activity.dormant30d` (`last_sign_in_at is null or < now()-30d`). Table filters `inactive7d` / `inactive30d` exist but are **disabled with a named reason** (`filters.ts`). |
| System errors | **ABSENT (declared)** | `errors.clientErrors24h` + `errors.rpcFailures24h` are declared `source-system-missing`. The section stays on screen deliberately — deleting it would read as "no errors"; showing "unavailable" reads as "we do not measure". |
| Top food searches | **ABSENT** | No metric, no card, no table. Nothing in the registry mentions food. |
| Top exercise views | **ABSENT** | Same — `attn.exerciseMediaMissing` exists in the attention queue but it is a content-gap signal, not a usage metric. |
| Popular workouts | **ABSENT** | `activity.workoutsCompleted7d` exists as a **count**, marked consent-biased; there is no per-workout breakdown. |
| Funnel abandonment | **PARTIAL** | `onboarding.funnel` renders 3 stages (signed_up → started → completed), but two of the three stages are fed by the *same* biased metric (`source.ts:155-160`), so abandonment cannot actually be computed. Chart renders; number does not exist. |

**Extra metrics present beyond the required set:** `users.verified`, `commerce.revokedActive`, `entitlement.conversionOfAccounts`, `users.growthSeries` (90-day daily series), plus the 4 platform posture facts (build label, sync flag, entitlement source, backend configured) — the only 4 that work with no server at all.

**Summary: 12 PRESENT · 5 PARTIAL · 7 ABSENT** of the 24 required items. The absent cluster is coherent: **everything requiring product-usage telemetry or a client error pipeline is missing, because neither exists.** That is a declared architectural gap, not an oversight — but it is a real gap for launch decision-making.

---

## A4. Data source per metric, and the empty-state behaviour

**Single read path.** `src/admin/contract/liveSource.ts` is the only file in `src/admin/` that touches the network. It calls exactly two RPCs, named as constants in `metrics.ts:37-39` and bound to the migration by `test:admin-db`:

- `public.founder_executive_snapshot()` → one `jsonb` with `as_of` + `users` + `activity` + `entitlement` + `commerce` blocks (`supabase/migrations/20260816120003_founder_dashboard_reads.sql:45-133`).
- `public.founder_user_page(p_search text, p_page int, p_page_size int)` → paged rows with **server-side email masking** and server-side search/sort (`:141+`).

Both are `security definer`, both call `private.require_founder()` first, both are `revoke all ... from public, anon` then `grant execute ... to authenticated` (the guard, not the grant, is the gate).

**Do the required tables exist in `supabase/migrations`?** Yes — `MISSING_SOURCE_TABLES` is now `[]` (`metrics.ts:34`), and `test:admin-db` fails by name if any listed table ever gains a `create table`:

| Table | Migration |
|---|---|
| `public.profiles` | `20260713120002_core_active_tables.sql` |
| `public.entitlements`, `public.access_codes`, `public.access_code_redemptions`, `public.code_redemption_ledger`, `public.purchase_ledger` | `20260806120001_entitlements_core.sql` |
| `public.revocation_ledger` | `20260809120001_revocation_ledger.sql` |
| `public.salla_webhook_events` | `20260812120001_salla_webhook_ingest.sql` |

### APPLY_PENDING migrations — the decisive finding

Migrations that literally carry the marker:
1. `supabase/migrations/20260816120002_founder_role_provisioning.sql` — `⚠️ حالة التطبيق: APPLY_PENDING` (line 31)
2. `supabase/migrations/20260816120003_founder_dashboard_reads.sql` — same (line 27)

But `docs/execution/qimmah-sovereign-overnight/APPLY-RUNBOOK.md` widens this considerably:
> "لم يُطبَّق شيء من هذا الملف. كل ما تحته `APPLY_PENDING`." — and: **"هجرات التجارة الثمانية السابقة (`20260806*` · `20260809*` · `20260812*`) لم تُطبَّق على أي قاعدة قط. فالتطبيق يبدأ منها لا من الجديد."**

So the pending set is effectively: `20260806120001-3`, `20260809120001-4`, `20260812120001`, `20260816120001`, `20260816120002`, `20260816120003`, `20260816120004` — **13 migrations, none applied**. Stated blockers in the runbook: one single Supabase project (production, no staging), `supabase` CLI not installed on this machine, and a one-time pepper/salt seed that must be run by hand from the Supabase SQL editor or every write RPC fails.

### What shows when the backend is unavailable

**An honest empty state. There are no fake zeros, and this is structurally enforced, not merely intended.**

- `source.ts` builds the base snapshot entirely from `unavailable(...)` grades read out of the registry (`gapOf()`, `:62-67`). Absence is the default; presence is an overlay (`liveSource.ts:121-122`).
- `num()` (`liveSource.ts:74-77`) is the only numeric reader. `null`, `undefined`, string, `NaN`, `Infinity` all fall back to absence. **A server-measured `0` passes through as `0`** — the one legitimate zero.
- `ratio()` refuses to divide unless the denominator is a positive finite number. `series()` rejects the whole array if any point is malformed.
- A response without `as_of` is rejected in full (`:141-142`) — a number without a measurement instant can look fresh while being stale.
- Partial success is never announced as live: `AdminRoute.tsx:78` takes the **weaker** of the two calls' states.
- The screen carries a permanent, non-collapsible banner with `data-live-state="<named state>"` (`AdminShell.tsx:142-156`) so the reader learns *why* the screen is empty in the first line, and each card prints its own unavailability reason (`MetricCard`).
- `test:admin-dashboard` greps every UI and contract file for `?? 0` / `|| 0` and fails on any hit; `test:admin-render` asserts that no unavailable card contains a `0`.

**Predicted live state today:** the RPC does not exist on the DB ⇒ PostgREST `PGRST202` ⇒ `classify()` → `'rpc-missing'` ⇒ banner says so, every card says "غير متاح" with the migration-pending reason. Except nobody gets that far, because no session carries the role ⇒ `AdminDenied` first.

---

## A5. User search + activation-code management

### User search
- **Server-side search exists but is never invoked.** `loadLiveUserPage(decision, { search, page, pageSize })` passes `p_search` to `founder_user_page`, and the SQL does the search and sort. But `AdminRoute.tsx:73` calls it as `loadLiveUserPage(decision, { pageSize: 200 })` — **no search string, no page, and no pagination controls wired**. The whole server-search/sort capability is dead on the live route.
- What the founder actually gets is `UserTable`'s **client-side** search box filtering the ≤200 rows already fetched (`UserTable.tsx:119-127` → `runQuery` in `model/filters.ts`).
- Consequence: past 200 accounts the table silently truncates and the row count shown is the count of the fetched slice, not the population.
- 10 filters are defined; **only `all` is applicable today** — the other 9 render disabled with a named reason, and `test:admin-dashboard` asserts a disabled filter never actually filters (an empty list must not be mistakable for an answer).

### User detail
- `UserDetailPanel` (138 lines) is fully built and proof-covered, but `AdminRoute` passes **neither `detail` nor `onOpenUser`** to `AdminShell`, whose props for both are optional (`AdminShell.tsx:86-88`). The row chevron therefore does nothing.
- There is also **no `founder_user_detail` RPC** anywhere in `supabase/migrations` — so even if the UI were wired, there is no read path behind it.

### Activation code management
- **No admin UI at all.** `grep -niE "issueCode|createCode|revokeCode|generateCode|admin_issue"` over `src/` → 0 hits. `AdminShell`'s `RoadmapPanel` (`:336-347`) is explicit that destructive actions are deliberately **not** rendered as disabled buttons, because a dead button promises a capability that does not exist.
- **Server-authoritative? Yes — and unreachable from a browser.** `public.admin_create_access_code(...)`, `public.admin_grant_premium(...)`, `public.admin_revoke(uuid, text)` exist (`20260806120002_entitlement_rpcs.sql:295/317/351`, revised in `20260809120004` and `20260812120001`) and are `revoke all ... from public, anon, authenticated` + `grant execute ... to service_role` only. Codes are stored as `hash_identity(upper(btrim(code)), pepper_version)` — the plaintext code is never stored.
- **Today, issuing or revoking a code requires the Supabase SQL editor** (or a server-side tool that does not exist in this repo). And it cannot be done at all yet, because the entitlement migrations are unapplied and the pepper is unseeded.

### What is missing (concrete)
1. A **founder-authenticated** wrapper for issuance/revocation — i.e. `founder_issue_code` / `founder_revoke` guarded by `private.require_founder()` — so the browser path exists without ever handling `service_role`. Today the only privileged path is `service_role`, which by design must never reach the client.
2. Wiring `search` + `page` from `UserTable` back into `loadLiveUserPage` (the parameters already exist).
3. A `founder_user_detail` RPC plus wiring `onOpenUser` / `detail` in `AdminRoute`.
4. An aggregated, windowed counter of **failed** redemption attempts (deliberately deferred as a security decision — never store attempted codes).
5. A client error / event pipeline — without it, 7 of the required executive KPIs cannot exist at any price.

### Other defects noticed while reading
- **Stale delivery doc.** `docs/execution/qimmah-sovereign-overnight/ADMIN-DELIVERY.md` §2 still says the module "does not touch `App.tsx` / `appRoutes.ts`" and presents the wiring as a patch for the founder to apply by hand. The wiring actually landed in commit `985cf42` ("اللوحة التنفيذية تصل المستخدم أخيرًا"). The doc reads as if `#/admin` were not routed; it is.
- **Posture chip can never turn green.** `readPlatformPosture()` (`source.ts:78`) maps `entitlementSource` to `'mock'` or `'none'` only, while `PostureStrip`'s success condition is `platform.entitlementSource === 'backend'` (`AdminShell.tsx:55`). `'backend'` is a valid value of the type (`types.ts:160`) and `resolveEntitlement()` in `src/lib/access/entitlementSource.ts:90` does return `source: 'backend'` — but the posture reader never asks it. The chip will stay amber even after the migrations land.
- **`dist/` is one commit stale** (`BUILD_LABEL` = `bcec642`, HEAD = `740023b`). Not a defect, just a caveat for anyone reading bundle evidence.

---

# PART B — AI COACH

## B6. Search performed

| Probe | Result |
|---|---|
| `grep -rniE "ai[ _-]?coach\|coachChat\|virtualCoach\|smartCoach\|chatbot\|conversational" src/**` | **0 files** |
| `grep -rn "المدرب\|مدرّب" src/**` | 4 files — all copy: `personalization.ts:170` "سبق تمرّنت مع مدرّب؟" (a question about a *human* trainer), plus `customization.ts`, `profileChoices.ts`, `PreviewSummary.tsx` |
| `git branch -a \| grep -iE "coach\|advis\|assist\|chat"` | **0 of 220 branches** |
| `git log --all --oneline \| grep -i coach` | 10 commits — every one about the exercise **cue/lesson content** layer (`871d20c` "181 cues, 40 lessons, 25 rest tips", `a806db6` English cues, `310bec9` rest tips on the active-workout surface, …) |
| `git log --all --diff-filter=A --name-only -- '*coach*'` | Only `src/lib/coaching/*`, `src/data/coaching/*`, `src/components/coaching/TodayLearnCard.tsx`, `scripts/coaching/*`, `docs/features/coaching/*` |
| `git log --all --oneline \| grep -iE "\bai\b\|llm\|openai\|anthropic\|gpt\|chat"` | **0 commits** |
| AI/LLM dependencies in `package.json` | **none** (the only regex hits are `tailwindcss` and `@fontsource/jetbrains-mono`) |
| `docs/**/*.md` for "AI coach" | **one** hit — see below |

### The distinction the task asked for

`src/lib/coaching/` is **not** an AI coach. Its public API (`src/lib/coaching/index.ts`) is:
```
getCue, hasCue, cuedIds, FALLBACK_CUE, FALLBACK_CUE_EN, pickRestTip,
currentTodayLesson, markLessonUnderstood, selectNextLesson, shownLessonIds
```
It is a **static authored-content layer**: 181 pre-written per-exercise form cues (ar + en, generated into `src/data/coaching/exerciseCues.generated.ts`), 40 lessons, and 25 rest tips, selected by a deterministic rotation/hash. There is no user state input beyond "which exercise" and "which lesson has been shown", no dialogue, no advice about the user's own plan or adherence, no model, no network call.

## B7. VERDICT

**AI_COACH = MISSING — and deliberately out of scope, not lost.**

`docs/product/BACKLOG.md:32`, under the permanent "حواجز ثابتة" (fixed guardrails) section, lists:
> «لا مجتمع ولا اشتراكات ولا **مدرب ذكي** ولا 2FA ولا أدوار متعددة ولا دخول اجتماعي»
> (no community, no subscriptions, **no AI coach**, no 2FA, no multi-role, no social login)

There is no partial implementation, no prototype, no unreachable branch, no superseded twin. Nothing to revive, nothing to delete.

## B8. Smallest valuable honest version (if it is ever wanted)

A **deterministic rules-based advisor** — no LLM, no network, no external API, no fabrication.

**Name (user-facing):** «إرشاد اليوم» / "Today's guidance". Register: white colloquial per charter §6, conservative wording for inferred values ("يبدو أنك…", "تقريبي") and definite wording only for measured values.

**Where it lives**
- `src/lib/advisor/types.ts` — `AdvisorInput`, `AdvisorFinding { id, severity, titleKey, bodyKey, actionRoute, confidence: 'measured' | 'inferred' | 'unknown' }`
- `src/lib/advisor/rules.ts` — the rule table (data, not `if`s scattered across components — same pattern as `METRIC_REGISTRY`)
- `src/lib/advisor/evaluate.ts` — one pure function `evaluate(input, now): AdvisorFinding[]`, sorted by severity
- `src/i18n/dict/advisor.ts` — ar + en strings
- `src/components/advisor/GuidanceCard.tsx` — one card on the Today/dashboard surface (the `TodayLearnCard` slot pattern already exists there)
- `scripts/run-advisor-proof.mjs` + `scripts/advisor-proof.ts` — wired into `test:gate`, with a counter-assertion that a rule with an **unavailable** input never fires

**Data it reads — all already local, all already on-device**
| Input | Existing source |
|---|---|
| Current plan (split, target days/week, target calories & protein) | `planGenerator` output + `src/lib/customization.ts` |
| Completed workouts + dates + volume | workout session store (behind `safeStorage`) |
| Day-open / adherence signals | `src/lib/tracking/signals.ts` (`recordDayOpen`) |
| Nutrition logs (kcal / protein per day) | nutrition ledger / `daily_logs` local store |
| Weight & measurements history | measurement logs (`MeasurementsView` store) |
| Recovery self-report | `RecoveryView` store |
| Steps | `StepsView` / health foundation |

**Rule examples (each grounded, each falsifiable)**
1. ≥3 planned sessions missed in the last 7 days → suggest cutting the week's volume rather than "catching up". `measured`.
2. Protein below target on ≥5 of the last 7 logged days → propose one concrete swap from `src/data/saudiFoods.ts`. `measured`, and **suppressed entirely** if fewer than 5 days were logged (unknown ≠ low).
3. Weight trend over 3 weeks moving opposite to the stated goal → suggest recalculating calories, with the arithmetic shown. `inferred` wording.
4. Recovery self-report low two days running → suggest a deload day; never a medical claim.
5. No measurement in 30 days → prompt to log one; explain that the progress numbers go stale without it.
6. Streak intact and adherence ≥80% → a single confirming line (so the card is not only ever negative).

**Honesty contract (borrowed wholesale from `src/admin/`)**
- Three states per input, never two: measured / inferred / **unknown**. A missing input yields silence or an explicit "ما نعرف", never a zero and never an assumption.
- No rule may fire on an unknown input — proven by a counter-assertion, per charter §4.2.
- All copy in dictionaries, ar + en, no hardcoded strings, no local `t(ar, en)` helpers.

**Size estimate:** rules + evaluator ≈ 250-400 lines · card ≈ 120 lines · dictionary ≈ 150 lines · proof script ≈ 200 lines. **≈ 600-900 lines total, one small wave, zero new dependencies, zero network calls.** Lane assignment needs the coordinator: the engine reads plan/progress state (Lane E territory) while the card sits on the Today surface — an E/H interface that per charter §1.4 must route through the coordinator.
