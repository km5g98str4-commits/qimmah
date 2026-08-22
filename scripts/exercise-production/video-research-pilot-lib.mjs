import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const LEDGER_PATH = resolve(ROOT, 'data/exercise-production/review-ledger.json')
export const PILOT_PATH = resolve(ROOT, 'data/exercise-production/video-research-pilot.json')
export const VERIFIED_AT = '2026-08-22T17:15:30.000Z'

export const PILOT_EXERCISES = [
  { exerciseId: 'barbell-bench-press', names: { ar: 'بنش بريس بار', en: 'Barbell Bench Press' }, equipment: ['barbell', 'bench'], movementPattern: 'push' },
  { exerciseId: 'bodyweight-squat', names: { ar: 'سكوات وزن الجسم', en: 'Bodyweight Squat' }, equipment: ['bodyweight'], movementPattern: 'squat' },
  { exerciseId: 'burpees', names: { ar: 'بيربي', en: 'Burpees' }, equipment: ['bodyweight'], movementPattern: 'cardio' },
  { exerciseId: 'deadlift', names: { ar: 'رفعة ميتة', en: 'Deadlift' }, equipment: ['barbell'], movementPattern: 'hinge' },
  { exerciseId: 'front-squat', names: { ar: 'سكوات أمامي', en: 'Front Squat' }, equipment: ['barbell'], movementPattern: 'squat' },
  { exerciseId: 'kettlebell-swing', names: { ar: 'أرجحة الكيتل بل', en: 'Kettlebell Swing' }, equipment: ['kettlebell'], movementPattern: 'hinge' },
  { exerciseId: 'overhead-press', names: { ar: 'ضغط كتف بار واقف', en: 'Overhead Press' }, equipment: ['barbell'], movementPattern: 'push' },
  { exerciseId: 'plank', names: { ar: 'بلانك', en: 'Plank' }, equipment: ['bodyweight'], movementPattern: 'core' },
  { exerciseId: 'pull-up', names: { ar: 'عقلة', en: 'Pull-Up' }, equipment: ['bodyweight'], movementPattern: 'pull' },
  { exerciseId: 'push-up', names: { ar: 'ضغط (تمرين الجسم)', en: 'Push-Up' }, equipment: ['bodyweight'], movementPattern: 'push' },
]

const RESEARCH_RESULTS = {
  'barbell-bench-press': {
    youtubeVideoId: 'ihXeA1HAKwE', channel: 'CrossFit', videoTitle: 'Bench Press Technique | CrossFit Coaching Tips', matchConfidence: 0.98,
    notes: 'Official CrossFit coaching demonstration; title, channel, and public metadata matched the exact barbell bench-press movement. Independent visual review is still required.',
  },
  'bodyweight-squat': {
    youtubeVideoId: 'C_VtOYc6j5c', channel: 'CrossFit', videoTitle: 'The Air Squat: CrossFit Foundational Movement', matchConfidence: 0.9,
    notes: 'Official CrossFit foundational air-squat demonstration; mapped to the catalog bodyweight squat, with terminology equivalence left for independent review.',
  },
  burpees: {
    youtubeVideoId: 'TU8QYVW0gDU', channel: 'CrossFit', videoTitle: 'The Burpee', matchConfidence: 0.98,
    notes: 'Official CrossFit movement demonstration with an exact burpee title; independent review must confirm the catalog variation.',
  },
  deadlift: {
    youtubeVideoId: '1ZXobu7JvvE', channel: 'CrossFit', videoTitle: 'The Deadlift', matchConfidence: 0.98,
    notes: 'Official CrossFit deadlift demonstration; exact movement title and public metadata verified. Independent review must confirm equipment and presentation fit.',
  },
  'front-squat': {
    youtubeVideoId: 'm4ytaCJZpl0', channel: 'CrossFit', videoTitle: 'The Front Squat: CrossFit Foundational Movement', matchConfidence: 0.98,
    notes: 'Official CrossFit foundational front-squat demonstration; exact movement title and public metadata verified.',
  },
  'kettlebell-swing': {
    youtubeVideoId: 'vdezTMulJ-k', channel: 'CrossFit', videoTitle: 'The Kettlebell Swing', matchConfidence: 0.96,
    notes: 'Official CrossFit kettlebell-swing demonstration; independent review must confirm that the demonstrated swing variation matches the catalog intent.',
  },
  'overhead-press': {
    youtubeVideoId: 'xe19t2_6yis', channel: 'CrossFit', videoTitle: 'The Shoulder Press: CrossFit Foundational Movement', matchConfidence: 0.9,
    notes: 'Official CrossFit shoulder-press demonstration; mapped to the catalog overhead press, with naming and exact equipment variation left for independent review.',
  },
  'pull-up': {
    youtubeVideoId: 'aAggnpPyR6E', channel: 'CrossFit', videoTitle: 'The Pull-Up', matchConfidence: 0.8,
    notes: 'Official CrossFit pull-up demonstration; confidence is lower because the catalog ID does not specify strict versus kipping variation.',
  },
  'push-up': {
    youtubeVideoId: '_l3ySVKYVJ8', channel: 'CrossFit', videoTitle: 'The Push-Up', matchConfidence: 0.98,
    notes: 'Official CrossFit push-up demonstration; exact title and public metadata verified after resolving the official embed reference.',
  },
}

const canonicalUrl = (id) => `https://www.youtube.com/watch?v=${id}`
const oEmbedUrl = (id) => `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl(id))}&format=json`

function candidateRecord(exercise) {
  const found = RESEARCH_RESULTS[exercise.exerciseId]
  if (!found) {
    return {
      ...exercise,
      youtubeVideoId: null,
      canonicalUrl: null,
      channel: null,
      videoTitle: null,
      matchConfidence: null,
      verifiedAt: null,
      notes: 'Bounded official-channel search did not produce an accepted exact standalone plank instruction video; no URL was forced into coverage.',
      researchStatus: 'MISSING',
      verificationSources: [
        {
          type: 'OFFICIAL_LIBRARY_REVIEW',
          url: 'https://www.crossfit.com/crossfit-movements',
          checkedAt: VERIFIED_AT,
          outcome: 'NO_EXACT_STANDALONE_MATCH_ACCEPTED',
        },
      ],
    }
  }
  const url = canonicalUrl(found.youtubeVideoId)
  return {
    ...exercise,
    youtubeVideoId: found.youtubeVideoId,
    canonicalUrl: url,
    channel: found.channel,
    videoTitle: found.videoTitle,
    matchConfidence: found.matchConfidence,
    verifiedAt: VERIFIED_AT,
    notes: found.notes,
    researchStatus: 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW',
    verificationSources: [
      { type: 'YOUTUBE_WATCH_PAGE', url, checkedAt: VERIFIED_AT, outcome: 'PUBLIC_WATCH_URL' },
      { type: 'YOUTUBE_OEMBED', url: oEmbedUrl(found.youtubeVideoId), checkedAt: VERIFIED_AT, outcome: 'PUBLIC_METADATA_MATCH' },
    ],
  }
}

export function buildVideoResearchPilot() {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
  const records = PILOT_EXERCISES.map(candidateRecord)
  return {
    schemaVersion: 1,
    version: 1,
    pilotId: 'EX-4A',
    baseline: {
      commit: ledger.baselineCommit,
      sourceFingerprint: ledger.sourceFingerprint,
      metadataSource: `git:${ledger.baselineCommit}:src/data/exercises.ts`,
    },
    selection: {
      strategy: 'versioned-common-foundational-set-v1; records sorted by exerciseId',
      count: PILOT_EXERCISES.length,
      exerciseIds: PILOT_EXERCISES.map((exercise) => exercise.exerciseId),
    },
    researchProtocol: {
      researcherRole: 'PRIMARY_RESEARCHER',
      preferredSource: 'official-or-trusted-instruction-channel',
      verificationMethod: 'public YouTube watch URL plus successful YouTube oEmbed metadata response',
      independentReviewRequired: true,
      downloadOrRehost: false,
    },
    summary: {
      total: records.length,
      candidatesNeedingIndependentReview: records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW').length,
      missing: records.filter((record) => record.researchStatus === 'MISSING').length,
      approved: 0,
    },
    records,
  }
}

function issue(issues, code, message) {
  issues.push({ code, message })
}

function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export function validateVideoResearchPilot(candidate) {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
  const canonicalIds = new Set(Object.keys(ledger.exercises))
  const expectedById = new Map(PILOT_EXERCISES.map((exercise) => [exercise.exerciseId, exercise]))
  const records = Array.isArray(candidate?.records) ? candidate.records : []
  const issues = []

  if (candidate?.schemaVersion !== 1 || candidate?.version !== 1 || candidate?.pilotId !== 'EX-4A') {
    issue(issues, 'VIDEO_PILOT_SCHEMA', 'pilot envelope is not EX-4A schema/version 1')
  }
  if (
    candidate?.baseline?.commit !== ledger.baselineCommit ||
    candidate?.baseline?.sourceFingerprint !== ledger.sourceFingerprint ||
    candidate?.baseline?.metadataSource !== `git:${ledger.baselineCommit}:src/data/exercises.ts`
  ) {
    issue(issues, 'VIDEO_PILOT_BASELINE', 'pilot is not bound to the exact baseline ledger and metadata source')
  }
  if (!isDeepStrictEqual(candidate?.selection?.exerciseIds, PILOT_EXERCISES.map((exercise) => exercise.exerciseId)) || candidate?.selection?.count !== 10) {
    issue(issues, 'VIDEO_PILOT_SELECTION', 'pilot selection differs from the deterministic v1 set')
  }
  if (
    candidate?.researchProtocol?.researcherRole !== 'PRIMARY_RESEARCHER' ||
    candidate?.researchProtocol?.independentReviewRequired !== true ||
    candidate?.researchProtocol?.downloadOrRehost !== false
  ) {
    issue(issues, 'VIDEO_STATUS_EVIDENCE', 'research protocol must remain first-researcher evidence with independent review and no download/rehosting')
  }

  const byExercise = new Map()
  for (const record of records) {
    const list = byExercise.get(record?.exerciseId) ?? []
    list.push(record)
    byExercise.set(record?.exerciseId, list)
  }
  for (const id of expectedById.keys()) {
    if (!byExercise.has(id) || byExercise.get(id).length !== 1) issue(issues, 'VIDEO_PILOT_COVERAGE', `pilot requires exactly one row for ${id}`)
    if (!canonicalIds.has(id)) issue(issues, 'VIDEO_CANONICAL_EXERCISE', `pilot ID is absent from canonical ledger: ${id}`)
  }
  for (const id of byExercise.keys()) {
    if (!expectedById.has(id) || !canonicalIds.has(id)) issue(issues, 'VIDEO_CANONICAL_EXERCISE', `unexpected or noncanonical pilot ID: ${id}`)
  }

  for (const record of records.filter((row) => expectedById.has(row?.exerciseId))) {
    const expectedMetadata = expectedById.get(record.exerciseId)
    if (!isDeepStrictEqual(
      { exerciseId: record.exerciseId, names: record.names, equipment: record.equipment, movementPattern: record.movementPattern },
      expectedMetadata,
    )) {
      issue(issues, 'VIDEO_BASELINE_METADATA', `baseline name/movement metadata drift for ${record.exerciseId}`)
    }

    if (record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW') {
      const idValid = /^[A-Za-z0-9_-]{11}$/.test(record.youtubeVideoId ?? '')
      if (!idValid) issue(issues, 'VIDEO_ID_FORMAT', `invalid YouTube video ID for ${record.exerciseId}`)
      const sources = Array.isArray(record.verificationSources) ? record.verificationSources : []
      if (
        /youtube\.com\/results\?|[?&]search_query=/.test(record.canonicalUrl ?? '') ||
        sources.some((source) => /youtube\.com\/results\?|[?&]search_query=/.test(source?.url ?? ''))
      ) {
        issue(issues, 'VIDEO_SEARCH_URL', `search-result URL stored for ${record.exerciseId}`)
      } else if (record.canonicalUrl !== canonicalUrl(record.youtubeVideoId)) {
        issue(issues, 'VIDEO_CANONICAL_URL', `noncanonical watch URL for ${record.exerciseId}`)
      }
      if (!validTimestamp(record.verifiedAt)) issue(issues, 'VIDEO_VERIFIED_AT', `invalid verification timestamp for ${record.exerciseId}`)
      const watch = sources.find((source) => source.type === 'YOUTUBE_WATCH_PAGE')
      const oembed = sources.find((source) => source.type === 'YOUTUBE_OEMBED')
      if (
        !record.channel || !record.videoTitle || !record.notes || !(record.matchConfidence > 0 && record.matchConfidence <= 1) ||
        watch?.url !== record.canonicalUrl || watch?.checkedAt !== record.verifiedAt || watch?.outcome !== 'PUBLIC_WATCH_URL' ||
        oembed?.url !== oEmbedUrl(record.youtubeVideoId) || oembed?.checkedAt !== record.verifiedAt || oembed?.outcome !== 'PUBLIC_METADATA_MATCH'
      ) {
        issue(issues, 'VIDEO_STATUS_EVIDENCE', `candidate evidence is incomplete for ${record.exerciseId}`)
      }
    } else if (record.researchStatus === 'MISSING') {
      const videoFieldsEmpty = ['youtubeVideoId', 'canonicalUrl', 'channel', 'videoTitle', 'matchConfidence', 'verifiedAt'].every((field) => record[field] === null)
      const boundedEvidence = Array.isArray(record.verificationSources) && record.verificationSources.some((source) => (
        source.type === 'OFFICIAL_LIBRARY_REVIEW' &&
        source.url === 'https://www.crossfit.com/crossfit-movements' &&
        source.outcome === 'NO_EXACT_STANDALONE_MATCH_ACCEPTED' &&
        validTimestamp(source.checkedAt)
      ))
      if (!videoFieldsEmpty || !boundedEvidence || !record.notes) {
        issue(issues, 'VIDEO_STATUS_EVIDENCE', `MISSING row carries video data or lacks bounded-search evidence for ${record.exerciseId}`)
      }
    } else {
      issue(issues, 'VIDEO_STATUS_EVIDENCE', `forbidden research status for ${record.exerciseId}: ${record.researchStatus}`)
    }
  }

  const candidateIds = records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW').map((record) => record.youtubeVideoId)
  const duplicates = candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index)
  if (duplicates.length) issue(issues, 'VIDEO_DUPLICATE_REUSE', `video reused across exercises: ${[...new Set(duplicates)].join(', ')}`)

  const computedSummary = {
    total: records.length,
    candidatesNeedingIndependentReview: records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW').length,
    missing: records.filter((record) => record.researchStatus === 'MISSING').length,
    approved: records.filter((record) => record.researchStatus === 'APPROVED').length,
  }
  if (!isDeepStrictEqual(candidate?.summary, computedSummary)) issue(issues, 'VIDEO_PILOT_SUMMARY', 'pilot summary differs from records')
  return { issues, computedSummary }
}

export function serializeVideoResearchPilot(candidate) {
  return `${JSON.stringify(candidate, null, 2)}\n`
}
