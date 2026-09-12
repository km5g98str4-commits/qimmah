# Virtual Test Campaign — Results

Generated 2026-09-12T20:14:15.547Z by `tests/run.js` (deterministic seed 42, 1 s step).

**Tag: SIMULATED.** These results prove the *logic* (rule engine, state machine, buffering, recovery) and show what each *sensor model profile* implies for low-flow detection. They do **not** prove that a real TUF-2000M on a real PPR pipe behaves like any profile — that is Phase 7.

Flow-ladder rungs (3–7, 13) and zero-controls are **findings**: a FAIL means "this profile cannot resolve that flow on that pipe", which is exactly the information we want before buying.

## Profile: TUF-2000M (published spec + assumptions)

_PUBLISHED: velocity range 0.01–12 m/s (some manuals say 0.03), accuracy ±1 %, repeatability 0.2 %, measurement period 500 ms, default M41 low-flow cutoff 0.03 m/s (varies). ASSUMED: noiseAbsMs, zeroOffsetMs, commFailProb._

**24/25 PASS**

| # | Scenario | Expected | Result | Detail |
|---|---|---|---|---|
| 1 | No flow during quiet period | No alert | ✅ PASS | states=NORMAL |
| 2 | Short legitimate 5 L/min burst (90 s) in quiet | No persistent-flow alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW, maxAbove=2.4 min |
| 3 | 0.25 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.15 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ⚠️ FAIL (finding) `BELOW_PROFILE_USABLE_RANGE_OR_NOISE` | v_true=0.019 m/s; meter mean=0.096 L/min; detected=false; valid=2384, invalid=17; zero-while-flowing=true |
| 3z | Zero-flow control at threshold 0.15 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 4 | 0.5 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.30 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.039 m/s; meter mean=0.551 L/min; detected=true; valid=2384, invalid=17; zero-while-flowing=true |
| 4z | Zero-flow control at threshold 0.30 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 5 | 1 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.60 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.077 m/s; meter mean=1.060 L/min; detected=true; valid=2384, invalid=17; zero-while-flowing=false |
| 5z | Zero-flow control at threshold 0.60 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 6 | 2 L/min persistent flow, quiet, ID 16.6 mm (threshold 1.20 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.154 m/s; meter mean=2.061 L/min; detected=true; valid=2384, invalid=17; zero-while-flowing=false |
| 7 | 5 L/min persistent flow, quiet, ID 16.6 mm (threshold 3.00 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.385 m/s; meter mean=5.062 L/min; detected=true; valid=2384, invalid=17; zero-while-flowing=false |
| 8 | Long legitimate flow (2 L/min, 40 min) during PRAYER | No high-priority quiet alert (REVIEW allowed only after occupied persistence) | ✅ PASS | states=EXPECTED_FLOW,NORMAL |
| 9 | Cleaning override during quiet hours (3 L/min for 30 min, override 60 min) | EXPECTED_FLOW, no high-priority alert; override expiry logged | ✅ PASS | states=EXPECTED_FLOW,NORMAL, overrideExpired=true |
| 9b | Cleaning override EXPIRES while 3 L/min continues in quiet hours | After expiry the underlying QUIET rule applies → UNEXPECTED_FLOW | ✅ PASS | states=EXPECTED_FLOW,UNEXPECTED_FLOW |
| 10 | Sensor disconnected while 3 L/min flows (incident already open) | SENSOR_UNKNOWN, never zero; incident NOT resolved by the outage | ✅ PASS | unknown=true, resolvedDuringOutage=false, incidentOpenAfterRecovery=true, zeroWhileFlowing=false |
| 11 | Internet disconnected during 3 L/min quiet flow | Local detection continues; event buffered; synced on reconnection | ✅ PASS | detectedAt=600s (offline until 1800 s), unsyncedAtEnd=0 |
| 12 | Poor signal quality (sensor quality 35%) with 3 L/min | SENSOR_UNKNOWN rather than a confident number; no alert built on invalid data | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, valid=0, invalid=1801 |
| 13 | Large pipe (DN50 steel, ID 52.5 mm) with 0.5 L/min | Velocity 0.004 m/s is far below any published min velocity → campaign must FLAG as undetectable (pass = honest flag, not a false detection) | ✅ PASS `UNDETECTABLE_BY_GEOMETRY` | v=0.0038 m/s (< published 0.03 m/s min); detected=false → correctly NOT claimed. Meter reported 0 while flowing=false — THIS is the blind spot a large pipe creates. |
| 14 | ESP32 reboot during open incident (3 L/min quiet) | Incident restored from NVS; no duplicate alert; resolves later normally | ✅ PASS | alerts=1, bootRestored=true, resolved=true |
| 15 | Flow stops after caretaker action (3 L/min → ACK → 0) | INCIDENT_RESOLVED after resolve window | ✅ PASS | resolvedAt=1406s, litres=61.9 |
| 16 | Invalid clock with 3 L/min for 30 min | Conservative policy: treated as OCCUPIED → no high-priority alert within quiet window | ✅ PASS | states=EXPECTED_FLOW |
| 17 | Sudden 8 L/min burst 30 s then 0, quiet | No alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW |
| 18 | Air/bubbles 80% with 3 L/min | Meter step K/H → SENSOR_UNKNOWN; must not report a confident zero | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, zeroWhileFlowing=false |
| 19 | Mount becomes Poor mid-incident (3 L/min) | Degrades to SENSOR_UNKNOWN (or stays valid if Q still ≥ threshold); incident not silently resolved | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW,SENSOR_UNKNOWN, resolved=false |
| 20 | Transient Modbus CRC/timeout errors (5 %) with 3 L/min | Grace period absorbs transient errors; detection still occurs | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW, invalid=111 |
| 21 | ZERO-FLOW FALSE-ALARM STRESS: 0 L/min for 3 h with CONSERVATIVE profile (zero drift +0.01 m/s) | No incident — tests whether zero drift alone can cross the 0.5 L/min threshold on DN25 | ✅ PASS | 0.01 m/s zero drift on ID 16.6 mm = 0.130 L/min vs threshold 0.5; states=NORMAL |

## Profile: CONSERVATIVE (assumption)

_ASSUMED — pessimistic: 0.05 m/s cutoff, 3% error, 0.01 m/s noise, ±0.01 m/s zero drift_

**24/25 PASS**

| # | Scenario | Expected | Result | Detail |
|---|---|---|---|---|
| 1 | No flow during quiet period | No alert | ✅ PASS | states=NORMAL |
| 2 | Short legitimate 5 L/min burst (90 s) in quiet | No persistent-flow alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW, maxAbove=2.4 min |
| 3 | 0.25 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.15 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ⚠️ FAIL (finding) `BELOW_PROFILE_USABLE_RANGE_OR_NOISE` | v_true=0.019 m/s; meter mean=0.019 L/min; detected=false; valid=2373, invalid=28; zero-while-flowing=true |
| 3z | Zero-flow control at threshold 0.15 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 4 | 0.5 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.30 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.039 m/s; meter mean=0.377 L/min; detected=true; valid=2373, invalid=28; zero-while-flowing=true |
| 4z | Zero-flow control at threshold 0.30 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 5 | 1 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.60 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.077 m/s; meter mean=1.123 L/min; detected=true; valid=2373, invalid=28; zero-while-flowing=true |
| 5z | Zero-flow control at threshold 0.60 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 6 | 2 L/min persistent flow, quiet, ID 16.6 mm (threshold 1.20 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.154 m/s; meter mean=2.128 L/min; detected=true; valid=2373, invalid=28; zero-while-flowing=false |
| 7 | 5 L/min persistent flow, quiet, ID 16.6 mm (threshold 3.00 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.385 m/s; meter mean=5.146 L/min; detected=true; valid=2373, invalid=28; zero-while-flowing=false |
| 8 | Long legitimate flow (2 L/min, 40 min) during PRAYER | No high-priority quiet alert (REVIEW allowed only after occupied persistence) | ✅ PASS | states=EXPECTED_FLOW,NORMAL |
| 9 | Cleaning override during quiet hours (3 L/min for 30 min, override 60 min) | EXPECTED_FLOW, no high-priority alert; override expiry logged | ✅ PASS | states=EXPECTED_FLOW,NORMAL, overrideExpired=true |
| 9b | Cleaning override EXPIRES while 3 L/min continues in quiet hours | After expiry the underlying QUIET rule applies → UNEXPECTED_FLOW | ✅ PASS | states=EXPECTED_FLOW,UNEXPECTED_FLOW |
| 10 | Sensor disconnected while 3 L/min flows (incident already open) | SENSOR_UNKNOWN, never zero; incident NOT resolved by the outage | ✅ PASS | unknown=true, resolvedDuringOutage=false, incidentOpenAfterRecovery=true, zeroWhileFlowing=false |
| 11 | Internet disconnected during 3 L/min quiet flow | Local detection continues; event buffered; synced on reconnection | ✅ PASS | detectedAt=600s (offline until 1800 s), unsyncedAtEnd=0 |
| 12 | Poor signal quality (sensor quality 35%) with 3 L/min | SENSOR_UNKNOWN rather than a confident number; no alert built on invalid data | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, valid=0, invalid=1801 |
| 13 | Large pipe (DN50 steel, ID 52.5 mm) with 0.5 L/min | Velocity 0.004 m/s is far below any published min velocity → campaign must FLAG as undetectable (pass = honest flag, not a false detection) | ✅ PASS `UNDETECTABLE_BY_GEOMETRY` | v=0.0038 m/s (< published 0.03 m/s min); detected=false → correctly NOT claimed. Meter reported 0 while flowing=false — THIS is the blind spot a large pipe creates. |
| 14 | ESP32 reboot during open incident (3 L/min quiet) | Incident restored from NVS; no duplicate alert; resolves later normally | ✅ PASS | alerts=1, bootRestored=true, resolved=true |
| 15 | Flow stops after caretaker action (3 L/min → ACK → 0) | INCIDENT_RESOLVED after resolve window | ✅ PASS | resolvedAt=1407s, litres=62.9 |
| 16 | Invalid clock with 3 L/min for 30 min | Conservative policy: treated as OCCUPIED → no high-priority alert within quiet window | ✅ PASS | states=EXPECTED_FLOW |
| 17 | Sudden 8 L/min burst 30 s then 0, quiet | No alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW |
| 18 | Air/bubbles 80% with 3 L/min | Meter step K/H → SENSOR_UNKNOWN; must not report a confident zero | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, zeroWhileFlowing=false |
| 19 | Mount becomes Poor mid-incident (3 L/min) | Degrades to SENSOR_UNKNOWN (or stays valid if Q still ≥ threshold); incident not silently resolved | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW,SENSOR_UNKNOWN, resolved=false |
| 20 | Transient Modbus CRC/timeout errors (5 %) with 3 L/min | Grace period absorbs transient errors; detection still occurs | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW, invalid=111 |
| 21 | ZERO-FLOW FALSE-ALARM STRESS: 0 L/min for 3 h with CONSERVATIVE profile (zero drift +0.01 m/s) | No incident — tests whether zero drift alone can cross the 0.5 L/min threshold on DN25 | ✅ PASS | 0.01 m/s zero drift on ID 16.6 mm = 0.130 L/min vs threshold 0.5; states=NORMAL |

## Profile: IDEAL (assumption)

_ASSUMED — best case, used only to check the logic_

**24/25 PASS**

| # | Scenario | Expected | Result | Detail |
|---|---|---|---|---|
| 1 | No flow during quiet period | No alert | ✅ PASS | states=NORMAL |
| 2 | Short legitimate 5 L/min burst (90 s) in quiet | No persistent-flow alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW, maxAbove=2.4 min |
| 3 | 0.25 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.15 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.019 m/s; meter mean=0.250 L/min; detected=true; valid=2401, invalid=0; zero-while-flowing=false |
| 3z | Zero-flow control at threshold 0.15 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 4 | 0.5 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.30 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.039 m/s; meter mean=0.500 L/min; detected=true; valid=2401, invalid=0; zero-while-flowing=false |
| 4z | Zero-flow control at threshold 0.30 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 5 | 1 L/min persistent flow, quiet, ID 16.6 mm (threshold 0.60 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.077 m/s; meter mean=1.000 L/min; detected=true; valid=2401, invalid=0; zero-while-flowing=false |
| 5z | Zero-flow control at threshold 0.60 L/min (2 h, ID 16.6 mm) | No incident from noise/zero drift alone | ✅ PASS | meter mean at true 0 = 0.000 L/min; falseIncident=false; states=NORMAL |
| 6 | 2 L/min persistent flow, quiet, ID 16.6 mm (threshold 1.20 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.154 m/s; meter mean=2.000 L/min; detected=true; valid=2401, invalid=0; zero-while-flowing=false |
| 7 | 5 L/min persistent flow, quiet, ID 16.6 mm (threshold 3.00 L/min) | UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE. | ✅ PASS | v_true=0.385 m/s; meter mean=5.000 L/min; detected=true; valid=2401, invalid=0; zero-while-flowing=false |
| 8 | Long legitimate flow (2 L/min, 40 min) during PRAYER | No high-priority quiet alert (REVIEW allowed only after occupied persistence) | ✅ PASS | states=EXPECTED_FLOW,NORMAL |
| 9 | Cleaning override during quiet hours (3 L/min for 30 min, override 60 min) | EXPECTED_FLOW, no high-priority alert; override expiry logged | ✅ PASS | states=EXPECTED_FLOW,NORMAL, overrideExpired=true |
| 9b | Cleaning override EXPIRES while 3 L/min continues in quiet hours | After expiry the underlying QUIET rule applies → UNEXPECTED_FLOW | ✅ PASS | states=EXPECTED_FLOW,UNEXPECTED_FLOW |
| 10 | Sensor disconnected while 3 L/min flows (incident already open) | SENSOR_UNKNOWN, never zero; incident NOT resolved by the outage | ✅ PASS | unknown=true, resolvedDuringOutage=false, incidentOpenAfterRecovery=true, zeroWhileFlowing=false |
| 11 | Internet disconnected during 3 L/min quiet flow | Local detection continues; event buffered; synced on reconnection | ✅ PASS | detectedAt=600s (offline until 1800 s), unsyncedAtEnd=0 |
| 12 | Poor signal quality (sensor quality 35%) with 3 L/min | SENSOR_UNKNOWN rather than a confident number; no alert built on invalid data | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, valid=0, invalid=1801 |
| 13 | Large pipe (DN50 steel, ID 52.5 mm) with 0.5 L/min | Velocity 0.004 m/s is far below any published min velocity → campaign must FLAG as undetectable (pass = honest flag, not a false detection) | ⚠️ FAIL (finding) `UNDETECTABLE_BY_GEOMETRY` | v=0.0038 m/s (< published 0.03 m/s min); detected=true → correctly NOT claimed. Meter reported 0 while flowing=false — THIS is the blind spot a large pipe creates. |
| 14 | ESP32 reboot during open incident (3 L/min quiet) | Incident restored from NVS; no duplicate alert; resolves later normally | ✅ PASS | alerts=1, bootRestored=true, resolved=true |
| 15 | Flow stops after caretaker action (3 L/min → ACK → 0) | INCIDENT_RESOLVED after resolve window | ✅ PASS | resolvedAt=1406s, litres=60.7 |
| 16 | Invalid clock with 3 L/min for 30 min | Conservative policy: treated as OCCUPIED → no high-priority alert within quiet window | ✅ PASS | states=EXPECTED_FLOW |
| 17 | Sudden 8 L/min burst 30 s then 0, quiet | No alert | ✅ PASS | states=NORMAL,PERSISTENT_FLOW |
| 18 | Air/bubbles 80% with 3 L/min | Meter step K/H → SENSOR_UNKNOWN; must not report a confident zero | ✅ PASS | states=NORMAL,SENSOR_UNKNOWN, zeroWhileFlowing=false |
| 19 | Mount becomes Poor mid-incident (3 L/min) | Degrades to SENSOR_UNKNOWN (or stays valid if Q still ≥ threshold); incident not silently resolved | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW,SENSOR_UNKNOWN, resolved=false |
| 20 | Transient Modbus CRC/timeout errors (5 %) with 3 L/min | Grace period absorbs transient errors; detection still occurs | ✅ PASS | states=PERSISTENT_FLOW,UNEXPECTED_FLOW, invalid=111 |
| 21 | ZERO-FLOW FALSE-ALARM STRESS: 0 L/min for 3 h with CONSERVATIVE profile (zero drift +0.01 m/s) | No incident — tests whether zero drift alone can cross the 0.5 L/min threshold on DN25 | ✅ PASS | 0.01 m/s zero drift on ID 16.6 mm = 0.130 L/min vs threshold 0.5; states=NORMAL |

## Summary

| Profile | PASS | Total |
|---|---|---|
| TUF2000M_PUBLISHED | 24 | 25 |
| CONSERVATIVE | 24 | 25 |
| IDEAL | 24 | 25 |
