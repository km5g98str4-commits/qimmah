// مزوّد HTTP اختياري — يُفعَّل فقط عند ضبط VITE_ANALYTICS_ENDPOINT.
// يجمّع الأحداث في دفعات ويرسلها عبر sendBeacon (وإلا fetch keepalive)، بلا أي
// مكتبة خارجية. هذا هو «المزوّد القابل للاستبدال» الملموس؛ استبدله بأي وجهة لاحقًا.

import type { AnalyticsProvider, CapturedEvent } from '../provider'

const FLUSH_MS = 4000
const MAX_BATCH = 20

export function createHttpProvider(endpoint: string): AnalyticsProvider {
  const queue: CapturedEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  function send(batch: CapturedEvent[]): void {
    if (!batch.length) return
    const body = JSON.stringify({ events: batch })
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
        if (ok) return
      }
    } catch {
      /* نسقط إلى fetch */
    }
    try {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        /* فشل الشبكة لا يكسر التطبيق */
      })
    } catch {
      /* تجاهل */
    }
  }

  function flush(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!queue.length) return
    send(queue.splice(0, queue.length))
  }

  function schedule(): void {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, FLUSH_MS)
  }

  if (typeof window !== 'undefined') {
    // أفرغ ما تبقّى عند إخفاء الصفحة/الخروج حتى لا تضيع أحداث آخر جلسة.
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    capture(event) {
      queue.push(event)
      if (queue.length >= MAX_BATCH) flush()
      else schedule()
    },
    flush,
  }
}
