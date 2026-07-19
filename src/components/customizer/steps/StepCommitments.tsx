import { useState } from 'react'
import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { CommitmentLibraryPicker } from '@/components/CommitmentLibraryPicker'
import type { WizardCtx } from '../stepProps'
import type { CommitmentPlan, Frequency, PlanCommitment } from '@/types/progress'
import { getStrings } from '@/config/strings'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { commitmentName, createCustomCommitment, createPlanCommitment } from '@/lib/commitmentPlan'

// text-base (16px) لا text-sm: طبقة utilities تتغلّب على حارس @layer base، فبدونها يُكبّر iOS عند التركيز داخل WKWebView.
const inputCls = 'w-full rounded-lg border border-line bg-beige px-2.5 py-1.5 text-base text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

/** خطوة الالتزامات — مكتبة + محرّر + إضافة مخصّصة. */
export function StepCommitments({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const t = getStrings(ctx.lang).commit
  const cp = ctx.data.commitmentPlan
  const setCp = (partial: Partial<CommitmentPlan>) => ctx.update({ commitmentPlan: { ...cp, ...partial } })
  const [picker, setPicker] = useState(false)

  const reindex = (l: PlanCommitment[]) => l.map((x, i) => ({ ...x, order: i }))
  const update = (id: string, p: Partial<PlanCommitment>) =>
    setCp({ items: cp.items.map((x) => (x.id === id ? { ...x, ...p } : x)) })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= cp.items.length) return
    const l = cp.items.slice()
    ;[l[i], l[j]] = [l[j], l[i]]
    setCp({ items: reindex(l) })
  }

  const freqOptions: { value: Frequency; label: string }[] = [
    { value: 'daily', label: t.daily },
    { value: 'weekly', label: t.weekly },
    { value: 'custom', label: t.custom },
  ]

  return (
    <div>
      <StepHeader icon="CheckCircle2" title={d.commitTitle} description={t.intro} />

      <button
        type="button"
        onClick={() => setCp({ enabled: !cp.enabled })}
        className={`mb-5 flex w-full items-center justify-between rounded-2xl border p-4 ${cp.enabled ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface'}`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${cp.enabled ? 'bg-primary text-white' : 'bg-beige text-ink-400'}`}><Icon name="CheckCircle2" className="h-5 w-5" /></span>
          <span className="text-sm font-bold text-ink-900">{t.enable}</span>
        </span>
        <span className={`relative h-6 w-11 rounded-full ${cp.enabled ? 'bg-primary' : 'bg-line'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow ${cp.enabled ? 'start-0.5' : 'end-0.5'}`} />
        </span>
      </button>

      <button type="button" onClick={() => setPicker(true)} className="btn-ghost mb-4 w-full py-3"><Icon name="Plus" className="h-4 w-4" />{t.add}</button>

      <div className="space-y-3">
        {cp.items.map((it, i) => (
          <div key={it.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">{commitmentName(it, ctx.lang)}</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label={d.commitMoveUp}><Icon name="ChevronLeft" className="h-4 w-4 rotate-90" /></button>
                <button type="button" onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label={d.commitMoveDown}><Icon name="ChevronLeft" className="h-4 w-4 -rotate-90" /></button>
                <button type="button" onClick={() => setCp({ items: reindex(cp.items.filter((x) => x.id !== it.id)) })} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500" aria-label={d.commitDelete}><Icon name="X" className="h-4 w-4" /></button>
              </div>
            </div>
            {!it.commitmentId && (
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                <input className={inputCls} value={it.customNameAr ?? ''} onChange={(e) => update(it.id, { customNameAr: e.target.value })} placeholder={d.commitNameArPlaceholder} />
                <input className={inputCls} value={it.customNameEn ?? ''} onChange={(e) => update(it.id, { customNameEn: e.target.value })} placeholder={d.commitNameEnPlaceholder} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.frequency}>
                <select className={inputCls} value={it.frequency} onChange={(e) => update(it.id, { frequency: e.target.value as Frequency })}>
                  {freqOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={t.notes}><input className={inputCls} value={it.notes ?? ''} onChange={(e) => update(it.id, { notes: e.target.value })} /></Field>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setCp({ items: reindex([...cp.items, createCustomCommitment(cp.items.length, `cmt-custom-${Date.now()}`)]) })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 hover:border-primary-soft hover:text-primary-c"><Icon name="Plus" className="h-4 w-4" />{t.addCustom}</button>

      {picker && <CommitmentLibraryPicker lang={ctx.lang} onClose={() => setPicker(false)} onAdd={(id) => { setCp({ items: reindex([...cp.items, createPlanCommitment(id, cp.items.length)]) }); setPicker(false) }} />}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-ink-400">{label}</span>
      {children}
    </label>
  )
}
