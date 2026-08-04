// اشتقاق الملف المهيكل + قيود توليد الخطة.
//
// ═══ ما يخرج من هنا ليس فقرة ═══
// «لا تخزّن فقرة مولَّدة وحدها؛ التطبيق يحتاج بيانات مهيكلة تستعملها ميزات
// أخرى» (§10 من المواصفة). فالمخرج كائن مطبوع بالكامل، والإجابات الخام تبقى
// محفوظة بجانبه — لأن الاشتقاق قد يتغيّر (رفع `ALGO_VERSION`) والخام لا يتغيّر.
//
// ═══ ولا رقم يدّعي دقّة لا يملكها ═══
// `confidence` **تغطية معلومة لا دقّة نتيجة**. تُحسب من نسبة الحقول التي جاءت
// من إجابة صريحة إلى مجموع الحقول. حقل لم يُسأل ⇒ افتراض معلَن في
// `assumptions[]`، لا رقم يمرّ كأنّه مقيس.

import { classifyExperience, classifyTrainingStatus } from './experience'
import { CORE_PATTERNS, GULF_CONTEXT_ASSUMED, PRIORITISABLE_MUSCLES } from './constants'
import { ALGO_VERSION, BANK_VERSION, type AnswerValue, type CardioPreference, type GoalKey, type Limitation, type PersonalizationProfile, type PersonalizationState, type PlanConstraints, type ProgressionStyle, type RecoveryClass, type SafetyFlags, type SplitKey, type TrainingPlace } from './types'
import type { Muscle, MovementPattern } from '@/types/workout'

// ————————————————————————— أدوات قراءة آمنة —————————————————————————

const str = (v: AnswerValue): string | null => (typeof v === 'string' && v.length ? v : null)
const num = (v: AnswerValue): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
const list = (v: AnswerValue): string[] => (Array.isArray(v) ? (v as string[]).filter((x) => typeof x === 'string') : [])
const bool = (v: AnswerValue): boolean => v === true

// ————————————————————————— السلامة —————————————————————————

/** خريطة منطقة الجسم ← ما تستبعده من أنماط وعضلات حين تكون مقيَّدة فعليًا. */
const AREA_RESTRICTIONS: Record<string, { patterns: MovementPattern[]; muscles: Muscle[] }> = {
  shoulder: { patterns: [], muscles: [] },
  elbow: { patterns: [], muscles: [] },
  wrist: { patterns: [], muscles: [] },
  lower_back: { patterns: ['hinge'], muscles: [] },
  upper_back: { patterns: [], muscles: [] },
  hip: { patterns: ['lunge'], muscles: [] },
  knee: { patterns: ['squat', 'lunge'], muscles: [] },
  ankle: { patterns: ['lunge'], muscles: ['calves'] },
  neck: { patterns: [], muscles: [] },
  core: { patterns: [], muscles: ['core'] },
}

export function deriveSafety(state: PersonalizationState): SafetyFlags {
  const a = state.answers
  const reasons: string[] = []
  const excludedPatterns = new Set<MovementPattern>()
  const excludedMuscles = new Set<Muscle>()

  if (bool(a.chestPain)) reasons.push('chest_pain')
  if (bool(a.fainting)) reasons.push('fainting')
  if (bool(a.doctorRestriction)) reasons.push('doctor_restriction')
  if (bool(a.dizzinessOnEffort)) reasons.push('dizziness')
  if (bool(a.recentSurgery)) reasons.push('recent_surgery')
  const preg = str(a.pregnancyStatus)
  if (preg === 'pregnant' || preg === 'postpartum') reasons.push(preg)
  const pain = num(a.painLevel)
  if (pain !== null && pain >= 6) reasons.push('high_pain')

  // مناطق مقيَّدة: الإصابة الحالية + قيد الطبيب + منطقة عملية حديثة.
  const restricted = new Set<string>([
    ...list(a.currentInjuryAreas),
    ...list(a.restrictionAreas),
    ...(str(a.surgeryWhen) === 'under6w' || str(a.surgeryWhen) === 'w6_12' ? list(a.surgeryAreas) : []),
  ])
  for (const area of restricted) {
    const r = AREA_RESTRICTIONS[area]
    if (!r) continue
    r.patterns.forEach((p) => excludedPatterns.add(p))
    r.muscles.forEach((m) => excludedMuscles.add(m))
  }

  // ألم أثناء نمط حركة بعينه ⇒ استبعاد النمط مباشرةً. أوضح إشارة وأصدقها:
  // المستخدم لم يصف منطقة بل فعلًا يؤلمه.
  for (const p of list(a.painOnMovement)) {
    if (p === 'push' || p === 'pull' || p === 'squat' || p === 'hinge') excludedPatterns.add(p)
    if (p === 'impact') excludedPatterns.add('cardio')
  }

  const noOverhead = str(a.shoulderOverhead) === 'cannot' || restricted.has('shoulder')
  const noImpact = str(a.impactTolerance) === 'none' || bool(a.balanceIssue === 'significant')
  const needsClearance = reasons.length > 0

  // سقف الصعوبة: السلامة تخفضه، والخبرة ترفعه — والأخفض يفوز دائمًا.
  const klass = classifyExperience(state).klass
  const byExperience: SafetyFlags['maxExerciseLevel'] =
    klass === 'advanced' ? 'advanced' : klass === 'intermediate' || klass === 'returning' ? 'intermediate' : 'beginner'
  const bySafety: SafetyFlags['maxExerciseLevel'] = needsClearance || restricted.size > 0 ? 'beginner' : 'advanced'
  const order = { beginner: 0, intermediate: 1, advanced: 2 } as const
  const maxExerciseLevel = order[byExperience] <= order[bySafety] ? byExperience : bySafety

  return {
    needsClearance,
    reasons,
    excludedPatterns: [...excludedPatterns],
    excludedMuscles: [...excludedMuscles],
    maxExerciseLevel,
    noOverhead,
    noImpact,
    noValsalva: needsClearance || bool(a.breathHoldingRisk),
  }
}

function deriveLimitations(state: PersonalizationState): Limitation[] {
  const a = state.answers
  const out: Limitation[] = []
  for (const area of list(a.currentInjuryAreas)) out.push({ area, kind: 'injury_current', active: true })
  for (const area of list(a.pastInjuryAreas)) out.push({ area, kind: 'injury_past', active: str(a.pastRecovered) === 'flares' })
  for (const area of list(a.restrictionAreas)) out.push({ area, kind: 'medical', active: true })
  for (const area of list(a.surgeryAreas)) out.push({ area, kind: 'surgery', active: str(a.surgeryWhen) !== 'over6m' })
  for (const area of list(a.romLimits)) out.push({ area, kind: 'restricted_rom', active: true })
  if (str(a.balanceIssue) === 'significant') out.push({ area: 'core', kind: 'balance', active: true })
  return out
}

// ————————————————————————— الهدف —————————————————————————

const GOAL_FROM_DISPLAY: Record<string, GoalKey> = {
  fat_loss: 'cut',
  muscle_gain: 'bulk',
  strength: 'bulk',
  recomp: 'maintain',
  general_health: 'maintain',
  get_fitter: 'maintain',
}

export function deriveGoal(state: PersonalizationState): { goal: GoalKey; wordingKey: string } {
  const display = str(state.answers.primaryGoalDisplay) ?? str(state.answers.fillGoalMinor)
  // القاصر: الصيانة حصرًا مهما وصل من قيمة. حاجز مكرّر عمدًا — الاشتقاق لا
  // يثق بأن التحقّق سبقه (المسوّدة مدخل غير موثوق كأي مدخل، الميثاق §5).
  if (state.derived.isMinor === true) return { goal: 'maintain', wordingKey: 'minor_maintain' }
  const goal: GoalKey = display ? (GOAL_FROM_DISPLAY[display] ?? 'maintain') : 'maintain'
  return { goal, wordingKey: display ?? 'general_health' }
}

// ————————————————————————— التعافي والحجم —————————————————————————

export function deriveRecovery(state: PersonalizationState): RecoveryClass {
  const a = state.answers
  let score = 0
  const sleep = str(a.sleepHours)
  if (sleep === 'h7_8' || sleep === 'gt8') score += 2
  else if (sleep === 'h6_7') score += 1
  const quality = str(a.sleepQuality)
  if (quality === 'good') score += 1
  else if (quality === 'poor') score -= 1
  const stress = str(a.stressLevel)
  if (stress === 'low') score += 1
  else if (stress === 'high') score -= 1
  if (str(a.fatigueAfter) === 'wiped') score -= 1
  if (str(a.sorenessHistory) === 'lingering') score -= 1
  const self = num(a.recoverySelfRating)
  if (self !== null) score += self >= 4 ? 1 : self <= 2 ? -1 : 0
  if (str(a.otherSportNow) === 'competitive') score -= 1
  return score >= 3 ? 'good' : score >= 0 ? 'fair' : 'poor'
}

const VOLUME_BY_CLASS: Record<string, number> = {
  complete_beginner: 8,
  beginner: 10,
  early_intermediate: 12,
  intermediate: 14,
  advanced: 16,
  returning: 9,
}

// ————————————————————————— القيود —————————————————————————

function deriveSplit(state: PersonalizationState, days: number): SplitKey {
  const chosen = str(state.answers.splitChoice)
  if (chosen && chosen !== 'auto') return chosen as SplitKey
  if (days <= 3) return 'full_body'
  if (days === 4) return 'upper_lower'
  if (days >= 5) return 'push_pull_legs'
  return 'auto'
}

function deriveProgression(state: PersonalizationState, klass: string): ProgressionStyle {
  const chosen = str(state.answers.progressionStyle)
  if (chosen && chosen !== 'auto') return chosen as ProgressionStyle
  // المبتدئ لا يُعطى نموذجًا يحتاج تقدير جهد ذاتيًا لم يبنِه بعد.
  if (klass === 'complete_beginner' || klass === 'beginner') return 'rep_first'
  if (klass === 'advanced' && str(state.answers.rirFamiliarity) === 'use_it') return 'rpe_based'
  return 'double_progression'
}

function deriveMusclePriorities(state: PersonalizationState): Muscle[] {
  const raw = [...list(state.answers.musclePriority), str(state.answers.weakPoint) ?? '', str(state.answers.specialisation) ?? '']
  const mapped: Muscle[] = []
  for (const r of raw) {
    if (!r || r === 'none' || r === 'balanced') continue
    if (r === 'arms') {
      mapped.push('biceps', 'triceps')
      continue
    }
    if (PRIORITISABLE_MUSCLES.includes(r as Muscle)) mapped.push(r as Muscle)
  }
  if (str(state.answers.postureConcern) === 'true' || state.answers.postureConcern === true) mapped.push('back')
  if (state.answers.sittingHours === 'gt8') mapped.push('glutes')
  return [...new Set(mapped)]
}

function deriveCardio(state: PersonalizationState, goal: GoalKey): CardioPreference {
  const willing = str(state.answers.cardioWilling)
  if (willing === 'no') return 'none'
  if (str(state.answers.otherSportNow) === 'competitive') return 'sport_only'
  if (willing === 'love_it') return 'high'
  if (willing === 'yes') return 'moderate'
  if (willing === 'little') return 'light'
  return goal === 'cut' ? 'moderate' : 'light'
}

export function deriveConstraints(state: PersonalizationState, safety: SafetyFlags, goal: GoalKey): PlanConstraints {
  const a = state.answers
  const klass = String(state.derived.experienceClass ?? 'complete_beginner')
  const days = num(a.daysPerWeek) ?? 3
  const minutes = num(a.sessionMinutes) ?? 45
  const split = deriveSplit(state, days)

  // حجم البداية: قاعدة التصنيف، معدَّلة بالتعافي والانقطاع والهدف.
  let sets = VOLUME_BY_CLASS[klass] ?? 10
  const recovery = deriveRecovery(state)
  if (recovery === 'poor') sets -= 3
  else if (recovery === 'good') sets += 1
  if (str(a.returnRamp) === 'easy') sets -= 3
  if (str(a.volumePref) === 'low') sets -= 2
  else if (str(a.volumePref) === 'high') sets += 3
  if (safety.needsClearance) sets = Math.min(sets, 8)
  sets = Math.max(6, Math.min(22, sets))

  // مدى التكرارات يتبع ميل القوة/الحجم، ويُقصَر للمبتدئ على مدى واحد آمن.
  const bias = str(a.strengthHypertrophyBias)
  const repRange =
    klass === 'complete_beginner' || klass === 'beginner'
      ? { min: 8, max: 12 }
      : bias === 'strength'
        ? { min: 4, max: 8 }
        : bias === 'hypertrophy'
          ? { min: 8, max: 15 }
          : { min: 6, max: 12 }

  const restPref = str(a.restPreference)
  const restSecRange =
    restPref === 'short' ? { min: 45, max: 75 } : restPref === 'long' ? { min: 120, max: 210 } : { min: 60, max: 150 }

  // عدد التمارين: دقيقة تقريبًا لكل مجموعة + راحة. تقدير معلَن، لا وعد.
  const perExercise = minutes <= 30 ? 5 : 7
  const warmup = str(a.warmupTime) === 'full' ? 10 : str(a.warmupTime) === 'none' ? 0 : 5
  const maxExercises = Math.max(3, Math.min(10, Math.floor((minutes - warmup) / perExercise)))

  const requiredPatterns = CORE_PATTERNS.filter((p) => !safety.excludedPatterns.includes(p))

  return {
    sessionsPerWeek: days,
    split,
    sessionMinutes: minutes,
    musclePriorities: deriveMusclePriorities(state),
    requiredPatterns: [...requiredPatterns],
    weeklySetsStart: sets,
    repRange,
    restSecRange,
    progression: deriveProgression(state, klass),
    maxExerciseLevel: safety.maxExerciseLevel,
    cardio: deriveCardio(state, goal),
    maxExercisesPerSession: maxExercises,
    allowSubstitution: str(a.substitutionOpenness) !== 'never',
    // مفترَض دائمًا ولا يُسأل ([CTO-76] القرار ٢) — انظر `GULF_CONTEXT_ASSUMED`.
    assumesGulfContext: GULF_CONTEXT_ASSUMED,
  }
}

// ————————————————————————— الاشتقاق الكامل —————————————————————————

/** حقول تُحسب من إجابات صريحة — أساس نسبة التغطية. */
const CONFIDENCE_KEYS = [
  'age',
  'sex',
  'heightCm',
  'weightKg',
  'trainedBefore',
  'consistency',
  'primaryGoalDisplay',
  'daysPerWeek',
  'sessionMinutes',
  'place',
  'trainingStyle',
  'hasInjury',
  'sleepHours',
  'stressLevel',
  'cardioWilling',
] as const

export interface DerivedProfileResult {
  profile: PersonalizationProfile
  /** كل حقل لم يأتِ من إجابة صريحة، وقيمته الافتراضية — يُعرض لا يُخفى. */
  assumptions: { field: string; value: string }[]
}

export function deriveProfile(state: PersonalizationState, now = Date.now()): DerivedProfileResult {
  const a = state.answers
  const verdict = classifyExperience(state)
  const safety = deriveSafety(state)
  const { goal, wordingKey } = deriveGoal(state)
  const constraints = deriveConstraints(state, safety, goal)
  const assumptions: { field: string; value: string }[] = []

  const answered = CONFIDENCE_KEYS.filter((k) => a[k] !== undefined && a[k] !== null)
  for (const k of CONFIDENCE_KEYS) if (!answered.includes(k)) assumptions.push({ field: k, value: 'default' })

  const secondaryDisplay = str(a.secondaryGoalDisplay)
  const styleAnswer = str(a.trainingStyle)

  const profile: PersonalizationProfile = {
    userId: state.userId,
    algoVersion: ALGO_VERSION,
    bankVersion: BANK_VERSION,
    completedAt: now,

    age: num(a.age),
    sex: str(a.sex) === 'male' ? 'male' : str(a.sex) === 'female' ? 'female' : null,
    heightCm: num(a.heightCm),
    weightKg: num(a.weightKg),
    lang: state.lang,
    units: str(a.units) === 'imperial' ? 'imperial' : 'metric',

    experience: verdict.klass,
    experienceConfidence: verdict.confidence,
    trainingStatus: classifyTrainingStatus(state),

    primaryGoal: goal,
    secondaryGoal: secondaryDisplay && secondaryDisplay !== 'none' ? (GOAL_FROM_DISPLAY[secondaryDisplay] ?? null) : null,
    goalWordingKey: wordingKey,

    daysPerWeek: constraints.sessionsPerWeek,
    availableDays: (Array.isArray(a.availableDays) ? (a.availableDays as number[]) : []).filter((d) => Number.isInteger(d)),
    sessionMinutes: constraints.sessionMinutes,

    place: (str(a.place) as TrainingPlace) ?? 'gym',
    equipment: deriveEquipment(state),
    preferredExercises: list(a.preferredExercises),
    excludedExercises: [...new Set([...list(a.dislikedExercises), ...list(a.cannotPerform)])],

    limitations: deriveLimitations(state),
    safety,

    trainingStyle: styleAnswer === 'machines' || styleAnswer === 'free_weights' || styleAnswer === 'bodyweight' ? styleAnswer : 'mixed',
    split: constraints.split,
    progression: constraints.progression,
    recovery: deriveRecovery(state),
    intensity: deriveIntensity(state, safety),
    volume: { weeklySetsPerMuscle: constraints.weeklySetsStart },
    cardio: constraints.cardio,
    controlLevel: (str(a.controlLevel) as PersonalizationProfile['controlLevel']) ?? 'guided',
    musclePriorities: constraints.musclePriorities,

    planConstraints: constraints,
    confidence: Math.round((answered.length / CONFIDENCE_KEYS.length) * 100) / 100,
  }

  return { profile, assumptions }
}

/**
 * المعدّات المتاحة فعلًا. **النادي يعني توفّر المفردات كلّها** — ولذلك لا
 * تُسأل قائمة المعدّات في مسار النادي أصلًا (`bank/logistics.ts`). ولو بقيت
 * فارغة رغم كل شيء، نعود إلى `bodyweight` — وهو الافتراض الوحيد الذي **لا
 * يَعِد بما لا يملك المستخدم**.
 */
export function deriveEquipment(state: PersonalizationState): string[] {
  const a = state.answers
  const place = str(a.place)
  if (place === 'gym' || place === 'mixed') {
    const gym = str(a.gymType)
    if (gym === 'machines_only') return ['machine', 'cable', 'bodyweight', 'bench']
    if (gym === 'hotel') return ['dumbbell', 'machine', 'bodyweight', 'bench']
    return ['machine', 'bodyweight', 'dumbbell', 'cable', 'barbell', 'bench', 'ez-bar', 'band', 'smith', 'rope', 'plate', 'kettlebell']
  }
  const picked = list(a.equipmentList)
  const fill = str(a.fillEquipment)
  if (!picked.length && fill) {
    if (fill === 'gym_full') return ['machine', 'bodyweight', 'dumbbell', 'cable', 'barbell', 'bench']
    if (fill === 'dumbbells_only') return ['dumbbell', 'bodyweight']
    if (fill === 'bands_only') return ['band', 'bodyweight']
    return ['bodyweight']
  }
  const out = new Set(picked)
  out.add('bodyweight')
  if (bool(a.hasPullupBar)) out.add('bodyweight')
  return [...out]
}

function deriveIntensity(state: PersonalizationState, safety: SafetyFlags): { rirMin: number; rirMax: number } {
  const a = state.answers
  const target = num(a.targetRir)
  if (target !== null) return { rirMin: Math.max(0, target - 1), rirMax: target + 1 }
  if (safety.needsClearance) return { rirMin: 3, rirMax: 4 }
  const pref = str(a.intensityPref)
  if (pref === 'hard') return { rirMin: 0, rirMax: 2 }
  if (pref === 'conservative') return { rirMin: 3, rirMax: 4 }
  const klass = String(state.derived.experienceClass ?? '')
  if (klass === 'complete_beginner' || klass === 'beginner') return { rirMin: 3, rirMax: 4 }
  if (klass === 'advanced') return { rirMin: 1, rirMax: 2 }
  return { rirMin: 2, rirMax: 3 }
}
