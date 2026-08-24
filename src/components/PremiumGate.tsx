// بوّابة Premium — نداء واحد متّسق لكل فعل محجوب.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢ · مطلب المؤسس: «كل طفرة محجوبة تقود إلى
// نداء Premium/تفعيل **واحد**».
//
// نافذة حقيقية لا إشعارًا: حاجب، وحبس تركيز، وEscape تغلقها. ولأنها `inset-0`
// بحاجب وتركيز محبوس فهي خارج نطاق `test:bottom-overlay` عن قصد — ذلك الفحص
// يحرس الأشرطة العائمة فوق قاع مملوك، لا الحوارات المقصودة.

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { product } from '@/config/product'
import { accessStrings } from '@/i18n/dict/access'
import { useAccess } from '@/lib/access/useAccess'
import type { PaidAction } from '@/lib/access/paidActions'
import { outcomeTone, redeemMessage, trialMessage, type RedeemUiState, type TrialUiState } from '@/lib/access/outcomeMessages'
import { founderQaEntitlementEnabled, FOUNDER_QA_CODE } from '@/lib/access/entitlementSource'
import type { Lang } from '@/lib/appPreferences'

/** الفعل المحجوب ⇒ اسمه بلغة المستخدم. الكود لا يظهر للمستخدم أبدًا. */
function actionLabel(action: PaidAction, s: ReturnType<() => typeof accessStrings.ar>): string {
  if (action.startsWith('workout.')) return s.actions.workout
  if (action.startsWith('nutrition.')) return s.actions.nutrition
  if (action.startsWith('progress.')) return s.actions.progress
  if (action.startsWith('plan.')) return s.actions.plan
  return s.actions.recovery
}

export function PremiumGate({ lang }: { lang: Lang }) {
  const { blockedAction, closeGate, redeem, beginTrial, recordTrialIntent, entitlement, notePurchaseAttempt } = useAccess()
  const s = accessStrings[lang] ?? accessStrings.ar
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [state, setState] = useState<RedeemUiState>('idle')
  const [trialState, setTrialState] = useState<TrialUiState>('idle')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  /** العنصر الذي كان يملك التركيز قبل الفتح — يُعاد إليه عند الإغلاق. */
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // كل فتح جديد يبدأ نظيفًا — لا تبقى رسالة فشل كود سابق معلّقة على فعل آخر.
  //
  // [SOVEREIGN-COMMERCE-001] **والتركيز يُلتقط ثم يُعاد.** كانت النافذة تأخذ
  // التركيز عند الفتح ولا تعيده عند الإغلاق: تسقط البؤرة على `<body>`، فمن ضغط
  // «أضف أكل» بلوحة المفاتيح ثم أغلق البوّابة يستأنف التنقّل **من أعلى المستند**
  // ولا يعرف أين كان (WCAG 2.4.3). الالتقاط قبل `focus()` لا بعده — بعده يكون
  // العنصر المحفوظ هو زرّ الإغلاق نفسه.
  useEffect(() => {
    if (!blockedAction) return
    const previouslyFocused = typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null
    returnFocusRef.current = previouslyFocused
    setCodeOpen(false)
    setCode('')
    setState('idle')
    closeRef.current?.focus()
    return () => {
      const target = returnFocusRef.current
      returnFocusRef.current = null
      // لا نُعيد التركيز إلى عنصر غادر الشجرة (إغلاق بسبب تبدّل المسار مثلًا) —
      // إعادةٌ إلى عنصر منزوع لا تفعل شيئًا، والفحص يجعل النيّة صريحة.
      if (target && typeof target.focus === 'function' && target.isConnected) target.focus()
    }
  }, [blockedAction])

  // Escape يغلق، والتركيز محبوس داخل النافذة ما دامت مفتوحة (WCAG 2.1.2).
  useEffect(() => {
    if (!blockedAction) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeGate(); return }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input:not([disabled])')
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [blockedAction, closeGate])

  if (!blockedAction) return null

  /**
   * [SOVEREIGN-COMMERCE-001] الحقل الفارغ يُجاب عنه بنصّ لا بزرٍّ باهت.
   *
   * كان الزرّ `disabled` عند الفراغ وأثره الوحيد `opacity-40`: نقرةٌ لا تُنتج
   * حدث DOM أصلًا، ومنطقة `role="status"` لا تُرسَم لأن الرسالة فارغة — فقارئ
   * الشاشة يسمع «معطّل» بلا سبب، والمبصر يرى زرًّا باهتًا ولا يدري لماذا.
   * صار الزرّ يعمل دائمًا، والفراغ يعود بـ`empty` ونصّها الخاصّ — وهي **ليست**
   * `invalid`: «ما كتبت شيئًا» غير «كودك خاطئ».
   */
  const submitCode = async () => {
    if (state === 'checking') return
    setState('checking')
    setState(await redeem(code))
  }

  const message = redeemMessage(state, lang)
  const tone = outcomeTone(state)

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="fixed inset-0 z-[85] flex items-end justify-center bg-ink-900/50 px-4 pb-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-gate-title"
        data-testid="premium-gate"
        className="card w-full max-w-md p-5 shadow-elevated"
        style={{ marginBottom: 'max(0px, var(--safe-bottom))' }}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="Sparkles" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="premium-gate-title" className="text-base font-black text-ink-900">{s.gateTitle}</h2>
            <p className="mt-1 text-[0.8rem] font-bold text-ink-500">{actionLabel(blockedAction, s)}</p>
          </div>
          <button ref={closeRef} type="button" onClick={closeGate} aria-label={s.gateSecondary} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-beige hover:text-ink-700">
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-500">{s.gateBody}</p>

        <div className="mt-5 space-y-2.5">
          <a
            href={product.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="premium-gate-cta"
            // [COMMISSIONING §2] الوسم قبل المغادرة: التبويب يبقى مفتوحًا خلف
            // صفحة الشراء، فعند عودته تُطالَب المنحة ويُعاد الحسم مرّة واحدة.
            onClick={notePurchaseAttempt}
            className="btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 text-sm"
          >
            {s.gatePrimary}
            <Icon name="ExternalLink" className="h-4 w-4" />
          </a>

          {/* ═══ [COMMISSIONING §1] بدء التجربة **من هنا** لا من التسليم وحده ═══
              كان النداء الوحيد للتجربة في شاشة كشف الخطّة. فمن تجاوزها، أو
              اصطدم بالحدّ بعد أسبوع، لم يبق له إلا الشراء أو كودٌ لا يملكه —
              والتكليف يقول إنّ التجربة أحد **أربعة مسارات** إلى نفس الاستحقاق.

              وشرط الإخفاء يقرأ الاستحقاق نفسه: من عنده وصول قائم لا يُعرض
              عليه أن يبدأ تجربة (§ لا زرّ يَعِد بما لا معنى له).

              وبلا حساب لا يفشل الزرّ بل **يقطع وعدًا يُوفّى**: النيّة تُكتب،
              ثم يُنشئ المستخدم حسابه، فتبدأ تجربته وحدها عند أول دخول. */}
          {!codeOpen && entitlement.status !== 'active' && (
            <button
              type="button"
              data-testid="premium-gate-start-trial"
              disabled={trialState === 'working'}
              onClick={() => {
                void (async () => {
                  // النيّة **قبل** النداء: لو تبيّن أنه بلا حساب، يكون الوعد
                  // محفوظًا على القرص قبل أن يغادر هذه الشاشة إلى التسجيل.
                  recordTrialIntent('gate')
                  setTrialState('working')
                  setTrialState(await beginTrial())
                })()
              }}
              className="btn-ghost min-h-[44px] w-full text-sm"
            >
              {s.trialCta}
            </button>
          )}

          {/* النتيجة بسببها الصادق — من نفس المُصنِّف الذي تقرؤه بقيّة الأسطح. */}
          {trialMessage(trialState, lang) ? (
            <p role="status" data-testid="premium-gate-trial-message" className="text-xs font-bold leading-relaxed text-ink-700">
              {trialMessage(trialState, lang)}
            </p>
          ) : null}

          {!codeOpen && (
            <button type="button" onClick={() => setCodeOpen(true)} data-testid="premium-gate-have-code" className="btn-ghost min-h-[44px] w-full text-sm">
              {s.haveCode}
            </button>
          )}

          {/* ═══ لافتة QA — في معاينة المؤسس وحدها ═══
              فحص المؤسس الحيّ توقّف عند «بلا حسابات»: الآلية موجودة والكود
              موجود، ولا شيء في الشاشة يقول ذلك. فالفجوة كانت **إفصاحًا** لا
              قدرة. والشرط `founderQaEntitlementEnabled()` نصّ حرفي وقت البناء،
              فتُهزّ هذه الكتلة كاملةً خارج حزمة الإنتاج — لا تُخفى بشرط تشغيل.
              والوسم صريح «مراجعة» كي لا يُقرأ استحقاقُ QA شهادةً على الخادم. */}
          {founderQaEntitlementEnabled() && (
            <div data-testid="founder-qa-hint" className="rounded-2xl border border-dashed border-primary/50 bg-primary-soft/40 p-3 text-start">
              <p className="text-[0.78rem] font-black text-ink-900">{s.qaTitle}</p>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-ink-600">{s.qaBody}</p>
              <code data-testid="founder-qa-code" dir="ltr" className="mt-2 block rounded-lg bg-surface px-2.5 py-1.5 text-[0.8rem] font-black tracking-wide text-primary-c">
                {FOUNDER_QA_CODE}
              </code>
            </div>
          )}

          {codeOpen && (
            <div className="rounded-2xl border border-line bg-surface p-3.5 text-start">
              <p className="text-sm font-black text-ink-900">{s.codeTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.codeBody}</p>
              <label htmlFor="activation-code" className="mt-3 block text-[0.78rem] font-bold text-ink-700">{s.codeLabel}</label>
              <input
                id="activation-code"
                data-testid="activation-code-input"
                value={code}
                onChange={(e) => { setCode(e.target.value); if (state !== 'idle') setState('idle') }}
                // الفراغ يُرسَل عمدًا: الرفض المحلّي يُنتج رسالة، والصمت لا يُنتج شيئًا.
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitCode() } }}
                placeholder={s.codePlaceholder}
                autoComplete="off"
                dir="ltr"
                aria-describedby="activation-code-hint activation-code-message"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
              />
              <p id="activation-code-hint" className="mt-1.5 text-[0.7rem] leading-relaxed text-ink-400">{s.codeHint}</p>
              <button
                type="button"
                onClick={() => void submitCode()}
                disabled={state === 'checking' || state === 'success'}
                aria-busy={state === 'checking'}
                data-testid="activation-code-submit"
                className="btn-primary mt-2.5 min-h-[44px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {s.codeSubmit}
              </button>
              {/* المنطقة الحيّة **مرسومة دائمًا**: قارئ الشاشة يعلن ما يُدرَج في
                  منطقة قائمة، ولا يعلن بالضرورة منطقة تُولد ومعها نصّها. وهي
                  كذلك مرجع `aria-describedby` فلا يشير إلى معرّف غائب. */}
              <p
                id="activation-code-message"
                role="status"
                aria-live="polite"
                data-testid="activation-code-message"
                className={`text-xs font-bold leading-relaxed ${message ? 'mt-2.5' : ''} ${tone === 'success' ? 'v2-text-green' : tone === 'pending' ? 'text-ink-500' : 'text-danger'}`}
              >
                {message ?? ''}
              </p>
            </div>
          )}

          <button type="button" onClick={closeGate} data-testid="premium-gate-dismiss" className="btn-ghost min-h-[44px] w-full text-sm">
            {s.gateSecondary}
          </button>
          <p className="pt-0.5 text-center text-[0.7rem] leading-relaxed text-ink-400">{s.gateBrowseNote}</p>
        </div>
      </div>
    </div>
  )
}
