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
import { getAnonId, getConsent } from './consent'
import { noopProvider } from './providers/noop'
import { consoleProvider } from './providers/console'
import { createHttpProvider } from './providers/http'

export type { AnalyticsEventName, EventProps } from './events'
export type { ConsentState } from './consent'
export { getConsent, setConsent, getAnonId } from './consent'
export { firstOnce } from './milestones'

let initialized = false
const buffer: CapturedEvent[] = []
const MAX_BUFFER = 50

/**
 * يختار المزوّد ويهيّئ الطبقة. يُستدعى مرّة واحدة عند الإقلاع (main.tsx).
 * الأولوية: endpoint مضبوط → HTTP، وإلا DEV → console، وإلا no-op.
 */
export function initAnalytics(): void {
  if (initialized) return
  initialized = true
  let provider: AnalyticsProvider = noopProvider
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim()
    if (endpoint) provider = createHttpProvider(endpoint)
    else if (import.meta.env.DEV) provider = consoleProvider
  } catch {
    provider = noopProvider
  }
  setProvider(provider)
  flushBuffer()
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
