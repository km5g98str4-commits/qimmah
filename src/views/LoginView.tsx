import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { useAuth } from '@/lib/authContext'

interface LoginViewProps {
  lang: Lang
  onAuthed: () => void
  onGuest: () => void
  onBack: () => void
}

/** شاشة الحساب — تسجيل دخول/إنشاء حساب عبر Supabase، مع وضع الضيف دائمًا متاحًا. */
export function LoginView({ lang, onAuthed, onGuest, onBack }: LoginViewProps) {
  const t = getStrings(lang).account
  const { configured, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async (mode: 'login' | 'signup') => {
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setError('أدخل البريد وكلمة المرور.')
      return
    }
    setBusy(true)
    const res = mode === 'login' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'حدث خطأ. حاول مجددًا.')
      return
    }
    if (res.needsConfirmation) {
      setInfo(t.confirmEmail)
      return
    }
    onAuthed()
  }

  const inputClass =
    'w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-primary-c'

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-900 px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />

      <div className="relative w-full max-w-md">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-2xl font-black text-white">{t.loginTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{t.loginSubtitle}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-surface p-6 shadow-card">
          {configured ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submit('login')
                }}
                className="space-y-3"
              >
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-ink-700">{t.email}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-ink-700">{t.password}</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>

                {error && (
                  <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs font-bold text-danger">
                    <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}
                {info && (
                  <p className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-xs font-bold text-success">
                    <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0" />
                    {info}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-60">
                  <Icon name="LogIn" className="h-5 w-5" />
                  {t.login}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => submit('signup')}
                  className="btn-ghost w-full py-3.5 text-base disabled:opacity-60"
                >
                  <Icon name="UserPlus" className="h-5 w-5" />
                  {t.createAccount}
                </button>
              </form>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-success">
                <Icon name="Cloud" className="h-3.5 w-3.5" />
                {t.cloudOn}
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-line bg-beige p-4">
              <p className="flex items-start gap-2 text-sm font-bold text-ink-900">
                <Icon name="CloudOff" className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
                {t.cloudDisabled}
              </p>
            </div>
          )}

          {/* وضع الضيف — متاح دائمًا */}
          <div className="mt-5 border-t border-line pt-5">
            <button type="button" onClick={onGuest} className="btn-ghost w-full py-3.5 text-base">
              <Icon name="Smartphone" className="h-5 w-5" />
              {t.guest}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-400">
              <Icon name="Info" className="h-3.5 w-3.5" />
              {t.guestLimit}
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition-colors hover:text-white"
          >
            <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
            {t.back}
          </button>
        </div>
      </div>
    </div>
  )
}
