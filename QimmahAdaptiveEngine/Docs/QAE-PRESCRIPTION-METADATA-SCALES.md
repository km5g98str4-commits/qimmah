# Prescription Metadata Scales ([CTO-QAE-015] §2)

Frozen ordinal scales for the three fields future prescription policy will consume.
**No second representation is introduced** — these are the existing catalog fields
(`stabilityDemand: 1|2|3`, `fatigueCost: 1|2|3`, `axialLoad: 'none'|'moderate'|'high'`)
given explicit meaning, observable criteria, and per-field provenance.

> **These are PRODUCT POLICY classifications, not measurements.** None of them is a
> scientific quantity. They exist to let a later prescription wave reason conservatively
> about relative programming cost. They are not calorie estimates, not systemic-fatigue
> scores, and not medical or diagnostic claims.

---

## 0. The gap this wave closes

The catalog carries **one** `metadataConfidence` per exercise, set to `characterized` for
all 181. But its own `provenance` records that `stabilityDemand`, `fatigueCost` and
`axialLoad` were **derived** by heuristic rules. A consumer reading
`metadataConfidence: 'characterized'` would therefore treat a heuristic as a
characterization.

Wave 5 adds **per-field** provenance in a separate curation layer and a gate that refuses
to let prescription read a field below its required tier.

**Catalog values are not mutated.** Curation records the reviewed value alongside the
current catalog value; where they differ the record is a `pendingCorrection` that does
**not** feed selection or assembly. This is what makes 17/17 parity structurally
impossible to disturb (§8).

---

## 1. `stabilityDemand: 1 | 2 | 3`

*How much of the athlete's own stabilisation the movement requires.*

| Level | Meaning | Observable criteria |
|---|---|---|
| **1** | Path fixed by the implement; torso supported | Machine-guided path, or seated/lying with back support, or a fixed bar path (Smith). Base of support large and passive. |
| **2** | Free path, but bilateral with a large or braced base | Free weight, both limbs, feet planted or bench-supported. Cables from a fixed anchor. Bodyweight compounds with a large base. |
| **3** | Free path **and** a reduced or unstable base | Unilateral standing loading, split stances, standing overhead loading, suspension, or an intentionally narrow/single-point base. |

**Boundary examples**
- Chest press machine → **1** (guided path, supported torso)
- Barbell bench press → **2** (free path, supported torso, bilateral) — free path outranks the bench
- Bulgarian split squat → **3** (unilateral, reduced base)
- Seated cable row → **2** (fixed anchor, but the path is not machine-constrained)

**Exclusions.** Grip difficulty, cardiovascular demand, and how "advanced" an exercise
feels are not stability. Technical complexity is a separate field
(`technicalDifficulty`) and must not be folded in.

**May be used for:** conservative eligibility ceilings and ranking (already approved);
future prescription may use it to bound exercise choice.
**MUST NOT imply:** injury risk, joint safety, or a medical judgement of any kind.

---

## 2. `axialLoad: 'none' | 'moderate' | 'high'`

*Meaningful compressive loading through the spine.*

| Level | Meaning | Observable criteria |
|---|---|---|
| **`none`** | No meaningful axial spinal loading | Lying, seated with full back support and no spinal load path, or the load bypasses the spine entirely. |
| **`moderate`** | Spine loaded but braced, supported, or the load is light relative to the pattern | Supported rows, machine-supported squat patterns, upright carries of moderate load. |
| **`high`** | Substantial external load passing through an unsupported spine | Bar on the back or front rack, standing overhead pressing, unsupported hinge patterns under load. |

**Boundary examples**
- Leg press machine → **`none`** (load bypasses the spine)
- Hack squat machine → **`moderate`** (spine loaded but the path is supported)
- Barbell back squat → **`high`**
- Chest-supported row → **`none` / `moderate`** by whether the chest pad removes the spinal load path

**Exclusions.** Shear, flexion tolerance, disc anything — out of scope and out of
competence. This field records *load path*, not *risk*.

**MUST NOT imply:** that `high` is unsafe or that `none` is safe. Safety is the
contraindication tags' job, not this field's.

---

## 3. `fatigueCost: 1 | 2 | 3`

*Conservative **relative programming cost** class.* Deliberately coarse.

| Level | Meaning | Observable criteria |
|---|---|---|
| **1** | Low relative cost | Isolation, one joint, small muscle mass, limited external load potential. |
| **2** | Moderate | Compound with a limited loading ceiling, or supported compounds, or isolation of large muscle groups. |
| **3** | High | Multi-joint, large muscle mass, high external-load potential, and typically ≥2 of {stability 3, axial high, technical 3}. |

**Explicitly NOT:** calories, EPOC, systemic-fatigue scores, recovery debt, or anything
that could be read as physiological measurement. It is an ordinal programming-cost class
and nothing else.

**Boundary examples**
- Cable triceps pushdown → **1**
- Leg press machine → **2** (large mass, high load, but supported and guided)
- Barbell back squat / deadlift → **3**
- Bodyweight squat → **1** — **bodyweight does not automatically mean low**, it means low
  *here* because the load ceiling is the athlete's mass on a large base. Pull-up is **2**.
- Ab crunch machine → **1** — **machine does not automatically mean low**; leg press is a
  machine at **2**.

**May be used for:** future prescription policy, *only* at `CHARACTERIZED` confidence or
better via the §7 gate.
**MUST NOT be used for** (this wave and until separately approved): weekly volume
targets, recovery burden, deload triggers, or adaptation magnitude.

---

## 4. Confidence tiers

| Tier | Meaning |
|---|---|
| `VERIFIED_EVIDENCE` | Checked against a primary external source. **Currently zero records** — no external source establishes these product classifications. |
| `CHARACTERIZED` | Assigned by the named observable criteria above, from catalog mechanics data. Reproducible and auditable. |
| `PRODUCT_POLICY` | A Qimmah decision with no external basis. |
| `ASSUMPTION` | A working value with neither. Must be visible, few, and scheduled. |

**Heuristic judgement is never labelled scientific evidence.** Every record in this wave
is `CHARACTERIZED` at best; none claims `VERIFIED_EVIDENCE`.

---

## 5. Internal consistency invariants (§5)

Relationship checks, not fixed scientific truths. Violations must be recorded as explicit
exceptions, never silently allowed.

| ID | Invariant |
|---|---|
| `INV-1` | A machine-guided variant may not have **higher** `stabilityDemand` than its free-weight counterpart in the same `substitutionGroup`. |
| `INV-2` | A chest-supported / seated-supported variant may not have **higher** `axialLoad` than an unsupported variant of the same pattern. |
| `INV-3` | An isolation exercise may not have **higher** `fatigueCost` than a compound in the same `primaryMuscleCoarse`. |
| `INV-4` | Bodyweight does not imply `fatigueCost = 1` — the set of bodyweight exercises must not be uniformly 1. |
| `INV-5` | `loadMedium = 'machine'` does not imply `fatigueCost = 1` — machines must not be uniformly 1. |
| `INV-6` | `axialLoad = 'high'` requires `stabilityDemand >= 2` — an axially loaded movement cannot be fully machine-stabilised. |
| `INV-7` | `fatigueCost = 3` requires `mechanics = 'compound'`. |

Exceptions are recorded per record in `exceptions[]` with a reason, and the proof asserts
that every violation is a *declared* exception.
