// مخزن المنتجات الداخلي — localStorage، مفتوح بالباركود، مع دمج (dedup) وسجل تدقيق.

import { readJson, writeJson, type WriteResult } from '@/lib/safeStorage'
import type {
  AuditAction,
  AuditEntry,
  MacroSet,
  ProductInput,
  ProductSource,
  ProductStatus,
  StoredProduct,
} from './types'

const DB_KEY = 'qimmah:products:v1'
const AUDIT_KEY = 'qimmah:products:audit:v1'

/** نسبة تفاوت مقبولة بين مصدرين قبل اعتبارها تعارضًا حقيقيًا (تقريب/فروق تقديم). */
const CONFLICT_TOLERANCE_RATIO = 0.1

type ProductDb = Record<string, StoredProduct>

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * [D-1/٣] التخزين المفحوص — لا `localStorage` خام.
 *
 * كان المخزن يكتب خامًا ويبتلع الفشل بتعليق «غير حرج»، بينما `upsertProduct`
 * يعيد منتجًا كأن الحفظ نجح. وهي بعينها صورة BUG-009 التي أُغلقت في التغذية
 * وBUG-012 في التمرين: **شاشةُ نجاحٍ فوق كتابةٍ لم تحدث**.
 *
 * المرور بـ`writeJson` لا يغيّر توقيع أي مُصدَّر، لكنه يُدخل الفشل في قناة
 * الإبلاغ المركزية (`recordFailure` → `getStorageFailure`/`onStorageFailure`)
 * التي يعرضها التطبيق أصلًا — فيتوقّف الفشل عن كونه غير مرئي.
 */
function readDb(): ProductDb {
  return readJson<ProductDb>(DB_KEY, {})
}

function writeDb(db: ProductDb): WriteResult {
  return writeJson(DB_KEY, db)
}

function readAuditLog(): AuditEntry[] {
  return readJson<AuditEntry[]>(AUDIT_KEY, [])
}

function writeAuditLog(entries: AuditEntry[]): WriteResult {
  return writeJson(AUDIT_KEY, entries)
}

function appendAudit(entry: AuditEntry): void {
  const log = readAuditLog()
  log.push(entry)
  writeAuditLog(log)
}

/** عدد الحقول الغذائية غير الصفرية — مقياس بسيط لمدى اكتمال البيانات. */
function completenessScore(m: MacroSet): number {
  return [m.kcal, m.protein, m.carbs, m.fat].filter((v) => v > 0).length
}

/**
 * هل تتعارض مجموعتا قيم غذائية؟ لا تُقارَن إلا إذا كان الأساس (per) نفسه؛ القيم الناقصة
 * (صفر) لا تُعتبر تعارضًا — فقط فروق حقيقية بين قيمتين موجودتين تتجاوز نسبة التفاوت المقبولة.
 */
function macrosConflict(a: MacroSet, b: MacroSet): boolean {
  if (a.per !== b.per) return false
  const fields: (keyof Pick<MacroSet, 'kcal' | 'protein' | 'carbs' | 'fat'>)[] = [
    'kcal',
    'protein',
    'carbs',
    'fat',
  ]
  return fields.some((f) => {
    const av = a[f]
    const bv = b[f]
    if (av <= 0 || bv <= 0) return false
    const diff = Math.abs(av - bv)
    const tolerance = Math.max(av, bv) * CONFLICT_TOLERANCE_RATIO
    return diff > tolerance
  })
}

/** يدمج مصدرًا جديدًا في قائمة المصادر — يحدّث الإدخال إن كان نفس sourceName موجودًا مسبقًا. */
function mergeSources(existing: ProductSource[], incoming: ProductSource): ProductSource[] {
  const idx = existing.findIndex((s) => s.sourceName === incoming.sourceName)
  if (idx === -1) return [...existing, incoming]
  const next = [...existing]
  next[idx] = incoming
  return next
}

function toMacroSet(p: Pick<MacroSet, 'per' | 'servingSize' | 'kcal' | 'protein' | 'carbs' | 'fat'>): MacroSet {
  return { per: p.per, servingSize: p.servingSize, kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat }
}

function logAction(action: AuditAction, barcode: string, by: string, sourceName: string, note?: string): void {
  appendAudit({ barcode, action, by, at: nowIso(), sourceName, note })
}

/** يُرجع منتجًا واحدًا بالباركود، أو undefined إن لم يوجد. */
export function getProduct(barcode: string): StoredProduct | undefined {
  return readDb()[barcode]
}

/**
 * يضيف/يدمج منتجًا حسب مصدره. لا يوجد باركود مكرر أبدًا:
 * - منتج جديد → يُنشأ بمصدر واحد.
 * - منتج موجود → يُضاف المصدر إلى sources[]، وتُحفَظ القيم الغذائية الأكثر اكتمالًا/حداثة؛
 *   إن تعارضت قيمتان غذائيتان حقيقيتان بين المصدرين → الحالة تتحوّل لـ 'pending_review'.
 */
export function upsertProduct(input: ProductInput): StoredProduct {
  const db = readDb()
  const now = nowIso()
  const existing = db[input.barcode]
  const by = input.by ?? input.source.sourceName

  if (!existing) {
    const product: StoredProduct = {
      barcode: input.barcode,
      name: input.name,
      brand: input.brand,
      imageUrl: input.imageUrl,
      nutritionImageUrl: input.nutritionImageUrl,
      per: input.per,
      servingSize: input.servingSize,
      kcal: input.kcal,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      status: input.status ?? 'imported',
      sources: [input.source],
      createdAt: now,
      updatedAt: now,
    }
    db[input.barcode] = product
    writeDb(db)
    logAction('add', input.barcode, by, input.source.sourceName, input.note)
    return product
  }

  const existingMacros = toMacroSet(existing)
  const incomingMacros = toMacroSet(input)
  const conflict = macrosConflict(existingMacros, incomingMacros)
  const incomingIsAtLeastAsComplete = completenessScore(incomingMacros) >= completenessScore(existingMacros)
  const finalMacros = incomingIsAtLeastAsComplete ? incomingMacros : existingMacros

  const previousStatus = existing.status
  const status: ProductStatus = input.status ?? (conflict ? 'pending_review' : existing.status)

  const merged: StoredProduct = {
    ...existing,
    name: input.name || existing.name,
    brand: input.brand ?? existing.brand,
    imageUrl: input.imageUrl ?? existing.imageUrl,
    nutritionImageUrl: input.nutritionImageUrl ?? existing.nutritionImageUrl,
    per: finalMacros.per,
    servingSize: finalMacros.servingSize,
    kcal: finalMacros.kcal,
    protein: finalMacros.protein,
    carbs: finalMacros.carbs,
    fat: finalMacros.fat,
    status,
    sources: mergeSources(existing.sources, input.source),
    updatedAt: now,
  }
  db[input.barcode] = merged
  writeDb(db)
  logAction('merge', input.barcode, by, input.source.sourceName, input.note)
  if (status !== previousStatus) {
    logAction(
      'status_change',
      input.barcode,
      by,
      input.source.sourceName,
      conflict ? 'تعارض بيانات غذائية بين مصدرين — بانتظار المراجعة' : input.note,
    )
  }
  return merged
}

/** تعديل يدوي مباشر لحقول منتج موجود (مراجعة/تصحيح) — لا يمر بمنطق الدمج بين مصادر. */
export function editProduct(
  barcode: string,
  patch: Partial<Omit<StoredProduct, 'barcode' | 'sources' | 'createdAt' | 'updatedAt'>>,
  by: string,
  note?: string,
): StoredProduct | undefined {
  const db = readDb()
  const existing = db[barcode]
  if (!existing) return undefined
  const merged: StoredProduct = { ...existing, ...patch, updatedAt: nowIso() }
  db[barcode] = merged
  writeDb(db)
  logAction('edit', barcode, by, 'manual_edit', note)
  return merged
}

/** تغيير حالة منتج صراحةً (مثلاً توثيقه كـ verified بعد مراجعة بشرية). */
export function setProductStatus(
  barcode: string,
  status: ProductStatus,
  by: string,
  note?: string,
): StoredProduct | undefined {
  const db = readDb()
  const existing = db[barcode]
  if (!existing) return undefined
  if (existing.status === status) return existing
  const merged: StoredProduct = { ...existing, status, updatedAt: nowIso() }
  db[barcode] = merged
  writeDb(db)
  logAction('status_change', barcode, by, 'manual_status_change', note)
  return merged
}

/** كل المنتجات بحالة معيّنة (مثلاً 'pending_review' لواجهة المراجعة). */
export function listByStatus(status: ProductStatus): StoredProduct[] {
  return Object.values(readDb()).filter((p) => p.status === status)
}

/** بحث نصّي بسيط عن الاسم/العلامة التجارية — نتائج المطابقة من البداية أولًا. */
export function searchProducts(query: string): StoredProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const all = Object.values(readDb())
  const matches = all.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q))
  return matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
    return aStarts - bStarts
  })
}

/** سجل التدقيق الكامل، أو مُصفّى بباركود معيّن. */
export function getAuditLog(barcode?: string): AuditEntry[] {
  const log = readAuditLog()
  return barcode ? log.filter((e) => e.barcode === barcode) : log
}
