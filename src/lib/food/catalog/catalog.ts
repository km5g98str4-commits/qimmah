/**
 * مصدر الكتالوج المشحون — الطبقتان ١ و٢ من عقد البحث (§٥).
 *
 * ═══ ما يحلّه ═══
 * ٥٩٬٩٤١ سجلًا في ٤١ شريحة (٧٤ ميغابايت خامًا). ثلاثة أشياء **لا يجوز** أن تحدث:
 *   ١. تحميل الكتالوج كاملًا (لا في الحزمة ولا وقت التشغيل).
 *   ٢. مسح كل السجلات مع كل ضغطة مفتاح.
 *   ٣. تمرير أيٍّ من هذا عبر `localStorage` — حصّتها ≈٥ ميغابايت وهي متزامنة.
 *
 * ═══ كيف ═══
 * • **الطقم الساخن** (٥٩٩ سجلًا سعوديًا/خليجيًا) يُجلب مرّة ويُخزَّن، فيعمل البحث
 *   الشائع بلا شبكة وبلا لمس أي شريحة.
 * • **بحث الباركود** توجيهٌ حسابي: `assignShard(gtin14)` ⇒ شريحة واحدة ⇒ مفتاح
 *   مباشر. **لا مسح، ولا جلب لأربعين شريحة.**
 * • **البحث النصّي** يستشير فهرس `token → مواضع` لكل شريحة. الفهرس أصغر من
 *   الشريحة بمراتب، والسجلات لا تُقرأ إلا للمواضع المطابقة.
 *
 * ═══ ما ليس هنا عمدًا ═══
 * بيانات المستخدم (ما أنشأه أو مسحه) تبقى في `features/products/store.ts` خلف
 * `safeStorage` — الطبقة الثالثة من العقد. هذا الملف **للقراءة فقط**: لا يكتب
 * بيانات مستخدم ولا يلمس مفاتيحها.
 *
 * ═══ الطريق الثالث: حزم البحث (`searchCorpus`) ═══
 * `deepShards` أدناه يشترط أن **يسمّي المستدعي شريحة**. والواجهة لا تملك اسمًا
 * تسمّيه: الشرائح موزَّعة بالـGTIN والمستخدم يكتب اسمًا. فبقي الذيل الطويل
 * مكتوبًا وغير قابل للوصول من أي شاشة — وهو ما تغلقه `SearchCorpus`: الكلمة
 * تعرف ملفّها (`kin` ⇒ حزمة واحدة)، فلا حاجة إلى معرفة الشريحة أصلًا.
 *
 * **`deepShards` يبقى كما هو** لمن يعرف شريحته (المسح، الإثباتات)، وحزم البحث
 * تُضاف بجانبه بـ`deep: true` — لا تستبدله.
 *
 * ═══ ⚠️ ما لا يدّعيه هذا الملف (§5) ═══
 * `longTailAvailability()` أدناه لا يقرأ رقمًا من بيانٍ ويعلنه؛ يقول ما **جُرِّب
 * ونجح** هذه اللحظة. غياب الأصول يبقى `unavailable` صريحة، لا صفرًا صامتًا.
 */
import { assignShard, shardName } from '../shardRouting'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { classifyGtin } from '../gtin'
import { createIdbCache, createMemoryCache, type BlobCache } from './idbCache'
import { rankRankedHits, tierForProduct, tierRank, type RankedHit } from './rank'
import { SearchCorpus, type CorpusQueryTrace, type CorpusStats } from './searchCorpus'
import type { CatalogManifest, CatalogProduct, CatalogStats, HotSetPayload, ShardIndex, ShardPayload } from './types'

export interface CatalogDeps {
  /** جالب النصّ — يُحقن في الاختبار فلا يحتاج الإثبات شبكة. */
  fetchText: (url: string) => Promise<string | null>
  cache?: BlobCache
  /** جذر الأصول الساكنة. */
  baseUrl?: string
}

const DEFAULT_BASE = '/food'

/**
 * أقصى عدد حمولات شرائح يجوز لاستعلام نصّي واحد أن يجلبها.
 * الحمولة أثقل من فهرسها بمراتب، والاستعلام الواحد لا يستحق تنزيل الذيل كلّه.
 */
export const DEFAULT_DEEP_PAYLOAD_BUDGET = 2

interface LoadedShard {
  byGtin: Map<string, CatalogProduct>
  count: number
}

/**
 * حالة الذيل الطويل كما **يعرفها التطبيق فعلًا** — لا كما يعلنها البيان.
 *
 * البيان يعلن ٥٩٬٩٤١ سجلًا في ٤١ شريحة. الشرائح **غير مرفوعة** اليوم، فكل طلب لها
 * يعود ٤٠٤. الفارق بين الرقمين هو بالضبط ما لا يجوز لأي سطح أن يعد به:
 *   • `declaredRecords` — ما يقوله البيان. **رقم بناء لا رقم إنتاج.**
 *   • `searchableRecords` — ما يمكن البحث فيه هذه اللحظة: الطقم الساخن + كل شريحة
 *     نجح تحميلها. **هذا وحده رقم صادق.**
 *   • `verdict` — لا يُخمَّن: يبقى `unproven` حتى **تُجرَّب** شريحة أو فهرس فعلًا.
 *
 * §5 من الميثاق: حين لا نعرف، نقولها صريحة. «لم نجرّب» ليست «متاح».
 */
export interface LongTailAvailability {
  /** مجموع ما يعلنه البيان في الشرائح — بناءً لا إنتاجًا. */
  declaredRecords: number
  /** عدد الشرائح التي يعلنها البيان. */
  declaredShards: number
  /**
   * ما يمكن **بلوغه بالبحث** الآن حقًّا.
   *
   * ⚠️ ليس «ما هو محمَّل في الذاكرة». حزم البحث تجعل كل سجل بالغًا بكلمة من
   * كلماته بطلب واحد، فالمحمَّل في الذاكرة صار قياسًا للتكلفة لا للتغطية.
   * وحين لا يُحمَّل الدليل يعود الرقم إلى ما في الذاكرة فعلًا — لا ادّعاء.
   */
  searchableRecords: number
  /** ما يعلنه دليل الحزم — صفر ما لم يُحمَّل الدليل فعلًا. */
  corpusRecords: number
  /** عدد حزم البحث المحمَّلة في الدليل. */
  corpusBuckets: number
  /** كم محاولة جلب ذيلٍ طويل جرت (حمولة أو فهرس). */
  attempts: number
  /** كم منها فشلت (٤٠٤ أو JSON تالف). */
  failures: number
  /**
   * `unproven` لم تُجرَّب بعد · `available` نجحت محاولة واحدة على الأقل ·
   * `unavailable` جُرِّبت وفشلت كلّها.
   */
  verdict: 'unproven' | 'available' | 'unavailable'
}

export interface CatalogSearchOptions {
  limit?: number
  /** شرائح يسمّيها المستدعي (مسح باركود · إثبات) — يبقى كما كان. */
  deepShards?: string[]
  maxShardPayloads?: number
  /**
   * تشغيل حزم البحث بالكلمة. **هذا ما يصل المستخدم إلى الذيل الطويل** بلا أن
   * يعرف شريحة. مطفأ افتراضيًا كي لا يتغيّر عقد أي مستدعٍ قائم بلا علمه؛ طبقة
   * الاتحاد (`unifiedSearch`) هي التي تشعله، فهي موضع قرار المنتج.
   */
  deep?: boolean
  /** أقصى صفحات حزمة لاستعلام واحد (افتراضها `DEFAULT_BUCKET_PAGE_BUDGET`). */
  pageBudget?: number
}

export class Catalog {
  private manifest: CatalogManifest | null = null
  private hot: HotSetPayload | null = null
  private hotByGtin = new Map<string, CatalogProduct>()
  private shards = new Map<string, LoadedShard>()
  private indexes = new Map<string, ShardIndex>()
  /** محاولات الذيل الطويل ونتائجها — أساس `longTailAvailability`، لا تخمين. */
  private longTail = { attempts: 0, failures: 0 }
  private stats: CatalogStats = {
    hotSetLoaded: false, hotSetCount: 0, shardsFetched: [], indexesFetched: [],
    networkFetches: 0, networkBytes: 0, cacheHits: 0, cacheKind: 'memory', recordsInMemory: 0,
  }

  /**
   * حزم البحث بالكلمة — **الطريق الوحيد الذي يسلكه المستخدم** إلى الذيل الطويل.
   * تشترك مع الشرائح في `load` نفسها: ذاكرة مؤقتة واحدة وعدّاد بايتات واحد.
   */
  private corpus = new SearchCorpus((path) => this.load(path))

  private constructor(private deps: Required<Pick<CatalogDeps, 'fetchText' | 'baseUrl'>> & { cache: BlobCache }) {
    this.stats.cacheKind = deps.cache.kind
  }

  static async create(deps: CatalogDeps): Promise<Catalog> {
    const cache = deps.cache ?? (await createIdbCache().catch(() => createMemoryCache()))
    return new Catalog({ fetchText: deps.fetchText, baseUrl: deps.baseUrl ?? DEFAULT_BASE, cache })
  }

  /** جلب نصّي مارٌّ بالذاكرة المؤقتة. لا يرمي: التعذّر يعني «غير متاح». */
  private async load(path: string): Promise<string | null> {
    const cached = await this.deps.cache.get(path)
    if (cached !== null) { this.stats.cacheHits += 1; return cached }
    const text = await this.deps.fetchText(`${this.deps.baseUrl}/${path}`)
    if (text === null) return null
    this.stats.networkFetches += 1
    // بايتات UTF-8 لا محارف: العربية محرفان إلى ثلاثة للحرف، والفرق ليس تجميليًا.
    this.stats.networkBytes += new TextEncoder().encode(text).length
    await this.deps.cache.put(path, text)
    return text
  }

  private parse<T>(text: string | null): T | null {
    if (text === null) return null
    try { return JSON.parse(text) as T } catch { return null }
  }

  /** يهيّئ البيان والطقم الساخن. **لا يلمس أي شريحة.** */
  async init(): Promise<void> {
    this.manifest = this.parse<CatalogManifest>(await this.load('manifest.json'))
    const hot = this.parse<HotSetPayload>(await this.load('hot-set.json'))
    if (hot?.records && hot.order) {
      this.hot = hot
      this.hotByGtin = new Map(Object.entries(hot.records))
      this.stats.hotSetLoaded = true
      this.stats.hotSetCount = hot.order.length
    }
    this.recount()
  }

  private recount(): void {
    let n = this.hotByGtin.size
    for (const s of this.shards.values()) n += s.count
    this.stats.recordsInMemory = n
  }

  /**
   * تحميل حمولة شريحة **بالاسم**. كان هذا المسار موجودًا داخل `shardFor(gtin14)`
   * وحده، فلم يملك البحث النصّي طريقًا إلى أي حمولة — وهو أصل العطل B2.
   */
  private async shardByName(name: string): Promise<LoadedShard | null> {
    const already = this.shards.get(name)
    if (already) return already
    this.longTail.attempts += 1
    const payload = this.parse<ShardPayload>(await this.load(`shards/${name}.json`))
    if (!payload?.records) { this.longTail.failures += 1; return null }
    const loaded: LoadedShard = { byGtin: new Map(Object.entries(payload.records)), count: payload.count }
    this.shards.set(name, loaded)
    this.stats.shardsFetched.push(name)
    this.recount()
    return loaded
  }

  private async shardFor(gtin14: string): Promise<LoadedShard | null> {
    if (!this.manifest) return null
    const name = shardName(assignShard(gtin14, this.manifest.shard_count), this.manifest.shard_count)
    return this.shardByName(name)
  }

  /**
   * بحث الباركود — **مسار مباشر O(1)**.
   * الطقم الساخن أولًا (بلا شبكة)، ثم شريحة **واحدة** يحسبها التوجيه.
   */
  async lookupByGtin(raw: string): Promise<CatalogProduct | null> {
    // نفس مُصنِّف GTIN الذي بُني به الفهرس — لا تطبيع ثانٍ يتباعد عنه.
    const parsed = classifyGtin(raw)
    if (!parsed.ok) return null
    const gtin14 = parsed.gtin14
    const hot = this.hotByGtin.get(gtin14)
    if (hot) return hot
    const shard = await this.shardFor(gtin14)
    return shard?.byGtin.get(gtin14) ?? null
  }

  private async indexFor(name: string): Promise<ShardIndex | null> {
    const already = this.indexes.get(name)
    if (already) return already
    this.longTail.attempts += 1
    const idx = this.parse<ShardIndex>(await this.load(`shards/${name}.idx.json`))
    if (!idx) { this.longTail.failures += 1; return null }
    this.indexes.set(name, idx)
    this.stats.indexesFetched.push(name)
    return idx
  }

  /** مطابقة سجل واحد — نفس التطبيع الذي بُني به الفهرس. */
  private tierFor(p: CatalogProduct, q: string) {
    return tierForProduct(p, q)
  }

  /**
   * مرشّحو الطقم الساخن **من الفهرس لا بمسح خطّي**.
   * ٥٩٩ سجلًا صغيرة، لكن المسح الخطّي مع كل ضغطة مفتاح عادة سيّئة تكبر مع البيانات.
   */
  private hotHits(q: string): RankedHit[] {
    if (!this.hot) return []
    const positions = new Set<number>()
    for (const [token, pos] of Object.entries(this.hot.tokens)) {
      if (token.startsWith(q)) for (const i of pos) positions.add(i)
    }
    const hits: RankedHit[] = []
    for (const i of positions) {
      const gtin = this.hot.order[i]
      const p = gtin ? this.hotByGtin.get(gtin) : undefined
      if (!p) continue
      const tier = this.tierFor(p, q)
      if (tier) hits.push({ product: p, tier })
    }
    return hits
  }

  /**
   * بحث نصّي **مع رتبة كل مطابقة** — الرتبة هي ما تحتاجه طبقة الاتحاد فوقنا كي
   * ترتّب المعبّأ مع المنسَّق في قائمة واحدة. `search` أدناه غلاف يسقطها.
   *
   * الافتراضي **الطقم الساخن وحده**: يغطّي الحالة الشائعة بلا شبكة وبلا شريحة.
   * توسيع الذيل الطويل خيار صريح (`deepShards`) لا سلوك ضمني، فلا يتحوّل كل حرف
   * يكتبه المستخدم إلى جلب شبكة.
   *
   * ═══ الحدّان اللذان يبقيان العمق كسولًا ═══
   * ١. **قائمة المستدعي** — لا يُمسح إلا ما سُمّي في `deepShards`. لا مسح ضمنيًّا
   *    لأربعين شريحة.
   * ٢. **ميزانية الحمولات** (`maxShardPayloads`، افتراضها ٢) — الفهرس رخيص
   *    والحمولة ليست كذلك (~١٫٨ ميغابايت للشريحة خامًا مقابل ~٦٦ كيلوبايت
   *    للفهرس). فلا تُجلب حمولة **إلا لشريحة أعطى فهرسها مواضع مطابقة فعلًا**،
   *    وبحدٍّ أعلى معلَن. الفهارس التي لا تطابق لا تكلّف حمولة أصلًا.
   */
  async searchRanked(query: string, opts: CatalogSearchOptions = {}): Promise<RankedHit[]> {
    const q = normalizeProductKey(query)
    if (!q) return []
    const hits = this.hotHits(q)
    const budget = opts.maxShardPayloads ?? DEFAULT_DEEP_PAYLOAD_BUDGET
    let payloadsLoaded = 0
    for (const name of opts.deepShards ?? []) {
      if (payloadsLoaded >= budget) break
      const idx = await this.indexFor(name)
      if (!idx) continue
      const positions = new Set<number>()
      for (const [token, pos] of Object.entries(idx.tokens)) {
        if (token.startsWith(q)) for (const i of pos) positions.add(i)
      }
      if (positions.size === 0) continue
      // ⚠️ B2 — كان هنا `this.shards.get(name)`: قراءةُ خريطةٍ لا يملؤها إلا مسار
      // الباركود، فكان البحث العميق يجلب الفهرس ثم يخرج صفر اليدين دائمًا.
      // الحمولة تُطلب الآن فعلًا، وبعد أن أثبت الفهرس أن فيها ما يطابق.
      //
      // الميزانية تُحاسِب **الجلب** لا القراءة: شريحة حاضرة في الذاكرة أصلًا
      // (جلبها مسحُ باركود سابق) لا تكلّف بايتًا، فلا يُعقل أن تستهلك حصّة.
      const resident = this.shards.has(name)
      const shard = await this.shardByName(name)
      if (!shard) continue
      if (!resident) payloadsLoaded += 1
      for (const i of positions) {
        const gtin = idx.order[i]
        const p = gtin ? shard.byGtin.get(gtin) : undefined
        if (!p) continue
        const tier = this.tierFor(p, q)
        if (tier) hits.push({ product: p, tier })
      }
    }
    // ═══ حزم البحث — الطريق الذي لا يحتاج المستخدم أن يعرف شريحة ═══
    if (opts.deep) {
      const { hits: deep, trace } = await this.corpus.searchRanked(query, {
        limit: opts.limit,
        pageBudget: opts.pageBudget,
      })
      this.lastCorpusTrace = trace
      // محاولة ذيلٍ طويل **مسمّاة**: الحكم أدناه يقوم عليها لا على تخمين.
      if (trace.plan.reason !== 'too-short') {
        this.longTail.attempts += 1
        if (trace.plan.reason === 'no-directory') this.longTail.failures += 1
      }
      for (const hit of deep) hits.push(hit)
    }

    // ═══ إزالة التكرار — الطقم الساخن **مُضمَّن في** الشرائح والحزم معًا ═══
    // ٥٩٩ سجل الطقم الساخن كلّها موجودة في الشرائح (مقيس: ٥٩٩/٥٩٩). فبلا هذا
    // الحسم يظهر السجل الواحد مرّتين حالما يُوصل مصدر ثانٍ — تكرارٌ يراه المستخدم.
    // الأقوى يفوز: الرتبة الأصغر رقمًا.
    const best = new Map<string, RankedHit>()
    for (const hit of hits) {
      const prior = best.get(hit.product.gtin)
      if (!prior || tierRank(hit.tier) < tierRank(prior.tier)) best.set(hit.product.gtin, hit)
    }
    const ranked = rankRankedHits([...best.values()])
    return typeof opts.limit === 'number' ? ranked.slice(0, opts.limit) : ranked
  }

  /** أثر آخر استعلام حزم — للإثبات والتشخيص، لا للواجهة. */
  lastCorpusTrace: CorpusQueryTrace | null = null

  /** إحصاء حزم البحث — كم صفحة قُرئت وأي دليل حُمِّل. */
  corpusStats(): CorpusStats {
    return this.corpus.stats()
  }

  /** نفس البحث بالسجلات المجرّدة — الواجهة القائمة، بلا تغيير في عقدها. */
  async search(query: string, opts: CatalogSearchOptions = {}): Promise<CatalogProduct[]> {
    return (await this.searchRanked(query, opts)).map((h) => h.product)
  }

  getStats(): CatalogStats {
    return { ...this.stats, shardsFetched: [...this.stats.shardsFetched], indexesFetched: [...this.stats.indexesFetched] }
  }

  /**
   * **ما يجوز للتطبيق أن يعد به الآن.** أي سطح يريد ذكر حجم قاعدة الطعام يقرأ
   * `searchableRecords` من هنا — لا `declaredRecords`، ولا رقمًا مكتوبًا في نصّ.
   *
   * والفرق بين `declaredRecords` و`searchableRecords` هو بالضبط ما لا يجوز لأي
   * سطح أن يعد به: الأول ما يقوله البيان، والثاني ما جُرِّب فنجح. حين يتساويان
   * صار الوعد مستحقًّا؛ وحين يفترقان تُعرض الحقيقة الصغرى لا الكبرى.
   */
  longTailAvailability(): LongTailAvailability {
    const declaredShards = this.manifest?.shards?.length ?? 0
    const declaredRecords = (this.manifest?.shards ?? []).reduce((a, s) => a + (s.count ?? 0), 0)
    const { attempts, failures } = this.longTail
    const verdict = attempts === 0 ? 'unproven' : failures < attempts ? 'available' : 'unavailable'
    const corpus = this.corpus.stats()
    return {
      declaredRecords,
      declaredShards,
      // الطقم الساخن **جزء من** الحزم (٥٩٩/٥٩٩ مقيسة)، فلا جمع يضاعف سجلًا.
      searchableRecords: Math.max(corpus.directoryRecords, this.stats.recordsInMemory),
      corpusRecords: corpus.directoryRecords,
      corpusBuckets: corpus.buckets,
      attempts,
      failures,
      verdict,
    }
  }
}
