// سباكة الرابط العميق للاستعادة (iOS/Android عبر Capacitor) — تُوصِل رابط استعادة كلمة المرور
// القادم من البريد إلى داخل التطبيق الأصلي.
//
// السياق: داخل Capacitor WebView تُخدَّم الأصول من capacitor://localhost، ورابط البريد يفتح
// في Safari الخارجي لا في التطبيق — ما لم يُهيَّأ Universal Link/مخطّط مخصّص ويلتقطه مستمع
// appUrlOpen. هنا نستمع للحدث، نستخرج مؤشّرات الاستعادة من الرابط، نضبط الجلسة يدويًا
// (implicit setSession أو PKCE exchangeCodeForSession)، ونوجّه إلى #/reset. حدث
// PASSWORD_RECOVERY الناتج يرفع recoveryActive فتظهر شاشة كلمة المرور الجديدة.
//
// خامل تمامًا على الويب: يعود فورًا عند غياب المنصّة الأصلية (لا استيراد لمكوّن أصلي، لا أثر).

import { Capacitor } from '@capacitor/core'
import { getSupabase } from './supabaseClient'
import { parseRecoveryParams, implicitTokens } from './recoveryState'
import { setHashRoute } from './appRoutes'

/** هل عُولج الرابط بالفعل؟ يمنع المعالجة المزدوجة (رمز أحادي الاستخدام). */
let handled = false

/**
 * يعالج رابطًا واردًا: إن حمل مؤشّر استعادة، يضبط الجلسة ويوجّه لشاشة إعادة التعيين.
 * دالة داخلية مُصدَّرة للاختبار/الاستدعاء اليدوي. آمنة: لا ترمي، ولا تطبع أي رمز.
 */
export async function handleRecoveryUrl(url: string | null | undefined): Promise<boolean> {
  const params = parseRecoveryParams(url)
  if (!params.hasRecovery) return false

  // وجّه لشاشة إعادة التعيين فورًا (قبل تبادل الرمز) كي لا يومض المستخدم على شاشة أخرى.
  setHashRoute('reset')

  const supabase = await getSupabase()
  if (!supabase) return false

  // (أ) التدفّق الضمني: زوج الرموز حاضر — نضبط الجلسة مباشرةً.
  const implicit = implicitTokens(params)
  if (implicit) {
    try {
      const { data, error } = await supabase.auth.setSession(implicit)
      if (!error && data.session) return true
    } catch {
      /* نتابع لمحاولة PKCE */
    }
  }

  // (ب) تدفّق PKCE: نبادل الرمز بجلسة.
  if (params.code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)
      if (!error && data.session) return true
    } catch {
      /* تجاهل — تظهر حالة الرابط المنتهي الهادئة */
    }
  }

  return false
}

/**
 * يهيّئ مستمع الرابط العميق للاستعادة. أصلي فقط (iOS/Android)؛ no-op على الويب.
 * يُستدعى مرّة واحدة عند الإقلاع من main.tsx. لا يرمي أبدًا (فشل الإضافة لا يكسر التطبيق).
 */
export async function initDeepLinkRecovery(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return
  try {
    // استيراد ديناميكي: المكوّن الأصلي لا يدخل حزمة الويب ولا يُقيَّم إلا على المنصّة الأصلية.
    const { App } = await import('@capacitor/app')

    // (١) رابط أطلق فتح التطبيق وهو مغلق: نلتقطه من launchUrl عند الإقلاع.
    try {
      const launch = await App.getLaunchUrl()
      if (launch?.url && !handled) {
        handled = true
        await handleRecoveryUrl(launch.url)
      }
    } catch {
      /* لا رابط إطلاق — عادي */
    }

    // (٢) رابط وصل والتطبيق يعمل (استئناف): مستمع appUrlOpen.
    await App.addListener('appUrlOpen', (event: { url: string }) => {
      void handleRecoveryUrl(event.url)
    })
  } catch {
    // غياب المكوّن/فشل التهيئة لا يجوز أن يكسر الإقلاع — يبقى الويب/بقية التطبيق سليمًا.
  }
}
