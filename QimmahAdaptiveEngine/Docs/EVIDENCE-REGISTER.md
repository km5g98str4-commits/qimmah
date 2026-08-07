# QAE Evidence Register

**Status:** Living document · Phase 0.5 · Authorized by [CTO-QAE-001] §19
**Verification date:** 2026-08-07 (live web verification; DOIs/URLs located and checked)
**Labels:** `VERIFIED_EVIDENCE` (source located and checked) · `PRODUCT_POLICY` (founder/product choice, honestly non-scientific) · `ASSUMPTION` (conservative placeholder) · `RESEARCH_REQUIRED` (no adequate source located — cannot ship enabled)

**Register rules:** no numeric rule ships without an entry here; every entry names the rule IDs depending on it (filled as rules are authored); population tags matter — general-population guidelines (ACSM/WHO/NSF) vs trained/lean-athlete literature (Helms/Iraki/Schoenfeld/Zourdos) must not be conflated.

---

## EVR-001 — Safe rate of weight loss

- **Claims:** ACSM: 500–1000 kcal/day deficit (overweight/obese general population, with ≥150 min/wk PA). Athletes: ~0.5–1 % BW/week (Helms 2014); RCT: 0.7 %/wk preserved lean mass/strength better than 1.4 %/wk (Garthe 2011, n=24 elite athletes).
- **Sources:** Donnelly JE et al., ACSM Position Stand, *Med Sci Sports Exerc* 2009;41(2):459–471, DOI 10.1249/MSS.0b013e3181949333 · Garthe I et al., *IJSNEM* 2011;21(2):97–104, DOI 10.1123/ijsnem.21.2.97 · Helms ER et al., *JISSN* 2014;11:20, DOI 10.1186/1550-2783-11-20.
- **Strength:** guideline + small RCT + evidence-based review. **Label: VERIFIED_EVIDENCE.**
- **Notes:** two different populations; rules must branch on population/leanness. Depends: `weightLossTooFast` threshold, cut-rate target band.

## EVR-002 — Protein intake

- **Claims:** ISSN: 1.4–2.0 g/kg BW/day for most exercising individuals (per-meal ~0.25 g/kg or 20–40 g). In caloric restriction, lean resistance-trained: 2.3–3.1 g/kg **FFM**/day (Helms 2014 SR).
- **Sources:** Jäger R et al., ISSN Position Stand, *JISSN* 2017;14:20, DOI 10.1186/s12970-017-0177-8 · Helms ER et al., *IJSNEM* 2014;24(2):127–138, DOI 10.1123/ijsnem.2013-0054.
- **Strength:** position stand + systematic review (N=6). **Label: VERIFIED_EVIDENCE.**
- **Notes:** Helms range is per kg FFM, not BW — do not conflate units. 2025 update (Refalo/Helms, *Strength Cond J*) located, not yet deeply verified — follow-up pass before encoding. Legacy oracle uses flat 1.8 g/kg BW all goals, uncapped (see LEGACY-ENGINE-MAP defect L-NUT-1).

## EVR-003 — Hypertrophy volume dose-response

- **Claims:** significant dose-response of weekly sets; 10+ sets/muscle/week > <10 (ES diff 0.241); upper bound unresolved; substantial heterogeneity.
- **Source:** Schoenfeld BJ, Ogborn D, Krieger JW, *J Sports Sci* 2017;35(11):1073–1082, DOI 10.1080/02640414.2016.1210197.
- **Strength:** meta-analysis (15 studies). **Label: VERIFIED_EVIDENCE.**
- **Notes:** "10+" is a floor for near-maximal response, not proof 20>10. Newer meta-regression (Pelland et al., located) — RESEARCH_REQUIRED follow-up before its numbers enter rules. Depends: volume caps, `VOLUME_BY_CLASS`-successor tables.

## EVR-004 — Frequency per muscle

- **Claims:** ≥2×/week > 1×/week for hypertrophy (2016 MA); effect softens when weekly volume equated (2019 follow-up) — frequency is a volume-distribution tool.
- **Sources:** Schoenfeld BJ et al., *Sports Med* 2016;46(11):1689–1697, DOI 10.1007/s40279-016-0543-8 · Schoenfeld 2019 *J Sports Sci* (volume-equated re-analysis).
- **Strength:** meta-analyses. **Label: VERIFIED_EVIDENCE.**
- **Notes:** supports legacy leg-day warning (<2 leg sessions) and split-selection policy.

## EVR-005 — WHO 2020 physical activity guidelines

- **Claims:** adults 18–64: 150–300 min/wk moderate (or 75–150 vigorous) + muscle-strengthening ≥2 days/wk. Adolescents 5–17: average 60 min/day MVPA + strengthening ≥3 days/wk.
- **Source:** Bull FC et al., *Br J Sports Med* 2020;54(24):1451–1462, DOI 10.1136/bjsports-2020-102955.
- **Strength:** global guideline (GRADE). **Label: VERIFIED_EVIDENCE.**

## EVR-006 — Daily steps dose-response

- **Claims:** mortality benefit plateaus ~6,000–8,000/day (≥60 y) and ~8,000–10,000/day (<60 y) (Paluch 2022, 15 cohorts). ~7,000/day yields sizeable risk reductions vs 2,000 (Ding 2025). 10,000 is not evidence-derived. ~7,500/day approximates the 150 min/wk guideline (Tudor-Locke 2011).
- **Sources:** Paluch AE et al., *Lancet Public Health* 2022;7(3):e219–e228, DOI 10.1016/S2468-2667(21)00302-9 · Ding D et al., *Lancet Public Health* 2025, PII S2468-2667(25)00164-1 · Tudor-Locke C et al., *IJBNPA* 2011;8:79.
- **Strength:** meta-analyses of cohorts (associational). **Label: VERIFIED_EVIDENCE** for dose-response values.
- **Notes:** informs sensible target ceilings and the "10k default is not evidence" correction to the legacy flat default.

## EVR-007 — Step progression increments

- **Claim sought:** a safe/effective ramp rate (e.g., "+500–1,000/day every 1–2 weeks").
- **Result:** **no primary source located.** Common heuristic without evidentiary derivation. Needed: pedometer-intervention RCT analyses (e.g., Bravata 2007 JAMA MA) / walking-program ramp-injury literature.
- **Label: RESEARCH_REQUIRED.** Until resolved: increments ship as ASSUMPTION-labeled conservative values with founder sign-off, or don't ship. Depends: all `QAE-STP-*` increase rules ([CTO-QAE-001] §14).

## EVR-008 — Youth resistance training (13–17)

- **Claims:** properly supervised RT is relatively safe and beneficial for youth; technique emphasis; caution on maximal loads in skeletally immature athletes. Convergent across NSCA (Faigenbaum 2009), International Consensus (Lloyd 2014, *BJSM* 48:498–505, DOI 10.1136/bjsports-2013-092952), AAP 2020 (Stricker et al., *Pediatrics* 145(6):e20201011, DOI 10.1542/peds.2020-1011).
- **Strength:** three convergent position statements. **Label: VERIFIED_EVIDENCE.**
- **Notes:** none supports aggressive caloric restriction in minors — reinforces the characterized minors policy (maintenance-only) as evidence-aligned, not just product-chosen.

## EVR-009 — Minimum calorie intakes

- **Claims (verifiable):** VLCD formally = <800 kcal/day, medical supervision only (NIH Task Force, *JAMA* 1993;270(8):967–974) ; kcal cut-offs are arbitrary relative to individual expenditure (Tsai & Wadden, *Obesity* 2006;14(8):1283–1293, DOI 10.1038/oby.2006.146).
- **The popular 1200/1500 floors: no evidentiary derivation located.** **Label:** VERIFIED_EVIDENCE for the <800 line and the arbitrariness critique; **RESEARCH_REQUIRED** for 1200/1500 as evidence.
- **Notes:** legacy floors (male 1500 / female 1200 / unspecified 1350) are hereby classified **PRODUCT_POLICY (conservative convention)** — kept as characterized behavior, honestly labeled, with the evidence-aligned supplement: never target VLCD territory, prefer deficit-relative bounds. Depends: `QAE-SAF` nutrition floor rules.

## EVR-010 — Deloads

- **Claims:** Delphi consensus definition & typical practice ~1 wk per 4–8 wks (Bell 2023, *Sports Med Open* 9:87, DOI 10.1186/s40798-023-00633-0); near-universal practice (Bell 2024 survey); one controlled trial: mid-program 1-wk deload ⇒ similar hypertrophy vs continuous (Coleman 2024, *PeerJ* 12:e16777).
- **Strength:** consensus + survey + one trial. **Label: VERIFIED_EVIDENCE that it is practice-based**, not outcome-mandated.
- **Notes:** frame as low-cost fatigue management ("recovery management, optional"), never "evidence-mandated." Depends: `scheduleDeload` rules.

## EVR-011 — Ramadan fasting & training

- **Claims:** small decrements in repeated-sprint/peak power; most performance parameters unaffected (Abaïdia 2020 MA, *Sports Med* 50:1009–1026, DOI 10.1007/s40279-020-01257-0); small reversible body-comp changes (Correia 2019 SR); umbrella review: trivial-to-small effects, moderated by maintained training load/sleep/diet quality (Trabelsi 2023, *BJSM*, DOI 10.1136/bjsports-2023-106826).
- **Strength:** MA + SR + umbrella review. **Label: VERIFIED_EVIDENCE.**
- **Notes:** training-*timing* prescriptions are practice-based, not outcome-tested — label accordingly. Depends: `QAE-RMD-*`.

## EVR-012 — RIR/RPE autoregulation

- **Claims:** RIR-anchored RPE scale valid (velocity–RPE r=−0.88 experienced, −0.77 novice; Zourdos 2016, *JSCR* 30(1):267–275, DOI 10.1519/JSC.0000000000001049); prescription framework (Helms 2016, *SCJ* 38(4):42–49, DOI 10.1519/SSC.0000000000000218).
- **Strength:** validation study + methodological review. **Label: VERIFIED_EVIDENCE.**
- **Notes:** accuracy degrades far from failure and in novices — treat novice RIR as noisy; bias conservative. Supports RIR features being advanced-band only.

## EVR-013 — Sleep

- **Claims:** adults 7–9 h, teens 8–10 h (Hirshkowitz 2015, *Sleep Health* 1(1):40–43, DOI 10.1016/j.sleh.2014.12.010); athletes often need individualized/more (Walsh 2021, *BJSM* 55:356–368, DOI 10.1136/bjsports-2020-102025); adolescent <8 h ⇒ 1.7× injury odds, observational (Milewski 2014, *J Pediatr Orthop* 34(2):129–133, DOI 10.1097/BPO.0000000000000151).
- **Strength:** guideline + consensus + observational. **Label: VERIFIED_EVIDENCE.**
- **Notes:** injury-risk messaging stays in the app's conservative/inferred tone register. Depends: recovery factor weights.

## EVR-014 — Detraining & muscle memory

- **Claims:** strength largely maintained ~3–4 wks of cessation, losses accelerate after (Mujika & Padilla 2000/2001; Encarnação 2022 SR, *Muscles* 1(1):1–15, DOI 10.3390/muscles1010001); 6-wk train / 3-wk break cycles ≈ continuous over 24 wks (Ogasawara 2013, *EJAP* 113:975–985, DOI 10.1007/s00421-012-2511-9); epigenetic memory of hypertrophy, faster retraining gains (Seaborne 2018, *Sci Rep* 8:1898, DOI 10.1038/s41598-018-20287-3).
- **Strength:** SRs + RCT + mechanistic. **Label: VERIFIED_EVIDENCE.**
- **Notes:** decay curves vary widely — encode ranges; muscle-memory used for reassurance messaging only. Depends: RETURNING-USER-POLICY thresholds.

---

## Characterized legacy constants requiring register classification

These live in the oracle today; classification here governs their QAE fate:

| Legacy constant | Value | Classification |
|---|---|---|
| Mifflin-St Jeor BMR | standard coefficients | VERIFIED_EVIDENCE (standard equation; validation lit to be added on demand) |
| `unspecified` sex constant | −78 ("approximate average") | PRODUCT_POLICY (self-declared non-standard in source) |
| NEAT multipliers + days×0.025 + cap 1.9 | table | PRODUCT_POLICY (self-declared "NON-STANDARD Qimmah heuristic; no primary source") |
| Cut −400 / bulk +300 kcal | fixed deltas | PRODUCT_POLICY (within ACSM deficit range for cut; bulk ≈ upper end of Iraki 10–20 % for many users — candidates for EVR-001/EVR-010-aligned re-derivation) |
| Calorie floors 1500/1200/1350 | fixed | PRODUCT_POLICY per EVR-009 |
| Protein 1.8 g/kg BW flat | fixed | PRODUCT_POLICY (inside ISSN 1.4–2.0 band; deficit/lean cases under-served vs EVR-002 — flagged) |
| Fat 27 % kcal | fixed | PRODUCT_POLICY / ASSUMPTION |
| 7,700 kcal/kg (Wishnofsky) | forecast constant | ASSUMPTION (known-simplistic model; display forecasts only, never adaptation logic) |
| Water 0.035 L/kg, clamp [2.5, 4.0] L | fixed | PRODUCT_POLICY (self-declared NON-STANDARD vs EFSA) |
| Insights thresholds (4 pts / 14-day span / plateau 3 wks / band 0.6 kg / stale 9 d …) | table | PRODUCT_POLICY (self-declared NON-STANDARD) — starting candidates for DataQuality/Trend confidence tables |
| Step goal default 10,000 | fixed | PRODUCT_POLICY — contradicted by EVR-006 as "evidence"; QAE replaces with baseline-derived targets (approved [CTO-QAE-001] §14) |
| Sets/reps/rest SCHEMES, exercises/session tables | tables | PRODUCT_POLICY (characterized; broadly consistent with EVR-003/004 spirit) |

## Open research gaps (report item 7)

1. **EVR-007** step progression increments — no source; blocking `QAE-STP` increase magnitudes.
2. Pelland et al. volume meta-regression + Refalo protein/FFM 2025 update — located, need a dedicated verification pass before their numbers enter rules.
3. Rate-of-change bands for "too fast" weight loss/gain per population (EVR-001/EVR-010 give athlete anchors; general-population deficit bands need mapping to g/week for the trend rules).
4. Plateau operational definition (weeks × band) — current candidates inherit self-labeled NON-STANDARD legacy values; a literature-anchored definition is desirable, may end as PRODUCT_POLICY.
5. Youth-specific volume caps (EVR-008 is qualitative; quantitative caps will likely be PRODUCT_POLICY).
