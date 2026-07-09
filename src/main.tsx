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
import { initAnalytics, track } from './lib/analytics'
// وحدة PWA: تلتقط حدث beforeinstallprompt مبكرًا (يُطلق مرّة واحدة فقط) لعرض زر التثبيت لاحقًا.
import './lib/pwa'
import './styles/index.css'

// سيم الخطوات: يُتيح لغلاف أصلي مستقبلي (تطبيق آيفون يقرأ Apple Health) دفع الخطوات.
registerStepBridge()

// تهيئة التحليلات (مضبوطة بالموافقة، مجهولة، بلا SDK خارجي) قبل الرسم الأول.
initAnalytics()
// أخطاء عامّة غير ملتقَطة — إشارة استقرار فقط (اسم الخطأ، بلا رسالة/بيانات).
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    track('unhandled_error', { source: 'window', name: e.error instanceof Error ? e.error.name : undefined })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason
    track('unhandled_error', { source: 'promise', name: r instanceof Error ? r.name : undefined })
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
