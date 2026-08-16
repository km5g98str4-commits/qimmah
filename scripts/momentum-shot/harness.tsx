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
import { SetupView } from '@/views/SetupView'
import { EntitlementProvider } from '@/lib/access/provider'
import { TodayV2 } from '@/views/TodayV2'
import { NutritionV2 } from '@/views/NutritionV2'
import { ProgressV2 } from '@/views/ProgressV2'
import { ProfileV2 } from '@/views/ProfileV2'
import { WorkoutV2 } from '@/views/WorkoutV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

type Surface = 'welcome' | 'onboarding' | 'today' | 'nutrition' | 'progress' | 'profile' | 'workout' | 'summary' | 'reveal'

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
  // سطح «الكشف» يمثّل **أوّل إكمال على الإطلاق**، فلا يُزرع له ملفّ مكتمل.
  //
  // وهذا ليس تفصيلًا: الزرع يضع `_meta.completed = true`، فيقرأ الكاتب
  // «تحوير خطة قائمة» ويطلب `plan.saveEdit` — فتفتح الواجهة بوّابة Premium
  // (وهو السلوك الصحيح لتلك الحالة) ولا يصل المستخدم إلى التسليم أبدًا.
  // فزرعُ حالةٍ متقدّمة تحت اختبارِ حالةٍ أولى يخفي الشاشة التي نختبرها.
  if (surface !== 'reveal') seedProfile()
  seedRest()
}

function seedProfile() {
  localStorage.setItem('qimmah:onboarding:profile:v1', JSON.stringify({
    goal: { type: 'cut' },
    trainingPreferences: { daysPerWeek: 4, sessionDurationMin: 45, environment: 'commercial_gym' },
    consents: { healthData: { accepted: true, policyVersion: '2026-07-13' } },
    _meta: { schemaVersion: 2, completed: true, source: 'onboarding' },
  }))
}

function seedRest() {
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
  const day = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10)
  const finished = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
  const sessions = [12, 10, 8, 6, 3, 0].map((daysAgo, index) => {
    const top = 50 + index * 2
    return {
      id: `review-session-${index + 1}`, date: day(daysAgo), startedAt: new Date(new Date(finished(daysAgo)).getTime() - 3_600_000).toISOString(), finishedAt: finished(daysAgo),
      workoutDayId: 'full-body-a', workoutDayName: 'الجسم الكامل',
      exercises: [{ exerciseId: 'barbell-bench-press', targetSets: 3, targetReps: '8–10', targetRestSec: 90, completed: true, sets: [set(1, String(top - 2)), set(2, String(top - 1)), set(3, String(top))] }],
    }
  }).reverse()
  localStorage.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify(sessions),
  )
  localStorage.setItem('qimmah:history:exerciseHistory:v1', JSON.stringify({ 'barbell-bench-press': { lastWeight: '60', bestWeight: '60', lastReps: '10', lastCompletedAt: iso, totalSessions: 6 } }))
  localStorage.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: { 'first-workout': stamp, 'first-pr': stamp }, proteinDays: [], prCount: 3 }))
  const measurements = [
    { id: 'review-weight-2', date: stamp, values: { weightKg: 81.2, waistCm: 87, bodyFatPercent: 18 } },
    { id: 'review-weight-1', date: day(10), values: { weightKg: 82.1, waistCm: 88 } },
  ]
  localStorage.setItem(
    'qimmah:history:measurementLogs:v1',
    JSON.stringify(measurements),
  )
  // The canonical path above is what sync hydrates. Keep the retired key absent
  // so the visual proof catches any regression back to legacy-only reads.
  localStorage.removeItem('qimmah:measurementLogs:v1')
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
  if (surface === 'welcome') return <StartViewV2 lang="ar" onLogin={noop} onGuest={noop} />
  if (surface === 'onboarding' || surface === 'summary') return <OnboardingV2 lang="ar" onComplete={noop} onExit={noop} />
  // [OVERNIGHT-4] سطح «الكشف» يركّب **المضيف الحقيقي** `SetupView` لا المكوّن
  // وحده. الفرق ليس شكليًّا: `PlanHandoffScreen` لا يُرسَم إلا من مزلاج
  // `SetupView`، فالحصّاد الذي يركّب `OnboardingV2` مباشرةً **لا يرى الكشف
  // إطلاقًا** — وهذا سبب خلوّ أهمّ شاشة تجارية في المنتج من أي تغطية متصفّح.
  if (surface === 'reveal') return <SetupView onClose={noop} mode="onboarding" />
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
          {/* الكشف يقرأ الاستحقاق (نداء التجربة)، فيلزمه مزوّده الحقيقي.
              وبلا ضبط Supabase يعيد `resolveEntitlement` حالة `none` بصدق —
              فالحصّاد يرى ما يراه ضيف حقيقي، لا استحقاقًا مزروعًا. */}
          <EntitlementProvider>
            <SurfaceView />
          </EntitlementProvider>
        </StaticCustomizationProvider>
      </AuthProvider>
    </LanguageProvider>,
  )
}
