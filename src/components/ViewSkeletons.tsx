import { Skeleton } from './Skeleton'
import { getLanguage } from '@/lib/appPreferences'
import { miscStrings } from '@/i18n/dict/misc'

// هياكل تحميل الشاشات الكسولة (الرئيسية/التقدّم) — تظهر كـ fallback لحدّ Suspense
// أثناء تحميل حزمة الشاشة عند الطلب، بتخطيط يقارب بطاقات الشاشة الحقيقية
// فلا «تقفز» الواجهة عند اكتمال التحميل. البيانات نفسها محلية متزامنة،
// لذا زمن الهيكل = زمن تحميل الحزمة فقط.

/** غلاف مشترك: منطقة مشغولة مع تسمية قارئ شاشة بلغة الواجهة. */
function SkeletonScreen({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 px-4 py-4" data-testid={testId} aria-busy="true" aria-live="polite">
      <span className="sr-only">{miscStrings[getLanguage()].loadingLabel}…</span>
      {children}
    </div>
  )
}

/** هيكل بطاقة رصاصية عامة — سطر عنوان + سطران محتوى. */
function CardBlock({ tall }: { tall?: boolean }) {
  return (
    <div className="card p-5" aria-hidden>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-6 w-2/3" />
      <Skeleton className={tall ? 'mt-3 h-20 w-full' : 'mt-2 h-3.5 w-1/2'} />
    </div>
  )
}

/** هيكل الرئيسية — ترحيب + تسجيل سريع (عمودان) + بطاقة «لوحتي» + بطاقتا صدارة. */
export function DashboardSkeleton() {
  return (
    <SkeletonScreen testId="dashboard-skeleton">
      <CardBlock />
      <div className="grid grid-cols-2 gap-3" aria-hidden>
        <div className="card p-4">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </div>
        <div className="card p-4">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </div>
      </div>
      <div className="card flex items-center gap-3 p-4" aria-hidden>
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      </div>
      <CardBlock tall />
      <CardBlock />
    </SkeletonScreen>
  )
}

/** هيكل التقدّم — ترويسة + بطاقتا أرقام (عمودان) + بطاقات الحجم/الأوزان/العضلات. */
export function ProgressSkeleton() {
  return (
    <SkeletonScreen testId="progress-skeleton">
      <div className="flex items-center gap-2.5" aria-hidden>
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-3" aria-hidden>
        <div className="card p-4">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="mt-3 h-7 w-1/2" />
        </div>
        <div className="card p-4">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="mt-3 h-7 w-1/2" />
        </div>
      </div>
      <CardBlock tall />
      <CardBlock />
      <CardBlock />
    </SkeletonScreen>
  )
}
