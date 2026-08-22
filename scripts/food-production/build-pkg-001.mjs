#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BASELINE_COMMIT,
  NORMALIZATION_VERSION,
  PIPELINE_VERSION,
  RELEASE_STATUS,
  SCHEMA_PATH,
  SCHEMA_VERSION,
  SOURCE_PATH,
  SOURCE_SHA256,
  buildSeed,
  jsonBytes,
  sha256,
} from './lib/canonical-food-v1.mjs'
import { assertSupportedSchema, validateJsonSchema } from './lib/json-schema.mjs'
import { computeBuildId } from './lib/pkg-001-validation.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const sourcePath = resolve(ROOT, arg('--source', SOURCE_PATH))
const outputRoot = resolve(ROOT, arg('--out-root', 'data/food-production'))
const sourceBytes = readFileSync(sourcePath)
const sourceObject = JSON.parse(sourceBytes.toString('utf8'))
const schemaPath = resolve(ROOT, SCHEMA_PATH)
const schemaBytes = readFileSync(schemaPath)
const schema = JSON.parse(schemaBytes.toString('utf8'))
assertSupportedSchema(schema)

const built = buildSeed({
  sourceObject,
  sourceBytes,
  baselineCommit: BASELINE_COMMIT,
  declaredFingerprint: SOURCE_SHA256,
})
const canonicalRecords = [
  ...built.acceptedArtifact.records,
  ...built.reviewArtifact.records.map((entry) => entry.canonical_record),
]
const schemaFailures = canonicalRecords.flatMap((record) => validateJsonSchema(record, schema))
if (schemaFailures.length) {
  console.error(JSON.stringify({ error: 'canonical_schema_validation_failed', failures: schemaFailures.slice(0, 20) }, null, 2))
  process.exit(1)
}

const written = []
function writeArtifact(relPath, value, count = null) {
  const bytes = jsonBytes(value)
  const path = resolve(outputRoot, relPath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
  written.push({
    bytes: bytes.length,
    count,
    path: relPath,
    sha256: sha256(bytes),
  })
}

writeArtifact('manifests/pkg-001-source.json', built.sourceEnvelope, built.sourceEnvelope.source_collection_count)
writeArtifact('accepted/pkg-001.json', built.acceptedArtifact, built.acceptedArtifact.count)
writeArtifact('rejected/pkg-001.json', built.rejectedArtifact, built.rejectedArtifact.count)
writeArtifact('review/pkg-001.json', built.reviewArtifact, built.reviewArtifact.count)
writeArtifact('reports/pkg-001-build.json', built.report, built.report.raw_source_rows)

const schemaSha = sha256(schemaBytes)
const manifest = {
  artifact_root: 'data/food-production',
  artifacts: written.sort((a, b) => a.path.localeCompare(b.path)),
  baseline_commit: BASELINE_COMMIT,
  build_id: computeBuildId(built.sourceEnvelope.input_fingerprint_sha256, schemaSha),
  manifest_version: '1.0.0',
  normalization_version: NORMALIZATION_VERSION,
  pipeline_version: PIPELINE_VERSION,
  release_status: RELEASE_STATUS,
  schema: {
    path: SCHEMA_PATH,
    schema_version: SCHEMA_VERSION,
    sha256: schemaSha,
  },
  source: {
    input_fingerprint_sha256: built.sourceEnvelope.input_fingerprint_sha256,
    input_size_bytes: built.sourceEnvelope.input_size_bytes,
    path: SOURCE_PATH,
  },
  totals: {
    accepted_unique: built.report.accepted_unique,
    raw_source_rows: built.report.raw_source_rows,
    rejected_unique: built.report.rejected_unique,
    review_unique: built.report.review_unique,
    terminal_outcomes: built.report.terminal_outcomes,
    valid_unique_gtin: built.report.valid_unique_gtin,
  },
}
const manifestBytes = jsonBytes(manifest)
const manifestPath = resolve(outputRoot, 'manifests/pkg-001-build.json')
mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(manifestPath, manifestBytes)

console.log(JSON.stringify({
  accepted: built.report.accepted_unique,
  build_id: manifest.build_id,
  input_sha256: built.sourceEnvelope.input_fingerprint_sha256,
  manifest_sha256: sha256(manifestBytes),
  output_root: outputRoot,
  rejected: built.report.rejected_unique,
  review: built.report.review_unique,
  schema_validated: canonicalRecords.length,
  terminal_balance: built.report.terminal_balance,
}, null, 2))
