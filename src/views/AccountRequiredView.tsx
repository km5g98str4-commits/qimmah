import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface AccountRequiredViewProps {
  lang: Lang
  onLogin: () => void
  onGuest: () => void
  onBack: () => void
}

/** حالة صادقة لمسار محمي فتحه زائر بلا حساب أو إعداد مكتمل — ليست 404. */
export function AccountRequiredView({ lang, onLogin, onGuest, onBack }: AccountRequiredViewProps) {
  const t = getStrings(lang)
  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="h-[100dvh] min-h-0 overflow-hidden bg-page">
      <main
        className="app-scroll flex h-full min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain px-6 py-12"
        style={{ paddingTop: 'max(3rem, var(--safe-top))', paddingBottom: 'max(3rem, var(--safe-bottom))' }}
      >
        <div className="my-auto w-full max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="LockKeyhole" className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-2xl font-black text-ink-900">{t.accountRequired.title}</h1>
          <p className="mt-3 text-sm leading-loose text-ink-500">{t.accountRequired.body}</p>
          <div className="mt-8 space-y-3">
            <button type="button" onClick={onLogin} className="btn-primary w-full">
              <Icon name="LogIn" className="h-4 w-4" />
              {t.accountRequired.login}
            </button>
            <button type="button" onClick={onGuest} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-sm font-bold text-ink-700 transition-colors hover:border-primary/50 hover:text-ink-900">
              <Icon name="UserRound" className="h-4 w-4" />
              {t.accountRequired.guest}
            </button>
            <button type="button" onClick={onBack} className="pt-1 text-sm font-bold text-ink-500 transition-colors hover:text-ink-900">
              {t.accountRequired.back}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
