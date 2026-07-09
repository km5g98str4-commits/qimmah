// موافقة التحليلات + المعرّف المجهول — كلاهما في مفتاح واحد qimmah:analytics:v1.
//
// النموذج: opt-out — الافتراضي «granted» (تحليلات مجهولة بلا PII، مصلحة مشروعة)،
// مع مفتاح إيقاف صريح في الإعدادات. لا يُجمع شيء عند «denied».
//
// المعرّف مجهول تمامًا (UUID عشوائي محلي) وغير مرتبط بحساب المصادقة. يُمسح مع
// resetQimmah عند حذف الحساب (تُقطع هوية التحليلات) ويُولَّد معرّف جديد بعدها.

export const ANALYTICS_KEY = 'qimmah:analytics:v1'

export type ConsentState = 'granted' | 'denied'

interface AnalyticsStore {
  consent: ConsentState
  anonId: string
}

const DEFAULT_CONSENT: ConsentState = 'granted'

/** يولّد معرّفًا مجهولًا عشوائيًا (UUID متى توفّر crypto، وإلا بديل آمن). */
function genAnonId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* تجاهل — نستخدم البديل */
  }
  return `anon-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

let cache: AnalyticsStore | null = null

function read(): AnalyticsStore {
  if (cache) return cache
  if (typeof window === 'undefined') {
    cache = { consent: DEFAULT_CONSENT, anonId: '' }
    return cache
  }
  let store: AnalyticsStore
  try {
    const raw = window.localStorage.getItem(ANALYTICS_KEY)
    const p = raw ? (JSON.parse(raw) as Partial<AnalyticsStore>) : {}
    store = {
      consent: p?.consent === 'denied' ? 'denied' : 'granted',
      anonId: typeof p?.anonId === 'string' && p.anonId ? p.anonId : genAnonId(),
    }
  } catch {
    store = { consent: DEFAULT_CONSENT, anonId: genAnonId() }
  }
  cache = store
  persist(store)
  return store
}

function persist(store: AnalyticsStore): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(store))
  } catch {
    /* تجاهل أخطاء التخزين — لا شيء حرج */
  }
}

/** حالة الموافقة الحالية (الافتراضي granted في نموذج opt-out). */
export function getConsent(): ConsentState {
  return read().consent
}

/** يضبط الموافقة (مفتاح الإعدادات). عند «denied» يتوقّف الجمع فورًا. */
export function setConsent(consent: ConsentState): void {
  const store: AnalyticsStore = { ...read(), consent }
  cache = store
  persist(store)
}

/** المعرّف المجهول المحلي (لا PII). */
export function getAnonId(): string {
  return read().anonId
}
