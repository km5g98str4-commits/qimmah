import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import {
  startWebZxingScan,
  classifyCameraError,
  type WebScanController,
  type CameraFailure,
} from './webZxingEngine'

// يُعاد تصديره للحفاظ على عقد الاستيراد القائم في ScanFoodPanel وغيره.
export type { CameraFailure }

interface BarcodeCameraProps {
  onDetected: (barcode: string) => void
  /** يُستدعى عند تعذّر بدء المسح، مع سبب مصنَّف كي يعرض الأب رسالة دقيقة لكل حالة. */
  onError: (failure: CameraFailure) => void
  /** تسمية زر الفلاش (aria-label) — تأتي من قاموس الأب لدعم العربية/الإنجليزية. */
  torchLabel: string
}

/**
 * فيديو كاميرا حيّ يمسح الباركود عبر محرّك zxing المحسّن (webZxingEngine):
 * دقة 1080p، تركيز مستمر/زوم حين يتاحان، وفكّ ROI مقصوص عبر canvas.
 * يعرض زر فلاش حين يُعلن المسار دعمه فعليًا.
 * يبدأ المسح عند الوصل (يتطلب لمسة مستخدم قبله من المكوّن الأب — قيد Safari/iOS).
 */
export function BarcodeCamera({ onDetected, onError, torchLabel }: BarcodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controllerRef = useRef<WebScanController | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      onError('start-failed')
      return
    }
    let disposed = false
    const controller = startWebZxingScan(video, {
      onReady: ({ torchSupported: supported }) => {
        if (!disposed) setTorchSupported(supported)
      },
      onDetected: (hit) => {
        if (!disposed) onDetected(hit.value)
      },
      onError: (err) => {
        if (!disposed) onError(classifyCameraError(err))
      },
    })
    controllerRef.current = controller
    return () => {
      disposed = true
      controller.stop()
      controllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTorch = async () => {
    const controller = controllerRef.current
    if (!controller) return
    const next = !torchOn
    // بعض الأجهزة تُعلن الدعم ثم ترفض التطبيق فعليًا — لا نغيّر الحالة إلا عند نجاح التطبيق.
    if (await controller.setTorch(next)) setTorchOn(next)
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {/* v2.1 reticle — dimmed surround + teal scan frame (visual only; decode untouched). */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.28)]" />
      <div
        className="pointer-events-none absolute inset-8 rounded-2xl border-2"
        style={{ borderColor: '#12A594', boxShadow: '0 0 0 3px rgba(18,165,148,0.18)' }}
      />
      {torchSupported && (
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={torchLabel}
          aria-pressed={torchOn}
          className={
            'absolute bottom-3 end-3 grid h-11 w-11 place-items-center rounded-full transition-colors ' +
            (torchOn ? 'bg-gold-400 text-ink-900' : 'bg-black/50 text-white hover:bg-black/70')
          }
        >
          <Icon name={torchOn ? 'Flashlight' : 'FlashlightOff'} className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
