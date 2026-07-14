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
| `test/proof-deepening` | — | BLOCKED — NOT PRESENT | Missing from origin after five post-Phase-1 fetch loops; no code or proof was available to review. |
| `integration/wave4` diagnostic | `d2b6bd5` | ACCEPT / ABSOLUTE PRIORITY | `vite.config.ts` only; build-time `data-design="v2"` injection. Preserved Cloudflare build label and manual chunks. |

Security review result for the integrated set: **No high-confidence vulnerabilities identified.** No auth/sync logic changed by these branches; Wave 4 owner/recovery/wipe proofs remain green.

## Five systems

| System branch | Tip | Verdict | Blocking findings / wiring |
|---|---|---|---|
| `feat/notifications-engine` | — | BLOCKED — NOT PRESENT | A local uncommitted worktree exists, but no origin tip/proof exists. Preliminary security court finding: native schedules must be cancelled on sign-out/account switch, not only full reset. |
| `feat/insights-engine` | — | BLOCKED — NOT PRESENT | A local uncommitted worktree exists, but no origin tip/proof exists. Preliminary standards finding: remove raw-hex fallbacks from the v2 insight card before acceptance. |
| `feat/plates-and-prs` | — | BLOCKED — NOT PRESENT | A local uncommitted worktree exists, but no origin tip/proof exists. |
| `feat/data-portability` | — | BLOCKED — NOT PRESENT | The local worktree remains at the Wave 4 base with no system diff and no origin branch. |
| `feat/arabic-coach-content` | `871d20c` | ACCEPT CODE / REJECT PACKAGE DIFF | 181 cues + 40 lessons + 25 rest tips; 25 proof checks and owner-scoped lesson key. Commander wired `test:coaching` into `test:gate`, hid Arabic-only rest copy in EN mode, and replaced raw component colors with semantic success/danger tokens. |

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
| Arabic coaching content | PASS after one fix loop — TypeScript narrowing corrected; 25 coaching checks + full gate green |
| Coaching semantic-color follow-up | PASS — typecheck, lint 0, v2 build, every `test:gate` suite, onboarding E2E 11/11, Capacitor iOS sync |

## Blocker record

Five bounded fetch/review loops completed after the open-loop consolidation. The four unmerged system branches and `test/proof-deepening` never appeared on `origin`; therefore no immutable diff, proof, or tip existed to review or merge. Per the hard-cap rule, these are release blockers rather than green systems.
