# CHANGELOG — control plane & plan changes

> **Canonical owner of one fact only: what changed in the plan, and why.**
> Product changes live in git. This file records **plan** changes: the Master Plan is versioned,
> and **agents are forbidden from silently expanding scope**.

---

## GOV-003 — freeze + composition — 2026-08-18

**Ground frozen.** `dc031fa36929e07c3b00fa025a676ed64327ce59` pinned at
`origin/archive/ground-v1-rc-20260818`, plus 12 archive refs for every current-era branch
GOV-002 found carrying unique work, and one for the verified descendant `a464268`.
⚠️ Annotated **tags could not be pushed** — this container returns HTTP 403 on `refs/tags/*`
while branch refs push normally. The archive **branch** refs are the durable anchors.

**One control plane.** This folder is canonical. `docs/control/` is stamped SUPERSEDED on every
file (its GOV-002 forensics remain valid and are referenced). `docs/governance/` was empty.

**Blockers closed** — each with a counter-proof that fails by name:
- Allergy notice reaches the live routed surface (it had been proven green on an unrouted twin).
- Corrupt state no longer bypasses the paid-edit guard.
- Sensitive-health consent is a real write boundary; the `profiles`-only short-circuit is gone and
  unknown tables fail closed.
- Commercial/legal copy reconciled with DEC-015 across 7 surfaces.
- STITCH-01 ledger union completed **with two patterns rejected on evidence**, not merged blindly.

**Vacuity exposed, not papered over.** `test:chaos` was passing because `VITE_SYNC_ENABLED` was
unset in its harness — 12 queue invariants had never executed. The flag is now set and the proof
is **red and ungated**, recorded in `07-STATE.md` rather than hidden or force-greened. Likewise
the two "declared exclusions" (`test:safe-storage`, `test:body-model`) were measured and are red;
charter §11 now says so.

**Scope held.** No merge to `main`, no deploy, no migration applied, no branch or tag deleted, no
Salla change. QAE untouched (reference). AI Coach classified POST_LAUNCH, not shipped. Watermarked
media stayed excluded.

Every plan change needs: `PLAN-CHANGE-ID` · reason · tasks added/removed · critical-path impact · scope impact.

---

## 2026-08-18 — MASTER_PLAN_VERSION 1.0 (initial freeze)

Created `docs/execution/qimmah-master/` as the project control plane and froze the plan at **v1.0**
after the red-team pass recorded in `06-MASTER-PLAN.md §5`.

**Established**
- `CANONICAL_GROUND` = `codex/qimmah-sovereign-closure-001` @ `139a7b0`, proven by containment over
  all 80 remote branches — **`main` is 228 commits behind and is the production pointer, not the frontier.**
- 8 branches carry unique commits; all 80 classified. ~121k lines of QAE work preserved as `REFERENCE`.
- Feature map (15 capabilities) and claim ledger (51 claims) built from code with `path:line` evidence.
- 14 decisions LOCKED, 5 PENDING_FOUNDER, 2 SUPERSEDED.
- 12 `BLOCKS_V1` tasks, 8 `POST_LAUNCH`, 4 `NOT_A_BUG`.

**Plan changes made by the red-team pass, before freezing**
- `PLAN-CHANGE-000a` — `QIM-V1-005` resequenced after `QIM-V1-001`. Making a CI step non-gating
  while CI is red would look like — and could become — hiding red.
- `PLAN-CHANGE-000b` — `QIM-V1-016` narrowed from all 34 raw-write sites to the **live-path** subset.
  The rest are in orphan files and belong to `QIM-V1-015`. Fixing a bug in a file no user reaches is
  waste that reads like progress.
- `PLAN-CHANGE-000c` — `QIM-V1-009` narrowed from "add observability" to the smallest truthful
  failure signal, per the mission's own instruction not to block launch on elaborate observability.
- `PLAN-CHANGE-000d` — every guard-touching task now must classify its test change
  **STRONGER / EQUIVALENT / WEAKER**, after three green-but-hollow guards were found in one day.

**Documents superseded** (kept, but no longer authoritative — see `QIM-V1-015`)
`docs/execution/qimmah-sovereign-closure/STATE.md` · `…/qimmah-sovereign-overnight/STATE.md` ·
`…/qimmah-postweb/STATE.md` · `…/qimmah-web-sovereign/STATE.md` ·
`…/qimmah-final-convergence/FINAL-INTEGRATION-STATE.md` · `docs/FOUNDER-QA-HANDOFF.md` (stale commit
stack) · `docs/RELEASE-RUNBOOK.md` (for V1 — describes an `integration/waveN` model that no longer
exists; retained as the iOS reference).

**Executed this session**
- `QIM-V1-001` — six onboarding harnesses made intent-aware. They now share one `answerDietPattern`
  helper that **imports `dietPatternApplies` from the product** rather than restating the rule, and
  asserts the contract in both directions. Test classification: **STRONGER** — the previous code
  could not detect the question disappearing for everyone, and the naive fix ("click it if present")
  would have had the same blind spot.

---

## 2026-08-18 — PLAN-CHANGE-001 · `QIM-V1-004` closed as unnecessary

**MASTER_PLAN_VERSION stays 1.0** — a task was *removed after verification*, not added. No new
scope, no resequencing of anything else, no new founder dependency.

**Reason.** `QIM-V1-004` was to adopt the four unique commits on
`codex/qimmah-final-release-convergence-001` (BR-01). The rule "verify before you build" was
applied to the merge itself, and every value the branch claimed was already on the ground:
the numeral limit at the display boundary (`workoutDayLabel.ts:39` — which **credits BR-01 by
name** for the insight while deliberately leaving its implementation behind), the localisation in
`WorkoutView` and in the Today components, BUG-033..036 in the regression ledger, and REL-001/002
on the live surfaces.

**And the merge would have been a regression, not a no-op.** BR-01 baked Arabic-Indic numerals
into `todayV2Model`; the ground localises at the display boundary, which also repairs plans that
are *already stored* on users' devices. That decision is recorded in
`docs/execution/qimmah-founder-qa/DEFERRED-ITEMS.md`.

**Measured cost of doing it anyway:** 5 content conflicts predicted by `git merge-tree`, and a
`package.json` at **182 scripts / 113 gate steps** against the ground's **214 / 141** — the §4.1
trap, where a careless `--theirs` silently deletes 32 scripts and 28 gate steps.

- tasks removed: `QIM-V1-004`  ·  tasks added: none
- critical-path impact: **shortened** — the RELEASE lane no longer waits on a merge
- scope impact: none
- branch ledger: **BR-01 `ADOPT` → `SUPERSEDED`**

> **The lesson worth keeping:** BR-01's commit messages describe real, valuable fixes — and they
> were true when written. The branch had already been *harvested*: its knowledge taken, its
> implementation left behind on purpose. Trusting the commit message instead of the tree would
> have overwritten better code with older code and called it progress.

## 2026-08-18 — executed after the freeze

- **`QIM-V1-001` DONE.** CI run **423 on `dc031fa` is green — the whole run**, including step 12
  "Onboarding v2 browser E2E" (red since `7eaed49`) and step 13 "Upload dist artifact".
  This also settled the open question in `07-STATE.md`: the `favicon.ico` 404 was specific to the
  agent container, exactly as classified. **The console-error assertion was never relaxed.**
- **`QIM-V1-018` DONE.** Three missing English warning entries — not one — including the
  `unrecognized limitation` case, whose silence reads as reassurance. New guard
  `test:plan-warning-parity` wired into `test:gate` (**141 steps**); its red was reproduced for
  real (19/1, exit 1, failure named by sentence), and the guard was then attacked and tightened
  after its first form was found to **pass undeservedly on a missing entry**.
- **`QIM-V1-005` DONE.** BR-02 merged; verified after merge that exactly two steps are
  non-gating (perf budget, artifact upload) and all eight quality steps still gate.

---

## 2026-08-18 — PLAN-CHANGE-002 · `DEC-101` was wrong; the critical path is no longer human-blocked

**MASTER_PLAN_VERSION stays 1.0** — no task added or removed; one dependency was deleted because
it never existed.

`DEC-101` was registered `PENDING_FOUNDER` ("is Premium annual or perpetual?") and made
`QIM-V1-010` — the highest-harm item in the claim ledger — wait on a human. It was taken from an
earlier session's state document. **The charter had already decided it**, in founder-signed text:

> `AGENTS.md §0.1` — 19.99 SAR **unified across every channel**, **one-time purchase** (approved
> sentence: «يشمل تحديثات قِمّة — بلا اشتراك شهري»), **a permanent second price is forbidden**,
> three gates only (72-hour trial · Premium · access code, default 14 days).

And the implementation already matches: `no_expiry = true` with no renewal logic anywhere in
`supabase/migrations/`. The schema making an *expiring* Premium unrepresentable is **correct**.

What is actually wrong is one external surface: the live Salla storefront says «19.99 ريال **سنويًا**»
and carries a permanent «89.99 سنويًا». Both violate §0.1, and the replacement strings were **already
drafted** in `docs/product/SALLA-MERCHANT-COPY-CHANGES.md:19-22`. The only open question is
commercial and narrow: keep or delete the struck-through 89.99 anchor (§3 of that doc).

- re-registered as **DEC-015 (LOCKED)**; `DEC-101` kept struck through, because a corrected
  decision teaches more than a deleted one
- `FA-01` narrowed from "decide what Premium is" (🔴 blocking) to "apply the drafted storefront
  corrections + rule on the 89.99 anchor" (🟠 external, non-blocking)
- `QIM-V1-010` → `READY`; **nothing on the critical path waits on a human**
- scope impact: none

> **The golden rule applied to a decision instead of to code.** §1.5 already warned that
> *"القرار قد يكون هو البائت"* — the stale thing can be the decision, not the file. A blocker was
> carried forward for days because each session trusted the previous session's summary instead of
> re-reading the constitution.

## 2026-08-18 — cold-start acceptance test, and what it broke

A zero-context agent was asked the ten acceptance questions using **repository files only**.
It answered all ten from the control plane. It also found real defects, which were fixed rather
than argued with:

| defect | fix |
|---|---|
| **`main`'s charter has no pointer to the control plane** — a session cloning `main` follows §1 ("الجذع الحالي `main`") and rebuilds solved work | the pointer now sits **at the top of `CLAUDE.md`/`AGENTS.md`**, not only in §11, with an explicit warning about §1. It reaches `main` only when the founder promotes (`FA-06`) — recorded, not hidden |
| the charter's own §0.1 contradicted `DEC-101` | `PLAN-CHANGE-002` above |
| "140 gate steps" quoted in two files; it is now 142 | prose numbers replaced with the command that reads it from `package.json` — a count that grows every wave must not be written down |
| `07-STATE.md` pinned a literal HEAD sha | replaced with `git rev-parse --short HEAD` |
| "six open PRs" while nine are listed | corrected to nine in both the ledger and the founder list |
| five superseded `STATE.md` files carry no banner saying so | confirmed live and promoted into the **next three tasks** (`QIM-V1-015`) |

Also recorded from that audit, not yet fixed: `ROADMAP.md` still describes Qimmah as a sellable
template with shipped features listed as future work, `README.md` is a generation behind and uses
the banned «صفحتي» phrasing, and `docs/product/BACKLOG.md:32` forbids subscriptions outright —
a third side to the commerce-copy contradiction. All three belong to `QIM-V1-015`/`QIM-V1-010`.

## 2026-08-18 — `QIM-V1-002` DONE

One target-weight authority. `onboardingV2Adapter` now calls `deriveTargetWeight` instead of
carrying `×0.9`/`×1.1` of its own; an 80 kg cutter was shown 74 kg and given a plan built for 72 kg.
Guard `test:target-weight-authority` is behavioural **and structural** — the adapter may contain no
weight multiplier at all, so a second derivation that happens to agree today still fails.
Red reproduced for real (4 named failures, exit 1).

**The gate then caught something the change had not.** `body-fields-proof.ts:68` asserted the
literal `81` — 90 × 0.9, a *copy* of the old constant. Its number was **not** updated; the
assertion was rebound to its own stated intent ("derived from the answered weight, not the
default") by comparing against the authority. Classification: **STRONGER**. A test that hardcodes
a value the code derives is a second authority wearing a test's clothes.
