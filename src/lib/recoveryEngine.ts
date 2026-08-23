// محرّك التعافي v2 (P11) — قواعد مُرقَّمة الإصدار مع أثر قرار كامل.
//
// القواعد الحاكمة:
//   • قاعدة D: المحرّك لا يعدّل الخطة أبدًا — يُخرج اقتراحًا فقط، والموافقة/الرفض
//     عقد واجهة خارج هذه الوحدة. لا استيراد لأي متجر خطة هنا (حارس في البرهان).
//   • كل المدخلات اختيارية: يعمل يدويًا بالكامل بلا HealthKit وبلا سجلّ تدريب.
//   • البيانات الغائبة تخفض الثقة ولا تُختلق قيمة أبدًا.
//   • مضاد المبالغة: قراءة سيئة واحدة لا تنتج «راحة» وحدها — الراحة تتطلّب
//     عاملين مُعزِّزين فأكثر (أو ألمًا عضليًا شديدًا صريحًا وهو الحاسم الوحيد).
//   • إشارات متعارضة ⇒ «تقدّم بحذر» بثقة منخفضة — لا اختراع حسم.
//   • اللغة: مؤشرات راحة وحمل تدريبي فقط — لا لغة تشخيصية (حارس نصّي في البرهان).
//   • RULES_VERSION يُختم في كل تقييم وكل سجلّ؛ تغيير الشكل يمرّ عبر runMigration.
//
// الوحدة القديمة src/lib/recovery.ts تبقى (upgrade مؤجّل لواجهتها) — سجلّها v1
// يُستورد للقراءة عبر ensureRecoveryEngineMigrated دون حذفه.

import { getDayStamp } from './today'
import { runMigration } from './dataOwnership'
import { enqueueSyncOperation, getSyncRuntime } from './syncQueue'
import { getWorkoutSessions } from './historyStore'
import type { WorkoutSession } from './workoutSessions'
import { samplesFor } from './health/store'
import { dailySeries } from './health/normalize'
import { RECOVERY_LOG_BASE, type RecoveryEntry as LegacyRecoveryEntry } from './recovery'
import { assertPaid } from '@/lib/access/guard'

/** إصدار القواعد — يرتفع مع أي تغيير في الأوزان/العتبات، ويُختم في كل تقييم. */
export const RULES_VERSION = 'v2.0.0'

// ── المدخلات (كلها اختيارية) ─────────────────────────────────────────────────

export type SleepQuality = 'poor' | 'ok' | 'good'
export type EnergyLevel = 'low' | 'ok' | 'high'
export type StressLevel = 'low' | 'ok' | 'high'
export type SorenessLevel = 'none' | 'mild' | 'moderate' | 'severe'
export type BodyArea = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'general'

/** إشارة صحية مقروءة من P9 (نبض راحة/تغيّرية النبض): قيمة حالية + خط أساس فعليان. */
export interface HealthSignal {
  current: number
  baseline: number
}

/** الحمل التدريبي المشتق من السجلّ: آخر ٧ أيام مقابل الأسبوع الذي قبله. */
export interface TrainingLoad {
  sessions7: number
  sessionsPrior7: number
  volume7: number
  volumePrior7: number
  /** نسبة الحمل الحالي إلى السابق (بالأطقم المكتملة، أو بالجلسات عند غيابها). */
  ratio: number
}

export interface RecoveryEngineInput {
  sleepQuality?: SleepQuality
  /** ساعات النوم الفعلية إن عُرفت. */
  sleepDurationH?: number
  energy?: EnergyLevel
  stress?: StressLevel
  /** ألم عضلي لكل منطقة — 'general' للتقارير غير المفصّلة (ومنها سجلّ v1). */
  soreness?: Partial<Record<BodyArea, SorenessLevel>>
  /** يُشتق عبر deriveTrainingLoad / trainingLoadFromHistory — اختياري. */
  trainingLoad?: TrainingLoad
  /** من P9 عند توفّره — اختياري تمامًا، والمحرّك يعمل بدونه. */
  restingHeartRate?: HealthSignal
  hrv?: HealthSignal
}

// ── المخرجات: اقتراح + ثقة + أثر قرار كامل ──────────────────────────────────

export type RecoverySuggestion = 'proceed' | 'reduce_volume' | 'reduce_intensity' | 'rest'

export type FactorId =
  | 'sleep_quality'
  | 'sleep_duration'
  | 'energy'
  | 'stress'
  | 'soreness'
  | 'training_load'
  | 'resting_hr'
  | 'hrv'
  | 'legacy_v1'

export type FactorDirection = 'recovered' | 'strained' | 'neutral'

/** مساهمة عامل واحد في القرار — أثر القرار المطلوب (typed trace). */
export interface FactorContribution {
  factor: FactorId
  direction: FactorDirection
  /** قوة المساهمة 0–3. */
  weight: number
  note: { ar: string; en: string }
  /** true للعامل الوحيد المسموح له بحسم «راحة» منفردًا (ألم شديد صريح). */
  decisive?: boolean
}

export interface RecoveryFlags {
  /** إشارات متعارضة (إجهاد واستشفاء معًا بفارق ضئيل) ⇒ تقدّم بحذر. */
  conflicting: boolean
  /** بيانات قليلة (أقل من عاملين) ⇒ الثقة تنخفض ولا يُخترع شيء. */
  lowData: boolean
  decisiveSoreness: boolean
}

export interface RecoveryEvaluation {
  suggestion: RecoverySuggestion
  /** 0–1: تغطية البيانات المتاحة مع خصم التعارض — لا تُرفع اصطناعيًا أبدًا. */
  confidence: number
  /** درجة جاهزية 0–100 لسلاسل الاتجاه (50 = محايد). */
  score: number
  reasons: FactorContribution[]
  flags: RecoveryFlags
  rulesVersion: string
}

// ── تقييم العوامل ────────────────────────────────────────────────────────────

const TOTAL_FACTORS = 8

const contribution = (
  factor: FactorId,
  direction: FactorDirection,
  weight: number,
  ar: string,
  en: string,
  decisive = false,
): FactorContribution => ({ factor, direction, weight, note: { ar, en }, ...(decisive ? { decisive: true } : {}) })

const SORENESS_RANK: Record<SorenessLevel, number> = { none: 0, mild: 1, moderate: 2, severe: 3 }

function sorenessContribution(soreness: NonNullable<RecoveryEngineInput['soreness']>): FactorContribution | null {
  const entries = Object.entries(soreness) as [BodyArea, SorenessLevel][]
  if (!entries.length) return null
  const severeAreas = entries.filter(([, level]) => level === 'severe').map(([area]) => area)
  if (severeAreas.length) {
    return contribution('soreness', 'strained', 3, 'ألم عضلي شديد مُبلَّغ — إشارة حاسمة للراحة', 'Severe reported soreness — decisive rest signal', true)
  }
  const moderate = entries.filter(([, level]) => level === 'moderate').length
  const mild = entries.filter(([, level]) => level === 'mild').length
  if (moderate >= 2) return contribution('soreness', 'strained', 2, 'ألم عضلي متوسط في أكثر من منطقة', 'Moderate soreness across multiple areas')
  if (moderate === 1 || mild >= 2) return contribution('soreness', 'strained', 1, 'ألم عضلي خفيف إلى متوسط', 'Mild-to-moderate soreness')
  if (entries.every(([, level]) => SORENESS_RANK[level] === 0)) {
    return contribution('soreness', 'recovered', 1, 'لا ألم عضلي مُبلَّغ', 'No reported soreness')
  }
  return contribution('soreness', 'neutral', 0, 'ألم عضلي خفيف محدود', 'Limited mild soreness')
}

function evaluateFactors(input: RecoveryEngineInput): FactorContribution[] {
  const reasons: FactorContribution[] = []

  if (input.sleepQuality) {
    if (input.sleepQuality === 'poor') reasons.push(contribution('sleep_quality', 'strained', 2, 'نوم سيّئ مُبلَّغ', 'Reported poor sleep'))
    else if (input.sleepQuality === 'good') reasons.push(contribution('sleep_quality', 'recovered', 1, 'نوم جيّد مُبلَّغ', 'Reported good sleep'))
    else reasons.push(contribution('sleep_quality', 'neutral', 0, 'نوم مقبول', 'Adequate sleep'))
  }

  if (typeof input.sleepDurationH === 'number' && Number.isFinite(input.sleepDurationH)) {
    if (input.sleepDurationH < 6) reasons.push(contribution('sleep_duration', 'strained', 1, `مدة نوم قصيرة (${input.sleepDurationH} س)`, `Short sleep duration (${input.sleepDurationH}h)`))
    else if (input.sleepDurationH >= 7 && input.sleepDurationH <= 9.5) reasons.push(contribution('sleep_duration', 'recovered', 1, 'مدة نوم كافية', 'Sufficient sleep duration'))
    else reasons.push(contribution('sleep_duration', 'neutral', 0, 'مدة نوم على الحدّ', 'Borderline sleep duration'))
  }

  if (input.energy) {
    if (input.energy === 'low') reasons.push(contribution('energy', 'strained', 2, 'طاقة منخفضة مُبلَّغة', 'Reported low energy'))
    else if (input.energy === 'high') reasons.push(contribution('energy', 'recovered', 1, 'طاقة عالية مُبلَّغة', 'Reported high energy'))
    else reasons.push(contribution('energy', 'neutral', 0, 'طاقة معتادة', 'Usual energy'))
  }

  if (input.stress) {
    if (input.stress === 'high') reasons.push(contribution('stress', 'strained', 1, 'توتّر مرتفع مُبلَّغ', 'Reported high stress'))
    else if (input.stress === 'low') reasons.push(contribution('stress', 'recovered', 1, 'توتّر منخفض', 'Low stress'))
    else reasons.push(contribution('stress', 'neutral', 0, 'توتّر معتاد', 'Usual stress'))
  }

  if (input.soreness) {
    const sore = sorenessContribution(input.soreness)
    if (sore) reasons.push(sore)
  }

  if (input.trainingLoad) {
    const { ratio, sessions7 } = input.trainingLoad
    if (ratio >= 1.5 || sessions7 >= 6) reasons.push(contribution('training_load', 'strained', 2, 'حمل تدريبي مرتفع مقارنة بالأسبوع السابق', 'Training load high vs prior week'))
    else if (ratio >= 1.25) reasons.push(contribution('training_load', 'strained', 1, 'حمل تدريبي متصاعد', 'Rising training load'))
    else if (ratio <= 0.5 && sessions7 <= 2) reasons.push(contribution('training_load', 'recovered', 1, 'حمل تدريبي خفيف هذا الأسبوع', 'Light training load this week'))
    else reasons.push(contribution('training_load', 'neutral', 0, 'حمل تدريبي معتاد', 'Usual training load'))
  }

  if (input.restingHeartRate && Number.isFinite(input.restingHeartRate.current) && Number.isFinite(input.restingHeartRate.baseline) && input.restingHeartRate.baseline > 0) {
    const rise = input.restingHeartRate.current / input.restingHeartRate.baseline
    if (rise >= 1.08) reasons.push(contribution('resting_hr', 'strained', 1, 'نبض الراحة أعلى من خط أساسك', 'Resting heart rate above your baseline'))
    else if (rise <= 0.97) reasons.push(contribution('resting_hr', 'recovered', 1, 'نبض الراحة عند خط أساسك أو أدنى', 'Resting heart rate at/below baseline'))
    else reasons.push(contribution('resting_hr', 'neutral', 0, 'نبض الراحة ضمن المعتاد', 'Resting heart rate in usual range'))
  }

  if (input.hrv && Number.isFinite(input.hrv.current) && Number.isFinite(input.hrv.baseline) && input.hrv.baseline > 0) {
    const drop = input.hrv.current / input.hrv.baseline
    if (drop <= 0.85) reasons.push(contribution('hrv', 'strained', 1, 'تغيّرية النبض أدنى من خط أساسك', 'HRV below your baseline'))
    else if (drop >= 1.0) reasons.push(contribution('hrv', 'recovered', 1, 'تغيّرية النبض عند خط أساسك أو أعلى', 'HRV at/above baseline'))
    else reasons.push(contribution('hrv', 'neutral', 0, 'تغيّرية النبض ضمن المعتاد', 'HRV in usual range'))
  }

  return reasons
}

// ── القرار ───────────────────────────────────────────────────────────────────

const round2 = (value: number): number => Math.round(value * 100) / 100
const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value))

/**
 * التقييم النقي — لا قراءة تخزين ولا كتابة ولا أي تعديل خطة (قاعدة D).
 * البيانات الغائبة = عوامل غائبة ⇒ ثقة أدنى، لا قيم مُخترعة.
 */
export function evaluateRecovery(input: RecoveryEngineInput): RecoveryEvaluation {
  const reasons = evaluateFactors(input)
  const strained = reasons.filter((r) => r.direction === 'strained')
  const recovered = reasons.filter((r) => r.direction === 'recovered')
  const strainScore = strained.reduce((sum, r) => sum + r.weight, 0)
  const recoveredScore = recovered.reduce((sum, r) => sum + r.weight, 0)
  const margin = strainScore - recoveredScore
  const decisiveSoreness = reasons.some((r) => r.decisive === true)

  let suggestion: RecoverySuggestion
  let conflicting = false

  if (decisiveSoreness) {
    // الاستثناء الوحيد لقاعدة «عاملين فأكثر»: ألم شديد صريح يحسم وحده.
    suggestion = 'rest'
  } else if (strained.length >= 2 && margin >= 5) {
    // راحة فقط بعاملين مُعزِّزين فأكثر وبهامش واضح — مضاد المبالغة.
    suggestion = 'rest'
  } else if (margin >= 2) {
    const loadStrained = strained.find((r) => r.factor === 'training_load' && r.weight >= 2)
    suggestion = loadStrained ? 'reduce_volume' : 'reduce_intensity'
  } else if (strainScore > 0 && recoveredScore > 0) {
    // تعارض بفارق ضئيل ⇒ تقدّم بحذر وثقة منخفضة — لا حسم مُخترع.
    conflicting = true
    suggestion = 'proceed'
  } else {
    suggestion = 'proceed'
  }

  const coverage = reasons.length / TOTAL_FACTORS
  let confidence = 0.2 + 0.7 * coverage
  if (conflicting) confidence = Math.min(confidence, 0.35)
  const lowData = reasons.length < 2
  if (lowData) confidence = Math.min(confidence, 0.3)
  confidence = round2(clamp(confidence, 0.1, 0.95))

  const score = Math.round(clamp(50 + 10 * (recoveredScore - strainScore), 0, 100))

  return {
    suggestion,
    confidence,
    score,
    reasons,
    flags: { conflicting, lowData, decisiveSoreness },
    rulesVersion: RULES_VERSION,
  }
}

// ── اشتقاق الحمل التدريبي من السجلّ (نقي + غلاف قراءة) ───────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

function completedSetCount(session: WorkoutSession): number {
  let sets = 0
  let fallback = 0
  for (const exercise of session.exercises ?? []) {
    if (exercise.sets?.length) sets += exercise.sets.filter((s) => s.completed).length
    else if (exercise.completed) fallback += 1
  }
  // عند غياب تفاصيل الأطقم (سجلّات قديمة) يُحتسب التمرين المكتمل كوحدة حجم واحدة.
  return sets + fallback
}

/**
 * حمل آخر ٧ أيام مقابل الأسبوع السابق (٨–١٤ يومًا). يعيد undefined عند خلوّ
 * الأسبوعين معًا — غياب البيانات غياب، لا نسبة مُخترعة.
 */
export function deriveTrainingLoad(sessions: WorkoutSession[], now = new Date()): TrainingLoad | undefined {
  const nowMs = now.getTime()
  let sessions7 = 0
  let sessionsPrior7 = 0
  let volume7 = 0
  let volumePrior7 = 0
  for (const session of sessions) {
    const t = new Date(session.startedAt ?? session.date).getTime()
    if (!Number.isFinite(t)) continue
    const age = nowMs - t
    if (age < 0 || age >= 14 * DAY_MS) continue
    if (age < 7 * DAY_MS) {
      sessions7 += 1
      volume7 += completedSetCount(session)
    } else {
      sessionsPrior7 += 1
      volumePrior7 += completedSetCount(session)
    }
  }
  if (sessions7 === 0 && sessionsPrior7 === 0) return undefined
  // النسبة بالحجم (أطقم مكتملة) عند توفّره، وإلا بعدد الجلسات. قاعدة صفرية:
  // أسبوع سابق فارغ + حالي نشط ⇒ نسبة مرتفعة بقدر النشاط (قفزة حمل حقيقية).
  const ratioOf = (current: number, prior: number): number => (prior > 0 ? current / prior : current > 0 ? 2 : 1)
  const ratio = volume7 > 0 || volumePrior7 > 0 ? ratioOf(volume7, volumePrior7) : ratioOf(sessions7, sessionsPrior7)
  return { sessions7, sessionsPrior7, volume7, volumePrior7, ratio: round2(ratio) }
}

/** غلاف قراءة: الحمل من متجر السجلّ الفعلي. */
export function trainingLoadFromHistory(now = new Date()): TrainingLoad | undefined {
  return deriveTrainingLoad(getWorkoutSessions(), now)
}

// ── إشارات P9 (اختيارية بالكامل) ─────────────────────────────────────────────

function signalFromSeries(series: { day: string; value: number }[], today: string): HealthSignal | undefined {
  if (!series.length) return undefined
  const latest = series[series.length - 1]
  // أحدث قيمة تصلح «حالية» فقط إذا كانت من اليوم أو الأمس — لا قيم قديمة كأنها حاضرة.
  const latestAge = (new Date(today).getTime() - new Date(latest.day).getTime()) / DAY_MS
  if (!Number.isFinite(latestAge) || latestAge > 1) return undefined
  const baselinePoints = series.slice(0, -1).slice(-28)
  if (baselinePoints.length < 3) return undefined
  const baseline = baselinePoints.reduce((sum, p) => sum + p.value, 0) / baselinePoints.length
  if (!Number.isFinite(baseline) || baseline <= 0) return undefined
  return { current: latest.value, baseline: round2(baseline) }
}

/**
 * يقرأ نبض الراحة وتغيّرية النبض من متجر عيّنات P9 إن وُجدت بيانات كافية
 * (قيمة حديثة + ≥3 أيام خط أساس) — وإلا undefined والمحرّك يعمل يدويًا.
 */
export function healthSignalsFromStore(today = getDayStamp()): Pick<RecoveryEngineInput, 'restingHeartRate' | 'hrv'> {
  const out: Pick<RecoveryEngineInput, 'restingHeartRate' | 'hrv'> = {}
  const rhr = signalFromSeries(dailySeries('restingHeartRate', samplesFor('restingHeartRate', { days: 30 })), today)
  if (rhr) out.restingHeartRate = rhr
  const hrv = signalFromSeries(dailySeries('heartRateVariabilitySDNN', samplesFor('heartRateVariabilitySDNN', { days: 30 })), today)
  if (hrv) out.hrv = hrv
  return out
}

// ── سجلّ v2 (مالك المفتاح: qimmah:recovery-log:v2:<owner>) ───────────────────

export const RECOVERY_ENGINE_LOG_BASE = 'qimmah:recovery-log:v2'
export const recoveryEngineLogKey = (ownerId: string | null): string => `${RECOVERY_ENGINE_LOG_BASE}:${ownerId ?? 'guest'}`

/** سقف السجلّ — يطابق سياسة v1. */
export const RECOVERY_ENGINE_LOG_CAP = 180

export interface RecoveryEngineEntry {
  date: string
  rulesVersion: string
  input: RecoveryEngineInput
  suggestion: RecoverySuggestion
  confidence: number
  score: number
  reasons: FactorContribution[]
  flags: RecoveryFlags
  /** طابع آخر حفظ (P12) — دليل LWW لمزامنة recovery_logs؛ يغيب في الإدخالات الأقدم. */
  updatedAt?: string
}

export function loadRecoveryEngineLog(ownerId: string | null): RecoveryEngineEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(recoveryEngineLogKey(ownerId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecoveryEngineEntry[]) : []
  } catch {
    return []
  }
}

function writeEngineLog(ownerId: string | null, entries: RecoveryEngineEntry[]): void {
  try {
    window.localStorage.setItem(recoveryEngineLogKey(ownerId), JSON.stringify(entries.slice(0, RECOVERY_ENGINE_LOG_CAP)))
  } catch {
    /* تخزين ممتلئ — التقييم المعاد يبقى صالحًا للعرض */
  }
}

/** يقيّم ويحفظ فحص اليوم (يستبدل فحص اليوم نفسه إن وُجد). لا يمسّ الخطة أبدًا. */
export function saveRecoveryEngineEntry(ownerId: string | null, input: RecoveryEngineInput): RecoveryEngineEntry {
  assertPaid('recovery.log')
  const evaluation = evaluateRecovery(input)
  const entry: RecoveryEngineEntry = {
    date: getDayStamp(),
    rulesVersion: evaluation.rulesVersion,
    input,
    suggestion: evaluation.suggestion,
    confidence: evaluation.confidence,
    score: evaluation.score,
    reasons: evaluation.reasons,
    flags: evaluation.flags,
    updatedAt: new Date().toISOString(),
  }
  const rest = loadRecoveryEngineLog(ownerId).filter((e) => e.date !== entry.date)
  writeEngineLog(ownerId, [entry, ...rest])
  enqueueRecoveryEntrySync(ownerId, entry)
  return entry
}

/**
 * مزامنة سجلّ التعافي (P12): صف لكل (مالك، يوم) في recovery_logs — يُرفع فقط حين
 * يطابق مالك السجلّ مالكَ جلسة المزامنة الموثَّق (بوابات العلم/التبنّي في syncQueue).
 * الفحص إدخال يدوي من المستخدم. وإشارات الصحة داخله (نبض/HRV/وجع العضلات)
 * **ليست محليّة دائمًا** — وهذا التعليق كان يقول إنها كذلك، وكان **غير صحيح**:
 * الحمولة أعلاه تحمل `input` كاملًا. [GOV-003] ما يحكمها الآن هو الموافقة
 * الصحّية المنفصلة: عند رفضها يجرّدها `sanitizeSyncPayload` من الصفّ (سياسة
 * `recovery_logs` في `syncFieldPolicy.ts`)، وعند منحها تُرفع بعلم المستخدم.
 * فالضمان **موافقة**، لا «لا تغادر الجهاز» — والفرق بينهما هو ما يجعل الجملة
 * الأولى وعدًا لا يُحفظ (§5: الصدق قبل الطمأنينة).
 */
function enqueueRecoveryEntrySync(ownerId: string | null, entry: RecoveryEngineEntry): void {
  if (!ownerId || ownerId !== getSyncRuntime().userId) return
  enqueueSyncOperation('recovery_logs', entry.date, {
    date: entry.date,
    data: entry,
    updated_at: entry.updatedAt ?? new Date().toISOString(),
  })
}

/**
 * كتابة فحص من مسار المزامنة (hydrate) — إدراج/استبدال يومه دون إعادة رفع
 * (capture موقوف أثناء الترطيب) مع الحفاظ على ترتيب الأحدث أولًا وسقف السجلّ.
 */
export function applyRecoveryEntryFromSync(ownerId: string | null, entry: RecoveryEngineEntry): void {
  if (typeof window === 'undefined' || !entry?.date) return
  const rest = loadRecoveryEngineLog(ownerId).filter((e) => e.date !== entry.date)
  const next = [entry, ...rest].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  writeEngineLog(ownerId, next)
}

export function todaysRecoveryEngineEntry(ownerId: string | null): RecoveryEngineEntry | null {
  const today = getDayStamp()
  return loadRecoveryEngineLog(ownerId).find((e) => e.date === today) ?? null
}

// ── استيراد سجلّ v1 للقراءة (عبر مشغّل الهجرات الموحّد) ──────────────────────

const V1_SUGGESTION: Record<LegacyRecoveryEntry['rec'], RecoverySuggestion> = {
  rest: 'rest',
  light: 'reduce_intensity',
  full: 'proceed',
  reassess: 'proceed',
}

const V1_SCORE: Record<LegacyRecoveryEntry['rec'], number> = { rest: 30, light: 45, full: 70, reassess: 50 }

function v1ToV2(entry: LegacyRecoveryEntry): RecoveryEngineEntry {
  const input: RecoveryEngineInput = {}
  if (entry.sleep) input.sleepQuality = entry.sleep
  if (entry.energy) input.energy = entry.energy
  if (entry.soreness) input.soreness = { general: entry.soreness }
  return {
    date: entry.date,
    rulesVersion: 'v1-import',
    input,
    suggestion: V1_SUGGESTION[entry.rec] ?? 'proceed',
    confidence: 0.3,
    score: V1_SCORE[entry.rec] ?? 50,
    reasons: [
      {
        factor: 'legacy_v1',
        direction: 'neutral',
        weight: 0,
        note: { ar: 'فحص مستورد من السجلّ القديم (v1)', en: 'Imported from the legacy v1 log' },
      },
    ],
    flags: { conflicting: false, lowData: true, decisiveSoreness: entry.soreness === 'severe' },
  }
}

/**
 * هجرة قراءة idempotent: تستورد سجلّ v1 إلى v2 (بلا حذف v1 — الوحدة القديمة
 * وشاشتها تبقيان تعملان). إدخالات v2 الموجودة تفوز لنفس اليوم.
 */
export function ensureRecoveryEngineMigrated(ownerId: string | null): 'done' | 'skipped' | 'rolled-back' {
  const v1Key = `${RECOVERY_LOG_BASE}:${ownerId ?? 'guest'}`
  const v2Key = recoveryEngineLogKey(ownerId)
  const result = runMigration({
    id: `recovery-engine-v2-import:${ownerId ?? 'guest'}`,
    keys: [v1Key, v2Key],
    run: () => {
      const rawV1 = window.localStorage.getItem(v1Key)
      if (!rawV1) return
      const v1Entries = JSON.parse(rawV1) as LegacyRecoveryEntry[]
      if (!Array.isArray(v1Entries)) return
      const existing = loadRecoveryEngineLog(ownerId)
      const existingDates = new Set(existing.map((e) => e.date))
      const imported = v1Entries.filter((e) => e && typeof e.date === 'string' && !existingDates.has(e.date)).map(v1ToV2)
      if (!imported.length) return
      const merged = [...existing, ...imported].sort((a, b) => (a.date < b.date ? 1 : -1))
      writeEngineLog(ownerId, merged)
    },
    verify: () => {
      const raw = window.localStorage.getItem(v2Key)
      if (raw === null) return true // لا شيء استُورد — حالة صحيحة
      try {
        return Array.isArray(JSON.parse(raw))
      } catch {
        return false
      }
    },
    // لا cleanup عمدًا: سجلّ v1 يبقى كما هو — «الإدخالات القديمة تبقى مقروءة».
  })
  return result.status
}

// ── اتجاه الأسبوع (٧/٢٨ يومًا) ───────────────────────────────────────────────

export interface RecoveryTrendPoint {
  day: string
  /** درجة الجاهزية 0–100 لذلك اليوم، أو null ليوم بلا فحص (لا تُخترع نقطة). */
  score: number | null
}

export type TrendDirection = 'improving' | 'declining' | 'stable'

export interface RecoveryTrend {
  days: 7 | 28
  series: RecoveryTrendPoint[]
  direction: TrendDirection
  /** عدد الأيام التي فيها فحص فعلي — أقل من 2 ⇒ الاتجاه 'stable' بصدق. */
  sampledDays: number
}

/** سلسلة الاتجاه من سجلّ v2 (الأقدم ← الأحدث)، بأيام فارغة صريحة (null). */
export function recoveryTrend(ownerId: string | null, days: 7 | 28 = 7, today = getDayStamp()): RecoveryTrend {
  const byDate = new Map(loadRecoveryEngineLog(ownerId).map((entry) => [entry.date, entry.score]))
  const series: RecoveryTrendPoint[] = []
  const end = new Date(today)
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * DAY_MS)
    const day = getDayStamp(d)
    series.push({ day, score: byDate.get(day) ?? null })
  }
  const sampled = series.filter((p) => p.score !== null) as { day: string; score: number }[]
  let direction: TrendDirection = 'stable'
  if (sampled.length >= 2) {
    const half = Math.floor(sampled.length / 2)
    const first = sampled.slice(0, half)
    const second = sampled.slice(half)
    const mean = (points: { score: number }[]) => points.reduce((sum, p) => sum + p.score, 0) / points.length
    const diff = mean(second) - mean(first)
    if (diff > 5) direction = 'improving'
    else if (diff < -5) direction = 'declining'
  }
  return { days, series, direction, sampledDays: sampled.length }
}
