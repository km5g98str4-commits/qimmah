import { useState } from 'react'
import type { Lang } from '@/lib/appPreferences'
import { loadPreferences, setHapticsEnabled } from '@/lib/appPreferences'
import { connectHealthKit, isHealthKitEnabled, isHealthKitPlatform, type HealthKitPermission } from '@/lib/healthKit'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'
import { Icon } from './Icon'

export function NativeSettingsPanel({ lang }: { lang: Lang }) {
  const copy = NATIVE_SETTINGS_COPY[lang]
  const nativeHealth = isHealthKitPlatform()
  const [connected, setConnected] = useState(isHealthKitEnabled)
  const [permission, setPermission] = useState<HealthKitPermission>('not-determined')
  const [busy, setBusy] = useState(false)
  const [haptics, setHaptics] = useState(() => loadPreferences().hapticsEnabled)

  const connect = async () => {
    setBusy(true)
    try {
      const result = await connectHealthKit()
      setPermission(result.permission)
      setConnected(result.permission === 'authorized')
    } catch {
      setPermission('denied')
      setConnected(false)
    } finally {
      setBusy(false)
    }
  }

  const toggleHaptics = () => {
    const next = !haptics
    setHaptics(next)
    setHapticsEnabled(next)
  }

  return (
    <div className="space-y-4">
      {nativeHealth && (
        <div>
          <p className="text-sm font-bold text-ink-900">{copy.healthTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.healthBody}</p>
          <button type="button" onClick={() => void connect()} disabled={busy} className="btn-ghost mt-3 px-4 py-2.5 text-sm disabled:opacity-50">
            <Icon name="Footprints" className="h-4 w-4" />
            {connected ? copy.refresh : copy.connect}
          </button>
          {permission !== 'not-determined' && (
            <p role="status" className="mt-2 text-xs text-ink-500">
              {permission === 'authorized' ? copy.connected : permission === 'unavailable' ? copy.unavailable : copy.denied}
            </p>
          )}
        </div>
      )}
      <div className={nativeHealth ? 'border-t border-line pt-4' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-900">{copy.hapticsTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.hapticsBody}</p>
          </div>
          <button type="button" role="switch" aria-checked={haptics} aria-label={copy.hapticsToggle} onClick={toggleHaptics} className={`relative h-6 w-11 shrink-0 rounded-full ${haptics ? 'bg-primary' : 'bg-line'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${haptics ? 'start-0.5' : 'end-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
