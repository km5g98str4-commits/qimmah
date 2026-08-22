import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const SOURCE_LEDGER_PATH = resolve(ROOT, 'data/exercise-production/review-ledger.json')
export const JOBS_PATH = resolve(ROOT, 'data/exercise-production/image-production-jobs.json')

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const stableJobId = (exerciseId) => `exercise-image-v1:${exerciseId}`

function readLedger() {
  const bytes = readFileSync(SOURCE_LEDGER_PATH)
  return { ledger: JSON.parse(bytes.toString('utf8')), ledgerSha256: sha256(bytes) }
}

function metadataPresentInLedger(entry) {
  return {
    names: entry.names ?? { ar: null, en: null },
    equipment: Array.isArray(entry.equipment) ? entry.equipment : [],
    muscles: entry.muscles ?? { primary: [], secondary: [] },
    movementPattern: entry.movementPattern ?? null,
  }
}

function requiredAuthoring() {
  return {
    startPositionDescription: { ar: null, en: null },
    endPositionDescription: { ar: null, en: null },
    safeMechanics: { ar: null, en: null },
    mechanicsReviewer: null,
    mechanicsReviewedAt: null,
  }
}

export function buildImageProductionJobs() {
  const { ledger, ledgerSha256 } = readLedger()
  const jobs = Object.values(ledger.exercises)
    .filter((entry) => entry.imageStatus === 'MISSING')
    .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId))
    .map((entry) => ({
      jobId: stableJobId(entry.exerciseId),
      version: 1,
      exerciseId: entry.exerciseId,
      sourceFingerprint: ledger.sourceFingerprint,
      metadata: metadataPresentInLedger(entry),
      metadataStatus: 'BLOCKED_METADATA_NOT_PRESENT_IN_LEDGER',
      requiredAuthoring: requiredAuthoring(),
      prompt: null,
      promptStatus: 'BLOCKED_NEEDS_REVIEWED_MECHANICS',
      output: null,
      outputStatus: 'NOT_GENERATED',
    }))

  return {
    schemaVersion: 1,
    version: 1,
    source: {
      ledgerPath: 'data/exercise-production/review-ledger.json',
      ledgerSha256,
      baselineCommit: ledger.baselineCommit,
      sourceFingerprint: ledger.sourceFingerprint,
    },
    summary: {
      jobs: jobs.length,
      blockedNeedsReviewedMechanics: jobs.filter((job) => job.promptStatus === 'BLOCKED_NEEDS_REVIEWED_MECHANICS').length,
      notGenerated: jobs.filter((job) => job.outputStatus === 'NOT_GENERATED').length,
    },
    jobs,
  }
}

function issue(issues, code, message) {
  issues.push({ code, message })
}

function allAuthoringNull(required) {
  return Boolean(
    required &&
    required.startPositionDescription?.ar === null &&
    required.startPositionDescription?.en === null &&
    required.endPositionDescription?.ar === null &&
    required.endPositionDescription?.en === null &&
    required.safeMechanics?.ar === null &&
    required.safeMechanics?.en === null &&
    required.mechanicsReviewer === null &&
    required.mechanicsReviewedAt === null
  )
}

export function validateImageProductionJobs(candidate) {
  const { ledger, ledgerSha256 } = readLedger()
  const expectedEntries = Object.values(ledger.exercises).filter((entry) => entry.imageStatus === 'MISSING')
  const expectedById = new Map(expectedEntries.map((entry) => [entry.exerciseId, entry]))
  const jobs = Array.isArray(candidate?.jobs) ? candidate.jobs : []
  const issues = []

  if (candidate?.schemaVersion !== 1 || candidate?.version !== 1) {
    issue(issues, 'IMAGE_JOB_SCHEMA', 'job envelope schema/version is not v1')
  }

  const jobsByExercise = new Map()
  for (const job of jobs) {
    const list = jobsByExercise.get(job?.exerciseId) ?? []
    list.push(job)
    jobsByExercise.set(job?.exerciseId, list)
  }

  for (const id of expectedById.keys()) {
    if (!jobsByExercise.has(id)) issue(issues, 'IMAGE_JOB_COVERAGE', `missing image-production job for ${id}`)
    if ((jobsByExercise.get(id)?.length ?? 0) > 1) issue(issues, 'IMAGE_JOB_COVERAGE', `duplicate image-production jobs for ${id}`)
  }
  for (const id of jobsByExercise.keys()) {
    if (!expectedById.has(id)) issue(issues, 'IMAGE_JOB_ORPHAN', `job is not tied to a MISSING ledger image: ${id}`)
  }

  for (const job of jobs.filter((row) => expectedById.has(row?.exerciseId))) {
    const ledgerEntry = expectedById.get(job.exerciseId)
    if (job.jobId !== stableJobId(job.exerciseId) || job.version !== 1) {
      issue(issues, 'IMAGE_JOB_ID_STABILITY', `unstable job id or version for ${job.exerciseId}`)
    }
    if (job.sourceFingerprint !== ledger.sourceFingerprint) {
      issue(issues, 'IMAGE_JOB_LEDGER_BINDING', `job fingerprint differs from ledger for ${job.exerciseId}`)
    }
    if (!isDeepStrictEqual(job.metadata, metadataPresentInLedger(ledgerEntry)) || job.metadataStatus !== 'BLOCKED_METADATA_NOT_PRESENT_IN_LEDGER') {
      issue(issues, 'IMAGE_JOB_METADATA_PROVENANCE', `job invents or omits ledger-available metadata for ${job.exerciseId}`)
    }
    if (!allAuthoringNull(job.requiredAuthoring)) {
      issue(issues, 'IMAGE_JOB_MECHANICS_REQUIRED', `start/end or safe-mechanics authoring was populated before review for ${job.exerciseId}`)
    }
    if (job.prompt !== null || job.promptStatus !== 'BLOCKED_NEEDS_REVIEWED_MECHANICS') {
      issue(issues, 'IMAGE_JOB_PROMPT_BLOCK', `prompt exists or is unblocked before reviewed mechanics for ${job.exerciseId}`)
    }
    if (job.output !== null || job.outputStatus !== 'NOT_GENERATED') {
      issue(issues, 'IMAGE_JOB_OUTPUT_STATE', `output is represented as generated for ${job.exerciseId}`)
    }
  }

  if (
    candidate?.source?.ledgerPath !== 'data/exercise-production/review-ledger.json' ||
    candidate?.source?.ledgerSha256 !== ledgerSha256 ||
    candidate?.source?.baselineCommit !== ledger.baselineCommit ||
    candidate?.source?.sourceFingerprint !== ledger.sourceFingerprint
  ) {
    issue(issues, 'IMAGE_JOB_LEDGER_BINDING', 'job envelope is not bound to the exact committed ledger')
  }

  const computedSummary = {
    jobs: jobs.length,
    blockedNeedsReviewedMechanics: jobs.filter((job) => job.promptStatus === 'BLOCKED_NEEDS_REVIEWED_MECHANICS').length,
    notGenerated: jobs.filter((job) => job.outputStatus === 'NOT_GENERATED').length,
  }
  if (!isDeepStrictEqual(candidate?.summary, computedSummary)) {
    issue(issues, 'IMAGE_JOB_SUMMARY', 'summary does not match the job rows')
  }

  return { issues, computedSummary, expectedMissingIds: [...expectedById.keys()].sort() }
}

export function serializeImageProductionJobs(candidate) {
  return `${JSON.stringify(candidate, null, 2)}\n`
}
