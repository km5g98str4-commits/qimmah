import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

export const BASELINE_COMMIT = 'cc60adfc0da0f893b101230269d4847d33490429'
export const SOURCE_PATH = 'docs/data-factory/packaged/PKG-001-saudi-gulf-packaged.json'
export const SOURCE_SHA256 = '038c7569c724d4aee5d3e167aa1efe1cce98528bc59ceaa46d1a7bcb0c2e1f7f'
export const SCHEMA_PATH = 'data/food-production/schema/canonical-food-v1.schema.json'
export const SCHEMA_VERSION = '1.0.0'
export const NORMALIZATION_VERSION = '1.0.0'
export const PIPELINE_VERSION = '1.0.0'
export const RELEASE_STATUS = 'QUARANTINED_SEED_NOT_FOR_DISTRIBUTION'

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]))
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(sortDeep(value), null, 2)}\n`)
}

export function rawRecordSha(value) {
  return sha256(Buffer.from(JSON.stringify(sortDeep(value))))
}

const DIGITS = new Map([
  ['٠', '0'], ['١', '1'], ['٢', '2'], ['٣', '3'], ['٤', '4'],
  ['٥', '5'], ['٦', '6'], ['٧', '7'], ['٨', '8'], ['٩', '9'],
  ['۰', '0'], ['۱', '1'], ['۲', '2'], ['۳', '3'], ['۴', '4'],
  ['۵', '5'], ['۶', '6'], ['۷', '7'], ['۸', '8'], ['۹', '9'],
])

export function normalizeDigits(value) {
  return [...String(value ?? '')].map((char) => DIGITS.get(char) ?? char).join('').trim()
}

export function classifyGtin(value) {
  const digits = normalizeDigits(value)
  if (!/^\d+$/.test(digits)) return { ok: false, reason: 'gtin_non_digits' }
  if (![8, 12, 13, 14].includes(digits.length)) return { ok: false, reason: 'gtin_length' }
  let sum = 0
  let weight = 3
  for (let index = digits.length - 2; index >= 0; index--) {
    sum += Number(digits[index]) * weight
    weight = weight === 3 ? 1 : 3
  }
  const expected = (10 - (sum % 10)) % 10
  if (expected !== Number(digits.at(-1))) return { ok: false, reason: 'gtin_checksum' }
  if (/^(\d)\1+$/.test(digits) || /^1234567(?:0|89012345)$/.test(digits)) {
    return { ok: false, reason: 'gtin_placeholder' }
  }
  return { ok: true, gtinAsSource: digits, gtin14: digits.padStart(14, '0') }
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value : null
}

function httpUrl(value) {
  if (!text(value)) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? value : null
  } catch {
    return null
  }
}

function unique(values) {
  return [...new Set(values)]
}

const REQUIRED_SOURCE_FIELDS = [
  'barcode', 'name_ar', 'name_en', 'brand_ar', 'category_ar', 'per_100g_or_100ml',
  'allergens_completeness', 'source_tier', 'confidence', 'source_off_url',
  'off_atwater_dev_pct', 'last_verified',
]

const CORE_NUTRIENTS = ['energy_kcal', 'protein_g', 'fat_g', 'carbohydrates_g']
const NUTRIENT_RENAME = { carbohydrates_g: 'carbs_g', sugars_g: 'sugar_g' }

function rawRef(row, index, inputSha) {
  return {
    input_fingerprint_sha256: inputSha,
    json_pointer: `/items/${index}`,
    raw_record_sha256: rawRecordSha(row),
    source_path: SOURCE_PATH,
  }
}

function rejection(row, index, inputSha, reasons) {
  const sourceUrls = row && typeof row === 'object' && !Array.isArray(row)
    ? unique([httpUrl(row.source_official_url), httpUrl(row.source_off_url)].filter(Boolean))
    : []
  return {
    gtin_as_source: text(row?.barcode),
    normalization_version: NORMALIZATION_VERSION,
    outcome: 'rejected',
    provenance: {
      batch: 'PKG-001',
      input_fingerprint_sha256: inputSha,
      source_id: 'qimmah_pkg_001',
      source_path: SOURCE_PATH,
      source_row_index: index,
      source_urls: sourceUrls,
    },
    raw_ref: rawRef(row, index, inputSha),
    reasons: unique(reasons).sort(),
    schema_version: SCHEMA_VERSION,
    source_index: index,
  }
}

function buildCanonical(row, index, gtin, inputSha, review) {
  const nutrition = row.per_100g_or_100ml
  const urls = unique([httpUrl(row.source_official_url), httpUrl(row.source_off_url)].filter(Boolean))
  const flags = [
    'allergens_unverified',
    'ingested_at_unset_deterministic_seed',
    'market_unverified',
    'nutrition_basis_unverified',
  ]
  if (text(row.package_size)) flags.push('package_size_unparsed')
  if (text(row.serving_size)) flags.push('serving_size_unparsed')
  if (review) flags.push('source_divergence_review')
  return {
    allergens: Array.isArray(row.allergens_ar) ? unique(row.allergens_ar.filter(text)) : null,
    allergens_completeness_raw: row.allergens_completeness,
    brand_ar: row.brand_ar,
    brand_en: null,
    carbs_g: nutrition.carbohydrates_g,
    category_ar: row.category_ar,
    confidence_label_raw: row.confidence,
    confidence_score: null,
    country: null,
    cross_source_max_divergence_pct_raw: row.cross_source_max_divergence_pct ?? null,
    energy_kcal: nutrition.energy_kcal,
    fat_g: nutrition.fat_g,
    fiber_g: nutrition.fiber_g ?? null,
    gtin: gtin.gtin14,
    gtin_as_source: gtin.gtinAsSource,
    image_url: null,
    ingested_at: null,
    ingredients: null,
    manufacturer: null,
    market: null,
    micronutrients: null,
    name_ar: row.name_ar,
    name_en: row.name_en,
    normalization_version: NORMALIZATION_VERSION,
    note_raw: row.note_ar ?? null,
    nutrition_basis: null,
    off_atwater_dev_pct_raw: row.off_atwater_dev_pct,
    package_size_text_raw: row.package_size ?? null,
    package_size_unit: null,
    package_size_value: null,
    product_id: `qimmah_pkg_001:${gtin.gtin14}`,
    protein_g: nutrition.protein_g,
    quality_flags: flags.sort(),
    raw_ref: rawRef(row, index, inputSha),
    saturated_fat_g: nutrition.saturated_fat_g ?? null,
    schema_version: SCHEMA_VERSION,
    serving_size_text_raw: row.serving_size ?? null,
    serving_size_value: null,
    serving_unit: null,
    servings_per_container: null,
    sodium_mg: nutrition.sodium_mg ?? null,
    source: {
      batch: 'PKG-001',
      input_fingerprint_sha256: inputSha,
      source_id: 'qimmah_pkg_001',
      source_path: SOURCE_PATH,
      source_record_id: `PKG-001:${gtin.gtinAsSource}`,
      source_row_index: index,
      source_urls: urls,
    },
    source_tier_raw: row.source_tier,
    source_updated_at: null,
    source_verified_on: row.last_verified,
    sugar_g: nutrition.sugars_g ?? null,
    transformations: ['carbohydrates_g_to_carbs_g', 'gtin_to_gtin14', 'source_urls_compacted'],
  }
}

function classifyRow(row, index, inputSha, seenGtin) {
  const reasons = []
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return { kind: 'rejected', value: rejection(row, index, inputSha, ['short_or_malformed_row']) }
  }
  const missing = REQUIRED_SOURCE_FIELDS.filter((key) => {
    const value = row[key]
    if (key === 'per_100g_or_100ml') return !value || typeof value !== 'object' || Array.isArray(value)
    if (key === 'off_atwater_dev_pct') return typeof value !== 'number' || !Number.isFinite(value)
    return text(value) === null
  })
  if (missing.length) reasons.push('short_or_malformed_row')

  const gtin = classifyGtin(row.barcode)
  if (!gtin.ok) reasons.push(gtin.reason)
  const urls = [httpUrl(row.source_official_url), httpUrl(row.source_off_url)].filter(Boolean)
  if (!urls.length) reasons.push('missing_provenance')

  const nutrition = row.per_100g_or_100ml
  if (nutrition && typeof nutrition === 'object' && !Array.isArray(nutrition)) {
    for (const field of CORE_NUTRIENTS) {
      if (typeof nutrition[field] !== 'number' || !Number.isFinite(nutrition[field])) {
        reasons.push(`missing_nutrient:${NUTRIENT_RENAME[field] ?? field}`)
      }
    }
    for (const [field, value] of Object.entries(nutrition)) {
      if (typeof value === 'number' && value < 0) reasons.push(`negative_nutrient:${NUTRIENT_RENAME[field] ?? field}`)
    }
  }
  if (gtin.ok && seenGtin.has(gtin.gtin14)) reasons.push('duplicate_valid_gtin')
  if (reasons.length) return { kind: 'rejected', value: rejection(row, index, inputSha, reasons) }

  seenGtin.add(gtin.gtin14)
  const review = row.source_tier === 'official+off_divergent' ||
    (typeof row.cross_source_max_divergence_pct === 'number' && row.cross_source_max_divergence_pct > 8)
  const record = buildCanonical(row, index, gtin, inputSha, review)
  return review
    ? { kind: 'review', value: { canonical_record: record, outcome: 'review', reasons: ['cross_source_divergence'], source_index: index } }
    : { kind: 'accepted', value: record }
}

function countFlags(records) {
  const counts = {}
  for (const record of records) {
    for (const flag of record.quality_flags) counts[flag] = (counts[flag] ?? 0) + 1
  }
  return sortDeep(counts)
}

export function buildSeed({ sourceObject, sourceBytes, declaredFingerprint = null, baselineCommit = BASELINE_COMMIT }) {
  const parsedBytes = JSON.parse(sourceBytes.toString('utf8'))
  if (!isDeepStrictEqual(parsedBytes, sourceObject)) {
    const error = new Error('source_object_does_not_match_source_bytes')
    error.code = 'SOURCE_OBJECT_BYTES_MISMATCH'
    throw error
  }
  const inputSha = sha256(sourceBytes)
  if (declaredFingerprint !== null && declaredFingerprint !== inputSha) {
    const error = new Error(`input_fingerprint_mismatch:${declaredFingerprint}:${inputSha}`)
    error.code = 'INPUT_FINGERPRINT_MISMATCH'
    throw error
  }
  if (!Array.isArray(sourceObject.items)) throw new Error('source_items_not_array')

  const accepted = []
  const rejected = []
  const review = []
  const seenGtin = new Set()
  sourceObject.items.forEach((row, index) => {
    const terminal = classifyRow(row, index, inputSha, seenGtin)
    if (terminal.kind === 'accepted') accepted.push(terminal.value)
    else if (terminal.kind === 'review') review.push(terminal.value)
    else rejected.push(terminal.value)
  })
  accepted.sort((a, b) => a.gtin.localeCompare(b.gtin))
  review.sort((a, b) => a.canonical_record.gtin.localeCompare(b.canonical_record.gtin))
  rejected.sort((a, b) => a.source_index - b.source_index)
  const canonicalRecords = [...accepted, ...review.map((entry) => entry.canonical_record)]
  const rawRows = sourceObject.items.length
  const terminalOutcomes = accepted.length + rejected.length + review.length
  const artifactIdentity = {
    baseline_commit: baselineCommit,
    schema_path: SCHEMA_PATH,
    source_path: SOURCE_PATH,
  }

  const sourceEnvelope = {
    ...artifactIdentity,
    batch: sourceObject.batch ?? null,
    envelope_version: '1.0.0',
    input_fingerprint_sha256: inputSha,
    input_size_bytes: sourceBytes.length,
    licence_status: 'REVIEW_REQUIRED_ODBL_REFERENCES_PRESENT',
    non_ingested_sections: [
      '/needs_field_verification/rejected_entries',
      '/needs_field_verification/category_gaps_ar',
    ],
    non_ingested_sections_reason: 'Reference audit sections are not candidate rows; the candidate collection is /items only.',
    odbl_distribution_approved: false,
    pipeline_version: PIPELINE_VERSION,
    produced_on_raw: sourceObject.produced_on ?? null,
    release_status: RELEASE_STATUS,
    source_collection_count: rawRows,
    source_collection_pointer: '/items',
    source_id: 'qimmah_pkg_001',
  }

  const report = {
    ...artifactIdentity,
    accepted_unique: accepted.length,
    duplicate_valid_gtin_rows: rejected.filter((entry) => entry.reasons.includes('duplicate_valid_gtin')).length,
    input_fingerprint_sha256: inputSha,
    malformed_short_rows: rejected.filter((entry) => entry.reasons.includes('short_or_malformed_row')).length,
    missing_provenance_rows: rejected.filter((entry) => entry.reasons.includes('missing_provenance')).length,
    negative_nutrient_rows: rejected.filter((entry) => entry.reasons.some((reason) => reason.startsWith('negative_nutrient:'))).length,
    normalization_version: NORMALIZATION_VERSION,
    pipeline_version: PIPELINE_VERSION,
    quality_flag_counts: countFlags(canonicalRecords),
    raw_source_rows: rawRows,
    rejected_unique: rejected.length,
    rejection_reason_counts: sortDeep(rejected.flatMap((entry) => entry.reasons).reduce((acc, reason) => {
      acc[reason] = (acc[reason] ?? 0) + 1
      return acc
    }, {})),
    release_status: RELEASE_STATUS,
    review_unique: review.length,
    schema_version: SCHEMA_VERSION,
    terminal_balance: terminalOutcomes === rawRows,
    terminal_outcomes: terminalOutcomes,
    valid_unique_gtin: canonicalRecords.length,
  }

  return {
    acceptedArtifact: {
      ...artifactIdentity,
      artifact_version: '1.0.0',
      count: accepted.length,
      normalization_version: NORMALIZATION_VERSION,
      records: accepted,
      release_status: RELEASE_STATUS,
      schema_version: SCHEMA_VERSION,
    },
    rejectedArtifact: {
      ...artifactIdentity,
      artifact_version: '1.0.0',
      count: rejected.length,
      normalization_version: NORMALIZATION_VERSION,
      records: rejected,
      release_status: RELEASE_STATUS,
      schema_version: SCHEMA_VERSION,
    },
    report,
    reviewArtifact: {
      ...artifactIdentity,
      artifact_version: '1.0.0',
      count: review.length,
      normalization_version: NORMALIZATION_VERSION,
      records: review,
      release_status: RELEASE_STATUS,
      schema_version: SCHEMA_VERSION,
    },
    sourceEnvelope,
  }
}
