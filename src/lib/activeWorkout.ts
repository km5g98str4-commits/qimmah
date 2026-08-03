// الجلسة الجارية (ح-١) — تُحفظ أثناء التمرين ليُستأنف بعد إغلاق التطبيق أو إعادة التحميل.
//
// منفصلة تمامًا عن سجلّ الجلسات المنتهية (`workoutSessions.ts` فوق `historyStore`):
// هذا المتجر يحمل جلسة **واحدة غير منتهية** لكل هوية، وتُمسح لحظة إنهاء التمرين أو
// تجاهله. لا شيء هنا يدخل السجلّ التاريخي ولا المزامنة السحابية.
//
// ثلاث ضمانات ثابتة:
//   • عزل الهوية: السجلّ مفهرس بـ ownerKey (ضيف/معرّف حساب) — هوية لا ترى جلسة أخرى.
//   • تدهور آمن: أي سجلّ تالف أو منتهي الصلاحية يُمسح ويُعاد `undefined` → بداية نظيفة.
//   • القيمة المخزّنة ثابتة: القرارات كلها على `dayId` والأرقام؛ الأسماء المخزّنة للعرض
//     فقط ولا يُبنى عليها منطق (الصياغة قد تتغيّر أو تُترجَم).

import { ownerKey } from '@/features/customPlan'

export const ACTIVE_WORKOUT_KEY = 'qimmah:activeWorkout:v1'

/** عمر الجلسة الجارية قبل أن تُعدّ منتهية — تمرين لا يمتدّ يومًا كاملًا. */
export const ACTIVE_WORKOUT_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** إصدار شكل السجلّ — أي قيمة أخرى تُعامَل كتالف فتُمسح. */
const VERSION = 1

export interface ActiveSetLog {
  setNumber: number
  targetReps: string
  actualReps: string
  weightKg: string
  completed: boolean
}

export interface ActiveExerciseState {
  sets: ActiveSetLog[]
  painNote: string
  notes: string
}

export interface ActiveWorkout {
  version: number
  /** معرّف يوم الخطة — أساس كل قرار (لا الاسم المعروض). */
  dayId: string
  /** أسماء اليوم وقت البدء — للعرض فقط عند غياب اليوم من الخطة الحالية. */
  dayNameAr: string
  dayNameEn: string
  startedAt: string
  updatedAt: string
  /** موضع المستخدم في قائمة التمارين. */
  current: number
  /** حالة كل عنصر خطة (المفتاح = معرّف عنصر الخطة). */
  exercises: Record<string, ActiveExerciseState>
  /** التبديلات المؤقتة لهذه الجلسة (معرّف عنصر الخطة → معرّف تمرين بديل). */
  swap: Record<string, string>
}

type Registry = Record<string, ActiveWorkout>

function loadRegistry(): Registry {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ACTIVE_WORKOUT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Registry) : {}
  } catch {
    return {}
  }
}

function saveRegistry(reg: Registry): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(reg))
  } catch {
    /* تجاهل أخطاء التخزين (وضع خاص/ممتلئ) — الجلسة الجارية ليست بيانات حرجة */
  }
}

function isSet(v: unknown): v is ActiveSetLog {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.setNumber === 'number' &&
    typeof s.targetReps === 'string' &&
    typeof s.actualReps === 'string' &&
    typeof s.weightKg === 'string' &&
    typeof s.completed === 'boolean'
  )
}

function isExerciseState(v: unknown): v is ActiveExerciseState {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (
    Array.isArray(e.sets) &&
    e.sets.every(isSet) &&
    typeof e.painNote === 'string' &&
    typeof e.notes === 'string'
  )
}

/** فحص شكل صارم — أي انحراف يعني «تالف» فتُمسح الجلسة وتبدأ نظيفة. */
function isValid(v: unknown): v is ActiveWorkout {
  if (!v || typeof v !== 'object') return false
  const a = v as Record<string, unknown>
  if (a.version !== VERSION) return false
  if (typeof a.dayId !== 'string' || !a.dayId) return false
  if (typeof a.dayNameAr !== 'string' || typeof a.dayNameEn !== 'string') return false
  if (typeof a.startedAt !== 'string' || Number.isNaN(Date.parse(a.startedAt))) return false
  if (typeof a.updatedAt !== 'string' || Number.isNaN(Date.parse(a.updatedAt))) return false
  if (typeof a.current !== 'number' || !Number.isFinite(a.current) || a.current < 0) return false
  if (!a.exercises || typeof a.exercises !== 'object' || Array.isArray(a.exercises)) return false
  if (!Object.values(a.exercises as Record<string, unknown>).every(isExerciseState)) return false
  if (!a.swap || typeof a.swap !== 'object' || Array.isArray(a.swap)) return false
  return Object.values(a.swap as Record<string, unknown>).every((s) => typeof s === 'string')
}

/** هل مضى على الجلسة أكثر من عمرها المسموح؟ (تُعامَل كمنتهية.) */
function isExpired(a: ActiveWorkout, now: number): boolean {
  return now - Date.parse(a.updatedAt) > ACTIVE_WORKOUT_MAX_AGE_MS
}

/**
 * الجلسة الجارية لهذه الهوية، أو `undefined` إن لم توجد أو كانت تالفة/منتهية.
 * السجلّ التالف/المنتهي يُمسح فورًا فلا يُسأل عنه المستخدم مرّتين.
 */
export function loadActiveWorkout(userId: string | null | undefined): ActiveWorkout | undefined {
  const reg = loadRegistry()
  const key = ownerKey(userId)
  const rec = reg[key]
  if (rec === undefined) return undefined
  if (!isValid(rec) || isExpired(rec, Date.now())) {
    delete reg[key]
    saveRegistry(reg)
    return undefined
  }
  return rec
}

/** هل لهذه الهوية جلسة جارية صالحة؟ */
export function hasActiveWorkout(userId: string | null | undefined): boolean {
  return loadActiveWorkout(userId) !== undefined
}

/** يحفظ/يحدّث الجلسة الجارية لهذه الهوية (يختم `updatedAt`). */
export function saveActiveWorkout(
  userId: string | null | undefined,
  value: Omit<ActiveWorkout, 'version' | 'updatedAt'>,
): void {
  const reg = loadRegistry()
  reg[ownerKey(userId)] = { ...value, version: VERSION, updatedAt: new Date().toISOString() }
  saveRegistry(reg)
}

/**
 * عدد المجموعات المنفَّذة في جلسة جارية. [CTO-72] البند ٤.
 *
 * **لماذا هنا:** كان هذا الحساب مكرَّرًا حرفيًا في موضعين داخل `WorkoutView`
 * (`closeWithoutFinishing` و`discardResume`)، وكلاهما يستعمله للرصد فقط ثم
 * يمضي في فعله بلا سؤال. وهو **الإشارة الوحيدة** التي تفرّق بين «جلسة فيها عمل
 * المستخدم» و«قشرة فارغة»: بلا تقدّم لا معنى للسؤال، ومع تقدّم لا يجوز الفعل
 * بلا سؤال. فوُضع في مالك الشكل، فيراه الحارسان من مصدر واحد.
 *
 * `undefined`/`null` ⇒ صفر — لا جلسة أصلًا لا جلسة فارغة.
 */
export function completedSetCount(active: ActiveWorkout | undefined | null): number {
  if (!active) return 0
  return Object.values(active.exercises).reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0,
  )
}

/** يمسح الجلسة الجارية لهذه الهوية (عند الإنهاء أو التجاهل). */
export function clearActiveWorkout(userId: string | null | undefined): void {
  const reg = loadRegistry()
  const key = ownerKey(userId)
  if (key in reg) {
    delete reg[key]
    saveRegistry(reg)
  }
}
