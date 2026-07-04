// حالة دعوة تثبيت التطبيق (P12) — علم الإغلاق الدائم + كشف iOS/Safari للتلميح اليدوي.
// يبني فوق أدوات pwa.ts (التقاط beforeinstallprompt، standalone) بلا تكرار.

/** مفتاح الإغلاق الدائم لدعوة التثبيت (النسخة v1). */
export const INSTALL_PROMPT_DISMISSED_KEY = 'qimmah:installPromptDismissed:v1'

/** هل أغلق المستخدم دعوة التثبيت سابقًا (فلا تظهر ثانيةً)؟ */
export function isInstallPromptDismissed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1'
  } catch {
    // تخزين غير متاح (خصوصية صارمة) — نعامله كغير مُغلق ونعتمد على حالة الجلسة.
    return false
  }
}

/** يثبّت علم الإغلاق الدائم. */
export function dismissInstallPrompt(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1')
  } catch {
    // تخزين غير متاح — نُغلق للجلسة فقط (تتكفّل به حالة المكوّن).
  }
}

/**
 * هل الجهاز iOS يعمل داخل Safari (لا يدعم beforeinstallprompt — يحتاج تلميح «أضف للشاشة الرئيسية»)؟
 * الكشف: iphone/ipad/ipod في UA (أو آيباد متنكّر كـ Mac باللمس)، واستبعاد متصفحات آيفون الأخرى
 * (Chrome/Firefox/Edge/Opera على iOS تحمل CriOS/FxiOS/EdgiOS/OPiOS في الـ UA).
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  const iPadOS = ua.includes('Macintosh') && (navigator.maxTouchPoints ?? 0) > 1
  if (!iOSDevice && !iPadOS) return false
  // متصفحات غير Safari على iOS (كلها WebKit لكنها لا تُظهر «أضف للشاشة الرئيسية» بنفس المسار).
  const nonSafari = /crios|fxios|edgios|opios|mercury/i.test(ua)
  return !nonSafari
}
