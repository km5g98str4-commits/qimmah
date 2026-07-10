// قشرة النظام الأصلية (Capacitor) — شريط الحالة + إخفاء شاشة الإقلاع.
//
// نطاق: iOS/Android الأصلي فقط. على الويب: no-op تام. تفشل بهدوء إن غابت الإضافة،
// فلا تُسقط الويب أبدًا. لا تغيّر أي سلوك بصري على الويب.
//
// ⚠️ القيم هنا مؤقتة: تعكس الخلفية الداكنة الحالية (#101216 ≈ --c-page) بانتظار هوية
// Cloud Design المعتمدة. ليست قرار تصميم نهائيًا — لا لون علامة جديد، لا لوحة جديدة.

import { Capacitor } from '@capacitor/core'

/** لون خلفية شريط الحالة المؤقّت (أندرويد فقط) — نفس خلفية التطبيق الحالية. مؤقّت. */
const TEMP_STATUS_BAR_BG = '#101216'

/**
 * تُهيّئ قشرة النظام الأصلية مرّة واحدة عند الإقلاع. آمنة للاستدعاء على الويب (تعود فورًا).
 */
export async function initNativeShell(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

  // شريط الحالة: نصّ فاتح مناسب لخلفية داكنة مؤقتة، وبلا تراكب فوق الـ WebView.
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark }) // Style.Dark = نصّ فاتح لخلفية داكنة
    await StatusBar.setOverlaysWebView({ overlay: false })
    if (Capacitor.getPlatform() === 'android') {
      // لون خلفية الشريط مدعوم على أندرويد فقط (iOS يتجاهله). قيمة مؤقتة.
      await StatusBar.setBackgroundColor({ color: TEMP_STATUS_BAR_BG })
    }
  } catch {
    /* إضافة شريط الحالة غير متاحة — تجاهل بهدوء (لا نُسقط التطبيق) */
  }

  // شاشة الإقلاع الأصلية: نُخفيها بعد جهوزية الحزمة لتفادي بقائها معلّقة.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* إضافة شاشة الإقلاع غير متاحة — تجاهل بهدوء */
  }
}
