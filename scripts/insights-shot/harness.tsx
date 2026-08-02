// Dev-only isolation harness for the Insights engine UI (feat/insights-engine).
// Mounts <ProgressV2> (brief) or <TodayV2> (weekly card) inside the REAL
// CustomizationProvider with localStorage seeded to a cutting reviewer profile —
// so the «رؤى الأسبوع» cards render without the auth/route shell. Data is seeded
// through the same store keys production writes. Never shipped: not referenced by
// index.html entry, so `vite build` excludes it; only `vite dev` serves this path.

import { createRoot } from 'react-dom/client'
import { CustomizationProvider } from '@/lib/customizationContext'
import { ProgressV2 } from '@/views/ProgressV2'
import { TodayV2 } from '@/views/TodayV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const now = new Date()
const DAY = 86400000
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const iso = (ms: number) => new Date(ms).toISOString()

localStorage.clear()
document.documentElement.dataset.design = 'v2'
document.documentElement.dir = 'rtl'
localStorage.setItem('qimmah:history:migrated:v1', 'done')
localStorage.setItem('qimmah:onboarding:profile:v1', '{}') // onboarded

// Reviewer profile — cutting goal, protein target 160.
localStorage.setItem('qimmah:customization:v1', JSON.stringify({
  profile: { name: 'أحمد', goal: 'cut', workoutDuration: 45, weightKg: 82, targetWeightKg: 76 },
  targetsMeta: { manuallyEdited: true },
  nutritionPlan: { targetCalories: 2200, targetProtein: 160 },
}))

// Weight: 8 points over ~24 days trending 82.0 → 80.2 (a real cutting slope).
const weights = Array.from({ length: 8 }, (_, i) => ({ id: 'm' + i, date: stamp(now.getTime() - (7 - i) * 3 * DAY), values: { weightKg: Math.round((82 - 0.075 * (i * 3)) * 10) / 10 } }))
localStorage.setItem('qimmah:measurementLogs:v1', JSON.stringify(weights))

// Finished sessions: this week (×2) + last week (×1); bench top set 96 near a 100 PR.
const mkEx = (id: string, w: number) => ({ exerciseId: id, targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true, sets: [{ setNumber: 1, targetReps: '8', actualReps: '8', weightKg: String(w), completed: true }] })
localStorage.setItem('qimmah:history:workoutSessions:v1', JSON.stringify([
  { id: 's1', date: stamp(now.getTime() - 1 * DAY), startedAt: iso(now.getTime() - 1 * DAY), finishedAt: iso(now.getTime() - 1 * DAY + 3.6e6), workoutDayId: 'd1', workoutDayName: 'صدر', exercises: [mkEx('barbell-bench-press', 96), mkEx('incline-press', 40)] },
  { id: 's2', date: stamp(now.getTime() - 3 * DAY), startedAt: iso(now.getTime() - 3 * DAY), finishedAt: iso(now.getTime() - 3 * DAY + 3.6e6), workoutDayId: 'd2', workoutDayName: 'ظهر', exercises: [mkEx('deadlift', 120)] },
  { id: 's3', date: stamp(now.getTime() - 8 * DAY), startedAt: iso(now.getTime() - 8 * DAY), finishedAt: iso(now.getTime() - 8 * DAY + 3.6e6), workoutDayId: 'd1', workoutDayName: 'صدر', exercises: [mkEx('barbell-bench-press', 92)] },
]))
localStorage.setItem('qimmah:history:exerciseHistory:v1', JSON.stringify({
  'barbell-bench-press': { bestWeight: '100', lastWeight: '96', lastCompletedAt: iso(now.getTime() - 1 * DAY) },
  'deadlift': { bestWeight: '140', lastWeight: '120' },
}))

// Nutrition: 4 logged days, protein hits target on 2 of them.
localStorage.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify({
  [stamp(now.getTime())]: { date: stamp(now.getTime()), doneMeals: {}, loggedFood: { calories: 2100, protein: 170, carbs: 0, fat: 0 }, updatedAt: iso(now.getTime()) },
  [stamp(now.getTime() - 1 * DAY)]: { date: stamp(now.getTime() - 1 * DAY), doneMeals: {}, loggedFood: { calories: 1900, protein: 120, carbs: 0, fat: 0 }, updatedAt: iso(now.getTime()) },
  [stamp(now.getTime() - 2 * DAY)]: { date: stamp(now.getTime() - 2 * DAY), doneMeals: {}, loggedFood: { calories: 2050, protein: 165, carbs: 0, fat: 0 }, updatedAt: iso(now.getTime()) },
  [stamp(now.getTime() - 3 * DAY)]: { date: stamp(now.getTime() - 3 * DAY), doneMeals: {}, loggedFood: { calories: 1800, protein: 110, carbs: 0, fat: 0 }, updatedAt: iso(now.getTime()) },
}))

const view = new URLSearchParams(location.search).get('view') ?? 'progress'
const noop = () => {}
createRoot(document.getElementById('root')!).render(
  view === 'today'
    ? <CustomizationProvider><TodayV2 lang="ar" onNavigate={noop} /></CustomizationProvider>
    : <CustomizationProvider><ProgressV2 lang="ar" onNavigate={noop} /></CustomizationProvider>,
)
