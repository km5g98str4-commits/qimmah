# Wave 5 — Integration Notes

Status: **completed on `codex/v21-completion` with proof-bearing trunk fix-forwards for the two branches that never appeared on origin.** External production credentials, legal sign-off, and physical-device checks remain owner release actions.

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
| `feat/insights-engine @ 52fc851` | Integrated after standards fix-forward | Today and Progress show up to three hedged, actionable weekly insights from canonical workout, nutrition, weight, and plan data. |
| Plates + PRs (commander fix-forward) | Integrated + gated | Workout and Progress share an accessible bar-plate calculator; PRs derive from canonical finished sessions and never count a first baseline. |
| Data portability (commander fix-forward) | Integrated + gated | v1/v2 export and restore an owner-scoped, schema-validated copy with preview, explicit confirmation, pre-write backup, rollback, and recovery-session guard. |
| Proof deepening (commander fix-forward) | Integrated + gated | Added 26 plate/PR checks and expanded data-portability coverage from 12 to 33 checks, including injected write failure and UI wiring. |

## Release blockers / tracked debt

1. Validate notification timing, permission UX, keyboard behavior, and camera/barcode flow on the owner's physical iPhone; browser/simulator gates cannot prove these hardware paths.
2. Replace any remaining legal owner placeholders and obtain Saudi counsel sign-off before public release.
3. Run credentialed auth E2E, production Supabase/RLS verification, and universal-link checks with owner-held credentials.
4. Catalog proof reports 20 extension/content-type mismatches; runtime display is healthy, but asset normalization remains cleanup debt.
5. `npm audit --omit=dev` is clean. The development toolchain advisory requires a tested Vite migration rather than `--force`.

## PDF §05 evidence

- Progress reads the canonical measurement store populated by cloud hydration; the retired local-only key is covered by a regression proof.
- The weight CTA opens a real validated logger, writes through `historyStore`, redraws immediately, and exposes icon + text errors accessibly.
- Profile counts earned PR events from the achievements engine instead of counting exercise baselines.
- Today keeps the approved command-center hierarchy by collapsing the optional coaching lesson until requested.
- Browser proof: 30 RTL screenshots at 320/768/1280, including the privacy/export and notification surfaces, with zero console errors/overflow, reduced-motion fallbacks, and AA token contrast.
- Native proof: `npx cap sync ios` and the generic iOS Simulator `xcodebuild` both succeed for `com.qimmah.mobile`.

## Data portability evidence

- Export is built from an explicit allowlist; it omits auth tokens, sync queues/backups/meta, analytics identifiers, caches, and other owners' registries.
- Account-scope mismatch and password-recovery sessions fail closed; the JSON payload is capped at 10 MB.
- Restore accepts only the exact schema/allowlist, rejects prototype keys and embedded auth/sync fields, previews counts, and requires explicit confirmation.
- A current-data backup is written before replacement. An injected storage failure proves rollback; `wipeUserData` removes the owner's restore backup.
- `test:data-portability` covers 33 deterministic security/schema/rollback/UI cases; browser proof covers a real export→restore round trip plus RTL screenshots.

## Plates and personal-record evidence

- The calculator uses bounded dynamic programming, so non-greedy plate combinations still resolve exactly and an inexact result never exceeds the requested load.
- PR events are rebuilt from canonical finished sessions; the first valid load is a baseline, equal/lower loads are ignored, and Profile/Progress share the same derived count.
- `test:plates-prs` covers 22 logic/isolation checks plus four static UI-wiring checks; the browser proof opens the real modal and verifies its exact-load state.

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
