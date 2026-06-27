import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { useAuth } from '@/lib/authContext'

interface LoginViewProps {
  lang: Lang
  onSuccess: () => void
  onGuest: () => void
  onBack: () => void
}

/** شاشة الحساب — تسجيل دخول/إنشاء حساب (Supabase) أو متابعة كضيف. */
export function LoginView({ lang, onSuccess, onGuest, onBack }: LoginViewProps) {
  const t = getStrings(lang)
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const input =
    'w-full rounded-lg border border-line bg-beige px-3 py-3 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none'

  const onLogin = async () => {
    setBusy(true)
    setMsg(null)
    const r = await auth.signIn(email, password)
    setBusy(false)
    if (r.ok) onSuccess()
    else setMsg(r.error ?? 'تعذّر تسجيل الدخول.')
  }

  const onCreate = async () => {
    setBusy(true)
    setMsg(null)
    const r = await auth.signUp(email, password)
    setBusy(false)
    if (!r.ok) setMsg(r.error ?? 'تعذّر إنشاء الحساب.')
    else if (r.needsConfirmation) setMsg('أنشئنا حسابك. تحقّق من بريدك لتأكيد الحساب ثم سجّل الدخول.')
    else onSuccess()
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-60" />

      <div className="relative w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-ink-900"
        >
          <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
          {t.auth.back}
        </button>

        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="LogIn" className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-black text-ink-900">{t.auth.title}</h1>
        </div>

        {auth.configured ? (
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{t.auth.subtitle}</p>
            <div className="mt-6 space-y-3">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                  <Icon name="Mail" className="h-4 w-4" />
                </span>
                <input
                  className={input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t.auth.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                  <Icon name="Lock" className="h-4 w-4" />
                </span>
                <input
                  className={input}
                  type="password"
                  autoComplete="current-password"
                  placeholder={t.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {msg && <p className="text-xs leading-relaxed text-gold-600">{msg}</p>}

              <button
                type="button"
                onClick={onLogin}
                disabled={busy || !email || !password}
                className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
              >
                {t.auth.login}
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={busy || !email || !password}
                className="btn-ghost w-full py-3.5 text-base disabled:opacity-50"
              >
                {t.auth.createAccount}
              </button>
            </div>
          </>
        ) : (
          // — Supabase غير مضبوط —
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="text-sm font-bold text-ink-900">{t.auth.disabledTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.auth.disabledBody}</p>
          </div>
        )}

        {/* المتابعة كضيف — متاحة دائمًا */}
        <div className="mt-5 border-t border-line pt-5">
          <button type="button" onClick={onGuest} className="btn-ghost w-full py-3.5 text-base">
            <Icon name="User" className="h-5 w-5" />
            {t.auth.continueGuest}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
            <Icon name="ShieldCheck" className="h-3.5 w-3.5" />
            {t.auth.guestNote}
          </p>
        </div>
      </div>
    </div>
  )
}
