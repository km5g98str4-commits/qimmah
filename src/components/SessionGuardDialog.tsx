import { useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { sessionGuardStrings } from '@/i18n/dict/sessionGuard'
import { AppOverlay } from '@/components/AppOverlay'

export type SessionGuardKind = 'stop' | 'discard'

interface SessionGuardDialogProps {
  lang: Lang
  kind: SessionGuardKind
  /** عدد المجموعات المسجَّلة — يُذكر بالرقم فالسؤال يجب أن يقول **كم** على المحكّ. */
  sets: number
  onConfirm: () => void
  onCancel: () => void
}

/**
 * حارس ترك الجلسة — [CTO-72] البند ٤.
 *
 * **لماذا نافذة داخل التطبيق لا `window.confirm`:** الأخيرة لا تحمل نبرة قِمّة،
 * ولا تُدير تركيزًا، ولا تُبيّن أيّ الفعلين مدمّر — وقد رُصدت مفارقتها في
 * `[QA-39]` (حذف الحساب صار له حوار مصمَّم بينما استيراد نسخة يستعمل الحوار الخام).
 *
 * **الفعل المدمّر مميَّز بلونه ونصّه معًا** لا باللون وحده (§4 — لا لون وحده
 * حاملًا للمعنى): `discard` يأخذ حمرة الخطر **و**فعلًا يسمّي المسح صراحةً.
 *
 * **التركيز يبدأ على «التراجع»** عمدًا: الافتراضي في نافذة تحذير هو البقاء، فمن
 * ضغط Enter بلا قراءة لا يُتلف عمله.
 */
export function SessionGuardDialog({ lang, kind, sets, onConfirm, onCancel }: SessionGuardDialogProps) {
  const s = sessionGuardStrings[lang] ?? sessionGuardStrings.ar
  const ar = lang !== 'en'
  const cancelRef = useRef<HTMLButtonElement>(null)
  const destructive = kind === 'discard'

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Esc = البقاء (الخيار الآمن)، اتّساقًا مع تركيز البدء.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <AppOverlay
      dir={ar ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={s.dialogLabel}
      className="z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <section className="card w-full max-w-md rounded-b-none p-5 sm:rounded-b-3xl">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${destructive ? 'bg-danger/15 text-danger' : 'bg-primary-soft text-primary-c'}`}
        >
          <Icon name={destructive ? 'AlertTriangle' : 'Pause'} className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-base font-black text-ink-900">
          {destructive ? s.discardTitle : s.stopTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {destructive ? s.discardBody(sets) : s.stopBody(sets)}
        </p>

        <div className="mt-5 grid gap-2">
          {/* الخيار الآمن أولًا وفي موضع الإبهام، وهو حامل التركيز الابتدائي. */}
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn-primary min-h-[44px] w-full py-3"
          >
            {destructive ? s.discardCancel : s.stopCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold ${destructive ? 'text-danger' : 'text-ink-700'}`}
          >
            {destructive ? s.discardConfirm : s.stopConfirm}
          </button>
        </div>
      </section>
    </AppOverlay>
  )
}
