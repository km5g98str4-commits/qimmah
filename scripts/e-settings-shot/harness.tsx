import { createRoot } from 'react-dom/client'
import { SettingsView } from '@/views/SettingsView'
import { LanguageProvider } from '@/i18n'
import { AuthProvider } from '@/lib/authContext'
import { getDefaultCustomization } from '@/lib/customization'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const params = new URLSearchParams(location.search)
const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar'
const customization = getDefaultCustomization()
const noop = () => undefined

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = lang
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <LanguageProvider>
      <AuthProvider>
        <StaticCustomizationProvider customization={customization}>
          <SettingsView
            lang={lang}
            onNavigate={noop}
            onEditPlan={noop}
            onLogin={noop}
            onOpenPrivacy={noop}
            onOpenTerms={noop}
            onOpenProductReview={noop}
            onOpenCalc={noop}
          />
        </StaticCustomizationProvider>
      </AuthProvider>
    </LanguageProvider>,
  )
}
