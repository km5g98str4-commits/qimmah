# Simulation tools — what they can / cannot simulate for Water Guardian

**Project under evaluation:** ESP32 reading a clamp-on ultrasonic flow meter (TUF-2000M) over RS485 Modbus RTU (FC03/FC06 only, 9600 8N1, REAL4/IEEE-754 float across 2 registers — manual p.39), plus Wi-Fi uplink and an on-device rule engine.

**Research date:** 2026-09-12. Tags: `VERIFIED (url)` = confirmed from a fetched page or a search snippet quoting the source; `PARTIAL` = confirmed from secondary sources/snippets only (vendor site egress-blocked from this session); `NOT FOUND` = could not confirm.

**Note on method:** `wokwi.com`, `docs.wokwi.com`, `docs.espressif.com`, `labcenter.com`, `modbustools.com`, `modbusdriver.com`, `docs.platformio.org`, `flows.nodered.org`, `pymodbus.readthedocs.io`, `falstad.com`, `everycircuit.com` were blocked by the network proxy in this session; claims about them rest on search-engine snippets of those pages and on GitHub mirrors. Re-verify prices before purchase.

---

## Summary matrix

| Layer of the project | Best tool | Runner-up | Nothing works |
|---|---|---|---|
| ESP32 firmware (GPIO/UART/timers) | Wokwi | Espressif QEMU | Tinkercad, EveryCircuit |
| Modbus RTU slave (fake TUF-2000M) | pymodbus simulator on a socat pty pair | Wokwi custom chip (C) speaking UART | Proteus (no ESP32 VSM model), SimulIDE |
| RS485 electrical layer (A/B, DE/RE, termination) | None credible at signal level; Wokwi wires TX/RX logically | Proteus (analog only, no ESP32) | — |
| Wi-Fi / cloud | Wokwi gateway (public free, private paid) | QEMU via OpenEth (Ethernet stand-in, not Wi-Fi) | Everything else |
| Rule engine logic | PlatformIO native + Unity / ESP-IDF Linux target | Node-RED as a reference implementation | — |
| Hydraulics (flow vs. time, leaks, pressure) | MATLAB/Simulink Simscape Fluids (paid) | Hand-written Python model feeding pymodbus | — |
| Ultrasonic transit-time physics through pipe wall | **No general-purpose tool.** COMSOL / k-Wave / OnScale exist for acoustics — out of scope. | — | all listed tools |

---

## 1. Wokwi — `VERIFIED` https://wokwi.com · https://docs.wokwi.com

- **Simulates:** ESP32 family (ESP32, S2, S3, C3, C6, H2, P4), full firmware execution (Arduino & ESP-IDF binaries), GPIO, UART, I2C, SPI, many peripherals; runs in browser, VS Code extension, and headless CI (`wokwi-cli`, GitHub Actions). https://docs.wokwi.com/wokwi-ci/getting-started
- **Custom chips API:** yes, written in **C** (compiled to WebAssembly; Rust also possible). Chip gets `chip_init()`, pin watchers, timers, and a **UART API**: `uart_init(uart_config_t{tx, rx, baud_rate, rx_data, write_done})`, callback `on_uart_rx_data`, `uart_write()` returns false when busy. Official example: a ROT13 UART chip. https://docs.wokwi.com/chips-api/uart · https://docs.wokwi.com/chips-api/getting-started · example https://wokwi.com/projects/333638144389808723
  - **Verdict: a C custom chip can absolutely act as a Modbus RTU slave** — parse the 8-byte FC03 request, check CRC16, answer with REAL4 registers. Frame timing (3.5-char silence) has to be approximated with chip timers. This is the cleanest "fake TUF-2000M inside the simulator" path.
- **RS485 / Modbus:** no native RS485 transceiver or Modbus part. Community projects wire ESP32 → MAX485 drawn schematically, but the MAX485 is decorative; the bytes flow over plain UART. Modbus RTU examples exist (https://wokwi.com/projects/332949932845564498, https://wokwi.com/projects/377014769065300993) but they use a UART-connected fake, not a bus model. Differential signalling, DE/RE timing, bus contention, termination: **not simulated**.
- **UART loopback / two boards:** two ESP32s in one project talking over UART2 works (https://wokwi.com/projects/386597154855782401). Known caveat: **internal UART loopback (same-pin TX→RX) has open bugs** — issues wokwi-features #781 and #932. Use two boards or a custom chip, not self-loopback.
- **Wi-Fi:** yes, simulated `Wokwi-GUEST` AP. Internet via **Public Gateway** (free, cloud-relayed, monitored, no LAN access) or **Private Gateway** `wokwigw` (MIT, Go, Linux/Windows/macOS) which gives LAN access and lets the ESP32 host a server reachable from the browser — **private gateway requires a paid plan** per docs (https://docs.wokwi.com/guides/esp32-wifi, https://github.com/wokwi/wokwigw). Enough to test MQTT/HTTP uplink to a broker on your PC.
- **Cost:** free tier covers most; **Wokwi Club ≈ $7/month or $67/year** (custom binaries, private projects, private gateway). CI plans separate. https://wokwi.com/pricing `PARTIAL` (price from CNX/G2 snippets, page blocked).
- **Cannot:** RS485 electrical layer, analog sensor physics, ultrasonic physics, real Wi-Fi RF behaviour (roaming, RSSI, drop-outs), power consumption.
- **One-line verdict:** **Primary tool.** ESP32 firmware + C custom-chip Modbus slave + Wi-Fi gateway covers ~80% of the project; the remaining 20% (RS485 electrical, hydraulics, acoustics) is not simulable here.

## 2. Tinkercad Circuits — `VERIFIED` https://www.tinkercad.com

- **Simulates:** Arduino Uno/Nano/Mega-class AVR, basic analog/digital parts, breadboard view.
- **No ESP32, no Wi-Fi, no RS485/Modbus, no custom chips.** Search results confirm "stops at Arduino Uno and has no ESP32 support".
- **Cost:** free (Autodesk).
- **Verdict:** **Not usable** for this project beyond teaching a RS485 wiring diagram to a non-engineer.

## 3. Proteus (Labcenter) — `PARTIAL` https://www.labcenter.com

- **Simulates:** SPICE-class mixed-signal circuits + VSM microcontroller co-simulation (AVR, PIC, ARM Cortex-M, 8051…). Would in principle simulate a real MAX485 differential pair and bus loading.
- **ESP32:** **no official Labcenter VSM model.** Third-party "ESP32 libraries for Proteus" (theengineeringprojects.com, embedlab) are **footprint/symbol only — they do not execute firmware**. https://www.theengineeringprojects.com/2023/07/esp32-library-for-proteus.html
- **Cost:** commercial, per-module configurator; VSM starter tiers historically run from several hundred USD upward (PCB Starter Kit ~$250, VSM MCU packs extra). Exact 2026 pricing `NOT FOUND` (pricing page blocked; configurator is interactive). https://www.labcenter.com/pricing/
- **Verdict:** **Skip.** Pays for analog fidelity you cannot attach to an ESP32 model.

## 4. SimulIDE — `VERIFIED` https://simulide.com · https://simulide.org

- **Simulates:** AVR/PIC/8051 and simple logic/analog; free and open source.
- **ESP32:** experimental in 2.0 test builds, **GPIO + I2C only, "very unstable, can freeze the application"** (forum: https://simulide.com/p/forum/topic/esp-32-support/). MCU framework is 8-bit; 32-bit support is being explored via QEMU.
- **Modbus/RS485:** none; there is a generic serial/UART terminal but no Modbus part.
- **Cost:** free/GPL.
- **Verdict:** **Not ready** for ESP32 + UART work; revisit if 2.x stabilises.

## 5. MATLAB / Simulink (+ Simscape Fluids) — `PARTIAL` https://www.mathworks.com/products/simscape-fluids.html

- **Simulates:** the **hydraulics** — pipe network, pump, leak as an orifice, pressure/flow transients, flow-vs-time profiles; also Stateflow for rule-engine prototyping and generated test vectors. Can export flow series as CSV to drive pymodbus/Wokwi.
- **Cannot:** ESP32 firmware, Modbus timing, Wi-Fi; no ultrasonic wave propagation (that is an acoustics FEM job).
- **Cost (2026):** perpetual Student/Home licences sunset 1 Jan 2026; **Student Suite $119/yr**, **Home Suite $165/yr** (13 toolboxes; Simscape Fluids is **not** in the suites — add-on priced separately, commercial ~$980–2,000). University campus licences usually include Simscape. https://www.mathworks.com/pricing-licensing.html · https://www.mathworks.com/matlabcentral/discussions/general/886260-change-in-home-and-student-licenses
- **Verdict:** **Optional, only if a campus licence exists.** A 50-line Python hydraulic model gives the same test signals for free.

## 6. Node-RED + node-red-contrib-modbus — `VERIFIED` https://flows.nodered.org/node/node-red-contrib-modbus

- **Simulates/does:** Modbus **client** (RTU serial + TCP): Read/Write/Getter/Flex-Getter nodes; **in-package Modbus-Server (TCP buffer server)** for demos/tests. **Modbus-Flex-Server was removed** from the core package (vm2 maintenance) — separate contrib needed. For an **RTU serial slave** use `@krakul/node-red-modbus-rtu-slave` (https://flows.nodered.org/node/@krakul/node-red-modbus-rtu-slave). Dashboard (`@flowfuse/node-red-dashboard`) gives instant gauges/charts.
- **Use here:** (a) reference implementation of the rule engine to compare against ESP32 behaviour; (b) a second Modbus master to sanity-check the fake slave; (c) MQTT sink + dashboard for the Wi-Fi uplink test.
- **Cannot:** run ESP32 firmware; RTU timing is only as good as the host USB-serial/pty.
- **Cost:** free (Apache-2). 
- **Verdict:** **Supporting tool** — dashboard + oracle, not a simulator.

## 7. Virtual Modbus devices

| Tool | Type | RTU serial? | Cost | Tag / URL | Verdict |
|---|---|---|---|---|---|
| **pymodbus simulator** (`pymodbus.simulator`) | Python server w/ JSON datastore, custom `actions` module for dynamic register values, optional web UI (port 8081) | Yes — `"comm":"serial"`, `"framer":"rtu"` | Free (BSD) | `VERIFIED` https://pymodbus.readthedocs.io/en/latest/source/library/simulator/config.html | **Best fake TUF-2000M** off-simulator: script REAL4 flow/totaliser registers, inject faults, drive from a hydraulic model. |
| **ModbusPal** | Java GUI slave, scripted "automations" for register animation | Yes (serial + TCP) | Free (GPL) | `VERIFIED` https://modbuspal.sourceforge.net/ (unmaintained; enhanced fork https://github.com/mrhenrike/ModbusPalEnhanced) | Usable but Java/aged; pymodbus preferred. |
| **diagslave** (FieldTalk) | CLI slave | Yes | Free (binary, closed) | `PARTIAL` https://www.modbusdriver.com/diagslave.html | Quick static slave for CI containers; no scripted values. |
| **modpoll** (FieldTalk) | CLI master | Yes | Free (binary, closed) | `PARTIAL` https://www.modbusdriver.com/modpoll.html | Verify the fake slave answers before pointing the ESP32 at it. |
| **mbpoll** (epsilonrt) | CLI master, libmodbus-based, open source, float decoding | Yes, incl. RS485 mode flags | Free (GPL) | `VERIFIED` https://github.com/epsilonrt/mbpoll | Open-source alternative to modpoll; supports single-precision float read, handy for REAL4. |
| **Modbus Slave / Modbus Poll** (Witte Software) | Windows GUI slave/master, 30-day trial with 10-min connection cap | Yes | ~**$99–$149 per licence** (v7.1 was $99; current page blocked) | `PARTIAL` https://www.modbustools.com/modbus_slave.html · https://www.modbustools.com/order.html | Polished, but nothing pymodbus can't do; only buy if Windows GUI is required. |

Common limitation: **all of these speak Modbus over a host serial port/pty**; none model the RS485 wire, and none know TUF-2000M semantics — you must reproduce the register map (REAL4 flow at 0001-0002, velocity, totalisers, signal quality, error codes) yourself from the manual (p.39, FC03/FC06 only).

## 8. Python serial simulators / virtual serial pairs — `VERIFIED`

- **pyserial** — client library; also `serial.serial_for_url("loop://")` for in-process loopback. https://pypi.org/project/pyserial/
- **socat** (Linux/macOS): `socat -d -d pty,raw,echo=0 pty,raw,echo=0` → null-modem pty pair; proven with pyserial and Modbus RTU testing. https://jamesthom.as/2021/01/virtual-serial-ports-using-socat/
- **com0com** (Windows): GPLv2 virtual COM pair driver, signed build 3.0.0.0, **last release 2018** — still works but unmaintained. https://sourceforge.net/projects/com0com/
- **Bridging to Wokwi:** Wokwi VS Code/CLI can map an ESP32 UART to a host TCP port (RFC2217 style) — combine with `socat tcp:… pty` to attach pymodbus over a pty. (Documented in Wokwi VS Code `wokwi.toml` `[[net.forward]]` — `PARTIAL`, docs blocked.)
- **Cannot:** baud-rate timing (ptys are instantaneous), parity/framing errors, RS485 direction control, noise. Inter-frame 3.5-char gaps must be emulated in software.
- **Verdict:** **Glue layer.** Required to connect pymodbus ↔ ESP32 (real or simulated) without hardware.

## 9. Browser electronics simulators

- **Falstad CircuitJS** — analog/digital circuit animation; free/GPL; has an **AVR8js demo** (Arduino-class) but no ESP32, no UART protocol stack, no Modbus. https://www.falstad.com/circuit/ · https://www.falstad.com/circuit/avr8js/ `VERIFIED`. Useful only for teaching RS485 differential signalling / termination as a textbook circuit.
- **EveryCircuit** — animated analog/digital sim, **no microcontrollers**; $14.99 one-time (mobile) / ~€7 per 12 months web. https://everycircuit.com/ `VERIFIED` (snippet).
- **Verdict:** Both **out of scope** except as visual aids.

## 10. Espressif QEMU fork — `VERIFIED` https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/esp32/README.md

- **Simulates:** ESP32 (Xtensa) and ESP32-C3 CPU, memory, flash, **UART** (connected to IDF monitor / host stdio / TCP), timers, GPIO (partial), eFuse, RTC. Integrated with `idf.py qemu` and gdb.
- **Explicitly unsupported:** **Wi-Fi, Bluetooth, USB, RMT, I2C, I2S, ULP.** Networking only via the **OpenEth virtual Ethernet MAC** (`CONFIG_ETH_USE_OPENETH=y`, QEMU `-nic user,model=open_eth`) — code paths differ from `esp_wifi`, so Wi-Fi reconnect logic is untested. https://veecle.ai/blog/qemu-esp32-limitations · https://productionesp32.com/posts/internet-in-qemu/
- **Modbus:** the emulated UART can be redirected to a host pty/TCP socket (`-serial pty`), so **pymodbus over pty ↔ QEMU UART works**, and esp-modbus (FreeModbus) can be exercised with no RS485 layer.
- **Newer `esp-emulator`** (Rust, Apache-2, beta) **does emulate Wi-Fi (built-in WPA2 soft-AP)** but **only RISC-V chips (C3/C5/C6/H2/P4) — not the Xtensa ESP32**. https://github.com/espressif/esp-emulator
- **Cost:** free.
- **Verdict:** **Good for CI of ESP-IDF builds and Modbus stack tests; Wi-Fi absent** (use OpenEth or switch the design to ESP32-C6 to gain esp-emulator Wi-Fi).

## 11. ESP-IDF Linux host target — `VERIFIED` https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/host-apps.html

- **Does:** compiles selected components for the POSIX host; CMock-based mocks for a subset (`esp_wifi` mock exists but **Linux-target only**, issue #10582); FreeRTOS POSIX port; lwIP host port.
- **Limits:** "only a small fraction of IDF components support" host builds; **no UART driver, no Modbus stack, no real Wi-Fi** — everything hardware must be mocked.
- **Cost:** free.
- **Verdict:** **Unit-test the rule engine and register-decoding (REAL4→float, CRC16) here**; nothing else.

## 12. PlatformIO native unit tests — `VERIFIED` https://docs.platformio.org/en/latest/advanced/unit-testing/index.html

- **Does:** `platform = native` builds tests with host GCC + Unity/GoogleTest; runs in CI seconds. Pattern: keep logic in `lib/`, guard `main.cpp` with `#if defined(ARDUINO)`, split `test_native` / `test_embedded`. https://xa1.at/platformio-unit-test/
- **Limits:** no Arduino/ESP APIs unless you stub them (`ArduinoFake` etc.); some Arduino cores ship their own Unity causing conflicts (issue #3980).
- **Cost:** free.
- **Verdict:** **Recommended for the rule engine and Modbus frame parsing**, complementary to Wokwi for integration.

## 13. Ultrasonic transit-time physics through the pipe wall — `NOT FOUND (as expected)`

- **No general-purpose embedded/circuit simulator models it.** Transit-time clamp-on measurement depends on wedge angle, mode conversion to shear waves in the steel wall, Lamb modes, coupling gel, pipe roughness, and fluid sound speed — this is finite-element / k-space acoustics.
- Tools that *can* (out of scope, research-grade, expensive or specialist): **COMSOL Multiphysics** (used in published clamp-on flowmeter studies — e.g. ResearchGate "semi 3-D approach for Lamb wave clamp-on ultrasonic gas flowmeter"), **k-Wave** (MATLAB toolbox, free), **OnScale** (cloud FEM, now Ansys). https://www.researchgate.net/publication/342313147
- **Practical stance:** treat the TUF-2000M as a black box that emits REAL4 registers plus signal-quality/error fields; emulate *behaviour* (noise, dropouts, "signal strength low" codes, empty-pipe flag) in pymodbus actions, not physics.

---

## Recommended stack for this project

1. **Logic:** PlatformIO `native` (or ESP-IDF Linux target) — rule engine, CRC16, REAL4 decode.
2. **Integration:** **Wokwi** ESP32 + **C custom chip acting as TUF-2000M Modbus RTU slave** (or Wokwi UART → TCP → socat pty → **pymodbus simulator** for richer scripted behaviour).
3. **Uplink:** Wokwi Wi-Fi gateway → MQTT broker on host → **Node-RED dashboard**.
4. **Hydraulic scenarios:** Python model (or Simscape Fluids if campus licence) generating flow/leak time-series fed into the pymodbus `actions`.
5. **CI:** Wokwi CI or Espressif QEMU (`-serial pty` + pymodbus; OpenEth instead of Wi-Fi).
6. **Not simulated anywhere — must be tested on hardware:** RS485 electrical layer (termination, bias, DE/RE timing, long-cable noise), real Wi-Fi RF behaviour, transducer coupling/acoustics, TUF-2000M firmware quirks (FC03/FC06 only, register-pair ordering).
