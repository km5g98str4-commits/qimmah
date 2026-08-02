import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { notificationSettingsCopy } from '@/data/notificationCopy'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import { track } from '@/lib/analytics'
import {
  loadNotificationPrefs,
  notificationPermissionStatus,
  notificationsSupported,
  reconcileNotificationSchedule,
  requestNotificationPermission,
  saveNotificationPrefs,
  type NotificationPermission,
  type NotificationPrefs,
} from '@/lib/notifications'

type PanelStatus = 'idle' | 'checking' | 'saving' | 'saved' | 'denied' | 'unsupported' | 'error'

export function NotificationSettingsPanel({ lang }: { lang: Lang }) {
  const auth = useAuth()
  const ownerId = auth.user?.id ?? null
  const copy = notificationSettingsCopy(lang)
  const supported = notificationsSupported()
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs(ownerId ?? ''))
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [status, setStatus] = useState<PanelStatus>(supported ? 'checking' : 'unsupported')
  const generation = useRef(0)

  useEffect(() => {
    const nextGeneration = generation.current + 1
    generation.current = nextGeneration
    setPrefs(loadNotificationPrefs(ownerId ?? ''))
    if (!supported) {
      setPermission('unsupported')
      setStatus('unsupported')
      return
    }
    setStatus('checking')
    void notificationPermissionStatus().then((next) => {
      if (generation.current !== nextGeneration) return
      setPermission(next)
      setStatus(next === 'denied' && loadNotificationPrefs(ownerId ?? '').masterEnabled ? 'denied' : 'idle')
    })
  }, [ownerId, supported])

  const busy = status === 'checking' || status === 'saving'
  const blocked = !ownerId || auth.recoveryActive || !supported
  const active = prefs.masterEnabled && permission === 'granted' && !auth.recoveryActive

  const persist = async (next: NotificationPrefs, announce = true) => {
    if (!ownerId) return
    const safe = saveNotificationPrefs(ownerId, next)
    setPrefs(safe)
    if (!supported || auth.recoveryActive) return
    setStatus('saving')
    const result = await reconcileNotificationSchedule(ownerId, auth.recoveryActive, lang)
    if (result === 'denied') {
      setPermission('denied')
      setStatus('denied')
    } else if (result === 'error') {
      setStatus('error')
    } else {
      setStatus(announce ? 'saved' : 'idle')
    }
  }

  const toggleMaster = async () => {
    if (busy || blocked || !ownerId) return
    if (active) {
      await persist({ ...prefs, masterEnabled: false })
      return
    }
    setStatus('saving')
    const nextPermission = await requestNotificationPermission()
    setPermission(nextPermission)
    if (nextPermission !== 'granted') {
      setStatus(nextPermission === 'unsupported' ? 'unsupported' : 'denied')
      return
    }
    track('reminder_enabled', { kind: 'training' })
    await persist({ ...prefs, masterEnabled: true })
  }

  const update = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    void persist({ ...prefs, [key]: value })
  }

  const statusMessage = auth.recoveryActive
    ? { kind: 'alert' as const, text: copy.recoveryBlocked }
    : status === 'unsupported'
      ? { kind: 'note' as const, text: copy.unsupported }
      : status === 'denied'
        ? { kind: 'alert' as const, text: copy.denied }
        : status === 'saving'
          ? { kind: 'status' as const, text: copy.saving }
          : status === 'saved'
            ? { kind: 'status' as const, text: copy.saved }
            : status === 'error'
              ? { kind: 'alert' as const, text: copy.error }
              : null

  return (
    <section aria-labelledby="notification-settings-title" className="space-y-4">
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="v2-bg-teal-soft v2-text-teal grid h-10 w-10 shrink-0 place-items-center rounded-xl"><Icon name="Bell" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 id="notification-settings-title" className="text-lg font-black text-ink-900">{copy.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.intro}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
          <label htmlFor="notifications-master" className="min-w-0">
            <span className="block text-sm font-black text-ink-900">{copy.master}</span>
            <span id="notifications-master-hint" className="mt-0.5 block text-xs leading-relaxed text-ink-500">{copy.masterHint}</span>
          </label>
          <Switch id="notifications-master" checked={active} disabled={busy || blocked} describedBy="notifications-master-hint" onChange={() => void toggleMaster()} />
        </div>
      </div>

      {statusMessage && (
        <p
          role={statusMessage.kind === 'alert' ? 'alert' : statusMessage.kind === 'status' ? 'status' : undefined}
          className={statusMessage.kind === 'alert'
            ? 'v2-error-panel flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-bold text-ink-900'
            : 'flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold text-ink-700'}
        >
          <Icon name={statusMessage.kind === 'alert' ? 'AlertCircle' : statusMessage.kind === 'status' ? 'CheckCircle2' : 'Info'} className={statusMessage.kind === 'alert' ? 'v2-error-icon mt-0.5 h-4 w-4 shrink-0' : 'v2-text-teal mt-0.5 h-4 w-4 shrink-0'} />
          <span>{statusMessage.text}</span>
        </p>
      )}

      <fieldset disabled={blocked || busy} className="space-y-3">
        <legend className="sr-only">{copy.title}</legend>
        <ReminderRow
          id="notification-workout"
          icon="Dumbbell"
          title={copy.workout}
          hint={copy.workoutHint}
          checked={prefs.workoutDay.enabled}
          onToggle={(enabled) => update('workoutDay', { ...prefs.workoutDay, enabled })}
        >
          <TimeInput label={copy.workout} value={prefs.workoutDay.time} onChange={(time) => update('workoutDay', { ...prefs.workoutDay, time })} />
        </ReminderRow>
        <ReminderRow
          id="notification-rest"
          icon="Moon"
          title={copy.rest}
          hint={copy.restHint}
          checked={prefs.restDay.enabled}
          onToggle={(enabled) => update('restDay', { ...prefs.restDay, enabled })}
        >
          <TimeInput label={copy.rest} value={prefs.restDay.time} onChange={(time) => update('restDay', { ...prefs.restDay, time })} />
        </ReminderRow>
        <ReminderRow
          id="notification-water"
          icon="Droplets"
          title={copy.water}
          hint={copy.waterHint}
          checked={prefs.water.enabled}
          onToggle={(enabled) => update('water', { ...prefs.water, enabled })}
        >
          <label className="text-xs font-bold text-ink-500">
            <span className="sr-only">{copy.waterHint}</span>
            <select value={prefs.water.cadenceHours} onChange={(event) => update('water', { ...prefs.water, cadenceHours: Number(event.target.value) })} className="rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold text-ink-900">
              {[1, 2, 3, 4, 6].map((hours) => <option key={hours} value={hours}>{copy.everyHours(hours)}</option>)}
            </select>
          </label>
        </ReminderRow>
        <ReminderRow
          id="notification-weekly"
          icon="BarChart3"
          title={copy.weekly}
          hint={copy.weeklyHint}
          checked={prefs.weeklyBrief.enabled}
          onToggle={(enabled) => update('weeklyBrief', { ...prefs.weeklyBrief, enabled })}
        >
          <div className="flex items-center gap-2">
            <label>
              <span className="sr-only">{copy.weekly}</span>
              <select value={prefs.weeklyBrief.weekday} onChange={(event) => update('weeklyBrief', { ...prefs.weeklyBrief, weekday: Number(event.target.value) })} className="rounded-xl border border-line bg-page px-2 py-2 text-xs font-bold text-ink-900">
                {copy.weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
            <TimeInput label={copy.weekly} value={prefs.weeklyBrief.time} onChange={(time) => update('weeklyBrief', { ...prefs.weeklyBrief, time })} />
          </div>
        </ReminderRow>
        <ReminderRow
          id="notification-supplements"
          icon="Pill"
          title={copy.supplements}
          hint={copy.supplementsHint}
          checked={prefs.supplements.enabled}
          onToggle={(enabled) => update('supplements', { ...prefs.supplements, enabled })}
        >
          <TimeInput label={copy.supplements} value={prefs.supplements.time} onChange={(time) => update('supplements', { ...prefs.supplements, time })} />
        </ReminderRow>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-black text-ink-900"><Icon name="Clock" className="v2-text-teal h-4 w-4" />{copy.quietHours}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.quietHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <TimeInput label={copy.from} value={prefs.quietHours.start} visibleLabel onChange={(start) => update('quietHours', { ...prefs.quietHours, start })} />
            <TimeInput label={copy.to} value={prefs.quietHours.end} visibleLabel onChange={(end) => update('quietHours', { ...prefs.quietHours, end })} />
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-ink-400"><Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{copy.scheduleSkipped}</p>
        </div>
      </fieldset>
    </section>
  )
}

function ReminderRow({ id, icon, title, hint, checked, onToggle, children }: { id: string; icon: string; title: string; hint: string; checked: boolean; onToggle: (checked: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name={icon} className="h-4.5 w-4.5" /></span>
        <label htmlFor={id} className="min-w-0 flex-1">
          <span className="block text-sm font-black text-ink-900">{title}</span>
          <span id={`${id}-hint`} className="mt-0.5 block text-xs leading-relaxed text-ink-500">{hint}</span>
        </label>
        <Switch id={id} checked={checked} describedBy={`${id}-hint`} onChange={() => onToggle(!checked)} />
      </div>
      {checked && <div className="mt-3 flex justify-end border-t border-line pt-3">{children}</div>}
    </div>
  )
}

function Switch({ id, checked, disabled = false, describedBy, onChange }: { id: string; checked: boolean; disabled?: boolean; describedBy?: string; onChange: () => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onChange}
      className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-[color:var(--v2-teal)] bg-[color:var(--v2-teal)]' : 'border-line bg-beige'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[inset] motion-reduce:transition-none ${checked ? 'end-0.5' : 'start-0.5'}`} />
    </button>
  )
}

function TimeInput({ label, value, visibleLabel = false, onChange }: { label: string; value: string; visibleLabel?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-bold text-ink-500">
      <span className={visibleLabel ? 'mb-1 block' : 'sr-only'}>{label}</span>
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold tabular-nums text-ink-900 outline-none focus:border-[color:var(--v2-teal)]" />
    </label>
  )
}
