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
import type { RedeemOutcome } from '@/lib/access/entitlementSource'
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
  const { blockedAction, closeGate, redeem } = useAccess()
  const s = accessStrings[lang] ?? accessStrings.ar
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | RedeemOutcome>('idle')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // كل فتح جديد يبدأ نظيفًا — لا تبقى رسالة فشل كود سابق معلّقة على فعل آخر.
  useEffect(() => {
    if (blockedAction) {
      setCodeOpen(false)
      setCode('')
      setState('idle')
      closeRef.current?.focus()
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

  const submitCode = async () => {
    setState('checking')
    setState(await redeem(code))
  }

  const message =
    state === 'checking' ? s.codeChecking
      : state === 'success' ? s.codeSuccess
        : state === 'already_used' ? s.codeAlreadyUsed
          : state === 'expired' ? s.codeExpired
            : state === 'offline' ? s.codeOffline
              : state === 'invalid' ? s.codeInvalid
                : ''

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
          <button ref={closeRef} type="button" onClick={closeGate} aria-label={s.gateSecondary} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-beige hover:text-ink-700">
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
            className="btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 text-sm"
          >
            {s.gatePrimary}
            <Icon name="ExternalLink" className="h-4 w-4" />
          </a>

          {!codeOpen && (
            <button type="button" onClick={() => setCodeOpen(true)} data-testid="premium-gate-have-code" className="btn-ghost min-h-[44px] w-full text-sm">
              {s.haveCode}
            </button>
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
                onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) void submitCode() }}
                placeholder={s.codePlaceholder}
                autoComplete="off"
                dir="ltr"
                className="mt-1.5 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-sm font-bold text-ink-900 outline-none focus:border-primary-c"
              />
              <button
                type="button"
                onClick={() => void submitCode()}
                disabled={!code.trim() || state === 'checking' || state === 'success'}
                aria-busy={state === 'checking'}
                data-testid="activation-code-submit"
                className="btn-primary mt-2.5 min-h-[44px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {s.codeSubmit}
              </button>
              {message && (
                <p
                  role="status"
                  data-testid="activation-code-message"
                  className={`mt-2.5 text-xs font-bold leading-relaxed ${state === 'success' ? 'v2-text-green' : state === 'checking' ? 'text-ink-500' : 'text-danger'}`}
                >
                  {message}
                </p>
              )}
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
