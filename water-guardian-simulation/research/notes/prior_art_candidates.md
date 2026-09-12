# Prior-art audit — 8 hackathon candidates (2026-09-12)

Scope: commercial products, prior hackathon/GitHub/university work (Saudi/Gulf where found), papers, "is there a cheap obvious product", cheapest credible BOM in SAR (ESP32 owned), single biggest risk, blunt novelty verdict.

**Price caveat (fact):** amazon.sa and noon product pages are blocked by the network egress proxy in this session, so SAR prices below are (a) AliExpress/DFRobot/Amazon.com listing prices × 3.75, rounded up ~20–40% for KSA shipping/markup, or (b) typical KSA maker-store prices from memory. Treat as ±30% until someone opens amazon.sa. Verdict labels: COMMON / SOMEWHAT NOVEL / NOVEL-IN-CONTEXT / NOVEL.

Component reference prices used throughout (est. SAR, landed in KSA):

| Part | Source price | Est. SAR |
|---|---|---|
| YF-S201 ½" hall flow sensor | $3–5 AliExpress; ~$9 Amazon.com | 15–35 |
| YF-B5 brass ¾" flow sensor | $6–9 AliExpress | 30–45 |
| YF-S401 low-flow 0.3–6 L/min | $7.99 AliExpress (aliexpress.com/item/1005003121026133.html) | 30–40 |
| 12 V NC solenoid ½"/¾" plastic | $4–8 AliExpress; Amazon.com ~$12 | 25–45 (plastic), 60–90 (brass) |
| Motorized ball valve ¾" 12 V CR-02/CR-05 brass | $12.66 AliExpress (item 32790289540) | 55–80 |
| XKC-Y25 non-contact liquid sensor | $3–5 AliExpress; ~$10 Amazon.com | 15–40 |
| JSN-SR04T waterproof ultrasonic | $4–6 AliExpress | 20–40 |
| ESP32-CAM (+CH340 MB board) | $7 (makeradvisor "$7 ESP32-CAM"); listed on amazon.sa (B07WCFGMTF, B08SL9H8RR 3-pack) | 35–60 |
| MLX90614 GY-906 BAA | $6–10 AliExpress; ~$15 Amazon.com | 30–60 |
| SHT31 breakout | $3–5 | 15–30 |
| 4×50 kg load cells + HX711 kit | $8–12 Amazon.com (Degraw B075Y5R7T7) | 35–60 |
| SEN0189 turbidity (DFRobot) | $9.90 DFRobot | 40–60 |
| Analog pH kit (generic PH-4502C) | $8–15 AliExpress; DFRobot Pro $64.90 | 40–70 (generic) / 250 (DFRobot) |
| 12 V mini diaphragm pump | $5–10 | 25–45 |
| Tipping-bucket rain gauge (XS-RS03 / DFRobot Gravity) | $15–25 AliExpress; DFRobot ~$30 | 70–120 |
| 5 V relay module, 12 V PSU, wire, box | — | 30–60 |

Tariff fact for SAR-estimates (NWC residential 2026): blocks SAR 1 / 4 / 6 / 6 per m³ + 50% sewerage + 15% VAT (saudiutilityhub.com NWC calculator; my.gov.sa water bill calculator). So wasted water at top block costs ≈ SAR 10.35/m³ all-in.

---

## A. Overflow Guardian (sensor on tank overflow pipe + inlet shutoff)

**Commercial products**
- Tank overflow *alarms* are a commodity: Swarn Jal WL-A/RA5F wireless overflow alarm (India, ~₹1,500 ≈ SAR 70); PagKis "overhead tank overflow alarm bell" listed on amazon.sa (B00O16G16Q); Swarn Jal AquaSense overfull/empty 4-level alarm listed on amazon.sa (B09QGX6N5T); YoLink LoRa float alarm on amazon.sa (B0C3KXCY8B). All alarm only — none shuts the inlet.
- Whole-house leak shutoffs: Flo by Moen (~$559 ≈ SAR 2,100), Phyn Plus (~$579 ≈ SAR 2,170), AquaTrip AT301 (inline flow-timer shutoff, ~$500+), Grus AquaNet valve. All sit on the *pressurised main*, need a plumber, and don't know about the tank's float valve specifically.
- "Smart float valve" (عوامة ذكية) sold in KSA (alsaffar-electric.com) is just a level-sensing float switch for pump control, not float-valve-failure detection.
- Patents: US9399571B2 "Overflow valve prevention system" (mechanical backup float); Justia class 340/616 overflow alarms. Nothing found that instruments the overflow pipe itself as the failure signal.

**Prior projects**
- Dozens of ESP32/Blynk "smart water tank" repos (github: pasindulekamwasam/Smart-Water-Tank-Monitoring-System, Pro-282/IoT-Water-Level-Monitor-and-Control, abderrahman-laid/ESP32-Water-Monitoring-System) — all level-based (ultrasonic/float) + pump control. MDPI Water 14(3):309 (2022) "IoT-Based Solutions to Monitor Water Level, Leakage, and Motor Control for Smart Water Tanks" is the closest academic version (level + inlet/outlet flow comparison).
- No Saudi/Gulf project found that puts a flow/presence sensor in the *overflow pipe* and closes the inlet — but level-sensor-based overflow prevention with a solenoid is a standard student project.

**Cheap obvious product?** Yes for the alarm (SAR 50–150 overflow alarm), and the SAR 20 answer is "replace the float valve". No cheap product does *detect failure → auto-shutoff → litres/SAR → Telegram*.

**Novelty: SOMEWHAT NOVEL.** The framing (overflow pipe = zero-risk, unpressurised, cuttable sensing point; detecting *float-valve failure* rather than "level high") is a genuinely nicer retrofit than the level-sensor crowd and fits the Saudi roof-tank/ground-tank reality. The parts and logic are commodity.

**Cheapest credible BOM (SAR):** YF-S201 in overflow line 25 (or XKC-Y25 clamp-on 25 — no cutting, but presence only, no litres) · ¾" 12 V NC plastic solenoid on inlet 40 (motorized ball valve 70 if you want fail-open/low-pressure) · relay + 12 V PSU + box + PVC fittings 60 · ESP32 owned. **≈ SAR 125–170** (solenoid) / **≈ SAR 160–200** (ball valve).

**Biggest risk:** YF-S201 needs ≥1 L/min and mostly-full pipe to register; overflow pipes run gravity-fed, partly filled, at whatever the float valve leaks — a dribble may never spin the turbine (false negatives). Mitigate with XKC-Y25 / a small U-trap section so the pipe fills, or a tipping bucket. Second risk: an NC solenoid on the inlet fails *closed* on power loss → tank runs dry; use NO valve or motorized ball valve.

---

## B. AC condensate harvesting meter

**Papers (Saudi/Gulf) — strong**
- Jeddah: window AC 8 h/day → 8,725 L/yr; split AC → 20,614 L/yr (Heavy metals & microbial assessment of AC condensate in Jeddah, 2024, researchgate 381486379). Older Jeddah popular write-up: harvestingrainwater.com (2010).
- Dhahran: split systems yield 1.26–2.50 kg/ton per cooling-degree-day (Desalination 2014, S0011916414002586 "Condensate as a water source from vapor compression systems in hot and humid regions", KFUPM).
- Rule of thumb: 0.6–0.92 L/h per ton in humid climates; a 2-ton unit >2 L/h (researchgate 333015165).
- Qatar: institutional building in Doha, >6 million L/yr potential (TAMU Qatar thesis, oaktrust).
- Social acceptance/quality: Sciencedirect S2666016423002906 (2023).
- UAE: Gulf News "Recycling AC waste water" — Dubai contractors already pipe condensate to irrigation in big buildings.

**Commercial products**
- Large-building condensate recovery is standard MEP practice (Dubai green building code requires it for big buildings); products are plumbing (condensate pumps, tanks), not meters. No consumer "condensate meter" found. Nothing Saudi-branded found.

**Prior projects**
- Generic ESP32 flow/level projects; no Gulf hackathon project found that *meters* condensate. Search for a Saudi "تجميع مياه المكيفات" device returned only articles/papers.

**Cheap obvious product?** A bucket under the drain pipe. Metering is the only new bit, and cheap: YF-S401 or a tipping bucket.

**Novelty: NOVEL-IN-CONTEXT (weak).** The yield science is done (KFUPM/KAU), reuse is practiced in Gulf commercial buildings; a residential *dashboard of litres/day* + pump-to-garden is new-ish as a consumer product but is a thin layer. Judges may ask "so what — the AC makes the water anyway".

**Cheapest BOM (SAR):** YF-S401 35 (condensate drips at 0.5–3 L/h — below YF-S401's 0.3 L/min = 18 L/h minimum → **use tipping bucket**, 90) · 20 L jerrycan 25 · 12 V diaphragm pump 35 · float switch 10 · relay/PSU/box 40. **≈ SAR 200** with tipping bucket; SAR 150 if you accept a float-switch-only volume estimate.

**Biggest risk:** Flow is a drip (~10–50 mL/min) — every hall-effect turbine sensor reads zero. Only a tipping bucket or load cell under the tank measures it honestly. Also, in Riyadh (dry) yield is ~1 L/day, so the demo only works in Jeddah/Dammam humidity.

---

## C. Meter-dial night-flow leak detector (camera reads existing NWC mechanical meter)

**Prior projects — this one is essentially already built**
- jomjol/AI-on-the-edge-device (github, thousands of stars): ESP32-CAM reads digits + analogue dials on water/gas/power meters, on-device CNN, MQTT → Home Assistant. Hackaday coverage Feb 2021. IJERT review "Digital Transmission of Conventional Water Meter using ESP32-CAM". Home Assistant then does night-flow alerts trivially.
- Night-flow ("minimum night flow") is the standard utility leak-detection method; every smart water monitor (Flume, Bluebot, Aqualeak) ships it as a feature.

**Commercial**
- Flume 2: $199 (≈ SAR 750), magnetic clamp on the meter, no plumbing — direct competitor to the concept. Bluebot clamp-on ultrasonic ~$200+. Phyn Plus $579, Flo by Moen $559 (inline). LeakBot (UK, insurer-distributed, 5 mL/min). None sold locally in KSA; Flume only works on US magnetic-register meters, so *not* usable on NWC meters.
- NWC context: >2 million smart meters installed (constructionweekonline), i.e. a large share of urban connections are already AMI — the target market is the *remaining* mechanical meters (peri-urban, older buildings, sub-meters inside buildings). NWC's own smart meters already give night-flow data.

**Cheap obvious product?** For smart-meter customers, NWC's app. For mechanical meters, AI-on-the-edge (SAR 50 hardware, free firmware).

**Novelty: COMMON.** Only the localisation (NWC meter face templates, Arabic/Telegram alert, SAR tariff) is new. Fine as a 1-day build, bad as a "novelty" pitch.

**Cheapest BOM (SAR):** ESP32-CAM 45 · white LED + resistor 3 · 3D-printed/PVC meter-cap enclosure 20 · 5 V PSU 15. **≈ SAR 85.** (ESP32 owned is not enough — it must be the CAM variant.)

**Biggest risk:** Optics/lighting on a fogged, outdoor, sun-baked NWC meter dome (glare, condensation, 50 °C) — AI-on-the-edge users report most failures are camera focus/alignment, not the NN. Second: the "star wheel" low-flow indicator is tiny and blurred at 2 MP; night flow of 5–20 L/h may need >30 min of frame differencing.

---

## D. RPW pheromone-trap photo counter

**Papers — dense**
- Enhanced YOLOv5 for adult *Rhynchophorus ferrugineus* counting in traps, 93.8 % (PMC10455671, 2023). "A Deep-Learning Model for Real-Time RPW Detection and Localization" (J. Imaging 8(6):170, 2022; dataset stats table on researchgate 361514987). Automatic pest counting from pheromone trap images (Matsucoccus, PMC8068825) — same pipeline. Review of camera-equipped traps: Preti et al., J Pest Sci 2021 (10.1007/s10340-020-01309-4).
- Saudi/Gulf: "Smart Palm" IoT framework (KSU, arXiv 1910.00653 / Agronomy 2020); thermal-imaging RPW detection (Sci Rep 2025, s41598-025-32783-4); acoustic larval detection (arXiv 2308.15829, several KSA groups); aerial/street-view detection (arXiv 2104.02598). UAE attractant-combination trap trials (PMC11049854). So Gulf academia is heavily in RPW — but mostly *tree* detection (acoustic/thermal), not *trap counting*.

**Commercial**
- Trapview (Slovenia) camera trap $650 (≈ SAR 2,440) + from €10/ha/yr subscription; Semios (~10,000 camera traps deployed, quote-only); FarmSense FlightSensor $299/yr subscription; Pessl iSCOUT (quote). None has a published RPW bucket-trap product; these are sticky-card/delta-trap cameras for moths. RPW bucket traps (with water + dates + ferrugineol lure) are sold in India for ~₹300–600 (agribegri, utkarshagro) ≈ SAR 15–30; lures ~SAR 15–40. KSA MEWA/Weqaa distribute traps free to farmers.
- Weqaa (NCPD) runs a national RPW programme and a Ministry app for reporting; no evidence found of a Weqaa camera-trap pilot.

**Cheap obvious product?** Manual counting during the fortnightly lure change — which Weqaa already mandates. A phone photo + model replaces a 30-second count. The value is the *GPS heat-map*, not the count.

**Novelty: NOVEL-IN-CONTEXT.** The CV problem is solved in the literature; a *field-deployable phone app for the Saudi bucket trap + Weqaa heat-map* is not found anywhere. Bucket-trap images (weevils floating in dark water with dates) are visually distinct from published sticky-trap datasets — you will need to shoot your own ~200 images.

**Cheapest BOM (SAR):** phone app only: SAR 0 + bucket trap 30 + lure 30 = **≈ SAR 60**. Fixed version: ESP32-CAM 45 + LED 5 + solar/battery 60 + trap 60 = **≈ SAR 170**.

**Biggest risk:** No public dataset of RPW *bucket-trap* images; captured weevils are wet, overlapping, half-submerged, and mixed with dates/debris — counting accuracy in the demo depends entirely on whether you can get real trap photos (Al-Ahsa/Qassim farm) before the hackathon. Without them it is a slide, not a demo.

---

## E. Seedling survival audit (QR/NFC tag + photo CV + NDVI)

**Commercial**
- Veritree (Canada): ground + remote sensing + blockchain ledger; ~$0.43/tree via GoodAPI, enterprise otherwise. Pachama, Restor (free platform), Treeconomy (UK, LiDAR/satellite MRV), Plant-for-the-Planet **TreeMapper** (free, open-source app: geotag, photo, re-measure). Farmers for Forests (India) QR-coded 100,000 trees with an app (medium.com). Frontier Tech Hub "Project Sapling" geotag app (Sierra Leone).
- Paper: "Low-cost AI-powered MRV for growing trees with smallholders" (bioRxiv 2023.11.29.569237) — aluminium QR tags + farmer phone photos + AI-assisted human verification. This is the idea, published.
- Saudi: SGI cites "GeoTag monitoring"; Riyadh Green has a citizen portal to sponsor/geotag municipal trees; CST "SpaceUp — Greening Saudi Arabia" challenge (satellite-based). NCVC's own MRV method is not public. UAV afforestation monitoring in arid environments, 44,000 seedlings, 90 % (ScienceDirect S2590123026018256, 2026) — close, drone-based.

**Prior projects:** no Gulf hackathon project found; the international ones above cover it.

**Cheap obvious product?** TreeMapper (free) + Excel. Yes.

**Novelty: COMMON (app) / SOMEWHAT NOVEL (arid-shrub alive/stressed/dead classifier).** Alive/dead classification of *desert seedlings* (Acacia, Ziziphus, Prosopis at 30–60 cm, in sand, at noon) has no public dataset; that classifier is the only defensible new piece, and Sentinel-2 at 10 m cannot see individual seedlings — NDVI only works at site scale after 2–3 years.

**Cheapest BOM (SAR):** printed QR on aluminium tags: Alibaba custom metal QR tags ~SAR 1–3 each at 100+ (alibaba 1600437020203); laminated paper QR SAR 0.2. 100 tags + zip ties **≈ SAR 150–300**. No electronics.

**Biggest risk:** Ground truth. Without an NCVC/SGI site and a few hundred labelled seedling photos, the CV is untestable, and volunteers won't re-visit tagged seedlings in 45 °C. Product risk, not technical.

---

## F. Feast surplus bin → food bank (load-cell bin at wedding halls)

**Commercial**
- Winnow Vision (UK; quote-only, typically £2–5k/yr per kitchen), Leanpath (US; quote-only), Kitro (CH; from €369/month ≈ SAR 1,500/month incl. device), Orbisk (NL; subscription). All are camera+scale bins for *prep/plate waste analytics*, not donation logistics. Bloomberg 2024 overview.
- Saudi: Etaam/Saudi Food Bank already collects from 466 wedding halls (Arab News); Li Tadum (national programme, MEWA) reduced FLW index 33.1 % → 27.9 %; Barakah app (surplus meal deals). Wastech.sa (smart waste bins, Saudi). No Saudi product found that *weighs surplus at the hall in real time and pages Etaam*.

**Prior projects:** many "smart trash bin ESP32 + HX711 + Firebase" papers/repos (e.g. ResearchGate 393629341, 2025); Oregon State household food-waste smart bin; SOILAB Hackathon (Sharjah 2023) smart waste-tracking app; GitHub topic food-waste has dozens of hackathon repos. So the *bin* is common.

**Cheap obvious product?** A SAR 80 platform scale + WhatsApp message to Etaam. Yes.

**Novelty: COMMON (hardware) / SOMEWHAT NOVEL (surplus-for-donation trigger tied to Etaam pickup SLA).** The interesting version is software: halls declare expected surplus by weight & time, Etaam routes a van — the load cell is theatre. Food-safety window (2–4 h hot-hold) matters more than grams.

**Cheapest BOM (SAR):** 4×50 kg cells + HX711 kit 50 · plywood/aluminium platform 40 · 60 L bin 40 · ESP32 owned · PSU/box 30. **≈ SAR 160.**

**Biggest risk:** 4×50 kg half-bridge bathroom-scale cells drift with temperature and creep under sustained load; a 60 L bin of rice at 40 °C outdoors gives ±1–2 kg noise, and the cells need a rigid frame or readings jump. Beyond the hackathon, Etaam won't dispatch on a sensor without a human confirming.

---

## G. Mosque ablution greywater reuse controller

**Papers — heavy, incl. Saudi**
- Riyadh mosques: "Simple system for handling and reuse of gray water from ablution in Mosques of Riyadh City" (KSU, researchgate 283328281). Systematic review of ablution greywater reuse (Applied Water Science 2025, 10.1007/s13201-025-02488-0); review of treatment methods (Water Conserv Sci Eng 2025, 10.1007/s41101-025-00357-0); techno-economic analysis for toilet flushing (researchgate 330669187); IIUM Malaysia treatment study (286129916).
- **IoT versions exist:** Isvahady et al., J. Aceh Physics Society — turbidity filtration + IoT automatic pumps/faucets for wudhu recycling (jurnal.usk.ac.id/JAcPS/article/view/27790). "AIoT-based smart greywater reuse for urban irrigation" (ScienceDirect S2772375525005192, 2025) — ESP32 + water-quality sensors. UTHM SmartWUDHU' (2015) and Eco-Masjid (hydroponics + fish on ablution water); ReWudhuk device.
- Also: MEWA/Ministry of Islamic Affairs have run ablution-water reuse pilots at mosques; several KSA mosques already irrigate with ablution water.

**Commercial:** Hydraloop (~$6–10k unit ≈ SAR 22–37k + install), Aqualoop (commercial NSF 350), Greyter (indoor toilet flushing). All far above a mosque garden's needs; a simple filter+tank+pump costs SAR 1.5–3k.

**Cheap obvious product?** A float switch + timer + submersible pump (SAR 150). Yes. Turbidity/pH add "monitoring" but the pump doesn't need them.

**Novelty: COMMON.** Malaysia/Indonesia have done the exact IoT version; KSU did the Riyadh reuse study. Only value-add would be a standardised Saudi mosque *dashboard* (m³ reused per mosque for the Ministry) — that's a data product, not a sensor.

**Cheapest BOM (SAR):** SEN0189 turbidity 50 · generic pH kit 60 · float/level (XKC-Y25 or float switch) 20 · 12 V pump 35 (real garden needs a SAR 150–300 submersible) · relay/PSU/box 40. **≈ SAR 205** (bench) / **≈ SAR 400** (with a real pump).

**Biggest risk:** Cheap pH probes need calibration and die in weeks; SEN0189 is a light-through-water sensor that fouls with soap film and reads garbage after a few days. The "monitoring" will be visibly wrong in a 48-hour demo unless you fake stability. Also shar'i/ministry acceptance of reuse is a stakeholder question, already answered positively in the literature.

---

## H. Seedling water-stress IR thermometer (MLX90614 CWSI)

**Papers — the exact device is published**
- "Water Stress Index Detection Using a Low-Cost Infrared Sensor and Excess Green Image Processing" (Sensors 23(3):1318, 2023) — MLX90614-based CWSI. "A Smart CWSI-Based IoT Solution for Precision Irrigation of Wine Grape" (Sensors 24(1):25, 2024) — MLX90614 wireless sensor network, RMSE <1 °C. "CWSI for Hazelnuts Using Low-Cost Infrared Thermometers" (Sensors 24(23):7764, 2024). CWSI itself is Idso/Jackson 1981.
- Date palm/CWSI work exists (KSA/UAE, thermal cameras on palms), but nothing found on *offshoots/seedlings* with MLX90614.

**Commercial:** Arable Mark 2 $1,595 + $699/yr (≈ SAR 6,000 + 2,600/yr); Phytech (dendrometers, subscription, quote); Saturas (stem water potential, quote). All orchard-scale, none for nursery seedlings.

**Prior projects:** generic "MLX90614 + ESP32" tutorials (microcontrollerslab.com); no Gulf hackathon project found.

**Cheap obvious product?** Soil moisture probe (SAR 5–15) tells you the same thing for an irrigated seedling, more reliably. Yes.

**Novelty: SOMEWHAT NOVEL (application to SGI/NCVC arid seedlings & date offshoots); COMMON as a device.**

**Cheapest BOM (SAR):** MLX90614 45 · SHT31 25 · small pole/gimbal 20 · box/PSU 30 · ESP32 owned. **≈ SAR 120.** Handheld version ("point at seedling, get stress score") is the same BOM.

**Biggest risk:** Physics. MLX90614 has a 90° FOV (BAA) — on a 20-cm seedling it sees mostly hot sand (60 °C+) and the reading is meaningless; you need the BCC/DCI narrow-FOV variant (~SAR 120–200) and a fixed distance, plus CWSI's wet/dry baselines which must be calibrated per species and VPD. In Saudi midday sun, leaf–air differential is dominated by wind and radiation, not water status. High chance of a demo that shows noise.

---

## Cross-cutting notes

- Saudi hackathon landscape checked: SWA **Miyahthon 2025** (13 winners: SMI, Ratq, Smart Core, AquaVolt, VibraFlow, Mezan, AquaTwin, NuPlasTec, Hesn, Smart Green Solutions, HYDROMINE, Earth Pulse, Innovation Door) — none obviously overlaps A/B/C from names alone; "Mubtakeron" hackathon (293 innovators); my.gov.sa Water Hackathon. Descriptions of individual teams not retrievable this session.
- Only ideas with no existing product *in this form*: A (overflow-pipe instrumented shutoff) and D (bucket-trap counter + heat map). C and G are the most "already done" (C by jomjol, G by Malaysia/Indonesia + KSU).
- A is the only one with an immediate SAR number the judge can feel: a stuck float valve on a 2 m³ roof tank at ~10 L/min wastes ~14 m³/day ≈ SAR 145/day at the top NWC block incl. sewerage + VAT.
