import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from '@/lib/notifications/prefs'
import {
  requestNotificationPermission,
  notificationPermissionStatus,
  syncNotifications,
  type NotificationPermission,
} from '@/lib/notifications/engine'
import { readSupplementNames } from '@/lib/notifications/supplementNames'
import type { NotificationPrefs } from '@/lib/notifications/types'

interface Props {
  lang: Lang
  onBack: () => void
}

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * إعدادات الإشعارات (v2.1) — مفتاح رئيسي + مفاتيح فرعية لكل نوع + منتقيات وقت.
 * ember (bg-primary) محصور بمفتاح رئيسي واحد فقط — كل ما دونه بلون هادئ (v2-blue) حتى
 * لا يتنافس أكثر من فعل بصري واحد على الانتباه في نفس الشاشة.
 *
 * الإذن يُطلب فقط من نقرة صريحة هنا (تفعيل المفتاح الرئيسي) — لا طلب عند الإقلاع أبدًا.
 * على الويب (بلا منصّة أصلية): المفاتيح تُعرض بصدق كمعطّلة مع ملاحظة «متاح على التطبيق» —
 * لا وعد بعمل شيء لا يعمل فعليًا.
 */
export function NotificationsSettingsV2({ lang, onBack }: Props) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const auth = useAuth()
  const uid = auth.user?.id ?? null

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => (uid ? loadNotificationPrefs(uid) : DEFAULT_NOTIFICATION_PREFS))
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [busy, setBusy] = useState(false)
  const [justDenied, setJustDenied] = useState(false)
  const lockRef = useRef(false)
  const native = Capacitor.isNativePlatform()
  const supplementNames = readSupplementNames()

  useEffect(() => {
    if (uid) setPrefs(loadNotificationPrefs(uid))
  }, [uid])

  // افحص الإذن عند الظهور وعند كل عودة — يلتقط تعطيل المستخدم للإشعارات من إعدادات النظام.
  useEffect(() => {
    if (!native) return
    let alive = true
    const check = () => void notificationPermissionStatus().then((p) => { if (alive) setPermission(p) })
    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [native])

  const permKnown = permission !== null
  // «مفعّل فعليًا» = المفتاح الرئيسي محفوظ **و** الإذن ممنوح فعلًا — لا وعد بجدولة بلا إذن حقيقي.
  const masterActive = native && prefs.masterEnabled && (permKnown ? permission === 'granted' : true)
  const revoked = native && prefs.masterEnabled && permKnown && permission !== 'granted'

  const persist = (next: NotificationPrefs) => {
    setPrefs(next)
    if (uid) {
      saveNotificationPrefs(uid, next)
      void syncNotifications(uid, next) // خامل على الويب؛ حتمي (يُلغي ثم يُجدول) على الأصلي
    }
  }

  const onToggleMaster = async () => {
    if (!native || !uid || lockRef.current) return
    lockRef.current = true
    setBusy(true)
    try {
      if (masterActive) {
        setJustDenied(false)
        persist({ ...prefs, masterEnabled: false })
        return
      }
      // تفعيل (أو إعادة تفعيل بعد إلغاء إذن سابق): نطلب الإذن الآن فقط — أبدًا عند الإقلاع.
      const perm = await requestNotificationPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setJustDenied(true) // نُبقيه مطفأً ونعرض تلميحًا صادقًا — لا وعد كاذب بالعمل
        return
      }
      setJustDenied(false)
      persist({ ...prefs, masterEnabled: true })
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }

  const kindsDisabled = !masterActive || busy
  const webNote = !native
  const deniedNote = native && (justDenied || revoked)

  return (
    <SubScreen title={t('التذكيرات', 'Reminders')} onBack={onBack} lang={lang}>
      {/* المفتاح الرئيسي — الفعل الأساسي الوحيد (ember). */}
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black">{t('تفعيل التذكيرات', 'Enable reminders')}</p>
            <p className="mt-0.5 text-xs text-ink-500">{t('تمرين · راحة · ماء · أسبوعي · مكمّلات', 'Workout · rest · water · weekly · supplements')}</p>
          </div>
          <button
            id="notif-master"
            type="button"
            aria-pressed={masterActive}
            aria-label={t('تفعيل التذكيرات', 'Enable reminders')}
            disabled={!native || busy}
            onClick={() => void onToggleMaster()}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', masterActive ? 'bg-primary' : 'bg-line')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', masterActive ? 'start-0.5' : 'end-0.5')} />
          </button>
        </div>

        {webNote && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-500">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('متاح على التطبيق — التذكيرات المحلية تحتاج تثبيت قِمّة على جهازك.', 'Available on the app — local reminders need Qimmah installed on your device.')}
          </p>
        )}
        {deniedNote && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-500">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('الإذن غير ممنوح — فعّله من إعدادات النظام ثم عُد وفعّل المفتاح هنا مجددًا.', 'Permission not granted — enable it in system settings, then re-enable the toggle here.')}
          </p>
        )}
      </section>

      {/* نافذة الهدوء — تُطبَّق على تذكيرات الماء المتكرّرة. */}
      <Group title={t('نافذة الهدوء', 'Quiet hours')}>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <TimeField
            id="notif-quiet-start"
            label={t('من', 'From')}
            value={prefs.quietHours.start}
            disabled={kindsDisabled}
            onChange={(v) => persist({ ...prefs, quietHours: { ...prefs.quietHours, start: v } })}
          />
          <TimeField
            id="notif-quiet-end"
            label={t('إلى', 'To')}
            value={prefs.quietHours.end}
            disabled={kindsDisabled}
            onChange={(v) => persist({ ...prefs, quietHours: { ...prefs.quietHours, end: v } })}
          />
        </div>
      </Group>

      {/* الأنواع — كل واحد بمفتاحه الفرعي (لون هادئ v2-blue، لا ember). */}
      <Group title={t('الأنواع', 'Kinds')}>
        <KindRow
          icon="Dumbbell"
          title={t('تمرين اليوم', 'Workout day')}
          sub={t('من أيام خطتك الحقيقية', "From your real plan's days")}
          enabled={prefs.workoutDay.enabled}
          time={prefs.workoutDay.time}
          disabled={kindsDisabled}
          onToggle={(v) => persist({ ...prefs, workoutDay: { ...prefs.workoutDay, enabled: v } })}
          onTime={(v) => persist({ ...prefs, workoutDay: { ...prefs.workoutDay, time: v } })}
          timeLabel={t('الوقت', 'Time')}
        />
        <KindRow
          icon="Moon"
          title={t('يوم الراحة', 'Rest day')}
          sub={t('تذكير هادئ بالاستشفاء', 'A calm recovery nudge')}
          enabled={prefs.restDay.enabled}
          time={prefs.restDay.time}
          disabled={kindsDisabled}
          onToggle={(v) => persist({ ...prefs, restDay: { ...prefs.restDay, enabled: v } })}
          onTime={(v) => persist({ ...prefs, restDay: { ...prefs.restDay, time: v } })}
          timeLabel={t('الوقت', 'Time')}
        />

        {/* الماء — بلا وقت واحد؛ معدّل متكرّر داخل نافذة الهدوء. */}
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="v2-bg-blue-soft v2-text-blue grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name="Droplet" className="h-4.5 w-4.5" /></span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{t('تذكير الماء', 'Water reminder')}</span>
              <span className="block text-xs text-ink-500">{t('كل عدد ساعات داخل نافذة الهدوء', 'Every N hours within quiet hours')}</span>
            </span>
            <ToggleSwitch id="notif-water" checked={prefs.water.enabled} disabled={kindsDisabled} onChange={(v) => persist({ ...prefs, water: { ...prefs.water, enabled: v } })} label={t('تذكير الماء', 'Water reminder')} />
          </div>
          {prefs.water.enabled && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <label htmlFor="notif-water-cadence" className="text-xs text-ink-500">{t('كل كم ساعة', 'Every (hours)')}</label>
              <select
                id="notif-water-cadence"
                value={prefs.water.cadenceHours}
                disabled={kindsDisabled}
                onChange={(e) => persist({ ...prefs, water: { ...prefs.water, cadenceHours: Number(e.target.value) } })}
                className="rounded-lg border border-line bg-page px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-[color:var(--v2-blue)] disabled:opacity-40"
              >
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>{ar ? `${h} ساعة` : `${h}h`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ملخّص الأسبوع — يوم أسبوعي + وقت. */}
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="v2-bg-blue-soft v2-text-blue grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name="BarChart3" className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{t('ملخّص الأسبوع', 'Weekly brief')}</span>
              <span className="block text-xs text-ink-500">{t('يوم ثابت أسبوعيًا', 'A fixed weekly day')}</span>
            </span>
            <ToggleSwitch id="notif-weekly" checked={prefs.weeklyBrief.enabled} disabled={kindsDisabled} onChange={(v) => persist({ ...prefs, weeklyBrief: { ...prefs.weeklyBrief, enabled: v } })} label={t('ملخّص الأسبوع', 'Weekly brief')} />
          </div>
          {prefs.weeklyBrief.enabled && (
            <div className="mt-3 space-y-2.5 border-t border-line pt-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('يوم الأسبوع', 'Weekday')}>
                {(ar ? AR_WEEKDAYS : EN_WEEKDAYS).map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={prefs.weeklyBrief.weekday === i}
                    disabled={kindsDisabled}
                    onClick={() => persist({ ...prefs, weeklyBrief: { ...prefs.weeklyBrief, weekday: i } })}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed',
                      // معطّل: الاختيار يبقى مرئيًا (لا نُخفي التفضيل) لكن بلون رمادي محايد لا أزرق.
                      prefs.weeklyBrief.weekday === i ? (kindsDisabled ? 'bg-line text-ink-500' : 'v2-bg-blue-soft v2-text-blue') : 'bg-beige text-ink-500',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="notif-weekly-time" className="text-xs text-ink-500">{t('الوقت', 'Time')}</label>
                <input
                  id="notif-weekly-time"
                  type="time"
                  value={prefs.weeklyBrief.time}
                  disabled={kindsDisabled}
                  onChange={(e) => persist({ ...prefs, weeklyBrief: { ...prefs.weeklyBrief, time: e.target.value } })}
                  className="rounded-lg border border-line bg-page px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-[color:var(--v2-blue)] disabled:opacity-40"
                />
              </div>
            </div>
          )}
        </div>

        <KindRow
          icon="Pill"
          title={t('المكمّلات والأدوية', 'Supplements & meds')}
          sub={supplementNames.length > 0 ? supplementNames.slice(0, 3).join('، ') : t('لم تُضِف مكمّلات/أدوية بعد', "You haven't added any yet")}
          enabled={prefs.supplements.enabled}
          time={prefs.supplements.time}
          disabled={kindsDisabled}
          onToggle={(v) => persist({ ...prefs, supplements: { ...prefs.supplements, enabled: v } })}
          onTime={(v) => persist({ ...prefs, supplements: { ...prefs.supplements, time: v } })}
          timeLabel={t('الوقت', 'Time')}
        />
      </Group>
    </SubScreen>
  )
}

function TimeField({ id, label, value, disabled, onChange }: { id: string; label: string; value: string; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-ink-500">{label}</label>
      <input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-[color:var(--v2-blue)] disabled:opacity-40"
      />
    </span>
  )
}

function ToggleSwitch({ id, checked, disabled, onChange, label }: { id: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void; label: string }) {
  // معطّل: الموضع (checked) يبقى صادقًا — لا نُخفي التفضيل المحفوظ الحقيقي — لكن اللون
  // يتحوّل رماديًا محايدًا تمامًا (لا أزرق) حتى لا يبدو المفتاح نشِطًا بصريًا وهو خامل
  // فعليًا (المفتاح الرئيسي مطفأ). عند التفعيل يعود اللون فورًا بلا تغيّر في الموضع.
  return (
    <button
      id={id}
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
        disabled ? 'bg-line' : checked ? 'v2-bg-blue-soft' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full transition-all',
          checked ? 'start-0.5' : 'end-0.5',
          disabled ? 'bg-ink-400' : checked ? 'v2-text-blue bg-current' : 'bg-white',
        )}
      />
    </button>
  )
}

function KindRow({
  icon,
  title,
  sub,
  enabled,
  time,
  disabled,
  onToggle,
  onTime,
  timeLabel,
}: {
  icon: string
  title: string
  sub: string
  enabled: boolean
  time: string
  disabled: boolean
  onToggle: (v: boolean) => void
  onTime: (v: string) => void
  timeLabel: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="v2-bg-blue-soft v2-text-blue grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name={icon} className="h-4.5 w-4.5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="block truncate text-xs text-ink-500">{sub}</span>
        </span>
        <ToggleSwitch id={`notif-kind-${icon}`} checked={enabled} disabled={disabled} onChange={onToggle} label={title} />
      </div>
      {enabled && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <label htmlFor={`notif-time-${icon}`} className="text-xs text-ink-500">{timeLabel}</label>
          <input
            id={`notif-time-${icon}`}
            type="time"
            value={time}
            disabled={disabled}
            onChange={(e) => onTime(e.target.value)}
            className="rounded-lg border border-line bg-page px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-[color:var(--v2-blue)] disabled:opacity-40"
          />
        </div>
      )}
    </div>
  )
}

function SubScreen({ title, onBack, lang, children }: { title: string; onBack: () => void; lang: Lang; children: React.ReactNode }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-xl font-black">{title}</h1>
        </div>
        <div className="mt-4 space-y-5">{children}</div>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-500">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
