import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SplashScreen } from './components/SplashScreen'
import { CustomizationProvider } from './lib/customizationContext'
import { AuthProvider } from './lib/authContext'
import { registerStepBridge } from './lib/stepCounter'
import './styles/index.css'

// سيم الخطوات: يُتيح لغلاف أصلي مستقبلي (تطبيق آيفون يقرأ Apple Health) دفع الخطوات.
registerStepBridge()

const root = document.getElementById('root')
if (!root) throw new Error('عنصر root غير موجود في index.html')

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <CustomizationProvider>
        <App />
        <SplashScreen />
      </CustomizationProvider>
    </AuthProvider>
  </StrictMode>,
)
