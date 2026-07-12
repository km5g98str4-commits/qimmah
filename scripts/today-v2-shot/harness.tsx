// Dev-only isolation harness for the Today v2.1 Command Center (Slice 3).
//
// Mounts <TodayV2> inside its REAL CustomizationProvider with localStorage seeded
// to produce each of the three founder-stress-tested states — normal · new-user ·
// after-workout — so the states can be screenshotted without the auth/route shell.
// Data is seeded through the same storage keys the app writes, so the model reads
// exactly what production would. Never shipped: not referenced by index.html, so
// `vite build` (index.html entry) excludes it; only `vite dev` serves this path.

import { createRoot } from 'react-dom/client'
import { CustomizationProvider } from '@/lib/customizationContext'
import { TodayV2 } from '@/views/TodayV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const now = new Date()
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const iso = now.toISOString()

type Seed = { wellness?: boolean }

function customization(seed: Seed): string {
  return JSON.stringify({
    profile: { name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    // manuallyEdited stops withFreshTargets from recomputing our explicit targets.
    targetsMeta: { manuallyEdited: true },
    nutritionPlan: { targetCalories: 2200, targetProtein: 160 },
    ...(seed.wellness ? { wellnessPlan: { enabled: true, supplements: [{ id: 's1', supplementId: 'magnesium', order: 0 }], medications: [] } } : {}),
  })
}

function seedCommon(seed: Seed = {}): void {
  localStorage.clear()
  document.documentElement.dataset.design = 'v2'
  document.documentElement.dir = 'rtl'
  localStorage.setItem('qimmah:history:migrated:v1', 'done') // protect seeded history keys
  localStorage.setItem('qimmah:onboarding:profile:v1', '{}') // any value → onboarded
  localStorage.setItem('qimmah:customization:v1', customization(seed))
}

function setSteps(n: number): void {
  localStorage.setItem('qimmah:steps:v1', JSON.stringify({ [stamp]: n }))
}

function setNutrition(calories: number, protein: number): void {
  localStorage.setItem(
    'qimmah:history:nutritionLogs:v1',
    JSON.stringify({ [stamp]: { date: stamp, doneMeals: {}, loggedFood: { calories, protein, carbs: 0, fat: 0 }, updatedAt: iso } }),
  )
}

function setFinishedSession(): void {
  localStorage.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify([
      {
        id: 'sess-shot-1',
        date: stamp,
        startedAt: new Date(now.getTime() - 3_600_000).toISOString(),
        finishedAt: iso,
        workoutDayId: 'd1',
        workoutDayName: 'الصدر والكتف',
        exercises: [{ exerciseId: 'bench-press', targetSets: 4, targetReps: '8-12', targetRestSec: 90, completed: true }],
      },
    ]),
  )
}

const state = new URLSearchParams(location.search).get('state') ?? 'normal'
if (state === 'newUser') {
  seedCommon() // onboarded + plan ready, but no history → new-user (low data)
} else if (state === 'afterWorkout') {
  seedCommon({ wellness: true })
  setSteps(10_200) // movement goal met → done ✓
  setNutrition(1540, 125) // 70% calories · 35g protein left → post-workout fuel
  setFinishedSession() // → after-workout state
} else {
  seedCommon()
  setSteps(8000) // 80% movement (active ring)
  setNutrition(1320, 125) // 60% calories (active ring) · 35g protein left
}

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <CustomizationProvider>
      <TodayV2 lang="ar" onNavigate={() => undefined} />
    </CustomizationProvider>,
  )
}
