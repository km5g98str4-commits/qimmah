// المزوّد الافتراضي — لا يفعل شيئًا. حزمة الإنتاج بلا endpoint ترسل لا شيء.

import type { AnalyticsProvider } from '../provider'

export const noopProvider: AnalyticsProvider = {
  capture() {
    /* no-op */
  },
}
