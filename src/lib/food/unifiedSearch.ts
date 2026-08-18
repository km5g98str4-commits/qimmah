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
 * كان السطحان يُلصقان لصقًا: المنسَّق أولًا مقصوصًا عند ١٠، ثم المعبّأ تحته —
 * فيهبط تطابقٌ تامّ من المعبّأ تحت تضمينٍ ضعيف من المنسَّق، ويسقط منسَّقٌ قويّ خارج
 * العشرة بلا مقارنة. **الترتيب كان ترتيب المصدر لا ترتيب المطابقة.**
 *
 * ═══ القاعدة الحاكمة ═══
 * الرتب من المصدرين تُسقَط على **سلّم واحد** (`strength`، الأصغر أفضل)، وعند
 * تكافؤ المعنى **يتقدّم المنسَّق**: من كتب «شاورما» يريد الساندويتش لا رغيفه.
 * تطابق الباركود التامّ وحده يعلو الجميع — فمسح الباركود يبقى كما هو.
 *
 * ═══ المصدر يبقى معلَنًا ═══
 * كل نتيجة تحمل `source`، ومعرّف المعبّأ يبقى ببادئة `off:` — فنسب ODbL يظهر حين
 * تظهر سجلات OFF **وحدها**، ولا يُنسب صنف قِمّة المنسَّق إلى مصدر لم يأتِ منه.
 *
 * ⚠️ **لا ادّعاء ذيل طويل هنا.** المعبّأ الحيّ اليوم ٥٩٩ سجلًا — الشرائح الأربعون
 * غير مخدومة (انظر رأس `catalog/catalog.ts`). هذه الوحدة توحّد ما هو **موجود**.
 */
import {
  LOANWORD_SPELLINGS,
  SCRIPT_TRANSLITERATIONS,
  normalizeSearch,
  searchFood,
  type FoodItem,
} from '@/data/foodItems'
import { catalogProductToFoodItem } from './catalog/appCatalog'
import { tierRank, type RankedHit } from './catalog/rank'
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
 * مرآة تطبيع `searchFood` — **مبنيّة من جدولَيها المُصدَّرين لا منسوخة عنهما**.
 *
 * السبب: الترتيب الموحَّد يحتاج **قوّة** مطابقة الصنف المنسَّق، و`searchFood` تحسبها
 * ثم تسقطها. إعادة الحساب هنا تفتح باب تباعد — فيُغلق بجدولين مصدرهما واحد،
 * **ويُحرَس** بتأكيد في `scripts/run-food-meal-search-proof.mjs` يثبت أن قوّتي
 * المرآة لا تتناقصان أبدًا عبر ترتيب `searchFood` نفسه (§4.2).
 */
const replacementsFrom = (groups: readonly (readonly string[])[]): readonly (readonly [string, string])[] =>
  groups
    .flatMap(([canonical, ...variants]) =>
      variants.map((v) => [normalizeSearch(v), normalizeSearch(canonical ?? '')] as const),
    )
    .sort((a, b) => b[0].length - a[0].length)

const LOANWORD_REPLACEMENTS = replacementsFrom(LOANWORD_SPELLINGS)
const TRANSLITERATION_REPLACEMENTS = replacementsFrom(SCRIPT_TRANSLITERATIONS)

const applyReplacements = (text: string, pairs: readonly (readonly [string, string])[]): string => {
  let out = text
  for (const [variant, canonical] of pairs) {
    if (out.includes(variant)) out = out.split(variant).join(canonical)
  }
  return out
}

/** التطبيع الكامل للبحث: عربي عام ← مقابلات دخيلة ← نقل صوتي — بترتيب `searchFood`. */
export function canonicalizeForSearch(text: string): string {
  return applyReplacements(applyReplacements(normalizeSearch(text), LOANWORD_REPLACEMENTS), TRANSLITERATION_REPLACEMENTS)
}

/**
 * درجة الصنف المنسَّق مقابل استعلام **مُطبَّع مسبقًا** — نفس سلّم `searchFood`:
 * ٠ تطابق عربي · ١ بادئة عربية · ٢ تضمين عربي · ٣ بادئة إنجليزية · ٤ تضمين
 * إنجليزي · ٥ كلمة مفتاحية بادئة · ٦ كلمة مفتاحية متضمَّنة. و`null` لا مطابقة.
 */
export function curatedScore(item: FoodItem, canonicalQuery: string): number | null {
  if (!canonicalQuery) return null
  const ar = canonicalizeForSearch(item.nameAr)
  const en = canonicalizeForSearch(item.nameEn)
  const kws = (item.keywords ?? []).map((k) => canonicalizeForSearch(k))
  if (ar === canonicalQuery) return 0
  if (ar.startsWith(canonicalQuery)) return 1
  if (ar.includes(canonicalQuery)) return 2
  if (en.startsWith(canonicalQuery)) return 3
  if (en.includes(canonicalQuery)) return 4
  if (kws.some((k) => k === canonicalQuery || k.startsWith(canonicalQuery))) return 5
  if (kws.some((k) => k.includes(canonicalQuery))) return 6
  return null
}

/**
 * السلّم الموحَّد — **متشابكان لا متتاليان**، والمنسَّق يسبق نظيره في المعنى:
 *
 * | القوّة | من | ماذا |
 * |---|---|---|
 * | ٠ | معبّأ | باركود مطابق تمامًا — يعلو كل شيء |
 * | ١ / ٢ | منسَّق / معبّأ | اسم مطابق تمامًا |
 * | ٣ / ٤ | منسَّق / معبّأ | بادئة اسم |
 * | ٥ / ٦ | منسَّق / معبّأ | تضمين في الاسم |
 * | ٧ / ٨ | منسَّق / معبّأ | بادئة إنجليزية / بادئة رمز |
 * | ٩ · ١١ · ١٣ | منسَّق | تضمين إنجليزي · كلمة مفتاحية بادئة · متضمَّنة |
 * | ١٢ | معبّأ | مطابقة علامة تجارية |
 */
const CURATED_STRENGTH = [1, 3, 5, 7, 9, 11, 13] as const
const PACKAGED_STRENGTH = [0, 2, 4, 8, 6, 12] as const

/** مرشّحو المصدر المنسَّق مرتّبين — **متزامن**، فلا ينتظر المستخدم شبكة ليرى أكله. */
export function rankCurated(query: string, limit: number = CURATED_CANDIDATE_LIMIT): UnifiedFoodResult[] {
  const q = canonicalizeForSearch(query)
  if (!q) return []
  const out: UnifiedFoodResult[] = []
  for (const item of searchFood(query)) {
    const score = curatedScore(item, q)
    if (score === null) continue
    out.push({ item, source: 'curated', strength: CURATED_STRENGTH[score] ?? 13 })
    if (out.length >= limit) break
  }
  return out
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
  const seen = new Set(curated.map((r) => canonicalizeForSearch(r.item.nameAr)))
  const merged: UnifiedFoodResult[] = [...curated]
  for (const hit of packaged) {
    const item = catalogProductToFoodItem(hit.product, lang)
    const key = canonicalizeForSearch(item.nameAr)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ item, source: 'packaged', strength: PACKAGED_STRENGTH[tierRank(hit.tier)] ?? 12 })
  }
  return merged.sort((a, b) => a.strength - b.strength).slice(0, limit)
}

/**
 * البحث الموحَّد كاملًا — نقطة واحدة يستعملها الإثبات وأي مستهلك لا يحتاج
 * فصل المتزامن عن المؤجَّل. الواجهة تستعمل `rankCurated` + `mergeUnified` كي
 * يظهر المنسَّق فورًا ويلحق المعبّأ.
 */
export async function searchAllFoods(
  query: string,
  opts: { catalog?: Catalog | null; lang?: 'ar' | 'en'; limit?: number; deepShards?: string[] } = {},
): Promise<UnifiedFoodResult[]> {
  const curated = rankCurated(query)
  const packaged = opts.catalog
    ? await opts.catalog.searchRanked(query, { limit: PACKAGED_CANDIDATE_LIMIT, deepShards: opts.deepShards })
    : []
  return mergeUnified(curated, packaged, opts.lang ?? 'ar', opts.limit ?? DEFAULT_RESULT_LIMIT)
}
