import { useState } from 'react'
import type { Lang } from '@/lib/appPreferences'
import { loadPreferences, setHapticsEnabled } from '@/lib/appPreferences'
import {
  connectHealthKit,
  isHealthKitPlatform,
  connectHealthWeight,
  disconnectHealthWeight,
  disconnectSteps,
  importedWeightSummary,
  metricState,
  readHeartRate,
  type HealthKitPermission,
  type HealthPointSample,
} from '@/lib/healthKit'
import { getSteps, setSteps } from '@/lib/stepCounter'
import { parseSafeNumber, sanitizeNumericInput } from '@/lib/validation'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'
import { Icon } from './Icon'
import { SourceChip, type SourceKind } from './SourceChip'

/** Formats an ISO timestamp as a short, localized date-time; '' when absent. */
function formatUpdated(iso: string | null, lang: Lang): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })
}

/** One metric row in screen 68: title, source chip, last-update, and its actions. */
function MetricRow({
  icon,
  title,
  body,
  source,
  lang,
  updated,
  children,
}: {
  icon: string
  title: string
  body: string
  source: SourceKind
  lang: Lang
  updated: string | null
  children: React.ReactNode
}) {
  const copy = NATIVE_SETTINGS_COPY[lang]
  const stamp = formatUpdated(updated, lang)
  return (
    <div className="space-y-2.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="h-4 w-4 text-ink-500" />
          <p className="text-sm font-bold text-ink-900">{title}</p>
        </div>
        <SourceChip kind={source} lang={lang} />
      </div>
      <p className="text-xs leading-relaxed text-ink-500">{body}</p>
      <p className="text-[11px] tabular-nums text-ink-400">
        {stamp ? `${copy.lastUpdatedPrefix} ${stamp}` : copy.neverUpdated}
      </p>
      {children}
    </div>
  )
}

export function NativeSettingsPanel({ lang }: { lang: Lang }) {
  const copy = NATIVE_SETTINGS_COPY[lang]

  // Steps
  const stepsInit = metricState('steps')
  const [stepsConnected, setStepsConnected] = useState(stepsInit.enabled)
  const [stepsUpdated, setStepsUpdated] = useState<string | null>(stepsInit.lastUpdate)
  const [stepsPerm, setStepsPerm] = useState<HealthKitPermission>('not-determined')
  const [manualSteps, setManualSteps] = useState(() => String(getSteps() || ''))
  const [manualStepsMsg, setManualStepsMsg] = useState('')

  // Weight
  const weightInit = metricState('weight')
  const [weightConnected, setWeightConnected] = useState(weightInit.enabled)
  const [weightSample, setWeightSample] = useState<HealthPointSample | null>(importedWeightSummary)
  const [weightUpdated, setWeightUpdated] = useState<string | null>(weightInit.lastUpdate)
  const [weightPerm, setWeightPerm] = useState<HealthKitPermission>('not-determined')
  const [weightMsg, setWeightMsg] = useState('')

  // Heart rate — display-only, never persisted as a fabricated number
  const [heartSample, setHeartSample] = useState<HealthPointSample | null>(null)
  const [heartUpdated, setHeartUpdated] = useState<string | null>(null)
  const [heartChecked, setHeartChecked] = useState(false)

  const [busy, setBusy] = useState<'steps' | 'weight' | 'heart' | null>(null)
  const [haptics, setHaptics] = useState(() => loadPreferences().hapticsEnabled)

  const connectSteps = async () => {
    setBusy('steps')
    try {
      const result = await connectHealthKit()
      setStepsPerm(result.permission)
      setStepsConnected(result.permission === 'authorized')
      if (result.permission === 'authorized') {
        setStepsUpdated(metricState('steps').lastUpdate)
        setManualSteps(String(getSteps() || ''))
      }
    } catch {
      setStepsPerm('unknown')
      setStepsConnected(false)
    } finally {
      setBusy(null)
    }
  }

  const dropSteps = () => {
    disconnectSteps()
    setStepsConnected(false)
    setStepsPerm('not-determined')
    setStepsUpdated(null)
  }

  /** هل نحن على منصّة تملك HealthKit أصلًا؟ الويب: لا. */
  const healthNative = isHealthKitPlatform()

  /**
   * حفظ يدويّ **مؤكَّد** — [SOVEREIGN-003].
   *
   * `setSteps` يمرّ على `safeStorage` لكنّه يعيد القيمة المطلوبة لا نتيجة
   * الكتابة، فيبتلع الفشل عند امتلاء التخزين أو حجبه. وكان هذا السطر يعلن
   * «انحفظت خطواتك» على مخرجه — أي في اللحظة الوحيدة التي يهمّ فيها ألّا يكذب.
   *
   * فالتأكيد قراءة بعد الكتابة من نفس المتجر: لا رسالة نجاح بلا استقرار القيمة،
   * ويُقال للمستخدم صراحةً إن رقمه السابق باقٍ (§5).
   */
  const saveManualSteps = () => {
    const requested = setSteps(parseSafeNumber(manualSteps, { min: 0 }), undefined, 'manual')
    const persisted = getSteps()
    const ok = persisted === requested
    setManualSteps(String(persisted || ''))
    setManualStepsMsg(ok ? copy.manualStepsSaved : copy.manualStepsFailed)
  }

  const connectWeight = async () => {
    setBusy('weight')
    try {
      const result = await connectHealthWeight()
      setWeightPerm(result.permission)
      setWeightConnected(result.permission === 'authorized')
      setWeightUpdated(result.lastUpdate)
      setWeightSample(result.sample ?? importedWeightSummary())
      setWeightMsg(result.sample ? copy.weightImported : result.permission === 'authorized' ? copy.weightNoData : '')
    } catch {
      setWeightPerm('unknown')
      setWeightConnected(false)
    } finally {
      setBusy(null)
    }
  }

  const dropWeight = () => {
    disconnectHealthWeight()
    setWeightConnected(false)
    setWeightPerm('not-determined')
    setWeightUpdated(null)
    setWeightSample(null)
    setWeightMsg('')
  }

  const checkHeart = async () => {
    setBusy('heart')
    try {
      const result = await readHeartRate()
      setHeartSample(result.sample)
      setHeartUpdated(result.lastUpdate)
    } catch {
      setHeartSample(null)
    } finally {
      setHeartChecked(true)
      setBusy(null)
    }
  }

  const toggleHaptics = () => {
    const next = !haptics
    setHaptics(next)
    setHapticsEnabled(next)
  }

  const stepsSource: SourceKind = stepsConnected ? 'health' : 'manual'
  const weightSource: SourceKind = weightConnected && weightSample ? 'health' : 'manual'
  const heartSource: SourceKind = heartSample ? 'health' : 'unavailable'

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-500">{copy.intro}</p>

      {/* Steps — Apple Health, manual fallback always present */}
          <MetricRow icon="Footprints" title={copy.stepsTitle} body={copy.stepsBody} source={stepsSource} lang={lang} updated={stepsUpdated}>
            {/* الويب لا يصل HealthKit إطلاقًا (`connectHealthKit` يردّ
                `unavailable` دائمًا خارج iOS). فعرض «اربط» هنا نداءٌ لا ينجح
                مهما ضُغط — والصدق أن نقول أين يعمل ونُبقي المسار العامل:
                الإدخال اليدوي أسفله. */}
            {healthNative ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void connectSteps()} disabled={busy !== null} className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50">
                  <Icon name="Footprints" className="h-4 w-4" />
                  {stepsConnected ? copy.refresh : copy.connect}
                </button>
                {stepsConnected && (
                  <button type="button" onClick={dropSteps} className="btn-ghost px-4 py-2.5 text-sm">
                    <Icon name="RotateCcw" className="h-4 w-4" />
                    {copy.disconnect}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-ink-500" data-testid="health-native-only">{copy.healthNativeOnly}</p>
            )}
            {healthNative && stepsPerm !== 'not-determined' && (
              <p role="status" className="text-xs text-ink-500">
                {stepsPerm === 'authorized' ? copy.connected : stepsPerm === 'unavailable' ? copy.unavailable : copy.unknown}
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-900" htmlFor="manual-steps">{copy.manualStepsLabel}</label>
              <div className="flex gap-2">
                {/* `type="text"` لا `number`: تعقيم HTML لـ`type=number` يُفرِّغ القيمة
                    قبل وصولها React، فالأرقام العربية لا تصل أصلًا. */}
                <input
                  id="manual-steps"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  min={0}
                  value={manualSteps}
                  onChange={(e) => { setManualSteps(sanitizeNumericInput(e.target.value)); setManualStepsMsg('') }}
                  className="input w-full text-start tabular-nums"
                />
                <button type="button" onClick={saveManualSteps} className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                  {copy.manualStepsSave}
                </button>
              </div>
              {manualStepsMsg && <p role="status" className="mt-1 text-xs text-ink-500">{manualStepsMsg}</p>}
            </div>
          </MetricRow>

          {/* Weight — optional import, manual default */}
          <MetricRow icon="Scale" title={copy.weightTitle} body={copy.weightBody} source={weightSource} lang={lang} updated={weightUpdated}>
            {weightConnected && weightSample && (
              <p className="text-sm font-black tabular-nums text-ink-900">
                {weightSample.value} <span className="text-xs font-bold text-ink-500">{lang === 'ar' ? 'كجم' : 'kg'}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void connectWeight()} disabled={busy !== null} className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50">
                <Icon name="Scale" className="h-4 w-4" />
                {weightConnected ? copy.refreshWeight : copy.connectWeight}
              </button>
              {weightConnected && (
                <button type="button" onClick={dropWeight} className="btn-ghost px-4 py-2.5 text-sm">
                  <Icon name="Trash2" className="h-4 w-4" />
                  {copy.disconnect}
                </button>
              )}
            </div>
            {weightMsg && <p role="status" className="text-xs text-ink-500">{weightMsg}</p>}
            {(weightPerm === 'unknown' || weightPerm === 'denied') && <p role="status" className="text-xs text-ink-500">{copy.unknown}</p>}
            <p className="text-[11px] text-ink-400">{copy.weightManualNote}</p>
          </MetricRow>

          {/* Heart rate — honest: real reading or "unavailable", never fabricated */}
          <MetricRow icon="Activity" title={copy.heartTitle} body={copy.heartBody} source={heartSource} lang={lang} updated={heartUpdated}>
            {heartSample ? (
              <p className="text-sm font-black tabular-nums text-ink-900">
                {heartSample.value} <span className="text-xs font-bold text-ink-500">{lang === 'ar' ? 'نبضة/د' : 'bpm'}</span>
              </p>
            ) : (
              heartChecked && <p role="status" className="text-sm font-bold text-ink-500">{copy.heartUnavailable}</p>
            )}
            <button type="button" onClick={() => void checkHeart()} disabled={busy !== null} className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50">
              <Icon name="Activity" className="h-4 w-4" />
              {copy.checkHeart}
            </button>
          </MetricRow>

      {/* Haptics */}
      <div className="border-t border-line pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-900">{copy.hapticsTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.hapticsBody}</p>
          </div>
          <button type="button" role="switch" aria-checked={haptics} aria-label={copy.hapticsToggle} onClick={toggleHaptics} className="grid h-11 w-11 shrink-0 place-items-center">
            <span aria-hidden="true" className={`relative block h-6 w-11 rounded-full ${haptics ? 'bg-primary' : 'bg-line'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${haptics ? 'start-0.5' : 'end-0.5'}`} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
