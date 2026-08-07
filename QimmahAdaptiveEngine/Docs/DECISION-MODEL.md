# QAE Decision Model

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §§4–5, 15

## 1. Pipeline

```
CandidateProposal[]  (from all engines' rules)
  1 → SafetyPolicy.screen          per-candidate: Pass | Clamp | Block   (checkpoint 2a)
  2 → group by targetVariable
  3 → resolve within group:        priorityClass, then priorityScore desc, then ruleId lexical
  4 → cross-group conflict check:  contradictory directions on coupled variables
                                   (e.g. calories ↓ while volume ↑) → higher class wins,
                                   loser recorded in ReasonTrace as suppressed
  5 → cooldown filter:             AdaptationHistory (accepted AND rejected count)
  6 → ChangeBudget:                §3
  7 → SafetyPolicy.validateSet     compositional check on survivors        (checkpoint 2b)
  8 → emit AdaptationProposal[] + ReasonTrace (fired / suppressed / notFired / insufficient)
```

Deterministic: every step is a pure function; every ordering has a total key. If steps 1–7 eliminate everything, the result is an explicit `keepPlan` proposal carrying the reason codes of the strongest suppressed/unfired candidates — "nothing changed, and here is why" is a deliverable, not an absence.

## 2. Decision priority (conflict resolution order)

`safety > minorRestriction > injuryRestriction > dataIntegrity > recovery > adherence > goalProgress > optimization > preference`

Worked example (normative, fixture S34): weight plateau + 95 % adherence + poor sleep + high fatigue ⇒ the plateau-driven calorie cut (`goalProgress`) is **suppressed** by recovery rules (`recovery`); the emitted proposal is a recovery intervention (or `keepPlan` + recovery reasons), never `changeCalories(−)`. The suppressed cut appears in the ReasonTrace.

## 3. Change Budget ([CTO-QAE-001] §5)

### 3.1 Change classes

| Class | Definition | Per-cycle limit |
|---|---|---|
| `major` | Any single action at/above the major threshold of its variable (§3.2) — calorie change, step-target change, volume change, frequency change, deload, progression-method change, macro redistribution | **1** |
| `minor` | Below-threshold, low-risk single action (small substitution for preference, rest tweak, sub-threshold step nudge) | ≤ 1, optional |
| `compositeSafetyRecovery` | A recovery/safety bundle (§3.3) | counts as THE major slot |

No-evidence ⇒ no change: a cycle whose evidence gates fail produces `requestMoreData`/`keepPlan`, consuming no budget.

### 3.2 Major-change thresholds (per variable)

Mechanism is normative; **numeric values are placeholders pending the evidence register** — each carries its label and cannot ship enabled while `RESEARCH_REQUIRED`:

| Variable | Major if ≥ | Hard per-cycle cap | Label |
|---|---|---|---|
| calories | 100 kcal | 200 kcal (BGT-CAL-CAP) | PRODUCT_POLICY (candidate values; final after register) |
| stepTarget | 500 steps | 1000 steps | PRODUCT_POLICY + RESEARCH_REQUIRED (progression evidence) |
| trainingVolume | 500 bp (5 %) | 2000 bp (20 %) reduction / 1000 bp (10 %) increase | PRODUCT_POLICY + RESEARCH_REQUIRED |
| frequency | any change | ±1 day | PRODUCT_POLICY |
| macros | redistribution moving ≥ 10 % of kcal | — | PRODUCT_POLICY |

### 3.3 CompositeSafetyRecoveryChange — internal limits

A composite exists so a legitimate recovery intervention (e.g., deload: volume −10 %, hold progression, steps unchanged) is **one** decision — while structurally preventing budget bypass:

1. Only rules of class `safety`/`recovery` may emit composites.
2. Component actions must all be **protective**: reduce volume/intensity, hold progression, reduce or hold steps, hold or **increase** calories, schedule deload. A composite containing a calorie *reduction*, step *increase*, volume *increase*, or frequency *increase* is invalid — rejected at screen with `compositeContainsNonProtectiveAction`.
3. ≤ 3 component actions; each within its own per-cycle cap (§3.2).
4. ≤ 1 composite per cycle; a composite consumes the major slot (no additional major).
5. Counter-test (mandatory, charter §4.2): a simulated "bundle" carrying `calories −300 + steps +3000 + volume +20 %` must be rejected by a **named** check, not by coincidence.

### 3.4 Cooldowns

After a variable changes (via accepted proposal), that variable enters cooldown for `minDaysBetweenFirings` (per-variable policy values, register-labeled). Rejected proposals impose a re-proposal cooldown on the same (variable, direction) pair — the engine does not nag (fixture S30). Safety **blocks** are exempt from cooldown: safety is always allowed to act.

## 4. Proposal shape

Every emitted `AdaptationProposal` carries: `action` (closed ADT) · `changeClass` · `reasonCodes[]` · `evidence: EvidenceRef[]` (pointing at real observed values and thresholds, auditable) · `confidence` · `safetyImpact` · `priorityClass/score` · `requiresApproval` · `safetyScreen` verdict · `manifest`.

`requiresApproval` policy: **all** plan-affecting proposals require user approval (locked product decision — no silent changes). The flag exists because `requestMoreData` and pure-informational outcomes need none, and because a future founder decision could relax specific minor actions — never the default.

## 5. Optimization proposals vs safety constraints ([CTO-QAE-001] §4)

Two different species, explicit in the architecture:

- **Optimization Proposal** — user may accept or reject freely (reduce calories 100, increase steps 750, swap exercise). Rejection is recorded, cooldown applies, plan stands.
- **Safety Constraint** — not a proposal at all. It bounds the `ValidDecisionSpace` (SAFETY-POLICY.md): it never silently mutates the plan, but no plan/proposal/user-action outside the space can be issued or applied. If a user declines a *recommended* safety adjustment, the recommendation is not force-applied — but actions that would worsen the unsafe condition are blocked with reason codes and a safe fallback state (e.g., severe recovery decline: "reduce volume 20 %" may be declined, but "increase volume 15 %" will not validate).

## 6. Confidence

`Confidence` is the closed enum `none|low|moderate|high`, derived per metric in DataQuality/WeeklyTrends from documented observation counts/spans, then combined per rule by its declared `confidenceImpact` (default: minimum across required evidence). Never a free-floating number invented by a rule.
