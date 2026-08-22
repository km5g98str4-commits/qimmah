import { readFileSync } from 'node:fs'
import { LEDGER_PATH, validateLedger } from './ledger-lib.mjs'

const original = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
const clone = () => structuredClone(original)

function approvedImage(entry) {
  entry.imageStatus = 'APPROVED'
  entry.reviewer.image = 'proof-reviewer'
  entry.reviewedAt.image = '2026-08-22T00:00:00.000Z'
  for (const key of Object.keys(entry.image.review)) entry.image.review[key] = true
}

async function expectNamedFailure(name, mutate, expectedCode) {
  const candidate = clone()
  mutate(candidate)
  const result = await validateLedger(candidate)
  const codes = result.issues.map((found) => found.code)
  if (!codes.includes(expectedCode)) {
    throw new Error(`${name}: expected ${expectedCode}; got ${codes.join(', ') || 'no failure'}`)
  }
  console.log(`${name}: PASS -> ${expectedCode}`)
}

const base = await validateLedger(original)
if (base.issues.length) throw new Error(`BASE_LEDGER: ${base.issues.map((found) => found.code).join(', ')}`)
if (base.duplicateContentGroups.length !== 6) {
  throw new Error(`DUPLICATE_BASELINE: expected 6 groups; got ${base.duplicateContentGroups.length}`)
}
console.log('BASE_LEDGER: PASS')
console.log('DUPLICATE_BASELINE: PASS -> 6 groups')

const firstId = Object.keys(original.exercises)[0]
await expectNamedFailure('MUTATION_COVERAGE', (ledger) => {
  delete ledger.exercises[firstId]
}, 'MEDIA_COVERAGE')

await expectNamedFailure('MUTATION_ORPHAN', (ledger) => {
  ledger.exercises['not-a-canonical-exercise'] = {
    exerciseId: 'not-a-canonical-exercise', image: null, imageStatus: 'MISSING', video: null, videoStatus: 'MISSING',
    source: { image: null, video: null }, reviewedAt: { image: null, video: null }, reviewer: { image: null, video: null }, notes: [],
  }
}, 'MEDIA_ORPHAN')

await expectNamedFailure('MUTATION_KEY_MISMATCH', (ledger) => {
  ledger.exercises[firstId].exerciseId = 'different-id'
}, 'MEDIA_KEY_MISMATCH')

await expectNamedFailure('MUTATION_IMAGE_APPROVAL_EVIDENCE', (ledger) => {
  const entry = ledger.exercises['barbell-bench-press']
  approvedImage(entry)
  entry.image.review.safeMechanics = null
}, 'IMAGE_APPROVAL_EVIDENCE')

await expectNamedFailure('MUTATION_VIDEO_EXACT_REFERENCE', (ledger) => {
  const entry = ledger.exercises['barbell-bench-press']
  entry.videoStatus = 'APPROVED'
  entry.video = {
    provider: 'youtube', youtubeVideoId: 'abcdefghijk',
    canonicalUrl: 'https://www.youtube.com/results?search_query=barbell+bench+press',
    channel: 'Proof Channel', videoTitle: 'Proof title', exerciseId: entry.exerciseId,
    matchConfidence: 1, verifiedAt: '2026-08-22T00:00:00.000Z', reviewer: 'proof-reviewer',
    publicAvailability: 'PUBLIC', notes: 'mutation fixture',
  }
  entry.reviewer.video = 'proof-reviewer'
  entry.reviewedAt.video = '2026-08-22T00:00:00.000Z'
}, 'VIDEO_REFERENCE_EXACT')

await expectNamedFailure('MUTATION_DUPLICATE_PAIR', (ledger) => {
  const first = ledger.exercises['barbell-bench-press']
  const second = ledger.exercises['incline-barbell-press']
  approvedImage(first)
  second.image = structuredClone(first.image)
  approvedImage(second)
}, 'DUPLICATE_CONTENT_PAIR')

await expectNamedFailure('MUTATION_FILE_INTEGRITY', (ledger) => {
  ledger.exercises['barbell-bench-press'].image.assets[0].sha256 = '0'.repeat(64)
}, 'MEDIA_FILE_INTEGRITY')

console.log('EXERCISE_PRODUCTION_PROOF: PASS (7 named mutations)')
