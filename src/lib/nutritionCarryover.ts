// ترحيل فائض السعرات — إعداد اختياري **مطفأ افتراضيًا**.
//
// ═══ الفكرة في سطر ═══
// تجاوزتَ هدف أمس بـ٢٠٠ سعرة ⇒ هدف اليوم **المعدَّل** ينزل ٢٠٠. وهدفك
// **الأساسي لا يتغيّر أبدًا**: ثلاثة مفاهيم منفصلة تبقى منفصلة في التخزين
// والحساب والعرض معًا —
//
//   الهدف الأساسي (base)      ← من الخطة، لا يمسّه الترحيل
//   تعديل الترحيل (carryover) ← مشتقّ، سالب أو صفر، لا يُخزَّن
//   هدف اليوم المعدَّل (effective) = clamp(base + carryover)
//
// ═══ لماذا التعديل **مشتقّ** لا مخزَّن ═══
// لو خزّنّا «−٢٠٠» ليوم غد، ثم عدّل المستخدم عشاء أمس فنزل تحت هدفه، لبقي
// الخصم قائمًا على رقم لم يعد صحيحًا — وهي بالضبط الحالة التي تجعل الميزة
// تبدو عشوائية. الاشتقاق من القيود الحيّة يجعل تعديل الماضي يصحّح الحاضر
// **من تلقائه**، بلا هجرة ولا مزامنة ولا مسار إبطال.
//
// ═══ ما يُخزَّن فعلًا ═══
//   ١) الإعداد نفسه (`qimmah:nutritionCarryover:v1`) — مفتاحه المالك، فيه
//      `enabled` و`enabledAt`. مفتاح مستقلّ عن الخطة عمدًا: تغيير الخطة أو
//      إعادة توليدها يجب ألّا يطفئ إعداد المستخدم ولا يشغّله.
//   ٢) هدف كل يوم الأساسي — في `historyStore.NutritionLog.baseTargetCalories`،
//      يُسجَّل لحظة عرضه على المستخدم. «هل تجاوز أمس هدفه؟» سؤال عن هدف
//      **الأمس**، وتغيير الخطة يجعله غير هدف اليوم.
//
// ═══ القواعد الحاكمة (كلّها مقيسة في `test:nutrition-carryover`) ═══
//   • **مطفأ ⇒ صفر.** لا تعديل، ولا قراءة، ولا أثر. إطفاؤه يعيد الاستهداف
//     الطبيعي فورًا بلا خطوة تنظيف.
//   • **لا أثر رجعي.** يوم قبل `enabledAt` لا يُرحَّل منه ولا إليه. تشغيل
//     الميزة اليوم لا يعاقب المستخدم على أمسٍ لم تكن الميزة فيه تعمل.
//   • **الفائض فقط.** أقلّ من الهدف ⇒ صفر، لا رصيد يُضاف للغد (قرار منتج
//     معزول — انظر `CARRYOVER_DEFICIT_POLICY` أدناه).
//   • **لا هدف مُختلَق.** يوم بلا `baseTargetCalories` مسجَّل ⇒ لا يُرحَّل منه.
//   • **الفائض يُقاس على الهدف المعدَّل** لذلك اليوم لا على الأساسي، فلا يتراكم
//     دَين مرّتين على نفس السعرة.
//   • **الأرضية قاعدة أمان قائمة لا رقم جديد:** `calorieFloor` من `calculators`
//     نفسها التي يعد بها المقدِّر المستخدم («لا تنزل سعراتك تحت حدّ أدنى مهما
//     كان هدفك»). الترحيل لا يخرقها، ومهما كان الفائض لا ينزل الهدف تحتها.
//   • **الباقي فوق الأرضية لا يُدوَّر.** فائض ضخم يُقصّ عند الأرضية وينتهي أثره
//     في يوم واحد — لا دَين مؤجَّل يلاحق المستخدم أسبوعًا.

import { getDayStamp, shiftDayStamp } from '@/lib/today'
import { getDataOwner } from '@/lib/dataOwnership'
import { getNutritionLog, getNutritionLogs, saveNutritionLog } from '@/lib/historyStore'
import { getDayNutritionStat, ownerNutritionDays, type DayEntriesMap } from '@/lib/nutritionHistory'
import { calorieFloor } from '@/lib/calculators'
import type { Gender } from '@/types/profile'
import { writeJson, type WriteResult } from '@/lib/safeStorage'

/** إعداد الترحيل — سجلّ واحد مفتاحه معرّف المالك ('guest' للضيف). */
export const NUTRITION_CARRYOVER_KEY = 'qimmah:nutritionCarryover:v1'

/**
 * ⚠️ **أُزيلت نافذة الأربعة عشر يومًا — ولم يحلّ محلّها رقم آخر.**
 *
 * كانت `CARRYOVER_CHAIN_DAYS = 14` تقصّ السلسلة عند حافّة ثابتة، بحجّتين:
 * «محدود الكلفة» و«أثره يتلاشى عمليًّا». وكلتاهما لا تصمد:
 *
 *   • **الكلفة** لم تكن في طول السلسلة بل في **قراءة التخزين داخل الحلقة**:
 *     `getDayBaseTarget` كانت تُحلّل خريطة `nutritionLogs` كاملةً في كل خطوة،
 *     و`consumedCalories` تقرأ الدفتر كاملًا في كل خطوة. الحلّ رفع القراءتين
 *     خارج الحلقة (`readOnce` أدناه) — فصارت الخطوة بحثًا في خريطة محمّلة،
 *     وسقط مبرّر القصّ من أصله.
 *   • **«يتلاشى عمليًّا»** وصفٌ للحالة الشائعة لا ضمانٌ لأيّ حالة. مستخدم
 *     يتجاوز هدفه خمسة عشر يومًا متتاليًا كان خصمه يتغيّر لأنّ عدّادًا بلغ ١٤،
 *     **بلا أن يُعرض له ذلك في أيّ سطح** — وهو بعينه «قاعدة منتج غير مشروحة
 *     يختفي فيها الترحيل بمرور الأيام».
 *
 * البديل ليس رقمًا أكبر بل **حدّ مشتقّ من البيانات نفسها**: السلسلة تبدأ من
 * أوّل يوم يُثبَت أن خصمه صفر **مهما كان ما قبله** (`chainAnchor`)، فتعطي
 * **نفس نتيجة المشي غير المحدود بالضبط** بلا حافّة مخترَعة. والحدّ الأقصى
 * الطبيعي هو `enabledAt`: الميزة لا تصل إلى ما قبل يوم تشغيلها أصلًا.
 */
export const CARRYOVER_CHAIN_WINDOW_REMOVED = true

/**
 * ⚠️ **قرار منتج معزول — العجز لا يُرحَّل في هذه النسخة.**
 *
 * اسم الميزة ومثال المؤسس يتكلّمان عن **الفائض** وحده. وترحيل العجز (أكلتَ أقل
 * ⇒ خذ الفرق غدًا) سلوك مختلف يشجّع نمط «أجوّع اليوم لآكل غدًا»، وهو قرار صحّي
 * ومنتجي لا يُستنتج من صياغة الفائض. فعُزل هنا بثابت واحد بدل أن يُحسم ضمنًا:
 * قلبه قرار مؤسس، وتنفيذه بعده تغيير سطر لا موجة.
 */
export const CARRYOVER_DEFICIT_POLICY = 'ignore' as const

export interface CarryoverSettings {
  enabled: boolean
  /** أوّل يوم تسري فيه الميزة (ختم محلي) — null حين تكون مطفأة ولم تُشغَّل قطّ. */
  enabledAt: string | null
}

export const CARRYOVER_OFF: CarryoverSettings = { enabled: false, enabledAt: null }

type CarryoverRecord = Record<string, CarryoverSettings>

function ls(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function currentOwner(): string {
  return getDataOwner() ?? 'guest'
}

function readRecord(): CarryoverRecord {
  const s = ls()
  if (!s) return {}
  try {
    const raw = s.getItem(NUTRITION_CARRYOVER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as CarryoverRecord) : {}
  } catch {
    return {}
  }
}

/** تطبيع إعداد واحد — التخزين مدخل غير موثوق؛ التالف يسقط إلى «مطفأ». */
function normalize(raw: unknown): CarryoverSettings {
  if (!raw || typeof raw !== 'object') return { ...CARRYOVER_OFF }
  const v = raw as Partial<CarryoverSettings>
  const enabledAt = typeof v.enabledAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.enabledAt) ? v.enabledAt : null
  // مُشغَّل بلا تاريخ سريان لا يمكن حسابه بلا اختراع ⇒ يُقرأ مطفأً.
  if (v.enabled !== true || enabledAt === null) return { ...CARRYOVER_OFF }
  return { enabled: true, enabledAt }
}

/** إعداد المالك الحالي (أو مالك مُسمّى — لسجلّ النقل). */
export function getCarryoverSettings(userId?: string | null): CarryoverSettings {
  const owner = userId === undefined ? currentOwner() : userId || 'guest'
  return normalize(readRecord()[owner])
}

/**
 * يشغّل/يطفئ الترحيل — الكاتب الواحد، عبر `safeStorage` بنتيجة مسمّاة (§5):
 * فشل الكتابة يعود للمستدعي فلا تُعرض شاشة نجاح على حفظ لم يحدث.
 *
 * التشغيل يثبّت `enabledAt` **يوم التشغيل**: فلا يسري على أمسٍ كانت الميزة فيه
 * مطفأة. وإعادة التشغيل تثبّت تاريخًا جديدًا — لا يعود دَين قديم بعد إطفاء.
 */
export function setCarryoverEnabled(enabled: boolean, today: string = getDayStamp()): WriteResult {
  const record = readRecord()
  const owner = currentOwner()
  if (enabled) record[owner] = { enabled: true, enabledAt: today }
  else delete record[owner]
  return writeJson(NUTRITION_CARRYOVER_KEY, record)
}

// ── هدف اليوم الأساسي المسجَّل ────────────────────────────────────────────────

/** هدف يومٍ الأساسي كما سُجِّل وقتها — null إن لم يُسجَّل (لا يُختلق من هدف اليوم). */
export function getDayBaseTarget(date: string): number | null {
  const v = getNutritionLog(date)?.baseTargetCalories
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null
}

/**
 * يسجّل هدف اليوم الأساسي إن تغيّر أو غاب — يُستدعى من شاشة التغذية لليوم
 * الحالي وحده. **لا يكتب للماضي**: هدف يوم مضى لم يُسجَّل يبقى مجهولًا، وهذا
 * بالضبط ما يمنع الترحيل من العمل على رقم مخترَع.
 */
export function recordDayBaseTarget(date: string, baseCalories: number): void {
  if (!Number.isFinite(baseCalories) || baseCalories <= 0) return
  const rounded = Math.round(baseCalories)
  if (getDayBaseTarget(date) === rounded) return
  try {
    saveNutritionLog(date, { baseTargetCalories: rounded })
  } catch {
    /* المجاميع best-effort — غيابها يعني «لا ترحيل من هذا اليوم» لا رقمًا خاطئًا */
  }
}

// ── الحساب ────────────────────────────────────────────────────────────────────

export interface DayTargetBreakdown {
  date: string
  /** هدف الخطة — لا يمسّه الترحيل أبدًا. */
  base: number
  /** تعديل الترحيل: صفر أو **سالب**. */
  carryover: number
  /** هدف اليوم بعد التعديل والأرضية. */
  effective: number
  /** الأرضية الآمنة المطبَّقة (من `calculators.calorieFloor`). */
  floor: number
  /** true ⇒ الخصم بلغ الأرضية فقُصَّ عندها (يُعلَن للمستخدم، لا يُخفى). */
  floorApplied: boolean
  /** اليوم الذي جاء منه الخصم — null إن لا خصم. */
  sourceDate: string | null
  /** فائض يوم المصدر (موجب) — null إن لا خصم. */
  sourceSurplus: number | null
  /** true ⇒ الميزة مشتغلة وسارية على هذا اليوم (ولو كان الخصم صفرًا). */
  active: boolean
}

interface ChainOptions {
  settings?: CarryoverSettings
  gender?: Gender
  /** هدف اليوم المطلوب الأساسي — من الخطة الحيّة. */
  base: number
  date: string
}

const roundCals = (n: number): number => Math.round(n)

/**
 * قراءة واحدة لكل مصدر، تُعاد استخدامها طوال السلسلة.
 *
 * هذا هو **إصلاح الكلفة الحقيقي** الذي كانت نافذة الـ١٤ يومًا تخفيه:
 * `getNutritionLog` و`getDayNutritionStat` كلٌّ منهما يقرأ تخزينه ويحلّله
 * **كاملًا**، فالمشي يومًا بيوم كان يعيد التحليل مرّة لكل يوم. برفعهما هنا
 * صارت كلفة السلسلة قراءتين ثابتتين + بحثًا في خريطة لكل يوم، فلم يبقَ سبب
 * لقصّ السلسلة برقم.
 */
interface ChainReads {
  baseTargetOf: (date: string) => number | null
  consumedOf: (date: string) => number
}

function readOnce(): ChainReads {
  let logs: Record<string, { baseTargetCalories?: number } | undefined> = {}
  try {
    logs = getNutritionLogs() as typeof logs
  } catch {
    /* تخزين تالف ⇒ لا أهداف مسجَّلة ⇒ لا ترحيل (صدق لا اختراع) */
  }
  let days: DayEntriesMap = {}
  try {
    days = ownerNutritionDays()
  } catch {
    /* دفتر تالف ⇒ المجاميع القانونية وحدها عبر getDayNutritionStat */
  }
  return {
    baseTargetOf: (date) => {
      const v = logs[date]?.baseTargetCalories
      return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null
    },
    consumedOf: (date) => roundCals(getDayNutritionStat(date, days).totals.calories),
  }
}

/**
 * أوّل يوم في السلسلة الذي **يُثبَت** أن خصمه الخارج صفر مهما كان ما قبله.
 *
 * ═══ لماذا هذا صحيح تمامًا (لا تقريبًا) ═══
 * الخصم الداخل `carry` سالبٌ أو صفر دائمًا، والهدف المعدَّل
 * `effective = max(floor, base + carry)` لذلك **لا ينزل تحت الأرضية أبدًا**.
 * فإذا كان مستهلَك يومٍ ≤ الأرضية، فإن
 * `surplus = consumed − effective ≤ consumed − floor ≤ 0`
 * ⇒ خصمه الخارج صفر **أيًّا كان الداخل**. وكذلك يومٌ بلا هدف أساسي مسجَّل:
 * الشيفرة تصفّر عنده صراحةً. فكلا الشرطين **مستقلّ عن الماضي**، ومن ثمّ يصحّ
 * بدء المشي من بعده بخصم صفر — والنتيجة **مطابقة** لمشيٍ غير محدود من البداية.
 *
 * وإن لم يوجد أيّ كاسر حتى `enabledAt`، فالبداية هي `enabledAt` نفسه: الميزة
 * لا أثر رجعي لها، فما قبلها صفر بحكم القاعدة لا بحكم نافذة.
 */
function chainAnchor(date: string, enabledAt: string, floor: number, reads: ChainReads): string {
  let cursor = shiftDayStamp(date, -1)
  while (cursor >= enabledAt) {
    if (reads.baseTargetOf(cursor) === null) return shiftDayStamp(cursor, 1)
    if (reads.consumedOf(cursor) <= floor) return shiftDayStamp(cursor, 1)
    cursor = shiftDayStamp(cursor, -1)
  }
  return enabledAt
}

/**
 * يحسب تفصيل هدف يوم — **الدالة الوحيدة** التي تنتج «هدف اليوم المعدَّل».
 *
 * المسار حتميّ: يمشي للأمام من أوّل يوم داخل النافذة (وبعد `enabledAt`) حتى
 * اليوم المطلوب، ويحمل خصم كل يوم إلى تاليه. لا عشوائية، ولا اعتماد على ترتيب
 * استدعاء، ولا حالة محفوظة بين النداءات.
 */
export function computeDayTargets({ base, date, settings, gender }: ChainOptions): DayTargetBreakdown {
  const floor = calorieFloor(gender ?? 'unspecified')
  const baseRounded = roundCals(Math.max(0, base))
  const off: DayTargetBreakdown = {
    date,
    base: baseRounded,
    carryover: 0,
    effective: baseRounded,
    floor,
    floorApplied: false,
    sourceDate: null,
    sourceSurplus: null,
    active: false,
  }

  const s = settings ?? getCarryoverSettings()
  // مطفأ، أو هدف محجوب (قاصر/بيانات ناقصة) ⇒ لا ترحيل بتاتًا.
  if (!s.enabled || s.enabledAt === null || baseRounded <= 0) return off
  // يوم قبل سريان الميزة ⇒ خارج نطاقها.
  if (date < s.enabledAt) return off

  // قراءتان ثابتتان تخدمان السلسلة كلّها (انظر `readOnce`).
  const reads = readOnce()

  // نقطة البداية **مشتقّة من البيانات لا من رقم**: أوّل يوم خصمه صفر يقينًا.
  let cursor = chainAnchor(date, s.enabledAt, floor, reads)

  // خصم اليوم الجاري في المشي — أوّل يوم في السلسلة يبدأ بلا خصم (لا أثر رجعي).
  let carry = 0
  let sourceDate: string | null = null
  let sourceSurplus: number | null = null

  while (cursor < date) {
    // هدف يوم المصدر الأساسي **كما كان وقتها**؛ غيابه يقطع السلسلة بصدق.
    const sourceBase = reads.baseTargetOf(cursor)
    if (sourceBase === null) {
      carry = 0
      sourceDate = null
      sourceSurplus = null
      cursor = shiftDayStamp(cursor, 1)
      continue
    }
    const sourceEffective = Math.max(floor, sourceBase + carry)
    const surplus = reads.consumedOf(cursor) - sourceEffective
    if (surplus > 0) {
      carry = -surplus
      sourceDate = cursor
      sourceSurplus = surplus
    } else {
      carry = 0
      sourceDate = null
      sourceSurplus = null
    }
    cursor = shiftDayStamp(cursor, 1)
  }

  const raw = baseRounded + carry
  const effective = Math.max(floor, raw)
  return {
    date,
    base: baseRounded,
    carryover: carry,
    effective,
    floor,
    floorApplied: carry < 0 && raw < floor,
    sourceDate,
    sourceSurplus,
    active: true,
  }
}
