import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateGatePlan } from './checkpoint-gate-lib.mjs'

const planPath = new URL('../../data/phase-ii-release/checkpoint-gate-plan.json', import.meta.url)
const base = JSON.parse(await readFile(planPath, 'utf8'))

function clone(value) {
  return structuredClone(value)
}

function expectFailure(name, mutate, expected) {
  const candidate = clone(base)
  mutate(candidate)
  assert.throws(
    () => validateGatePlan(candidate),
    (error) => error instanceof Error && error.message.startsWith(`${expected}:`),
    name,
  )
  console.log(`PASS ${name} -> ${expected}`)
}

validateGatePlan(base)
console.log('PASS BASE_GATE_PLAN -> PASS')

expectFailure('MUTATION_DUPLICATE_LANE', (plan) => {
  plan.lanes.push(clone(plan.lanes[0]))
}, 'CHECKPOINT_LANE_DUPLICATE')

expectFailure('MUTATION_MISSING_LANE', (plan) => {
  plan.lanes.pop()
}, 'CHECKPOINT_COMMAND_SET')

expectFailure('MUTATION_WRONG_BRANCH', (plan) => {
  plan.lanes[0].branch = 'codex/qimmah-web-sovereign-001'
}, 'CHECKPOINT_BRANCH')

expectFailure('MUTATION_MISSING_COMMAND', (plan) => {
  plan.lanes[1].commands.pop()
}, 'CHECKPOINT_COMMAND_SET')

expectFailure('MUTATION_DUPLICATE_COMMAND', (plan) => {
  plan.lanes[2].commands.push(clone(plan.lanes[2].commands[0]))
}, 'CHECKPOINT_COMMAND_DUPLICATE')

expectFailure('MUTATION_SHELL_EXECUTABLE', (plan) => {
  plan.lanes[3].commands[0].executable = 'sh'
}, 'CHECKPOINT_EXECUTABLE')

expectFailure('MUTATION_SCRIPT_TRAVERSAL', (plan) => {
  plan.lanes[0].commands[0].args[0] = '../web-sovereign/script.mjs'
}, 'CHECKPOINT_COMMAND_PATH')

expectFailure('MUTATION_SHELL_OPERATOR', (plan) => {
  plan.lanes[0].commands[0].args.push('|| true')
}, 'CHECKPOINT_SHELL_TOKEN')

expectFailure('MUTATION_UNAPPROVED_ARGUMENT', (plan) => {
  plan.lanes[0].commands[0].args.push('--output=/tmp/pass')
}, 'CHECKPOINT_ARGUMENT')

console.log('CHECKPOINT_GATE_PROOF: PASS (10/10)')
