// جالب Open Food Facts لقاعدة بيانات المنتجات (P8 A2) — مجاني بلا مفتاح، ترخيص ODbL
// (استخدام تجاري مسموح مع نسب المصدر). يستهلك واجهة Agent 1 (`./index`) فقط عبر خطاف
// التسجيل `registerOpenFoodFactsFetcher` دون تعديل store.ts/resolve.ts/types.ts.
// يغطي حالتين: منتج مفرد بالباركود (يُسجَّل كجالب في resolveBarcode)، ودفعة بحث السوق
// السعودي (facet) تُستهلك من saudiSeed.ts لتغذية قاعدة محلية تعمل بلا اتصال لاحقًا.

import { registerOpenFoodFactsFetcher, type ProductPer, type RemoteFetcher, type RemoteProductResult } from './index'

const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const SEARCH_BASE = 'https://world.openfoodfacts.org/api/v2/search'
const FIELDS = 'product_name,brands,image_url,nutriments,serving_size'
const USER_AGENT = 'Qimmah/1.0'

/** نسب المصدر — نفس نص `nutritionScreenStrings.scanAttribution` المستخدم في لوحة المسح الحالية. */
export const OFF_ATTRIBUTION_AR = 'بيانات المنتج من Open Food Facts (ODbL)'
export const OFF_ATTRIBUTION_EN = 'Product data from Open Food Facts (ODbL)'
export const OFF_HOME_URL = 'https://world.openfoodfacts.org'

export function offProductUrl(barcode: string): string {
  return `${OFF_HOME_URL}/product/${barcode}`
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

interface Macros {
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/**
 * يفضّل قيم لكل 100غ (`per: '100g'`)؛ وإن غابت (صفر) يستخدم قيم الحصة (`_serving`) بديلًا
 * موسومًا `per: 'serving'` — لا يخلط الأساسين أبدًا في نفس النتيجة. null إن غاب كلاهما.
 */
function parseMacros(nutriments: Record<string, unknown>, servingSize?: string): Macros | null {
  const kcal100 = num(nutriments['energy-kcal_100g'])
  if (kcal100 > 0) {
    return {
      per: '100g',
      servingSize,
      kcal: kcal100,
      protein: num(nutriments['proteins_100g']),
      carbs: num(nutriments['carbohydrates_100g']),
      fat: num(nutriments['fat_100g']),
    }
  }
  const kcalServing = num(nutriments['energy-kcal_serving'])
  if (kcalServing > 0) {
    return {
      per: 'serving',
      servingSize,
      kcal: kcalServing,
      protein: num(nutriments['proteins_serving']),
      carbs: num(nutriments['carbohydrates_serving']),
      fat: num(nutriments['fat_serving']),
    }
  }
  return null
}

/** يبني نتيجة بعيدة (بلا باركود/مصدر — يضيفهما المستدعي) من سجل OFF خام. null إن كانت البيانات غير قابلة للاستخدام. */
export function mapOffRecordToRemoteResult(record: Record<string, unknown>): RemoteProductResult | null {
  const name = str(record.product_name)
  if (!name) return null
  const macros = parseMacros((record.nutriments ?? {}) as Record<string, unknown>, str(record.serving_size))
  if (!macros) return null
  return {
    name,
    brand: str(record.brands),
    imageUrl: str(record.image_url),
    per: macros.per,
    servingSize: macros.servingSize,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
  }
}

/** جالب OFF لمنتج مفرد — يطابق توقيع `RemoteFetcher` في resolve.ts. */
export const fetchFromOFF: RemoteFetcher = async (barcode: string): Promise<RemoteProductResult | null> => {
  try {
    const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { status?: number; product?: Record<string, unknown> }
    if (data.status !== 1 || !data.product) return null
    const mapped = mapOffRecordToRemoteResult(data.product)
    return mapped ? { ...mapped, sourceUrl: offProductUrl(barcode) } : null
  } catch {
    return null
  }
}

/** يسجّل OFF كجالب باركود لدى resolveBarcode (Agent 1) — يُستدعى مرّة واحدة عند تحميل الوحدة. */
export function registerOffFetcher() {
  registerOpenFoodFactsFetcher(fetchFromOFF)
}

registerOffFetcher()

export interface SaudiSeedItem {
  barcode: string
  result: RemoteProductResult
}

interface OffSearchResponse {
  products?: Array<Record<string, unknown> & { code?: string }>
}

/**
 * يجلب صفحة من منتجات السوق السعودي (facet: countries_tags_en=saudi-arabia) لتغذية
 * seed محلي. يرجّع مصفوفة فارغة فقط عند نهاية النتائج الحقيقية (استجابة ناجحة بلا منتجات)؛
 * فشل الشبكة أو HTTP يُرمى كاستثناء عمدًا كي يميّز saudiSeed.ts بين «انتهت الصفحات»
 * و«تعذّر الاتصال» فلا يُعلَّم seed كمكتمل خطأً عند انقطاع الشبكة.
 */
export async function fetchSaudiOffPage(page: number, pageSize = 100): Promise<SaudiSeedItem[]> {
  const url = `${SEARCH_BASE}?countries_tags_en=saudi-arabia&fields=code,${FIELDS}&page_size=${pageSize}&page=${page}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`OFF search HTTP ${res.status}`)
  const data = (await res.json()) as OffSearchResponse
  const products = Array.isArray(data.products) ? data.products : []
  const items: SaudiSeedItem[] = []
  for (const p of products) {
    if (!p.code) continue
    const mapped = mapOffRecordToRemoteResult(p)
    if (!mapped) continue
    items.push({ barcode: p.code, result: { ...mapped, sourceUrl: offProductUrl(p.code) } })
  }
  return items
}
