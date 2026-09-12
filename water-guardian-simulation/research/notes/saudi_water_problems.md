# Saudi water problems — quantified, for a cheap student prototype (MEWA UIC water track)

Research date: 2026-09-12. Method: web search (EN/AR). Many Saudi and academic domains (mewa.gov.sa, nwc.com.sa, swa.gov.sa, spa.gov.sa, saudigazette, sciencedirect, springer, mdpi, researchgate, stats.gov.sa) are blocked from direct fetch in this sandbox, so most numbers below come from search snippets of those pages. Each number is tagged **[confirmed]** (seen verbatim in snippet of the primary source), **[secondary]** (seen in a secondary/aggregator source), or **[derived]** (our arithmetic).

---

## 0. The competition frame (what MEWA asks for)

- MEWA **University Innovation Challenge** — three sectors: Environment (vegetation cover/afforestation, desertification), **Water (water scarcity → "water loss and grey water management")**, Agriculture (food waste / red palm weevil). Teams = **1 faculty member + 4–5 students**; early-stage ideas submitted on the challenge platform; winning ideas become pilot projects. [confirmed via snippet]
  - Track page: https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/WaterTopic.aspx
  - Overview: https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/default.aspx
  - Water track text (snippet): "capturing wastewater from baths, sinks, and washing machines, reducing the volume of wastewater needing treatment, and providing an alternative water source for non-potable uses … proper management of the distribution network to prevent leaks and ensure efficient delivery, maintaining and optimizing infrastructure from treatment plants to consumers … collection, treatment, storage, distribution optimization." So the judges' mental model = **(a) network/infrastructure loss** and **(b) greywater capture & reuse**.
- Adjacent Saudi programs that create demand / precedent:
  - **Qatrah (قطرة)** national water demand program (launched Mar 2019): per-capita 263 L/d → 200 by 2020 → **150 L/d by 2030** (‑43%). [confirmed] https://www.waterworld.com/wastewater-treatment/article/16202937/saudi-arabia-launches-program-for-a-drastic-reduction-in-water-use ; https://www.argaam.com/en/article/articledetail/id/600187
  - **National Water Strategy 2030**: NRW down to **15%** (globally competitive), wastewater reuse to **90%**, per-capita reduction. [secondary] https://vision2030.ai/investment/guides/desalination-water/ ; official: https://www.mewa.gov.sa/en/Ministry/Agencies/TheWaterAgency/Topics/Pages/Strategy.aspx
  - **SASO Water Efficiency Label** (enforced 1 Jan 2018) for faucets, showers, WCs, flow regulators — graded by nominal flow L/min (e.g. ≤5.7 L/min standard, 1.9 L/min low-flow). [secondary] https://www.export.org.uk/insights/trade-news/understand-water-efficiency-labelling-for-saudi-arabia/ ; https://xds-solutions.com/certification/saudi-arabia/water-efficiency-label
  - **SBC 701 Saudi Plumbing Code (2018, updated 2024)** — includes graywater / subsurface graywater soil-absorption system provisions (based on IPC ch.13). Code PDFs: https://sbc.gov.sa/ar/BC/Documents/tableofcontent2024/SBC%20701/SBC701-CR_241224-FA.pdf
  - **Water efficiency & conservation guide for buildings** (MEWA, public consultation on istitlaa): https://istitlaa.ncc.gov.sa/ar/Civil/maee/waterefficiencyandconservationGuide/Pages/default.aspx and https://istitlaa.ncc.gov.sa/ar/Civil/maee/NationalWaterEfficiencyandConservationGuide/Pages/default.aspx
  - **Ministry of Islamic Affairs (MIA)**: minister directed all Friday-preachers Kingdom-wide to devote a khutbah to water rationalization "especially in mosques and their facilities" (2025/2026); MIA "regulatory guides apply water & energy rationalization requirements in mosques"; MIA recorded **774 violations of mosque water/electricity services in 2025**; **6,478 mosques' O&M contracts worth ~SAR 408.2 M** awarded in 2025. [confirmed snippets] https://alghd.com.sa/ (khutbah directive) ; https://www.spa.gov.sa/N2504929 ; https://www.alwatan.com.sa/article/1176847 ; https://wikigulf.com/عدد-المساجد-في-السعودية/
  - **NCEC Environmental Regulations for Commercial Activities (2021)**: car washes must recycle ≥70% of wash water; licence needed above 500 L/day. [secondary] https://www.shinewashtec.com/Car-Washing-Machine-Prices-in-Saudi-Arabia-Key-Factors-and-Investment-Insights.html ; ban on manual car washing at fuel stations: https://www.arabnews.com/node/2640152/amp
  - Innovation ecosystem: SWA **Mayahthon (مياهثون)** 2025: >1,500 applicants, >60 teams on-site, **13 winners** → SWIC incubator; 2nd edition registration open 2026. SWA **"Mubtakiroon" hackathon** (293 competitors, 65 teams). NWC+SWIC **Wabel incubator** (Feb 2025). DCO/MEWA/KACST **"Future Makers" AI water challenge** (2026). https://www.okaz.com.sa/local/na/2226076 ; https://www.spa.gov.sa/N2417010 ; https://www.swa.gov.sa/ar/news/5 ; https://saudi.tpg.media/future-makers-challenge-targets-water-resilience/

---

## (a) Non-revenue water / network leaks

**What / who:** NWC (distribution in all regions; now under SWA). 2024: NWC distributed **>3.7 bn m³** drinking water, treated **>2.1 bn m³** wastewater, ~**111k new house connections**. [confirmed] https://www.spa.gov.sa/N2251323 ; https://www.nwc.com.sa/AR/MediaCenter/News/pages/operational.aspx

**Numbers:**
- NRW in NWC networks "historically exceeded 25–30% in some networks". [secondary] https://vision2030.ai/encyclopedia/national-water-company/ ; https://www.trade.gov/country-commercial-guides/saudi-arabia-water
- Riyadh: older claim ~60% lost via 10,000 km of pipe; NWC target 20%; ABB flowmeters "helped cut leakage ~40%". [secondary] https://www.meed.com/stemming-the-flow-of-lost-water-revenue/
- Academic (KSU, "Losses in Riyadh Water Distribution Network"): 10 sampled areas averaged **34% leakage**, city-wide estimate **22%**; >SAR 600 M loss in 1991 alone. [confirmed snippet] https://www.sciencedirect.com/science/article/pii/S1018363918305968
- MENA NRW avg 38% (WB), best practice ~10%; Saudi urban networks quoted 25% or 35–40% depending on source. [secondary] https://www.idrica.com/blog/non-revenue-water-losses-in-the-middle-east-challenges-and-solutions/ ; https://www.idrica.com/blog/digital-transformation-saudi-arabia/
- NWS 2030 target: NRW **15%**. [secondary]
- Smart meters: NWC installed **>2 million smart meters**; **>950k customers** benefited; **~36,000 "high consumption" alert SMS per week**; reported **39% drop** in monthly consumption per alerted customer (leaks or behaviour). [confirmed snippet] https://www.constructionweekonline.com/products-services/267964-saudis-nwc-installs-2-million-smart-meters-consumption-down-39 ; GWI: https://www.globalwaterintel.com/news/2020/42/smart-meters-pay-off-for-saudi-water-balance
- Buraydah pilot with Wiplat smart leak detection. https://wiplat.com/blog/saudi-arabia-buraydah-pilot-demonstration-of-smart-water-leak-detection-project-in-buraydah-saudi-arabia/
- Terra Drone thermal-drone leak detection on Green Riyadh irrigation network. https://terra-drone.com.sa/precision-geospatial-inspection-for-green-riyadh-water-infrastructure/

**Existing solutions & gaps:** Utility-side DMA metering, acoustic loggers, thermal drones, AMI. All are utility-procured, expensive, and target mains — **not the customer-side "after the meter" losses** (villa plumbing, tank overflow, garden lines), which are billed to the customer and invisible to NWC except as a "high consumption" SMS. That after-meter gap is the student-sized opening.

---

## (b) Residential per-capita consumption

- GASTAT: household per-capita **102 L/d in 2023** (113 in 2022, ‑10%). Note this is *household-metered* domestic use only. [confirmed snippet] https://saudigazette.com.sa/article/648375
- Older/official baseline used by Qatrah: **263 L/d** (2019), with "300 L/d, among the highest globally" widely quoted (includes all urban uses). https://www.arabnews.com/news/532571 ; https://ussaudi.org/wp-content/uploads/2022/02/Water-2022-Economic-Brief.pdf
- MDPI 2025 "Regional heterogeneity in urban water consumption": appliance ownership (washing machines, Western WCs), network access, income ↑ use; **reliance on water tanks/tankers ↓ use**. https://www.mdpi.com/2073-4441/17/8/1156
- Drinking water sources (GASTAT Household Environment 2024): bottled 47.3%, network 36.5%, **tanker 15.8%** (2023: 57.2 / 23.6 / 18.6). [confirmed] https://www.stats.gov.sa/en/w/news/124 ; https://saudigazette.com.sa/article/656899
- Intermittent supply: some regions supplied **2 days/week**; Riyadh once per 2.5 days (2011), Jeddah every 9 days historically; households keep large underground + roof tanks and pumps (3–5-day buffer). [secondary/academic] https://www.nature.com/articles/s41598-025-18698-0 ; https://en.wikipedia.org/wiki/Water_supply_and_sanitation_in_Saudi_Arabia

**Takeaway:** Saudi villas are effectively **two-tank micro-utilities** (ground tank + roof tank + pump + float valves). The tank subsystem is where Qatrah's 150 L/d target is won or lost, and no national program instruments it.

---

## (c) Tank overflow, float-valve failure, tanker delivery

**What / who:** Every villa, apartment block, mosque and school has a ground tank filled from network or tanker and a roof tank filled by pump; both rely on mechanical float valves (عوامة). Failure modes: float stuck open → continuous overflow through the overflow pipe (often at night, unnoticed for months); ground-tank float failure → network water runs to overflow continuously and is billed at the top tariff tier; tanker over-fill.
- Consumer-service sources: float failure "loses **thousands of litres/day** without the subscriber knowing"; "hundreds of litres/day"; overflow "often at night… raises the bill for consecutive months before the cause is found"; leak cost is billed "at the highest tier the consumption reached". [secondary, trade sites] https://sa.repair/blog/water-leak-detection/… ; https://ruby3arabi.com/مشاكل-الخزان-الارضي-وكيفية-حلها/ ; https://arabian-home.com/why-water-bills-increase/ ; https://kashaaf.com/articles/high-water-bill
- Derived magnitude: a ½" float valve at 2–3 bar passes ~15–25 L/min → **20–35 m³/day** if stuck fully open; even a 10% weep = 2–3 m³/day ≈ **60–90 m³/month**, i.e. into the 6 SAR/m³ tier (see g). [derived]
- NWC's own response is the 36k/week high-consumption SMS — reactive, monthly-granularity, after the water is gone.
- Tanker market: 6/12/18/20-ton tankers, 24/7 apps (whitema.com, waietwater.com), NWC also sells tanker fills; 15.8% of households cite tanker as drinking source. https://www.whitema.com/ ; https://alshames.com/… ; https://www.stats.gov.sa/en/w/news/124
- Academic prior art: AlGhamdi & Sharma 2022, *IoT-Based Smart Water Management Systems for Residential Buildings in Saudi Arabia* (Processes 10:2462) — GSM + level sensing for buildings fed from big underground tanks; explicitly says real-time level monitoring "may drastically reduce water waste caused by overflowing storage tanks". https://www.mdpi.com/2227-9717/10/11/2462
- **No Saudi statistic exists** on aggregate overflow loss — a measured field sample (e.g. 20 villas × 30 days with a cheap flow meter on the overflow pipe) would itself be a novel contribution.

**Existing solutions & gaps:** Ultrasonic tank-level gadgets and Arduino "tank full alarm" projects are ubiquitous (Instructables, ielectrony) — level-only, no flow, no leak inference, no tie to tariff or NWC. Commercial smart valves are imported and priced for the West. Gap = cheap **flow + level + valve** node that detects float weep/overflow, quantifies litres and SAR, and can shut the inlet.

---

## (d) Ablution (wudu) water in mosques

- **~100,000 mosques / jawami' / musallas** in KSA. [secondary] https://wikigulf.com/عدد-المساجد-في-السعودية/ ; https://aawsat.com/home/article/1426401/
- KSU study (Riyadh, 10 mosques): **5.0 L per ablution** average; **3.10 m³/day** ablution water per mosque. [confirmed snippet] https://www.researchgate.net/publication/283328281_Simple_system_for_handling_and_reuse_of_gray_water_resulted_from_ablution_in_Mosques_of_Riyadh_City_Saudi_Arabia
- Other measurements: ~5 L in ~48.5 s; 7 L with normal and even IR taps vs 0.6 L feasible; range 1.5–7 L. https://www.researchgate.net/publication/374854126_Assessment_of_Ablution_Water_Consumption_in_Mosques ; https://journals.qu.edu.qa/index.php/CIC/article/view/3730 ; https://www.researchgate.net/figure/The-quantity-of-ablution-water-per-person-during-performing-wudhu_tbl2_292072798
- Umm Al-Qura Univ. J. Eng. 2025 paper on aerators & Prophetic wudu (<1 L / one mudd). https://link.springer.com/article/10.1007/s43995-025-00145-w
- Abu Dhabi (RTI, hundreds of mosques): ablution is by far the largest end-use; floor cleaning surprisingly large; each other end-use ≤6%. https://rtipress.scholasticahq.com/article/17237-characterizing-water-use-at-mosques-in-abu-dhabi
- **KAUST Smart-Tap (Felemban / Al-Naffouri, 2020, MCIT Digital Innovation Award)**: "~8.4 bn L/yr wasted in KSA by inefficient wudu, 66% untouched"; device cuts waste up to **43% vs IR taps**; potential **3.32 bn L/yr, USD 81.2 M/yr** in KSA. https://isl.kaust.edu.sa/projects/by-year/2020/smart-tap-revolutionizing-water-usage-wudu-ai ; https://www.kaust.edu.sa/en/news/kaust-researchers-win-inaugural-mcit-digital-innovation-award
- Derived national scale: 100k mosques × 3.1 m³/d ≈ **310,000 m³/day ≈ 113 M m³/yr** ablution greywater (order-of-magnitude; small musallas lower, jawami' on Fridays much higher). [derived]
- Grand Mosque: plan (Dec 2019) to cut bathroom water **65%** (5,660 toilets, 2,241 ablution points). https://saudigazette.com.sa/article/584459 ; sensor taps for Zamzam: https://gulfnews.com/world/gulf/saudi/watch-sensor-taps-introduced-for-zamzam-water-at-grand-mosque-in-saudi-arabias-mecca-1.99991161
- Reuse projects: "Environment-friendly mosques" (جمعية آفاق خضراء + MIA): 10 M trees around 100k mosques irrigated with recycled ablution water; Morooj "Green Mosques"; KAU study on ablution water for flushing in mosques/schools/offices; KSU IDEC cooling from ablution water; Kuwait Hawalli mosques; UAE Masdar tech. https://aawsat.com/home/article/1426401/ ; https://x.com/f_alabdulkarim/status/1752337728606208160 ; https://ddl.ae/book/3248355 ; https://www.alraimedia.com/article/402332/
- Regulation demand: MIA khutbah directive + "rationalization requirements in mosques" + 774 utility-service violations 2025 + SAR 408 M O&M contracts (a buyer with budget for retrofits).

**Existing solutions & gaps:** Self-closing/IR taps (30% saving in Dubai mosque), aerators, "Hawa" wudu taps, Dubai Tap, KAUST AI tap — all **per-tap hardware** needing plumbing swap on 10–40 taps/mosque. Reuse projects are **civil-works** (settling tank + filter + irrigation) with no monitoring, so nobody knows if they work. Gap = **cheap per-mosque metering + greywater-reuse controller** (turbidity/pH/chlorine sensor, level, pump, irrigation timer, dashboard for the imam/MIA) — a "data layer" for the Green Mosques movement.

---

## (e) Greywater reuse in homes/schools

- Greywater = 50–80% of domestic sewage. Al-Jasser (WIT Trans. 2011) "Greywater reuse in Saudi Arabia: current situation & future potential": simple system saves **~30–40% of fresh water** for toilets + landscape under Saudi conditions. https://www.witpress.com/elibrary/wit-transactions-on-ecology-and-the-environment/153/22919 ; https://www.researchgate.net/publication/271423024_Greywater_reuse_in_Saudi_Arabia_Current_situation_and_future_potential
- Household acceptance studies (2022): https://www.sciencedirect.com/science/article/abs/pii/S0957178722000376 ; treated wastewater acceptability: https://www.sciencedirect.com/science/article/abs/pii/S0048969720311700
- Wastewater treatment/reuse status & 2035 forecast: https://link.springer.com/article/10.1007/s13201-025-02484-4
- Code: SBC 701 graywater provisions (storage/disinfection/dyeing per IPC-derived rules).
- **Schools: ~33,500 public schools, >6 M students** (2025); tap ~6 L/min; no Saudi per-student litres figure found — a measurement gap. https://almrj3.com/the-number-of-saudi-schools/ ; https://www.id4arab.com/2026/03/lesson-on-water-conservation.html ; NWC "Water Friends" awareness program.

**Gaps:** Domestic greywater kits sold in KSA are plumbing packages; the failure mode is **stagnation/odour and unknown quality**, which SBC 701 addresses by time limits and disinfection. A cheap **greywater quality/age controller** (turbidity, ORP/chlorine, level, 24–72 h dump timer) is a plausible prototype but fights homeowner acceptance; mosques/schools are the better host.

---

## (f) Landscape irrigation in cities

- Green Riyadh: **7.5 M trees**, **1,350 km** TSE irrigation network, **up to 1.7 M m³/day** TSE transmission (other sources 1 M m³/d); per-capita green area 1.7 → 28 m². [confirmed] https://www.spa.gov.sa/en/476e9bfaccb ; https://aiph.org/green-city-case-studies/riyadh-saudi-arabia-water/ ; https://www.rcrc.gov.sa/en/projects/green-riyadh-project/ ; TSE pipeline contract Q1 2027: https://www.zawya.com/en/projects/saudi-arabia-likely-to-award-green-riyadh-tse-pipeline-contract-in-q1-2027-419775
- Derived: 1.7 M m³/d ÷ 7.5 M trees ≈ **~227 L/tree/day** budget (upper bound, includes lawns/medians). [derived]
- KSU study (Riyadh landscapes): manual irrigation applied **23 and 33 L/m²/day vs 15 L/m²/day needed** in peak season (~100% over-irrigation); Riyadh evaporation **9.4 mm/day avg, 15.3 mm/day peak June**. [confirmed snippet] https://www.sciencedirect.com/science/article/pii/S1018363918305439
- Demand-management modelling on Green Riyadh (MDPI Water 2024) and plant-coefficient model (2025): https://doi.org/10.3390/w16243559 ; https://doi.org/10.3390/w17182785 ; Dar Al-Handasah note: https://www.dar.com/insights/details/water-conserving-irrigation-in-saudi-arabia-
- Leak detection on the irrigation network already contracted to drones (Terra Drone).

**Gaps:** Municipal side is well-funded (RCRC). Student-scale opening is **private villa gardens and mosque courtyards** (manual hose irrigation at 2× need) — soil-moisture + flow node with ET-based scheduling; or **TSE tap-point meters** for contractors.

---

## (g) Household leaks & tariff cost

- Residential tariff (2016 reform, still current): water **0.10 / 1.00 / 3.00 / 6.00 SAR/m³** for 0–15 / 16–30 / 31–60 / >60 m³/month, plus **sewer 50%** and **15% VAT** (combined tiers quoted as 0.15 / 1.5 / 4.5 / 6 / 9 SAR/m³). Commercial flat 9 SAR/m³. Ministry said 95% of subscribers unaffected; 52% pay ≤1 SAR/day. [confirmed snippets] https://www.argaam.com/ar/article/articledetail/id/416258 ; https://www.saudiutilityhub.com/nwc-water-bill-calculator.html ; https://my.gov.sa/en/services/312902 ; https://www.pinsentmasons.com/out-law/news/saudi-arabia-raises-business-water-tariff-by-50
- Consequence: a **leak is priced at the marginal tier**. A stuck float adding 60 m³/month to a 30 m³ household costs ≈ 30×3 + 30×6 = 270 SAR water + 50% sewer + VAT ≈ **SAR 465/month** vs the household's normal ≈ SAR 30. [derived] Toilet flapper leak ~200 L/d ≈ SAR 50/month. [secondary]
- Leak-detection companies "approved by NWC" issue thermal-imaging reports used to contest bills; consumers may object to readings (Water Law art. 33); SWA complaint escalation after 10 working days. https://service-town.com/… ; https://www.swa.gov.sa/ar/services/escalate-complaints-request ; https://agl.sa/complaint-national-water-company-saudi/
- NWC smart-meter alerts: 36k/week (see a).

**Gap:** Nothing continuous and cheap sits between the NWC meter and the household; the "bill shock → hire leak company → contest" loop is the current UX.

---

## (h) Tank water quality & tank-cleaning regulation

- Alkharj roof-tank study (KSU, Pak. J. Zool. 2014, 10 tanks/60 samples): **40% unsatisfactory sanitation grade**; turbidity & residual chlorine outside SASO/WHO limits; **all tanks had heterotrophic bacteria, 80% coliform, 30% faecal coliform**. [confirmed snippet] https://faculty.ksu.edu.sa/sites/default/files/1003-1012_16_pjz-1716-14_22-6-14_assessment_of_water_quality_for_some_roof_tanks_in_.pdf
- Riyadh 180-sample study (network vs ground vs roof tanks): chemically OK, microbial contamination traced to poor tank cleaning/maintenance. https://iwaponline.com/wqrj/article/50/3/287/21614/
- KSA drinking-water quality review 2024: https://www.mdpi.com/2073-4441/16/13/1810
- Municipal rules (MOMRA) require pH and residual chlorine ≤0.5 ppm checks; industry advises cleaning 3–4×/yr in hot cities; roof tanks in Riyadh reach temperatures favouring microbial growth (Legionella 30–50 °C band). [secondary] https://zadksa.com/cleaning/drinking-water-tank/ ; https://starfab.sa/complete-guide-water-tank-cleaning-insulation/
- Related Gulf studies (Sharjah, Dubai household tanks): https://pubmed.ncbi.nlm.nih.gov/34490509/ ; https://www.eeer.org/upload/eer-1476165782.pdf

**Gap:** No consumer-grade sensor tells a household when to clean; a temperature + turbidity + (optionally) free-chlorine node on the roof tank would be new to the Saudi market. Weaker fit to "water loss/greywater" track unless bundled with the overflow node.

---

## (i) Evaporation from open tanks/pools

- Riyadh pan-scale evaporation **9.4 mm/d average, 15.3 mm/d peak** (KSU). A 50 m² villa pool ≈ 0.5–0.75 m³/day ≈ 15–23 m³/month in summer (≈ top tariff tier). [derived from the KSU number] Pools in hot dry climates lose ~13 mm/d. https://poolguardusa.com/pool-water-evaporation-chart/
- Ground/roof tanks are closed (small effect); evaporation matters for pools, fountains, open irrigation reservoirs. Prototype value: low (pool covers already exist), but an **evaporation-vs-leak discriminator** (level sensor + weather) is a nice sub-feature.

---

## (j) Car-wash water

- Regulation: NCEC 2021 — car-wash services must recycle **≥70%**; licence above 500 L/day; new rule bans manual washing at fuel stations. Modern recycling systems 80–150 L/car; 80–90% recovery. [secondary] https://www.arabnews.com/node/2640152/amp ; https://www.shinewashtec.com/… ; Ken Research market: https://www.kenresearch.com/saudi-arabia-car-wash-services-market
- Gap: **compliance monitoring** (does the 70% actually happen?) — a fresh-vs-recycled flow ratio logger for NCEC inspectors is cheap and novel, but far from the "grey water management" wording judges expect.

---

## (k) Schools

- ~33,500 public schools, >6 M students; taps ~6 L/min; no per-student consumption data found for KSA (data gap → measuring it is a valid project output). Ablution + toilets + AC condensate; schools are a good pilot host (Ministry of Education, single decision-maker, daytime-only use so overflow/leak patterns are easy to detect at night).

---

## (l) Dew / fog harvesting

- Asir fog collectors: **6.2 L/m²/day** avg at Al-Souda (2,260–3,200 m), **3.3 L/m²/d** in Abha, max 22.9–24 L/m²/day; Al-Baha feasibility 2025. https://link.springer.com/article/10.1007/s11269-009-9410-9 ; https://link.springer.com/article/10.1007/s43995-025-00250-w ; Jazan coastal fog ecology: https://pmc.ncbi.nlm.nih.gov/articles/PMC9677205/
- Relevance: geographically niche (SW highlands), yields tiny vs demand; fits "water production", not "water loss/greywater". Low priority.

---

## (m) Ranked innovation needs from SWA/SWPC/NWC/MEWA

- No public ranked list found. Signals: MEWA UIC water track text (leaks + greywater); NWS 2030 KPIs (NRW 15%, reuse 90%, per-capita ↓); MEWA RDI Observatory "Water Innovation Trends — Wastewater Treatment & Reuse" (Sept 2025) https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/Documents/(EN)%20(L)%2020250916_MEWA_RDI%20and%20ET%20Observatory-Wastewater%20Treatment%20&%20Reuse%20report_Spreadshe_v24%20-FINAL-.pdf ; Future Makers challenge: "optimize water systems, reduce water losses and energy consumption, improve operational efficiency"; SWA sustainability report 2024 https://www.swa.gov.sa/ar/news/87 ; Saudi Water Week 2026 (Jeddah, 28 Jun–2 Jul) themes: data platforms, AI for forecasting/detection, NRW. https://www.arabnews.com/node/2649353/saudi-arabia

---

## Prior student / hackathon work in KSA (what is already common)

- **KAUST Smart-Tap** (AI wudu tap) — the strongest prior art in the ablution space; a proposal that is "a smart wudu tap" will look derivative. https://isl.kaust.edu.sa/projects/by-year/2020/smart-tap-revolutionizing-water-usage-wudu-ai
- **Mayahthon 2025 winners** (13 teams) incl. "Smart Ric" (water treatment) and "Hydraya" (AI). https://www.okaz.com.sa/local/na/2226076
- **SWA Mubtakiroon hackathon** (65 teams). https://www.swa.gov.sa/ar/news/5
- KSU CFAS student projects list (ablution greywater in Riyadh mosques, KSU Soil Science). https://cfas.ksu.edu.sa/en/node/3449
- KAU study: ablution water for flushing in mosques/schools/offices. https://ddl.ae/book/3248355
- KSU: ablution water for IDEC evaporative cooling of mosques. https://go.gale.com/ps/i.do?id=GALE%7CA490983841
- PLC-based wudu water & electricity rationalization (SSRN). https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3838075
- Generic Arduino/ESP tank-level alarms (Instructables, ielectrony, school projects) — extremely common; level-only.
- AlGhamdi & Sharma 2022 IoT-SWM for buildings on underground tanks (MDPI Processes).
- Ready-made graduation projects marketplace (bahethly.com) sells "smart tank" projects — judges have seen them.
- Regional: Malaysia SmartWUDHU', UTHM Eco-Mosque, Indonesia IoT wudu recycling, Masdar (UAE) wudu-saver, Dubai Tap, Hawa taps.

**Implication:** "tank level alarm" and "smart wudu tap" are saturated. Differentiators that are *not* common: (1) measuring **flow on the overflow/inlet** to quantify and price losses; (2) automatic **valve shut-off + tariff-aware SAR estimate**; (3) **greywater-reuse *monitoring/control*** (quality + age + pump) for existing mosque reuse installations; (4) producing **first Saudi field datasets** (overflow loss per villa, litres per school-student, mosque daily profile).

---

## Ranking for a cheap ESP32/sensor/software prototype (see summary)

1. Villa/mosque tank overflow & float-valve loss guardian (flow + level + valve + SAR).
2. Mosque ablution greywater reuse controller + per-mosque metering (Green Mosques data layer).
3. After-the-meter household leak analytics (night-flow / continuous-flow signature, tariff-aware alerts).
4. Private garden / mosque courtyard smart irrigation with ET scheduling (2× over-irrigation baseline).
5. School water audit node (ablution + toilets + night leaks; fills a data gap; single owner).
6. Roof-tank quality/temperature sentinel (bundle-able with #1; weaker fit to track wording).
