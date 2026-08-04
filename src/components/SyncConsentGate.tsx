import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { syncConsentStrings } from '@/i18n/dict/g-syncConsent'
import { setCloudSyncConsent, setSensitiveHealthConsent } from '@/lib/syncConsent'

/**
 * بوابة موافقة المزامنة (حارة G · ج-١) — خطوتان لا خطوة.
 *
 * الخطوة ١: أنرفع بياناتك أصلًا؟  ·  الخطوة ٢: وهل يشمل الرفع بياناتك الصحية؟
 * الفصل مقصود وقرار مقفل (§8-5): الموافقة الثانية **لا تُستنتج** من الأولى، فلا
 * تُجمعان في مربّع واحد ولا في زرّ واحد.
 *
 * **مكوّن عرضي بحت لا يركّب نفسه.** نقطة عرضه بعد تسجيل الدخول — وذلك تدفّق حارة B،
 * فالتركيب يمرّ بالمنسّق (§1.4-3). يُستدعى بـ`onDone` ليقرّر المستدعي ما بعده.
 *
 * الصدق قبل الطمأنينة (§6-4): فشل الحفظ يُعرض ولا يُبتلع، ولا يُغلق المكوّن على
 * فشل — لأن الإغلاق يوحي بنجاح لم يحدث (§5).
 */
export function SyncConsentGate({
  lang,
  userId,
  onDone,
}: {
  lang: Lang
  userId: string
  onDone: (result: { cloudSync: boolean; sensitiveHealth: boolean }) => void
}) {
  const s = syncConsentStrings[lang]
  const [step, setStep] = useState<1 | 2>(1)
  const [failed, setFailed] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // إدارة التركيز (§9): كل خطوة تنقل التركيز إلى عنوانها، فلا يتوه قارئ الشاشة
  // بين خطوتين تتبادلان نفس الحاوية.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const decline = () => onDone({ cloudSync: false, sensitiveHealth: false })

  const acceptCloud = () => {
    if (setCloudSyncConsent(userId, true) !== 'ok') {
      setFailed(true)
      return
    }
    setFailed(false)
    setStep(2)
  }

  const answerSensitive = (accepted: boolean) => {
    if (setSensitiveHealthConsent(userId, accepted) !== 'ok') {
      setFailed(true)
      return
    }
    onDone({ cloudSync: true, sensitiveHealth: accepted })
  }

  const List = ({ items }: { items: readonly string[] }) => (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      data-testid="sync-consent-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-consent-title"
      className="mx-auto w-full max-w-md rounded-2xl bg-surface p-5 shadow-lg"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={step === 1 ? 'ShieldCheck' : 'Lock'} className="h-5 w-5" />
      </span>

      <h2
        id="sync-consent-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-lg font-semibold text-ink-900 outline-none"
      >
        {step === 1 ? s.title : s.sensitiveTitle}
      </h2>

      {step === 1 ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.intro}</p>

          <p className="mt-4 text-sm font-medium text-ink-900">{s.uploadsHeading}</p>
          <List items={s.uploads} />

          <p className="mt-4 text-sm font-medium text-ink-900">{s.staysHeading}</p>
          <List items={s.stays} />

          <p className="mt-4 text-sm leading-relaxed text-ink-500">{s.controlNote}</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.sensitiveIntro}</p>
          <List items={s.sensitiveItems} />
          <p className="mt-4 text-sm leading-relaxed text-ink-500">{s.sensitiveWhy}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.sensitiveSkipNote}</p>
        </>
      )}

      {failed && (
        <p role="alert" className="mt-4 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {s.saveFailed}
        </p>
      )}

      {/* أهداف لمس ≥44px (§9)، وترتيب منطقي يعمل في الاتجاهين. */}
      <div className="mt-6 flex flex-col gap-2">
        {step === 1 ? (
          <>
            <button type="button" onClick={acceptCloud} className="btn-primary min-h-[44px] w-full">
              {s.accept}
            </button>
            <button type="button" onClick={decline} className="btn-ghost min-h-[44px] w-full">
              {s.later}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => answerSensitive(true)} className="btn-primary min-h-[44px] w-full">
              {s.sensitiveAccept}
            </button>
            <button type="button" onClick={() => answerSensitive(false)} className="btn-ghost min-h-[44px] w-full">
              {s.sensitiveSkip}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
