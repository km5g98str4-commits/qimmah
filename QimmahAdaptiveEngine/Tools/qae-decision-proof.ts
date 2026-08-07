// QAE Phase 2 proof suite — every [CTO-QAE-003] exit criterion, checked by name.
// Rules used here are SYNTHETIC declarative data (classes/variables only):
// no nutrition, training, adaptation, question, or recovery logic exists.

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { sha256Hex } from '../Domain/Shared/sha256'
import { localDateToDays, localDate } from '../Domain/Shared/time'
import {
  assertPipelineProposal,
  evaluateRule,
  resolve,
} from '../Domain/Decisions/resolver'
import { buildManifest } from '../Domain/Decisions/manifest'
import { developerToken, explainDecision } from '../Domain/Decisions/explain'
import {
  DECISION_SCHEMA_VERSION,
  QAE_ENGINE_VERSION,
  type DecisionRequest,
  type RuleDef,
} from '../Domain/Decisions/model'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

// ── Synthetic rule set (declarative data only — no domain intelligence) ──────
const PACK_VERSIONS = { synthetic: '1.0.0' }
const R_RECOVERY: RuleDef = {
  ruleId: 'QAE-TST-010', version: '1.0.0', domain: 'synthetic',
  priorityClass: 'recovery', priorityScore: 60,
  preconditions: [{ op: 'gte', path: 'signalR', value: 2 }],
  requiredEvidence: [{ metric: 'metricR', minValidObservations: 3, minSpanDays: 7, minConfidence: 'moderate' }],
  action: {
    kind: 'composite', targetVariable: 'volume', direction: 'decrease', magnitude: 1000,
    changeClass: 'compositeSafetyRecovery',
    components: [{ kind: 'changeTrainingVolume', deltaBp: -1000 }, { kind: 'holdProgression' }],
  },
  reasonCodes: ['recoveryDeclining'], cooldownDays: 7, safetyImpact: 'protective',
}
const R_PROGRESS: RuleDef = {
  ruleId: 'QAE-TST-020', version: '1.0.0', domain: 'synthetic',
  priorityClass: 'goalProgress', priorityScore: 80,
  preconditions: [{ op: 'eq', path: 'signalP', value: true }],
  requiredEvidence: [{ metric: 'metricP', minValidObservations: 4, minSpanDays: 14, minConfidence: 'moderate' }],
  action: { kind: 'changeX', targetVariable: 'x', direction: 'decrease', magnitude: 100, changeClass: 'major' },
  reasonCodes: ['weightPlateauConfirmed', 'adherenceHigh'], cooldownDays: 14, safetyImpact: 'none',
}
const R_PROGRESS_ALT: RuleDef = {
  ...R_PROGRESS,
  ruleId: 'QAE-TST-021', priorityScore: 70,
  action: { kind: 'changeXAlt', targetVariable: 'x', direction: 'increase', magnitude: 50, changeClass: 'major' },
  reasonCodes: ['stepTargetConsistentlyMet'],
}
const R_MINOR: RuleDef = {
  ruleId: 'QAE-TST-030', version: '1.0.0', domain: 'synthetic',
  priorityClass: 'preference', priorityScore: 10,
  preconditions: [{ op: 'eq', path: 'signalM', value: true }],
  requiredEvidence: [],
  action: { kind: 'tweak', targetVariable: 'y', direction: 'neutral', magnitude: 1, changeClass: 'minor' },
  reasonCodes: ['progressOnTrack'], cooldownDays: 3, safetyImpact: 'none',
}
const R_SMUGGLER: RuleDef = {
  ruleId: 'QAE-TST-040', version: '1.0.0', domain: 'synthetic',
  priorityClass: 'recovery', priorityScore: 90,
  preconditions: [{ op: 'const', value: true }],
  requiredEvidence: [],
  action: {
    kind: 'composite', targetVariable: 'z', direction: 'decrease', magnitude: 0,
    changeClass: 'compositeSafetyRecovery',
    components: [
      { kind: 'changeCalories', deltaKcal: -300 },
      { kind: 'changeStepTarget', delta: 3000 },
      { kind: 'changeTrainingVolume', deltaBp: 2000 },
    ],
  },
  reasonCodes: ['recoveryDeclining'], cooldownDays: 7, safetyImpact: 'protective',
}
const ALL_RULES = [R_RECOVERY, R_PROGRESS, R_PROGRESS_ALT, R_MINOR]

const baseRequest: DecisionRequest = {
  now: { epochMs: 1785542400000, tzOffsetMinutes: 180 },
  seed: 0,
  oracleVersion: 'none',
  facts: { signalR: 3, signalP: true, signalM: true },
  series: [
    { metric: 'metricR', validCount: 5, spanDays: 10, confidence: 'high' },
    { metric: 'metricP', validCount: 6, spanDays: 16, confidence: 'moderate' },
  ],
  adaptationHistory: [],
}

const deepFreeze = <T,>(obj: T): T => {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj)
    for (const v of Object.values(obj as object)) deepFreeze(v)
  }
  return obj
}

// ── 1 · SHA-256 vectors (manifest hashing foundation) ────────────────────────
check('sha256 empty vector', sha256Hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
check('sha256 abc vector', sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
check('sha256 utf8 (Arabic) stable', sha256Hex('قمة') === sha256Hex('قمة') && sha256Hex('قمة').length === 64)

// ── 2 · 100% determinism + replayability ─────────────────────────────────────
const run1 = resolve(deepFreeze(structuredClone(baseRequest)), ALL_RULES, PACK_VERSIONS)
const run2 = resolve(structuredClone(baseRequest), ALL_RULES, PACK_VERSIONS)
check('determinism: byte-identical repeat', canonicalSerialize(run1) === canonicalSerialize(run2))
const permuted = resolve(structuredClone(baseRequest), [R_MINOR, R_PROGRESS_ALT, R_RECOVERY, R_PROGRESS], PACK_VERSIONS)
check('determinism: rule-order permutation invariant', canonicalSerialize(run1) === canonicalSerialize(permuted))
check('replay law: same inputs+manifest+seed+engineVersion ⇒ byte-identical proposal', canonicalSerialize(run1.proposals) === canonicalSerialize(run2.proposals))

// ── 3 · Zero side effects / zero hidden state / zero mutable globals ─────────
check('zero side effects: frozen request evaluated without mutation throw', run1.proposals.length > 0)
const iso1 = resolve(structuredClone(baseRequest), ALL_RULES, PACK_VERSIONS)
resolve({ ...structuredClone(baseRequest), facts: { signalR: 0, signalP: false, signalM: false } }, ALL_RULES, PACK_VERSIONS)
const iso2 = resolve(structuredClone(baseRequest), ALL_RULES, PACK_VERSIONS)
check('zero hidden state: interleaved evaluations independent', canonicalSerialize(iso1) === canonicalSerialize(iso2))
const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set by runner')
const decisionsDir = resolvePath(qaeRoot, 'Domain/Decisions')
const moduleStateHits: string[] = []
for (const f of readdirSync(decisionsDir)) {
  const src = readFileSync(join(decisionsDir, f), 'utf8')
  for (const line of src.split('\n')) {
    if (/^(export )?(let|var) /.test(line)) moduleStateHits.push(`${f}: ${line.trim()}`)
    if (/Date\.now|Math\.random|new Date\(/.test(line)) moduleStateHits.push(`${f}: ${line.trim()}`)
  }
}
check('zero mutable globals + no ambient time/randomness (source scan)', moduleStateHits.length === 0, moduleStateHits.join(' | '))

// ── 4 · Priority: recovery beats goalProgress (S34 shape, synthetic) ─────────
const kinds = run1.proposals.map((p) => p.action.kind)
check('S34-shape: recovery composite wins the major slot', kinds.includes('composite'))
check('S34-shape: goalProgress major suppressed by budget', !kinds.includes('changeX') && run1.trace.suppressed.some((s) => s.ruleId === 'QAE-TST-020' && s.reasonCodes.includes('changeBudgetExhausted')))
check('budget: ≤1 major/composite + ≤1 minor', run1.proposals.filter((p) => p.changeClass !== 'minor').length <= 1 && run1.proposals.filter((p) => p.changeClass === 'minor').length <= 1)
check('same-variable conflict: TST-021 lost to TST-020 by name', run1.trace.suppressed.some((s) => s.ruleId === 'QAE-TST-021' && s.suppressedBy === 'QAE-TST-020' && s.reasonCodes.includes('conflictResolvedByPriority')))

// ── 5 · Composite legality inside the pipeline (bypass attempt) ──────────────
const withSmuggler = resolve(structuredClone(baseRequest), [...ALL_RULES, R_SMUGGLER], PACK_VERSIONS)
check('bypass: smuggled composite suppressed by name', withSmuggler.trace.suppressed.some((s) => s.ruleId === 'QAE-TST-040' && s.suppressedBy === 'QAE-SAF-COMPOSITE' && s.reasonCodes.includes('compositeContainsNonProtectiveAction')))
check('bypass: smuggler never reaches proposals', !withSmuggler.proposals.some((p) => p.ruleId === 'QAE-TST-040'))
check('composite evaluation order fixed as declared', JSON.stringify(run1.proposals.find((p) => p.action.kind === 'composite')?.action.components?.map((c) => c.kind)) === JSON.stringify(['changeTrainingVolume', 'holdProgression']))

// ── 6 · Every rejection reason coded ─────────────────────────────────────────
const evidenceFail = resolve({ ...structuredClone(baseRequest), series: [] }, [R_PROGRESS], PACK_VERSIONS)
check('rejection: evidence gaps named', evidenceFail.trace.insufficientEvidence[0]?.gaps.includes('metricP:missing'))
const precondFail = resolve({ ...structuredClone(baseRequest), facts: { signalP: false } }, [R_PROGRESS], PACK_VERSIONS)
check('rejection: precondition coded (Positive/Negative proof pair)', precondFail.trace.notFired[0]?.reasonCodes.includes('preconditionNotMet'))
const cooled = resolve(
  { ...structuredClone(baseRequest), adaptationHistory: [{ targetVariable: 'x', direction: 'decrease', decidedOnDate: '2026-07-29', outcome: 'accepted' }] },
  [R_PROGRESS], PACK_VERSIONS,
)
check('rejection: accepted-cooldown coded', cooled.trace.suppressed.some((s) => s.reasonCodes.includes('cooldownActive')))
const nagged = resolve(
  { ...structuredClone(baseRequest), adaptationHistory: [{ targetVariable: 'x', direction: 'decrease', decidedOnDate: '2026-07-29', outcome: 'rejected' }] },
  [R_PROGRESS], PACK_VERSIONS,
)
check('rejection: rejected-cooldown (no re-nag) coded', nagged.trace.suppressed.some((s) => s.reasonCodes.includes('proposalRejectedCooldown')))
check('cooldown: rejection in the OTHER direction does not suppress', resolve(
  { ...structuredClone(baseRequest), adaptationHistory: [{ targetVariable: 'x', direction: 'increase', decidedOnDate: '2026-07-29', outcome: 'rejected' }] },
  [R_PROGRESS], PACK_VERSIONS,
).proposals.some((p) => p.ruleId === 'QAE-TST-020'))

// ── 7 · keepPlan is first-class and explained ────────────────────────────────
const nothing = resolve({ ...structuredClone(baseRequest), facts: {}, series: [] }, ALL_RULES, PACK_VERSIONS)
check('keepPlan emitted when nothing fires', nothing.proposals.length === 1 && nothing.proposals[0].action.kind === 'keepPlan')
check('keepPlan carries reasons + full provenance', nothing.proposals[0].reasonCodes.includes('noCandidateFired') && nothing.proposals[0].provenance.origin === 'QAE-DEC-000')

// ── 8 · Provenance completeness + seal ───────────────────────────────────────
for (const p of run1.proposals) {
  const pv = p.provenance
  check(`provenance complete for ${p.ruleId}`,
    pv.origin === p.ruleId && pv.engineVersion === QAE_ENGINE_VERSION && pv.decisionSchemaVersion === DECISION_SCHEMA_VERSION &&
    /^[0-9a-f]{64}$/.test(pv.ruleManifest) &&
    pv.oracleVersion === 'none' && pv.timestamp === baseRequest.now.epochMs && pv.seed === 0 && pv.pipelineStage === 'budgeted')
}
check('provenance manifest matches result manifest', run1.proposals.every((p) => p.provenance.ruleManifest === run1.manifest.contentHash))
let sealOk = true
try { for (const p of run1.proposals) assertPipelineProposal(p) } catch { sealOk = false }
check('sealed proposals pass assertPipelineProposal', sealOk)
let forgeryNamed = false
try { assertPipelineProposal({ ...run1.proposals[0] }) } catch (e) { forgeryNamed = e instanceof Error && e.message.startsWith('QAE-PROVENANCE-BYPASS') }
check('forged proposal fails BY NAME (QAE-PROVENANCE-BYPASS)', forgeryNamed)

// ── 9 · Manifest identity ────────────────────────────────────────────────────
check('manifest: rule order does not change hash', buildManifest(ALL_RULES, PACK_VERSIONS).contentHash === buildManifest([R_MINOR, R_RECOVERY, R_PROGRESS_ALT, R_PROGRESS], PACK_VERSIONS).contentHash)
check('manifest: any rule edit changes hash', buildManifest([{ ...R_MINOR, priorityScore: 11 }, R_RECOVERY, R_PROGRESS, R_PROGRESS_ALT], PACK_VERSIONS).contentHash !== run1.manifest.contentHash)

// ── 10 · Individually testable rules + trace totality ────────────────────────
const single = evaluateRule(R_PROGRESS, structuredClone(baseRequest))
check('single rule individually testable', single.status === 'fired' && single.reasonCodes.includes('weightPlateauConfirmed'))
const accounted = new Set<string>([
  ...run1.trace.fired,
  ...run1.trace.suppressed.map((s) => s.ruleId),
  ...run1.trace.notFired.map((n) => n.ruleId),
  ...run1.trace.insufficientEvidence.map((g) => g.ruleId),
])
check('trace totality: every rule accounted for', ALL_RULES.every((r) => accounted.has(r.ruleId)))
check('every proposal has ≥1 reason code', run1.proposals.every((p) => p.reasonCodes.length >= 1))

// ── 11 · Explainability: single source, layers never mix ([CTO-QAE-004] §6) ──
const ex = explainDecision(run1)
check('developer tokens SCREAMING_SNAKE', ex.developer.every((t) => /^[A-Z0-9_]+$/.test(t)) && developerToken('calorieFloorApplied') === 'CALORIE_FLOOR_APPLIED')
check('audit sentences structured + English-templated', ex.audit.every((s) => /^Rule QAE-/.test(s)))
check('user layer is codes only (no sentences, no Arabic)', ex.user.every((c) => /^[a-z][a-zA-Z0-9]*$/.test(c)))
check('single source: developer/audit are projections of the same entries', ex.developer.length === ex.developerEntries.length && ex.audit.length === ex.developerEntries.length)
check('single source: every user code exists in a developer entry', ex.user.every((c) => ex.developerEntries.some((e) => e.code === c && e.event === 'proposed')))
check('single source: audit embeds the developer token', ex.developerEntries.every((e, i) => e.event === 'insufficientEvidence' || ex.audit[i].includes(e.token)))

// ── 11b · Pipeline invariants I5/I7 ([CTO-QAE-004] / PIPELINE_INVARIANTS.md) ──
// I5 budget blindness: renaming kinds/variables' NAMES (keeping classes and
// grouping structure) must not change which classes win the budget.
const renameAction = (r: RuleDef, kind: string, variable: string): RuleDef => ({ ...r, action: { ...r.action, kind, targetVariable: variable } })
const renamedRules = [
  renameAction(R_RECOVERY, 'opaqueA', 'v1'),
  renameAction(R_PROGRESS, 'opaqueB', 'v2'),
  renameAction(R_MINOR, 'opaqueC', 'v3'),
]
const originalRun = resolve(structuredClone(baseRequest), [R_RECOVERY, { ...R_PROGRESS, action: { ...R_PROGRESS.action, targetVariable: 'v2unique' } }, R_MINOR], PACK_VERSIONS)
const renamedRun = resolve(structuredClone(baseRequest), renamedRules, PACK_VERSIONS)
check('I5 budget blindness: kind/variable names do not affect budget outcomes',
  canonicalSerialize(originalRun.proposals.map((p) => [p.ruleId, p.changeClass])) === canonicalSerialize(renamedRun.proposals.map((p) => [p.ruleId, p.changeClass])))
// I7 pipeline never mutates the request: byte-identical before and after.
const pristine = structuredClone(baseRequest)
const before = canonicalSerialize(pristine)
resolve(pristine, ALL_RULES, PACK_VERSIONS)
check('I7 request unmutated (pre/post byte-identical)', canonicalSerialize(pristine) === before)

// ── 12 · Time helpers backing cooldowns ──────────────────────────────────────
check('localDateToDays inverse of localDate', localDateToDays(localDate(1785542400000, 180)) === Math.floor((1785542400000 + 180 * 60000) / 86400000))
let badDateNamed = false
try { localDateToDays('2026-13-99x') } catch (e) { badDateNamed = e instanceof Error && e.message.startsWith('QAE-TIME-VIOLATION') }
check('malformed date fails by name', badDateNamed)

console.log(`qae-decision-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
