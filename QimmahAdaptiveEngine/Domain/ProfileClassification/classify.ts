// QAE Profile Classification ([CTO-QAE-005] §5–§6) — the ONLY runtime logic
// authorized this phase beyond content mapping: classification needed for
// question routing and completeness. It derives facts and nothing else — no
// downstream engine outputs of any kind.
//
// Experience is FOUR axes ([CTO-QAE-002] U-model, [CTO-QAE-005] §5), never one
// value: TrainingKnowledge · RecentTrainingExposure · CurrentWorkCapacity ·
// ConsistencyHistory — plus a separately derived planning classification
// (integer re-derivation of the characterized legacy signal model; weights and
// thresholds are characterized values, integer-scaled per NUMERIC-CONTRACT).

import { divRoundHalfAwayFromZero, clampInt } from '../Shared/numeric'
import type { FactValue } from '../Evidence/model'

export type FactMapIn = Readonly<Record<string, FactValue>>

// Characterized legacy signal model (experience.ts:30-50), integer-scaled:
// weights ×10; value maps ×20 (0..100). scoreCenti = 10 × Σ(v20·w10) / Σw10.
interface Signal {
  key: string
  w10: number
  map: Readonly<Record<string, number>>
}
const V = (a: Readonly<Record<string, number>>): Readonly<Record<string, number>> => a
const SIGNALS: readonly Signal[] = [
  { key: 'consistency', w10: 20, map: V({ rare: 0, on_off: 30, mostly: 70, steady: 100 }) },
  { key: 'trainedBefore', w10: 20, map: V({ never: 0, tried: 20, months: 60, years: 100 }) },
  { key: 'totalMonths', w10: 15, map: V({ lt3: 20, m3_6: 40, m6_12: 60, y1_3: 80, y3_plus: 100 }) },
  { key: 'programExperience', w10: 15, map: V({ never: 0, app_only: 40, followed: 70, wrote_own: 100 }) },
  { key: 'knowsProgression', w10: 13, map: V({ no: 0, vaguely: 50, yes: 100 }) },
  { key: 'exerciseFamiliarity', w10: 12, map: V({ none: 0, few: 30, most: 70, all: 100 }) },
  { key: 'trainingAgeHonest', w10: 12, map: V({ lt1: 20, y1_2: 50, y2_5: 80, gt5: 100 }) },
  { key: 'tracksSets', w10: 10, map: V({ never: 0, sometimes: 50, always: 100 }) },
  { key: 'selfLevel', w10: 10, map: V({ beginner: 20, intermediate: 60, advanced: 100 }) },
]
const GYM_CONFIDENCE_W10 = 8
// Knowledge-axis subset: what the athlete KNOWS (persists through breaks).
const KNOWLEDGE_KEYS = new Set(['programExperience', 'knowsProgression', 'exerciseFamiliarity', 'tracksSets', 'selfLevel', 'trainingAgeHonest'])

export type ExperienceClass = 'complete_beginner' | 'beginner' | 'early_intermediate' | 'intermediate' | 'advanced' | 'returning'
export type Band = 'beginner' | 'intermediate' | 'advanced'
export type ExposureBand = 'none' | 'sporadic' | 'consistent'

export interface ExperienceModel {
  trainingKnowledge: Band
  recentTrainingExposure: { band: ExposureBand; monthsSinceConsistent: number }
  currentWorkCapacity: { band: Band; conservative: boolean }
  consistencyHistory: { band: ExposureBand; tenureMonths: number }
  planningClassification: ExperienceClass
  scoreCenti: number
  confidenceCenti: number
}

function scoreOf(facts: FactMapIn, keys?: ReadonlySet<string>): { scoreCenti: number; weightSeen10: number; weightTotal10: number } {
  let sumVW = 0
  let sumW = 0
  let total = 0
  for (const s of SIGNALS) {
    if (keys && !keys.has(s.key)) continue
    total += s.w10
    const raw = facts[s.key]
    if (typeof raw !== 'string' || !(raw in s.map)) continue
    sumVW += s.map[raw] * s.w10
    sumW += s.w10
  }
  if (!keys || keys.has('gymConfidence')) {
    total += GYM_CONFIDENCE_W10
    const gc = facts['gymConfidence']
    if (typeof gc === 'number' && Number.isSafeInteger(gc)) {
      sumVW += clampInt(gc - 1, 0, 5) * 25 * GYM_CONFIDENCE_W10
      sumW += GYM_CONFIDENCE_W10
    }
  }
  // Legacy: score = (Σv·w / Σw) × 20 with v∈0..5. With v20 = 20v and w10 = 10w:
  // score = Σ(v20·w10)/Σw10, so scoreCenti = 100·Σ(v20·w10)/Σw10.
  return { scoreCenti: sumW === 0 ? 0 : divRoundHalfAwayFromZero(100 * sumVW, sumW), weightSeen10: sumW, weightTotal10: total }
}

// Characterized thresholds ×100 (legacy 18/38/55/75).
function classFromScore(scoreCenti: number): ExperienceClass {
  if (scoreCenti >= 7500) return 'advanced'
  if (scoreCenti >= 5500) return 'intermediate'
  if (scoreCenti >= 3800) return 'early_intermediate'
  if (scoreCenti >= 1800) return 'beginner'
  return 'complete_beginner'
}

const bandOfClass = (c: ExperienceClass): Band =>
  c === 'advanced' ? 'advanced' : c === 'intermediate' || c === 'early_intermediate' || c === 'returning' ? 'intermediate' : 'beginner'

// Bucket midpoints (PRODUCT_POLICY — replay-stable integers, not fake precision).
const MONTHS_SINCE: Readonly<Record<string, number>> = { m3_12: 7, y1_plus: 18 }
const TENURE: Readonly<Record<string, number>> = { lt3: 2, m3_6: 5, m6_12: 9, y1_3: 24, y3_plus: 48 }

export function classifyExperience(facts: FactMapIn): ExperienceModel {
  const overall = scoreOf(facts)
  const knowledge = scoreOf(facts, KNOWLEDGE_KEYS)
  const trainedBefore = facts['trainedBefore']
  const lastTrained = typeof facts['lastTrained'] === 'string' ? (facts['lastTrained'] as string) : null
  const totalMonths = typeof facts['totalMonths'] === 'string' ? (facts['totalMonths'] as string) : null
  const consistency = typeof facts['consistency'] === 'string' ? (facts['consistency'] as string) : null

  // Characterized hard rule: never trained ⇒ complete beginner regardless of claims.
  let planning: ExperienceClass =
    overall.weightSeen10 === 0 || trainedBefore === 'never' ? 'complete_beginner' : classFromScore(overall.scoreCenti)
  const detrained = lastTrained !== null && (lastTrained === 'm3_12' || lastTrained === 'y1_plus')
  const realHistory = totalMonths !== null && ['m6_12', 'y1_3', 'y3_plus'].includes(totalMonths)
  if (planning !== 'complete_beginner' && detrained && realHistory) planning = 'returning'

  const knowledgeBand: Band = trainedBefore === 'never' ? 'beginner' : bandOfClass(classFromScore(knowledge.scoreCenti))
  const exposureBand: ExposureBand =
    trainedBefore === 'never' ? 'none' : detrained ? 'none' : consistency === 'steady' || consistency === 'mostly' ? 'consistent' : 'sporadic'
  const monthsSinceConsistent = detrained ? (MONTHS_SINCE[lastTrained as string] ?? 12) : 0
  const consistencyBand: ExposureBand =
    trainedBefore === 'never' ? 'none' : consistency === 'steady' || consistency === 'mostly' ? 'consistent' : 'sporadic'
  const tenureMonths = totalMonths !== null ? (TENURE[totalMonths] ?? 0) : 0

  // Capacity: knowledge stepped down by exposure — advanced knowledge + long
  // break ≠ actively training advanced athlete ([CTO-QAE-005] §5).
  const stepDown = (b: Band): Band => (b === 'advanced' ? 'intermediate' : 'beginner')
  const currentBand: Band = exposureBand === 'consistent' ? knowledgeBand : exposureBand === 'sporadic' ? stepDown(knowledgeBand) : trainedBefore === 'never' ? 'beginner' : stepDown(knowledgeBand)
  const conservative = exposureBand !== 'consistent'

  const confidenceCenti = overall.weightTotal10 === 0 ? 0 : divRoundHalfAwayFromZero(100 * overall.weightSeen10, overall.weightTotal10)

  return {
    trainingKnowledge: knowledgeBand,
    recentTrainingExposure: { band: exposureBand, monthsSinceConsistent },
    currentWorkCapacity: { band: currentBand, conservative },
    consistencyHistory: { band: consistencyBand, tenureMonths },
    planningClassification: planning,
    scoreCenti: overall.scoreCenti,
    confidenceCenti,
  }
}

// ── Equipment capabilities ([CTO-QAE-005] §6): NEVER "full gym = machines only" ─
const CAPABILITY_KEYS = ['machine', 'cable', 'dumbbell', 'barbell', 'bench', 'band', 'kettlebell', 'smith', 'plate'] as const

export function deriveCapabilities(facts: FactMapIn): Record<string, boolean> {
  const place = typeof facts['place'] === 'string' ? (facts['place'] as string) : null
  const caps: Record<string, boolean> = { bodyweight: true }
  if (place === 'gym' || place === 'mixed') {
    for (const k of CAPABILITY_KEYS) caps[k] = true
  } else if (place === 'machines_only') {
    caps['machine'] = true
    caps['cable'] = true
  } else if (place === 'hotel') {
    caps['machine'] = true
    caps['dumbbell'] = true
  } else {
    for (const k of CAPABILITY_KEYS) caps[k] = facts[`equipmentList.${k}`] === true
  }
  return caps
}

// ── Routing-fact derivation: the composed derived.* surface for selection ────
export function deriveRoutingFacts(facts: FactMapIn): Record<string, FactValue> {
  const out: Record<string, FactValue> = { ...facts }
  const exp = classifyExperience(facts)
  out['derived.experienceClass'] = exp.planningClassification
  out['derived.knowledgeBand'] = exp.trainingKnowledge
  out['derived.exposureBand'] = exp.recentTrainingExposure.band
  out['derived.capacityBand'] = exp.currentWorkCapacity.band
  out['derived.consistencyBand'] = exp.consistencyHistory.band
  const age = facts['age']
  if (typeof age === 'number' && Number.isSafeInteger(age)) {
    out['derived.ageKnown'] = true
    out['derived.isMinor'] = age < 18
  } else {
    out['derived.ageKnown'] = false
    // Unknown age is NOT adult ([CTO-QAE-005] §4 / U1): no isMinor fact is
    // derived, so nothing age-gated can unlock; completeness keeps age blocking.
  }
  const caps = deriveCapabilities(facts)
  for (const k of Object.keys(caps).sort()) out[`derived.capability.${k}`] = caps[k]
  return out
}
