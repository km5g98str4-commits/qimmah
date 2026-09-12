// سطح طلب إذن الإشعارات (ADV-14م · م١) — [CTO-70] البند ٢.
//
// يظهر مرّة واحدة بعد أول انتصار، بمقابل محدّد لا طلب مجرّد. الوقت **نصّ قابل
// للنقر** يُغيَّر قبل القبول، فلا يُطلب الإذن على وعد لا يناسب المستخدم.
//
// ⚠️ ذرّية التفعيل منسوخة حرفيًا من `NotificationsSettingsV2.onToggleMaster`
// (السطر ٩٧): قفل مرجعي يمنع التزامن · `requestNotificationPermission()` أولًا ·
// ثم **رفع `masterEnabled` فقط عند `granted`** · ورفض النظام يُبقيه مطفأً مع
// تلميح صادق بدل وعد كاذب بالعمل. أي انحراف عن هذا الترتيب يُنتج مفتاحًا
// مرفوعًا بلا إذن — أي وعدًا بإشعارات لن تصل.

import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { firstWeekStrings } from '@/i18n/dict/firstWeek'
import { notificationSettingsCopy } from '@/data/notificationCopy'
import { isValidNotificationTime } from '@/lib/notifications/prefs'
import type { NotificationPrefs } from '@/lib/notifications/types'
import { AppOverlay } from '@/components/AppOverlay'

interface NotifyAskSheetProps {
  lang: Lang
  prefs: NotificationPrefs
  /** التفعيل الذرّي — يعيد نتيجة الإذن الفعلية. */
  onAccept: (time: string) => Promise<'granted' | 'denied' | 'unsupported'>
  onDecline: () => void
}

export function NotifyAskSheet({ lang, prefs, onAccept, onDecline }: NotifyAskSheetProps) {
  const ar = lang !== 'en'
  const t = firstWeekStrings[ar ? 'ar' : 'en']
  const nc = notificationSettingsCopy(ar ? 'ar' : 'en')
  const [time, setTime] = useState(prefs.workoutDay.time)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const lockRef = useRef(false)

  const accept = async () => {
    if (lockRef.current) return
    lockRef.current = true
    setBusy(true)
    try {
      const perm = await onAccept(time)
      // نُبقي السطح مفتوحًا عند الرفض لنقول الحقيقة؛ المستدعي ثبّت القرار أصلًا.
      if (perm !== 'granted') setDenied(true)
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }

  return (
    <AppOverlay className="z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="notify-ask-title">
      <button type="button" aria-label={t.notifyAskNo} onClick={onDecline} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-line bg-surface p-5 pb-8 shadow-card">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />

        <h2 id="notify-ask-title" className="flex items-start gap-2.5 text-base font-black leading-relaxed text-ink-900">
          <Icon name="Bell" className="mt-0.5 h-5 w-5 shrink-0 text-primary-c" />
          {/* المقابل محدّد: ماذا نرسل، ومتى بالضبط. */}
          <span>{t.notifyAskLine(time)}</span>
        </h2>

        {/* الوقت نصّ قابل للنقر — يُغيَّر **قبل** القبول لا بعده. */}
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="tap-target mt-3 inline-flex items-center text-sm font-bold text-primary-c underline underline-offset-4"
          >
            {t.notifyAskChangeTime}
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="notify-ask-time" className="text-sm font-bold text-ink-500">{nc.from}</label>
            <input
              id="notify-ask-time"
              type="time"
              value={time}
              onChange={(e) => { if (isValidNotificationTime(e.target.value)) setTime(e.target.value) }}
              className="rounded-xl border border-line bg-page px-3 py-2 text-base font-bold text-ink-900"
            />
          </div>
        )}

        {denied && <p className="mt-3 text-sm leading-relaxed text-ink-500">{t.notifyAskDenied}</p>}

        <div className="mt-5 space-y-2">
          <button type="button" disabled={busy} onClick={() => void accept()} aria-busy={busy} className="btn-primary tap-target w-full py-3.5 text-[1.0625rem] disabled:opacity-60">
            {busy ? nc.saving : t.notifyAskYes}
          </button>
          <button type="button" onClick={onDecline} className="tap-target w-full rounded-2xl py-3 text-center text-sm font-bold text-ink-700">
            {t.notifyAskNo}
          </button>
        </div>

        {/* البيت الدائم يبقى الإعدادات — الرفض هنا لا يغلق الباب. */}
        <p className="mt-3 text-center text-xs font-bold text-ink-400">{t.notifyAskHome}</p>
      </div>
    </AppOverlay>
  )
}
