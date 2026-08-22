#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import {
  SCHEMA_PATH,
  SOURCE_PATH,
  buildSeed,
  classifyGtin,
  jsonBytes,
  normalizeDigits,
  rawRecordSha,
  sha256,
} from './lib/canonical-food-v1.mjs'
import { assertSupportedSchema, validateJsonSchema } from './lib/json-schema.mjs'
import { validateArtifactPathManifest, validateHardeningCore } from './lib/pkg-001-validation.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourceBytes = readFileSync(resolve(ROOT, SOURCE_PATH))
const source = JSON.parse(sourceBytes.toString('utf8'))
const schemaBytes = readFileSync(resolve(ROOT, SCHEMA_PATH))
const schema = JSON.parse(schemaBytes.toString('utf8'))
assertSupportedSchema(schema)

const checks = []
function check(label, condition, detail = '') {
  checks.push({ label, pass: Boolean(condition), detail })
}
function clone(value) {
  return structuredClone(value)
}
function bytesFor(value) {
  return Buffer.from(JSON.stringify(value))
}
function buildMutation(mutated) {
  return buildSeed({ sourceObject: mutated, sourceBytes: bytesFor(mutated) })
}
function findReason(built, reason) {
  return built.rejectedArtifact.records.some((entry) => entry.reasons.includes(reason))
}
function loadArtifact(path) {
  return JSON.parse(readFileSync(resolve(ROOT, 'data/food-production', path), 'utf8'))
}
function hardeningMutation(label, expectedCode, mutate, baselineInputs) {
  const mutated = clone(baselineInputs)
  mutate(mutated)
  let codes = []
  try {
    codes = validateHardeningCore(mutated).map((failure) => failure.code)
  } catch (error) {
    check(label, false, `unexpected_exception:${error.name}:${error.message}`)
    return
  }
  check(label, codes.includes(expectedCode), `expected=${expectedCode} actual=${codes.join(',')}`)
}
function encodeDigits(value, digits) {
  return [...value].map((digit) => digits[Number(digit)]).join('')
}
function validateArabicGtinAsciiGate(asciiGtin, normalizer = normalizeDigits) {
  const variants = [
    ['arabic_indic', encodeDigits(asciiGtin, '٠١٢٣٤٥٦٧٨٩')],
    ['eastern_arabic', encodeDigits(asciiGtin, '۰۱۲۳۴۵۶۷۸۹')],
  ]
  const failures = []
  for (const [variant, encoded] of variants) {
    let normalized
    try {
      normalized = normalizer(encoded)
    } catch (error) {
      failures.push({ code: 'GTIN_ARABIC_ASCII_DRIFT', detail: `${variant}:unexpected_exception:${error.name}` })
      continue
    }
    if (normalized !== asciiGtin || !/^[0-9]+$/.test(normalized)) {
      failures.push({ code: 'GTIN_ARABIC_ASCII_DRIFT', detail: `${variant}:${JSON.stringify(normalized)}` })
    }
  }
  return failures
}

const baseline = buildSeed({ sourceObject: source, sourceBytes })
const baselineCanonical = [
  ...baseline.acceptedArtifact.records,
  ...baseline.reviewArtifact.records.map((entry) => entry.canonical_record),
]

check('BASELINE: كل 55 صفًا له terminal outcome واحد', baseline.report.terminal_balance && baseline.report.terminal_outcomes === 55)
check('BASELINE: 51 accepted و4 review وصفر rejected', baseline.report.accepted_unique === 51 && baseline.report.review_unique === 4 && baseline.report.rejected_unique === 0)
check('BASELINE: كل CanonicalFoodV1 يمر المخطط', baselineCanonical.every((record) => validateJsonSchema(record, schema).length === 0))
check('BASELINE: كل raw ref يعيد بصمة صفه الحقيقي', baselineCanonical.every((record) => rawRecordSha(source.items[record.source.source_row_index]) === record.raw_ref.raw_record_sha256))
check('BASELINE: إعادة البناء في الذاكرة byte-for-byte', isDeepStrictEqual(jsonBytes(baseline), jsonBytes(buildSeed({ sourceObject: source, sourceBytes }))))

const gtinMutation = clone(source)
const originalGtin = gtinMutation.items[0].barcode
gtinMutation.items[0].barcode = `${originalGtin.slice(0, -1)}${(Number(originalGtin.at(-1)) + 1) % 10}`
const gtinBuilt = buildMutation(gtinMutation)
check('MUTATION GTIN/CHECK-DIGIT: الكود المكسور يُرفض باسم gtin_checksum', findReason(gtinBuilt, 'gtin_checksum'))
check('MUTATION GTIN/CHECK-DIGIT: الكود الأصلي صالح قبل الطفرة', classifyGtin(originalGtin).ok)

const arabicGtinBuilds = ['٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹'].map((digits) => {
  const mutation = clone(source)
  mutation.items[0].barcode = encodeDigits(originalGtin, digits)
  return buildMutation(mutation)
})
check('GTIN ARABIC→ASCII: الرقمان العربي والهندي يخرجان gtin_as_source وGTIN-14 من ASCII',
  arabicGtinBuilds.every((built) => built.acceptedArtifact.records.some((record) =>
    record.gtin_as_source === originalGtin && record.gtin === originalGtin.padStart(14, '0'))))
const arabicBypassFailures = validateArabicGtinAsciiGate(originalGtin, (value) => String(value))
check('COUNTER-MUTATION GTIN_ARABIC_ASCII_DRIFT: normalizer الذي يترك الرقم العربي يسقط باسمه',
  arabicBypassFailures.length === 2 && arabicBypassFailures.every((failure) => failure.code === 'GTIN_ARABIC_ASCII_DRIFT'),
  `codes=${arabicBypassFailures.map((failure) => failure.code).join(',')}`)

const duplicateMutation = clone(source)
duplicateMutation.items.push(clone(duplicateMutation.items[0]))
const duplicateBuilt = buildMutation(duplicateMutation)
check('MUTATION DUPLICATE VALID GTIN: الصف الثاني يُرفض ولا يُدمج صامتًا', findReason(duplicateBuilt, 'duplicate_valid_gtin') && duplicateBuilt.report.duplicate_valid_gtin_rows === 1)
check('MUTATION DUPLICATE VALID GTIN: المحاسبة تبقى 56/56', duplicateBuilt.report.terminal_balance && duplicateBuilt.report.terminal_outcomes === 56)

const provenanceMutation = clone(source)
provenanceMutation.items[0].source_official_url = null
provenanceMutation.items[0].source_off_url = null
const provenanceBuilt = buildMutation(provenanceMutation)
check('MUTATION MISSING PROVENANCE: غياب كل الروابط يُرفض باسم missing_provenance', findReason(provenanceBuilt, 'missing_provenance'))

const negativeMutation = clone(source)
negativeMutation.items[0].per_100g_or_100ml.protein_g = -1
const negativeBuilt = buildMutation(negativeMutation)
check('MUTATION NEGATIVE NUTRIENT: البروتين السالب يُرفض باسم الحقل', findReason(negativeBuilt, 'negative_nutrient:protein_g') && negativeBuilt.report.negative_nutrient_rows === 1)

const shortMutation = clone(source)
shortMutation.items.push({ barcode: source.items[0].barcode })
const shortBuilt = buildMutation(shortMutation)
check('MUTATION SHORT/MALFORMED: الصف القصير يُعد ولا يسقط صامتًا', findReason(shortBuilt, 'short_or_malformed_row') && shortBuilt.report.malformed_short_rows === 1)
check('MUTATION SHORT/MALFORMED: معادلة terminal outcomes تبقى 56/56', shortBuilt.report.terminal_balance && shortBuilt.report.terminal_outcomes === 56)
check('MUTATION SHORT/MALFORMED: المرفوض يحفظ provenance وraw ref ونسخ العقد', shortBuilt.rejectedArtifact.records.every((entry) => entry.raw_ref && entry.provenance && entry.normalization_version === '1.0.0' && entry.schema_version === '1.0.0'))

const driftedSchema = clone(schema)
driftedSchema.required.push('__schema_drift_required')
const driftErrors = validateJsonSchema(baselineCanonical[0], driftedSchema)
check('MUTATION SCHEMA DRIFT: حقل required زائد يسقط باسم required', driftErrors.some((error) => error.code === 'required' && error.path.endsWith('__schema_drift_required')))

let fingerprintFailure = null
try {
  buildSeed({ sourceObject: source, sourceBytes, declaredFingerprint: '0'.repeat(64) })
} catch (error) {
  fingerprintFailure = error
}
check('MUTATION INPUT FINGERPRINT: البصمة المختلفة توقف البناء باسمها', fingerprintFailure?.code === 'INPUT_FINGERPRINT_MISMATCH')

const distinctMutation = clone(source)
const first = distinctMutation.items.findIndex((item) => item.source_tier !== 'official+off_divergent')
const second = distinctMutation.items.findIndex((item, index) => index > first && item.source_tier !== 'official+off_divergent')
const firstGtin = distinctMutation.items[first].barcode
const secondGtin = distinctMutation.items[second].barcode
for (const field of ['name_ar', 'name_en', 'brand_ar', 'category_ar', 'package_size', 'serving_size']) {
  distinctMutation.items[second][field] = distinctMutation.items[first][field]
}
const distinctBuilt = buildMutation(distinctMutation)
const acceptedSourceGtins = new Set(distinctBuilt.acceptedArtifact.records.map((record) => record.gtin_as_source))
check('MUTATION DISTINCT VALID GTINS: اسمان متطابقان وGTINان صالحان يبقيان سجلين', acceptedSourceGtins.has(firstGtin) && acceptedSourceGtins.has(secondGtin) && distinctBuilt.report.accepted_unique === 51)
check('MUTATION DISTINCT VALID GTINS: لا duplicate/reject زائف', distinctBuilt.report.duplicate_valid_gtin_rows === 0 && distinctBuilt.report.rejected_unique === 0)

const hardeningInputs = {
  accepted: loadArtifact('accepted/pkg-001.json'),
  inputSha: sha256(sourceBytes),
  manifest: loadArtifact('manifests/pkg-001-build.json'),
  outputRoot: resolve(ROOT, 'data/food-production'),
  rejected: loadArtifact('rejected/pkg-001.json'),
  report: loadArtifact('reports/pkg-001-build.json'),
  review: loadArtifact('review/pkg-001.json'),
  schemaSha: sha256(schemaBytes),
  sourceEnvelope: loadArtifact('manifests/pkg-001-source.json'),
}
check('HARDENING BASELINE: هوية البناء والمسارات والحالات والأعداد صحيحة', validateHardeningCore(hardeningInputs).length === 0)
hardeningMutation('COUNTER-MUTATION BUILD_ID_DRIFT: تغيير build_id يسقط باسمه', 'BUILD_ID_DRIFT', (value) => {
  value.manifest.build_id = '0'.repeat(64)
}, hardeningInputs)
const pathAttacks = [
  '/tmp/qimmah-escape.json',
  'accepted\\pkg-001.json',
  'accepted/\0pkg-001.json',
  'accepted/../pkg-001.json',
  '../qimmah-escape.json',
]
let pathAttackPass = true
let pathAttackDetail = ''
try {
  for (const attack of pathAttacks) {
    const mutated = clone(hardeningInputs)
    mutated.manifest.artifacts[0].path = attack
    const result = validateArtifactPathManifest(mutated.manifest, mutated.outputRoot)
    if (!result.failures.some((failure) => failure.code === 'ARTIFACT_PATH_SCOPE') || result.resolvedPaths.size !== 0) {
      pathAttackPass = false
      pathAttackDetail = `attack=${JSON.stringify(attack)} codes=${result.failures.map((failure) => failure.code).join(',')} resolved=${result.resolvedPaths.size}`
      break
    }
  }
} catch (error) {
  pathAttackPass = false
  pathAttackDetail = `unexpected_exception:${error.name}:${error.message}`
}
check('COUNTER-MUTATION ARTIFACT_PATH_SCOPE: absolute/backslash/NUL/dot/resolved escape تسقط قبل القراءة', pathAttackPass, pathAttackDetail)
hardeningMutation('COUNTER-MUTATION ARTIFACT_SET_DRIFT: حذف أثر من الخمسة يسقط باسمه', 'ARTIFACT_SET_DRIFT', (value) => {
  value.manifest.artifacts.pop()
}, hardeningInputs)
hardeningMutation('COUNTER-MUTATION RELEASE_STATUS_DRIFT: تغيير حالة أثر يسقط باسمه', 'RELEASE_STATUS_DRIFT', (value) => {
  value.accepted.release_status = 'UNQUARANTINED'
}, hardeningInputs)
hardeningMutation('COUNTER-MUTATION BASELINE_IDENTITY_DRIFT: تغيير أساس envelope يسقط باسمه', 'BASELINE_IDENTITY_DRIFT', (value) => {
  value.sourceEnvelope.baseline_commit = '0'.repeat(40)
}, hardeningInputs)
hardeningMutation('COUNTER-MUTATION ARTIFACT_COUNT_DRIFT: فصل count عن records يسقط باسمه', 'ARTIFACT_COUNT_DRIFT', (value) => {
  value.review.count += 1
}, hardeningInputs)

console.log('════════ DATA-1A seed proof ════════')
let failed = 0
for (const item of checks) {
  console.log(`${item.pass ? '✓' : '✗'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`)
  if (!item.pass) failed++
}
console.log(`\n${failed ? '❌' : '✅'} ${checks.length - failed}/${checks.length} checks passed`)
process.exit(failed ? 1 : 0)
