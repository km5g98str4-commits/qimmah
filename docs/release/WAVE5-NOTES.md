# Wave 5 — Integration Notes

Status: **partial trunk, blocked on four missing system branches and one missing proof branch.** Nothing below labels absent work green.

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
| `feat/notifications-engine` | Blocked: no origin tip | No notification system claimed or exposed by this integration. |
| `feat/insights-engine` | Blocked: no origin tip | No insights system claimed or exposed by this integration. |
| `feat/plates-and-prs` | Blocked: no origin tip | No plates/PR system claimed or exposed by this integration. |
| `feat/data-portability` | Blocked: no origin tip | No export/import system claimed or exposed by this integration. |
| `test/proof-deepening` | Blocked: branch absent | Existing proofs remain green; no extra proof suite claimed. |

## Release blockers / tracked debt

1. Push immutable, proof-bearing tips for the four missing systems, then run the standards/security court and full per-merge gate for each.
2. Notifications must cancel the prior owner's native schedules on sign-out and account switch before acceptance.
3. Insights must remove raw-hex fallbacks from its v2 card before acceptance.
4. Replace legal `[OWNER-EMAIL]`/jurisdiction placeholders and obtain legal sign-off before public release.
5. Run credentialed auth E2E, production Supabase/RLS verification, universal-link, and physical-device checks with owner-held credentials/device.
6. Catalog proof reports 20 extension/content-type mismatches; runtime display is healthy, but asset normalization remains cleanup debt.
7. `npm audit --omit=dev` is clean. The development toolchain still reports the Vite/esbuild advisory; its automated fix upgrades to Vite 8, so handle it as a tested migration rather than using `--force` in this release branch.

## PDF §05 evidence

- Progress reads the canonical measurement store populated by cloud hydration; the retired local-only key is covered by a regression proof.
- The weight CTA opens a real validated logger, writes through `historyStore`, redraws immediately, and exposes icon + text errors accessibly.
- Profile counts earned PR events from the achievements engine instead of counting exercise baselines.
- Today keeps the approved command-center hierarchy by collapsing the optional coaching lesson until requested.
- Browser proof: 24 RTL screenshots at 320/768/1280, zero console errors/overflow, reduced-motion fallbacks, and AA token contrast.
- Native proof: `npx cap sync ios` and the generic iOS Simulator `xcodebuild` both succeed for `com.qimmah.mobile`.
