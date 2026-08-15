/**
 * ترتيب نتائج الكتالوج — **دالة واحدة معلَنة وقابلة للاختبار** (عقد البحث §٦).
 *
 * العقد يذكرها صراحةً: «الترتيب معلَن في الكود لا مبثوث». ترتيبٌ مبثوث في ثلاثة
 * مواضع يصير ثلاثة ترتيبات بعد موجتين، ولا يمكن اختبار أيّها الصحيح.
 */
import type { CatalogProduct } from './types'

/** رتب المطابقة من الأقوى إلى الأضعف — الرقم الأصغر أفضل. */
export const MATCH_TIERS = [
  'gtin-exact',
  'name-exact',
  'name-prefix',
  'code-prefix',
  'contains',
  'brand',
] as const
export type MatchTier = (typeof MATCH_TIERS)[number]

const TIER_RANK: Record<MatchTier, number> = {
  'gtin-exact': 0,
  'name-exact': 1,
  'name-prefix': 2,
  'code-prefix': 3,
  contains: 4,
  brand: 5,
}

export interface RankedHit {
  product: CatalogProduct
  tier: MatchTier
}

/** تعزيز السوق السعودي **عند تساوي الرتبة فقط** — لا يقفز فوق مطابقة أقوى. */
function marketBoost(p: CatalogProduct): number {
  if (p.market === 'SA') return 0
  if (p.market === 'GCC') return 1
  return 2
}

/**
 * يرتّب النتائج: الرتبة أولًا، ثم السوق، ثم الاسم — والأخير يجعل الترتيب
 * **حتميًا**، فلا يتبدّل ترتيب متساويين بين تشغيلين ويكذب اختبار الاستقرار.
 */
export function rankHits(hits: RankedHit[]): CatalogProduct[] {
  return [...hits]
    .sort((a, b) => {
      const t = TIER_RANK[a.tier] - TIER_RANK[b.tier]
      if (t !== 0) return t
      const m = marketBoost(a.product) - marketBoost(b.product)
      if (m !== 0) return m
      return (a.product.name_ar || a.product.name_en || '').localeCompare(
        b.product.name_ar || b.product.name_en || '',
      )
    })
    .map((h) => h.product)
}

/** يحدّد رتبة المطابقة لسجل مقابل استعلام مطبَّع. */
export function classifyMatch(
  product: CatalogProduct,
  normalizedQuery: string,
  normalizedFields: { name: string; brand: string },
): MatchTier | null {
  if (!normalizedQuery) return null
  if (product.gtin === normalizedQuery) return 'gtin-exact'
  if (normalizedFields.name === normalizedQuery) return 'name-exact'
  if (normalizedFields.name.startsWith(normalizedQuery)) return 'name-prefix'
  if (product.gtin.startsWith(normalizedQuery)) return 'code-prefix'
  if (normalizedFields.name.includes(normalizedQuery)) return 'contains'
  if (normalizedFields.brand.includes(normalizedQuery)) return 'brand'
  return null
}
