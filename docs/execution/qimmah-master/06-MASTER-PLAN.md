# 06 — MASTER PLAN

```
MASTER_PLAN_VERSION = 1.0   (frozen 2026-08-18, after the red-team pass in §5)
```

> **Canonical owner of one fact only: the ordered work.**
> IDs are permanent and **never renumbered**. Adding, removing or resequencing work requires a
> numbered PLAN CHANGE in `CHANGELOG.md`. Task *status* lives in `07-STATE.md`, not here.

Size `XS S M L XL` · Confidence `HIGH MEDIUM LOW` ·
Status `BLOCKED READY IN_PROGRESS VERIFYING DONE DEFERRED`

**No calendar dates.** Inventing them from no data is false precision.

---

## 1. Execution priority (the tie-breaker when two tasks compete)

1. user safety → 2. security / entitlement integrity → 3. data integrity → 4. **false product
claims** → 5. core user journey → 6. commercial path → 7. functional completeness →
8. reliability → 9. accessibility / localisation → 10. performance → 11. polish.

> Do not spend an hour polishing a card while a plan engine ignores an injury.

## 2. Workstreams and the WIP limit

`GATE` (CI, harnesses, proofs) · `ENGINE` (plan, injury, equipment, numbers) ·
`TRUTH` (copy vs behaviour, i18n parity) · `DATA` (storage, registry, sync, observability) ·
`RELEASE` (adoption, verification, freeze).

**WIP limit: one `IN_PROGRESS` task per workstream. FINISH BEFORE START.**
A second task in a lane may start only when the dependency graph forces it — and then it is
recorded in `07-STATE.md` with the reason.

## 3. Critical path

```
QIM-V1-001 ✅ (CI red closed, CI green)  ──►  QIM-V1-005 ✅ (CI cannot mask)
        │
        └──►  QIM-V1-018 ✅ (EN injury warning — safety)
                  └──►  QIM-V1-002 ✅ (one target weight)
                            └──►  QIM-V1-008 (WebKit matrix)  ──►  RC FREEZE
                                            ▲
   QIM-V1-010 (truthful claims — UNBLOCKED, see DEC-015) ───────────────┘

   QIM-V1-004 — closed as unnecessary (PLAN-CHANGE-001); no longer on the path.
```

**The critical path runs through a founder decision.** `QIM-V1-010` cannot start until `FA-01`
is answered. Everything else is parallel — nothing else waits on a human.

---

## 4. TASKS

### BLOCKS_V1

---
**QIM-V1-001 — Make the onboarding E2E harnesses intent-aware** · `GATE` · XS · HIGH
- **problem:** CI is red on the ground. `test:e2e:onboarding` times out after 30 s on
  `[data-question-id="nutrition.diet_pattern"]`.
- **root cause:** *not* a product defect. `2e3042d` correctly made that question render only for
  `intent === 'meals'` (DEC-008); six harnesses still click it unconditionally while the harness
  selects `intents[0] = 'plan'`.
- **depends_on:** —
- **surfaces:** `scripts/e2e/lib/onboarding-driver.mjs:28` · `scripts/onboarding-matrix-e2e.mjs:69` ·
  `scripts/release/lib/drive.mjs:140` · `scripts/e2e/journeys/{newcomer,minor,advanced}.mjs`
- **DoD:** the driver is **intent-aware, not tolerant**. `intent === 'meals'` ⇒ the question **must**
  be present and is answered; otherwise it **must be absent**. A harness that merely skips a missing
  element would be a **WEAKER** test and is rejected — it would stay green if the question vanished
  for everyone.
- **evidence required:** `npm run test:e2e:onboarding` exits 0 · a counter-proof that fails **by name**
  when the product regresses (question unconditional again ⇒ the absence assertion fails on the
  `plan` path). Test classification: **STRONGER**.
- **risk:** low · **status:** see `07-STATE.md`

---
**QIM-V1-005 — Artifact upload must not gate the CI result** · `GATE` · XS · HIGH
- **problem:** a GitHub **storage-quota** failure on `Upload dist artifact` fails the job and masks
  the real gate outcome. This exact masking already cost six days of unread red.
- **depends_on:** QIM-V1-001 (land the real green first, so the change is not confused for hiding red)
- **action:** adopt `ci/artifact-quota-nonblocking` (`9e679c3`, 9 lines) — `03-BRANCH-LEDGER.md` BR-02
- **DoD:** an artifact-step failure is visible and non-gating; **every product step stays gating**.
- **⚠ boundary:** this makes *infrastructure* non-blocking. It must never be extended to a product
  step. `09-RELEASE-RUNBOOK.md §3` states the rule.

---
**QIM-V1-004 — ~~Adopt the four convergence commits (BR-01)~~** · `RELEASE` · **CLOSED — NOT NEEDED**
- **outcome:** the merge was **measured and then correctly not performed**. Every value BR-01
  claimed is already on the ground, reached by a better path; merging would have cost 5 content
  conflicts, risked the §4.1 `package.json` trap (182/113 vs 214/141), and **regressed** the
  Today surface from display-boundary localisation back to baked numerals.
- **full evidence:** `03-BRANCH-LEDGER.md` → "BR-01 — the merge that was measured and then *not* performed"
- **plan change:** `PLAN-CHANGE-001`
- **what this cost:** one verification pass. **What it saved:** a regression shipped under a
  commit message that described a real improvement.

---
**QIM-V1-018 — The English injury warning must not vanish** · `TRUTH` · XS · HIGH · **SAFETY**
- **problem:** `planGenerator.ts:1100` emits a warning key that `profileChoices.ts:70` no longer
  holds, and there is no entry for the `unrecognized` case (`:1103`). English users get the generic
  fallback instead of either message.
- **the dangerous half:** an English user whose injury note could not be parsed is told **nothing**
  and is left believing the plan accounted for it.
- **depends_on:** — · **DoD:** both keys resolve in both languages; a proof asserts **key parity
  between the emitter and the dictionary**, so a future rekey fails the gate instead of falling back
  silently. Classification: **STRONGER**.

---
**QIM-V1-002 — One target-weight authority** · `ENGINE` · S · HIGH · ✅ **DONE**
- **problem:** the delivery screen shows `planDerive` (`×0.92`/`×1.05`) while the engine builds from
  `onboardingV2Adapter` (`×0.9`/`×1.1`). An 80 kg cutter is shown 74 kg and given a plan for 72 kg.
- **depends_on:** QIM-V1-018 (same lane, finish before start)
- **surfaces:** `src/lib/planDerive.ts:26-30` · `src/lib/onboardingV2Adapter.ts:97-103` ·
  `src/lib/onboardingProfile.ts:316` · `src/views/OnboardingV2.tsx:1385,1449`
- **DoD:** exactly **one** exported derivation; the adapter calls it; the delivery screen and the
  stored profile read the same number. Proof: for a matrix of weights × goals, screen value ==
  stored value == generator input. Counter-proof: reintroducing a second constant fails **by name**.
- **⚠ do not pick a constant by preference.** `planDerive` is the one already consumed by the
  *stored* profile and the *displayed* screen — two of three. The adapter is the outlier. If the
  founder wants different ratios that is a separate, numbered product decision.
- **outcome:** the adapter now calls `deriveTargetWeight`; no constant was invented.
  Guard `test:target-weight-authority` wired into the gate — behavioural (3×9 matrix + stored
  profile + direction) **and structural** (no weight multiplier may exist in the adapter at all).
  Red reproduced for real: 4 named failures, exit 1. Classification: **STRONGER**.

---
**QIM-V1-003 — Stop asking for consent that gates nothing** · `TRUTH` · S · MEDIUM
- **problem:** `healthDataConsent` is collected and stored, then deliberately not read
  (`onboardingProfile.ts:135-138`). The only reader is a **different** store the user cannot reach.
  Consent theatre on **health data** is worse than not asking.
- **depends_on:** QIM-V1-002 · **DoD:** either the collected answer becomes the value
  `hasSensitiveHealthConsent` reads, **or** the question is removed from onboarding. Not both, not
  neither. Whichever is chosen, `test:onboarding-questions` is extended to assert **downstream
  consumption**, not only UI binding — the blind spot that let this pass. Classification: **STRONGER**.

---
**QIM-V1-010 — Make every commercial and sync claim true** · `TRUTH` · M · HIGH
- **problem:** `05-CLAIMS.md` CLM-001…005, CLM-013/014. The Terms of Service say *"No subscription is
  active in this version"* while 13 productive actions are gated and a Salla purchase flow ships.
- **depends_on:** — **NOT blocked any more.** This task was registered as waiting on `FA-01`
  ("what is Premium?"). The charter had **already** answered it (`AGENTS.md §0.1`) — see **DEC-015**.
  Every in-repo surface can be corrected now against a decided policy: **19.99 SAR, one-time
  purchase, no subscription, no permanent second price**, approved sentence
  «يشمل تحديثات قِمّة — بلا اشتراك شهري». The founder is needed only for the **external Salla
  storefront** and the 89.99 anchor — neither of which is a file in this repository.
- **surfaces:** `site/terms.html:84,132` · `site/index.html:134,150` · `site/support.html:65,99` ·
  `docs/appstore/02-description.md:42` · the live Salla storefront (founder)
- **DoD:** every surface states what the code does: which actions need Premium, what browsing is
  free, whether Premium is annual or perpetual, and that sync is not available in this version.
  **`test:site-truth` is extended to cover the free-tier and sync claims** — it does not today, which
  is why this survived.
- **⚠ an agent must not choose the commercial answer.** Fix the copy to match the code, or the code to
  match the founder's sentence — never invent the sentence.

---
**QIM-V1-006 — Prove `VITE_ENTITLEMENT_MODE` is unset in every deployed environment** · `DATA` · XS · MEDIUM
- `08-UNKNOWNS.md` UNK-01. If it is `mock` anywhere deployed, entitlement is client-authoritative
  there and DEC-005 is broken in fact while true in code.
- **DoD:** the Cloudflare Pages variable list is confirmed absent for production **and** preview, and
  `grep -r "QIMMAH-TEST-OK" dist/assets/` on a production build is empty. Add the grep as a build guard.

---
**QIM-V1-009 — The smallest truthful failure signal** · `DATA` · S · MEDIUM
- **problem:** if a paying user cannot activate, **no signal reaches anyone**. The tracking registry
  contains no commerce event at all (`tracking/registry.ts:22-41`), tracking has no endpoint, and
  Sentry never initialises because `VITE_SENTRY_DSN` is set nowhere.
- **not in scope:** elaborate observability. "We will know because the user tells us" is not a system,
  but a small honest mechanism is enough for V1.
- **DoD:** (a) failed `redeem_access_code` / `start_trial` / `backend_unconfigured` are recorded as
  local tracked events and travel with the user's export and support mail; (b) the `QW-…` reference
  already minted by `ErrorBoundary.tsx:27-37` is shown on the commerce failure screen too, so a user
  can quote it; (c) `09-RELEASE-RUNBOOK.md` documents the one-variable switch that turns Sentry on.
- **privacy:** no PII. The existing scrubber (`monitoring.ts:17-92`) is the standard.

---
**QIM-V1-016 — Live-path writes go through the checked wrapper** · `DATA` · M · MEDIUM
- **problem:** charter §5 violations on **live** paths (`04-FEATURE-MAP.md`): `recovery.ts:108`
  (returns the entry to the UI regardless), `recoveryEngine.ts:376`, `health/store.ts:45`,
  `health/connect.ts:126`, `accountScope.ts:90` (**privacy** — a failed write means an account switch
  is not detected and the previous user's data is not wiped), and three sites that **can throw**:
  `dataOwnership.ts:40`, `portability/{registry.ts:275,importer.ts:186}`, `workoutFinishUndo.ts:48`
  — the last being the rollback path of the honesty chain itself.
- **scope discipline:** **only these.** Orphan-file write sites (`WorkoutV2.tsx:299` etc.) are out —
  `QIM-V1-015` archives those files instead.
- **DoD:** each site returns/inspects a `WriteResult`; no UI reports success on a failed write;
  `test:storage-honesty` grows a case per site with a counter-proof that fails **by name**.

---
**QIM-V1-015 — Stamp the orphans; fix the stale charter clause** · `RELEASE` · S · HIGH
- **problem:** two implementations of the same behaviour make every future audit ambiguous — this
  audit already had to downgrade a "P1 data-loss bug" after discovering the file was an orphan.
- **DoD:** a header line on each orphan naming its live owner and its `ARCHIVE` status
  (`views/WorkoutV2.tsx`, `views/NutritionV2.tsx`, `views/PlanPreviewView.tsx`, `lib/dataPortability.ts`);
  `CLAUDE.md §11`'s "the save-honesty chain in `WorkoutV2` must not be touched" corrected to name
  `WorkoutView`; the five superseded `STATE.md` files pointed at this control plane.
  **No file is deleted in V1** — deletion is one clustered post-launch PR after a dynamic-reference grep.

---
**QIM-V1-008 — Browser matrix on the release candidate** · `GATE` · S · MEDIUM
- WebKit evidence (222 ✓ / 0 ✗) was captured on an **earlier** head, before the ENTRY and FOOD merges.
  The audience is iOS-Safari-dominant and a WebKit-only storage bug has shipped here once.
- **depends_on:** QIM-V1-002, QIM-V1-004 · **DoD:** `E2E_ENGINE=webkit` onboarding + persona matrix
  green on the candidate SHA. **WebKit is not installed in this container** — founder machine or a
  WebKit-capable runner.

---
**QIM-V1-007 — Confirm production serves what `main` says** · `RELEASE` · XS · MEDIUM
- `curl -s "https://r.jina.ai/https://qimmah-8qp.pages.dev/"` → expect `BUILD_LABEL` = `cc60adf` and
  `qimmah-env` = `production`. Cloudflare's API is unreachable from agent containers (UNK-04).

### POST_LAUNCH — named, scheduled, and **not** started

| ID | task | why deferred |
|---|---|---|
| **QIM-V1-011** | Food long tail: decide hosting (DEC-102), ship it, **and tighten `run-food-longtail-proof.mjs:64-71`** which passes on all-absent as well as all-present — green does not mean shipped | founder decision; curated + hot-set + barcode + user foods already work |
| **QIM-V1-012** | Apply migrations, verify the email outbox, open the admin surface | founder-only (FA-03), and admin is out of V1 scope |
| **QIM-V1-013** | Media: enumerate all 37 image gaps as `RIGHTS`/`TONE`/`MISSING`; ship the founder's approved library | founder rules on tone (FA-04); the honest empty state ships today |
| **QIM-V1-014** | Preserve QAE: tag both branches before any cleanup | pairs with FA-07; **~121k lines must not be lost** |
| **QIM-V1-017** | Register the ~15 unregistered storage keys | the prefix sweep already prevents cross-account leakage |
| **QIM-V1-019** | Explain plan changes on regeneration, not only in the customizer (CLM-023) | DEC-013.3 forbids *silent automatic* edits; a user re-running setup is neither |
| **QIM-V1-020** | Physically delete the archived orphans, in one clustered PR | history keeps everything; one review beats ten |
| **QIM-V1-021** | Fix the three wrong migration numbers in file **headers** (`20260816120001` appears three times) and the stale "runs LAST by filename" invariant in `20260726120005` | latent, not live: filenames are unique and correctly ordered |

### NOT_A_BUG — recorded so they are not re-litigated

`muscleFocus` pinned to `'balanced'` — already disclosed to the user by the inactive-axis mechanism
(`planRationale.ts:159-165`) · `#/productReview` absent in production — DEV-only by construction ·
the lazy-chunk perf overage — non-gating and documented · `#/stats` reachable only by hash — the
route is guarded and correct; adding a link is polish (cut-list item 1).

---

## 5. RED-TEAM PASS — run before freezing, recorded so it is not repeated blind

**What could make this whole plan wrong?**
That the ground is not the real frontier. Answered by containment over **all 80 branches**, not by a
branch name — and by running the gate here rather than trusting a report. Residual risk: a branch
pushed *after* this audit. Mitigated by the SHA check in the session protocol.

**Does the critical path depend on a founder decision?** It did — and re-checking the *decision*
rather than the *report* removed it. `QIM-V1-010` was recorded as blocked on `FA-01`; the charter
(`AGENTS.md §0.1`) had already decided the price and the access model, and the backend already
matches. See **DEC-015**. **Nothing on the critical path now waits on a human.**
> This is the golden rule applied to a decision instead of to code: an earlier session's state
> document said "founder must decide", and it had gone stale against the constitution.

**Are we fixing symptoms instead of authorities?** Checked per task. `QIM-V1-002` merges two
authorities into one rather than syncing two constants. `QIM-V1-001` fixes the harness's *assumption*,
not by loosening the assertion. `QIM-V1-003` refuses "store it and read it somewhere else".

**Are the tests measuring live surfaces?** This is where this audit found the most rot:
`test:onboarding-questions` asserts binding but not consumption; `run-food-longtail-proof` passes on
absence; `test:personalization` is green over 2,564 lines no user reaches; the coach's "16-check
guard" **has no runner at all**. Every task above that touches a guard must leave it **STRONGER**,
with a counter-proof that fails *by name*.

**Deployment steps missing?** Cloudflare is unreachable from agent containers, so no agent can deploy
or verify production. That is written into the runbook and the founder list, not discovered on the day.

**Orphan work that would be lost?** ~121k lines of QAE. Preserved by DEC-009, `QIM-V1-014`, and an
explicit carve-out in `FA-07`.

**Hidden irreversible operations?** Three: applying migrations, closing others' PRs, deleting
branches. All founder-only, all in `10-FOUNDER-ACTIONS.md`, none scheduled for an agent.

**Are we overbuilding V1?** Deliberately not. Admin, AI Coach, the personalization engine, QAE and
the home redesign are all out. The plan is **11 blocking tasks** (12 minus the one closed by PLAN-CHANGE-001), most XS/S.

**Any claim without evidence?** Every row in `04` and `05` carries a `path:line`. What could not be
traced is in `08-UNKNOWNS.md` with a discovery command, not asserted.

**Does any milestone lack a measurable exit gate?** No — `09-RELEASE-RUNBOOK.md §6` is the exit gate.

### Plan changes made *by* the red-team pass

1. `QIM-V1-005` was originally sequenced first. **Moved after `QIM-V1-001`** — making a CI step
   non-blocking while CI is red would look like, and could become, hiding red.
2. `QIM-V1-016` originally listed all 34 raw-write sites. **Cut to the live-path subset**; the rest
   are orphan files and belong to `QIM-V1-015`. Fixing a bug in a file no user reaches is waste that
   *reads* like progress.
3. `QIM-V1-009` was originally "add observability". **Narrowed** to the smallest truthful mechanism —
   the mission's own instruction not to block launch on elaborate observability.
4. Every guard-touching task gained an explicit **STRONGER / EQUIVALENT / WEAKER** classification
   requirement, because three green-but-hollow guards were found in one day.

```
MASTER_PLAN_FROZEN = YES  (v1.0)
```
