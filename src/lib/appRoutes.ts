import { useEffect, useState } from 'react'

// توجيه بسيط عبر hash بدون أي مكتبة خارجية.

export type AppRoute = 'start' | 'setup' | 'dashboard' | 'demo' | 'workout' | 'exercises'

const ROUTES: AppRoute[] = ['start', 'setup', 'dashboard', 'demo', 'workout', 'exercises']

export function routeFromHash(): AppRoute | null {
  if (typeof window === 'undefined') return null
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(h) ? (h as AppRoute) : null
}

/** يضبط hash المسار (يُطلق hashchange). */
export function setHashRoute(route: AppRoute): void {
  if (typeof window === 'undefined') return
  const target = `#/${route}`
  if (window.location.hash !== target) {
    window.location.hash = `/${route}`
  }
}

/** هوك يتابع تغيّر hash المسار. */
export function useHashRoute(): AppRoute | null {
  const [route, setRoute] = useState<AppRoute | null>(() => routeFromHash())
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
