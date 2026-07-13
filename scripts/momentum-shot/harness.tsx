// Development-only visual proof harness. It renders the real v2 surfaces with
// seeded local data; this entry is never referenced by the production build.
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from '@/i18n'
import { AuthProvider } from '@/lib/authContext'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import { getDefaultCustomization } from '@/lib/customization'
import { MobileShell, type MainTab } from '@/components/MobileShell'
import { StartViewV2 } from '@/views/StartViewV2'
import { OnboardingV2 } from '@/views/OnboardingV2'
import { TodayV2 } from '@/views/TodayV2'
import { NutritionV2 } from '@/views/NutritionV2'
import { ProgressV2 } from '@/views/ProgressV2'
import { ProfileV2 } from '@/views/ProfileV2'
import { WorkoutV2 } from '@/views/WorkoutV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

type Surface = 'welcome' | 'onboarding' | 'today' | 'nutrition' | 'progress' | 'profile' | 'workout' | 'summary'

const params = new URLSearchParams(location.search)
const surface = (params.get('surface') ?? 'today') as Surface
const now = new Date()
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const iso = now.toISOString()

document.documentElement.dataset.design = 'v2'
document.documentElement.lang = 'ar'
document.documentElement.dir = 'rtl'
localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: 'ar' }))

const customization = getDefaultCustomization()
customization.identity.userName = 'أحمد'
customization.identity.mainGoal = 'تنشيف'
customization.profile.name = 'أحمد'
customization.profile.goal = 'cut'
customization.profile.trainingDaysPerWeek = 4
customization.profile.workoutDurationMinutes = 45
customization.profile.weightKg = 81.2
customization.profile.targetWeightKg = 77
customization.targetsMeta.manuallyEdited = true
customization.nutritionPlan.targetCalories = 2200
customization.nutritionPlan.targetProtein = 160

function seedReviewData() {
  localStorage.setItem('qimmah:history:migrated:v1', 'done')
  localStorage.setItem('qimmah:onboarding:profile:v1', JSON.stringify({ goal: 'cut', days: 4, duration: 45 }))
  localStorage.setItem('qimmah:steps:v1', JSON.stringify({ [stamp]: 8200 }))
  localStorage.setItem(
    'qimmah:nutrition:v2',
    JSON.stringify({
      date: stamp,
      waterMl: 1750,
      foods: [
        { id: 'review-1', nameAr: 'شوفان ولبن', calories: 520, protein: 32, carbs: 68, fat: 12, meal: 'breakfast' },
        { id: 'review-2', nameAr: 'دجاج وأرز', calories: 780, protein: 58, carbs: 92, fat: 18, meal: 'lunch' },
      ],
    }),
  )
  localStorage.setItem(
    'qimmah:history:nutritionLogs:v1',
    JSON.stringify({ [stamp]: { date: stamp, loggedFood: { calories: 1300, protein: 90, carbs: 160, fat: 30 }, updatedAt: iso } }),
  )
  const set = (setNumber: number, weightKg: string) => ({ setNumber, targetReps: '8–10', actualReps: '10', weightKg, completed: true })
  localStorage.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify([
      {
        id: 'review-session-1', date: stamp, startedAt: new Date(now.getTime() - 3_600_000).toISOString(), finishedAt: iso,
        workoutDayId: 'full-body-a', workoutDayName: 'الجسم الكامل',
        exercises: [{ exerciseId: 'barbell-bench-press', targetSets: 3, targetReps: '8–10', targetRestSec: 90, completed: true, sets: [set(1, '55'), set(2, '57.5'), set(3, '60')] }],
      },
    ]),
  )
  localStorage.setItem(
    'qimmah:history:measurementLogs:v1',
    JSON.stringify([
      { id: 'review-weight-2', date: stamp, values: { weightKg: 81.2, waistCm: 87 } },
      { id: 'review-weight-1', date: new Date(now.getTime() - 10 * 86_400_000).toISOString().slice(0, 10), values: { weightKg: 82.1, waistCm: 88 } },
    ]),
  )
}

seedReviewData()

const noop = () => undefined
const shellFor: Record<'today' | 'nutrition' | 'progress' | 'profile', { tab: MainTab; view: JSX.Element }> = {
  today: { tab: 'dashboard', view: <TodayV2 lang="ar" onNavigate={noop} /> },
  nutrition: { tab: 'nutrition', view: <NutritionV2 lang="ar" /> },
  progress: { tab: 'progress', view: <ProgressV2 lang="ar" onNavigate={noop} /> },
  profile: { tab: 'profile', view: <ProfileV2 lang="ar" onNavigate={noop} /> },
}

export function SurfaceView() {
  if (surface === 'welcome') return <StartViewV2 lang="ar" onLogin={noop} onSignup={noop} />
  if (surface === 'onboarding' || surface === 'summary') return <OnboardingV2 lang="ar" onComplete={noop} onExit={noop} />
  if (surface === 'workout') return <WorkoutV2 lang="ar" onNavigate={noop} />
  const current = shellFor[surface as keyof typeof shellFor]
  return (
    <MobileShell lang="ar" tab={current.tab} badge="account" onNavigate={noop} onOpenSettings={noop}>
      {current.view}
    </MobileShell>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <LanguageProvider>
      <AuthProvider>
        <StaticCustomizationProvider customization={customization}>
          <SurfaceView />
        </StaticCustomizationProvider>
      </AuthProvider>
    </LanguageProvider>,
  )
}
