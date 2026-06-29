# Qimmah Decisions Log

## RESUME — Agent 1 Training — 2026-06-29
- done: implemented all training-engine requirements (advanced split override, session-duration
  exercise count, experience volume, onoff/returning conservative start, equipment filter incl.
  small-gym basic cable, injury filtering with safe alternatives, English-first exercise names,
  beginner marketplace gate). build + lint + typecheck all green. QA harness (7 scenarios) all pass.
- in_progress: none — committing.
- next: commit + push feature/phase1-training-engine; write final report.
- branch_state: feature/phase1-training-engine (local, based on integration), dirty → committing now.

---

## Agent 1 — Training Engine consumes OnboardingProfile

### D1. Advanced split override is honored when "schedulable"
- `trainingPreferences.splitMode='advanced'` + `advancedSplit` overrides the auto split.
- "Valid" = the chosen split's distinct day-cycle fits the chosen `daysPerWeek`
  (full_body≥1, upper_lower≥2, push_pull_legs≥3, arnold≥3, bro_split≥4). If the
  user picks more days than the cycle, the cycle repeats (e.g. PPL over 6 days = PPL×2).
- If not schedulable for the chosen days, we fall back to the auto split (never crash, never empty).
- The 2×/week-per-muscle rule governs the **auto** engine. An explicit advanced choice is
  the user's tradeoff: if it trains legs <2×/week (e.g. `bro_split` 5-day = 1× each) we
  **honor it** but emit a non-blocking warning. We do not silently override an explicit choice.

### D2. arnold / bro_split are approximated on the existing day-type engine
- The slot engine has day types: full / upper / lower / push / pull / arms / core.
- `arnold` → cycle [upper (chest+back), arms (shoulders+arms), lower (legs)].
- `bro_split` → cycle [push (chest+tri), pull (back+bi), arms (shoulders+arms), lower (legs)].
- These are faithful approximations, not exact bodybuilding canon (see ASSUMPTIONS).

### D3. session_minutes controls exercise count (volume), experience controls the base
- Base count from experience (beginner/novice 5, intermediate/advanced 6).
- Duration delta: ≤30→−2, ≤45→−1, ≤60→0, ≤75→+1, ≥76→+2. Clamped to [3,9].
- Guarantees 30-min sessions have fewer exercises than 75+-min sessions at any experience.

### D4. consistency returning/on_and_off start conservative
- `returning` or `on_and_off` (or goalType `returning`) → first-week deload
  (one fewer set per exercise, floor of 2) + a "ramp up gradually" warning.
- `consistent` (and unset) → normal starting volume.

### D5. limitations.injuries filter exercise selection with safe alternatives
- Detected from canonical onboarding ids and Arabic labels: knee / shoulder / back(lower_back).
- knee → exclude heavy axial/again-loaded squats & deep lunges & leg-extension & wall-sit;
  KEEP machine leg-press, goblet & bodyweight squat, all hinge ham/glute work (safe quad/leg path).
- shoulder → exclude barbell overhead press, push press, upright row, arnold press;
  KEEP dumbbell/machine shoulder press, lateral raises, face pull.
- back → exclude deadlift variants, good morning, barbell/T-bar row, RDL variants;
  KEEP machine/cable/dumbbell rows, lat pulldown, hip thrust / glute bridge.
- If exclusion empties a slot, the day simply gets fewer exercises (documented fallback),
  never an impossible/unsafe pick. A non-blocking note is shown. No medical advice is given.

### D6. Exercise display = English first, Arabic second; target muscle in Arabic
- `exerciseDisplayName` (Arabic UI) now renders `"English — العربية"`.
- Muscle chips/labels remain Arabic (target muscle in Arabic) as before.

### D7. Equipment filter: small gym keeps basic cable
- `small` gym now allows free weights + machines + basic cable (bans only specialty: smith, rope),
  matching "small gym prefers dumbbells/machines/basic cable". bodyweight/home/commercial unchanged.

### D8. No template marketplace in the real onboarding for beginners
- The runtime onboarding (`PlanBuilder`) has no template marketplace at all — the plan is
  generated from answers. The legacy editor's "choose another template" is gated to non-beginners.
