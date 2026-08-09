# QAE Phase 5 Wave 1 Report — Training Capability + Exercise Metadata Foundation

**Per [CTO-QAE-007].** Branch `claude/qae-architecture-design-fhg2mh`. Twelve items follow;
the two approved Phase-4.5 decisions were implemented first (§0).

## 0. Approved decisions implemented (with findings)

- **L-QST-7 revival (§1):** `b-target-weight` disposition → `PRESERVE_WITH_MAPPING`; the dead
  `answers.primaryGoal` leaf is remapped to `primaryGoalDisplay ∈ {fat_loss, muscle_gain,
  strength}` (the display values whose characterized mapping is cut/bulk); the legacy
  `age ≥ 18` gate is kept; **not** globally required. Active bank: 153 → **154**.
  AthleteProfile stays authoritative (`weightTargetStatus` flips to `collected` naturally when
  the answer exists). **Finding F1 — revival ≠ collection:** the question is now *reachable*
  (eligible + queued as a follow-up of `g-primary`) but is asked in **zero** recorded QAE
  journeys — the same budget starvation Policy B just fixed for the returning pair. If actual
  collection is wanted, it needs the same treatment (a named decision, not a side effect).
- **Policy B (§2):** `x-return-reason` / `x-return-ramp` are now `required` in the QAE bank;
  their unchanged eligibility (`lastTrained ∈ {m3_12, y1_plus}`) restricts the requirement to
  returning users — exactly 2 slots. Non-returning journey **steps are byte-identical**
  (only `bankSize` 153→154 and the `bankAvoidedBp` arithmetic that divides by it moved — a
  proven dependency, documented). **Finding F2 — displacement side effect:** at the max-16
  budget the two required questions displace the two lowest-scored picks; in the recorded
  returning journey those were `x-total-duration` and `x-consistency`, flipping
  `finalExperienceClass` from `returning` to `advanced` — the policy can displace the very
  evidence that detects returning users. All suites remain green (the classifier still marks
  capacity via `lastTrained`), but this is a real product tension. Candidate remedy for a
  future numbered decision: also mark `x-total-duration` required-when-eligible for returning
  users (1 more slot), or accept classification-level regression.
- **§3 clarifies and §4 minor masking:** deferred as ordered; untouched.

## 1. Legacy training oracle inventory

Two selection surfaces characterized at exported boundaries (`Tools/training-oracle-adapter.ts`):
**(a)** shipping `generatePlan(Profile)` — slot engine over filtered pools (equipment gate ·
injury filter · level gate · free-cable gate · machines-only pools · machine-first sort · A/B
round-robin partition); **(b)** personalization `deriveProfile → selectExercises` — 4-stage
hardExclude/suitability/rank/substitutions with named exclusion reasons. Non-exported internals
characterized by guarded source extraction: `INJURY_RISKY_IDS` (6 areas: knee 13 · shoulder 4 ·
back 9 · wrist 34 · elbow 22 · ankle 12 — counts asserted, drift fails by name), `cableOk`,
`levelOk`, `makeEquipmentGate` (full/small/home/bodyweight), `primaryMachineIdSet` (31),
`AREA_TO_DETAILED`, `isOverhead`, `isImpact` (defect L-QST-6). **17 golden fixtures** in
`Fixtures/golden/training/` (experience × equipment × knee/shoulder/back/multi restrictions ×
3/4/5/6 days × short/long sessions), each capturing requested slots, equipment, candidate list
with scores, final legacy selection, exclusions with reasons, ordering, and profile evidence.
Verify-mode enforced byte-identical on re-run.

## 2. ExerciseMetadata field list (25 fields)

`exerciseId` (stable name-independent slug) · `primaryMuscles` · `secondaryMuscles` ·
`primaryMuscleCoarse` · `movementPattern` · `equipmentRequired` (ALL-of) ·
`equipmentAlternatives` · `technicalDifficulty` 1-3 · `stabilityDemand` 1-3 · `fatigueCost`
1-3 · `axialLoad` · `jointStress` · `laterality` · `mechanics` · `support` · `loadMedium` ·
`suitableExperienceBands` · `contraindications` · `substitutionGroup` · `declaredSubstitutes` ·
`progressionCompatibility` · `minimumEquipmentCapability` · `legacyEnvironment` ·
`metadataConfidence` · `provenance`. Schema: `Contracts/exercises/exercise-metadata.schema.json`.
**Zero UI strings** (proof scans for name fields and Arabic codepoints).

## 3. Catalog coverage

**181/181 exercises = 100 %** of the live legacy library carry complete metadata (integrity
check: 0 issues; all 25 aliases resolve; all 31 machine-pool ids present; 0 dangling declared
substitutes). Characterized fields verbatim from the catalog; derived fields
(stability/fatigue/axial/laterality/support/loadMedium/progression) by named deterministic
rules recorded in per-exercise provenance.

## 4. Blocklist migration coverage

`Contracts/exercises/blocklist-migration.json`: **11 rules**, each with ruleId, source,
reason, confidence, QAE representation, and full id accounting. Legacy ⊆ new proved: all
**94** injury-list ids present in the catalog and tagged (13+4+9+34+22+12), overhead **15**,
impact **6**; equipment-gate, level-cap (14 advanced-difficulty ids), and free-cable-beginner
(23 ids) represented as capability/ceiling/policy rules. `absentFromCatalog = 0` everywhere —
**no silent loss**. Counter-tests: neighbouring ids (`leg-press-machine`, kept deliberately by
the legacy knee policy) proven UNtagged.

## 5. TrainingCapabilityProfile fields (18)

`schemaVersion` · `experienceBand` (collapsed; capacity conservatism can only lower) ·
`planningClass` · `returningStatus` · `trainingDaysPerWeek` · `sessionDurationMinutes` ·
`environment` · `equipmentCapabilities` · `injuryConstraints` (evidence tags, never diagnosis)
· `unmappedConstraintAreas` (visible, never dropped) · `stabilityCeiling` ·
`exerciseComplexityCeiling` · `fatigueCeiling` (conservative for returning) ·
`preferredTrainingStyle` · `machineDominantPolicy` · `progressionCapability` ·
`recoveryCapacityClass` (evidenced only, else `unknown`) · `needsClearance`.
Derived from **AthleteProfile only**; incomplete profiles refused by name; zero question ids
(proved).

## 6. Deterministic ranking contract

Stages fixed (§E order); scoring parts integer-only; final tie-break ordinal `exerciseId`;
`catalogManifestHash` + `TRAINING_SELECTION_POLICY_VERSION` embedded in every result. Proof:
identical inputs ⇒ identical output; catalog registration order reversed ⇒ byte-identical;
capability key insertion order reversed ⇒ identical; PARITY mode equally invariant; no
locale/name dependence structurally possible (metadata has no name fields).

## 7. Parity fixture results

**17/17 goldens**: exclusion multisets identical (id + legacy reason vocabulary), candidate
score sets identical (score parts decompose identically), and candidate **sequences
byte-identical — 0 observed D1 tie-break differences** (ASCII slugs collate the same under
ICU and ordinal today; the rule change stays recorded as D1 because it is load-bearing for
§F). Where legacy behavior is intentionally changed, no parity is claimed — those paths are
in the deviation register instead.

## 8. Approved deviations

`Contracts/training/approved-deviations.json`: **D1** ordinal tie-break (vs locale collation;
legacy defect registered L-TRN-1) · **D2** substitution ordering (registration order banned)
· **D3** staged pipeline + stability/fatigue ceilings (QAE-native mode only) · **D4** impact
tag per-id (L-QST-6 fixed at metadata level; result-identical today) · **D5**
machine-dominant policy vs legacy machines-only pools. Each entry: legacy output, QAE output,
reason, approval reference, affected fixtures. Proof asserts the register's structure.

## 9. Missing metadata / data-quality blockers

- `equipmentAlternatives` is empty everywhere — no legacy representation; population is
  future curated enrichment (never inference).
- Derived heuristics (stability/fatigue/axial/laterality/support) are `derived`-confidence;
  fine for candidate filtering, should be curated before load-sensitive programming waves.
  One heuristic already needed correction during proofs: unloaded bodyweight compounds now
  rate stability 2, or a beginner ceiling of 2 would have stripped bodyweight-only users of
  every compound (caught by the §H·5 check).
- Areas with no legacy exclusion vocabulary (neck/hip/upper_back/core, `standing:seated_only`)
  ride in `unmappedConstraintAreas` — visible, but no filter consumes them yet.
- Legacy `alternatives` are sparse (many exercises have none); `substitutionGroup` covers the
  gap structurally but Wave 2's substitution engine should treat declared lists as preferred.

## 10. Test results

- **NEW `qae-training-proof`: 131/0** (runner `Tools/run-qae-training-proof.mjs`).
- Training oracle: 17 scenarios verified byte-identical on re-run.
- All existing QAE suites green after the bank changes: `qae-proof` **52/0** (oracle 15/15 =
  100 %), `qae-decision-proof` **43/0**, `qae-question-proof` **41/0**, `qae-content-proof`
  **26/0**, `qae-profile-proof` **79/0**.
- Plan goldens byte-identical; question-journey goldens: non-returning steps byte-identical
  (bank-size metadata only); returning journey changed exactly as Policy B intends (§0/F2).
- After `npm ci`: `typecheck` ✓ · `lint` ✓ · `build` ✓ · full `test:gate` ✓ (final suite
  55/0, exit 0).

## 11. Exact blockers before Training Engine Wave 2

1. **F2 decision** (§0): accept returning-classification displacement, or extend Policy B to
   `x-total-duration` — needs a numbered decision before Wave 2 consumes `returningStatus`.
2. **Metadata curation pass** for load-bearing derived fields (stability/fatigue/axial) if
   Wave 2 uses them beyond candidate filtering (§9).
3. **Day-assembly parity target**: the shipping slot engine's A/B round-robin partition,
   used-set, fill-from-whole-pool and accessory attachment are characterized in goldens but
   not yet reproduced — Wave 2's parity work.
4. **Substitution engine semantics** (declared-preferred vs group-based) need a policy
   decision (D2 fixed the data; the picker is unbuilt).
5. Nothing else blocks: contracts, catalog, capability profile, and deterministic
   ranking are frozen and green.

## 12. Recommended Wave 2 scope

**Day assembly against the shipping goldens**: MovementRequirements → slot filling with
used-set semantics, A/B variation partition, target-count from session duration, accessory
attachment, machines-only environments — PARITY mode against the 17 `shippingPlan` goldens,
plus the substitution engine over `substitutionGroup`/`declaredSubstitutes`. Still no
sets/reps/progression/volume (those need the F2 decision and the metadata curation pass
first). This keeps Wave 2 a pure assembly layer over frozen Wave-1 primitives.

---
**Stopped after Training Foundation Wave 1** — no program generation was built.
