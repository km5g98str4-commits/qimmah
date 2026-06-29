import { useState } from 'react'
import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { getMeasurementType } from '@/data/measurementTypes'
import { addLog, deleteLog, loadLogs, trendFor, type Trend } from '@/lib/measurementLog'
import { getDayStamp } from '@/lib/today'
import { useIsDemo } from '@/lib/demoMode'
import type { MeasurementLog } from '@/types/progress'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

const inputCls = 'w-full rounded-lg border border-line bg-beige px-2.5 py-2 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

/** قسم «القياسات والتقدّم» — تسجيل سريع + آخر قياس + اتجاه + سجل. */
export function ProgressSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const mp = customization.measurementPlan
  const t = getStrings(lang).progress
  const demo = useIsDemo()
  const [logs, setLogs] = useState<MeasurementLog[]>(() => (demo ? [] : loadLogs()))
  const [form, setForm] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const types = mp.selectedTypeIds.map(getMeasurementType).filter(Boolean) as NonNullable<ReturnType<typeof getMeasurementType>>[]

  if (!mp.enabled || types.length === 0) {
    return (
      <section id="progress" className="section bg-beige">
        <div className="container-page">
          <SectionHeading eyebrow={t.title} icon="BarChart3" title={t.title} description={t.desc} />
          <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-sm text-ink-500">{t.empty}</p>
          </div>
        </div>
      </section>
    )
  }

  const tName = (id: string) => {
    const m = getMeasurementType(id)
    return m ? (lang === 'en' ? m.nameEn : m.nameAr) : id
  }

  const save = () => {
    const values: Record<string, string | number> = {}
    types.forEach((m) => {
      const v = form[m.id]
      if (v !== undefined && v !== '') values[m.id] = v
    })
    if (Object.keys(values).length === 0) return
    const log: MeasurementLog = { id: `log-${Date.now()}`, date: getDayStamp(), values, notes: notes || undefined }
    setLogs(demo ? [log, ...logs] : addLog(log))
    setForm({})
    setNotes('')
  }

  const remove = (id: string) => setLogs(demo ? logs.filter((l) => l.id !== id) : deleteLog(id))

  const trendIcon = (tr: Trend) => (tr === 'up' ? 'TrendingUp' : tr === 'down' ? 'TrendingDown' : 'Minus')
  const trendLabel = (tr: Trend) => (tr === 'up' ? t.up : tr === 'down' ? t.down : t.same)
  const latest = logs[0]

  return (
    <section id="progress" className="section bg-beige">
      <div className="container-page">
        <SectionHeading eyebrow={t.title} icon="BarChart3" title={t.title} description={t.desc} />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* تسجيل سريع */}
          <div className="card p-5">
            <h3 className="mb-4 text-base font-bold text-ink-900">{t.quickLog}</h3>
            <div className="grid grid-cols-2 gap-3">
              {types.map((m) => (
                <label key={m.id} className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-ink-500">{tName(m.id)} {m.unit && <span className="text-ink-400">({m.unit})</span>}</span>
                  <input className={inputCls} value={form[m.id] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [m.id]: e.target.value }))} />
                </label>
              ))}
            </div>
            <input className={`${inputCls} mt-3`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notes} />
            <button type="button" onClick={save} className="btn-primary mt-4 w-full py-3"><Icon name="Check" className="h-4 w-4" />{t.save}</button>
          </div>

          {/* آخر قياس + الاتجاه */}
          <div className="card p-5">
            <h3 className="mb-4 text-base font-bold text-ink-900">{t.latest}</h3>
            {!latest ? (
              <p className="py-6 text-center text-sm text-ink-400">{t.noLogs}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-ink-400">{latest.date}</p>
                {types.map((m) => {
                  const val = latest.values[m.id]
                  if (val === undefined || val === '') return null
                  const tr = trendFor(logs, m.id)
                  return (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-line bg-page px-3 py-2">
                      <span className="text-sm text-ink-700">{tName(m.id)}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink-900">{val}{m.unit ? ` ${m.unit}` : ''}</span>
                        {tr && (
                          <span className={`flex items-center gap-0.5 text-[11px] font-bold ${tr === 'down' ? 'text-success' : tr === 'up' ? 'text-danger' : 'text-ink-400'}`}>
                            <Icon name={trendIcon(tr)} className="h-3.5 w-3.5" />
                            {trendLabel(tr)}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* السجل */}
        {logs.length > 0 && (
          <div className="mt-6 card p-5">
            <h3 className="mb-4 text-base font-bold text-ink-900">{t.history}</h3>
            <ul className="space-y-2">
              {logs.slice(0, 10).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-page p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-900">{l.date}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {Object.entries(l.values).map(([k, v]) => `${tName(k)}: ${v}`).join(' · ')}
                    </p>
                    {l.notes && <p className="mt-0.5 truncate text-[11px] text-ink-400">{l.notes}</p>}
                  </div>
                  <button type="button" onClick={() => remove(l.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500" aria-label={t.delete}><Icon name="X" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2 text-xs text-ink-400">
          <Icon name="ShieldCheck" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          قياساتك وملاحظاتك محفوظة على جهازك فقط ولا يتم رفعها أو إرسالها لأي خادم.
        </p>
        <p className="mt-2 flex items-start gap-2 text-xs text-ink-400">
          <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t.advancedNote}
        </p>
      </div>
    </section>
  )
}
