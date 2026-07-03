import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'

interface PhotoCaptureProps {
  label: string
  value?: string
  onCapture: (dataUrl: string) => void
  onClear: () => void
  takePhotoLabel: string
  choosePhotoLabel: string
  retakeLabel: string
  removeLabel: string
  cancelLabel: string
  deniedHint: string
}

type Mode = 'idle' | 'camera' | 'denied'

/**
 * التقاط صورة عبر كاميرا حيّة (getUserMedia + canvas) مع تراجع سلس لاختيار صورة من الاستديو
 * عند رفض صلاحية الكاميرا أو عدم توفّرها — لا يوقف تدفّق الإضافة أبدًا.
 * مكوّن مستقل عن كاميرا ماسح الباركود (لا يشاركها الكود).
 */
export function PhotoCapture({
  label,
  value,
  onCapture,
  onClear,
  takePhotoLabel,
  choosePhotoLabel,
  retakeLabel,
  removeLabel,
  cancelLabel,
  deniedHint,
}: PhotoCaptureProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => stopStream, [])

  const openCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMode('denied')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setMode('camera')
      // الفيديو يُركَّب بعد إعادة الرسم — نربط المصدر في التالي.
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
    } catch {
      setMode('denied')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.85))
    stopStream()
    setMode('idle')
  }

  const cancelCamera = () => {
    stopStream()
    setMode('idle')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onCapture(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>

      {value ? (
        <div className="mt-2 flex items-center gap-3">
          <img src={value} alt={label} className="h-20 w-20 rounded-xl border border-line object-cover" />
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={openCamera} className="btn-ghost px-3 py-1.5 text-xs">
              <Icon name="Camera" className="h-3.5 w-3.5" />
              {retakeLabel}
            </button>
            <button type="button" onClick={onClear} className="btn-ghost px-3 py-1.5 text-xs text-danger">
              <Icon name="Trash2" className="h-3.5 w-3.5" />
              {removeLabel}
            </button>
          </div>
        </div>
      ) : mode === 'camera' ? (
        <div className="mt-2">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={capture} className="btn-primary px-4 py-2 text-xs">
              <Icon name="Camera" className="h-4 w-4" />
              {takePhotoLabel}
            </button>
            <button type="button" onClick={cancelCamera} aria-label={cancelLabel} className="btn-ghost px-4 py-2 text-xs">
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          {mode === 'denied' && (
            <p className="mb-2 flex items-start gap-1.5 text-[11px] text-ink-400">
              <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              {deniedHint}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCamera} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="Camera" className="h-4 w-4" />
              {takePhotoLabel}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="FileText" className="h-4 w-4" />
              {choosePhotoLabel}
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
