import { useEffect, useState } from 'react'

// توجيه بسيط عبر hash بدون أي مكتبة خارجية.

export type AppRoute =
  | 'start'
  | 'login'
  | 'setup'
  | 'dashboard'
  | 'workout'
  | 'exercises'
  | 'nutrition'
  | 'progress'
  | 'profile'
  // صفحة «كيف نحسب أرقامك؟» — مدخلها من تبويب حسابي، ليست تبويبًا رئيسيًا.
  | 'calc'
  | 'demo'
  | 'settings'
  | 'privacy'
  | 'terms'
  | 'contact'
  // شاشة داخلية لمراجعة المنتجات (باركود/OCR) — مدخلها من الإعدادات، ليست تبويبًا رئيسيًا.
  | 'productReview'
  // «لوحتي» (P12-C) — ملخّص أرقام المستخدم الأسبوعية؛ مدخلها بطاقة على الرئيسية، ليست تبويبًا رئيسيًا.
  | 'stats'
  // مسار احتياطي داخلي فقط — لا يُسجَّل في ROUTES ولا يُكتب في hash مباشرة.
  | 'notfound'

const ROUTES: AppRoute[] = [
  'start',
  'login',
  'setup',
  'dashboard',
  'workout',
  'exercises',
  'nutrition',
  'progress',
  'profile',
  'calc',
  'demo',
  'settings',
  'privacy',
  'terms',
  'contact',
  'productReview',
  'stats',
]

/** التبويبات الرئيسية الخمسة في الشريط السفلي (كلها تتطلّب إعدادًا مكتملًا). */
export const MAIN_TABS: AppRoute[] = ['dashboard', 'workout', 'nutrition', 'progress', 'profile']

export function routeFromHash(): AppRoute | null {
  if (typeof window === 'undefined') return null
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(h) ? (h as AppRoute) : null
}

/**
 * هل الـ hash الحالي مسار route غير معروف (مثل #/asdf) يستحق صفحة 404؟
 * المرساة النصية العادية (مثل #today بلا شرطة) ليست مسارًا — تُعامَل كمرساة تمرير
 * لا كمسار، فلا تُقذف إلى صفحة 404 (كانت روابط الفوتر التسويقية تسقط هنا سابقًا).
 */
export function isUnknownRouteHash(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hash
  return h.startsWith('#/') && h !== '#/' && routeFromHash() === null
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
