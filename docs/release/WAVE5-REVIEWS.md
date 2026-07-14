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
| `feat/notifications-engine` | — | BRANCH ABSENT / TRUNK FIX-FORWARD ACCEPT | The branch never produced a reviewable tip. Commander implemented the bounded system on trunk with owner-scoped storage, recovery guard, pre-sign-out cancellation, generic lock-screen copy, 30 proofs, and 3-breakpoint RTL UI evidence. |
| `feat/insights-engine` | `52fc851` | ACCEPT AFTER FIX | Removed raw-hex fallbacks, moved copy to `src/data`, made muscle coverage compare the saved plan rather than a fixed list, preserved immediate Progress refresh, and wired 28 checks into `test:gate`. |
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
| Wave 4 v2 promotion reconciliation | PASS — built HTML contains `data-design="v2"`; RTL surface screenshots, zero console errors/overflow |
| Arabic coaching content | PASS after one fix loop — TypeScript narrowing corrected; 25 coaching checks + full gate green |
| Coaching semantic-color follow-up | PASS — typecheck, lint 0, v2 build, every `test:gate` suite, onboarding E2E 11/11, Capacitor iOS sync |
| Progress canonical-data follow-up | PASS — cloud-style measurements feed Progress without the retired key; validated logging enqueues through `historyStore`; actual achievement PR count feeds Profile; 11 regression checks + shared RTL browser proof |
| Data-access export fix-forward | PASS — 12 allowlist/owner/recovery checks + real JSON download, status/error semantics, and 3-breakpoint RTL proof |
| Notifications fix-forward | PASS — 30 owner/recovery/privacy/scheduling checks + 320/768/1280 RTL settings proof; native delivery remains a physical-device release check |
| Insights engine | PASS after standards fixes — 28 threshold/truth/plan/isolation checks; shared 320/768/1280 RTL proof covers Today and Progress |

Security follow-up: the new measurement form accepts bounded numeric values only,
creates a client id, and writes through the existing owner-guarded sync boundary.
No auth/recovery/wipe logic changed; queue execution still requires the matching
runtime owner with `recoveryActive=false`, and database RLS remains owner-only.

## Commander data-access export fix-forward

| Review axis | Verdict | Evidence |
|---|---|---|
| Standards | ACCEPT | Copy is data-driven; v2 UI uses semantic tokens, RTL logical layout, reduced-motion-compatible press feedback, and error icon + text. |
| Owner isolation | ACCEPT | Export requires `accountScope` owner equality; owner-scoped plan, tasks, session, and coaching readers receive that same owner id. |
| Recovery safety | ACCEPT | `recoveryActive` fails closed before any data is read or delivered. |
| Exfiltration surface | ACCEPT | Explicit allowlist excludes auth/session tokens, sync queue/backup/meta, analytics IDs, caches, and other-owner registries; 10 MB cap limits accidental oversized output. |
| Proof | ACCEPT | 12 deterministic checks plus real-browser download/error/status proof and 320/768/1280 RTL screenshots. |

This trunk fix-forward closes the access-export gap; it does not claim that the absent
`feat/data-portability` branch landed, and it intentionally does not implement import/restore.

## Commander notifications fix-forward

| Review axis | Verdict | Evidence |
|---|---|---|
| Standards | ACCEPT | All copy is data-driven; shared v1/v2 UI uses semantic tokens, logical RTL layout, switch semantics, icon + text errors, and reduced-motion fallbacks. |
| Owner isolation | ACCEPT | Preferences use `qimmah:notifications:v1:<ownerId>`; each reconcile requires the runtime owner and cancels known native schedules before rescheduling. |
| Recovery safety | ACCEPT | `recoveryActive` cancels and schedules nothing; the permission prompt is never requested during background reconciliation. |
| Lock-screen privacy | ACCEPT | Notification payloads are generic and contain no medication, supplement, workout-plan, account, or body-data values. |
| Lifecycle safety | ACCEPT | Sign-out awaits native cancellation; serialized reconciliation and a generation guard prevent a stale account-switch task from winning. |
| Proof | ACCEPT | 30 deterministic checks plus web unsupported-state semantics and 320/768/1280 RTL screenshots with no console error/overflow. |

## Blocker record

Five bounded fetch/review loops completed after the open-loop consolidation. `feat/insights-engine` appeared in the final refresh and was reviewed, corrected, and integrated. The two remaining unmerged system branches and `test/proof-deepening` never appeared on `origin`; therefore no immutable diff, proof, or tip existed to review or merge. Per the hard-cap rule, these remain release blockers rather than green systems. The absent notifications branch is recorded honestly above; the accepted trunk fix-forward is independently reviewed and proven.
