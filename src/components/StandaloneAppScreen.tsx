import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { playHaptic } from '@/lib/nativeFeedback'

interface StandaloneAppScreenProps {
  lang: Lang
  title: string
  backLabel: string
  onBack: () => void
  children: ReactNode
  contentClassName?: string
}

/** غلاف موحّد للمسارات العميقة التي تقع خارج تبويبات التطبيق الرئيسية. */
export function StandaloneAppScreen({
  lang,
  title,
  backLabel,
  onBack,
  children,
  contentClassName,
}: StandaloneAppScreenProps) {
  const ar = lang !== 'en'

  const handleBack = () => {
    void playHaptic('selection')
    onBack()
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} data-standalone-screen="" className="app-viewport-h flex min-h-0 flex-col overflow-hidden bg-page">
      <header
        className="z-20 shrink-0 border-b border-line bg-page/95 backdrop-blur-xl"
        // [STANDALONE-CHROME-001] `var(--safe-top)` لا `env()` خامًا: نفس المتغيّر الذي
        // تستعمله القشرة وAppNav، فيبقى موضعٌ واحد يحكم النتوء — ويصير قابلًا للقياس.
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel}
            className="v2-pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-700"
          >
            <Icon name={ar ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 truncate text-lg font-black text-ink-900">{title}</h1>
        </div>
      </header>

      <main
        className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5"
        style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}
      >
        <div className={cn('mx-auto w-full max-w-2xl', contentClassName)}>{children}</div>
      </main>
    </div>
  )
}
