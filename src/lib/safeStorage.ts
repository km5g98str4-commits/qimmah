// طبقة كتابة آمنة فوق localStorage — تُرجع نتيجة صادقة ولا ترمي أبدًا.
//
// لماذا هذه الطبقة موجودة؟
// كل كتابة في التطبيق كانت `try { localStorage.setItem(...) } catch {}` — أي أن
// الفشل يُبتلع بصمت، فتظهر للمستخدم شاشة «تم الحفظ» بينما لم يُحفظ شيء. هذا
// «نجاح زائف»، وأسوأ حالاته إنهاء تمرين: نمسح الجلسة الجارية ونعرض ملخّصًا
// لبيانات لم تصل إلى القرص أبدًا.
//
// الفشل ليس حالة نادرة على الويب/الـWebView:
//  • **وضع التصفّح الخاص في Safari**: `localStorage` موجود لكن أول `setItem`
//    يرمي `QuotaExceededError` بحصّة صفرية.
//  • **امتلاء الحصّة** (~5 ميغابايت لكل أصل) بعد أشهر من السجلّات والصور.
//  • **حظر تخزين الطرف الأول**: إعدادات المتصفّح أو سياسة المؤسسة تمنع الوصول،
//    فيرمي مجرّد قراءة `window.localStorage` استثناء `SecurityError`.
//
// لذلك: `write*` لا ترمي، بل تُرجع `WriteResult` صادقة، وتُسجّل آخر فشل في
// «مؤشّر فشل» عالمي يستطيع مستدعي الكتابة فحصه بعدها (والاشتراك فيه للواجهة).
//
// ملاحظة: الطبقة آمنة على الخادم (SSR) — بلا `window` تُرجع `'unavailable'`.

/** نتيجة محاولة كتابة واحدة. `'ok'` فقط تعني أن البيانات وصلت التخزين. */
export type WriteResult = 'ok' | 'quota' | 'unavailable' | 'error'

/** آخر فشل كتابة مسجّل (مرجع جديد عند كل فشل — يصلح للمقارنة المرجعية). */
export interface StorageFailure {
  key: string
  result: WriteResult
  at: number
}

type FailureListener = (failure: StorageFailure | null) => void

let lastFailure: StorageFailure | null = null
const listeners = new Set<FailureListener>()

function emit(): void {
  listeners.forEach((fn) => {
    try {
      fn(lastFailure)
    } catch {
      /* مشترك عطلان لا يُسقط بقية المشتركين */
    }
  })
}

/**
 * تصنيف الاستثناء إلى سبب مفهوم. أسماء/أرقام الحصّة تختلف بين المتصفّحات:
 *  • Chrome/Edge/Safari الحديث: `name === 'QuotaExceededError'`
 *  • Firefox: `name === 'NS_ERROR_DOM_QUOTA_REACHED'` أو `code === 1014`
 *  • Safari/WebKit الأقدم: `code === 22` (بلا اسم موثوق)
 * أما `SecurityError` فيعني أن التخزين محجوب أصلًا لا ممتلئ.
 */
function classify(err: unknown): WriteResult {
  if (!err || typeof err !== 'object') return 'error'
  const e = err as { name?: unknown; code?: unknown }
  const name = typeof e.name === 'string' ? e.name : ''
  const code = typeof e.code === 'number' ? e.code : -1
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) {
    return 'quota'
  }
  if (name === 'SecurityError') return 'unavailable'
  return 'error'
}

/** يعيد كائن التخزين، أو `null` إن كان غائبًا/محجوبًا (الوصول نفسه قد يرمي). */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function recordFailure(key: string, result: WriteResult): WriteResult {
  lastFailure = { key, result, at: Date.now() }
  emit()
  return result
}

/** يكتب نصًّا خامًا. لا يرمي أبدًا؛ يُرجع سبب الفشل عند الفشل. */
export function writeRaw(key: string, value: string): WriteResult {
  const ls = storage()
  if (!ls) return recordFailure(key, 'unavailable')
  try {
    ls.setItem(key, value)
    return 'ok'
  } catch (err) {
    return recordFailure(key, classify(err))
  }
}

/** يكتب قيمة JSON. يلتقط أيضًا فشل `JSON.stringify` (حلقة مرجعية / BigInt). */
export function writeJson(key: string, value: unknown): WriteResult {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    return recordFailure(key, 'error')
  }
  if (serialized === undefined) return recordFailure(key, 'error')
  return writeRaw(key, serialized)
}

/** يقرأ نصًّا خامًا، أو `null` عند الغياب/التعذّر. لا يرمي أبدًا. */
export function readRaw(key: string): string | null {
  const ls = storage()
  if (!ls) return null
  try {
    return ls.getItem(key)
  } catch {
    return null
  }
}

/** يقرأ JSON. البيانات التالفة تُعامَل كغياب — نُرجع القيمة الاحتياطية بلا تعطّل. */
export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  if (raw == null) return fallback
  try {
    const parsed = JSON.parse(raw) as T
    return parsed === null || parsed === undefined ? fallback : parsed
  } catch {
    return fallback
  }
}

/** يحذف مفتاحًا. لا يرمي (الحذف لا يُسجَّل كفشل كتابة). */
export function removeKey(key: string): void {
  const ls = storage()
  if (!ls) return
  try {
    ls.removeItem(key)
  } catch {
    /* التخزين محجوب — لا شيء لنحذفه أصلًا */
  }
}

/** آخر فشل كتابة مسجّل (أو `null`). المرجع يتغيّر عند كل فشل جديد. */
export function getStorageFailure(): StorageFailure | null {
  return lastFailure
}

/** يمسح مؤشّر الفشل (بعد أن تعالجه الواجهة أو ينجح إعادة المحاولة). */
export function clearStorageFailure(): void {
  if (lastFailure === null) return
  lastFailure = null
  emit()
}

/** اشتراك في تغيّر مؤشّر الفشل. يُرجع دالة إلغاء الاشتراك. */
export function onStorageFailure(fn: FailureListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * فحص حيّ: هل التخزين قابل للكتابة الآن؟ يكتب مفتاح تحقّق مؤقّتًا ثم يحذفه.
 * لا يمسّ مؤشّر الفشل حتى لا يُلوّث تشخيص عملية حقيقية.
 */
export function isStorageWritable(): boolean {
  const ls = storage()
  if (!ls) return false
  const probe = '__qimmah_probe__'
  try {
    ls.setItem(probe, '1')
    ls.removeItem(probe)
    return true
  } catch {
    return false
  }
}

// ————————————————————————————————————————————————————————————————
// أسماء مرادفة (سطح توافق)
// ————————————————————————————————————————————————————————————————
//
// خطّ `release/v1.2.0-rc` بنى الطبقة نفسها بأسماء `safe*`، ويستهلكها ١١ ملفًا
// في ٣٥ موضعًا. عند توحيد الجبهة فازت هذه النسخة (المربوطة بسلسلة صدق الحفظ
// والمبرهَنة بـ`test:storage-honesty`)، فبقيت الأسماء الأخرى مرادفات بدلًا من
// إعادة تسمية ٣٥ موضعًا داخل موجة دمج — ضجيج بلا فائدة ومخاطرة بلا مقابل.
//
// السلوك واحد تمامًا؛ لا نسخة ثانية من المنطق.
// TODO(توحيد الأسماء): موجة مصغّرة لاحقة توحّد الاستدعاءات ثم تحذف هذه المرادفات.

/** مرادف `writeRaw`. */
export const safeWrite = writeRaw
/** مرادف `writeJson`. */
export const safeWriteJson = writeJson
/** مرادف `removeKey` يُرجع نتيجة الكتابة (النسخة الأخرى تُرجع void). */
export function safeRemove(key: string): WriteResult {
  if (!storage()) return 'unavailable'
  removeKey(key)
  return 'ok'
}
