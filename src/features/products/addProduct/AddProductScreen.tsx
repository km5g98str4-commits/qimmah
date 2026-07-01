import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { NUM_LIMITS, parseSafeNumber, sanitizeNumericInput } from '@/lib/validation'
import { addProductStrings } from './strings'
import { PhotoCapture } from './PhotoCapture'
import { extractNutritionFromImage } from './ocr'
import { upsertProduct } from './productStore'
import type { ProductPer, StoredProduct } from './types'

interface AddProductScreenProps {
  lang: Lang
  /** باركود جاء من مسح لم يجد نتيجة — يُعبَّأ مسبقًا وقابل للتعديل. */
  barcode?: string
  onSaved: (product: StoredProduct) => void
  onClose: () => void
}

type OcrStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * شاشة إضافة منتج يدويًا (عند عدم إيجاد الباركود): حقول أساسية + التقاط صور المنتج
 * وجدول الحقائق الغذائية + قراءة تلقائية اختيارية (OCR) للجدول تُعبّئ الحقول ثم تُلزم
 * المراجعة قبل الحفظ. الحفظ يبقى ممكنًا دائمًا حتى بلا قيم غذائية أو صور — لا يُفقَد أي إدخال.
 */
export function AddProductScreen({ lang, barcode, onSaved, onClose }: AddProductScreenProps) {
  const t = addProductStrings[lang]

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [per, setPer] = useState<ProductPer>('serving')
  const [servingSize, setServingSize] = useState('')
  const [kcalStr, setKcalStr] = useState('')
  const [proteinStr, setProteinStr] = useState('')
  const [carbsStr, setCarbsStr] = useState('')
  const [fatStr, setFatStr] = useState('')

  const [productPhoto, setProductPhoto] = useState<string | undefined>()
  const [nutritionPhoto, setNutritionPhoto] = useState<string | undefined>()

  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrMessage, setOcrMessage] = useState<string | undefined>()
  const [ocrPrefilled, setOcrPrefilled] = useState(false)
  const [confirmedAfterOcr, setConfirmedAfterOcr] = useState(false)

  const runOcr = async () => {
    if (!nutritionPhoto || ocrStatus === 'running') return
    setOcrStatus('running')
    setOcrProgress(0)
    setOcrMessage(undefined)
    try {
      const result = await extractNutritionFromImage(nutritionPhoto, setOcrProgress)
      const found = [result.kcal, result.protein, result.carbs, result.fat].filter((v) => v !== undefined).length
      if (found === 0) {
        setOcrStatus('error')
        setOcrMessage(t.ocrNoneFound)
        return
      }
      if (result.kcal !== undefined) setKcalStr(String(Math.round(result.kcal)))
      if (result.protein !== undefined) setProteinStr(String(Math.round(result.protein)))
      if (result.carbs !== undefined) setCarbsStr(String(Math.round(result.carbs)))
      if (result.fat !== undefined) setFatStr(String(Math.round(result.fat)))
      setOcrPrefilled(true)
      setConfirmedAfterOcr(false)
      setOcrStatus('done')
      setOcrMessage(t.ocrFoundSome)
    } catch {
      setOcrStatus('error')
      setOcrMessage(t.ocrFailed)
    }
  }

  const canSave = !(ocrPrefilled && !confirmedAfterOcr)

  const handleSave = () => {
    if (!canSave) return
    const kcal = parseSafeNumber(kcalStr, { min: 0, max: NUM_LIMITS.quickCalories.max })
    const protein = parseSafeNumber(proteinStr, { min: 0, max: NUM_LIMITS.quickProtein.max })
    const carbs = parseSafeNumber(carbsStr, { min: 0, max: NUM_LIMITS.quickMacro.max })
    const fat = parseSafeNumber(fatStr, { min: 0, max: NUM_LIMITS.quickMacro.max })
    const hasNutrition = kcal > 0 || protein > 0 || carbs > 0 || fat > 0
    // اسم افتراضي صادق بدل حجب الحفظ — لا يُفقَد أي إدخال حتى لو تُرك حقل الاسم فارغًا.
    const finalName = name.trim() || (barcode ? `${t.titleNew} · ${barcode}` : t.titleNew)

    const saved = upsertProduct({
      barcode: barcode || undefined,
      name: finalName,
      brand: brand.trim() || undefined,
      per,
      servingSize: servingSize.trim() || undefined,
      kcal,
      protein,
      carbs,
      fat,
      imageUrl: productPhoto,
      nutritionImageUrl: nutritionPhoto,
      sourceName: 'user',
      status: hasNutrition ? 'user_submitted' : 'pending_review',
    })
    onSaved(saved)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">{t.title}</h3>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-beige">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* الباركود */}
          <div>
            <p className="text-xs text-ink-500">{t.barcodeLabel}</p>
            <p className="mt-1 text-sm font-bold text-ink-900" dir="ltr">
              {barcode || t.barcodeNone}
            </p>
          </div>

          {/* الحقول الأساسية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-ink-500">{t.nameLabel}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="mt-1 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-ink-500">{t.brandLabel} — {t.optional}</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t.brandPlaceholder}
                className="mt-1 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
              />
            </div>

            <div className="col-span-2">
              <p className="text-xs text-ink-500">{t.perLabel}</p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPer('serving')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${per === 'serving' ? 'bg-primary text-white' : 'bg-beige text-ink-500 hover:text-ink-900'}`}
                >
                  {t.perServing}
                </button>
                <button
                  type="button"
                  onClick={() => setPer('100g')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${per === '100g' ? 'bg-primary text-white' : 'bg-beige text-ink-500 hover:text-ink-900'}`}
                >
                  {t.per100g}
                </button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-ink-500">{t.servingSizeLabel} — {t.optional}</label>
              <input
                type="text"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder={t.servingSizePlaceholder}
                className="mt-1 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
              />
            </div>

            <NumField label={t.kcalLabel} value={kcalStr} onChange={setKcalStr} max={NUM_LIMITS.quickCalories.max} />
            <NumField label={`${t.proteinLabel} (${t.gramsUnit})`} value={proteinStr} onChange={setProteinStr} max={NUM_LIMITS.quickProtein.max} />
            <NumField label={`${t.carbsLabel} (${t.gramsUnit})`} value={carbsStr} onChange={setCarbsStr} max={NUM_LIMITS.quickMacro.max} />
            <NumField label={`${t.fatLabel} (${t.gramsUnit})`} value={fatStr} onChange={setFatStr} max={NUM_LIMITS.quickMacro.max} />
          </div>

          {/* الصور */}
          <div className="rounded-xl border border-line bg-page p-3">
            <p className="text-xs font-bold text-ink-700">{t.photosTitle}</p>
            <p className="mt-1 text-[11px] text-ink-400">{t.photoHint}</p>
            <div className="mt-3 space-y-4">
              <PhotoCapture
                label={t.productPhotoLabel}
                value={productPhoto}
                onCapture={setProductPhoto}
                onClear={() => setProductPhoto(undefined)}
                takePhotoLabel={t.takePhoto}
                choosePhotoLabel={t.choosePhoto}
                retakeLabel={t.retake}
                removeLabel={t.remove}
                deniedHint={t.cameraDenied}
              />
              <PhotoCapture
                label={t.nutritionPhotoLabel}
                value={nutritionPhoto}
                onCapture={(dataUrl) => {
                  setNutritionPhoto(dataUrl)
                  setOcrStatus('idle')
                  setOcrMessage(undefined)
                }}
                onClear={() => {
                  setNutritionPhoto(undefined)
                  setOcrStatus('idle')
                  setOcrMessage(undefined)
                  setOcrPrefilled(false)
                }}
                takePhotoLabel={t.takePhoto}
                choosePhotoLabel={t.choosePhoto}
                retakeLabel={t.retake}
                removeLabel={t.remove}
                deniedHint={t.cameraDenied}
              />
            </div>
          </div>

          {/* OCR */}
          {nutritionPhoto && (
            <div className="rounded-xl border border-line bg-page p-3">
              <p className="text-xs font-bold text-ink-700">{t.ocrTitle}</p>
              <p className="mt-1 flex items-start gap-1.5 text-[11px] text-ink-400">
                <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t.ocrDisclaimer}
              </p>

              {ocrStatus !== 'running' && (
                <button type="button" onClick={runOcr} className="btn-ghost mt-3 px-3 py-2 text-xs">
                  <Icon name="ScanLine" className="h-4 w-4" />
                  {t.ocrRun}
                </button>
              )}

              {ocrStatus === 'running' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                  <Icon name="RefreshCw" className="h-4 w-4 animate-spin text-primary-c" />
                  {t.ocrRunning} ({Math.round(ocrProgress * 100)}%)
                </div>
              )}

              {ocrMessage && ocrStatus !== 'running' && (
                <p className={`mt-2 text-xs ${ocrStatus === 'error' ? 'text-warning' : 'text-ink-500'}`}>{ocrMessage}</p>
              )}

              {ocrPrefilled && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-ink-700">
                  <input
                    type="checkbox"
                    checked={confirmedAfterOcr}
                    onChange={(e) => setConfirmedAfterOcr(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  {t.ocrConfirmLabel}
                </label>
              )}
            </div>
          )}

          {!canSave && (
            <p className="flex items-start gap-1.5 text-[11px] text-warning">
              <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.ocrConfirmRequired}
            </p>
          )}

          <p className="flex items-start gap-2 text-[11px] text-ink-400">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.saveHint}
          </p>
        </div>

        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="btn-primary w-full justify-center py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Check" className="h-4 w-4" />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, max }: { label: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <div>
      <label className="text-xs text-ink-500">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value, { max }))}
        placeholder="0"
        className="mt-1 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
      />
    </div>
  )
}
