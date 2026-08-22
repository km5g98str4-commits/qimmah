/**
 * ترتيب نتائج الكتالوج — **دالة واحدة معلَنة وقابلة للاختبار** (عقد البحث §٦).
 *
 * العقد يذكرها صراحةً: «الترتيب معلَن في الكود لا مبثوث». ترتيبٌ مبثوث في ثلاثة
 * مواضع يصير ثلاثة ترتيبات بعد موجتين، ولا يمكن اختبار أيّها الصحيح.
 */
import { normalizeProductKey } from '@/lib/text/foodNormalize'
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
 * يرتّب النتائج **مع الاحتفاظ برتبة كل مطابقة**: الرتبة أولًا، ثم السوق، ثم
 * الاسم — والأخير يجعل الترتيب **حتميًا**، فلا يتبدّل ترتيب متساويين بين
 * تشغيلين ويكذب اختبار الاستقرار.
 *
 * الرتبة تُعاد لأن طبقة الاتحاد فوق الكتالوج (`src/lib/food/unifiedSearch.ts`)
 * تحتاج أن تعرف **قوّة** المطابقة لتقارنها بقوّة مطابقة صنف منسَّق. إسقاطها هنا
 * كان يجعل الاتحاد يخمّن ما حسبناه أصلًا.
 */
export function rankRankedHits(hits: RankedHit[]): RankedHit[] {
  return [...hits].sort((a, b) => {
    const t = TIER_RANK[a.tier] - TIER_RANK[b.tier]
    if (t !== 0) return t
    const m = marketBoost(a.product) - marketBoost(b.product)
    if (m !== 0) return m
    return (a.product.name_ar || a.product.name_en || '').localeCompare(
      b.product.name_ar || b.product.name_en || '',
    )
  })
}

/** نفس الترتيب بالسجلات المجرّدة — الواجهة القائمة. */
export function rankHits(hits: RankedHit[]): CatalogProduct[] {
  return rankRankedHits(hits).map((h) => h.product)
}

/** الرقم الترتيبي لرتبة — تحتاجه طبقة الاتحاد لتسقط الرتب على سلّم واحد. */
export function tierRank(tier: MatchTier): number {
  return TIER_RANK[tier]
}

/** يحدّد رتبة المطابقة لسجل مقابل استعلام مطبَّع. */
/**
 * §٣٫٤ — أداة التعريف «ال» **إضافة لا استبدال**.
 *
 * الحذف المدمّر يخلط «العلم» بـ«علم». والمقارنة بالشكل الخام وحدها تفشل في
 * الاتجاه الآخر: «الكبسه» لا تطابق سجلًا اسمه «كبسة» رغم أن الفهرس يحمل
 * الشكلين. فنجرّب الشكلين ونأخذ أقواهما — بلا حذف يخسر التمييز.
 */
function withoutAl(token: string): string | null {
  return token.length > 4 && token.startsWith('ال') ? token.slice(2) : null
}

function tierFor(product: CatalogProduct, q: string, f: { name: string; brand: string }): MatchTier | null {
  if (!q) return null
  if (product.gtin === q) return 'gtin-exact'
  if (f.name === q) return 'name-exact'
  if (f.name.startsWith(q)) return 'name-prefix'
  if (product.gtin.startsWith(q)) return 'code-prefix'
  if (f.name.includes(q)) return 'contains'
  if (f.brand.includes(q)) return 'brand'
  return null
}

export function classifyMatch(
  product: CatalogProduct,
  normalizedQuery: string,
  normalizedFields: { name: string; brand: string },
): MatchTier | null {
  const direct = tierFor(product, normalizedQuery, normalizedFields)
  if (direct) return direct
  const bare = withoutAl(normalizedQuery)
  return bare ? tierFor(product, bare, normalizedFields) : null
}

/**
 * رتبة سجل مقابل استعلام **مطبَّع** — تطبيع الحقول هنا لا في كل مستهلك.
 *
 * كان هذا التركيب مكتوبًا داخل `Catalog.tierFor` وحده. ونسخه في مستهلك ثانٍ
 * (حزم البحث) كان سيصنع تطبيعين يتباعدان بعد موجة — وهو بالضبط ما يمنعه §٦ من
 * عقد البحث: «الترتيب معلَن في الكود لا مبثوث».
 */
export function tierForProduct(product: CatalogProduct, normalizedQuery: string): MatchTier | null {
  return classifyMatch(product, normalizedQuery, {
    name: normalizeProductKey(`${product.name_ar ?? ''} ${product.name_en ?? ''}`),
    brand: normalizeProductKey(`${product.brand_ar ?? ''} ${product.brand_en ?? ''}`),
  })
}
