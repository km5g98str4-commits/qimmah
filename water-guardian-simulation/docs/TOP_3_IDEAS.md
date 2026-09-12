# TOP 3 IDEAS — short version

Full reasoning, evidence tags and the kill list: `ALTERNATIVE_IDEA_SEARCH.md`. Research notes: `research/notes/`.

## Scoreboard (/100, weights as requested)

| Rank | Idea | Score |
|---|---|---|
| 1 | **Tank Guardian** — overflow-pipe metering + level-slope consumption + inlet valve + SAR pricing | **88** |
| 2 | AC Condensate Harvester-Meter (Jeddah/Makkah "water production") | 74 |
| 3 | RPW Pheromone-Trap Photo Counter (Weqaa registry layer) | 73 |
| — | Feast surplus bin | 75, **removed** under hostile review (Etaam will not dispatch on a sensor; Winnow/Kitro/HX711 bins exist) |
| — | **Water Guardian as is** (clamp-on ultrasonic) | **56** |

## 1. Tank Guardian (recommended)

**One sentence:** a SAR ≈ 150–250 retrofit node on the water tank every Saudi building already has: it meters the overflow pipe (the only pipe that carries purely wasted water, unpressurised, cuttable), reads consumption from the tank's level slope, closes the inlet when the float valve fails, and tells the caretaker in litres and riyals.

- **Problem:** intermittent supply → ground tank + roof tank + float valves everywhere; a stuck float dumps "thousands of litres/day" at night and is billed at the top tier (60 m³ extra ≈ SAR 465/month vs ≈ SAR 30 normal). NWC's answer is a monthly SMS. No national overflow-loss statistic exists.
- **Track fit:** "water loss … distribution optimization … rationalization of consumption" — literal.
- **What is new:** measuring loss where it is already separated (overflow pipe); using the tank as the flow meter (level slope = consumption, so the persistent-flow logic we already built runs with no pipe sensor); priced, valve-closing intervention. Prior-art check: overflow *alarms* and level-only IoT exist; this combination does not (SOMEWHAT NOVEL).
- **Cost:** node SAR 150–250; with demo rig SAR 250–350. ESP32 owned. All software already written (rule engine, SENSOR_UNKNOWN, offline buffer, Telegram, simulator, test campaign) transfers unchanged.
- **Build:** day-1 bench PoC; week-1 valve + slope; week-2 logs on 3–5 real tanks; week-3 polish.
- **60-s demo:** judge jams the float → water pours from the overflow into a jug, counter shows litres and SAR, phone buzzes, valve clunks shut; judge opens the outlet tap instead → level slope shows "persistent consumption 1.8 L/min during QUIET"; close it → resolved. Demo wow 9/10.
- **Numbers we can produce before the event:** detection time, litres per event vs jug, slope-method resolution (≈ 1 L/min over 10 min on a 1 m² tank — calculated, must be verified), false alarms over N nights on real tanks, SAR/month avoided.
- **Risks / must verify:** dribble-rate overflow may not spin a turbine (add non-contact presence sensor + tipping-bucket fallback); ultrasonic level echoes in closed tanks; use a motorised valve (fails open), not an NC solenoid; owners may fear auto shut-off (alert-only mode).
- **Why it wins:** visible, cheap, Saudi-specific, track-literal, first measured number, day-1 working.
- **Why it could lose:** judges pattern-match to "tank alarm" unless the overflow-metering and slope-as-flow insights lead the pitch.

## 2. AC Condensate Harvester-Meter

Meter, store and reuse the condensate every coastal AC already produces (KAU: ≈ 20,600 L/yr from one Jeddah split unit). Tipping-bucket gauge + ESP32 + pump to trees; SAR 150–250. Fits "Water Production / alternative sources" and the Makkah/Jeddah partners (Ain Al-Aziziah, MPDA's 7.7 M trees). Weakness: published science, Dubai buildings already do it at scale, yield ≈ 1 L/day in Riyadh/winter, demo needs a humidifier. Best as a **module** in a Makkah-framed Tank Guardian pitch, not the main entry.

## 3. RPW Pheromone-Trap Photo Counter

Phone photo of the bucket trap → count weevils → GPS heat map for Weqaa's 13.3 M geo-coded palms; replaces ~376,000 manual trap checks. Near-zero hardware, MEWA names this value chain, no product exists for bucket traps (smart traps are moth sticky-card systems). Blocker: no public bucket-trap image dataset — needs a farm visit and ≥ 30 real photos in week 1 or it is a slide, not a demo. Choose this only if the team prefers the agriculture track and has farm access.

## Head-to-head with Water Guardian

| | Water Guardian | Tank Guardian |
|---|---|---|
| Sensor risk | total (SAR 600 clamp-on unverified at 0.5–1 L/min on PPR) | none (stock parts, unpressurised) |
| Cost | SAR 900–1,800 | SAR 250–350 |
| Time to first demo | weeks | 1 day |
| Novelty | clamp-on leak monitoring is a known category | placement + slope-as-flow + priced shut-off not found as a product |
| Demo | simulator only until the meter works | water pours, valve closes |
| **Abandon WG for it?** | — | **YES — keep WG's software, replace its sensor** |

## Recommendation

**KEEP WATER GUARDIAN BUT MODIFY IT → Tank Guardian.** Same rule engine, same alerts, same honesty principles; the sensing moves from a pressurised PPR pipe (expensive, unverified) to the tank's overflow pipe and level (cheap, verifiable in a day). The clamp-on meter becomes an optional future add-on for buildings without accessible tanks.

**One team, one entry, three weeks, SAR 1,000 of my own money:** Tank Guardian. SAR 350 builds it with the demo rig; SAR 650 buys a second node and a week of real-tank data for the pitch.

**Before finalising the pitch:** open the MEWA UIC page in a normal browser and re-confirm edition-2 dates/rubric (none were findable from the sandbox); verify overflow dribble detection and level-slope resolution on a real tank in week 1; name a Makkah-region pilot site.
