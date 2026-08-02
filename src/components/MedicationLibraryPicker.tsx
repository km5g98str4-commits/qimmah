import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { wellnessScreenStrings } from '@/i18n/dict/wellnessScreen'
import { medications } from '@/data/medications'
import type { MedicationCategory } from '@/types/wellness'

interface Props {
  lang: Lang
  onAdd: (id: string) => void
  onClose: () => void
}

const catOptions = (d: (typeof wellnessScreenStrings)['ar']): { value: MedicationCategory | 'all'; label: string }[] => [
  { value: 'all', label: d.allCategories },
  { value: 'thyroid', label: d.medCatThyroid },
  { value: 'diabetes', label: d.medCatDiabetes },
  { value: 'blood_pressure', label: d.medCatBloodPressure },
  { value: 'cholesterol', label: d.medCatCholesterol },
  { value: 'allergy', label: d.medCatAllergy },
  { value: 'asthma', label: d.medCatAsthma },
  { value: 'stomach', label: d.medCatStomach },
  { value: 'pain_relief', label: d.medCatPainRelief },
  { value: 'antibiotic', label: d.medCatAntibiotic },
  { value: 'vitamin_prescription', label: d.medCatVitaminPrescription },
  { value: 'iron', label: d.medCatIron },
  { value: 'mental_health', label: d.medCatMentalHealth },
  { value: 'other', label: d.medCatOther },
]

export function MedicationLibraryPicker({ lang, onAdd, onClose }: Props) {
  const t = getStrings(lang).wellness
  const d = wellnessScreenStrings[lang]
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<MedicationCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return medications.filter((m) => {
      if (cat !== 'all' && m.category !== cat) return false
      if (query && !`${m.nameAr} ${m.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [q, cat])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">{d.medicationLibraryTitle}</h3>
          <button type="button" onClick={onClose} aria-label={d.close} className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 hover:bg-beige"><Icon name="X" className="h-5 w-5" /></button>
        </div>

        {/* تنويه طبي */}
        <div className="border-b border-line bg-gold-200/40 p-3">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-700">
            <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
            {t.medSafety}
          </p>
        </div>

        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3">
            <Icon name="Pill" className="h-4 w-4 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full bg-transparent py-2.5 text-sm text-ink-900 focus:outline-none" />
          </div>
          <select className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700" value={cat} onChange={(e) => setCat(e.target.value as MedicationCategory | 'all')}>
            {catOptions(d).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">{d.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((m) => (
                <li key={m.id} className="rounded-xl border border-line bg-page p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? m.nameEn : `${m.nameAr} — ${m.nameEn}`}</p>
                      <p className="text-[11px] text-ink-500">{lang === 'en' ? m.trackingPurposeEn : m.trackingPurposeAr}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{lang === 'en' ? m.timingHintEn : m.timingHintAr}</p>
                    </div>
                    <button type="button" onClick={() => onAdd(m.id)} className="btn-primary shrink-0 px-3 py-2 text-xs"><Icon name="Plus" className="h-4 w-4" />{d.add}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
