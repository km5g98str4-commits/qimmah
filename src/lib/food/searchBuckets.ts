/**
 * حزم البحث بالبادئة — **التوجيه الذي كان مفقودًا**.
 *
 * ═══ العطل الذي يغلقه ═══
 * الشرائح تُوزَّع بـ`assignShard(gtin)` — أي **بالباركود**. وهو التوزيع الصحيح
 * لمسح الباركود (شريحة واحدة محسوبة، بلا مسح). لكنه **بلا معنى للبحث النصّي**:
 * من يكتب «kinder» لا يعرف الـGTIN، فلا يعرف الشريحة. ولذلك كان البحث العميق
 * يشترط `deepShards` من المستدعي — والواجهة لا تسمّي شريحة واحدة، فلا يصل
 * المستخدم إلى أي سجل من الذيل الطويل مهما كتب.
 *
 * ═══ الحلّ: تقسيم ثانٍ للنصّ، بجانب تقسيم الباركود ═══
 * يُعاد تجميع نفس السجلات في **حزم مفتاحها أول ٣ محارف من كلمة مطبَّعة**. فالكلمة
 * التي يكتبها المستخدم هي بنفسها عنوان الملف الذي يحتويها:
 *
 *   «kinder» ⇒ الحزمة `kin` ⇒ طلب واحد ⇒ **كل** سجل تبدأ إحدى كلماته بـ`kin`.
 *
 * لا بحث في ٤١ فهرسًا، ولا تخمين شريحة، ولا استدعاءٌ ناقص. والاستدعاء **تامّ**:
 * السجل يدخل حزمةً لكل كلمة من كلماته (٦٫٥٧ حزمة للسجل الواحد وسطيًّا)، فأي كلمة
 * يكتبها المستخدم تصله.
 *
 * ═══ لماذا ٣ محارف ═══
 * `PREFIX_MIN` في `foodNormalize.ts` = ٣ أصلًا — وهو حدّ البادئة المعلَن في
 * مواصفة البحث §٤. فمفتاح الحزمة ليس رقمًا جديدًا يُخترع هنا، بل **نفس** الحدّ
 * القائم. وما دون ٣ محارف يخدمه الطقم الساخن والمنسَّق بلا شبكة.
 *
 * ═══ ما لا يغيّره هذا الملف ═══
 * **توجيه الباركود يبقى كما هو حرفيًا** — `assignShard` والشرائح والحمولات كلها
 * بلا مساس. هذه طبقة **ثانية بجانبه** لا بديل عنه: الباركود يعرف الـGTIN فيحسب
 * شريحته، والنصّ يعرف الكلمة فيحسب حزمتها.
 */
import { MIN_TOKEN_LENGTH, PREFIX_MIN, normalizeProductKey, tokenize } from '@/lib/text/foodNormalize'

/** نسخة عقد الحزم — تُكتب في الدليل ويقرؤها وقت التشغيل. */
export const SEARCH_CORPUS_VERSION = '1.0.0'

/** طول مفتاح الحزمة — **هو `PREFIX_MIN` نفسه**، لا رقم ثانٍ يتباعد عنه. */
export const BUCKET_KEY_LENGTH = PREFIX_MIN

/** أدنى طول كلمة يجوز أن توجّه بحثًا عميقًا. ما دونها: الطقم الساخن والمنسَّق. */
export const MIN_DEEP_QUERY_LENGTH = PREFIX_MIN

/**
 * عدد السجلات في صفحة الحزمة الواحدة.
 *
 * ٥١٢ سجلًا ≈ ١٦ كيلوبايت مضغوطة — أصغر من فهرس شريحة واحدة (٦٨ كيلوبايت) بأربع
 * مرّات، وأصغر من حمولتها (٣٤٧ كيلوبايت) بعشرين. والتصفيح يمنع حزمةً عامّة
 * («cho» ⇒ ٦٬٠٥٨ سجلًا) من أن تصير تنزيلًا واحدًا ثقيلًا.
 */
export const BUCKET_PAGE_SIZE = 512

/** أقصى صفحات تجلبها استعلامة واحدة. ٤ صفحات ≈ ٢٬٠٤٨ سجلًا ≈ ٦٥ كيلوبايت مضغوطة. */
export const DEFAULT_BUCKET_PAGE_BUDGET = 4

/** أعمدة بطاقة البحث — **الحقول التي تحتاجها القائمة، لا السجل كاملًا**. */
export const CARD_FIELDS = [
  'gtin', 'name_ar', 'name_en', 'brand_ar', 'brand_en', 'search_aliases_ar', 'market',
  'energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'serving_size', 'serving_unit', 'source',
] as const

export type CardField = (typeof CARD_FIELDS)[number]

/** دليل الحزم: مفتاح ← عدد سجلاته. الصفحات تُشتقّ ولا تُخزَّن (عدّان لا يتناقضان). */
export interface BucketDirectory {
  version: string
  normalization_version: string
  key_length: number
  page_size: number
  total_records: number
  total_postings: number
  buckets: Record<string, number>
}

/** صفحة حزمة بالشكل العمودي — أرخص من صفوف الكائنات بـ٢٤٪ مضغوطة. */
export interface BucketPage {
  key: string
  page: number
  fields: readonly string[]
  columns: unknown[][]
}

/** عدد صفحات حزمة بحجم معلوم — اشتقاق واحد يستعمله البناء ووقت التشغيل. */
export function pageCount(records: number, pageSize: number = BUCKET_PAGE_SIZE): number {
  return records <= 0 ? 0 : Math.ceil(records / pageSize)
}

/**
 * **نصّ البحث القانوني لسجل منتج** — مصدر واحد لا ثلاثة.
 *
 * كان هذا التركيب مكتوبًا ثلاث مرّات: في `shard.mjs` وفي `emit-search-buckets.mjs`
 * وفي `rank.tierForProduct`. ثلاث نسخ تتباعد بعد موجتين، فيصير السجل مفهرسًا بنصّ
 * ومطابَقًا بنصّ آخر — وهو أسوأ عطل بحث ممكن لأنه صامت. الآن نسخة واحدة.
 *
 * المرادفات العربية **جزء من نصّ الاسترجاع** ولا تدخل أي مسار عرض.
 */
export function productSearchText(rec: {
  name_ar?: string | null; name_en?: string | null
  brand_ar?: string | null; brand_en?: string | null
  category?: string | null; search_aliases_ar?: string[] | null
}): string {
  const aliases = Array.isArray(rec.search_aliases_ar) ? rec.search_aliases_ar : []
  return [rec.name_ar, rec.name_en, rec.brand_ar, rec.brand_en, rec.category, ...aliases]
    .filter(Boolean).join(' ')
}

/** مفتاح الحزمة لرمز مفهرس، أو `null` إن كان أقصر من حدّ الفهرسة. */
export function bucketKeyForToken(token: string): string | null {
  if (token.length < MIN_TOKEN_LENGTH) return null
  return token.slice(0, BUCKET_KEY_LENGTH)
}

/**
 * مفاتيح الحزم التي ينتمي إليها سجل — من **نفس** نصّ الفهرسة الذي يبنيه خطّ
 * الإنتاج (`buildSearchIndex`)، وبـ`tokenize` نفسها. فلا يوجد تقطيع ثانٍ يتباعد.
 */
export function bucketKeysForText(text: string): string[] {
  const out = new Set<string>()
  for (const token of tokenize(text)) {
    const key = bucketKeyForToken(token)
    if (key) out.add(key)
  }
  return [...out].sort()
}

/** ترميز المفتاح لاسم ملف — hex لبايتات UTF-8، فالعربية تصير اسمًا آمنًا في أي CDN. */
export function encodeBucketKey(key: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(key)) out += byte.toString(16).padStart(2, '0')
  return out
}

/** مسار صفحة حزمة — نسبةً إلى جذر أصول الطعام. */
export function bucketPagePath(key: string, page: number): string {
  return `search/b/${encodeBucketKey(key)}-${page}.json`
}

/** مسار الدليل. */
export const DIRECTORY_PATH = 'search/directory.json'

/** سبب خطّة الاستعلام — **معلَن** كي يفرّق «لم نبحث» عن «بحثنا فلم نجد». */
export type PlanReason =
  /** كلمة واحدة على الأقل صالحة للتوجيه، والمفتاح موجود في الدليل. */
  | 'ok'
  /** كل كلمات الاستعلام أقصر من حدّ البادئة — لا بحث عميق أصلًا. */
  | 'too-short'
  /** كلمة صالحة للتوجيه **لا مفتاح لها في الدليل** ⇒ صفر مؤكَّد، بلا أي طلب. */
  | 'absent'
  /** لا دليل (لم يُجلب أو تعذّر) ⇒ لا يجوز ادّعاء صفر. */
  | 'no-directory'

export interface BucketQueryPlan {
  reason: PlanReason
  /** الحزمة المختارة — **أندر كلمات الاستعلام**، أي أقلّ بايتات وأدقّ استدعاء. */
  key: string | null
  /**
   * كل الحزم الواجب قراءتها. للكلمة الطويلة حزمة واحدة (= `key`)، أمّا الكلمة
   * الأقصر من مفتاح الحزمة («ما» من «ماء») فتُفتَح على كل حزم الدليل التي تبدأ بها
   * — وهو تعريف البادئة نفسه، لا استثناء لكلمة بعينها.
   */
  keys: string[]
  /** عدد سجلات الحزمة المختارة كما يعلنه الدليل. */
  records: number
  /** الكلمات المطبَّعة الصالحة للتوجيه. */
  words: string[]
}

/**
 * يخطّط استعلامًا: أي حزمة تُجلب — إن وجبت أصلًا.
 *
 * ═══ لماذا **أندر** كلمة لا أولاها ═══
 * «chocolate milk» كلمتاه في الدليل: `cho` ⇒ ٦٬٠٥٨ سجلًا · `mil` ⇒ ٣٬٤٣٣. اختيار
 * الأندر يجلب **نصف** البايتات ويعطي نفس النتيجة بالضبط: المطابقة النهائية تُحسب
 * على الاستعلام كاملًا داخل الحزمة، والسجل المطابق لا بدّ أن يكون في **كل** حزم
 * كلماته. فالأندر ليس تقريبًا — هو الاختيار الصحيح الأرخص.
 *
 * ═══ ولماذا الغياب صفرٌ لا مجرّد «لم نجد» ═══
 * كلمة طولها ≥ ٣ ولا مفتاح لها في الدليل تعني: **لا سجل في الستين ألفًا تبدأ
 * إحدى كلماته بهذه المحارف**. فالصفر هنا استنتاج من الدليل لا تخمين — ويُعلَن
 * بـ`absent` بلا طلب شبكة واحد.
 */
export function planBucketQuery(query: string, directory: BucketDirectory | null): BucketQueryPlan {
  const normalized = normalizeProductKey(query)
  // ⚠️ الحدّ هنا هو **حدّ الفهرسة** `MIN_TOKEN_LENGTH` لا حدّ البادئة `PREFIX_MIN`.
  // كان الحدّ ٣ فكانت «ماء» — وتُطبَّع إلى «ما» بحرفين — تُرفض قبل أي بحث
  // (`too-short`) رغم أن الفهرس **يحمل** رمزها: `tokenize` تفهرس من حرفين.
  // فالاستعلام كان يُرفض بحدٍّ أشدّ من الحدّ الذي بُني به الفهرس.
  const words = normalized.split(' ').filter((w) => w.length >= MIN_TOKEN_LENGTH)
  if (words.length === 0) return { reason: 'too-short', key: null, keys: [], records: 0, words }
  if (!directory) return { reason: 'no-directory', key: null, keys: [], records: 0, words }

  let key: string | null = null
  let keys: string[] = []
  let records = 0

  for (const word of words) {
    const candidate = word.slice(0, BUCKET_KEY_LENGTH)
    // كلمة أقصر من مفتاح الحزمة تُطابَق **تطابقًا تامًّا** (انظر `allTermsPresent`)،
    // ورمزُها التامّ يسكن حزمةً واحدة مفتاحها هو الكلمة نفسها. ففتح الحزم الأطول
    // كان يجلب بايتات لا تُطابق شيئًا — «ما» تجلب «مان» ثم تسقط كل سجلاتها.
    const group = directory.buckets[candidate] === undefined ? [] : [candidate]
    if (group.length === 0) return { reason: 'absent', key: null, keys: [], records: 0, words }
    const count = group.reduce((sum, k) => sum + (directory.buckets[k] ?? 0), 0)
    // الأندر يفوز؛ وعند التعادل يفوز الأصغر معجميًّا — فالخطّة **حتمية**.
    const head = group[0]
    if (key === null || count < records || (count === records && head < key)) {
      key = head
      keys = group
      records = count
    }
  }
  return { reason: 'ok', key, keys, records, words }
}

/** يفكّ صفحة عمودية إلى صفوف كائنات — عكس ما يكتبه المُصدِر، بلا حقل ثالث بينهما. */
export function decodeBucketPage(page: BucketPage): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const length = page.columns[0]?.length ?? 0
  for (let i = 0; i < length; i++) {
    const row: Record<string, unknown> = {}
    page.fields.forEach((f, j) => { row[f] = page.columns[j]?.[i] ?? null })
    rows.push(row)
  }
  return rows
}
