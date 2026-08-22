import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'

const FULL_SHA = /^[0-9a-f]{40}$/
const RULE_ID = /^[A-Z][A-Z0-9_]*$/
const ALLOWED_FLAGS = new Set(['u', 'iu'])

function fail(name, detail) {
  throw new Error(`${name}: ${detail}`)
}

export function validateArtifactPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    fail('ARTIFACT_POLICY_SCHEMA', 'policy must be an object')
  }
  if (policy.schemaVersion !== 1 || policy.policyId !== 'qimmah-built-artifact-policy-v1') {
    fail('ARTIFACT_POLICY_SCHEMA', 'schemaVersion or policyId is not accepted')
  }
  if (!Array.isArray(policy.textExtensions) || policy.textExtensions.length === 0) {
    fail('ARTIFACT_POLICY_SCHEMA', 'textExtensions must be non-empty')
  }
  if (new Set(policy.textExtensions).size !== policy.textExtensions.length) {
    fail('ARTIFACT_POLICY_EXTENSION_DUPLICATE', 'textExtensions must be unique')
  }
  for (const extension of policy.textExtensions) {
    if (typeof extension !== 'string' || !/^\.[a-z0-9]+$/.test(extension)) {
      fail('ARTIFACT_POLICY_EXTENSION', `invalid extension ${String(extension)}`)
    }
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    fail('ARTIFACT_POLICY_SCHEMA', 'rules must be non-empty')
  }
  const ids = policy.rules.map((rule) => rule?.id)
  if (new Set(ids).size !== ids.length) fail('ARTIFACT_POLICY_RULE_DUPLICATE', 'rule IDs must be unique')
  for (const rule of policy.rules) {
    if (!rule || typeof rule !== 'object' || !RULE_ID.test(rule.id)) {
      fail('ARTIFACT_POLICY_RULE', 'rule ID is malformed')
    }
    if (typeof rule.pattern !== 'string' || rule.pattern.length < 4) {
      fail('ARTIFACT_POLICY_RULE', `${rule.id} pattern is malformed`)
    }
    if (!ALLOWED_FLAGS.has(rule.flags)) fail('ARTIFACT_POLICY_FLAGS', `${rule.id} flags are not accepted`)
    try {
      new RegExp(rule.pattern, rule.flags)
    } catch {
      fail('ARTIFACT_POLICY_REGEX', `${rule.id} pattern does not compile`)
    }
  }
  return policy
}

async function walk(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute).split(path.sep).join('/')
    const stats = await lstat(absolute)
    if (stats.isSymbolicLink()) fail('ARTIFACT_SCAN_SYMLINK', relative)
    if (stats.isDirectory()) files.push(...await walk(root, absolute))
    else if (stats.isFile()) files.push({ absolute, relative, bytes: stats.size })
    else fail('ARTIFACT_SCAN_FILE_TYPE', relative)
  }
  return files
}

export async function scanArtifact({ root, candidateSha, policy, policyBytes }) {
  if (!FULL_SHA.test(candidateSha ?? '')) fail('ARTIFACT_SCAN_CANDIDATE_SHA', 'candidateSha must be a full lowercase Git SHA')
  validateArtifactPolicy(policy)
  const rootStats = await lstat(root)
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) fail('ARTIFACT_SCAN_ROOT', 'root must be a real directory')
  const resolvedRoot = await realpath(root)
  const files = await walk(resolvedRoot)
  if (files.length === 0) fail('ARTIFACT_SCAN_EMPTY', 'artifact root has no files')

  const extensions = new Set(policy.textExtensions)
  const rules = policy.rules.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern, rule.flags) }))
  const findings = []
  let scannedTextFiles = 0
  let scannedTextBytes = 0
  for (const file of files) {
    if (!extensions.has(path.extname(file.relative).toLowerCase())) continue
    const content = await readFile(file.absolute, 'utf8')
    scannedTextFiles += 1
    scannedTextBytes += Buffer.byteLength(content)
    for (const rule of rules) {
      rule.regex.lastIndex = 0
      const match = rule.regex.exec(content)
      if (!match) continue
      findings.push({
        ruleId: rule.id,
        path: file.relative,
        matchSha256: createHash('sha256').update(match[0]).digest('hex'),
      })
    }
  }
  findings.sort((left, right) => left.path.localeCompare(right.path, 'en') || left.ruleId.localeCompare(right.ruleId, 'en'))

  return {
    schemaVersion: 1,
    policyId: policy.policyId,
    policySha256: createHash('sha256').update(policyBytes).digest('hex'),
    candidateSha,
    rootLabel: path.basename(resolvedRoot),
    status: findings.length === 0 ? 'PASS' : 'FAIL',
    scannedFiles: files.length,
    scannedTextFiles,
    scannedTextBytes,
    findings,
  }
}
