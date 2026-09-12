import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { wellnessScreenStrings } from '@/i18n/dict/wellnessScreen'
import { commitmentLibrary } from '@/data/commitmentLibrary'
import type { CommitmentCategory } from '@/types/progress'
import { AppOverlay } from '@/components/AppOverlay'

interface Props {
  lang: Lang
  onAdd: (id: string) => void
  onClose: () => void
}

const catOptions = (d: (typeof wellnessScreenStrings)['ar']): { value: CommitmentCategory | 'all'; label: string }[] => [
  { value: 'all', label: d.allCategories },
  { value: 'training', label: d.comCatTraining },
  { value: 'nutrition', label: d.comCatNutrition },
  { value: 'hydration', label: d.comCatHydration },
  { value: 'sleep', label: d.comCatSleep },
  { value: 'recovery', label: d.comCatRecovery },
  { value: 'health', label: d.comCatHealth },
  { value: 'supplements', label: d.comCatSupplements },
  { value: 'medications', label: d.comCatMedications },
  { value: 'measurements', label: d.comCatMeasurements },
  { value: 'lifestyle', label: d.comCatLifestyle },
]

export function CommitmentLibraryPicker({ lang, onAdd, onClose }: Props) {
  const t = getStrings(lang).commit
  const d = wellnessScreenStrings[lang]
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<CommitmentCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return commitmentLibrary.filter((c) => {
      if (cat !== 'all' && c.category !== cat) return false
      if (query && !`${c.nameAr} ${c.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [q, cat])

  return (
    <AppOverlay className="z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">{d.commitmentLibraryTitle}</h3>
          <button type="button" onClick={onClose} aria-label={d.close} className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 hover:bg-beige"><Icon name="X" className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3">
            <Icon name="CheckCircle2" className="h-4 w-4 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full bg-transparent py-2.5 text-base text-ink-900 focus:outline-none" />
          </div>
          <select className="rounded-lg border border-line bg-surface px-2.5 py-2 text-base font-bold text-ink-700" value={cat} onChange={(e) => setCat(e.target.value as CommitmentCategory | 'all')}>
            {catOptions(d).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="app-scroll flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">{d.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-page p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? c.nameEn : `${c.nameAr} — ${c.nameEn}`}</p>
                    <p className="text-[11px] text-ink-400">{c.frequency === 'weekly' ? t.weekly : t.daily}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(c.id)} className="btn-primary px-3 py-2 text-xs"><Icon name="Plus" className="h-4 w-4" />{d.add}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppOverlay>
  )
}
