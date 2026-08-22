import { readFileSync } from 'node:fs'
import { PILOT_PATH, validateVideoResearchPilot } from './video-research-pilot-lib.mjs'

const original = JSON.parse(readFileSync(PILOT_PATH, 'utf8'))
const clone = () => structuredClone(original)

function refreshSummary(candidate) {
  candidate.summary = {
    total: candidate.records.length,
    candidatesNeedingIndependentReview: candidate.records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW').length,
    missing: candidate.records.filter((record) => record.researchStatus === 'MISSING').length,
    approved: candidate.records.filter((record) => record.researchStatus === 'APPROVED').length,
  }
}

function expectNamedFailure(name, mutate, expectedCode) {
  const candidate = clone()
  mutate(candidate)
  refreshSummary(candidate)
  const result = validateVideoResearchPilot(candidate)
  const codes = result.issues.map((found) => found.code)
  if (!codes.includes(expectedCode)) throw new Error(`${name}: expected ${expectedCode}; got ${codes.join(', ') || 'no failure'}`)
  console.log(`${name}: PASS -> ${expectedCode}`)
}

const base = validateVideoResearchPilot(original)
if (base.issues.length) throw new Error(`BASE_VIDEO_PILOT: ${base.issues.map((found) => found.code).join(', ')}`)
if (base.computedSummary.total !== 10 || base.computedSummary.candidatesNeedingIndependentReview !== 9 || base.computedSummary.missing !== 1 || base.computedSummary.approved !== 0) {
  throw new Error(`VIDEO_PILOT_COUNTS: ${JSON.stringify(base.computedSummary)}`)
}
console.log('BASE_VIDEO_PILOT: PASS -> 10 total / 9 candidate / 1 missing / 0 approved')

const candidateAt = (candidate, index = 0) => candidate.records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW')[index]

expectNamedFailure('MUTATION_ID_FORMAT', (candidate) => {
  const record = candidateAt(candidate)
  record.youtubeVideoId = 'short'
  record.canonicalUrl = 'https://www.youtube.com/watch?v=short'
}, 'VIDEO_ID_FORMAT')

expectNamedFailure('MUTATION_CANONICAL_URL', (candidate) => {
  const record = candidateAt(candidate)
  record.canonicalUrl = `https://youtu.be/${record.youtubeVideoId}`
}, 'VIDEO_CANONICAL_URL')

expectNamedFailure('MUTATION_SEARCH_URL', (candidate) => {
  candidateAt(candidate).canonicalUrl = 'https://www.youtube.com/results?search_query=bench+press'
}, 'VIDEO_SEARCH_URL')

expectNamedFailure('MUTATION_CANONICAL_COVERAGE', (candidate) => {
  candidate.records.pop()
}, 'VIDEO_PILOT_COVERAGE')

expectNamedFailure('MUTATION_DUPLICATE_VIDEO_REUSE', (candidate) => {
  const first = candidateAt(candidate, 0)
  const second = candidateAt(candidate, 1)
  second.youtubeVideoId = first.youtubeVideoId
  second.canonicalUrl = first.canonicalUrl
}, 'VIDEO_DUPLICATE_REUSE')

expectNamedFailure('MUTATION_TIMESTAMP', (candidate) => {
  candidateAt(candidate).verifiedAt = 'not-a-timestamp'
}, 'VIDEO_VERIFIED_AT')

expectNamedFailure('MUTATION_STATUS_EVIDENCE', (candidate) => {
  candidateAt(candidate).verificationSources = []
}, 'VIDEO_STATUS_EVIDENCE')

expectNamedFailure('MUTATION_PREMATURE_APPROVAL', (candidate) => {
  candidateAt(candidate).researchStatus = 'APPROVED'
}, 'VIDEO_STATUS_EVIDENCE')

console.log('VIDEO_RESEARCH_PILOT_PROOF: PASS (8 named mutations)')
