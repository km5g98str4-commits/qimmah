# Profile Evidence Map

**Status:** Phase 4 deliverable · [CTO-QAE-005] §4 · Machine contract: `Contracts/content/profile-evidence-map.json`

## The real binding

```
Question Evidence (fact paths = characterized legacy answer keys)
  → PartialAthleteProfile (facts + derived.* classification facts)
  → AssessmentCompleteness (generic engine bound to the real spec below)
```

## Requirement levels (all six mandated tiers)

| Tier | Keys |
|---|---|
| REQUIRED_FOR_ANY_PLAN | `age · sex · heightCm · weightKg · primaryGoalDisplay · daysPerWeek · sessionMinutes · place` |
| REQUIRED_FOR_SAFE_PLAN | `healthConsent · hasInjury` |
| REQUIRED_FOR_TRAINING | `trainedBefore · trainingStyle` |
| REQUIRED_FOR_NUTRITION | `primaryGoalDisplay · weightKg · heightCm · age · sex` |
| OPTIONAL_PERSONALIZATION | experience signals, equipment detail, recovery/lifestyle texture, preferences (full list in the JSON) |
| FOLLOWUP_ONLY | injury/surgery/screen follow-ups, `lastTrained`, `dumbbellMaxKg`, … — mandatory-conditional once their trigger fires |

`mandatory` (blocks finalization) = the characterized legacy 12-key required set — the same keys `migration.ts` treats as `REQUIRED_KEYS`, now enforced by the generic completeness engine.

## Unknown age is BLOCKING — permanently

Per [CTO-QAE-005] §4 and U1: `age` is mandatory; it has **no default**; when age is unknown, ProfileClassification derives `derived.ageKnown=false` and derives **no** `derived.isMinor` fact, so nothing age-gated can unlock, completeness cannot pass, and SafetyPolicy (QAE-SAF-001, CRITICAL) blocks any plan. The legacy "age 0 = adult" behavior (L-SAF-1) is not revived anywhere in this mapping.

## Verification

Journey goldens assert the law end-to-end: every persona journey that stops with `complete` has `completeness.complete === true` with `mandatoryMissing: []` (content proof "no unanswered required evidence at successful completion"). Gap detection (`detectGaps`) names candidate questions for every missing mandatory key, and shows unfillable paths visibly with empty candidate lists.
