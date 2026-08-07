# QAE Adaptive Question Engine

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §9

## 1. Relationship to the legacy engine — PRESERVE

The live repo already contains a complete deterministic question engine (`src/lib/personalization/`, 193-question bank, 222 executed proof assertions in the gate). Its architecture is **adopted** by QAE, not reinvented: conditions-as-data, priority scoring with queue bonus and satiety penalty, off-budget safety follow-ups, contradiction clarification, budget with min/max/hardCap. The QAE contribution is (a) formalizing it into the language-neutral contract, (b) resolving the Assessment⇄Question circularity with explicit incremental assessment, (c) carrying its characterized behavior as fixtures. See LEGACY-ENGINE-MAP §2 for the full characterization including known defects.

## 2. The incremental assessment loop ([CTO-QAE-001] §9 — normative)

```
Known Data
→ Partial Athlete State            (IncrementalAssessment)
→ Question Need Analysis           (EvidenceGaps × materiality)
→ Select Next Question             (AdaptiveQuestion.selectNext)
→ New Evidence (answer)
→ Recalculate Partial Athlete State
→ Confidence/Completeness Check
→ Repeat or Stop
```

The question engine **never** requires a finalized `AthleteProfile`. It reads `PartialAthleteState` + `AssessmentCompleteness` (DOMAIN-MODEL §2). The final profile is produced only when required confidence/completeness gates pass; open safety follow-ups and mandatory gaps block finalization.

## 3. The materiality rule (golden rule, carried from brief + legacy)

Never ask a question unless its answer could materially change training, nutrition, steps, safety, or adaptation. Structurally: every question declares `affects` (profile fields) — and unlike legacy (where `affects` is documentation only, unchecked against actual reads), QAE's contract requires the profile-derivation mapping to be *generated from* or *verified against* `affects` (closing legacy defect L-QST-2).

Behavioral consequences (all characterized in the legacy proofs, carried as fixtures):
- Beginners never see RIR/RPE/deload/1RM jargon (banned-term guard + counter-test).
- Advanced users skip gym-literacy questions unless evidence indicates uncertainty (contradiction rules).
- Home users are never asked about unavailable machines (eligibility conditions on place/equipment).
- A user reporting a knee issue triggers targeted follow-ups (followUps + off-budget safety stage).

## 4. Selection order (characterized legacy semantics, adopted)

```
0. Health-consent gate    — absolute; no data question precedes it; refusal ⇒ consent_pending
1. Contradiction clarify  — off-budget; first unresolved conflict with a ready clarify question
2. Mandatory incomplete   — up to hardCap (overrides soft max)
2.5 Open safety follow-up — off-budget relative to soft max; bounded by hardCap only
3. Scored remainder       — priority + queueBonus(+15) − satietyPenalty(6 × answered siblings,
                            exempt: basics/safety/limitations/clarify);
                            past min: only infoGain ≥ 5 survives
Stop: complete | cap_reached | exhausted | consent_pending
```

Budgets (per experience class): min/max with `hardCap = 20` absolute. Legacy `DEFAULT_BUDGET` (15–17 / 16–18 / 18–20) is the characterized baseline; the unwired `CHARTER_TREE_BUDGET` variant is noted in the legacy map as a pending product choice (UNRESOLVED #U5). Most users answer only the minimum sufficient set.

Tie-breaks: priority desc → infoGain desc → **questionId ordinal (byte) comparison** — replacing legacy `localeCompare` (defect L-GEN-1) per NUMERIC-CONTRACT §3.

## 5. Contract shape

```
QuestionDef { id, key, category, answerType, options?, range?,
              eligible?: Predicate, skipIf?: Predicate,
              followUps: [{when: Predicate, ask: questionIds[]}],
              affects: FieldPath[] (non-empty), safety: none|screen|restrict|clear,
              priority: 0–100, required, skippable, levels?, infoGain: 0–10, sinceBankVersion }

SelectQuestionRequest  { partialState, sessionHistory, budgetConfig, manifest, now }
SelectQuestionResponse { question | null, stopReason | null, offBudget, reasonTrace }
```

Predicates use the RULE-MODEL combinator set (legacy `Condition` ops map 1:1). Answer validation, revision with orphan pruning to fixpoint, and contradiction records carry over as characterized.

## 6. Contradiction handling (adopted)

Conflict definitions as pure predicates over answers; detected conflicts set derived flags; clarify questions are eligibility-gated on those flags, served off-budget at stage 1, and never re-fire once resolved. The 8 legacy conflicts (level, equipment, days/split, limitation, progression, goal-pace, time/volume, cardio) are the characterized baseline. Legacy defect L-QST-3 (five gap-fill clarify questions unreachable by `selectNext`) is documented; QAE's spec makes clarify reachability a bank-integrity check.

## 7. Minor handling in the question flow (adopted, SAFETY-POLICY §6)

Characterized legacy behavior, kept: under-18 users never *see* weight-modification goal options; injected restricted answers are rejected at the data boundary; a stored minor-with-restricted-goal draft is rejected on load; profile derivation force-folds minor goals to maintain. Multiple independent barriers are intentional (defense in depth) — QAE keeps them but registers them all under one safety rule ID so the policy has a single authority with several enforcement points.

## 8. What the engine emits for Assessment

Each applied answer produces `newEvidence` entries (field, value, source=`questionnaire`, confidence=high) which IncrementalAssessment folds into `PartialAthleteState`, recomputing derived values (experience score, isMinor, conflict flags, safety flags) — the legacy `recomputeDerived` discipline (stored derived state is never trusted; always recomputed) is normative.
