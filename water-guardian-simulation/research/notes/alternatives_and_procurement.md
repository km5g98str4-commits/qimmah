# Water Guardian — Flow-meter alternatives & Saudi procurement research

Date: 2026-09-12 · Analyst: technical procurement (KSA) · FX used: 1 USD = 3.75 SAR
Tags: **VERIFIED (URL)** = seen in a cited page/snippet · **ESTIMATE** = analyst inference or price band · **NOT FOUND** = searched, nothing usable.

> Method note: amazon.sa, noon.com, aliexpress, alibaba, ebay, keyence.com and most distributor sites were **blocked by the sandbox egress proxy** for direct page fetch. All "VERIFIED" facts below come from search-engine snippets of those pages (title + visible price/spec text), not from full page loads. Prices on marketplaces change daily; re-check before ordering.

---

## Task A — Clamp-on alternatives to TUF-2000M (DN15–DN50, water, budget < ~SAR 2,000)

### A.0 Baseline: TUF-2000M + TS-2 (for comparison)
- Module type transit-time meter; accuracy ±1% of reading, repeatability 0.2%, linearity 0.5% — VERIFIED (user manual PDF https://images-na.ssl-images-amazon.com/images/I/91CvZHsNYBL.pdf ; ecefast datasheet https://www.ecefast.co.nz/wp-content/uploads/2016/08/TUF-2000M_datasheet.pdf).
- Velocity range 0.03–10 m/s (some listings: ±0.01–30 m/s) — VERIFIED (ecefast datasheet / Amazon listing text https://www.amazon.com/TUF-2000M-Ultrasonic-Transducer-Digital-Flowmeter/dp/B0CVNFKCRK).
- Outputs: isolated RS-485 (Modbus RTU), 2× isolated OCT pulse, 1× isolated 4-20 mA; power DC 8–36 V (some variants 100–240 VAC) — VERIFIED (Alibaba listing https://www.alibaba.com/product-detail/TUF-2000M-RS485-Modbus-Ultrasonic-Flow_1749852634.html ; Modbus register doc http://blog.veto.cl/com_virtuemart/files/manuales/otros_documentos/N0646058_modbus_formato_datos.pdf).
- TS-2 transducer: DN15–100 mm (many sellers say DN25–100), −30…90 °C — VERIFIED (Amazon B0CN2YQ4SB title). Pipe materials listed: steel, SS, cast iron, copper, cement, PVC, aluminium, GRP — VERIFIED (Alibaba listing). **PPR is not named explicitly anywhere** — ESTIMATE: PPR (PP-R, sound speed ≈ 2,400–2,500 m/s, more attenuating than PVC) generally works on transit-time meters if pipe wall is entered as "PP"/"other plastic"; expect weaker signal on DN25 PPR PN20 (thick wall 4.2 mm) than on PVC. Test before committing.
- Documentation: English manual PDFs widely mirrored (Amazon/ecefast/ManualsLib) — VERIFIED; Modbus map is available — VERIFIED (veto.cl PDF). Quality: adequate but machine-translated; Arduino forum thread shows working Modbus RTU reads (https://forum.arduino.cc/t/arduino-modbus-rtu-rs485-with-tuf-2000m/511627) — VERIFIED.

### A.1 Keyence FD-Q series (FD-Q10C / FD-Q20C / FD-Q32C) — clamp-on, small pipes
| Item | Value | Tag |
|---|---|---|
| Model / pipe OD | FD-Q10C: 8A (ø13–16 mm) & 10A (ø16–18 mm); FD-Q20C: 15A (ø18–23) & 20A (ø23–28); FD-Q32C: 25A (ø28–37) & 32A (ø37–44). | VERIFIED https://www.keyence.com/products/process/flow/fd-q/models/ (snippet) |
| Transducer | Integrated in clamp body (no separate transducers, no couplant needed — dry clamp) | VERIFIED https://www.keyence.com/products/process/flow/fd-q/ |
| Materials | Metal and resin pipes (PVC listed; PP/PPR "resin" generally supported — check Keyence pipe list) | VERIFIED (esaitech snippet) / PPR: ESTIMATE |
| Rated flow | FD-Q10C max 20 L/min (8A) / 30 L/min (10A); FD-Q32C max 200 / 300 L/min; FD-Q20C between | VERIFIED https://esaitech.com/... / https://www.watertechusa.com/userdata/userfiles/file/Equipment%20Files/keyence-FD-Q32C-manual.pdf |
| Accuracy | ±1% of reading (Keyence spec); repeatability ±2.0% @0.5 s … ±0.15% @60 s response | VERIFIED (control-specialties / artisantg datasheet snippet) |
| Outputs | Analog 4-20 mA, 2× NPN/PNP switch outputs, **IO-Link** (main unit) | VERIFIED (Keyence specs page snippet) |
| Power | 24 VDC (M12 connector) | VERIFIED (datasheet snippet) |
| Price | "from $670" (OmniLyte); Radwell new $962 / refurb $561; eBay $462–$1,632 | VERIFIED https://www.omnilyte.com/products/fd-q-series-clamp-on-digital-ultrasonic-flow-sensor ; https://www.radwell.com/en-US/Buy/KEYENCE%20CORP/KEYENCE%20CORP/FD-Q10C/ ; https://octopart.com/fd-q10c-keyence-119617200 |
| SAR | ≈ SAR 2,500–3,600 + 15% VAT + shipping (grey market); Keyence KSA direct quote likely higher | ESTIMATE |
| Saudi availability | No amazon.sa/noon listing found. Keyence has a Middle East office (Dubai) selling direct only. | NOT FOUND (KSA retail) / ESTIMATE |
| Docs | Excellent (Keyence manuals/setting guide public) | VERIFIED https://aquapproach.com/wp-content/uploads/2024/09/Keyence-FDQ-Manual-2-inch-Meter.pdf |
| Returns | Grey-market eBay/Radwell: 30-day typical; Keyence direct: no returns on configured items | ESTIMATE |
| Verdict | **Over budget** (~2× SAR 2,000 even grey-market) but the technically best fit for DN15–DN32 resin pipe; no couplant, IO-Link/4-20 mA (no native Modbus RTU). Keep as stretch option. | — |

### A.2 Bürkert 8098 FLOWave (SAW, inline) — note only
- Inline surface-acoustic-wave meter, clamp ends ¾"–2" / DN15–DN50; outputs analog + digital; hygienic — VERIFIED https://www.valvesonline.co.uk/burkert-type-8098-flowave-saw-flowmeter.html
- Price: Radwell $9,568 refurb – $15,945 new (≈ SAR 36k–60k) — VERIFIED https://www.radwell.com/Buy/BURKERT/BURKERT/8098%20FLOWAVE
- **Not clamp-on, far over budget → excluded.**

### A.3 Sonotec SONOFLOW CO.55 — clamp-on for flexible tubing
- Sizes ¼"–1⅜" tubing; tubing materials PVC, silicone, PFA, PTFE; flow down to 20 mL/min; accuracy ±1% (calibrated); outputs configurable 4-20 mA / frequency / pulse + RS485 Modbus — VERIFIED https://www.sonotecusa.com/products/non-invasive-fluid-monitoring/flow-rate-measurement/sonoflow-clamp-on-sensor/
- **Designed for flexible/thin-wall tubing; for rigid plastic pipe Sonotec points to SEMIFLOW CO.65** — VERIFIED https://www.sonotecusa.com/products/non-invasive-fluid-monitoring/flow-rate-measurement/semiflow-clamp-on-sensor/
- Price: new ≈ $3,000 (rescience) ; used eBay $340–$400 — VERIFIED https://www.rescienceinc.com/product-page/sonotec-sonoflow-co-55-ultrasonic-clamp-on-flow-meter-1 ; https://www.ebay.com/itm/147425119887
- Verdict: **not suited to rigid PPR/PVC DN25–DN50; over budget new.** Excluded.

### A.4 Flexim FLUXUS (F401 portable / F721 fixed) — note only
- Industrial reference class; F721 seen at $5,218.50 (NRI parts) — VERIFIED https://www.nriparts.com/products/flexim-fluxus-f721-other-flow-meters/776644 ; new configured F401/F721 typically $8k–$15k — ESTIMATE.
- Flexim Middle East: DWC Business Center, Dubai South, UAE — VERIFIED https://www.oilandgasdirectory.com/profile/details/33006/FLEXIM-Middle-East.html ; rentals exist via US rental houses (atecorp, flowrental) — VERIFIED https://www.atecorp.com/products/flexim ; KSA rental: NOT FOUND.
- **Reference/borrow candidate only** (see Task E). Over budget.

### A.5 Siemens SITRANS FS230 — note only
- Clamp-on, pipes 0.5"–394", accuracy ±0.5…1% (>0.3 m/s), repeatability ±0.25% — VERIFIED https://www.lesman.com/siemens-sitrans-fs230-clamp-on-ultrasonic-flowmeter
- Price: not public; typical configured system $7k–$12k — ESTIMATE. Saudi distributors: The Saudi Distributors Co., Zamil Trade & Services (electrical); IICS/Abunayyan is Siemens solution partner — VERIFIED https://www.saudi-distributors.com/brand/siemens-supplier-saudi-arabia ; https://iics-sa.com/
- **Over budget; distributor demo possible (Task E).**

### A.6 Titan Atrato 760 (inline ultrasonic, not clamp-on)
- Inline, ½"/⅜" NPT/BSP, 0.1–20 L/min (four ranges 2 mL/min–15 L/min), accuracy ±1% (some sources ±1.5%), pulse/analog outputs, 250:1 turndown — VERIFIED https://uk.rs-online.com/web/p/flow-sensors/1366375 ; https://flowmeters.co.uk/product/atrato-ultrasonic-pulse-analog-flow-meters/
- Price: RS lists it but no price in snippet; typically £700–£1,100 (~SAR 3,300–5,200) — ESTIMATE. Requires cutting the pipe → **reference instrument only, not retrofit.**

### A.7 Badger Dynasonics DXN (portable hybrid) & TFX-500w (fixed)
- DXN: DTTSU small-pipe transducer OD 12–60.3 mm; transit-time + Doppler; 50 readings/s — VERIFIED https://www.manualslib.com/manual/1592002/Dynasonics-Dxn-Series.html?page=25
- DXN price $7,885–$10,775 (Instrumart, 12-week lead) — VERIFIED https://www.instrumart.com/products/38784/dynasonics-dxn-ultrasonic-flow-meter
- TFX-500w fixed clamp-on: used eBay $719.99 — VERIFIED https://www.ebay.com/itm/266938425853 ; new ≈ $1,500–2,000 — ESTIMATE.
- **Over budget; excluded.**

### A.8 Chinese TDS-100 family (same OEM ecosystem as TUF-2000)
| Model | Form | Transducer / range | Outputs | Power | Price | Tag |
|---|---|---|---|---|---|---|
| TDS-100H | handheld, battery | S1 DN15–100 / M2 DN50–700 / L1 DN300–6000; ±1% >0.6 ft/s, repeat. 0.2%, lin. 0.5% | RS232, datalogger 2,000 lines, OCT | 3×AA NiMH ~10 h | amazon.com $600–$900 (varies) ESTIMATE; **amazon.sa HARAY TDS-100H listed** (price not in snippet) | VERIFIED https://www.amazon.sa/-/en/HARAY-Ultrasonic-Flowmeter-TDS-100H-Portable/dp/B0C9LFJ9RL ; spec https://cdn.kempstoncontrols.com/files/54b61470e2f5cada21cd0bc73579d248/TDS-100H.pdf |
| TDS-100M | module (like TUF-2000M) | S2 DN15–100 | isolated RS485 Modbus, 4-20 mA (0.1%), OCT, relay; 3× 4-20 mA inputs | 8–36 VDC | amazon.com Graigar TDS-100M-S2 ≈ $250–$350 ESTIMATE; eBay TDS-100M-M1 | VERIFIED listing https://www.amazon.com/Graigar-TDS-100M-S2-Ultrasonic-0-59-3-93in-Transducers/dp/B07C8ML9JF ; manual https://www.scribd.com/document/469904901/TDS-100M-manual |
| TDS-100F | wall-mount IP57 | S2/M2/L1 | RS485 Modbus, 4-20 mA, OCT, relay | 8–36 VDC or 90–245 VAC | amazon.com Graigar TDS-100F-S2 ≈ $350–$500 ESTIMATE; Alibaba $150–$300 ESTIMATE | VERIFIED https://www.amazon.com/Graigar-Ultrasonic-TDS-100F-S2-DN15-100mm-Wall-Mount/dp/B07NQDLZ67 ; manual https://www.intech.co.nz/wp-content/uploads/Intech-Manual-TDS-100F-Ultrasonic-flow-meter-2.pdf |
| TUF-2000H | handheld | TS-2/TM-1/TL-1 | RS232/OCT | battery | **amazon.sa TAKOIL TUF-2000H SAR 502.50** (DN50-700 kit; small-probe variant exists) | VERIFIED https://www.amazon.sa/-/en/TAKOIL-TUF-2000H-Hand-held-Strengthened-Ultrasonic/dp/B0BLS2K6MS |
- Also on amazon.sa: "ZPLuz Portable Ultrasonic Flow Meter … Smallprobe" and "TUF-2000H Handheld with TM-1" — VERIFIED https://www.amazon.sa/-/en/ZPLuz-Portable-Ultrasonic-PipeDiameterTemperature-Smallprobe/dp/B0CS26M5KR ; https://www.amazon.sa/dp/B0D31K4PQB
- Materials: same list as TUF-2000M (PVC yes, PPR not named) — ESTIMATE for PPR.
- Docs: Intech NZ / ecefast NZ host clean English manuals for TDS-100F/TUF-2000 — VERIFIED (URLs above). Quality: OK.
- Returns: amazon.sa 15 days — VERIFIED https://www.amazon.sa/-/en/gp/help/customer/display.html?nodeId=GKM69DUUYKQWKWX7 ; AliExpress buyer protection (refund if not delivered ~75 days) — VERIFIED https://affordablething.com/aliexpress-saudi-arabia/

### A.9 "Hedland", "DIGITEN", "Q&T"
- **Hedland** (Badger brand) = inline variable-area meters, not ultrasonic clamp-on — VERIFIED https://www.badgermeter.com/products/meters/variable-area/hedland/ . Not applicable.
- **DIGITEN** — sells inline hall-effect turbine sensors and totalizer displays; no clamp-on ultrasonic product found — NOT FOUND (ultrasonic). Same category as YF-S201 (reference only).
- **Q&T (qtmeters.com)** — Chinese maker of small-pipe clamp-on ultrasonic with integrated LCD; specs/prices not in reach — VERIFIED existence https://www.qtmeters.com/products/ultrasonic-flow-meter/clamp-on-ultrasonic-flow-meter.html ; price NOT FOUND (ESTIMATE $150–$400 via Alibaba).
- **Flomec QMP20 (QStar)** — portable clamp-on ½"–4", 2 MHz, datalogger; price on quote (~$2.5k–3.5k ESTIMATE) — VERIFIED https://www.globaltestsupply.com/product/flomec-qmp20-qstar-clamp-on-ultrasonic-flow-meter . Over budget.
- **Micronics U1000** — fixed clamp-on ¾"–8", "inexpensive" (~£600–900 ESTIMATE); **Katronic KATflow 100** DN10–3000, quote only — VERIFIED https://clamponflow.com/products/micronics-ultraflo-u1000-clamp-on-flow-meter/ ; https://www.katronic.com/products/stationary-ultrasonic-flow-meter-katflow-100/ . Both plausibly SAR 2,500–4,500 landed — ESTIMATE, above budget.

### A.10 Cheap inline references for the demo only (require cutting pipe — NOT for retrofit)
- **YF-S201** hall turbine, G½", 1–30 L/min, 5–18 V, pulse (~7.5 Hz per L/min), ±10% raw (calibratable to ~±3%) — VERIFIED listing https://www.amazon.sa/-/en/HALJIA-YF-S201-Counter-Control-Flowmeter/dp/B073VJPQ9W (amazon.sa; price not in snippet; ESTIMATE SAR 20–45). Also on amazon.eg. ESTIMATE accuracy.
- YF-B-series brass ¾"/1" variants and FS200A-DN15 — VERIFIED https://www.amazon.com/YF-S201-Effect-Sensor-Plastic-Irrigation/dp/B0H9D8P7RS ; KSA price ESTIMATE SAR 40–80.
- Sensus / mechanical water meters (multi-jet DN15–DN25, class B/R80): SAR 60–150 at SACO/plumbing shops — ESTIMATE; **gravimetric bucket + scale is a better and cheaper primary reference** (Task D).

### A.11 Draft comparison table (DN15–DN50 water)
| Candidate | Clamp-on? | Pipe range | PVC / PPR | Min velocity | Accuracy | Outputs | Power | Price (USD → SAR, ex-VAT) | KSA availability | Fit vs budget |
|---|---|---|---|---|---|---|---|---|---|---|
| TUF-2000M + TS-2 | Yes | DN15(25)–100 | PVC yes / PPR likely | 0.03 m/s | ±1% | RS485 Modbus, OCT, 4-20 mA | 8–36 VDC | $100–$210 → SAR 375–790 | amazon.sa (via TUF-2000H kits), AliExpress ships to KSA | **Best value** |
| TDS-100M / TDS-100F + S2 | Yes | DN15–100 | same | ~0.03 m/s | ±1% | RS485 Modbus, 4-20 mA, OCT, relay | 8–36 VDC | $150–$500 → SAR 560–1,900 | amazon.com/AliExpress; not seen on amazon.sa | Within budget (F = IP57 housing) |
| TDS-100H / TUF-2000H handheld | Yes | DN15–100 (S1/TS-2) | same | ~0.03 m/s | ±1% | RS232, logger | battery | SAR 502 (amazon.sa TUF-2000H) | **amazon.sa** | Within budget; no Modbus → survey/reference only |
| Keyence FD-Q10C/20C/32C | Yes (dry) | ø13–44 mm | resin yes | ~0.1 L/min class | ±1% rdg | 4-20 mA, NPN/PNP, IO-Link | 24 VDC | $560–$960 → SAR 2,100–3,600 | grey market only | Over budget (~1.5–2×) |
| Micronics U1000 | Yes | ¾"–8" | plastic yes | 0.1 m/s | ±1–3% | pulse/4-20 mA/Modbus opt. | 24 VDC | ~$800–1,200 → SAR 3k–4.5k | quote | Over |
| Sonotec CO.55 | Yes (tubing) | ¼"–1⅜" tubing | flexible only | 20 mL/min | ±1% | RS485 Modbus, analog | 24 VDC | $3,000 → SAR 11k | no | Excluded |
| Flexim F401/F721 | Yes | DN6–6500 | yes | 0.01 m/s | ±1% | all | 24 VDC/AC | $5k–15k | Dubai office | Borrow only |
| Siemens FS230 | Yes | ≥0.5" | yes | 0.3 m/s spec | ±0.5–1% | all | 24 VDC/AC | $7k–12k est. | KSA distributors | Borrow only |
| Badger DXN | Yes | OD 12–60 mm (DTTSU) | yes | low | ±1% | logger/4-20 | battery | $7.9k–10.8k | no | Excluded |
| Bürkert FLOWave | **No** (inline) | DN15–50 | n/a | — | ±0.4% | analog/digital | 24 VDC | $9.6k–15.9k | no | Excluded |
| Titan Atrato 760 | **No** (inline) | ½" | n/a | 0.1 L/min | ±1% | pulse/analog | 8–24 VDC | ~£700–1,100 | RS export | Reference only |
| YF-S201 | **No** (inline) | G½" | n/a | 1 L/min | ±3–10% | pulse | 5 V | SAR 20–45 | amazon.sa | Demo reference only |

---

## Task B — TUF-2000M + TS-2 / TM-1: Saudi pricing & availability

| Channel | Finding | Tag |
|---|---|---|
| **amazon.sa** | No exact "TUF-2000M-TS-2" module listing surfaced in search. Related listings found: TAKOIL **TUF-2000H** handheld **SAR 502.50** (B0BLS2K6MS); HARAY TDS-100H (B0C9LFJ9RL, price not in snippet); ZPLuz portable "Smallprobe" (B0CS26M5KR); TUF-2000H with TM-1 (B0D31K4PQB). Seller ratings not visible in snippets. Return window 15 days. | VERIFIED (URLs above) / seller rating NOT FOUND |
| **noon.com** | No ultrasonic flow-meter listing surfaced (search returned only RS485 modules on noon). | NOT FOUND |
| **amazon.com (ships to KSA via AmazonGlobal for many sellers)** | Many TUF-2000M-TS-2 listings: B0CN2YQ4SB, B07Y88YCYY (VTSYIQI, with adapter), B0DGXYG692, B0D4PS36M2, B0FP5132YH, B00DF48OUQ. Prices not in snippets; historical band $180–$320 for host+TS-2. Import via AmazonGlobal adds ~SAR 60–120 shipping + 15% VAT (duty 0% for instruments in practice). | VERIFIED listings; prices ESTIMATE |
| **AliExpress** | TUF-2000M-TS-2: **$100.70** (item 32518776067, "62% off"); TUF-2000M-TM-1: **$98.05** (32449762433); another TS-2 kit **$208.50** free shipping (store 1945084). Ships to KSA: yes; standard 15–30 days, DHL 5–9 days at +SAR 55–180. Buyer protection refund if not delivered. | VERIFIED https://www.aliexpress.com/item/32518776067.html ; https://www.aliexpress.com/item/32449762433.html ; https://affordablething.com/aliexpress-saudi-arabia/ |
| **Alibaba** | TUF-2000M: $65–128 (MOQ 1); RS485/Modbus variant $135/set (1–49), $100 (≥50); module $80–100 (MOQ 2); another $255–325 (MOQ 5). Shipping to KSA by express typically $40–80 for 1.5 kg. Trade Assurance covers non-delivery/spec mismatch. | VERIFIED https://www.alibaba.com/product-detail/TUF-2000M-Cheap-price-module-ultrasonic-60644088142.html ; https://www.alibaba.com/product-detail/TUF-2000M-RS485-Modbus-Ultrasonic-Flow_1749852634.html ; shipping ESTIMATE |
| **eBay** | TUF-2000M-TS-2 module listing 183729300865; TUF-2000M waterproof DN25-100 TS-2 226854439068. Prices not in snippet (band $150–$250). | VERIFIED listings; price ESTIMATE |
| **Saudi electronics/instrument shops** | Anaum.sa (test & measurement, Riyadh) — no ultrasonic flow meter in catalog snippets; Rakan Electronics / Etqan / Khalifa Electronics — hobby components, no flow meters. | NOT FOUND |
| **Landed cost (TS-2 kit)** | AliExpress $100–210 → SAR 375–790 + VAT 15% (SAR 56–118) + optional DHL SAR 55–180 → **SAR 430–1,090 landed**. Amazon.sa handheld route SAR 502.50 (VAT incl.). | ESTIMATE from VERIFIED inputs |
| **Customs/VAT** | 15% import VAT on CIF value applies to all shipments (no de-minimis for VAT); customs duty waived for personal shipments < SAR 1,000, and many electronics/instruments are 0–5% duty anyway. | VERIFIED https://dutydecoder.com/saudi-arabia/duty-free-threshold/ ; https://www.stackry.com/duties-and-taxes/saudi-arabia |
| **Transducer note** | TS-2 sold by several sellers as DN25–100 (not DN15). For DN15–DN20 PPR, expect marginal signal; DN25/DN32 fine. | VERIFIED (listing titles) / ESTIMATE |

---

## Task C — RS485 interface for ESP32 (3.3 V)

| Option | Chip / logic | Works at 3.3 V? | Isolation | Direction control | Price (KSA) | Tag |
|---|---|---|---|---|---|---|
| Generic MAX485 module (blue, 8-pin) | MAX485 @5 V | Marginal: VIH min 2.0 V so ESP32 3.3 V TX usually drives it; **RO output is 5 V → needs divider/level shifter to ESP32 RX**. Power at 5 V. | none | manual DE/RE (tie together, drive from GPIO; ESP-IDF `UART_MODE_RS485_HALF_DUPLEX` toggles RTS) | amazon.sa: Aihasd 6-pc **SAR 53.61**; JZK 5-pc **from SAR 37**; single MAX485CSA module B07N6NZCJ6 (price not in snippet, ~SAR 15–25); noon 3-pc / 1-pc generic (price n/a) | VERIFIED https://www.amazon.sa/-/en/Aihasd-MAX485-Converter-Module-Arduino/dp/B017KNMVYM ; https://www.noon.com/saudi-en/3pcs-max485-ttl-to-rs485-converter-module-for-arduino-esp32-raspberry-pi/Z2122DF581E1E16D49E51Z/p/ ; 3.3 V caveat VERIFIED https://mischianti.org/interface-arduino-esp8266-esp32-rs-485/ |
| MAX3485 module (3.3 V native) | MAX3485 / SP3485 | Yes, native 3.0–3.6 V | none | manual DE/RE | amazon.sa: KNACRO MAX3485 3.3 V 1-pc (B07V5LND1T) & 2-pc (B07V3JQRZB), prices not in snippet (~SAR 25–45 ESTIMATE); KIZMIQ 5-pc **SAR 331** (overpriced); noon MAX3485 module listing (price n/a) | VERIFIED listings https://www.amazon.sa/-/en/KNACRO-RS485-TTL-Overvoltage-protectionWith/dp/B07V5LND1T ; https://www.noon.com/saudi-en/max3485-rs485-module-for-serial-parallel-and-multi-machine-communication/Z06FE5FB963FC75B2FF72Z/p/ |
| Auto-direction module (no DE/RE) | MAX13487 / SP3485 + hardware auto-flow, 3.3–5.5 V | Yes | none | automatic | amazon.sa Youmile 2-pack 3.3/5 V "from SAR 115.20" (Shenzhen KSA, FBA); amazon.com Teyleten 5-pc / Taidacent MAX13487 ~$8–12; AliExpress $2–4 | VERIFIED https://www.amazon.sa/-/en/Youmile-Adapter-Module-Converter-Arduino/dp/B08BZ8274M ; https://www.amazon.com/Taidacent-MAX13487-Converter-Serial-Automatic/dp/B0CF4JB65D |
| Isolated module (single-chip "isolated TTL↔RS485", 3–5.5 V) | e.g. TD521S485H / UT-M3485 / generic "isolated industrial" | Yes | 2.5–3 kV | mostly automatic | amazon.com 10-pc B08JVG6KZV (~$25–35); ut-m3485 3.3 V B093VQ4C93; AliExpress ~$4–8 each; not found on amazon.sa/noon | VERIFIED listings https://www.amazon.com/Module-Signal-Converter-Isolated-Industrial/dp/B08JVG6KZV ; KSA NOT FOUND |
| DFRobot Gravity DFR0845 active isolated RS485↔UART | ADM2483-class + isolated DC-DC | Yes (3.3/5 V) | 3000 VDC | automatic | **$19.90** DFRobot; also Arrow/Newark; KSA: import only (~SAR 75 + ship + VAT ≈ SAR 150–200) | VERIFIED https://wiki.dfrobot.com/dfr0845/ ; https://www.dfrobot.com/product-2392.html |
| ADM2483 / ISO3082 bare ICs | ADI iCoupler / TI | ADM2483: 5 V bus side, 3.3 V logic side OK; ISO3082: 5 V | 2.5 kVrms | manual DE/RE | ADM2483 from $8.76 (DigiKey) — module rare | VERIFIED https://www.analog.com/en/products/adm2483.html ; https://www.ti.com/product/ISO3082 |
| M5Stack Isolated RS485 Unit | isolated, Grove | Yes | yes | automatic | ~$10–15 (m5stack shop, imports) | VERIFIED https://shop.m5stack.com/products/isolated-rs485-unit |

**Recommendation for ESP32 3.3 V, one TUF-2000M on a few metres of cable, mains-fed 24 V PSU in same box:**
1. **Primary: DFRobot DFR0845 (isolated, auto-direction)** — galvanic isolation protects the ESP32 from the meter's isolated RS-485 port ground offsets and PSU faults; no DE/RE code. Cost ≈ SAR 150–200 landed. ESTIMATE.
2. **Budget/local fallback: MAX3485 3.3 V module (KNACRO, amazon.sa)** with DE/RE tied to one GPIO (or use ESP-IDF RS485 half-duplex mode), 120 Ω termination at the meter end only, common GND, add TVS (SM712) if cable > 3 m. Cost ≈ SAR 25–45.
3. **Avoid** plain 5 V MAX485 unless you add a level shifter on RO — it "usually works" but is out of spec and has burned ESP32 pins in practice. ESTIMATE (community consensus).
- Saudi hobby shops that exist (for pickup): Rakan Electronics (Riyadh, same-day delivery) https://rakanelectronics.com/ ; Etqan Electronics https://etqan.sa/?lang=en ; Khalifa Electronics (Dirah, Riyadh) https://khalifaelectronics.com/ — VERIFIED existence; RS485 stock/prices NOT FOUND (sites blocked). "Electronic Bay", "Sensor Lab", "Sara Store", "Bluerobotics KSA", "rk electronics", "kitsguru" (Indian) — NOT FOUND as KSA sellers.

---

## Task D — Other BOM items with Saudi prices (VAT-inclusive marketplace prices)

| Item | Spec | Source / price | Tag |
|---|---|---|---|
| 24 VDC PSU 1–2 A | 12 V 2 A wall adapter also acceptable for TUF-2000M (8–36 V) | amazon.sa universal 12 V 2 A adapter **from SAR 18.99**; 12 V adapters SAR 19.97–89.99; Amazon's Choice SAR 33 | VERIFIED https://www.amazon.sa/-/en/Universal-adapter-100-240v-supply-charger/dp/B08F7X7KLR ; https://www.amazon.sa/-/en/power-adapter-12v/s?k=power+adapter+12v |
| 24 V DIN-rail / MEAN WELL LRS-50-24 | 24 V 2.2 A | amazon.sa: not surfaced; amazon.com $15–25; local electrical shops (Riyadh Batha) SAR 60–120 | ESTIMATE |
| DC-DC buck 5 V for ESP32 | LM2596 module | amazon.sa **SAR 27** (basic) … SAR 75 (UIOTEC w/ display); 10-pack SAR 137.92 | VERIFIED https://www.amazon.sa/-/en/Converter-3-0-40V-1-5-35V-Supply-Module/dp/B07R3S5T6W ; https://www.amazon.sa/-/en/UIOTEC-Converter-Step-Down-Regulator-Stabilizer/dp/B074LWWGB9 |
| ESP32 dev board | ESP-WROOM-32 | amazon.sa from **SAR 20.71**; ESP32 + 2.8" display SAR 47.67 | VERIFIED https://www.amazon.sa/-/en/esp32/s?k=esp32 ; https://www.amazon.sa/-/en/ESP-WROOM-32-ESP32-Development-Display-Module/dp/B0G38CL38S |
| IP65/IP67 enclosure | ABS 125×125×100 mm | amazon.sa LeMotech IP67 **SAR 95.74**; smaller 100×68×50 IP65 (LeMotech/Zulkit 2-pk) ~SAR 35–60 ESTIMATE; YXQ 100×100×70 IP65 | VERIFIED https://www.amazon.sa/-/en/LeMotech-Waterproof-Dustproof-Electrical-Enclosure/dp/B075X1GY7M ; https://www.amazon.sa/-/en/LeMotech-Dustproof-Waterproof-Electrical-Transparent/dp/B07C97HXX8 |
| Ultrasonic couplant | Phase II UTG1000-C 3 oz — **SAR 98** (Anaum.sa); Aquasonic 100 250 mL ultrasound gel on amazon.sa (price n/a, ~SAR 40–70 ESTIMATE) | VERIFIED https://anaum.sa.com/products/phase-ii-utg1000-c ; https://www.amazon.sa/-/en/Aquasonic-Ultrasonic-250ml-Ounce-Dispenser/dp/B0837LH4SL |
| Silicone grease alternative | Arctic Hayes 100 g tube; WEICON 450 g | amazon.sa listings (price n/a, ~SAR 25–45 / SAR 90) | VERIFIED https://www.amazon.sa/-/en/Arctic-Hayes-Silicone-Grease-100g/dp/B07VZ6746G ; price ESTIMATE |
| Stainless hose clamps | worm-drive set | amazon.sa hose clamps **from SAR 44.99** (set); SACO singles SAR 3–8 | VERIFIED https://www.amazon.sa/-/en/hose-clamp/s?k=hose+clamp ; SACO ESTIMATE |
| Pipe straps 25/32 mm | SS 304 U-strap | amazon.sa "pipe clamp" category; ~SAR 20–40 per 10 | VERIFIED category https://www.amazon.sa/-/en/pipe-clamp/s?k=pipe%20clamp ; price ESTIMATE |
| PPR pipe DN25 & DN32 | PN20, 4 m bars (ASK / Al-Munif) | Youmats lists ASK P25 and 25 mm×4 m; prices not in snippet. Global band $0.40–0.80/m (25 mm), $0.70–1.20/m (32 mm); KSA retail SAR 12–20 per 4 m bar (25 mm), SAR 20–32 (32 mm). Fittings SAR 2–8 each. | VERIFIED listings https://www.youmats.com/en/plumbing/pipe-and-fittings/ppr-pipes-and-fittings/ppr-pipes ; prices ESTIMATE |
| PVC pipe 1" / fittings | uPVC class | SACO / building shops SAR 8–15 per 3 m; fittings SAR 2–6 | ESTIMATE |
| Ball valve 1" | brass | amazon.sa REVALVED ½" listed; 1" brass at SACO/plumbing shops SAR 25–45 | VERIFIED ½" listing https://www.amazon.sa/-/en/REVALVED-Full-Port-Brass-Valve/dp/B07P136P2D ; 1" price ESTIMATE |
| 20 L water container | HDPE jerry can | noon **SAR 85** (heavy-duty w/ tap); amazon.sa 20 L HDPE listings (B07QRT8G7H); Youmats SARCO factory cans (bulk) | VERIFIED https://www.kanbkam.com/sa/en/jerry-can-20l-...Z961D3FD8740EB277EF77Z ; https://www.amazon.sa/-/en/Jerry-Can-Heavy-Duty-Plastic/dp/B07QRT8G7H |
| 1–2 L measuring jug | Sunnex PP 1 L | **SAR 8.23** (kanbkam/Souq history); amazon.sa Sunnex 1 L listing; SS 1 L jug also listed | VERIFIED https://www.kanbkam.com/sa/en/sunnex-1-liter-measuring-jug-10309476 ; https://www.amazon.sa/-/en/Sunnex-Measuring-Jug-1-Litre/dp/B018Q6T34I |
| Kitchen scale 5 kg/1 g | gravimetric reference | amazon.sa **from SAR 19.40** (5 kg/1 g); range SAR 19.99–44 | VERIFIED https://www.amazon.sa/-/en/Digital-Kitchen-Scale-5kg-5000g/dp/B07NDP2W7W |
| Wiring / jumper wires | 22 AWG | amazon.sa jumper wire kits SAR 17.61–47.99 | VERIFIED https://www.amazon.sa/-/en/jumper-wires/s?k=jumper+wires |
| DIN terminals | screw/WAGO 2-pos | amazon.sa: not surfaced; local electrical shops SAR 2–4 each, 35 mm DIN rail SAR 10/m | ESTIMATE |
| Telegram bot | — | Free (Bot API) | VERIFIED (public) |

**BOM subtotal (demo rig, excluding meter):** ≈ SAR 450–700 (adapter 19–33 + buck 27 + ESP32 21–48 + RS485 25–200 + enclosure 60–96 + couplant 40–98 + clamps 45 + PPR/PVC/fittings 60–90 + valve 30–45 + jerry can 85 + jug 8 + scale 20–44 + wiring 20–30). ESTIMATE built from VERIFIED unit prices.
**Total with TUF-2000M-TS-2 via AliExpress (SAR 430–1,090 landed):** ≈ **SAR 900–1,800** — inside the < SAR 2,000 target. ESTIMATE.

---

## Task E — Borrowing: universities & distributors

### Universities
| Institution | Finding | Tag |
|---|---|---|
| **KFUPM** (Dhahran) ME Fluid Mechanics Lab | Has **GUNT HM 500 Flow-meter Trainer** which includes the **HM 500.05 ultrasonic flow meter** module (transit-time, inline in trainer circuit — not a clamp-on portable). Good calibration reference; loan unlikely (fixed bench). | VERIFIED https://me.kfupm.edu.sa/facilities-and-resources/thermo-fluid-sciences-group/fluid-mechanics-lab ; https://www.gunt.de/en/products/ultrasonic-flow-meter/070.50005/hm500-05/glct-1:pa-148:pr-897 |
| **KSU** (Riyadh) CE Hydraulics & Fluid Mechanics Lab | Orifice/venturi/pipe-loss benches; no ultrasonic meter mentioned. | VERIFIED https://engineering.ksu.edu.sa/en/hydraulics_fluid_mechanics_lab ; ultrasonic NOT FOUND |
| **KAUST** Core Labs | Equipment loan is **internal only**; fluid labs are imaging-focused (Splash Lab, High-Speed Fluids). | VERIFIED https://corelabs.kaust.edu.sa/services/equipment ; https://corelabs.kaust.edu.sa/ |
| **Imam Abdulrahman (IAU, Dammam)** Fluid Mechanics Lab | Gravimetric & volumetric hydraulic benches (useful as reference method); no ultrasonic meter listed. | VERIFIED https://www.iau.edu.sa/en/colleges/college-of-engineering/labs-and-equipment/basic-engineering-laboratories/fluid-mechanics-laboratory |
| **Umm Al-Qura** ME Fluid Mechanics Lab | Lab page exists; equipment detail not in snippet. | VERIFIED page https://uqu.edu.sa/en/mecheng/55454 ; ultrasonic NOT FOUND |
| KAU, Qassim, Taibah, Imam (Riyadh), PSU, Alfaisal | No lab page mentioning ultrasonic flow meters found. | NOT FOUND |
- Practical route: approach KFUPM ME lab (HM 500 bench) or IAU (gravimetric bench) for a **one-day calibration session** rather than a loan. ESTIMATE.

### Distributors / OEM offices in KSA (demo/loan candidates)
| Company | Role | Contact / notes | Tag |
|---|---|---|---|
| **Endress+Hauser Arabia** | OEM sales & service (Prosonic Flow 91W/93T clamp-on) | HQ Al Khobar; offices Riyadh, Jeddah; service base Jubail. Demo pool not stated. | VERIFIED https://www.endress.com/en/endress-hauser-group/endresshauser-at-a-glance/worldwide-network/saudi-arabia |
| **KROHNE Saudi Arabia** (+ MoU with Saudi Sensing) | OEM (OPTISONIC 6300 clamp-on) | KSA site + Dubai service hub (Expo City). | VERIFIED https://www.krohne.com/en-sa/company/krohne-saudi-arabia ; https://www.krohne.com/en-sa/company/news/krohne-signs-mou-with-saudi-sensing-... |
| **Flexim Middle East** | OEM (FLUXUS) | DWC Business Center, Dubai South, UAE; rentals via partners (no KSA rental page). | VERIFIED https://www.oilandgasdirectory.com/profile/details/33006/FLEXIM-Middle-East.html ; KSA rental NOT FOUND |
| **IICS – Industrial Instrumentation & Control Systems (Abunayyan Holding)** | Siemens/Schneider/Rockwell solution partner, Emerson distributor; Al Khobar | Could arrange SITRANS FS230 demo. | VERIFIED https://iics-sa.com/ ; https://www.abunayyanholding.com/en/portfolio/our-portfolio/industrial-instrumentation-control-systems-ltd.html |
| **Kanoo Energy KSA** | Instrumentation distributor incl. clamp-on & portable ultrasonic (SICK custody skids) | "in-line, wetted and clamp-on, portable" flow meters offered. | VERIFIED https://kanooenergy.com/ksa/process-solutions/instrumentation-and-controls/ultrasonic-flow-meter/ |
| **The Saudi Distributors Co. / Zamil Trade & Services** | Siemens electrical/automation distributors (Dammam, Riyadh, Jeddah) | Process-instrument demo not stated. | VERIFIED https://www.saudi-distributors.com/brand/siemens-supplier-saudi-arabia ; https://is.zamilts.com/service/siemens/ |
| **Saudi FAL** | Flow instrumentation supplier | Flow page exists. | VERIFIED https://www.saudifal.com.sa/flow.aspx |
| Bin Quraya | EPC contractor (oil & gas), not an instrument distributor | — | VERIFIED https://www.binquraya.com/ (not relevant) |
| Al-Rushaid | Manufactures instrumentation/wellhead products; no flow-meter distribution found | — | NOT FOUND |
| Petrogas, Nesma | No ultrasonic flow-meter distribution found | — | NOT FOUND |
| Anaum Trading (Riyadh) | Test & measurement e-shop (Extech, Hioki, Testo…); sells couplant gel; no ultrasonic flow meter in catalog snippets | — | VERIFIED https://anaum.sa.com/ ; flow meter NOT FOUND |
- **Demo/loan reality check:** OEMs (E+H, KROHNE, Siemens via IICS, Flexim ME) routinely lend portable clamp-on units (Prosonic 93T, OPTISONIC 6300P, FS230 portable, FLUXUS F401) for **1–2 week trials to prospective industrial customers**; a student/startup demo may be accepted if framed as a pilot with a purchase path. No public loan program found. ESTIMATE.

---

## Gaps / what could not be verified
- Live SAR prices on amazon.sa/noon for the exact TUF-2000M-TS-2 module, KNACRO MAX3485, Aquasonic gel, YF-S201, PPR bars (pages blocked; snippets lacked price).
- Seller ratings on amazon.sa / AliExpress stores.
- Explicit PPR compatibility statement from any clamp-on vendor (only "PVC/plastic").
- Keyence official KSA list price.
