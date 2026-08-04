// محرّك مسح الويب (zxing) — أفضل جهد داخل WKWebView/المتصفح: دقة أعلى (1080p ideal)،
// تركيز مستمر وزوم عبر القيود المتقدمة، وفكّ ROI مقصوص عبر canvas بدل فكّ الإطار كاملًا.
// ضمانة خصوصية: كل الفكّ محلي — لا يغادر أي إطار كاميرا الجهاز، والقياسات في
// scanDiagnostics بيانات وصفية فقط (test:barcode يفرض ذلك بفحص grep).

import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import type { Result } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { beginScanAttempt } from './scanDiagnostics'

/** سبب فشل تشغيل الكاميرا — يميّز رفض الصلاحية عن غياب الكاميرا عن أي عطل آخر. */
export type CameraFailure = 'permission-denied' | 'no-camera' | 'start-failed'

/** يصنّف خطأ getUserMedia/zxing إلى سبب واجهة — حسب اسم DOMException القياسي. */
export function classifyCameraError(err: unknown): CameraFailure {
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

export interface WebScanHit {
  value: string
  /** ean_13 | ean_8 | upc_a | upc_e */
  format: string
}

export interface WebScanCallbacks {
  /** بعد بدء البث بنجاح — أول فرصة لعرض زر الفلاش. */
  onReady?(info: { torchSupported: boolean }): void
  onDetected(hit: WebScanHit): void
  onError(error: unknown): void
}

export interface WebScanController {
  /** إيقاف آمن وقابل للتكرار — يوقف البث ويغلق سجل التشخيص كـ cancelled. */
  stop(): void
  /** يعيد true إذا طُبّق فعليًا (بعض الأجهزة تعلن الدعم ثم ترفض التطبيق). */
  setTorch(on: boolean): Promise<boolean>
  isTorchSupported(): boolean
}

/** منطقة الاهتمام المركزية المقصوصة قبل الفكّ — نسب من الإطار الكامل (تحاذي شبكة التصويب تقريبًا). */
export const WEB_SCAN_ROI = { widthFraction: 0.9, heightFraction: 0.55 }
/** كل كم تكرارًا نفكّ الإطار كاملًا بدل الـ ROI — شبكة أمان لباركود خارج منطقة التصويب. */
export const FULL_FRAME_EVERY_N = 4
/** فاصل حلقة الفكّ (مللي ثانية) — يوازن سرعة الالتقاط مع حمل CPU داخل WKWebView. */
export const DECODE_INTERVAL_MS = 90
/** سقف عرض لوحة الفكّ بالبكسل — فوقه نُصغّر بالتناسب حفاظًا على الأداء دون قتل الحدّة. */
export const MAX_DECODE_WIDTH = 1440

// صيغ باركود منتجات التجزئة الشائعة فقط — تسريع القراءة وتقليل الأخطاء بدل مسح كل الصيغ (QR/PDF417...).
const RETAIL_FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]

const FORMAT_NAMES: Partial<Record<BarcodeFormat, string>> = {
  [BarcodeFormat.EAN_13]: 'ean_13',
  [BarcodeFormat.EAN_8]: 'ean_8',
  [BarcodeFormat.UPC_A]: 'upc_a',
  [BarcodeFormat.UPC_E]: 'upc_e',
}

function buildHints(): Map<DecodeHintType, unknown> {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
}

// قدرات/قيود متقدمة (torch/focusMode/zoom) — تجريبية وغير مُدرجة بعد في أنواع TypeScript القياسية.
interface ExtendedCapabilities extends MediaTrackCapabilities {
  torch?: boolean
  focusMode?: string[]
  zoom?: { min?: number; max?: number; step?: number }
}
interface ExtendedConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean
  focusMode?: string
  zoom?: number
}

function errName(err: unknown): string {
  if (err instanceof DOMException) return err.name
  if (err instanceof Error) return err.name || 'Error'
  return 'unknown-error'
}

/**
 * يبدأ مسحًا حيًّا على عنصر الفيديو المعطى ويعيد مقبض تحكّم فورًا (البدء غير متزامن داخليًا).
 * الحلقة: قصّ ROI مركزي → canvas → فكّ zxing؛ وكل FULL_FRAME_EVERY_N تكرارًا يُفكّ الإطار كاملًا.
 */
export function startWebZxingScan(video: HTMLVideoElement, callbacks: WebScanCallbacks): WebScanController {
  const reader = new BrowserMultiFormatReader(buildHints())
  const diag = beginScanAttempt('zxing-web')
  let stopped = false
  let stream: MediaStream | null = null
  let track: MediaStreamTrack | null = null
  let torchSupported = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let iteration = 0
  let roiRecorded = false
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null

  const releaseStream = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    track = null
  }

  const finish = (
    outcome: 'detected' | 'cancelled' | 'permission-denied' | 'no-camera' | 'error',
    format?: string | null,
  ) => {
    if (stopped) return
    stopped = true
    diag.end(outcome, format ?? null)
    releaseStream()
  }

  function decodeFrame(fullFrame: boolean): Result | null {
    if (!canvas) return null
    const vw = video.videoWidth
    const vh = video.videoHeight
    let sx = 0
    let sy = 0
    let sw = vw
    let sh = vh
    if (!fullFrame) {
      sw = Math.round(vw * WEB_SCAN_ROI.widthFraction)
      sh = Math.round(vh * WEB_SCAN_ROI.heightFraction)
      sx = Math.round((vw - sw) / 2)
      sy = Math.round((vh - sh) / 2)
      if (!roiRecorded) {
        roiRecorded = true
        diag.recordRoi(WEB_SCAN_ROI.widthFraction, WEB_SCAN_ROI.heightFraction)
      }
    }
    if (sw <= 0 || sh <= 0) return null
    const scale = sw > MAX_DECODE_WIDTH ? MAX_DECODE_WIDTH / sw : 1
    canvas.width = Math.max(1, Math.round(sw * scale))
    canvas.height = Math.max(1, Math.round(sh * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    diag.recordFrame()
    try {
      return reader.decodeFromCanvas(canvas)
    } catch {
      // NotFoundException لكل إطار بلا باركود — طبيعي، نواصل الحلقة.
      return null
    }
  }

  const scheduleDecode = () => {
    if (stopped) return
    timer = setTimeout(decodeTick, DECODE_INTERVAL_MS)
  }

  function decodeTick() {
    if (stopped) return
    iteration += 1
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const result = decodeFrame(iteration % FULL_FRAME_EVERY_N === 0)
      if (result) {
        const rawFormat = result.getBarcodeFormat()
        const format = FORMAT_NAMES[rawFormat] ?? String(rawFormat)
        finish('detected', format)
        callbacks.onDetected({ value: result.getText(), format })
        return
      }
    }
    scheduleDecode()
  }

  async function begin() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      if (stopped) {
        releaseStream()
        return
      }
      track = stream.getVideoTracks()[0] ?? null
      video.srcObject = stream
      // iOS يتطلب playsInline+muted على العنصر (مضبوطة في المكوّن) — فشل play يُلتقط أدناه.
      await video.play()

      const settings = track?.getSettings?.() ?? {}
      if (typeof settings.width === 'number' && typeof settings.height === 'number') {
        diag.recordResolution(settings.width, settings.height)
      }

      const caps = (track?.getCapabilities?.() ?? {}) as ExtendedCapabilities
      torchSupported = 'torch' in caps
      const advanced: ExtendedConstraintSet[] = []
      if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        advanced.push({ focusMode: 'continuous' })
      }
      const maxZoom = typeof caps.zoom?.max === 'number' ? caps.zoom.max : 0
      if (maxZoom > 1) {
        advanced.push({ zoom: Math.min(1.5, maxZoom) })
      }
      if (advanced.length > 0 && track) {
        try {
          await track.applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] })
          diag.note(
            'advanced:' + advanced.map((c) => (c.focusMode ? `focus:${c.focusMode}` : `zoom:${c.zoom}`)).join(','),
          )
        } catch {
          // بعض الأجهزة تُعلن القدرة ثم ترفض التطبيق — نواصل بلا قيود متقدمة.
          diag.note('advanced-rejected')
        }
      }

      if (stopped) return
      callbacks.onReady?.({ torchSupported })
      scheduleDecode()
    } catch (err) {
      if (stopped) return
      diag.note(errName(err))
      // P14: تُسجَّل الحالة الدقيقة في التشخيص — رفض الصلاحية/غياب الكاميرا لم يبقَ
      // مخبوءًا تحت 'error' فيتعذّر تمييزه عن عطل حقيقي في تقرير الجهاز.
      const failure = classifyCameraError(err)
      finish(failure === 'start-failed' ? 'error' : failure)
      callbacks.onError(err)
    }
  }

  void begin()

  return {
    stop() {
      finish('cancelled')
    },
    async setTorch(on: boolean): Promise<boolean> {
      if (!track || !torchSupported) return false
      try {
        const constraint: ExtendedConstraintSet = { torch: on }
        await track.applyConstraints({ advanced: [constraint as MediaTrackConstraintSet] })
        diag.recordTorch(on)
        return true
      } catch {
        return false
      }
    },
    isTorchSupported() {
      return torchSupported
    },
  }
}
