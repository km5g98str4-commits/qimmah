# TESTS-CHANGED — final convergence

Every baseline test/proof file modified between `1614d41` (integration base) and the converged head.
Classification is **STRONGER / EQUIVALENT / WEAKER**. Per §14, a WEAKER classification is a blocker
unless an approved contract change justifies it.

**Result: 0 WEAKER. No test was skipped, deleted, or had an expectation removed.**

---

## 1. Fourteen E2E scripts — engine import only (Lane B, `863e540`)

| files | change | class |
|---|---|---|
| `scripts/e2e/{navigation-history, nutrition-reliability, plan-handoff, preview-gate, profile-reliability, progress-reliability, promotion-smoke, settings-import-security, settings-reliability, workout-reliability, dirty-state-recovery, exercise-library-reliability, install-overlap}.mjs`, `scripts/e2e-onboarding.mjs` | `-import { chromium } from 'playwright'` → `+import { chromium } from './lib/engine.mjs'` | **STRONGER** |

Verified: the diff for each file is **exactly one line**, the import. No assertion, timeout, or selector changed.
`scripts/e2e/lib/engine.mjs` (new) selects the engine from `E2E_ENGINE` (default `chromium`) and **exports it
under the name `chromium` deliberately** so no call site changes. An unknown engine **throws by a named check**
rather than silently falling back. STRONGER because the same assertions can now also run on WebKit.

## 2. Persona locators made numeral-agnostic (Lane A, `0731bf2`)

| file | change | class |
|---|---|---|
| `scripts/release/lib/drive.mjs` | adds `PLAN_DAY_1 = /(?:اليوم\|Day)\s*[1١]/`, `WATER_PRESET_250 = /\+\s*[2٢][5٥][0٠]/` | **EQUIVALENT** |
| `p1-preview-user`, `p2-premium-test-state`, `p3-returning-guest`, `p5-dirty-state`, `p8-responsive-matrix` | `/اليوم 1/` → `PLAN_DAY_1`; `/\+250/` → `WATER_PRESET_250` | **EQUIVALENT** |

This is the only change that *looks* like a loosening, so it was verified directly rather than accepted:

- **Why it was needed:** applying the numeral policy to the live views made `/اليوم 1/` and `/\+250/` go dark
  against the rendered «اليوم ١» and «+٢٥٠ مل». Two paid-action probes then reported a **product defect that did
  not exist**. The locator was numeral-bound; the product was correct.
- **Why it hides nothing — verified in code, not taken on trust:** the numeral system is judged separately and
  with **zero tolerance** in `p1-preview-user.mjs:327-336` —
  `rec.check('LIVE Nutrition renders its numbers in the Arabic numeral policy', nut.latin.length === 0, …)`
  and the same for Workout and Progress. Plus a **paired counter-proof** (`:352`) that one fact (training
  days/week) resolves to **one** numeral system across `#/profile` and `#/workout`.
  Remove the presentation boundary and those checks fail on the rendered text no matter what the locator accepts.
- **Named exclusion (§4.2):** `#/calc` prints published equation constants (`10`, `6.25`, `9`, `4`, `7`) and the
  `Mifflin-St Jeor (1990)` citation in Latin **by design** — notation, not user values. The exclusion is declared
  in-source and guarded by the paired same-fact check, which `#/calc` cannot satisfy by accident.
- **No timeout inflation:** `10000` stayed `10000`, `8000` stayed `8000`.

## 2b. `contextWithState` post-seed navigation (`6116ed4`)

| file | change | class |
|---|---|---|
| `scripts/release/lib/drive.mjs` | post-seed `goto(url, {waitUntil:'domcontentloaded'})` → `{waitUntil:'commit'}` | **STRONGER** |

STRONGER because it converts a **suite that could not run at all** on WebKit into 15 passing assertions.
After seeding a completed-guest state the app redirects itself to a deeper hash route during load; WebKit
counts that as a navigation interruption and throws `Frame load interrupted`, so `p3-returning-guest` died at
`0 pass · SUITE ERROR` while Chromium swallowed it and passed 15/15.

Diagnosed by measurement, not guesswork — same seed, same server: `commit` passes, `load` fails with the exact
error. (The first hypothesis — a duplicated `goto` to the same URL — **was wrong**; `reload()` failed identically.
That wrong turn is recorded here rather than hidden, because the measured refutation is what produced the fix.)

**It weakens nothing:** `commit` changes *when `goto` returns*, not what is asserted. The real wait remains
`settle(page, 2600)`, and every assertion after it reads the rendered DOM. Chromium result is unchanged (15/15).

## 3. Harness hardened by the coordinator (`32528e5`)

| file | change | class |
|---|---|---|
| `scripts/release/lib/harness.mjs` | `buildArtifact` stamps `.qimmah-build-stamp.json`; new `verifyArtifact` | **STRONGER** |
| `scripts/release/run-release-convergence.mjs` | `--skip-build` now calls `verifyArtifact`; `provisional` computed not hardcoded | **STRONGER** |
| `scripts/run-artifact-freshness-proof.mjs` (new) | 10 checks, 5 bypass simulations | **STRONGER** |

See `STALE-ARTIFACT-DEFENSE.md`. Attack-verified: disabling the head check turns the proof **red (exit 1)** at
exactly the two named assertions; restoring it returns **green (exit 0)**.

## 4. Food pipeline proofs (Lane D)

| file | change | class |
|---|---|---|
| `scripts/run-food-catalog-proof.mjs` | +231 lines — shard loader, IDB cache, index-backed search, routing | **STRONGER** |
| `scripts/food-production/lib/shard.mjs` | −68/+? refactor to shared emit path | **EQUIVALENT** |
| `scripts/food-production/emit-static-assets.mjs` (new) | emits `public/food/` assets | **STRONGER** |

## 5. Screenshot factory repairs (Lane B)

`scripts/appstore-screenshot-factory.mjs` — four independent tooling defects fixed (welcome-screen button not in
`CONFIRM_RE`; basics step needs typing not clicking; start-button matcher required a definite article the live
button lacks; session-persistence check read `qimmah:active-workout:v2:<owner>` — an **orphan-screen key** — while
the live screen writes `qimmah:activeWorkout:v1`). **STRONGER**: the last one had the walker asserting against a
surface the user never sees. A wrong seed cannot manufacture a false green here — the assertion reads the rendered
UI after a full reload, so the only possible direction is an earned red→green.

---

## Forbidden-pattern sweep across the converged head

| pattern | result |
|---|---|
| `force: true` clicks | **3 — all declared and legitimate** (see below) |
| `.skip` / `.only` / `xit` / `xdescribe` | **0** |
| removed/commented expectations | **0** |
| timeout inflation | **none** — all values unchanged |
| production success mocked | **no** — `VITE_ENTITLEMENT_MODE=mock` is a **declared, separate artifact** (`dist-release/mock`), and p2 compares it against the real `prod` build in the same pass |
| stale artifact reused as proof | **closed this wave** — see §3 |

### Declared `force: true` usages — audited, not waived

A first pass of this document claimed zero. That was wrong; the sweep found three. Each was then read in
context, because "force-click" is only a cheat when it **suppresses** an assertion:

| site | why force | verdict |
|---|---|---|
| `scripts/e2e/journeys/minor.mjs:158` | **the force IS the attack** — «محاولة الالتفاف ١ — النقر المباشر على هدف محجوب»: it force-clicks a *disabled* minor-restricted goal to prove the second guard inside `onPick` holds behind `disabled`. The very next assertion is that the goal did **not** become pressed. | legitimate — removing force would delete the attack |
| `scripts/release/personas/p7-failure-conditions.mjs:160` | submits hostile activation codes (`''`, `'   '`, `<script>`, 300×`A`, `QIMMAH-TEST-OK`) where the submit control is disabled for empty input. The assertions are that the gate never surfaces a raw exception and that a **production** build grants nothing for **any** code. | legitimate — the attack requires reaching submit |
| `scripts/release/personas/p4-interrupted-onboarding.mjs:128` | a *drive* step advancing the footer to return to the goals screen during the BUG-007 age-lowering attack; guarded by `.catch(() => {})` and followed by a hard `#onb-title-goal` presence check plus the real `aria-pressed` assertion. | legitimate — drive, not judgement |

None of the three stands in place of an assertion; in two of them the force is the exploit being defended against.
