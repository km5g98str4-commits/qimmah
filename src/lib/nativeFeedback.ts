import { Capacitor } from '@capacitor/core'
import { loadPreferences } from './appPreferences'

export type HapticMoment = 'set' | 'pr' | 'rest'

export function shouldPlayHaptic(isNative: boolean, enabled: boolean, reducedMotion: boolean): boolean {
  return isNative && enabled && !reducedMotion
}

export async function playHaptic(moment: HapticMoment): Promise<void> {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!shouldPlayHaptic(Capacitor.isNativePlatform(), loadPreferences().hapticsEnabled, Boolean(reducedMotion))) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (moment === 'pr') await Haptics.notification({ type: NotificationType.Success })
    else await Haptics.impact({ style: moment === 'rest' ? ImpactStyle.Medium : ImpactStyle.Light })
  } catch {
    // Native feedback is optional and must never interrupt logging a workout.
  }
}
