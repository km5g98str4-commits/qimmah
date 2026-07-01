// بحث الباركود عبر Open Food Facts (مجاني بلا مفتاح، ترخيص ODbL — استخدام تجاري مسموح مع نسب المصدر).
// النتائج تُخزَّن مؤقتًا في localStorage لأن بيانات المنتجات تتغيّر ببطء.

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS = 'product_name,brands,nutriments,serving_size'
const CACHE_KEY = 'qimmah:off:cache:v1'

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

function readCache(): Cache {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : {}
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
 * يبحث عن منتج بالباركود عبر Open Food Facts، مع تخزين مؤقت محلي.
 * يرجّع null إن لم يُعثر على المنتج أو كانت بياناته الغذائية ناقصة (بدون سعرات).
 */
export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const cache = readCache()
  const cached = cache[barcode]
  if (cached) return cached.product

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': 'Qimmah/1.0 (+gym-os-template)' },
    })
    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    const found = data.status === 1
    const product = found ? parseProduct(barcode, data) : null
    // منتج بلا سعرات لا يفيد المستخدم — نعامله كغير موجود لكن نخزّنه حتى لا نعيد الطلب.
    const usable = product && product.caloriesPer100g > 0 ? product : null
    cache[barcode] = { fetchedAt: Date.now(), product: usable }
    writeCache(cache)
    return usable
  } catch {
    // فشل الشبكة لا يُخزَّن — قد ينجح لاحقًا.
    return null
  }
}
