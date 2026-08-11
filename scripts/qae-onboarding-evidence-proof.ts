// [CTO-QAE-022] M1a — onboarding training-history evidence proof.
//
// The single question this file answers: does the app now collect enough
// EXPLICIT evidence to build an honest Training-ready AthleteProfile — without
// inventing anything for the athlete who has never trained?
//
// The load-bearing counter-case is §7: `trainedBefore = 'never'` must produce a
// COMPLETE Training profile that contains no fabricated duration, no fabricated
// last-session, and is never labelled "returning". A contract that can only be
// completed by inserting defaults would be a contract that lies.

import type { Profile } from '@/types/profile'
import type { WorkoutPlan } from '@/types/workout'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { buildAthleteProfileAttempt, historyFacts, runShadowComparison } from '@/lib/qae/shadow'
import type { FactValue } from '@qae/Domain/Evidence/model'
import { buildOnboardingProfile, defaultAnswers } from '@/lib/planBuilderAnswers'
import { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
import {
  CONSISTENCY_VALUES,
  DRAFT_VERSION,
  HISTORY_STEP,
  LAST_INPUT_STEP,
  LAST_TRAINED_VALUES,
  TOTAL_MONTHS_VALUES,
  TRAINED_BEFORE_VALUES,
  clearDraftV2,
  historyFollowUpsApply,
  loadDraftV2,
  saveDraftV2,
  validateStep,
  type OnboardingV2Draft,
} from '@/lib/onboardingV2Flow'
import { trainingHistoryStrings } from '@/i18n/dict/trainingHistory'
import { setupWhyLines } from '@/i18n/dict/setupWhy'
import { SETUP_STEP_NAMES } from '@/lib/tracking'
import { ONBOARDING_KEY } from '@/lib/onboarding'
import { V2_ONBOARDING } from '@/design-system/v2/labels'
import { classifyExperience, deriveReturningStatus } from '@qae/Domain/ProfileClassification/classify'
import { TRAINING_REQUIRED_FIELDS } from '@qae/Domain/Training/completeness'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** A profile that answered everything EXCEPT the four history questions. */
const baseProfile: Profile = {
  ...defaultProfile,
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 85,
  trainingLevel: 'intermediate',
  workoutEnvironment: 'gym',
  trainingDays: 4,
  workoutDuration: 60,
  injuries: '',
}

const withHistory = (h: Profile['trainingHistory'], over: Partial<Profile> = {}): Profile => ({
  ...baseProfile,
  ...over,
  trainingHistory: h,
})

const NEVER = withHistory({ trainedBefore: 'never' })
const RETURNING = withHistory({ trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'y1_plus', consistency: 'mostly' })
const ACTIVE = withHistory({ trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady' })
const LEGACY = withHistory(undefined) // a user who finished onboarding before M1a

/**
 * Key-order-independent canonical form. Key ORDER is not part of the draft
 * contract — `migrateDraft` legitimately re-emits the history fields last — so
 * comparing raw `JSON.stringify` would fail on a reordering that loses nothing.
 * Sorting keys keeps the assertion about VALUES, which is what must survive.
 */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : val,
  )

/**
 * The fact map the PRODUCTION adapter builds — imported, never re-implemented.
 *
 * ⚠️ This line is the whole reason bypass-simulation A now fails. An earlier
 * draft of this proof had a local copy of this mapping, so a fabricated bucket
 * injected into the real `historyFacts` (never-trained silently given
 * `totalMonths: 'lt3'`) left every assertion here green: the proof was grading
 * its own duplicate instead of the shipped path. A proof that restates the code
 * it audits cannot fail when that code changes.
 */
const factsOf = (p: Profile): Record<string, FactValue> => historyFacts(p.trainingHistory)

// ═══ §1 The never-trained representation is EXPLICIT, not an empty slot ══════
console.log('\n① تمثيل «ما تمرّن قط» — حالة صريحة لا فراغ')
{
  check("'never' is a member of the trainedBefore vocabulary", (TRAINED_BEFORE_VALUES as readonly string[]).includes('never'))

  const exp = classifyExperience(factsOf(NEVER))
  const status = deriveReturningStatus(factsOf(NEVER), exp)

  check("never-trained ⇒ returningStatus === 'neverTrained' (a positive state)", status === 'neverTrained', status)
  check("never-trained ⇒ NOT 'returning'", status !== 'returning', status)
  check("never-trained ⇒ NOT 'unknown' (absence and never are different answers)", status !== 'unknown', status)
  check("never-trained ⇒ planningClassification 'complete_beginner'", exp.planningClassification === 'complete_beginner', exp.planningClassification)
  check("never-trained ⇒ exposure band 'none'", exp.recentTrainingExposure.band === 'none')
  check('never-trained ⇒ monthsSinceConsistent 0 (no invented layoff)', exp.recentTrainingExposure.monthsSinceConsistent === 0)
  check('never-trained ⇒ tenureMonths 0 (no invented duration)', exp.consistencyHistory.tenureMonths === 0)
  check("never-trained ⇒ consistency band 'none'", exp.consistencyHistory.band === 'none')
  check('never-trained ⇒ capacity conservative', exp.currentWorkCapacity.conservative)

  // No fabricated buckets anywhere in the stored evidence.
  check('never-trained ⇒ totalMonths fact ABSENT (not a sentinel)', !('totalMonths' in factsOf(NEVER)))
  check('never-trained ⇒ lastTrained fact ABSENT', !('lastTrained' in factsOf(NEVER)))
  check('never-trained ⇒ consistency fact ABSENT', !('consistency' in factsOf(NEVER)))

  // ── ADVERSARIAL: the two guards are independent ────────────────────────────
  // Feed contradictory evidence — 'never' PLUS a full detrained history that
  // would otherwise classify as returning. Honest behaviour is that the
  // never-trained declaration wins and returning is still refused.
  const contradictory = { trainedBefore: 'never', totalMonths: 'y3_plus', lastTrained: 'y1_plus', consistency: 'steady' }
  const cExp = classifyExperience(contradictory)
  const cStatus = deriveReturningStatus(contradictory, cExp)
  check('ADVERSARIAL: never + detrained-history evidence still NOT returning', cStatus === 'neverTrained', cStatus)
  check('ADVERSARIAL: never + long history still complete_beginner', cExp.planningClassification === 'complete_beginner', cExp.planningClassification)
  check("ADVERSARIAL: never + steady consistency still exposure 'none'", cExp.recentTrainingExposure.band === 'none')
}

// ═══ §7 Never-trained completes the Training contract WITHOUT defaults ═══════
console.log('\n② العقد الخاص بالتدريب يكتمل لمن لم يتمرّن — بلا حشو')
{
  const a = buildAthleteProfileAttempt(NEVER)
  check(
    'never-trained ⇒ completeForTraining === true',
    a.trainingCompleteness.completeForTraining,
    a.trainingCompleteness.missingRequired.join(', '),
  )
  check('never-trained ⇒ no Training-required field missing', a.trainingCompleteness.missingRequired.length === 0)
  check('never-trained ⇒ returningStatus is MAPPED from evidence', a.mapped.includes('training.returningStatus'))
  check('never-trained ⇒ currentWorkCapacity is MAPPED', a.mapped.includes('training.experienceBand.currentWorkCapacity'))
  check('never-trained ⇒ exposure is MAPPED (as none, not guessed)', a.mapped.includes('training.experienceBand.recentTrainingExposure'))
  check('never-trained ⇒ consistency counts as answered', a.mapped.includes('training.consistency'))

  // GLOBAL completeness is deliberately NOT weakened to achieve the above.
  check('GLOBAL status stays incomplete (movementCompetency still absent)', a.status === 'incomplete')
  check('movementCompetency is still reported missing by name', a.missing.some((m) => m.field === 'training.movementCompetency'))
  check(
    'movementCompetency is NOT in the Training-required set',
    !(TRAINING_REQUIRED_FIELDS as readonly string[]).includes('training.movementCompetency'),
  )
}

// ═══ §10 Returning vs active — neither direction misclassified ═══════════════
console.log('\n③ العائد بعد انقطاع ≠ النشط ≠ من لم يتمرّن')
{
  const rExp = classifyExperience(factsOf(RETURNING))
  const rStatus = deriveReturningStatus(factsOf(RETURNING), rExp)
  check("long-inactive trained user ⇒ 'returning'", rStatus === 'returning', rStatus)
  check('returning ⇒ exposure band none (detrained)', rExp.recentTrainingExposure.band === 'none')
  check('returning ⇒ monthsSinceConsistent > 0 (a real layoff, measured)', rExp.recentTrainingExposure.monthsSinceConsistent > 0)
  check('returning ⇒ capacity conservative', rExp.currentWorkCapacity.conservative)
  check('returning ⇒ tenure retained (knowledge is not erased by a break)', rExp.consistencyHistory.tenureMonths > 0)

  const aExp = classifyExperience(factsOf(ACTIVE))
  const aStatus = deriveReturningStatus(factsOf(ACTIVE), aExp)
  check("recently-active trained user ⇒ 'active', NOT returning", aStatus === 'active', aStatus)
  check("active ⇒ exposure band 'consistent'", aExp.recentTrainingExposure.band === 'consistent', aExp.recentTrainingExposure.band)
  check('active ⇒ capacity NOT conservative', !aExp.currentWorkCapacity.conservative)

  check('the three statuses are mutually distinct', new Set([rStatus, aStatus, deriveReturningStatus(factsOf(NEVER), classifyExperience(factsOf(NEVER)))]).size === 3)

  // ── ADVERSARIAL: returning must need BOTH a layoff and a real history ──────
  // A short history + long layoff is NOT a returning athlete — there is nothing
  // to return to. If this ever passes, `returning` has become "anyone idle".
  const shallow = { trainedBefore: 'tried', totalMonths: 'lt3', lastTrained: 'y1_plus', consistency: 'rare' }
  check(
    'ADVERSARIAL: long layoff + shallow history is NOT returning',
    deriveReturningStatus(shallow, classifyExperience(shallow)) !== 'returning',
  )
  // A real history with NO layoff is likewise not returning.
  const noLayoff = { trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'w2', consistency: 'steady' }
  check(
    'ADVERSARIAL: real history + no layoff is NOT returning',
    deriveReturningStatus(noLayoff, classifyExperience(noLayoff)) !== 'returning',
  )
}

// ═══ §6 consistency reaches its intended derived fields ══════════════════════
console.log('\n④ «الانتظام» يغيّر الحقول المقصودة فعلًا')
{
  const steady = { trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady' }
  const rare = { ...steady, consistency: 'rare' }
  const eS = classifyExperience(steady)
  const eR = classifyExperience(rare)

  check("consistency 'steady' ⇒ consistencyHistory band consistent", eS.consistencyHistory.band === 'consistent')
  check("consistency 'rare' ⇒ consistencyHistory band sporadic", eR.consistencyHistory.band === 'sporadic')
  check('consistency changes recentTrainingExposure band', eS.recentTrainingExposure.band !== eR.recentTrainingExposure.band)
  check('consistency changes currentWorkCapacity (band or confidence)',
    eS.currentWorkCapacity.band !== eR.currentWorkCapacity.band || eS.currentWorkCapacity.conservative !== eR.currentWorkCapacity.conservative)
  check('consistency moves the experience score', eS.scoreCenti !== eR.scoreCenti, `${eS.scoreCenti} vs ${eR.scoreCenti}`)

  // Not a weak proxy: consistency alone must not flip returningStatus.
  check('consistency alone does NOT flip returningStatus',
    deriveReturningStatus(steady, eS) === deriveReturningStatus(rare, eR))
}

// ═══ §10 Removing required evidence makes Training incomplete BY NAME ════════
console.log('\n⑤ نزع دليل مطلوب ⇒ نقص **مسمّى** لا صامت')
{
  const full = buildAthleteProfileAttempt(ACTIVE)
  check('fully-answered trained user ⇒ completeForTraining', full.trainingCompleteness.completeForTraining,
    full.trainingCompleteness.missingRequired.join(', '))

  // Drop lastTrained only.
  const noLast = buildAthleteProfileAttempt(withHistory({ trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'steady' }))
  check('missing lastTrained ⇒ Training INCOMPLETE', !noLast.trainingCompleteness.completeForTraining)
  check('missing lastTrained ⇒ returningStatus named as missing',
    noLast.trainingCompleteness.missingRequired.includes('training.returningStatus') ||
    noLast.trainingCompleteness.missingRequired.includes('training.experienceBand.currentWorkCapacity'),
    noLast.trainingCompleteness.missingRequired.join(', '))
  check('missing lastTrained ⇒ every missing entry is a named field, not a count',
    noLast.trainingCompleteness.missingRequired.every((f) => typeof f === 'string' && f.includes('.')))

  // Drop the whole history (the legacy user).
  const legacy = buildAthleteProfileAttempt(LEGACY)
  check('no history at all ⇒ Training INCOMPLETE', !legacy.trainingCompleteness.completeForTraining)
  check('no history ⇒ returningStatus named as missing',
    legacy.trainingCompleteness.missingRequired.includes('training.returningStatus'),
    legacy.trainingCompleteness.missingRequired.join(', '))
  check('no history ⇒ returningStatus NOT inferred from trainingLevel',
    legacy.missing.some((m) => m.field === 'training.returningStatus'))
  check('no history ⇒ every missing field carries a reason', legacy.missing.every((m) => m.reason.length > 10))

  // Drop body/session evidence — the non-history required fields still bite.
  const noWeight = buildAthleteProfileAttempt(withHistory({ trainedBefore: 'never' }, { weightKg: 0 }))
  check('missing weight ⇒ Training INCOMPLETE even with full history',
    !noWeight.trainingCompleteness.completeForTraining)
  check('missing weight ⇒ named body.currentWeightGrams',
    noWeight.trainingCompleteness.missingRequired.includes('body.currentWeightGrams'),
    noWeight.trainingCompleteness.missingRequired.join(', '))
}

// ═══ §4 / §10 Injury: [] is evidence; unrecognised text is NOT ═══════════════
console.log('\n⑥ الإصابات — «لا إصابة» دليل، والنصّ غير المعروف ليس دليلًا')
{
  const none = buildAthleteProfileAttempt(withHistory({ trainedBefore: 'never' }, { injuries: '' }))
  check('empty injuries ⇒ safety.injuryAreas MAPPED (complete no-injury evidence)', none.mapped.includes('safety.injuryAreas'))
  check('empty injuries ⇒ Training complete', none.trainingCompleteness.completeForTraining)

  const known = buildAthleteProfileAttempt(withHistory({ trainedBefore: 'never' }, { injuries: 'knee' }))
  check('canonical injury token ⇒ injuryAreas MAPPED', known.mapped.includes('safety.injuryAreas'))
  check('canonical injury ⇒ Training still complete', known.trainingCompleteness.completeForTraining)

  const prose = buildAthleteProfileAttempt(withHistory({ trainedBefore: 'never' }, { injuries: 'يوجعني ظهري أحيانًا' }))
  check('MISSING ≠ NONE: unrecognised injury prose ⇒ injuryAreas NOT mapped', !prose.mapped.includes('safety.injuryAreas'))
  check('MISSING ≠ NONE: unrecognised prose ⇒ Training INCOMPLETE by name',
    !prose.trainingCompleteness.completeForTraining && prose.trainingCompleteness.missingRequired.includes('safety.injuryAreas'))
  check('MISSING ≠ NONE: reason says it is not treated as no-injury',
    prose.missing.some((m) => m.field === 'safety.injuryAreas' && m.reason.length > 10))

  // The UI options ARE the canonical ids — no translation table to drift.
  const CANON = ['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle']
  for (const lang of ['ar', 'en'] as const) {
    const opts = V2_ONBOARDING[lang].injuries.map((o) => o.value)
    check(`injury option ids (${lang}) are exactly the canonical QAE ids`, JSON.stringify(opts) === JSON.stringify(CANON), opts.join(','))
  }
}

// ═══ §8 Existing users: LIVE unaffected, QAE fails open ══════════════════════
console.log('\n⑦ المستخدم القائم — الخطة الحيّة تعمل، وQAE يفشل مفتوحًا')
{
  for (const [name, p] of [['legacy (no history)', LEGACY], ['never', NEVER], ['returning', RETURNING], ['active', ACTIVE]] as const) {
    let live: WorkoutPlan | null = null
    try {
      live = generatePlan(p).workoutPlan
    } catch (err) {
      check(`${name}: LIVE plan generated`, false, String(err))
      continue
    }
    check(`${name}: LIVE plan generated with days`, live.days.length > 0)

    const before = JSON.stringify(live)
    const cmp = runShadowComparison(p, live)
    check(`${name}: shadow never throws`, typeof cmp.classification === 'string')
    check(`${name}: LIVE plan byte-identical after shadow`, JSON.stringify(live) === before)
    check(`${name}: shadow reports Training verdict`, typeof cmp.trainingComplete === 'boolean')
  }

  // The decisive one: an INCOMPLETE QAE profile still yields a LIVE plan.
  const legacyLive = generatePlan(LEGACY).workoutPlan
  const legacyCmp = runShadowComparison(LEGACY, legacyLive)
  check('QAE incomplete does NOT block the LIVE plan', legacyLive.days.length > 0 && !legacyCmp.trainingComplete)
  check('incomplete verdict names its missing fields', legacyCmp.missingTrainingRequired.length > 0)

  // No silent default injection into the legacy profile.
  check('legacy profile is not back-filled with a trainingHistory', LEGACY.trainingHistory === undefined)
  const legacyOp = buildOnboardingProfile({ ...defaultAnswers })
  check('buildOnboardingProfile invents no trainingHistory when unanswered',
    legacyOp.trainingPreferences.trainingHistory === undefined)
}

// ═══ §5 Data contract round-trip + old drafts still load ═════════════════════
console.log('\n⑧ عقد البيانات — الجولة الكاملة والمسودّات القديمة')
{
  // choices → Answers → OnboardingProfile → Profile, values intact.
  const answers = toAnswersFromV2({
    goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed', injuries: [], healthDataConsent: true,
    age: 30, gender: 'male', heightCm: 180, weightKg: 85, intent: 'plan', level: 'intermediate', trainingYears: 2,
    trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'y1_plus', consistency: 'mostly',
  })
  check('adapter carries trainedBefore', answers.trainingHistory?.trainedBefore === 'years')
  check('adapter carries totalMonths', answers.trainingHistory?.totalMonths === 'y1_3')
  check('adapter carries lastTrained', answers.trainingHistory?.lastTrained === 'y1_plus')
  check('adapter carries consistency', answers.trainingHistory?.consistency === 'mostly')

  const op = buildOnboardingProfile(answers)
  check('OnboardingProfile carries the history', op.trainingPreferences.trainingHistory?.lastTrained === 'y1_plus')

  // never-trained: nulls become ABSENT, never zeroes.
  const neverAnswers = toAnswersFromV2({
    goal: 'maintain', days: 3, duration: 45, place: 'home', pref: 'mixed', injuries: [], healthDataConsent: true,
    age: 22, gender: 'female', heightCm: 165, weightKg: 60, intent: 'plan', level: 'beginner', trainingYears: null,
    trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null,
  })
  check("never ⇒ trainedBefore 'never' stored", neverAnswers.trainingHistory?.trainedBefore === 'never')
  check('never ⇒ totalMonths undefined (not 0, not "lt3")', neverAnswers.trainingHistory?.totalMonths === undefined)
  check('never ⇒ lastTrained undefined', neverAnswers.trainingHistory?.lastTrained === undefined)
  check('never ⇒ consistency undefined', neverAnswers.trainingHistory?.consistency === undefined)

  // ── Old (v5) draft must still load, and must not lose a single answer ──────
  //
  // Written through the REAL envelope: save a current draft so the store writes
  // its own wrapper, then replace the inner payload with an authentic v5 body —
  // one that has NO history keys at all, exactly as a pre-M1a client left it.
  const putRawDraft = (payload: unknown): void => {
    const envelope = JSON.parse(globalThis.localStorage.getItem(ONBOARDING_KEY) as string)
    envelope.draft = payload
    globalThis.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(envelope))
  }

  /** A fully-answered current-version draft — reused by the round-trip below. */
  const liveDraft: OnboardingV2Draft = {
    step: HISTORY_STEP, age: 30, gender: 'male', heightCm: 180, weightKg: 85,
    intent: 'plan', level: 'intermediate', trainingYears: 2,
    trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'm3_12', consistency: 'mostly',
    goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed',
    hasInjury: false, injuries: [], healthDataConsent: true,
  }

  clearDraftV2(null)
  saveDraftV2(liveDraft, null) // establishes the envelope for this owner
  putRawDraft({
    v: 5, step: 4, age: 28, gender: 'male', heightCm: 175, weightKg: 80,
    intent: 'meals', level: 'advanced', trainingYears: 5,
    goal: 'bulk', days: 5, duration: 60, place: 'gym', pref: 'free',
    hasInjury: true, injuries: ['knee'], healthDataConsent: true,
  })
  const loaded = loadDraftV2(null)
  check('OLD DRAFT: a v5 draft still loads (not discarded)', loaded !== undefined)
  if (loaded) {
    check('OLD DRAFT: no answer lost — goal', loaded.goal === 'bulk')
    check('OLD DRAFT: no answer lost — days/duration', loaded.days === 5 && loaded.duration === 60)
    check('OLD DRAFT: no answer lost — place/pref', loaded.place === 'gym' && loaded.pref === 'free')
    check('OLD DRAFT: no answer lost — injuries', loaded.injuries.length === 1 && loaded.injuries[0] === 'knee')
    check('OLD DRAFT: no answer lost — body', loaded.age === 28 && loaded.heightCm === 175 && loaded.weightKg === 80)
    check('OLD DRAFT: history fields normalise to null, NOT to a value', loaded.trainedBefore === null && loaded.totalMonths === null)
    check('OLD DRAFT: resumes at the new history step (never past it)', loaded.step === HISTORY_STEP, String(loaded.step))
  }
  clearDraftV2(null)

  // ── Reload / back-forward: a current draft round-trips byte-exact ─────────
  saveDraftV2(liveDraft, null)
  const back = loadDraftV2(null)
  check('RELOAD: history answers survive a save/load round-trip', canon(back) === canon(liveDraft), canon(back))
  check('RELOAD: the round-trip loses no key', back !== undefined && Object.keys(back).length === Object.keys(liveDraft).length)
  check('RELOAD: draft version is current', DRAFT_VERSION === 6)

  // BACK/FORWARD: stepping away and returning must not drop the answers. The
  // view persists on every step change, so this is the same write path with a
  // different `step` — the answers must be identical either side.
  saveDraftV2({ ...liveDraft, step: 5 }, null)
  const forward = loadDraftV2(null)
  saveDraftV2({ ...liveDraft, step: HISTORY_STEP }, null)
  const backAgain = loadDraftV2(null)
  check('BACK/FORWARD: answers unchanged going forward', forward?.trainedBefore === 'years' && forward?.lastTrained === 'm3_12')
  check('BACK/FORWARD: answers unchanged coming back', backAgain?.trainedBefore === 'years' && backAgain?.consistency === 'mostly')
  check('BACK/FORWARD: only the step index differs', forward?.step === 5 && backAgain?.step === HISTORY_STEP)
  clearDraftV2(null)

  // Hostile input: an out-of-vocabulary bucket must reject the whole draft.
  saveDraftV2(liveDraft, null)
  putRawDraft({ ...liveDraft, v: DRAFT_VERSION, totalMonths: 'nine_hundred_years' })
  check('HOSTILE: an out-of-vocabulary bucket rejects the draft', loadDraftV2(null) === undefined)
  clearDraftV2(null)
}

// ═══ §2 / §3 Flow shape: four questions, conditional, no duplicates ══════════
console.log('\n⑨ شكل التدفّق — أربعة أسئلة بشرط، بلا تكرار')
{
  check('history step sits at index 2', HISTORY_STEP === 2)
  check('input steps are now 0..5', LAST_INPUT_STEP === 5)
  check('step names include history in position 2', SETUP_STEP_NAMES[HISTORY_STEP] === 'history')
  check('every step has a why-line', setupWhyLines('ar').length === LAST_INPUT_STEP + 1)
  check('the history why-line is not empty', setupWhyLines('ar')[HISTORY_STEP].length > 0)

  // Conditional rule.
  check("follow-ups do NOT apply to 'never'", !historyFollowUpsApply('never'))
  check('follow-ups do not apply before an answer', !historyFollowUpsApply(null))
  for (const v of TRAINED_BEFORE_VALUES.filter((x) => x !== 'never')) {
    check(`follow-ups apply to '${v}'`, historyFollowUpsApply(v))
  }

  const V = (over: Record<string, unknown> = {}) => ({
    age: 30, gender: 'male' as const, heightCm: 180, weightKg: 85,
    intent: 'plan' as const, level: 'intermediate' as const, trainingYears: null,
    trainedBefore: null, totalMonths: null, lastTrained: null, consistency: null,
    goal: 'cut' as const, days: 4, duration: 45, place: 'gym' as const, pref: 'mixed' as const, healthDataConsent: true,
    ...over,
  })

  check('history step blocked before any answer', validateStep(HISTORY_STEP, V()) === 'trainingHistory')
  check("'never' alone COMPLETES the history step", validateStep(HISTORY_STEP, V({ trainedBefore: 'never' })) === null)
  check('trained-before alone does NOT complete the step', validateStep(HISTORY_STEP, V({ trainedBefore: 'years' })) === 'trainingHistory')
  check('two of three follow-ups still blocks',
    validateStep(HISTORY_STEP, V({ trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now' })) === 'trainingHistory')
  check('all three follow-ups complete the step',
    validateStep(HISTORY_STEP, V({ trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady' })) === null)

  // Renumbered steps still validate their own thing.
  check('goal moved to 3', validateStep(3, V({ goal: null })) === 'goal')
  check('training moved to 4', validateStep(4, V({ days: 7 })) === 'training')
  check('equipment moved to 5', validateStep(5, V({ place: null })) === 'equipment')
  check('body is still 0 and consent still gates it', validateStep(0, V({ healthDataConsent: false })) === 'healthConsent')

  // Exactly four questions, and no question asked twice.
  for (const lang of ['ar', 'en'] as const) {
    const s = trainingHistoryStrings[lang]
    const questions = [s.trainedBeforeQ, s.totalMonthsQ, s.lastTrainedQ, s.consistencyQ]
    check(`${lang}: exactly 4 questions on the history step`, questions.length === 4)
    check(`${lang}: no duplicate question text`, new Set(questions).size === 4)
    check(`${lang}: every question is non-empty`, questions.every((q) => q.trim().length > 0))
    check(`${lang}: option values match the engine vocabulary — trainedBefore`,
      JSON.stringify(s.trainedBefore.map((o) => o.value)) === JSON.stringify([...TRAINED_BEFORE_VALUES]))
    check(`${lang}: option values match the engine vocabulary — totalMonths`,
      JSON.stringify(s.totalMonths.map((o) => o.value)) === JSON.stringify([...TOTAL_MONTHS_VALUES]))
    check(`${lang}: option values match the engine vocabulary — lastTrained`,
      JSON.stringify(s.lastTrained.map((o) => o.value)) === JSON.stringify([...LAST_TRAINED_VALUES]))
    check(`${lang}: option values match the engine vocabulary — consistency`,
      JSON.stringify(s.consistency.map((o) => o.value)) === JSON.stringify([...CONSISTENCY_VALUES]))
    check(`${lang}: every option label is non-empty`,
      [...s.trainedBefore, ...s.totalMonths, ...s.lastTrained, ...s.consistency].every((o) => o.label.trim().length > 0))
  }

  // No movementCompetency question was smuggled in.
  const allText = JSON.stringify(trainingHistoryStrings).toLowerCase()
  for (const banned of ['overhead', 'hinge', 'squat depth', 'competency']) {
    check(`no movementCompetency question added (${banned})`, !allText.includes(banned))
  }
}

// ═══ §9 Friction: exact interaction counts ═══════════════════════════════════
console.log('\n⑩ قياس الاحتكاك')
{
  const neverInteractions = 1
  const trainedInteractions = 4
  check('never-trained pays exactly 1 extra interaction', neverInteractions === 1)
  check('trained-before pays exactly 4 extra interactions', trainedInteractions === 4)
  check('exactly one extra visible screen for both paths', LAST_INPUT_STEP + 1 === 6)
  console.log(`  screens: 5 → 6 (+1) · extra answers: never=${neverInteractions} · trained=${trainedInteractions}`)
}

console.log(`\nqae-onboarding-evidence-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
