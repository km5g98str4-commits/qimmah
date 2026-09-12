# Bill of Materials — Water Guardian prototype

Prices in SAR, VAT-inclusive where the source is a Saudi marketplace. Tags: **VERIFIED** = price seen on a cited listing (via search snippet; re-check live) · **ESTIMATE** = analyst band. Owned: ESP32 DevKit. Full evidence in `research/notes/alternatives_and_procurement.md`; URLs in `SOURCES.md`.

## A. Core (essential)

| # | Item | Exact product / spec | Why | Price SAR | Saudi source | Intl alternative | Essential | Borrowable | Cheaper alt. | Risks | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Clamp-on ultrasonic flow meter** | **TUF-2000M module + TS-2 transducers** (DN15/25–100, −30…90 °C), 8–36 VDC, RS485 Modbus RTU | The sensor under test | **430–1,090 landed** (AliExpress $100–210 + 15 % VAT + optional DHL 55–180) — VERIFIED inputs, ESTIMATE total | Not on amazon.sa/noon as a module; AliExpress/Alibaba ship to KSA | amazon.com (AmazonGlobal) $180–320 ESTIMATE; TDS-100M-S2 $250–350 | Yes | **Try first** (see §D) | TUF-2000H handheld on amazon.sa SAR 502.50 — no Modbus, survey only | PPR not in the material list; small-pipe noise reports; 15–30 day shipping; return to China impractical | Medium |
| 2 | RS485 ↔ TTL 3.3 V | **Primary:** DFRobot DFR0845 isolated, auto-direction. **Fallback:** KNACRO MAX3485 3.3 V module (DE/RE) | Level-correct, optionally isolated link to the meter's RS485 port | DFR0845 ≈ 150–200 landed (ESTIMATE, $19.90 VERIFIED); MAX3485 ≈ 25–45 (ESTIMATE, listing VERIFIED) | amazon.sa (KNACRO); DFRobot import | Youmile auto-dir 2-pk amazon.sa from 115.20 VERIFIED | Yes | No | MAX3485 | Plain 5 V MAX485 boards drive 5 V into ESP32 RX — avoid | High |
| 3 | Power supply | 24 VDC 1 A (or 12 V 2 A adapter — meter accepts 8–36 V) | Meter 50 mA + ESP32 | 19–33 VERIFIED (12 V 2 A) ; MEAN WELL LRS-50-24 60–120 ESTIMATE | amazon.sa; Batha electrical shops | — | Yes | Yes (any lab bench PSU) | 12 V adapter | Never mains to the module | High |
| 4 | DC-DC buck 5 V | LM2596 module → ESP32 VIN | ESP32 from the 12/24 V rail | 27 VERIFIED | amazon.sa | — | Yes | Yes | USB power bank for the demo | Set voltage before connecting | High |
| 5 | Couplant | Phase II UTG1000-C ultrasonic gel (Anaum) or Aquasonic 100 | Acoustic coupling; manual requires "adequate coupler… no gap" | 98 VERIFIED (Anaum) / 40–70 ESTIMATE (Aquasonic) | anaum.sa, amazon.sa | — | Yes | Yes (univ. NDT/ultrasound lab) | Silicone grease 25–45; Vaseline (field report) | Water-based gel dries in days → re-couple; grease for the long test | High |
| 6 | Mounting | 2× stainless worm clamps or the strap supplied with TS-2 | Hold transducers without movement | 45 (set) VERIFIED | amazon.sa, SACO | — | Yes | — | Cable ties for the demo | Loose mount = "H"/low Q | High |
| 7 | Wiring | 22 AWG hook-up, twisted pair for A/B, Dupont jumpers, 120 Ω resistor | — | 20–30 VERIFIED (kits) | amazon.sa, Rakan/Etqan | — | Yes | Yes | — | — | High |
| 8 | Enclosure | IP65 ABS ~100×100×70 (LeMotech/Zulkit) | Demo-grade protection | 35–96 VERIFIED range | amazon.sa | — | For demo yes | — | Cardboard for the bench | — | High |

## B. Demo / test rig (essential for Phase 7)

| # | Item | Spec | Price SAR | Source | Notes |
|---|---|---|---|---|---|
| 9 | PPR pipe | 25 mm PN20 × 4 m and 32 mm PN20 × 4 m (ASK / Al-Munif) + 4 sockets + 2 adapters | 12–20 + 20–32 + fittings 2–8 ea. ESTIMATE | Youmats / building-materials shops | Match the mosque's pipe class; keep 1 m offcut to measure wall |
| 10 | Optional comparison pipe | 1" galvanized steel Sch40 × 1 m + 2 adapters | 20–40 ESTIMATE | plumbing shop | Steel is in the meter's material list — a sanity reference for PPR |
| 11 | Valves | 2× 1" brass ball valve (or 1 ball + 1 needle for fine 0.25 L/min setting) | 25–45 each ESTIMATE | SACO / amazon.sa | Manual only — for creating controlled flow, never for shutoff in the product |
| 12 | Tank | 20 L HDPE jerry can with tap, placed ≥ 1.5 m up (or mains tap with hose) | 85 VERIFIED (noon) | noon / amazon.sa | Gravity head keeps the pipe full |
| 13 | Measuring jug | 1–2 L PP graduated | 8–15 VERIFIED | amazon.sa / kanbkam | Secondary check only |
| 14 | Scale | 5 kg / 1 g kitchen scale | 19–44 VERIFIED | amazon.sa | **Primary reference** (gravimetric) |
| 15 | Stopwatch | phone | 0 | — | — |
| 16 | Tools | calliper (wall/OD), sandpaper, cloth, cable ties, hose + clamps | 30–60 ESTIMATE | any | — |

## C. Software / services

| Item | Cost |
|---|---|
| Telegram Bot API | free |
| Wi-Fi hotspot (phone) for the demo | free |
| PlatformIO / Arduino IDE | free |

## D. Totals

| Scenario | SAR |
|---|---|
| Rig + electronics **without** meter | **≈ 450–700** |
| + TUF-2000M-TS-2 via AliExpress (landed) | **≈ 900–1,800** ← inside the < 1,500 target at the low end, inside the 2,300 ceiling always |
| + DHL express and DFR0845 instead of MAX3485 | ≈ 1,300–2,000 |
| Meter **borrowed** (lab / distributor demo) | ≈ 450–700 |

## E. Borrowing — who to ask first (evidence in research notes)

1. **KFUPM ME Fluid Mechanics Lab** — GUNT HM 500 trainer with HM 500.05 ultrasonic module: not a clamp-on loaner, but a **calibration bench** for a one-day session.
2. **IAU Dammam fluid lab** — gravimetric/volumetric benches (reference method).
3. **KSU hydraulics lab** — no ultrasonic meter listed; ask anyway for a portable unit.
4. **Distributors with portable clamp-on demo pools:** Endress+Hauser Arabia (Al Khobar/Riyadh/Jeddah), KROHNE KSA, IICS–Abunayyan (Siemens FS230), Kanoo Energy, Flexim ME (Dubai). No public loan programme found; a 1–2 week trial framed as a pilot is plausible (ESTIMATE).
5. **University NDT / physics labs** — for couplant and possibly a portable ultrasonic thickness gauge to measure wall thickness precisely (the biggest setup error source).

## F. Not in the BOM on purpose

Custom PCB · motorized valve · solar · LoRaWAN · second ESP32 · piezo/DIY ultrasonic front-end · ML — all excluded by the project decisions.
