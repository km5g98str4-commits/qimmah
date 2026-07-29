// بحث الباركود عبر Open Food Facts (مجاني بلا مفتاح، ترخيص ODbL — استخدام تجاري مسموح مع نسب المصدر).
// النتائج تُخزَّن مؤقتًا في localStorage بصلاحية محدودة (TTL): النجاح 7 أيام، و«غير موجود» 24 ساعة
// فقط — فمنتج يُضاف إلى OFF لاحقًا يُكتشف خلال يوم، ولا يُخزَّن أي فشل للأبد.
// خصوصية: الطلب يحمل رقم الباركود فقط — لا إطارات كاميرا ولا أي بيانات مستخدم (test:barcode يفرضها).

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS = 'product_name,brands,nutriments,serving_size'
const CACHE_KEY = 'qimmah:off:cache:v1'

/** مفتاح التخزين المؤقت — مُصدَّر للاختبارات وعقد Codex فقط، لا تكتب فيه مباشرة. */
export const OFF_CACHE_KEY = CACHE_KEY
/** صلاحية نتيجة ناجحة — بيانات المنتجات تتغيّر ببطء. */
export const OFF_TTL_FOUND_MS = 7 * 24 * 60 * 60 * 1000
/** صلاحية «غير موجود» — أقصر عمدًا كي يُكتشف منتج أُضيف حديثًا إلى القاعدة. */
export const OFF_TTL_NOT_FOUND_MS = 24 * 60 * 60 * 1000

export interface OffProduct {
  barcode: string
  name: string
  brands?: string
  servingSize?: string
  /** سعرات لكل 100غ — الأساس لحساب أي كمية عبر عامل الغرامات. */
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

interface CacheEntry {
  fetchedAt: number
  product: OffProduct | null
}

type Cache = Record<string, CacheEntry>

/** حقن للاختبارات: بديل fetch وساعة زمن — الافتراضي الشبكة الحقيقية وDate.now. */
export interface OffLookupDeps {
  fetchImpl?: typeof fetch
  now?: () => number
}

/**
 * هل السجل ما يزال صالحًا؟ هجرة آمنة للسجلات القديمة: سجل بلا fetchedAt رقمي
 * (نسخ أقدم/تلف) يُعامل كمنتهي الصلاحية فيُعاد جلبه — لا حذف ولا انهيار.
 * طابع زمني مستقبلي (خلل ساعة) لا يُوثق به أيضًا.
 */
function entryIsFresh(entry: CacheEntry, nowMs: number): boolean {
  if (typeof entry.fetchedAt !== 'number' || !Number.isFinite(entry.fetchedAt)) return false
  const age = nowMs - entry.fetchedAt
  if (age < 0) return false
  return age < (entry.product ? OFF_TTL_FOUND_MS : OFF_TTL_NOT_FOUND_MS)
}

/**
 * نتيجة البحث المميَّزة — تفصل «المنتج غير موجود في القاعدة» عن «تعذّر الاتصال بالقاعدة»
 * كي تعرض الواجهة رسالة صادقة لكل حالة بدل خلطهما.
 */
export type LookupResult =
  | { status: 'found'; product: OffProduct }
  | { status: 'not-found' }
  | { status: 'network-error' }

function readCache(): Cache {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // هجرة دفاعية: نُبقي فقط السجلات التي تحمل شكل CacheEntry — أي قيمة تالفة تُسقَط بصمت
    // (ستُعاد عبر جلب جديد)، ولا يُرمى استثناء أبدًا بسبب تخزين قديم.
    const cache: Cache = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === 'object' && 'product' in value) {
        cache[key] = value as CacheEntry
      }
    }
    return cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* تجاهل — التخزين قد يكون ممتلئًا، ليس حرجًا */
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** يحوّل استجابة OFF الخام إلى منتج مبسّط بقيم لكل 100غ. */
function parseProduct(barcode: string, data: Record<string, unknown>): OffProduct | null {
  const product = data.product as Record<string, unknown> | undefined
  if (!product) return null
  const name = typeof product.product_name === 'string' ? product.product_name.trim() : ''
  if (!name) return null
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>
  return {
    barcode,
    name,
    brands: typeof product.brands === 'string' ? product.brands : undefined,
    servingSize: typeof product.serving_size === 'string' ? product.serving_size : undefined,
    caloriesPer100g: num(nutriments['energy-kcal_100g']),
    proteinPer100g: num(nutriments['proteins_100g']),
    carbsPer100g: num(nutriments['carbohydrates_100g']),
    fatPer100g: num(nutriments['fat_100g']),
  }
}

/**
 * يبحث عن منتج بالباركود عبر Open Food Facts، مع تخزين مؤقت محلي محدود الصلاحية
 * (7 أيام للنجاح / 24 ساعة لغير الموجود). «غير موجود» يشمل المنتج بلا بيانات غذائية
 * قابلة للاستخدام (بدون سعرات). لا يُرسَل للشبكة سوى رقم الباركود.
 */
export async function lookupBarcode(barcode: string, deps: OffLookupDeps = {}): Promise<LookupResult> {
  const now = deps.now ?? Date.now
  const fetchImpl = deps.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))
  const cache = readCache()
  const cached = cache[barcode]
  if (cached && entryIsFresh(cached, now())) {
    return cached.product ? { status: 'found', product: cached.product } : { status: 'not-found' }
  }

  try {
    const res = await fetchImpl(`${API_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': 'Qimmah/1.0 (+gym-os-template)' },
    })
    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    const found = data.status === 1
    const product = found ? parseProduct(barcode, data) : null
    // منتج بلا سعرات لا يفيد المستخدم — نعامله كغير موجود لكن نخزّنه (بصلاحية 24 ساعة) حتى لا نعيد الطلب.
    const usable = product && product.caloriesPer100g > 0 ? product : null
    cache[barcode] = { fetchedAt: now(), product: usable }
    writeCache(cache)
    return usable ? { status: 'found', product: usable } : { status: 'not-found' }
  } catch {
    // فشل الشبكة لا يُخزَّن أبدًا (قد ينجح لاحقًا). إن كان لدينا منتج قديم منتهي الصلاحية،
    // نعيده بصدق — بيانات OFF حقيقية وإن تجاوزت نافذة التحديث، أفضل من لا شيء دون اتصال.
    if (cached?.product) return { status: 'found', product: cached.product }
    return { status: 'network-error' }
  }
}
