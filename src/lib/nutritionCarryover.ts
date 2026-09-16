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
//   ٢) هدفا كل يوم — الأساسي والمعدَّل — في `historyStore.NutritionLog`
//      (`baseTargetCalories` · `effectiveTargetCalories`)، يُسجَّلان لحظة عرضهما
//      على المستخدم. «هل تجاوز أمس هدفه؟» سؤال عن هدف **الأمس**، وتغيير الخطة
//      يجعله غير هدف اليوم. وتسجيل المعدَّل هو ما يجعل النظرة **يومًا واحدًا**
//      بلا سلسلة ولا نافذة (انظر `CARRYOVER_LOOKBACK_DAYS`).
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
//     دَين مرّتين على نفس السعرة. ويُقرأ ذلك المعدَّل **مسجَّلًا** لا مُعادًا
//     اشتقاقه — فالنظرة يوم واحد `O(1)`، لا سلسلة ولا سقف مصطنع لها.
//   • **الأرضية قاعدة أمان قائمة لا رقم جديد:** `calorieFloor` من `calculators`
//     نفسها التي يعد بها المقدِّر المستخدم («لا تنزل سعراتك تحت حدّ أدنى مهما
//     كان هدفك»). الترحيل لا يخرقها، ومهما كان الفائض لا ينزل الهدف تحتها.
//   • **الباقي فوق الأرضية لا يُدوَّر.** فائض ضخم يُقصّ عند الأرضية وينتهي أثره
//     في يوم واحد — لا دَين مؤجَّل يلاحق المستخدم أسبوعًا.

import { getDayStamp, shiftDayStamp } from '@/lib/today'
import { getDataOwner } from '@/lib/dataOwnership'
import { getNutritionLog, saveNutritionLog } from '@/lib/historyStore'
import { getDayNutritionStat } from '@/lib/nutritionHistory'
import { calorieFloor } from '@/lib/calculators'
import type { Gender } from '@/types/profile'
import { writeJson, type WriteResult } from '@/lib/safeStorage'

/** إعداد الترحيل — سجلّ واحد مفتاحه معرّف المالك ('guest' للضيف). */
export const NUTRITION_CARRYOVER_KEY = 'qimmah:nutritionCarryover:v1'

/**
 * ═══ نظرة إلى الخلف: **يوم واحد بالضبط** ═══
 *
 * لا نافذة، ولا سلسلة، ولا حدّ أقصى — لأن القاعدة لم تعد تحتاج واحدًا.
 *
 * **ما كان:** أوّل تنفيذ قاس الفائض على الهدف المعدَّل لليوم السابق، وذلك
 * المعدَّل يعتمد على الذي قبله، فصار الحساب سلسلةً تمشي للخلف. ولأن السلسلة
 * قد تطول بلا حدّ وُضع لها سقف **أربعة عشر يومًا** — رقمٌ لا يستطيع أحد تبريره:
 * لا المستخدم يراه، ولا أثره ظاهر، ولا يوجد سبب يجعل اليوم الخامس عشر مختلفًا
 * عن الرابع عشر. سقفٌ يغيّر رقمًا يراه المستخدم بلا أن يعلن نفسه **قاعدة منتج
 * غير مكتوبة**، وهو ما لا يُترك.
 *
 * **ما صار:** هدف اليوم المعدَّل **يُسجَّل يوم سريانه** مع الأساسي
 * (`NutritionLog.effectiveTargetCalories`). فسؤال «هل تجاوز أمس هدفه؟» يُجاب
 * من رقمين مقروءين: ما أكله أمس، والهدف الذي كان أمام عينه أمس. لا إعادة
 * اشتقاق، ولا مشي، ولا سقف — الحساب `O(1)` ومحدّد تمامًا.
 *
 * ═══ الأثر السلوكي الوحيد، معلَنًا ═══
 * تعديل طعام **أمس** يعيد حساب هدف اليوم فورًا (الاستهلاك يُقرأ حيًّا).
 * وتعديل طعام **أوّل أمس** لا يعيد كتابة هدف أمس المسجَّل — لأن ذلك الهدف
 * هو ما رآه المستخدم فعلًا وأكل مقابله، وإعادة كتابته بأثر رجعي تغيّر الشرط
 * الذي حوسِب عليه بعد أن انتهى منه. الهدف يُثبَّت بانقضاء يومه.
 */
export const CARRYOVER_LOOKBACK_DAYS = 1

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

const posInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null

/** هدف يومٍ الأساسي كما سُجِّل وقتها — null إن لم يُسجَّل (لا يُختلق من هدف اليوم). */
export function getDayBaseTarget(date: string): number | null {
  return posInt(getNutritionLog(date)?.baseTargetCalories)
}

/**
 * هدف يومٍ **المعدَّل** كما كان أمام المستخدم وقتها — وهو ما يُقاس عليه فائضه.
 *
 * يومٌ يحمل أساسيًّا بلا معدَّل (سجلّ أقدم من هذا الحقل) يُقرأ «بلا تعديل» أي
 * = أساسيّه. وهو الافتراض **الأكثر تحفّظًا**: أي تعديل حقيقي كان سيكون سالبًا،
 * فالقراءة بالأساسي تعطي فائضًا **أصغر** لا أكبر — لا نخترع دَينًا لم يقع.
 */
export function getDayEffectiveTarget(date: string): number | null {
  const log = getNutritionLog(date)
  return posInt(log?.effectiveTargetCalories) ?? posInt(log?.baseTargetCalories)
}

/**
 * يسجّل هدفَي اليوم (الأساسي والمعدَّل) في كتابة واحدة — يُستدعى من شاشة
 * التغذية **لليوم الحالي وحده**.
 *
 * **لا يكتب للماضي أبدًا**: هدف يوم مضى لم يُسجَّل يبقى مجهولًا، وهذا بالضبط
 * ما يمنع الترحيل من العمل على رقم مخترَع — ويمنع كذلك إعادة كتابة هدفٍ أكل
 * المستخدم مقابله فعلًا.
 */
export function recordDayTargets(date: string, targets: { base: number; effective: number }): void {
  const base = posInt(targets.base)
  const effective = posInt(targets.effective)
  if (base === null || effective === null) return
  if (getDayBaseTarget(date) === base && posInt(getNutritionLog(date)?.effectiveTargetCalories) === effective) return
  try {
    saveNutritionLog(date, { baseTargetCalories: base, effectiveTargetCalories: effective })
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

interface DayTargetOptions {
  settings?: CarryoverSettings
  gender?: Gender
  /** هدف اليوم المطلوب الأساسي — من الخطة الحيّة. */
  base: number
  date: string
}

const roundCals = (n: number): number => Math.round(n)

/** سعرات يوم مستهلكة فعلًا — من نفس مصدر إحصاء اليوم الواحد، لا حساب ثانٍ. */
function consumedCalories(date: string): number {
  return roundCals(getDayNutritionStat(date).totals.calories)
}

/**
 * يحسب تفصيل هدف يوم — **الدالة الوحيدة** التي تنتج «هدف اليوم المعدَّل».
 *
 * قراءتان فقط مهما طال تاريخ المستخدم: هدف الأمس المعدَّل المسجَّل، وما أكله
 * أمس. لا سلسلة تمشي للخلف ولا نافذة تقطعها — انظر `CARRYOVER_LOOKBACK_DAYS`.
 *
 * حتميّة كاملة: لا حالة محفوظة بين النداءات، ولا اعتماد على ترتيب الاستدعاء،
 * ونفس المدخلات تعطي نفس المخرجات دائمًا.
 */
export function computeDayTargets({ base, date, settings, gender }: DayTargetOptions): DayTargetBreakdown {
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

  const active: DayTargetBreakdown = { ...off, active: true }

  const source = shiftDayStamp(date, -CARRYOVER_LOOKBACK_DAYS)
  // يوم المصدر قبل السريان ⇒ لا أثر رجعي على ما كانت الميزة فيه مطفأة.
  if (source < s.enabledAt) return active

  // الهدف الذي كان أمام المستخدم أمس. غيابه ⇒ لا مقارنة ولا رقم مخترَع.
  const sourceTarget = getDayEffectiveTarget(source)
  if (sourceTarget === null) return active

  const surplus = consumedCalories(source) - sourceTarget
  if (surplus <= 0) return active // الفائض وحده يُرحَّل (CARRYOVER_DEFICIT_POLICY)

  const carryover = -surplus
  const raw = baseRounded + carryover
  const effective = Math.max(floor, raw)
  return {
    date,
    base: baseRounded,
    carryover,
    effective,
    floor,
    floorApplied: raw < floor,
    sourceDate: source,
    sourceSurplus: surplus,
    active: true,
  }
}
