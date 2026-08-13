import { Component, createRef, type ErrorInfo, type ReactNode } from 'react'
import { getLanguage } from '@/lib/appPreferences'
import { captureMonitoringError } from '@/lib/monitoring'
import { errorBoundaryStrings } from '@/i18n/dict/errorBoundary'
import { Icon } from './Icon'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  referenceId: string | null
}

// نص احتياطي مطبوع مباشرةً — يعمل حتى لو كان الخلل في تحميل الإعداد نفسه.
const FALLBACK = {
  title: 'صار خلل بسيط',
  body: 'واجهنا مشكلة غير متوقعة. جرّب تحدّث الصفحة — بياناتك محفوظة على جهازك.',
  reload: 'حدّث الصفحة',
  support: 'راسل الدعم',
  referenceLabel: 'مرجع الخطأ',
}

const SUPPORT_EMAIL = 'qimmah.support@gmail.com'

function createErrorReference(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  try {
    const bytes = new Uint8Array(3)
    crypto.getRandomValues(bytes)
    const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
    return `QW-${stamp}-${suffix}`
  } catch {
    return `QW-${stamp}`
  }
}

function supportHref(referenceId: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Qimmah error ${referenceId}`)}`
}

/**
 * حاجز أخطاء على مستوى التطبيق — يلتقط أخطاء العرض غير المتوقعة ويعرض شاشة
 * بديلة ودّية بلهجة خليجية بدل شاشة بيضاء، مع زر تحديث. لا يمسّ بيانات المستخدم.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, referenceId: null }
  private headingRef = createRef<HTMLHeadingElement>()

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, referenceId: createErrorReference() }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // تسجيل للـ console فقط (بلا إرسال خارجي) — يساعد على التشخيص دون تسريب بيانات.
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
    console.error(`Qimmah error reference: ${this.state.referenceId ?? 'unavailable'}`)
    // إشارة استقرار — اسم الخطأ فقط (مثل TypeError)، بلا الرسالة أو المكدّس.
    captureMonitoringError(error, 'render')
  }

  componentDidUpdate(_previousProps: ErrorBoundaryProps, previousState: ErrorBoundaryState): void {
    if (!previousState.hasError && this.state.hasError) this.headingRef.current?.focus()
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
      const s = errorBoundaryStrings[lang]
      if (s) t = s
    } catch {
      t = FALLBACK
    }

    return (
      <div dir={dir} role="alert" className="app-scroll flex h-[100dvh] min-h-0 flex-col items-center justify-center overflow-y-auto overscroll-y-contain bg-page px-6 py-16 text-center">
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
          <h1 ref={this.headingRef} tabIndex={-1} className="mt-6 text-2xl font-black text-ink-900 outline-none">{t.title}</h1>
          <p className="mt-3 text-sm leading-loose text-ink-500">{t.body}</p>

          <p className="mt-4 text-xs font-bold text-ink-400" data-testid="error-reference">
            {t.referenceLabel}: <bdi dir="ltr">{this.state.referenceId}</bdi>
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
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
            <a href={supportHref(this.state.referenceId ?? 'unavailable')} className="btn-secondary min-h-11">
              {t.support}
            </a>
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
  state: ErrorBoundaryState = { hasError: false, referenceId: null }
  private headingRef = createRef<HTMLHeadingElement>()

  /** وقت آخر نقرة «أعد المحاولة» — لكشف فشل إعادة الاستيراد الفوري بعدها. */
  private retryAt = 0

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, referenceId: createErrorReference() }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // console فقط (بلا إرسال خارجي) — يساعد على تشخيص فشل تحميل الحِزم.
    console.error('RouteErrorBoundary caught an error:', error, info.componentStack)
    console.error(`Qimmah error reference: ${this.state.referenceId ?? 'unavailable'}`)
    // إشارة استقرار — اسم الخطأ فقط، بلا الرسالة أو المكدّس.
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

  componentDidUpdate(_previousProps: RouteErrorBoundaryProps, previousState: ErrorBoundaryState): void {
    if (!previousState.hasError && this.state.hasError) this.headingRef.current?.focus()
  }

  private handleRetry = (): void => {
    // أعِد إنشاء الشاشات الكسولة أولًا ثم أزل حالة الخطأ — فيُعاد الاستيراد من جديد.
    this.retryAt = Date.now()
    this.props.onRetry?.()
    this.setState({ hasError: false, referenceId: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    const lang = getLanguage()
    const t = errorBoundaryStrings[lang]
    return (
      <div
        dir={lang === 'en' ? 'ltr' : 'rtl'}
        className="app-scroll flex h-[100dvh] min-h-0 items-center justify-center overflow-y-auto overscroll-y-contain bg-page px-6 py-16"
      >
        <div className="card w-full max-w-md p-8 text-center" role="alert" data-testid="route-error-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="AlertTriangle" className="h-7 w-7" />
          </span>
          <h1 ref={this.headingRef} tabIndex={-1} className="mt-4 text-xl font-black text-ink-900 outline-none">{t.routeTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{t.routeBody}</p>
          <p className="mt-4 text-xs font-bold text-ink-400" data-testid="route-error-reference">
            {t.referenceLabel}: <bdi dir="ltr">{this.state.referenceId}</bdi>
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={this.handleRetry} className="btn-primary" data-testid="route-error-retry">
              <Icon name="RotateCcw" className="h-4 w-4" />
              {t.retry}
            </button>
            <a href={supportHref(this.state.referenceId ?? 'unavailable')} className="btn-secondary min-h-11">
              {t.support}
            </a>
          </div>
        </div>
      </div>
    )
  }
}
