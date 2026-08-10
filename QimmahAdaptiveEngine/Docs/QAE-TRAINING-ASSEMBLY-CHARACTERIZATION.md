# Legacy Day-Assembly Characterization ([CTO-QAE-012] §1)

**Read from `src/lib/planGenerator.ts`, not inferred.** Every clause cites its source
lines. Nothing here is an assumption; where the legacy behaviour is defective it is named
as such and routed to an approved deviation rather than silently corrected.

Locked against drift by `Tests/training/qae-assembly-characterization-proof.ts`, which
asserts each semantic against the 17 `shippingPlan` goldens. Implementation
(`Domain/Training/assembly.ts`) must satisfy these assertions before any QAE-native
behaviour is introduced.

---

## 1. Per-day target exercise count

`targetExerciseCount(tier, sessionMinutes)` — `planGenerator.ts:100-110`:

```
base  = exercisesPerSession(tier)
delta = -2  if m <= 30
        -1  if m <= 45
         0  if m <= 60
        +1  if m <= 75
        +2  otherwise           (m = sessionMinutes > 0 ? sessionMinutes : 60)
target = clamp(base + delta, 3, 9)
```

**Session-duration relationship:** five discrete bands, not a continuous formula. The
clamp `[3, 9]` binds at both ends. `sessionMinutes <= 0` is treated as 60.

## 2. Full-body minimum

`dayTarget = spec.type === 'full' ? max(target, FULL_BODY_MIN) : target`, with
`FULL_BODY_MIN = 5` (`planGenerator.ts:114`, `:742`). A full-body day never falls below 5
regardless of how short the session is — every major group gets touched.

## 3. Slot order

`SLOTS[type]` in declaration order, iterated once (`planGenerator.ts:483`). Characterized
verbatim into `Domain/Training/requirements.ts` `DAY_SLOTS` in Wave 1. A slot that yields
nothing is **skipped silently** — the day is simply shorter at that point and the fill
stages (§7, §8) may or may not make it up.

Slot matching (`pickForSlot`, `:453-473`):
1. `slot.muscles.includes(ex.primaryMuscle)` — any-of
2. `slot.role === 'any' || exerciseRole(ex) === slot.role`
3. `!used.has(ex.id)`
4. **patterns are soft**: if any candidate matches `slot.patterns`, the list narrows to
   those; if none match, the unnarrowed list survives.

`exerciseRole` is `compound` when `movementPattern ∈ {squat, hinge, push, pull, lunge}`,
else `isolation` (`:116-121`). Maps to QAE `mechanics`.

## 4. A/B variation

- `variation` = per-type occurrence index, 0-based, assigned in day order (`:737-739`).
- `nVar` = total days of that type in the split (`typeTotal`, `:731-732`).
- `dayId = "gen-{dayIndex+1}-{type}"` (`:740`), dayIndex 0-based.

## 5. Round-robin allocation

`buildMuscleRankMap(pool)` (`:424-442`): group the pool by `primaryMuscle`, sort each
group, assign `0,1,2…` within the group. `partitionOrder(sorted, variation, nVar, rank)`
(`:443-451`) puts entries with `rank % nVar === variation` first and the remainder after —
a **preference, not a filter**, so a single-exercise muscle can legitimately repeat across
variations.

Computed **once for the whole pool** before the day loop (`:734`), so the ranks do not
drift as earlier slots consume exercises.

> ⚠️ **Defect L-TRN-2 — locale-dependent ordering.** Both `buildMuscleRankMap` (`:437`)
> and `sortCandidates` (`:414`) order by `a.id.localeCompare(b.id)`. This is the same
> class as the already-registered D1/L-TRN-1: under a different ICU locale the rank map
> and therefore the entire A/B allocation can change. QAE uses ordinal comparison and
> registers the difference as an approved deviation rather than reproducing the defect.

## 6. Candidate ordering

`sortCandidates(cands, preferMachines)` (`:410-416`): when `preferMachines`, machines sort
before non-machines; then by id. `prefersMachines(tier)` is true for `beginner` and
`novice` only (`:186-188`) — so machine-first is an **experience-driven ranking bonus**,
never a filter.

## 7. Used-set and duplicate avoidance

`used` is a `Set<string>` created **per day** (`:481`) and consulted by every stage. It
does not persist across days: the same exercise may appear on different days, which is
characterized behaviour, not a bug. Within a day, duplicates are structurally impossible.

## 8. Fill stages — two, in order, both bounded by `target`

1. **Day-muscle fill** (`:490-505`), unconditional: any unused pool exercise whose
   `primaryMuscle ∈ TYPE_MUSCLES[type]`, partitioned by variation.
2. **Whole-pool fill** (`:511-524`), **only when `fillFromWholePool` is true** — which the
   caller sets to `machinesOnly` (`:745`). Any unused pool exercise at all, partitioned.

**Insufficient-pool behaviour:** if both fills exhaust, the day ends short. No error, no
padding, no duplication.

## 9. Accessory attachment

Only when `machinesOnly` (`:750-755`). Category by day type and variation
(`accessoryCategory`, `:375-387`):

| Day type | Accessory |
|---|---|
| `push` | triceps |
| `pull` | biceps |
| `full`, `lower` | abs |
| `upper`, `arms` | `variation % 2 === 0 ? triceps : biceps` |
| `core` | abs |

`pickAccessory(cat, variation, used, tier)` (`:394-405`) walks `ACCESSORY_POOL[cat]`
starting at `variation % pool.length` and returns the first entry not already used,
filtered by the same cable rule (`cableOk`) so free-cable work cannot leak into a
beginner plan through the accessory door. Returns `null` when nothing is available.

The accessory is **appended after** all fills and is the only element that can carry
`optional: true` — flagged when it is the last element *and* is the accessory id
(`:759-761`).

## 10. Machines-only / machine-dominant

`resolveGymAccess(p)`; `machinesOnly = access === 'full' || access === 'small'`
(`:712-713`). Two entirely different pools (`:714-727`):

- **machines-only**: `primaryMachineIdSet ∩ injuryOk ∩ levelOk` — the approved 32-machine
  list only. No barbell, no dumbbell, no free cable.
- **otherwise**: `equipOk ∩ injuryOk ∩ cableOk ∩ levelOk`, excluding `mobility` patterns
  and the `cardio` muscle.

**Machine-dominant ≠ machine-only.** Machine-dominance is the `preferMachines` sort bonus
(§6) driven by *experience*; machines-only is an *environment* pool restriction. A
beginner at home gets machine-dominant ranking over a pool with no machines in it, which
degrades to ordinary ranking — it never empties the plan.

## 11. Bodyweight-only

Falls into the `otherwise` pool with equipment filtered to bodyweight. No machines exist,
so `preferMachines` is inert; `fillFromWholePool` is **false** (not machinesOnly), so only
the day-muscle fill applies.

## 12. What assembly does NOT do

No sets, reps, load, progression, weekly volume, deload, or cardio. `createGenExercise`
(`:673`) attaches set/rep metadata downstream of assembly and is **out of Wave 2 scope**.
Cardio appending was removed from the legacy engine entirely (`:766-768`).

---

## Assertion inventory

`Tests/training/qae-assembly-characterization-proof.ts` asserts, across all 17 goldens:

| # | Assertion |
|---|---|
| A1 | Every day id matches `gen-{index+1}-{type}` with a known `DayKind` |
| A2 | Exercise `order` is dense, 0-based, ascending |
| A3 | No intra-day duplicate exercise id |
| A4 | Day length ≤ 9 and ≥ 3 unless the pool provably exhausted |
| A5 | Full-body days carry ≥ 5 entries |
| A6 | At most one `optional: true` per day, and only as the final element |
| A7 | `optional` appears only in machines-only scenarios |
| A8 | Same-type days (A/B) are not identical sequences when the pool allows |
| A9 | Every assembled id exists in the catalog |
| A10 | Day count equals the scenario's `daysPerWeek` |
| A11 | Target count follows the §1 duration bands for the scenario's tier |
| A12 | Accessory category matches the §9 table for its day type/variation |
