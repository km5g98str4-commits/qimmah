# Qimmah Decisions Log

## RESUME — Agent 3 Dashboard — 2026-06-29
- done: Dashboard bound to Phase 1 generated system. New `src/lib/dashboardLayout.ts`
  (goal/experience → card priority), rewrote `src/views/DashboardView.tsx`
  (BuiltForYou banner + priority-ordered lead cards + beginner NextAction +
  advanced ProgressSnapshot), wellness gating in
  `buildCustomizationFromOnboarding` (`enabled = mode !== 'none'`).
  build/lint/typecheck all pass.
- in_progress: none — feature complete, committing.
- next: commit + push `feature/phase1-dashboard-progress-binding`, write final report.
- branch_state: feature/phase1-dashboard-progress-binding, dirty (about to commit), not yet pushed.

## Agent 3 — Dashboard / Progress / Wellness Binding (2026-06-29)

1. **Source of truth for layout.** Card priority is derived from the OnboardingProfile
   (`loadOnboardingProfile()`), falling back to the generated `Profile` for migrated
   users. No hardcoded ordering. Logic lives in `src/lib/dashboardLayout.ts`.

2. **Card priority rule** (`buildLeadOrder`):
   - `cut`/`recomp` → nutrition lead (calorie control is the driver).
   - `bulk`/`strength` → workout lead (load/progression is the driver).
   - `beginner`/`novice` → a "Next Action" helper card is inserted in 2nd position.
   - `advanced` → a "Progress Snapshot" card is inserted in 2nd position.
   - `intermediate`/unknown → goal pair only, no inserted card.

3. **"Built for you" communication.** A `BuiltForYou` banner leads the dashboard with
   chips generated from the real plan: goal, days/week, split name, daily calories,
   experience. It makes the generated system feel personal and is data-driven.

4. **Wellness gating moved to the source of truth.** `buildCustomizationFromOnboarding`
   now sets `wellnessPlan.enabled = wellnessTracking.mode !== 'none'`. Mode `none` hides
   the supplement/medication card entirely (no fake cards); `basic`/`detailed` enable it
   with empty lists — an empty tracking shell the user fills in. The existing friendly
   empty state in `Today` is reused (no fabricated supplement/medication data).

5. **Adherence binding unchanged but verified.** Weekly adherence X/Y already reads
   `customization.workoutPlan.days.length` (the generated `daysPerWeek`) in
   `DailySummary`, `ProgressView`, and the new `ProgressSnapshot`. Kept as-is.

6. **Demo isolation preserved.** The `BuiltForYou` banner and priority logic live only in
   `DashboardView` (real flow). `DemoView` renders `DailySummary`/`Today` directly via
   `DemoCustomizationProvider` and is untouched. No demo data leaks into the real flow.

7. **No progress photos** added anywhere (out of scope, and none existed).

8. **Copy is inline Arabic in the view**, consistent with the existing `DailySummary`/
   `Today` sections (which already inline Arabic). Language is fixed `ar`; not bloating
   the bilingual `ShellStrings` interface for view-local strings.
