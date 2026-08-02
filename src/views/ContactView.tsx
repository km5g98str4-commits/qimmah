import { Icon } from '@/components/Icon'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
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
    <StandaloneAppScreen lang={lang} title={t.contact.title} backLabel={t.contact.back} onBack={onBack}>
      <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Mail" className="h-5 w-5" />
            </span>
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
    </StandaloneAppScreen>
  )
}
