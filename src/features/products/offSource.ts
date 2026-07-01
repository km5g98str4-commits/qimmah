// جالب Open Food Facts لقاعدة بيانات المنتجات (P8 A2) — مجاني بلا مفتاح، ترخيص ODbL
// (استخدام تجاري مسموح مع نسب المصدر). يغطي حالتين: منتج مفرد بالباركود، ودفعة بحث
// السوق السعودي (facet) لتغذية seed محلي يعمل بلا اتصال لاحقًا.

import { registerBarcodeFetcher, upsert, type StoredProduct } from './productDb'

const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const SEARCH_BASE = 'https://world.openfoodfacts.org/api/v2/search'
const FIELDS = 'product_name,brands,image_url,nutriments,serving_size'
const USER_AGENT = 'Qimmah/1.0'

/** نسب المصدر — نفس نص `nutritionScreenStrings.scanAttribution` المستخدم في لوحة المسح. */
export const OFF_ATTRIBUTION_AR = 'بيانات المنتج من Open Food Facts (ODbL)'
export const OFF_ATTRIBUTION_EN = 'Product data from Open Food Facts (ODbL)'
export const OFF_HOME_URL = 'https://world.openfoodfacts.org'

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/**
 * يبني منتجًا داخليًا من سجل OFF خام (نفس الشكل سواء من /product أو /search).
 * يفضّل قيم لكل 100غ؛ وإن غابت يستخدم قيم الحصة (_serving) كبديل موثَّق.
 */
export function mapOffRecordToProduct(
  code: string,
  record: Record<string, unknown>,
  fetchedAt: number,
): StoredProduct | null {
  const name = str(record.product_name)
  if (!name || !code) return null

  const nutriments = (record.nutriments ?? {}) as Record<string, unknown>
  const caloriesPer100g = num(nutriments['energy-kcal_100g']) || num(nutriments['energy-kcal_serving'])
  const proteinPer100g = num(nutriments['proteins_100g']) || num(nutriments['proteins_serving'])
  const carbsPer100g = num(nutriments['carbohydrates_100g']) || num(nutriments['carbohydrates_serving'])
  const fatPer100g = num(nutriments['fat_100g']) || num(nutriments['fat_serving'])

  // منتج بلا سعرات لا يفيد حساب التغذية — نعامله كغير قابل للاستيراد.
  if (caloriesPer100g <= 0) return null

  return {
    barcode: code,
    name,
    brands: str(record.brands),
    imageUrl: str(record.image_url),
    servingSize: str(record.serving_size),
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    sourceName: 'open_food_facts',
    sourceUrl: `${OFF_HOME_URL}/product/${code}`,
    status: 'imported',
    updatedAt: fetchedAt,
  }
}

/** يجلب منتجًا واحدًا من OFF بالباركود. يرجّع null عند status:0 أو فشل الشبكة أو بيانات ناقصة. */
export async function fetchFromOFF(barcode: string, fetchedAt = Date.now()): Promise<StoredProduct | null> {
  try {
    const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { status?: number; product?: Record<string, unknown> }
    if (data.status !== 1 || !data.product) return null
    return mapOffRecordToProduct(barcode, data.product, fetchedAt)
  } catch {
    return null
  }
}

interface OffSearchResponse {
  products?: Array<Record<string, unknown> & { code?: string }>
  count?: number
}

/**
 * يجلب صفحة من منتجات السوق السعودي (facet: countries_tags_en=saudi-arabia) لتغذية
 * seed محلي. يرجّع مصفوفة فارغة فقط عند نهاية النتائج الحقيقية (استجابة ناجحة بلا منتجات)؛
 * فشل الشبكة أو HTTP يُرمى كاستثناء عمدًا كي يميّز seedSaudiProducts بين «انتهت الصفحات»
 * و«تعذّر الاتصال» فلا يُعلَّم seed كمكتمل خطأً عند انقطاع الشبكة.
 */
export async function fetchSaudiOffPage(page: number, pageSize = 100, fetchedAt = Date.now()): Promise<StoredProduct[]> {
  const url = `${SEARCH_BASE}?countries_tags_en=saudi-arabia&fields=code,${FIELDS}&page_size=${pageSize}&page=${page}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`OFF search HTTP ${res.status}`)
  const data = (await res.json()) as OffSearchResponse
  const products = Array.isArray(data.products) ? data.products : []
  return products
    .map((p) => (p.code ? mapOffRecordToProduct(p.code, p, fetchedAt) : null))
    .filter((p): p is StoredProduct => p !== null)
}

/** يسجّل OFF كجالب باركود لدى resolveBarcode — يُستدعى مرة واحدة عند تحميل الوحدة. */
export function registerOffFetcher() {
  registerBarcodeFetcher('open_food_facts', (barcode) => fetchFromOFF(barcode))
}

registerOffFetcher()

/** يستورد منتجًا مفردًا مباشرة إلى القاعدة المحلية (بدل الاعتماد على resolveBarcode). */
export async function importFromOFF(barcode: string): Promise<StoredProduct | null> {
  const product = await fetchFromOFF(barcode)
  return product ? upsert(product) : null
}
