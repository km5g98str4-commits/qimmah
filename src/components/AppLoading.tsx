/** شاشة تحميل خفيفة تظهر أثناء جلب حزمة شاشة عند الطلب (Suspense fallback). */
export function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-page" role="status" aria-label="جارٍ التحميل">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-soft border-t-primary-c" />
    </div>
  )
}
