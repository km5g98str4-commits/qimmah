# Qimmah Assumptions Log

## Agent 3 — Dashboard binding (2026-06-29)

- **Real dashboard always has a completed onboarding.** The route guard in `App.tsx`
  (`guardRoute`) blocks main tabs until onboarding completes, so `DashboardView` can
  assume a generated `customization` (built via `buildCustomizationFromOnboarding`).
- **Goal/experience priority combination.** Goal sets the workout↔nutrition lead pair;
  experience inserts at most one extra lead card (NextAction for beginner/novice,
  ProgressSnapshot for advanced). They compose rather than conflict.
- **Goals outside the four onboarding paths** (`maintenance`/`health`/`returning`, only
  reachable via legacy/migrated profiles) fall back to workout-first (neutral). The four
  Phase-1 onboarding goals all map cleanly.
- **`workoutPlan.days.length` equals the chosen `daysPerWeek`.** The generator produces
  one plan day per training day, so adherence targets read directly from the plan.
- **Intermediate is the implicit default** when experience is unknown — no extra lead
  card, goal pair only.
