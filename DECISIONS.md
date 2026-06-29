# DECISIONS — Phase 2, Agent 5 (Muscle Map + Step Counter)

## RESUME — P2 A5 — 2026-06-29: setup done, building components
- Repo cloned at `~/qimmah-p2-a5`; branches `integration/phase2` + `feature/phase2-muscle-steps` created off origin.
- Baseline `npm install && build && lint && typecheck` all PASS.
- Plan locked (see Decisions). Building: stepCounter.ts → StepCounterCard → WeeklyMuscleMap → wire into ProgressView → QA → merge.
- If interrupted: re-`cd ~/qimmah-p2-a5`, `git status`, continue from first unbuilt file in the list above.

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
