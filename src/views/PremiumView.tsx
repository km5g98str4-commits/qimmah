// شاشة العضوية — السطح التجاري **الدائم**.
// [WAVE2-PREMIUM-SURFACE]
//
// ═══ العطل الذي تغلقه هذه الشاشة ═══
// مسار التفعيل كان يعيش في `PremiumGate` وحدها، وهي نافذة **لا تُفتح إلا
// بالاصطدام**: لا تظهر إلا حين يُضبَط `blockedAction`، أي بعد أن يحاول المستخدم
// فعلًا محجوبًا ويُردّ. فمن اشترى صكًّا وفتح التطبيق لا يجد أين يضعه — عليه أن
// يتعثّر بجدارٍ أوّلًا ليُعرَض عليه الباب، وهو لا يعرف أن عليه التعثّر.
//
// ═══ حدّ هذه الشاشة — وهو الحدّ الحاكم ═══
// **لا سلطة هنا.** لا تمنح وصولًا، ولا تحسب انتهاءً، ولا تخزّن حالة تجارية.
//   • الحالة تُقرأ من `useAccessSummary` ⇐ `entitlement.detail.serverState` ⇐ الخادم.
//   • المتبقّي من **ساعة الخادم** (`remainingMs`) لا من `Date.now()`.
//   • `redeem`/`beginTrial` تنادِيان الخادم ثم **تعيدان القراءة** (`refresh`) —
//     فلا تفتح هذه الشاشة ميزةً بناءً على ردٍّ محلّي.
// ولو كُذِب كلُّ سطرٍ هنا لما فُتح فعلٌ مدفوع واحد: القرار في `isPaidActionAllowed`.
//
// ولا مسار عميل ثانٍ: نفس `redeemActivationCode` ونفس البوّابة التي تستعملها
// `PremiumGate` — والاقتران محروس بـ`test:attack-gateway-coupling`.

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { StandaloneAppScreen } from '@/components/StandaloneAppScreen'
import { product } from '@/config/product'
import { premiumStrings } from '@/i18n/dict/premium'
import { accessStrings } from '@/i18n/dict/access'
import { useAccess } from '@/lib/access/useAccess'
import { useAccessSummary } from '@/lib/access/useAccessSummary'
import { formatRemaining, TRIAL_ENDING_SOON_MS, type AccessKind } from '@/lib/access/accessSummary'
import {
  offersTrial, offersCode, offersBuy, showsRemaining, showsPermanentPremiumNote,
} from '@/lib/access/premiumSurfacePolicy'
import {
  outcomeTone,
  redeemMessage,
  trialMessage,
  type RedeemUiState,
  type TrialUiState,
} from '@/lib/access/outcomeMessages'
import type { Lang } from '@/lib/appPreferences'

export interface PremiumViewProps {
  lang: Lang
  signedIn: boolean
  onBack: () => void
  onSignIn: () => void
}

interface Headline { title: string; body: string; icon: string; tone: 'active' | 'ending' | 'neutral' | 'blocked' }

function headlineFor(kind: AccessKind, s: typeof premiumStrings.ar, tone: Headline['tone']): Headline {
  switch (kind) {
    case 'checking': return { title: s.stateChecking, body: '', icon: 'RefreshCw', tone: 'neutral' }
    case 'premium': return { title: s.statePremium, body: s.statePremiumBody, icon: 'Sparkles', tone: 'active' }
    case 'special': return { title: s.stateSpecial, body: s.stateSpecialBody, icon: 'KeyRound', tone: 'active' }
    case 'trial': return { title: s.stateTrial, body: s.stateTrialBody, icon: 'Timer', tone }
    case 'trialExpired': return { title: s.stateTrialExpired, body: s.stateTrialExpiredBody, icon: 'Clock', tone: 'neutral' }
    case 'revoked': return { title: s.stateRevoked, body: s.stateRevokedBody, icon: 'AlertTriangle', tone: 'blocked' }
    case 'unknown': return { title: s.stateUnknown, body: s.stateUnknownBody, icon: 'HelpCircle', tone: 'neutral' }
    default: return { title: s.stateNoAccess, body: s.stateNoAccessBody, icon: 'Lock', tone: 'neutral' }
  }
}

export function PremiumView({ lang, signedIn, onBack, onSignIn }: PremiumViewProps) {
  const s = premiumStrings[lang] ?? premiumStrings.ar
  const a = accessStrings[lang] ?? accessStrings.ar
  const { redeem, beginTrial, refresh, recordTrialIntent, notePurchaseAttempt } = useAccess()
  const summary = useAccessSummary(lang)

  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [redeemState, setRedeemState] = useState<RedeemUiState>('idle')
  const [trialState, setTrialState] = useState<TrialUiState>('idle')

  const kind = summary.kind
  const head = headlineFor(kind, s, summary.tone)

  /**
   * **حارس الإرسال المزدوج.** النقرة الثانية أثناء `checking` تعود بلا أثر —
   * لا نداء ثانٍ، ولا حالة تُدهَس. (والذرّية الخادمية مُثبتة مستقلّةً في
   * `test:attack-purchase-race`؛ هذا حارس واجهة فوقها لا بديل عنها.)
   */
  const submitCode = async () => {
    if (redeemState === 'checking') return
    setRedeemState('checking')
    setRedeemState(await redeem(code))
  }

  const startTrial = async () => {
    if (trialState === 'working') return
    recordTrialIntent('settings')
    setTrialState('working')
    setTrialState(await beginTrial())
  }

  const redeemMsg = redeemMessage(redeemState, lang)
  const redeemToneNow = outcomeTone(redeemState)
  const trialMsg = trialMessage(trialState, lang)
  const trialToneNow = outcomeTone(trialState)

  // المتبقّي يُعرض **حين يوجد فقط**. Premium دائم ⇒ `remainingMs === null` ⇒ لا
  // سطر مدّة ولا تاريخ مخترع (التكليف: «لا تعرض تاريخ انتهاء وهميًّا»).
  const remaining = summary.remainingMs
  // القرار من السياسة، والتضييق النوعي صريح بعده: `showsRemaining` تحرس
  // المعنى، وTypeScript لا يضيّق عبر نداء دالّة — فيُقال الشرطان معًا.
  const shownRemaining = showsRemaining(kind, remaining) && remaining !== null ? remaining : null
  const endingSoon = shownRemaining !== null && shownRemaining <= TRIAL_ENDING_SOON_MS

  return (
    /* [STANDALONE-CHROME-001] الغلاف المعتمد للشاشات المستقلّة: رأسه يحترم النتوء
       (`var(--safe-top)`) وله متمرّره الخاص بحشوة سفلية آمنة. كان هذا السطح يبني
       رأسه بنفسه بـ`container-page py-4` بلا أيّ منهما، فيقع العنوان وزرّ الرجوع
       تحت شريط الحالة على آيفون ويبدو السطح معلّقًا — وهي الواقعة التي رصدها المؤسس. */
    <StandaloneAppScreen lang={lang} title={s.title} backLabel={s.back} onBack={onBack}>
      <div data-testid="premium-view" data-access-kind={kind}>
        <p className="mb-4 text-xs font-bold text-ink-500">{s.subtitle}</p>

      {/* ═══ لا حجب للسطح خلف المصادقة ═══
          `PremiumGate` — وهي السابقة القائمة — لا تحجب نداءاتها خلف `auth.user`
          إطلاقًا: تعرضها، ويردّ الخادم `not_authenticated` فتُقال «تحتاج حسابًا»
          بنصّها من `outcomeMessages`. فحجبُ الشاشة كلّها هنا كان سيصنع سلوكين
          مختلفين لنفس المسار، ويُخفي عن غير المسجَّل **ما الذي يشتريه أصلًا**.
          فالدعوة إلى الحساب تُضاف فوق الحالة ولا تحلّ محلّها. */}
      {!signedIn ? (
        <section className="card mb-3 p-5" data-testid="premium-signed-out">
          <h2 className="text-base font-black text-ink-900">{s.stateSignedOut}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.stateSignedOutBody}</p>
          <button type="button" onClick={onSignIn} data-testid="premium-sign-in" className="btn-primary mt-4 min-h-[48px] w-full justify-center text-sm">
            {s.signIn}
          </button>
        </section>
      ) : null}

      <>
          {/* ── ترويسة الحالة — الحقيقة الخادمية في سطر ── */}
          <section
            data-testid="premium-state-card"
            data-state-kind={kind}
            className={`card p-5 ${head.tone === 'blocked' ? 'border-danger/40' : head.tone === 'ending' ? 'border-warning/40' : ''}`}
          >
            <div className="flex items-start gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${head.tone === 'blocked' ? 'bg-danger/10 text-danger' : head.tone === 'active' ? 'bg-primary-soft text-primary-c' : 'bg-beige text-ink-500'}`}>
                <Icon name={head.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 data-testid="premium-state-title" className="text-base font-black text-ink-900">{head.title}</h2>
                {head.body ? <p className="mt-1 text-sm leading-relaxed text-ink-500">{head.body}</p> : null}

                {/* Premium: الصيغة المعتمدة §0.1 + «بلا تاريخ انتهاء» — لا تاريخ مخترع. */}
                {showsPermanentPremiumNote(kind) ? (
                  <div className="mt-2.5 space-y-1">
                    <p data-testid="premium-note" className="text-[0.8rem] font-bold text-primary-c">{s.premiumNote}</p>
                    <p data-testid="premium-no-expiry" className="text-[0.75rem] font-bold text-ink-400">{s.premiumNoExpiry}</p>
                  </div>
                ) : null}

                {/* المتبقّي — من ساعة الخادم، ويظهر حين يوجد فقط. */}
                {shownRemaining !== null ? (
                  <p data-testid="premium-remaining" className={`mt-2.5 text-[0.8rem] font-black ${endingSoon ? 'text-warning' : 'text-ink-700'}`}>
                    {s.remainingLabel(formatRemaining(shownRemaining, lang))}
                    {endingSoon ? <span className="ms-1.5 font-bold text-ink-400">· {s.endsSoon}</span> : null}
                  </p>
                ) : null}
              </div>
            </div>

            {kind === 'unknown' ? (
              <button type="button" onClick={() => void refresh()} data-testid="premium-retry" className="btn-ghost mt-4 min-h-[44px] w-full text-sm">
                {s.retry}
              </button>
            ) : null}
          </section>

          {/* ── التجربة — تُعرض في `noAccess` وحدها ── */}
          {offersTrial(kind) ? (
            <section className="card mt-3 p-5" data-testid="premium-trial-section">
              <h2 className="text-base font-black text-ink-900">{s.trialHeading}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.trialBody}</p>
              <button
                type="button"
                onClick={() => void startTrial()}
                disabled={trialState === 'working' || trialState === 'started'}
                aria-busy={trialState === 'working'}
                data-testid="premium-start-trial"
                className="btn-primary mt-4 min-h-[48px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {s.trialCta}
              </button>
              <p
                role="status"
                aria-live="polite"
                data-testid="premium-trial-message"
                className={`text-xs font-bold leading-relaxed ${trialMsg ? 'mt-2.5' : ''} ${trialToneNow === 'success' ? 'v2-text-green' : trialToneNow === 'pending' ? 'text-ink-500' : 'text-danger'}`}
              >
                {trialMsg ?? ''}
              </p>
            </section>
          ) : null}

          {/* ── الكود — أوّل درجة، لا مخبوءًا خلف جدار ── */}
          {offersCode(kind) ? (
            <section className="card mt-3 p-5" data-testid="premium-code-section">
              <h2 className="text-base font-black text-ink-900">{s.codeHeading}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.codeBody}</p>

              {!codeOpen ? (
                <button type="button" onClick={() => setCodeOpen(true)} data-testid="premium-open-code" className="btn-ghost mt-4 min-h-[48px] w-full text-sm">
                  <Icon name="KeyRound" className="h-4 w-4" />
                  {s.codeOpen}
                </button>
              ) : (
                <div className="mt-4">
                  <label htmlFor="premium-activation-code" className="block text-[0.78rem] font-bold text-ink-700">{s.codeLabel}</label>
                  <input
                    id="premium-activation-code"
                    data-testid="premium-code-input"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); if (redeemState !== 'idle') setRedeemState('idle') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitCode() } }}
                    placeholder={s.codePlaceholder}
                    autoComplete="off"
                    // الكود لاتيني دائمًا — والحقل LTR ولو كانت الجلسة عربية.
                    dir="ltr"
                    aria-describedby="premium-code-hint premium-code-message"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
                  />
                  <p id="premium-code-hint" className="mt-1.5 text-[0.7rem] leading-relaxed text-ink-400">{s.codeHint}</p>
                  <button
                    type="button"
                    onClick={() => void submitCode()}
                    disabled={redeemState === 'checking' || redeemState === 'success'}
                    aria-busy={redeemState === 'checking'}
                    data-testid="premium-code-submit"
                    className="btn-primary mt-2.5 min-h-[48px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {s.codeSubmit}
                  </button>
                  {/* منطقة حيّة **مرسومة دائمًا** — قارئ الشاشة يعلن ما يُدرَج في
                      منطقة قائمة، ولا يعلن بالضرورة منطقةً تُولد ومعها نصّها. */}
                  <p
                    id="premium-code-message"
                    role="status"
                    aria-live="polite"
                    data-testid="premium-code-message"
                    className={`text-xs font-bold leading-relaxed ${redeemMsg ? 'mt-2.5' : ''} ${redeemToneNow === 'success' ? 'v2-text-green' : redeemToneNow === 'pending' ? 'text-ink-500' : 'text-danger'}`}
                  >
                    {redeemMsg ?? ''}
                  </p>
                  {/* لا سطر «تمّ» هنا: النجاح يرفع الحالة فيصير `offersCode`
                      كاذبًا ويُفكَّك هذا القسم كلّه. فالتأكيد هو **بطاقة الحالة**
                      («عندك قِمّة Premium») — وهي تبقى بعد إعادة التحميل، والرسالةُ
                      العابرة لا تبقى. وسطرٌ لا يُرى أسوأ من غيابه. */}
                </div>
              )}
            </section>
          ) : null}

          {/* ── الشراء ── */}
          {offersBuy(kind) ? (
            <section className="card mt-3 p-5" data-testid="premium-buy-section">
              <h2 className="text-base font-black text-ink-900">{s.buyHeading}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.buyBody}</p>
              <p className="mt-1.5 text-[0.8rem] font-bold text-primary-c">{s.premiumNote}</p>
              <a
                href={product.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="premium-buy-cta"
                // الوسم قبل المغادرة: التبويب يبقى خلف صفحة الشراء، فعند العودة
                // تُطالَب المِنَح المعلّقة ويُعاد حسم الاستحقاق مرّة واحدة.
                onClick={notePurchaseAttempt}
                className="btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 text-sm"
              >
                {a.gatePrimary}
                <Icon name="ExternalLink" className="h-4 w-4" />
              </a>
            </section>
          ) : null}
      </>
      </div>
    </StandaloneAppScreen>
  )
}
