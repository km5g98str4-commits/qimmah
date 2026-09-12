# Saudi agriculture & environment problems — quantified landscape for a cheap student prototype

Research date: 2026-09-12. Target: MEWA University Innovation Challenge (agriculture track = food waste; environment track = vegetation cover / afforestation / desertification; agriculture sub-track = red palm weevil (RPW) control value chain). Constraint: 4 students, ESP32 / ESP32-CAM / phone camera / cheap sensors / CV / open data.

Legend: **[fact]** = sourced number · **[inference]** = my reading · **[gap]** = could not find a public number.

Note: `mewa.gov.sa` is blocked by the egress proxy in this environment; MEWA pages are cited from search snippets only. The challenge page confirms the three elements: **desertification**, **water loss and grey-water management**, **RPW control value chain** (https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/default.aspx; agriculture topic page: https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/AgricultureTopic.aspx). Training partner: Babson College.

---

## A. AGRICULTURE

### A1. Red palm weevil (RPW) — the challenge's named value chain

**Who has it:** ~123,000 small date-palm holdings; Weqaa (National Center for Prevention & Control of Plant Pests and Animal Diseases) owns the program since 2022; MEWA regional branches; municipalities with ornamental palms.

**Key numbers**
- 37.6 M palms total, 32 M fruiting, 165,000 ha, 1.923 M t dates in 2024 (GASTAT) — https://www.stats.gov.sa/en/w/news/127 ; PDF https://www.stats.gov.sa/documents/20117/2435281/Agricultural+Statistics+2024++-+EN.pdf **[fact]**
- Older figure 28 M palms, ~80,000 infested palms, income of ~123,000 small farms affected — CABI Plant Health Cases (Al-Ahsa) https://www.cabidigitallibrary.org/doi/full/10.1079/planthealthcases.2023.0001 **[fact]**
- RPW detected on **53 % of Saudi date farms in 2022, losses > US$400 M that year** — AGBI Dec 2025 https://www.agbi.com/analysis/agriculture/2025/12/gulf-turns-to-ai-to-control-costly-date-tree-pests/ **[fact, secondary]**
- Gulf-wide: date-production loss US$6–17 M/yr + removal cost US$5–25 M at 1–5 % infestation — CGIAR/ICARDA https://mel.cgiar.org/reporting/download/hash/6b4fcb5c9060a69c0b2f9a17116d3499 **[fact]**
- 2025: > 80 M palm inspections, infestation rate pushed down to **0.15 %**; **13.3 M palms geo-coded, 42,647 holdings coded** — Al-Watan https://www.alwatan.com.sa/article/1180309 ; Jehat https://www.jehat.net/?act=artc&id=136095 **[fact]**
- MEWA guidance: 1 pheromone trap per 100 palms / 2 per ha, 100 m spacing, 5 m from trunk, shaded; > 80 % trunk damage → shred & burn; trunk injection for earlier stages — https://www.maan-ctr.org/magazine/article/2949/ ; https://www.alkhaleej.ae/2025-03-15/... **[fact]**
- Reporting channel: unified "Balligh / بلّغ" system for RPW reports — https://www.mewa.gov.sa/ar/MediaCenter/News/Pages/News785.aspx ; integrated management procedural guide (istitlaa) https://istitlaa.ncc.gov.sa/ar/Civil/Mewa/Proceduralguidefortheintegratedmanagementoftheredp/Pages/default.aspx ; Weqaa IPM page https://weqaa.gov.sa/en/ldr-lmtkml-lsws-lnkhyl-lhmr
- MEWA publicly said RPW has become **pesticide-resistant** and asked researchers for help — ecomena https://www.ecomena.org/red-palm-weevil/ **[fact, secondary]**

**Existing solutions**
- Commercial acoustic: **Palmear** (Jordan/UAE, handheld AI bioacoustic probe) https://www.palmear.ai/ ; Palm Robotix https://palmro.com/red-palm-weevil-early-detection/ ; IoTree / Agrint (Israel, not Saudi-marketable); **PalmOptical** fiber-optic DAS network (KAUST spinoff, on MEWA innovation platform) https://www.mewa.gov.sa/en/Ministry/AboutMinistry/Sharing/InnovationPlatform/Pages/PalmOptical-.aspx ; KAUST DAS detects larvae at 12 days https://www.kaust.edu.sa/en/news/using-sensor-technology-to-tackle-red-palm-weevils
- Research: Smart Palm IoT framework https://arxiv.org/pdf/1910.00653 ; deep-learning acoustic 97.4 % https://ar5iv.labs.arxiv.org/html/2308.15829 ; **ESP32-WROVER on-device SNN audio classifier 98.8 %** (IEEE 10378904) https://ieeexplore.ieee.org/document/10378904 ; ML acoustic sensing Sci Rep 2025 https://www.nature.com/articles/s41598-025-22306-6 ; acoustic-sensor validation 2025 https://www.ingentaconnect.com/content/resinf/opm/2025/00000036/00000003/art00006 ; multi-modal IoT + mapping https://arxiv.org/pdf/2306.16862
- Student/hackathon: **WeevilNet** (Prototypes for Humanity) https://prototypesforhumanity.com/en/prototypes/weevilnet — bio-acoustic surveillance + farmer dashboard. Fast Company ME piece on AI device https://fastcompanyme.com/technology/date-palm-farms-are-being-destroyed-can-this-ai-powered-device-save-them/

**Gaps [inference]**
1. Acoustic per-tree detection is crowded (≥ 6 papers, 3 companies, WeevilNet). A judge will have seen it.
2. **Pheromone trap counting/servicing is not digitised**: 37.6 M palms ÷ 100 = ~376,000 traps needing periodic manual checks, lure replacement and count logging. Photo-based trap counting (ESP32-CAM or phone photo → count weevils → GPS-tagged log → heat map) is cheap, open, and feeds Weqaa's existing geo-coded 13.3 M palm registry. Not found as a Saudi product.
3. Trunk-injection/treatment **follow-up** (did the tree recover? when to re-inspect?) and the **removal logistics** chain (infested palm → shredding → disposal, verified by photo) are un-instrumented.
4. Farmer-facing symptom triage from a phone photo (frond wilt, oozing, chewed fibre at crown) as a first filter before an inspector visit — low cost, feeds "Balligh".

### A2. Food loss & waste (FLW) — the challenge's named agriculture theme

**Who has it:** GFSA/SAGO National Program "لتدوم" (Li Tadum), Etaam food bank, hotels/restaurants/wedding halls, households, wholesale markets.

**Key numbers**
- Baseline FLW **33.1 %** (loss 14.2 % + waste 18.9 %), 4 M t/yr, **SAR 40 bn/yr**, **184 kg/person/yr** — MEWA https://www.mewa.gov.sa/en/MediaCenter/News/Pages/News242020.aspx ; Argaam https://www.argaam.com/en/article/articledetail/id/1490504 ; Al-Riyadh https://www.alriyadh.com/2035399 ; FLW index portal https://flwp.gfsa.gov.sa/ **[fact]**
- Reduced to **27.9 %** (–16 % vs 2019 baseline) — SPA https://www.spa.gov.sa/N2410909 **[fact]**
- By commodity: **vegetables 39.5 %** (tomato worst), dates 21.4 % — FAO/Springer chapter https://www.fao.org/platform-food-loss-waste/resources/articles/detail/food-loss-and-waste-in-saudi-arabia--analysis--causes--and-interventions/en ; https://link.springer.com/chapter/10.1007/978-3-031-46704-2_11 **[fact]**
- Dates: production-stage 18 % (~137 kt), post-harvest handling/storage 24 % of total date loss; marketing losses 5–10 % (Shagra/Qassim 16–20 %); mean fruit disorder 12.6 % — MDPI Sustainability 16:9588 https://doi.org/10.3390/su16219588 ; IJOEAR https://archive.org/details/IJOEARMAY20177 **[fact]**
- Households ≈ 48 % of waste on normal days, **60 % at weddings/Eid/family feasts**; rice ~1/3 of cooked amount wasted, meat 29 %; alt. estimate SAR 47 bn — Aleqtisadiah https://www.aleqt.com/... 12165 **[fact, press]**
- Etaam runs a late-night wedding-hall surplus pickup shift; Etaam+Mastercard+Amazon 60,000 meals — https://etaam.org.sa/ ; https://saudifoodbank.com/ **[fact]**

**Existing solutions:** Li Tadum digital matching of hotel/restaurant surplus with charities; Etaam logistics; restaurant POS waste-tracking blogs (DGTERA, YallaPlus). Cold-chain market growing 11 %/yr. **[gap]** no public Saudi wholesale-market spoilage sensor pilot found.

**Gaps [inference]**
- Wedding-hall / buffet surplus quantification at the point of service (camera on the return line, weight-scale bin with ESP32 + load cell, real-time alert to Etaam pickup) is cheap and directly addresses the 60 % feast spike.
- Wholesale vegetable market (Riyadh Aziziyah, Jeddah) crate-level spoilage monitoring (ethylene/temperature/humidity in crates; ESP32 + DHT22 + MQ-3) — tomato 39.5 % FLW is the headline number.
- Date post-harvest: cheap CV grading of dates (size/cuts/browning) for small farms to reduce the 12.6 % disorder loss and the 16–20 % Qassim marketing loss.

### A3. Irrigation efficiency & groundwater

- Agriculture uses **12.3 bn m³ (2023)**, of which **9.36 bn m³ non-renewable groundwater (–7 % y/y)** — GASTAT https://www.stats.gov.sa/en/w/news/8 **[fact]**
- Agriculture ≈ 80–88 % of freshwater use — npj Sustainable Agriculture https://www.nature.com/articles/s44264-023-00006-w ; US-Saudi brief https://ussaudi.org/wp-content/uploads/2022/02/Water-2022-Economic-Brief.pdf **[fact]**
- Irrigation efficiency ~**50 % vs 85 % best practice**; SIO+FAO project targets 20 % adoption of efficient irrigation — FAO https://www.fao.org/neareast/news/stories/details/from-scarcity-to-sustainability--a-leap-toward-efficient-irrigation-in-saudi-arabia/en ; Arab News https://www.arabnews.com/node/2595939 **[fact]**
- Drip = 43.7 % of irrigation-systems market 2024 (market share, not farm share) https://marksparksolutions.com/reports/saudi-arabia-irrigation-systems-market **[fact, market report]**
- Soil salinity: > 70 % of surveyed fields affected; yield penalty 17–38 %; ~40 % of 1.18 M ha arable — FAO https://www.fao.org/countryprofiles/news-archive/detail-news/en/c/1726327/ ; UN KSA https://saudiarabia.un.org/en/284253-... **[fact]**
- Local alfalfa production to end 2027; barley imports 4.2 MMT (MY25/26); livestock subsidy US$320 M/yr — USDA GAIN https://www.fas.usda.gov/data/gain-report/2026/04/Grain%20and%20Feed%20Annual_Riyadh_Saudi%20Arabia_SA2026-0003.pdf **[fact]**

**Existing:** SIO smart-irrigation programs, many ESP32 soil-moisture theses (Prince Sattam U. etc. https://link.springer.com/chapter/10.1007/978-981-96-3094-3_10). **[inference]** Smart-irrigation IoT is the single most common student project; only a twist (e.g., soil-EC/salinity mapping with a cheap probe, or flow-meter leak detection on farm mains) differentiates. This repo's `water-guardian-simulation` (TUF-2000M ultrasonic flow) already sits here.

### A4. Greenhouses
- 3,019 ha of greenhouses (2015 est.); evaporative cooling = 80–90 % of greenhouse water; ~350 L/kg tomato average vs 63–105 L/kg in optimised Riyadh trials — ScienceDirect https://www.sciencedirect.com/science/article/pii/S037837742100072X ; benchmarking https://www.sciencedirect.com/science/article/pii/S1537511024001399 **[fact]**
- Startups: iyris (formerly Red Sea Farms, US$10 M 2021; NFP 0.75 ha in Bada with Red Sea Global), Mowreq/VFCo 20,000 m² Riyadh vertical farm (Feb 2025), Arable US$2.55 M (Jan 2025) — https://www.imarcgroup.com/saudi-arabia-agritech-market ; https://www.cio.com/article/189230/...
- **[gap]** No public Saudi number on greenhouse pest (whitefly/Tuta absoluta) losses. Yellow-sticky-trap CV counting is a viable cheap prototype (same CV pipeline as RPW trap counting).

### A5. Date-palm pollination & harvest labour
- Manual pollination: 2 labourers per 200 trees/season; mechanical 1 operator / 760 trees; drone liquid pollination ~US$1,350/ha in Oman — ResearchGate https://www.researchgate.net/publication/263929688_... ; FAO STI https://sti-portal.fao.org/innovations/liquid-pollination-date-palm-production ; Sci Rep 2026 AI drones https://www.nature.com/articles/s41598-026-39739-2 **[fact]**
- **[inference]** Drones are beyond a cheap-prototype budget; not recommended.

### A6. Beekeeping
- ~16,000 registered beekeepers → 30,000 by 2030; > 1 M hives; production ~5,000 t vs 24,000 t imports; colony loss 11.4 % summer 2017 / 6.6 % spring 2018, mainly Varroa — Arab News https://www.arabnews.com/node/2640178/amp ; MDPI Insects 14:513 https://www.mdpi.com/2075-4450/14/6/513 ; REEF sector review https://reef.edu.sa/attachments/... **[fact]**
- Hive-weight/temperature IoT monitors are commodity globally (BroodMinder etc.); Saudi-specific niche = heat stress in Asir/Jazan hives. Moderate novelty.

---

## B. ENVIRONMENT

### B1. Afforestation / vegetation cover (SGI, NCVC) — the challenge's named environment theme

- SGI: 10 bn trees, 40 M ha restored; **> 151 M trees planted and ~500,000 ha rehabilitated by July 2025**; first 1 M ha restored announced 2026 — https://www.sgi.gov.sa/sgi-initiatives/ ; https://saudienergyconsulting.com/insights/articles/saudi-green-initiative-2026-update-... **[fact]**
- NCVC: ~141 M trees by Apr 2025 vs 400 M target by 2030; "Let's make it green" campaign 10 M trees at 1,200+ sites in 6 months; 8 contracts for ~19 M seedlings — SPA https://www.spa.gov.sa/2294253 ; https://www.spa.gov.sa/2381974 ; https://haqayq-news.com/53317/ **[fact]**
- Mangroves: > 49 M planted by end-2025 (6 M in 2025, Jazan 3.3 M), target 100 M by 2030; monitored by sensors + drones — SPA https://www.spa.gov.sa/en/348f5a275aq ; Arab News https://www.arabnews.com/node/2609461/saudi-arabia **[fact]**
- Planning: 1,150 field surveys, 56 native species, 600,000 seedlings/yr nursery capacity, GeoTag monitoring, treated-wastewater + rain harvesting irrigation — SGI knowledge hub https://www.sgi.gov.sa/knowledge-hub/how-do-you-plant-10bn-trees/ **[fact]**
- Rangelands: **70 % of rangelands (73 % of land area) moderately–severely degraded**, mainly overgrazing; new 5th-edition grazing regulation Mar 2025 — Arab News https://www.arabnews.com/saudi-arabia/saudi-nature-reserve-authority-calls-for-curbs-on-overgrazing-to-protect-saudi-rangelands-3000648 ; WOCAT https://wocat.net/en/wocat-media-library/framework-for-sustainable-land-management-in-the-kingdom-of-saudi-arabia/ **[fact]**
- Green Riyadh: 7.5 M trees, target –2 °C citywide; 15,000 trees at Shayb Ghudwanah cut local temperature ~5 °C — Saudi Gazette https://saudigazette.com.sa/article/663470/... ; RCRC https://www.rcrc.gov.sa/en/projects/green-riyadh-project/ **[fact]**
- **Seedling survival rate: [gap] — no official Saudi figure published.** Ecologists warn saplings face heat, poor soil, grazing, dust (UNEP https://www.unep.org/news-and-stories/story/saudi-arabia-strives-regreen-deserts-tackle-drought-and-land-degradation ; Climate Fact Checks https://climatefactchecks.org/is-green-arabia-possible-again-inside-saudi-arabias-desert-greening-plan/). Regional NGO experience: ≤ 10 % survival when logistics under-budgeted (Torba, Algeria https://www.torba.dz/...). The absence of a public survival number is itself the opportunity: **"planted" is counted; "alive after 12 months" is not visibly reported.**
- NCVC executive regulation requires proponents to state irrigation method and "means of sustaining vegetation cover" — istitlaa https://istitlaa.ncc.gov.sa/ar/Civil/Mewa/Desertification/Pages/default.aspx ; UQN https://uqn.gov.sa/?p=5702 **[fact]**

**Existing solutions:** GeoTag per-tree tagging (SGI), drone/satellite NDVI (NCVC, SAUDINet with KAUST 2025), commercial tree-planting MRV (Treeconomy, Pachama — not Saudi). **Gaps [inference]:** (1) cheap per-site survival audit — phone photo of QR/NFC-tagged seedling → CV "alive/stressed/dead" → dashboard, volunteer-driven for the 1,200+ campaign sites; (2) low-cost seedling-tank irrigation logger (ESP32 + soil probe + LoRa) to catch missed watering rounds by contractors; (3) grazing-intrusion camera trap on fenced restoration plots (ESP32-CAM + PIR, detect sheep/camel).

### B2. Dust storms & sand encroachment
- Regional SDS cost US$13 bn/yr; sandstorm days projected 45–48 → 55–65 by 2060–85 — Arab Center DC https://arabcenterdc.org/resource/sand-and-dust-storms-in-the-mena-region-a-problem-awaiting-mitigation/ ; ScienceDirect https://www.sciencedirect.com/science/article/pii/S2590123025033687 **[fact]**
- Saudi claimed 94 % reduction in dust events Jan 2024 (weather-dependent) — Saudi Gazette https://www.saudigazette.com.sa/article/640230
- Sand encroachment: Al-Uqayr–Hofuf road, dunes approach communities within 3 km; Shaqra/Tharmada RS-GIS vulnerability study https://www.researchgate.net/publication/387729904_... **[fact]** ; **[gap]** no MoT figure for km of road affected or SAR spent on sand removal.
- **[inference]** Cheap prototype: ESP32 + laser dust sensor (PMS5003) network + camera for road-sand build-up alerts; moderate novelty (air-quality nodes are common), but the sand-on-road angle is less common.

### B3. Littering / illegal dumping in the desert & wadis (النفايات في البر)
- NCEC handled **> 4,200 environmental reports in H1 2025**; "بلاغ بيئي" service now inside Tawakkalna — SPA https://www.spa.gov.sa/N2393554 ; https://www.spa.gov.sa/N2569829 **[fact]**
- **39,558 environmental violations referred for enforcement in 2025, est. SAR 531 M** — Al-Watan https://www.alwatan.com.sa/article/1180159 **[fact]**
- MWAN "Iltazem" campaign: > 15,000 inspections, 3,526 notices, 1,933 violations — Arab News https://www.arabnews.com/node/2613741/saudi-arabia **[fact]**
- Fines: public-area dumping up to SAR 10,000; unlicensed waste transport SAR 100,000; unauthorised camping SAR 500 → 2,000 — Gulf News https://gulfnews.com/world/gulf/saudi/saudi-arabia-sr500-2000-fines-for-unauthorised-camping-1.1731756687197 ; Saudipedia waste law https://saudipedia.com/en/article/2898/... **[fact]**
- MSW: 15–50 M t/yr (sources disagree), 1.4 kg/person/day, food 40–51 % of MSW, landfill diversion 18 % (2024) → 90 % by 2040 — Arab News https://www.arabnews.com/node/2626338/amp ; EcoMENA https://www.ecomena.org/solid-waste-management-in-saudi-arabia/ **[fact, ranges]**
- **[gap]** No tonnage for desert-camping litter (Rawdat Khuraim etc.); only qualitative municipal statements (Al-Riyadh https://www.alriyadh.com/514705).
- **[inference]** Prototype: phone-CV litter hotspot mapping of a kashta site / wadi, auto-drafting a NCEC "بلاغ" with photo + GPS; or ESP32-CAM at popular rawdah entrances. Low hardware cost, high visibility, but enforcement-adjacent (privacy sensitivity).

### B4. Wildfires (Asir / Al-Soudah juniper)
- Asir: 1,371 VIIRS fire alerts Jul 2020–Feb 2025; 807 alerts Aug 2025–Aug 2026 — Global Nature Watch https://globalnaturewatch.org/dashboards/country/SAU/1/?category=fires **[fact]** ; Ghalahmah 2020 fire: 161 ha high-severity (49.9 % of area) — MDPI Fire 8:172 https://www.mdpi.com/2571-6255/8/5/172 ; "Nuthur" ML early-warning for Al-Soudah https://doi.org/10.3390/a19090751 ; ML risk map https://www.mdpi.com/2072-4292/17/21/3516 **[fact]**
- **[inference]** ESP32 + smoke/temperature/humidity LoRa nodes in juniper forest is a feasible prototype; research exists (Nuthur), commercial (Dryad) exists abroad; total burned-area numbers per year are thin.

### B5. Urban heat
- Riyadh near 50 °C; Green Riyadh aims –2 °C; localized –5 °C measured — see B1. Cheap prototype: mobile temperature transect logging. Novelty low.

---

## C. Student / hackathon projects already common in Saudi (avoid or differentiate)
- ESP32 soil-moisture smart irrigation (dozens; PSAU, KSU, KFUPM capstones).
- Acoustic RPW detector with deep learning (WeevilNet; IEEE ESP32 paper; KAUST DAS).
- Image classification of plant disease from phone photo (PlantVillage-style).
- Beehive weight/temperature monitor.
- Air-quality/dust node dashboards.
- "Report litter" civic apps.
- Solar-powered greenhouse climate dashboards.
Sources: search results above; https://github.com/topics/smart-farming ; AI for Good KSA hackathon https://aiforgood.itu.int/event/ai-readiness-hackathon-kingdom-of-saudi-arabia/

## D. Open data usable by a team
- GASTAT Agricultural Statistics 2024 (palms by region, production) — link in A1.
- GFSA FLW index portal https://flwp.gfsa.gov.sa/
- Global Nature Watch / NASA FIRMS fire alerts; Sentinel-2 NDVI (free) for vegetation-cover before/after at campaign sites.
- NCVC annual report 2022 PDF https://ncvc.gov.sa/ar/digitalKnowledge/documentsAndReports/Documents/...2022.pdf
- MEWA innovation platform listings https://www.mewa.gov.sa/en/Ministry/AboutMinistry/Sharing/InnovationPlatform/Pages/default.aspx

## E. Ranking for a cheap 4-student prototype (see summary)
1. Pheromone-trap photo counting + geo-log for RPW (value-chain gap, feeds Weqaa registry).
2. Seedling survival audit (tag + phone CV + volunteer app) for SGI/NCVC campaign sites.
3. Wedding-hall / buffet surplus sensing bin → Etaam pickup trigger.
4. Wholesale-market crate spoilage sensor for tomatoes/vegetables (39.5 % FLW).
5. Seedling-irrigation compliance logger (ESP32 + soil probe + LoRa) for contractor watering rounds.
6. Desert-litter hotspot mapping → auto "بلاغ" to NCEC.
