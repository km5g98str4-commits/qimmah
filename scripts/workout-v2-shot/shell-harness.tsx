// Dev-only reproduction harness for Q19 — mounts the REAL MobileShell around
// WorkoutV2 in the 'workout' tab, with a simulated iOS safe-area inset, so the
// shell-header ↔ workout-surface interaction (the Q19 clipping report) renders
// exactly as on device. Never shipped: not referenced by index.html.

import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/lib/authContext'
import { CustomizationProvider } from '@/lib/customizationContext'
import { MobileShell } from '@/components/MobileShell'
import { WorkoutV2 } from '@/views/WorkoutV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const DAY = {
  id: 'q19-upper',
  nameAr: 'علوي',
  nameEn: 'Upper',
  // The real reordered upper-lower-d1 (Q19 law): compounds first, isolation after.
  exercises: [
    { id: 'slot-0', exerciseId: 'incline-chest-press-machine', sets: 4, reps: '8–12', restSec: 90, order: 0 },
    { id: 'slot-1', exerciseId: 'chest-press-machine', sets: 4, reps: '8–12', restSec: 90, order: 1 },
    { id: 'slot-2', exerciseId: 'lat-pulldown-machine', sets: 4, reps: '10–12', restSec: 90, order: 2 },
    { id: 'slot-3', exerciseId: 'shoulder-press-machine', sets: 4, reps: '8–12', restSec: 90, order: 3 },
    { id: 'slot-4', exerciseId: 'pec-deck-machine', sets: 3, reps: '12–15', restSec: 60, order: 4 },
    { id: 'slot-5', exerciseId: 'triceps-extension-machine', sets: 3, reps: '12–15', restSec: 60, order: 5 },
    { id: 'slot-6', exerciseId: 'preacher-curl-machine', sets: 3, reps: '10–12', restSec: 60, order: 6 },
  ],
}

function seed(): void {
  localStorage.clear()
  const r = document.documentElement
  r.dataset.design = 'v2'
  r.dir = 'rtl'
  r.dataset.theme = 'dark'
  // Simulate the reference device's Dynamic-Island safe-area inset.
  r.style.setProperty('--safe-top', '59px')
  r.style.setProperty('--safe-bottom', '34px')
  localStorage.setItem('qimmah:history:migrated:v1', 'done')
  localStorage.setItem('qimmah:onboarding:profile:v1', '{}')
  localStorage.setItem(
    'qimmah:customization:v1',
    JSON.stringify({
      profile: { name: 'زياد', goal: 'bulk', workoutDuration: 60, gymType: 'commercial', gymAccess: 'full', workoutEnvironment: 'gym' },
      targetsMeta: { manuallyEdited: true },
      workoutPlan: { templateId: 'upper-lower', days: [DAY] },
    }),
  )
}

seed()

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <CustomizationProvider>
      <MobileShell
        lang="ar"
        tab="workout"
        badge="account"
        onNavigate={() => {}}
        onOpenSettings={() => {}}
        onQuickLog={() => {}}
        routineQuickLabel="روتين"
      >
        <WorkoutV2 lang="ar" onNavigate={() => {}} />
      </MobileShell>
    </CustomizationProvider>
  </AuthProvider>,
)
