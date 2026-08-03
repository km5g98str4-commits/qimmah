import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { SplashScreen } from './components/SplashScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomizationProvider } from './lib/customizationContext'
import { AuthProvider } from './lib/authContext'
import { LanguageProvider } from './i18n'
import { registerStepBridge } from './lib/stepCounter'
import { initTheme } from './lib/appPreferences'
import { initAnalytics, track } from './lib/analytics'
import { initTrackingDevViewer } from './lib/tracking'
import { initNativeShell } from './lib/nativeShell'
import { initDeepLinkRecovery } from './lib/deepLinkRecovery'
import { captureMonitoringError, initMonitoring } from './lib/monitoring'
import { refreshHealthKitStepsIfEnabled } from './lib/healthKit'
// وحدة PWA: تلتقط حدث beforeinstallprompt مبكرًا (يُطلق مرّة واحدة فقط) لعرض زر التثبيت لاحقًا.
import './lib/pwa'
// خطوط مُستضافة ذاتيًا (Tajawal) — بلا CDN وقت التشغيل، مهم للنسخة الأصلية/دون اتصال.
import './design-system/fonts'
import './styles/index.css'
// طبقة الرموز الدلالية (seam) — إضافية وعكوسة، تُحيل للقيم الحالية المؤقتة فقط
// (ليست هوية معتمدة). نقطة الإسقاط لرموز Cloud Design المعتمدة لاحقًا.
import './design-system/tokens.css'

// المظهر (شاشة 66): طبّق الثيم المختار قبل الرسم الأول وواكب النظام إن كان «النظام».
initTheme()

// سيم الخطوات: يستقبل إجماليات HealthKit من plugin iOS المحلي داخل المتجر نفسه.
registerStepBridge()
// Refreshes only after a prior explicit opt-in; never requests HealthKit permission on launch.
void refreshHealthKitStepsIfEnabled()

// تهيئة التحليلات (مضبوطة بالموافقة، مجهولة، بلا SDK خارجي) قبل الرسم الأول.
initAnalytics()
// [CTO-68] البند ٥ — عارض أحداث التتبّع المحلي في وحدة التحكّم. تطوير فقط:
// جسم الدالة محكوم بـ`import.meta.env.DEV` فيسقط من حزمة الإنتاج، ولا شاشة مستخدم له.
initTrackingDevViewer()
// Privacy-first monitoring: no DSN means the SDK is not even imported and no init/network can occur.
void initMonitoring()
// أخطاء عامّة غير ملتقَطة — إشارة استقرار فقط (اسم الخطأ، بلا رسالة/بيانات).
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    track('unhandled_error', { source: 'window', name: e.error instanceof Error ? e.error.name : undefined })
    captureMonitoringError(e.error ?? new Error('Window error'), 'window')
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason
    track('unhandled_error', { source: 'promise', name: r instanceof Error ? r.name : undefined })
    captureMonitoringError(r, 'promise')
  })
}

// تسجيل عامل الخدمة (PWA) — للويب فقط في الإنتاج.
// داخل Capacitor (iOS/Android) الأصول تُخدَّم محليًا من الحزمة الأصلية، وتشغيل Service
// Worker داخل الـ WebView قد يتعارض مع كاش القشرة ودورة تحديث الأصول، فنُبقيه للويب
// ونُعطّله على المنصّات الأصلية.
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // فشل التسجيل لا يجب أن يكسر التطبيق — يبقى يعمل أونلاين طبيعيًا.
    })
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('عنصر root غير موجود في index.html')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <CustomizationProvider>
            <App />
            <SplashScreen />
          </CustomizationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// قشرة النظام الأصلية (شريط الحالة + إخفاء شاشة الإقلاع) — بعد الرسم، أصلي فقط, no-op على الويب.
void initNativeShell()

// سباكة الرابط العميق للاستعادة (appUrlOpen) — أصلي فقط، no-op على الويب. توصِل رابط استعادة
// كلمة المرور القادم من البريد إلى داخل التطبيق فيهبط المستخدم على شاشة «كلمة مرور جديدة».
void initDeepLinkRecovery()
