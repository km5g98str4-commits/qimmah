# Water Guardian — Pre-Purchase Feasibility Workspace

Retrofit clamp-on water-flow monitoring for mosques (pilot) → detect **persistent unexpected flow** and notify the caretaker. This workspace answers, with evidence, "can this actually work?" **before** buying the ~SAR 600 ultrasonic meter.

**Headline:** GO WITH CONDITIONS. Interface/protocol/firmware/logic are verified or simulated; the acoustic performance of a cheap clamp-on meter on a small PPR pipe at < 1 L/min is **not yet physically verified** and the field evidence is unfavourable → borrow first, buy the cheap kit as a test article otherwise. Full reasoning: `docs/FINAL_TECHNICAL_REPORT.md` (Markdown) / `docs/FINAL_TECHNICAL_REPORT.html`.

## Quick start

```bash
cd water-guardian-simulation
open simulator/index.html        # interactive Digital Test Bench (no build, no server)
node tests/run.js                # 25-scenario campaign × 6 runs → tests/results/CAMPAIGN_RESULTS.md
node tests/hydraulics_table.js   # Q = v·A tables → tests/results/HYDRAULICS_TABLE.md
python3 tools/virtual_tuf2000m.py --port x --flow-lpm 3 --selftest   # virtual meter self-test
cd firmware/esp32_prototype && g++ -std=c++17 -DNATIVE_TEST -Isrc src/*.cpp test/test_native/test_main.cpp -o /tmp/wg && /tmp/wg
```

Requires only Node ≥ 18, Python 3, and g++ (or PlatformIO) — no npm packages.

## Layout

```
water-guardian-simulation/
├── README.md
├── docs/
│   ├── FINAL_TECHNICAL_REPORT.md / .html   ← 26-section report, tagged VERIFIED/CALCULATED/SIMULATED/ASSUMED
│   ├── PROFESSOR_SUMMARY.md                ← 3-page plain-language summary
│   ├── BOM.md · SENSOR_COMPARISON.md · PHYSICAL_TEST_PLAN.md · SOURCES.md
│   └── screenshots/                        ← simulator captures used in the report
├── simulator/                              ← browser Digital Test Bench (index.html, app.js, engine/*.js)
├── firmware/esp32_prototype/               ← PlatformIO: Modbus RTU master, TUF-2000M map, rule engine, main.cpp, host tests
├── tools/virtual_tuf2000m.py               ← Modbus RTU slave emulating the meter's registers + fault injection
├── tests/                                  ← run.js (campaign), hydraulics_table.js, serve.js, results/
├── diagrams/                               ← architecture.svg/.md (Mermaid), wiring.svg, hydraulic_layout.svg
└── research/notes/                         ← raw research: tuf2000m.md, alternatives_and_procurement.md, competition.md, simulation_tools.md
```

## What is proven vs. not

| Layer | Status |
|---|---|
| Meter interface (power, RS485, Modbus registers, diagnostics) | **VERIFIED** from the TUF-2000M manual v13.44 + 3 open-source readers |
| Hydraulics (L/min ↔ m/s per pipe) | **CALCULATED** |
| ESP32 firmware logic, Modbus framing, validity policy, persistence | **SIMULATED** (37 host tests) |
| Detection rules under 15+ failure modes | **SIMULATED** (25 scenarios × 6 runs, 0 logic failures) |
| Ultrasonic reading on a real PPR pipe at 0.25–1 L/min | **NOT YET PHYSICALLY VERIFIED** → `docs/PHYSICAL_TEST_PLAN.md` |

## Safety / scope notes

Everything here lives inside this folder; nothing outside it was modified. No credentials are stored (`firmware/esp32_prototype/include/config.h` is git-ignored). The simulator never sends network traffic.
