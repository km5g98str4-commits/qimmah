import { CanonicalLegalView } from '@/components/legal/CanonicalLegalView'
import type { Lang } from '@/lib/appPreferences'

interface LegalViewProps {
  lang: Lang
  onBack: () => void
}

/** صفحة سياسة الخصوصية. */
export function PrivacyView({ lang, onBack }: LegalViewProps) {
  return <CanonicalLegalView kind="privacy" lang={lang} onBack={onBack} />
}
