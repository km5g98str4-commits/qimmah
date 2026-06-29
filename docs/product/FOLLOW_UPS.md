# Qimmah Follow-ups

## Agent 3 — Dashboard binding (2026-06-29)

- **Reactivity to mid-session plan edits.** `useDashboardSignals` reads the onboarding
  profile once per `profile` change. If a future flow edits the OnboardingProfile without
  re-deriving `customization.profile`, add a storage/event subscription so card priority
  refreshes live.
- **Migrated users + wellness mode.** Wellness `enabled` is bound at onboarding completion
  only. Migrated legacy users keep their stored `wellnessPlan.enabled`. A later pass could
  re-derive `enabled` from `wellnessTracking.mode` for migrated profiles too.
- **Bilingual dashboard copy.** New dashboard strings are inline Arabic (language is fixed
  `ar`). When English is unlocked, move BuiltForYou / NextAction / ProgressSnapshot copy
  into `ShellStrings`.
- **NextAction depth.** The beginner helper currently surfaces one step (today's workout or
  nutrition on rest days). A later phase could chain a short guided checklist for the first
  week.
