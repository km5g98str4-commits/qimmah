// Prescription policy registry ([CTO-QAE-018] §1, §3).
//
// EVERY prescription number lives here behind a PolicyKey with an evidence
// tier. Rules reference keys; no naked numeric literal may appear in
// prescription logic (RULE-MODEL §4 / layering law L2).
//
// Tiers, used exactly as EVIDENCE-REGISTER defines them:
//   VERIFIED_EVIDENCE — checked against a primary source, cited below
//   PRODUCT_POLICY    — a Qimmah decision with no external basis
//   ASSUMPTION        — a working value with neither; must be few and visible
//
// SOURCES (checked 2026-08-10):
//   [E-ACSM09] ACSM Position Stand, "Progression Models in Resistance Training
//     for Healthy Adults", Med Sci Sports Exerc 2009. PMID 19204579.
//     Novice: 8-12 RM loads, 1-3 sets per exercise, 2-3 d/wk.
//     Intermediate/advanced: 1-12 RM periodized, eventual emphasis 1-6 RM.
//     Advanced heavy work: 3-5 min inter-set rest.
//   [E-REST24] Longland et al. / Frontiers Sports Act Living 2024,
//     "Give it a rest": Bayesian meta-analysis — small hypertrophy benefit
//     above 60 s; no appreciable further benefit beyond ~90 s. Strength
//     modestly favours longer rest. NSCA practical range 30-90 s for
//     hypertrophy.
//   [E-RIR] RIR accuracy literature: experienced lifters underpredict reps to
//     failure by ~1-2; novices by ~4-5. Accuracy improves nearer failure.
//     => RIR is NOT a reliable instrument for novices; they get a rep range and
//     a deliberately conservative RIR, never failure work.
//
// SCOPE: first-plan prescription only. No progression, overload, deload,
// weekly adaptation or load/kg selection.

export const PRESCRIPTION_POLICY_VERSION = '1.0.0'

export type EvidenceTier = 'VERIFIED_EVIDENCE' | 'PRODUCT_POLICY' | 'ASSUMPTION'

export interface PolicyEntry {
  key: PrescriptionPolicyKey
  value: number
  tier: EvidenceTier
  /** evidence id from the header block, or 'none' for policy/assumption */
  source: string
  rationale: string
}

export type PrescriptionPolicyKey =
  // ── working sets ────────────────────────────────────────────────────────
  | 'sets.beginner.compound'
  | 'sets.beginner.isolation'
  | 'sets.novice.compound'
  | 'sets.novice.isolation'
  | 'sets.intermediate.compound'
  | 'sets.intermediate.isolation'
  | 'sets.advanced.compound'
  | 'sets.advanced.isolation'
  | 'sets.returningReduction'
  | 'sets.sessionWorkingSetCeiling'
  | 'sets.sessionMinimumWorkingSets'
  | 'sets.perExerciseCeiling'
  // ── rep ranges ──────────────────────────────────────────────────────────
  | 'reps.compound.min'
  | 'reps.compound.max'
  | 'reps.isolation.min'
  | 'reps.isolation.max'
  | 'reps.machine.min'
  | 'reps.machine.max'
  | 'reps.bodyweight.min'
  | 'reps.bodyweight.max'
  // ── RIR ─────────────────────────────────────────────────────────────────
  | 'rir.beginner'
  | 'rir.novice'
  | 'rir.intermediate'
  | 'rir.advanced'
  | 'rir.returningAdditional'
  | 'rir.minimumAllowed'
  // ── rest ────────────────────────────────────────────────────────────────
  | 'rest.compound.seconds'
  | 'rest.isolation.seconds'
  | 'rest.machine.seconds'
  | 'rest.minSeconds'
  | 'rest.maxSeconds'

const E = (
  key: PrescriptionPolicyKey,
  value: number,
  tier: EvidenceTier,
  source: string,
  rationale: string,
): PolicyEntry => ({ key, value, tier, source, rationale })

/**
 * The registry. Ordered by key for deterministic serialization.
 *
 * Honest tiering: only the values the sources actually establish are
 * VERIFIED_EVIDENCE. Everything the sources leave open — where inside a
 * published range Qimmah sits, session ceilings, returning conservatism — is
 * PRODUCT_POLICY. No number claims more support than it has.
 */
export const PRESCRIPTION_POLICY: readonly PolicyEntry[] = [
  // Sets. ACSM: novice 1-3 sets per exercise. Qimmah picks inside that range;
  // the range is evidence, the pick is policy.
  E('sets.beginner.compound', 3, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'ACSM novice guidance is 1-3 sets per exercise; 3 is the top of the published novice range'),
  E('sets.beginner.isolation', 2, 'PRODUCT_POLICY', 'none', 'inside the ACSM 1-3 novice band; isolation carries less systemic cost so it takes the lower end'),
  E('sets.novice.compound', 3, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'same published novice band'),
  E('sets.novice.isolation', 2, 'PRODUCT_POLICY', 'none', 'inside the novice band'),
  E('sets.intermediate.compound', 4, 'PRODUCT_POLICY', 'none', 'ACSM permits higher volume for intermediates but prescribes no single set count for a first plan'),
  E('sets.intermediate.isolation', 3, 'PRODUCT_POLICY', 'none', 'one below the compound allocation'),
  E('sets.advanced.compound', 4, 'PRODUCT_POLICY', 'none', 'first-plan conservatism: advanced athletes are NOT started at their ceiling, because this wave has no progression to walk it back'),
  E('sets.advanced.isolation', 3, 'PRODUCT_POLICY', 'none', 'one below the compound allocation'),
  E('sets.returningReduction', 1, 'PRODUCT_POLICY', 'none', 'returning athletes lose one working set per exercise; capacity conservatism can only lower'),
  E('sets.sessionWorkingSetCeiling', 24, 'PRODUCT_POLICY', 'none', 'blunt guard so no session can silently balloon; not a scientific per-session limit'),
  E('sets.sessionMinimumWorkingSets', 6, 'PRODUCT_POLICY', 'none', 'below this a session is not meaningful work; reported, never padded'),
  E('sets.perExerciseCeiling', 5, 'PRODUCT_POLICY', 'none', 'no single exercise may consume an unreasonable share of the session'),

  // Rep ranges. ACSM novice loading = 8-12 RM. Ranges, never magic single reps.
  E('reps.compound.min', 6, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'inside the ACSM 1-12 RM band for intermediate/advanced; 6 is the conservative floor for a first plan'),
  E('reps.compound.max', 10, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'inside the ACSM 8-12 RM novice band'),
  E('reps.isolation.min', 10, 'PRODUCT_POLICY', 'none', 'isolation biased higher than compound; ACSM does not separate by mechanics'),
  E('reps.isolation.max', 15, 'PRODUCT_POLICY', 'none', 'upper end conventional for isolation; not established by the cited sources'),
  E('reps.machine.min', 8, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'ACSM novice 8-12 RM — machines are the beginner-dominant class'),
  E('reps.machine.max', 12, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'ACSM novice 8-12 RM upper bound'),
  E('reps.bodyweight.min', 8, 'PRODUCT_POLICY', 'none', 'bodyweight load is fixed, so the range is wider and higher'),
  E('reps.bodyweight.max', 15, 'PRODUCT_POLICY', 'none', 'same reasoning'),

  // RIR. Evidence says novices underpredict reps-to-failure by ~4-5, so RIR is
  // not a reliable instrument for them — hence a deliberately high target and
  // never failure work.
  E('rir.beginner', 3, 'VERIFIED_EVIDENCE', 'E-RIR', 'novices underpredict reps to failure by ~4-5, so a nominal 3 RIR is genuinely well short of failure — the conservative direction'),
  E('rir.novice', 3, 'VERIFIED_EVIDENCE', 'E-RIR', 'same accuracy finding'),
  E('rir.intermediate', 2, 'PRODUCT_POLICY', 'none', 'experienced lifters underpredict by ~1-2; 2 keeps a real buffer without prescribing failure'),
  E('rir.advanced', 2, 'PRODUCT_POLICY', 'none', 'first-plan conservatism; advanced athletes are not started at 0-1 RIR'),
  E('rir.returningAdditional', 1, 'PRODUCT_POLICY', 'none', 'returning athletes get one additional rep in reserve'),
  E('rir.minimumAllowed', 1, 'PRODUCT_POLICY', 'none', 'hard floor: this wave never prescribes training to failure (0 RIR)'),

  // Rest. Meta-analytic: >60 s helps, no appreciable gain past ~90 s for
  // hypertrophy; strength modestly favours longer. ACSM: 3-5 min for advanced
  // heavy work — deliberately NOT applied, since this is a first plan.
  E('rest.compound.seconds', 150, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'strength modestly favours longer rest; 150 s sits below the ACSM 3-5 min heavy-work band, appropriate for a first plan'),
  E('rest.isolation.seconds', 90, 'VERIFIED_EVIDENCE', 'E-REST24', 'no appreciable hypertrophy benefit beyond ~90 s'),
  E('rest.machine.seconds', 90, 'VERIFIED_EVIDENCE', 'E-REST24', 'same 90 s finding; machines are typically the lower-systemic-cost class'),
  E('rest.minSeconds', 60, 'VERIFIED_EVIDENCE', 'E-REST24', 'below 60 s measurably costs hypertrophy'),
  E('rest.maxSeconds', 300, 'VERIFIED_EVIDENCE', 'E-ACSM09', 'ACSM upper bound for advanced heavy work'),
]

const INDEX: ReadonlyMap<PrescriptionPolicyKey, PolicyEntry> = new Map(
  PRESCRIPTION_POLICY.map((e) => [e.key, e]),
)

/**
 * The ONLY way prescription logic may obtain a number.
 * A missing key THROWS by name — a policy register entry cannot be silently
 * dropped ([CTO-QAE-018] §14 counter-assertion).
 */
export function policy(key: PrescriptionPolicyKey): number {
  const entry = INDEX.get(key)
  if (entry === undefined) {
    throw new Error(`QAE-PRESCRIPTION-POLICY-MISSING: no register entry for ${key}`)
  }
  return entry.value
}

export function policyEntry(key: PrescriptionPolicyKey): PolicyEntry | undefined {
  return INDEX.get(key)
}
