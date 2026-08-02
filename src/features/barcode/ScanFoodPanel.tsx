import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { nutritionScreenStrings, type NutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import type { FoodItem } from '@/data/foodItems'
import { lookupBarcode } from './openFoodFacts'
import { BarcodeCamera, type CameraFailure } from './BarcodeCamera'
import { track } from '@/lib/analytics'

interface ScanFoodPanelProps {
  lang: Lang
  /** يُستدعى بمنتج جاهز للتسجيل بعد إيجاده عبر Open Food Facts. */
  onResolved: (item: FoodItem) => void
  /** يُستدعى عند اختيار المستخدم الإضافة اليدوية (منتج غير موجود أو تعذّر الوصول للكاميرا). */
  onManualFallback: () => void
  onClose: () => void
}

type Status =
  | 'scanning'
  | 'looking-up'
  | 'not-found'
  | 'network-error'
  | 'permission-denied'
  | 'no-camera'
  | 'unsupported'
  | 'error'

/** حالات التعذّر التي تُعرض بلوحة موحّدة (رسالة + إعادة محاولة اختيارية + مسار يدوي دائم). */
type FailureStatus = Exclude<Status, 'scanning' | 'looking-up' | 'not-found'>

interface FailureView {
  icon: string
  title?: string
  message: string
  /** rescan = العودة للكاميرا، lookup = إعادة البحث بآخر باركود مقروء. */
  retry?: 'rescan' | 'lookup'
}

/** خصائص عرض كل حالة تعذّر — الرسائل من القاموس ثنائي اللغة. */
function failureView(status: FailureStatus, d: NutritionScreenStrings): FailureView {
  switch (status) {
    case 'permission-denied':
      return { icon: 'AlertTriangle', message: d.scanPermissionDenied, retry: 'rescan' }
    case 'no-camera':
      return { icon: 'Camera', message: d.scanNoCamera }
    case 'unsupported':
      return { icon: 'CircleSlash', message: d.scanUnsupported }
    case 'network-error':
      return { icon: 'CircleSlash', title: d.scanNetworkErrorTitle, message: d.scanNetworkErrorHint, retry: 'lookup' }
    case 'error':
      return { icon: 'AlertTriangle', message: d.scanErrorGeneric, retry: 'rescan' }
  }
}

function supportsCamera(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/** لوحة مسح الباركود — كاميرا حيّة → بحث Open Food Facts → نتيجة أو مسار يدوي صادق. */
export function ScanFoodPanel({ lang, onResolved, onManualFallback, onClose }: ScanFoodPanelProps) {
  const d = nutritionScreenStrings[lang]
  const [status, setStatus] = useState<Status>(() => (supportsCamera() ? 'scanning' : 'unsupported'))
  /** آخر باركود مقروء — لإعادة البحث عند فشل الاتصال دون إعادة المسح. */
  const lastBarcodeRef = useRef('')

  const handleCameraError = (failure: CameraFailure) => {
    setStatus(failure === 'start-failed' ? 'error' : failure)
  }

  const handleDetected = async (barcode: string) => {
    lastBarcodeRef.current = barcode
    setStatus('looking-up')
    try {
      const result = await lookupBarcode(barcode)
      // نتيجة المسح — الحالة فقط (found/not-found/network-error)، بلا قيمة الباركود أو المنتج.
      track('barcode_scan_result', { result: result.status })
      if (result.status !== 'found') {
        setStatus(result.status === 'network-error' ? 'network-error' : 'not-found')
        return
      }
      const { product } = result
      const item: FoodItem = {
        id: `off:${barcode}`,
        nameAr: product.name,
        nameEn: product.name,
        category: 'منتج ممسوح بالباركود',
        servingLabelAr: product.servingSize ? `100غ (${product.servingSize})` : '100غ',
        servingGrams: 100,
        calories: Math.round(product.caloriesPer100g),
        protein: Math.round(product.proteinPer100g),
        carbs: Math.round(product.carbsPer100g),
        fat: Math.round(product.fatPer100g),
        notesAr: product.brands,
      }
      onResolved(item)
    } catch {
      // أي استثناء غير متوقّع أثناء البحث/التحويل → حالة خطأ معروضة، لا شاشة بيضاء.
      setStatus('error')
    }
  }

  const retryActions: Record<'rescan' | 'lookup', () => void> = {
    rescan: () => setStatus('scanning'),
    // إعادة البحث بآخر باركود إن وُجد؛ وإلا نعود للكاميرا.
    lookup: () => (lastBarcodeRef.current ? void handleDetected(lastBarcodeRef.current) : setStatus('scanning')),
  }

  const failure =
    status !== 'scanning' && status !== 'looking-up' && status !== 'not-found' ? failureView(status, d) : null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">{d.scanTitle}</h3>
          <button type="button" onClick={onClose} aria-label={d.close} className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 hover:bg-beige">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {status === 'scanning' && (
            <>
              <BarcodeCamera
                onDetected={handleDetected}
                onError={handleCameraError}
                torchLabel={d.scanTorch}
              />
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-500">
                <Icon name="ScanLine" className="h-4 w-4 text-ink-400" />
                {d.scanHint}
              </p>
            </>
          )}

          {status === 'looking-up' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Icon name="RefreshCw" className="h-6 w-6 animate-spin" style={{ color: '#12A594' }} />
              <p className="text-sm text-ink-500">{d.scanLookingUp}</p>
            </div>
          )}

          {status === 'not-found' && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Icon name="CircleSlash" className="h-8 w-8 text-ink-400" />
              <p className="text-sm font-bold text-ink-900">{d.scanNotFoundTitle}</p>
              <p className="max-w-xs text-xs text-ink-400">{d.scanNotFoundHint}</p>
              <div className="mt-3 flex w-full flex-col gap-2">
                <button type="button" onClick={() => setStatus('scanning')} className="btn-ghost justify-center py-2 text-xs">
                  <Icon name="ScanLine" className="h-4 w-4" />
                  {d.scanTryAgain}
                </button>
                <button type="button" onClick={onManualFallback} className="btn-primary justify-center py-2 text-xs">
                  <Icon name="Plus" className="h-4 w-4" />
                  {d.scanAddManually}
                </button>
              </div>
            </div>
          )}

          {failure && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Icon name={failure.icon} className="h-8 w-8 text-ink-400" />
              {failure.title && <p className="text-sm font-bold text-ink-900">{failure.title}</p>}
              <p className="max-w-xs text-xs text-ink-500">{failure.message}</p>
              <div className="mt-3 flex w-full flex-col gap-2">
                {failure.retry && (
                  <button type="button" onClick={retryActions[failure.retry]} className="btn-ghost justify-center py-2 text-xs">
                    <Icon name="RefreshCw" className="h-4 w-4" />
                    {d.scanRetry}
                  </button>
                )}
                <button type="button" onClick={onManualFallback} className="btn-primary justify-center py-2 text-xs">
                  <Icon name="Plus" className="h-4 w-4" />
                  {d.scanAddManually}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="flex items-start gap-2 border-t border-line p-3 text-[10px] text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {d.scanAttribution}
        </p>
      </div>
    </div>
  )
}
