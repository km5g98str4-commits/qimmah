import { readFileSync } from 'node:fs'
import { LEDGER_PATH, validateLedger } from './ledger-lib.mjs'

const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
const result = await validateLedger(ledger)

console.log(JSON.stringify({ summary: result.computedSummary, duplicateContentGroups: result.duplicateContentGroups }, null, 2))
if (result.issues.length) {
  for (const found of result.issues) console.error(`${found.code}: ${found.message}`)
  process.exit(1)
}
console.log('EXERCISE_PRODUCTION_LEDGER: PASS')
