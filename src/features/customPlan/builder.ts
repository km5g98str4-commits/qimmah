// محرّك باني الجدول اليدوي (P6) — منطق فقط، بلا واجهة.
//
// المبدأ: دوال نقيّة فوق WorkoutPlan تُرجع نسخًا جديدة + نتائج مُصنَّفة
// (ok/rejected بأخطاء ثنائية اللغة). الكتابة الوحيدة خارج الخطة:
//   • قوالب مسمّاة لكل مالك (qimmah:planTemplates:v1 — مسجّل في userDataKeys
//     ومُصدَّر عبر سجلّ النقل).
//   • ترقيع تقويم P4 بعد حذف يوم (applyCalendarDayRemoval) — كي لا يبقى
//     تخصيص أسبوعي يشير إلى يوم خطة محذوف.
// المحقّقات (وقت الجلسة/الحجم الأسبوعي) تُرجع تحذيرات مُصنَّفة ولا تمنع أبدًا.
//
// العقد المكتوب للواجهة: docs/data/CUSTOM-PLAN-BUILDER.md

import type { PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import type { TrainingLevel } from '@/types/profile'
import { getExercise } from '@/data/exercises'
import { muscleGroups } from '@/data/muscleGroups'
import { createPlanExercise } from '@/lib/workoutPlan'
import {
  loadWeeklySchedule,
  namedSplitForDays,
  saveWeeklySchedule,
  type ScheduleViolation,
  type WeeklySchedule,
} from '@/lib/workoutCalendar'

// ── الأنواع ───────────────────────────────────────────────────────────────────

export interface BuilderError {
  code:
    | 'day-not-found'
    | 'exercise-not-in-library'
    | 'plan-exercise-not-found'
    | 'invalid-name'
    | 'invalid-prescription'
    | 'index-out-of-range'
    | 'max-days'
    | 'max-exercises'
    | 'week-duplicate-overflow'
    | 'same-day'
    | 'template-not-found'
    | 'max-templates'
    | 'empty-template'
  messageAr: string
  messageEn: string
}

export type PlanResult =
  | { status: 'ok'; plan: WorkoutPlan }
  | { status: 'rejected'; errors: BuilderError[] }

/** أنواع الأيام المسمّاة — تسمية افتراضية ثنائية اللغة، وlabel اختياري يتجاوزها. */
export type DayType =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'full_body'
  | 'core'
  | 'custom'

export const DAY_TYPE_LABELS: Record<DayType, { ar: string; en: string }> = {
  push: { ar: 'دفع', en: 'Push' },
  pull: { ar: 'سحب', en: 'Pull' },
  legs: { ar: 'أرجل', en: 'Legs' },
  upper: { ar: 'علوي', en: 'Upper' },
  lower: { ar: 'سفلي', en: 'Lower' },
  chest: { ar: 'صدر', en: 'Chest' },
  back: { ar: 'ظهر', en: 'Back' },
  shoulders: { ar: 'أكتاف', en: 'Shoulders' },
  arms: { ar: 'ذراعين', en: 'Arms' },
  full_body: { ar: 'جسم كامل', en: 'Full Body' },
  core: { ar: 'بطن وكور', en: 'Core' },
  custom: { ar: 'يوم مخصّص', en: 'Custom Day' },
}

/** حدود واقعية (حماية بيانات لا قيود واجهة): ٧ أيام كحدّ أقصى (أسبوع التقويم). */
export const MAX_PLAN_DAYS = 7
export const MAX_EXERCISES_PER_DAY = 15

// ── أدوات داخلية ──────────────────────────────────────────────────────────────

const err = (code: BuilderError['code'], messageAr: string, messageEn: string): BuilderError => ({ code, messageAr, messageEn })
const rejected = (...errors: BuilderError[]): PlanResult => ({ status: 'rejected', errors })

function dayIndexOf(plan: WorkoutPlan, dayId: string): number {
  return plan.days.findIndex((d) => d.id === dayId)
}

const dayNotFound = (dayId: string): BuilderError =>
  err('day-not-found', `اليوم «${dayId}» غير موجود في الجدول.`, `Day "${dayId}" does not exist in the plan.`)

/** يعيد ترقيم order = الفهرس بعد أي إضافة/حذف/تحريك (نفس قاعدة defaults.reindex). */
function reindexDay(day: PlanDay): PlanDay {
  return { ...day, exercises: day.exercises.map((pe, i) => ({ ...pe, order: i })) }
}

/** معرّف يوم جديد فريد وحتمي: أكبر لاحقة رقمية موجودة + 1 (لا عشوائية). */
function nextDayId(plan: WorkoutPlan): string {
  let max = 0
  for (const d of plan.days) {
    const m = /(\d+)$/.exec(d.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `custom-day-${max + 1}`
}

/** يضمن تفرّد معرّف صفّ تمرين داخل الخطة كاملة (النقل بين الأيام يتطلب تفرّدًا شاملًا). */
function uniqueRowId(plan: WorkoutPlan, base: string): string {
  const existing = new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.id)))
  let id = base
  let n = 1
  while (existing.has(id)) id = `${base}-${n++}`
  return id
}

/** نسخة عميقة من تمرين خطة بمعرّف جديد (للنسخ/التكرار). */
function cloneExercise(plan: WorkoutPlan, pe: PlanExercise, targetDayId: string, order: number): PlanExercise {
  return { ...pe, id: uniqueRowId(plan, `${targetDayId}-${pe.exerciseId}-${order}`), order }
}

// ── 1) الإنشاء والإضافة ──────────────────────────────────────────────────────

/** ينشئ جدولًا يدويًّا فارغًا باسم اختياري (الاسم حقل إضافي متوافق خلفيًّا في WorkoutPlan). */
export function createManualPlan(name?: { ar?: string; en?: string }): WorkoutPlan {
  const ar = name?.ar?.trim()
  const en = name?.en?.trim()
  return {
    templateId: 'custom',
    ...(ar ? { nameAr: ar } : {}),
    ...(en ? { nameEn: en } : {}),
    days: [],
  }
}

/** يضيف يومًا جديدًا في نهاية الجدول بنوع مسمّى أو تسمية مخصّصة. */
export function addDay(plan: WorkoutPlan, type: DayType, label?: { ar?: string; en?: string }): PlanResult {
  if (plan.days.length >= MAX_PLAN_DAYS) {
    return rejected(err('max-days', `الحدّ الأقصى ${MAX_PLAN_DAYS} أيام في الجدول.`, `A plan holds at most ${MAX_PLAN_DAYS} days.`))
  }
  const base = DAY_TYPE_LABELS[type] ?? DAY_TYPE_LABELS.custom
  const nameAr = label?.ar?.trim() || base.ar
  const nameEn = label?.en?.trim() || base.en
  const day: PlanDay = { id: nextDayId(plan), nameAr, nameEn, exercises: [] }
  return { status: 'ok', plan: { ...plan, days: [...plan.days, day] } }
}

export interface ExercisePrescription {
  sets?: number
  reps?: string
  restSec?: number
}

/** يتحقّق من الوصفة: مجموعات 1–10، تكرارات نصّ غير فارغ، راحة 0–600 ثانية. */
function validatePrescription(p: ExercisePrescription): BuilderError | null {
  if (p.sets !== undefined && (!Number.isInteger(p.sets) || p.sets < 1 || p.sets > 10)) {
    return err('invalid-prescription', 'عدد المجموعات يجب أن يكون بين ١ و١٠.', 'Sets must be between 1 and 10.')
  }
  if (p.reps !== undefined && !p.reps.trim()) {
    return err('invalid-prescription', 'التكرارات لا يمكن أن تكون فارغة.', 'Reps cannot be empty.')
  }
  if (p.restSec !== undefined && (!Number.isFinite(p.restSec) || p.restSec < 0 || p.restSec > 600)) {
    return err('invalid-prescription', 'الراحة يجب أن تكون بين ٠ و٦٠٠ ثانية.', 'Rest must be between 0 and 600 seconds.')
  }
  return null
}

/**
 * يضيف تمرينًا من المكتبة ليوم — يرفض معرّف تمرين غير موجود في المكتبة،
 * ويأخذ وصفة اختيارية (sets/reps/restSec) فوق الافتراضيات.
 */
export function addExerciseFromLibrary(
  plan: WorkoutPlan,
  dayId: string,
  exerciseId: string,
  prescription: ExercisePrescription = {},
): PlanResult {
  const di = dayIndexOf(plan, dayId)
  if (di < 0) return rejected(dayNotFound(dayId))
  if (!getExercise(exerciseId)) {
    return rejected(err('exercise-not-in-library', `التمرين «${exerciseId}» غير موجود في المكتبة.`, `Exercise "${exerciseId}" is not in the library.`))
  }
  const day = plan.days[di]
  if (day.exercises.length >= MAX_EXERCISES_PER_DAY) {
    return rejected(err('max-exercises', `الحدّ الأقصى ${MAX_EXERCISES_PER_DAY} تمرينًا في اليوم.`, `A day holds at most ${MAX_EXERCISES_PER_DAY} exercises.`))
  }
  const bad = validatePrescription(prescription)
  if (bad) return rejected(bad)

  const base = createPlanExercise(exerciseId, day.id, day.exercises.length)
  const pe: PlanExercise = {
    ...base,
    id: uniqueRowId(plan, base.id),
    ...(prescription.sets !== undefined ? { sets: prescription.sets } : {}),
    ...(prescription.reps !== undefined ? { reps: prescription.reps.trim() } : {}),
    ...(prescription.restSec !== undefined ? { restSec: Math.round(prescription.restSec) } : {}),
  }
  const days = [...plan.days]
  days[di] = reindexDay({ ...day, exercises: [...day.exercises, pe] })
  return { status: 'ok', plan: { ...plan, days } }
}

// ── 2) الترتيب والنقل ─────────────────────────────────────────────────────────

/** يعيد ترتيب تمرين داخل يومه من موضع إلى موضع (فهارس صفرية). */
export function reorderExercise(plan: WorkoutPlan, dayId: string, from: number, to: number): PlanResult {
  const di = dayIndexOf(plan, dayId)
  if (di < 0) return rejected(dayNotFound(dayId))
  const list = plan.days[di].exercises
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < list.length
  if (!valid(from) || !valid(to)) {
    return rejected(err('index-out-of-range', 'موضع الترتيب خارج نطاق تمارين اليوم.', 'Reorder position is out of the day range.'))
  }
  if (from === to) return { status: 'ok', plan }
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  const days = [...plan.days]
  days[di] = reindexDay({ ...plan.days[di], exercises: next })
  return { status: 'ok', plan: { ...plan, days } }
}

/** ينقل تمرينًا بين يومين (بمعرّف الصفّ) — إلى موضع اختياري في اليوم الهدف (الافتراضي: النهاية). */
export function moveExerciseToDay(
  plan: WorkoutPlan,
  fromDayId: string,
  planExerciseId: string,
  toDayId: string,
  toIndex?: number,
): PlanResult {
  const fi = dayIndexOf(plan, fromDayId)
  if (fi < 0) return rejected(dayNotFound(fromDayId))
  const ti = dayIndexOf(plan, toDayId)
  if (ti < 0) return rejected(dayNotFound(toDayId))
  if (fromDayId === toDayId) {
    return rejected(err('same-day', 'اليوم المصدر هو نفسه الهدف — استخدم إعادة الترتيب.', 'Source and target day are the same — use reorder instead.'))
  }
  const source = plan.days[fi]
  const pe = source.exercises.find((e) => e.id === planExerciseId)
  if (!pe) {
    return rejected(err('plan-exercise-not-found', `التمرين «${planExerciseId}» غير موجود في اليوم المصدر.`, `Exercise row "${planExerciseId}" is not in the source day.`))
  }
  const target = plan.days[ti]
  if (target.exercises.length >= MAX_EXERCISES_PER_DAY) {
    return rejected(err('max-exercises', `الحدّ الأقصى ${MAX_EXERCISES_PER_DAY} تمرينًا في اليوم.`, `A day holds at most ${MAX_EXERCISES_PER_DAY} exercises.`))
  }
  const at = toIndex === undefined ? target.exercises.length : toIndex
  if (!Number.isInteger(at) || at < 0 || at > target.exercises.length) {
    return rejected(err('index-out-of-range', 'موضع الإدراج خارج نطاق اليوم الهدف.', 'Insert position is out of the target day range.'))
  }
  const targetList = [...target.exercises]
  targetList.splice(at, 0, pe)
  const days = [...plan.days]
  days[fi] = reindexDay({ ...source, exercises: source.exercises.filter((e) => e.id !== planExerciseId) })
  days[ti] = reindexDay({ ...target, exercises: targetList })
  return { status: 'ok', plan: { ...plan, days } }
}

// ── 3) النسخ والتكرار ─────────────────────────────────────────────────────────

/** يكرّر يومًا نسخة واحدة تُلحق بنهاية الجدول (معرّفات جديدة، محتوى مطابق). */
export function duplicateDay(plan: WorkoutPlan, dayId: string): PlanResult {
  const di = dayIndexOf(plan, dayId)
  if (di < 0) return rejected(dayNotFound(dayId))
  if (plan.days.length >= MAX_PLAN_DAYS) {
    return rejected(err('max-days', `الحدّ الأقصى ${MAX_PLAN_DAYS} أيام في الجدول.`, `A plan holds at most ${MAX_PLAN_DAYS} days.`))
  }
  const source = plan.days[di]
  const newId = nextDayId(plan)
  const copy: PlanDay = {
    id: newId,
    nameAr: `${source.nameAr} ٢`,
    nameEn: `${source.nameEn} 2`,
    exercises: [],
  }
  const withDay: WorkoutPlan = { ...plan, days: [...plan.days, copy] }
  copy.exercises = source.exercises.map((pe, i) => cloneExercise(withDay, pe, newId, i))
  return { status: 'ok', plan: withDay }
}

/**
 * ينسخ محتوى يوم فوق يوم آخر (مثال: «علوي» → يوم آخر): تمارين الهدف تُستبدل
 * بنسخ من تمارين المصدر؛ معرّف الهدف واسمه يبقيان (فلا ينكسر التقويم/التسمية).
 */
export function copyDayAs(plan: WorkoutPlan, sourceDayId: string, targetDayId: string): PlanResult {
  const si = dayIndexOf(plan, sourceDayId)
  if (si < 0) return rejected(dayNotFound(sourceDayId))
  const ti = dayIndexOf(plan, targetDayId)
  if (ti < 0) return rejected(dayNotFound(targetDayId))
  if (sourceDayId === targetDayId) {
    return rejected(err('same-day', 'لا معنى لنسخ اليوم فوق نفسه.', 'Copying a day onto itself is a no-op.'))
  }
  const source = plan.days[si]
  const target = plan.days[ti]
  // أفرغ الهدف أولًا كي لا تتصادم معرّفات النسخ مع صفوفه القديمة.
  const cleared: WorkoutPlan = {
    ...plan,
    days: plan.days.map((d, i) => (i === ti ? { ...target, exercises: [] } : d)),
  }
  const copies = source.exercises.map((pe, i) => cloneExercise(cleared, pe, target.id, i))
  const days = [...cleared.days]
  days[ti] = reindexDay({ ...target, exercises: copies })
  return { status: 'ok', plan: { ...plan, days } }
}

/**
 * يكرّر أيام الأسبوع كلّها مرة واحدة (قالب A/B): 3 أيام → 6 (نسخ بمعرّفات جديدة).
 * يُرفض إن تجاوز الناتج حدّ الأيام.
 */
export function duplicateWeek(plan: WorkoutPlan): PlanResult {
  if (!plan.days.length) {
    return rejected(err('week-duplicate-overflow', 'لا أيام لتكرارها.', 'There are no days to duplicate.'))
  }
  if (plan.days.length * 2 > MAX_PLAN_DAYS) {
    return rejected(
      err(
        'week-duplicate-overflow',
        `تكرار ${plan.days.length} أيام يتجاوز الحدّ (${MAX_PLAN_DAYS}).`,
        `Duplicating ${plan.days.length} days exceeds the ${MAX_PLAN_DAYS}-day cap.`,
      ),
    )
  }
  let next: WorkoutPlan = { ...plan, days: [...plan.days] }
  for (const source of plan.days) {
    const newId = nextDayId(next)
    const copy: PlanDay = { id: newId, nameAr: `${source.nameAr} ٢`, nameEn: `${source.nameEn} 2`, exercises: [] }
    next = { ...next, days: [...next.days, copy] }
    copy.exercises = source.exercises.map((pe, i) => cloneExercise(next, pe, newId, i))
  }
  return { status: 'ok', plan: next }
}

// ── 4) الحذف الآمن (سلامة المراجع) ────────────────────────────────────────────

/**
 * وصف ترقيع تقويم P4 بعد حذف يوم: التخصيصات المشيرة للفهرس المحذوف تُمسح إلى
 * راحة (مع وسمها)، والفهارس الأعلى تنزاح ١- كي تبقى تشير لنفس الأيام.
 */
export interface CalendarDayRemovalPatch {
  removedIndex: number
  remainingDayCount: number
}

export type RemoveDayResult =
  | { status: 'ok'; plan: WorkoutPlan; removedIndex: number; calendarPatch: CalendarDayRemovalPatch }
  | { status: 'rejected'; errors: BuilderError[] }

/**
 * يحذف يومًا (نقيّ — لا يلمس التخزين). أعد patch التقويم: طبّقه عبر
 * applyCalendarDayRemoval **فقط إذا كانت الخطة المعدَّلة هي الخطة الفعّالة**
 * (بعد saveCustomPlan) — تعديل مسودّة لا يمسّ تقويم الخطة الفعّالة.
 */
export function removeDay(plan: WorkoutPlan, dayId: string): RemoveDayResult {
  const di = dayIndexOf(plan, dayId)
  if (di < 0) return { status: 'rejected', errors: [dayNotFound(dayId)] }
  const days = plan.days.filter((d) => d.id !== dayId)
  return {
    status: 'ok',
    plan: { ...plan, days },
    removedIndex: di,
    calendarPatch: { removedIndex: di, remainingDayCount: days.length },
  }
}

export type ApplyCalendarPatchResult =
  | { status: 'updated'; schedule: WeeklySchedule; clearedWeekdays: number[]; clearedOverrides: string[] }
  | { status: 'skipped'; reason: 'no-schedule' | 'no-change' }
  | { status: 'rejected'; violations: ScheduleViolation[] }

/**
 * يطبّق ترقيع حذف اليوم على الجدول الأسبوعي المخزّن (P4):
 *   • تخصيص يوم أسبوع == الفهرس المحذوف → 'rest' (يُبلَّغ في clearedWeekdays).
 *   • تخصيص > الفهرس → ١- (يبقى يشير لنفس يوم الخطة).
 *   • تجاوزات (overrides) اليوم الفائت تُعامل بنفس القاعدة (المحذوف يُمسح).
 *   • daysPerWeek/split يُعادان الاشتقاق ثم يُحفظ عبر saveWeeklySchedule (الحارس).
 * بلا جدول مخزّن ⇒ skipped. لا شيء يشير للفهرس أو أعلى ⇒ skipped (no-change).
 */
export function applyCalendarDayRemoval(patch: CalendarDayRemovalPatch): ApplyCalendarPatchResult {
  const schedule = loadWeeklySchedule()
  if (!schedule) return { status: 'skipped', reason: 'no-schedule' }
  const { removedIndex } = patch

  const clearedWeekdays: number[] = []
  const weekdays = schedule.weekdays.map((a, weekday) => {
    if (a === 'rest') return a
    if (a === removedIndex) {
      clearedWeekdays.push(weekday)
      return 'rest' as const
    }
    return a > removedIndex ? a - 1 : a
  })

  const clearedOverrides: string[] = []
  const overrides: Record<string, number> = {}
  for (const [stamp, idx] of Object.entries(schedule.overrides)) {
    if (idx === removedIndex) {
      clearedOverrides.push(stamp)
      continue
    }
    overrides[stamp] = idx > removedIndex ? idx - 1 : idx
  }

  const touched =
    clearedWeekdays.length > 0 ||
    clearedOverrides.length > 0 ||
    weekdays.some((a, i) => a !== schedule.weekdays[i]) ||
    Object.entries(overrides).some(([k, v]) => schedule.overrides[k] !== v)
  if (!touched) return { status: 'skipped', reason: 'no-change' }

  const trainingCount = weekdays.filter((a) => a !== 'rest').length
  const saved = saveWeeklySchedule({
    ...schedule,
    weekdays,
    overrides,
    daysPerWeek: trainingCount,
    split: namedSplitForDays(Math.max(1, trainingCount)),
    source: 'user',
    updatedAt: new Date().toISOString(),
  })
  if (saved.status === 'rejected') return { status: 'rejected', violations: saved.violations }
  return { status: 'updated', schedule: saved.schedule, clearedWeekdays, clearedOverrides }
}

/** يحذف تمرينًا من يوم بمعرّف الصفّ (نقيّ). */
export function removeExercise(plan: WorkoutPlan, dayId: string, planExerciseId: string): PlanResult {
  const di = dayIndexOf(plan, dayId)
  if (di < 0) return rejected(dayNotFound(dayId))
  const day = plan.days[di]
  if (!day.exercises.some((e) => e.id === planExerciseId)) {
    return rejected(err('plan-exercise-not-found', `التمرين «${planExerciseId}» غير موجود في اليوم.`, `Exercise row "${planExerciseId}" is not in this day.`))
  }
  const days = [...plan.days]
  days[di] = reindexDay({ ...day, exercises: day.exercises.filter((e) => e.id !== planExerciseId) })
  return { status: 'ok', plan: { ...plan, days } }
}

/**
 * ينظّف خريطة الاستبدال (شاشة 31 — حالة جلسة في الواجهة، مفتاحها معرّف صفّ الخطة):
 * يسقط أي إدخال يشير لصفٍّ لم يعُد موجودًا في الخطة. الخريطة غير مخزّنة في
 * localStorage — الواجهة تستدعي هذا بعد أي حذف/نقل كي لا يبقى استبدال يتيم.
 */
export function cleanSubstitutionMap(subs: Record<string, string>, plan: WorkoutPlan): Record<string, string> {
  const rows = new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.id)))
  const next: Record<string, string> = {}
  for (const [rowId, exId] of Object.entries(subs)) if (rows.has(rowId)) next[rowId] = exId
  return next
}

/**
 * فحص سلامة المراجع الشامل (للاختبارات/الاستيراد): كل exerciseId في المكتبة،
 * كل معرّفات الأيام والصفوف فريدة، وorder = الفهرس.
 */
export function planReferenceViolations(plan: WorkoutPlan): string[] {
  const issues: string[] = []
  const dayIds = new Set<string>()
  const rowIds = new Set<string>()
  plan.days.forEach((d) => {
    if (dayIds.has(d.id)) issues.push(`duplicate-day-id:${d.id}`)
    dayIds.add(d.id)
    d.exercises.forEach((pe, i) => {
      if (rowIds.has(pe.id)) issues.push(`duplicate-row-id:${pe.id}`)
      rowIds.add(pe.id)
      if (!getExercise(pe.exerciseId)) issues.push(`unknown-exercise:${pe.exerciseId}`)
      if (pe.order !== i) issues.push(`order-mismatch:${d.id}:${pe.id}`)
    })
  })
  return issues
}

// ── 5) القوالب المسمّاة (لكل مالك) — التخزين في templates.ts (خفيف، بلا مكتبة تمارين) ──

export type TemplateResult =
  | { status: 'ok'; template: import('./templates').PlanTemplate }
  | { status: 'rejected'; errors: BuilderError[] }

export {
  PLAN_TEMPLATES_KEY,
  MAX_TEMPLATES,
  listTemplates,
  saveTemplate,
  applyTemplate,
  deleteTemplate,
  type PlanTemplate,
} from './templates'

// ── 6) المحقّقات (تحذيرات لا موانع) ───────────────────────────────────────────

/**
 * تقدير وقت الجلسة بالدقائق — **نفس heuristic** todayV2Model/workoutV2Model:
 * ٩ دقائق لكل تمرين، تقريب لأقرب ٥، حدّ أدنى ٢٠ (٠ ليوم فارغ).
 */
export function estimateSessionMinutes(day: PlanDay): number {
  const n = day.exercises.length
  return n > 0 ? Math.max(20, Math.round((n * 9) / 5) * 5) : 0
}

export interface PlanWarning {
  code: 'session-too-long' | 'empty-day' | 'low-muscle-volume' | 'high-muscle-volume'
  /** معرّف اليوم (تحذيرات الجلسة) أو معرّف العضلة (تحذيرات الحجم). */
  subject: string
  messageAr: string
  messageEn: string
}

export interface PlanValidationOptions {
  level?: TrainingLevel
  /** مدّة الجلسة المستهدفة بالدقائق (من ملف المستخدم) — الافتراضي ٩٠ كسقف تحذير. */
  targetSessionMinutes?: number
}

/** الهدف الأسبوعي بالمجموعات حسب المستوى (نفس قاعدة muscleCoverage.levelTarget). */
function levelTarget(min: number, max: number, level: TrainingLevel): number {
  if (level === 'beginner') return min
  if (level === 'advanced') return max
  return Math.round((min + max) / 2)
}

/**
 * يتحقّق من الخطة ويُرجع تحذيرات مُصنَّفة ثنائية اللغة — **لا يمنع أبدًا**:
 *   • وقت الجلسة المقدَّر يتجاوز الهدف (heuristic ٩ دقائق/تمرين).
 *   • يوم بلا تمارين.
 *   • حجم أسبوعي منخفض/مفرط لكل عضلة (قاعدة muscleCoverage: مجموعة منجزة = ١٫٠
 *     للأساسية و٠٫٥ للثانوية؛ الإفراط = أعلى من ١٫٢٥ × الحدّ الأقصى).
 * الحجم يُحسب على افتراض أداء كل أيام الخطة مرّة في الأسبوع.
 */
export function validatePlan(plan: WorkoutPlan, options: PlanValidationOptions = {}): PlanWarning[] {
  const warnings: PlanWarning[] = []
  const level = options.level ?? 'intermediate'
  const cap = options.targetSessionMinutes && options.targetSessionMinutes > 0 ? options.targetSessionMinutes : 90

  plan.days.forEach((d) => {
    if (!d.exercises.length) {
      warnings.push({
        code: 'empty-day',
        subject: d.id,
        messageAr: `اليوم «${d.nameAr}» بلا تمارين.`,
        messageEn: `Day "${d.nameEn}" has no exercises.`,
      })
      return
    }
    const minutes = estimateSessionMinutes(d)
    if (minutes > cap) {
      warnings.push({
        code: 'session-too-long',
        subject: d.id,
        messageAr: `جلسة «${d.nameAr}» تقديرها ~${minutes} دقيقة — أطول من هدفك (${cap}).`,
        messageEn: `"${d.nameEn}" is estimated at ~${minutes} min — longer than your target (${cap}).`,
      })
    }
  })

  // الحجم الأسبوعي لكل عضلة تفصيلية (بيانات muscleGroups نفسها).
  const volume: Record<string, number> = {}
  plan.days.forEach((d) =>
    d.exercises.forEach((pe) => {
      const lib = getExercise(pe.exerciseId)
      if (!lib) return
      lib.primaryMusclesDetailed.forEach((m) => (volume[m] = (volume[m] ?? 0) + pe.sets * 1.0))
      lib.secondaryMusclesDetailed.forEach((m) => (volume[m] = (volume[m] ?? 0) + pe.sets * 0.5))
    }),
  )
  muscleGroups.forEach((mg) => {
    const sets = Math.round((volume[mg.id] ?? 0) * 10) / 10
    if (sets <= 0) return // عضلة خارج الخطة — شأن اختيار المستخدم، لا نحذّر عن كل عضلة غائبة
    const target = levelTarget(mg.weeklyTarget.min, mg.weeklyTarget.max, level)
    if (sets < mg.weeklyTarget.min * 0.5) {
      warnings.push({
        code: 'low-muscle-volume',
        subject: mg.id,
        messageAr: `حجم «${mg.labelAr}» الأسبوعي منخفض (${sets} من ~${target} مجموعة).`,
        messageEn: `Weekly volume for ${mg.labelEn} is low (${sets} of ~${target} sets).`,
      })
    } else if (sets > mg.weeklyTarget.max * 1.25) {
      warnings.push({
        code: 'high-muscle-volume',
        subject: mg.id,
        messageAr: `حجم «${mg.labelAr}» الأسبوعي مفرط (${sets} مجموعة — الأقصى ~${mg.weeklyTarget.max}).`,
        messageEn: `Weekly volume for ${mg.labelEn} is excessive (${sets} sets — max ~${mg.weeklyTarget.max}).`,
      })
    }
  })

  return warnings
}
