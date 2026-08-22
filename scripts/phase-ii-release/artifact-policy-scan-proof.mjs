import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { scanArtifact, validateArtifactPolicy } from './artifact-policy-scan-lib.mjs'

const candidateSha = 'a'.repeat(40)
const policyPath = new URL('../../data/phase-ii-release/artifact-scan-policy.json', import.meta.url)
const policyBytes = await readFile(policyPath)
const policy = JSON.parse(policyBytes.toString('utf8'))

async function fixture(content, name = 'assets/app.js') {
  const root = await mkdtemp(path.join(tmpdir(), 'qimmah-artifact-scan-'))
  const target = path.join(root, name)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content)
  return root
}

async function expectFinding(name, content, expected) {
  const root = await fixture(content)
  const report = await scanArtifact({ root, candidateSha, policy, policyBytes })
  assert.equal(report.status, 'FAIL', name)
  assert.deepEqual(report.findings.map((finding) => finding.ruleId), [expected], name)
  assert.equal('match' in report.findings[0], false, `${name} must not echo the matched secret`)
  console.log(`PASS ${name} -> ${expected}`)
}

validateArtifactPolicy(policy)
const safeRoot = await fixture('const api = "https://api.qimmah.app";')
const safeReport = await scanArtifact({ root: safeRoot, candidateSha, policy, policyBytes })
assert.equal(safeReport.status, 'PASS')
assert.equal(safeReport.findings.length, 0)
console.log('PASS BASE_SAFE_ARTIFACT -> PASS')

await expectFinding('MUTATION_SERVICE_ROLE', 'const keyName = "SUPABASE_SERVICE_ROLE_KEY";', 'SERVICE_ROLE_REFERENCE')
await expectFinding('MUTATION_LOCAL_ENDPOINT', 'fetch("http://127.0.0.1:54321/admin")', 'LOCAL_WEB_ENDPOINT')
await expectFinding('MUTATION_PRIVATE_ENDPOINT', 'fetch("https://192.168.1.5/internal")', 'PRIVATE_WEB_ENDPOINT')
await expectFinding('MUTATION_TEST_ENTITLEMENT', 'const role = "fixture-admin";', 'TEST_ENTITLEMENT_HOOK')
await expectFinding('MUTATION_PREVIEW_BYPASS', 'window.preview_bypass = true;', 'PREVIEW_BYPASS_HOOK')
await expectFinding('MUTATION_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----', 'PRIVATE_KEY_MATERIAL')
await expectFinding('MUTATION_PROVIDER_SECRET', 'const token = "sk_live_abcdefghijklmnop1234";', 'PROVIDER_SECRET_TOKEN')

const symlinkRoot = await fixture('safe', 'safe.txt')
await symlink('/etc/passwd', path.join(symlinkRoot, 'escape.txt'))
await assert.rejects(
  () => scanArtifact({ root: symlinkRoot, candidateSha, policy, policyBytes }),
  (error) => error instanceof Error && error.message.startsWith('ARTIFACT_SCAN_SYMLINK:'),
  'MUTATION_SYMLINK_ESCAPE',
)
console.log('PASS MUTATION_SYMLINK_ESCAPE -> ARTIFACT_SCAN_SYMLINK')

const mutatedPolicy = structuredClone(policy)
mutatedPolicy.rules.push(structuredClone(mutatedPolicy.rules[0]))
assert.throws(
  () => validateArtifactPolicy(mutatedPolicy),
  (error) => error instanceof Error && error.message.startsWith('ARTIFACT_POLICY_RULE_DUPLICATE:'),
)
console.log('PASS MUTATION_DUPLICATE_RULE -> ARTIFACT_POLICY_RULE_DUPLICATE')
console.log('ARTIFACT_POLICY_SCAN_PROOF: PASS (10/10)')
