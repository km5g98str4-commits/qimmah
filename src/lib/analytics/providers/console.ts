// مزوّد التطوير — يطبع كل حدث في الـ console (DEV فقط) للتحقق البصري بلا أي شبكة.

import type { AnalyticsProvider } from '../provider'

export const consoleProvider: AnalyticsProvider = {
  capture(event) {
    console.info(
      `%c[analytics]%c ${event.name}`,
      'color:#F26A21;font-weight:bold',
      'color:inherit',
      { ...event.props, anonId: event.anonId, ts: event.ts },
    )
  },
}
