import { useState } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { MeasurementPlan } from '@/types/progress'
import { measurementTypes } from '@/data/measurementTypes'
import { getStrings } from '@/config/strings'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/** خطوة القياسات والمتابعة — اختيار أنواع القياسات + مجموعة متقدمة. */
export function StepMeasurements({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const t = getStrings(ctx.lang).progress
  const mp = ctx.data.measurementPlan
  const setMp = (partial: Partial<MeasurementPlan>) => ctx.update({ measurementPlan: { ...mp, ...partial } })
  const [advOpen, setAdvOpen] = useState(false)

  const toggleType = (id: string) => {
    const has = mp.selectedTypeIds.includes(id)
    setMp({ selectedTypeIds: has ? mp.selectedTypeIds.filter((x) => x !== id) : [...mp.selectedTypeIds, id] })
  }

  const basic = measurementTypes.filter((m) => !m.isAdvanced)
  const advanced = measurementTypes.filter((m) => m.isAdvanced)

  const Chip = ({ id, nameAr, nameEn, unit }: { id: string; nameAr: string; nameEn: string; unit: string }) => {
    const on = mp.selectedTypeIds.includes(id)
    const name = ctx.lang === 'en' ? nameEn : nameAr
    return (
      <button
        type="button"
        onClick={() => toggleType(id)}
        aria-pressed={on}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm font-bold transition-colors ${on ? 'border-primary-soft bg-primary-soft text-ink-900' : 'border-line bg-surface text-ink-700 hover:bg-beige'}`}
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${on ? 'bg-primary text-white' : 'bg-beige text-ink-400'}`}>
          <Icon name={on ? 'Check' : 'Plus'} className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="min-w-0 truncate">{name}{unit ? <span className="text-[11px] text-ink-400"> · {unit}</span> : null}</span>
      </button>
    )
  }

  return (
    <div>
      <StepHeader icon="Ruler" title={d.measTitle} description={t.selectTypes} />

      <button
        type="button"
        aria-pressed={mp.enabled}
        onClick={() => setMp({ enabled: !mp.enabled })}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border p-4 ${mp.enabled ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface'}`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${mp.enabled ? 'bg-primary text-white' : 'bg-beige text-ink-400'}`}><Icon name="Ruler" className="h-5 w-5" /></span>
          <span className="text-sm font-bold text-ink-900">{t.enable}</span>
        </span>
        <span className={`relative h-6 w-11 rounded-full ${mp.enabled ? 'bg-primary' : 'bg-line'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow ${mp.enabled ? 'start-0.5' : 'end-0.5'}`} />
        </span>
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        {basic.map((m) => <Chip key={m.id} id={m.id} nameAr={m.nameAr} nameEn={m.nameEn} unit={m.unit} />)}
      </div>

      {/* متقدّم */}
      <div className="mt-4 rounded-2xl border border-line">
        <button type="button" onClick={() => setAdvOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-sm font-bold text-ink-700">
          <span className="flex items-center gap-2"><Icon name="ShieldCheck" className="h-4 w-4 text-ink-500" />{t.advanced}</span>
          <Icon name="ChevronLeft" className={`h-4 w-4 text-ink-400 transition-transform ${advOpen ? '-rotate-90' : 'rotate-0'}`} />
        </button>
        {advOpen && (
          <div className="space-y-3 border-t border-line p-4">
            <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
              <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              {t.advancedNote}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {advanced.map((m) => <Chip key={m.id} id={m.id} nameAr={m.nameAr} nameEn={m.nameEn} unit={m.unit} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
