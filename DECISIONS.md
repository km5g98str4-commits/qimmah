# DECISIONS — Phase 2, Agent 5 (Muscle Map + Step Counter)

## RESUME — P2 A5 — 2026-06-29: built + QA PASSED, merging
- Repo cloned at `~/qimmah-p2-a5`; branches `integration/phase2` + `feature/phase2-muscle-steps` off origin.
- All components built; build/lint/typecheck PASS (0 warnings). Committed `18f2d5e`.
- Browser QA PASSED: front+back muscle highlight from logged session; untrained neutral; manual steps save + ring + persist after reload (`qimmah:steps:v1`); editable goal → green "reached" state; no fake health-sync.
- Remaining: push `feature/phase2-muscle-steps`, merge into `integration/phase2`, push, re-verify build.
- If interrupted: `cd ~/qimmah-p2-a5`, `git status`, finish the push+merge sequence.

## Mission
Two additive, low-risk, isolated features:
1. **Weekly Muscle Map** — SVG body (front/back); muscles trained this week highlight, untrained stay neutral. Descriptive, motivational, no judgment.
2. **Step Counter** — manual entry + ring toward a daily goal (default 10,000, editable), per-day localStorage, weekly mini-chart.

## Decisions
- **Placement: `src/views/ProgressView.tsx`** (progress tab — "one level in", keeps beginner home simple per A4).
- **Muscle map data source:** existing `computeWeeklyCoverage` engine, used **read-only** (no engine edits). A muscle counts as "trained this week" when its weekly `sets > 0`; fill intensity scales with `intensity` (0–1).
- **New isolated files only:**
  - `src/lib/stepCounter.ts` (localStorage, modeled on `reminderPrefs.ts`)
  - `src/components/StepCounterCard.tsx`
  - `src/components/WeeklyMuscleMap.tsx`
  - Edit only `ProgressView.tsx` to surface them (required by mission point 3; a view, not an engine).
- **Premium SVG**, NOT the previously-rejected "beige toy" body. Duotone: neutral silhouette + brand-orange heat fill by intensity.
- **No fake health-sync.** Steps are clearly manual; the existing "health sync coming soon" card stays the only sync messaging.
- Arabic text kept inside components (precedent: existing `MuscleMap.tsx` hardcodes Arabic muscle labels).

## Forbidden (respected)
No engine/nutrition/onboarding logic changes · no health-sync claims · no medical advice · no push to main · no deploy · no secrets.
