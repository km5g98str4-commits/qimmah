# Qimmah Decisions Log

## RESUME — Agent 4 Workout Runtime — 2026-06-29
- done: Audited the full workout runtime → history → adherence pipeline against
  the 11 hard requirements; it was already largely implemented on the
  integration base. Hardened three concrete reliability gaps:
  (1) empty-workout crash guard in `WorkoutMode`,
  (2) old/malformed session normalization at the read boundary in `historyStore.getWorkoutSessions`,
  (3) skipped-exercise pollution guard in `exerciseHistory.recordExercise`.
  Build + lint + typecheck pass.
- in_progress: none (changes complete, committing).
- next: commit + push `claude/phase1-workout-runtime-history-f3e4r9`, write final report.
- branch_state: `claude/phase1-workout-runtime-history-f3e4r9`, based on
  `origin/integration/phase1-smart-foundation`, dirty (about to commit).

---

## Agent 4 — Workout Runtime / History / Adherence (2026-06-29)

### Branch
- Mission requested base `integration/phase1-smart-foundation` and a
  `feature/phase1-workout-runtime-history` branch, but the session's hard git
  rule mandates the branch name `claude/phase1-workout-runtime-history-f3e4r9`.
  **Decision:** build on `origin/integration/phase1-smart-foundation` (the
  Phase 1 onboarding source-of-truth lives there) and push to the mandated
  `claude/...` branch. No merge into integration (integration agent only).

### Canonical history store (no duplicate stores)
- `src/lib/historyStore.ts` is the single source of truth for all logs
  (`qimmah:history:*:v1`). `workoutSessions.ts` and `exerciseHistory.ts` are
  thin wrappers that read/write through it — the legacy keys
  (`qimmah:workoutSessions:v1`, `qimmah:exerciseHistory:v1`) are kept only for
  one-time migration and are never written to. No second session store exists.

### Same generated source for Today + Workout tab
- Both `DashboardView`/`Today` and `WorkoutView` read the workout from
  `customization.workoutPlan` via `todayPlanDay()`. The plan itself is produced
  by `buildCustomizationFromOnboarding()` → `generatePlan()` on onboarding
  completion (see `PlanBuilder.finishRef`). No demo/seeded data in the real
  flow (demo data is isolated to `DemoCustomizationProvider`).

### Weekly adherence target = generated plan days = onboarding days_per_week
- All consumers (`Today`, `DailySummary`, `WorkoutView`, `ProgressView`,
  `TodayWorkoutHero`) pass `customization.workoutPlan.days.length || 3` as
  `daysPerWeek`. The generated plan's `days.length === clamp(trainingDays,1,7)`
  and `trainingDays` is sourced from onboarding `daysPerWeek`
  (`toLegacyProfile`), so "generated plan days" and "onboarding days_per_week"
  are the same number by construction. `addCutCardio` adds cardio **into**
  existing days, never extra days, so a cut goal does not inflate the target.
- `weeklyAdherenceStreak` (in `streaks.ts`) counts **unique** completed workout
  days per week (a `Set` keyed by date) and does **not** break the streak on an
  incomplete current week (it starts counting from the previous week when the
  current week hasn't met the target yet). Kept as-is — already correct.

### Hardening fixes applied this session
1. **Empty-workout guard** (`WorkoutMode.tsx`): the "ابدأ تمرين فارغ" button
   could launch workout mode with zero exercises, which dereferenced
   `day.exercises[0]` and crashed. Added a safe empty state (close button) after
   all hooks. No redesign of workout mode — purely a crash guard.
2. **Session normalization on read** (`historyStore.getWorkoutSessions`): old
   or corrupt sessions (missing `exercises`, malformed `sets`) could crash every
   downstream reader (`RecentWorkout`, `progressStats`, `exerciseStats`,
   `muscleCoverage`, `trainingInsights`, `streaks`). Normalizing at the single
   read chokepoint guarantees a valid `exercises` array and safe set shape for
   all consumers, while preserving legacy compat fields (`weight`, `repsDone`).
3. **Skipped-exercise guard** (`exerciseHistory.recordExercise`): a fully
   skipped exercise (no completed set, not marked complete) no longer bumps
   `totalSessions`/`lastCompletedAt` or pollutes PR data, keeping "last
   completed" accurate. PR detection already required completed sets, so this
   is consistent.

### Pain notes
- Pain/injury notes in `WorkoutMode` remain **tracking-only** free-text inputs.
  No medical advice or interpretation is rendered around them.
