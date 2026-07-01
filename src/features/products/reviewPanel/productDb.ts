// قاعدة بيانات منتجات محلية (localStorage) — تخزّن منتجات ممسوحة/مُضافة بانتظار المراجعة الداخلية،
// مع سجلّ تدقيق (audit) لكل تغيير. طبقة مؤقتة إلى حين وجود Backend حقيقي.

import type { ProductAuditEntry, ProductRecord, ProductReviewStatus } from '@/types'

const DB_KEY = 'qimmah:products:db:v1'
const AUDIT_KEY = 'qimmah:products:audit:v1'

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

function nowISO(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${rand}`
}

// منتجات تجريبية واقعية لتعمير لوحة المراجعة عند أول تشغيل (لا توجد بعد وحدة OCR/إضافة فعلية تُغذّيها).
const SEED_PRODUCTS: ProductRecord[] = [
  {
    id: newId('product'),
    barcode: '6281007311111',
    name: 'حليب قليل الدسم 1 لتر',
    brand: 'المراعي',
    servingSize: '250مل',
    nutrition: { caloriesPer100g: 48, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 1.5 },
    status: 'pending_review',
    source: 'ocr',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: newId('product'),
    barcode: '6281007322222',
    name: 'شوفان فوري بالعسل',
    brand: 'كويكر',
    servingSize: '40غ',
    nutrition: { caloriesPer100g: 380, proteinPer100g: 11, carbsPer100g: 66, fatPer100g: 7 },
    status: 'user_submitted',
    source: 'manual',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: newId('product'),
    barcode: '6281007333333',
    name: 'عصير برتقال طبيعي',
    brand: 'رابيكو',
    nutrition: { caloriesPer100g: 45, proteinPer100g: 0.5, carbsPer100g: 10, fatPer100g: 0 },
    status: 'needs_fix',
    source: 'ocr',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
]

function readAll(): ProductRecord[] {
  return readJSON<ProductRecord[]>(DB_KEY, [])
}

function writeAll(products: ProductRecord[]): void {
  writeJSON(DB_KEY, products)
}

/** يعمّر بيانات تجريبية عند أول تشغيل فقط (لا يمسح بيانات موجودة). */
function ensureSeeded(): void {
  if (typeof window === 'undefined') return
  const existing = readAll()
  if (existing.length > 0) return
  writeAll(SEED_PRODUCTS)
}

/** يرجّع كل المنتجات التي حالتها ضمن القائمة المطلوبة، الأحدث تعديلًا أولًا. */
export function listByStatus(statuses: ProductReviewStatus[]): ProductRecord[] {
  ensureSeeded()
  const set = new Set(statuses)
  return readAll()
    .filter((p) => set.has(p.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** يحفظ منتجًا جديدًا أو يحدّث منتجًا موجودًا (بحسب id)، ويحدّث updatedAt تلقائيًا. */
export function upsert(product: ProductRecord): ProductRecord {
  const all = readAll()
  const idx = all.findIndex((p) => p.id === product.id)
  const saved: ProductRecord = { ...product, updatedAt: nowISO() }
  if (idx >= 0) all[idx] = saved
  else all.push(saved)
  writeAll(all)
  return saved
}

/** يضيف سجلّ تدقيق واحد (من فعل ماذا ومتى) — يُستدعى مع كل upsert مهم. */
export function appendAudit(entry: Omit<ProductAuditEntry, 'id' | 'at'>): ProductAuditEntry {
  const saved: ProductAuditEntry = { ...entry, id: newId('audit'), at: nowISO() }
  const all = readJSON<ProductAuditEntry[]>(AUDIT_KEY, [])
  all.push(saved)
  writeJSON(AUDIT_KEY, all)
  return saved
}

/** يرجّع سجلّ التدقيق الكامل لمنتج واحد، الأحدث أولًا. */
export function listAudit(productId: string): ProductAuditEntry[] {
  return readJSON<ProductAuditEntry[]>(AUDIT_KEY, [])
    .filter((a) => a.productId === productId)
    .sort((a, b) => b.at.localeCompare(a.at))
}
