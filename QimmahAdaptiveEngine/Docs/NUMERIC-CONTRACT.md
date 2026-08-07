# QAE Numeric Contract

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001] §13
**Purpose:** eliminate JS ↔ Swift numeric drift. The language-neutral contract carries only canonical integer values with explicit units, scales, and rounding. Golden parity compares canonical values, never incidental floating-point representation.

---

## 1. Canonical units

| Quantity | Canonical unit | JSON type | Example | Notes |
|---|---|---|---|---|
| Body mass | grams (g) | integer | `82500` = 82.5 kg | display layer converts to kg |
| Height | millimeters (mm) | integer | `1780` = 178 cm | |
| Energy | kilocalories (kcal) | integer | `2350` | |
| Macros | grams (g) | integer | `165` | per macro per day |
| Steps | count | integer | `6500` | |
| Duration | minutes (min) | integer | `45` | session durations, rest in seconds (see below) |
| Rest between sets | seconds (s) | integer | `90` | |
| Percentages / rates | basis points (bp) | integer | `-1000` = −10.00 % | 1 bp = 0.01 % |
| Weight-change rate | grams per week (g/wk) | integer | `-450` = −0.45 kg/wk | trend outputs |
| Age | completed years | integer | `17` | host computes from DOB + `now`; domain never touches calendars |
| Time instant | epoch milliseconds UTC | integer | `1791234567890` | |
| Local-time context | tz offset minutes | integer | `180` = UTC+3 | captured per observation, host-supplied |
| Confidence | closed enum | string | `"moderate"` | `none · low · moderate · high` — never a float |
| Local date | derived `YYYY-MM-DD` | string | `"2026-08-07"` | derived arithmetically from epochMs + tzOffsetMinutes (see §4); never from a Calendar API |

**No canonical field is ever a float.** Where a legacy value is fractional (e.g., activity factor 1.55), the contract stores it as a scaled integer with a declared scale (e.g., `activityFactorMilli: 1550`).

## 2. Arithmetic rules

1. **All domain arithmetic is on integers** within ±2^53 −1 (safe in JS `number`, trivially safe in Swift `Int64`). A lint/check in `Tools/` will forbid fractional literals in rule definitions.
2. **Multiplication before division, always.** `a × b ÷ c` is computed as `div(a*b, c)`, never `a × (b/c)`.
3. **Every division declares its rounding mode.** No implicit truncation.
4. **Rounding modes allowed** (closed set):
   - `HALF_AWAY_FROM_ZERO` — default for user-facing targets.
   - `FLOOR` / `CEIL` — only where safety requires the conservative direction (e.g., a calorie *floor* check rounds the floor *up*; a volume *cap* rounds *down*).
   - `HALF_EVEN` is **not** used (needless cross-language risk; away-from-zero is unambiguous and identically implementable in TS and Swift on integers).
5. **Rounding happens only at declared boundaries:** (a) final presentation values in a plan (e.g., kcal to the nearest 50, weights to equipment increments), (b) storage of a derived trend. Intermediate values keep full integer precision at the working scale.
6. **Display-step quantization is part of the contract.** Each plan field declares its step: e.g., `calorieTarget` step 50 kcal, `stepTarget` step 250 steps, `macro` step 5 g. (Step values are PRODUCT_POLICY, recorded in the evidence register; the *mechanism* is fixed here.)

## 3. Determinism of ordering and iteration

- Every list in a contract payload is **explicitly ordered**, and the ordering key is documented on the schema (e.g., proposals by `(priorityClass, priorityScore desc, ruleId lexical)`).
- Ties always break on a **total key** ending in a unique stable id (ruleId, exerciseId, questionId). No ordering may depend on map/dictionary iteration order in either language.
- Sorts are specified as **stable**; where a platform sort is not stable, the implementation must apply the full total key.
- `RuleSetManifest.contentHash` is computed over a **canonical JSON serialization**: UTF-8, object keys sorted lexically (byte order), no insignificant whitespace, integers without exponent notation. Hash algorithm: SHA-256, lowercase hex.

## 4. Time and day boundaries

- The domain **never** calls `Date.now`, `Calendar`, locale, or timezone APIs.
- Hosts pass `now = {epochMs, tzOffsetMinutes}` in every request, and each raw observation carries `{epochMs, tzOffsetMinutes}` captured at write time.
- `localDate(epochMs, tzOffsetMinutes)` is pure arithmetic: `floorDiv(epochMs + tzOffsetMinutes*60000, 86400000)` → civil date via a fixed proleptic-Gregorian conversion (specified, shared, and golden-tested in both languages). DST correctness is the host's problem at capture time — the offset stored with the observation is authoritative.
- Review windows arrive as explicit `ReviewPeriod {startDate, endDate}` (inclusive local dates), computed by the host. Domain policy states *eligibility* (e.g., minimum days of data), never derives week boundaries itself.

## 4a. The float lock ([CTO-QAE-003] — formalized)

> Inside the engine: **No float. Ever.**
>
> Floats are permitted in exactly one direction: `Legacy Adapter → Canonical Integer → QAE`. The reverse direction does not exist: no QAE value is ever converted back to a float, and no float ever enters a rule, a resolver, a proposal, or a golden.

The boundary is crossed once, in the oracle/host adapter, with explicit per-field scaling. The canonical serializer rejects non-integers **by name** (`QAE-CANONICAL-VIOLATION`), so a float that sneaks past review still cannot reach a golden or a provenance hash.

## 5. Prohibitions

- No `float`/`Double` in any contract field or rule threshold.
- No float equality anywhere; no epsilon comparisons (they encode the drift we're eliminating).
- No `Math.random` / randomness in the domain. Any tie needing "arbitrary" choice uses the lexical tie-break (§3).
- No parsing of localized numbers; contracts are machine JSON only.

## 6. Worked example (BMR pipeline shape)

Mifflin-St Jeor (if adopted from legacy characterization — see LEGACY-ENGINE-MAP) in canonical units:

```
bmr_kcal = round_half_away(
    (10 * massGrams) / 1000
  + (6250 * heightMm) / 1000000    # 6.25 kcal/cm expressed over mm at scale
  - 5 * ageYears
  + sexTerm                        # +5 male / −161 female / policy value for unspecified
, step = 1)
```

All terms are integer products with declared scales; a single rounding at the end. The exact formula and the `unspecified` sex policy are recorded per legacy characterization and the evidence register — this section fixes only the *numeric mechanics*.

## 7. Conformance

- `Fixtures/` golden files contain canonical integers only; a fixture with a float fails the fixture linter (`Tools/`, future wave).
- The future Swift implementation must reproduce every golden byte-for-byte after canonical serialization (§3). Divergence in any canonical value is a parity failure, not a tolerance case.
