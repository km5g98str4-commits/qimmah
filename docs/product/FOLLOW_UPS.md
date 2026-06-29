# Qimmah Follow-ups

## Agent 1 — Training Engine (deferred, out of this scope)

- F1. Wrist / elbow / ankle injuries are captured in onboarding but have no exercise
  filtering rule yet. Add curated risky-id sets (e.g. wrist → straight-bar curls/pressing
  grip alternatives; ankle → high-impact/jumping; elbow → heavy direct arm work) similar to
  knee/shoulder/back.
- F2. Injury handling is exclusion-only. A future step could substitute an explicit safer
  *alternative* per excluded exercise (the data model already has `Exercise.alternatives`)
  so the day keeps its exact slot count instead of just dropping the risky pick.
- F3. Advanced `arnold` / `bro_split` would benefit from dedicated day types
  (chest-only, shoulders-only, back-only) for exact classic layouts.
- F4. Session-duration could also tune set count / rest, not only exercise count, for a
  tighter time fit at 30 vs 90 minutes.
- F5. The legacy `CustomizationCenter` template marketplace (`StepWorkoutTemplate`) is the
  advanced editor; only the `StepGeneratePlan` "choose another template" entry is gated for
  beginners. Revisit whether the whole advanced template step should be hidden for beginners.
