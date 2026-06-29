# Qimmah Assumptions Log

## Agent 1 — Training Engine

- A1. Injury input is matched from the onboarding canonical ids (`knee`, `shoulder`,
  `lower_back`) and their Arabic labels (`الركبة`, `الكتف`, `أسفل الظهر`). `wrist`,
  `elbow`, `ankle` are collected by onboarding but have no exercise-selection rule yet
  (see FOLLOW_UPS) — they pass through harmlessly.
- A2. `arnold` and `bro_split` advanced splits are approximated on the existing 7 day-type
  slot engine (no dedicated chest-only / shoulders-only day types exist):
  arnold = upper / arms / lower; bro_split = push / pull / arms / lower. This preserves
  sensible muscle coverage even if it is not the exact classic layout.
- A3. `leg-press` (machine, controlled) is treated as knee-safe and is kept for knee
  injuries as the quad alternative to barbell squats; `leg-extension` is excluded
  (open-chain knee shear). This is a programming heuristic, not medical advice.
- A4. Session-minute → exercise-count deltas assume the 5 onboarding duration options
  (30/45/60/75/90). Any value maps through the same ≤30/≤45/≤60/≤75/≥76 buckets.
- A5. The 2×/week-per-muscle guarantee applies to the auto engine. An explicit advanced
  split is the user's deliberate tradeoff and is honored even if it trains a muscle 1×/week
  (warning emitted).
