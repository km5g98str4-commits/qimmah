import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { commitmentLibrary } from '@/data/commitmentLibrary'
import type { CommitmentCategory } from '@/types/progress'

interface Props {
  lang: Lang
  onAdd: (id: string) => void
  onClose: () => void
}

const catOptions: { value: CommitmentCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'كل الفئات' },
  { value: 'training', label: 'تمرين' },
  { value: 'nutrition', label: 'تغذية' },
  { value: 'hydration', label: 'ترطيب' },
  { value: 'sleep', label: 'نوم' },
  { value: 'recovery', label: 'استشفاء' },
  { value: 'health', label: 'صحة' },
  { value: 'supplements', label: 'مكملات' },
  { value: 'medications', label: 'أدوية' },
  { value: 'measurements', label: 'قياسات' },
  { value: 'lifestyle', label: 'نمط حياة' },
]

export function CommitmentLibraryPicker({ lang, onAdd, onClose }: Props) {
  const t = getStrings(lang).commit
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">مكتبة الالتزامات</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-beige"><Icon name="X" className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3">
            <Icon name="CheckCircle2" className="h-4 w-4 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full bg-transparent py-2.5 text-sm text-ink-900 focus:outline-none" />
          </div>
          <select className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700" value={cat} onChange={(e) => setCat(e.target.value as CommitmentCategory | 'all')}>
            {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">ما فيه نتائج.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-page p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? c.nameEn : `${c.nameAr} — ${c.nameEn}`}</p>
                    <p className="text-[11px] text-ink-400">{c.frequency === 'weekly' ? t.weekly : t.daily}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(c.id)} className="btn-primary px-3 py-2 text-xs"><Icon name="Plus" className="h-4 w-4" />أضف</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
