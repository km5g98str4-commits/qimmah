import { MeasurementsV2, ProgressV2 } from '@/views/ProgressV2'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'

interface ProgressViewProps {
  lang: Lang
  onNavigate?: (route: AppRoute) => void
  onSignIn?: () => void
}

/**
 * The app route keeps its stable module name while rendering the current
 * progress experience. This prevents the live tab from drifting from the
 * measurement flow maintained in ProgressV2.
 */
export function ProgressView(props: ProgressViewProps) {
  return <ProgressV2 {...props} />
}

/** Stable route adapter for the canonical measurement history inside Progress. */
export function MeasurementsView({ lang, onNavigate }: ProgressViewProps) {
  return <MeasurementsV2 lang={lang} onBack={() => onNavigate?.('progress')} />
}
