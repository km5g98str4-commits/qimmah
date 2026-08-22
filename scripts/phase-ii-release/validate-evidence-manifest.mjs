#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateEvidenceManifest } from './evidence-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const input = resolve(ROOT, process.argv[2] ?? 'data/phase-ii-release/evidence-contract-fixture.json')
const manifest = JSON.parse(readFileSync(input, 'utf8'))
const issues = validateEvidenceManifest(manifest)
if (issues.length) {
  console.error(JSON.stringify({ status: 'FAIL', issues }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ status: 'PASS', sourceMode: manifest.sourceMode, records: manifest.records.length, verdicts: Object.keys(manifest.verdicts).length }, null, 2))
