import { useState } from 'react'
import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { SupplementLibraryPicker } from '@/components/SupplementLibraryPicker'
import { MedicationLibraryPicker } from '@/components/MedicationLibraryPicker'
import { cn } from '@/lib/cn'
import type { WizardCtx } from '../stepProps'
import type { FoodTiming, PlanMedication, PlanSupplement, WellnessPlan } from '@/types/wellness'
import { getStrings } from '@/config/strings'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import {
  createCustomMedication,
  createCustomSupplement,
  createPlanMedication,
  createPlanSupplement,
  medicationName,
  supplementName,
} from '@/lib/wellnessPlan'

const inputCls = 'w-full rounded-lg border border-line bg-beige px-2.5 py-1.5 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

/** خطوة المكملات والأدوية — مكتبتان + محرّر + إضافة مخصّصة + تنويه طبي. */
export function StepWellness({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const t = getStrings(ctx.lang).wellness
  const wp = ctx.data.wellnessPlan
  const setWp = (partial: Partial<WellnessPlan>) => ctx.update({ wellnessPlan: { ...wp, ...partial } })
  const [tab, setTab] = useState<'supp' | 'med'>('supp')
  const [suppPicker, setSuppPicker] = useState(false)
  const [medPicker, setMedPicker] = useState(false)

  const reindexS = (l: PlanSupplement[]) => l.map((x, i) => ({ ...x, order: i }))
  const reindexM = (l: PlanMedication[]) => l.map((x, i) => ({ ...x, order: i }))

  const updateSupp = (id: string, p: Partial<PlanSupplement>) =>
    setWp({ supplements: wp.supplements.map((s) => (s.id === id ? { ...s, ...p } : s)) })
  const updateMed = (id: string, p: Partial<PlanMedication>) =>
    setWp({ medications: wp.medications.map((m) => (m.id === id ? { ...m, ...p } : m)) })

  const foodOptions: { value: FoodTiming; label: string }[] = [
    { value: '', label: t.anyFood },
    { value: 'before', label: t.before },
    { value: 'after', label: t.after },
    { value: 'with', label: t.withFood },
  ]

  return (
    <div>
      <StepHeader icon="Pill" title={d.wellTitle} description={d.wellDescription} />

      {/* تفعيل */}
      <button
        type="button"
        onClick={() => setWp({ enabled: !wp.enabled })}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border p-4 ${wp.enabled ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface'}`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${wp.enabled ? 'bg-primary text-white' : 'bg-beige text-ink-400'}`}><Icon name="Pill" className="h-5 w-5" /></span>
          <span className="text-sm font-bold text-ink-900">{t.enable}</span>
        </span>
        <span className={`relative h-6 w-11 rounded-full ${wp.enabled ? 'bg-primary' : 'bg-line'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow ${wp.enabled ? 'start-0.5' : 'end-0.5'}`} />
        </span>
      </button>

      {/* تبويبات */}
      <div className="mb-5 flex gap-2 rounded-full border border-line bg-surface p-1">
        {(['supp', 'med'] as const).map((id) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('flex-1 rounded-full px-3 py-2 text-sm font-bold transition-colors', tab === id ? 'bg-primary text-white' : 'text-ink-500 hover:bg-beige')}>
            {id === 'supp' ? t.supplementsTab : t.medicationsTab}
          </button>
        ))}
      </div>

      {/* المكملات */}
      {tab === 'supp' && (
        <div>
          <button type="button" onClick={() => setSuppPicker(true)} className="btn-ghost mb-4 w-full py-3"><Icon name="Plus" className="h-4 w-4" />{t.addSupplement}</button>
          <div className="space-y-3">
            {wp.supplements.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-900">{supplementName(s, ctx.lang)}</p>
                  <button type="button" onClick={() => setWp({ supplements: reindexS(wp.supplements.filter((x) => x.id !== s.id)) })} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500" aria-label={d.wellDelete}><Icon name="X" className="h-4 w-4" /></button>
                </div>
                {!s.supplementId && (
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={s.customNameAr ?? ''} onChange={(e) => updateSupp(s.id, { customNameAr: e.target.value })} placeholder={d.wellSuppNameArPlaceholder} />
                    <input className={inputCls} value={s.customNameEn ?? ''} onChange={(e) => updateSupp(s.id, { customNameEn: e.target.value })} placeholder={d.wellSuppNameEnPlaceholder} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label={t.amount}><input className={inputCls} value={s.amount ?? ''} onChange={(e) => updateSupp(s.id, { amount: e.target.value })} placeholder={d.wellSuppAmountPlaceholder} /></Field>
                  <Field label={t.timing}><input className={inputCls} value={s.timing ?? ''} onChange={(e) => updateSupp(s.id, { timing: e.target.value })} /></Field>
                  <Field label={t.frequency}><input className={inputCls} value={s.frequency ?? ''} onChange={(e) => updateSupp(s.id, { frequency: e.target.value })} /></Field>
                  <Field label={t.notes}><input className={inputCls} value={s.notes ?? ''} onChange={(e) => updateSupp(s.id, { notes: e.target.value })} /></Field>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setWp({ supplements: reindexS([...wp.supplements, createCustomSupplement(wp.supplements.length, `supp-custom-${Date.now()}`)]) })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 hover:border-primary-soft hover:text-primary-c"><Icon name="Plus" className="h-4 w-4" />{t.addCustomSupplement}</button>
        </div>
      )}

      {/* الأدوية */}
      {tab === 'med' && (
        <div>
          {/* تنويه طبي */}
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
            <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
            <p className="text-sm leading-relaxed text-ink-700">{t.medSafety}</p>
          </div>

          <button type="button" onClick={() => setMedPicker(true)} className="btn-ghost mb-4 w-full py-3"><Icon name="Plus" className="h-4 w-4" />{t.addMedication}</button>
          <div className="space-y-3">
            {wp.medications.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-900">{medicationName(m, ctx.lang)}</p>
                  <button type="button" onClick={() => setWp({ medications: reindexM(wp.medications.filter((x) => x.id !== m.id)) })} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500" aria-label={d.wellDelete}><Icon name="X" className="h-4 w-4" /></button>
                </div>
                {!m.medicationId && (
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={m.customNameAr ?? ''} onChange={(e) => updateMed(m.id, { customNameAr: e.target.value })} placeholder={d.wellMedNameArPlaceholder} />
                    <input className={inputCls} value={m.customNameEn ?? ''} onChange={(e) => updateMed(m.id, { customNameEn: e.target.value })} placeholder={d.wellMedNameEnPlaceholder} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Field label={t.dose} hint={t.doseHint}><input className={inputCls} value={m.dose ?? ''} onChange={(e) => updateMed(m.id, { dose: e.target.value })} placeholder="—" /></Field>
                  <Field label={t.timing}><input className={inputCls} value={m.timing ?? ''} onChange={(e) => updateMed(m.id, { timing: e.target.value })} /></Field>
                  <Field label={t.frequency}><input className={inputCls} value={m.frequency ?? ''} onChange={(e) => updateMed(m.id, { frequency: e.target.value })} /></Field>
                  <Field label={t.food}>
                    <select className={inputCls} value={m.beforeAfterFood ?? ''} onChange={(e) => updateMed(m.id, { beforeAfterFood: e.target.value as FoodTiming })}>
                      {foodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2 sm:col-span-1"><Field label={t.doctorNote}><input className={inputCls} value={m.doctorNote ?? ''} onChange={(e) => updateMed(m.id, { doctorNote: e.target.value })} /></Field></div>
                  <div className="col-span-2 sm:col-span-3"><Field label={t.notes}><input className={inputCls} value={m.notes ?? ''} onChange={(e) => updateMed(m.id, { notes: e.target.value })} /></Field></div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setWp({ medications: reindexM([...wp.medications, createCustomMedication(wp.medications.length, `med-custom-${Date.now()}`)]) })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 hover:border-primary-soft hover:text-primary-c"><Icon name="Plus" className="h-4 w-4" />{t.addCustomMedication}</button>
        </div>
      )}

      {suppPicker && <SupplementLibraryPicker lang={ctx.lang} onClose={() => setSuppPicker(false)} onAdd={(id) => { setWp({ supplements: reindexS([...wp.supplements, createPlanSupplement(id, wp.supplements.length)]) }); setSuppPicker(false) }} />}
      {medPicker && <MedicationLibraryPicker lang={ctx.lang} onClose={() => setMedPicker(false)} onAdd={(id) => { setWp({ medications: reindexM([...wp.medications, createPlanMedication(id, wp.medications.length)]) }); setMedPicker(false) }} />}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-ink-400">{label}</span>
      {children}
      {hint && <span className="text-[9px] text-ink-400">{hint}</span>}
    </label>
  )
}
