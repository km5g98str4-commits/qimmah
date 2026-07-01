// Seed منتجات السوق السعودي — يجلب دفعة من Open Food Facts (facet: السعودية) مرّة واحدة
// ويخزّنها محليًا (عبر upsert) كي تُحسم عمليات المسح الشائعة فورًا دون انتظار الشبكة لاحقًا.
//
// السقف: صفحة بحجم 100 × 3 صفحات كحدّ أقصى = 300 منتج كحد أعلى للدفعة الواحدة (يتوقف مبكرًا
// إن رجعت صفحة فارغة). هذا يبقي حجم بيانات localStorage معقولًا لهاتف متوسط.

import { fetchSaudiOffPage } from './offSource'
import { upsert } from './productDb'

const SEED_DONE_KEY = 'qimmah:products:saudi-seed-done:v1'
const PAGE_SIZE = 100
const MAX_PAGES = 3

export interface SeedResult {
  /** true إذا نُفِّذت هذه المرة فعليًا (لم تُنفَّذ من قبل على هذا الجهاز). */
  ran: boolean
  imported: number
  pagesFetched: number
  /** رسالة الخطأ إن تعذّر الاتصال — في هذه الحالة لا تُعلَّم seed كمكتملة، وتُعاد المحاولة لاحقًا. */
  error?: string
}

function alreadySeeded(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(SEED_DONE_KEY) !== null
  } catch {
    return false
  }
}

function markSeeded() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SEED_DONE_KEY, String(Date.now()))
  } catch {
    /* تجاهل */
  }
}

/**
 * يزرع منتجات السوق السعودي في القاعدة المحلية مرّة واحدة لكل جهاز (بوابة localStorage).
 * مرّر force:true لإعادة المزامنة يدويًا (مثلًا من إعدادات المطوّر) رغم وجود العلامة.
 */
export async function seedSaudiProducts(options: { force?: boolean } = {}): Promise<SeedResult> {
  if (!options.force && alreadySeeded()) {
    return { ran: false, imported: 0, pagesFetched: 0 }
  }

  let imported = 0
  let pagesFetched = 0
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const items = await fetchSaudiOffPage(page, PAGE_SIZE)
      pagesFetched++
      if (items.length === 0) break
      for (const item of items) {
        upsert(item)
        imported++
      }
      if (items.length < PAGE_SIZE) break // آخر صفحة متاحة
    }
  } catch (err) {
    // فشل شبكة حقيقي (لا "نهاية نتائج") — لا نُعلَّم seed كمكتمل حتى تُعاد المحاولة لاحقًا.
    return { ran: true, imported, pagesFetched, error: err instanceof Error ? err.message : 'network error' }
  }

  markSeeded()
  return { ran: true, imported, pagesFetched }
}
