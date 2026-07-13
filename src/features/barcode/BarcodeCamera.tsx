import { useEffect, useRef, useState } from 'react'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Icon } from '@/components/Icon'

/** سبب فشل تشغيل الكاميرا — يميّز رفض الصلاحية عن غياب الكاميرا عن أي عطل آخر. */
export type CameraFailure = 'permission-denied' | 'no-camera' | 'start-failed'

interface BarcodeCameraProps {
  onDetected: (barcode: string) => void
  /** يُستدعى عند تعذّر بدء المسح، مع سبب مصنَّف كي يعرض الأب رسالة دقيقة لكل حالة. */
  onError: (failure: CameraFailure) => void
  /** تسمية زر الفلاش (aria-label) — تأتي من قاموس الأب لدعم العربية/الإنجليزية. */
  torchLabel: string
}

/** يصنّف خطأ getUserMedia/zxing إلى سبب واجهة — حسب اسم DOMException القياسي. */
function classifyCameraError(err: unknown): CameraFailure {
  const name =
    err instanceof DOMException
      ? err.name
      : err && typeof err === 'object' && 'name' in err
        ? String((err as { name: unknown }).name)
        : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'permission-denied'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'no-camera'
  }
  return 'start-failed'
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
    let stopped = false
    let controls: { stop: () => void } | undefined

    // كل مسار البدء داخل try — أي استثناء متزامن (تهيئة القارئ/القيود) يتحوّل لحالة خطأ
    // معروضة في الواجهة بدل شاشة بيضاء.
    try {
      const reader = new BrowserMultiFormatReader(buildHints())

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
        .catch((err: unknown) => {
          if (!stopped) onError(classifyCameraError(err))
        })
    } catch (err) {
      if (!stopped) onError(classifyCameraError(err))
    }

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
