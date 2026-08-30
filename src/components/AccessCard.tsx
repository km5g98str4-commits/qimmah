// بطاقة الوصول — [PREMIUM-UX-W2]
//
// ═══ لماذا وُجدت ═══
// كان التفعيل **يُكتشف بالخطأ**: لا يظهر مدخله إلا حين يصطدم المستخدم بفعلٍ
// مدفوع فتُفتح البوّابة. ومن أراد أن يعرف حالته — أعنده Premium؟ كم باقي من
// تجربته؟ أين يكتب كوده؟ — لم يجد سطحًا واحدًا يقولها. التكليف يطلب أن يكون
// التفعيل **مسارًا أوّليًّا ظاهرًا**، وأن يفهم المستخدم دائمًا: ما حالته، وماذا
// تعني، وأين يفعّل.
//
// ═══ ما تريه لكل حالة (والحقيقة الحاكمة) ═══
//   • premium  → «قِمّة Premium · مفعّل» — **بلا انتهاء، بلا سعر، بلا لغة اشتراك**
//                (§0.1). ولا زرّ تفعيل: البطاقة الفاعلة تحلّ محلّ المدخل.
//   • special  → «وصولك مفتوح» — **لا يُسمّى Premium مشترى** (التكليف صريح)، بل
//                وصولٌ قائم يُعرَض عليه ترقيته بكود إلى Premium دائم.
//   • trial    → «تجربتك شغّالة — باقي كذا» بوقت الخادم، ومعها مدخل الكود.
//   • trialExpired → «انتهت تجربتك» + **بياناتك محفوظة** + مدخل بارز.
//   • preview (noAccess) → ابدأ تجربتك أو اكتب كودك.
//   • revoked  → الحقيقة صريحة: الوصول موقوف، والدعم هو الطريق (لا تفعيل ذاتي).
//
// ═══ حدّ هذه البطاقة ═══
// **عرضٌ ومدخل، لا سلطة.** لا تقرّر Premium بنفسها: القرار كلّه في الخادم عبر
// `useAccessSummary` (يقرأ الاستحقاق المحسوم). ومدخل الكود يفتح **نفس** البوّابة
// المحصَّنة (`openActivation`) — لا مسار تفعيل ثانٍ يتباعد. وبدء التجربة ينادي
// `beginTrial` (سلطة الخادم) ولا يمنح العميل شيئًا.

import { useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { product } from '@/config/product'
import { accessStrings } from '@/i18n/dict/access'
import { useAccess } from '@/lib/access/useAccess'
import { useAccessSummary } from '@/lib/access/useAccessSummary'
import { trialMessage, type TrialUiState } from '@/lib/access/outcomeMessages'
import type { Lang } from '@/lib/appPreferences'

/** رابط شراء Premium — وجهة سلة الوحيدة، بلا سعر مكتوب (§0.1). */
function PurchaseCta({ label, onLeave }: { label: string; onLeave: () => void }) {
  return (
    <a
      href={product.checkoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="access-card-purchase"
      onClick={onLeave}
      className="btn-primary flex min-h-[44px] w-full items-center justify-center gap-2 text-sm"
    >
      {label}
      <Icon name="ExternalLink" className="h-4 w-4" />
    </a>
  )
}

/** زرّ «عندك كود تفعيل؟» — يفتح البوّابة المحصَّنة على حقل الكود مباشرةً. */
function HaveCodeButton({ label, onOpen, prominent }: { label: string; onOpen: () => void; prominent?: boolean }) {
  return (
    <button
      type="button"
      data-testid="access-card-have-code"
      onClick={onOpen}
      className={cn('min-h-[44px] w-full text-sm', prominent ? 'btn-primary justify-center gap-2' : 'btn-ghost')}
    >
      {label}
    </button>
  )
}

export function AccessCard({ lang }: { lang: Lang }) {
  const s = accessStrings[lang] ?? accessStrings.ar
  const summary = useAccessSummary(lang)
  const { openActivation, beginTrial, recordTrialIntent, notePurchaseAttempt } = useAccess()
  const [trialState, setTrialState] = useState<TrialUiState>('idle')

  const startTrial = () => {
    if (trialState === 'working') return
    void (async () => {
      // النيّة **قبل** النداء: لو تبيّن أنه بلا حساب، الوعد محفوظ فتبدأ تجربته
      // عند أوّل دخول — لا يُقطع الوعد عند «تحتاج حسابًا».
      recordTrialIntent('settings')
      setTrialState('working')
      setTrialState(await beginTrial())
    })()
  }

  const kind = summary.kind

  // ── Premium: بطاقة فاعلة، بلا انتهاء وبلا زرّ ──────────────────────────────
  if (kind === 'premium') {
    return (
      <section
        data-testid="access-card"
        data-access-kind="premium"
        aria-label={s.cardSectionTitle}
        className="rounded-3xl border border-primary/30 bg-primary-soft/40 p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="Sparkles" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-ink-900">قِمّة Premium</p>
              <span data-testid="access-card-premium-badge" className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[0.7rem] font-black v2-text-green">
                <Icon name="Check" className="h-3 w-3" />
                {s.cardPremiumBadge}
              </span>
            </div>
            {/* الصيغة المعتمدة وحدها (§0.1) — لا انتهاء، لا اشتراك. */}
            <p data-testid="access-card-premium-note" className="mt-0.5 text-xs leading-relaxed text-ink-500">{s.cardPremiumNote}</p>
          </div>
        </div>
      </section>
    )
  }

  // ── الوصول الموقوت: «وصولك مفتوح» — لا يُسمّى Premium مشترى ─────────────────
  if (kind === 'special') {
    return (
      <section
        data-testid="access-card"
        data-access-kind="special"
        aria-label={s.cardSectionTitle}
        className="rounded-3xl border border-line bg-surface p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-beige text-ink-700">
            <Icon name="ShieldCheck" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink-900">{summary.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{s.cardSpecialNote}</p>
          </div>
        </div>
        <div className="mt-3.5 space-y-2.5">
          <HaveCodeButton label={s.haveCode} onOpen={openActivation} />
          <PurchaseCta label={s.gatePrimary} onLeave={notePurchaseAttempt} />
        </div>
      </section>
    )
  }

  // ── التجربة الجارية: العدّاد + مدخل الكود دائمًا متاح ──────────────────────
  if (kind === 'trial') {
    return (
      <section
        data-testid="access-card"
        data-access-kind="trial"
        aria-label={s.cardSectionTitle}
        className={cn('rounded-3xl border p-4 shadow-card',
          summary.tone === 'ending' ? 'border-warning/40 bg-warning/[0.06]' : 'border-line bg-surface')}
      >
        <div className="flex items-center gap-3">
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
            summary.tone === 'ending' ? 'bg-warning/15 text-warning' : 'bg-primary-soft text-primary-c')}>
            <Icon name="Clock" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p data-testid="access-card-status" className="text-sm font-black text-ink-900">{summary.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{s.cardTrialNote}</p>
          </div>
        </div>
        <div className="mt-3.5 space-y-2.5">
          <HaveCodeButton label={s.haveCode} onOpen={openActivation} />
          <PurchaseCta label={s.gatePrimary} onLeave={notePurchaseAttempt} />
        </div>
      </section>
    )
  }

  // ── التجربة المنتهية: البيانات محفوظة، والتفعيل بارز ───────────────────────
  if (kind === 'trialExpired') {
    return (
      <section
        data-testid="access-card"
        data-access-kind="trialExpired"
        aria-label={s.cardSectionTitle}
        className="rounded-3xl border border-line bg-surface p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-beige text-ink-500">
            <Icon name="Clock" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p data-testid="access-card-status" className="text-sm font-black text-ink-900">{s.statusTrialExpired}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{s.cardExpiredNote}</p>
          </div>
        </div>
        <div className="mt-3.5 space-y-2.5">
          <HaveCodeButton label={s.cardActivateCta} onOpen={openActivation} prominent />
          <PurchaseCta label={s.gatePrimary} onLeave={notePurchaseAttempt} />
        </div>
      </section>
    )
  }

  // ── الإيقاف الإداري: الحقيقة صريحة، والدعم هو الطريق — لا تفعيل ذاتي ────────
  if (kind === 'revoked') {
    return (
      <section
        data-testid="access-card"
        data-access-kind="revoked"
        aria-label={s.cardSectionTitle}
        className="rounded-3xl border border-danger/40 bg-danger/[0.06] p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/15 text-danger">
            <Icon name="Lock" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p data-testid="access-card-status" className="text-sm font-black text-ink-900">{s.statusRevoked}</p>
          </div>
        </div>
      </section>
    )
  }

  // ── نتحقّق بعد / حالة مجهولة: سطر هادئ لا بطاقة صاخبة ──────────────────────
  if (kind === 'checking' || kind === 'unknown') {
    return (
      <section data-testid="access-card" data-access-kind={kind} aria-label={s.cardSectionTitle}
        className="rounded-3xl border border-line bg-surface p-4 shadow-card">
        <p className="text-xs font-bold text-ink-500">{kind === 'checking' ? s.statusChecking : s.statusUnknown}</p>
      </section>
    )
  }

  // ── لا وصول (معاينة موثَّقة): ابدأ تجربتك أو اكتب كودك ─────────────────────
  return (
    <section
      data-testid="access-card"
      data-access-kind="noAccess"
      aria-label={s.cardSectionTitle}
      className="rounded-3xl border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="Sparkles" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-ink-900">{s.cardNoAccessTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{s.cardNoAccessNote}</p>
        </div>
      </div>
      <div className="mt-3.5 space-y-2.5">
        <button
          type="button"
          data-testid="access-card-start-trial"
          disabled={trialState === 'working'}
          onClick={startTrial}
          className="btn-primary min-h-[44px] w-full justify-center text-sm disabled:opacity-60"
        >
          {s.trialCta}
        </button>
        {trialMessage(trialState, lang) ? (
          <p role="status" data-testid="access-card-trial-message" className="text-xs font-bold leading-relaxed text-ink-700">
            {trialMessage(trialState, lang)}
          </p>
        ) : null}
        <HaveCodeButton label={s.haveCode} onOpen={openActivation} />
        {/* الشراء المباشر متاح كذلك — مسار مستقلّ عن الكود (التكليف). */}
        <a
          href={product.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="access-card-purchase"
          onClick={notePurchaseAttempt}
          className="block pt-0.5 text-center text-xs font-bold text-primary-c underline-offset-2 hover:underline"
        >
          {s.gatePrimary}
        </a>
      </div>
    </section>
  )
}
