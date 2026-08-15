/**
 * ذاكرة الشرائح — **IndexedDB لا `localStorage`** (عقد البحث §٥).
 *
 * السبب مقيس لا أسلوبي: `localStorage` متزامنة وحصّتها ≈٥ ميغابايت للأصل الواحد،
 * والذيل الطويل وحده ٧٤ ميغابايت خامًا (١٣٫٦ مضغوطة) في ٤١ شريحة. أي محاولة
 * لتمرير هذا عبر `localStorage` تُسقط الكتابة عند أول شريحتين، وتُجمّد الخيط
 * الرئيسي في كل قراءة.
 *
 * **الفشل هنا ليس حرجًا — والصمت عنه حرج.** الذاكرة تحسين لا مصدر حقيقة: إن
 * غابت IndexedDB (وضع خاص · متصفّح قديم · حصّة ممتلئة) يبقى الكتالوج عاملًا عبر
 * الجلب المباشر، وتُسجَّل الحالة في `stats()` بدل ابتلاعها. ولذلك لا يرمي أي
 * مسار هنا: القراءة الفاشلة تعني «غير مخزَّن» لا «انهيار».
 */

const DB_NAME = 'qimmah-food-catalog'
const DB_VERSION = 1
const STORE = 'blobs'

export interface BlobCache {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<boolean>
  /** الوصف المعلَن للطبقة العاملة — يظهر في التشخيص ولا يُخمَّن. */
  readonly kind: 'indexeddb' | 'memory'
}

/** بديل في الذاكرة — يعمل حين تغيب IndexedDB، ويُعلن نفسه بوضوح. */
export function createMemoryCache(): BlobCache {
  const map = new Map<string, string>()
  return {
    kind: 'memory',
    async get(key) {
      return map.has(key) ? (map.get(key) as string) : null
    },
    async put(key, value) {
      map.set(key, value)
      return true
    },
  }
}

function openDb(factory: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      req = factory.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

/**
 * ذاكرة مدعومة بـIndexedDB. تعيد بديل الذاكرة حين تتعذّر — **لا ترمي أبدًا**،
 * لأن تعذّر التخزين المؤقت يجب ألّا يمنع المستخدم من البحث.
 */
export async function createIdbCache(factory?: IDBFactory | null): Promise<BlobCache> {
  const idb = factory ?? (typeof indexedDB === 'undefined' ? null : indexedDB)
  if (!idb) return createMemoryCache()
  const db = await openDb(idb)
  if (!db) return createMemoryCache()

  const tx = <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> =>
    new Promise((resolve) => {
      let request: IDBRequest<T>
      try {
        request = run(db.transaction(STORE, mode).objectStore(STORE))
      } catch {
        resolve(null)
        return
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })

  return {
    kind: 'indexeddb',
    async get(key) {
      const v = await tx<string>('readonly', (s) => s.get(key) as IDBRequest<string>)
      return typeof v === 'string' ? v : null
    },
    async put(key, value) {
      // الحصّة ممتلئة ⇒ `false` صريحة. الكتالوج يواصل عمله بلا ذاكرة مؤقتة.
      const r = await tx('readwrite', (s) => s.put(value, key) as IDBRequest<IDBValidKey>)
      return r !== null
    },
  }
}
