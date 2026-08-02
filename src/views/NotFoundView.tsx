import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface NotFoundViewProps {
  lang: Lang
  /** الانتقال إلى الرئيسية (اللوحة أو شاشة البداية حسب حالة الإعداد). */
  onHome: () => void
  /** الرجوع للشاشة السابقة إن أمكن. */
  onBack: () => void
}

/** صفحة 404 — مسار غير معروف. */
export function NotFoundView({ lang, onHome, onBack }: NotFoundViewProps) {
  const t = getStrings(lang)
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="h-[100dvh] min-h-0 overflow-hidden bg-page">
      <main
        className="app-scroll flex h-full min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain px-6 py-12"
        style={{ paddingTop: 'max(3rem, var(--safe-top))', paddingBottom: 'max(3rem, var(--safe-bottom))' }}
      >
        <div className="my-auto w-full max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="Compass" className="h-8 w-8" />
          </span>
          <p className="mt-6 text-5xl font-black tracking-tight text-ink-400">{t.notFound.code}</p>
          <h1 className="mt-3 text-2xl font-black text-ink-900">{t.notFound.title}</h1>
          <p className="mt-3 text-sm leading-loose text-ink-500">{t.notFound.body}</p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button type="button" onClick={onHome} className="btn-primary w-full sm:w-auto">
              <Icon name="Home" className="h-4 w-4" />
              {t.notFound.home}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 transition-colors hover:text-ink-900"
            >
              <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
              {t.notFound.back}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
