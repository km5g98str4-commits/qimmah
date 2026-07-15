// الاستيراد (الاستعادة) — خطّ تحقّق صارم + تطبيق ذرّي معاد الترميز للمستخدم الحالي +
// نسخة تراجع قبل الاستيراد. قِمّة (PDPL R-1).
//
// الأمان (STRIDE):
//  • Elevation/Tampering: يُعاد ترميز كل متجر مربوط بالمالك إلى المستخدم الحالي حصراً
//    (لاحقة/مفتاح الخريطة) — فحقن بيانات في حساب آخر مستحيل بنيويًّا. لا يُكتب إطلاقًا
//    رمز الجلسة (qimmah:supabase-auth) ولا سباكة المزامنة (isExcludedKey يحجبها).
//  • DoS: سقف حجم الملفّ + سقف عناصر لكل متجر.
//  • Injection: رفض مفاتيح تلويث النموذج (__proto__/constructor/prototype) في أي عمق.
//  • Integrity: تطبيق ذرّي — لقطة قبل الاستيراد ثم تحقّق بالمُحمِّلات الحقيقية؛ أي فشل
//    يُرجِع الحالة كما كانت ويُسمّي المتجر الفاشل. تراجع بلمسة واحدة.
//  • Spoofing: يُرفض الاستيراد أثناء جلسة استعادة كلمة المرور.
//  • لا شبكة، لا Supabase: كتابة محلّية فقط؛ محرّك المزامنة يلتقط التغيّر طبيعيًّا لاحقًا.

import {
  STORE_BY_ID,
  ownerToken,
  readRaw,
  writeRaw,
  type StoreDef,
} from './registry'
import { PortabilityError } from './errors'
import { requirePortabilityOwner } from './guard'
import { enqueueImportedStateForSync } from '@/lib/syncService'
import { getSyncRuntime } from '@/lib/syncQueue'
import { BUNDLE_KIND, PORTABILITY_SCHEMA_VERSION, type PortabilityBundle } from './format'

/** سقف حجم ملفّ الاستيراد — ٢٥ ميغابايت (حماية DoS). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_IMPORT_NODES = 250_000
export const MAX_IMPORT_DEPTH = 64
/** نسخة التراجع مربوطة بالمالك وتُمسح تلقائيًّا عبر wipeUserData. */
export const UNDO_KEY_PREFIX = 'qimmah:portability:undoBackup:v1:'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** خطأ نقل موجّه للمستخدم — يحمل اسم المتجر الفاشل حين يُعرف. */
/**
 * يحلّل JSON مع رفض أي مفتاح خطير (تلويث النموذج) عبر reviver — يُستدعى لكل مفتاح
 * أثناء التحليل بما فيها `__proto__`/`constructor`/`prototype` مهما كان تمثيل المحرّك لها،
 * فالكشف موثوق (بخلاف المسح بـ Object.keys الذي قد يُغفل __proto__ غير القابل للعدّ).
 */
function safeJsonParse(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) throw new PortabilityError('الملفّ يحتوي مفاتيح غير آمنة — رُفض')
    return value
  })
}

export interface PreviewLine {
  id: string
  labelAr: string
  count: number
}
export interface ImportPreview {
  ownerId: string
  bundle: PortabilityBundle
  exportedAt: string
  appVersion: string
  lines: PreviewLine[]
  totalStores: number
  unregisteredCount: number
}

function byteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length
  } catch {
    return text.length
  }
}

/**
 * يحلّل نصّ الملفّ ويتحقّق منه بالكامل قبل أي كتابة (reject-on-any-invalid).
 * بوّابات: الحجم → JSON → تلويث النموذج → النوع → إصدار المخطّط → شكل كل متجر (سقوف).
 * يرمي PortabilityError برسالة عربية واضحة تسمّي المتجر الفاشل عند وجوده.
 */
export function parseImportFile(text: string, uid?: string | null): ImportPreview {
  const ownerId = requirePortabilityOwner(uid ?? getSyncRuntime().userId)
  if (byteLength(text) > MAX_FILE_BYTES) {
    throw new PortabilityError('الملفّ أكبر من الحدّ المسموح (٢٥ ميغابايت)')
  }
  let parsed: unknown
  try {
    parsed = safeJsonParse(text)
  } catch (e) {
    // خطأ التلويط (PortabilityError) يُعاد كما هو؛ أي خطأ تحليل آخر = JSON غير صالح.
    if (e instanceof PortabilityError) throw e
    throw new PortabilityError('الملفّ ليس JSON صالحًا')
  }

  let nodes = 0
  const stack: Array<{ value: unknown; depth: number }> = [{ value: parsed, depth: 0 }]
  while (stack.length) {
    const current = stack.pop()!
    nodes += 1
    if (nodes > MAX_IMPORT_NODES || current.depth > MAX_IMPORT_DEPTH) {
      throw new PortabilityError('بنية الملفّ معقّدة أكثر من الحدّ الآمن.')
    }
    if (Array.isArray(current.value)) {
      current.value.forEach((value) => stack.push({ value, depth: current.depth + 1 }))
    } else if (isObj(current.value)) {
      Object.values(current.value).forEach((value) => stack.push({ value, depth: current.depth + 1 }))
    }
  }

  if (!isObj(parsed)) throw new PortabilityError('صيغة الملفّ غير معروفة')
  const bundle = parsed as unknown as PortabilityBundle
  if (bundle.kind !== BUNDLE_KIND) {
    throw new PortabilityError('هذا الملفّ ليس نسخة بيانات قِمّة')
  }
  if (bundle.schemaVersion !== PORTABILITY_SCHEMA_VERSION) {
    throw new PortabilityError(
      `إصدار النسخة (${bundle.schemaVersion ?? '؟'}) غير متوافق مع هذا الإصدار (${PORTABILITY_SCHEMA_VERSION}).`,
    )
  }
  if (!isObj(bundle.stores)) throw new PortabilityError('محتوى النسخة غير صالح (stores)')
  const unregistered = isObj(bundle.unregistered) ? bundle.unregistered : {}

  // تحقّق بنيوي من كل متجر معروف + سقوف. متجر مجهول ضمن نفس الإصدار = رفض.
  const lines: PreviewLine[] = []
  for (const [id, value] of Object.entries(bundle.stores)) {
    if (DANGEROUS_KEYS.has(id)) throw new PortabilityError('معرّف متجر غير آمن — رُفض')
    const def = STORE_BY_ID[id]
    if (!def) throw new PortabilityError(`متجر غير معروف في النسخة: «${id}»`, id)
    const ok = def.validate(value)
    if (ok !== true) throw new PortabilityError(ok, def.labelAr)
    lines.push({ id, labelAr: def.labelAr, count: def.count(value) })
  }

  // Schema v1 is allowlist-only. Unknown raw keys may contain auth/device or
  // another owner's state, so reject them before preview or any write.
  const unregisteredCount = Object.keys(unregistered).length
  if (unregisteredCount > 0) {
    throw new PortabilityError('تحتوي النسخة بيانات من إصدار أحدث لا يمكن استيرادها بأمان.')
  }

  return {
    ownerId,
    bundle,
    exportedAt: typeof bundle.exportedAt === 'string' ? bundle.exportedAt : '',
    appVersion: typeof bundle.appVersion === 'string' ? bundle.appVersion : '',
    lines,
    totalStores: lines.length,
    unregisteredCount,
  }
}

// ————————————————————— لقطة التراجع (ذرّية) —————————————————————

interface UndoEntry {
  /** كان المفتاح موجودًا قبل الاستيراد؟ (للتفريق بين الغياب وقيمة null). */
  p: boolean
  /** القيمة الخام المُحلَّلة قبل الاستيراد. */
  v: unknown
}
interface UndoSnapshot {
  createdAt: string
  uid: string
  keys: Record<string, UndoEntry>
}

export function undoKey(uid: string): string {
  return `${UNDO_KEY_PREFIX}${uid}`
}

/** يجمع كل مفاتيح localStorage الفعلية التي سيمسّها هذا الاستيراد (لالتقاطها قبل الكتابة). */
function targetKeys(uid: string): string[] {
  const keys = new Set<string>()
  for (const def of Object.values(STORE_BY_ID)) keys.add(def.keyFor(uid))
  return [...keys]
}

function captureSnapshot(keys: string[], uid: string | null | undefined): UndoSnapshot {
  const snap: UndoSnapshot = { createdAt: new Date().toISOString(), uid: ownerToken(uid), keys: {} }
  for (const key of keys) {
    if (typeof window === 'undefined') break
    const raw = window.localStorage.getItem(key)
    snap.keys[key] = raw === null ? { p: false, v: null } : { p: true, v: JSON.parse(raw) as unknown }
  }
  return snap
}

function restoreSnapshot(snap: UndoSnapshot): void {
  if (typeof window === 'undefined') return
  for (const [key, entry] of Object.entries(snap.keys)) {
    if (entry.p) window.localStorage.setItem(key, JSON.stringify(entry.v))
    else window.localStorage.removeItem(key)
  }
}

/** يكتب متجرًا واحدًا معاد الترميز للمستخدم الحالي (محلّي بحت). */
function applyStore(def: StoreDef, value: unknown, uid: string | null | undefined): void {
  if (def.kind === 'ownerMap') {
    const map = isObj(readRaw(def.key)) ? (readRaw(def.key) as Record<string, unknown>) : {}
    map[ownerToken(uid)] = value // إعادة الترميز: تُكتب تحت المالك الحالي حصراً.
    writeRaw(def.key, map)
    return
  }
  // fixed/ownerSuffix: keyFor يحمل معرّف المالك الحالي بالفعل.
  writeRaw(def.keyFor(uid), value)
}

function clearStore(def: StoreDef, uid: string): void {
  if (def.kind === 'ownerMap') {
    const current = readRaw(def.key)
    if (!isObj(current)) return
    delete current[ownerToken(uid)]
    writeRaw(def.key, Object.keys(current).length ? current : undefined)
    return
  }
  writeRaw(def.keyFor(uid), undefined)
}

export interface ApplyResult {
  storesApplied: number
  unregisteredApplied: number
  undoAvailable: boolean
  syncQueued: boolean
}

/**
 * يطبّق حزمة مُتحقَّقًا منها ذرّيًّا في مساحة المستخدم الحالي. يلتقط لقطة تراجع أولًا،
 * ثم يكتب، ثم يتحقّق بالمُحمِّلات الحقيقية؛ أي فشل يُرجِع الحالة تمامًا ويرمي مسمّيًا المتجر.
 * يُرفض أثناء جلسة الاستعادة. لا يمسّ Supabase.
 */
export function applyImport(bundle: PortabilityBundle, uid: string | null | undefined, expectedOwner: string): ApplyResult {
  const ownerId = requirePortabilityOwner(uid, expectedOwner)
  let checked: PortabilityBundle
  try {
    checked = parseImportFile(JSON.stringify(bundle), ownerId).bundle
  } catch (error) {
    throw error instanceof PortabilityError ? error : new PortabilityError('فشل التحقّق من النسخة.')
  }

  const keys = targetKeys(ownerId)
  const snapshot = captureSnapshot(keys, ownerId)
  const stagedKey = undoKey(ownerId)
  // ثبّت لقطة التراجع قبل أي كتابة كي يبقى التراجع ممكنًا حتى لو انقطع التنفيذ.
  writeRaw(stagedKey, snapshot)

  let storesApplied = 0
  const unregisteredApplied = 0
  try {
    for (const def of Object.values(STORE_BY_ID)) {
      if (!(def.id in checked.stores)) clearStore(def, ownerId)
    }
    for (const [id, value] of Object.entries(checked.stores)) {
      const def = STORE_BY_ID[id]
      if (!def) throw new PortabilityError(`متجر غير معروف: «${id}»`, id)
      applyStore(def, value, ownerId)
      storesApplied += 1
    }
    // Schema v1 accepts no unregistered keys: arbitrary raw writes are forbidden.
    // تحقّق نهائي بالمُحمِّلات الحقيقية — أي رمي = بيانات فاسدة → تراجع.
    for (const id of Object.keys(checked.stores)) {
      const def = STORE_BY_ID[id]
      if (!def) continue
      try {
        def.load(ownerId)
      } catch {
        throw new PortabilityError(`تعذّر قراءة «${def.labelAr}» بعد الاستيراد — أُلغي كل شيء.`, def.labelAr)
      }
    }
  } catch (err) {
    // فشل ذرّي: أعِد الحالة تمامًا وامسح لقطة التراجع، ثم أعِد رمي الخطأ.
    restoreSnapshot(snapshot)
    writeRaw(stagedKey, undefined)
    throw err instanceof PortabilityError ? err : new PortabilityError('فشل الاستيراد — أُلغيت كل التغييرات.')
  }

  let syncQueued = false
  try {
    syncQueued = enqueueImportedStateForSync(ownerId)
  } catch {
    // The local restore is already durable. A later foreground sync can retry.
  }
  return { storesApplied, unregisteredApplied, undoAvailable: true, syncQueued }
}

/** هل توجد لقطة تراجع متاحة (استيراد أخير)؟ */
export function hasUndo(uid: string | null | undefined): boolean {
  if (!uid) return false
  const snap = readRaw(undoKey(uid)) as UndoSnapshot | undefined
  return Boolean(snap && isObj(snap) && snap.uid === uid)
}

/** يتراجع عن آخر استيراد: يُعيد الحالة قبل الاستيراد تمامًا ثم يمسح اللقطة. */
export function undoImport(uid: string | null | undefined): boolean {
  const ownerId = requirePortabilityOwner(uid)
  const stagedKey = undoKey(ownerId)
  const snap = readRaw(stagedKey) as UndoSnapshot | undefined
  if (!snap || !isObj(snap) || !isObj(snap.keys)) return false
  if (snap.uid !== ownerId) throw new PortabilityError('نسخة التراجع تخص حسابًا آخر — رُفضت.')
  restoreSnapshot(snap)
  writeRaw(stagedKey, undefined)
  try {
    enqueueImportedStateForSync(ownerId)
  } catch {
    // Local rollback remains authoritative; foreground sync can retry.
  }
  return true
}

/** يمسح لقطة التراجع المرحلية (يُستدعى عند المسح/تسجيل الخروج للنظافة؛ wipeUserData يمسحها أيضًا بالبادئة). */
export function clearStagedImport(uid: string): void {
  writeRaw(undoKey(uid), undefined)
}
