import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { scanArtifact, validateArtifactPolicy } from './artifact-policy-scan-lib.mjs'

function parseArgs(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!['--root', '--candidate-sha', '--policy'].includes(flag) || !value || values.has(flag)) {
      throw new Error('ARTIFACT_SCAN_ARGUMENT: expected unique --root, --candidate-sha, and optional --policy values')
    }
    values.set(flag, value)
  }
  if (!values.has('--root') || !values.has('--candidate-sha')) {
    throw new Error('ARTIFACT_SCAN_ARGUMENT: --root and --candidate-sha are required')
  }
  if (!path.isAbsolute(values.get('--root'))) throw new Error('ARTIFACT_SCAN_ARGUMENT: --root must be absolute')
  return values
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const policyPath = args.get('--policy') ?? new URL('../../data/phase-ii-release/artifact-scan-policy.json', import.meta.url)
  const policyBytes = await readFile(policyPath)
  const policy = JSON.parse(policyBytes.toString('utf8'))
  validateArtifactPolicy(policy)
  const report = await scanArtifact({
    root: args.get('--root'),
    candidateSha: args.get('--candidate-sha'),
    policy,
    policyBytes,
  })
  console.log(JSON.stringify(report, null, 2))
  if (report.status !== 'PASS') process.exitCode = 1
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
