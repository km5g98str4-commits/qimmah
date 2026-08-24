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
 * ═══ الذيل الطويل يمرّ من هنا ═══
 * `rankPackaged` يشعل حزم البحث افتراضيًا (`deep: true`)، فأي شاشة تستدعيه تصل
 * إلى الستين ألفًا بلا أن تعرف شريحة. والسلّم أعلاه هو ما يمنع ذلك من إغراق
 * المنسَّق: «شاورما» تبقى الساندويتش، لأن قوّة المنسَّق تسبق نظيرها المعبّأ.
 */
import { foodItems, getFood, searchFoodScored, type FoodItem } from '@/data/foodItems'
import { BRAND_FALLBACK_STRENGTH, brandFallbackIds } from './brandCoverage'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { catalogProductToFoodItem } from './catalog/appCatalog'
import { tierRank, type RankedHit } from './catalog/rank'
import { queryVariants, queryVariantsDetailed } from './queryVariants'
import type { Catalog } from './catalog/catalog'

export type FoodSource = 'curated' | 'packaged'

/**
 * رتبة معبّأة مع **أصل الصيغة التي وجدتها**. الحقل اختياري عمدًا: أي مستهلك قائم
 * يمرّر `RankedHit[]` عاديًا يظلّ صالحًا، ويُقرأ الغياب «ليست مخمَّنة».
 */
export type PackagedCandidate = RankedHit & { derivedOnly?: boolean }

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
 * | ١ / ٢ | منسَّق / معبّأ | اسم مطابق تمامًا (بأيّ من اللغتين) |
 * | ٣ / ٤ | منسَّق / معبّأ | بادئة اسم |
 * | ٥ / ٦ | منسَّق / معبّأ | تضمين في الاسم |
 * | ٧ | منسَّق | كلمة مفتاحية بادئة |
 * | ٨ | معبّأ | بادئة رمز GTIN |
 * | ٩ | منسَّق | كلمة مفتاحية متضمَّنة |
 * | ١٠ | منسَّق | كل رموز الاستعلام حاضرة (مطابقة رموز) |
 * | ١٢ | معبّأ | مطابقة علامة تجارية |
 *
 * **الأثر المقصود، حرفيًا:** «برجر» ⇒ «برجر لحم» المنسَّق بادئةٌ ⇒ قوّة ٣، بينما
 * «خبز البرجر بالسمسم» المعبّأ تضمينٌ ⇒ قوّة ٦. فالساندويتش يعلو الرغيف — بالبنية
 * لا بالمصادفة.
 *
 * ═══ ما تغيّر ولماذا (قياس، لا ذوق) ═══
 * كان السلّم يعطي **بادئة الاسم الإنجليزي** للمنسَّق قوّة ٧ — أي **دون** بادئة
 * اسمٍ معبّأ (٤) وتضمينه (٦). فكانت الواجهة الإنجليزية تُرجع ضجيج العبوات فوق
 * أصناف قِمّة المنسَّقة:
 *   • `milk` ⇒ «Milk — TOPS» ثم «milka» — و«حليب كامل الدسم» مدفون.
 *   • `pizza` ⇒ «Protein Puffs Pizza» قبل «شريحة بيتزا».
 *   • `nuts` ⇒ «nutella» قبل «لوز» — بادئة `nut` تكفي المعبّأ ولا تكفي المنسَّق.
 * ودمج الرتبتين (`ScoredFoodItem`) أزال السبب من جذره: القوّة تصف **جودة
 * المطابقة** لا لغتها.
 */
const CURATED_STRENGTH = [1, 3, 5, 7, 9, 10] as const
const PACKAGED_STRENGTH = [0, 2, 4, 8, 6, 12] as const

/** أضعف قوّة ممكنة — تُستعمل حين تخرج درجةٌ خارج السلّم (لا يقع عمليًا). */
const WEAKEST_STRENGTH = 14

/**
 * أرضية قوّة السجل المعبّأ الذي **لم يجده إلا صيغة مخمَّنة** (مفرد لاتيني أو
 * بلا «ال») — انظر `QueryVariant.derived`.
 *
 * القيمة ١١ تضعه **دون كل مطابقة منسَّقة** (١…١٠) وفوق «مطابقة علامة» المعبّأة
 * (١٢). والقاعدة الحاكمة بكلمة واحدة: **التنسيق البشري يسبق التخمين البنيوي.**
 * كلمة مفتاحية كتبها إنسان («مكسرات ⇒ لوز») أوثق من بادئةٍ صادفها جذعٌ مقصوص
 * (`nut ⇒ nutella`).
 *
 * ولا يُلغى التخمين: السجل يبقى في القائمة ويصل المستخدم — يتأخّر فقط.
 */
export const PACKAGED_DERIVED_FLOOR = 11

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
  const ranked = [...best.values()]
    .sort((a, b) => (a.score - b.score) || ((CURATED_ORDER.get(a.item.id) ?? 0) - (CURATED_ORDER.get(b.item.id) ?? 0)))
    .slice(0, limit)
    .map(({ item, score }) => ({ item, source: 'curated' as const, strength: CURATED_STRENGTH[score] ?? WEAKEST_STRENGTH }))

  return [...ranked, ...brandFallback(query, ranked)]
}

/**
 * بديل العلامة العام — **ذيل القائمة لا رأسها** (`src/lib/food/brandCoverage.ts`).
 *
 * من كتب «كوكاكولا» ولا سجل مصدَّق لها عندنا يرى «مشروب غازي» في آخر النتائج بدل
 * شاشة فارغة — والاسم المعروض عامّ، فلا يُنسب رقم إلى علامة لم يأتِ منها.
 * ويبقى **أضعف من كل مطابقة**، فمنتج العلامة الحقيقي من الكتالوج المعبّأ يسبقه.
 */
function brandFallback(query: string, already: UnifiedFoodResult[]): UnifiedFoodResult[] {
  const ids = brandFallbackIds(query, normalizeProductKey)
  if (ids.length === 0) return []
  const present = new Set(already.map((r) => r.item.id))
  const out: UnifiedFoodResult[] = []
  for (const id of ids) {
    if (present.has(id)) continue
    const item = getFood(id)
    // معرّف لا يقابله صنف = خريطة بائتة. نتجاهله بصمت هنا، ويسقط الإثبات باسمه.
    if (item) out.push({ item, source: 'curated', strength: BRAND_FALLBACK_STRENGTH })
  }
  return out
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
  opts: { limit?: number; deepShards?: string[]; deep?: boolean; pageBudget?: number } = {},
): Promise<PackagedCandidate[]> {
  if (!catalog) return []
  const limit = opts.limit ?? PACKAGED_CANDIDATE_LIMIT
  // ═══ العمق مشتعل هنا، لا في الكتالوج ═══
  // الكتالوج آلة: يفعل ما يُطلب. **قرار «هل يستحق المستخدم الذيل الطويل» قرار
  // منتج**، وموضعه هذه الطبقة. وإطفاؤه ممكن صراحةً لمن أراد الطقم الساخن وحده.
  const deep = opts.deep ?? true
  const seen = new Set<string>()
  const hits: PackagedCandidate[] = []
  // الصيغ مرتّبة من الأصل إلى التخمين، وأوّل صيغة تجد السجل هي التي تصفه — فسجل
  // وجدته كتابة المستخدم لا يُوسَم مخمَّنًا لمجرّد أن التخمين وجده أيضًا.
  for (const variant of queryVariantsDetailed(query)) {
    for (const hit of await catalog.searchRanked(variant.value, { limit, deepShards: opts.deepShards, deep, pageBudget: opts.pageBudget })) {
      if (seen.has(hit.product.gtin)) continue
      seen.add(hit.product.gtin)
      hits.push({ ...hit, derivedOnly: variant.derived })
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
  packaged: readonly PackagedCandidate[],
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
    const base = PACKAGED_STRENGTH[tierRank(hit.tier)] ?? WEAKEST_STRENGTH
    // الأرضية ترفع الضعيف ولا تخفض القويّ: `Math.max` لا إسناد.
    // و**الباركود المطابق تمامًا مستثنى صراحةً**: مسح الباركود سلوك لا يُمَسّ، ولا
    // معنى لوصف تطابق GTIN تامّ بأنه «تخمين» أيًّا كانت الصيغة التي حملته.
    const floored = hit.derivedOnly && hit.tier !== 'gtin-exact' ? Math.max(base, PACKAGED_DERIVED_FLOOR) : base
    merged.push({ item, source: 'packaged', strength: floored })
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
  opts: { catalog?: Catalog | null; lang?: 'ar' | 'en'; limit?: number; deepShards?: string[]; deep?: boolean; pageBudget?: number } = {},
): Promise<UnifiedFoodResult[]> {
  const curated = rankCurated(query)
  const packaged = await rankPackaged(opts.catalog, query, { deepShards: opts.deepShards, deep: opts.deep, pageBudget: opts.pageBudget })
  return mergeUnified(curated, packaged, opts.lang ?? 'ar', opts.limit ?? DEFAULT_RESULT_LIMIT)
}
