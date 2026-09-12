# Water Guardian — Digital Test Bench (simulator)

Browser-based interactive simulator of the whole chain **Tank → Pipe → Clamp-on sensor (model) → ESP32 → Rule engine → Dashboard / Phone**.

## Run

```bash
# Option A — just open the file (no server, no build):
open simulator/index.html          # macOS
xdg-open simulator/index.html      # Linux
start simulator\index.html         # Windows

# Option B — tiny static server:
node tests/serve.js                # → http://localhost:8765
```

No dependencies. Plain HTML/CSS/JS; the engine files are also loaded by Node for the automated campaign (`npm test`).

## What is real and what is a model

| Block | Kind | Notes |
|---|---|---|
| Hydraulics `engine/hydraulics.js` | **CALCULATED** | Q = v·A, unit conversion, typical pipe IDs (measure the real pipe). |
| Sensor `engine/sensorModel.js` | **MODEL / ASSUMED** | Interface + behaviour model: cutoff, noise, error, zero drift, quality/strength, working-step letters, comm failures. **No acoustic physics.** Profiles: IDEAL, CONSERVATIVE, TUF-2000M (published spec + assumptions), TUF-2000M field-reports (pessimistic), CUSTOM. |
| Rule engine `engine/ruleEngine.js` | **LOGIC** | Deterministic state machine, identical to the firmware port (`firmware/esp32_prototype/src/rule_engine.cpp`). |
| Scenarios `engine/scenarios.js` | **LOGIC** | The 25-scenario Phase 6 campaign; same code runs in the browser tab and in `tests/run.js`. |
| Phone / dashboard | **EMULATED** | Queue-while-offline, deliver-on-reconnect. Never sends anything real. |

## Controls

Flow 0–20 L/min · pipe preset / material / ID / wall · sensor quality · air % · attachment · coupling · straight-pipe · sensor profile with all parameters editable · facility mode · clock validity · sensor link · Wi-Fi · backend · speed 1×/10×/60×/600× · editable rules · "Break it" buttons (disconnect, Wi-Fi, backend, poor signal, air, mount, reboot, invalid clock, burst).

## Reading the screen

- **State chips**: NORMAL · EXPECTED_FLOW · PERSISTENT_FLOW · UNEXPECTED_FLOW · REVIEW · SENSOR_UNKNOWN · RESOLVED, plus an OFFLINE overlay (connectivity never blocks detection).
- **Meter reading** shows `INVALID` / `NO COMM` rather than 0 when the model says the meter cannot be trusted.
- **Hydraulic comparison** tab: velocity of 0.25/0.5/1/2/5 L/min on several IDs, coloured against the selected profile's minimum velocity.
- **Scenario runner** tab: runs the campaign headless in the browser and prints PASS/FAIL.
