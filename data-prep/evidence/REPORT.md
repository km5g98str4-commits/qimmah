# Offline data preparation — evidence report

**Branch:** `claude/qimmah-offline-data-prep-p8qgir` · **Date:** 2026-08-28
**Status: PREPARED FOR REVIEW. Nothing imported, deployed, merged, or pushed to Supabase.**

Boundaries honoured: the release candidate was not touched, no application logic was
modified, Supabase and Salla were not contacted, no deployment ran, and no data was
imported. Everything produced lives in `data-prep/`, outside `src/`.

---

## 0. The headline, stated plainly

**DATASET B (machine programs) is complete as specified.** 8 programs, 19 workout-day
variants, 125 ordered exercise records, every id resolved against the real catalog.

**DATASET A (Saudi food) is 96 products, not 500 — and it is not padded to look bigger.**
The authoritative nutrition sources are blocked by this environment's network policy
(`evidence/egress-probe.txt`). Product **identity and GTIN** could still be evidenced;
per-product **nutrition panels could not be read**, so they are `null`, never guessed.
The brief said to return 400 rather than fabricate 100 — the same principle applied at 96.

---

## 1. Verify-before-build (charter §2) — what already existed

Checked the trunk before writing anything. Four things already existed and changed the plan:

| Found | Effect |
|---|---|
| `src/data/exercises.ts` — 181 exercises with canonical slug ids | Became the id source. No id was invented. |
| `src/data/machineCatalog.ts` — 39 approved machine entries | Used to mark `in_approved_machine_catalog` per exercise. |
| `src/lib/workoutOrder.ts` (Q19) + `test:workout-order` | An **enforced ordering law**. Programs comply; 12 deviations from the requested order are recorded, not hidden (see F-2). |
| `docs/data-factory/packaged/PKG-001` — 55 GTIN-verified products | Reused as the evidenced core instead of re-researching it. |
| `src/features/products/types.ts` + `saudiSeed.ts` | The real import schema and a **runtime OFF seed the app already ships**. DATASET A is shaped to it. |
| `src/data/exerciseMediaManifest.generated.ts` | Already honest about media (`stills` / `placeholder-only` / `missing`). Reused rather than re-invented. |

---

## 2. DATASET B — `exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json`

### Required metrics

| Metric | Value |
|---|---|
| `PROGRAM_COUNT` | **8** |
| `WORKOUT_DAY_VARIANTS` | **19** distinct (Programs 4 and 7 reuse variants by design) |
| `CANONICAL_EXERCISES` | **46** — 22 programmed + 24 substitution-only |
| `MACHINE_ONLY_VALIDATION` | **PASS** — equipment across all 46 ids: `machine` 35, `cable` 11. Zero barbell/dumbbell/kettlebell/bench/bodyweight. |
| `CATALOG_IDS_MATCHED` | **46 / 46** |
| `CATALOG_IDS_UNRESOLVED` | **3** (listed below) |
| `MEDIA_VERIFIED` | **23** (real start/end stills, licence + source recorded) |
| `MEDIA_UNRESOLVED` | **23** (20 `placeholder-only`, 3 `missing`) |
| `YOUTUBE_VERIFIED` | **0** |
| `SUBSTITUTION_MAPPINGS` | **44** unique base→substitute pairs |
| Total ordered exercise records | **125** |

**`YOUTUBE_VERIFIED = 0` is a real finding, not a gap in effort.** Every `videoUrl` in
`exercises.ts` is a *YouTube search URL* (`videoSource: 'youtube_search'`), not a specific
verified video. Reporting these as verified videos would be false, so they are exposed as
`youtube_search_url` with `youtube_verified: false`.

**`MEDIA_UNRESOLVED = 23` is deliberate upstream.** The media pipeline excludes machine
cards from the free-exercise-db image set specifically so a machine is never illustrated
with a wrong free-weight photo. That is the brief's own rule (`IMAGE_STATUS = UNRESOLVED`
rather than invented provenance) already implemented in the repo.

### Unresolved catalog ids — asked for, absent, not faked

1. **Assisted Pull-Up Machine** — no such entry. `assisted-dip-machine` is a press, not a
   vertical pull, so it was **not** substituted. (Brief said "where available".)
2. **Rotary Torso Machine** — no such entry. `cable-woodchop` is rotation but a different
   station; recorded as *nearest*, not silently mapped. (Brief said "where appropriate".)
3. **Leg Press Calf Raise** — exists in `exercises.ts` but is **not** in the approved
   machine catalog. Used only as a declared substitution, never as a programmed exercise.

### The session invariant ("1 of 1" must never recur)

Each variant stores **N distinct ordered records** with `order` running exactly `1..N`,
plus `exercise_count`, plus a denormalised `resolved_days[].exercise_ids_in_order` on every
program. The validator fails on: fewer than 2 records, a broken `1..N` sequence, a repeated
exercise within a day, or a resolved day disagreeing with its variant. An 8-exercise
template cannot collapse to one record without failing a named check.

### Prescriptions, warm-ups, substitutions

- **Sets/reps/rest vary by role** (`primary_compound` 3×8–12 / 90–120 s · `secondary_compound`
  3×10–12 / 75–90 s · `isolation` 3×12–15 / 45–60 s · calves 3×12–20 · core 2×12–20), with a
  lighter **beginner tier** for Programs 6 and 8. Role is derived from the catalog's own
  movement pattern and muscle, not typed per exercise.
- **`optional` / `required`** — core finishers and the closing arm isolation on 8+ lift days
  are optional; everything else is required.
- **Warm-ups are separate records** (`warmup-upper` / `warmup-lower` / `warmup-full`), each
  item flagged `is_working_exercise: false`. The ramp-up set carries **no** `exercise_id`;
  it sets `references_first_working_exercise: true`. No machine press is ever the warm-up.
- **Substitutions are machine/cable only** and are validated against the catalog's *detailed*
  muscle map. Two exercises have **no substitute on purpose**: `leg-extension-machine` and
  `ab-crunch-machine` — the catalog has no same-function alternative, and offering an
  unrelated one is exactly what the brief forbids. Both carry a written reason.

---

## 3. DATASET A — `food/SAUDI_FOOD_TOP_PRODUCTS.json`

### Required metrics

| Metric | Value |
|---|---|
| `TOTAL_PRODUCTS` | **96** |
| `FULLY_VERIFIED` | **6** (two independent agreeing sources) |
| `PARTIALLY_VERIFIED` | **45** (single documented source) |
| `NEEDS_REVIEW` | **4** (two sources diverging > 8 %) |
| `IDENTITY_ONLY` | **41** (identity + GTIN evidenced, nutrition null) |
| `GTIN_VERIFIED` | **96 / 96** — every GTIN passes the EAN-13 check digit |
| `NUTRITION_VERIFIED` | **55** |
| `IMAGE_VERIFIED` | **0** |
| `DUPLICATES_REMOVED` | **6** |
| `REJECTED` | **5** |
| `UNRESOLVED_HIGH_PRIORITY` | **37** named products across 7 groups |

`FULLY_VERIFIED + PARTIALLY_VERIFIED + NEEDS_REVIEW = 55` — the nutrition-evidenced core,
carried from PKG-001 and **re-run through its five integrity checks** here so a bad
carry-over cannot pass silently. `55 + 41 = 96`.

### Why 96 and not 500

`evidence/egress-probe.txt` (captured this session): `world.openfoodfacts.org`,
`static.openfoodfacts.org`, `www.almarai.com`, `sfda.gov.sa`, `panda.com.sa`,
`www.carrefourksa.com`, `fdc.nal.usda.gov` — **all blocked**. The proxy answers 403 to
CONNECT; the WebFetch tool returns `EGRESS_BLOCKED`. Only web-search *result listings*
were readable.

That is enough to establish **identity and GTIN** (an OFF listing title carries both) but
not to read a **nutrition panel**. So nutrition stayed null on all 41 new records.

**What unblocks the target:** allow-list `world.openfoodfacts.org` and re-run
`build-food.mjs`. The OFF Saudi facet returns hundreds of products with GTIN *and*
nutrition in a single query — the app's own `saudiSeed.ts` already does exactly this at
runtime on a networked device.

### Integrity work that did fire

- **6 duplicates removed** — harvested listings that collided with an already-evidenced
  PKG-001 product (same GTIN). Kept in the input deliberately so dedupe ran on real data.
- **5 rejected** — `0112112111212` (fails check digit), `4284466084033` (prefix 428 South
  Korea on a Saudi bakery item), `6223001874317` (prefix 622 Egypt — different market),
  `0617950143598` (US prefix on an Al Alali pack), `7891515546410` (Brazilian Sadia pack
  not shown to be the Saudi one).
- **5 leads carry prior-rejection history** — GTINs PKG-001 already rejected with a written
  reason (Atwater failure, missing label photo). They reappear tagged with that history
  instead of coming back looking fresh.
- **GS1 prefix spread:** 628 Saudi Arabia 81 · 629 UAE 10 · 627 Kuwait 4 · 608 Bahrain 1.
  Every record is GCC-registered. (Caveat carried in the data: a prefix identifies the
  *registering company*, not the country of manufacture or sale.)

### Category coverage

**Nutrition-evidenced (55):** liquid milk 8 · cheese 7 · juices 6 · yoghurt 5 · bread 5 ·
laban 4 · protein drinks 3 · oats & cereal 5 · canned fish 2 · canned goods 2 · dates 2 ·
nuts & butters 3 · snacks 2 · cream 1.

**Identity-only (41):** liquid milk 8 · ice cream 6 · laban 4 · bread & toast 4 · bottled
water 4 · flavoured milk 2 · protein milk 2 · yoghurt 2 · canned tuna 2 · cream 1 · mezze 1 ·
juice 1 · bakery 1 · canned 1 · milk powder 1 · frozen chicken 1.

**Brands reached — 27 labels in the evidenced tier:** المراعي (Almarai) · لوزين (L'usine) ·
نادك (Nadec) · ندى (Nada) · السعودية/سدافكو (Saudia) · أكتيفيا (Activia) · الربيع (Al Rabie) ·
كي دي دي (KDD) · مزون (Mazoon) · رينبو (Rainbow) · مزارع العين (Al Ain) · بوك (Puck) ·
يومي (Yaumi) · هرفي (Herfy) · كويكر (Quaker) · هناء (Hanaa) · تيفاني (Tiffany) · ليز (Lay's) ·
قودي (Goody) · الضيف (Al Dhaif) · ولنس/سنبلة (Wellness) · Nutty Nuts · Organic Larder ·
الإمارات ماكاروني (Emirates Macaroni) · لاكنور (Lacnor) · MF · and `غير مذكورة في المصدر`
(brand not stated in the source) on 5 records.

**11 labels in the identity-only tier:** Almarai · L'usine · Nadec · Nada · Saudia ·
Al Safi · Alqariah · Berain · Goody · Herfy · and one unbranded tuna listing.

> **Normalisation task found, not fixed:** the two tiers spell brands differently — the
> evidenced tier uses Arabic only (`المراعي`), the identity tier uses `English / Arabic`
> (`Almarai / المراعي`). Left as-is rather than silently rewritten, because brand
> canonicalisation is a schema decision that belongs with the `barcode`-as-key question in
> §5. A brand lookup table should be settled before either tier is imported.

### Unresolved high-priority (37 products, 7 groups)

Carbonated soft drinks (10) · energy drinks (2) · bottled water non-Berain (3) · instant
noodles (3) · crisps & snacks (4) · chocolate & biscuits (8) · frozen chicken & poultry (5)
· RTD coffee and sports protein (2). Each group carries the reason it could not be
evidenced. **The mandatory soft-drink list is entirely in here** — see F-3.

---

## 4. Gates — and the attacks on them

Both validators fail by **named rule**, never by bare exception, and both were attacked
per charter §4.2 (*every exception is guarded by an assertion that proves it has not
become the rule*).

```
$ node data-prep/scripts/validate-programs.mjs
PASS — DATASET B
  programs=8 variants=19 exercise_records=125
  canonical_exercises=46 warmups=3

$ node data-prep/scripts/validate-programs.mjs --attack
PASS — 17/17 bypass attempts rejected by a named check.

$ node data-prep/scripts/validate-food.mjs
PASS — DATASET A
  products(with nutrition)=55 identity_leads=41 rejected=5
  macro-tuple collisions across brands (review signal, not a failure): 0

$ node data-prep/scripts/validate-food.mjs --attack
PASS — 13/13 bypass attempts rejected by a named check.
```

Attacks include: smuggling a dumbbell into a session · inventing an exercise id ·
flattening a workout to one record · placing isolation before a compound · promoting a
warm-up into the working list · turning a ramp-up into a working exercise · an unrelated
substitution · **fabricating nutrition on an identity lead** · a GTIN with a bad check
digit · re-admitting a rejected barcode · **inflating the headline count toward 500** ·
relabelling the dataset as imported.

**Two attacks found real defects and were fixed:**

1. An invented exercise id originally failed with a `TypeError` instead of a named rule.
   The charter is explicit that an unnamed failure is not proof — the validator was guarded
   so `NO_INVENTED_IDS` names it.
2. The substitution function-match rule was first written on the *coarse* muscle group. It
   raised a false positive on a valid rear-delt swap and — tested the other way — would have
   waved through swapping a chest press for a triceps machine (both list `triceps` as a
   primary). It now tests the **leading detailed muscle**, with a same-pattern/same-class
   fallback for the flat-vs-incline case, and carries an attack case for that exact hole.

---

## 5. Proposed import plan — proposal only, nothing executed

**DATASET B**, in this order:

1. Review `order_deviations[]` (12 days) and decide F-2: adopt the Q19 order, or change the
   law. **Everything downstream depends on this answer.**
2. Land the 3 unresolved catalog ids as a product decision: add an assisted pull-up and a
   rotary torso machine to `exercises.ts`, or accept the programs without them.
3. Import `canonical_exercises` metadata first (no new ids — all 46 already exist).
4. Import `warmups` as a *separate* entity from working exercises.
5. Import `workout_variants` as ordered child records — **one row per exercise, never a
   flattened day**.
6. Import `programs` last, referencing variants.
7. Gate: re-run `validate-programs.mjs`, then `npm run test:workout-order` and
   `npm run test:catalog` after `npm ci`.

**DATASET A**, in this order:

1. **Do not import `identity_leads[]` as food entries.** They have no nutrition; a logging
   screen must never show a product with blank macros. Load them as a *resolution queue*.
2. Import the 6 `FULLY_VERIFIED` first, then the 45 `PARTIALLY_VERIFIED`, mapping to
   `ProductInput` in `src/features/products/types.ts` with
   `source.sourceName: 'authorized:data-factory/PKG-001'`.
3. Hold the 4 `NEEDS_REVIEW` until the current pack label is read.
4. Before any of it: settle the open engineering question PKG-001 already raised — whether
   `barcode` becomes a unique key alongside existing `foodItems` ids, and how `source` /
   `confidence` / `last_verified` are represented. **DATASET A cannot be imported honestly
   without those fields**, because nothing else distinguishes an official label value from
   an unverified one.
5. Then unblock the network and re-run the builder to close the 37 unresolved products.

---

## 6. What was not done, and why

- **No product was invented to reach 500.** 96 is the honest count.
- **No nutrition, GTIN, serving size or image was estimated, inferred from a similar
  product, or copied from another flavour.** Missing is `null`.
- **No soft drink or energy drink was included** despite being top of the mandatory list —
  only foreign-market packs were reachable (F-3).
- **No application code was modified**, including the `cable-rear-delt-fly` muscle-map bug
  (F-1), which is raised for its owning lane instead.
- **The two validators were not added to `test:gate`** — these are review materials, not
  production code; wiring them into the gate is the coordinator's call if the data is
  adopted.
