# Wave 4 — tracked follow-ups

| Priority | Item | Owner / exit condition |
|---|---|---|
| P0 before public launch | Replace `[OWNER-EMAIL]`, confirm legal entity/jurisdiction, and obtain Saudi counsel sign-off for Tokyo cross-border transfer + age-12/health-consent wording. | Owner + legal; remove every placeholder. |
| P0 before production sync | Deploy all Supabase migrations, confirm RLS, `delete_own_account`, region, and run `npm run db:verify` against production. | Backend owner; proof output green. |
| P1 | Universal Link for password recovery needs an owned production domain, AASA file, Apple Team ID, and Associated Domains entitlement. Custom scheme remains functional fallback. | iOS/web owner; tap link with no confirmation prompt. |
| P1 | Complete physical-device taps for keyboard avoidance, local scheduled reminder, camera barcode lifecycle, and external Safari handoff. | Owner checklist in `OWNER-BUILD.md`. |
| ✅ closed | Nutrition and monitoring were promoted into oversized chunks. | Feature boundaries now keep boot at 137.7 kB gzip and the largest lazy chunk at 111.5 kB; `npm run perf:budget` is green. |
| P2 | AppIcon asset catalog contains an unassigned `AppIcon-512@2x.png`. | iOS; `actool` warning gone. |
| P2 | Credentialed auth E2E requires a disposable production-like Supabase project; it is intentionally outside credential-free CI. | QA/backend; supply secrets in protected CI. |
