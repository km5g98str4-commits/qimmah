import { CanonicalLegalView } from '@/components/legal/CanonicalLegalView'
import type { Lang } from '@/lib/appPreferences'

interface LegalViewProps {
  lang: Lang
  onBack: () => void
}

/** صفحة شروط الاستخدام. */
export function TermsView({ lang, onBack }: LegalViewProps) {
  return <CanonicalLegalView kind="terms" lang={lang} onBack={onBack} />
}
