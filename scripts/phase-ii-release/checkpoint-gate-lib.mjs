import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const EXPECTED_COMMANDS = Object.freeze({
  release: Object.freeze([
    'release-evidence-fixture',
    'release-evidence-validate',
    'release-evidence-proof',
    'release-artifact-proof',
  ]),
  food: Object.freeze([
    'food-seed-reproducibility',
    'food-seed-validate',
    'food-seed-proof',
  ]),
  exercise: Object.freeze([
    'exercise-ledger-reproducibility',
    'exercise-ledger-validate',
    'exercise-ledger-proof',
    'exercise-image-jobs-reproducibility',
    'exercise-image-jobs-validate',
    'exercise-image-jobs-proof',
    'exercise-video-reproducibility',
    'exercise-video-validate',
    'exercise-video-proof',
  ]),
  executive: Object.freeze([
    'executive-fixture-reproducibility',
    'executive-fixture-proof',
  ]),
})

const EXPECTED_BRANCHES = Object.freeze({
  release: 'i/phase-ii-release-convergence-002',
  food: 'c/phase-ii-food-production-002',
  exercise: 'h/phase-ii-exercise-production-002',
  executive: 'e/phase-ii-executive-dashboard-002',
})

const SAFE_ID = /^[a-z][a-z0-9-]*$/
const FULL_SHA = /^[0-9a-f]{40}$/
const FORBIDDEN_ARG = /(?:\|\||&&|[|;`\n\r\0])/u

function fail(name, detail) {
  throw new Error(`${name}: ${detail}`)
}

export function assertFullSha(value, label) {
  if (typeof value !== 'string' || !FULL_SHA.test(value)) {
    fail('CHECKPOINT_SHA', `${label} must be a lowercase 40-character Git SHA`)
  }
  return value
}

function assertSafeRelativeScript(value, commandId) {
  if (typeof value !== 'string' || value.length === 0) {
    fail('CHECKPOINT_COMMAND_PATH', `${commandId} needs a script path`)
  }
  if (FORBIDDEN_ARG.test(value) || value.includes('\\')) {
    fail('CHECKPOINT_SHELL_TOKEN', `${commandId} contains a forbidden shell token`)
  }
  if (path.isAbsolute(value)) {
    fail('CHECKPOINT_COMMAND_PATH', `${commandId} uses an absolute path`)
  }
  const normalized = path.posix.normalize(value)
  if (normalized !== value || normalized.startsWith('../') || !normalized.startsWith('scripts/')) {
    fail('CHECKPOINT_COMMAND_PATH', `${commandId} escapes scripts/**`)
  }
}

function assertExactSet(actual, expected, label) {
  const actualSorted = [...actual].sort()
  const expectedSorted = [...expected].sort()
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail('CHECKPOINT_COMMAND_SET', `${label} command IDs differ from the required set`)
  }
}

export function validateGatePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    fail('CHECKPOINT_SCHEMA', 'plan must be an object')
  }
  if (plan.schemaVersion !== 1 || plan.planId !== 'qimmah-phase-ii-checkpoint-gate-v1') {
    fail('CHECKPOINT_SCHEMA', 'schemaVersion or planId is not accepted')
  }
  if (!Array.isArray(plan.lanes)) fail('CHECKPOINT_SCHEMA', 'lanes must be an array')

  const laneIds = plan.lanes.map((lane) => lane?.id)
  if (new Set(laneIds).size !== laneIds.length) fail('CHECKPOINT_LANE_DUPLICATE', 'lane IDs must be unique')
  assertExactSet(laneIds, Object.keys(EXPECTED_COMMANDS), 'plan')

  for (const lane of plan.lanes) {
    if (!lane || typeof lane !== 'object' || !SAFE_ID.test(lane.id)) {
      fail('CHECKPOINT_SCHEMA', 'lane ID is malformed')
    }
    if (lane.branch !== EXPECTED_BRANCHES[lane.id]) {
      fail('CHECKPOINT_BRANCH', `${lane.id} must use its isolated -002 branch`)
    }
    if (!Array.isArray(lane.commands)) fail('CHECKPOINT_SCHEMA', `${lane.id}.commands must be an array`)
    const commandIds = lane.commands.map((command) => command?.id)
    if (new Set(commandIds).size !== commandIds.length) {
      fail('CHECKPOINT_COMMAND_DUPLICATE', `${lane.id} command IDs must be unique`)
    }
    assertExactSet(commandIds, EXPECTED_COMMANDS[lane.id], lane.id)

    for (const command of lane.commands) {
      if (!command || typeof command !== 'object' || !SAFE_ID.test(command.id)) {
        fail('CHECKPOINT_SCHEMA', `${lane.id} has a malformed command`)
      }
      if (command.executable !== 'node') {
        fail('CHECKPOINT_EXECUTABLE', `${command.id} must use the pinned Node runtime`)
      }
      if (!Array.isArray(command.args) || command.args.length < 1) {
        fail('CHECKPOINT_SCHEMA', `${command.id}.args must be a non-empty array`)
      }
      if (command.args.some((arg) => typeof arg !== 'string' || FORBIDDEN_ARG.test(arg))) {
        fail('CHECKPOINT_SHELL_TOKEN', `${command.id} contains an unsafe argument`)
      }
      assertSafeRelativeScript(command.args[0], command.id)
      for (const arg of command.args.slice(1)) {
        if (!/^--[a-z][a-z0-9-]*$/.test(arg) && !/^data\/[a-zA-Z0-9._/-]+$/.test(arg)) {
          fail('CHECKPOINT_ARGUMENT', `${command.id} contains an unapproved argument: ${arg}`)
        }
        if (arg.includes('..')) fail('CHECKPOINT_ARGUMENT', `${command.id} contains a traversal argument`)
      }
    }
  }
  return plan
}

export async function loadGatePlan(filePath) {
  const bytes = await readFile(filePath)
  const plan = JSON.parse(bytes.toString('utf8'))
  validateGatePlan(plan)
  return {
    plan,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export function digestOutput(value) {
  return createHash('sha256').update(value ?? '').digest('hex')
}
