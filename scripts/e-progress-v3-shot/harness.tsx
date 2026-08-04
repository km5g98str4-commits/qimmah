// Development-only visual proof harness for lane E. It renders the production
// ProgressV2 surface with deterministic local data in Arabic or English.
import { createRoot } from 'react-dom/client'
import { MobileShell } from '@/components/MobileShell'
import { ProgressV2 } from '@/views/ProgressV2'
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
const now = new Date()
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const iso = now.toISOString()
const day = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10)
const finished = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = lang
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: lang }))

const customization = getDefaultCustomization()
customization.identity.userName = lang === 'ar' ? 'أحمد' : 'Ahmed'
customization.identity.mainGoal = lang === 'ar' ? 'تنشيف' : 'Cut'
customization.profile.name = customization.identity.userName
customization.profile.goal = 'cut'
customization.profile.trainingDaysPerWeek = 4
customization.profile.workoutDurationMinutes = 45
customization.profile.weightKg = 81.2
customization.profile.targetWeightKg = 77
customization.targetsMeta.manuallyEdited = true

localStorage.setItem('qimmah:history:migrated:v1', 'done')
localStorage.setItem('qimmah:onboarding:profile:v1', JSON.stringify({
  goal: { type: 'cut' },
  trainingPreferences: { daysPerWeek: 4, sessionDurationMin: 45, environment: 'commercial_gym' },
  consents: { healthData: { accepted: true, policyVersion: '2026-07-13' } },
  _meta: { schemaVersion: 2, completed: true, source: 'onboarding' },
}))

const set = (setNumber: number, weightKg: string) => ({
  setNumber,
  targetReps: '8–10',
  actualReps: '10',
  weightKg,
  completed: true,
})
const sessions = [12, 10, 8, 6, 3, 0].map((daysAgo, index) => {
  const top = 50 + index * 2
  return {
    id: `lane-e-session-${index + 1}`,
    date: day(daysAgo),
    startedAt: new Date(new Date(finished(daysAgo)).getTime() - 3_600_000).toISOString(),
    finishedAt: finished(daysAgo),
    workoutDayId: 'full-body-a',
    workoutDayName: lang === 'ar' ? 'الجسم الكامل' : 'Full body',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      targetSets: 3,
      targetReps: '8–10',
      targetRestSec: 90,
      completed: true,
      sets: [set(1, String(top - 2)), set(2, String(top - 1)), set(3, String(top))],
    }],
  }
}).reverse()

localStorage.setItem('qimmah:history:workoutSessions:v1', JSON.stringify(sessions))
localStorage.setItem('qimmah:history:exerciseHistory:v1', JSON.stringify({
  'barbell-bench-press': {
    lastWeight: '60',
    bestWeight: '60',
    lastReps: '10',
    lastCompletedAt: iso,
    totalSessions: 6,
  },
}))
localStorage.setItem('qimmah:achievements:v1', JSON.stringify({
  unlocked: { 'first-workout': stamp, 'first-pr': stamp },
  proteinDays: [],
  prCount: 3,
}))
localStorage.setItem('qimmah:history:measurementLogs:v1', JSON.stringify([
  { id: 'lane-e-weight-2', date: stamp, values: { weightKg: 81.2, waistCm: 87, bodyFatPercent: 18 } },
  { id: 'lane-e-weight-1', date: day(10), values: { weightKg: 82.1, waistCm: 88 } },
]))
localStorage.removeItem('qimmah:measurementLogs:v1')

const noop = () => undefined
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <LanguageProvider>
      <AuthProvider>
        <StaticCustomizationProvider customization={customization}>
          <MobileShell lang={lang} tab="progress" badge="account" onNavigate={noop} onOpenSettings={noop}>
            <ProgressV2 lang={lang} onNavigate={noop} />
          </MobileShell>
        </StaticCustomizationProvider>
      </AuthProvider>
    </LanguageProvider>,
  )
}
