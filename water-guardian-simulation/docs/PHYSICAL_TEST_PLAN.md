# Water Guardian — Physical Validation Plan (Phase 7)

**Purpose.** The digital test bench proves the *logic*. It cannot prove that a clamp-on transit-time meter reads a DN25 PPR pipe at 0.5 L/min. This procedure produces that evidence, with an independent reference, before the competition prototype is declared working.

**Tag:** everything below is a **PROCEDURE**; the pass targets are **OUR screening targets**, not a standard, certification, or existing result.

## 0. Preconditions (before the first drop of water)

| # | Item | Why |
|---|---|---|
| 0.1 | Meter set to **M63 = 1 (Modbus RTU)**, M46 = 1, M62 = 9600 N81. | Default is Modbus ASCII; the ESP32 will see silence. |
| 0.2 | Pipe parameters entered: **measured** OD (calliper, 3 places), wall thickness (from PN class or cut sample), material = "other" + PP-R sound speed for PPR (value to be obtained from a materials table — NOT in the TUF manual), liner none, fluid water. | 1 mm wall error → confidently wrong readings (field reports). |
| 0.3 | Transducer type = TS-2 (or the S1 entry the vendor prescribes), method **V**, spacing from M25, marked on pipe with a template. | M91 ratio must land 97–103 %. |
| 0.4 | Pipe surface sanded smooth, wiped dry, couplant applied without gaps; transducers on the **side** of a horizontal run; ≥10 D straight upstream, ≥5 D downstream. | Manual §5. |
| 0.5 | Pipe **completely full**, air bled at the high point; outlet arranged above the transducer level. | Bubbles = "K"/low Q; a half-full pipe reads garbage or zero. |
| 0.6 | **Zero calibration:** both valves shut, water still ≥ 2 min, run M42, confirm M00 reads 0.000, then **M26 save**. | Zero is lost at power-cycle unless solidified (manual p.30–31). |
| 0.7 | ESP32 logging every 1 s to serial/CSV: flow (reg 1–2), velocity, Q (reg 92 low byte), strength up/down (93/94), ratio (97–98), error bits (72), working step. | The record is the deliverable. |
| 0.8 | Reference: 2 L jug + 5 kg / 1 g scale + stopwatch. 1 g ≈ 1 mL. Tare the jug wet. | Gravimetric collection is the independent primary reference. |

Record once per session: pipe material, OD/wall/ID, date, ambient temperature, water temperature, couplant type, meter firmware version, transducer serial, M25 spacing, M91 ratio at rest.

## 1. Flow ladder — detection and accuracy

Rungs: **0 · ~0.25 · ~0.5 · ~1 · ~2 · ~5 L/min**. Set each rung with the outlet valve; hold ≥ 3 min before measuring (M40 damping default 10 s, plus our 30 s average).

For each rung, **three timed collections** (≥ 60 s or ≥ 1 L, whichever comes first at that rate — at 0.25 L/min collect 4 min for 1 L). Record:

| Field | Source |
|---|---|
| Collected mass (g) → volume (L) | scale |
| Collection time (s) | stopwatch |
| Reference flow (L/min) | volume / time × 60 |
| Meter mean flow over the same window (L/min) | ESP32 log |
| Error (%) and absolute (L/min) | calculated |
| Q, strength up/down, ratio, working step (min/mean over window) | ESP32 log |
| Detection success (meter mean ≥ 60 % of reference AND all samples valid) | calculated |
| Observations (bubbles seen, pipe vibration, tap noise) | notes |

**Repeat the whole ladder for 5 independent mountings** (remove transducers, wipe, re-couple, re-clamp, re-check M91). This separates "the meter works" from "this one mounting happened to work". Do this on **PPR 25 mm first**, then PPR 32 mm, then (if time) 1" galvanized steel.

Then the **rung 0 zero-stability test**: valves shut, log 30 min. Record mean and peak-to-peak of the meter reading. This number, converted through Q = v·A, is the noise floor that sets the minimum honest threshold.

## 2. Detection-rate trial (the 19/20 target)

Choose the **declared operating threshold** from section 1 (expected: the lowest rung that all 5 mountings read within ±25 % with Q ≥ 60 — likely 1 L/min on DN25 PPR, but let the data decide). Then:

- 20 trials: open the valve to ~1.5× threshold for `persistenceMinQuiet` + 2 min in QUIET mode. Count UNEXPECTED_FLOW incidents. **Target ≥ 19/20.**
- Each trial ends by closing the valve; confirm RESOLVED within `resolveMin` + 1 min. Count resolutions.

## 3. False-incident trial (the ≤ 1/40 target)

40 mixed trials in QUIET mode, each ≥ `persistenceMinQuiet` + 2 min long, with no persistent flow:

| Type | Count | What happens |
|---|---|---|
| No flow, undisturbed | 10 | nothing |
| Short legitimate use | 10 | open valve 30–90 s then close |
| Disturbance | 10 | tap the pipe, lean on it, run a nearby drill, bump the clamps |
| Aeration / partial fill | 5 | inject air / drain to half-full for 1 min then refill and bleed |
| Comm faults | 5 | unplug RS485 30 s; power-cycle the ESP32 |

Count: false UNEXPECTED_FLOW incidents (**target ≤ 1/40**), and separately count SENSOR_UNKNOWN episodes (these are *correct* behaviour, not false incidents). Any sample where the meter reported a *valid* zero while the valve was open is a **critical finding**.

## 4. Field-relevant extras (if a real mosque pipe is available)

- Repeat section 1 rungs 0.5/1/2 on the actual pipe (branch to ablution area preferred over the main riser — velocity is 3–10× higher on the branch).
- Log 24 h of normal operation with the schedule active; count REVIEW/UNEXPECTED events and check each against what the caretaker reports.

## 5. Abandon / pivot criteria (decided in advance)

Recommend **abandoning clamp-on sensing for this pipe class** if, after 5 mountings and correct setup (M91 in range, Q ≥ 60):

1. The zero-flow noise floor (section 1, rung 0) exceeds **2 L/min** on DN25 PPR, **or**
2. Fewer than **15/20** detections at **2 L/min**, **or**
3. More than **4/40** false incidents with mitigations (zero-cal, 30 s averaging, threshold ≥ 1 L/min) applied, **or**
4. Q cannot be brought above 60 on PPR at all (no coupling achievable).

If 1–3 fail only at 0.25–0.5 L/min but pass at 1–2 L/min: **GO with the threshold declared at that level** and say so on the poster. That is still a credible "persistent unexpected flow" product; it simply cannot claim to see drips.

## 6. Data sheet template

A CSV template is provided at `tests/results/physical_test_template.csv`. One row per collection.
