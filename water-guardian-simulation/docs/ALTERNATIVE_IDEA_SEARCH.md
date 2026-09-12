# ALTERNATIVE IDEA SEARCH — Is there a better entry than Water Guardian?

Date 2026-09-12 · Research + ideation + comparison only (nothing built). Evidence files: `research/notes/competition_deep.md`, `saudi_water_problems.md`, `saudi_ag_env_problems.md`, `makkah_partners.md`, `prior_art_candidates.md`.

Tag legend: **VERIFIED FACT** (official page text seen, URL) · **RESEARCH FINDING** (press/academic/secondary, URL) · **ENGINEERING INFERENCE** (our reasoning from facts) · **ASSUMPTION** · **UNVERIFIED**. Access caveat: most .gov.sa, news and journal pages were proxy-blocked from the research sandbox; "seen" means seen in a search-engine snippet of that page, and must be re-confirmed in a browser before it goes on a slide.

---

## STEP 1 — The competition, verified as far as possible

| Item | Finding | Tag |
|---|---|---|
| Name | "University Innovation Challenge" / «تحدي الابتكار الجامعي», MEWA Agency for Research & Innovation (وكالة البحث والابتكار). Same URL is also indexed as "Sustainability Innovation Challenge". https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/default.aspx | VERIFIED FACT (snippet) |
| Edition | 2nd edition announced 23 Apr 2026 at MEWA's Annual Innovation Forum through an MoU with **Makkah Region Development Authority** and **King Abdulaziz Endowment for Ain Al-Aziziah**. Edition 1 call ≈ mid-2025. https://sabq.org/article/z7TapB5 | RESEARCH FINDING |
| Tracks (official EN wording) | "three sectors: Environment (vegetation cover and afforestation), Water (water scarcity), and Agriculture (food waste)"; "distinct elements … desertification, water loss and grey water management, and the RPW control value chain". Application page variant: "Environment / Vegetation Cover & Afforestation – Water / Water Production – Agriculture / Food Waste". | VERIFIED FACT (snippet) |
| Water track text | "capturing wastewater from baths, sinks, and washing machines … alternative water source for non-potable uses … proper management of the distribution network to prevent leaks … collection, treatment, storage, distribution optimization"; "rationalization of consumption, developing alternative sources, supporting modern technologies". https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/WaterTopic.aspx | VERIFIED FACT (snippet) |
| Agriculture / Environment challenge statements (Arabic verbatim) | NOT FOUND | — |
| Eligibility / team | "Students from universities across KSA"; "each team consisting of 1 faculty member and 4-5 students"; "early-stage ideas on the Challenge's platform" → pilot projects. Teams per university, nationality, degree level: NOT FOUND. | VERIFIED FACT (snippet) / NOT FOUND |
| Evaluation criteria / rubric / weights | NOT FOUND | — |
| Prototype requirement | NOT FOUND (wording implies idea-stage entry that advances to a co-run pilot) | — |
| AI requirement | NOT FOUND — no AI mention anywhere on the UIC pages (unlike DCO "Future Makers", which is a different programme and mandates AI) | — |
| Submission format, deadline, prize/pilot funding | NOT FOUND | — |
| Previous winners / finalists | NOT FOUND. Candidates that surfaced (PNU "جود", KSU/KAU/Dar Al-Hekma) belong to the Ministry of Education's differently-named challenge; Oman's منافع projects are unrelated. | — |
| Training partner | Babson College (referenced on agriculture topic page) | RESEARCH FINDING |

**Name-collision warning:** three programmes share "تحدي الابتكار" (MEWA UIC; MEWA "للاستدامة" with Babson; MoE "للتنمية المستدامة"). Nothing below imports rules from the other two.

**Strategic reading of edition 2 (ENGINEERING INFERENCE):** the two co-signers are a Makkah regional authority and a Makkah water endowment. A proposal with a **named Makkah-region pilot site** and a **KPI in m³ or SAR** speaks their language. See `makkah_partners.md` for what those partners actually run.

---

## STEP 2 — Thinking like the judge

**Officially verified judging criteria:** none published (NOT FOUND).

**Strategic inference of what wins (ENGINEERING INFERENCE, from the track wording, the "pilot project" reward, and the MoU partners):**

1. **Track literalism.** The page names concrete elements (water loss, grey water, vegetation cover/afforestation, food waste, RPW value chain). A judge screening 100 idea-stage entries will map each to one of those words in seconds.
2. **Pilotability.** The prize is a co-run pilot. Ideas that name a site, an owner, an install method and a measurable KPI look "pilot-ready"; ideas that need a permit, a utility, or a farmer's trust look slow.
3. **A number.** "m³ saved per month per site", "% loss detected", "SAR/year" — computed from a Saudi source, not invented.
4. **Evidence they can see.** Something happens on the table.
5. **Cheapness as a feature.** MEWA wants scale across 100k mosques / 123k palm holdings / 1,200 planting sites. SAR 150 per node beats SAR 1,500.
6. **Not a repeat.** Smart-irrigation soil probes, tank-level alarms, smart wudu taps, acoustic RPW detectors and plant-disease photo classifiers are the five projects every Saudi judge has already seen (`saudi_ag_env_problems.md` §C, `saudi_water_problems.md` prior-art list).

**Scoring framework used in Step 12** (weights as requested): Problem importance 15 · Innovation 15 · Technical feasibility 15 · Demo/wow 15 · Saudi relevance 10 · Cost 10 · Build speed 10 · Measurable impact 5 · Scalability 5 = 100. Each sub-score is 0–max, justified in one clause.

---

## STEP 3 — Real Saudi problems (quantified)

Headline numbers, each with its source in the notes files:

**WATER**
- Non-revenue water historically 25–34 % in NWC networks; NWS 2030 target 15 % (RESEARCH FINDING).
- Qatrah: per-capita 263 → 150 L/day by 2030 (VERIFIED, waterworld/argaam). GASTAT household-metered 102 L/d (2023).
- Tariff 0.10 / 1 / 3 / 6 SAR/m³ tiers + 50 % sewer + 15 % VAT → a leak is billed at the marginal tier; a stuck float adding 60 m³/month ≈ **SAR 465/month** vs ≈ SAR 30 normal (RESEARCH FINDING + derived).
- NWC's defence: 2 M smart meters, ~36,000 "high consumption" SMS/week, reported 39 % consumption drop per alerted customer — monthly, reactive (RESEARCH FINDING).
- Every villa/mosque/school = ground tank + roof tank + float valves because supply is intermittent (some regions 2 days/week). Float failure "loses thousands of litres/day", usually at night. **No national statistic on overflow loss exists** (gap = opportunity).
- Mosques: ~100,000; 5.0 L per wudu, 3.1 m³/day per Riyadh mosque (KSU) → ≈ 110 M m³/yr ablution greywater nationally (derived); KAUST Smart-Tap already claims the "smart wudu tap" space; reuse installations (Green Mosques, 10 M trees) are civil works with no monitoring.
- Roof-tank quality: 40 % unsatisfactory, 80 % coliform (Alkharj study).
- Riyadh landscape: manual irrigation 23–33 L/m²/d vs 15 needed; evaporation 9.4–15.3 mm/d.
- Schools: 33,500; no per-student litres figure exists.

**AGRICULTURE**
- 37.6 M palms, 1.92 M t dates (GASTAT 2024). RPW on 53 % of farms in 2022, > US$400 M loss; 2025 campaign: 80 M inspections, 0.15 % infestation, 13.3 M palms geo-coded; norm 1 trap/100 palms → ≈ 376,000 pheromone traps serviced manually (RESEARCH FINDING + derived). Acoustic per-tree detection is crowded (Palmear, PalmOptical/KAUST, WeevilNet, ESP32 SNN paper); trap counting is not digitised.
- Food loss & waste 33.1 % → 27.9 %, 4 M t, SAR 40 bn/yr; vegetables 39.5 %; households 60 % of waste at weddings/Eid; Etaam runs late-night wedding-hall pickups.
- Agriculture uses 12.3 bn m³/yr, 9.36 bn m³ fossil groundwater; efficiency ~50 % vs 85 % — real but the most saturated student topic.
- Greenhouses: ~350 L/kg tomato vs 63–105 achievable.

**ENVIRONMENT**
- SGI: > 151 M trees planted, 500,000 ha; NCVC 141 M vs 400 M by 2030; 10 M trees at 1,200+ sites in 6 months. **No published seedling survival rate.** NCVC regulation requires proponents to state irrigation and "means of sustaining" cover.
- Rangelands 70 % degraded, mainly overgrazing; new grazing regulation Mar 2025.
- NCEC > 4,200 environmental reports H1 2025; 39,558 violations (SAR 531 M) in 2025; no tonnage for desert-camping litter.
- Asir fires: 807 VIIRS alerts Aug 2025–Aug 2026; Nuthur ML early warning exists.

---

## STEP 4 — What already exists (so we do not reinvent it)

Saturated (seen by every judge): ESP32 soil-moisture irrigation · Arduino tank-level alarm · smart wudu tap (KAUST Smart-Tap, Hawa, Dubai Tap, Malaysian SmartWUDHU') · acoustic RPW detector (≥ 6 papers, 3 companies) · PlantVillage-style disease classifier · beehive weight monitor · air-quality/dust node · "report litter" app · greenhouse climate dashboard.

Commercial reference points (details and prices in `prior_art_candidates.md`): Flume/Phyn/Moen Flo (after-meter leak, SAR 700–2,500, US plumbing) · Winnow/Leanpath/Orbisk (food-waste bins, thousands of SAR/month) · Trapview/FarmSense/iSCOUT (smart insect traps, SAR 3–10k each) · Treeconomy/Veritree/Restor (tree MRV, SaaS) · Hydraloop/Aqualoop (greywater units, SAR 15–40k) · Palmear (RPW acoustic probe).

---

## STEP 5 — 30+ ideas, problem first

Format: **name** — one line — first-reaction novelty (C = common, S = somewhat novel, N = novel in Saudi context) — cost band.

### WATER
1. **Overflow Guardian** — sensor and inlet shut-off on the tank **overflow pipe** (unpressurised, carries only wasted water) that quantifies litres/SAR and stops float-valve losses — N — < SAR 200.
2. **Meter-dial night-flow reader** — ESP32-CAM reads the existing mechanical NWC meter's low-flow wheel to flag continuous night flow with zero plumbing — S (OCR is common, leak-signature use is not) — < SAR 100.
3. **Mosque greywater reuse controller** — turbidity/age/level/pump controller + metering for existing ablution-water reuse tanks feeding trees ("Green Mosques data layer") — S — SAR 250–400.
4. **Ablution drain meter** — measure wudu greywater at the open drain (unpressurised) to give the imam litres/prayer and a leak baseline — S — < SAR 150.
5. **AC condensate harvester-meter** — collect, meter and pump AC condensate in humid cities as an "alternative source" for irrigation — S — SAR 150–300.
6. **School water audit node** — inlet + night-flow + ablution profile for 33,500 schools; fills a national data gap — S — SAR 200–600 (needs a flow meter).
7. **Tanker delivery verifier** — level-slope on the ground tank computes delivered m³ vs paid — S — < SAR 100.
8. **Roof-tank quality sentinel** — temperature/turbidity/free-chlorine node telling households when to clean — S — SAR 200–400.
9. **Pool/fountain evaporation-vs-leak discriminator** — level + weather model separates evaporation from leak — S — < SAR 150.
10. **Car-wash recycling compliance logger** — fresh vs recycled flow ratio for the NCEC 70 % rule — S — SAR 400+.
11. **Villa garden ET scheduler** — flow + soil + ET from open weather to halve manual over-irrigation — C — SAR 200.
12. **Sabeel cooler waste monitor** — drain/overflow and no-flow detection on public drinking-water coolers — N (context) — < SAR 150.
13. **Water Guardian (incumbent)** — clamp-on ultrasonic persistent-flow detector — S — SAR 900–1,800.

### AGRICULTURE
14. **RPW trap photo counter** — phone/ESP32-CAM photo of pheromone bucket trap → count → geo heat map for Weqaa — N (context) — < SAR 150.
15. **RPW trap weight counter** — load cell under the trap bucket infers catches by mass; no camera — N — < SAR 100.
16. **Feast surplus bin** — load-cell bin at wedding halls quantifies surplus and alerts Etaam in real time — S — SAR 150–250.
17. **Wholesale crate spoilage node** — temp/RH/ethylene proxy in tomato crates at wholesale markets — S — SAR 150.
18. **Date grading by phone CV** — size/cut/browning grading for small farms to reduce disorder loss — S — SAR 0 (phone).
19. **Yellow-sticky-trap counter** — CV count of whitefly on greenhouse sticky cards — C (papers exist) — < SAR 100.
20. **Greenhouse cooling-pad water optimiser** — pad wetting on demand from RH/temperature — S — SAR 200.
21. **Trunk-injection follow-up tracker** — QR on treated palms + photo timeline for re-inspection — S — < SAR 50.
22. **Date-store humidity logger** — cheap RH/temp in storage to cut the 24 % handling/storage loss — C — SAR 100.
23. **Livestock trough leak/overflow node** — same overflow logic on farm troughs — S — < SAR 150.
24. **Offshoot nursery moisture** — capacitive probes for palm offshoots — C — SAR 100.

### ENVIRONMENT
25. **Seedling survival audit** — tagged seedling + phone photo → alive/stressed/dead + site dashboard + NDVI check — N (context) — < SAR 100.
26. **Seedling irrigation compliance logger** — soil probe + timestamp on tanker-irrigated plots to catch missed rounds — S — SAR 150.
27. **Grazing intrusion camera trap** — ESP32-CAM + PIR on fenced restoration plots — S — SAR 120.
28. **Desert-litter hotspot mapper** — phone CV → NCEC report draft — C — SAR 0.
29. **Sand-on-road build-up sensor** — ultrasonic/laser profile of drift edge on roads — S — SAR 150.
30. **Juniper wildfire node** — smoke/temp LoRa mesh (Nuthur already researched) — C — SAR 250.
31. **Urban tree stress by leaf IR temperature** — MLX90614 CWSI proxy for street trees — S — SAR 120.
32. **Mangrove seedling tide/photo logger** — time-lapse survival at planting sites — S — SAR 120.
33. **Wadi check-dam level logger** — rain-harvest structure performance — S — SAR 150.
34. **Solar-panel dust deposition monitor** — proxy for dust storms — C — SAR 100.

---

## STEP 6 — The "why didn't someone think of this" pass

35. **Measure water where it is already separated.** Overflow pipes, ablution drains, condensate drains and cooler drip trays carry *only* wasted or free water at atmospheric pressure. Metering them is trivial (a SAR 20 hall sensor or a tipping bucket), needs no permit, and the number you get is *loss* directly — not consumption minus a guess. This single principle generates ideas 1, 4, 5, 12, 23. (Novel framing; components common.)
36. **AC condensate as the "water production" entry.** Every Saudi coastal building already makes distilled water all summer and drips it on the pavement. Meter it, store it, use it. Fits the "water production / alternative sources" wording exactly.
37. **Listen to the tank instead of measuring the pipe.** A SAR 5 piezo/contact mic on the tank wall hears the inlet hiss of a weeping float valve at night. A cheap proxy for the flow meter Water Guardian could not afford. (Risky, but a one-day experiment.)
38. **Weigh the trap, don't photograph it.** RPW traps fill with weevils and rain; mass over time plus a daily photo distinguishes them. Turns 376,000 manual checks into a threshold alert.
39. **Turn "trees planted" into "trees alive".** SGI counts planting; nobody publicly counts survival. A tag + photo + volunteer app makes survival the KPI — a data product, not a gadget.
40. **Feast rice as a signal.** 60 % of household waste happens at weddings; a bin that weighs itself and pings Etaam converts a social norm into a logistics trigger.
41. **Use the utility's meter as your sensor.** The NWC mechanical meter is already the most accurate flow instrument in the building; a SAR 40 camera reading its star wheel at 3 a.m. is a leak detector with zero plumbing.
42. **Let the caretaker's phone be the CV.** For trap counting, seedling audits and date grading, a phone photo uploaded to a small model beats any field camera on cost and maintenance; the ESP32 is optional.
43. **Greywater age, not greywater quality.** SBC 701's real constraint on reuse is holding time; a timer-plus-turbidity controller that dumps stale water is cheaper than any treatment and makes existing mosque reuse tanks code-compliant.
44. **One tank node, three claims.** Level slope = tanker verification, overflow flow = loss, temperature = cleaning reminder — one SAR 150 device serving three problems in the track's own words.

---

## STEP 7 — Aggressive filtering (kill list)

Killed, with the reason that killed them:

- **11 Villa ET scheduler, 19 sticky-trap CV, 22 store RH logger, 24 offshoot moisture, 30 wildfire node, 34 dust on panels, 28 litter mapper** — common student/commercial projects; no system-level twist.
- **10 Car-wash logger** — real rule, but niche, needs operator cooperation and a pressurised flow meter (same risk as Water Guardian).
- **6 School audit node, 13 Water Guardian** — depend on a pressurised-pipe flow measurement that is unverified/expensive (the very problem we are escaping).
- **7 Tanker verifier** — small money per household, weak track fit.
- **8 Roof-tank quality sentinel, 9 pool discriminator** — weak fit to "water loss / grey water" wording; chlorine sensors are expensive.
- **17 Crate spoilage, 20 cooling pad, 23 trough, 33 check dam, 29 sand road, 32 mangrove logger** — plausible but need a market/site we cannot reach in three weeks, or the number they produce is not obviously valuable.
- **18 Date grading, 21 injection tracker** — software-only; hard to make a visible demo; grading models need a dataset we do not have.
- **27 Grazing camera trap** — good, but plot access/permits and a demo that needs sheep.
- **31 Leaf-IR stress** — physics sound, but CWSI needs calibration per species; hard to prove in 3 weeks.
- **37 Tank microphone** — kept only as a one-day experiment inside idea 1; too uncertain to be the entry.
- **12 Sabeel cooler monitor** — merged into idea 1 (same node, Makkah framing) pending the partner research.
- **2 Meter-dial reader** — survives as a *module* of idea 1 (after-meter leak) rather than a standalone entry: OCR-on-meter is an existing open-source project, and many NWC customers now have smart meters.

Survivors to Step 8–12: **1 Overflow Guardian (+44 one-tank-three-claims, +2 meter module, +12 sabeel framing)**, **3/43 Mosque greywater reuse controller**, **5/36 AC condensate harvester-meter**, **14/38 RPW trap counter (photo or weight)**, **16/40 Feast surplus bin**, **25/39 Seedling survival audit**, **26 Seedling irrigation logger**, plus **Water Guardian** for the head-to-head.

---

## STEP 8–9 — Cost and time filters (survivors)

| Idea | Prototype cost (ESP32 owned) | Day-1 PoC | Week-1 prototype | Week-2 data | Verdict |
|---|---|---|---|---|---|
| Overflow Guardian | ≈ SAR 120–250 (YF-S201 or YF-B5 ≈ 20–60, 12 V NC solenoid ½"–¾" ≈ 25–60, relay/MOSFET 10, XKC-Y25 non-contact 25, 20 L bucket rig 85, PSU 20) | bucket + float + sensor on a table | full rig with float failure switch and valve | 24 h logs on 3–5 real tanks | ✅ |
| Mosque greywater controller | ≈ SAR 250–400 (turbidity SEN0189 ≈ 40–60, pH kit ≈ 60–120, level 25, 12 V pump 30–60, relay 10) | turbidity + pump on a bucket | two-tank rig | needs a real reuse tank (permission) | ⚠️ site-dependent |
| AC condensate harvester-meter | ≈ SAR 150–300 (tipping bucket or YF-S401 ≈ 25–50, pump 30–60, container 85, level 25) | bucket under a split AC drain | metered + pumped | litres/day on 3 ACs in humid weather | ⚠️ season/humidity-dependent |
| RPW trap counter | ≈ SAR 100–200 (ESP32-CAM ≈ 40–60, trap + lure ≈ 60–120 if bought, HX711 + load cell ≈ 25) | phone photos of a trap with 20 dead insects | counting model + map | needs real traps on a farm (weevils) | ⚠️ needs farm + weevils |
| Feast surplus bin | ≈ SAR 150–250 (4 × 50 kg load cells + HX711 ≈ 40–70, bin 60, ESP32) | bin weighs itself | alerts + dashboard | one wedding hall night | ✅ |
| Seedling survival audit | ≈ SAR 50–100 (tags) + phone | 30 tagged plants on campus | app + CV + map | need a planting site + weeks for mortality | ⚠️ slow evidence |
| Seedling irrigation logger | ≈ SAR 150 | probe on a pot | LoRa/Wi-Fi node | site-dependent | ⚠️ |
| Water Guardian | ≈ SAR 900–1,800 | — (meter not bought) | after meter arrives | unverified low-flow | ❌ cost + risk |

(Component prices: `prior_art_candidates.md`, marketplace snippets; VAT-inclusive bands.)

---

## Prior-art verdicts on the survivors (from `prior_art_candidates.md`)

| Idea | Verdict | Closest prior art | Note |
|---|---|---|---|
| Overflow Guardian | **SOMEWHAT NOVEL** | Overflow *alarms* (amazon.sa SAR 50–150), level+solenoid student builds, Flo/Phyn (SAR 2,000+, pressurised main) | Nobody found instruments the overflow pipe as the float-failure signal *and* closes the inlet *and* prices the loss. |
| AC condensate meter | **NOVEL-IN-CONTEXT (weak)** | KAU/KFUPM yield papers (Jeddah split AC ≈ 20,600 L/yr), Dubai building reuse | No consumer meter; a drip needs a tipping bucket, not a turbine. Riyadh ≈ 1 L/day — demo needs Jeddah/Makkah humidity. |
| Meter-dial OCR | **COMMON** | jomjol AI-on-the-edge-device; Flume 2, LeakBot | Killed as a standalone entry. |
| RPW trap counter | **NOVEL-IN-CONTEXT** | YOLOv5 adult-RPW counting papers (93.8 %); Trapview/FarmSense are moth sticky-trap systems | No bucket-trap product, no Weqaa pilot found; no public bucket-trap image dataset. |
| Seedling survival audit | **COMMON (app) / SOMEWHAT NOVEL (arid classifier)** | TreeMapper, Veritree, QR-tag MRV paper | Exists end to end; Sentinel-2 cannot see seedlings. |
| Feast surplus bin | **COMMON hardware** | Winnow/Leanpath/Kitro; many HX711 bins; Etaam already serves 466 halls | Value is routing software; charities will not dispatch on a sensor. |
| Mosque greywater controller | **COMMON** | Isvahady IoT ablution reuse, UTHM SmartWUDHU', AIoT greywater ESP32 (2025) | Cheap turbidity/pH probes foul with soap film within days. |
| Leaf-IR CWSI | **COMMON device** | Three MLX90614-CWSI papers; Arable | Wide FOV sees hot sand; a soil probe answers the same question. |

**Makkah partner reality (from `makkah_partners.md`, all REPORTED):** Ain Al-Aziziah is a *Jeddah* water endowment (pipeline from Wadi Fatimah/Khulais, wells, cisterns, sabeel coolers at the airport, tanker/bottle apps), not the Haram Zamzam operator. MPDA runs "أخضر مكة" (7.3–7.7 M trees) and 41 water projects. Resonant themes: cooler/sabeel logistics, ablution reuse, **AC condensate + greywater for tree irrigation**, spring/pipeline/tank integrity, Taif highland water.

---

## STEP 10 — The 60-second live demo, per finalist

**Tank Guardian (Overflow Guardian + level-slope)** — Demo wow **9/10**
Normal: 20 L clear tank on the table, float valve fed from a header bucket, ESP32 shows "NORMAL · consumption 0 L/min · overflow 0". → Judge presses the float lever (stuck float): water pours from the overflow pipe into a measuring jug, the overflow sensor ticks, screen counts litres and SAR live ("2.1 L lost · SAR 0.02 … at this rate SAR 145/day"), Telegram alert arrives on a phone, the inlet valve **clunks shut** and the pouring stops. → Judge opens the tank's outlet tap instead (a "running tap at 3 a.m."): the level trace slopes down, after 60 s (10× speed) the node reports "persistent consumption 1.8 L/min during QUIET" — the same rule engine as Water Guardian. → Close the tap: "resolved". Two failure modes, two detections, one SAR 150 node, visible water, an audible valve.

**AC Condensate Harvester-Meter** — Demo wow **7/10**
A small dehumidifier/portable AC drips into a tipping-bucket gauge on stage; the counter shows litres and "today: 3.4 L, this building/year: ≈ 20,000 L (KAU Jeddah figure)"; at 2 L the pump moves it to a planter. The wow depends on visible dripping, which a portable AC in an air-conditioned hall may not produce much of — bring a humidifier.

**RPW Trap Photo Counter** — Demo wow **6/10**
Judge photographs a real pheromone bucket trap containing dead weevils (obtained from a farm/Weqaa); the app counts them, tags GPS, and the map turns a farm cell orange; a second trap with many weevils turns it red and drafts a "بلّغ" report. Clear, but a photo-to-number demo is less visceral than water pouring.

**Feast Surplus Bin** (removed in Step 14) — 6/10: rice goes in, the scale climbs, an alert fires; judges have seen smart bins.

**Water Guardian (incumbent)** — 5/10 today (no meter; simulator only) / 8/10 if the clamp-on meter works on the demo pipe.

---

## STEP 11 — Measurability (how we would get the number before the competition)

| Idea | Number we can honestly produce in 2–3 weeks | How |
|---|---|---|
| Tank Guardian | litres lost per float-failure event; **detection time** (s) from float stuck to valve closed; **flow resolution** of level-slope method (L/min per 10-min window); false-alarm count over N nights on 3–5 real tanks; SAR/month avoided at the household's tier | Bench: induce failures 20× with a jug + stopwatch as reference. Field: install on 3–5 volunteer villa/mosque tanks for 7–14 nights, log overnight slope and any overflow. Tariff arithmetic from the published tiers. |
| AC condensate | L/day per split unit in Jeddah/Makkah vs RH; L/season per villa | Tipping bucket under 2–3 real ACs for 7 days with RH logging; compare with KAU published yield. |
| RPW trap counter | counting accuracy (MAE) vs manual count on ≥ 30 trap photos; minutes saved per trap round | Farm visit with Weqaa/farmer; photograph traps; manual counts as ground truth. |
| Water Guardian | as in `PHYSICAL_TEST_PLAN.md` — requires the meter first | — |

---

## STEP 12 — Top 10 scoring matrix (/100)

Weights: Problem 15 · Innovation 15 · Feasibility 15 · Demo 15 · Saudi 10 · Cost 10 · Speed 10 · Measurable 5 · Scalability 5.

| # | Idea | Prob | Innov | Feas | Demo | Saudi | Cost | Speed | Meas | Scale | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Tank Guardian** (overflow + level-slope + inlet valve + SAR) | 13 | 10 | 14 | 13 | 10 | 10 | 9 | 4 | 5 | **88** |
| 2 | Feast surplus bin → Etaam | 11 | 7 | 13 | 10 | 9 | 9 | 9 | 3 | 4 | 75 |
| 3 | AC condensate harvester-meter | 10 | 10 | 11 | 11 | 8 | 9 | 8 | 3 | 4 | 74 |
| 4 | RPW trap photo counter | 13 | 11 | 9 | 9 | 9 | 9 | 6 | 3 | 4 | 73 |
| 5 | Seedling irrigation compliance logger | 10 | 6 | 11 | 6 | 8 | 9 | 8 | 3 | 4 | 65 |
| 6 | Seedling survival audit | 12 | 6 | 8 | 6 | 9 | 10 | 6 | 2 | 5 | 64 |
| 7 | Mosque greywater reuse controller | 11 | 4 | 9 | 9 | 9 | 8 | 7 | 3 | 4 | 64 |
| 8 | Meter-dial night-flow OCR | 10 | 3 | 9 | 8 | 8 | 10 | 8 | 3 | 3 | 62 |
| 9 | Grazing intrusion camera trap | 9 | 6 | 11 | 7 | 8 | 9 | 8 | 2 | 3 | 63 |
| 10 | Leaf-IR seedling stress | 8 | 6 | 6 | 6 | 7 | 9 | 7 | 2 | 3 | 54 |
| — | **WATER GUARDIAN (as is)** | 12 | 6 | 7 | 8 | 9 | 3 | 4 | 3 | 4 | **56** |

Scoring notes (why, in one clause each):
- Tank Guardian: Problem 13 — tank architecture is universal in KSA and losses are billed at the top tier, but no national statistic exists (so 13 not 15). Innovation 10 — components common, the *where-to-measure* insight and the SAR-priced auto-shutoff are not found as a product. Feasibility 14 — every part is SAR 20–60 and unpressurised. Demo 13 — visible water, audible valve. Speed 9 — day-1 PoC realistic.
- Water Guardian: Feasibility 7 and Cost 3 because the SAR 600+ sensor is unverified at the flows that matter (our own report, §24); Speed 4 because the meter ships in 15–30 days; Innovation 6 because clamp-on leak monitoring is a known product category (Flexim, Flume) — the mosque scheduling logic is the only new part, and it transfers to Tank Guardian unchanged.
- RPW counter: Feasibility 9 and Speed 6 because it needs live weevils and a farm before there is anything to show; Innovation 11 because nobody digitises the bucket trap and MEWA literally names this value chain.
- Condensate: Innovation 10 for the "water production" framing; Feasibility 11 because it is season/city dependent.

---

## STEP 13 — Top 3 deep dives (new ideas: #1, #3, #4; the feast bin is examined and removed in Step 14)

### 13.1 TANK GUARDIAN

**ONE SENTENCE:** A SAR ≈ 150 retrofit node on any Saudi water tank that meters the overflow pipe, watches the level slope, shuts the inlet when the float valve fails, and tells the owner in litres and riyals what was lost and when.

**THE PROBLEM:** Because supply is intermittent, every villa, mosque and school stores water in a ground tank and a roof tank controlled by mechanical float valves. When a float sticks, network water runs straight to the overflow — often all night, for weeks — and is billed at the marginal tier (RESEARCH FINDING: 0.10/1/3/6 SAR/m³ + 50 % sewer + VAT). A running tap at night drains the roof tank and the pump silently refills it. The utility's only defence is a monthly "high consumption" SMS (36,000/week) after the water is gone.

**WHY SAUDI ARABIA CARES:** Qatrah's 263 → 150 L/day target is won or lost after the meter, in exactly this subsystem; NWS 2030 wants NRW at 15 %; the UIC water track literally says "water loss … distribution optimization … rationalization of consumption"; MIA logged 774 mosque utility-service violations in 2025 and spends SAR 408 M/yr on mosque O&M (RESEARCH FINDING). No Saudi study quantifies aggregate overflow loss — the pilot would produce the first number (ENGINEERING INFERENCE).

**WHO WOULD USE IT:** villa owners after bill shock; mosque caretakers/MIA O&M contractors; school facility managers; tanker-supplied households; Ain Al-Aziziah's cisterns and sabeel tanks (REPORTED).

**WHY CURRENT SOLUTIONS ARE INSUFFICIENT:** overflow alarms (SAR 50–150) only beep; level-only IoT projects do not know *why* the level moved; Flo/Phyn (SAR 2,000+) need a plumber on the pressurised main and are priced for US homes; NWC smart-meter SMS is monthly.

**THE INNOVATION (what we invented):** (1) measuring loss where it is already separated — the overflow pipe is unpressurised, cuttable and carries *only* wasted water, so a SAR 20 sensor gives a direct loss number; (2) using the tank itself as the flow meter — level slope between refills = consumption, so the persistent-flow logic we already built runs with no pipe sensor; (3) closing the loop with an inlet valve and a tariff-priced message. Individually common parts; the combination and the placement are not found as a product (SOMEWHAT NOVEL, `prior_art_candidates.md` A).

**HOW IT WORKS:** overflow sensor (hall turbine for gravity flow ≥ ~1 L/min, plus a non-contact XKC-Y25 "water present in overflow pipe" sensor for dribbles) → ESP32 → rule engine (reused): overflow present for > N s ⇒ FLOAT_FAILURE → close inlet valve, alert, count litres; level slope (JSN-SR04T ultrasonic or a cheap pressure probe) with pump/inlet state ⇒ consumption flow ⇒ the existing QUIET/OCCUPIED persistence rules ⇒ PERSISTENT_CONSUMPTION alert; temperature as a bonus cleaning reminder.

**SYSTEM ARCHITECTURE:** tank → [overflow sensor, level sensor, temp] → ESP32 (owned) → local rules + NVS buffer → Wi-Fi → Telegram/dashboard; ESP32 → relay/MOSFET → 12 V NC solenoid or motorised ball valve on the inlet *before* the float (fails open on power loss if a motorised valve is used — choose motorised for safety).

**HARDWARE / BOM (SAR, marketplace bands ±30 %):** YF-S201 or YF-B5 ¾" brass turbine 20–60 · XKC-Y25 non-contact 25 · JSN-SR04T waterproof ultrasonic 25–35 · DS18B20 5 · 12 V motorised ball valve ¾" (CR-02) 60–90 or NC solenoid 25–40 · relay/MOSFET 10 · 12 V 2 A PSU 20 · enclosure 35 · demo rig (20 L transparent container, float valve ½" 15–25, fittings, header bucket) 120 · **total ≈ SAR 250–350 incl. rig; node alone ≈ 150–250.**

**SOFTWARE:** the existing Water Guardian rule engine, simulator, Telegram path and NVS buffering are reused; new: overflow state, slope estimator (dh/dt × tank area, with pump/inlet masking), tariff calculator.

**BUILD TIME:** Day 1 bench PoC (tank, float, overflow turbine, alert). Week 1: valve + slope + rig. Week 2: 3–5 real tanks logging. Week 3: polish.

**TECHNICAL RISKS:** gravity overflow at dribble rates may not spin a turbine (mitigated by the non-contact presence sensor and a tipping bucket option); ultrasonic level in a closed tank has echoes/condensation (mount through the lid, average 60 s; resolution ≈ 3 mm ⇒ ≈ 1 L/min on a 1 m² tank over 10 min — CALCULATED); valve fail-safe (motorised, not NC solenoid); users fear "it might cut my water" (valve is optional; alert-only mode).

**WHAT MUST BE PHYSICALLY VERIFIED:** minimum overflow rate the turbine registers; slope resolution on a real roof tank with pump cycling; false alarms from wind/vibration on the level reading; valve torque on a real ¾" inlet.

**FIRST PROTOTYPE:** transparent 20 L container + ½" float valve fed from a raised bucket; overflow spigot → turbine → jug; ESP32 reads turbine pulses, XKC-Y25, JSN-SR04T; motorised valve inline before the float; port the rule engine; Telegram.

**HOW TO TEST:** 20 induced float failures at 3 severities (full open / half / dribble), record detection time and litres vs jug; 20 night-consumption runs at 0.5/1/2/5 L/min via outlet tap, record slope-derived flow vs jug; 40 mixed no-fault trials (tank refilling, pump cycling, someone drawing water briefly) for false alarms — the same 19/20 and ≤ 1/40 targets already in `PHYSICAL_TEST_PLAN.md`.

**HOW TO MEASURE IMPACT:** litres/month of overflow per instrumented tank (field, 5 tanks × 14 days), scaled cautiously; SAR/month at the tier; detection time.

**60-SECOND DEMO:** Step 10.

**BUSINESS MODEL:** SAR 199–299 device + optional SAR 5/month alerts; B2B to MIA O&M contractors (6,478 mosques under contract), school facility contractors, tanker-water companies; later a data product ("first Saudi overflow-loss index").

**SCALABILITY:** every tank in the Kingdom has an overflow pipe; install = clamp + Wi-Fi.

**WHY IT COULD WIN:** track-literal (water loss + distribution optimisation), visible demo, SAR-priced, works day 1 on hardware you own, produces a first-of-its-kind number, cheap enough for MEWA/MIA scale.

**WHY IT COULD LOSE:** judges may pattern-match to "tank level alarm" unless the overflow-metering and slope-as-flow insights are front and centre; overflow events may be rarer than assumed (no statistic exists — it cuts both ways).

### 13.2 AC CONDENSATE HARVESTER-METER

**ONE SENTENCE:** A drip-tray harvester that meters and stores the distilled water every Jeddah/Makkah air-conditioner already makes, and pumps it to the building's trees.

**PROBLEM / WHY KSA CARES:** humid coastal cities discard condensate onto pavements; KAU measured ≈ 20,600 L/yr from one Jeddah split unit (RESEARCH FINDING); MPDA needs water for 7.7 M trees; the UIC application page names "Water Production". **WHO:** villas, mosques, schools in Jeddah/Makkah/Dammam; MPDA/municipal landscaping. **CURRENT SOLUTIONS:** building-scale condensate recovery exists in Dubai/Qatar; nothing consumer-grade or metered in KSA (NOT FOUND). **INNOVATION:** metering + storage + reuse as a kit, with a per-building yield dashboard — novel-in-context, weak. **HOW:** condensate line → tipping-bucket gauge (0.2–0.5 mL resolution) or load-cell container → ESP32 counts → 12 V diaphragm pump to a planter/tank on threshold. **BOM:** tipping bucket 25–50, container 85, pump 30–60, level 25, tubing 20 ⇒ **≈ SAR 150–250.** **BUILD:** day-1 bucket-under-AC, week-1 metered kit, week-2 3 ACs × 7 days. **RISKS:** yield collapses in Riyadh (≈ 1 L/day) and in winter; competition date unknown; demo needs a dehumidifier; condensate is near-distilled and can be corrosive (fine for irrigation). **VERIFY:** L/day on real units vs RH. **IMPACT:** L/day per unit, L/season per building, trees supported. **BUSINESS:** SAR 150 kit sold with AC installs; municipal condensate collection from large chillers. **WIN:** exact fit to "water production/alternative sources", Makkah/Jeddah partner relevance. **LOSE:** yields are modest per unit, the science is published, and a judge in Riyadh sees a bucket.

### 13.3 RPW PHEROMONE-TRAP PHOTO COUNTER

**ONE SENTENCE:** A phone (or ESP32-CAM) photographs the pheromone bucket trap, the app counts the weevils and paints the farm map, turning 376,000 manual trap checks into a geo-coded early-warning layer for Weqaa.

**PROBLEM / WHY KSA CARES:** MEWA names "the RPW control value chain" as a challenge element; 37.6 M palms, 53 % of farms hit in 2022, > US$400 M loss; the norm is 1 trap/100 palms, serviced and counted by hand; 13.3 M palms are already geo-coded (RESEARCH FINDING). **WHO:** Weqaa field teams, municipalities, 123k small holders. **CURRENT SOLUTIONS:** acoustic per-tree probes (Palmear, KAUST DAS) — expensive, crowded; smart traps exist for moths, none for RPW buckets (NOT FOUND). **INNOVATION:** trap-level, not tree-level; photo, not sensor; feeds the existing registry. **HOW:** photo → YOLO-class counter (published 93.8 % on adult RPW) → GPS → per-trap time series → threshold → "بلّغ" draft. **BOM:** phone + trap/lure 60–120; optional ESP32-CAM node 60. **BUILD:** week-1 model on public RPW images; week-2 needs ≥ 30 real bucket-trap photos from a farm (the blocker). **RISKS:** no public bucket-trap dataset (wet, overlapping weevils in dark water); farm access; demo is a photo. **VERIFY:** MAE vs manual counts. **IMPACT:** counting accuracy, minutes saved per trap round, earlier hotspot detection. **BUSINESS:** licence to Weqaa/municipal contractors; cooperative subscription. **WIN:** the most track-literal agriculture entry, national registry fit, near-zero hardware. **LOSE:** without real trap photos before the event it is a slide deck; agriculture judges have seen many RPW projects.

---

## STEP 14 — Hostile judge

**Tank Guardian**
- *"Isn't this a tank level alarm?"* — No. Level alarms tell you the tank is full. This meters the water leaving through the overflow, prices it, and shuts the inlet; and it turns the level trace into a consumption meter. The alarm market proves demand; it does not do either.
- *"Why not buy Flo/Phyn?"* — SAR 2,000+, plumber on the pressurised main, US tariff logic, no overflow concept because US homes have no roof tanks. Saudi tank architecture is the reason this product does not exist.
- *"Where is your evidence overflow loss is big?"* — Honest answer: there is no national statistic; trade sources say "thousands of litres/day" per failed float, and the tariff makes a 60 m³ overflow cost ≈ SAR 465. Our pilot produces the first measured number — that is a feature of the proposal, not a weakness.
- *"Why IoT?"* — the alert and the valve must act at 3 a.m. when no one looks; the number must reach the caretaker. Nothing else needs cloud.
- *"Why no AI?"* — none needed; MEWA's UIC does not ask for it (NOT FOUND). Threshold + persistence + tariff is enough and auditable.
- *"What did you invent?"* — the placement (overflow pipe as loss meter), the slope-as-flow method reusing the tank as the instrument, and the priced, valve-closing intervention. → **SURVIVES.**

**Feast surplus bin**
- *"Etaam already collects from 466 halls; will they dispatch on a sensor?"* — No, they need a human call. *"Winnow/Kitro exist; HX711 bins are on GitHub."* — Yes. *"So what did you invent?"* — routing software. → **COLLAPSES. REMOVED.** Next idea promoted: AC condensate (74) — already in the top 3.

**AC condensate**
- *"The yield science is published; buildings in Dubai already do this."* — True; our contribution is a metered consumer kit and per-building data. *"What happens in Riyadh in December?"* — ≈ 1 L/day; the product is coastal and seasonal. *"Demo?"* — a dehumidifier dripping. → **SURVIVES, weakened** (honest positioning: a Makkah/Jeddah-specific "water production" entry).

**RPW trap counter**
- *"Show me it counting real weevils in a real bucket."* — Only possible after a farm visit; without it, no demo. *"Why not the acoustic probe everyone uses?"* — different layer: trap counts are the surveillance data Weqaa already collects by hand. *"Where is the dataset?"* — none public; we would create it. → **SURVIVES conditionally** on securing trap photos in week 1.

Final three: **Tank Guardian · AC Condensate · RPW Trap Counter.**

---

## STEP 15 — Head-to-head against Water Guardian

| Criterion | Water Guardian (clamp-on) | Tank Guardian | AC Condensate | RPW Counter |
|---|---|---|---|---|
| Chance of winning | medium-low (unverified sensor, generic category) | **high** (track-literal, visible, cheap, new number) | medium (niche, seasonal) | medium (track-literal, dataset risk) |
| Novelty | low-medium | medium | medium | medium-high |
| Engineering risk | **high** (SAR 600 sensor may not read low flow on PPR) | low | low-medium | medium (CV data) |
| Cost | SAR 900–1,800 | SAR 150–350 | SAR 150–250 | SAR 60–200 |
| Build speed | weeks (shipping + validation) | days | days | weeks (farm) |
| Demo quality | 5 now / 8 if meter works | 9 | 7 | 6 |
| Evidence potential | needs the meter first | high (bench + 5 tanks) | medium (weather-bound) | medium |
| Saudi relevance | high | **very high** (tank architecture is Saudi-specific) | high (coastal) | very high |
| Scalability | medium (SAR 600/node) | high | medium | high |
| Unverified-hardware dependence | **total** | none (all parts are stock, unpressurised) | low | low |
| **Would I abandon Water Guardian for this?** | — | **YES** — and keep its software | NO (as a replacement); YES as a module in a Makkah pitch | NO for a water-track team; YES if the team prefers the agriculture track |

---

## STEP 16 — The one idea

**Recommendation: KEEP WATER GUARDIAN BUT MODIFY IT → "Tank Guardian".**

Keep everything that is already proven (rule engine, SENSOR_UNKNOWN discipline, offline buffering, Telegram, simulator, test campaign, the mosque schedule logic). Replace the one unverified, expensive element — the clamp-on ultrasonic meter on a pressurised PPR pipe — with two cheap, unpressurised measurements on the tank the building already has: **overflow-pipe metering** (float-valve failure, priced in SAR, inlet valve closes) and **level-slope consumption** (the same persistent-flow detection, now free). The claim becomes sharper and more Saudi-specific: *"the first device that measures, prices and stops after-the-meter water loss in Saudi tank-fed buildings."* The clamp-on meter remains a future add-on for buildings without accessible tanks, not the foundation.

**"One team, one entry, three weeks, SAR 1,000 of my own money — which project?"**
**Tank Guardian.** It costs SAR 250–350 including the demo rig, runs on the ESP32 you own, gives a day-1 proof of concept with water visibly pouring and a valve visibly closing, reuses four weeks of finished software, sits squarely on the "water loss" wording of the track, and produces a measurable Saudi number nobody has published. The remaining SAR 650 buys a second node for a real mosque tank and a week of field data. The clamp-on ultrasonic meter would consume the whole budget on a single unverified bet; the RPW counter would spend the three weeks chasing a farm and a dataset; the condensate kit would depend on the weather on competition day.

**Conditions attached (ENGINEERING INFERENCE):** (1) confirm in week 1 that a gravity overflow dribble is detected (turbine + presence sensor + tipping-bucket fallback); (2) confirm slope resolution on a real roof tank with a cycling pump; (3) open the official MEWA page from a normal browser and re-confirm the edition-2 dates and any rubric before the pitch is finalised; (4) name a Makkah-region pilot site (a mosque or a waqf cistern) in the proposal.
