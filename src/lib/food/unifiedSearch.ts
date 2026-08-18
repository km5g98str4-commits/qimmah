/**
 * اتحاد البحث — **قائمة واحدة مرتّبة** من مصدرَي الطعام في قِمّة.
 *
 * ═══ العطل الذي يغلقه ═══
 * للطعام في قِمّة مصدران لا واحد:
 *   • **المنسَّق** (`src/data/foodItems.ts`، ٦٤١ صنفًا) — أطباق مركّبة بحصص واقعية
 *     وسلاسل سعودية مسمّاة: شاورما، كبسة، مندي، برجر. **هذا ما يبحث عنه الناس.**
 *   • **المعبّأ** (الطقم الساخن، ٥٩٩ سجلًا) — قاعدة **باركود**: سلع مغلّفة بـGTIN.
 *     لا تحوي طبقًا مركّبًا واحدًا؛ أقرب ما فيها لـ«برجر» هو **خبز البرجر**.
 *
 * وكانت شاشة التسجيل السريع تستدعي `catalog.search()` وحدها — أي **المعبّأ فقط**.
 * فقياسًا على الجذع: «شاورما» ⇒ صفر · «كبسة» ⇒ صفر · «مندي» ⇒ صفر · «برجر» ⇒ ١
 * (خبز برجر) · «بيتزا» ⇒ ١ (صلصة بيتزا). والبيانات الممتازة موجودة، غير موصولة.
 * **عطل تكامل مصدر بيانات، لا نقص بيانات.**
 *
 * ═══ القاعدة الحاكمة ═══
 * الرتب من المصدرين تُسقَط على **سلّم واحد** (`strength`، الأصغر أفضل)، وعند
 * تكافؤ المعنى **يتقدّم المنسَّق**: من كتب «شاورما» يريد الساندويتش لا رغيفه.
 * تطابق الباركود التامّ وحده يعلو الجميع — فمسح الباركود يبقى كما هو.
 *
 * ═══ مصدر واحد للدرجة، لا مرآة ═══
 * قوّة الصنف المنسَّق تأتي من `searchFoodScored` في وحدة البيانات نفسها — **لا
 * تُعاد حسابها هنا**. مرآةٌ للترتيب تتباعد عن أصلها بعد موجتين، والاتحاد يصير
 * يخمّن ما حُسب أصلًا.
 *
 * ═══ المصدر يبقى معلَنًا ═══
 * كل نتيجة تحمل `source`، ومعرّف المعبّأ يبقى ببادئة `off:` — فنسب ODbL يظهر حين
 * تظهر سجلات OFF **وحدها**، ولا يُنسب صنف قِمّة المنسَّق إلى مصدر لم يأتِ منه.
 *
 * ⚠️ **لا ادّعاء ذيل طويل هنا.** المعبّأ الحيّ اليوم ٥٩٩ سجلًا — الشرائح الأربعون
 * غير مخدومة (انظر `catalog/catalog.ts` و`longTailAvailability`). هذه الوحدة
 * توحّد ما هو **موجود**، ولا تعد بما ليس مرفوعًا.
 */
import { foodItems, searchFoodScored, type FoodItem } from '@/data/foodItems'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { catalogProductToFoodItem } from './catalog/appCatalog'
import { tierRank, type RankedHit } from './catalog/rank'
import { queryVariants } from './queryVariants'
import type { Catalog } from './catalog/catalog'

export type FoodSource = 'curated' | 'packaged'

export interface UnifiedFoodResult {
  item: FoodItem
  /** من أين جاء الصنف — تحتاجه الواجهة للنسب ولأي تمييز بصري لاحق. */
  source: FoodSource
  /** موضعه على السلّم الموحَّد. الأصغر أقوى. */
  strength: number
}

/** أقصى مرشّحين من كل مصدر قبل الدمج، وأقصى معروض بعده. */
export const CURATED_CANDIDATE_LIMIT = 12
export const PACKAGED_CANDIDATE_LIMIT = 12
export const DEFAULT_RESULT_LIMIT = 18

/**
 * السلّم الموحَّد — **متشابكان لا متتاليان**، والمنسَّق يسبق نظيره في المعنى:
 *
 * | القوّة | من | ماذا |
 * |---|---|---|
 * | ٠ | معبّأ | باركود مطابق تمامًا — يعلو كل شيء |
 * | ١ / ٢ | منسَّق / معبّأ | اسم مطابق تمامًا |
 * | ٣ / ٤ | منسَّق / معبّأ | بادئة اسم |
 * | ٥ / ٦ | منسَّق / معبّأ | تضمين في الاسم |
 * | ٧ | منسَّق | بادئة الاسم الإنجليزي |
 * | ٨ | معبّأ | بادئة رمز GTIN |
 * | ٩ · ١١ · ١٣ | منسَّق | تضمين إنجليزي · كلمة مفتاحية بادئة · كلمة مفتاحية متضمَّنة |
 * | ١٢ | معبّأ | مطابقة علامة تجارية |
 *
 * **الأثر المقصود، حرفيًا:** «برجر» ⇒ «برجر لحم» المنسَّق بادئةٌ ⇒ قوّة ٣، بينما
 * «خبز البرجر بالسمسم» المعبّأ تضمينٌ ⇒ قوّة ٦. فالساندويتش يعلو الرغيف — بالبنية
 * لا بالمصادفة.
 */
const CURATED_STRENGTH = [1, 3, 5, 7, 9, 11, 13] as const
const PACKAGED_STRENGTH = [0, 2, 4, 8, 6, 12] as const

/** أضعف قوّة ممكنة — تُستعمل حين تخرج درجةٌ خارج السلّم (لا يقع عمليًا). */
const WEAKEST_STRENGTH = 14

/**
 * ترتيب الصنف في `foodItems` — يكسر تعادل القوّة **حتميًّا**.
 * يُبنى مرّة: الاتحاد قد يدمج نتائج عدّة صيغ للاستعلام، فيضيع الترتيب الأصلي الذي
 * يضمنه `searchFoodScored` داخل الصيغة الواحدة.
 */
const CURATED_ORDER: ReadonlyMap<string, number> = new Map(foodItems.map((f, i) => [f.id, i]))

/** مفتاح إزالة التكرار بين المصدرين — تطبيع واحد لا اثنان. */
const dedupeKey = (item: FoodItem): string => normalizeProductKey(item.nameAr)

/**
 * مرشّحو المصدر المنسَّق مرتّبين — **متزامن**، فلا ينتظر المستخدم شبكة ليرى أكله.
 *
 * الاستعلام يُوسَّع إلى صيغه (طيّ عربي + مفرد إنجليزي) وتُدمج نتائجها بأخذ **أقوى**
 * درجة لكل صنف: صيغة إضافية توسّع الاستدعاء ولا تُضعف مطابقةً وجدها الأصل.
 */
export function rankCurated(query: string, limit: number = CURATED_CANDIDATE_LIMIT): UnifiedFoodResult[] {
  const variants = queryVariants(query)
  if (variants.length === 0) return []
  const best = new Map<string, { item: FoodItem; score: number }>()
  for (const v of variants) {
    for (const scored of searchFoodScored(v)) {
      const prev = best.get(scored.item.id)
      if (!prev || scored.score < prev.score) best.set(scored.item.id, scored)
    }
  }
  return [...best.values()]
    .sort((a, b) => (a.score - b.score) || ((CURATED_ORDER.get(a.item.id) ?? 0) - (CURATED_ORDER.get(b.item.id) ?? 0)))
    .slice(0, limit)
    .map(({ item, score }) => ({ item, source: 'curated' as const, strength: CURATED_STRENGTH[score] ?? WEAKEST_STRENGTH }))
}

/**
 * مرشّحو المصدر المعبّأ — **غير متزامن** لأن الكتالوج قد يجلب.
 *
 * يُوسَّع الاستعلام هنا أيضًا كي يستفيد المعبّأ من ردّ المفرد الإنجليزي. الطيّ
 * العربي يجريه الكتالوج داخليًا عبر `normalizeProductKey`، فالصيغة المطوية تكرار
 * حميد يسقط في إزالة التكرار أدناه.
 */
export async function rankPackaged(
  catalog: Catalog | null | undefined,
  query: string,
  opts: { limit?: number; deepShards?: string[] } = {},
): Promise<RankedHit[]> {
  if (!catalog) return []
  const limit = opts.limit ?? PACKAGED_CANDIDATE_LIMIT
  const seen = new Set<string>()
  const hits: RankedHit[] = []
  for (const v of queryVariants(query)) {
    for (const hit of await catalog.searchRanked(v, { limit, deepShards: opts.deepShards })) {
      if (seen.has(hit.product.gtin)) continue
      seen.add(hit.product.gtin)
      hits.push(hit)
    }
  }
  return hits.slice(0, limit)
}

/**
 * يدمج المصدرين في قائمة واحدة مرتّبة.
 * التكرار يُحسم لصالح المنسَّق: صنف قِمّة بنفس الاسم يبقى صاحب الأولوية.
 * الفرز مستقرّ (ES2019)، فترتيب المتساويين يبقى ترتيب مصدره — حتميًّا.
 */
export function mergeUnified(
  curated: UnifiedFoodResult[],
  packaged: RankedHit[],
  lang: 'ar' | 'en',
  limit: number = DEFAULT_RESULT_LIMIT,
): UnifiedFoodResult[] {
  const seen = new Set(curated.map((r) => dedupeKey(r.item)))
  const merged: UnifiedFoodResult[] = [...curated]
  for (const hit of packaged) {
    const item = catalogProductToFoodItem(hit.product, lang)
    const key = dedupeKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ item, source: 'packaged', strength: PACKAGED_STRENGTH[tierRank(hit.tier)] ?? WEAKEST_STRENGTH })
  }
  return merged.sort((a, b) => a.strength - b.strength).slice(0, limit)
}

/**
 * البحث الموحَّد كاملًا — نقطة واحدة يستعملها الإثبات وأي مستهلك لا يحتاج
 * فصل المتزامن عن المؤجَّل. الواجهة تستعمل `rankCurated` + `rankPackaged` كي
 * يظهر المنسَّق فورًا ويلحق المعبّأ.
 */
export async function searchAllFoods(
  query: string,
  opts: { catalog?: Catalog | null; lang?: 'ar' | 'en'; limit?: number; deepShards?: string[] } = {},
): Promise<UnifiedFoodResult[]> {
  const curated = rankCurated(query)
  const packaged = await rankPackaged(opts.catalog, query, { deepShards: opts.deepShards })
  return mergeUnified(curated, packaged, opts.lang ?? 'ar', opts.limit ?? DEFAULT_RESULT_LIMIT)
}
