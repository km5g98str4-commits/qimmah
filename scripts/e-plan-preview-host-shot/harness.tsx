import { createRoot } from 'react-dom/client'
import { PlanPreviewView } from '@/views/PlanPreviewView'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { buildPlanRationale } from '@/lib/planRationale'
import type { Lang } from '@/lib/appPreferences'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const params = new URLSearchParams(location.search)
const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar'
const plan = generatePlan(defaultProfile)
const rationale = buildPlanRationale(defaultProfile, plan)
const noop = () => undefined

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = lang
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <PlanPreviewView
      lang={lang}
      state={{ status: 'filled', plan, goalType: defaultProfile.goalType, rationale }}
      onBack={noop}
      onRetry={noop}
      onEdit={noop}
      onSave={noop}
    />,
  )
}
