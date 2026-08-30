#!/usr/bin/env node
// Builds DATASET A — SAUDI_FOOD_TOP_PRODUCTS.
//
// Two tiers, never mixed:
//   products[]        nutrition already evidenced (carried from docs/data-factory PKG-001,
//                     mapped into the shape src/features/products/types.ts imports)
//   identity_leads[]  product identity + GTIN evidenced from an Open Food Facts listing,
//                     nutrition NULL because no reachable source published it here.
//
// No kcal, macro, GTIN or serving size in this file was estimated, inferred from a
// similar product, or copied from another flavour. Missing stays null.
//
// Re-run: node data-prep/scripts/build-food.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const PKG = JSON.parse(readFileSync(join(ROOT, 'docs/data-factory/packaged/PKG-001-saudi-gulf-packaged.json'), 'utf8'))

// ---------------------------------------------------------------- GS1 helpers
const GS1 = { '608': 'Bahrain', '620': 'Tanzania', '621': 'Syria', '622': 'Egypt', '624': 'Libya', '625': 'Jordan', '626': 'Iran', '627': 'Kuwait', '628': 'Saudi Arabia', '629': 'United Arab Emirates', '630': 'Qatar', '789': 'Brazil', '890': 'India', '590': 'Poland', '750': 'Mexico', '428': 'South Korea' }
const GCC = new Set(['608', '627', '628', '629', '630'])

/** EAN-13 / GTIN-13 check digit. Returns null for anything that is not 13 digits. */
function checkDigitValid(gtin) {
  if (!/^\d{13}$/.test(gtin)) return null
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(gtin[i]) * (i % 2 === 0 ? 1 : 3)
  return ((10 - (sum % 10)) % 10) === Number(gtin[12])
}
function prefixOf(gtin) { return /^\d{13}$/.test(gtin) ? gtin.slice(0, 3) : null }
function classify(gtin) {
  const valid = checkDigitValid(gtin)
  const p = prefixOf(gtin)
  return {
    gtin_format_valid: /^\d{13}$/.test(gtin),
    gtin_check_digit_valid: valid,
    gs1_prefix: p,
    gs1_prefix_country: p ? (GS1[p] ?? 'unassigned/unknown in our lookup') : null,
    gs1_prefix_is_gcc: p ? GCC.has(p) : null,
    prefix_caveat: 'GS1 prefix identifies the company that registered the barcode, not necessarily the country of manufacture or sale.',
  }
}

// ------------------------------------------------- tier 1: evidenced nutrition
// Carried verbatim from PKG-001 (batch of 2026-07-30). Values are NOT re-derived here;
// this step only reshapes them into the app's product schema and re-runs the integrity
// checks so a bad carry-over cannot pass silently.
const CONF = {
  'official+off': { tier: 'FULLY_VERIFIED', app_status: 'verified' },
  'off': { tier: 'PARTIALLY_VERIFIED', app_status: 'pending_review' },
  'official': { tier: 'PARTIALLY_VERIFIED', app_status: 'pending_review' },
}
function tierFor(item) {
  if (/يحتاج مراجعة/.test(item.confidence ?? '')) return { tier: 'NEEDS_REVIEW', app_status: 'needs_fix' }
  return CONF[item.source_tier] ?? { tier: 'PARTIALLY_VERIFIED', app_status: 'pending_review' }
}

const products = PKG.items.map((it) => {
  const n = it.per_100g_or_100ml ?? {}
  const t = tierFor(it)
  return {
    gtin: it.barcode,
    ...classify(it.barcode),
    name_ar: it.name_ar, name_en: it.name_en,
    brand_ar: it.brand_ar ?? null,
    variant: it.name_ar,
    category_ar: it.category_ar ?? null,
    package_size: it.package_size ?? null,
    serving_size: it.serving_size ?? null,
    nutrition_basis: 'per_100g_or_100ml',
    kcal: n.energy_kcal ?? null,
    protein_g: n.protein_g ?? null,
    carbohydrates_g: n.carbohydrates_g ?? null,
    fat_g: n.fat_g ?? null,
    sugars_g: n.sugars_g ?? null,
    saturated_fat_g: n.saturated_fat_g ?? null,
    fiber_g: n.fiber_g ?? null,
    sodium_mg: n.sodium_mg ?? null,
    allergens_ar: it.allergens_ar ?? null,
    allergens_caveat: it.allergens_completeness ?? null,
    verification_status: t.tier,
    app_status: t.app_status,
    source_type: it.source_tier,
    source_official_url: it.source_official_url ?? null,
    source_off_url: it.source_off_url ?? null,
    cross_source_max_divergence_pct: it.cross_source_max_divergence_pct ?? null,
    last_verified: it.last_verified ?? null,
    image_reference: null,
    image_status: 'UNRESOLVED',
    provenance: 'Carried from docs/data-factory/packaged/PKG-001-saudi-gulf-packaged.json — not re-verified in this batch.',
    notes: it.note_ar ?? null,
  }
})

// ------------------------------------- tier 2: identity + GTIN, nutrition null
// Harvested from Open Food Facts product listings via web search (listing titles carry
// the GTIN and the product identity). Nutrition was NOT retrievable: the OFF API and all
// manufacturer/retailer domains are blocked by this environment's egress policy, so every
// nutrition field below is null rather than guessed.
const L = (gtin, name, brand, size, category, url) => ({ gtin, name_as_listed: name, brand, package_size: size, category_ar: category, source_url: url })
const RAW_LEADS = [
  // --- Almarai / Al Safi / Alqariah (dairy) ---
  L('6281007040235', 'Fresh Milk', 'Almarai / المراعي', null, 'حليب سائل', 'https://world.openfoodfacts.org/product/6281007040235/fresh-milk-almarai'),
  L('6281007046244', 'Almarai Full fat milk 18x150ml', 'Almarai / المراعي', '18 × 150 ml', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281007046244/almarai-full-fat-milk-18x150ml-15days'),
  L('6281007120906', 'Fresh Milk - Low Fat', 'Almarai / المراعي', '1 L', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281007120906/fresh-milk-low-fat-almarai'),
  L('6281007023115', 'Fresh milk FULL FAT', 'Almarai / المراعي', '180 ml', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281007023115/fresh-milk-full-fat-almarai'),
  L('6281007040655', 'زبادي المراعي / Almarai fresh yogurt full fat', 'Almarai / المراعي', '170 g', 'زبادي', 'https://world.openfoodfacts.org/product/6281007040655/almarai-fresh-yogurt-full-fat'),
  L('6281007049207', 'المراعي زبادي بالمانجو', 'Almarai / المراعي', '150 g', 'زبادي', 'https://world.openfoodfacts.org/product/6281007049207/'),
  L('6281007044424', 'Almarai Whipping cream', 'Almarai / المراعي', '1 L', 'كريمة', 'https://world.openfoodfacts.org/product/6281007044424/almarai-whipping-cream'),
  L('6281007770408', 'لبن المراعي', 'Almarai / المراعي', null, 'لبن', 'https://world.openfoodfacts.org/product/6281007770408/'),
  L('6281007070232', 'متبل مدخن', 'Almarai / المراعي', null, 'مقبلات', 'https://world.openfoodfacts.org/product/6281007070232/'),
  L('6281007070768', 'المراعي عصير توت', 'Almarai / المراعي', '1.4 L', 'عصائر', 'https://world.openfoodfacts.org/product/6281007070768/'),
  L('6287004980017', 'Fresh Laban', 'Alqariah / القرية', '230 ml', 'لبن', 'https://world.openfoodfacts.org/product/6287004980017/fresh-laban-alqariah'),
  L('6281022115659', 'Alsafi low laban', 'Al Safi / الصافي', '180 ml', 'لبن', 'https://world.openfoodfacts.org/product/6281022115659/alsafi-180-low-laban'),
  // --- Nadec / Nada ---
  L('6281057002726', 'Nadec fresh flavored milk mango', 'Nadec / نادك', '360 ml', 'حليب منكّه', 'https://world.openfoodfacts.org/product/6281057002726/nadec-fresh-flavored-milk-mango'),
  L('6281057002689', 'Nadec fresh milk low fat', 'Nadec / نادك', '800 ml', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281057002689/nadec-fresh-milk-low-fat'),
  L('6281057011018', 'Nadec Milk Low Fat', 'Nadec / نادك', '1 L', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281057011018/nadec-milk-low-fat'),
  L('6281018220848', 'Protein Milk', 'Nada / ندى', null, 'حليب بروتين', 'https://world.openfoodfacts.org/product/6281018220848/protein-milk-nada'),
  L('6281018154747', 'Protein vanilla flavored milk with fruit juice', 'Nada / ندى', '320 ml', 'حليب بروتين', 'https://world.openfoodfacts.org/product/6281018154747/protein-vanilla-flavored-milk-with-fruit-juice-nada'),
  L('6281018140566', 'Nada milk', 'Nada / ندى', null, 'حليب سائل', 'https://world.openfoodfacts.org/product/6281018140566/nada-milk'),
  // --- L'usine / bakery ---
  L('6281007060455', "Luisine Toast Bread", "L'usine / لوزين", '600 g', 'خبز وتوست', 'https://world.openfoodfacts.org/product/6281007060455/luisine-toast-bread-almarai'),
  L('6281100081036', 'Toast', "L'usine / لوزين", '600 g', 'خبز وتوست', 'https://world.openfoodfacts.org/product/6281100081036/toast-lusine'),
  L('6281100081029', 'Sliced Bread Brown', "L'usine / لوزين", null, 'خبز وتوست', 'https://world.openfoodfacts.org/product/6281100081029/sliced-bread-brown-l-usine'),
  L('6281007036849', 'Lusine sliced bread milk', "L'usine / لوزين", '600 g', 'خبز وتوست', 'https://world.openfoodfacts.org/product/6281007036849/lusine-sliced-bread-milk-l-usine-bread'),
  L('6281007037112', 'Almarai Cream Cheese bread section', 'Almarai / المراعي', '3 × 108 g', 'مخبوزات', 'https://world.openfoodfacts.org/product/6281007037112/almarai-cream-cheese-bread-section'),
  // --- Saudia (SADAFCO) ---
  L('6281039706017', 'Saudia Organic Tomato paste', 'Saudia / السعودية (سدافكو)', '135 g', 'معلبات', 'https://world.openfoodfacts.org/product/6281039706017/saudia-organic-tomato-paste'),
  L('6281039581911', 'FEAST ice cream', 'Saudia / السعودية (سدافكو)', null, 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039581911/feast-icecream-saudia'),
  L('6281039572216', 'Ice Cream Sandwich', 'Saudia / السعودية (سدافكو)', null, 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039572216/ice-cream-sandwich-saudia'),
  L('6281039551716', 'Ice Cream Cappuccino', 'Saudia / السعودية (سدافكو)', null, 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039551716/ice-cream-cappuccino-saudia'),
  L('6281039584011', 'Baboo (Vanilla Semi Ice Milk with Cone Biscuits)', 'Saudia / السعودية (سدافكو)', '62.5 g', 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039584011/baboo-vanilla-semi-ice-milk-with-cone-biscuits-saudia'),
  L('6281039571219', 'Sandwich ice cream', 'Saudia / السعودية (سدافكو)', null, 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039571219/sandwich-ice-cream'),
  L('6281039371017', 'Saudia Milk Powder', 'Saudia / السعودية (سدافكو)', '2500 g', 'حليب مجفف', 'https://world.openfoodfacts.org/product/6281039371017/saudia-milk-powder-2500g'),
  L('6281039560213', 'TORNADOO ice cream', 'Saudia / السعودية (سدافكو)', null, 'آيس كريم', 'https://world.openfoodfacts.org/product/6281039560213/tornadoo-ice-cream-saudia'),
  // --- water ---
  L('6281101220755', 'Water', 'Berain / بيرين', '330 ml', 'مياه معبأة', 'https://world.openfoodfacts.org/product/6281101220755/water-berain'),
  L('6281101220779', 'Berain Water', 'Berain / بيرين', '1.5 L', 'مياه معبأة', 'https://world.openfoodfacts.org/product/6281101220779/berain-water-1-5l'),
  L('6281101220786', 'Berain Water', 'Berain / بيرين', null, 'مياه معبأة', 'https://world.openfoodfacts.org/product/6281101220786/berain-water'),
  L('6281101221745', 'Berain Sparkling Water Glass', 'Berain / بيرين', '270 ml', 'مياه معبأة', 'https://world.openfoodfacts.org/product/6281101221745/berain-sparkling-water-glass-270ml'),
  // --- tuna / canned / other ---
  L('6281020040809', 'Tuna (brand not stated in listing)', null, null, 'تونة معلّبة', 'https://world.openfoodfacts.org/product/6281020040809/tuna'),
  L('6281014800426', 'Goody original light meat tuna in sunflower oil', 'Goody / قودي', '185 g', 'تونة معلّبة', 'https://world.openfoodfacts.org/product/6281014800426/goody-original-light-meat-tuna-in-sunflower-oil'),
  L('6281102685034', 'Chicken burger', 'Herfy / هرفي', null, 'دجاج مجمّد', 'https://world.openfoodfacts.org/product/6281102685034/chicken-burger-herfy'),
  // --- harvested listings that collide with an already-evidenced product or with a
  // previously rejected entry. Kept in the input on purpose so the dedupe and the
  // prior-rejection cross-check run on real data instead of a hand-cleaned list.
  L('6281007033565', 'Almarai lacto free milk full fat', 'Almarai / المراعي', '1 L', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281007033565/almarai-lacto-free-milk-full-fat'),
  L('6281007063067', 'Fresh Yoghurt (Full Fat)', 'Almarai / المراعي', null, 'زبادي', 'https://world.openfoodfacts.org/product/6281007063067/fresh-yoghurt-full-fat-almarai'),
  L('6281057010011', 'Nadec milk', 'Nadec / نادك', '1 L', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281057010011/nadec-milk'),
  L('6281057009121', 'Protein Milk Drink', 'Nadec / نادك', '250 ml', 'حليب بروتين', 'https://world.openfoodfacts.org/product/6281057009121/protein-milk-drink-nadec'),
  L('6281039100914', 'Whole Milk', 'Saudia / السعودية (سدافكو)', '2 L', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281039100914/whole-milk-saudia'),
  L('6281007029612', 'Lusine Multi Grain Slice Bread', "L'usine / لوزين", null, 'خبز وتوست', 'https://world.openfoodfacts.org/product/6281007029612/lusine-multi-grain-slice-bread-l-usine'),
  L('6281039122015', 'Saudia low fat milk', 'Saudia / السعودية (سدافكو)', '200 ml', 'حليب سائل', 'https://world.openfoodfacts.org/product/6281039122015/saudia-low-fat-milk'),
  L('6281007034067', 'المراعي لبن', 'Almarai / المراعي', '2.85 L', 'لبن', 'https://world.openfoodfacts.org/product/6281007034067/'),
  L('6281057007028', 'Nadec banana flavored milk', 'Nadec / نادك', null, 'حليب منكّه', 'https://world.openfoodfacts.org/product/6281057007028/nadec-bana-flavored-milk'),
]

// PKG-001 already rejected 113 OFF entries with documented reasons. A lead that reappears
// here must carry that history rather than come back looking fresh.
const PRIOR_REJECTIONS = new Map((PKG.needs_field_verification?.rejected_entries ?? []).map((r) => [r.barcode, r]))

// Entries seen in the same listings that are NOT admissible for a Saudi launch dataset.
const REJECTED = [
  { gtin: '0112112111212', name_as_listed: 'Almarai fresh cream', reason: 'GTIN fails the EAN-13 check digit and the prefix is not a real GS1 assignment — a junk entry in the source. Rejected outright.', source_url: 'https://world.openfoodfacts.org/product/0112112111212/almarai-fresh-cream' },
  { gtin: '4284466084033', name_as_listed: 'Lusine Plain Croissant', reason: 'Prefix 428 is South Korea. A Saudi L\'usine bakery item cannot carry it — almost certainly a mis-keyed barcode. Rejected: inferring the "right" barcode would be inventing one.', source_url: 'https://world.openfoodfacts.org/product/4284466084033/lusine-plain-croissant-almarai' },
  { gtin: '6223001874317', name_as_listed: 'Milk Almarai 1 L', reason: 'Prefix 622 is Egypt. Almarai Egypt is a different market with a possibly different formulation — not the Saudi product, and treating it as such would be fuzzy matching.', source_url: 'https://world.openfoodfacts.org/product/6223001874317/milk-almarai' },
  { gtin: '0617950143598', name_as_listed: 'White meat tuna — Al Alali 85 g', reason: 'Prefix 061 is a US/Canada GS1 assignment, which does not fit a Saudi Al Alali pack. Held back pending a shelf check rather than admitted on name match alone.', source_url: 'https://world.openfoodfacts.org/product/0617950143598/white-meat-tuna-al-alali' },
  { gtin: '7891515546410', name_as_listed: 'Sadia breaded chicken golden steak 100 g', reason: 'Prefix 789 is Brazil, which is consistent with Sadia being Brazilian, but the listing does not establish it is the pack sold in Saudi Arabia. Kept out of the Saudi set until confirmed.', source_url: 'https://world.openfoodfacts.org/product/7891515546410/' },
]

// ---------------------------------------------------------------- integrity checks
// PKG-001's five checks, re-run on every carried product so a bad carry-over cannot pass.
function integrity(p) {
  const issues = []
  const { kcal, protein_g: pr, carbohydrates_g: ca, fat_g: fa, sugars_g: su, saturated_fat_g: sa, sodium_mg: so } = p
  if ([kcal, pr, ca, fa].every((v) => typeof v === 'number')) {
    const atwater = 4 * pr + 4 * ca + 9 * fa
    const dev = kcal > 0 ? Math.abs(atwater - kcal) / kcal * 100 : null
    p.atwater_deviation_pct = dev === null ? null : Math.round(dev * 10) / 10
    if (dev !== null && dev > 12) issues.push(`atwater deviation ${p.atwater_deviation_pct}% exceeds 12%`)
    if (pr + ca + fa > 100) issues.push(`macros sum ${(pr + ca + fa).toFixed(1)} g exceeds 100 g`)
  } else { p.atwater_deviation_pct = null; issues.push('incomplete macros — cannot run Atwater') }
  if (typeof su === 'number' && typeof ca === 'number' && su > ca + 0.01) issues.push(`sugars ${su} g exceed carbohydrates ${ca} g`)
  if (typeof sa === 'number' && typeof fa === 'number' && sa > fa + 0.01) issues.push(`saturated fat ${sa} g exceeds total fat ${fa} g`)
  if (typeof so === 'number' && so > 2000) issues.push(`sodium ${so} mg/100 g is implausible`)
  return issues
}
for (const p of products) { p.integrity_issues = integrity(p); if (p.integrity_issues.length) p.verification_status = 'NEEDS_REVIEW' }

// ---------------------------------------------------------------- dedupe
const seen = new Map()
const duplicates = []
for (const p of products) {
  if (seen.has(p.gtin)) { duplicates.push({ gtin: p.gtin, kept: seen.get(p.gtin).name_en, dropped: p.name_en, rule: 'same GTIN' }); p._dup = true }
  else seen.set(p.gtin, p)
}
const productsDeduped = products.filter((p) => !p._dup).map(({ _dup, ...r }) => r)

const leadSeen = new Set(productsDeduped.map((p) => p.gtin))
const identityLeads = []
for (const l of RAW_LEADS) {
  const cls = classify(l.gtin)
  if (cls.gtin_check_digit_valid !== true) { REJECTED.push({ gtin: l.gtin, name_as_listed: l.name_as_listed, reason: 'GTIN fails the EAN-13 check digit.', source_url: l.source_url }); continue }
  if (leadSeen.has(l.gtin)) { duplicates.push({ gtin: l.gtin, kept: 'evidenced product (PKG-001)', dropped: l.name_as_listed, rule: 'lead already carries evidenced nutrition' }); continue }
  leadSeen.add(l.gtin)
  const prior = PRIOR_REJECTIONS.get(l.gtin)
  identityLeads.push({
    gtin: l.gtin, ...cls,
    prior_rejection: prior ? { batch: 'PKG-001', reasons_ar: prior.reasons_ar, name_off: prior.name_off ?? null } : null,
    name_as_listed: l.name_as_listed, brand: l.brand ?? null,
    package_size: l.package_size, category_ar: l.category_ar,
    serving_size: null, nutrition_basis: null,
    kcal: null, protein_g: null, carbohydrates_g: null, fat_g: null,
    verification_status: 'IDENTITY_ONLY',
    app_status: 'pending_review',
    source_type: 'open_food_facts_listing',
    source_url: l.source_url,
    image_reference: null, image_status: 'UNRESOLVED',
    resolution_path: 'Fetch the Open Food Facts record (or the brand nutrition page) for this GTIN, then apply the five PKG-001 integrity checks before promoting to products[].',
    notes: 'Identity and GTIN evidenced from an Open Food Facts listing. Nutrition deliberately null — no reachable source published it in this environment.',
  })
}

// ---------------------------------------------------------------- unresolved high priority
const UNRESOLVED = [
  { group: 'Carbonated soft drinks', items: ['Coca-Cola Original (KSA pack)', 'Coca-Cola Zero Sugar (KSA)', 'Coca-Cola Light / Diet Coke (KSA, where sold)', 'Pepsi (KSA)', 'Pepsi Diet (KSA)', 'Pepsi Zero Sugar (KSA)', '7UP (KSA)', '7UP Free / Diet (KSA)', 'Mountain Dew (KSA)', 'Mirinda (KSA)'], why: 'Open Food Facts listings for these brands return Indian (890), Polish (590), Mexican (750) and US (0012000) barcodes — other markets with potentially different formulations. No Saudi-registered (628) entry surfaced. Treating a foreign pack as the Saudi one would be exactly the fuzzy match the brief forbids.' },
  { group: 'Energy drinks', items: ['Red Bull (KSA)', 'Power Horse (KSA)'], why: 'Same as above; PKG-001 also recorded energy drinks as an open category gap.' },
  { group: 'Bottled water (non-Berain)', items: ['Aquafina (KSA)', 'Nova', 'Nestlé Pure Life (KSA)'], why: 'Only US-registered Aquafina entries surfaced. Berain is covered in identity_leads; Nova and Nestlé Pure Life returned no Saudi entry.' },
  { group: 'Instant noodles', items: ['Indomie Special Chicken (KSA)', 'Indomie Mi Goreng (KSA)', 'Indomie Vegetable (KSA)'], why: 'All Indomie entries carry Indonesian/global (0089686) or Serbian (860) prefixes. No Saudi-registered pack surfaced.' },
  { group: 'Crisps and snacks', items: ["Lay's (KSA variants beyond PKG-001 #54)", 'Doritos (KSA)', 'Cheetos (KSA)', 'Pringles (KSA)'], why: 'No Saudi-registered entries surfaced. PKG-001 carries one evidenced Lay\'s salted 155 g pack; the rest are unevidenced.' },
  { group: 'Chocolate and biscuits', items: ['KitKat', 'Galaxy', 'Snickers', 'Twix', 'Oreo', "McVitie's", 'Ritz', 'Lotus'], why: 'Imported confectionery is registered under the manufacturer\'s home prefix, so a Saudi-market pack cannot be identified from a listing alone.' },
  { group: 'Frozen chicken and prepared poultry', items: ['Sunbulah', 'Tanmiah', 'Al Kabeer', 'Americana', 'Sadia (KSA pack)'], why: 'A dedicated search returned no Saudi-registered frozen chicken entries; the only hits were UK, US and Brazilian products. Herfy chicken burger is in identity_leads.' },
  { group: 'Ready-to-drink coffee and protein products', items: ['RTD coffee (Nescafé / Almarai / Barista)', 'Whey and sports protein sold in KSA'], why: 'PKG-001 already recorded sports protein as needing a shelf reading; nothing new was reachable here.' },
]

// ---------------------------------------------------------------- coverage
const catCount = (arr, key) => arr.reduce((m, x) => { const k = x[key] ?? '—'; m[k] = (m[k] || 0) + 1; return m }, {})
const brandKey = (x) => x.brand_ar ?? x.brand ?? '—'
const brandCount = (arr) => arr.reduce((m, x) => { const k = brandKey(x); m[k] = (m[k] || 0) + 1; return m }, {})

const all = [...productsDeduped, ...identityLeads]
const dataset = {
  dataset: 'SAUDI_FOOD_TOP_PRODUCTS',
  version: '1.0.0-prep',
  status: 'PREPARED_FOR_REVIEW — NOT IMPORTED',
  generated_at: new Date().toISOString().slice(0, 10),
  honest_summary: 'This batch does not reach 500 products, and it does not pad to get there. Nutrition-evidenced records come from the existing PKG-001 batch; everything added here is identity-and-GTIN only, because the authoritative nutrition sources are unreachable from this environment (see environment_constraint).',
  environment_constraint: {
    blocked_by_egress_policy: ['world.openfoodfacts.org (API and site)', 'static.openfoodfacts.org', 'www.almarai.com', 'sfda.gov.sa', 'panda.com.sa', 'www.carrefourksa.com', 'fdc.nal.usda.gov', 'en.wikipedia.org'],
    reachable: ['registry.npmjs.org', 'pypi.org', 'web search (result titles and snippets only)'],
    consequence: 'Product identity and GTIN could be evidenced from search result listings. Per-product nutrition panels could not be read, so they are null rather than guessed. The app already ships a runtime Open Food Facts seed (src/features/products/saudiSeed.ts) that will populate nutrition on a network-enabled device.',
    what_unblocks_500: 'Allow-list world.openfoodfacts.org (and ideally the brand domains almarai.com, nadec.com.sa, nada-me.com, sadafco.com), then re-run this builder: the OFF Saudi facet alone returns hundreds of products with GTIN plus nutrition in one query.',
  },
  source_policy: {
    priority: ['1. Official manufacturer', '2. Saudi official/regulatory data', '3. Reliable Saudi retailer/product listing', '4. Open Food Facts where identity matches'],
    rule: 'Manufacturer nutrition beats retailer transcription. A retailer or an OFF listing may establish existence and identity without becoming authoritative for nutrition.',
    never: ['invent kcal or macros', 'invent or infer a GTIN', 'copy nutrition from another flavour or pack size', 'treat a different-GTIN pack size as the same product', 'use fuzzy name matching as identity proof', 'attach an image of a different variant'],
  },
  integrity_checks: PKG.integrity_checks_ar ?? null,
  gtin_validation: { method: 'EAN-13 check digit plus GS1 prefix classification', gcc_prefixes: [...GCC], caveat: 'Prefix identifies the registering company, not the country of manufacture or sale.' },
  stats: {},
  category_coverage: { evidenced: catCount(productsDeduped, 'category_ar'), identity_only: catCount(identityLeads, 'category_ar') },
  brand_coverage: { evidenced: brandCount(productsDeduped), identity_only: brandCount(identityLeads) },
  duplicates_removed: duplicates,
  rejected: REJECTED,
  unresolved_high_priority: UNRESOLVED,
  products: productsDeduped,
  identity_leads: identityLeads,
}

dataset.stats = {
  TOTAL_PRODUCTS: all.length,
  FULLY_VERIFIED: productsDeduped.filter((p) => p.verification_status === 'FULLY_VERIFIED').length,
  PARTIALLY_VERIFIED: productsDeduped.filter((p) => p.verification_status === 'PARTIALLY_VERIFIED').length,
  NEEDS_REVIEW: productsDeduped.filter((p) => p.verification_status === 'NEEDS_REVIEW').length,
  IDENTITY_ONLY: identityLeads.length,
  GTIN_VERIFIED: all.filter((p) => p.gtin_check_digit_valid === true).length,
  NUTRITION_VERIFIED: productsDeduped.filter((p) => typeof p.kcal === 'number' && typeof p.protein_g === 'number' && typeof p.carbohydrates_g === 'number' && typeof p.fat_g === 'number').length,
  IMAGE_VERIFIED: all.filter((p) => p.image_status === 'VERIFIED').length,
  DUPLICATES_REMOVED: duplicates.length,
  IDENTITY_ONLY_PREVIOUSLY_REJECTED: identityLeads.filter((l) => l.prior_rejection).length,
  REJECTED: REJECTED.length,
  UNRESOLVED_HIGH_PRIORITY: UNRESOLVED.reduce((a, g) => a + g.items.length, 0),
}

writeFileSync(join(ROOT, 'data-prep/food/SAUDI_FOOD_TOP_PRODUCTS.json'), JSON.stringify(dataset, null, 2))
console.log(JSON.stringify(dataset.stats, null, 2))
