# QAE Safety Policy

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §§4, 6

## 1. Two species: proposals vs constraints

| | Optimization Proposal | Safety Constraint |
|---|---|---|
| Nature | A suggestion the engine makes | A bound on the valid decision space |
| User may reject | **Yes**, freely | Rejection of the *recommended adjustment* — yes. Bypass of the *constraint* — **no** |
| Mutates the plan | Never (user applies) | **Never** (it blocks, it does not edit) |
| Examples | calories −100, steps +750, preference swap | calorie floor, minor goal restriction, volume cap under recovery decline |

When a user declines a recommended safety adjustment, QAE: preserves their historical data · does not silently apply the rejected adjustment · **blocks the unsafe action/progression** · provides the safe fallback state · explains via reason codes why the unsafe action cannot continue.

Normative example ([CTO-QAE-001] §4): severe recovery decline. The system may not force "reduce volume 20 %". It also may not permit "increase volume 15 %". The `ValidDecisionSpace` for volume becomes `{maxDeltaPerCycle: ≤ 0}` until the condition clears — declinable recommendation, undeclinable boundary.

## 2. ValidDecisionSpace

```
ValidDecisionSpace {
  perVariable: { calories: {minKcal, maxKcal, maxDeltaPerCycle},
                 stepTarget: {min, max, maxDeltaPerCycle},
                 volume: {maxIncreaseBp, maxDecreaseBp}, frequency: {...}, ... }
  blockedActions: AdaptationActionKind[]        # e.g. all mass-change goals for a minor
  reasonCodes: ReasonCode[]                     # WHY each bound is active — always visible
}
```

Computed by SafetyPolicy from profile + trends + context on **every** evaluation; embedded in the response so hosts can gray out / explain unsafe options before the user even tries.

## 3. Three checkpoints (all mandatory, [CTO-QAE-001] + brief)

1. **Before initial plan acceptance** — `validatePlan(planCandidate, profile, context)`.
2. **Before proposal issuance** — per-candidate screen (2a) **and** compositional validation of the resolved set (2b): conflicting recommendations, cumulative weekly adaptation, composite-bundle legality (DECISION-MODEL §3.3).
3. **Before applying an accepted proposal** — `checkAction(appliedChange, currentState)`. State may have changed between issuance and acceptance (new observations, new injury flag); acceptance of a stale proposal does not bypass safety.

## 4. Non-bypassable by construction

Safety survives by **structure**, not by discipline (charter §4.2: "a gate that survived by an agent's ethics must survive by its structure"):

- The types `IssuablePlan`, `IssuableProposal`, `AppliableChange` are constructible **only** inside the SafetyPolicy module (TS: branded/opaque types; Swift: non-public initializers). Every downstream consumer requires them; an engine that skips safety cannot produce the type the pipeline demands.
- Verdicts are `Pass | Clamp{original, adjusted, reasonCodes} | Block{reasonCodes, safeFallback}`. **Clamps are always visible** — a silently floored number is a defect class, not a convenience.
- SafetyPolicy has its own version stream in the manifest; its rules use the same Rule anatomy (RULE-MODEL) with `priorityClass: safety`.
- Counter-tests (mandatory): (a) an engine attempting to emit a plan around the policy fails by a named check; (b) a composite bundle carrying non-protective actions is rejected by name; (c) a stale accepted proposal that became unsafe is blocked at checkpoint 3.

## 5. Safety domains validated

| Domain | Content | Basis |
|---|---|---|
| Age / minors | §6 below | CHARACTERIZED_EXISTING (live policy) |
| Nutrition bounds | calorie floors by sex; maximum deficit/surplus; protein/macro sanity bounds | legacy floors CHARACTERIZED_EXISTING (1500/1200/1350 kcal male/female/unspecified); final values EVIDENCE-REGISTER |
| Rate of weight change | block/flag extreme observed or projected rates (both directions) | RESEARCH_REQUIRED → register |
| Injury exclusions | contraindication tags (metadata) exclude exercises; injury flags bound volume/pattern choices | CHARACTERIZED_EXISTING (id blocklists) → superseded by metadata `contraindications` |
| Training volume limits | per-band caps on volume, weekly increase caps | RESEARCH_REQUIRED |
| Adaptation frequency | max changes per variable per window; total weekly adaptation magnitude | PRODUCT_POLICY (ChangeBudget) |
| Conflicting recommendations | compositional check at 2b | mechanism normative |
| Medical flags | screening answers route to `requestMoreData` / `seekProfessionalGuidance` reason codes — **never** diagnosis, never medical claims | product rule (charter) |

## 6. Minors — adopted live policy ([CTO-QAE-001] §6)

QAE's initial behavioral contract **is** the live Qimmah policy, characterized (LEGACY-ENGINE-MAP §minors, fixtures S18/S19/S29):

- App minimum age: 13 (existing `test:age-13` behavior).
- Ages 13–17: weight-modification goals (cut/bulk) are overridden to maintenance (`effectiveGoalTypeForAge`); restriction note shown; weight-change forecast suppressed; adult BMI classification suppressed; guidance to consult a specialist.
- Age 18: full goal set restored (boundary fixtures pin both sides).
- **Characterized defect, escalated not inherited silently:** legacy `isMinorAge(0) === false` — an unset/zero age bypasses the minor guard entirely. QAE treats *unknown age* as a mandatory assessment gap that **blocks** plan finalization (`dataIntegrity` class) rather than defaulting to adult. This is a deliberate, documented deviation from the oracle, flagged for founder confirmation (UNRESOLVED-DECISIONS #U1).
- Any future change to minors policy is a separate explicit product/safety decision — out of QAE's authority.

## 7. Rejected-safety-recommendation flow (normative sequence)

```
recovery decline detected
→ CompositeSafetyRecovery proposal issued (volume −10 %, hold progression)
→ user rejects
→ plan unchanged; rejection recorded; re-proposal cooldown starts
→ ValidDecisionSpace STILL constrains: volume increases blocked, progression held
→ user attempts volume increase → checkAction → Block{reasonCodes:
   [recoveryDeclining, volumeIncreaseBlockedBySafety], safeFallback: current plan}
→ condition clears in later trends → space widens → reason codes explain the release
```
