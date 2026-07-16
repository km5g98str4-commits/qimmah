import { Component, type ErrorInfo, type ReactNode } from 'react'
import { getStrings } from '@/config/strings'
import { getLanguage } from '@/lib/appPreferences'
import { track } from '@/lib/analytics'
import { captureMonitoringError } from '@/lib/monitoring'
import { Icon } from './Icon'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// نص احتياطي مطبوع مباشرةً — يعمل حتى لو كان الخلل في تحميل الإعداد نفسه.
const FALLBACK = {
  title: 'صار خلل بسيط',
  body: 'واجهنا مشكلة غير متوقعة. جرّب تحدّث الصفحة — بياناتك محفوظة على جهازك.',
  reload: 'حدّث الصفحة',
}

/**
 * حاجز أخطاء على مستوى التطبيق — يلتقط أخطاء العرض غير المتوقعة ويعرض شاشة
 * بديلة ودّية بلهجة خليجية بدل شاشة بيضاء، مع زر تحديث. لا يمسّ بيانات المستخدم.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // تسجيل للـ console فقط (بلا إرسال خارجي) — يساعد على التشخيص دون تسريب بيانات.
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
    // إشارة استقرار — اسم الخطأ فقط (مثل TypeError)، بلا الرسالة أو المكدّس.
    track('unhandled_error', { source: 'render', name: error?.name })
    captureMonitoringError(error, 'render')
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    // نحاول جلب النصوص من الإعداد باللغة الحالية؛ وإن فشل، نستخدم النص الاحتياطي المطبوع.
    let t = FALLBACK
    let dir: 'rtl' | 'ltr' = 'rtl'
    try {
      const lang = getLanguage()
      dir = lang === 'en' ? 'ltr' : 'rtl'
      const s = getStrings(lang).errorBoundary
      if (s) t = s
    } catch {
      t = FALLBACK
    }

    return (
      <div dir={dir} className="flex min-h-screen flex-col items-center justify-center bg-page px-6 py-16 text-center">
        <div className="mx-auto w-full max-w-md">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h1 className="mt-6 text-2xl font-black text-ink-900">{t.title}</h1>
          <p className="mt-3 text-sm leading-loose text-ink-500">{t.body}</p>

          <div className="mt-8">
            <button type="button" onClick={this.handleReload} className="btn-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {t.reload}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

interface RouteErrorBoundaryProps {
  children: ReactNode
  /** يُستدعى مع «أعد المحاولة» — يعيد إنشاء حِزم الشاشات الكسولة كي يُعاد استيراد الحزمة الفاشلة. */
  onRetry?: () => void
}

/**
 * حدّ أخطاء الشاشات (المسارات الكسولة) — يلتقط فشل تحميل حزمة عند الطلب أو انهيار
 * عرض شاشة، ويعرض بطاقة ودّية بلغة الواجهة مع زرّ «أعد المحاولة» يعيد التركيب
 * ويعيد الاستيراد فعليًا (بلا تحديث كامل للصفحة) — لا شاشة بيضاء أبدًا.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  /** وقت آخر نقرة «أعد المحاولة» — لكشف فشل إعادة الاستيراد الفوري بعدها. */
  private retryAt = 0

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // console فقط (بلا إرسال خارجي) — يساعد على تشخيص فشل تحميل الحِزم.
    console.error('RouteErrorBoundary caught an error:', error, info.componentStack)
    // إشارة استقرار — اسم الخطأ فقط، بلا الرسالة أو المكدّس.
    track('unhandled_error', { source: 'route', name: error?.name })
    captureMonitoringError(error, 'route')
    // بعض المتصفحات (Chromium) تخزّن فشل استيراد الوحدة في خريطة الوحدات، فتفشل
    // إعادة الاستيراد داخل الصفحة فورًا حتى بعد عودة الاتصال. إن فشل تحميل حزمة
    // مباشرةً بعد «أعد المحاولة» نعيد تحميل الصفحة مرة واحدة — تحميل كامل يجدّد
    // خريطة الوحدات فيُجلب الملف فعليًا (بياناتك محلية فلا يضيع شيء).
    const isChunkError = /dynamically imported module|Importing a module script|Failed to fetch|Loading chunk/i.test(
      String(error?.message ?? error),
    )
    if (isChunkError && Date.now() - this.retryAt < 6000) {
      this.retryAt = 0
      window.location.reload()
    }
  }

  private handleRetry = (): void => {
    // أعِد إنشاء الشاشات الكسولة أولًا ثم أزل حالة الخطأ — فيُعاد الاستيراد من جديد.
    this.retryAt = Date.now()
    this.props.onRetry?.()
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    const lang = getLanguage()
    const t = getStrings(lang).errorBoundary
    return (
      <div
        dir={lang === 'en' ? 'ltr' : 'rtl'}
        className="flex min-h-screen items-center justify-center bg-page px-6 py-16"
      >
        <div className="card w-full max-w-md p-8 text-center" data-testid="route-error-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="AlertTriangle" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-black text-ink-900">{t.routeTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{t.routeBody}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-primary mt-6"
            data-testid="route-error-retry"
          >
            <Icon name="RotateCcw" className="h-4 w-4" />
            {t.retry}
          </button>
        </div>
      </div>
    )
  }
}
