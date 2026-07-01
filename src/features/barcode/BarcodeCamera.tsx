import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface BarcodeCameraProps {
  onDetected: (barcode: string) => void
  /** يُستدعى عند رفض صلاحية الكاميرا أو عدم توفّرها. */
  onError: () => void
}

/**
 * فيديو كاميرا حيّ يمسح الباركود عبر @zxing/browser.
 * يبدأ المسح عند الوصل (يتطلب لمسة مستخدم قبله من المكوّن الأب — قيد Safari/iOS).
 */
export function BarcodeCamera({ onDetected, onError }: BarcodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let stopped = false
    let controls: { stop: () => void } | undefined

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, ctrl) => {
        controls = ctrl
        if (stopped) return
        if (!ready) setReady(true)
        if (result) {
          stopped = true
          ctrl.stop()
          onDetected(result.getText())
        }
      })
      .catch(() => {
        if (!stopped) onError()
      })

    return () => {
      stopped = true
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
    </div>
  )
}
