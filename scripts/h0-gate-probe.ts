// ح-٠ب — مسبار البوّابة: يكشف دوال القرار الحقيقية للمتصفح ليفحصها الإثبات.
// لا يُبنى إلا داخل سكربت الإثبات (IIFE) ولا يدخل حزمة الإنتاج إطلاقًا.

import { adoptGuestOnboarding, isOnboardingComplete, loadOnboarding, markCompleted } from '@/lib/onboarding'
import { MAIN_TABS } from '@/lib/appRoutes'
import type { AppRoute } from '@/lib/appRoutes'

/**
 * نسخة طبق الأصل من guardRoute في App.tsx (الدالة غير مُصدَّرة من هناك).
 * أي اختلاف بينهما يُبطل الإثبات — تُراجَع مع أي تعديل على البوّابة.
 */
function guardRoute(route: AppRoute, userId: string | null): AppRoute {
  if (MAIN_TABS.includes(route) || route === 'exercises' || route === 'stats') {
    if (!isOnboardingComplete(userId)) {
      if (userId) return 'setup'
      return (loadOnboarding().lastStep ?? 0) > 0 ? 'setup' : 'start'
    }
  }
  return route
}

declare global {
  interface Window {
    __h0: {
      isOnboardingComplete: typeof isOnboardingComplete
      guardRoute: typeof guardRoute
      markCompleted: typeof markCompleted
      adoptGuestOnboarding: typeof adoptGuestOnboarding
    }
  }
}

window.__h0 = { isOnboardingComplete, guardRoute, markCompleted, adoptGuestOnboarding }
