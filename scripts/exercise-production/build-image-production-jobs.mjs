import { readFileSync, writeFileSync } from 'node:fs'
import { buildImageProductionJobs, JOBS_PATH, serializeImageProductionJobs } from './image-production-jobs-lib.mjs'

const generated = serializeImageProductionJobs(buildImageProductionJobs())
if (process.argv.includes('--check')) {
  if (readFileSync(JOBS_PATH, 'utf8') !== generated) {
    console.error('IMAGE_JOB_REPRODUCIBILITY: committed jobs differ from deterministic ledger-only generation')
    process.exit(1)
  }
  console.log('IMAGE_JOB_REPRODUCIBILITY: PASS (byte-for-byte)')
  process.exit(0)
}

writeFileSync(JOBS_PATH, generated)
console.log(`WROTE ${JOBS_PATH}`)
