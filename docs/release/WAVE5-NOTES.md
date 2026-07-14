# Wave 5 — Integration Notes

Status: **partial trunk, blocked on three missing system branches and one missing proof branch.** Nothing below labels absent work green.

## Integration status

| System / branch | Status | What the owner sees in the next build |
|---|---|---|
| `content/food-db-quality @ 5b56a04` | Integrated + gated | 581 validated foods, including the Saudi/GCC catalog additions. |
| `docs/runbooks @ 515e80c` | Integrated + gated | Cloudflare-only deployment/support runbooks with corrected sync wording. |
| `site/landing @ 8b063ea` | Integrated + gated | Landing/support pages, CSP, bilingual FAQ, and real support address. |
| `perf/bundle-optimization @ b84783f` | Integrated + gated | Faster Nutrition entry; barcode scanner loads only when requested. |
| `assets/screenshots-site @ cd8ea7c` | Integrated + gated | Six 1260×2736 App Store captures and reproducible screenshot factory. |
| `integration/wave4 @ d2b6bd5` | Reconciled + gated | v2 is baked into the production build when `VITE_DESIGN_V2=true`. |
| `feat/arabic-coach-content @ 871d20c` | Integrated + gated | Arabic exercise cues, 40 lessons, and contextual rest tips. |
| PDF §05 progress follow-up | Integrated + gated | Weight logging now persists through the sync-ready history path; hydrated measurements and real PR events feed Progress/Profile. |
| Notifications (commander fix-forward) | Integrated + gated | Five opt-in native iOS reminder types, owner-scoped preferences, plan-aware workout/rest days, and quiet hours. Lock-screen copy is deliberately generic. |
| `feat/insights-engine` | Blocked: no origin tip | No insights system claimed or exposed by this integration. |
| `feat/plates-and-prs` | Blocked: no origin tip | No plates/PR system claimed or exposed by this integration. |
| Data-access export (commander fix-forward) | Integrated + gated | Profile privacy exports an owner-guarded JSON copy of on-device data; recovery sessions are blocked and auth/sync secrets are excluded. Import/restore remains out of scope. |
| `test/proof-deepening` | Blocked: branch absent | Existing proofs remain green; no extra proof suite claimed. |

## Release blockers / tracked debt

1. Push immutable, proof-bearing tips for the three missing systems, then run the standards/security court and full per-merge gate for each.
2. Validate notification timing and permission UX on the owner's physical iPhone before public release; browser and simulator gates cannot prove real delivery timing.
3. Insights must remove raw-hex fallbacks from its v2 card before acceptance.
4. Replace legal `[OWNER-EMAIL]`/jurisdiction placeholders and obtain legal sign-off before public release.
5. Run credentialed auth E2E, production Supabase/RLS verification, universal-link, and physical-device checks with owner-held credentials/device.
6. Catalog proof reports 20 extension/content-type mismatches; runtime display is healthy, but asset normalization remains cleanup debt.
7. `npm audit --omit=dev` is clean. The development toolchain still reports the Vite/esbuild advisory; its automated fix upgrades to Vite 8, so handle it as a tested migration rather than using `--force` in this release branch.
8. Data portability currently provides a safe access export only. A future import/restore system needs separate schema migration, validation, and conflict-policy design.

## PDF §05 evidence

- Progress reads the canonical measurement store populated by cloud hydration; the retired local-only key is covered by a regression proof.
- The weight CTA opens a real validated logger, writes through `historyStore`, redraws immediately, and exposes icon + text errors accessibly.
- Profile counts earned PR events from the achievements engine instead of counting exercise baselines.
- Today keeps the approved command-center hierarchy by collapsing the optional coaching lesson until requested.
- Browser proof: 30 RTL screenshots at 320/768/1280, including the privacy/export and notification surfaces, with zero console errors/overflow, reduced-motion fallbacks, and AA token contrast.
- Native proof: `npx cap sync ios` and the generic iOS Simulator `xcodebuild` both succeed for `com.qimmah.mobile`.

## Data-access export evidence

- Export is built from an explicit allowlist; it omits auth tokens, sync queues/backups/meta, analytics identifiers, caches, and other owners' registries.
- Account-scope mismatch and password-recovery sessions fail closed; the JSON payload is capped at 10 MB.
- `test:data-portability` covers 12 deterministic security/schema cases; browser proof covers real download, icon + text errors, and RTL screenshots at 320/768/1280.

## Notification evidence

- The master switch defaults off and is the only path that requests native permission; web presents an honest unavailable state.
- Every preference key carries the current owner id. Reconciliation rejects owner mismatch and password recovery, and cancels all known Qimmah schedules before sign-out/account change.
- Five reminder families use deterministic ids and quiet-hours-aware scheduling; the workout/rest week comes from the saved plan rather than a second plan model.
- `test:notifications` covers 30 deterministic scheduling, privacy, owner, recovery, race, migration, and cancellation cases; the shared browser proof covers 320/768/1280 RTL.
