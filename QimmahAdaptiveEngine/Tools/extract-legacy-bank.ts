// [CTO-QAE-005] §2/§3 — Legacy bank extraction, conversion, inventory, and
// materiality audit. Characterize → map → classify → migrate; no silent
// discards: all 193 legacy questions get an inventory record and a disposition.
// Bundled with @→src by run-extract-legacy-bank.mjs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { QUESTION_BANK } from '@/lib/personalization/bank'
import { CONFLICTS } from '@/lib/personalization/contradictions'
import { BODY_AREAS, EQUIPMENT_VOCAB, type Condition } from '@/lib/personalization/types'
import type { Predicate } from '../Domain/Decisions/model'
import type { QuestionDef } from '../Domain/Questions/model'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import { sha256Hex } from '../Domain/Shared/sha256'

const qaeRoot = process.env.QAE_ROOT
const repoRoot = process.env.REPO_ROOT
if (!qaeRoot || !repoRoot) throw new Error('QAE_ROOT/REPO_ROOT not set by runner')

// ── Condition → Predicate conversion (fidelity-preserving, mechanical) ───────
type LegacyCondition = Condition

function stripPrefix(field: string): string {
  return field.startsWith('answers.') ? field.slice('answers.'.length) : field
}

function convertCondition(cond: LegacyCondition | undefined): Predicate | undefined {
  if (!cond) return undefined
  if ('const' in cond) return { op: 'const', value: cond.const }
  if ('all' in cond) return { op: 'all', children: cond.all.map((c) => convertCondition(c) as Predicate) }
  if ('any' in cond) return { op: 'any', children: cond.any.map((c) => convertCondition(c) as Predicate) }
  if ('not' in cond) return { op: 'not', child: convertCondition(cond.not) as Predicate }
  const path = stripPrefix(cond.field)
  const value = cond.value
  switch (cond.op) {
    case 'eq': return { op: 'eq', path, value: value as never }
    case 'ne': return { op: 'ne', path, value: value as never }
    case 'in': return { op: 'in', path, values: value as never }
    case 'nin': return { op: 'nin', path, values: value as never }
    case 'gt': return { op: 'gt', path, value: value as number }
    case 'gte': return { op: 'gte', path, value: value as number }
    case 'lt': return { op: 'lt', path, value: value as number }
    case 'lte': return { op: 'lte', path, value: value as number }
    case 'answered': return { op: 'exists', path }
    case 'unanswered': return { op: 'notExists', path }
    // Array ops map onto the multi-normalization shape (`key.option` boolean facts).
    case 'has': return { op: 'eq', path: `${path}.${String(value)}`, value: true }
    case 'hasAny': return { op: 'any', children: (value as string[]).map((v) => ({ op: 'eq', path: `${path}.${v}`, value: true }) as Predicate) }
    case 'hasNone': return { op: 'all', children: (value as string[]).map((v) => ({ op: 'not', child: { op: 'eq', path: `${path}.${v}`, value: true } }) as Predicate) }
    default: throw new Error(`unknown legacy op ${(cond as { op?: string }).op}`)
  }
}

/**
 * Legacy clarify questions gate on derived.conflict_* flags because they lived
 * in the general pool. QAE serves clarifies EXCLUSIVELY through the conflict
 * stage (detect already evaluated), so those leaves become const-true here —
 * the conflict stage is the gate, not the eligibility predicate.
 */
function stripConflictFlagLeaves(pred: Predicate | undefined): Predicate | undefined {
  if (!pred) return undefined
  if (pred.op === 'all' || pred.op === 'any') {
    return { op: pred.op, children: pred.children.map((c) => stripConflictFlagLeaves(c) as Predicate) }
  }
  if (pred.op === 'not') return { op: 'not', child: stripConflictFlagLeaves(pred.child) as Predicate }
  if ('path' in pred && pred.path.startsWith('derived.conflict_')) return { op: 'const', value: true }
  return pred
}

function mapLeaves(pred: Predicate, fn: (leaf: Predicate) => Predicate): Predicate {
  if (pred.op === 'all' || pred.op === 'any') {
    return { op: pred.op, children: pred.children.map((c) => mapLeaves(c, fn)) }
  }
  if (pred.op === 'not') return { op: 'not', child: mapLeaves(pred.child, fn) }
  return fn(pred)
}

// [CTO-QAE-007] §2 — Policy B: the returning-user follow-ups become required-
// when-eligible. Their eligibility already gates on lastTrained ∈ {m3_12,
// y1_plus}, so ONLY returning journeys change (≤2 of the 16-question budget);
// non-returning journeys never see them in the required stage.
const POLICY_B_REQUIRED = new Set(['x-return-reason', 'x-return-ramp'])

function conditionFields(cond: LegacyCondition | undefined, into: Set<string>): void {
  if (!cond) return
  if ('all' in cond) cond.all.forEach((c) => conditionFields(c, into))
  else if ('any' in cond) cond.any.forEach((c) => conditionFields(c, into))
  else if ('not' in cond) conditionFields(cond.not, into)
  else if ('field' in cond) into.add(stripPrefix(cond.field).split('.')[0])
}

// ── Answer-type mapping ([CTO-QAE-005]: PRESERVE_WITH_MAPPING where remapped) ─
const WEEKDAY_OPTIONS = ['0', '1', '2', '3', '4', '5', '6']
interface TypeMap { answerType: QuestionDef['answerType']; injectedOptions?: readonly string[]; remapped: boolean }
function mapAnswerType(legacyType: string, hasOptions: boolean): TypeMap {
  switch (legacyType) {
    case 'single': return { answerType: 'single', remapped: false }
    case 'multi': return { answerType: 'multi', remapped: false }
    case 'number': return { answerType: 'number', remapped: false }
    case 'boolean': return { answerType: 'boolean', remapped: false }
    case 'slider': return { answerType: 'number', remapped: true }
    case 'rank': return { answerType: 'multi', remapped: true }
    case 'weekdays': return { answerType: 'multi', injectedOptions: WEEKDAY_OPTIONS, remapped: true }
    case 'bodyAreas': return { answerType: 'multi', injectedOptions: BODY_AREAS as readonly string[], remapped: true }
    case 'equipment': return { answerType: 'multi', injectedOptions: EQUIPMENT_VOCAB as readonly string[], remapped: true }
    case 'exercises': return { answerType: 'openList', remapped: true }
    case 'text': return { answerType: 'text', remapped: true }
    case 'time': return { answerType: hasOptions ? 'single' : 'text', remapped: true }
    default: throw new Error(`unmapped legacy answer type: ${legacyType}`)
  }
}

// ── Verified materiality: what deriveProfile ACTUALLY reads (closes L-QST-2) ─
const profileSrc = readFileSync(resolvePath(repoRoot, 'src/lib/personalization/profile.ts'), 'utf8')
const contradictionsSrc = readFileSync(resolvePath(repoRoot, 'src/lib/personalization/contradictions.ts'), 'utf8')
const experienceSrc = readFileSync(resolvePath(repoRoot, 'src/lib/personalization/experience.ts'), 'utf8')
const readKeys = new Set<string>()
// profile.ts readers use property access on the answers object: str(a.key), a.key === ...
for (const m of profileSrc.matchAll(/\ba\.([A-Za-z_$][\w$]*)/g)) readKeys.add(m[1])
for (const m of profileSrc.matchAll(/answers(?:\.|\[')([A-Za-z_$][\w$]*)/g)) readKeys.add(m[1])
// experience.ts consumes the 10 weighted signal keys (key: 'x' entries + property reads)
for (const m of experienceSrc.matchAll(/key:\s*'([^']+)'/g)) readKeys.add(m[1])
for (const m of experienceSrc.matchAll(/answers\.([A-Za-z_$][\w$]*)/g)) readKeys.add(m[1])

// ── QAE-spec consumers ([CTO-QAE-005] §3): keys not read by legacy derivation
// but with a NAMED consumer in an approved QAE spec. Each entry cites its spec.
const QAE_SPEC_MATERIAL: Readonly<Record<string, { categories: string[]; specRef: string }>> = {
  'b-weight-trend': { categories: ['adaptation'], specRef: 'ADAPTATION-POLICY §5 plateau/trend priors' },
  'g-plateau': { categories: ['adaptation'], specRef: 'ADAPTATION-POLICY §2 plateau history context' },
  'r-daily-steps': { categories: ['steps'], specRef: '[CTO-QAE-002] §14 baseline-derived step targets' },
  'r-meals-per-day': { categories: ['nutrition'], specRef: 'legacy planGenerator meal-count clamp (LEGACY-ENGINE-MAP §3)' },
  'r-appetite': { categories: ['nutrition'], specRef: 'legacy appetite-timing meal redistribution (LEGACY-ENGINE-MAP §3)' },
  'r-deload-history': { categories: ['adaptation', 'recovery'], specRef: 'EVR-010 deload scheduling' },
  'v-deload-pref': { categories: ['adaptation'], specRef: 'EVR-010 deload scheduling preference' },
  'v-set-to-failure': { categories: ['training'], specRef: 'EVR-012 RIR prescription policy' },
  'v-autoregulation': { categories: ['training'], specRef: 'EVR-012 autoregulation method selection' },
  'v-tempo-control': { categories: ['training'], specRef: 'ExerciseMetadata progressionCompatibility (tempo)' },
  'v-exercise-rotation': { categories: ['training'], specRef: 'substitution/variety policy (DOMAIN-MODEL §7 substitutionGroup)' },
  'v-block-length': { categories: ['adaptation'], specRef: 'EVR-010 block/deload cadence' },
  'v-warmup-sets': { categories: ['training'], specRef: 'legacy warmup module (LEGACY-ENGINE-MAP §3 warmup note)' },
  'v-metric-tracking': { categories: ['adaptation'], specRef: 'DATA-QUALITY §6 evidence availability planning' },
  'v-plan-edit-appetite': { categories: ['adaptation'], specRef: 'locked decision #3 proposal-frequency preference' },
  'a-time-of-day': { categories: ['training'], specRef: 'RAMADAN-CONTEXT §2 session-timing constraint surface' },
  'e-machine-access': { categories: ['training'], specRef: '[CTO-QAE-005] §6 capability evidence (machine access)' },
  'e-bench-kind': { categories: ['training'], specRef: '[CTO-QAE-005] §6 capability evidence (bench)' },
  'e-bands-only-detail': { categories: ['training'], specRef: '[CTO-QAE-005] §6 capability evidence (band inventory)' },
  'l-notes': { categories: ['safety'], specRef: '[CTO-QAE-005] §7 user-described limitation context (never parsed for meaning)' },
  'p-compound-bias': { categories: ['training'], specRef: 'U3 capability selection: Preference stage' },
  'p-variety': { categories: ['training'], specRef: 'U3 capability selection: Preference stage' },
  'p-exercise-complexity': { categories: ['training'], specRef: 'ExerciseMetadata technicalDifficulty preference' },
  'p-unilateral': { categories: ['training'], specRef: 'ExerciseMetadata laterality preference' },
  'p-session-structure': { categories: ['training'], specRef: 'session composition preference (U3 Preference stage)' },
  'p-superset-tolerance': { categories: ['training'], specRef: 'session density preference (U3 Preference stage)' },
  'p-stretch-time': { categories: ['training'], specRef: 'session time budgeting (warmup/mobility allocation)' },
}
const conflictKeys = new Set<string>()
for (const m of contradictionsSrc.matchAll(/a\.([A-Za-z_$][\w$]*)/g)) conflictKeys.add(m[1])

// ── Downstream-category mapping for the materiality audit ────────────────────
const CATEGORY_RULES: Array<[RegExp, string[]]> = [
  [/goal|pace|targetweight|recomp/i, ['profileClassification', 'nutrition', 'training']],
  [/consent|screen|clearance|injur|pain|surgery|restriction|medical|pregnan|dizz|faint|chest|balance|valsalva|impact|rom\b/i, ['safety']],
  [/split|volume|intensity|session|days|frequency|exercise|muscle|lift|progression|rir|rpe|tempo|warmup|style|machine|barbell|dumbbell|equipment|place|environment|gym|bodyweight|weight.*max|accessor/i, ['training']],
  [/cardio|endurance|steps|activity|sitting|walk/i, ['training', 'steps']],
  [/sleep|stress|fatigue|soreness|recovery|energy/i, ['recovery']],
  [/meal|diet|nutrition|appetite|cook|food|allerg|budget/i, ['nutrition']],
  [/experience|level|class|trained|months|consistency|familiar|track|program|knowledge|confidence|age\b|sex|height|weight|name/i, ['profileClassification']],
]
function categoriesFor(key: string, affects: readonly string[]): string[] {
  const cats = new Set<string>()
  for (const token of [key, ...affects]) {
    for (const [re, targets] of CATEGORY_RULES) {
      if (re.test(token)) targets.forEach((t) => cats.add(t))
    }
  }
  return [...cats].sort()
}

// ── Reachability data (characterized; used for dispositions) ─────────────────
const conflictClarifyIds = new Set(CONFLICTS.map((c) => c.clarify))
const followUpTargets = new Set<string>()
for (const def of QUESTION_BANK) for (const fu of def.followUps ?? []) for (const t of fu.ask) followUpTargets.add(t)

// ── Build inventory + QAE bank ───────────────────────────────────────────────
interface InventoryRecord {
  stableQuestionId: string
  legacyQuestionId: string
  category: string
  copyKey: string
  answerTypeLegacy: string
  answerTypeQae: string
  allowedValues: string[] | null
  range: { min: number; max: number } | null
  provides: string[]
  requires: string[]
  followUps: string[]
  conflicts: string[]
  materialityCategories: string[]
  materialityVerified: { readByProfileDerivation: boolean; usedInRouting: boolean; usedInConflicts: boolean }
  safetyRelevance: string
  infoGain: number
  legacyPriority: number
  required: boolean
  levels: string[] | null
  disposition: string
  dispositionReason: string
}

const inventory: InventoryRecord[] = []
const qaeBank: QuestionDef[] = []
const routingFieldUsage = new Set<string>()
for (const def of QUESTION_BANK) {
  conditionFields(def.eligible, routingFieldUsage)
  conditionFields(def.skipIf, routingFieldUsage)
  for (const fu of def.followUps ?? []) conditionFields(fu.when, routingFieldUsage)
}

for (const def of QUESTION_BANK) {
  const options = def.options?.map((o: { value: string }) => o.value) ?? null
  const tm = mapAnswerType(def.answer, options !== null && options.length > 0)
  const finalOptions = options && options.length > 0 ? options : tm.injectedOptions ? [...tm.injectedOptions] : null
  const isMulti = tm.answerType === 'multi' || tm.answerType === 'openList'
  const provides = isMulti ? [`${def.key}.count`] : [def.key]
  const requires = new Set<string>()
  conditionFields(def.eligible, requires)
  conditionFields(def.skipIf, requires)

  const readByProfile = readKeys.has(def.key)
  const usedInRouting = routingFieldUsage.has(def.key)
  const usedInConflicts = conflictKeys.has(def.key)
  const isConflictClarify = conflictClarifyIds.has(def.id)
  const isFollowUpTarget = followUpTargets.has(def.id)
  const specMaterial = QAE_SPEC_MATERIAL[def.id]
  const cats = categoriesFor(def.key, def.affects as readonly string[])
  if (usedInRouting || isConflictClarify) cats.push('questionRouting')
  if (specMaterial) cats.push(...specMaterial.categories)
  const material =
    readByProfile || usedInRouting || usedInConflicts || isConflictClarify || isFollowUpTarget ||
    specMaterial !== undefined || def.safety !== 'none' || def.required

  let disposition = 'PRESERVE'
  let reason = 'characterized behavior carried over'
  if (def.id === 'b-target-weight') {
    // L-QST-7 revival APPROVED by [CTO-QAE-007] §1 as a narrow REVIEW change:
    // the dead `answers.primaryGoal` leaf (nothing writes that key) is mapped to
    // the display key actually provided by g-primary, keeping the legacy intent —
    // weight-affecting goals only (cut/bulk ≡ fat_loss/muscle_gain/strength via
    // GOAL_FROM_DISPLAY) ∧ age ≥ 18. NOT globally required (stays optional).
    disposition = 'PRESERVE_WITH_MAPPING'
    reason = 'L-QST-7 revival per [CTO-QAE-007] §1: dead answers.primaryGoal leaf remapped to primaryGoalDisplay ∈ {fat_loss, muscle_gain, strength}; age≥18 gate kept; not required'
  } else if (POLICY_B_REQUIRED.has(def.id)) {
    disposition = 'PRESERVE_WITH_MAPPING'
    reason = 'Policy B per [CTO-QAE-007] §2: required-when-eligible for returning users (legacy required=false, starved in every recorded journey); eligibility gate unchanged'
  } else if (def.category === 'clarify' && !conflictClarifyIds.has(def.id) && !followUpTargets.has(def.id) && def.safety !== 'clear' && !def.required) {
    disposition = 'PRODUCT_DECISION_REQUIRED'
    reason = 'unreachable clarify (legacy L-QST-3); founder U4 policy: make reachable or delete at bank freeze — per-question fate needs product'
  } else if (!material) {
    disposition = 'REMOVE_NON_MATERIAL'
    reason = 'no verified downstream effect: key not read by profile/experience derivation, not used in routing/conflicts, no named QAE-spec consumer, not safety, not required'
  } else if (specMaterial && !readByProfile && !usedInRouting && !usedInConflicts) {
    disposition = tm.remapped ? 'PRESERVE_WITH_MAPPING' : 'PRESERVE'
    reason = `material via QAE-spec consumer: ${specMaterial.specRef}`
  } else if (tm.remapped) {
    disposition = 'PRESERVE_WITH_MAPPING'
    reason = `legacy answer type '${def.answer}' remapped to '${tm.answerType}'`
  }

  inventory.push({
    stableQuestionId: def.id,
    legacyQuestionId: def.id,
    category: def.category,
    copyKey: def.id,
    answerTypeLegacy: def.answer,
    answerTypeQae: tm.answerType,
    allowedValues: finalOptions,
    range: def.range ?? null,
    provides,
    requires: [...requires].sort(),
    followUps: (def.followUps ?? []).flatMap((f: { ask: readonly string[] }) => [...f.ask]),
    conflicts: CONFLICTS.filter((c) => c.clarify === def.id).map((c) => c.id),
    materialityCategories: [...new Set(cats)].sort(),
    materialityVerified: { readByProfileDerivation: readByProfile, usedInRouting, usedInConflicts },
    safetyRelevance: def.safety,
    infoGain: def.infoGain,
    legacyPriority: def.priority,
    required: def.required,
    levels: def.levels ? [...def.levels] : null,
    disposition,
    dispositionReason: reason,
  })

  if (disposition === 'REMOVE_NON_MATERIAL' || disposition === 'PRODUCT_DECISION_REQUIRED') continue

  const levelGate: Predicate | undefined = def.levels
    ? { op: 'in', path: 'derived.experienceClass', values: [...def.levels] }
    : undefined
  let converted = convertCondition(def.eligible)
  if (def.id === 'b-target-weight' && converted) {
    // [CTO-QAE-007] §1 leaf remap (L-QST-7): the internal goal keys cut/bulk
    // correspond to display values fat_loss/muscle_gain/strength.
    converted = mapLeaves(converted, (leaf) =>
      leaf.op === 'in' && leaf.path === 'primaryGoal'
        ? { op: 'in', path: 'primaryGoalDisplay', values: ['fat_loss', 'muscle_gain', 'strength'] }
        : leaf)
  }
  const baseEligible = stripConflictFlagLeaves(converted)
  const eligible = levelGate && baseEligible
    ? ({ op: 'all', children: [baseEligible, levelGate] } as Predicate)
    : (levelGate ?? baseEligible)

  qaeBank.push({
    id: def.id,
    key: def.key,
    copyKey: def.id,
    category: def.category,
    answerType: tm.answerType,
    ...(finalOptions ? { options: finalOptions } : {}),
    ...(def.range ? { range: def.range } : {}),
    ...(def.select ? { select: def.select } : {}),
    ...(eligible ? { eligible } : {}),
    ...(convertCondition(def.skipIf) ? { skipIf: convertCondition(def.skipIf) } : {}),
    ...(def.followUps && def.followUps.length > 0
      ? { followUps: def.followUps.map((f: { when: LegacyCondition; ask: readonly string[] }) => ({ when: convertCondition(f.when) as Predicate, ask: [...f.ask] })) }
      : {}),
    provides,
    safety: def.safety,
    priority: def.priority,
    required: def.required || POLICY_B_REQUIRED.has(def.id),
    skippable: def.skippable,
    infoGain: def.infoGain,
    sinceBankVersion: def.since,
  })
}

// Post-pass: follow-up targets must reference ACTIVE questions only — removed
// questions (non-material / product-decision) leave the reference behind, so
// strip them here; the empty follow-up entries drop entirely.
const activeIds = new Set(qaeBank.map((q) => q.id))
for (const q of qaeBank) {
  if (!q.followUps) continue
  const cleaned = q.followUps
    .map((fu) => ({ when: fu.when, ask: fu.ask.filter((t) => activeIds.has(t)) }))
    .filter((fu) => fu.ask.length > 0)
  if (cleaned.length > 0) (q as { followUps?: unknown }).followUps = cleaned
  else delete (q as { followUps?: unknown }).followUps
}

// ── Outputs ──────────────────────────────────────────────────────────────────
mkdirSync(resolvePath(qaeRoot, 'Contracts/content'), { recursive: true })
const bankJson = { questionSchemaVersion: '1.0.0', source: 'src/lib/personalization/bank (characterized conversion)', questions: qaeBank }
const bankManifestHash = sha256Hex(canonicalSerialize(bankJson))
writeFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.qae.json'), JSON.stringify({ ...bankJson, bankManifestHash }, null, 2) + '\n')
writeFileSync(resolvePath(qaeRoot, 'Contracts/content/question-inventory.json'), JSON.stringify({ total: inventory.length, records: inventory }, null, 2) + '\n')
writeFileSync(
  resolvePath(qaeRoot, 'Contracts/content/question-bank.legacy.json'),
  JSON.stringify({ total: QUESTION_BANK.length, conflicts: CONFLICTS.map((c) => ({ id: c.id, flag: c.flag, clarify: c.clarify })), questions: QUESTION_BANK }, null, 2) + '\n',
)

const dispositionCounts: Record<string, number> = {}
for (const r of inventory) dispositionCounts[r.disposition] = (dispositionCounts[r.disposition] ?? 0) + 1
const nonMaterial = inventory.filter((r) => r.disposition === 'REMOVE_NON_MATERIAL').map((r) => r.stableQuestionId)
const summary = {
  totalLegacyQuestions: QUESTION_BANK.length,
  qaeActiveBank: qaeBank.length,
  bankManifestHash,
  dispositionCounts,
  nonMaterialFlagged: nonMaterial,
  productDecisionRequired: inventory.filter((r) => r.disposition === 'PRODUCT_DECISION_REQUIRED').map((r) => r.stableQuestionId),
  verifiedReadKeys: readKeys.size,
  distinctAffectsTokens: [...new Set(QUESTION_BANK.flatMap((d) => [...d.affects]))].length,
}
writeFileSync(resolvePath(qaeRoot, 'Contracts/content/extraction-summary.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))
