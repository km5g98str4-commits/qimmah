import { useEffect, useRef, useState } from 'react'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Icon } from '@/components/Icon'

interface BarcodeCameraProps {
  onDetected: (barcode: string) => void
  /** يُستدعى عند رفض صلاحية الكاميرا أو عدم توفّرها. */
  onError: () => void
  /** تسمية زر الفلاش (aria-label) — تأتي من قاموس الأب لدعم العربية/الإنجليزية. */
  torchLabel: string
}

// صيغ باركود منتجات التجزئة الشائعة فقط — تسريع القراءة وتقليل الأخطاء بدل مسح كل الصيغ (QR/PDF417...).
const RETAIL_FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]

function buildHints(): Map<DecodeHintType, unknown> {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
}

// خاصية "torch" من MediaStream Image Capture API — تجريبية وغير مُدرجة بعد في أنواع TypeScript الرسمية.
interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean
}

/** يتحقق إن كان المسار يُعلن دعم الفلاش عبر قدراته (بعض المتصفحات/الأجهزة لا تدعمه). */
function trackSupportsTorch(track: MediaStreamTrack): boolean {
  try {
    return 'torch' in (track.getCapabilities?.() ?? {})
  } catch {
    return false
  }
}

/**
 * فيديو كاميرا حيّ يمسح الباركود عبر @zxing/browser — يستهدف صيغ التجزئة الشائعة فقط،
 * ويعرض زر فلاش حين يُعلن المسار دعمه فعليًا (Image Capture API).
 * يبدأ المسح عند الوصل (يتطلب لمسة مستخدم قبله من المكوّن الأب — قيد Safari/iOS).
 */
export function BarcodeCamera({ onDetected, onError, torchLabel }: BarcodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const [ready, setReady] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(buildHints())
    let stopped = false
    let controls: { stop: () => void } | undefined

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    reader
      .decodeFromConstraints(constraints, videoRef.current ?? undefined, (result, _err, ctrl) => {
        controls = ctrl
        if (stopped) return
        if (!ready) {
          setReady(true)
          const stream = videoRef.current?.srcObject
          const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined
          trackRef.current = track ?? null
          setTorchSupported(track ? trackSupportsTorch(track) : false)
        }
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
      trackRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      const constraintSet: TorchConstraintSet = { torch: next }
      await track.applyConstraints({ advanced: [constraintSet] })
      setTorchOn(next)
    } catch {
      // بعض الأجهزة تُعلن الدعم في getCapabilities لكن ترفض applyConstraints فعليًا — نتجاهل بصمت.
    }
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
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
