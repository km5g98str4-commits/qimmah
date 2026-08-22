/**
 * وقت تشغيل حزم البحث — **الطريق الذي يسلكه المستخدم إلى الذيل الطويل**.
 *
 * ═══ الفرق عن `deepShards` ═══
 * المسار القديم يشترط أن **يسمّي المستدعي الشرائح**. والواجهة لا تعرف شريحةً
 * تسمّيها — الشرائح موزَّعة بالـGTIN والمستخدم يكتب اسمًا. فبقي الذيل الطويل
 * مكتوبًا على القرص وغير قابل للوصول من أي شاشة.
 *
 * هنا العكس تمامًا: **الكلمة تعرف ملفّها**. `kinder` ⇒ الحزمة `kin` ⇒ طلب واحد.
 *
 * ═══ ثلاث ضمانات معلَنة ═══
 * ١. **صفرٌ بلا شبكة:** كلمة طولها ≥٣ لا مفتاح لها في الدليل ⇒ `absent` فورًا.
 *    الدليل يعرف كل بادئات الستين ألفًا، فالغياب استنتاج لا تخمين.
 * ٢. **لا ادّعاء عند الجهل:** تعذّر الدليل ⇒ `no-directory`، لا «صفر نتائج».
 * ٣. **ميزانية معلَنة:** الاستعلام يقرأ صفحات الحزمة المختارة حتى يكفيه العدد أو
 *    تنفد ميزانيته — لا يجرّ الحزمة كلّها لأنه احتاج اثني عشر سطرًا.
 */
import {
  DEFAULT_BUCKET_PAGE_BUDGET, DIRECTORY_PATH, bucketPagePath, decodeBucketPage,
  pageCount, planBucketQuery,
  type BucketDirectory, type BucketPage, type BucketQueryPlan,
} from '../searchBuckets'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { rankRankedHits, tierForProduct, type RankedHit } from './rank'
import type { CatalogProduct } from './types'

/** ما جرى فعلًا في استعلام واحد — أساس أي رقم يُعلَن، لا تقدير. */
export interface CorpusQueryTrace {
  plan: BucketQueryPlan
  /** كم صفحة قُرئت (شبكةً أو من الذاكرة المؤقتة). */
  pagesRead: number
  /** كم صفحة تحملها الحزمة كلّها — الفرق هو ما قصّته الميزانية. */
  pagesAvailable: number
  /** عدد السجلات التي فُحصت فعلًا. */
  recordsScanned: number
}

export interface CorpusStats {
  directoryLoaded: boolean
  /** عدد الحزم في الدليل. */
  buckets: number
  /** مجموع السجلات كما يعلنه الدليل. */
  directoryRecords: number
  /** مسارات الصفحات التي قُرئت في هذه الجلسة. */
  pagesFetched: string[]
}

const MIN_HITS_BEFORE_STOP = 12

export class SearchCorpus {
  private directory: BucketDirectory | null = null
  private directoryTried = false
  private pages = new Map<string, CatalogProduct[]>()
  private pagesFetched: string[] = []

  /** `load` يملكه الكتالوج: هو صاحب الذاكرة المؤقتة وعدّاد البايتات. */
  constructor(private load: (path: string) => Promise<string | null>) {}

  /** يجلب الدليل مرّة واحدة. الفشل يُسجَّل ولا يُعاد المحاولة كل ضغطة مفتاح. */
  async ensureDirectory(): Promise<BucketDirectory | null> {
    if (this.directoryTried) return this.directory
    this.directoryTried = true
    const text = await this.load(DIRECTORY_PATH)
    if (text === null) return null
    try {
      const parsed = JSON.parse(text) as BucketDirectory
      if (parsed && typeof parsed === 'object' && parsed.buckets) this.directory = parsed
    } catch { /* دليل تالف = لا دليل */ }
    return this.directory
  }

  private async page(key: string, index: number): Promise<CatalogProduct[] | null> {
    const path = bucketPagePath(key, index)
    const already = this.pages.get(path)
    if (already) return already
    const text = await this.load(path)
    if (text === null) return null
    let rows: CatalogProduct[]
    try {
      rows = decodeBucketPage(JSON.parse(text) as BucketPage) as unknown as CatalogProduct[]
    } catch { return null }
    this.pages.set(path, rows)
    this.pagesFetched.push(path)
    return rows
  }

  /**
   * بحث الذيل الطويل. يعيد الرتب لا السجلات المجرّدة — طبقة الاتحاد تحتاج القوّة.
   *
   * التوقّف المبكر مقصود: صفحات الحزمة مرتّبة **سعوديًا أولًا ثم بالاسم الأقصر**،
   * فأوّلها أقربها إلى مطابقة تامّة أو بادئة. من وجد اثني عشر مرشّحًا في الصفحة
   * الأولى لا يحتاج أن ينزّل البقية ليعرض ثمانية عشر سطرًا.
   */
  async searchRanked(
    query: string,
    opts: { limit?: number; pageBudget?: number } = {},
  ): Promise<{ hits: RankedHit[]; trace: CorpusQueryTrace }> {
    const directory = await this.ensureDirectory()
    const plan = planBucketQuery(query, directory)
    const empty: CorpusQueryTrace = { plan, pagesRead: 0, pagesAvailable: 0, recordsScanned: 0 }
    if (plan.reason !== 'ok' || plan.key === null || !directory) return { hits: [], trace: empty }

    const q = normalizeProductKey(query)
    const budget = Math.max(1, opts.pageBudget ?? DEFAULT_BUCKET_PAGE_BUDGET)
    const limit = opts.limit ?? MIN_HITS_BEFORE_STOP
    const available = pageCount(plan.records, directory.page_size)
    const hits: RankedHit[] = []
    let pagesRead = 0
    let recordsScanned = 0

    for (let i = 0; i < available && pagesRead < budget; i++) {
      const rows = await this.page(plan.key, i)
      if (!rows) break
      pagesRead += 1
      recordsScanned += rows.length
      for (const product of rows) {
        const tier = tierForProduct(product, q)
        if (tier) hits.push({ product, tier })
      }
      if (hits.length >= limit) break
    }

    return {
      hits: rankRankedHits(hits).slice(0, limit),
      trace: { plan, pagesRead, pagesAvailable: available, recordsScanned },
    }
  }

  stats(): CorpusStats {
    return {
      directoryLoaded: this.directory !== null,
      buckets: this.directory ? Object.keys(this.directory.buckets).length : 0,
      directoryRecords: this.directory?.total_records ?? 0,
      pagesFetched: [...this.pagesFetched],
    }
  }
}
