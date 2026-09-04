// تقويم التمرين الأسبوعي (P4) — جدولة حقيقية بدل التدوير الأعمى.
//
// المشكلة القديمة: يوم التمرين كان يُختار بـ getDay() % plan.days.length
// (todayPlanDay) — لا أيام راحة حقيقية، ولا اختيار لأيام الأسبوع، وجدول
// «الروتين» في التخصيص عرضي فقط. هذه الوحدة تملك مصدر الحقيقة الجديد:
//   • جدول أسبوعي مثبَّت: يوم أسبوع → (فهرس يوم خطة | راحة). مفتاح مسجّل
//     في userDataKeys (qimmah:workoutCalendar:v1) ويُمسح عند تبديل الحساب.
//   • اقتراحات افتراضية منطقية لكل عدد أيام (نمط TRAIN_PATTERN نفسه من
//     planGenerator) قابلة للتعديل عبر الـAPI فقط — لا واجهة تُبنى هنا.
//   • يوم الراحة يُعاد بصدق { type: 'rest' } — المستهلكون (todayV2Model /
//     workoutV2Model) يعكسونه بدل التدوير.
//   • تقسيمات مسمّاة فقط: full_body · upper_lower · upper_lower_focus ·
//     push_pull_legs — تُشتق من عدد الأيام، ولا نخترع تقسيمة عشوائية.
//   • يوم فائت = «قرار» صريح للمستخدم (القاعدة D: اقترح لا تُغيّر) —
//     detectMissedDay يُرجع Decision وapplyMissedDecision ينفّذ الاختيار فقط.
//   • حارس الاستشفاء: منع ٣+ أيام تدريب متتالية حين يخالف قواعد التقسيمة.
//   • هجرة الخطط الحالية عبر runMigration (idempotent + snapshot + rollback).
//
// التوافق الخلفي: بلا جدول محفوظ ولا هجرة، يُستخدم التدوير القديم كاحتياط
// (source: 'legacy-rotation') — سلوك المستخدمين الحاليين لا يتغيّر إلا بعد
// أن تكتب الهجرة (أو المستخدم) جدولًا حقيقيًا.

import type { PlanDay, WorkoutPlan } from '@/types/workout'
import { getDayStamp } from '@/lib/today'
import { runMigration } from '@/lib/dataOwnership'
import { enqueueSyncDelete, enqueueSyncOperation } from '@/lib/syncQueue'
import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import { loadSessions } from '@/lib/workoutSessions'
import { readRaw, safeRemove, safeWriteJson, type WriteResult } from '@/lib/safeStorage'

export const WORKOUT_CALENDAR_KEY = 'qimmah:workoutCalendar:v1'

// ── الأنواع (سطح API مصمَّم للتخصيص المستقبلي — انظر docs/data/WORKOUT-CALENDAR.md) ──

/** التقسيمات المسمّاة الوحيدة المسموح بها — لا تقسيمة مخترعة. */
export type NamedSplit = 'full_body' | 'upper_lower' | 'upper_lower_focus' | 'push_pull_legs'

/** بداية الأسبوع: السبت (السياق السعودي، الافتراضي) أو الأحد. */
export type WeekStart = 6 | 0

/** تخصيص يوم أسبوع: فهرس يوم خطة (0..days-1) أو راحة. الفهرسة JS: 0=الأحد … 6=السبت. */
export type WeekdayAssignment = number | 'rest'

export type MissedChoice = 'move_to_next' | 'skip' | 'reschedule'

export interface WeeklySchedule {
  version: 1
  /** 7 خانات مفهرسة بيوم الأسبوع JS (0=الأحد … 6=السبت). */
  weekdays: WeekdayAssignment[]
  /** التقسيمة المسمّاة المشتقّة من عدد الأيام (وصفية — محتوى الأيام يملكه planGenerator). */
  split: NamedSplit
  daysPerWeek: number
  weekStart: WeekStart
  /** تجاوزات ليوم واحد: ختم تاريخ YYYY-MM-DD → فهرس يوم خطة (قرارات «يوم فائت»). */
  overrides: Record<string, number>
  /** قرارات الأيام الفائتة المسجّلة (توقف إعادة الاكتشاف): ختم تاريخ → الاختيار. */
  missedDecisions: Record<string, MissedChoice>
  source: 'migration' | 'user'
  updatedAt: string
}

/** نتيجة حلّ يومٍ ما من الجدول — الراحة تُعاد بصدق، لا تدوير صامت. */
export type ScheduledDay =
  | { type: 'training'; source: 'schedule' | 'override' | 'legacy-rotation' | 'first-session'; planDayIndex: number; day: PlanDay }
  | { type: 'rest'; source: 'schedule' }

export interface ScheduleViolation {
  code:
    | 'consecutive-training-run'
    | 'no-rest-day'
    | 'day-count-mismatch'
    | 'invalid-assignment'
    | 'no-schedule'
    | 'target-already-training'
    | 'target-out-of-range'
  messageAr: string
  messageEn: string
}

export interface MissedDayDecision {
  type: 'missed'
  /** ختم اليوم الفائت YYYY-MM-DD. */
  date: string
  weekday: number
  planDayIndex: number
  /** الخيارات المطلوبة للواجهة — القرار للمستخدم، لا شيء يتغيّر تلقائيًا (القاعدة D). */
  options: readonly ['move_to_next', 'skip', 'reschedule']
}

export type MissedResolution =
  | { choice: 'move_to_next' }
  | { choice: 'skip' }
  | { choice: 'reschedule'; toDate: string }

export type SaveScheduleResult =
  | { status: 'saved'; schedule: WeeklySchedule }
  | { status: 'rejected'; violations: ScheduleViolation[] }
  | { status: 'failed'; reason: Exclude<WriteResult, 'ok'> }

export type ApplyMissedResult =
  | { status: 'applied'; schedule: WeeklySchedule }
  | { status: 'rejected'; violations: ScheduleViolation[] }
  | { status: 'failed'; reason: Exclude<WriteResult, 'ok'> }

// ── ثوابت التقسيمة ────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * توزيع أيام التدريب الافتراضي داخل الأسبوع — **نسخة مطابقة** لـTRAIN_PATTERN في
 * planGenerator (لا نستورده: غير مُصدَّر، واستيراد planGenerator يجرّ قاعدة التمارين
 * كاملة لحزمة الإقلاع). المواضع نسبية لبداية الأسبوع (0 = أول يوم في الأسبوع).
 */
const TRAIN_PATTERN: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

/** التقسيمة المسمّاة من عدد الأيام — مطابقة لمنطق splitDays في planGenerator. */
export function namedSplitForDays(daysPerWeek: number): NamedSplit {
  const d = clamp(Math.round(daysPerWeek) || 1, 1, 7)
  if (d <= 3) return 'full_body'
  if (d === 4) return 'upper_lower'
  if (d === 5) return 'upper_lower_focus'
  return 'push_pull_legs'
}

export const SPLIT_LABELS: Record<NamedSplit, { ar: string; en: string }> = {
  full_body: { ar: 'جسم كامل', en: 'Full Body' },
  upper_lower: { ar: 'علوي / سفلي', en: 'Upper / Lower' },
  upper_lower_focus: { ar: 'علوي / سفلي + يوم مركّز', en: 'Upper / Lower + Focus' },
  push_pull_legs: { ar: 'دفع / سحب / أرجل', en: 'Push / Pull / Legs' },
}

/**
 * أقصى امتداد متتالٍ مسموح لأيام التدريب حسب التقسيمة (قاعدة الاستشفاء):
 *   • جسم كامل: نفس العضلات كل جلسة → يومان متتاليان حدّ أقصى (٣+ = مخالفة).
 *   • علوي/سفلي: التناوب يسمح بثلاثة (ع/س/ع) — أربعة متتالية مخالفة.
 *   • دفع/سحب/أرجل: الدورة مصمّمة للتتابع (٦ أيام قياسية).
 */
const MAX_CONSECUTIVE: Record<NamedSplit, number> = {
  full_body: 2,
  upper_lower: 3,
  upper_lower_focus: 3,
  push_pull_legs: 6,
}

// ── تخزين آمن ─────────────────────────────────────────────────────────────────

function ls(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

const REST_WEEK: WeekdayAssignment[] = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']

function isValidAssignment(v: unknown): v is WeekdayAssignment {
  return v === 'rest' || (typeof v === 'number' && Number.isInteger(v) && v >= 0)
}

/** تحقّق بنيوي كامل — localStorage يُعامل كمدخل معادٍ. */
function normalizeSchedule(raw: unknown): WeeklySchedule | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<WeeklySchedule>
  if (s.version !== 1) return null
  if (!Array.isArray(s.weekdays) || s.weekdays.length !== 7 || !s.weekdays.every(isValidAssignment)) return null
  if (typeof s.split !== 'string' || !(s.split in MAX_CONSECUTIVE)) return null
  const overrides: Record<string, number> = {}
  if (s.overrides && typeof s.overrides === 'object') {
    for (const [k, v] of Object.entries(s.overrides as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && Number.isInteger(v) && v >= 0) overrides[k] = v
    }
  }
  const missedDecisions: Record<string, MissedChoice> = {}
  if (s.missedDecisions && typeof s.missedDecisions === 'object') {
    for (const [k, v] of Object.entries(s.missedDecisions as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && (v === 'move_to_next' || v === 'skip' || v === 'reschedule')) missedDecisions[k] = v
    }
  }
  return {
    version: 1,
    weekdays: s.weekdays as WeekdayAssignment[],
    split: s.split as NamedSplit,
    daysPerWeek: clamp(typeof s.daysPerWeek === 'number' ? s.daysPerWeek : 0, 0, 7),
    weekStart: s.weekStart === 0 ? 0 : 6,
    overrides,
    missedDecisions,
    source: s.source === 'migration' ? 'migration' : 'user',
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : '',
  }
}

/** يقرأ الجدول المحفوظ — null إن لم يُضبط شيء (⇒ احتياط التدوير القديم). */
export function loadWeeklySchedule(): WeeklySchedule | null {
  ensureCalendarMigrated()
  try {
    const raw = readRaw(WORKOUT_CALENDAR_KEY)
    return raw ? normalizeSchedule(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeSchedule(schedule: WeeklySchedule): WriteResult {
  const result = safeWriteJson(WORKOUT_CALENDAR_KEY, schedule)
  if (result !== 'ok') return result
  // مزامنة الجدول (P12): صف واحد لكل حساب في workout_schedule — updatedAt الجدول
  // هو طابع LWW. enqueueSyncOperation تتولى بوابات المالك/العلم/التبنّي/الإيقاف.
  enqueueSyncOperation('workout_schedule', 'self', {
    data: schedule,
    updated_at: schedule.updatedAt || new Date().toISOString(),
    deleted_at: null,
  })
  return 'ok'
}

export function clearWeeklySchedule(): WriteResult {
  const result = safeRemove(WORKOUT_CALENDAR_KEY)
  if (result !== 'ok') return result
  // شاهد قبر بطابع (P12): مسح الجدول على جهاز لا يُبعث من السحابة بجدول أقدم.
  enqueueSyncDelete('workout_schedule', 'self')
  return 'ok'
}

/**
 * كتابة جدول من مسار المزامنة (hydrate) — بعد فوزه بالـLWW: تُطبَّع بنيته ويُكتب
 * كما هو (بطابعه السحابي، دون إعادة ختم). إعادة الرفع ممنوعة أثناء الترطيب
 * (capture موقوف)، وأي صدى لاحق upsert idempotent غير مؤذٍ.
 */
export function setScheduleFromSync(schedule: unknown): boolean {
  const normalized = normalizeSchedule(schedule)
  if (!normalized) return false
  return writeSchedule(normalized) === 'ok'
}

// ── الاقتراحات الافتراضية ─────────────────────────────────────────────────────

/**
 * أيام الأسبوع المقترحة (JS weekdays) لعدد أيام معيّن — نمط TRAIN_PATTERN مُسقطًا
 * على بداية الأسبوع: السبت (الافتراضي) أو الأحد. قابلة للتعديل عبر setTrainingWeekdays.
 */
export function suggestedTrainingWeekdays(daysPerWeek: number, weekStart: WeekStart = 6): number[] {
  const d = clamp(Math.round(daysPerWeek) || 1, 1, 7)
  const pattern = TRAIN_PATTERN[d] ?? TRAIN_PATTERN[3]
  return pattern.map((pos) => (pos + weekStart) % 7)
}

/** ترتيب أيام الأسبوع بدءًا من بداية الأسبوع — لتخصيص أيام الخطة بالترتيب الصحيح. */
function weekOrder(weekStart: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)
}

/** يبني جدول التخصيصات من أيام أسبوع مختارة: k-th يوم تدريب (بترتيب الأسبوع) → يوم الخطة k mod أيامها. */
function buildAssignments(trainingWeekdays: readonly number[], planDayCount: number, weekStart: WeekStart): WeekdayAssignment[] {
  const chosen = new Set(trainingWeekdays)
  const weekdays: WeekdayAssignment[] = [...REST_WEEK]
  let k = 0
  for (const wd of weekOrder(weekStart)) {
    if (chosen.has(wd)) {
      weekdays[wd] = planDayCount > 0 ? k % planDayCount : 0
      k++
    }
  }
  return weekdays
}

/** الجدول الافتراضي المقترح لعدد أيام وخطة — يمرّ على الحارس دائمًا (الاقتراحات تحترمه). */
export function suggestedSchedule(plan: WorkoutPlan, daysPerWeek: number, weekStart: WeekStart = 6): WeeklySchedule {
  const d = clamp(Math.round(daysPerWeek) || 1, 1, 7)
  return {
    version: 1,
    weekdays: buildAssignments(suggestedTrainingWeekdays(d, weekStart), plan.days.length, weekStart),
    split: namedSplitForDays(d),
    daysPerWeek: d,
    weekStart,
    overrides: {},
    missedDecisions: {},
    source: 'user',
    updatedAt: new Date().toISOString(),
  }
}

// ── الحارس (منع ٣+ أيام متتالية حين يخالف قواعد التقسيمة/الاستشفاء) ───────────

/** أطول امتداد متتالٍ لأيام التدريب — دائري (الجمعة→السبت امتداد واحد عبر حدود الأسبوع). */
export function longestTrainingRun(weekdays: readonly WeekdayAssignment[]): number {
  const training = weekdays.map((a) => a !== 'rest')
  if (training.every(Boolean)) return 7
  // ابدأ العدّ من أول يوم راحة كي يُحتسب الالتفاف الدائري بشكل صحيح.
  const firstRest = training.indexOf(false)
  let longest = 0
  let run = 0
  for (let i = 1; i <= 7; i++) {
    const idx = (firstRest + i) % 7
    if (training[idx]) {
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  return longest
}

/** يتحقّق من جدول: عدد الأيام، صلاحية التخصيصات، ويوم راحة واحد على الأقل، وقاعدة التتابع. */
export function validateSchedule(schedule: WeeklySchedule): ScheduleViolation[] {
  const violations: ScheduleViolation[] = []
  if (schedule.weekdays.length !== 7 || !schedule.weekdays.every(isValidAssignment)) {
    violations.push({
      code: 'invalid-assignment',
      messageAr: 'تخصيصات الجدول غير صالحة — ٧ خانات: فهرس يوم خطة أو راحة.',
      messageEn: 'Invalid schedule assignments — 7 slots: a plan-day index or rest.',
    })
    return violations
  }
  const trainingCount = schedule.weekdays.filter((a) => a !== 'rest').length
  if (schedule.daysPerWeek > 0 && trainingCount !== schedule.daysPerWeek) {
    violations.push({
      code: 'day-count-mismatch',
      messageAr: `عدد أيام التدريب المجدولة (${trainingCount}) لا يطابق أيام خطتك (${schedule.daysPerWeek}).`,
      messageEn: `Scheduled training days (${trainingCount}) do not match your plan (${schedule.daysPerWeek}).`,
    })
  }
  if (trainingCount === 7) {
    violations.push({
      code: 'no-rest-day',
      messageAr: 'لا يوجد أي يوم راحة — الاستشفاء يحتاج يومًا واحدًا على الأقل أسبوعيًا.',
      messageEn: 'No rest day at all — recovery needs at least one rest day per week.',
    })
  }
  const run = longestTrainingRun(schedule.weekdays)
  const maxRun = MAX_CONSECUTIVE[schedule.split]
  if (run > maxRun) {
    violations.push({
      code: 'consecutive-training-run',
      messageAr: `${run} أيام تدريب متتالية تخالف قاعدة استشفاء تقسيمة «${SPLIT_LABELS[schedule.split].ar}» (الحد ${maxRun}).`,
      messageEn: `${run} consecutive training days violate the ${SPLIT_LABELS[schedule.split].en} recovery rule (max ${maxRun}).`,
    })
  }
  return violations
}

// ── الحفظ (API فقط — الواجهة شأن Codex) ──────────────────────────────────────

/** يحفظ جدولًا بعد التحقق — المخالفات ترفض الحفظ وتُعاد للواجهة. */
export function saveWeeklySchedule(schedule: WeeklySchedule): SaveScheduleResult {
  const normalized = normalizeSchedule(schedule)
  if (!normalized) {
    return {
      status: 'rejected',
      violations: [{
        code: 'invalid-assignment',
        messageAr: 'شكل الجدول غير صالح.',
        messageEn: 'Invalid schedule shape.',
      }],
    }
  }
  const violations = validateSchedule(normalized)
  if (violations.length) return { status: 'rejected', violations }
  const stamped: WeeklySchedule = { ...normalized, updatedAt: new Date().toISOString() }
  const result = writeSchedule(stamped)
  if (result !== 'ok') return { status: 'failed', reason: result }
  return { status: 'saved', schedule: stamped }
}

/**
 * يختار أيام الأسبوع الفعلية للتدريب (تعديل المستخدم على الاقتراح) ويحفظ.
 * أيام الخطة تُخصَّص بترتيب الأسبوع (weekStart)؛ يرفض ما يخالف الحارس.
 */
export function setTrainingWeekdays(plan: WorkoutPlan, trainingWeekdays: readonly number[], weekStart: WeekStart = 6): SaveScheduleResult {
  const unique = [...new Set(trainingWeekdays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  if (unique.length !== trainingWeekdays.length || unique.length === 0) {
    return {
      status: 'rejected',
      violations: [{
        code: 'invalid-assignment',
        messageAr: 'أيام الأسبوع المختارة غير صالحة (0=الأحد … 6=السبت، بلا تكرار).',
        messageEn: 'Chosen weekdays are invalid (0=Sunday … 6=Saturday, no duplicates).',
      }],
    }
  }
  const existing = loadWeeklySchedule()
  const schedule: WeeklySchedule = {
    version: 1,
    weekdays: buildAssignments(unique, plan.days.length, weekStart),
    split: namedSplitForDays(unique.length),
    daysPerWeek: unique.length,
    weekStart,
    overrides: existing?.overrides ?? {},
    missedDecisions: existing?.missedDecisions ?? {},
    source: 'user',
    updatedAt: new Date().toISOString(),
  }
  return saveWeeklySchedule(schedule)
}

// ── حلّ اليوم (بديل التدوير) ──────────────────────────────────────────────────

/**
 * التدوير الاحتياطي — حين لا جدول مضبوطًا.
 *
 * [SOVEREIGN-PLAN-003] كان `date.getDay() % plan.days.length` حرفيًا: فهرسة JS
 * الخام (٠=الأحد) على خطة لا تعرف الأحد. فيوم الأربعاء (getDay()=3) على خطة
 * أربعة أيام يعطي الفهرس ٣ — أي **«اليوم ٤»** لمن لم يتمرّن يومًا واحدًا بعد.
 * الآن الموضع يُقاس من **بداية الأسبوع** (السبت في السياق السعودي، وهي البداية
 * التي يبني عليها `buildAssignments` أصلًا) فيبدأ الأسبوع من يوم الخطة ١.
 * يبقى تدويرًا بلا أيام راحة — وهذا كل المقصود منه: احتياط موثّق، لا جدول.
 */
function legacyRotation(plan: WorkoutPlan, date: Date): ScheduledDay {
  const position = (date.getDay() - DEFAULT_WEEK_START + 7) % 7
  const index = position % plan.days.length
  return { type: 'training', source: 'legacy-rotation', planDayIndex: index, day: plan.days[index] }
}

/** بداية الأسبوع الافتراضية — السبت، كما في كل مولّدات الجدول أعلاه. */
const DEFAULT_WEEK_START: WeekStart = 6

/**
 * [SOVEREIGN-PLAN-003] هل ما زالت **الجلسة الأولى** معلّقة عند هذا التاريخ؟
 *
 * «معلّقة» = لا جلسة منتهية واحدة في يوم **سابق** لهذا التاريخ. اشتراط «سابق»
 * متعمّد: لو قِسناها على «لا جلسة إطلاقًا» لانقلبت بطاقة اليوم إلى «راحة» في
 * اللحظة التي ينهي فيها المستخدم جلسته الأولى — فيرى الشاشة تنكر ما فعله للتوّ.
 * الإنهاء المبكر يُحتسب جلسةً: المستخدم تمرّن فعلًا، والرقم ليس ادّعاء اكتمال.
 */
export function isFirstSessionPending(date: Date = new Date()): boolean {
  const stamp = getDayStamp(date)
  return !loadSessions().some((s) => s.finishedAt && s.date < stamp)
}

/** خيارات حلّ اليوم — كلها قابلة للحقن كي يبقى القرار مُثبَتًا بلا تخزين. */
export interface ResolveDayOptions {
  /** تجاوز قراءة الجلسات (للإثباتات وللمستهلكين الذين يملكون الجواب أصلًا). */
  firstSessionPending?: boolean
  /** «الآن» — مرساة تحديد أن التاريخ المطلوب هو اليوم نفسه. */
  now?: Date
}

/**
 * هل ينطبق مرساة الجلسة الأولى على هذا التاريخ؟
 *
 * شرطان معًا: (أ) لم تُنجَز جلسة قبل اليوم، (ب) التاريخ المطلوب **هو اليوم**.
 * الشرط (ب) هو ما يمنع `nextWorkout` من إعلان «اليوم ١» لكل يوم قادم إلى الأبد:
 * الاستشراف يسأل عن تواريخ مستقبلية، وهي تُحلّ بالجدول الطبيعي.
 */
function firstSessionAnchorApplies(date: Date, opts: ResolveDayOptions): boolean {
  const now = opts.now ?? new Date()
  if (getDayStamp(date) !== getDayStamp(now)) return false
  return opts.firstSessionPending ?? isFirstSessionPending(date)
}

/**
 * يحلّ يومًا (افتراضيًا اليوم) من الجدول الأسبوعي الحقيقي:
 *   • تجاوز بتاريخ اليوم (قرار «يوم فائت») يفوز أولًا.
 *   • ثم تخصيص يوم الأسبوع: تدريب أو { type: 'rest' } بصدق.
 *   • بلا جدول مضبوط: احتياط التدوير القديم (source: 'legacy-rotation').
 * undefined فقط حين لا توجد خطة أصلًا.
 */
export function scheduledDayFor(plan: WorkoutPlan, date: Date = new Date(), opts: ResolveDayOptions = {}): ScheduledDay | undefined {
  if (!plan.days.length) return undefined
  // [SOVEREIGN-PLAN-003] **الجلسة الأولى تبدأ من أول يوم في الخطة، لا من يوم الأسبوع.**
  //
  // الجدول الأسبوعي يربط يوم الخطة ٠ بالسبت (بداية الأسبوع). وهو صحيح لمن استقرّ
  // على إيقاع أسبوعي — وخاطئ تمامًا لمن أنهى التخصيص للتوّ يوم إثنين أو خميس:
  // كان يُستقبَل بـ«راحة» قبل أن يتمرّن مرّة، أو (بلا جدول) بـ«اليوم ٤».
  // المرساة تعمل **مرّة واحدة**: بعد أوّل جلسة منتهية يستأنف الجدول عمله كاملًا.
  if (firstSessionAnchorApplies(date, opts)) {
    return { type: 'training', source: 'first-session', planDayIndex: 0, day: plan.days[0] }
  }
  const schedule = loadWeeklySchedule()
  if (!schedule) return legacyRotation(plan, date)
  const override = schedule.overrides[getDayStamp(date)]
  if (typeof override === 'number') {
    const idx = override % plan.days.length
    return { type: 'training', source: 'override', planDayIndex: idx, day: plan.days[idx] }
  }
  const assignment = schedule.weekdays[date.getDay()]
  if (assignment === 'rest' || assignment === undefined) return { type: 'rest', source: 'schedule' }
  const idx = assignment % plan.days.length
  return { type: 'training', source: 'schedule', planDayIndex: idx, day: plan.days[idx] }
}

// ── اليوم الفائت — قرار صريح، لا تعديل تلقائي (القاعدة D) ─────────────────────

function addDays(stamp: string, delta: number): string {
  const d = new Date(`${stamp}T12:00:00`) // منتصف النهار يحمي من انزياح التوقيت الصيفي
  d.setDate(d.getDate() + delta)
  return getDayStamp(d)
}

/** فهرس يوم الخطة الفعلي لتاريخ ما (تجاوز ثم تخصيص الأسبوع) — null إن كان راحة. */
function effectivePlanDayIndex(schedule: WeeklySchedule, stamp: string): number | null {
  const override = schedule.overrides[stamp]
  if (typeof override === 'number') return override
  const weekday = new Date(`${stamp}T12:00:00`).getDay()
  const assignment = schedule.weekdays[weekday]
  return assignment === 'rest' || assignment === undefined ? null : assignment
}

/**
 * يكتشف أحدث يوم تدريب فائت (خلال آخر ٦ أيام قبل اليوم) لم تُنهَ فيه جلسة ولم
 * يُسجَّل له قرار. **دالة نقية**: كل المدخلات تمرّر صراحة — الجدول، تواريخ الجلسات
 * المنتهية (YYYY-MM-DD)، واليوم. تُرجع Decision للواجهة أو null.
 * بلا جدول مضبوط (احتياط التدوير القديم) لا مفهوم لليوم الفائت → null.
 */
export function detectMissedDay(
  schedule: WeeklySchedule | null,
  plan: WorkoutPlan,
  finishedDates: readonly string[],
  today: Date = new Date(),
): MissedDayDecision | null {
  if (!schedule || !plan.days.length) return null
  const finished = new Set(finishedDates)
  const todayStamp = getDayStamp(today)
  for (let back = 1; back <= 6; back++) {
    const stamp = addDays(todayStamp, -back)
    const planDayIndex = effectivePlanDayIndex(schedule, stamp)
    if (planDayIndex === null) continue // يوم راحة — لا شيء فات
    if (finished.has(stamp)) continue // تمرّن فعلًا
    if (schedule.missedDecisions[stamp]) continue // قرار مسجّل مسبقًا
    return {
      type: 'missed',
      date: stamp,
      weekday: new Date(`${stamp}T12:00:00`).getDay(),
      planDayIndex: planDayIndex % plan.days.length,
      options: ['move_to_next', 'skip', 'reschedule'],
    }
  }
  return null
}

/** أقرب تاريخ تدريب قادم بدءًا من اليوم (حتى ٧ أيام) — null إن لم يوجد. */
function nextTrainingStamp(schedule: WeeklySchedule, fromStamp: string): string | null {
  for (let ahead = 0; ahead <= 7; ahead++) {
    const stamp = addDays(fromStamp, ahead)
    if (effectivePlanDayIndex(schedule, stamp) !== null) return stamp
  }
  return null
}

/**
 * ينفّذ قرار المستخدم الصريح ليوم فائت — **الكتابة الوحيدة** في مسار اليوم الفائت:
 *   • move_to_next: اليوم الفائت يُؤدَّى في أقرب يوم تدريب قادم (تجاوز ليوم واحد؛
 *     يوم الأسبوع نفسه يستأنف خريطته بعدها — لا إزاحة متسلسلة للأسبوع كله).
 *   • skip: يُسجَّل التخطّي فقط؛ الجدول لا يتغيّر.
 *   • reschedule: يُنقل ليوم راحة قادم صريح (toDate) — يُرفض إن كان اليوم تدريبًا
 *     أصلًا، أو خارج ٧ أيام، أو خالف حارس التتابع.
 */
export function applyMissedDecision(decision: MissedDayDecision, resolution: MissedResolution, today: Date = new Date()): ApplyMissedResult {
  const schedule = loadWeeklySchedule()
  if (!schedule) {
    return {
      status: 'rejected',
      violations: [{
        code: 'no-schedule',
        messageAr: 'لا جدول أسبوعي مضبوط — لا يمكن تطبيق قرار يوم فائت.',
        messageEn: 'No weekly schedule configured — cannot apply a missed-day decision.',
      }],
    }
  }
  const todayStamp = getDayStamp(today)
  const next: WeeklySchedule = {
    ...schedule,
    overrides: { ...schedule.overrides },
    missedDecisions: { ...schedule.missedDecisions, [decision.date]: resolution.choice },
    updatedAt: new Date().toISOString(),
  }

  if (resolution.choice === 'move_to_next') {
    const target = nextTrainingStamp(schedule, todayStamp)
    if (!target) {
      return {
        status: 'rejected',
        violations: [{
          code: 'target-out-of-range',
          messageAr: 'لا يوجد يوم تدريب قادم خلال أسبوع لنقل التمرين الفائت إليه.',
          messageEn: 'No upcoming training day within a week to move the missed workout to.',
        }],
      }
    }
    next.overrides[target] = decision.planDayIndex
  } else if (resolution.choice === 'reschedule') {
    const toDate = resolution.toDate
    const withinRange = /^\d{4}-\d{2}-\d{2}$/.test(toDate) && toDate >= todayStamp && toDate <= addDays(todayStamp, 7)
    if (!withinRange) {
      return {
        status: 'rejected',
        violations: [{
          code: 'target-out-of-range',
          messageAr: 'تاريخ إعادة الجدولة يجب أن يكون خلال الأيام السبعة القادمة.',
          messageEn: 'The reschedule date must be within the next seven days.',
        }],
      }
    }
    if (effectivePlanDayIndex(schedule, toDate) !== null) {
      return {
        status: 'rejected',
        violations: [{
          code: 'target-already-training',
          messageAr: 'اليوم المختار يوم تدريب أصلًا — اختر يوم راحة.',
          messageEn: 'The chosen day is already a training day — pick a rest day.',
        }],
      }
    }
    // حارس التتابع: أضف اليوم المستهدف كتدريب وافحص الامتداد (تقريب أسبوعي موثَّق).
    const targetWeekday = new Date(`${toDate}T12:00:00`).getDay()
    const simulated = [...schedule.weekdays]
    simulated[targetWeekday] = decision.planDayIndex
    const run = longestTrainingRun(simulated)
    const maxRun = MAX_CONSECUTIVE[schedule.split]
    if (run > maxRun) {
      return {
        status: 'rejected',
        violations: [{
          code: 'consecutive-training-run',
          messageAr: `إعادة الجدولة تخلق ${run} أيام تدريب متتالية (حدّ تقسيمتك ${maxRun}).`,
          messageEn: `Rescheduling creates ${run} consecutive training days (your split's max is ${maxRun}).`,
        }],
      }
    }
    next.overrides[toDate] = decision.planDayIndex
  }
  // skip: تسجيل القرار فقط (تمّ أعلاه) — لا تغيير على الجدول.

  const result = writeSchedule(next)
  if (result !== 'ok') return { status: 'failed', reason: result }
  return { status: 'applied', schedule: next }
}

// ── الهجرة (خطط قائمة → جدول حقيقي) ──────────────────────────────────────────

export const WORKOUT_CALENDAR_MIGRATION_ID = 'workout-calendar-schedule-v1'

let migrationAttempted = false

/**
 * هجرة لمرّة واحدة عبر مشغّل الهجرات الموحّد (idempotent + snapshot + rollback):
 * تشتق جدولًا من خطة المستخدم المحفوظة بعدد أيامه الأسبوعية على نمط TRAIN_PATTERN
 * (بداية الأسبوع: السبت). لا تكتب شيئًا إن لم توجد خطة محفوظة، أو وُجد جدول أصلًا.
 * تُستدعى كسولًا عند أول قراءة للجدول — نمط ensureNutritionUnified نفسه.
 */
export function ensureCalendarMigrated(): { status: 'done' | 'skipped' | 'rolled-back' } {
  if (typeof window === 'undefined') return { status: 'skipped' }
  if (migrationAttempted) return { status: 'skipped' }
  migrationAttempted = true
  return runMigration({
    id: WORKOUT_CALENDAR_MIGRATION_ID,
    keys: [WORKOUT_CALENDAR_KEY],
    run: () => {
      const existingRaw = ls()?.getItem(WORKOUT_CALENDAR_KEY)
      if (existingRaw) return // جدول موجود (ضبطه المستخدم) — لا نمسّه
      if (!hasSavedCustomization()) return // لا خطة محفوظة — يبقى الاحتياط القديم
      const c = loadCustomization()
      if (!c.workoutPlan.days.length) return
      const daysPerWeek = clamp(c.profile.trainingDays || c.workoutPlan.days.length, 1, 7)
      const schedule = suggestedSchedule(c.workoutPlan, daysPerWeek, 6)
      const result = writeSchedule({ ...schedule, source: 'migration' })
      if (result !== 'ok') throw new Error(`workout-calendar-write:${result}`)
    },
    verify: () => {
      // حالات «لا شيء يُكتب» صحيحة بذاتها؛ وإن كُتب جدول فيجب أن يُقرأ صالحًا.
      const raw = ls()?.getItem(WORKOUT_CALENDAR_KEY)
      if (!raw) return !hasSavedCustomization() || !loadCustomization().workoutPlan.days.length
      try {
        return normalizeSchedule(JSON.parse(raw)) !== null
      } catch {
        return false
      }
    },
  })
}

/** (للاختبارات فقط) يصفّر علم المحاولة الكسولة كي تُعاد الهجرة داخل نفس العملية. */
export function resetCalendarMigrationAttemptForTests(): void {
  migrationAttempted = false
}
