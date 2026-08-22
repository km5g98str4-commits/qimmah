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

/** حدّ العرض الافتراضي حين لا يسمّيه المستدعي. */
const DEFAULT_LIMIT = 12

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
   * ═══ ⚠️ لا توقّف مبكر — وهذا سطر كُتب بعد سقوط مقيس ═══
   * أوّل تنفيذ توقّف حالما بلغت المطابقات حدّ العرض: «وجدنا اثني عشر، يكفي».
   * وهو **يكسر الضمانة الوحيدة التي تستحقّ الإعلان**: أن كل سجل قابل للبلوغ.
   * سجلٌ في الصفحة الثانية من حزمته يصير غير قابل للوصول **بأي استعلام** إن
   * أشبعت الصفحة الأولى الحدّ — فينهار «٥٩٬٩٤١ قابلة للبلوغ» إلى رقم أصغر
   * مجهول، ولا يكشفه إلا عدّ حقيقي.
   *
   * فالميزانية تُقاس **بالصفحات لا بالمطابقات**: تُقرأ صفحات الحزمة حتى ميزانيتها
   * دائمًا، ثم يُرتَّب المجموع ويُقصّ. الكلفة معلَنة وأعلاها مقيس، والضمانة تصمد.
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
    const limit = opts.limit ?? DEFAULT_LIMIT
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
