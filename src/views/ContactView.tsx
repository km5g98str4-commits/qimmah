import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface ContactViewProps {
  lang: Lang
  onBack: () => void
}

/** صفحة تواصل/دعم ثابتة. */
export function ContactView({ lang, onBack }: ContactViewProps) {
  const t = getStrings(lang)
  const email = t.contact.emailValue
  const mailto = `mailto:${email}`
  const reportMailto = `mailto:${email}?subject=${encodeURIComponent(t.contact.reportSubject)}`

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
            {t.contact.back}
          </button>
        </div>
      </header>

      <main className="container-page py-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Mail" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-ink-900">{t.contact.title}</h1>
          </div>

          <p className="mt-6 text-sm leading-loose text-ink-700">{t.contact.intro}</p>

          <div className="card mt-8 p-5">
            <p className="text-xs font-bold text-ink-500">{t.contact.emailLabel}</p>
            <a
              href={mailto}
              className="mt-1 inline-flex items-center gap-2 text-base font-extrabold text-primary-c transition-colors hover:opacity-80"
              dir="ltr"
            >
              {email}
            </a>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a href={mailto} className="btn-primary">
                <Icon name="Mail" className="h-4 w-4" />
                {t.contact.emailCta}
              </a>
              <a href={reportMailto} className="btn-ghost">
                <Icon name="AlertTriangle" className="h-4 w-4" />
                {t.contact.reportCta}
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
