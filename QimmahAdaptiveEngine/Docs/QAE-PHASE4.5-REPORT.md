# QAE Phase 4.5 Report — AthleteProfile Contract Freeze

**Per [CTO-QAE-006].** Branch `claude/qae-architecture-design-fhg2mh`. Ten items:

1. **The frozen contract.** `Domain/Profile/model.ts` defines `AthleteProfile` v**1.0.0** (43 fields
   across identity/body/goal/training/safety/lifestyle/adherence/dataQuality; 23 required).
   `Domain/Profile/build.ts` — `buildAthleteProfile(facts, conflicts, resolvedConflictIds)` — is the
   **single normalization boundary** between evidence and every downstream engine: pure, integer-canonical,
   fact-order-invariant, float-free, and it emits per-field provenance `{sources, rule}` alongside the
   profile. Human-readable contract: `Docs/QAE-ATHLETE-PROFILE-CONTRACT.md`.

2. **Field registry.** `Contracts/profile/athlete-profile-fields.json` records, for every field: source
   **evidence keys** (never question ids), normalization rule, type, required status, default behavior,
   confidence behavior, and downstream consumers. The proof suite validates it structurally: provenance
   exists for every required field, consumers never include the question engine, and no source is a
   question id.

3. **L-QST-7 characterization and fix.**
   - **(A) Broken, not intended:** `b-target-weight`'s eligibility reads `answers.primaryGoal`; no
     question writes that key (production writes the goal to `derived.goalKey`) — the question is
     **permanently ineligible** in production (`src/lib/personalization/bank/core.ts:112`, characterized
     in Phase 4). The predicate's shape (gate on weight-affecting goals) shows intent to *ask*, and no
     flag or comment marks a deliberate disable — this is a dead-path defect, not a decision.
   - **(B) Not an intended removal** — see above; classified defect L-QST-7 in the register.
   - **(C) Downstream effect today:** target weight never enters personalization evidence; nutrition
     pacing / goal calculation silently proceeds with no target; nothing crashes — the absence is
     invisible. That silence is the real hazard.
   - **Contract-level fix (implemented):** `body.weightTargetStatus ∈ {collected, notCollected,
     notApplicableMinor}` — presence is a **status, never an assumption**. `notCollected` is the current
     production reality; no downstream engine may infer a target from goal or body weight; minors are
     `notApplicableMinor` with `targetWeightGrams` forced null.
   - **Routing untouched:** reviving the question (remapping to `derived.goalKey`) would change active
     question routing ⇒ per the directive that is a **REVIEW item** — characterized here, not
     implemented. Recommendation: decide at bank freeze; if revived, the only change is the predicate
     path, and `weightTargetStatus` flips to `collected` naturally with zero further contract change.

4. **Returning-user starvation — characterized, bank unchanged.**
   `x-return-reason` (priority 64) and `x-return-ramp` (60) are follow-ups of `x-last-trained`
   (queued when `lastTrained ∈ {m3_12, y1_plus}`), not required, category `experience` (non-exempt:
   satiety −6 per answered experience question; queue bonus +15). Under budgets min13/max16 the slots are
   exhausted by required + higher-scored questions first — the pair was asked in **zero** recorded
   journeys under legacy *or* QAE budgets, while `RETURNING-USER-POLICY.md` §3 wants the user's own
   ramp preference. Three policies:
   - **A — accept:** returning differentiation stays classification-level (`lastTrained`/`totalMonths`
     already collected; the four-axis model marks capacity conservative). No routing change; the user's
     stated ramp preference is never captured.
   - **B — conditionally required:** mark the pair required-when-eligible for returning users. Guarantees
     capture; costs ≤2 of 16 slots **only** in returning journeys; deterministic, narrow blast radius.
   - **C — scoring change:** raise queueBonus or exempt the category for queued follow-ups. Captures the
     pair *and* reorders unrelated journeys — the bluntest option.
   - **Recommendation: B.** Narrowest change that closes the gap, touched journeys are exactly the
     returning class. **Not implemented** — [CTO-QAE-006] forbids changing the bank without explicit
     approval; the bank ships unchanged this phase.

5. **Legacy select min/max — resolved, no silent widening.** Legacy multi-select constraints
   (`select.min/max`) were enforced at the legacy UI layer and were **absent from QAE normalization** —
   a silent widening (QAE accepted, e.g., an empty injury-areas list where legacy required ≥1). Closed
   this phase: `AnswerNormalizationSpec` gains `select`, normalization rejects **by name**
   (`too_few` / `too_many` — named failures per §4.2, no generic TypeError), the session passes each
   question's `select` through, and the converter carries constraints into the bank. Active bank carries
   4 constrained questions: `g-health-driver` (1–3), `g-muscle-priority` (1–3), `e-equipment-list` (≥1),
   `l-current-areas` (≥1). Counter-tests: empty list rejected `too_few`; 4-of-max-3 rejected; valid
   selections pass; constraints proven present in the converted bank.

6. **Hard separation — defined and proved.** Training, Nutrition, Steps, Recovery, Trends, and
   Adaptation **never read question IDs**; they read `AthleteProfile` (and normalized outputs) only.
   Proof (§6 of the suite): a source scan of `Domain/Decisions`, `Domain/Safety`, `Domain/Profile`, and
   `Contracts/schemas` finds **zero** of the 193 legacy question ids; the serialized profile of every
   persona contains no question id; registry sources are evidence keys only; registry consumers never
   name the question engine. The id→key mapping lives solely in `Contracts/content/` as audit metadata.

7. **12-persona contract completeness.** All 12 Phase-4 personas: questionnaire completes, profile
   `status: 'complete'`, all 23 required fields present and non-null, provenance present for every
   required field, profile builds **byte-identical** on rebuild, zero question-id leaks. (5 checks ×
   12 personas inside the 79-check suite.)

8. **10 adversarial cases** (all pass): missing age ⇒ incomplete + `effectiveGoal null` + **never
   adult** (this check caught a real bug during development: `effectiveGoal` initially leaked through
   with age unknown — fixed so unknown age releases no goal, U1); age 17 vs 18 boundary (minor folding /
   full goals); target weight absent ⇒ `notCollected`; non-integer target never enters; returning user ⇒
   conservative capacity with knowledge retained; pain evidence with `hasInjury=none` ⇒ contradiction
   recorded, flags kept; gym+bodyweightOnly ⇒ conflict recorded, capabilities still full-gym (U3);
   adherence carries reported+observed with per-side confidence; missing steps ⇒ null + confidence
   `none` (unknown ≠ sedentary).

9. **Gate.** `qae-profile-proof` **79/0** (runner `Tools/run-qae-profile-proof.mjs`). All existing QAE
   suites re-run green: `qae-proof` **52/0** (oracle 15/15 = 100%), `qae-decision-proof` **43/0**,
   `qae-question-proof` **41/0**, `qae-content-proof` **26/0**. **Plan goldens byte-identical**
   (untouched). The 12 question-journey goldens changed in exactly one line each — `bankManifestHash`
   (the bank now carries `select`); every journey step is byte-identical, confirming enforcement changed
   no recorded path. `typecheck` ✓ · `lint` ✓ · `build` ✓ · full `test:gate` ✓ (after `npm ci`-clean
   tree). Deterministic profile serialization proved (fact-order-invariant, float-free).

10. **Decisions awaiting the founder (nothing else started; STOP after Phase 4.5):**
    (i) L-QST-7 — revive `b-target-weight` via `derived.goalKey` (routing change, REVIEW) or retire it;
    (ii) returning-user starvation — approve Policy B (recommended) or A/C;
    (iii) the 5 unreachable clarifies (L-QST-3) at bank freeze;
    (iv) minor option-masking placement (host vs content) at integration.
    Shipping Qimmah code, the live engines, OnboardingV2, SwiftUI, and Supabase were **not touched**;
    the QAE bank was **not changed** beyond carrying the characterized select constraints.
