// واجهة التحليلات العامة — كل مواقع الاستدعاء تستورد track/firstOnce من هنا فقط.
//
// خصائص الطبقة:
//   • مضبوطة بالموافقة: لا شيء يُجمع إلا عند consent === 'granted'.
//   • مجهولة: معرّف عشوائي محلي فقط، بلا أي حقل معرِّف للهوية.
//   • آمنة الفشل: كل استدعاء ملفوف بـ try/catch؛ لا يرمي أبدًا في مسار التطبيق.
//   • مستقلّة عن المزوّد: no-op افتراضيًا، console في DEV، HTTP عند ضبط الـ endpoint.
//   • مؤجَّلة: أي حدث قبل التهيئة يُخزَّن مؤقتًا ثم يُفرَّغ (سقف صغير يمنع التسرّب).

import type { AnalyticsEventName, EventProps } from './events'
import type { AnalyticsProvider, CapturedEvent } from './provider'
import { getProvider, setProvider } from './provider'
import type { ConsentState } from './consent'
import { clearConsentCache, getAnonId, getConsent, setConsent as persistConsent } from './consent'
import { noopProvider } from './providers/noop'
import { consoleProvider } from './providers/console'
import { createHttpProvider } from './providers/http'

export type { AnalyticsEventName, EventProps } from './events'
export type { ConsentState } from './consent'
export { getConsent, getAnonId } from './consent'
export { firstOnce } from './milestones'

let initialized = false
const buffer: CapturedEvent[] = []
const MAX_BUFFER = 50

/** يقبل فقط رابط HTTPS صالحًا كوجهة تحليلات — أي شيء آخر يعني «لا إرسال». */
function isValidHttpsEndpoint(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * يختار المزوّد ويهيّئ الطبقة. يُستدعى مرّة واحدة عند الإقلاع (main.tsx).
 * الأولوية: endpoint صالح (HTTPS فقط) → HTTP. غير ذلك (فارغ/غير صالح/غير HTTPS)
 * → console في DEV فقط (طباعة محلية بلا شبكة)، وإلا no-op — لا إرسال إطلاقًا.
 */
export function initAnalytics(): void {
  if (initialized) return
  initialized = true
  let provider: AnalyticsProvider = noopProvider
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim()
    if (endpoint && isValidHttpsEndpoint(endpoint)) {
      provider = createHttpProvider(endpoint)
    } else {
      if (endpoint && import.meta.env.DEV) {
        console.warn('[analytics] VITE_ANALYTICS_ENDPOINT is not a valid HTTPS URL — no events will be sent.')
      }
      provider = import.meta.env.DEV ? consoleProvider : noopProvider
    }
  } catch {
    provider = noopProvider
  }
  setProvider(provider)
  flushBuffer()
}

/**
 * يضبط الموافقة، ويوقف الجمع فورًا عند «denied»: يُفرَّغ الطابور المؤقّت في الذاكرة
 * وتُلغى أي دفعة/مؤقّت معلّق في المزوّد — فلا يُرسَل أي حدث سابق بعد سحب الموافقة.
 */
export function setConsent(consent: ConsentState): void {
  persistConsent(consent)
  if (consent === 'denied') {
    buffer.length = 0
    try {
      getProvider().reset?.()
    } catch {
      /* تجاهل */
    }
  }
}

/**
 * إعادة ضبط كاملة للتحليلات (يُستدعى من resetQimmah عند حذف الحساب/إعادة الضبط):
 * يُسقط الطابور المؤقّت والدفعة المعلّقة والحالة في الذاكرة (الموافقة + المعرّف المجهول)
 * — لا يبقى معرّف قديم في الذاكرة، ولا تُرسَل أحداث سابقة.
 */
export function resetAnalytics(): void {
  buffer.length = 0
  try {
    getProvider().reset?.()
  } catch {
    /* تجاهل */
  }
  clearConsentCache()
}

function flushBuffer(): void {
  if (getConsent() !== 'granted') {
    buffer.length = 0
    return
  }
  const provider = getProvider()
  while (buffer.length) {
    const event = buffer.shift()
    if (!event) break
    try {
      provider.capture(event)
    } catch {
      /* تجاهل */
    }
  }
}

/**
 * يسجّل حدثًا مطبوعًا. لا يفعل شيئًا إن لم تُمنح الموافقة أو خارج المتصفّح.
 * الخصائص مطبوعة صارمًا لكل حدث — لا يمكن تمرير حقل خارج العقد.
 */
export function track<E extends AnalyticsEventName>(name: E, props: EventProps[E]): void {
  try {
    if (typeof window === 'undefined') return
    if (getConsent() !== 'granted') return
    const event: CapturedEvent = {
      name,
      props: (props ?? {}) as Record<string, unknown>,
      anonId: getAnonId(),
      ts: Date.now(),
    }
    if (!initialized) {
      if (buffer.length < MAX_BUFFER) buffer.push(event)
      return
    }
    getProvider().capture(event)
  } catch {
    /* الطبقة لا تكسر التطبيق أبدًا */
  }
}
