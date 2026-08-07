# QAE Data Quality

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §10

## 1. Mandate

**No adaptation rule may operate directly on raw observations.** The required flow is:

```
Raw Observations → Validation → Normalization → Quality Assessment → Trend Data → Adaptive Decisions
```

Enforced structurally: `RawObservation` types are not exportable outside the DataQuality module; rules' `EvidenceSpec`s can only name `QualityAssessedSeries`.

Why this domain is first-class (legacy evidence): the live codebase parses measurement values by regex from heterogeneous `string|number` records with units baked into key names, has two different date parsers that disagree at timezone boundaries, computes a "trend" from the last two readings with no tolerance band (0.1 kg jitter reads as a trend), and stores day-keyed data under local-timezone stamps that can duplicate or skip days on travel/DST (LEGACY-ENGINE-MAP §4). QAE fixes this class of problem at the boundary, once.

## 2. Validation (per observation)

| Check | Handling | Flag |
|---|---|---|
| Impossible values (per-kind hard bounds: body mass, steps, sleep hours, intake kcal — bounds are PRODUCT_POLICY, register-listed) | excluded | `impossible` |
| Malformed/missing unit or timestamp | excluded | `impossible` |
| Duplicate (same kind, same localDate, same source, same value) | collapsed to one | `duplicate` |
| Same-day conflicting values, same source | resolution per kind: bodyMass → last-write of day; steps → max (cumulative daily totals); PRODUCT_POLICY per kind, documented | `duplicate` |
| Stale (older than kind-specific staleness window at evaluation time) | retained in series, excluded from *current-state* reads | `stale` |

**Every exclusion is visible** in `DataQualityReport.exclusions` with a reason code — silent data dropping is a defect class (charter §5 honesty).

## 3. Normalization

- Units → canonical (NUMERIC-CONTRACT §1): grams, mm, kcal, integer steps, minutes.
- Day assignment: `localDate` derived arithmetically from `{epochMs, tzOffsetMinutes}` captured at write time (NUMERIC-CONTRACT §4). One parser, both languages, golden-tested. Timezone/day-boundary issues are handled *here and only here*.
- Source tagging preserved: `manual | healthKit | derived | imported`.

## 4. Source conflicts & precedence

When manual and HealthKit both report the same kind on the same localDate:

- Steps: device-sourced (healthKit) wins over manual estimate; manual wins only if flagged as an explicit correction. PRODUCT_POLICY.
- Body mass: manual wins (user-entered readings are deliberate; imported scale data may double-report). PRODUCT_POLICY.
- The losing observation is retained, flagged `sourceConflict`, visible in the report.
- Legacy invariant preserved: health-sourced data never leaves the device (host sync layer excludes it — characterized; QAE contracts mark series with `sourceContainsHealth` so hosts can enforce).

`sourceConfidence` per point: healthKit high for steps; manual high for bodyMass; imported moderate; derived per derivation.

## 5. Outlier policy (bodyMass primary case)

- Detection: deviation from the rolling window median beyond a per-kind band (candidate: bodyMass > X g from 7-day median — value RESEARCH_REQUIRED/POLICY; mechanism normative).
- Handling: outliers are **down-weighted or excluded from trend fitting, never deleted**, flagged `outlier`, visible.
- Water-weight reality: single-day spikes after high-sodium/high-carb days are expected; the plateau/trend rules already require multi-week evidence, and outlier damping protects the slope estimate. Counter-test: a series with one absurd entry (fat-finger 8.5 kg jump) must produce a trend within band of the same series without it.

## 6. Quality assessment (per series, per review period)

```
QualityAssessedSeries adds:
  validCount        — points surviving validation
  spanDays          — first→last valid point
  coverageBp        — days-with-data / period-days
  seriesConfidence  — none|low|moderate|high per kind-specific table
```

Confidence tables (per kind: minimum validCount, minimum spanDays, minimum coverage → level) are the numeric backing of the `Confidence` enum; values PRODUCT_POLICY + register (legacy insights thresholds — weightMinPoints 4, weightMinSpanDays 14, weightStaleDays 9, self-labeled NON-STANDARD in source — are the characterized starting candidates).

## 7. Missing data

- Missing step days: explicit gaps (`null` days), never zero-filled — a day without data is unknown, not sedentary. Averages are over days-with-data with coverage reported; rules requiring coverage read `coverageBp`.
- No weight data / incomplete weight data (fixtures S12, S13): series confidence `none|low` ⇒ evidence gates fail ⇒ `requestMoreData` with named gaps. Never adapt on absent data.
- A missed check-in entirely (fixture S33): all series stale/empty for the period ⇒ `requestMoreData`, no adaptation, no budget consumed.

## 8. Outputs

`QualityAssessedSeries` per kind + `DataQualityReport` (exclusions, conflicts, coverage) — the report itself is part of the evaluation response so hosts can show honest "based on N days of data" statements, and so `dataIntegrity`-class rules can act (e.g., propose fixing a source conflict before trusting trends).
