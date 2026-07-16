import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { ProgressV2 } from '@/views/ProgressV2'

interface ProgressViewProps {
  lang: Lang
  onNavigate?: (route: AppRoute) => void
}

/** Stable route adapter for the canonical v2.1 Progress Brief. */
export function ProgressView(props: ProgressViewProps) {
  return <ProgressV2 {...props} />
}
