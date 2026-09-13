# Tank Guardian — Feasibility Gate Report (status: gate NOT YET RUN)

Date 2026-09-13. Scope: the one-day physical gate on the two carrying assumptions, competition verification, and a focused prior-art search. Nothing beyond the gate kit was built; the rule engine, SENSOR_UNKNOWN discipline, offline buffering, simulator, Telegram path and scenario campaign are untouched.

## Gate result block

```
OVERFLOW_SENSING                  = NOT RUN → cannot be PASS (no physical measurement exists yet); desk prediction: PARTIAL with a turbine alone, PASS-capable with turbine + presence sensor + tipping bucket/YF-S401
LEVEL_SLOPE                       = NOT RUN → cannot be PASS; desk prediction: PASS on a small (≤ 0.1 m²) rig, MARGINAL on a real 1 m² roof tank with JSN-SR04T, PASS-capable with a stilling-tube HC-SR04 or pressure sensor and 10–15 min windows
COMPETITION_REQUIREMENTS_VERIFIED = NO (mewa.gov.sa is hard-blocked by this session's egress proxy; snippet-level facts only)
PRIOR_ART_RISK                    = MEDIUM
TANK_GUARDIAN_GO                  = MODIFY-PENDING-GATE (not YES: the gate has no data; not NO: nothing found kills it) — run the kit below, then decide
```

**Why NOT RUN rather than PASS/PARTIAL/FAIL:** this session runs in a cloud container with no tank, water, sensors or ESP32 attached. Per your rule, PASS requires recorded physical trials with quantified error; I cannot produce those. Anything I marked PASS today would be simulation dressed as evidence.

## What was delivered so the gate takes hours, not days

| Item | Path |
|---|---|
| Gate logger firmware (ESP32, 1 Hz CSV: turbine pulses, XKC-Y25 presence, tipping-bucket tips, JSN-SR04T raw + median, optional 2nd level sensor, temperature, serial markers) | `firmware/gate_tank/gate_tank.ino` |
| Analysis script that grades PASS/PARTIAL/FAIL from the CSV + a hand-filled trials file (refuses to grade without a log; self-tested on synthetic data only to check it runs — that output is **not** evidence) | `tests/gate/analyze_gate.py`, `tests/gate/trials_template.csv` |
| Bench protocol with pre-declared pass criteria, shopping list, rig, 20/20/20 trial ladders and the modification path for PARTIAL | `docs/TANK_GATE_PROTOCOL.md` |
| Prior-art notes (combined concept) | `research/notes/prior_art_tank_guardian.md` |

## Desk evidence (datasheet-level; informs the kit, does not pass the gate)

| Assumption | Published figure | Implication |
|---|---|---|
| Turbine catches dribbles | YF-S201/YF-B5 specified 1–30 L/min, "below 1 L/min tends not to register" (BC Robotics); YF-S401 0.3–6 L/min, 5,880 pulses/L | A 0.1–0.3 L/min float weep will **not** be counted by a YF-S201. The overflow architecture must be: XKC-Y25 presence sensor at the pipe's low point for *detection* + tipping bucket (≈ 2–5 mL/tip) or YF-S401 for dribble *volume* + turbine for strong flow. The gate protocol tests all three side by side. |
| Level slope resolves 1 L/min | JSN-SR04T: 20–25 cm blind zone, ±1 cm class, ≈ 0.5 cm resolution on common units (makerguides datasheet, shillehtek, espboards.dev); HC-SR04 ±3 mm, 2 cm blind zone | On a 900 cm² rig 1 L/min = 11 mm/min: trivial. On a 1 m² roof tank 1 L/min = **1 mm/min**, 10 min = 10 mm against ±5–10 mm jitter: marginal with JSN-SR04T. The gate must include one real-size tank (or report noise in mm and derive the achievable L/min at 1 m²); expect to need a stilling tube, median filter and 10–15 min windows. A pressure-type level sensor is the fallback. |
| Ultrasound temperature drift | 0.17 %/°C ≈ 3 mm over 20 cm per 10 °C | Log temperature; irrelevant within a 10-min window. |

## Competition verification — what is confirmed vs NOT FOUND

Direct fetch of every mewa.gov.sa URL (EN/AR overview, WaterTopic, Application) and the archive.org copy returned "EGRESS_BLOCKED" from this container. Therefore:

**Confirmed only at search-snippet level (re-open in a browser before any slide):** name «تحدي الابتكار الجامعي» / University Innovation Challenge, MEWA Agency for Research & Innovation; sectors "Environment (vegetation cover and afforestation), Water (water scarcity), Agriculture (food waste)" with elements "desertification, water loss and grey water management, RPW control value chain"; team "1 faculty member and 4–5 students"; entries are "early-stage ideas on the Challenge's platform" leading to pilot projects; 2nd edition announced 23 Apr 2026 with Makkah RDA and Ain Al-Aziziah (press).

**NOT FOUND from any source:** deadline, phases, evaluation criteria/weights, prototype requirement, AI requirement, submission format, prize/pilot funding, previous winners, teams per university, nationality rules.

**Checklist for you (10 minutes in a normal browser):** open the EN and AR overview pages, WaterTopic, AgricultureTopic, EnvironmentTopic and Application pages; screenshot each; record the platform URL, dates, criteria, edition wording; open https://seu.edu.sa/ar/studentsadvertisements/80502025-1/ for university-side rules; save copies into `research/notes/competition_official/`.

## Prior art (combined concept) — MEDIUM

No product, patent or paper found that combines (a) overflow-pipe metering, (b) level-slope consumption inference, (c) automatic inlet shut-off with a litres/SAR message. Closest: **CN2549401Y** (overflow presence → close inlet, no metering); **AlGhamdi & Sharma 2022** (Saudi, level-based leak detection with ML, motor control, no valve/overflow); **MDPI Water 14:309** (level leak flag, pump control); **Flo/LeakSmart/AquaTrip** (mains flow + valve + $ alerts, no tank); ESP32 tank monitors on GitHub. Overflow-pipe *flow metering* as the float-health signal was not found anywhere; level-rate leak detection is established (tank-leak patents, both 2022 papers); refill masking will be seen as routine. Indian "level controllers with overflow cutoff" are pump controllers, not inlet-valve devices, and do not apply to mains-fed float tanks.

**Claim to make:** "the first retrofit that *meters* the overflow pipe as a float-valve health and loss counter and fuses it with refill-masked level-slope consumption into one litres/SAR figure with automatic inlet shut-off, for Gulf tank-fed buildings." **Claims not to make:** "overflow shut-off" or "level-based leak detection" as inventions.

## Actual prototype cost (gate kit, ESP32 owned)

SAR ≈ 250–450 depending on container and whether both YF-S201 and YF-S401 are bought (itemised in the protocol §0).

## Next action

1. Buy the §0 list locally today; build the rig (§1); flash `gate_tank.ino`; run trial sets A–E (≈ 4–5 h including 20 × 10-min STILL windows — run STILL windows overnight if needed); fill `trials.csv`; run `analyze_gate.py`.
2. If OVERFLOW = PARTIAL (turbine misses dribbles, presence/tipping bucket catch them): adopt the three-element overflow design and re-run only the dribble trials.
3. If LEVEL_SLOPE = PARTIAL on the real tank: fit the stilling-tube HC-SR04 (or pressure sensor), re-run DRAIN + STILL at 15-min windows.
4. Both PASS → I produce `docs/TANK_GUARDIAN_PLAN.md` immediately (authorised). Any FAIL → return to `TOP_3_IDEAS.md` ranking.
