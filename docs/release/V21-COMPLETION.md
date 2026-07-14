# Qimmah v2.1 completion record

Date: 2026-07-14
Branch: `codex/v21-completion`

## Delivered

- Production builds open the approved v2 experience by default; `VITE_DESIGN_V2=false` is the documented emergency rollback.
- Plates calculator uses an exact bounded solver, and personal-record moments/timelines derive from canonical finished sessions.
- JSON export/restore is owner-scoped, recovery-blocked, schema-bounded, previewed before apply, backed up before replacement, rollback-safe, and re-enqueues canonical cloud sync operations.
- Both v1 fallback settings and v2 profile privacy use the same portability boundary.
- Public privacy and terms pages expose a real support contact and review date rather than release placeholders.

## Verification evidence

| Check | Evidence |
|---|---|
| TypeScript | `npm run typecheck` |
| ESLint | `npm run lint -- --max-warnings 0` |
| Production bundle | `npm run build`; `dist/index.html` carries `data-design="v2"` |
| Proof suites | `npm run test:gate`; 427 assertions plus 274 media files |
| iOS web assets/plugins | `npx cap sync ios`; 5 plugins |
| Native compiler | `xcodebuild … generic/platform=iOS Simulator build` |
| Browser visual sweep | 30 RTL captures at 320/768/1280, no console errors or horizontal overflow |
| Native visual proof | `docs/proof/v21-completion/ios-simulator-v2.png` |

## External release controls

These are not code defects and cannot be asserted by a repository gate:

1. Confirm `support@qimmah.app` is actively monitored and obtain final Saudi legal review.
2. Confirm the production Supabase migrations/RLS are deployed to the configured project.
3. Complete notification permission, camera/barcode, deep-link, and workout lock/resume checks on the owner's physical iPhone.
4. Merge or deploy only with the owner's explicit approval; this branch does not change `main`.
