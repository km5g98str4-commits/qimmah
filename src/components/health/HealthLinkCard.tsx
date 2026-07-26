import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { healthStatusCopy, healthStrings } from '@/i18n/dict/health'
import { requestAllHealthAccess, syncAllEnabled } from '@/lib/health/connect'
import { healthLinkSnapshot, type HealthLinkStatus } from '@/lib/health/linkState'

/** لون الشارة لكل حالة — لا أحمر لـ«يحتاج مراجعة»: ليست خطأ المستخدم ولا عطلًا. */
const TONE: Record<HealthLinkStatus, { chip: string; icon: string }> = {
  connected: { chip: 'bg-success/15 text-success', icon: 'CheckCircle2' },
  'needs-review': { chip: 'bg-warning/15 text-warning', icon: 'AlertTriangle' },
  'not-connected': { chip: 'border border-line bg-surface text-ink-700', icon: 'Activity' },
  unavailable: { chip: 'border border-line bg-surface text-ink-400', icon: 'Info' },
}

interface Props {
  lang: Lang
  /** يفتح صفحة تفاصيل الربط. */
  onOpenDetails: () => void
  className?: string
}

/**
 * بطاقة «صحتي من Apple» في أعلى الإعدادات (Q18).
 *
 * لماذا هنا: الأساس المجمّع كان مكتملًا وبلا أي مدخل في الواجهة — المستخدم لا
 * يستطيع ربط «صحتي» إطلاقًا. البطاقة تعطي حالة واحدة واضحة وزرًّا أساسيًا واحدًا،
 * وتترك كل التفاصيل لصفحة الربط بدل نثرها بين الإعدادات.
 *
 * الزرّ يستدعي `requestAllHealthAccess` — **طلب واحد مجمّع** لكل الأنواع المدعومة
 * على هذا الجهاز، لا مسار لكل مقياس (قرار المنتج السابق). القراءة فقط.
 */
export function HealthLinkCard({ lang, onOpenDetails, className }: Props) {
  const s = healthStrings[lang]
  const ar = lang !== 'en'
  const [snap, setSnap] = useState(() => healthLinkSnapshot())
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // الحالة تُقرأ من التخزين، فنعيد قراءتها عند العودة للتبويب (تغيير الصلاحيات
  // يتم خارج التطبيق، في «صحتي»، ولا يصلنا منه أي حدث).
  useEffect(() => {
    const refresh = () => setSnap(healthLinkSnapshot())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const connect = useCallback(async () => {
    setBusy(true)
    setFailed(false)
    const result = await requestAllHealthAccess()
    if (result.status === 'error') {
      setBusy(false)
      setSnap(healthLinkSnapshot())
      setFailed(true)
      return
    }
    // اسحب أول دفعة فورًا. بدونها يبقى `withDataCount` صفرًا فتقول البطاقة
    // «يحتاج مراجعة» للأبد حتى مع صلاحيات ممنوحة — وهو ادّعاء غير صحيح.
    // `syncAllEnabled` قراءة صرفة ولا يفتح ورقة تفويض ثانية.
    try {
      await syncAllEnabled()
    } catch {
      // فشل السحب لا يُبطل الطلب — الحالة أدناه تعكس ما وصل فعلًا.
    }
    setBusy(false)
    setSnap(healthLinkSnapshot())
    // `completed` لا يعني «مُنح» — iOS يخفي ذلك. نعلن انتهاء التدفّق فقط.
    setAnnouncement(s.announceRequested)
    onOpenDetails()
  }, [onOpenDetails, s.announceRequested])

  const copy = healthStatusCopy(s, snap.status, snap.withDataCount, snap.totalCount)
  const tone = TONE[snap.status]
  const showCta = snap.status !== 'unavailable'
  const manage = snap.hasRequested

  return (
    <section
      className={cn('rounded-2xl border border-line bg-surface p-4', className)}
      aria-labelledby="health-link-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="HeartPulse" className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="health-link-title" className="text-sm font-black text-ink-900">
              {s.title}
            </h2>
            {/* الحالة نصّ مقروء لا لون فقط — VoiceOver يقرأها، ومَن لا يميّز الألوان يراها. */}
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black', tone.chip)}>
              <Icon name={tone.icon} className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
            {snap.status === 'not-connected' ? s.cardIntro : copy.body}
          </p>
          {failed && (
            <p role="alert" className="mt-2 text-xs font-bold leading-relaxed text-warning">
              {s.errorTitle} — {s.errorBody}
            </p>
          )}
        </div>
      </div>

      {showCta && (
        <button
          type="button"
          onClick={manage ? onOpenDetails : connect}
          disabled={busy}
          aria-label={manage ? s.ctaManageA11y : s.ctaConnectA11y}
          className="btn-primary mt-3 min-h-[44px] w-full py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? s.ctaBusy : manage ? s.ctaManage : s.ctaConnect}
          {!busy && <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}

      {/* إعلان مؤدَّب للقارئ الصوتي بعد اكتمال التدفّق — لا يسرق التركيز. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  )
}
