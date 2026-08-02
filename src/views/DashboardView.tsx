import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import type { QuickLogTarget } from '@/components/MobileShell'
import { TodayV2 } from '@/views/TodayV2'

interface DashboardViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
  onQuickLog?: (target: QuickLogTarget) => void
}

/** Stable route adapter for the canonical v2.1 Today command center. */
export function DashboardView(props: DashboardViewProps) {
  return <TodayV2 {...props} />
}
