import { useEffect, useState } from 'react'

/**
 * Real connectivity signal for the offline surface (standard screen 75).
 * Reads `navigator.onLine` and tracks the browser's online/offline events.
 * Offline-first: this only drives a non-blocking banner — the app keeps working
 * and syncs when the connection returns (see syncService).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    // Re-read on mount in case the state changed before listeners attached.
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}
