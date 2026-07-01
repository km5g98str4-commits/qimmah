import type { StoredProduct } from './types'

// مخزن منتجات محلي (localStorage) — واجهة upsert/getByBarcode بديلة مؤقتًا لقاعدة منتجات
// وكيل P8-A1 المشتركة (StoredProduct + upsert) التي لم تكن موجودة وقت بناء هذه الميزة.
// نطاق الاستخدام محصور بمجلد addProduct؛ عند توفّر الوحدة المشتركة، الاستبدال هو تغيير
// الاستيراد فقط لأن الأسماء والأشكال هنا مصمّمة لتطابقها.

const PRODUCTS_KEY = 'qimmah:products:v1'

type ProductMap = Record<string, StoredProduct>

function readAll(): ProductMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PRODUCTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProductMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: ProductMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(map))
  } catch {
    /* التخزين قد يكون ممتلئًا — ليس حرجًا، القيمة الأحدث تبقى في الذاكرة داخل الجلسة الحالية */
  }
}

/** يولّد معرّفًا فريدًا بلا اعتماد على crypto.randomUUID (غير متاح في كل السياقات). */
function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * يحفظ منتجًا: يحدّث السجل الموجود بنفس الباركود إن وُجد، وإلا يضيف سجلًا جديدًا.
 * يحافظ على id/createdAt الأصليين عند التحديث، ويحدّث updatedAt دائمًا.
 */
export function upsertProduct(product: Omit<StoredProduct, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<StoredProduct, 'id' | 'createdAt' | 'updatedAt'>>): StoredProduct {
  const all = readAll()
  const existing = product.barcode
    ? Object.values(all).find((p) => p.barcode === product.barcode)
    : (product.id ? all[product.id] : undefined)

  const now = Date.now()
  const merged: StoredProduct = {
    ...product,
    id: existing?.id ?? product.id ?? generateId(),
    createdAt: existing?.createdAt ?? product.createdAt ?? now,
    updatedAt: now,
  }
  all[merged.id] = merged
  writeAll(all)
  return merged
}

/** يبحث عن منتج مضاف مسبقًا بنفس الباركود — يُستخدم ليحلّ المسح التالي محليًا بلا شبكة. */
export function getProductByBarcode(barcode: string): StoredProduct | undefined {
  if (!barcode) return undefined
  return Object.values(readAll()).find((p) => p.barcode === barcode)
}

/** كل المنتجات المضافة من المستخدم — الأحدث أولًا. */
export function listUserProducts(): StoredProduct[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt)
}
