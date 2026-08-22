import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { ProfileV2 } from '@/views/ProfileV2'

interface ProfileViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
  quickLogIntent?: 'meal' | 'water' | 'routine' | null
  onQuickLogIntentHandled?: () => void
}

/** Stable route adapter for the canonical v2.1 training profile. */
export function ProfileView(props: ProfileViewProps) {
  return <ProfileV2 {...props} />
}
