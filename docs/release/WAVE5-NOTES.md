# Wave 5 — Integration Notes

Status: **all five commissioned systems integrated; optional proof-deepening branch absent.** Nothing below labels absent work green.

Commander correction update (2026-07-14): `codex/v21-completion @ 98a4ff6` was reported
and deliberately not merged. Its review notes informed later fix-forwards, while the five
commissioned branches remain canonical. The fresh trunk gate and AA/RTL depth pass are green;
only the optional `test/proof-deepening` branch remains absent.

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
| `feat/notifications-engine @ 4b8a0be` | Integrated after security fix-forward | Five opt-in native iOS reminder types, owner-scoped preferences, plan-aware workout/rest days, quiet hours, and generic lock-screen copy. |
| `feat/insights-engine @ 52fc851` | Integrated after standards fix-forward | Today and Progress show up to three hedged, actionable weekly insights from canonical workout, nutrition, weight, and plan data. |
| `feat/plates-and-prs @ 90ddbe1` | Integrated after standards fix-forward | Canonical workout history now drives first-baseline-safe PRs, bounded plate loading, and warm-up guidance. |
| `feat/data-portability @ bcf67c6` | Integrated after security fix-forward | Profile exports, previews, imports, rolls back, and undoes owner-scoped data with recovery blocking and sync re-enqueue. |
| `test/proof-deepening` | Blocked: branch absent | Existing proofs remain green; no extra proof suite claimed. |

## Release blockers / tracked debt

1. `test/proof-deepening` still has no origin tip; no additional suite from that branch is claimed.
2. Validate notification timing and permission UX on the owner's physical iPhone before public release; browser and simulator gates cannot prove real delivery timing.
3. Replace legal `[OWNER-EMAIL]`/jurisdiction placeholders and obtain legal sign-off before public release.
4. Run credentialed auth E2E, production Supabase/RLS verification, universal-link, and physical-device checks with owner-held credentials/device.
5. Catalog proof reports 20 extension/content-type mismatches; runtime display is healthy, but asset normalization remains cleanup debt.
6. `npm ci` reports one moderate and one high development-toolchain advisory; migrate with a tested dependency update, never `audit fix --force` on the release branch.

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

## Weekly-insights evidence

- The adapter reads canonical workout, measurement, nutrition, history, and saved-plan stores without creating a second persistence path.
- Muscle coverage compares only the actual saved plan; insufficient or missing targets produce an explicit abstention instead of a guess.
- Arabic and English exercise/muscle labels follow the active locale; all card copy lives in `src/data` and v2 UI uses semantic color tokens only.
- `test:insights` covers 28 deterministic threshold, truth-label, ordering, plan, and owner-isolation cases; Today/Progress are included in the shared 3-breakpoint RTL proof.
