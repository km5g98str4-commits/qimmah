import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { miscStrings } from '@/i18n/dict/misc'
import { authFlowStrings } from '@/i18n/dict/authFlow'
import { useAuth } from '@/lib/authContext'
import { evaluatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy'
import { POLICY_LINKS, policyCopy } from '@/data/policyCopy'
import { isFounderPreview } from '@/lib/appEnv'

/**
 * [CTO-65] البند ٧ — صلاحية شكل البريد.
 * متعمّد التساهل: يمنع الأخطاء الحقيقية (بلا `@`، بلا نطاق، بمسافة) ولا يدّعي
 * التحقّق من وجود العنوان فعلًا — ذاك لا يثبته إلا بريد التأكيد. الصدق قبل
 * الطمأنينة: نرفض ما نعرف أنه خطأ، ولا نعِد بما لا نستطيع.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface LoginViewProps {
  lang: Lang
  onSuccess: () => void
  onBack: () => void
  /** الوضع الابتدائي عند الفتح — تسجيل دخول أو إنشاء حساب. */
  /** [حزمة ٦] الوضع يملكه المسار لا المكوّن — مُتحكَّم به بالكامل. */
  mode?: Mode
  /** يحفظ وضع الحساب خارج الشاشة حتى لا يضيع عند فتح الشروط أو الخصوصية. */
  onModeChange?: (mode: Mode) => void
}

type Mode = 'login' | 'signup' | 'forgot'

/**
 * شاشة الحساب (Sprint UI 1) — دخول / إنشاء حساب / استعادة كلمة المرور (Supabase). لا وضع ضيف.
 * تجيب: أين أنا؟ (العنوان) · ماذا أفعل؟ (النموذج + إجراء أساسي واحد) · لماذا أثق؟ (نبرة هادئة صادقة).
 * منطق المصادقة والأحداث لم يتغيّر؛ التعديل بصري + إضافة وضع الاستعادة فقط.
 */
export function LoginView({ lang, onSuccess, onBack, mode = 'login', onModeChange }: LoginViewProps) {
  const t = getStrings(lang)
  const d = miscStrings[lang]
  const af = authFlowStrings[lang]
  const auth = useAuth()
  /**
   * قرار **وقت بناء** لا وقت تشغيل — لا يملك المتصفّح تبديله، فلا يصير
   * «نسخة مراجعة» ادّعاءً يُلبَس. ولا إشارة ثانية تُخترع: هذه هي القائمة.
   */
  const previewBuild = isFounderPreview()
  /**
   * [QIM-WEB-FOUNDER-UX-006/حزمة ٦] لا حالة وضع محلّية.
   *
   * كان الوضع `useState` هنا، فترتّب عليه ثلاثة أعطال مقيسة: العنوان يبقى
   * `#/login` بعد التبديل إلى إنشاء الحساب · التحديث يعيد المستخدم إلى وضع
   * آخر · و«رجوع» يقفز فوق شاشة الحساب كلها (الـhash يُفرَّغ). الآن المسار هو
   * مصدر الوضع، والتبديل تنقّلٌ حقيقي يدفع مدخل تاريخ.
   */
  const setMode = (next: Mode) => onModeChange?.(next)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // [CTO-65] البند ٧ — الرسالة تُعرض عند مغادرة الحقل لا مع أول حرف.
  const [emailTouched, setEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [eligible12, setEligible12] = useState(false)
  // كشف تدريجي: متطلّبات كلمة المرور تظهر بمجرّد نية الكتابة (تركيز الحقل أو أول حرف).
  const [pwFocused, setPwFocused] = useState(false)

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'
  // سياسة كلمة المرور (P0): عند التسجيل يجب أن تجتاز الحدّ الأدنى ٨ + حرف + رقم قبل الإرسال.
  const pw = evaluatePassword(password)
  const policy = policyCopy[lang]
  const canSubmit = isForgot
    ? Boolean(email)
    : Boolean(email && password && (!isSignup || (name.trim() && pw.valid && eligible12)))
  // [CTO-65] البند ٧ — صلاحية البريد **تحقّق منفصل**، لا داخل `canSubmit` أعلاه.
  // ⚠️ `scripts/policy-gates-proof.mjs:27` يطابق التعبير الحرفي `pw.valid && eligible12`
  // في السطر السابق. أي إعادة صياغة له تكسر العقد — لا إعادة التسمية وحدها. فالسطر
  // يبقى نصًّا كما هو، ويُضاف الشرط الجديد بجانبه لا بداخله.
  const emailValid = EMAIL_PATTERN.test(email.trim())
  // الرسالة لا تظهر أثناء الكتابة — فقط بعد مغادرة الحقل، وبمحتوى فعلي.
  const showEmailError = emailTouched && email.trim().length > 0 && !emailValid

  const switchMode = (next: Mode) => {
    setMode(next)
    setMsg(null)
    setNotice(null)
    if (next !== 'signup') setEligible12(false)
  }

  const submit = async () => {
    if (!canSubmit) return
    // حارس إرسال منفصل — نفس نمط حارس الأهلية أدناه. يمنع الإرسال ببريد غير صالح
    // حتى لو وصل التدفّق من مسار آخر، ويُظهر السبب بدل الفشل الصامت.
    if (!emailValid) {
      setEmailTouched(true)
      return
    }
    if (isSignup && !eligible12) {
      setMsg(policy.eligibilityRequired)
      return
    }
    setBusy(true)
    setMsg(null)
    setNotice(null)
    // `finally` يضمن أنّ الزرّ لا يبقى دائرًا أبدًا. طبقة المصادقة صارت لا ترمي
    // (guardedAuthCall) — وهذا خطّ دفاع ثانٍ: شاشة عالقة على «جارٍ…» بلا رسالة
    // أسوأ من أي خطأ صريح، فلا نقبلها ولو من استثناء غير متوقّع.
    try {
      if (isForgot) {
        // استعادة كلمة المرور — رسالة عامة دائمًا (لا تكشف وجود الحساب). لا حدث تحليلات جديد.
        const r = await auth.resetPassword(email)
        if (r.ok) setNotice(t.auth.forgotSent)
        else setMsg(r.error ?? t.auth.forgotFailed)
        return
      }
      if (isSignup) {
        // [QIM-WEB-FOUNDER-UX-006/حزمة ٦] الاسم يُقصّ **قبل التخزين** لا عند
        // الفحص وحده. كان الشرط يفحص `name.trim()` بينما المُرسَل هو النصّ الخام،
        // فاسم مثل « زياد » يُحفظ بفراغاته ثم يظهر مزاحًا في كل ترحيب.
        const r = await auth.signUp(email, password, name.trim())
        if (!r.ok) {
          setMsg(r.error ?? d.createFailed)
        } else if (r.ambiguousExistingAccount) {
          // الخادم يُخفي وجود البريد (منع تعداد الحسابات) فلا نعرف هل أُنشئ حساب.
          // رسالة صادقة في الحالتين + طريق الدخول جاهز، ولا حدث «نجاح تسجيل» لم يثبت.
          setNotice(af.emailMaybeRegistered)
          setMode('login')
        } else if (r.needsConfirmation) {
          // تأكيد البريد مطلوب — نعرض تنبيهًا واضحًا ونعيد المستخدم لوضع الدخول.
          setNotice(d.accountCreatedConfirm)
          setMode('login')
        } else {
          onSuccess()
        }
        return
      }
      const r = await auth.signIn(email, password)
      if (r.ok) onSuccess()
      else setMsg(r.error ?? d.loginFailed)
    } catch {
      setMsg(d.authGeneric)
    } finally {
      setBusy(false)
    }
  }

  const headerIcon = isForgot ? 'KeyRound' : isSignup ? 'UserPlus' : 'LogIn'
  const title = isForgot ? t.auth.forgotTitle : isSignup ? t.auth.signupTitle : t.auth.title
  const subtitle = isForgot ? t.auth.forgotSubtitle : isSignup ? t.auth.signupSubtitle : t.auth.subtitle
  const primaryLabel = isForgot ? t.auth.sendReset : isSignup ? t.auth.createAccount : t.auth.login

  return (
    <div className="relative h-[100dvh] min-h-0 overflow-hidden bg-page">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-25" />

      <main
        className="app-scroll relative flex h-full min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain px-5 py-12"
        style={{ paddingTop: 'max(3rem, var(--safe-top))', paddingBottom: 'max(3rem, var(--safe-bottom))' }}
      >
      <div className="relative my-auto w-full max-w-md">
        <button
          type="button"
          onClick={isForgot ? () => switchMode('login') : onBack}
          className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-ink-900"
        >
          <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
          {t.auth.back}
        </button>

        {/* أين أنا؟ */}
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name={headerIcon} className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <h1 className="heading mt-4 text-2xl">{title}</h1>
        </div>

        {auth.configured ? (
          <>
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{subtitle}</p>

            {notice && (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-700"
              >
                <Icon name="Mail" className="mt-0.5 h-4 w-4 shrink-0 text-primary-c" aria-hidden="true" />
                {notice}
              </p>
            )}

            {/* ماذا أفعل؟ */}
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
                    className="input pe-10"
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    autoCorrect="off"
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
                  className="input pe-10"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t.auth.email}
                  aria-label={t.auth.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={showEmailError || undefined}
                  aria-describedby={showEmailError ? 'login-email-error' : undefined}
                />
              </div>
              {/* [CTO-65] البند ٧ — السبب مسمّى تحت الحقل بدل زرّ صامت. */}
              {showEmailError && (
                <p
                  id="login-email-error"
                  role="alert"
                  className="-mt-1 flex items-center gap-1.5 text-xs font-bold text-danger"
                >
                  <Icon name="AlertCircle" className="h-3.5 w-3.5 shrink-0" />
                  {t.auth.emailInvalid}
                </p>
              )}
              {!isForgot && (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-400">
                    <Icon name="Lock" className="h-4 w-4" />
                  </span>
                  <input
                    className="input pe-10"
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder={t.auth.password}
                    aria-label={t.auth.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPwFocused(true)}
                    minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined}
                    aria-describedby={isSignup ? 'pw-requirements' : undefined}
                  />
                </div>
              )}

              {/* سياسة كلمة المرور (P0) — مؤشّر قوة + متطلّبات واضحة قبل الإرسال (عند التسجيل فقط).
                  كشف تدريجي: يظهر بمجرّد تركيز الحقل أو كتابة أوّل حرف كي تبقى البداية هادئة. */}
              {isSignup && (pwFocused || password.length > 0) && (
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
                                : 'bg-success'
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
                      <li key={i} className={`flex items-center gap-1 ${r.ok ? 'text-success' : 'text-ink-500'}`}>
                        <Icon name={r.ok ? 'Check' : 'Circle'} className="h-3 w-3 shrink-0" />
                        {lang === 'en' ? r.en : r.ar}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isSignup && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 text-start text-xs leading-relaxed text-ink-700">
                  <input
                    type="checkbox"
                    checked={eligible12}
                    onChange={(e) => {
                      setEligible12(e.target.checked)
                      if (e.target.checked && msg === policy.eligibilityRequired) setMsg(null)
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                  />
                  <span>
                    {policy.eligibilityPrefix}{' '}
                    <a href={POLICY_LINKS.terms} className="font-black text-primary-c underline underline-offset-2">{policy.terms}</a>{' '}
                    {policy.joiner}{' '}
                    <a href={POLICY_LINKS.privacy} className="font-black text-primary-c underline underline-offset-2">{policy.privacy}</a>
                  </span>
                </label>
              )}

              {/* رابط استعادة كلمة المرور — وضع الدخول فقط */}
              {mode === 'login' && (
                <div className="text-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="inline-flex min-h-[44px] items-center text-xs font-bold text-ink-500 transition-colors hover:text-primary-c"
                  >
                    {t.auth.forgotLink}
                  </button>
                </div>
              )}

              {/* خطأ واضح ومتاح: لوحة عالية التباين (AA) + أيقونة (لا دلالة لونية فقط) + إعلان فوري لقارئ الشاشة. */}
              {msg && (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="v2-error-panel flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold leading-relaxed text-ink-900"
                >
                  <Icon name="AlertCircle" className="v2-error-icon mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{msg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !canSubmit || !emailValid}
                aria-busy={busy}
                className="btn-primary w-full py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <Icon name="RefreshCw" className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {primaryLabel}
              </button>
            </form>

            {/* تبديل بين الدخول وإنشاء حساب — يُخفى في وضع الاستعادة (الرجوع بالسهم أعلاه) */}
            {!isForgot && (
              <p className="mt-4 text-center text-xs text-ink-500">
                {isSignup ? t.auth.haveAccount : t.auth.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                  className="inline-flex min-h-[44px] items-center font-black text-primary-c transition-colors hover:underline"
                >
                  {isSignup ? t.auth.switchToLogin : t.auth.switchToSignup}
                </button>
              </p>
            )}
          </>
        ) : (
          /*
           * — لا خادم حسابات في هذا البناء —
           *
           * [SOVEREIGN-COMMERCE-001] كانت البطاقة تقول «كلّم مزوّد الخدمة عشان
           * يفعّل لك الحساب»: تخاطب القارئ **مشتريَ نشرة** لا مستخدمَ قِمّة
           * (الميثاق §0.2)، وتردّ على من ضغط «أنشئ حسابًا» بكلامٍ عن **المزامنة
           * السحابية** — وعدان منفصلان (§0.1) — وتقف عند المنع بلا خطوة تالية،
           * مع أن البناء **يعرف** أنه نسخة مراجعة.
           *
           * الآن: البناء يسمّي نفسه، والنصّ يتكلّم عن الحساب لا عن المزامنة،
           * ويُختم بما **يبقى شغّالًا** بدل الطريق المسدود.
           */
          <div data-testid="auth-unavailable" className="mt-6 rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="text-sm font-bold text-ink-900">
              {previewBuild ? t.auth.disabledPreviewTitle : t.auth.disabledTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              {previewBuild ? t.auth.disabledPreviewBody : t.auth.disabledBody}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-700">{t.auth.disabledNext}</p>
            <button
              type="button"
              onClick={onBack}
              data-testid="auth-unavailable-back"
              className="btn-ghost mt-4 min-h-[44px] w-full text-sm"
            >
              {t.auth.back}
            </button>
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
