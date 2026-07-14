# Wave 5 — Standards Court Reviews

قاعدة الحكم: مراجعة diff حقيقية قبل الدمج، ولا قبول لتعديل `package.json` من فروع الأنظمة، أو raw hex في `src/views/**`، أو نص عامّي جديد، أو مفتاح بيانات مستخدم غير مربوط بالمالك، أو منطق جديد بلا proof.

## Open-loop + Wave 4 reconciliation

| Branch | Tip | Verdict | Evidence / integration action |
|---|---|---|---|
| `content/food-db-quality` | `5b56a04` | ACCEPT | Data + validator + 19-check proof; no secrets/storage/package edit. Commander wired `test:food-db` and CI. |
| `docs/runbooks` | `515e80c` | ACCEPT WITH FIX | Docs only. Removed retired `netlify.toml`, made Cloudflare Pages authoritative, and conditioned sync FAQ on the feature being enabled. |
| `site/landing` | `8b063ea` | ACCEPT WITH FIX | Static local-resource site + CSP. Replaced placeholders/colloquial support copy with the approved AR/EN FAQ and `support@qimmah.app`. |
| `perf/bundle-optimization` | `b84783f` | ACCEPT | No storage/package/copy drift. Build proves Nutrition `633.21→182.06 kB` raw and ZXing isolated to an on-demand chunk. |
| `assets/screenshots-site` | `cd8ea7c` | ACCEPT WITH CONFLICT GUARD | Unique work is six 1260×2736 captures + Playwright factory; retained Wave 4 legal/12+ decisions and removed the stale duplicate shot plan. |
| `test/proof-deepening` | — | NOT PRESENT | Missing from origin at the initial and post-Phase-1 fetches. |
| `integration/wave4` diagnostic | `d2b6bd5` | ACCEPT / ABSOLUTE PRIORITY | `vite.config.ts` only; build-time `data-design="v2"` injection. Preserved Cloudflare build label and manual chunks. |

Security review result for the integrated set: **No high-confidence vulnerabilities identified.** No auth/sync logic changed by these branches; Wave 4 owner/recovery/wipe proofs remain green.

## Five systems

| System branch | Tip | Verdict | Blocking findings / wiring |
|---|---|---|---|
| `feat/notifications-engine` | pending | WAITING | Local worktree exists; no new commit on origin yet. |
| `feat/insights-engine` | pending | WAITING | Not present on origin. |
| `feat/plates-and-prs` | pending | WAITING | Not present on origin. |
| `feat/data-portability` | pending | WAITING | Not present on origin. |
| `content/arabic-coach-content` | pending | WAITING | Not present on origin. |

## Gate ledger

Every completed merge ran: `typecheck` → `lint --max-warnings 0` → production build → `test:gate` (including food DB) → onboarding browser E2E → `npx cap sync ios`.

| Checkpoint | Result |
|---|---|
| food database | PASS |
| runbooks + Cloudflare reconciliation | PASS |
| marketing/support site | PASS |
| bundle optimization | PASS |
| App Store screenshot assets | PASS |
| Wave 4 v2 promotion reconciliation | PASS — built HTML contains `data-design="v2"`; 24 RTL surface screenshots, zero console errors/overflow |
