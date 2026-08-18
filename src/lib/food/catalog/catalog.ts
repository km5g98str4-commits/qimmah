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
 * ═══ ⚠️ حالة الشرائح اليوم — صدق قبل طمأنينة (§5) ═══
 * **الشرائح الأربعون لا تُخدَم حاليًا.** `public/food/` يحمل البيان والطقم الساخن
 * فقط؛ كل طلب `shards/*.json` يعود ٤٠٤ فيصير `null` بلا رمي. فالمشحون فعلًا
 * **٥٩٩ سجلًا معبّأً** لا ستون ألفًا، والذيل الطويل تبعية رفع لا وعد قائم
 * (`docs/execution/qimmah-postweb/food/DEPENDENCIES.md` F-2). الكود أدناه صحيح
 * **حين** تُرفع الشرائح — ولا يدّعي أنها مرفوعة.
 */
import { assignShard, shardName } from '../shardRouting'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { classifyGtin } from '../gtin'
import { createIdbCache, createMemoryCache, type BlobCache } from './idbCache'
import { classifyMatch, rankRankedHits, type RankedHit } from './rank'
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
  /** ما يمكن البحث فيه الآن حقًّا: الطقم الساخن + الشرائح المحمَّلة. */
  searchableRecords: number
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
    networkFetches: 0, cacheHits: 0, cacheKind: 'memory', recordsInMemory: 0,
  }

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
    return classifyMatch(p, q, {
      name: normalizeProductKey(`${p.name_ar ?? ''} ${p.name_en ?? ''}`),
      brand: normalizeProductKey(`${p.brand_ar ?? ''} ${p.brand_en ?? ''}`),
    })
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
  async searchRanked(
    query: string,
    opts: { limit?: number; deepShards?: string[]; maxShardPayloads?: number } = {},
  ): Promise<RankedHit[]> {
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
    const ranked = rankRankedHits(hits)
    return typeof opts.limit === 'number' ? ranked.slice(0, opts.limit) : ranked
  }

  /** نفس البحث بالسجلات المجرّدة — الواجهة القائمة، بلا تغيير في عقدها. */
  async search(query: string, opts: { limit?: number; deepShards?: string[]; maxShardPayloads?: number } = {}): Promise<CatalogProduct[]> {
    return (await this.searchRanked(query, opts)).map((h) => h.product)
  }

  getStats(): CatalogStats {
    return { ...this.stats, shardsFetched: [...this.stats.shardsFetched], indexesFetched: [...this.stats.indexesFetched] }
  }

  /**
   * **ما يجوز للتطبيق أن يعد به الآن.** أي سطح يريد ذكر حجم قاعدة الطعام يقرأ
   * `searchableRecords` من هنا — لا `declaredRecords`، ولا رقمًا مكتوبًا في نصّ.
   *
   * الشرائح غير مرفوعة اليوم، فالفرق بين الرقمين ٥٩٬٩٤١ سجلًا. عرض الرقم المعلَن
   * على المستخدم يجعل الواجهة تعد بستين ألفًا وتسلّم ٥٩٩ — وهو بالضبط ما يمنعه §5.
   */
  longTailAvailability(): LongTailAvailability {
    const declaredShards = this.manifest?.shards?.length ?? 0
    const declaredRecords = (this.manifest?.shards ?? []).reduce((a, s) => a + (s.count ?? 0), 0)
    const { attempts, failures } = this.longTail
    const verdict = attempts === 0 ? 'unproven' : failures < attempts ? 'available' : 'unavailable'
    return {
      declaredRecords,
      declaredShards,
      searchableRecords: this.stats.recordsInMemory,
      attempts,
      failures,
      verdict,
    }
  }
}
