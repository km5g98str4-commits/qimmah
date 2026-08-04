import { Icon } from '@/components/Icon'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
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
    <StandaloneAppScreen lang={lang} title={t.legal.privacyTitle} backLabel={t.legal.back} onBack={onBack}>
      <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Lock" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {t.legal.privacyBody.map((p, i) => (
              <p key={i} className="text-sm leading-loose text-ink-700">
                {p}
              </p>
            ))}
          </div>
      </div>
    </StandaloneAppScreen>
  )
}
