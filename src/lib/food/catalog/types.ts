/** أنواع الكتالوج المشحون — مطابقة لمخطّط خطّ الإنتاج، بلا حقول عابرة. */

export type Market = 'SA' | 'GCC' | 'GLOBAL'

export interface CatalogProduct {
  /** GTIN-14 مُوحَّد — مفتاح البحث المباشر. */
  gtin: string
  name_ar: string | null
  name_en: string | null
  brand_ar: string | null
  brand_en: string | null
  market: Market
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  serving_g: number | null
  source: string
}

/** فهرس شريحة: رمز ← مواضع في مصفوفة سجلاتها. */
export interface ShardIndex {
  postings: Record<string, number[]>
}

export interface ShardEntry {
  shard: string
  count: number
  sha256: string
}

export interface CatalogManifest {
  shard_count: number
  shards: ShardEntry[]
  hot_set: { count: number }
}

/** إحصاء تشغيلي — يجعل «لم يُحمَّل الكتالوج كاملًا» **قابلًا للإثبات** لا مُدَّعى. */
export interface CatalogStats {
  hotSetLoaded: boolean
  hotSetCount: number
  /** أسماء الشرائح التي جُلبت فعلًا في هذه الجلسة. */
  shardsFetched: string[]
  /** أسماء فهارس الشرائح التي جُلبت فعلًا. */
  indexesFetched: string[]
  /** عدد عمليات الجلب عبر الشبكة — يفرّق الذاكرة المؤقتة عن الجلب. */
  networkFetches: number
  /** عدد الإصابات من الذاكرة المؤقتة. */
  cacheHits: number
  /** الطبقة العاملة للذاكرة المؤقتة. */
  cacheKind: 'indexeddb' | 'memory'
  /** عدد السجلات المحمَّلة في الذاكرة الآن (لا يساوي حجم الكتالوج). */
  recordsInMemory: number
}
