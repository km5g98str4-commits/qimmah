# QAE Goal Lifecycle

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §11

## 1. Principle

A user is not permanently cutting, bulking, or maintaining. The lifecycle is:

```
Goal → Phase → Progress → Completion | Plateau | Abort → Transition Recommendation
```

**Goal transitions require explicit user confirmation** unless required to satisfy a safety constraint. The engine never flips `goalType` on its own; it emits `proposeGoalTransition` (always `requiresApproval`).

## 2. States and phases

```
GoalLifecycleState {
  goalType: cut | bulk | maintain
  phase:    active | deloadWeek | dietBreak | transitionPending | completed | aborted
  phaseStartDate, goalStartDate
  progressMarkers: { startMassGrams, targetMassGrams?, latestTrend }
  transitionPending?: { toGoal, proposalId, reasonCodes }
}
```

- `active` — normal adaptation applies.
- `deloadWeek` — a scheduled recovery composite is in effect; progression held; adaptation of other variables suppressed for the phase.
- `dietBreak` — maintenance-calorie interlude inside a cut (evidence for scheduled breaks is mixed; QAE v1 models the *state* so hosts/rules can use it; whether QAE proactively proposes diet breaks is UNRESOLVED #U6).
- `transitionPending` — a `proposeGoalTransition` awaits the user.
- `completed` / `aborted` — terminal for that goal instance; a new goal instance starts on confirmation.

## 3. Transition triggers (rules, class `goalProgress` unless noted)

| Trigger (evidence-gated trends) | Recommendation | Reason codes |
|---|---|---|
| Cut: target mass reached / sustained at target band | transition → maintain | goalTargetReached |
| Cut: extended duration + rising fatigue/hunger markers | transition → maintain (or dietBreak per #U6) | extendedDeficitDetected, recoveryDeclining |
| Bulk: target reached or gain-rate/composition signals exceed policy | transition → maintain | goalTargetReached / weightGainTooFast |
| Maintain: user-declared new intent (host event) | new goal instance | userRequestedGoalChange |
| Safety class: sustained under-recovery or unsafe rate patterns that within-goal adaptation cannot resolve | transition recommendation with `safety` priority; still requires confirmation — but the ValidDecisionSpace already bounds the unsafe behavior meanwhile | safetyDrivenTransition |

Thresholds (what counts as "reached," "sustained," "extended"): PRODUCT_POLICY + register; no invented numbers.

## 4. Interactions

- **Adaptation** tunes within a goal; it reads `phase` (no calorie optimization during `deloadWeek`/`dietBreak`; comparisons suppressed across phase boundaries, like RamadanContext boundaries).
- **Plan versioning:** a confirmed transition creates a new plan version chain with a fresh baseline (trend comparisons do not straddle goal boundaries).
- **Minors:** goal set for minors is constrained by SAFETY-POLICY §6 — lifecycle rules cannot propose restricted goals to a minor.
- **Legacy note:** the current app models goal as a static field with no lifecycle (characterized); `recomp`/`strength` were historically migrated to `cut`/`bulk`. GoalLifecycle is genuinely new ground — every transition rule is spec-first, fixture-covered, and labeled.
