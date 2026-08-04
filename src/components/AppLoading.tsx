import { getLanguage } from '@/lib/appPreferences'
import { miscStrings } from '@/i18n/dict/misc'

/** شاشة تحميل خفيفة تظهر أثناء جلب حزمة شاشة عند الطلب (Suspense fallback). */
export function AppLoading() {
  const d = miscStrings[getLanguage()]
  return (
    <div className="grid h-[100dvh] min-h-0 place-items-center overflow-hidden bg-page" role="status" aria-label={d.loadingLabel}>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-soft border-t-primary-c" />
    </div>
  )
}
