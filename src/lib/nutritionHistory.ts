// سجلّ التغذية المؤرَّخ (P7) — دفتر يومي بالتفاصيل لا يفقد الأمس.
//
// المشكلة: المتجر القانوني لليوم (qimmah:nutrition:v2) يوم-فقط — يومٌ جديد يكتب
// فوق أصناف الأمس، ولا يبقى من الماضي إلا مجاميع historyStore.nutritionLogs.
// الحلّ: دفتر مؤرَّخ لكل مالك (qimmah:nutritionHistory:v1) يُكتب من **مسار الكاتب
// الواحد نفسه** — nutritionV2Model.persist يستدعي recordLedgerDay بعد كل كتابة —
// فيبقى تفصيل كل يوم (الصنف/الوجبة/الكمية/الماكروز) قابلًا للقراءة بعد انقضائه.
//
// مبادئ صارمة:
//   • لا تفصيل مُختلَق للماضي: الدفتر يبدأ من لحظة التفعيل؛ الأيام الأقدم تبقى
//     «مجاميع فقط» وتُوسم {estimated:true} في الإحصاءات.
//   • لا جرامات مُخترعة: عنصر بلا servingGrams تحويله جرامات ⇒ null/رفض.
//   • كمية فارغة تُرفض — لا افتراضات صامتة.
//   • getDayStamp في كل حساب يوم (لا new Date().toISOString().slice()).
//   • احتفاظ ~90 يومًا (تشذيب عند الكتابة).
//
// العقد المكتوب للواجهة: docs/data/NUTRITION-HISTORY.md

import type { FoodItem } from '@/data/foodItems'
import { foodItems } from '@/data/foodItems'
import { getDayStamp } from '@/lib/today'
import { getDataOwner, runMigration } from '@/lib/dataOwnership'
import { enqueueSyncDelete, enqueueSyncOperation, getSyncRuntime } from '@/lib/syncQueue'
import { getNutritionLog, saveNutritionLog } from '@/lib/historyStore'
import { writeJson, type WriteResult } from '@/lib/safeStorage'
import { foldArabic, foldArabicDigits } from '@/lib/text/foodNormalize'
import {
  NUTRITION_V2_KEY,
  addFoodToDay,
  loadNutritionDay,
  removeFoodFromDay,
  updateFoodInDay,
  type LoggedFood,
  type MealSlot,
} from '@/lib/nutritionV2Model'

// ── المفاتيح والحدود ──────────────────────────────────────────────────────────

/** دفتر التغذية المؤرَّخ — سجلّ واحد مفتاحه معرّف المالك ('guest' للضيف). */
export const NUTRITION_HISTORY_KEY = 'qimmah:nutritionHistory:v1'
/** الأطعمة الشخصية اليدوية — سجلّ واحد مفتاحه معرّف المالك. */
export const PERSONAL_FOODS_KEY = 'qimmah:personalFoods:v1'
/** نافذة الاحتفاظ بالتفاصيل (أيام) — الأقدم يُشذَّب عند الكتابة؛ المجاميع تبقى في historyStore. */
export const HISTORY_RETENTION_DAYS = 90
export const MAX_PERSONAL_FOODS = 200

// ── الأنواع ───────────────────────────────────────────────────────────────────

export interface EntryQuantity {
  grams?: number
  servings?: number
}

export interface EntryMacros {
  calories: number
  protein: number
  carbs?: number
  fat?: number
}

/** قيد واحد في دفتر يوم: صنف مسجّل بوجبته وكميته وماكروزه المحسوبة. */
export interface NutritionEntry {
  id: string
  /** مرجع عنصر المكتبة إن سُجّل منها — يتيح إعادة الحساب من بياناتها. */
  foodId?: string
  nameAr: string
  nameEn?: string
  meal: MealSlot
  /** الكمية المدخلة (والمشتقة حين يمكن التحويل). فارغة ⇒ سجلّ قديم بلا كمية معروفة. */
  quantity: EntryQuantity
  /** وحدة الإدخال الأصلية. */
  unit: 'g' | 'serving'
  macros: EntryMacros
  addedAt: string
  /** طابع آخر تعديل (P12) — دليل LWW للمزامنة؛ يغيب في القيود الأقدم. */
  updatedAt?: string
}

export interface HistoryError {
  code:
    | 'entry-not-found'
    | 'empty-quantity'
    | 'ambiguous-quantity'
    | 'invalid-quantity'
    | 'serving-only-item'
    | 'quantity-unknown'
    | 'invalid-manual-food'
    | 'nothing-to-copy'
  messageAr: string
  messageEn: string
}

export type EntryResult =
  | { status: 'ok'; entry: NutritionEntry }
  | { status: 'rejected'; errors: HistoryError[] }

type DayEntriesMap = Record<string, NutritionEntry[]>
type LedgerRecord = Record<string, DayEntriesMap>

const MEAL_SLOTS: ReadonlySet<string> = new Set(['breakfast', 'lunch', 'dinner', 'snack'])

const err = (code: HistoryError['code'], messageAr: string, messageEn: string): HistoryError => ({ code, messageAr, messageEn })
const rejected = (...errors: HistoryError[]): { status: 'rejected'; errors: HistoryError[] } => ({ status: 'rejected', errors })

// ── أدوات داخلية ──────────────────────────────────────────────────────────────

function ls(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

/** مالك الدفتر الحالي: ختم ملكية البيانات (dataOwnership) أو 'guest'. */
function currentOwner(): string {
  return getDataOwner() ?? 'guest'
}

function ownerKey(userId: string | null | undefined): string {
  return userId ?? 'guest'
}

const round1 = (n: number): number => Math.round(n * 10) / 10
const round2 = (n: number): number => Math.round(n * 100) / 100

/** يضيف أيامًا لختم يوم (YYYY-MM-DD) ويعيد الختم الناتج عبر getDayStamp. */
function stampAddDays(stamp: string, delta: number): string {
  const [y, m, d] = stamp.split('-').map(Number)
  return getDayStamp(new Date(y, (m || 1) - 1, (d || 1) + delta, 12))
}

/** تطبيع قيد واحد — localStorage يُعامل كمدخل معادٍ؛ التالف يُسقط بصمت. */
function normalizeEntry(raw: unknown): NutritionEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Partial<NutritionEntry>
  if (typeof e.id !== 'string' || !e.id) return null
  if (typeof e.nameAr !== 'string' || !e.nameAr) return null
  const macros = e.macros
  if (!macros || typeof macros !== 'object' || typeof macros.calories !== 'number' || typeof macros.protein !== 'number') return null
  const q = e.quantity && typeof e.quantity === 'object' ? e.quantity : {}
  const grams = typeof q.grams === 'number' && Number.isFinite(q.grams) && q.grams > 0 ? q.grams : undefined
  const servings = typeof q.servings === 'number' && Number.isFinite(q.servings) && q.servings > 0 ? q.servings : undefined
  return {
    id: e.id,
    ...(typeof e.foodId === 'string' && e.foodId ? { foodId: e.foodId } : {}),
    nameAr: e.nameAr,
    ...(typeof e.nameEn === 'string' && e.nameEn ? { nameEn: e.nameEn } : {}),
    meal: typeof e.meal === 'string' && MEAL_SLOTS.has(e.meal) ? (e.meal as MealSlot) : 'snack',
    quantity: { ...(grams !== undefined ? { grams } : {}), ...(servings !== undefined ? { servings } : {}) },
    unit: e.unit === 'g' || e.unit === 'serving' ? e.unit : grams !== undefined ? 'g' : 'serving',
    macros: {
      calories: macros.calories,
      protein: macros.protein,
      ...(typeof macros.carbs === 'number' ? { carbs: macros.carbs } : {}),
      ...(typeof macros.fat === 'number' ? { fat: macros.fat } : {}),
    },
    addedAt: typeof e.addedAt === 'string' ? e.addedAt : '',
    ...(typeof e.updatedAt === 'string' && e.updatedAt ? { updatedAt: e.updatedAt } : {}),
  }
}

function readLedger(): LedgerRecord {
  const s = ls()
  if (!s) return {}
  try {
    const raw = s.getItem(NUTRITION_HISTORY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as LedgerRecord) : {}
  } catch {
    return {}
  }
}

function writeLedger(ledger: LedgerRecord): void {
  try {
    ls()?.setItem(NUTRITION_HISTORY_KEY, JSON.stringify(ledger))
  } catch {
    /* امتلاء/حجب التخزين — لا نرمي */
  }
}

/** أيام مالكٍ مطبَّعة (كل قيد تالف يُسقط). */
function ownerDays(ledger: LedgerRecord, owner: string): DayEntriesMap {
  const raw = ledger[owner]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const days: DayEntriesMap = {}
  for (const [date, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue
    const entries = list.map(normalizeEntry).filter((e): e is NutritionEntry => e !== null)
    if (entries.length) days[date] = entries
  }
  return days
}

/** يشذّب أيامًا أقدم من نافذة الاحتفاظ نسبةً إلى مرجع (مقارنة نصية آمنة لـ YYYY-MM-DD). */
function pruneDays(days: DayEntriesMap, referenceStamp: string): DayEntriesMap {
  const minStamp = stampAddDays(referenceStamp, -HISTORY_RETENTION_DAYS)
  const next: DayEntriesMap = {}
  for (const [date, entries] of Object.entries(days)) {
    if (date >= minStamp) next[date] = entries
  }
  return next
}

// ── تهيئة لمرة واحدة (runMigration — init فقط، لا اختلاق ماضٍ) ────────────────

let initAttempted = false

/**
 * يهيّئ الدفتر مرة واحدة عبر مشغّل الهجرات الموحّد: ينشئ السجلّ إن غاب، ويبذر
 * **أصناف اليوم الحالي فقط** من المتجر القانوني (بيانات حقيقية موجودة الآن) —
 * الأيام الماضية لا يُخترع لها تفصيل؛ تبقى مجاميع historyStore الموسومة تقديرية.
 */
export function ensureNutritionHistoryInit(): void {
  if (initAttempted || typeof window === 'undefined') return
  initAttempted = true
  runMigration({
    id: 'nutrition-history-init-v1',
    keys: [NUTRITION_HISTORY_KEY, NUTRITION_V2_KEY],
    run: () => {
      const ledger = readLedger()
      const owner = currentOwner()
      const days = ownerDays(ledger, owner)
      // بذر أصناف اليوم الحالي (إن وُجدت) من المتجر القانوني — قراءة خام لتجنّب أي دورة.
      try {
        const raw = localStorage.getItem(NUTRITION_V2_KEY)
        const parsed = raw ? (JSON.parse(raw) as { date?: string; foods?: unknown[] }) : null
        if (parsed && parsed.date === getDayStamp() && Array.isArray(parsed.foods) && parsed.foods.length && !days[parsed.date]) {
          days[parsed.date] = (parsed.foods as LoggedFood[]).map((f) => entryFromLoggedFood(f, undefined))
        }
      } catch {
        /* متجر اليوم تالف — الدفتر يبدأ فارغًا */
      }
      ledger[owner] = days
      writeLedger(ledger)
    },
    verify: () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(NUTRITION_HISTORY_KEY) ?? 'null') as unknown
        return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      } catch {
        return false
      }
    },
  })
}

// ── الكاتب الواحد: يُستدعى من nutritionV2Model.persist بعد كل كتابة يوم ────────

/** يحوّل صنف المتجر الحيّ لقيد دفتر (يرث addedAt/foodId من قيد سابق بنفس المعرّف). */
function entryFromLoggedFood(f: LoggedFood, prior: NutritionEntry | undefined): NutritionEntry {
  const grams = typeof f.grams === 'number' && Number.isFinite(f.grams) && f.grams > 0 ? f.grams : prior?.quantity.grams
  const servings = typeof f.servings === 'number' && Number.isFinite(f.servings) && f.servings > 0 ? f.servings : prior?.quantity.servings
  const next: NutritionEntry = {
    id: f.id,
    ...(f.foodId ?? prior?.foodId ? { foodId: f.foodId ?? prior?.foodId } : {}),
    nameAr: f.nameAr,
    ...(f.nameEn ?? prior?.nameEn ? { nameEn: f.nameEn ?? prior?.nameEn } : {}),
    meal: f.meal,
    quantity: { ...(grams !== undefined ? { grams } : {}), ...(servings !== undefined ? { servings } : {}) },
    unit: f.unit ?? prior?.unit ?? (grams !== undefined ? 'g' : 'serving'),
    macros: {
      calories: f.calories || 0,
      protein: f.protein || 0,
      ...(typeof f.carbs === 'number' ? { carbs: f.carbs } : {}),
      ...(typeof f.fat === 'number' ? { fat: f.fat } : {}),
    },
    addedAt: prior?.addedAt || new Date().toISOString(),
  }
  // طابع LWW صادق: يُحدَّث فقط عند تغيّر محتوى القيد فعلًا (لا عند إعادة كتابة اليوم كما هو).
  const changed =
    !prior ||
    prior.meal !== next.meal ||
    prior.quantity.grams !== next.quantity.grams ||
    prior.quantity.servings !== next.quantity.servings ||
    prior.macros.calories !== next.macros.calories ||
    prior.macros.protein !== next.macros.protein
  const updatedAt = changed ? new Date().toISOString() : prior?.updatedAt
  return updatedAt ? { ...next, updatedAt } : next
}

// ── مزامنة الدفتر (P12): جدول nutrition_ledger — صف لكل (مالك، يوم) ───────────

/** أحدث دليل زمني ليوم دفتر — أقصى (addedAt | updatedAt) بين قيوده؛ '' بلا دليل. */
export function ledgerDayStamp(entries: readonly NutritionEntry[]): string {
  let max = ''
  for (const e of entries) {
    if (e.addedAt > max) max = e.addedAt
    if ((e.updatedAt ?? '') > max) max = e.updatedAt as string
  }
  return max
}

/**
 * يرفع كتابة يوم دفتر للطابور (upsert) أو شاهد قبر عند مسح اليوم — فقط حين يكون
 * مالك الدفتر هو نفسه مالك جلسة المزامنة الموثَّق (لا رفع بيانات ضيف/مالك آخر).
 * enqueueSyncOperation نفسها تتولى بوابات العلم/التبنّي/الاستعادة/الإيقاف.
 */
function enqueueLedgerDaySync(owner: string, date: string, entries: readonly NutritionEntry[] | null): void {
  if (!owner || owner === 'guest' || owner !== getSyncRuntime().userId) return
  if (!entries || entries.length === 0) {
    enqueueSyncDelete('nutrition_ledger', date)
    return
  }
  enqueueSyncOperation('nutrition_ledger', date, {
    date,
    data: { entries },
    updated_at: ledgerDayStamp(entries) || new Date().toISOString(),
    deleted_at: null,
  })
}

/**
 * كتابة يوم من مسار المزامنة (hydrate) — تكتب الدفتر فقط دون المجاميع القانونية
 * (المجاميع تصل عبر daily_logs كما هي) ودون إعادة رفع (capture موقوف أثناء الترطيب).
 * قائمة فارغة/null ⇒ يوم الدفتر يُمحى (تطبيق شاهد قبر فائز بالـLWW).
 */
export function setLedgerDayFromSync(userId: string, date: string, entries: NutritionEntry[] | null): void {
  if (typeof window === 'undefined' || !userId || !date) return
  const ledger = readLedger()
  const owner = ownerKey(userId)
  const days = ownerDays(ledger, owner)
  const normalized = (entries ?? []).map(normalizeEntry).filter((e): e is NutritionEntry => e !== null)
  if (normalized.length) days[date] = normalized
  else delete days[date]
  ledger[owner] = days
  writeLedger(ledger)
}

/**
 * يسجّل أصناف يومٍ في الدفتر لتاريخها — **المسار الوحيد لكتابة يوم الدفتر الحيّ**
 * (يستدعيه nutritionV2Model.persist). التاريخ الجديد لا يمسّ الأمس، فالترحيل
 * اليومي لا يفقد تفصيلًا بعد الآن. قائمة فارغة ⇒ يوم الدفتر يُمسح (مرآة صادقة).
 */
export function recordLedgerDay(day: { date: string; foods: LoggedFood[] }): void {
  if (typeof window === 'undefined') return
  ensureNutritionHistoryInit()
  const ledger = readLedger()
  const owner = currentOwner()
  const days = ownerDays(ledger, owner)
  const prior = new Map((days[day.date] ?? []).map((e) => [e.id, e]))
  if (day.foods.length) {
    days[day.date] = day.foods.map((f) => entryFromLoggedFood(f, prior.get(f.id)))
  } else {
    delete days[day.date]
  }
  ledger[owner] = pruneDays(days, day.date)
  writeLedger(ledger)
  enqueueLedgerDaySync(owner, day.date, days[day.date] ?? null)
}

// ── القراءة ───────────────────────────────────────────────────────────────────

/** قيود يوم بتاريخه (مطبَّعة). يوم بلا تفصيل ⇒ [] — **لا اختلاق** من المجاميع. */
export function getDayEntries(date: string): NutritionEntry[] {
  ensureNutritionHistoryInit()
  return ownerDays(readLedger(), currentOwner())[date] ?? []
}

/** كل أيام مالكٍ (للنقل/التصدير) — تُستخدم من سجلّ portability بمعرّف صريح. */
export function loadLedgerDays(userId: string | null | undefined): DayEntriesMap {
  return ownerDays(readLedger(), ownerKey(userId))
}

// ── مجاميع يوم من قيوده (نفس شكل loggedFood القانوني) ─────────────────────────

function totalsFromEntries(entries: NutritionEntry[]): { calories: number; protein: number; carbs: number; fat: number } {
  return {
    calories: Math.round(entries.reduce((s, e) => s + (e.macros.calories || 0), 0)),
    protein: Math.round(entries.reduce((s, e) => s + (e.macros.protein || 0), 0)),
    carbs: Math.round(entries.reduce((s, e) => s + (e.macros.carbs ?? 0), 0)),
    fat: Math.round(entries.reduce((s, e) => s + (e.macros.fat ?? 0), 0)),
  }
}

/** يكتب قيود يومٍ ماضٍ في الدفتر + يحدّث مجاميعه القانونية (saveNutritionLog). */
function persistPastDay(date: string, entries: NutritionEntry[]): void {
  const ledger = readLedger()
  const owner = currentOwner()
  const days = ownerDays(ledger, owner)
  if (entries.length) days[date] = entries
  else delete days[date]
  ledger[owner] = days
  writeLedger(ledger)
  enqueueLedgerDaySync(owner, date, entries.length ? entries : null)
  try {
    saveNutritionLog(date, { loggedFood: totalsFromEntries(entries) })
  } catch {
    /* المجاميع القانونية best-effort — الدفتر نفسه ثبت */
  }
}

// ── تحويل جرامات ↔ حصص (بلا اختراع) ──────────────────────────────────────────

interface ConvertibleFood {
  servingGrams?: number
  calories: number
  protein: number
  carbs?: number
  fat?: number
}

/** جرامات كمية حصص — null إذا كان العنصر بلا servingGrams (حصص-فقط، لا نخترع جرامات). */
export function gramsForServings(food: Pick<ConvertibleFood, 'servingGrams'>, servings: number): number | null {
  if (!Number.isFinite(servings) || servings <= 0) return null
  const sg = food.servingGrams
  return typeof sg === 'number' && sg > 0 ? round1(servings * sg) : null
}

/** حصص كمية جرامات — null إذا كان العنصر بلا servingGrams. */
export function servingsForGrams(food: Pick<ConvertibleFood, 'servingGrams'>, grams: number): number | null {
  if (!Number.isFinite(grams) || grams <= 0) return null
  const sg = food.servingGrams
  return typeof sg === 'number' && sg > 0 ? round2(grams / sg) : null
}

/** يتحقّق من كمية الإدخال: بُعد واحد بالضبط، منتهٍ وموجب. لا افتراضات لكمية فارغة. */
function validateQuantityInput(input: EntryQuantity): { dim: 'grams' | 'servings'; value: number } | HistoryError {
  const hasGrams = input.grams !== undefined
  const hasServings = input.servings !== undefined
  if (!hasGrams && !hasServings) {
    return err('empty-quantity', 'أدخل كمية (جرامات أو حصص) — لا قيمة افتراضية.', 'Enter a quantity (grams or servings) — there is no default.')
  }
  if (hasGrams && hasServings) {
    return err('ambiguous-quantity', 'أدخل الجرامات أو الحصص — لا الاثنين معًا.', 'Enter grams or servings — not both.')
  }
  const dim: 'grams' | 'servings' = hasGrams ? 'grams' : 'servings'
  const value = hasGrams ? input.grams : input.servings
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return err('invalid-quantity', 'الكمية يجب أن تكون رقمًا أكبر من صفر.', 'Quantity must be a number greater than zero.')
  }
  return { dim, value }
}

export type QuantityResolution =
  | {
      status: 'ok'
      unit: 'g' | 'serving'
      quantity: EntryQuantity
      macros: EntryMacros
      /** null ⇒ عنصر حصص-فقط (بلا servingGrams) — لا تحويل جرامات. */
      gramsPerServing: number | null
    }
  | { status: 'rejected'; errors: HistoryError[] }

/**
 * يحسم كمية إدخال فوق عنصر غذائي (قيم العنصر لحصة واحدة، جراماتها servingGrams):
 *   • حصص ⇒ الماكروز = الحصص × قيم العنصر؛ الجرامات تُشتق إن وُجد servingGrams.
 *   • جرامات ⇒ تتطلّب servingGrams؛ عنصر بدونها يُرفض (serving-only — لا جرامات مُخترعة).
 *   • كسور الحصص (0.25/0.5/1.5/عشري) مقبولة كلها.
 */
export function resolveFoodQuantity(food: ConvertibleFood, input: EntryQuantity): QuantityResolution {
  const v = validateQuantityInput(input)
  if ('code' in v) return rejected(v)
  const sg = typeof food.servingGrams === 'number' && food.servingGrams > 0 ? food.servingGrams : null
  let servings: number
  let grams: number | null
  if (v.dim === 'grams') {
    if (sg === null) {
      return rejected(err('serving-only-item', 'هذا العنصر يُسجَّل بالحصص فقط — لا وزن جرامات معروفًا له.', 'This item logs by servings only — it has no known gram weight.'))
    }
    grams = round1(v.value)
    servings = round2(v.value / sg)
  } else {
    servings = round2(v.value)
    grams = sg === null ? null : round1(v.value * sg)
  }
  const ratio = v.dim === 'grams' && sg !== null ? v.value / sg : v.value
  return {
    status: 'ok',
    unit: v.dim === 'grams' ? 'g' : 'serving',
    quantity: { ...(grams !== null ? { grams } : {}), servings },
    macros: {
      calories: Math.round((food.calories || 0) * ratio),
      protein: round1((food.protein || 0) * ratio),
      carbs: round1((food.carbs ?? 0) * ratio),
      fat: round1((food.fat ?? 0) * ratio),
    },
    gramsPerServing: sg,
  }
}

/** عنصر المكتبة بمعرّفه (المكتبة الثابتة فقط — المنتجات الممسوحة خارجها). */
export function findFoodItem(foodId: string): FoodItem | undefined {
  return foodItems.find((f) => f.id === foodId)
}

// ── تحديد قيد بمعرّفه (الأحدث تاريخًا أولًا) ──────────────────────────────────

function locateEntry(id: string): { date: string; entry: NutritionEntry; entries: NutritionEntry[] } | null {
  const days = ownerDays(readLedger(), currentOwner())
  const dates = Object.keys(days).sort().reverse()
  for (const date of dates) {
    const entry = days[date].find((e) => e.id === id)
    if (entry) return { date, entry, entries: days[date] }
  }
  return null
}

const entryNotFound = (id: string): HistoryError =>
  err('entry-not-found', `القيد «${id}» غير موجود في الدفتر.`, `Entry "${id}" was not found in the ledger.`)

// ── معدّل الكمية: يعيد حساب الماكروز — اليوم عبر المتجر الحيّ، والماضي في الدفتر ──

/** إسقاط قيد على شكل صنف المتجر الحيّ (لتحديث اليوم عبر الكاتب الواحد). */
function loggedFoodFromEntry(entry: NutritionEntry): LoggedFood {
  return {
    id: entry.id,
    nameAr: entry.nameAr,
    ...(entry.nameEn ? { nameEn: entry.nameEn } : {}),
    calories: entry.macros.calories,
    protein: entry.macros.protein,
    ...(entry.macros.carbs !== undefined ? { carbs: entry.macros.carbs } : {}),
    ...(entry.macros.fat !== undefined ? { fat: entry.macros.fat } : {}),
    meal: entry.meal,
    ...(entry.foodId ? { foodId: entry.foodId } : {}),
    ...(entry.quantity.grams !== undefined ? { grams: entry.quantity.grams } : {}),
    ...(entry.quantity.servings !== undefined ? { servings: entry.quantity.servings } : {}),
    unit: entry.unit,
  }
}

/**
 * يعدّل كمية قيد ويعيد حساب ماكروزه:
 *   • قيد بمرجع مكتبة (foodId) ⇒ الحساب من بيانات العنصر (resolveFoodQuantity).
 *   • قيد بلا مرجع (يدوي/ممسوح) ⇒ قياس نسبي من كميته وماكروزه الحاليين — نفس البُعد
 *     فقط (جرامات→جرامات أو حصص→حصص)؛ قيد بلا كمية معروفة يُرفض (quantity-unknown).
 *   • قيد اليوم ⇒ التعديل يمرّ عبر المتجر الحيّ (updateFoodInDay) فيتزامن كل شيء؛
 *     قيد ماضٍ ⇒ الدفتر + المجاميع القانونية (saveNutritionLog).
 */
export function editEntry(id: string, patch: { quantity: EntryQuantity }): EntryResult {
  ensureNutritionHistoryInit()
  const located = locateEntry(id)
  if (!located) return rejected(entryNotFound(id))
  const { date, entry, entries } = located

  let unit: 'g' | 'serving'
  let quantity: EntryQuantity
  let macros: EntryMacros
  const libraryFood = entry.foodId ? findFoodItem(entry.foodId) : undefined
  if (libraryFood) {
    const resolved = resolveFoodQuantity(libraryFood, patch.quantity)
    if (resolved.status === 'rejected') return resolved
    unit = resolved.unit
    quantity = resolved.quantity
    macros = resolved.macros
  } else {
    const v = validateQuantityInput(patch.quantity)
    if ('code' in v) return rejected(v)
    const base = v.dim === 'grams' ? entry.quantity.grams : entry.quantity.servings
    if (base === undefined || base <= 0) {
      return rejected(
        err(
          'quantity-unknown',
          'لا كمية أساس معروفة لهذا القيد بهذا البُعد — لا يمكن إعادة الحساب بصدق.',
          'This entry has no known base quantity in that dimension — cannot honestly recompute.',
        ),
      )
    }
    const ratio = v.value / base
    unit = v.dim === 'grams' ? 'g' : 'serving'
    quantity = {
      ...(entry.quantity.grams !== undefined ? { grams: round1(entry.quantity.grams * ratio) } : {}),
      ...(entry.quantity.servings !== undefined ? { servings: round2(entry.quantity.servings * ratio) } : {}),
    }
    macros = {
      calories: Math.round(entry.macros.calories * ratio),
      protein: round1(entry.macros.protein * ratio),
      ...(entry.macros.carbs !== undefined ? { carbs: round1(entry.macros.carbs * ratio) } : {}),
      ...(entry.macros.fat !== undefined ? { fat: round1(entry.macros.fat * ratio) } : {}),
    }
  }

  const updated: NutritionEntry = { ...entry, quantity, unit, macros, updatedAt: new Date().toISOString() }

  if (date === getDayStamp()) {
    const live = loadNutritionDay()
    if (live.foods.some((f) => f.id === id)) {
      updateFoodInDay(loggedFoodFromEntry(updated)) // الكاتب الواحد يحدّث الدفتر والمجاميع معًا
      return { status: 'ok', entry: updated }
    }
  }
  persistPastDay(date, entries.map((e) => (e.id === id ? updated : e)))
  return { status: 'ok', entry: updated }
}

/**
 * يحذف قيدًا: قيد اليوم يمرّ عبر المتجر الحيّ (removeFoodFromDay — الكاتب الواحد
 * يحدّث الدفتر والمجاميع)؛ قيد ماضٍ يُحذف من الدفتر وتُحدَّث مجاميع يومه القانونية.
 */
export function removeEntry(id: string): { status: 'ok'; date: string } | { status: 'rejected'; errors: HistoryError[] } {
  ensureNutritionHistoryInit()
  const located = locateEntry(id)
  if (!located) return rejected(entryNotFound(id))
  const { date, entries } = located
  if (date === getDayStamp()) {
    const live = loadNutritionDay()
    if (live.foods.some((f) => f.id === id)) {
      removeFoodFromDay(id)
      return { status: 'ok', date }
    }
  }
  persistPastDay(date, entries.filter((e) => e.id !== id))
  return { status: 'ok', date }
}

// ── نسخ وجبة يوم سابق إلى اليوم ───────────────────────────────────────────────

let copySeq = 0
function freshEntryId(): string {
  copySeq += 1
  return `nh-${Date.now().toString(36)}-${copySeq}`
}

/**
 * ينسخ قيود وجبة (slot) من يومٍ إلى اليوم الحالي عبر addFoodToDay — معرّفات جديدة،
 * نفس الأصناف والكميات والماكروز. لا شيء في الوجبة ⇒ رفض nothing-to-copy.
 */
export function copyMealToToday(date: string, slot: MealSlot): { status: 'ok'; copied: number } | { status: 'rejected'; errors: HistoryError[] } {
  ensureNutritionHistoryInit()
  const source = getDayEntries(date).filter((e) => e.meal === slot)
  if (!source.length) {
    return rejected(err('nothing-to-copy', 'لا أصناف في هذه الوجبة لنسخها.', 'There are no items in that meal to copy.'))
  }
  for (const entry of source) {
    addFoodToDay({ ...loggedFoodFromEntry(entry), id: freshEntryId(), meal: slot })
  }
  return { status: 'ok', copied: source.length }
}

// ── طعام يدوي + الأطعمة الشخصية ───────────────────────────────────────────────

export interface ManualFoodInput {
  nameAr: string
  nameEn?: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  meal?: MealSlot
}

/**
 * طعام شخصي محفوظ — «أكلاتي». [FOOD-UX-001]
 *
 * أساسه **حصة واحدة** كما أدخلها المستخدم: القيم مطلقة لتلك الحصة، وإعادة التسجيل
 * تُقاس عليها بمضاعف (١ · ١٫٥ · ٢). `grams` اختيارية: من كتبها يحصل على تحويل
 * الغرامات، ومن لم يكتبها يبقى على الحصص — لا نخترع وزنًا لوجبة لا نعرف وزنها.
 * `carbs`/`fat` اختياريتان بنفس منطق [PARTIAL-NUTRITION-001]: الفارغ غير معروف لا صفر.
 */
export interface PersonalFood {
  id: string
  nameAr: string
  nameEn?: string
  grams?: number
  calories: number
  protein: number
  carbs?: number
  fat?: number
  createdAt: string
  updatedAt?: string
  lastUsedAt?: string
  useCount?: number
}

type PersonalFoodsRecord = Record<string, PersonalFood[]>

function readPersonalFoods(): PersonalFoodsRecord {
  const s = ls()
  if (!s) return {}
  try {
    const raw = s.getItem(PERSONAL_FOODS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as PersonalFoodsRecord) : {}
  } catch {
    return {}
  }
}

/**
 * الكاتب الواحد للأطعمة الشخصية — عبر `safeStorage` بنتيجة مسمّاة (الميثاق §5):
 * فشل الكتابة يعود للمستدعي ولا يُبتلع، فلا شاشة نجاح على حفظ لم يحدث.
 */
function writePersonalFoods(reg: PersonalFoodsRecord): WriteResult {
  return writeJson(PERSONAL_FOODS_KEY, reg)
}

function normalizePersonalFood(raw: unknown): PersonalFood | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<PersonalFood>
  if (typeof f.id !== 'string' || !f.id) return null
  if (typeof f.nameAr !== 'string' || !f.nameAr.trim()) return null
  const optNum = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined)
  const grams = optNum(f.grams)
  const calories = optNum(f.calories)
  const protein = optNum(f.protein)
  // سجلّ بلا سعرات ولا بروتين لا يحمل معلومة — يُسقَط لا يُصفَّر.
  if (calories === undefined && protein === undefined) return null
  const carbs = optNum(f.carbs)
  const fat = optNum(f.fat)
  return {
    id: f.id,
    nameAr: f.nameAr,
    ...(typeof f.nameEn === 'string' && f.nameEn.trim() ? { nameEn: f.nameEn } : {}),
    ...(grams !== undefined && grams > 0 ? { grams } : {}),
    calories: calories ?? 0,
    protein: protein ?? 0,
    ...(carbs !== undefined ? { carbs } : {}),
    ...(fat !== undefined ? { fat } : {}),
    createdAt: typeof f.createdAt === 'string' ? f.createdAt : '',
    ...(typeof f.updatedAt === 'string' ? { updatedAt: f.updatedAt } : {}),
    ...(typeof f.lastUsedAt === 'string' ? { lastUsedAt: f.lastUsedAt } : {}),
    ...(typeof f.useCount === 'number' && Number.isFinite(f.useCount) && f.useCount > 0 ? { useCount: Math.floor(f.useCount) } : {}),
  }
}

/** أطعمة مالكٍ الشخصية (مطبَّعة). المعرّف الصريح لسجلّ النقل؛ بلا وسيط = المالك الحالي. */
export function listPersonalFoods(userId?: string | null): PersonalFood[] {
  const owner = userId === undefined ? currentOwner() : ownerKey(userId)
  const list = readPersonalFoods()[owner]
  if (!Array.isArray(list)) return []
  return list.map(normalizePersonalFood).filter((f): f is PersonalFood => f !== null)
}

/** الأحدث استعمالًا أولًا، ثم الأحدث إنشاءً — ما يعود إليه المستخدم يظهر فوق. */
export function listPersonalFoodsByRecency(userId?: string | null): PersonalFood[] {
  const stamp = (f: PersonalFood) => f.lastUsedAt ?? f.updatedAt ?? f.createdAt
  return [...listPersonalFoods(userId)].sort((a, b) => (stamp(b) > stamp(a) ? 1 : stamp(b) < stamp(a) ? -1 : 0))
}

/** يحذف طعامًا شخصيًا للمالك الحالي. true إن وُجد **وكُتب الحذف فعلًا**. */
export function deletePersonalFood(id: string): boolean {
  const reg = readPersonalFoods()
  const owner = currentOwner()
  const list = listPersonalFoods()
  const next = list.filter((f) => f.id !== id)
  if (next.length === list.length) return false
  if (next.length) reg[owner] = next
  else delete reg[owner]
  return writePersonalFoods(reg) === 'ok'
}

function nextPersonalFoodId(existing: PersonalFood[]): string {
  const maxN = existing.reduce((m, f) => {
    const match = /^pf-(\d+)$/.exec(f.id)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return `pf-${maxN + 1}`
}

/** مفتاح مطابقة الاسم: طيّ عربي + أرقام — «كبسة الدجاج» ≡ «كبسه الدجاج». */
export function personalFoodNameKey(name: string): string {
  return foldArabic(foldArabicDigits(name))
}

export interface PersonalFoodInput {
  nameAr: string
  nameEn?: string
  /** وزن الحصة إن عُرف — اختياري. */
  grams?: number
  calories: number
  protein: number
  carbs?: number
  fat?: number
}

export type PersonalFoodSaveResult =
  | { status: 'ok'; food: PersonalFood; replaced: boolean }
  | { status: 'rejected'; errors: HistoryError[] }
  | { status: 'storage'; result: WriteResult }

/**
 * يحفظ طعامًا شخصيًا (إنشاء أو تعديل بمعرّف). قواعد الصدق:
 *   • الاسم إلزامي؛ سعرات أو بروتين > ٠؛ كل رقم منتهٍ وغير سالب؛ الفارغ يبقى غائبًا.
 *   • اسم موجود (بعد الطيّ) بلا معرّف ⇒ **يحدَّث الموجود** لا يُكرَّر — «وجبة الدجاج»
 *     الواحدة تبقى واحدة ولو حُفظت من جديد كل يوم.
 *   • السقف MAX_PERSONAL_FOODS يُرفض بخطأ مسمّى لا بإسقاط صامت للأقدم.
 *   • الكتابة عبر safeStorage: الفشل يعود `storage` لا `ok`.
 */
export function savePersonalFood(input: PersonalFoodInput, id?: string): PersonalFoodSaveResult {
  ensureNutritionHistoryInit()
  const nameAr = typeof input.nameAr === 'string' ? input.nameAr.trim() : ''
  const errors: HistoryError[] = []
  if (!nameAr) errors.push(err('invalid-manual-food', 'اسم الطعام لا يمكن أن يكون فارغًا.', 'Food name cannot be empty.'))
  const finiteOrAbsent = (v: unknown): boolean => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
  for (const [label, value] of [['السعرات', input.calories], ['البروتين', input.protein]] as const) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors.push(err('invalid-manual-food', `${label} يجب أن تكون رقمًا ≥ صفر.`, 'Calories and protein must be numbers ≥ zero.'))
    }
  }
  if (!finiteOrAbsent(input.carbs) || !finiteOrAbsent(input.fat)) {
    errors.push(err('invalid-manual-food', 'الكارب والدهون إمّا رقم ≥ صفر أو تُترك فارغة.', 'Carbs and fat must be numbers ≥ zero or left empty.'))
  }
  if (input.grams !== undefined && (typeof input.grams !== 'number' || !Number.isFinite(input.grams) || input.grams <= 0)) {
    errors.push(err('invalid-manual-food', 'الجرامات يجب أن تكون رقمًا أكبر من صفر.', 'Grams must be a number greater than zero.'))
  }
  if (!errors.length && !(input.calories > 0 || input.protein > 0)) {
    errors.push(err('invalid-manual-food', 'اكتب سعرات أو بروتين أكبر من صفر.', 'Enter calories or protein greater than zero.'))
  }
  if (errors.length) return { status: 'rejected', errors }

  const existing = listPersonalFoods()
  const key = personalFoodNameKey(nameAr)
  const target = id ? existing.find((f) => f.id === id) : existing.find((f) => personalFoodNameKey(f.nameAr) === key)
  if (id && !target) return { status: 'rejected', errors: [err('invalid-manual-food', 'الطعام المطلوب تعديله غير موجود.', 'The food you are editing no longer exists.')] }
  if (!target && existing.length >= MAX_PERSONAL_FOODS) {
    return { status: 'rejected', errors: [err('invalid-manual-food', `وصلت الحدّ (${MAX_PERSONAL_FOODS}) — احذف أكلة قديمة أوّلًا.`, `You reached the limit (${MAX_PERSONAL_FOODS}) — delete an old food first.`)] }
  }
  // عند التعديل بمعرّف: منع اصطدام الاسم مع أكلة أخرى — اسمان لأكلتين لا أكلتان باسم.
  if (target && id && existing.some((f) => f.id !== id && personalFoodNameKey(f.nameAr) === key)) {
    return { status: 'rejected', errors: [err('invalid-manual-food', 'فيه أكلة ثانية بنفس الاسم.', 'Another saved food already has this name.')] }
  }
  const now = new Date().toISOString()
  const food: PersonalFood = {
    id: target?.id ?? nextPersonalFoodId(existing),
    nameAr,
    ...(input.nameEn?.trim() ? { nameEn: input.nameEn.trim() } : {}),
    ...(input.grams !== undefined ? { grams: round1(input.grams) } : {}),
    calories: round1(input.calories),
    protein: round1(input.protein),
    ...(input.carbs !== undefined ? { carbs: round1(input.carbs) } : {}),
    ...(input.fat !== undefined ? { fat: round1(input.fat) } : {}),
    createdAt: target?.createdAt || now,
    ...(target ? { updatedAt: now } : {}),
    ...(target?.lastUsedAt ? { lastUsedAt: target.lastUsedAt } : {}),
    ...(target?.useCount ? { useCount: target.useCount } : {}),
  }
  const reg = readPersonalFoods()
  reg[currentOwner()] = target ? existing.map((f) => (f.id === food.id ? food : f)) : [...existing, food]
  const result = writePersonalFoods(reg)
  if (result !== 'ok') return { status: 'storage', result }
  return { status: 'ok', food, replaced: !!target }
}

/** يختم آخر استعمال (لترتيب «أكلاتي»). أفضل جهد: فشل الختم لا يُفشل التسجيل. */
export function markPersonalFoodUsed(id: string): void {
  const existing = listPersonalFoods()
  if (!existing.some((f) => f.id === id)) return
  const now = new Date().toISOString()
  const reg = readPersonalFoods()
  reg[currentOwner()] = existing.map((f) => (f.id === id ? { ...f, lastUsedAt: now, useCount: (f.useCount ?? 0) + 1 } : f))
  writePersonalFoods(reg)
}

/**
 * بحث «أكلاتي» بالاستعلام نفسه الذي يكتبه المستخدم في مربّع البحث — كل كلمة من
 * الاستعلام (بعد الطيّ) يجب أن تظهر في الاسم. ترتيب: الأحدث استعمالًا.
 */
export function searchPersonalFoods(query: string, userId?: string | null): PersonalFood[] {
  const q = personalFoodNameKey(query)
  if (!q) return []
  const words = q.split(' ').filter(Boolean)
  return listPersonalFoodsByRecency(userId).filter((f) => {
    const hay = `${personalFoodNameKey(f.nameAr)} ${f.nameEn ? personalFoodNameKey(f.nameEn) : ''}`
    return words.every((w) => hay.includes(w))
  })
}

/** حصة مضاعَفة من طعام شخصي — نقطة تحويل واحدة؛ الواجهة لا تضرب أرقامًا بنفسها. */
export function personalFoodPortion(food: PersonalFood, servings: number): { servings: number; calories: number; protein: number; carbs?: number; fat?: number; grams?: number } {
  const k = Number.isFinite(servings) && servings > 0 ? servings : 1
  return {
    servings: round2(k),
    calories: round1(food.calories * k),
    protein: round1(food.protein * k),
    ...(typeof food.carbs === 'number' ? { carbs: round1(food.carbs * k) } : {}),
    ...(typeof food.fat === 'number' ? { fat: round1(food.fat * k) } : {}),
    ...(typeof food.grams === 'number' ? { grams: round1(food.grams * k) } : {}),
  }
}

export type ManualFoodResult =
  | { status: 'ok'; food: LoggedFood; personal?: PersonalFood }
  | { status: 'rejected'; errors: HistoryError[] }

/**
 * يسجّل طعامًا يدويًا لليوم (اسم + جرامات + ماكروز مطلقة للكمية المدخلة) عبر
 * addFoodToDay، **ويحفظه افتراضيًا** في الأطعمة الشخصية لإعادة استخدامه
 * (عقد P7: يدوي = تسجيل + متجر شخصي؛ saveToPersonal:false يعطّل الحفظ لمرة واحدة).
 * لا افتراضات: اسم فارغ/جرامات ≤ 0/ماكروز سالبة أو غير منتهية ⇒ رفض.
 */
export function createManualFood(input: ManualFoodInput, options: { saveToPersonal?: boolean } = {}): ManualFoodResult {
  ensureNutritionHistoryInit()
  const nameAr = typeof input.nameAr === 'string' ? input.nameAr.trim() : ''
  const errors: HistoryError[] = []
  if (!nameAr) errors.push(err('invalid-manual-food', 'اسم الطعام لا يمكن أن يكون فارغًا.', 'Food name cannot be empty.'))
  if (typeof input.grams !== 'number' || !Number.isFinite(input.grams) || input.grams <= 0) {
    errors.push(err('invalid-manual-food', 'الجرامات يجب أن تكون رقمًا أكبر من صفر.', 'Grams must be a number greater than zero.'))
  }
  for (const [label, value] of [['السعرات', input.calories], ['البروتين', input.protein], ['الكارب', input.carbs], ['الدهون', input.fat]] as const) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors.push(err('invalid-manual-food', `${label} يجب أن تكون رقمًا ≥ صفر.`, 'Macros must be numbers ≥ zero.'))
    }
  }
  if (errors.length) return { status: 'rejected', errors }

  const food: LoggedFood = {
    id: freshEntryId(),
    nameAr,
    ...(input.nameEn?.trim() ? { nameEn: input.nameEn.trim() } : {}),
    calories: Math.round(input.calories),
    protein: round1(input.protein),
    carbs: round1(input.carbs),
    fat: round1(input.fat),
    meal: input.meal ?? 'snack',
    grams: round1(input.grams),
    unit: 'g',
  }
  addFoodToDay(food)

  let personal: PersonalFood | undefined
  if (options.saveToPersonal !== false) {
    const saved = savePersonalFood({ nameAr, nameEn: input.nameEn, grams: input.grams, calories: input.calories, protein: input.protein, carbs: input.carbs, fat: input.fat })
    if (saved.status === 'ok') personal = saved.food
  }
  return { status: 'ok', food, ...(personal ? { personal } : {}) }
}

// ── إحصاءات أسبوعية صادقة: قيود فعلية، والأيام الأقدم مجاميع موسومة تقديرية ────

export interface DayNutritionStat {
  date: string
  totals: { calories: number; protein: number; carbs: number; fat: number }
  entryCount: number
  /** entries = تفصيل فعلي · totals = مجاميع قديمة فقط · none = لا بيانات. */
  source: 'entries' | 'totals' | 'none'
  /** true ⇒ يوم ما قبل الدفتر: مجاميع بلا تفصيل (لا نخترع أصنافًا له). */
  estimated: boolean
}

/** إحصاء ٧ أيام تنتهي بـ endDate (الافتراضي اليوم) — الأقدم أولًا. */
export function getWeeklyNutritionStats(endDate?: string): DayNutritionStat[] {
  ensureNutritionHistoryInit()
  const end = endDate ?? getDayStamp()
  const days = ownerDays(readLedger(), currentOwner())
  const stats: DayNutritionStat[] = []
  for (let i = 6; i >= 0; i--) {
    const date = stampAddDays(end, -i)
    const entries = days[date] ?? []
    if (entries.length) {
      stats.push({ date, totals: totalsFromEntries(entries), entryCount: entries.length, source: 'entries', estimated: false })
      continue
    }
    const legacy = getNutritionLog(date)?.loggedFood
    if (legacy) {
      stats.push({
        date,
        totals: {
          calories: Math.round(legacy.calories || 0),
          protein: Math.round(legacy.protein || 0),
          carbs: Math.round(legacy.carbs || 0),
          fat: Math.round(legacy.fat || 0),
        },
        entryCount: 0,
        source: 'totals',
        estimated: true,
      })
      continue
    }
    stats.push({ date, totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, entryCount: 0, source: 'none', estimated: false })
  }
  return stats
}
