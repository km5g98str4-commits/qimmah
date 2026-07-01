import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SplashScreen } from './components/SplashScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomizationProvider } from './lib/customizationContext'
import { AuthProvider } from './lib/authContext'
import { registerStepBridge } from './lib/stepCounter'
// وحدة PWA: تلتقط حدث beforeinstallprompt مبكرًا (يُطلق مرّة واحدة فقط) لعرض زر التثبيت لاحقًا.
import './lib/pwa'
import './styles/index.css'

// سيم الخطوات: يُتيح لغلاف أصلي مستقبلي (تطبيق آيفون يقرأ Apple Health) دفع الخطوات.
registerStepBridge()

// تسجيل عامل الخدمة (PWA) — في الإنتاج فقط حتى لا يتعارض مع خادم التطوير (HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
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
      <AuthProvider>
        <CustomizationProvider>
          <App />
          <SplashScreen />
        </CustomizationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
