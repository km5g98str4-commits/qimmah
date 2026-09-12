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
