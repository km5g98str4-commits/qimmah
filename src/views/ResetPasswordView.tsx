import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { useAuth } from '@/lib/authContext'
import { evaluatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy'

interface ResetPasswordViewProps {
  lang: Lang
  /** الانتقال لتسجيل الدخول بعد النجاح أو من حالة الرابط منتهي الصلاحية. */
  onDone: () => void
}

/**
 * شاشة تعيين كلمة مرور جديدة (Sprint A) — وجهة رابط استعادة كلمة المرور.
 *
 * التدفّق: يفتح المستخدم رابط البريد → يهبط على #/reset وقد أنشأ Supabase جلسة استعادة
 * مؤقتة (detectSessionInUrl) → نعرض حقلي كلمة المرور → updateUser({ password }) → نجاح.
 * إن لم توجد جلسة (رابط منتهٍ/مفتوح مباشرةً) نعرض رسالة هادئة وطريق العودة لتسجيل الدخول.
 * لا يكشف وجود الحساب، ولا يغيّر تدفّقات الدخول/التسجيل القائمة.
 */
export function ResetPasswordView({ lang, onDone }: ResetPasswordViewProps) {
  const t = getStrings(lang)
  const auth = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // جلسة الاستعادة التي أنشأها Supabase من الرابط. غيابها = رابط منتهٍ/غير صالح.
  const hasRecoverySession = Boolean(auth.session)
  const pw = evaluatePassword(password)
  const canSubmit = pw.valid && confirm.length > 0 && !busy

  const submit = async () => {
    setError(null)
    if (!pw.valid) {
      setError(t.auth.resetWeak)
      return
    }
    if (password !== confirm) {
      setError(t.auth.resetMismatch)
      return
    }
    setBusy(true)
    const r = await auth.updatePassword(password)
    if (!r.ok) {
      setBusy(false)
      setError(r.error ?? t.auth.forgotFailed)
      return
    }
    // نجاح: نعرض الحالة النهائية أولًا (done يقصر الدائرة) ثم نُنهي جلسة الاستعادة
    // كي يسجّل المستخدم الدخول من جديد بكلمة المرور الجديدة بلا جلسة معلّقة.
    setDone(true)
    setBusy(false)
    void auth.signOut()
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-25" />

      <div className="relative w-full max-w-md">
        {/* أين أنا؟ */}
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name={done ? 'CheckCircle2' : hasRecoverySession ? 'KeyRound' : 'AlertTriangle'} className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <h1 className="heading mt-4 text-2xl">
            {done ? t.auth.resetSuccess : hasRecoverySession ? t.auth.resetTitle : t.auth.resetExpiredTitle}
          </h1>
        </div>

        {done ? (
          /* حالة النجاح — إجراء أساسي واحد: العودة لتسجيل الدخول. */
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{t.auth.resetSuccessHint}</p>
            <button type="button" onClick={onDone} className="btn-primary mt-6 w-full py-3.5 text-base">
              <Icon name="LogIn" className="h-4 w-4" />
              {t.auth.back}
            </button>
          </>
        ) : hasRecoverySession ? (
          /* النموذج — حقلان + متطلّبات هادئة + إجراء أساسي واحد. */
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{t.auth.resetSubtitle}</p>

            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                  <Icon name="Lock" className="h-4 w-4" />
                </span>
                <input
                  className="input pe-10"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.auth.resetNewPassword}
                  aria-label={t.auth.resetNewPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={PASSWORD_MIN_LENGTH}
                  aria-describedby="reset-pw-requirements"
                />
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                  <Icon name="Lock" className="h-4 w-4" />
                </span>
                <input
                  className="input pe-10"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.auth.resetConfirmPassword}
                  aria-label={t.auth.resetConfirmPassword}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </div>

              {/* متطلّبات كلمة المرور — أيقونة + نص (ليست دلالة لونية فقط). */}
              <div id="reset-pw-requirements" className="-mt-1">
                <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium">
                  {[
                    { ok: pw.lengthOk, ar: `${PASSWORD_MIN_LENGTH}+ أحرف`, en: `${PASSWORD_MIN_LENGTH}+ characters` },
                    { ok: pw.hasLetter, ar: 'حرف', en: 'a letter' },
                    { ok: pw.hasNumber, ar: 'رقم', en: 'a number' },
                  ].map((r, i) => (
                    <li key={i} className={`flex items-center gap-1 ${r.ok ? 'text-success' : 'text-ink-500'}`}>
                      <Icon name={r.ok ? 'Check' : 'Circle'} className="h-3 w-3 shrink-0" />
                      {lang === 'en' ? r.en : r.ar}
                    </li>
                  ))}
                </ul>
              </div>

              {error && <p className="text-xs leading-relaxed text-gold-600">{error}</p>}

              <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3.5 text-base disabled:opacity-50">
                <Icon name="Check" className="h-4 w-4" />
                {t.auth.resetSave}
              </button>
            </form>
          </>
        ) : (
          /* رابط منتهٍ/غير صالح — رسالة هادئة + العودة لتسجيل الدخول/الاستعادة. */
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{t.auth.resetExpired}</p>
            <button type="button" onClick={onDone} className="btn-primary mt-6 w-full py-3.5 text-base">
              <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
              {t.auth.back}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
