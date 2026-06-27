import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface LegalViewProps {
  lang: Lang
  onBack: () => void
}

/** صفحة سياسة الخصوصية. */
export function PrivacyView({ lang, onBack }: LegalViewProps) {
  const t = getStrings(lang)
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="container-page flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-700 transition-colors hover:text-ink-900"
          >
            <Icon name="ChevronLeft" className="h-5 w-5 rtl:rotate-180" />
            {t.legal.back}
          </button>
        </div>
      </header>

      <main className="container-page py-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Lock" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-ink-900">{t.legal.privacyTitle}</h1>
          </div>
          <div className="mt-6 space-y-4">
            {t.legal.privacyBody.map((p, i) => (
              <p key={i} className="text-sm leading-loose text-ink-700">
                {p}
              </p>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
