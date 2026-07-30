// Development-only visual proof harness. It renders the production StepsView
// with deterministic local data; no production logic is replaced.
import { createRoot } from 'react-dom/client'
import type { Lang } from '@/lib/appPreferences'
import { StepsView } from '@/views/StepsView'
import { getDayStamp } from '@/lib/today'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const params = new URLSearchParams(location.search)
const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ar'
const state = params.get('state') === 'empty' ? 'empty' : params.get('state') === 'error' ? 'error' : 'filled'
const now = new Date()
const day = (daysAgo: number) => {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return getDayStamp(date)
}

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = lang
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))
localStorage.setItem('qimmah:stepGoal:v1', JSON.stringify(10_000))
localStorage.setItem('qimmah:healthkit:v1', JSON.stringify({
  enabled: state === 'error',
  permission: state === 'error' ? 'authorized' : 'not-determined',
  metrics: state === 'error'
    ? { steps: { enabled: true, permission: 'authorized', lastUpdate: new Date().toISOString() } }
    : {},
}))

if (state !== 'empty') {
  const values = [8_420, 10_550, 7_830, 11_240, 9_100, 12_600, 6_780]
  const log = Object.fromEntries(values.map((steps, index) => [day(6 - index), steps]))
  localStorage.setItem('qimmah:steps:v1', JSON.stringify(log))
  localStorage.setItem('qimmah:stepSource:v1', JSON.stringify(
    Object.fromEntries(values.map((_, index) => [day(6 - index), index < 4 ? 'healthkit' : 'manual'])),
  ))
} else {
  localStorage.removeItem('qimmah:steps:v1')
  localStorage.removeItem('qimmah:stepSource:v1')
}

const noop = () => undefined
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<StepsView lang={lang} onBack={noop} onOpenSettings={noop} />)
  if (state === 'error') {
    window.setTimeout(() => {
      const refresh = document.querySelector<HTMLButtonElement>('[data-testid="steps-refresh"]')
      refresh?.click()
    }, 50)
  }
}
