// استئناف التجربة المعلّقة — السطح الذي يفي بما وعد به زرّ التسليم.
// [SOVEREIGN-ENTRY-001] الحزمة ٧.
//
// ═══ لماذا هنا لا في شاشة التسليم؟ ═══
// شاشة التسليم **تُفكَّك** في الطريق إلى إنشاء الحساب، فالنيّة تعيش على القرص
// في `lib/access/trialIntent.ts` — السلطة الوحيدة، ويقرؤها الاستئناف التلقائي.
// فالوعد يُقطع هناك، ويجب أن يُوفّى **بعد** الحساب — أي على السطح الذي يهبط
// عليه المستخدم عائدًا. هذا المكوّن هو ذلك السطح: يُركَّب في جذر التطبيق،
// ويظهر **فقط** حين تجتمع نيّة سارية مع حساب فعليّ.
//
// ═══ لا زرّ يبدو قابلًا للفعل واعتماديّته غائبة ═══
// الشرط `signedIn` ليس تجميلًا: التجربة تحتاج حسابًا موثَّقًا بسلطة الخادم.
// فبلا حساب لا يُعرض شيء أصلًا — بدل زرٍّ يُضغط ليقول «تحتاج حسابًا».
// والنتيجة تُعرض بسببها الصادق (بريد غير مؤكَّد · مستهلكة · تعذّر وصول) لا
// برسالة عامّة، والنيّة تُستهلك **مرّة واحدة** فلا تلاحق المستخدم.

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/appPreferences'
import type { TrialOutcome } from '@/lib/access/entitlementBackend'
import { useAccess } from '@/lib/access/useAccess'
import { clearTrialIntent, hasTrialIntent } from '@/lib/access/trialIntent'
import { revealStrings } from '@/i18n/dict/reveal'
import { Icon } from '@/components/Icon'

export interface PendingTrialResumeProps {
  lang: Lang
  /** هل المستخدم داخل حسابه الآن؟ الشرط الذي عجزت شاشة التسليم عن انتظاره. */
  signedIn: boolean
}

export function PendingTrialResume({ lang, signedIn }: PendingTrialResumeProps) {
  const t = revealStrings[lang] ?? revealStrings.ar
  const { beginTrial, trialResume, acknowledgeTrialResume } = useAccess()
  const [pending, setPending] = useState(false)
  const [state, setState] = useState<'idle' | 'working' | TrialOutcome>('idle')

  /**
   * ═══ [COMMISSIONING §1] صار هذا السطح **احتياطًا معلنًا** لا مسارًا أوّليًّا ═══
   *
   * المسار الأوّل تلقائيّ: مزوّد الوصول يستأنف النيّة عند `SIGNED_IN` بلا أي
   * ضغطة. فما الذي يبقى لهذه اللافتة؟ **الحالة التي لا يصلها ذلك الحدث**:
   * من يؤكّد بريده برابط يفتح **تبويبًا جديدًا** تصله الجلسة حدثَ
   * `INITIAL_SESSION` لا `SIGNED_IN`. فالنيّة تبقى سارية بلا استئناف، ولولا
   * هذه اللافتة لضاع وعدُ الزرّ بصمت.
   *
   * ولذلك تُخفى فور وصول نتيجة تلقائية: لا يُطلب من أحد أن يضغط على ما تمّ.
   */
  useEffect(() => {
    if (trialResume) {
      // وصلت نتيجة من الاستئناف التلقائي — تُعرض هنا ثم تُقرّ، فلا تتكرّر.
      setState(trialResume)
      setPending(false)
      acknowledgeTrialResume()
      return
    }
    setPending(signedIn && hasTrialIntent())
  }, [signedIn, trialResume, acknowledgeTrialResume])

  if (!pending || !signedIn) return null

  const onResume = async () => {
    if (state === 'working') return
    setState('working')
    const outcome = await beginTrial()
    setState(outcome)
    // تُستهلك النيّة على كل نتيجة **حاسمة**. أمّا `offline` فمؤقّت بطبعه:
    // إسقاطها عنده يعاقب المستخدم على انقطاع شبكة ليس منه.
    if (outcome !== 'offline') {
      clearTrialIntent()
      setPending(false)
    }
  }

  const message =
    state === 'working' ? t.cta.trialStarting
    : state === 'started' ? t.cta.trialStarted
    : state === 'email_not_verified' ? t.cta.trialNeedsVerifiedEmail
    : state === 'already_claimed' ? t.cta.trialAlreadyUsed
    : state === 'offline' || state === 'revoked' ? t.cta.trialOffline
    : state === 'not_authenticated' ? t.cta.trialNeedsAccount
    : null

  return (
    <section
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      data-testid="pending-trial-resume"
      className="mx-auto w-full max-w-md rounded-2xl border border-primary/40 bg-surface p-4"
    >
      <p className="flex items-start gap-2 text-sm font-bold leading-relaxed text-ink-900">
        <Icon name="Sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-primary-c" />
        {t.cta.resumeTrialTitle}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void onResume()}
          disabled={state === 'working'}
          aria-busy={state === 'working'}
          data-testid="pending-trial-resume-cta"
          className="btn-primary min-h-[44px] flex-1 text-sm disabled:opacity-60"
        >
          {t.cta.resumeTrialCta}
        </button>
        <button
          type="button"
          onClick={() => { clearTrialIntent(); setPending(false) }}
          data-testid="pending-trial-dismiss"
          className="min-h-[44px] rounded-2xl border border-line bg-surface px-4 text-sm font-bold text-ink-700"
        >
          {t.cta.resumeTrialDismiss}
        </button>
      </div>
      {message && (
        <p role="status" aria-live="polite" data-testid="pending-trial-status" className="mt-2 text-[0.78rem] font-bold text-ink-700">
          {message}
        </p>
      )}
    </section>
  )
}
