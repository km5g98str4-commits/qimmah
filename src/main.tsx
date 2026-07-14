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
import { initNativeShell } from './lib/nativeShell'
import { initDeepLinkRecovery } from './lib/deepLinkRecovery'
// وحدة PWA: تلتقط حدث beforeinstallprompt مبكرًا (يُطلق مرّة واحدة فقط) لعرض زر التثبيت لاحقًا.
import './lib/pwa'
// خطوط مُستضافة ذاتيًا (Tajawal) — بلا CDN وقت التشغيل، مهم للنسخة الأصلية/دون اتصال.
import './design-system/fonts'
import './styles/index.css'
// طبقة الرموز الدلالية (seam) — إضافية وعكوسة، تُحيل للقيم الحالية المؤقتة فقط
// (ليست هوية معتمدة). نقطة الإسقاط لرموز Cloud Design المعتمدة لاحقًا.
import './design-system/tokens.css'
// v2.1 افتراضي في إنتاج الويب/التطبيق عبر ختم HTML؛ وفي التطوير تبقى معاينة
// `?design=v1|v2` العكوسة عبر الوحدة نفسها.
import { initDesignPreview } from './design-system/designPreview'

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

// معاينة v2.1 (مطوّر فقط) — تُضبط قبل أول رسم لتفادي وميض تبديل الهوية؛ no-op في الإنتاج.
initDesignPreview()

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
