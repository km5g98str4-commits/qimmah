# HEAD dependencies — what this verdict cannot close until the final HEAD lands

**Contract:** `[QIMMAH-SOVEREIGN-PHASE-II-001]` · AGENT-A (Release Convergence).
**Branch:** `codex/qimmah-release-convergence-001`.
**Baseline this pass measured:** `1bcf7a9` = `[PKG-7][green]` of `codex/qimmah-web-sovereign-001`.

> **Why this file exists.** The Web Sovereign run was still producing packages
> while this harness was being built. PKG-7 (Layer 3 Settings/numbers/units)
> landed at 14:08 on 2026-08-14; **Layer 3 Profile, Layer 4 and Layer 6 had not
> landed.** Every verdict in `RELEASE-CONVERGENCE.md` is therefore
> **PROVISIONAL** — it describes `1bcf7a9`, not the final HEAD.

---

## The one command

When the final HEAD lands, rebase this branch onto it and run:

```bash
git fetch origin && git rebase <FINAL_HEAD>
npm ci
node scripts/release/run-release-convergence.mjs
```

That single command rebuilds both artifacts from the new HEAD, re-serves them,
re-runs all eight personas plus both static suites on every available engine,
and rewrites `docs/execution/qimmah-postweb/release/evidence/latest.json`.
Nothing else needs editing. Subsets are available via
`--only=p1,p5,static`, `--engine=webkit`, `--skip-build`.

---

## Items whose verdict genuinely requires the final HEAD

| # | Item | Why it needs the final HEAD | Exact re-run when it lands |
|---|---|---|---|
| D-1 | **Layer 3 Profile surfaces** (`#/profile` and everything it owns) | PKG-7's stated next action is "continue Layer 3 with Profile". Profile is browsed and width-swept here, but its own package has not landed, so its numbers, routes and controls will change. | `node scripts/release/run-release-convergence.mjs --only=p1,p8` |
| D-2 | **Layer 4 and Layer 6** (not yet begun at this baseline) | Their surfaces do not exist to attack. Whatever paid mutations or routes they add must be re-classified against `PAID_ACTIONS`. | full `node scripts/release/run-release-convergence.mjs` |
| D-3 | **REL-001 — numeral policy on live Nutrition/Workout** | Reported here as OPEN at `1bcf7a9`. If a later package fixes it, the same assertion flips green with no edit. If it is not fixed, it lands in production. | `--only=p1,static-ledger` (checks `numeral policy` section + `BUG-019`) |
| D-4 | **REL-002 — `plan.saveEdit` second live path** | Same: OPEN at `1bcf7a9`. The check is written against behaviour, not against the current file layout, so it survives refactors. | `--only=p1` (section `plan-edit boundary`) |
| D-5a | **REL-004 — data-key registry drift** | Reported OPEN at `1bcf7a9`: the live `qimmah:activeWorkout:v1` is unregistered while the registered `qimmah:active-workout:v2` belongs to an importer-less view. A later package may register it or retire the dead entry. | `--only=static-ledger` (section `local data-key registry integrity`) |
| D-5 | **The `PAID_ACTIONS` classification table** | P1 asserts every one of the 13 enumerated paid actions is either exercised live or classified with a reason. A new package that adds a 14th action makes that assertion fail until the new action is driven — by design. | `--only=p1` |
| D-6 | **Shipped-bundle safety** | The seam/secret/endpoint scan reads the built artifact. A new package changes the bytes, so the scan must be re-run against them, not inherited. | `--only=static-bundle` |
| D-7 | **BUG-001..019 ledger** | The ledger suite fails if a defect is added upstream to `BUGS.md` with no watcher here. Later packages will add BUG-020+. | `--only=static-ledger`, then add the new entries to `scripts/release/static/regression-ledger.mjs` |
| D-8 | **`npm run test:gate` (124 scripts) + CI** | Not run in this pass (out of scope per the contract's "run what your personas need"). Charter §4.0 requires reading CI before any landing, and §4 requires the four local gates green after `npm ci`. | `npm ci && npm run typecheck && npm run lint && npm run build && npm run test:gate`, then `gh run list --branch main --limit 5` |
| D-9 | **The `GO_MERGE_MAIN` verdict itself** | A merge verdict is a statement about a specific commit. It cannot be issued against a baseline that is not the tip. | full run + D-8 |

---

## Items that will NOT be closed by any HEAD (externally blocked)

These need something outside this machine and this contract's scope. They are
recorded so the founder can see exactly what is unproven rather than assuming
the green count covers them.

| # | Item | What is missing | What would close it |
|---|---|---|---|
| X-1 | **Salla paid product binding** (upstream `EXTERNAL-001`) | The shipped bundle contains only the store root `https://salla.sa/Qimmahsa`. No product id reaches the frontend, so a buyer clicking Premium lands on a store, not on the ١٩٫٩٩ product. | The founder supplies the verified public product URL; set `VITE_CHECKOUT_URL`; re-run `--only=static-bundle`. |
| X-2 | **Live activation backend** (upstream `EXTERNAL-002`) | `resolveEntitlement()` returns `offline` in any non-mock build. There is no server contract to test against, and Supabase/Salla are declared no-touch. | A reviewed entitlement/webhook contract plus a staging environment. |
| X-3 | **Real sign-up / sign-in / password-reset round trip** | Requires a live Supabase project. Client routing, labelling, validation and language are proved in `p6-auth`; server behaviour is not. | Staging Supabase credentials, then extend `p6-auth`. |
| X-4 | **Real payment** | No payment may be executed from this environment under any circumstance. | Founder-performed manual purchase on the real store. |
| X-5 | **Physical iPhone / TestFlight behaviour** | WebKit in Playwright is the closest available proxy and is used for the critical iPhone paths; it is not a device. The open `ERR_UNKNOWN` iOS boot defect is tracked separately (charter §11). | Founder device QA. |

---

## Validation downgrades recorded by the harness

The runner probes each engine and records a downgrade rather than silently
substituting one engine for another. At the time of writing, WebKit **was**
installed on this machine (`webkit 26.5`) and the iPhone-critical personas ran
on it. If a future environment lacks it, `latest.json` will carry
`VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE` and the verdict must say so.
