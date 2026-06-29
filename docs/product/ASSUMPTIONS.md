# Qimmah Assumptions Log

## Agent 4 — Workout Runtime / History / Adherence (2026-06-29)

- **Plan days == onboarding days_per_week.** `generatePlan` builds exactly
  `clamp(trainingDays, 1, 7)` plan days and `trainingDays` comes from onboarding
  `daysPerWeek`. We therefore use `customization.workoutPlan.days.length` as the
  weekly adherence target everywhere, treating it as equivalent to the
  onboarding value. If a future change makes the plan emit a different number of
  days than the onboarding preference, the adherence target must be re-sourced
  from onboarding directly.
- **`todayPlanDay` rotates plan days by weekday modulo plan length** — there are
  no explicit rest days in the runtime mapping in Phase 1, so "today's workout"
  always resolves to one of the generated days. Both Today and the Workout tab
  use this same function, so they always agree.
- **Empty workout ("تمرين فارغ") is a degenerate flow.** Workout mode is
  plan-driven and has no in-session "add exercise" UI, so an empty workout has
  nothing to log. We keep the entry point but render a safe empty state instead
  of building an add-exercise flow (out of scope / would be a redesign).
- **Skipped exercises should not count as completed.** We assume an exercise
  with no completed set and no completion flag was intentionally skipped, so it
  should not advance its history record. Exercises performed without weight
  (e.g. bodyweight) still record because their sets are marked completed.
- **Guest mode is the primary runtime.** All history persists in `localStorage`
  via `historyStore`; cloud sync (Supabase) is an optional backup layer that
  already includes workout sessions, exercise history, measurements, and daily
  logs. Refresh persistence relies solely on `localStorage`.
