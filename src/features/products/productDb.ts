// قاعدة بيانات المنتجات (باركود) — placeholder مؤقت.
//
// ملاحظة تكامل: هذا الملف يُفترض أن يكون ملكية Agent 1 (P8) ويحتوي التخزين الفعلي
// لقاعدة بيانات المنتجات (dedup، سجل المصادر، لوحة المراجعة). لم يكن مدمَجًا بعد وقت
// كتابة P8 A2، لذا عرّفنا هنا نسخة عاملة كاملة تطابق الواجهة الموثّقة في مهمة P8 A2
// (StoredProduct / ProductSource / upsert / resolveBarcode) ليبني عليها offSource.ts
// و saudiSeed.ts. عند دمج ملف Agent 1 الحقيقي: احذف هذا الملف واستبدل الاستيرادات
// في offSource.ts و saudiSeed.ts بملف Agent 1، مع نقل منطق الدمج/كشف الفروقات أدناه
// إن لم يكن موجودًا هناك.

export type ProductSource = 'open_food_facts' | 'manual' | 'user_submitted'

export type ProductStatus = 'imported' | 'pending_review' | 'verified' | 'rejected'

/** قيم غذائية لكل 100غ/100مل — الأساس الموحّد لأي منتج بغضّ النظر عن حجم العبوة. */
export interface ProductMacros {
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

/** نسخة بديلة من القيم عند تعارض بين مصدرين — تُعرض في لوحة مراجعة Agent 4 دون حذف أيّهما. */
export interface AlternateProductValues extends ProductMacros {
  sourceName: ProductSource
  fetchedAt: number
}

export interface StoredProduct extends ProductMacros {
  barcode: string
  name: string
  brands?: string
  imageUrl?: string
  servingSize?: string
  sourceName: ProductSource
  sourceUrl?: string
  status: ProductStatus
  updatedAt: number
  alternateValues?: AlternateProductValues
}

type BarcodeFetcher = (barcode: string) => Promise<StoredProduct | null>

const STORE_KEY = 'qimmah:products:v1'
const fetchers: { name: ProductSource; fetch: BarcodeFetcher }[] = []

type Store = Record<string, StoredProduct>

function readStore(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* تجاهل — التخزين قد يكون ممتلئًا، ليس حرجًا */
  }
}

/** يُسجَّل جالب باركود جديد (مثل OFF) في سلسلة الحلّ التي يستخدمها resolveBarcode. */
export function registerBarcodeFetcher(name: ProductSource, fetch: BarcodeFetcher) {
  const existing = fetchers.findIndex((f) => f.name === name)
  if (existing >= 0) fetchers[existing] = { name, fetch }
  else fetchers.push({ name, fetch })
}

function completenessScore(p: ProductMacros & { servingSize?: string; imageUrl?: string }): number {
  let score = 0
  if (p.caloriesPer100g > 0) score += 1
  if (p.proteinPer100g > 0) score += 1
  if (p.carbsPer100g > 0) score += 1
  if (p.fatPer100g > 0) score += 1
  if (p.servingSize) score += 1
  if (p.imageUrl) score += 1
  return score
}

/** فرق نسبي > 15% في السعرات أو أي عنصر غذائي أساسي يُعدّ فرقًا جوهريًا بين مصدرين. */
function isMaterialDifference(a: ProductMacros, b: ProductMacros): boolean {
  const relDiff = (x: number, y: number) => {
    const base = Math.max(x, y, 1)
    return Math.abs(x - y) / base
  }
  return (
    relDiff(a.caloriesPer100g, b.caloriesPer100g) > 0.15 ||
    relDiff(a.proteinPer100g, b.proteinPer100g) > 0.15 ||
    relDiff(a.carbsPer100g, b.carbsPer100g) > 0.15 ||
    relDiff(a.fatPer100g, b.fatPer100g) > 0.15
  )
}

/**
 * يدمج منتجًا جديدًا في القاعدة المحلية. عند وجود باركود مطابق مسبقًا بقيم غذائية مختلفة
 * جوهريًا، تُعلَّم الحالة pending_review وتُحفَظ القيم الأخرى في alternateValues بدل الكتابة
 * فوقها صامتًا — النسخة المعتمدة هي الأحدث/الأكمل (completenessScore ثم updatedAt).
 */
export function upsert(incoming: StoredProduct): StoredProduct {
  const store = readStore()
  const existing = store[incoming.barcode]

  if (!existing) {
    store[incoming.barcode] = incoming
    writeStore(store)
    return incoming
  }

  const differs = isMaterialDifference(existing, incoming)
  const incomingIsBetter =
    completenessScore(incoming) > completenessScore(existing) ||
    (completenessScore(incoming) === completenessScore(existing) && incoming.updatedAt >= existing.updatedAt)

  const primary = incomingIsBetter ? incoming : existing
  const secondary = incomingIsBetter ? existing : incoming

  const merged: StoredProduct = {
    ...primary,
    status: differs ? 'pending_review' : primary.status,
    alternateValues: differs
      ? {
          sourceName: secondary.sourceName,
          caloriesPer100g: secondary.caloriesPer100g,
          proteinPer100g: secondary.proteinPer100g,
          carbsPer100g: secondary.carbsPer100g,
          fatPer100g: secondary.fatPer100g,
          fetchedAt: secondary.updatedAt,
        }
      : primary.alternateValues,
  }

  store[incoming.barcode] = merged
  writeStore(store)
  return merged
}

export function getProduct(barcode: string): StoredProduct | null {
  return readStore()[barcode] ?? null
}

export function getAllProducts(): StoredProduct[] {
  return Object.values(readStore())
}

/** لائحة المنتجات التي تنتظر مراجعة (فروقات جوهرية بين مصدرين) — تُستهلك من لوحة Agent 4. */
export function listPendingReview(): StoredProduct[] {
  return getAllProducts().filter((p) => p.status === 'pending_review')
}

/**
 * يحلّ باركودًا: من القاعدة المحلية أولًا، وإلا عبر سلسلة الجالبين المسجَّلين (مثل OFF)
 * بالترتيب، مع حفظ أول نتيجة ناجحة في القاعدة المحلية عبر upsert.
 */
export async function resolveBarcode(barcode: string): Promise<StoredProduct | null> {
  const local = getProduct(barcode)
  if (local) return local

  for (const { fetch } of fetchers) {
    const found = await fetch(barcode)
    if (found) return upsert(found)
  }
  return null
}
