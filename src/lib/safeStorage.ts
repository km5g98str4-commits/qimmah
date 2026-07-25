// طبقة تخزين آمنة — كل كتابة إلى localStorage تمرّ من هنا.
//
// المشكلة التي تحلّها: كانت أغلب استدعاءات setItem في المشروع بلا حماية.
// أي منها يرمي استثناءً في ثلاث حالات واقعية تمامًا:
//   1. امتلاء الحصّة (QuotaExceededError) — سجلّ تمارين وأطعمة يكبر مع الوقت.
//   2. وضع التصفّح الخاص في Safari (يرمي عند الكتابة، لا عند القراءة).
//   3. حظر تخزين الطرف الأول في بعض إعدادات الخصوصية.
// واستثناء غير ملتقَط أثناء الرندر أو داخل مُهيّئ useState يُبيّض الشاشة كاملة.
//
// المبدأ هنا: **لا نُسقط الواجهة أبدًا بسبب التخزين**، لكن لا نكذب أيضًا —
// نُرجع نتيجة الكتابة كي يستطيع النداء الأعلى التصرّف (مثل تحذير المستخدم).

/** نتيجة محاولة الكتابة. */
export type WriteResult = 'ok' | 'quota' | 'unavailable' | 'error'

/** آخر خطأ تخزين — تقرؤه الواجهة لعرض تحذير صادق عند الحاجة. */
let lastFailure: { key: string; result: WriteResult; at: number } | null = null

/** المستمعون لتغيّر حالة التخزين (لتحذير المستخدم مرّة واحدة). */
const listeners = new Set<(f: typeof lastFailure) => void>()

export function getStorageFailure(): typeof lastFailure {
  return lastFailure
}

export function onStorageFailure(fn: (f: typeof lastFailure) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** يمسح حالة الفشل بعد أن يعالجها النداء الأعلى. */
export function clearStorageFailure(): void {
  lastFailure = null
}

function markFailure(key: string, result: WriteResult): void {
  lastFailure = { key, result, at: Date.now() }
  listeners.forEach((fn) => {
    try {
      fn(lastFailure)
    } catch {
      // مستمع فاشل لا يُسقط الكتابة.
    }
  })
}

/** هل الخطأ ناتج عن امتلاء الحصّة؟ (الاسم/الرقم يختلفان بين المتصفّحات). */
function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const name = e.name
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    // Safari القديم
    ('code' in e && (e as { code?: number }).code === 22)
  )
}

/** يكتب نصًّا خامًا. لا يرمي أبدًا. */
export function writeRaw(key: string, value: string): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  try {
    window.localStorage.setItem(key, value)
    return 'ok'
  } catch (e) {
    const result: WriteResult = isQuotaError(e) ? 'quota' : 'error'
    markFailure(key, result)
    return result
  }
}

/** يكتب كائنًا بصيغة JSON. لا يرمي أبدًا (حتى لو كان الكائن دوريًا). */
export function writeJson(key: string, value: unknown): WriteResult {
  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    markFailure(key, 'error')
    return 'error'
  }
  return writeRaw(key, text)
}

/** يقرأ نصًّا خامًا (null عند الغياب أو تعذّر الوصول). */
export function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * يقرأ كائنًا بصيغة JSON مع قيمة احتياطية.
 * البيانات التالفة تُعامَل كغياب — لا نُسقط الشاشة على المستخدم بسبب مفتاح فاسد.
 */
export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  if (raw === null) return fallback
  try {
    const parsed = JSON.parse(raw) as T
    return parsed === null || parsed === undefined ? fallback : parsed
  } catch {
    return fallback
  }
}

/** يحذف مفتاحًا. لا يرمي أبدًا. */
export function removeKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // تجاهل
  }
}

/** هل التخزين متاح للكتابة أصلًا؟ (فحص خفيف يُستخدم عند الإقلاع). */
export function isStorageWritable(): boolean {
  if (typeof window === 'undefined') return false
  const probe = '__qimmah_probe__'
  try {
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}
