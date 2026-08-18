# 02 — V1 SCOPE (أفق الإصدار — مجمَّد)

> **Canonical owner of one fact only: what V1 is.**
> A project cannot finish while its horizon moves every session. This file is the horizon.
> **If it is not here, it is not built** — unless a numbered PLAN CHANGE is created first
> (`CHANGELOG.md`, and charter §3).

```
V1_DEFINITION = "قِمّة ships as an Arabic-first (RTL) Web/PWA for one athlete:
                 onboarding → a safe, personalised plan → daily execution →
                 nutrition logging → honest progress — local-first, with a
                 truthful commercial path."   (DEC-014)
```

---

## IN_SCOPE_V1 — the closed set

| # | capability | why it cannot be cut |
|---|---|---|
| 1 | **Onboarding v2** — every asked question consumed by something | asking with no effect is a lie (DEC-008) |
| 2 | **Plan generation** honouring goal · level · days · duration · place · equipment | the product's only reason to exist |
| 3 | **Injury exclusion + safe substitution**, fail-closed | user safety (DEC-010) |
| 4 | **Equipment truth** — the pool matches what the user actually owns | a plan you cannot perform is not a plan |
| 5 | **Arabic numeral input/display integrity** | `٧٨٫٥ → 785` is silent data corruption (DEC-011) |
| 6 | **Storage honesty** — no success before a checked write | DEC-006 |
| 7 | **Corrupt-state recovery** from trusted profile data, no fabricated plan, no charge | never bill a user for our corruption |
| 8 | **Food search over the curated + local + user sets** | "شاورما → 0 results" was a dead product |
| 9 | **Today → warm-up → session → finish/save** | the daily loop |
| 10 | **Exercise library + detail with approved media and honest fallback** | no fake 100 % coverage (DEC-104) |
| 11 | **Auth · trial · Premium entitlement — server-owned** | commercial integrity (DEC-005) |
| 12 | **Truthful commerce copy** — price, period and behaviour match the backend | policy decided (DEC-015); in-repo surfaces unblocked |
| 13 | **Local-first + opt-in sync, health data behind its own consent** | DEC-007 |
| 14 | **Privacy/Terms/Support reachable; deletion and export honest** | legal + App-Store baseline |
| 15 | **RTL + full English parity on every shipped surface** | charter §6 |
| 16 | **Green CI on the release candidate** | charter §4.0 |

---

## OUT_OF_SCOPE_V1 — decided, not forgotten

| item | why out | where it lives |
|---|---|---|
| **QAE second training engine** (~121k lines) | replacing the engine during convergence is the restart pattern | DEC-009 · BR-06/BR-07 |
| **Executive dashboard** (`#/admin`) | founder-only surface, blocked on unapplied migrations, reaches no user | DEC-103 |
| **AI Coach UI** | logic layer only, no route, contradicts `BACKLOG.md:32` | DEC-105 |
| **Nutrition budget** | founder-locked out of V1 | DEC-013.1 |
| **Native iOS / TestFlight / App Store** | web launch horizon | DEC-014 |
| **Expanded exercise-library source** | founder-suspended pending inventory | DEC-013.4 |
| **Staging environment** (`scripts/staging/*` on BR-03) | no staging project exists | BR-03 |

---

## DEFERRED_POST_LAUNCH

Home-screen redesign (compressed macro rings · step logging · pin button · bidirectional
date order) · food long-tail hosting beyond the committed manifest (DEC-102) ·
observability beyond the minimum in `08` · perf polish (the known lazy-chunk overage is
already non-gating and documented in `docs/ci/README.md`) · branch/PR cleanup (founder-only,
`FA-07`) · the muscle-map comparative study (PR #7).

---

## CUT_LIST — ordered safest-to-remove → impossible-to-remove

Cut from the top only, and only under a numbered PLAN CHANGE.

1. Home-screen visual polish beyond what already ships
2. Optional analytics refinement (disclosure already exists and is opt-out)
3. Non-critical animation / micro-interaction work
4. Perf polish on lazy chunks (non-gating today)
5. English performance cues for all 181 exercises → ship the honest "not available" state
6. The remaining 37 exercise images → ship the honest fallback, not a generic placeholder
7. Food long tail → ship curated + local only, and say so
8. — — — **hard floor below this line** — — —
9. Truthful product claims
10. Data integrity / corruption recovery
11. Entitlement integrity
12. Security & privacy
13. **User safety (injury exclusion)**

**Never cut:** user safety · security · entitlement integrity · data honesty ·
truthful claims · corruption recovery.

---

## PARKING LOT

Anything discovered during execution that is not in `IN_SCOPE_V1` lands here and **does not
enter V1**. Classify every new finding as exactly one of `BLOCKS_V1` · `POST_LAUNCH` · `NOT_A_BUG`.

| item | found by | class |
|---|---|---|
| Six open PRs against a 320-commit-stale base | this mission | POST_LAUNCH (founder, `FA-07`) |
| Five competing `STATE.md` files across generations | this mission | POST_LAUNCH — superseded by this control plane, `QIM-V1-015` |
| `scripts/staging/*` staging preflight (BR-03) | this mission | POST_LAUNCH |

---

## THE STOP RULE

Once every `BLOCKS_V1` task in `06-MASTER-PLAN.md` is `DONE`, the release candidate is
**FROZEN**. From that moment **only release blockers may change code** — not polish, not a
better idea, not a newly noticed nit. New findings go to the parking lot and wait for the
next version.

This rule exists because Qimmah has generated another wave after every wave.
