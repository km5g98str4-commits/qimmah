# QAE Ramadan Context

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §7 (IN for V1)

## 1. Principle — a first-class context, not scattered IFs

`RamadanContext` is an explicit input the **host supplies**; the engine computes nothing religious and assumes nothing legal or personal:

```
RamadanContext {
  fasting: bool                       # is the user observing a fasting period NOW
  periodDates?: {startDate, endDate}  # host-provided, user-confirmed
  dailyEatingWindow?: {startMinuteOfDay, endMinuteOfDay}   # host-computed from user's location/choice
}
```

- The engine never infers fasting from calendar, locale, or location. The existing product decision stands: the fasting question is permanent, neutrally worded, seasonally activated — all host-side. (Characterized: the live personalization proof *forbids* religious terms in the question bank under the current Gulf-context-assumed decision [CTO-76]; introducing the fasting question is therefore a **host/product change outside QAE** — QAE only defines what it does when the context arrives. Flagged as UNRESOLVED #U7 for sequencing.)
- Absent context = `fasting: false`. No behavior change.

## 2. Effects when `fasting: true`

| Domain | Effect | Basis |
|---|---|---|
| Training scheduling | Session-timing constraint surface: host passes user's preferred training slot relative to the eating window; engine biases session placement/intensity accordingly (e.g., high-fatigue sessions not scheduled deep into the fasting window) | Practice-based (EVR-011 notes: timing prescriptions are practice, not tested outcomes) — PRODUCT_POLICY, labeled |
| Training load | Conservative volume/intensity bias during the period; performance evidence shows small decrements in repeated-sprint/peak-power, most parameters unaffected (EVR-011) — so *modest* adjustment, not blanket reduction | VERIFIED_EVIDENCE (magnitude small) + PRODUCT_POLICY |
| Meal distribution | Nutrition targets re-expressed over the eating window (meal count/distribution constraints); daily kcal/macro targets unchanged by default | PRODUCT_POLICY |
| Hydration guidance | Reason codes only (`hydrationWindowCompressed`) for host copy; **no medical claims, no fluid prescriptions** | product rule (charter: no medical claims) |
| Adherence interpretation | Intake-timing adherence measured against the context's expectations, not the non-fasting pattern; missed midday meals are not non-adherence | normative |
| Weekly adaptation | Context boundary crossing (entering/leaving the period) suppresses cross-boundary trend comparisons (`contextBoundaryCrossed`); within-period trends compare within-period; body-mass fluctuations at boundaries are expected (EVR-011: small, reversible changes) and must not trigger calorie adaptation | normative |
| Steps | No step-target increases proposed during the period (ChangeBudget bias); target holds unless safety says otherwise | PRODUCT_POLICY |

## 3. Rule mechanics

- Ramadan rules live in their own pack (`QAE-RMD-*`), versioned like any other; they act mostly as **modifiers**: tightening ValidDecisionSpace bounds, adjusting adherence baselines, and suppressing specific rule firings via preconditions on `context.fasting`.
- Every suppression/modification is reason-coded — the user sees *why* the engine is holding steady during the period.
- Neutrality requirement: reason codes are behavior-descriptive (`fastingContextActive`, `contextBoundaryCrossed`), never religiously prescriptive; hosts own all user-facing wording (charter tone rules apply there, not here).

## 4. Fixture

S27 pins: fasting week → no calorie adaptation from boundary weight noise · adherence interpreted against context · no step increase proposed · training-load conservative bias · correct reason codes emitted.
