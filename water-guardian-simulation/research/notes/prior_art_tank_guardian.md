# Prior-art scan — "Tank Guardian" combined concept (2026-09-13)

Concept under test: retrofit device for roof/ground water tanks that
(a) meters flow / water presence in the **overflow pipe** to detect and quantify float-valve failure,
(b) infers consumption / leak from the **tank level slope between refills** ("virtual flow meter", refill masked),
(c) **auto-closes the tank inlet** (solenoid/motorised valve) and alerts the owner with **litres + cost**.

Method: web search (EN/AR/patents/products/papers/GitHub). Direct fetches of patents.google.com, mdpi.com, researchgate.net, waltr.in and psecommunity.org were blocked by the egress proxy — those entries rely on search snippets/abstracts and are marked (snippet). Treat as an inference-grade scan, not a formal FTO search.

## Hits

| # | Item | What it does | a | b | c | Prices loss? | Country / price | URL |
|---|---|---|---|---|---|---|---|---|
| 1 | **CN2549401Y** – Water tank leakage alarm of solar water heater (utility model, ~2003, snippet) | When float valve is damaged/does not seal, water goes via the **overflow pipe into a detection box**; a level sensor in the box triggers an **alarm and closes the cold-water inlet valve**. Presence detection only, no flow metering. | ✔ (presence) | ✘ | ✔ | ✘ | China | https://patents.google.com/patent/CN2549401Y/en |
| 2 | **US20030145371A1** – Tank leak detection and reporting system (snippet) | Toilet tank: monitors flow through inlet valve / refill tube to the overflow pipe and **refill time** to detect leaks; reports. | partial (refill-tube flow) | partial (refill timing ≈ loss rate) | ? | ✘ (reports leak, not cost) | US | https://patents.google.com/patent/US20030145371A1/en |
| 3 | **AlGhamdi & Sharma 2022**, Processes 10:2462 – IoT-Based Smart Water Management for Residential Buildings in **Saudi Arabia** (snippet/abstract) | Tank **level sensor → cloud**; ML classifier detects tank **leakage from level/usage data** (100% acc, 4.63% error vs usage data); GSM/GPRS **motor control**. | ✘ | ✔ (level-derived leak; refill = pump events) | motor control, not inlet valve | ✘ | KSA | https://www.mdpi.com/2227-9717/10/11/2462 |
| 4 | **MDPI Water 14:309 (2022)** – IoT solutions to monitor water level, leakage and motor control for smart water tanks (snippet) | Level monitoring, **leakage detection from level behaviour**, motor control, overflow alert. | overflow **level** alert only | ✔ | motor, not inlet valve | ✘ | — | https://www.mdpi.com/2073-4441/14/3/309 |
| 5 | **US6178569B1 / US20030154542 / US20150247584A1** – toilet overflow control / tank level alarm / flood prevention device (snippets) | Water contacts or float at overflow level → **solenoid closes inlet**; alarm. High-level detection, not overflow-pipe flow. | ✘ (level, not pipe) | ✘ | ✔ | ✘ | US | https://patents.google.com/patent/US6178569B1/en |
| 6 | **US20050242966** – Vessel liquid overflow detector | Detects overflow in a vessel; alarm. | ✔ (presence) | ✘ | ✘ | ✘ | US | https://patents.justia.com/patent/20050242966 |
| 7 | **US7536900** – Leak detector using liquid-level fluctuation rates (snippet) | Detects tank leak from **level fluctuation rate** (dual fixed-point flow-rate unit), 6 orders of magnitude; alarm. Industrial. | ✘ | ✔ (level slope = leak rate) | ✘ | ✘ | JP/US | https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7536900 |
| 8 | Classic UST leak-detection family (US4453400, 4604893, 4630467, 4679425, 4972710, 5347849, EP0278678) | Static **level-change leak rate** with temperature compensation, tank at rest (no consumption). | ✘ | ✔ (static test only, no consumption masking) | ✘ | ✘ | US/EU 1980s | https://patents.google.com/patent/EP0278678A3/en |
| 9 | **Walnut Innovations** (Udaipur) automatic / semi-automatic **water level & overflow controller** | Sensor probes in tank; **switches pump OFF at full** (and ON at low). No valve, no metering, no leak logic. | ✘ | ✘ | pump cut-off (≠ inlet valve) | ✘ | India ~₹2,199 | https://walnutinnovations.com/product/semi-automatic-water-level-controller/ |
| 10 | Indian overflow alarms (Swarnjal Model A-RI, SMTECH, KJM circuit board, IndiaMart voice alarms) | Buzzer when high-level probe wetted. | ✘ | ✘ | ✘ | ✘ | India ₹300–1,500 | https://swarnjal.com/product/model-a-ri/ |
| 11 | **Flosenso** (India) smart tank monitor | Level monitoring, overflow alerts, pump automation; blog states float-valve overflow wastes thousands of litres/month. | overflow by level | partial (usage stats) | pump | litres-level messaging, not per-event cost | India | https://www.flosenso.com/blog/why-you-should-say-goodbye-to-the-outdated-water-tank-overflow-alarm/ |
| 12 | **Waltr** (India) water monitor & pump controller (fetch blocked) | Tank level + consumption analytics + pump control. | ✘ | partial | pump | ? | India | https://www.waltr.in/ |
| 13 | **AquaTrip** (AU) | Pulse flow meter on **mains inlet** + integrated shut-off; trips on continuous flow. | ✘ | ✘ (true meter) | ✔ (mains) | ✘ | AU ~A$400–900 | https://www.aquatrip.com.au/ |
| 14 | **Flo by Moen / Watts LeakSmart / Phyn** | Whole-house mains flow/pressure sensing + motorised shut-off; app alerts; Flo shows gallons & cost. | ✘ | ✘ | ✔ (mains) | ✔ (usage $) | US $200–500 | https://shop.moen.com/pages/flo-smart-water-monitor |
| 15 | **Bluebot / Hydrific Droplet** | Clamp-on ultrasonic mains meter; usage in litres and **dollars**, leak alerts; no valve (Bluebot), no tank. | ✘ | ✘ | ✘ | ✔ | US $199–300 | https://www.bluebot.com/ |
| 16 | **LeakBot** (HomeServe) | Thermal (Thermi-Q) mains leak inference; no valve, no tank. | ✘ | ✘ | ✘ | ✘ | UK | https://leakbot.io/ |
| 17 | GitHub ESP32 tank monitors (rolandort/water-tank, simoncocking/tank-monitor, abderrahman-laid/ESP32-Water-Monitoring-System, circuitdigest guide) | Ultrasonic level → Home Assistant; some flag "litres falling unusually fast with no outlet running"; relay for pump/solenoid. | overflow by level | ✔ (hobby-grade slope) | relay | ✘ | OSS | https://github.com/rolandort/water-tank |
| 18 | Arabic market (tskuw.com High-Flow float, alwabelstore Fast Float Evo, alsarh smart float) | Mechanical/electronic **replacement** float valves; "smart" = electronic float switch with thresholds. No overflow metering, no analytics. | ✘ | ✘ | float itself | ✘ | KW/KSA SAR 50–400 | https://tskuw.com/ |

Not found: "GulfTankSense", "PagKis overflow alarm", "Waterwatch tank" — no results under those names (treat as non-existent or unindexed).

## Answers

**1. Does anything combine a+b+c?** No single product/patent/paper found combining all three. Closest five:
1. CN2549401Y — a(presence)+c. No metering, no level slope, no cost.
2. AlGhamdi & Sharma 2022 (KSA) — b (ML leak from level) + motor control. No overflow sensing, no inlet valve, no cost.
3. MDPI Water 14:309 — b + overflow-by-level alert + motor. No pipe sensing, no valve, no cost.
4. Flo by Moen — c (mains) + cost. No tank, no overflow, no level.
5. Flosenso / GitHub ESP32 monitors — overflow-by-level + crude slope leak flag + pump relay. No overflow-pipe metering, no cost.

**2. Overflow-pipe flow metering as float-failure signal?** Overflow-pipe *presence* sensing is prior art (CN2549401Y detection box; US20050242966; toilet refill-tube monitoring US20030145371A1). Overflow-pipe **flow metering** (rate/volume, i.e. quantifying how badly the float has failed and how many litres went to drain) was **not found** in any product or patent. Closest is US20030145371A1 measuring refill-tube flow/timing in a toilet. Differentiation: metering rather than switching, plus classification of failure severity (drip vs full-bore).

**3. Level slope as consumption/leak flow meter with refill masking?** Level-rate leak detection is well established: UST static tests (1980s), US7536900 (fluctuation-rate leak detector), and the two 2022 IoT papers derive leakage from level with pump events as context. Hobby repos flag "level falling fast with no known outlet". What is **not** explicitly found: (i) treating the slope as a continuous *consumption* meter for the household (a "virtual flow meter" reported in L/h), (ii) explicit **masking of refill/pump/inlet windows** and reconciling inlet flow vs level rise to isolate leak vs use, and (iii) combining that with overflow-pipe volume so that *total* loss = overflow litres + abnormal-slope litres. Refill masking is an obvious engineering step, so expect an examiner to call it routine.

**4. Are Indian "water level controllers with overflow cutoff" the same product?** No. They are **pump controllers**: probes in the overhead tank stop the *pump* when full (and start it when low). They act on the supply side (motor), not on a mains/inlet valve; they have no overflow-pipe sensor, no level analytics, no litres/cost, and are useless where the tank is fed by mains pressure through a float valve (Gulf case). Their overflow-prevention is "don't overfill by pump"; ours is "detect that the passive float valve itself has failed, quantify the loss, and close the inlet". Flosenso/Waltr add app analytics but still act on the pump.

**5. PRIOR_ART_RISK: MEDIUM.**
- **Not differentiated (each element alone is prior art):** overflow detection → close inlet (CN2549401Y, toilet patents); level-rate leak detection (UST patents, US7536900, 2022 papers); auto shut-off + litres/cost alerts (Flo, Bluebot); pump cut-off at full (India).
- **Differentiated (no hit found):** (1) metering *volume/rate* in the overflow pipe as a float-valve health signal and loss counter; (2) fusing overflow-pipe volume with refill-masked level-slope consumption into one litres-and-SAR loss figure per event; (3) retrofit on a mains-fed roof/ground tank with float valve (Gulf topology) rather than pump-fed or whole-house mains; (4) Arabic/Gulf tariff pricing of the loss. The novelty claim must be framed as the **combination + the overflow-pipe metering**, never as "overflow shut-off" or "level-based leak detection" alone, or a judge with search access will find CN2549401Y / AlGhamdi 2022 in minutes.
- Confidence: medium — several primary sources were unreadable (proxy), so claims rely on snippets.
