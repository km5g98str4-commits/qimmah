#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContractFixture, serializeEvidence } from './evidence-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const path = resolve(ROOT, 'data/phase-ii-release/evidence-contract-fixture.json')
const bytes = serializeEvidence(buildContractFixture())
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== bytes) {
    console.error('EVIDENCE_FIXTURE_REPRODUCIBILITY: committed fixture differs from deterministic build')
    process.exit(1)
  }
  console.log('EVIDENCE_FIXTURE_REPRODUCIBILITY: PASS (byte-for-byte)')
} else {
  writeFileSync(path, bytes)
  console.log(`EVIDENCE_FIXTURE_WRITTEN: ${path}`)
}
