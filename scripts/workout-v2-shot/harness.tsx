// Dev-only isolation harness for Workout v2 — screens 31 (substitution) + 27
// (one-handed). Mounts <WorkoutV2> inside its REAL Auth + Customization providers
// with localStorage seeded so the plan resolves and the active session is
// reachable in two taps. Data is seeded through the same storage keys the app
// writes, so the model reads exactly what production would. Never shipped: not
// referenced by index.html, so `vite build` excludes it; only `vite dev` serves it.

import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/lib/authContext'
import { CustomizationProvider } from '@/lib/customizationContext'
import { WorkoutV2 } from '@/views/WorkoutV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

// A back day whose first lift is a machine (great "الجهاز مشغول" demo) with rich,
// equipment-diverse alternatives across the catalog.
const DAY = {
  id: 'day-back',
  nameAr: 'يوم الظهر',
  nameEn: 'Back day',
  exercises: [
    { id: 'slot-0', exerciseId: 'lat-pulldown-machine', sets: 4, reps: '10–12', restSec: 90, order: 0 },
    { id: 'slot-1', exerciseId: 'seated-cable-row', sets: 3, reps: '10–12', restSec: 90, order: 1 },
    { id: 'slot-2', exerciseId: 'barbell-row', sets: 3, reps: '8–10', restSec: 120, order: 2 },
    { id: 'slot-3', exerciseId: 'face-pull', sets: 3, reps: '15', restSec: 60, order: 3 },
  ],
}

function seed(): void {
  localStorage.clear()
  document.documentElement.dataset.design = 'v2'
  document.documentElement.dir = 'rtl'
  document.documentElement.dataset.theme = 'dark'
  localStorage.setItem('qimmah:history:migrated:v1', 'done')
  localStorage.setItem('qimmah:onboarding:profile:v1', '{}')
  localStorage.setItem(
    'qimmah:customization:v1',
    JSON.stringify({
      profile: { name: 'زياد', goal: 'bulk', workoutDuration: 60, gymType: 'commercial', gymAccess: 'full', workoutEnvironment: 'gym' },
      targetsMeta: { manuallyEdited: true },
      workoutPlan: { templateId: 'demo', days: [DAY] },
    }),
  )
}

seed()

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <CustomizationProvider>
      <WorkoutV2 lang="ar" onNavigate={() => {}} />
    </CustomizationProvider>
  </AuthProvider>,
)
