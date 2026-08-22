import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { assertFullSha, digestOutput, loadGatePlan } from './checkpoint-gate-lib.mjs'

const defaultPlan = new URL('../../data/phase-ii-release/checkpoint-gate-plan.json', import.meta.url)

function usage() {
  return 'Usage: node scripts/phase-ii-release/run-checkpoint-gate.mjs --lane id=/absolute/root --expect id=<40-char-sha> [repeat] [--output /absolute/report.json]'
}

function parsePairs(argv) {
  const lanes = new Map()
  const expected = new Map()
  let output = null
  let planPath = defaultPlan
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`CHECKPOINT_ARGUMENT: missing value for ${flag}`)
    if (flag === '--output') {
      output = value
    } else if (flag === '--plan') {
      planPath = value
    } else if (flag === '--lane' || flag === '--expect') {
      const separator = value.indexOf('=')
      if (separator < 1) throw new Error(`CHECKPOINT_ARGUMENT: ${flag} needs id=value`)
      const id = value.slice(0, separator)
      const item = value.slice(separator + 1)
      const target = flag === '--lane' ? lanes : expected
      if (target.has(id)) throw new Error(`CHECKPOINT_ARGUMENT: duplicate ${flag} for ${id}`)
      target.set(id, item)
    } else {
      throw new Error(`CHECKPOINT_ARGUMENT: unknown flag ${flag}`)
    }
    index += 1
  }
  return { lanes, expected, output, planPath }
}

function run(program, args, cwd) {
  return spawnSync(program, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    maxBuffer: 16 * 1024 * 1024,
  })
}

function gitValue(root, args, guard) {
  const result = run('git', args, root)
  if (result.status !== 0) throw new Error(`${guard}: ${result.stderr.trim() || 'git command failed'}`)
  return result.stdout.trim()
}

async function main() {
  const parsed = parsePairs(process.argv.slice(2))
  const { plan, sha256: planSha256 } = await loadGatePlan(parsed.planPath)
  const requiredIds = new Set(plan.lanes.map((lane) => lane.id))
  if (parsed.lanes.size !== requiredIds.size || parsed.expected.size !== requiredIds.size) {
    throw new Error('CHECKPOINT_INPUT_SET: every planned lane needs one --lane and one --expect')
  }
  for (const id of [...parsed.lanes.keys(), ...parsed.expected.keys()]) {
    if (!requiredIds.has(id)) throw new Error(`CHECKPOINT_INPUT_SET: unknown lane ${id}`)
  }

  const report = {
    schemaVersion: 1,
    planId: plan.planId,
    planSha256,
    generatedAt: new Date().toISOString(),
    overall: 'PASS',
    lanes: [],
  }

  for (const lane of plan.lanes) {
    const root = parsed.lanes.get(lane.id)
    if (!path.isAbsolute(root)) throw new Error(`CHECKPOINT_ROOT: ${lane.id} root must be absolute`)
    const expectedHead = assertFullSha(parsed.expected.get(lane.id), lane.id)
    const actualHead = gitValue(root, ['rev-parse', 'HEAD'], 'CHECKPOINT_GIT_HEAD')
    const actualBranch = gitValue(root, ['branch', '--show-current'], 'CHECKPOINT_GIT_BRANCH')
    const status = gitValue(root, ['status', '--porcelain'], 'CHECKPOINT_GIT_STATUS')
    if (actualHead !== expectedHead) throw new Error(`CHECKPOINT_HEAD_MISMATCH: ${lane.id} expected ${expectedHead}, got ${actualHead}`)
    if (actualBranch !== lane.branch) throw new Error(`CHECKPOINT_BRANCH_MISMATCH: ${lane.id} expected ${lane.branch}, got ${actualBranch}`)
    if (status !== '') throw new Error(`CHECKPOINT_WORKTREE_DIRTY: ${lane.id} has uncommitted changes`)

    const laneReport = { id: lane.id, branch: actualBranch, head: actualHead, status: 'PASS', commands: [] }
    for (const command of lane.commands) {
      const result = run(process.execPath, command.args, root)
      const commandReport = {
        id: command.id,
        status: result.status === 0 ? 'PASS' : 'FAIL',
        exitCode: result.status,
        signal: result.signal,
        stdoutSha256: digestOutput(result.stdout),
        stderrSha256: digestOutput(result.stderr),
      }
      laneReport.commands.push(commandReport)
      console.log(`${commandReport.status} ${lane.id}/${command.id}`)
      if (result.status !== 0) {
        report.overall = 'FAIL'
        laneReport.status = 'FAIL'
        report.lanes.push(laneReport)
        throw new Error(`CHECKPOINT_COMMAND_FAILED: ${lane.id}/${command.id}\n${result.stdout}${result.stderr}`)
      }
    }
    report.lanes.push(laneReport)
  }

  if (parsed.output) {
    if (!path.isAbsolute(parsed.output)) throw new Error('CHECKPOINT_OUTPUT: output must be absolute')
    await mkdir(path.dirname(parsed.output), { recursive: true })
    await writeFile(parsed.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
  }
  console.log(`CHECKPOINT_GATE: ${report.overall} (${report.lanes.reduce((sum, lane) => sum + lane.commands.length, 0)} commands)`)
}

main().catch((error) => {
  console.error(error.message)
  console.error(usage())
  process.exitCode = 1
})
