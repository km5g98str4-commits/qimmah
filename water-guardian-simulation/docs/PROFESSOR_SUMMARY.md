# Water Guardian — Summary for the Supervising Professor

*A retrofit monitor that tells a mosque caretaker when water keeps running during quiet hours.* · 2026-09-12 · 3 pages

---

## PROBLEM

Mosques (and schools, offices) lose water through taps left open, failed float valves and small leaks that run for hours when nobody is there. Existing pipes cannot be cut to insert a meter, and a simple "leak detector" claim is not honest: one meter on a pipe cannot say *which* tap is the cause.

## ↓ SOLUTION

**Water Guardian** clamps an ultrasonic flow meter on the *outside* of an existing pipe, reads it with a small ESP32 computer, and applies simple, transparent rules: if water keeps flowing above a threshold for, say, 10 minutes during a quiet period, it sends the caretaker a phone message describing **persistent unexpected water use** — never "leak". After the caretaker checks, the system confirms the flow stopped.

## ↓ HOW THE DEVICE WORKS

```
Existing pipe ──► clamp-on ultrasonic transducers ──► flow meter box (Modbus RS485)
      │                                                       │
      │                                            ESP32 reads flow + signal quality every second
      │                                                       │
      │              "Is the reading trustworthy?"  ── no ──► SENSOR UNKNOWN (never assumed zero)
      │                                                       │ yes
      │              Quiet / prayer / cleaning schedule ──► rule: above threshold for N minutes?
      │                                                       │
      └──── caretaker inspects ◄── Telegram message ◄── incident (stored locally, sent when online)
```

Three design rules: (1) a bad sensor reading is *unknown*, not zero; (2) no internet does not stop detection — messages queue and send later; (3) every threshold is a setting we will measure, not a fact we assume. See `diagrams/architecture.svg`.

## ↓ SIMULATION

Because no ordinary electronics simulator can model ultrasound through a pipe wall, we built our own **Digital Test Bench** (a web page, no installation): a tank, a pipe with visibly moving water, a *model* of the sensor with adjustable noise and cut-offs, the ESP32 rules, and a fake caretaker phone. It runs **25 automated scenarios** — no flow, short bursts, 0.25 → 5 L/min persistent flows, prayer-time use, cleaning, sensor unplugged, Wi-Fi lost, reboot, air bubbles, wrong clock. **Every logic scenario passes**; the firmware's own logic passes 37 host tests. The simulation also shows *where the idea could fail*: a noisy, uncalibrated meter would raise false alarms, and a 0.25 L/min drip on a 25 mm pipe moves at only 0.019 m/s — below the meter's 0.03 m/s cut-off.

`simulator/index.html` · screenshots in `docs/screenshots/` · results in `tests/results/CAMPAIGN_RESULTS.md`

## ↓ EXPECTED HARDWARE

| Part | Role | Status |
|---|---|---|
| TUF-2000M clamp-on ultrasonic meter + TS-2 transducers | measures flow without cutting the pipe | to buy or borrow |
| ESP32 development board | reads the meter, runs the rules, sends alerts | **owned** |
| RS485 adapter (3.3 V, ideally isolated) | connects meter to ESP32 | ≈ SAR 25–200 |
| 12/24 V supply, small enclosure, couplant gel, clamps | installation | ≈ SAR 150–300 |
| Test rig: PPR pipe, valves, 20 L tank, 1 g scale, jug | to *prove* the meter with weighed water | ≈ SAR 200–300 |

## ↓ ESTIMATED COST

**≈ SAR 900–1,300** for the complete prototype and test rig if the meter is bought (AliExpress kit ≈ SAR 450–600 landed), **≈ SAR 450–700** if a lab or distributor lends a meter. Planning ceiling SAR 2,300 is not approached.

## ↓ WHAT WE HAVE VERIFIED (without spending money)

- The meter's manual (read in full): it runs on 8–36 V, speaks Modbus over RS485, and publishes flow, signal quality and error codes in known registers — so the ESP32 *can* read it, and can tell when it is not trustworthy. Three open-source projects already do this.
- The electrical connection (voltage levels, isolation, wiring diagram) and a complete ESP32 firmware prototype with unit tests.
- The arithmetic linking litres per minute to velocity in each pipe size — which tells us to install on the small branch pipe, not the big riser.
- The competition landscape (MEWA University Innovation Challenge is the best fit; team = 1 faculty + 4–5 students; no AI requirement found; dates still to confirm on the official page).

## ↓ WHAT REQUIRES PHYSICAL TESTING

- Whether the transducers get a good signal through **PPR** plastic pipe (not in the manufacturer's material list).
- How steady the meter's reading is at **zero flow** on a 25 mm pipe (users on small copper pipes report noise and drift).
- The **smallest flow it reliably detects** — we expect about 1 L/min to be the honest threshold; drips are probably out of reach.

## ↓ NEXT EXPERIMENT

A bench "flow ladder": water from a raised 20 L tank through a 25 mm PPR pipe with the meter clamped on; set 0, 0.25, 0.5, 1, 2 and 5 L/min with a valve; weigh the water collected in 60 s as the independent reference; repeat for five separate mountings; then 20 detection trials and 40 no-flow/disturbance trials. Pass targets we set for ourselves: **≥ 19/20 detections at the declared threshold, ≤ 1 false incident in 40 trials.** If the meter cannot reach those at 2 L/min, we change the sensing approach before building further. Procedure: `docs/PHYSICAL_TEST_PLAN.md`.

**Request:** an introduction to a fluids/instrumentation lab that could lend a clamp-on meter or host a one-day calibration session (KFUPM's GUNT HM 500 bench includes an ultrasonic module), and confirmation of the MEWA challenge cycle and deadline.
