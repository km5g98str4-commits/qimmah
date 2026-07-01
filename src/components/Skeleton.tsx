import { cn } from '@/lib/cn'

// عناصر هيكل التحميل (skeleton) — بدائل بصرية أثناء تجهيز البيانات.
// تعتمد صنف `.skeleton` من styles/index.css (نبض + لمعان يحترم تقليل الحركة).

/** كتلة هيكلية واحدة (سطر/مربّع). مرّر className لضبط الأبعاد. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

/** هيكل بطاقة قياسية — أيقونة + سطران. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5', className)} aria-hidden>
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-3.5 w-2/3" />
      <Skeleton className="mt-2 h-6 w-1/2" />
    </div>
  )
}

/**
 * غلاف تحميل: يعرض هيكلًا أثناء التحميل ثم المحتوى الفعلي.
 * يوفّر منطقة حيّة للقارئات الشاشية تُعلن انتهاء التحميل.
 */
export function LoadingBoundary({
  loading,
  skeleton,
  children,
  label = 'جارٍ التحميل…',
}: {
  loading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  label?: string
}) {
  return (
    <div aria-busy={loading} aria-live="polite">
      {loading ? (
        <>
          <span className="sr-only">{label}</span>
          {skeleton}
        </>
      ) : (
        children
      )}
    </div>
  )
}
