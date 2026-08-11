import { useEffect } from 'react'
import { getLanguage } from '@/lib/appPreferences'
import { miscStrings } from '@/i18n/dict/misc'
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
  title,
  body,
  actionLabel,
  scrollTo = 'today',
}: SuccessToastProps) {
  const d = miscStrings[getLanguage()]
  const titleText = title ?? d.toastTitle
  const bodyText = body ?? d.toastBody
  const actionText = actionLabel ?? d.toastAction
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
    /*
      [QIM-WEB-FOUNDER-UX-003/حزمة ١] هذا **إشعار** لا نافذة: `role="status"`،
      بلا حاجب، بلا حبس تركيز، ويختفي وحده بعد ٦ ثوانٍ. وكان `bottom-5 z-[55]`
      فوق شريط التنقّل (`z-50`) — أي أن التبويبات الخمسة كانت **غير قابلة للنقر
      ستّ ثوانٍ** في اللحظة التي يهبط فيها المستخدم على «اليوم» أول مرّة بعد
      الإعداد. مقيس بـ`elementFromPoint`: مركز كل تبويب كان يعيد بطاقة الإشعار.
      إشعارٌ غير حاجب يحجب التنقّل عطلٌ لا خيار تصميم.

      علاجان معًا، وكلاهما مقتبس من `AchievementToaster` القائم في هذا المستودع:
        • `pointer-events-none` على الغلاف و`pointer-events-auto` على البطاقة —
          فلا يبتلع الغلاف الشفّاف شيئًا خارج البطاقة نفسها.
        • ارتفاع فوق شريط التنقّل بارتفاعه **المقيس** (`--qimmah-nav-h` تنشره
          القشرة) — فالبطاقة لا تجلس على التبويبات أصلًا. والقيمة صفر على
          الأسطح العامّة بلا شريط، فيبقى الإشعار في مكانه هناك.
    */
    <div
      className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4"
      style={{ bottom: 'calc(var(--qimmah-nav-h, 0px) + 1.25rem)' }}
    >
      <div
        role="status"
        className="card pointer-events-auto flex w-full max-w-md items-start gap-3 border-primary-soft p-4 shadow-glow animate-fade-up"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
          <Icon name="CheckCircle2" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">{titleText}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{bodyText}</p>
          <button type="button" onClick={openTarget} className="btn-primary mt-3 px-4 py-2 text-xs">
            {actionText}
            <Icon name="ArrowLeft" className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={d.close}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-beige hover:text-ink-700"
        >
          <Icon name="X" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
