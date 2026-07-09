import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { miscStrings } from '@/i18n/dict/misc'
import { useAuth } from '@/lib/authContext'
import { evaluatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy'
import { track } from '@/lib/analytics'

interface LoginViewProps {
  lang: Lang
  onSuccess: () => void
  onBack: () => void
  /** الوضع الابتدائي عند الفتح — تسجيل دخول أو إنشاء حساب. */
  initialMode?: Mode
}

type Mode = 'login' | 'signup'

/** شاشة الحساب — تبديل بين تسجيل الدخول وإنشاء حساب (Supabase). لا وضع ضيف. */
export function LoginView({ lang, onSuccess, onBack, initialMode = 'login' }: LoginViewProps) {
  const t = getStrings(lang)
  const d = miscStrings[lang]
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  // سياسة كلمة المرور (P0): عند التسجيل يجب أن تجتاز الحدّ الأدنى ٨ + حرف + رقم قبل الإرسال.
  const pw = evaluatePassword(password)
  const canSubmit = Boolean(email && password && (!isSignup || (name.trim() && pw.valid)))

  const input =
    'w-full rounded-lg border border-line bg-beige px-3 py-3 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none'

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
      track('signup_started', {})
      const r = await auth.signUp(email, password, name)
      setBusy(false)
      if (!r.ok) {
        setMsg(r.error ?? d.createFailed)
      } else if (r.needsConfirmation) {
        // تأكيد البريد مطلوب — نعرض تنبيهًا واضحًا ونعيد المستخدم لوضع الدخول.
        track('signup_succeeded', { needsConfirmation: true })
        setNotice(d.accountCreatedConfirm)
        setMode('login')
      } else {
        track('signup_succeeded', { needsConfirmation: false })
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
                    aria-label={t.auth.name}
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
                  aria-label={t.auth.email}
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
                  aria-label={t.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined}
                  aria-describedby={isSignup ? 'pw-requirements' : undefined}
                />
              </div>

              {/* سياسة كلمة المرور (P0) — مؤشّر قوة + متطلّبات واضحة قبل الإرسال (عند التسجيل فقط). */}
              {isSignup && (
                <div id="pw-requirements" className="-mt-1 space-y-1.5">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          password.length === 0 || i >= pw.score
                            ? 'bg-line'
                            : pw.score <= 1
                              ? 'bg-danger'
                              : pw.score === 2
                                ? 'bg-gold-500'
                                : 'bg-emerald-500'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium">
                    {[
                      { ok: pw.lengthOk, ar: `${PASSWORD_MIN_LENGTH}+ أحرف`, en: `${PASSWORD_MIN_LENGTH}+ characters` },
                      { ok: pw.hasLetter, ar: 'حرف', en: 'a letter' },
                      { ok: pw.hasNumber, ar: 'رقم', en: 'a number' },
                    ].map((r, i) => (
                      <li key={i} className={`flex items-center gap-1 ${r.ok ? 'text-emerald-600' : 'text-ink-400'}`}>
                        <Icon name={r.ok ? 'Check' : 'Circle'} className="h-3 w-3 shrink-0" />
                        {lang === 'en' ? r.en : r.ar}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {msg && <p className="text-xs leading-relaxed text-gold-600">{msg}</p>}

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
      </div>
    </div>
  )
}
