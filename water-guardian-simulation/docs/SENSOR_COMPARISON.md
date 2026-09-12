# Sensor / meter comparison (Phase 9)

Scores 1–10 (10 = best for THIS hackathon MVP: DN20–32 PPR/PVC branch, ESP32, < SAR 2,300). Scores are **analyst judgements** built on the evidence in `research/notes/`; where a spec was only a snippet or an estimate, the score is conservative. Nothing here is a measurement.

| Option | Price | Pipe compat. | PPR conf. | Low-flow | Docs | Modbus access | Signal diag. | ESP32 integ. | KSA avail. | Return | Hackathon fit | **Total /110** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A. TUF-2000M + TS-2** (module, RS485) | 9 | 7 | 4 | 5 | 7 | 9 | 8 | 8 | 5 | 3 | 8 | **73** |
| B. TDS-100M + S2 (module, same OEM family) | 7 | 7 | 4 | 5 | 6 | 9 | 8 | 8 | 3 | 3 | 7 | 67 |
| C. TDS-100F + S2 (wall-mount IP57, keypad) | 6 | 7 | 4 | 5 | 7 | 9 | 8 | 8 | 3 | 3 | 7 | 67 |
| D. TUF-2000H / TDS-100H handheld (amazon.sa SAR 502) | 8 | 7 | 4 | 5 | 6 | 2 (RS232 only) | 8 | 3 | 8 | 7 (15-day) | 4 (survey/reference only) | 62 |
| E. Keyence FD-Q20C / FD-Q32C (dry clamp, IO-Link/4–20 mA) | 3 | 9 | 7 | 8 | 10 | 3 (no Modbus RTU; analog or IO-Link) | 6 | 5 | 2 | 4 | 5 | 62 |
| F. Micronics U1000 (fixed clamp-on ¾"+) | 3 | 7 | 6 | 6 | 8 | 6 (option) | 7 | 6 | 3 | 3 | 4 | 59 |
| G. Flexim FLUXUS F401 / Siemens FS230 (borrowed) | 1 (buy) / 10 (borrow) | 10 | 9 | 9 | 10 | 9 | 10 | 6 | 4 (distributor demo) | n/a | 6 (if borrowed) | 74 (borrowed) / 65 (bought) |
| H. YF-S201 inline hall sensor | 10 | 2 (must cut pipe) | n/a | 3 (1 L/min min, ±10 %) | 6 | 1 (pulse) | 1 | 9 | 9 | 7 | 2 (violates "no cutting") | 50 |
| I. Sonotec CO.55 | 2 | 2 (flexible tubing only) | 1 | 9 | 8 | 8 | 7 | 6 | 1 | 2 | 1 | 47 |
| J. Bürkert FLOWave / Badger DXN / Atrato (inline or > SAR 25k) | 1 | 3 | 5 | 8 | 9 | 7 | 8 | 4 | 2 | 2 | 1 | 50 |

## Picks

- **BEST OVERALL — A. TUF-2000M + TS-2.** Cheapest credible unit with an isolated RS485 Modbus port, a public manual with a full register map and diagnostics (Q, strength, ratio, error bits), and three open-source ESP32/Python readers. Its weakness is exactly our unknown: PPR is not in its material list and hobbyists report zero-noise on 22–28 mm copper.
- **BEST BUDGET — A again** (AliExpress ≈ SAR 430–600 landed). B/C cost more for the same electronics family; D is cheaper on amazon.sa but has no Modbus.
- **BEST IF BORROWED — G. Flexim FLUXUS F401 or Siemens FS230 portable** from a distributor demo pool, or the KFUPM GUNT bench for calibration. A one-week loan would answer the low-flow question with a reference-class instrument before we spend on A.
- **BEST DOCUMENTED — E. Keyence FD-Q** (public manuals, explicit pipe-size lists, dry clamp, ±1 % rdg) — but 2× budget, no Modbus RTU, grey-market only in KSA.
- **OPTION TO AVOID — H. YF-S201 / any inline sensor as the primary sensor** (it breaks the retrofit premise), and **I/J** (wrong pipe class or > 10× budget). Also avoid **D** as the main sensor: no machine interface.

## Why not choose on price alone

A and D are both cheap; only A has a machine interface. A and B/C are equivalent electronics; A has the most community evidence for ESP32 integration. E would be the technical pick on a different budget. G is the only way to get a *known-good* low-flow answer without buying.

## Conflicts recorded

- TS-2 pipe range: **DN15–100 vs DN25–100** (vendor listings disagree; manual v13.44 does not list TS-2 at all — it lists TS-1/TM-1/TL-1 codes). Plan for DN25/32 and treat DN20 as marginal.
- TUF-2000M velocity range: **±0.01–12 m/s (vendor)** vs **0.03 m/s M41 default cutoff (manual)** vs "0.001 m/s with PI transducers" (manual, not clamp-on). Our model uses 0.03 m/s.
- Signal quality threshold: manual v13.44 says Q > 50; older manual snippet says Q > 60; field report says > 85 for stability. Firmware policy uses ≥ 60, configurable.
- Word order of REAL4 registers: three code bases say low-word-first; one blog says "big endian". Firmware self-checks on register 221.
