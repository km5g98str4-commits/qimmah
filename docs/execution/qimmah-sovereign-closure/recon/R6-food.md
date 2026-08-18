# R6 — FOOD CATALOG: IS THE LONG TAIL ACTUALLY SERVED?

Repo `/Users/ziyad/qimmah-deploy` · branch `codex/qimmah-sovereign-closure-001` · HEAD `740023b`
Read-only forensics. Repo working tree unchanged (verified: `git status --short` identical before/after).

## VERDICT

**The long tail is NOT served. 0 of 41 shards resolve — 82/82 requests return 404.**
And even if all 41 were uploaded tomorrow, **text search still would not reach them**, because of two
further defects proven below: `Catalog.search()` never fetches a shard payload, and no production
caller ever passes `deepShards`.

The founder's "50k+ foods live" is **599 live records** (hot set) + **641 curated local items**.
The other **59,941 rows exist only as sha256 fingerprints in a manifest.** The shard bytes do not
exist anywhere on this machine.

Three independent blockers, in order of discovery:

| # | Blocker | Kind | Proof |
|---|---|---|---|
| **B1** | 41 shards + 41 indexes are not on disk and not served (404) | Infrastructure / deploy | §3 |
| **B2** | `Catalog.search()` fetches the shard *index* but never the shard *payload* → 0 hits even when shards ARE served | Code defect | §4.2 |
| **B3** | No production caller passes `deepShards`; the only caller in the repo is a proof script | Wiring / dead code | §4.3 |

---

## 1. THE FOOD DATA LAYER — EXACT FILES AND COUNTED NUMBERS

### Runtime code
| File | Lines | Role |
|---|---:|---|
| `/Users/ziyad/qimmah-deploy/src/lib/food/catalog/catalog.ts` | 202 | `Catalog` class — init, `lookupByGtin`, `search` |
| `/Users/ziyad/qimmah-deploy/src/lib/food/catalog/appCatalog.ts` | 94 | app singleton, real `fetch`, `CatalogProduct → FoodItem` adapter, `off:` id prefix |
| `/Users/ziyad/qimmah-deploy/src/lib/food/catalog/idbCache.ts` | 95 | IndexedDB blob cache + memory fallback |
| `/Users/ziyad/qimmah-deploy/src/lib/food/catalog/rank.ts` | 91 | 6-tier match ranking (`gtin-exact` … `brand`) |
| `/Users/ziyad/qimmah-deploy/src/lib/food/catalog/types.ts` | 79 | payload types |
| `/Users/ziyad/qimmah-deploy/src/lib/food/shardRouting.ts` | 58 | `assignShard` = mix32(fnv1a(gtin14)) mod 41 |
| `/Users/ziyad/qimmah-deploy/src/lib/food/gtin.ts` | 148 | GTIN classify + mod-10 check digit |
| `/Users/ziyad/qimmah-deploy/src/lib/food/productSchema.ts` | 177 | shipped-record field contract |
| `/Users/ziyad/qimmah-deploy/src/lib/text/foodNormalize.ts` | — | `normalizeProductKey`, `tokenize`, PREFIX 3–8, norm v1.1.0 |

### Local curated data (bundled into JS, always live)
| File | Counted |
|---|---:|
| `/Users/ziyad/qimmah-deploy/src/data/foodItems.ts` | **`foodItems.length = 641`** (measured by loading the module, not by grep) |
| `/Users/ziyad/qimmah-deploy/src/data/saudiFoods.ts` | `saudiTraditionalFoods.length = 130` |
| `/Users/ziyad/qimmah-deploy/src/data/foodR2EatingOut.ts` | restaurant/eating-out rows folded into `foodItems` |

### Static catalog assets
Manifest path: **`/Users/ziyad/qimmah-deploy/public/food/manifest.json`** (10,529 B), mirrored byte-identical to `dist/food/manifest.json`.

Counted from the manifest itself (`node`, summing `shards[].count`):

```
shard_count field        : 41
shards array length      : 41          <- agrees, no drift
long-tail total rows     : 59941       <- sum of shards[].count
hot_set.count            : 599
grand total              : 60540
```

`public/food/hot-set.json` — 761,180 B, sha256 `a2a738cd…6b42a`, **matches `manifest.hot_set.sha256`**.
Counted from the file: `order` = 599, `records` = 599 keys, `tokens` = 3,955 prefix tokens.
Hot-set composition: **SA 584 · GCC 15 · GLOBAL 0**; 258 have `name_ar`, 396 have `name_en`, 442 have a real `serving_size`.

`data/food-production/manifests/build-manifest.json` (built `2026-08-14T13:29:18.030Z`) declares:
```
shard_totals = { shard_count: 41, records: 59941, bytes_raw: 74,105,047,
                 bytes_gzip: 13,602,842, index_bytes_gzip: 2,699,833,
                 bytes_gzip_all: 16,302,675 }
```
All 41 `sha256` values in `build-manifest.json` are **identical** to those in `public/food/manifest.json` — the manifest is not stale relative to the build record. It is the *bytes* that are missing, not the bookkeeping.

---

## 2. WHERE DO SHARDS LIVE ON DISK? — NOWHERE

```
$ find . -path ./node_modules -prune -o -path ./.git -prune -o -name "shard-*" -print
(no output)

$ find . -path ./node_modules -prune -o -path ./.git -prune -o -type d -name "shards" -print
(no output)

$ ls public/food/
README.md  hot-set.json  manifest.json          <- 3 files, 760K total

$ ls dist/food/
README.md  hot-set.json  manifest.json          <- same 3 files

$ ls dist/food/shards
ls: dist/food/shards: No such file or directory

$ ls data/food-production/accepted/
README.md  hot/                                 <- the `shards/` dir does not even exist

$ ls .food-cache
ls: .food-cache: No such file or directory      <- the OFF source export is gone too
```

**The shards were never committed, and the generated copies are gone.** This is *by design and documented*, not an accident:

- `.gitignore:65` → `data/food-production/accepted/shards/`
- `public/food/README.md` (committed): `| shards/ | ❌ | ٤١ شريحة / ~٧٠ ميغابايت — تُولَّد حتميًا وتُرفع للاستضافة الساكنة عند النشر |`
- `scripts/food-production/emit-static-assets.mjs:4-6` header: *"**الذيل الطويل لا يُنسخ**: ٤١ شريحة / ٧٠ ميغابايت لا مكان لها في المستودع ولا في الحزمة"*, and its final log line: `الشرائح غير منسوخة عمدًا — تُرفع للاستضافة الساكنة عند النشر.`

### Does `npm run build` copy them into dist?

No — and it *cannot*, because there is nothing to copy. Vite's `publicDir` copy is the only mechanism:
`vite.config.ts` sets `build.outDir = 'dist'` and uses the default `publicDir` (`public/`). It copies
whatever is in `public/food/` verbatim. Verified without running a build:

```
public/food/manifest.json  sha256 == dist/food/manifest.json  sha256   (identical)
public/food/hot-set.json   sha256 == dist/food/hot-set.json   sha256   a2a738cd…
dist/ mtime 2026-08-18 00:10 — fresh, not stale
```

So `dist/` is an **accurate** reflection of `public/`. The absence in `dist/food/shards/` is not staleness.

### Regenerating them is not a one-liner
`data/food-production/accepted/README.md` documents the full path: download the **1.2 GB** Open Food Facts
CSV export to `.food-cache/`, then `ingest-curated` → `ingest-off` → `build-pipeline` → `verify-artifacts`,
with `SOURCE_DATE_EPOCH=1786000000` pinned for byte-reproducibility. `.food-cache/` is absent, so a
regeneration today starts with a 1.2 GB download.

---

## 3. SERVABILITY PROOF — 0/41 RESOLVE

Method (script kept at `recon/serve-probe.mjs`): a plain `node:http` static server on **port 4599**,
no SPA fallback (missing file → honest 404), rooted first at `dist/`, then at `public/`. For each of the
41 shards named in the manifest, `GET /food/shards/<name>.json` and `GET /food/shards/<name>.idx.json`.
Server closed and port released after each run (`lsof -iTCP:4599` → empty).

### Baseline: the two assets that DO exist
| URL | Status | Bytes |
|---|---:|---:|
| `/food/manifest.json` | **200** | 10,529 |
| `/food/hot-set.json` | **200** | 761,180 |

### Result rollup
```
ROOT=/Users/ziyad/qimmah-deploy/dist    shard payloads 200: 0  404: 41  |  indexes 200: 0  404: 41
ROOT=/Users/ziyad/qimmah-deploy/public  shard payloads 200: 0  404: 41  |  indexes 200: 0  404: 41
distinct payload statuses observed: [ 404 ]
```

**82 of 82 long-tail requests 404. Zero checksums could be compared, because zero bytes were returned.**
`dist/` is NOT stale — `public/` (source of truth) is equally empty.

### Full table (declared rows / expected size vs actual HTTP)
| shard | rows declared | expected bytes (raw) | dist/food/shards/*.json | dist .idx.json | public/food/shards/*.json |
|---|---:|---:|---|---|---|
| shard-00 | 1504 | 1,870,491 | 404 | 404 | 404 |
| shard-01 | 1456 | 1,794,503 | 404 | 404 | 404 |
| shard-02 | 1541 | 1,904,906 | 404 | 404 | 404 |
| shard-03 | 1500 | 1,850,519 | 404 | 404 | 404 |
| shard-04 | 1473 | 1,832,899 | 404 | 404 | 404 |
| shard-05 | 1447 | 1,783,493 | 404 | 404 | 404 |
| shard-06 | 1485 | 1,846,188 | 404 | 404 | 404 |
| shard-07 | 1447 | 1,780,471 | 404 | 404 | 404 |
| shard-08 | 1410 | 1,741,472 | 404 | 404 | 404 |
| shard-09 | 1421 | 1,764,519 | 404 | 404 | 404 |
| shard-10 | 1438 | 1,791,809 | 404 | 404 | 404 |
| shard-11 | 1410 | 1,743,690 | 404 | 404 | 404 |
| shard-12 | 1502 | 1,858,361 | 404 | 404 | 404 |
| shard-13 | 1459 | 1,817,568 | 404 | 404 | 404 |
| shard-14 | 1435 | 1,760,869 | 404 | 404 | 404 |
| shard-15 | 1408 | 1,748,887 | 404 | 404 | 404 |
| shard-16 | 1468 | 1,827,858 | 404 | 404 | 404 |
| shard-17 | 1480 | 1,836,520 | 404 | 404 | 404 |
| shard-18 | 1465 | 1,803,000 | 404 | 404 | 404 |
| shard-19 | 1467 | 1,822,495 | 404 | 404 | 404 |
| shard-20 | 1536 | 1,894,124 | 404 | 404 | 404 |
| shard-21 | 1515 | 1,866,474 | 404 | 404 | 404 |
| shard-22 | 1463 | 1,809,337 | 404 | 404 | 404 |
| shard-23 | 1526 | 1,904,087 | 404 | 404 | 404 |
| shard-24 | 1446 | 1,791,858 | 404 | 404 | 404 |
| shard-25 | 1448 | 1,786,984 | 404 | 404 | 404 |
| shard-26 | 1486 | 1,829,245 | 404 | 404 | 404 |
| shard-27 | 1499 | 1,841,100 | 404 | 404 | 404 |
| shard-28 | 1425 | 1,766,516 | 404 | 404 | 404 |
| shard-29 | 1439 | 1,769,590 | 404 | 404 | 404 |
| shard-30 | 1433 | 1,768,208 | 404 | 404 | 404 |
| shard-31 | 1433 | 1,756,225 | 404 | 404 | 404 |
| shard-32 | 1506 | 1,856,703 | 404 | 404 | 404 |
| shard-33 | 1468 | 1,821,783 | 404 | 404 | 404 |
| shard-34 | 1419 | 1,749,654 | 404 | 404 | 404 |
| shard-35 | 1400 | 1,729,895 | 404 | 404 | 404 |
| shard-36 | 1473 | 1,816,057 | 404 | 404 | 404 |
| shard-37 | 1485 | 1,832,916 | 404 | 404 | 404 |
| shard-38 | 1442 | 1,765,524 | 404 | 404 | 404 |
| shard-39 | 1438 | 1,790,173 | 404 | 404 | 404 |
| shard-40 | 1445 | 1,778,076 | 404 | 404 | 404 |

Sum of the "rows declared" column = **59,941**. Sum of bytes actually served = **0**.

### What a real user would get on Cloudflare Pages
`public/_redirects` deliberately has **no** catch-all `/* /index.html 200` rule (banned by `[QIM-WEB-HOTFIX-002]`),
and `public/404.html` exists at root — which per Pages' documented behaviour makes an unmatched path return a
**genuine 404**, not a 200-with-HTML. So the 404 is honest and the app's `fetchText` correctly turns it into `null`
rather than choking on HTML masquerading as JSON. Good failure mode; still a failure.

Note: `public/_headers` has **no `/food/*` Cache-Control rule** — the 761 KB `hot-set.json` inherits only the
default `/*` block (CSP, nosniff, referrer, frame-options). It is re-fetched per the CDN default rather than a
declared policy.

---

## 4. RUNTIME PATH — WHO FETCHES, UNDER WHAT CONDITIONS

### 4.1 The two live entry points (both real, both reachable)

**Text search — `src/components/nutrition/QuickMealLogger.tsx:84-99`**
```
useEffect(() => {
  const q = query.trim()
  if (q.length < 2) { setCatalogResults([]); return }
  const timer = setTimeout(async () => {
    const cat = await getAppCatalog()          // line 88
    const hits = await cat.search(q, { limit: 8 })   // line 91  <-- NO deepShards
    ...
  }, 250)
}, [query, localResults, lang])
```
Mounted at `src/views/NutritionView.tsx:191` and `:448`; `NutritionView` is lazily imported at `src/App.tsx:28`.
**Reachable by a real user.** Condition to fetch: query ≥ 2 chars, 250 ms debounce.
`getAppCatalog()` → `Catalog.init()` fetches exactly **two** URLs: `/food/manifest.json` and `/food/hot-set.json`.
It touches **no shard, ever** — by design (`catalog.ts:81` comment: *"**لا يلمس أي شريحة**"*).

**Barcode — `src/features/barcode/ScanFoodPanel.tsx:80-84`**
```
const catalog = await getAppCatalog()
const local = catalog ? await catalog.lookupByGtin(barcode) : null   // line 81
if (local) { onResolved(catalogProductToFoodItem(local, lang)); return }
const result = await lookupBarcode(barcode)   // network fallback → world.openfoodfacts.org
```
This is the **only** production path that ever requests `/food/shards/<n>.json`. Lazily loaded from
`QuickMealLogger.tsx:17` and `NutritionV2.tsx:39`. Today that request 404s, `parse()` returns `null`,
`shardFor()` returns `null`, and control falls through to the live OFF API — an honest degradation,
but it means **the offline barcode promise is 599 products deep, not 60,540.**

### 4.2 B2 — `search()` fetches the INDEX but never the SHARD (proven)

`catalog.ts:173-193`:
```
for (const name of opts.deepShards ?? []) {
  const idx = await this.indexFor(name)      // line 178 → fetches shards/<n>.idx.json
  if (!idx) continue
  ...
  const shard = this.shards.get(name)        // line 184 — MAP LOOKUP ONLY
  if (!shard) continue                       // line 185 — always taken in practice
```
`this.shards` is populated **only** by `shardFor(gtin14)`, which is called **only** from `lookupByGtin`.
There is no code path from `search()` to a shard-payload fetch.

Proof harness (`recon/deep-bug-proof2.mjs`) — synthetic universe where **every shard file is present and
returns 200**, containing a record named "شاورما دجاج مركبة" routed to shard-19:
```
valid gtin = 06281100171447 -> routed shard = shard-19
[TEXT DEEP SEARCH, shards fully served] hits = 0 | requested: ["shards/shard-19.idx.json"]
[BARCODE lookupByGtin, shard served]    -> شاورما دجاج مركبة | requested: ["shards/shard-19.json"]
[TEXT DEEP SEARCH after barcode primed the shard] hits = 1 [ 'شاورما دجاج مركبة' ]
```
The index contains the token (verified: 26 prefix tokens, `"شاورما"` present). The barcode path resolves the
record from the same file. Deep search still returns **0** — and returns **1** the instant the shard map is
primed by an unrelated barcode lookup. **Uploading the 41 shards alone will not make text search find them.**

### 4.3 B3 — nothing in production asks for deep search

```
$ grep -rn "deepShards" src/ scripts/ docs/
src/lib/food/catalog/catalog.ts:170   (comment)
src/lib/food/catalog/catalog.ts:173   (parameter declaration)
src/lib/food/catalog/catalog.ts:177   (the loop)
scripts/run-food-catalog-proof.mjs:177  <- the ONLY caller, a proof, on synthetic data
```
Zero callers in `src/`. The deep-search feature is **dead code with a green test**.

---

## 5. SEARCH QUALITY — VERBATIM HARNESS OUTPUT

Harness `recon/search-harness.mjs` loads the **real** TS modules via `scripts/food-production/lib/loadTs.mjs`
(same esbuild bridge the project's own proofs use), backs `fetchText` with the **real** `public/food/` directory
(a missing file returns `null`, exactly like a 404), and calls the search functions the UI actually calls.

```
catalog stats after init = {"hotSetLoaded":true,"hotSetCount":599,"shardsFetched":[],"indexesFetched":[],
                            "networkFetches":2,"cacheHits":0,"cacheKind":"memory","recordsInMemory":599}
```

### A) `cat.search(q, {limit:8})` — EXACTLY what QuickMealLogger calls

```
Q="شاورما"       -> 0 hit(s) | network paths touched: []
Q="شاورما دجاج"  -> 0 hit(s) | network paths touched: []
Q="كبسة"         -> 0 hit(s) | network paths touched: []
Q="برجر"         -> 1 hit(s)
   1. gtin=06281100171447 ar="فوشية (خبز البرجر بالسمسم 6 قطع)" brand="السعر 4 ريال" kcal/100g=310.61
Q="بيتزا"        -> 1 hit(s)
   1. gtin=00617950600794 ar="صلصة البيتزا" brand="العلالي" kcal/100g=58.33
Q="مندي"         -> 0 hit(s)
Q="دجاج"         -> 6 hit(s)
   1. gtin=06281062359402 ar="دجاج بروستد مثلج"        brand="دجاج الوطنية" kcal/100g=132
   2. gtin=06287043723231 ar="دجاج تيكا ماسالا مع الرز" brand="افران الحطب"  kcal/100g=139
   3. gtin=06281028002311 ar="اجنحة دجاج"              brand="التنميه"      kcal/100g=107
   4. gtin=06281050831828 ar="ستريبس صدور دجاج سبايسي"  brand="Americana"    kcal/100g=200
   5. gtin=06281051006843 ar="صدور دجاج 1 کيلو"        brand="Dari"         kcal/100g=85
   6. gtin=06287039311336 ar="مكرونة فيسولي دجاج"       brand="رويا"         kcal/100g=111
Q="rice"         -> 4 hit(s)
   1. "Rice Cake Chocolate" (Naso Healthy) 213.33
   2. "Applied nutrition cream of rice 2kg toffee biscuit" (Applied Nutrition) 351
   3. "Sauced Veggies Cheesy Rice & Broccoli" (Green Giant) 81.27
   4. "أرز بسمتي عضوي / Organic Larder Organic Basmati Rice 1kg" 344
Q="chicken"      -> 5 hit(s)
   1. "Breaded Chicken Tender Pieces Seasoned Uncooked" (Hometown) 200
   2. "Buttered Chicken Panini Sandwich" (City Fresh Kitchen) 189.52
   3. "Marinated Chicken Wings" (Al Youm) 186
   4. "MEAL STARTERS BLACK GARLIC CHICKEN BREAST SKEWERS" (ROSSDOWN) 160
   5. "Rotisserie Chicken" (Your Fresh Market) 160
Q="squat"        -> 0 hit(s)     [negative control — correct]
```
**Not one query touched the network.** Every hit came from the 599-record hot set.

### B) Deep search forced across all 41 shards
```
Q="شاورما" deep -> 0 hit(s); index fetch attempts=41; indexesFetched=0; shardsFetched=0
Q="كبسة"   deep -> 0 hit(s); index fetch attempts=41; indexesFetched=0; shardsFetched=0
Q="chicken" deep -> 5 hit(s); index fetch attempts=41; indexesFetched=0; shardsFetched=0
```
41 index requests, 41 failures, **0 additional results** — the 5 "chicken" hits are the same hot-set hits from (A).

### C) `searchFood(q)` — the local curated list, which IS live and IS good
```
Q="شاورما"      -> 18 hit(s)   شاورما دجاج 450 · شاورما لحم 500 · شاورما صحن 620 · شاورما دجاج صغيرة 310 …
Q="شاورما دجاج" ->  9 hit(s)   شاورما دجاج · ماما نورة - شاورما دجاج · شاورمر - شاورما دجاج عربي · صحن شاورما دجاج 690
Q="كبسة"        -> 14 hit(s)   كبسة دجاج 620 · كبسة لحم 700 · كبسة روبيان 500 · كبسة لحم جمل 660 · كبسة حاشي …
Q="برجر"        -> 31 hit(s)   برجر لحم 550 · برجر كنج - وابر 660 · برجر كنج - دبل وابر 900 · برجرايزر - كلاسيك سنجل 470 …
Q="بيتزا"       -> 15 hit(s)   بيتزا هت - قطعة بان 280 · بيتزا هت - سوبريم 300 · دومينوز - قطعة بيتزا جبن 250 …
Q="مندي"        -> 12 hit(s)   مندي دجاج 600 · مندي لحم 690 · الرومانسية - مندي دجاج (ربع + رز) 800 …
Q="دجاج"        -> 92 hit(s)
Q="rice"        -> 37 hit(s)
Q="chicken"     -> 100 hit(s)
Q="squat"       ->  0 hit(s)   [negative control — correct]
```

### MEAL-level vs INGREDIENT-level — the decisive finding

**The 599-record hot set contains no meal-level entries at all.** It is 100% packaged retail SKUs with GTINs
(SA 584 / GCC 15) — a *barcode* database. A "composed shawarma sandwich" does not exist in it, which is why
`شاورما`, `كبسة`, and `مندي` all return **0**. The closest hit to "burger" is *burger buns*, and the closest
to "pizza" is *pizza sauce*.

Meal-level entries exist **only** in `src/data/foodItems.ts` (641 items, bundled into JS) — and there they are
excellent: full composed dishes with realistic plate/sandwich servings, named Saudi restaurant chains
(ماما نورة، شاورمر، الرومانسية، برجرايزر، بيتزا هت، دومينوز)، and per-portion calories.

**So the user's experience is the inverse of the architecture diagram:** the "small local fallback" is doing
all the meaningful Arabic meal search, and the "60k catalog" contributes 0–6 packaged SKUs per query — none
of which is a meal.

---

## 6. BARCODE · OFFLINE/CACHE · ODbL · BUNDLE WEIGHT

### Barcode path (3 tiers, ordered)
1. Hot set in memory (599, offline) — `catalog.ts:122`
2. Routed shard `shards/<n>.json` — `catalog.ts:105` → **404 today**
3. Live network `https://world.openfoodfacts.org/api/v2/product` — `ScanFoodPanel.tsx:85` → `src/features/barcode/openFoodFacts.ts:6`

Tier 2 is dark, so every non-hot-set scan becomes a network round-trip to OFF. That is a *working* app but
not the promised one: the whole point of shipping 41 shards was O(1) offline resolution.
Routing correctness itself is fine — `assignShard('06281100171447', 41)` → `shard-19`, and the mix32 finalizer
is documented in the manifest as REQUIRED (without it every valid GTIN's even digit sum leaves half the shards empty).

### Offline / cache
- `src/lib/food/catalog/idbCache.ts` — IndexedDB (`qimmah-food-catalog` / `blobs`), memory fallback, never throws;
  cache layer self-reports via `stats.cacheKind` rather than swallowing failure. Sound design.
- **`public/sw.js` / `dist/sw.js` contain no `/food` precache rule at all** (`grep food|hot-set|shard` → no match).
  The 761 KB hot set is therefore *not* available on a cold offline first-load; it becomes offline-capable only
  after the first successful online fetch populates IndexedDB.
- `public/_headers` has no `/food/*` Cache-Control entry (§3).

### ODbL attribution — present and correctly conditional
- Data-level: `manifest.json.licence.notice` and `hot-set.json.licence` both carry the ODbL notice + the three
  obligations (attribution / share-alike / keep-open).
- User-visible: `src/components/nutrition/QuickMealLogger.tsx:341-348` renders
  `dataAttributionStrings[lang].packagedFood` (testid `off-attribution-search`) **only when**
  `results.some(r => isOffDerived(r.id))` — i.e. only when an `off:`-prefixed record is on screen, so Qimmah's own
  curated items are never falsely attributed. Strings exist in both languages
  (`src/i18n/dict/nutritionScreen.ts:119` AR / `:181` EN).
- **Live consequence:** because searches like شاورما/كبسة/مندي return zero OFF records, the attribution row
  legitimately never renders for them. Compliance is intact; it is simply rarely exercised.
- Standing owner decision still open: `docs/execution/qimmah-postweb/food/DEPENDENCIES.md` §D-2 flags that ODbL
  share-alike on any publicly distributed derived database *"يُعتمد صراحةً قبل الشحن، ولا يُفترض بالسكوت"*.

### Bundle weight — clean, no static shard import
```
$ grep -rn "hot-set|food/manifest|shards/" src/    -> only the 3 runtime URL strings in catalog.ts:84,105,132
$ grep -l "06281062359402" dist/assets/*.js        -> (empty)   # a known hot-set GTIN is NOT in the bundle
$ grep -o '"/food"|hot-set.json|shards/' dist/assets/*.js
    dist/assets/NutritionView-BS0SDBqP.js: "/food"  hot-set.json  shards/ (x2)
```
**No catalog data is bundled.** Only URL literals, inside the lazily-loaded `NutritionView` chunk. The 761 KB
hot set and (hypothetically) the 13.6 MB gzip of shards are all fetched, never imported. This part of the
architecture is exactly as advertised.

Counterweight: `src/data/foodItems.ts` is **151 KB of source** statically imported into the bundle — which is
where the actually-useful meal data lives. `DEPENDENCIES.md` §D-1 lists this as an unstarted migration.

---

## 7. DO THE PROOFS VERIFY HTTP SERVABILITY? — NO. THIS IS THE GREEN-TEST-ON-DEAD-CODE.

### `scripts/run-food-catalog-proof.mjs` (`npm run test:food-catalog`, **inside `test:gate`**)
Ran it: **29/29 green** (4 counter-assertions). It verifies nothing about delivery. Its own header says so:

> *"البيانات هنا **مُولَّدة عمدًا**: الشرائح الحقيقية (٩١ ميغابايت) لا تُلتزم في git، والإثبات يجب أن يعمل بلا شبكة وبلا أرتيفكت مُولَّد"*

- It fabricates `RECORDS = 60_000` synthetic rows in memory (lines 30-58) and injects its own `fetchText`.
- It never reads `public/food/` or `dist/food/`, and never opens a socket.
- So the proof would stay 29/29 green if `public/food/` were **deleted entirely**.

**Worse — the deep-search assertions actively encode the B2 bug as correct behaviour:**
```
line 176: const deepShard = st.shardsFetched[0]      // the shard the BARCODE test already loaded
line 177: await cat.search('منتج 45123', { deepShards: [deepShard], limit: 10 })   // return value DISCARDED
line 180: ok('العميق: جُلب فهرس واحد للشريحة المطلوبة', …)
line 181: ok('العميق: لم تُجلب شرائح إضافية', stDeep.shardsFetched.length === 1)
```
Two structural escapes: (a) it deep-searches a shard **already primed** by the earlier `lookupByGtin`, the one
condition under which the broken path happens to work; (b) it **throws the result away** and asserts only fetch
counters. The assertion *"no additional shards were fetched"* is literally a description of the defect. A test
asserting `hits.length > 0` on a cold catalog would have failed on day one.

### `scripts/run-food-production-proof.mjs` (`npm run test:food-production`, **inside `test:gate`**)
Filesystem-only, from committed fixtures (`data/food-production/fixtures/off-sample.tsv`, 15 rows → 8 accepted).
It proves ingestion correctness, determinism (`SOURCE_DATE_EPOCH`), schema-field exactness, licence-notice presence,
and stats isolation. `grep` for `fetch(`/`http` returns **nothing** except the temp-dir plumbing. It never asserts
`public/food/shards/` exists, and never asserts the emitted assets are reachable.

### `scripts/e2e/food-catalog-live.mjs` — the only script that touches HTTP, and it asserts the OPPOSITE
```
line 100: const shardProbe = await fetch(`${BASE}/food/shards/shard-00.json`)
line 101: const shardBody = shardProbe.ok ? await shardProbe.text() : ''
line 102: check('الذيل الطويل غير مشحون مع الأصول', !shardBody.includes('"records"'), …)
```
This check is **designed to pass when the shard 404s**. It is a guard against accidentally bundling 70 MB,
not a servability check. There is no assertion anywhere in the repo that any shard returns 200.
And it is **outside `test:gate`** (verified: `test:gate` contains `test:food-catalog` and `test:food-production`
but not `test:e2e:food-catalog`), so even that browser run is not part of the standard gate.

### `FOOD-PRODUCTION-REPORT.md`
Auto-generated (2026-08-14) from `build-manifest.json`. Every number in it is **true about the build**, and none of
it is a claim about production delivery: "59,941 سجلات مقبولة ومشحونة", "41/41 ضمن الميزانية", "بيانات خام 70.67
ميغابايت". §5 states plainly *"**الشرائح لا تُلتزم في git**"*. §7 gap 6: *"الوصل بالواجهة الحيّة محجوب على HEAD"*.

**The report does not lie. The word "مشحونة" (shipped) is doing heavy lifting — it means "passed the pipeline
and was emitted", not "reachable over HTTP".** Anyone reading the headline number as "50k foods live" is
reading a build statistic as a production statistic.

### Honest disclosure already exists in the repo
`docs/execution/qimmah-postweb/food/DEPENDENCIES.md` → **F-2 — رفع شرائح الذيل الطويل (تبعية نشر)**:
> *"الشرائح (٤١ ملفًّا · ~٧٠ ميغابايت) … **تُرفع إلى الاستضافة الساكنة عند النشر**. الأثر قبل الرفع: … تغطية الذيل الطويل غير فعّالة. الأمر: `npm run food:build && npm run food:emit` ثم رفع `shards/` بجوار `hot-set.json`. الحالة: تبعية نشر — ليست عطلًا برمجيًا."*

That entry is accurate about B1 — **and wrong about "ليست عطلًا برمجيًا" (not a code defect)**, because B2 and B3
are code defects that the upload alone will not fix.

---

## 8. WHAT SINGLE INFRASTRUCTURE STEP IS MISSING?

**Precise answer: for the BARCODE path, exactly one step. For TEXT SEARCH, the infrastructure step is
necessary but not sufficient — two code defects sit behind it.**

### The one infrastructure step (unblocks barcode only)
```bash
# 1.2 GB source download — .food-cache/ is currently absent
mkdir -p .food-cache && curl -L --retry 5 -C - -A 'Qimmah-DataPipeline/1.0' \
  -o .food-cache/off-products.csv.gz \
  https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz

SOURCE_DATE_EPOCH=1786000000 npm run food:ingest
npm run food:build && npm run food:verify && npm run food:emit

# then upload the 82 generated files to the static host beside hot-set.json:
#   <host>/food/shards/shard-NN.json      (41 files, 74.1 MB raw / 13.6 MB gzip)
#   <host>/food/shards/shard-NN.idx.json  (41 files, 2.7 MB gzip)
```
Integrity is self-verifying: the 41 `sha256` + `index_sha256` values already committed in
`public/food/manifest.json` are byte-identical to `build-manifest.json`, so a correct rebuild is provable.
Cloudflare Pages deploys from `main` and only publishes `dist/` — so this upload needs either an out-of-band
static upload (R2 / separate bucket + `baseUrl` override) **or** a build step that materialises
`public/food/shards/` before `vite build`. That routing decision is a founder call, not a code fix.

### The two code defects that must land with it (else text search stays at 599)
1. **`src/lib/food/catalog/catalog.ts:184`** — `search()` must call the payload loader, not
   `this.shards.get(name)`. Requires a `shardByName(name)` sibling to `shardFor(gtin14)`
   (`catalog.ts:100`), which currently only accepts a GTIN.
2. **`src/components/nutrition/QuickMealLogger.tsx:91`** — must pass `deepShards`, gated behind an explicit
   user action ("search the full catalog"), since fetching all 41 indexes is 2.7 MB gzip. Today it passes
   `{ limit: 8 }` only.

### And a product truth that no upload changes
Even fully live, the 59,941 long-tail rows are **packaged barcode SKUs, 55,000 of them GLOBAL** — 0.6 % have
Arabic names (`FOOD-PRODUCTION-REPORT.md` §7 gap 1; `build-summary.json`: `no_arabic_name: 59,583`).
Searching **شاورما / كبسة / مندي** will still return **0** after the upload, because those are meals and this
is a barcode database. Meal search is, and will remain, served by the 641 curated items in `foodItems.ts`.

**If the founder's expectation is "50k+ foods live" measured as *Arabic meal search depth*, the shard upload
does not deliver it at all.** It delivers offline barcode resolution for 60k packaged products.

---

## 9. EVIDENCE INDEX
| Artifact | Path |
|---|---|
| HTTP servability probe (port 4599, closed) | `recon/serve-probe.mjs` |
| Probe results — dist / public | `recon/probe-dist.json` · `recon/probe-public.json` |
| 41-row shard table | `recon/shard-table.md` |
| Search-quality harness (real TS modules, real `public/food/`) | `recon/search-harness.mjs` |
| B2 isolation proof (shards served 200, deep search still 0) | `recon/deep-bug-proof2.mjs` |
| Working-tree integrity | `recon/git-before.txt` — `git status --short` identical after all runs |

### Working-tree note (not mine)
Between my `git status` snapshot and the end of the run, `docs/execution/qimmah-postweb/release/evidence/latest.json`
became modified (mtime 03:22, 83+/1448-). It is **not** attributable to this lane: its writer is
`scripts/release/run-release-convergence.mjs:197`, neither `run-food-catalog-proof.mjs` nor `loadTs.mjs` references
that path (`grep` count 0), and the embedded `ranAt` is `2026-08-18T00:22:27Z` — before this session. This checkout
is shared by concurrent agent sessions. **I did not revert it** (no `git checkout` per the lane's rules). Flagging
it so a parallel lane's write is not mistaken for a food-lane side effect.
