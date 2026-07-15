# Strength System — plate math, e1RM, PRs, warm-up

Lifter-grade strength tooling for Qimmah. Pure logic lives in `src/lib/strength/**`;
UI additions are on the Active Workout dark surface + the Progress «تطوّر القوة» detail.
The WorkoutMode persistence/timer logic is untouched (read-only). Run the proof with:

```bash
node scripts/run-strength-proof.mjs      # 30 checks — see §Tests
```

## 1. Plate calculator (`plates.ts`)
- KSA standard set `KSA_PLATES_KG = [25,20,15,10,5,2.5,1.25]`; bars 20 (default) / 15.
- Config is **owner-scoped**: `qimmah:plates:v1:<uid>` (`loadPlateConfig`/`savePlateConfig`),
  editable per user (plate weights + pair counts), hostile-input validated.
- `computeLoadout(target, config)` returns the **per-side** loadout. Math is done in
  integer quarter-kg (no float drift) via a bounded knapsack over available pairs, so the
  result is exact and every achievable weight is enumerable.
- **Unreachable targets** → the nearest achievable weight (ties → lower) with a `±`
  suggestion (`{downKg, upKg}`). E.g. `61 kg / 20 kg bar` → 60 kg (−1), suggest ↓60 / ↑62.5.
- **UI:** one tap on the plate icon in the weight stepper opens a dark-surface visual plate
  stack (tabular numerals) for the current set's weight.

## 2. e1RM engine (`e1rm.ts`)
Formula choice by rep range (documented):
- **Brzycki** `w·36/(37−reps)` for **reps ≤ 10** — more accurate low-rep, undefined ≥37 reps.
- **Epley** `w·(1+reps/30)` for **reps > 10** — stable at higher reps.
- reps = 1 → the weight itself. Result rounded to 0.5 kg; invalid input → `NaN`.

`e1rmSeries(exerciseId)` derives a **dated** e1RM series from the REAL finished sessions
(`historyStore.getWorkoutSessions`), best e1RM per session. `velocityKgPerWeek` = slope of
first→last e1RM over the week span — **always hedged «تقديري»**, `null` when < 2 points.

## 3. Unified PR detection (`prs.ts`)
Single source of truth for **1RM / 3RM / 5RM** (heaviest weight at ≥N reps) **and e1RM** PRs,
derived from real sessions.
- **Definition (no false PRs):** a PR is a *strict* beat of a **previously established**
  best. The first session for a lift/rep-range establishes the baseline **silently**, so a
  first workout or a **deload** never produces a false PR (proved).
- **Dedupe / extend, not duplicate:** `toPRCelebrations()` maps PRs into the existing
  achievements sink `registerWorkoutPRs()` (increments `prCount`, enqueues the global
  toaster). WorkoutV2 uses this single path — no parallel PR counter.
- **PR moment:** green, `role="status"`, uses `v2-earned-moment` which collapses under
  `prefers-reduced-motion` (reduced-motion-safe) — on the dark complete screen.

## 4. PR history (Progress → تطوّر القوة)
Per-lift ladder (existing) + **e1RM sparkline** (static SVG) + estimated 1RM «تقديري», and a
**dated PR log** (`prHistory`) merged across lifts, newest first. Honest labels per PDF §05.

## 5. Warm-up generator (`warmup.ts`)
From the working weight: **bar×10 → 40%×8 → 60%×5 → 80%×3 → work**. Each weight is rounded to
the nearest **achievable** plate load (`computeLoadout`); steps that equal the bar, repeat, or
reach the work weight are dropped. Shown before the first working set on the dark surface,
**dismissible**, and the "don't show" preference is **owner-scoped** (`qimmah:warmup-pref:v1:<uid>`).

## Tests (`scripts/strength-proof.ts` — 30 checks)
- **Plate math:** exact loadouts; odd target (61) → nearest 60 + suggestion; limited plates →
  capped max; 15 kg bar.
- **e1RM:** Epley/Brzycki vs hand values; formula switch at 10 reps; invalid → NaN.
- **PRs:** first session silent; 105>100 → PR incl. e1RM; **deload 90 → no false PR**; dated log; series; velocity.
- **Warm-up:** bar first, work last, all achievable, strictly ascending; ≤bar → none; owner pref.
- **Isolation:** two users' plate configs don't leak; guest independent.

## Storage keys added (all owner-scoped, local-only)
`qimmah:plates:v1:<uid>` · `qimmah:warmup-pref:v1:<uid>`. No sync/auth/schema changes.
