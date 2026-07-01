// حلّ الباركود الموحّد — ترتيب المصادر: الداخلي أولًا، ثم Open Food Facts، ثم مصدر مرخّص،
// وأخيرًا null (توجّه الواجهة لمسار OCR/الإضافة اليدوية). كل نتيجة بعيدة تُخزَّن داخليًا.

import { getProduct, upsertProduct } from './store'
import type { ProductPer, ProductSource, StoredProduct } from './types'

/** نتيجة خام من مصدر بعيد — بلا باركود (معروف مسبقًا من الطلب) وبلا حقول تخزين داخلية. */
export interface RemoteProductResult {
  name: string
  brand?: string
  imageUrl?: string
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  sourceUrl?: string
  permissionRef?: string
}

/** توقيع أي جالب بعيد يُستدعى بباركود ويُرجع نتيجة أو null. */
export type RemoteFetcher = (barcode: string) => Promise<RemoteProductResult | null>

/** أين وُجد المنتج أخيرًا. */
export type FoundIn = 'internal' | 'open_food_facts' | 'authorized' | 'not_found'

export interface ResolveResult {
  product: StoredProduct | null
  foundIn: FoundIn
}

// جالبات لا تفعل شيئًا افتراضيًا — تُستبدَل عبر registerXFetcher() من الميزة التي تملك
// التكامل الفعلي (مثلًا Open Food Facts) دون أن تحتاج هذه الوحدة لاستيرادها مباشرة.
let openFoodFactsFetcher: RemoteFetcher = async () => null
let authorizedSourceFetcher: RemoteFetcher = async () => null

/** يسجّل الجالب الحقيقي لـ Open Food Facts (أو أي بديل متوافق مع نفس التوقيع). */
export function registerOpenFoodFactsFetcher(fetcher: RemoteFetcher): void {
  openFoodFactsFetcher = fetcher
}

/** يسجّل جالب مصدر مرخّص (بيانات من طرف ثالث بإذن مكتوب). */
export function registerAuthorizedSourceFetcher(fetcher: RemoteFetcher): void {
  authorizedSourceFetcher = fetcher
}

async function tryFetch(fetcher: RemoteFetcher, barcode: string): Promise<RemoteProductResult | null> {
  try {
    return await fetcher(barcode)
  } catch {
    return null
  }
}

function cacheRemoteHit(
  barcode: string,
  result: RemoteProductResult,
  sourceName: string,
  by: string,
): StoredProduct {
  const source: ProductSource = {
    sourceName,
    sourceUrl: result.sourceUrl,
    importedAt: new Date().toISOString(),
    permissionRef: result.permissionRef,
  }
  return upsertProduct({
    barcode,
    name: result.name,
    brand: result.brand,
    imageUrl: result.imageUrl,
    per: result.per,
    servingSize: result.servingSize,
    kcal: result.kcal,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
    status: 'imported',
    source,
    by,
  })
}

/**
 * يحلّ منتجًا بالباركود بترتيب ثابت: قاعدة البيانات الداخلية → Open Food Facts → مصدر
 * مرخّص → null. أي نتيجة بعيدة تُخزَّن داخليًا فورًا فلا تتكرر نفس عملية الجلب لاحقًا.
 */
export async function resolveBarcode(barcode: string): Promise<ResolveResult> {
  const internal = getProduct(barcode)
  if (internal) return { product: internal, foundIn: 'internal' }

  const off = await tryFetch(openFoodFactsFetcher, barcode)
  if (off) {
    const product = cacheRemoteHit(barcode, off, 'open_food_facts', 'open_food_facts')
    return { product, foundIn: 'open_food_facts' }
  }

  const authorized = await tryFetch(authorizedSourceFetcher, barcode)
  if (authorized) {
    const product = cacheRemoteHit(barcode, authorized, 'authorized:external', 'authorized_source')
    return { product, foundIn: 'authorized' }
  }

  return { product: null, foundIn: 'not_found' }
}
