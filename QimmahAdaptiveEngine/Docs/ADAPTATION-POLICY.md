# QAE Adaptation Policy

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]
Numeric thresholds herein are **candidates**, each labeled; `RESEARCH_REQUIRED` values cannot ship enabled (RULE-MODEL §8.2). Mechanisms are normative.

## 1. First principles

1. **Trends, not points.** No adaptation fires from a single day's value. Every adaptation rule declares `EvidenceSpec`s with minimum valid observations, span, and confidence.
2. **Adherence is never punished.** Poor adherence produces adherence-support outcomes (`keepPlan` + adherence reason codes, `requestMoreData`, simplification proposals) — never a calorie reduction "to compensate."
3. **Recovery outranks optimization.** By priority class, structurally (DECISION-MODEL §2).
4. **If progress remains appropriate: keep.** The default outcome of a healthy week is `keepPlan` with positive reason codes. No drift-by-schedule (never "month 2 ⇒ −200 kcal").
5. **One major change per cycle** (ChangeBudget), cooldowns per variable, no change on insufficient evidence.

## 2. Calorie adaptation

| Situation (all evidence-gated) | Outcome | Reason codes (registry) | Threshold labels |
|---|---|---|---|
| Progress within target band for goal | keepPlan | progressOnTrack | band: RESEARCH_REQUIRED (rate-of-change guidance) |
| Verified plateau + **high** adherence + recovery OK | small calorie reduction **or** step increase (two competing rules; resolver picks per profile, e.g., steps preferred when calorie floor near) | weightPlateauConfirmed, adherenceHigh | plateau def §5; delta cap: BGT (DECISION-MODEL §3.2) |
| Plateau + poor/unknown adherence | keepPlan + adherence support | weightPlateauConfirmed, adherenceLow / adherenceUnverified | — |
| Plateau + recovery declining | recovery wins; no cut (fixture S34) | recoveryDeclining, calorieCutSuppressedByRecovery | — |
| Loss too fast / performance+recovery declining on a cut | increase calories or reduce expenditure | weightLossTooFast, performanceDeclining | "too fast": RESEARCH_REQUIRED (candidate: > 1 % BW/wk sustained ⇒ flag; ASSUMPTION until register) |
| Gain too fast on a bulk | reduce surplus | weightGainTooFast | RESEARCH_REQUIRED (candidate: > ~0.5 %/wk) |
| Intake consistently far above target, weight rising on a cut | honest reason codes + adherence support; optionally propose *raising* target toward sustainable (never shaming) | calorieTargetConsistentlyExceeded | PRODUCT_POLICY |

## 3. Step adaptation ([CTO-QAE-001] §14)

The 3,200→4,500 example is **removed as policy** — it was illustrative and its +40 % jump is not normative. The Step Engine reasons from: baseline distribution · adherence to current target · recovery state · goal · observation confidence · prior increases · **minimum exposure period** on the current target.

- Initial target: derived from *observed baseline* (median of quality-assessed days), plus a modest evidence-labeled increment — never a universal 10,000.
- Increase only when: current target consistently met (adherence ≥ threshold over the exposure period) ∧ recovery not declining ∧ no simultaneous large calorie cut or volume increase (ChangeBudget) ∧ cooldown passed.
- Never aggressively raise steps when recovery is poor, pain is elevated, adherence is poor, training volume just increased, or calories were substantially reduced.
- Increment size, exposure days, adherence threshold: RESEARCH_REQUIRED → register (step-progression evidence); interim candidates are ASSUMPTION-labeled and conservative.
- `stepTargetRepeatedlyExceeded` (fixture S25): propose an increase (optimization class), or keep with positive codes if budget is spent — exceeding a target is never a problem to "fix."

## 4. Training adaptation

- Progression method lives in the plan (per slot/method); weekly evaluation may propose `changeProgressionMethod`, `changeTrainingVolume(deltaBp)`, `changeTrainingFrequency`, `scheduleDeload`, `replaceExercise`.
- Volume increases require: performance trend stable/rising ∧ recovery OK ∧ completion high ∧ budget/cooldown clear. Caps per DECISION-MODEL §3.2.
- Deload: proposed on recovery-decline patterns or accumulated-fatigue markers (register-labeled); implemented as CompositeSafetyRecovery.
- Repeated missed workouts (fixture S23): treat as adherence signal — propose *reducing* frequency/session length to match reality (optimization, requiresApproval), never volume-punish.
- Exercise replacement: preference-driven swaps are `minor`/`preference`; pain/injury-driven swaps are `injuryRestriction` and follow metadata `contraindications` + `substitutionGroup`.

## 5. Normative definitions (mechanisms; numbers via register)

- **Verified plateau:** weight trend `stable` (|slope| below band) across ≥ N valid observations spanning ≥ D days with confidence ≥ moderate, while intake adherence is verified. Candidates N=..., D=14–21: RESEARCH_REQUIRED.
- **High adherence:** calorie adherence within band ∧ training completion ≥ threshold, each with confidence ≥ moderate. PRODUCT_POLICY.
- **Recovery declining:** ≥ 2 of {sleep trend falling, fatigue rising, soreness rising, performance falling} with confidence ≥ moderate. PRODUCT_POLICY + register.
- **Minimum exposure:** a changed variable is not re-evaluated for change until its exposure period elapses (also serves as cooldown floor). PRODUCT_POLICY.

## 6. Ramadan interaction (see RAMADAN-CONTEXT.md)

During an active fasting context: adherence interpretation switches to context-aware baselines; step and calorie adaptation thresholds use the context's expectations; entering/leaving the context suppresses trend-comparison across the boundary (`contextBoundaryCrossed` ⇒ comparisons restart) rather than misreading the transition as progress/regression.

## 7. Goal-lifecycle interaction

Adaptation tunes **within** a goal. Sustained signals that the goal itself is complete/stuck/harmful generate `proposeGoalTransition` via GoalLifecycle (always requiresApproval; see GOAL-LIFECYCLE.md). Adaptation never flips `goalType`.
