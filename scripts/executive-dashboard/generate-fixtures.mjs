#!/usr/bin/env node

import {
  computeSourceFingerprint,
  generateFixtureBundle,
  loadFixtureSources,
  stableStringify,
  validateFixtureBundle,
  validateSourceIntegrity,
} from './lib/contract-fixtures.mjs'

const mode = process.argv[2]
const allowedModes = new Set(['--check', '--integrity', '--print'])

if (!allowedModes.has(mode)) {
  console.error('Usage: node scripts/executive-dashboard/generate-fixtures.mjs --check|--integrity|--print')
  process.exit(2)
}

const sources = await loadFixtureSources({ verifyIntegrity: false })
if (mode !== '--integrity') validateSourceIntegrity(sources)
const first = generateFixtureBundle(sources)

if (mode === '--integrity') {
  console.log(
    stableStringify({
      sourceFingerprint: computeSourceFingerprint(sources),
      bundleFingerprint: first.bundleFingerprint,
    }).trimEnd(),
  )
  process.exit(0)
}

if (mode === '--print') {
  validateFixtureBundle(first, sources)
  process.stdout.write(stableStringify(first))
  process.exit(0)
}

const second = generateFixtureBundle(sources)
if (stableStringify(first) !== stableStringify(second)) {
  throw new Error('NONDETERMINISTIC_GENERATION: two generations from the same source differ')
}

const result = validateFixtureBundle(first, sources)
console.log('Executive dashboard contract fixtures: deterministic --check PASS')
console.log(`  schema: ${result.schemaVersion}`)
console.log(`  contract: ${result.contractVersion}`)
console.log(`  source: ${result.sourceFingerprint}`)
console.log(`  bundle: ${result.bundleFingerprint}`)
console.log(
  `  fixtures: ${result.scenarios} states, ${result.metricCases} metric datums, ` +
    `${result.chartCases} charts, ${result.userCases} users, ${result.attentionCases} attention states`,
)
