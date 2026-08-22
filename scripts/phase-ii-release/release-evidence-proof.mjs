#!/usr/bin/env node

import { buildContractFixture, validateEvidenceManifest } from './evidence-lib.mjs'

const checks = []
const clone = (value) => structuredClone(value)
const has = (value, code) => validateEvidenceManifest(value).some((issue) => issue.code === code)
const check = (name, condition, code) => checks.push({ name, condition: Boolean(condition), code })
const baseline = buildContractFixture()

check('BASE_FIXTURE', validateEvidenceManifest(baseline).length === 0, 'PASS')

const identity = clone(baseline)
identity.records[0].candidateSha = '3'.repeat(40)
check('MUTATION_ARTIFACT_IDENTITY', has(identity, 'ARTIFACT_IDENTITY'), 'ARTIFACT_IDENTITY')

const duplicate = clone(baseline)
duplicate.records.push(clone(duplicate.records[0]))
check('MUTATION_DUPLICATE_EVIDENCE', has(duplicate, 'EVIDENCE_DUPLICATE'), 'EVIDENCE_DUPLICATE')

const blocked = clone(baseline)
blocked.records.find((record) => record.status === 'BLOCKED').dependencyId = null
check('MUTATION_BLOCKED_WITHOUT_DEPENDENCY', has(blocked, 'BLOCKED_DEPENDENCY_REQUIRED'), 'BLOCKED_DEPENDENCY_REQUIRED')

const notApplicable = clone(baseline)
notApplicable.records.find((record) => record.status === 'NOT_APPLICABLE').counterProofId = null
check('MUTATION_NA_WITHOUT_COUNTER', has(notApplicable, 'NOT_APPLICABLE_COUNTER_REQUIRED'), 'NOT_APPLICABLE_COUNTER_REQUIRED')

const traversal = clone(baseline)
traversal.records[0].screenshot = '../secrets.txt'
check('MUTATION_EVIDENCE_PATH_TRAVERSAL', has(traversal, 'EVIDENCE_PATH_SCOPE'), 'EVIDENCE_PATH_SCOPE')

const fixtureGo = clone(baseline)
fixtureGo.verdicts.GO_FOUNDER_DEVICE_QA = {
  dependencyIds: [], evidenceIds: ['REL-FIXTURE-PASS-001'], reason: 'Synthetic attempt.', status: 'GO',
}
check('MUTATION_FIXTURE_GO', has(fixtureGo, 'FIXTURE_CANNOT_GO'), 'FIXTURE_CANNOT_GO')

const goWithFailure = clone(baseline)
goWithFailure.sourceMode = 'FINAL_CANDIDATE'
goWithFailure.verdicts.GO_FOUNDER_DEVICE_QA = {
  dependencyIds: [], evidenceIds: ['REL-FIXTURE-FAIL-001'], reason: 'Invalid attempt.', status: 'GO',
}
check('MUTATION_GO_WITH_FAIL', has(goWithFailure, 'GO_EVIDENCE_NOT_PASS'), 'GO_EVIDENCE_NOT_PASS')

const noGoWithoutFailure = clone(baseline)
noGoWithoutFailure.verdicts.GO_MERGE_MAIN = {
  dependencyIds: [], evidenceIds: ['REL-FIXTURE-PASS-001'], reason: 'Invalid attempt.', status: 'NO-GO',
}
check('MUTATION_NO_GO_WITHOUT_FAIL', has(noGoWithoutFailure, 'NO_GO_FAILURE_REQUIRED'), 'NO_GO_FAILURE_REQUIRED')

let failed = 0
for (const item of checks) {
  console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.name} -> ${item.code}`)
  if (!item.condition) failed++
}
console.log(`RELEASE_EVIDENCE_PROOF: ${failed ? 'FAIL' : 'PASS'} (${checks.length - failed}/${checks.length})`)
process.exit(failed ? 1 : 0)
