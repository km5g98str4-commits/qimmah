import { useEffect } from 'react'
import { Icon } from './Icon'

interface SuccessToastProps {
  onClose: () => void
  /** مدة الظهور قبل الإخفاء التلقائي (مللي ثانية). */
  duration?: number
  title?: string
  body?: string
  actionLabel?: string
  /** هدف التمرير عند الضغط على زر الإجراء (افتراضي: today). */
  scrollTo?: string
}

/** شريط تأكيد دافئ — يختفي تلقائيًا، وزر الإجراء يعمل ما دام ظاهرًا. */
export function SuccessToast({
  onClose,
  duration = 6000,
  title = 'تم تجهيز صفحتك',
  body = 'ابدأ من قسم اليوم وتابع تمرينك، أكلك، ومكملاتك من مكان واحد.',
  actionLabel = 'افتح يومي',
  scrollTo = 'today',
}: SuccessToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const openTarget = () => {
    onClose()
    const el = document.getElementById(scrollTo)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    else window.location.hash = `#${scrollTo}`
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-[55] flex justify-center px-4">
      <div
        role="status"
        className="card flex w-full max-w-md items-start gap-3 border-primary-soft p-4 shadow-glow animate-fade-up"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
          <Icon name="CheckCircle2" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">{title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{body}</p>
          <button type="button" onClick={openTarget} className="btn-primary mt-3 px-4 py-2 text-xs">
            {actionLabel}
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-beige hover:text-ink-700"
        >
          <Icon name="X" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
