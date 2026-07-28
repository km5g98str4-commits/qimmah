// طبقة كتابة آمنة إلى localStorage.
//
// المشكلة: أغلب استدعاءات setItem في المشروع كانت بلا حماية. أيٌّ منها يرمي
// استثناءً في ثلاث حالات واقعية تمامًا:
//   1. امتلاء الحصّة (QuotaExceededError) — سجلّ التمارين والأطعمة يكبر مع الوقت.
//   2. وضع التصفّح الخاص في Safari (يرمي عند الكتابة، لا عند القراءة).
//   3. حظر تخزين الطرف الأول في بعض إعدادات الخصوصية.
// واستثناءٌ غير ملتقَط أثناء الرندر أو داخل مُهيّئ useState يُبيّض الشاشة كاملة.
//
// المبدأ: **لا نُسقط الواجهة أبدًا بسبب التخزين، ولا نكذب على المستخدم أيضًا.**
// كل دالّة هنا تُرجع نتيجةً صريحة كي يستطيع النداء الأعلى التصرّف — بدل النمط
// السائد سابقًا `catch { /* تجاهل */ }` الذي يبتلع الفشل ثم تقول الواجهة «تم الحفظ».
//
// ── أين لا تُستعمل هذه الطبقة (عن قصد) ──
// `src/lib/portability/` مستثناة بالكامل. كتاباتها **يجب** أن ترمي: استيراد
// البيانات يعتمد على انتشار الاستثناء إلى `applyImport` كي يُشغّل `restoreSnapshot`
// ويتراجع عن الاستيراد كاملًا. ابتلاع الخطأ هناك يحوّل استيرادًا فاشلًا إلى
// استيراد جزئي صامت — أسوأ من الانهيار.
//
// ── لماذا لا توجد readJson هنا ──
// طبقة ملكية البيانات (`dataOwnership.ts`) تعزل المفاتيح التالفة/غير المملوكة
// (quarantine) بدل معاملتها كغياب. دالّة قراءة تُرجع القيمة الافتراضية بصمت عند
// تلف JSON تتجاوز ذلك المسار وتُخفي حالةً يجب أن تُعالَج. القراءة تبقى حيث هي.

/** نتيجة محاولة الكتابة. */
export type WriteResult = 'ok' | 'quota' | 'unavailable' | 'error'

/** تفاصيل آخر فشل تخزين — تقرؤه الواجهة لعرض تحذير صادق عند الحاجة. */
export interface StorageFailure {
  key: string
  result: WriteResult
  at: number
}

let lastFailure: StorageFailure | null = null
const listeners = new Set<(f: StorageFailure | null) => void>()

/** آخر فشل تخزين مسجَّل (null إن لم يحدث فشل بعد آخر مسح). */
export function getStorageFailure(): StorageFailure | null {
  return lastFailure
}

/** يشترك في تنبيهات فشل التخزين. يُرجع دالّة إلغاء الاشتراك. */
export function onStorageFailure(fn: (f: StorageFailure | null) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** يمسح حالة الفشل بعد أن يعالجها النداء الأعلى (مثلًا بعد عرض التحذير). */
export function clearStorageFailure(): void {
  lastFailure = null
}

function markFailure(key: string, result: WriteResult): void {
  lastFailure = { key, result, at: Date.now() }
  listeners.forEach((fn) => {
    try {
      fn(lastFailure)
    } catch {
      // مستمعٌ فاشل لا يُسقط الكتابة ولا بقيّة المستمعين.
    }
  })
}

/** هل الخطأ ناتج عن امتلاء الحصّة؟ الاسم/الرقم يختلفان بين المتصفّحات. */
function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  // Safari القديم يستعمل الرمز 22 بلا اسم مميّز.
  return 'code' in e && (e as { code?: number }).code === 22
}

/** يكتب نصًّا خامًا. لا يرمي أبدًا. */
export function safeWrite(key: string, value: string): WriteResult {
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

/** يكتب كائنًا بصيغة JSON. لا يرمي أبدًا — حتى لو تعذّر التسلسل (كائن دوري). */
export function safeWriteJson(key: string, value: unknown): WriteResult {
  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    markFailure(key, 'error')
    return 'error'
  }
  return safeWrite(key, text)
}

/** يحذف مفتاحًا. لا يرمي أبدًا. */
export function safeRemove(key: string): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  try {
    window.localStorage.removeItem(key)
    return 'ok'
  } catch (e) {
    const result: WriteResult = isQuotaError(e) ? 'quota' : 'error'
    markFailure(key, result)
    return result
  }
}

/** هل التخزين متاح للكتابة أصلًا؟ فحص خفيف يُستعمل عند الإقلاع. */
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
