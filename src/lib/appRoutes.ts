import { useEffect, useState } from 'react'

// توجيه بسيط عبر hash بدون أي مكتبة خارجية.

export type AppRoute =
  | 'start'
  | 'login'
  | 'setup'
  | 'dashboard'
  | 'workout'
  | 'nutrition'
  | 'progress'
  | 'profile'
  | 'demo'
  | 'settings'
  | 'privacy'
  | 'terms'

const ROUTES: AppRoute[] = [
  'start',
  'login',
  'setup',
  'dashboard',
  'workout',
  'nutrition',
  'progress',
  'profile',
  'demo',
  'settings',
  'privacy',
  'terms',
]

/** التبويبات الرئيسية الخمسة في الشريط السفلي (كلها تتطلّب إعدادًا مكتملًا). */
export const MAIN_TABS: AppRoute[] = ['dashboard', 'workout', 'nutrition', 'progress', 'profile']

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
