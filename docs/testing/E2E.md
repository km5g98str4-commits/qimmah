# Deterministic end-to-end journey

Run from a built v2 tree: `npm run build && node scripts/e2e/journey.mjs`. It uses local Vite
preview and seeded reviewer state; no production account or network mutation.

| Contract | Proof |
|---|---|
| signup blocked then 12+ gate passes | policy gate + browser onboarding gate |
| health consent, validation block, building/error/retry | browser onboarding 11 checks |
| Today fresh | guest/reviewer contexts and 01/02 screenshots |
| workout 99 → kill/resume → finish | real workout UI, page reload, restored 99 assertion, 03/03b screenshots |
| Today/Progress/Profile move | captured only after persisted finished session |
| meal moves nutrition pillar | real add-meal interaction + 04 screenshot |
| export is valid | 44 bundle/import validation assertions |
| logout wipes; user B sees zero residue | 39 account-isolation assertions |

Screenshots are deterministic artifacts under `docs/appstore/screenshots/raw/`. Live Supabase auth
is separately OWNER-gated in `LIVE-AUTH.md` so the local suite never fakes credentialed coverage.
