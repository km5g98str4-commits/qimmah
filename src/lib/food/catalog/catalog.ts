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
 */
import { assignShard, shardName } from '../shardRouting'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { classifyGtin } from '../gtin'
import { createIdbCache, createMemoryCache, type BlobCache } from './idbCache'
import { classifyMatch, rankHits, type RankedHit } from './rank'
import type { CatalogManifest, CatalogProduct, CatalogStats, ShardIndex } from './types'

export interface CatalogDeps {
  /** جالب النصّ — يُحقن في الاختبار فلا يحتاج الإثبات شبكة. */
  fetchText: (url: string) => Promise<string | null>
  cache?: BlobCache
  /** جذر الأصول الساكنة. */
  baseUrl?: string
}

const DEFAULT_BASE = '/food'

interface LoadedShard {
  records: CatalogProduct[]
  byGtin: Map<string, CatalogProduct>
}

export class Catalog {
  private manifest: CatalogManifest | null = null
  private hot: CatalogProduct[] = []
  private hotByGtin = new Map<string, CatalogProduct>()
  private shards = new Map<string, LoadedShard>()
  private indexes = new Map<string, ShardIndex>()
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
    const hot = this.parse<CatalogProduct[]>(await this.load('hot-set.json'))
    if (hot) {
      this.hot = hot
      this.hotByGtin = new Map(hot.map((p) => [p.gtin, p]))
      this.stats.hotSetLoaded = true
      this.stats.hotSetCount = hot.length
    }
    this.recount()
  }

  private recount(): void {
    let n = this.hot.length
    for (const s of this.shards.values()) n += s.records.length
    this.stats.recordsInMemory = n
  }

  private async shardFor(gtin14: string): Promise<LoadedShard | null> {
    if (!this.manifest) return null
    const name = shardName(assignShard(gtin14, this.manifest.shard_count), this.manifest.shard_count)
    const already = this.shards.get(name)
    if (already) return already
    const records = this.parse<CatalogProduct[]>(await this.load(`shards/${name}.json`))
    if (!records) return null
    const loaded: LoadedShard = { records, byGtin: new Map(records.map((r) => [r.gtin, r])) }
    this.shards.set(name, loaded)
    this.stats.shardsFetched.push(name)
    this.recount()
    return loaded
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
    const idx = this.parse<ShardIndex>(await this.load(`shards/${name}.idx.json`))
    if (!idx) return null
    this.indexes.set(name, idx)
    this.stats.indexesFetched.push(name)
    return idx
  }

  private hotHits(q: string): RankedHit[] {
    const hits: RankedHit[] = []
    for (const p of this.hot) {
      const tier = classifyMatch(p, q, {
        name: normalizeProductKey(`${p.name_ar ?? ''} ${p.name_en ?? ''}`),
        brand: normalizeProductKey(`${p.brand_ar ?? ''} ${p.brand_en ?? ''}`),
      })
      if (tier) hits.push({ product: p, tier })
    }
    return hits
  }

  /**
   * بحث نصّي. الافتراضي **الطقم الساخن وحده** — يغطّي الحالة الشائعة بلا شبكة
   * وبلا شريحة. توسيع الذيل الطويل خيار صريح (`deepShards`) لا سلوك ضمني، فلا
   * يتحوّل كل حرف يكتبه المستخدم إلى جلب شبكة.
   */
  async search(query: string, opts: { limit?: number; deepShards?: string[] } = {}): Promise<CatalogProduct[]> {
    const q = normalizeProductKey(query)
    if (!q) return []
    const hits = this.hotHits(q)
    for (const name of opts.deepShards ?? []) {
      const idx = await this.indexFor(name)
      if (!idx) continue
      const positions = new Set<number>()
      for (const [token, pos] of Object.entries(idx.postings)) {
        if (token.startsWith(q)) for (const i of pos) positions.add(i)
      }
      if (positions.size === 0) continue
      const shard = this.shards.get(name)
      if (!shard) continue
      for (const i of positions) {
        const p = shard.records[i]
        if (!p) continue
        const tier = classifyMatch(p, q, {
          name: normalizeProductKey(`${p.name_ar ?? ''} ${p.name_en ?? ''}`),
          brand: normalizeProductKey(`${p.brand_ar ?? ''} ${p.brand_en ?? ''}`),
        })
        if (tier) hits.push({ product: p, tier })
      }
    }
    const ranked = rankHits(hits)
    return typeof opts.limit === 'number' ? ranked.slice(0, opts.limit) : ranked
  }

  getStats(): CatalogStats {
    return { ...this.stats, shardsFetched: [...this.stats.shardsFetched], indexesFetched: [...this.stats.indexesFetched] }
  }
}
