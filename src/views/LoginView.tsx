import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { miscStrings } from '@/i18n/dict/misc'
import { useAuth } from '@/lib/authContext'

interface LoginViewProps {
  lang: Lang
  designV2?: boolean
  onSuccess: () => void
  onGuest: () => void
  onBack: () => void
}

type Mode = 'login' | 'signup'

/** شاشة الحساب — تبديل بين تسجيل الدخول وإنشاء حساب (Supabase) أو المتابعة كضيف. */
export function LoginView({ lang, designV2 = false, onSuccess, onGuest, onBack }: LoginViewProps) {
  const t = getStrings(lang)
  const d = miscStrings[lang]
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const canSubmit = Boolean(email && password && (!isSignup || name.trim()))

  const input =
    `w-full rounded-lg border border-line bg-beige px-3 py-3 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none ${designV2 ? 'v2-auth__input pe-10' : ''}`

  const switchMode = (next: Mode) => {
    setMode(next)
    setMsg(null)
    setNotice(null)
  }

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setMsg(null)
    setNotice(null)
    if (isSignup) {
      const r = await auth.signUp(email, password, name)
      setBusy(false)
      if (!r.ok) {
        setMsg(r.error ?? d.createFailed)
      } else if (r.needsConfirmation) {
        // تأكيد البريد مطلوب — نعرض تنبيهًا واضحًا ونعيد المستخدم لوضع الدخول.
        setNotice(d.accountCreatedConfirm)
        setMode('login')
      } else {
        onSuccess()
      }
    } else {
      const r = await auth.signIn(email, password)
      setBusy(false)
      if (r.ok) onSuccess()
      else setMsg(r.error ?? d.loginFailed)
    }
  }

  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-5 py-12 ${designV2 ? 'v2-auth' : ''}`} dir={designV2 ? 'rtl' : undefined}>
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
          <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-glow ${designV2 ? 'v2-auth__mark' : ''}`}>
            <Icon name={isSignup ? 'UserPlus' : 'LogIn'} className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-black text-ink-900">
            {isSignup ? t.auth.signupTitle : t.auth.title}
          </h1>
        </div>

        {auth.configured ? (
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
              {isSignup ? t.auth.signupSubtitle : t.auth.subtitle}
            </p>

            {notice && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-700">
                <Icon name="Mail" className="mt-0.5 h-4 w-4 shrink-0 text-primary-c" />
                {notice}
              </p>
            )}

            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              {isSignup && (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                    <Icon name="User" className="h-4 w-4" />
                  </span>
                  <input
                    className={input}
                    type="text"
                    autoComplete="name"
                    placeholder={t.auth.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
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
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={t.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {msg && (
                <p className={designV2 ? 'v2-auth__error' : 'text-xs leading-relaxed text-gold-600'}>
                  {designV2 && <Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />}
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !canSubmit}
                className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
              >
                {isSignup ? t.auth.createAccount : t.auth.login}
              </button>
            </form>

            {/* تبديل بين الدخول وإنشاء حساب */}
            <p className="mt-4 text-center text-xs text-ink-500">
              {isSignup ? t.auth.haveAccount : t.auth.noAccount}{' '}
              <button
                type="button"
                onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                className="font-black text-primary-c transition-colors hover:underline"
              >
                {isSignup ? t.auth.switchToLogin : t.auth.switchToSignup}
              </button>
            </p>
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
