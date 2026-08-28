#!/usr/bin/env node
// Validator for DATASET A. Named checks only — a failure always says which rule broke.
//
// Run:         node data-prep/scripts/validate-food.mjs
// Attack mode: node data-prep/scripts/validate-food.mjs --attack

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const NUTRIENTS = ['kcal', 'protein_g', 'carbohydrates_g', 'fat_g']

function checkDigitValid(gtin) {
  if (!/^\d{13}$/.test(gtin)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(gtin[i]) * (i % 2 === 0 ? 1 : 3)
  return ((10 - (sum % 10)) % 10) === Number(gtin[12])
}

function validate(d) {
  const fail = []
  const F = (rule, detail) => fail.push(`${rule}: ${detail}`)
  const products = d.products ?? []
  const leads = d.identity_leads ?? []
  const all = [...products, ...leads]

  // --- 1. every GTIN is a real, well-formed GTIN-13 --------------------------
  for (const p of all) {
    if (!/^\d{13}$/.test(p.gtin)) { F('GTIN_FORMAT', `'${p.gtin}' is not a 13-digit GTIN`); continue }
    if (!checkDigitValid(p.gtin)) F('GTIN_CHECK_DIGIT', `'${p.gtin}' (${p.name_en ?? p.name_as_listed}) fails the EAN-13 check digit`)
    if (p.gtin_check_digit_valid !== true) F('GTIN_FLAG_HONEST', `'${p.gtin}' does not declare gtin_check_digit_valid:true`)
  }

  // --- 2. identity leads carry NO nutrition ----------------------------------
  for (const l of leads) {
    for (const k of [...NUTRIENTS, 'sugars_g', 'saturated_fat_g', 'fiber_g', 'sodium_mg']) {
      if (l[k] !== null && l[k] !== undefined) F('NUTRITION_ONLY_WHERE_EVIDENCED', `identity lead '${l.gtin}' carries ${k}=${l[k]} but no nutrition source was read for it`)
    }
    if (l.verification_status !== 'IDENTITY_ONLY') F('LEAD_STATUS', `lead '${l.gtin}' claims status '${l.verification_status}'`)
    if (!l.source_url) F('IDENTITY_NEEDS_SOURCE', `lead '${l.gtin}' has no source_url`)
  }

  // --- 3. evidenced products have complete macros AND a source ---------------
  for (const p of products) {
    const missing = NUTRIENTS.filter((k) => typeof p[k] !== 'number')
    if (missing.length) F('EVIDENCED_NEEDS_MACROS', `product '${p.gtin}' is in products[] but lacks ${missing.join(', ')} — it belongs in identity_leads`)
    if (!p.source_official_url && !p.source_off_url && !p.provenance) F('NUTRITION_NEEDS_SOURCE', `product '${p.gtin}' carries nutrition with no source or provenance`)
  }

  // --- 4. no duplicate GTIN anywhere ----------------------------------------
  const seen = new Map()
  for (const p of all) {
    if (seen.has(p.gtin)) F('NO_DUPLICATE_GTIN', `'${p.gtin}' appears twice (${seen.get(p.gtin)} and ${p.name_en ?? p.name_as_listed})`)
    else seen.set(p.gtin, p.name_en ?? p.name_as_listed)
  }

  // --- 5. the five integrity checks, on every product carrying macros --------
  for (const p of products) {
    if (NUTRIENTS.some((k) => typeof p[k] !== 'number')) continue
    const issues = []
    const atwater = 4 * p.protein_g + 4 * p.carbohydrates_g + 9 * p.fat_g
    const dev = p.kcal > 0 ? Math.abs(atwater - p.kcal) / p.kcal * 100 : 0
    if (dev > 12) issues.push(`atwater ${dev.toFixed(1)}%`)
    if (p.protein_g + p.carbohydrates_g + p.fat_g > 100) issues.push('macros > 100 g')
    if (typeof p.sugars_g === 'number' && p.sugars_g > p.carbohydrates_g + 0.01) issues.push('sugars > carbs')
    if (typeof p.saturated_fat_g === 'number' && p.saturated_fat_g > p.fat_g + 0.01) issues.push('sat fat > total fat')
    if (typeof p.sodium_mg === 'number' && p.sodium_mg > 2000) issues.push('sodium > 2000 mg')
    if (issues.length && p.verification_status !== 'NEEDS_REVIEW') {
      F('INTEGRITY_CHECKS', `product '${p.gtin}' fails [${issues.join('; ')}] but is marked ${p.verification_status} instead of NEEDS_REVIEW`)
    }
    if (issues.length && (p.integrity_issues ?? []).length === 0) {
      F('INTEGRITY_ISSUES_RECORDED', `product '${p.gtin}' fails a check but records no integrity_issues`)
    }
  }

  // --- 6. image claims need provenance --------------------------------------
  for (const p of all) {
    if (p.image_status === 'VERIFIED' && !p.image_reference) F('IMAGE_PROVENANCE', `'${p.gtin}' claims a verified image with no image_reference`)
    if (p.image_reference && p.image_status !== 'VERIFIED') F('IMAGE_PROVENANCE', `'${p.gtin}' carries an image_reference while status is ${p.image_status}`)
  }

  // --- 7. rejected entries must not reappear --------------------------------
  const rejected = new Set((d.rejected ?? []).map((r) => r.gtin))
  for (const p of all) if (rejected.has(p.gtin)) F('REJECTED_STAYS_OUT', `'${p.gtin}' is in the rejected list yet also shipped in the dataset`)

  // --- 8. published counts match the actual arrays --------------------------
  const s = d.stats ?? {}
  const expect = {
    TOTAL_PRODUCTS: all.length,
    FULLY_VERIFIED: products.filter((p) => p.verification_status === 'FULLY_VERIFIED').length,
    PARTIALLY_VERIFIED: products.filter((p) => p.verification_status === 'PARTIALLY_VERIFIED').length,
    IDENTITY_ONLY: leads.length,
    GTIN_VERIFIED: all.filter((p) => p.gtin_check_digit_valid === true).length,
    NUTRITION_VERIFIED: products.filter((p) => NUTRIENTS.every((k) => typeof p[k] === 'number')).length,
    IMAGE_VERIFIED: all.filter((p) => p.image_status === 'VERIFIED').length,
    DUPLICATES_REMOVED: (d.duplicates_removed ?? []).length,
    REJECTED: (d.rejected ?? []).length,
  }
  for (const [k, v] of Object.entries(expect)) {
    if (s[k] !== v) F('STATS_MATCH_CONTENT', `stats.${k}=${s[k]} but the dataset actually contains ${v}`)
  }

  // --- 9. the dataset must not claim to be imported -------------------------
  if (!/NOT IMPORTED/.test(d.status ?? '')) F('NOT_IMPORTED', `dataset status '${d.status}' does not declare it is not imported`)

  return fail
}

const ds = JSON.parse(readFileSync(join(ROOT, 'data-prep/food/SAUDI_FOOD_TOP_PRODUCTS.json'), 'utf8'))

if (!process.argv.includes('--attack')) {
  const fails = validate(ds)
  if (fails.length) { console.error(`FAIL — ${fails.length} violation(s):`); fails.forEach((f) => console.error('  ✗ ' + f)); process.exit(1) }
  console.log('PASS — DATASET A')
  console.log(`  products(with nutrition)=${ds.products.length} identity_leads=${ds.identity_leads.length} rejected=${ds.rejected.length}`)
  // Reported, not gated: identical macro tuples across different brands are a
  // copy-from-another-product smell worth a human glance, but real products do collide.
  const tuple = (p) => NUTRIENTS.map((k) => p[k]).join('|')
  const groups = {}
  for (const p of ds.products) (groups[tuple(p)] ??= []).push(p)
  const collisions = Object.entries(groups).filter(([, g]) => g.length > 1 && new Set(g.map((x) => x.brand_ar)).size > 1)
  console.log(`  macro-tuple collisions across brands (review signal, not a failure): ${collisions.length}`)
  for (const [t, g] of collisions) console.log(`    ${t} → ${g.map((x) => `${x.brand_ar}:${x.gtin}`).join(', ')}`)
  process.exit(0)
}

const clone = () => JSON.parse(JSON.stringify(ds))
const attacks = [
  ['nutrition fabricated on an identity lead', 'NUTRITION_ONLY_WHERE_EVIDENCED', (d) => { const l = d.identity_leads[0]; l.kcal = 42; l.protein_g = 0; l.carbohydrates_g = 10.6; l.fat_g = 0 }],
  ['GTIN invented (check digit wrong)', 'GTIN_CHECK_DIGIT', (d) => { d.identity_leads[1].gtin = '6281007999999' }],
  ['GTIN inferred from a similar product (duplicate)', 'NO_DUPLICATE_GTIN', (d) => { d.identity_leads[2].gtin = d.products[0].gtin }],
  ['a rejected barcode smuggled back in', 'REJECTED_STAYS_OUT', (d) => { d.identity_leads[3].gtin = d.rejected[0].gtin }],
  ['product promoted to evidenced without macros', 'EVIDENCED_NEEDS_MACROS', (d) => { d.products.push({ ...d.identity_leads[4], verification_status: 'FULLY_VERIFIED', provenance: 'x' }) }],
  ['nutrition kept but every source stripped', 'NUTRITION_NEEDS_SOURCE', (d) => { const p = d.products[0]; p.source_official_url = null; p.source_off_url = null; p.provenance = null }],
  ['Atwater-failing product marked verified', 'INTEGRITY_CHECKS', (d) => { const p = d.products[0]; p.fat_g = 40; p.verification_status = 'FULLY_VERIFIED'; p.integrity_issues = [] }],
  ['image claimed verified with no reference', 'IMAGE_PROVENANCE', (d) => { d.products[0].image_status = 'VERIFIED' }],
  ['image of another variant attached', 'IMAGE_PROVENANCE', (d) => { d.identity_leads[0].image_reference = 'https://example.invalid/some-other-flavour.jpg' }],
  ['headline count inflated toward 500', 'STATS_MATCH_CONTENT', (d) => { d.stats.TOTAL_PRODUCTS = 500 }],
  ['nutrition count inflated', 'STATS_MATCH_CONTENT', (d) => { d.stats.NUTRITION_VERIFIED = 480 }],
  ['dataset relabelled as imported', 'NOT_IMPORTED', (d) => { d.status = 'IMPORTED TO PRODUCTION' }],
  ['lead relabelled as fully verified', 'LEAD_STATUS', (d) => { d.identity_leads[5].verification_status = 'FULLY_VERIFIED' }],
]

let loose = 0
console.log('ATTACK MODE — every mutation below must be rejected by its named rule\n')
for (const [name, rule, mutate] of attacks) {
  const d = clone()
  let fails
  try { mutate(d); fails = validate(d) } catch (err) { console.log(`  ✗ LOOSE  ${name} — threw ${err.constructor.name} instead of failing by name`); loose++; continue }
  if (fails.some((f) => f.startsWith(rule + ':'))) console.log(`  ✓ caught by ${rule.padEnd(34)} ${name}`)
  else { console.log(`  ✗ LOOSE  ${name} — expected ${rule}, got: ${fails.length ? fails.slice(0, 2).join(' | ') : 'NO FAILURE AT ALL'}`); loose++ }
}
console.log(loose === 0 ? `\nPASS — ${attacks.length}/${attacks.length} bypass attempts rejected by a named check.` : `\nFAIL — ${loose} slipped through.`)
process.exit(loose === 0 ? 0 : 1)
