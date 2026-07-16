import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { WorkoutV2 } from '@/views/WorkoutV2'

interface WorkoutViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** Stable route adapter for the canonical v2.1 workout loop. */
export function WorkoutView(props: WorkoutViewProps) {
  return <WorkoutV2 {...props} />
}
