import type { Lang } from '@/lib/appPreferences'
import { StartViewV2 } from '@/views/StartViewV2'

interface StartViewProps {
  lang: Lang
  onLogin: () => void
  onSignup: () => void
  onGuest: () => void
}

/** Stable route adapter for the canonical v2.1 welcome screen. */
export function StartView(props: StartViewProps) {
  return <StartViewV2 {...props} />
}
