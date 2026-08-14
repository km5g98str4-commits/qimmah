import { useEffect, useState } from 'react'

// توجيه بسيط عبر hash بدون أي مكتبة خارجية.

export type AppRoute =
  | 'start'
  | 'login'
  // [QIM-WEB-FOUNDER-UX-006/حزمة ٦] إنشاء الحساب ونسيان كلمة المرور صارا
  // **مسارين حقيقيين** لا حالتين داخل مكوّن: كانا يعيشان في `useState` داخل
  // `LoginView`، فالعنوان يبقى `#/login` مهما تغيّر النموذج، والتحديث يعيد
  // المستخدم إلى وضع غير الذي كان فيه، والرجوع يقفز فوق شاشة الحساب كلها.
  | 'signup'
  | 'forgot'
  | 'setup'
  | 'dashboard'
  | 'workout'
  | 'exercises'
  | 'nutrition'
  | 'progress'
  // سجل القياسات المستقل — مدخله من التقدّم والملف الشخصي.
  | 'measurements'
  // صفحة الخطوات المستقلة — مدخلها من التقدّم، وليست تبويبًا رئيسيًا.
  | 'steps'
  | 'profile'
  // صفحة «كيف نحسب أرقامك؟» — مدخلها من تبويب حسابي، ليست تبويبًا رئيسيًا.
  | 'calc'
  | 'settings'
  | 'privacy'
  | 'terms'
  | 'contact'
  // شاشة تعيين كلمة مرور جديدة (Sprint A) — وجهة رابط استعادة كلمة المرور، عامّة بلا حساب.
  | 'reset'
  // شاشة داخلية لمراجعة المنتجات (باركود/OCR) — مدخلها من الإعدادات، ليست تبويبًا رئيسيًا.
  | 'productReview'
  // «لوحتي» (P12-C) — ملخّص أرقام المستخدم الأسبوعية؛ مدخلها بطاقة على الرئيسية، ليست تبويبًا رئيسيًا.
  | 'stats'
  // «التعافي» (v1.1) — تسجيل ذاتي + توصية غير طبية + سجل؛ مدخلها من اليوم (يوم راحة) والتقدّم.
  | 'recovery'
  // مسار احتياطي داخلي فقط — لا يُسجَّل في ROUTES ولا يُكتب في hash مباشرة.
  | 'notfound'
  | 'accountRequired'

const ROUTES: AppRoute[] = [
  'start',
  'login',
  'signup',
  'forgot',
  'setup',
  'dashboard',
  'workout',
  'exercises',
  'nutrition',
  'progress',
  'measurements',
  'steps',
  'profile',
  'calc',
  'recovery',
  'settings',
  'privacy',
  'terms',
  'contact',
  'reset',
  'productReview',
  'stats',
]

/** التبويبات الرئيسية الخمسة في الشريط السفلي (كلها تتطلّب إعدادًا مكتملًا). */
export const MAIN_TABS: AppRoute[] = ['dashboard', 'workout', 'nutrition', 'progress', 'profile']

export function routeFromHash(): AppRoute | null {
  if (typeof window === 'undefined') return null
  // نتساهل مع لواحق رمز الاستعادة التي يُلحقها Supabase بالـ fragment:
  //   • تدفّق PKCE:     «/reset?code=…»       (قبل «?»)
  //   • تدفّق ضمني (implicit): «/reset#access_token=…»  (هاش ثانٍ)
  // نأخذ مقطع المسار الأول فقط قبل أي «&» أو «?» أو «#».
  const h = window.location.hash.replace(/^#\/?/, '').split(/[&?#]/)[0]
  // [QIM-WEB-FOUNDER-UX-006/حزمة ٦] المقطع الأول وحده هو المسار، فما بعده معرّف
  // مورد (`exercises/<id>`). بدون هذا كان الرابط العميق لتفصيل تمرين يسقط في
  // صفحة ٤٠٤ لأن الـhash كاملًا لا يطابق أي مسار مُعلَن.
  const [segment] = h.split('/')
  return (ROUTES as string[]).includes(segment) ? (segment as AppRoute) : null
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

/**
 * معرّف المورد بعد المسار (`#/exercises/<id>` ⇒ `<id>`) — أو null.
 * يُفكّ ترميزه فيقبل المعرّفات التي تحمل محارف مرمّزة.
 */
export function resourceIdFromHash(): string | null {
  if (typeof window === 'undefined') return null
  const h = window.location.hash.replace(/^#\/?/, '').split(/[&?#]/)[0]
  const [, id] = h.split('/')
  if (!id) return null
  try {
    return decodeURIComponent(id)
  } catch {
    // معرّف مرمّز بشكل خاطئ: يُعامَل كغياب معرّف لا كانهيار.
    return null
  }
}

/**
 * يضبط `#/exercises/<id>` أو يعود إلى `#/exercises`.
 * الفتح يدفع مدخل تاريخ افتراضيًا كي يعمل الرجوع من التفصيل إلى المكتبة.
 * الاستبدال مخصّص للمعرّف المجهول أو رابط عميق مباشر، فلا نصنع حلقة تاريخ
 * تعيد المستخدم إلى معرّف غير صالح أو تخرجه من التطبيق عبر زر الواجهة.
 */
export function setExerciseHash(exerciseId: string | null, mode: 'push' | 'replace' = 'push'): void {
  if (typeof window === 'undefined') return
  const target = exerciseId ? `#/exercises/${encodeURIComponent(exerciseId)}` : '#/exercises'
  if (window.location.hash === target) return
  if (mode === 'replace') {
    window.location.replace(target)
    return
  }
  window.location.hash = target.slice(1)
}

/** يضبط hash المسار (يُطلق hashchange). */
export function setHashRoute(route: AppRoute): void {
  if (typeof window === 'undefined') return
  // [QIM-WEB-FOUNDER-UX-006/حزمة ٦] لا يُمحى معرّف المورد.
  //
  // كان الشرط مقارنةً حرفية بالـhash كاملًا، فـ`#/exercises/<id>` يخالف
  // `#/exercises` فيُستبدل — أي أن تحديث الصفحة على رابط عميق **يمحو التمرين
  // المفتوح** ويعيد المكتبة. المسار نفسه لم يتغيّر؛ ما تغيّر هو المورد داخله.
  // فالمقارنة صارت على **مقطع المسار**: إن كان الـhash يشير أصلًا إلى هذا
  // المسار (بمعرّف أو بدونه) فلا شيء يُكتب.
  if (routeFromHash() === route) return
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
