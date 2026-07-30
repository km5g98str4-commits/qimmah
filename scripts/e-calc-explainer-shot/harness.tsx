import { createRoot } from 'react-dom/client'
import { CalcExplainerView } from '@/views/CalcExplainerView'
import { LanguageProvider } from '@/i18n'
import { getDefaultCustomization } from '@/lib/customization'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const params = new URLSearchParams(location.search)
const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar'
const state = params.get('state') ?? 'filled'
const customization = getDefaultCustomization()

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = lang
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
customization.profile.name = lang === 'ar' ? 'أحمد' : 'Ahmed'
customization.profile.gender = 'male'
customization.profile.age = 30
customization.profile.heightCm = 178
customization.profile.weightKg = state === 'error' ? Number.MAX_VALUE : state === 'empty' ? 0 : 85
customization.profile.targetWeightKg = 78
customization.profile.activityLevel = 'moderate'
customization.profile.trainingDays = 4
customization.profile.goalType = 'cutting'
customization.profile.goal = 'cut'
customization.targetsMeta.manuallyEdited = params.get('manual') === '1'
if (customization.targetsMeta.manuallyEdited) customization.targets.targetCalories = 2100

const today = new Date()
const day = (daysAgo: number) => new Date(today.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10)
localStorage.setItem('qimmah:history:migrated:v1', 'done')
localStorage.setItem('qimmah:history:measurementLogs:v1', JSON.stringify([
  { id: 'e-calc-weight-2', date: day(0), values: { weightKg: 84.2 } },
  { id: 'e-calc-weight-1', date: day(14), values: { weightKg: 85 } },
]))

const noop = () => undefined
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <LanguageProvider>
      <StaticCustomizationProvider customization={customization}>
        <CalcExplainerView lang={lang} onBack={noop} onEditProfile={noop} />
      </StaticCustomizationProvider>
    </LanguageProvider>,
  )
}
