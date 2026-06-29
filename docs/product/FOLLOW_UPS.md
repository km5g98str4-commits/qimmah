# Qimmah Follow-ups

## Agent 4 — Workout Runtime / History / Adherence (2026-06-29)

- **Empty-workout UX:** decide product-side whether "ابدأ تمرين فارغ" should
  build an in-session "add exercise" flow or be removed for Phase 1. Currently
  it renders a safe empty state and returns to Today (no crash, but no logging).
- **Rest days:** `todayPlanDay` maps every weekday to a training day (modulo
  plan length). A future enhancement could honor the weekly schedule's actual
  rest days so "today" can legitimately be a rest day with no prompted workout.
- **Adherence target source:** today the weekly target is read from the
  generated plan's day count. If onboarding `daysPerWeek` and generated plan
  days ever diverge, re-source the target from `OnboardingProfile` directly.
- **No automated tests:** the repo has no test runner configured. Consider
  adding unit tests for `recordExercise`, `weeklyAdherenceStreak`, and the new
  session normalization to lock in the history/adherence invariants.
- **Bundle size:** the production bundle is ~890 kB (pre-existing warning).
  Code-splitting is a later-phase optimization, untouched here.
