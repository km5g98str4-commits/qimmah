import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildLedger, LEDGER_PATH, serializeLedger } from './ledger-lib.mjs'

const generated = serializeLedger(await buildLedger())
if (process.argv.includes('--check')) {
  const committed = readFileSync(LEDGER_PATH, 'utf8')
  if (committed !== generated) {
    console.error('LEDGER_REPRODUCIBILITY: committed review ledger differs from deterministic generation')
    process.exit(1)
  }
  console.log('LEDGER_REPRODUCIBILITY: PASS (byte-for-byte)')
  process.exit(0)
}

mkdirSync(dirname(LEDGER_PATH), { recursive: true })
writeFileSync(LEDGER_PATH, generated)
console.log(`WROTE ${LEDGER_PATH}`)
