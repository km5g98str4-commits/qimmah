// كشف منصّة التشغيل — للتمييز بين الويب وغلاف Capacitor الأصلي (iOS/Android).
import { Capacitor } from '@capacitor/core'

/** هل نعمل داخل غلاف Capacitor أصلي (iOS/Android) بدل متصفّح الويب؟ */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * هل تُعرض مسارات الشراء/الدفع الخارجية (checkout/pricing/premium)؟
 *
 * ممنوعة داخل نسخة iOS وفق App Store Guideline 3.1.1: المحتوى/الاشتراك الرقمي داخل iOS
 * يجب أن يمرّ عبر Apple In-App Purchase، فلا نعرض أي checkout خارجي على المنصّة الأصلية.
 * إصدار iOS v1 مجاني بالكامل — نُخفي هذه المسارات على الأصلي ونُبقي سلوك الويب كما هو.
 */
export function showExternalPurchase(): boolean {
  return !Capacitor.isNativePlatform()
}
