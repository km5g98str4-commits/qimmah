import { isDeepStrictEqual } from 'node:util'

export const SCHEMA_VERSION = 1
export const FIXTURE_CANDIDATE_SHA = '1'.repeat(40)
export const FIXTURE_DIST_SHA256 = '2'.repeat(64)
export const VERDICT_NAMES = [
  'GO_FOUNDER_DEVICE_QA',
  'GO_PREVIEW_FREE_USERS',
  'GO_PAID_COMMERCIAL_FUNNEL',
  'GO_EXECUTIVE_DASHBOARD_FRONTEND',
  'GO_PRODUCTION_DATA_INGEST',
  'GO_EXERCISE_MEDIA_RELEASE',
  'GO_MERGE_MAIN',
]

const RECORD_KEYS = [
  'action', 'actual', 'assertionId', 'candidateSha', 'consoleErrors',
  'contractReason', 'counterProofId', 'dependencyId', 'distManifestSha256',
  'engine', 'evidenceId', 'expected', 'finishedAt', 'initialState', 'locale',
  'networkFailures', 'personaId', 'screenshot', 'status', 'viewport',
]
const TOP_KEYS = [
  'candidateSha', 'createdAt', 'distManifestSha256', 'generatedFor', 'records',
  'schemaVersion', 'sourceMode', 'verdicts',
]
const VERDICT_KEYS = ['dependencyIds', 'evidenceIds', 'reason', 'status']
const RECORD_STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE'])
const VERDICT_STATUSES = new Set(['GO', 'NO-GO', 'BLOCKED', 'NOT_EVALUATED'])
const STATES = new Set(['fresh', 'returning', 'interrupted', 'corrupt', 'unauthorized-admin'])
const ENGINES = new Set(['chromium', 'webkit'])
const LOCALES = new Set(['ar', 'en'])

const exactKeys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) &&
  isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort())

function isIso(value) {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

function isScopedRelativePath(value) {
  if (value === null) return true
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\') || value.includes('\0')) return false
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return false
  }
  return !decoded.startsWith('/') && !decoded.includes('\\') && !decoded.includes('\0') &&
    !decoded.split('/').some((segment) => segment === '.' || segment === '..')
}

function add(issues, code, detail) {
  issues.push({ code, detail })
}

function validId(value) {
  return typeof value === 'string' && /^[A-Z0-9][A-Z0-9:_-]{2,}$/.test(value)
}

function validateRecord(record, manifest, issues) {
  const label = record?.evidenceId ?? '<missing>'
  if (!exactKeys(record, RECORD_KEYS)) {
    add(issues, 'EVIDENCE_RECORD_SHAPE', label)
    return
  }
  if (!validId(record.evidenceId) || !validId(record.assertionId) || !/^P[1-8]$/.test(record.personaId)) {
    add(issues, 'EVIDENCE_IDENTITY', label)
  }
  if (record.candidateSha !== manifest.candidateSha || record.distManifestSha256 !== manifest.distManifestSha256) {
    add(issues, 'ARTIFACT_IDENTITY', label)
  }
  if (!ENGINES.has(record.engine) || !LOCALES.has(record.locale) || !STATES.has(record.initialState) || !RECORD_STATUSES.has(record.status)) {
    add(issues, 'EVIDENCE_ENUM', label)
  }
  if (!record.viewport || !Number.isInteger(record.viewport.width) || !Number.isInteger(record.viewport.height) ||
    record.viewport.width < 320 || record.viewport.height < 568 || !exactKeys(record.viewport, ['height', 'width'])) {
    add(issues, 'EVIDENCE_VIEWPORT', label)
  }
  for (const field of ['action', 'expected', 'actual']) {
    if (typeof record[field] !== 'string' || !record[field].trim()) add(issues, 'EVIDENCE_NARRATIVE', `${label}:${field}`)
  }
  if (!Array.isArray(record.consoleErrors) || !record.consoleErrors.every((entry) => typeof entry === 'string') ||
    !Array.isArray(record.networkFailures) || !record.networkFailures.every((entry) => typeof entry === 'string')) {
    add(issues, 'EVIDENCE_DIAGNOSTICS', label)
  }
  if (!isIso(record.finishedAt)) add(issues, 'EVIDENCE_TIMESTAMP', label)
  if (!isScopedRelativePath(record.screenshot)) add(issues, 'EVIDENCE_PATH_SCOPE', label)

  if (record.status === 'BLOCKED' && !validId(record.dependencyId)) {
    add(issues, 'BLOCKED_DEPENDENCY_REQUIRED', label)
  }
  if (record.status !== 'BLOCKED' && record.dependencyId !== null) {
    add(issues, 'DEPENDENCY_STATUS_MISMATCH', label)
  }
  if (record.status === 'NOT_APPLICABLE') {
    if (typeof record.contractReason !== 'string' || !record.contractReason.trim()) add(issues, 'NOT_APPLICABLE_REASON_REQUIRED', label)
    if (!validId(record.counterProofId)) add(issues, 'NOT_APPLICABLE_COUNTER_REQUIRED', label)
  } else if (record.contractReason !== null || record.counterProofId !== null) {
    add(issues, 'NOT_APPLICABLE_FIELDS_MISMATCH', label)
  }
}

export function validateEvidenceManifest(manifest) {
  const issues = []
  if (!exactKeys(manifest, TOP_KEYS)) {
    add(issues, 'EVIDENCE_MANIFEST_SHAPE', 'top-level keys')
    return issues
  }
  if (manifest.schemaVersion !== SCHEMA_VERSION) add(issues, 'EVIDENCE_SCHEMA_VERSION', String(manifest.schemaVersion))
  if (!['FIXTURE_ONLY', 'FINAL_CANDIDATE'].includes(manifest.sourceMode)) add(issues, 'EVIDENCE_SOURCE_MODE', String(manifest.sourceMode))
  if (typeof manifest.generatedFor !== 'string' || !manifest.generatedFor.trim()) add(issues, 'EVIDENCE_GENERATED_FOR', '')
  if (!/^[0-9a-f]{40}$/.test(manifest.candidateSha)) add(issues, 'CANDIDATE_SHA', String(manifest.candidateSha))
  if (!/^[0-9a-f]{64}$/.test(manifest.distManifestSha256)) add(issues, 'DIST_MANIFEST_SHA', String(manifest.distManifestSha256))
  if (!isIso(manifest.createdAt)) add(issues, 'EVIDENCE_TIMESTAMP', 'manifest')
  if (!Array.isArray(manifest.records)) add(issues, 'EVIDENCE_RECORDS_ARRAY', '')
  else manifest.records.forEach((record) => validateRecord(record, manifest, issues))

  const records = Array.isArray(manifest.records) ? manifest.records : []
  const evidenceIds = records.map((record) => record?.evidenceId)
  if (new Set(evidenceIds).size !== evidenceIds.length) add(issues, 'EVIDENCE_DUPLICATE', 'evidenceId')
  const executionKeys = records.map((record) => [
    record?.assertionId, record?.engine, record?.locale, record?.viewport?.width,
    record?.viewport?.height, record?.initialState,
  ].join(':'))
  if (new Set(executionKeys).size !== executionKeys.length) add(issues, 'EVIDENCE_DUPLICATE', 'execution tuple')

  if (!manifest.verdicts || typeof manifest.verdicts !== 'object' || Array.isArray(manifest.verdicts) ||
    !isDeepStrictEqual(Object.keys(manifest.verdicts).sort(), [...VERDICT_NAMES].sort())) {
    add(issues, 'VERDICT_SET', 'seven verdicts required')
  } else {
    const byId = new Map(records.map((record) => [record.evidenceId, record]))
    for (const name of VERDICT_NAMES) {
      const verdict = manifest.verdicts[name]
      if (!exactKeys(verdict, VERDICT_KEYS) || !VERDICT_STATUSES.has(verdict.status) ||
        !Array.isArray(verdict.evidenceIds) || !Array.isArray(verdict.dependencyIds) ||
        typeof verdict.reason !== 'string' || !verdict.reason.trim()) {
        add(issues, 'VERDICT_SHAPE', name)
        continue
      }
      const referenced = verdict.evidenceIds.map((id) => byId.get(id))
      if (referenced.some((record) => !record)) add(issues, 'VERDICT_EVIDENCE_REFERENCE', name)
      if (verdict.dependencyIds.some((id) => !validId(id))) add(issues, 'VERDICT_DEPENDENCY_REFERENCE', name)
      if (verdict.status === 'GO') {
        if (manifest.sourceMode !== 'FINAL_CANDIDATE') add(issues, 'FIXTURE_CANNOT_GO', name)
        if (!referenced.length || referenced.some((record) => record?.status !== 'PASS') || verdict.dependencyIds.length) {
          add(issues, 'GO_EVIDENCE_NOT_PASS', name)
        }
      }
      if (verdict.status === 'NO-GO' && !referenced.some((record) => record?.status === 'FAIL')) {
        add(issues, 'NO_GO_FAILURE_REQUIRED', name)
      }
      if (verdict.status === 'BLOCKED' && verdict.dependencyIds.length === 0) {
        add(issues, 'VERDICT_BLOCKER_REQUIRED', name)
      }
    }
  }
  return issues
}

function record(overrides) {
  return {
    action: 'Contract-fixture action',
    actual: 'Contract-fixture actual result',
    assertionId: 'REL-FIXTURE-CONTRACT',
    candidateSha: FIXTURE_CANDIDATE_SHA,
    consoleErrors: [],
    contractReason: null,
    counterProofId: null,
    dependencyId: null,
    distManifestSha256: FIXTURE_DIST_SHA256,
    engine: 'chromium',
    evidenceId: 'REL-FIXTURE-PASS-001',
    expected: 'Contract-fixture expected result',
    finishedAt: '2026-08-22T00:00:00.000Z',
    initialState: 'fresh',
    locale: 'ar',
    networkFailures: [],
    personaId: 'P1',
    screenshot: null,
    status: 'PASS',
    viewport: { height: 844, width: 390 },
    ...overrides,
  }
}

export function buildContractFixture() {
  const records = [
    record({ evidenceId: 'REL-FIXTURE-PASS-001' }),
    record({ assertionId: 'REL-FIXTURE-FAIL', evidenceId: 'REL-FIXTURE-FAIL-001', locale: 'en', status: 'FAIL' }),
    record({ assertionId: 'REL-FIXTURE-BLOCKED', dependencyId: 'WS-REL-ARTIFACT-001', evidenceId: 'REL-FIXTURE-BLOCKED-001', initialState: 'interrupted', status: 'BLOCKED' }),
    record({ assertionId: 'REL-FIXTURE-NA', contractReason: 'Contract excludes this synthetic branch.', counterProofId: 'REL-FIXTURE-COUNTER-001', engine: 'webkit', evidenceId: 'REL-FIXTURE-NA-001', initialState: 'corrupt', status: 'NOT_APPLICABLE' }),
  ]
  const verdicts = Object.fromEntries(VERDICT_NAMES.map((name) => [name, {
    dependencyIds: [],
    evidenceIds: [],
    reason: 'Contract fixture cannot evaluate a release verdict.',
    status: 'NOT_EVALUATED',
  }]))
  return {
    candidateSha: FIXTURE_CANDIDATE_SHA,
    createdAt: '2026-08-22T00:00:00.000Z',
    distManifestSha256: FIXTURE_DIST_SHA256,
    generatedFor: 'CONTRACT_PROOF_ONLY_NOT_RELEASE_EVIDENCE',
    records,
    schemaVersion: SCHEMA_VERSION,
    sourceMode: 'FIXTURE_ONLY',
    verdicts,
  }
}

export function serializeEvidence(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}
