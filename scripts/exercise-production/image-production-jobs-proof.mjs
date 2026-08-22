import { readFileSync } from 'node:fs'
import { JOBS_PATH, validateImageProductionJobs } from './image-production-jobs-lib.mjs'

const original = JSON.parse(readFileSync(JOBS_PATH, 'utf8'))
const clone = () => structuredClone(original)

function refreshSummary(candidate) {
  candidate.summary = {
    jobs: candidate.jobs.length,
    blockedNeedsReviewedMechanics: candidate.jobs.filter((job) => job.promptStatus === 'BLOCKED_NEEDS_REVIEWED_MECHANICS').length,
    notGenerated: candidate.jobs.filter((job) => job.outputStatus === 'NOT_GENERATED').length,
  }
}

function expectNamedFailure(name, mutate, expectedCode) {
  const candidate = clone()
  mutate(candidate)
  refreshSummary(candidate)
  const result = validateImageProductionJobs(candidate)
  const codes = result.issues.map((found) => found.code)
  if (!codes.includes(expectedCode)) {
    throw new Error(`${name}: expected ${expectedCode}; got ${codes.join(', ') || 'no failure'}`)
  }
  console.log(`${name}: PASS -> ${expectedCode}`)
}

const base = validateImageProductionJobs(original)
if (base.issues.length) throw new Error(`BASE_IMAGE_JOBS: ${base.issues.map((found) => found.code).join(', ')}`)
if (original.jobs.length !== 37 || base.expectedMissingIds.length !== 37) {
  throw new Error(`IMAGE_JOB_BASELINE: expected 37/37; got ${original.jobs.length}/${base.expectedMissingIds.length}`)
}
console.log('BASE_IMAGE_JOBS: PASS -> 37/37')

expectNamedFailure('MUTATION_SCHEMA_VERSION', (candidate) => {
  candidate.version = 2
}, 'IMAGE_JOB_SCHEMA')

expectNamedFailure('MUTATION_JOB_COVERAGE', (candidate) => {
  candidate.jobs.pop()
}, 'IMAGE_JOB_COVERAGE')

expectNamedFailure('MUTATION_LEDGER_BINDING', (candidate) => {
  candidate.jobs[0].sourceFingerprint = '0'.repeat(64)
}, 'IMAGE_JOB_LEDGER_BINDING')

expectNamedFailure('MUTATION_METADATA_INVENTION', (candidate) => {
  candidate.jobs[0].metadata.names.en = 'Invented exercise name'
}, 'IMAGE_JOB_METADATA_PROVENANCE')

expectNamedFailure('MUTATION_GUESSED_START_END', (candidate) => {
  candidate.jobs[0].requiredAuthoring.startPositionDescription.en = 'Invented start position'
}, 'IMAGE_JOB_MECHANICS_REQUIRED')

expectNamedFailure('MUTATION_GUESSED_SAFETY', (candidate) => {
  candidate.jobs[0].requiredAuthoring.safeMechanics.en = 'Invented safe mechanics'
}, 'IMAGE_JOB_MECHANICS_REQUIRED')

expectNamedFailure('MUTATION_PREMATURE_PROMPT', (candidate) => {
  candidate.jobs[0].prompt = 'Generate a plausible exercise image'
  candidate.jobs[0].promptStatus = 'READY'
}, 'IMAGE_JOB_PROMPT_BLOCK')

expectNamedFailure('MUTATION_PRETEND_GENERATED', (candidate) => {
  candidate.jobs[0].output = { path: '/not-generated.png' }
  candidate.jobs[0].outputStatus = 'GENERATED'
}, 'IMAGE_JOB_OUTPUT_STATE')

console.log('IMAGE_PRODUCTION_JOBS_PROOF: PASS (8 named mutations)')
