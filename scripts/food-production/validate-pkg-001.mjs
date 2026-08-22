#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SCHEMA_PATH,
  SOURCE_PATH,
  SOURCE_SHA256,
  PIPELINE_VERSION,
  classifyGtin,
  rawRecordSha,
  sha256,
} from './lib/canonical-food-v1.mjs'
import { assertSupportedSchema, validateJsonSchema } from './lib/json-schema.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const outputRoot = resolve(ROOT, arg('--root', 'data/food-production'))
const sourcePath = resolve(ROOT, arg('--source', SOURCE_PATH))
const failures = []
const check = (code, condition, detail = '') => {
  if (!condition) failures.push({ code, detail })
}
const load = (path) => JSON.parse(readFileSync(path, 'utf8'))

const manifestPath = resolve(outputRoot, 'manifests/pkg-001-build.json')
check('manifest_exists', existsSync(manifestPath), manifestPath)
if (!existsSync(manifestPath)) {
  console.error(JSON.stringify({ failures }, null, 2))
  process.exit(1)
}
const manifest = load(manifestPath)
const schemaBytes = readFileSync(resolve(ROOT, SCHEMA_PATH))
const schema = JSON.parse(schemaBytes.toString('utf8'))
assertSupportedSchema(schema)
check('schema_checksum', sha256(schemaBytes) === manifest.schema.sha256)

const artifacts = new Map()
for (const entry of manifest.artifacts) {
  const path = resolve(outputRoot, entry.path)
  check('artifact_exists', existsSync(path), entry.path)
  if (!existsSync(path)) continue
  const bytes = readFileSync(path)
  check('artifact_checksum', sha256(bytes) === entry.sha256, entry.path)
  check('artifact_bytes', bytes.length === entry.bytes, entry.path)
  const parsed = JSON.parse(bytes.toString('utf8'))
  if (entry.count !== null) check('artifact_count', parsed.count === entry.count || parsed.raw_source_rows === entry.count || parsed.source_collection_count === entry.count, entry.path)
  artifacts.set(entry.path, parsed)
}

const sourceBytes = readFileSync(sourcePath)
const sourceObject = JSON.parse(sourceBytes.toString('utf8'))
const inputSha = sha256(sourceBytes)
const sourceEnvelope = artifacts.get('manifests/pkg-001-source.json')
const accepted = artifacts.get('accepted/pkg-001.json')
const rejected = artifacts.get('rejected/pkg-001.json')
const review = artifacts.get('review/pkg-001.json')
const report = artifacts.get('reports/pkg-001-build.json')
check('required_artifacts_loaded', Boolean(sourceEnvelope && accepted && rejected && review && report))

if (sourceEnvelope && accepted && rejected && review && report) {
  check('input_fingerprint', inputSha === sourceEnvelope.input_fingerprint_sha256)
  check('input_fingerprint_manifest', inputSha === manifest.source.input_fingerprint_sha256)
  check('input_fingerprint_pinned', inputSha === SOURCE_SHA256)
  check('input_size', sourceBytes.length === sourceEnvelope.input_size_bytes)
  check('source_collection_count', sourceObject.items.length === sourceEnvelope.source_collection_count)
  check('pipeline_version', sourceEnvelope.pipeline_version === PIPELINE_VERSION && manifest.pipeline_version === PIPELINE_VERSION && report.pipeline_version === PIPELINE_VERSION)
  check('licence_not_silently_approved', sourceEnvelope.odbl_distribution_approved === false)

  const acceptedRecords = accepted.records
  const reviewRecords = review.records.map((entry) => entry.canonical_record)
  const canonical = [...acceptedRecords, ...reviewRecords]
  let schemaViolationCount = 0
  for (const record of canonical) {
    schemaViolationCount += validateJsonSchema(record, schema).length
  }
  check('schema_full_ingest', schemaViolationCount === 0, String(schemaViolationCount))

  const gtins = canonical.map((record) => record.gtin)
  check('valid_unique_gtin', gtins.every((gtin) => classifyGtin(gtin).ok) && new Set(gtins).size === gtins.length)
  const nutrientFields = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'saturated_fat_g', 'sugar_g', 'fiber_g', 'sodium_mg']
  const negative = canonical.flatMap((record) => nutrientFields.filter((field) => typeof record[field] === 'number' && record[field] < 0).map((field) => `${record.gtin}:${field}`))
  check('negative_nutrients_absent', negative.length === 0, negative.join(','))

  const sourceIndexes = [
    ...acceptedRecords.map((record) => record.source.source_row_index),
    ...review.records.map((entry) => entry.source_index),
    ...rejected.records.map((entry) => entry.source_index),
  ].sort((a, b) => a - b)
  const expectedIndexes = sourceObject.items.map((_, index) => index)
  check('terminal_row_accounting', JSON.stringify(sourceIndexes) === JSON.stringify(expectedIndexes))
  check('terminal_count_balance', accepted.count + rejected.count + review.count === sourceObject.items.length)

  for (const record of canonical) {
    const index = record.source.source_row_index
    const raw = sourceObject.items[index]
    check('raw_pointer', record.raw_ref.json_pointer === `/items/${index}`, record.product_id)
    check('raw_record_checksum', record.raw_ref.raw_record_sha256 === rawRecordSha(raw), record.product_id)
    check('raw_input_fingerprint', record.raw_ref.input_fingerprint_sha256 === inputSha, record.product_id)
    check('provenance_input_fingerprint', record.source.input_fingerprint_sha256 === inputSha, record.product_id)
  }
  for (const entry of rejected.records) {
    const raw = sourceObject.items[entry.source_index]
    check('rejected_raw_checksum', entry.raw_ref.raw_record_sha256 === rawRecordSha(raw), String(entry.source_index))
    check('rejected_provenance_fingerprint', entry.provenance.input_fingerprint_sha256 === inputSha, String(entry.source_index))
    check('rejected_versions', entry.normalization_version === manifest.normalization_version && entry.schema_version === manifest.schema.schema_version, String(entry.source_index))
  }

  check('report_raw_rows', report.raw_source_rows === sourceObject.items.length)
  check('report_accepted', report.accepted_unique === accepted.count)
  check('report_rejected_unique', report.rejected_unique === rejected.count)
  check('report_review', report.review_unique === review.count)
  check('report_terminal_balance', report.terminal_balance === true && report.terminal_outcomes === sourceObject.items.length)
  check('manifest_totals', manifest.totals.accepted_unique === accepted.count && manifest.totals.rejected_unique === rejected.count && manifest.totals.review_unique === review.count)
  check('artifact_versions', [accepted, rejected, review].every((artifact) => artifact.normalization_version === manifest.normalization_version && artifact.schema_version === manifest.schema.schema_version))
  check('review_not_accepted', review.records.every((entry) => entry.reasons.includes('cross_source_divergence') && entry.canonical_record.quality_flags.includes('source_divergence_review')))
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failure_count: failures.length, failures }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({
  accepted: accepted.count,
  artifacts_verified: manifest.artifacts.length,
  input_sha256: inputSha,
  raw_source_rows: sourceObject.items.length,
  rejected: rejected.count,
  review: review.count,
  schema_validated: accepted.count + review.count,
  status: 'PASS',
}, null, 2))
