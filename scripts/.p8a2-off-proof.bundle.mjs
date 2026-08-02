var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// <define:import.meta.env>
var init_define_import_meta_env = __esm({
  "<define:import.meta.env>"() {
  }
});

// src/features/products/store.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function readDb() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeDb(db) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
  }
}
function readAuditLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeAuditLog(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
  } catch {
  }
}
function appendAudit(entry) {
  const log = readAuditLog();
  log.push(entry);
  writeAuditLog(log);
}
function completenessScore(m) {
  return [m.kcal, m.protein, m.carbs, m.fat].filter((v) => v > 0).length;
}
function macrosConflict(a, b) {
  if (a.per !== b.per) return false;
  const fields = [
    "kcal",
    "protein",
    "carbs",
    "fat"
  ];
  return fields.some((f) => {
    const av = a[f];
    const bv = b[f];
    if (av <= 0 || bv <= 0) return false;
    const diff = Math.abs(av - bv);
    const tolerance = Math.max(av, bv) * CONFLICT_TOLERANCE_RATIO;
    return diff > tolerance;
  });
}
function mergeSources(existing, incoming) {
  const idx = existing.findIndex((s) => s.sourceName === incoming.sourceName);
  if (idx === -1) return [...existing, incoming];
  const next = [...existing];
  next[idx] = incoming;
  return next;
}
function toMacroSet(p) {
  return { per: p.per, servingSize: p.servingSize, kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat };
}
function logAction(action, barcode, by, sourceName, note) {
  appendAudit({ barcode, action, by, at: nowIso(), sourceName, note });
}
function getProduct(barcode) {
  return readDb()[barcode];
}
function upsertProduct(input) {
  const db = readDb();
  const now = nowIso();
  const existing = db[input.barcode];
  const by = input.by ?? input.source.sourceName;
  if (!existing) {
    const product = {
      barcode: input.barcode,
      name: input.name,
      brand: input.brand,
      imageUrl: input.imageUrl,
      nutritionImageUrl: input.nutritionImageUrl,
      per: input.per,
      servingSize: input.servingSize,
      kcal: input.kcal,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      status: input.status ?? "imported",
      sources: [input.source],
      createdAt: now,
      updatedAt: now
    };
    db[input.barcode] = product;
    writeDb(db);
    logAction("add", input.barcode, by, input.source.sourceName, input.note);
    return product;
  }
  const existingMacros = toMacroSet(existing);
  const incomingMacros = toMacroSet(input);
  const conflict = macrosConflict(existingMacros, incomingMacros);
  const incomingIsAtLeastAsComplete = completenessScore(incomingMacros) >= completenessScore(existingMacros);
  const finalMacros = incomingIsAtLeastAsComplete ? incomingMacros : existingMacros;
  const previousStatus = existing.status;
  const status = input.status ?? (conflict ? "pending_review" : existing.status);
  const merged = {
    ...existing,
    name: input.name || existing.name,
    brand: input.brand ?? existing.brand,
    imageUrl: input.imageUrl ?? existing.imageUrl,
    nutritionImageUrl: input.nutritionImageUrl ?? existing.nutritionImageUrl,
    per: finalMacros.per,
    servingSize: finalMacros.servingSize,
    kcal: finalMacros.kcal,
    protein: finalMacros.protein,
    carbs: finalMacros.carbs,
    fat: finalMacros.fat,
    status,
    sources: mergeSources(existing.sources, input.source),
    updatedAt: now
  };
  db[input.barcode] = merged;
  writeDb(db);
  logAction("merge", input.barcode, by, input.source.sourceName, input.note);
  if (status !== previousStatus) {
    logAction(
      "status_change",
      input.barcode,
      by,
      input.source.sourceName,
      conflict ? "\u062A\u0639\u0627\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u063A\u0630\u0627\u0626\u064A\u0629 \u0628\u064A\u0646 \u0645\u0635\u062F\u0631\u064A\u0646 \u2014 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629" : input.note
    );
  }
  return merged;
}
function editProduct(barcode, patch, by, note) {
  const db = readDb();
  const existing = db[barcode];
  if (!existing) return void 0;
  const merged = { ...existing, ...patch, updatedAt: nowIso() };
  db[barcode] = merged;
  writeDb(db);
  logAction("edit", barcode, by, "manual_edit", note);
  return merged;
}
function setProductStatus(barcode, status, by, note) {
  const db = readDb();
  const existing = db[barcode];
  if (!existing) return void 0;
  if (existing.status === status) return existing;
  const merged = { ...existing, status, updatedAt: nowIso() };
  db[barcode] = merged;
  writeDb(db);
  logAction("status_change", barcode, by, "manual_status_change", note);
  return merged;
}
function listByStatus(status) {
  return Object.values(readDb()).filter((p) => p.status === status);
}
function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = Object.values(readDb());
  const matches = all.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q));
  return matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts;
  });
}
function getAuditLog(barcode) {
  const log = readAuditLog();
  return barcode ? log.filter((e) => e.barcode === barcode) : log;
}
var DB_KEY, AUDIT_KEY, CONFLICT_TOLERANCE_RATIO;
var init_store = __esm({
  "src/features/products/store.ts"() {
    init_define_import_meta_env();
    DB_KEY = "qimmah:products:v1";
    AUDIT_KEY = "qimmah:products:audit:v1";
    CONFLICT_TOLERANCE_RATIO = 0.1;
  }
});

// src/features/products/resolve.ts
function registerOpenFoodFactsFetcher(fetcher) {
  openFoodFactsFetcher = fetcher;
}
function registerAuthorizedSourceFetcher(fetcher) {
  authorizedSourceFetcher = fetcher;
}
async function tryFetch(fetcher, barcode) {
  try {
    return await fetcher(barcode);
  } catch {
    return null;
  }
}
function cacheRemoteHit(barcode, result, sourceName, by) {
  const source = {
    sourceName,
    sourceUrl: result.sourceUrl,
    importedAt: (/* @__PURE__ */ new Date()).toISOString(),
    permissionRef: result.permissionRef
  };
  return upsertProduct({
    barcode,
    name: result.name,
    brand: result.brand,
    imageUrl: result.imageUrl,
    per: result.per,
    servingSize: result.servingSize,
    kcal: result.kcal,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
    status: "imported",
    source,
    by
  });
}
async function resolveBarcode(barcode) {
  const internal = getProduct(barcode);
  if (internal) return { product: internal, foundIn: "internal" };
  const off = await tryFetch(openFoodFactsFetcher, barcode);
  if (off) {
    const product = cacheRemoteHit(barcode, off, "open_food_facts", "open_food_facts");
    return { product, foundIn: "open_food_facts" };
  }
  const authorized = await tryFetch(authorizedSourceFetcher, barcode);
  if (authorized) {
    const product = cacheRemoteHit(barcode, authorized, "authorized:external", "authorized_source");
    return { product, foundIn: "authorized" };
  }
  return { product: null, foundIn: "not_found" };
}
var openFoodFactsFetcher, authorizedSourceFetcher;
var init_resolve = __esm({
  "src/features/products/resolve.ts"() {
    init_define_import_meta_env();
    init_store();
    openFoodFactsFetcher = async () => null;
    authorizedSourceFetcher = async () => null;
  }
});

// src/features/products/index.ts
var products_exports = {};
__export(products_exports, {
  editProduct: () => editProduct,
  getAuditLog: () => getAuditLog,
  getProduct: () => getProduct,
  listByStatus: () => listByStatus,
  registerAuthorizedSourceFetcher: () => registerAuthorizedSourceFetcher,
  registerOpenFoodFactsFetcher: () => registerOpenFoodFactsFetcher,
  resolveBarcode: () => resolveBarcode,
  searchProducts: () => searchProducts,
  setProductStatus: () => setProductStatus,
  upsertProduct: () => upsertProduct
});
var init_products = __esm({
  "src/features/products/index.ts"() {
    init_define_import_meta_env();
    init_store();
    init_resolve();
  }
});

// src/features/products/offSource.ts
var offSource_exports = {};
__export(offSource_exports, {
  OFF_ATTRIBUTION_AR: () => OFF_ATTRIBUTION_AR,
  OFF_ATTRIBUTION_EN: () => OFF_ATTRIBUTION_EN,
  OFF_HOME_URL: () => OFF_HOME_URL,
  fetchFromOFF: () => fetchFromOFF,
  fetchSaudiOffPage: () => fetchSaudiOffPage,
  mapOffRecordToRemoteResult: () => mapOffRecordToRemoteResult,
  offProductUrl: () => offProductUrl,
  registerOffFetcher: () => registerOffFetcher
});
function offProductUrl(barcode) {
  return `${OFF_HOME_URL}/product/${barcode}`;
}
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v) {
  return typeof v === "string" && v.trim() ? v.trim() : void 0;
}
function parseMacros(nutriments, servingSize) {
  const kcal100 = num(nutriments["energy-kcal_100g"]);
  if (kcal100 > 0) {
    return {
      per: "100g",
      servingSize,
      kcal: kcal100,
      protein: num(nutriments["proteins_100g"]),
      carbs: num(nutriments["carbohydrates_100g"]),
      fat: num(nutriments["fat_100g"])
    };
  }
  const kcalServing = num(nutriments["energy-kcal_serving"]);
  if (kcalServing > 0) {
    return {
      per: "serving",
      servingSize,
      kcal: kcalServing,
      protein: num(nutriments["proteins_serving"]),
      carbs: num(nutriments["carbohydrates_serving"]),
      fat: num(nutriments["fat_serving"])
    };
  }
  return null;
}
function mapOffRecordToRemoteResult(record) {
  const name = str(record.product_name);
  if (!name) return null;
  const macros = parseMacros(record.nutriments ?? {}, str(record.serving_size));
  if (!macros) return null;
  return {
    name,
    brand: str(record.brands),
    imageUrl: str(record.image_url),
    per: macros.per,
    servingSize: macros.servingSize,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat
  };
}
function registerOffFetcher() {
  registerOpenFoodFactsFetcher(fetchFromOFF);
}
async function fetchSaudiOffPage(page, pageSize = 100) {
  const url = `${SEARCH_BASE}?countries_tags_en=saudi-arabia&fields=code,${FIELDS}&page_size=${pageSize}&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`OFF search HTTP ${res.status}`);
  const data = await res.json();
  const products = Array.isArray(data.products) ? data.products : [];
  const items = [];
  for (const p of products) {
    if (!p.code) continue;
    const mapped = mapOffRecordToRemoteResult(p);
    if (!mapped) continue;
    items.push({ barcode: p.code, result: { ...mapped, sourceUrl: offProductUrl(p.code) } });
  }
  return items;
}
var PRODUCT_BASE, SEARCH_BASE, FIELDS, USER_AGENT, OFF_ATTRIBUTION_AR, OFF_ATTRIBUTION_EN, OFF_HOME_URL, fetchFromOFF;
var init_offSource = __esm({
  "src/features/products/offSource.ts"() {
    init_define_import_meta_env();
    init_products();
    PRODUCT_BASE = "https://world.openfoodfacts.org/api/v2/product";
    SEARCH_BASE = "https://world.openfoodfacts.org/api/v2/search";
    FIELDS = "product_name,brands,image_url,nutriments,serving_size";
    USER_AGENT = "Qimmah/1.0";
    OFF_ATTRIBUTION_AR = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0646 Open Food Facts (ODbL)";
    OFF_ATTRIBUTION_EN = "Product data from Open Food Facts (ODbL)";
    OFF_HOME_URL = "https://world.openfoodfacts.org";
    fetchFromOFF = async (barcode) => {
      try {
        const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
          headers: { "User-Agent": USER_AGENT }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status !== 1 || !data.product) return null;
        const mapped = mapOffRecordToRemoteResult(data.product);
        return mapped ? { ...mapped, sourceUrl: offProductUrl(barcode) } : null;
      } catch {
        return null;
      }
    };
    registerOffFetcher();
  }
});

// scripts/p8a2-off-proof.ts
init_define_import_meta_env();
function makeMemoryStorage() {
  const store = /* @__PURE__ */ new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    }
  };
}
var globalWithWindow = globalThis;
globalWithWindow.window = { localStorage: makeMemoryStorage() };
var { mapOffRecordToRemoteResult: mapOffRecordToRemoteResult2, fetchFromOFF: fetchFromOFF2, fetchSaudiOffPage: fetchSaudiOffPage2, OFF_ATTRIBUTION_AR: OFF_ATTRIBUTION_AR2 } = await Promise.resolve().then(() => (init_offSource(), offSource_exports));
var { getProduct: getProduct2, upsertProduct: upsertProduct2, resolveBarcode: resolveBarcode2, listByStatus: listByStatus2 } = await Promise.resolve().then(() => (init_products(), products_exports));
var failures = 0;
function check(cond, msg) {
  console.log(`${cond ? "\u2705" : "\u274C"} ${msg}`);
  if (!cond) failures++;
}
var NUTELLA_BARCODE = "3017624010701";
var nutellaFixture = {
  product_name: "Nutella",
  brands: "Ferrero",
  image_url: "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.jpg",
  serving_size: "15 g",
  nutriments: {
    "energy-kcal_100g": 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9
  }
};
var nutella = mapOffRecordToRemoteResult2(nutellaFixture);
check(nutella !== null, "mapOffRecordToRemoteResult \u064A\u062D\u0648\u0651\u0644 \u0633\u062C\u0644 \u0646\u0648\u062A\u064A\u0644\u0627 \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0625\u0644\u0649 \u0646\u062A\u064A\u062C\u0629");
check(nutella?.per === "100g" && nutella?.kcal === 539, `per=100g\u060C \u0627\u0644\u0633\u0639\u0631\u0627\u062A=539 (\u0641\u0639\u0644\u064A\u064B\u0627: ${nutella?.per}/${nutella?.kcal})`);
check(nutella?.protein === 6.3 && nutella?.carbs === 57.5 && nutella?.fat === 30.9, "\u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646/\u0627\u0644\u0643\u0627\u0631\u0628/\u0627\u0644\u062F\u0647\u0648\u0646 \u062A\u0637\u0627\u0628\u0642 nutriments \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629");
check(nutella?.brand === "Ferrero" && nutella?.servingSize === "15 g", "brand \u0648 servingSize \u0635\u062D\u064A\u062D\u0627\u0646");
check(mapOffRecordToRemoteResult2({ nutriments: {} }) === null, "\u0645\u0646\u062A\u062C \u0628\u0644\u0627 \u0627\u0633\u0645/\u0633\u0639\u0631\u0627\u062A \u2192 null");
check(mapOffRecordToRemoteResult2({ product_name: "X", nutriments: {} }) === null, "\u0645\u0646\u062A\u062C \u0628\u0627\u0633\u0645 \u0644\u0643\u0646 \u0628\u0644\u0627 \u0633\u0639\u0631\u0627\u062A (100g \u0648\u0644\u0627 serving) \u2192 null");
var servingOnly = mapOffRecordToRemoteResult2({
  product_name: "\u0648\u062C\u0628\u0629 \u0628\u062D\u0635\u0629 \u0641\u0642\u0637",
  serving_size: "30 g",
  nutriments: { "energy-kcal_serving": 120, proteins_serving: 3 }
});
check(servingOnly?.per === "serving" && servingOnly?.kcal === 120, "\u064A\u0633\u062A\u062E\u062F\u0645 \u0642\u064A\u0645 \u0627\u0644\u062D\u0635\u0629 (_serving) \u0628\u062F\u064A\u0644\u064B\u0627 \u0645\u0648\u0633\u0648\u0645\u064B\u0627 per=serving \u0639\u0646\u062F \u063A\u064A\u0627\u0628 _100g");
console.log("\n\u2014 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u062A\u0635\u0627\u0644 \u062D\u0642\u064A\u0642\u064A\u0629 \u0628\u0640 OFF \u2014");
var liveProduct = await fetchFromOFF2(NUTELLA_BARCODE);
if (liveProduct) {
  check(liveProduct.kcal === 539, `\u0627\u062A\u0635\u0627\u0644 \u062D\u064A \u0646\u062C\u062D: \u0646\u0648\u062A\u064A\u0644\u0627 = ${liveProduct.kcal} kcal/100g (\u0645\u062A\u0648\u0642\u064E\u0651\u0639 539)`);
} else {
  console.log("\u26A0\uFE0F  \u0644\u0645 \u064A\u064F\u0646\u0641\u064E\u0651\u0630 \u0627\u062A\u0635\u0627\u0644 \u062D\u064A (\u0628\u0644\u0627 \u0646\u062A\u064A\u062C\u0629) \u2014 \u0631\u0627\u062C\u0639 docs/product/P8_A2.md \u0644\u062A\u0641\u0633\u064A\u0631 \u0642\u064A\u062F \u0627\u0644\u0634\u0628\u0643\u0629 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.");
}
var liveSaudiPage = await fetchSaudiOffPage2(1, 5).catch((err) => {
  console.log(`\u26A0\uFE0F  \u0641\u0634\u0644 \u0628\u062D\u062B \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u062D\u064A: ${err instanceof Error ? err.message : err}`);
  return null;
});
if (liveSaudiPage) {
  console.log(`\u2139\uFE0F  \u0628\u062D\u062B \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u062D\u064A \u0631\u062C\u0651\u0639 ${liveSaudiPage.length} \u0645\u0646\u062A\u062C(\u0627\u062A) \u0645\u0646 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0623\u0648\u0644\u0649.`);
}
var barcodeConflict = "6281000000001";
var first = upsertProduct2({
  barcode: barcodeConflict,
  name: "\u062D\u0644\u064A\u0628 \u062A\u062C\u0631\u064A\u0628\u064A",
  per: "100g",
  kcal: 100,
  protein: 5,
  carbs: 10,
  fat: 2,
  source: { sourceName: "open_food_facts", importedAt: (/* @__PURE__ */ new Date(1e3)).toISOString() }
});
check(first.status === "imported", "\u0623\u0648\u0644 \u0625\u062F\u062E\u0627\u0644 \u0644\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F \u064A\u0628\u0642\u0649 imported");
var second = upsertProduct2({
  barcode: barcodeConflict,
  name: "\u062D\u0644\u064A\u0628 \u062A\u062C\u0631\u064A\u0628\u064A",
  imageUrl: "https://example.com/x.jpg",
  servingSize: "250\u0645\u0644",
  per: "100g",
  kcal: 155,
  // فرق 55% عن 100 — يتجاوز عتبة 10%
  protein: 6,
  carbs: 11,
  fat: 2.2,
  source: { sourceName: "manual", importedAt: (/* @__PURE__ */ new Date(2e3)).toISOString() }
});
check(second.status === "pending_review", "\u0641\u0631\u0642 \u062C\u0648\u0647\u0631\u064A (>10%) \u0628\u064A\u0646 \u0645\u0635\u062F\u0631\u064A\u0646 \u2192 pending_review");
check(second.sources.length === 2 && second.sources.some((s) => s.sourceName === "open_food_facts") && second.sources.some((s) => s.sourceName === "manual"), "\u0643\u0644\u0627 \u0627\u0644\u0645\u0635\u062F\u0631\u064A\u0646 \u0645\u062D\u0641\u0648\u0638\u0627\u0646 \u0641\u064A sources[] \u062F\u0648\u0646 \u0641\u0642\u062F\u0627\u0646 \u0623\u064A\u0651\u0647\u0645\u0627");
check(listByStatus2("pending_review").some((p) => p.barcode === barcodeConflict), "\u0627\u0644\u0645\u0646\u062A\u062C \u064A\u0638\u0647\u0631 \u0641\u064A listByStatus(pending_review) \u0644\u0645\u0631\u0627\u062C\u0639\u0629 Agent 4");
var barcodeMinor = "6281000000002";
upsertProduct2({
  barcode: barcodeMinor,
  name: "\u0648\u062C\u0628\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629",
  per: "100g",
  kcal: 200,
  protein: 10,
  carbs: 20,
  fat: 5,
  source: { sourceName: "open_food_facts", importedAt: (/* @__PURE__ */ new Date(1e3)).toISOString() }
});
var minorMerge = upsertProduct2({
  barcode: barcodeMinor,
  name: "\u0648\u062C\u0628\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629",
  per: "100g",
  kcal: 208,
  // فرق 4% فقط
  protein: 10,
  carbs: 20,
  fat: 5,
  source: { sourceName: "open_food_facts", importedAt: (/* @__PURE__ */ new Date(2e3)).toISOString() }
});
check(minorMerge.status === "imported", "\u0641\u0631\u0642 \u0637\u0641\u064A\u0641 (4%) \u0644\u0627 \u064A\u064F\u0641\u0639\u0650\u0651\u0644 pending_review");
var alreadyStored = await resolveBarcode2(barcodeConflict);
check(alreadyStored.foundIn === "internal" && alreadyStored.product?.barcode === barcodeConflict, "resolveBarcode \u064A\u0631\u062C\u0651\u0639 \u0645\u0646 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 (foundIn=internal) \u062F\u0648\u0646 \u0625\u0639\u0627\u062F\u0629 \u062C\u0644\u0628");
var viaFetcher = await resolveBarcode2(NUTELLA_BARCODE);
check(
  viaFetcher.foundIn === "not_found" || viaFetcher.foundIn === "open_food_facts",
  `resolveBarcode \u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u062E\u0632\u064E\u0651\u0646 \u064A\u0645\u0631\u0651 \u0639\u0628\u0631 \u062C\u0627\u0644\u0628 OFF \u0627\u0644\u0645\u0633\u062C\u064E\u0651\u0644 (foundIn: ${viaFetcher.foundIn} \u2014 not_found \u0645\u0642\u0628\u0648\u0644 \u0625\u0646 \u062D\u064F\u0638\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644)`
);
check(getProduct2(NUTELLA_BARCODE) !== void 0 || viaFetcher.foundIn === "not_found", "\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062C\u0627\u0644\u0628 \u0627\u0644\u0646\u0627\u062C\u062D\u0629 \u062A\u064F\u062D\u0641\u064E\u0638 \u0645\u062D\u0644\u064A\u064B\u0627 \u0639\u0628\u0631 upsertProduct");
check(OFF_ATTRIBUTION_AR2.includes("Open Food Facts") && OFF_ATTRIBUTION_AR2.includes("ODbL"), "\u0646\u0635 \u0646\u0633\u0628 \u0627\u0644\u0645\u0635\u062F\u0631 \u064A\u0630\u0643\u0631 Open Food Facts \u0648 ODbL");
console.log(`
${failures === 0 ? "\u2705 \u0643\u0644 \u0627\u0644\u0641\u062D\u0648\u0635 \u0646\u062C\u062D\u062A" : `\u274C ${failures} \u0641\u062D\u0635 \u0641\u0634\u0644`}`);
process.exit(failures === 0 ? 0 : 1);
