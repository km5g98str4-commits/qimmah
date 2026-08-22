import { readFileSync } from 'node:fs'
import { LIBRARY_AUDIT_PATH, validateLibraryAudit } from './library-audit-lib.mjs'

const audit = JSON.parse(readFileSync(LIBRARY_AUDIT_PATH, 'utf8'))
const result = await validateLibraryAudit(audit)
console.log(JSON.stringify(result.computedSummary, null, 2))
if (result.issues.length) {
  for (const found of result.issues) console.error(`${found.code}: ${found.message}`)
  process.exit(1)
}
console.log('EXERCISE_LIBRARY_AUDIT: PASS')
