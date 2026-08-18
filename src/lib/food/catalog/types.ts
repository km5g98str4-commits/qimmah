/** أنواع الكتالوج المشحون — مطابقة لمخطّط خطّ الإنتاج، بلا حقول عابرة. */

export type Market = 'SA' | 'GCC' | 'GLOBAL'

/**
 * سجل المنتج — **بأسماء حقول خطّ الإنتاج نفسها**، بلا إعادة تسمية.
 * أي طبقة تحويل بين القرص ووقت التشغيل تصير مكانًا ثالثًا يجب أن يتفق مع
 * الاثنين، وهي بالضبط الفجوة التي أنتجت أعطال «التوأم» في هذا المشروع.
 */
export interface CatalogProduct {
  /** GTIN-14 مُوحَّد — مفتاح البحث المباشر. */
  gtin: string
  name_ar: string | null
  name_en: string | null
  brand_ar: string | null
  brand_en: string | null
  market: Market
  energy_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  serving_size: number | null
  serving_unit: string | null
  source: string
  source_url?: string | null
}

/** غلاف الشريحة كما يكتبه خطّ الإنتاج. */
export interface ShardPayload {
  shard: string
  count: number
  licence: string
  records: Record<string, CatalogProduct>
}

/** فهرس شريحة: `order` ترتيب الـGTIN، و`tokens` رمز ← مواضع فيه. */
export interface ShardIndex {
  order: string[]
  tokens: Record<string, number[]>
}

/** الطقم الساخن — نفس شكل الفهرس والسجلات معًا. */
export interface HotSetPayload {
  count: number
  licence: string
  order: string[]
  records: Record<string, CatalogProduct>
  tokens: Record<string, number[]>
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
