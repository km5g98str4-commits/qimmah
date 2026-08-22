import { readFileSync } from 'node:fs'
import { JOBS_PATH, validateImageProductionJobs } from './image-production-jobs-lib.mjs'

const jobs = JSON.parse(readFileSync(JOBS_PATH, 'utf8'))
const result = validateImageProductionJobs(jobs)
console.log(JSON.stringify(result.computedSummary, null, 2))
if (result.issues.length) {
  for (const found of result.issues) console.error(`${found.code}: ${found.message}`)
  process.exit(1)
}
console.log(`IMAGE_PRODUCTION_JOBS: PASS (${result.expectedMissingIds.length}/${result.expectedMissingIds.length})`)
