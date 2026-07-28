// واجهة مسح موحّدة scanOnce(): أصلي (AVFoundation عبر BarcodeScanPlugin المحلي) على iOS،
// و zxing على الويب — بنفس العقد Promise<{value,format}|null> مع تمرير الفلاش للمسارين.
//
// لماذا AVFoundation وليس @capacitor-mlkit/barcode-scanning؟ مشروع iOS هنا يُدار عبر SPM
// (CapApp-SPM)، وحزمة MLKit تُوزَّع عبر CocoaPods فقط (podspec يعتمد GoogleMLKit/BarcodeScanning
// وجوجل لا تنشر MLKit عبر SPM) — التحقق موثّق في docs/data/NATIVE-BARCODE.md.
// AVCaptureMetadataOutput أولي الطرف، صفر اعتماديات، ويدعم EAN-13/8 وUPC-A/E.

import { Capacitor, registerPlugin } from '@capacitor/core'
import { beginScanAttempt } from './scanDiagnostics'
import { startWebZxingScan, classifyCameraError } from './webZxingEngine'

export interface BarcodeHit {
  value: string
  /** ean_13 | ean_8 | upc_a | upc_e — ملاحظة iOS: يُبلغ UPC-A كـ ean_13 بصفر بادئ. */
  format: string
}

/** نتيجة المحاولة التفصيلية — القيمة المُرجعة من scanOnce تبقى hit|null دائمًا. */
export type ScanOutcomeStatus = 'detected' | 'cancelled' | 'permission-denied' | 'no-camera' | 'error'

/** تسميات واجهة المسح الأصلي — تأتي من قاموس ثنائي اللغة عند المُستدعي، لا نصوص مضمّنة هنا. */
export interface BarcodeScanLabels {
  cancel: string
  torch: string
  hint: string
}

interface NativeScanResult {
  hit: { value: string; format: string } | null
  status: 'detected' | 'cancelled' | 'permission-denied' | 'no-camera' | 'error'
  resolution?: { width: number; height: number }
  /** بيان وصفي من الإضافة: هل شُغّل الفلاش خلال المحاولة؟ (P14 — للتشخيص). */
  torchUsed?: boolean
  message?: string
}

export interface BarcodeScanPluginApi {
  isSupported(): Promise<{ supported: boolean }>
  scanOnce(options: BarcodeScanLabels): Promise<NativeScanResult>
  setTorch(options: { on: boolean }): Promise<{ on: boolean }>
  cancelScan(): Promise<void>
}

const BarcodeScan = registerPlugin<BarcodeScanPluginApi>('BarcodeScan')

/** هل المنصة الحالية تملك المسار الأصلي؟ (iOS داخل Capacitor فقط). */
export function isNativeScanPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

/** مقبض تحكّم موحّد أثناء مسح جارٍ — فلاش وإلغاء، لكلا المسارين. */
export interface ScanControls {
  /** يعيد true إذا طُبّق الفلاش فعليًا. */
  setTorch(on: boolean): Promise<boolean>
  cancel(): void
}

export interface ScanOnceOptions {
  labels: BarcodeScanLabels
  /** سطح المعاينة لمسار الويب — إلزامي خارج iOS الأصلي (المسار الأصلي يعرض واجهته بنفسه). */
  video?: HTMLVideoElement
  /** يستلم مقبض التحكّم فور بدء المسح. */
  onControls?(controls: ScanControls): void
  /** الحالة التفصيلية للمحاولة — لعرض رسالة دقيقة لكل سبب في الواجهة. */
  onOutcome?(status: ScanOutcomeStatus): void
  /** حقن للاختبار فقط. */
  plugin?: BarcodeScanPluginApi
  /** حقن للاختبار فقط — يفرض المسار الأصلي/الويب بغضّ النظر عن المنصة. */
  forceNative?: boolean
}

/**
 * مسح مرة واحدة: يعرض الماسح (أصلي على iOS، فيديو الويب المعطى خارجه) ويعيد أول باركود
 * مقروء أو null (إلغاء/رفض صلاحية/عطل — الفروق عبر onOutcome). لا يرمي أبدًا.
 */
export async function scanOnce(options: ScanOnceOptions): Promise<BarcodeHit | null> {
  const useNative = options.forceNative ?? isNativeScanPlatform()
  return useNative ? scanOnceNative(options) : scanOnceWeb(options)
}

async function scanOnceNative(options: ScanOnceOptions): Promise<BarcodeHit | null> {
  const plugin = options.plugin ?? BarcodeScan
  const diag = beginScanAttempt('native-avfoundation')
  options.onControls?.({
    setTorch: async (on) => {
      try {
        const result = await plugin.setTorch({ on })
        const applied = result.on === on
        if (applied) diag.recordTorch(on)
        return applied
      } catch {
        return false
      }
    },
    cancel: () => {
      void plugin.cancelScan().catch(() => undefined)
    },
  })
  try {
    const result = await plugin.scanOnce(options.labels)
    if (result.resolution) diag.recordResolution(result.resolution.width, result.resolution.height)
    if (result.torchUsed === true) diag.recordTorch(true)
    if (result.message) diag.note(result.message)
    if (result.status === 'detected' && result.hit) {
      diag.end('detected', result.hit.format)
      options.onOutcome?.('detected')
      return { value: result.hit.value, format: result.hit.format }
    }
    const status: ScanOutcomeStatus =
      result.status === 'cancelled' || result.status === 'permission-denied' || result.status === 'no-camera'
        ? result.status
        : 'error'
    // P14: تُسجَّل الحالة الدقيقة كما هي — رفض الصلاحية لم يبقَ مخبوءًا تحت 'error'.
    diag.end(status)
    options.onOutcome?.(status)
    return null
  } catch (err) {
    diag.note(err instanceof Error ? err.message : 'native-scan-failed')
    diag.end('error')
    options.onOutcome?.('error')
    return null
  }
}

function scanOnceWeb(options: ScanOnceOptions): Promise<BarcodeHit | null> {
  const video = options.video
  if (!video) {
    // عقد Codex: مسار الويب يتطلب عنصر فيديو ظاهرًا يوجّه المستخدم الكاميرا من خلاله.
    options.onOutcome?.('error')
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let settled = false
    const controller = startWebZxingScan(video, {
      onDetected: (hit) => {
        if (settled) return
        settled = true
        options.onOutcome?.('detected')
        resolve(hit)
      },
      onError: (err) => {
        if (settled) return
        settled = true
        const failure = classifyCameraError(err)
        options.onOutcome?.(failure === 'start-failed' ? 'error' : failure)
        resolve(null)
      },
    })
    options.onControls?.({
      setTorch: (on) => controller.setTorch(on),
      cancel: () => {
        if (settled) return
        settled = true
        controller.stop()
        options.onOutcome?.('cancelled')
        resolve(null)
      },
    })
  })
}
