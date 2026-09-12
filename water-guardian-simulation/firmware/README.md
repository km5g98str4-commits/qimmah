# Water Guardian — ESP32 firmware prototype

`esp32_prototype/` is a PlatformIO project for the ESP32 DevKit you already own.

**Status:** the logic is unit-tested on the host (37 checks, `test/test_native`), the Modbus RTU
master is exercised against the virtual meter, and the sketch compiles against the Arduino-ESP32
core. It has **not** been run against a real TUF-2000M — that is Phase 7.

## Layout

| File | Role |
|---|---|
| `src/modbus_rtu.*` | Minimal Modbus RTU master (FC03/FC06), CRC16, timeouts, exception/CRC/bad-frame detection. Transport is injected → testable. |
| `src/tuf2000m.*` | Register map from the **TUF-2000M manual v13.44** (1-based registers; PDU = reg − 1), REAL4 decode with word-order toggle, validity policy (working step, Q, strength, transit ratio, error bits). |
| `src/rule_engine.*` | C++ port of `simulator/engine/ruleEngine.js` — same states, same parameters, moving average, gap tolerance, NVS-persistable incident and event buffer. |
| `src/main.cpp` | Arduino sketch: UART2 + DE/RE, 1 s polling, NTP schedule, manual mode override via serial console, NVS persistence, Wi-Fi maintenance (non-blocking), Telegram/backend sync of buffered events, register-221 word-order self-check. |
| `include/config.example.h` | Copy to `include/config.h` (git-ignored) and fill in Wi-Fi / Telegram / pins. |
| `test/test_native/test_main.cpp` | Host tests: CRC vector, REAL4 word order, Modbus OK/timeout/CRC/exception, validity never-zero, engine scenarios (persistent, unknown-keeps-incident, burst, occupied review, cleaning expiry, clock invalid, persist/restore, gap tolerance). |

## Build / test

```bash
# host tests without PlatformIO:
cd firmware/esp32_prototype
g++ -std=c++17 -DNATIVE_TEST -Isrc src/rule_engine.cpp src/modbus_rtu.cpp src/tuf2000m.cpp test/test_native/test_main.cpp -o /tmp/wg_test && /tmp/wg_test

# with PlatformIO:
pio test -e native
cp include/config.example.h include/config.h   # edit credentials
pio run -e esp32dev -t upload && pio device monitor
```

## Meter settings that MUST be done on the meter keypad before anything works

| Menu | Setting | Why |
|---|---|---|
| M63 | **1 = MODBUS-RTU** | Default is MODBUS-ASCII (manual p.39). RTU frames get no reply otherwise. |
| M46 | address 1 | Only settable from the keypad. |
| M62 | 9600, None, 8, 1 | Default; keep. |
| M11–M16 | pipe OD, wall, material (PPR → "other" + sound speed), liner | Wrong wall thickness = confidently wrong readings. |
| M23/M24/M25 | transducer type, V-method, spacing | Then verify M91 ratio 97–103 %. |
| M41 | low-flow cutoff (default 0.03 m/s) | Leave default first; measure; then decide. |
| M42 → M26 | zero calibration with valve shut, then save | Otherwise zero is lost at power-cycle (p.30–31). |
| M28 | "hold last good value" — consider **NO** | Default YES freezes the last value on signal loss; our validity policy catches it via reg 92/72, but NO is safer. |

## Test against the virtual meter (no hardware meter needed)

```bash
pip install pyserial
socat -d -d pty,raw,echo=0 pty,raw,echo=0      # prints /dev/pts/N and /dev/pts/M
python3 tools/virtual_tuf2000m.py --port /dev/pts/N --flow-lpm 3 --quality 85
# point any Modbus master (mbpoll, pymodbus, the ESP32 via a USB-RS485 adapter) at /dev/pts/M
# fault injection: --step I (no signal), --quality 30, --drop 0.2, --corrupt 0.1, --high-first
```

## Serial console (demo)

`c` cleaning · `p` prayer/occupied · `q` quiet · `s` back to schedule · `a` acknowledge · `e` expected activity · `k` incident checked · `w` toggle word order.

## Telegram (optional)

Fill `WG_TG_BOT_TOKEN` / `WG_TG_CHAT_ID` in `config.h`. Leave empty to disable (events still buffer and print on serial). Credentials never go in git.
