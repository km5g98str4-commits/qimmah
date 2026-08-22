import { readFileSync, writeFileSync } from 'node:fs'
import { buildLibraryAudit, LIBRARY_AUDIT_PATH, serializeLibraryAudit } from './library-audit-lib.mjs'

const generated = serializeLibraryAudit(await buildLibraryAudit())
if (process.argv.includes('--check')) {
  if (readFileSync(LIBRARY_AUDIT_PATH, 'utf8') !== generated) {
    console.error('LIBRARY_AUDIT_REPRODUCIBILITY: committed audit differs from deterministic generation')
    process.exit(1)
  }
  console.log('LIBRARY_AUDIT_REPRODUCIBILITY: PASS (byte-for-byte)')
  process.exit(0)
}

writeFileSync(LIBRARY_AUDIT_PATH, generated)
console.log(`WROTE ${LIBRARY_AUDIT_PATH}`)
