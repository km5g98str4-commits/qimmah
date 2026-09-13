# Tank Guardian — One-Day Feasibility Gate (physical protocol)

**Rule:** PASS only from recorded physical data (`tests/gate/analyze_gate.py` on the logged CSV). Simulation and datasheets inform the design; they cannot pass the gate. Pass criteria are **our own screening targets, declared here before the test**.

## 0. Shopping list (all local, same day; ESP32 owned)

| Item | Why | SAR (band) |
|---|---|---|
| YF-S201 (½") or YF-B5 (¾" brass) turbine | overflow volume, ≥ 1 L/min | 20–60 |
| **YF-S401** (¼", 0.3–6 L/min) | low-flow overflow variant — the dribble candidate | 25–45 |
| XKC-Y25-V non-contact liquid sensor | "water present in overflow pipe" (dribble presence) | 25–35 |
| Tipping-bucket rain-gauge module (reed) | dribble *quantification* fallback (≈ 2–5 mL/tip) | 30–60 |
| JSN-SR04T waterproof ultrasonic | level (note 20–25 cm blind zone) | 25–35 |
| HC-SR04 (bare) + 40–50 mm PVC stilling tube | 2nd level sensor, ±3 mm, 2 cm blind zone | 10 + 10 |
| 20–60 L transparent container (or a real 250 L roof tank if accessible) | tank | 40–85 |
| ½" float valve + fittings, hose from a raised bucket/tap | inlet + overflow spigot | 30–50 |
| 1 L jug + 5 kg/1 g scale + stopwatch | independent reference | 30–60 |
| **Total** | | **≈ SAR 250–450** |

## 1. Rig

Container on a table; float valve at the top fed from a raised bucket or a tap; an overflow spigot 2 cm above the float's shut-off level leading to a short ½" pipe into a jug on the scale; turbine (and later YF-S401 / tipping bucket) inline on that overflow pipe; XKC-Y25 clamped on the pipe. Level sensors through the lid: JSN-SR04T pointing at the surface (≥ 25 cm above it), HC-SR04 inside a stilling tube whose bottom is 5 cm below the lowest test level. Tank outlet tap at the bottom into a second jug (for DRAIN trials). Measure and record the internal free-surface area (cm²).

## 2. Trials (log everything; mark 'a' start, 'b' end in the serial monitor)

**A. Overflow ladder — 20 trials minimum**
Set overflow rate by raising the feed bucket / cracking the inlet: **dribble ≈ 0.1 and 0.3 L/min (5 trials each), 1, 3, 8 L/min (≈ 3–4 trials each)**. Each trial ≥ 60 s or ≥ 1 L. Weigh the jug (1 g = 1 mL). Repeat 3 of the trials after removing and re-fitting the sensors.
**B. STILL windows — 20 × 10 min** with no flow (some with the lid open, one with someone bumping the table, one with a fan on the surface).
**C. DRAIN ladder — level slope**: open the outlet at ≈ 0.5, 1, 2, 5 L/min (≥ 3 trials each, 10 min each, jug + scale as reference). Also 2 trials at 1 L/min lasting 15 min.
**D. REFILL windows — 5 ×**: let the float refill the tank while logging (tests masking sign).
**E. Combined**: 1 L/min drain *while* a 0.3 L/min overflow dribble runs (does one signal corrupt the other?).

## 3. Grading (`python3 tests/gate/analyze_gate.py --log gate.csv --trials trials.csv --tank-area-cm2 <A>`)

| | PASS | PARTIAL | FAIL |
|---|---|---|---|
| OVERFLOW | ≥ 19/20 detected incl. every dribble on the **turbine**; median volume error ≤ 15 % (≥ 1 L/min); 0 STILL false detections | ≥ 19/20 detected but dribbles only by presence sensor / tipping bucket; or error 15–30 % | any dribble missed by all sensors; any STILL false detection; error > 30 % |
| LEVEL SLOPE | 1 L/min within ±25 % in 10 min in ≥ 95 % of DRAIN trials; STILL 10-min apparent flow < 0.3 L/min in ≥ 19/20; REFILL slopes negative | needs 15 min or the stilling tube / 2nd sensor | STILL noise ≥ 0.5 L/min-equivalent or 1 L/min unresolvable in 15 min |

## 4. What the datasheets predict (desk analysis — informs, does not grade)

- **YF-S201 / YF-B5 are specified 1–30 L/min.** Below ≈ 1 L/min the turbine does not reliably turn. A 0.1–0.3 L/min dribble is *expected to be missed by the turbine* → the turbine alone predicts **PARTIAL at best**. That is why the protocol includes YF-S401 (0.3–6 L/min), the XKC-Y25 presence sensor and the tipping bucket: the likely architecture is *presence sensor for detection + tipping bucket (or S401) for dribble volume + turbine for strong flow*. Note gravity overflow at dribble rates runs as a trickle down the pipe wall, which may not wet the XKC-Y25 sensing spot: mount it at the pipe's low point/elbow.
- **JSN-SR04T:** 20–25 cm blind zone, vendor accuracy ±1 cm class, resolution ≈ 0.5 cm on common units (2–3 mm claimed for the -3.0 variant), echo jitter of several mm on a moving surface (datasheet/vendor pages: makerguides JSN-SR04T-2.0 PDF, shillehtek manual, espboards.dev). YF-S201: 1–30 L/min, 450 pulses/L, "below 1 L/min tends not to register" (BC Robotics); YF-S401: 0.3–6 L/min, 5,880 pulses/L. A 900 cm² test tank makes 1 L = 11 mm, so 1 L/min = 11 mm/min is easily visible; a real 1,000 L roof tank (≈ 1 m²) makes **1 L/min = 1 mm/min** — 10 minutes = 10 mm against ±3–10 mm jitter. Prediction: the small rig will PASS, a real 1 m² tank is **marginal** with JSN-SR04T and likely needs the stilling-tube HC-SR04 (±3 mm) or a submersible pressure sensor, plus 10–15 min windows and a median filter. The gate must therefore include one run on a real-size tank (or scale the criteria: report noise in mm, and compute the achievable L/min resolution for 1 m²).
- Temperature: sound speed changes 0.17 %/°C — 3 mm over 20 cm for a 10 °C change; log `temp_c` and correct in analysis (irrelevant within a 10-min window, relevant across a day).

## 5. Decision after the gate

PASS + PASS → implementation plan (`docs/TANK_GUARDIAN_PLAN.md`). Any PARTIAL → change the sensing element named by the data (S401/tipping bucket for overflow; stilling tube/pressure sensor for level) and repeat the affected trials the same day. FAIL → back to the ranked alternatives, no defence.
